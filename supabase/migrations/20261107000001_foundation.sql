-- Fase 1 · Spec 001 (auth, roles, RBAC) + base de auditoría inmutable (spec 008, ADR-0003)
-- Requisitos: FR-001..FR-006, NFR-001, FR-095, FR-096

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tipos
create type public.user_role as enum ('buyer', 'seller', 'admin', 'finance_admin');
create type public.store_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- ---------------------------------------------------------------- helpers de sesión

-- ---------------------------------------------------------------- perfiles
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  phone       text not null default '',
  role        public.user_role not null default 'buyer',
  suspended   boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and not suspended
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.is_finance_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'finance_admin', false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'finance_admin'), false)
$$;

-- Crea el perfil al registrarse (FR-001/FR-002)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- tiendas
create table public.stores (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null unique references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 80),
  description  text not null default '',
  seller_kind  text not null default 'individual'
               check (seller_kind in ('individual', 'tiktok_live', 'negocio')),
  pickup_info  text not null default '',
  status       public.store_status not null default 'pending',
  review_reason text,
  reviewed_by  uuid references public.profiles (id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- configuración y catálogo de bancos
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('commission_bps', '100'),
  ('order_ttl_minutes', '10'),
  ('payout_cooling_hours', '24'),
  ('pickup_reminder_days', '3'),
  ('require_admin_mfa', 'false');

-- Catálogo editable: el código llega en senderBankCode (ASFI). Se completa con los códigos reales.
create table public.bank_catalog (
  code text primary key,
  name text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- auditoría inmutable (hash encadenado)
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  actor_role text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  reason     text,
  prev_hash  text not null default '',
  hash       text not null default ''
);

create or replace function public.audit_compute_hash(r public.audit_log) returns text
language sql immutable as $$
  select encode(extensions.digest(
    concat_ws('|', r.id, r.at, coalesce(r.actor_id::text, ''), coalesce(r.actor_role, ''),
              r.action, r.entity, coalesce(r.entity_id, ''), coalesce(r.before::text, ''),
              coalesce(r.after::text, ''), coalesce(r.reason, ''), r.prev_hash),
    'sha256'), 'hex')
$$;

create or replace function public.audit_chain_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare last_hash text;
begin
  perform pg_advisory_xact_lock(7001);
  select hash into last_hash from public.audit_log order by id desc limit 1;
  new.prev_hash := coalesce(last_hash, '');
  new.at := now();
  new.hash := public.audit_compute_hash(new);
  return new;
end $$;

create trigger audit_chain before insert on public.audit_log
  for each row execute function public.audit_chain_insert();

create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'La tabla % es inmutable (%).', tg_table_name, tg_op using errcode = '42501';
end $$;

create trigger audit_no_update before update or delete on public.audit_log
  for each row execute function public.forbid_mutation();
create trigger audit_no_truncate before truncate on public.audit_log
  for each statement execute function public.forbid_mutation();

-- Escritura de auditoría solo desde funciones del sistema
create or replace function public.audit_write(
  p_action text, p_entity text, p_entity_id text,
  p_before jsonb, p_after jsonb, p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, before, after, reason)
  values (auth.uid(), public.app_role()::text, p_action, p_entity, p_entity_id, p_before, p_after, p_reason);
end $$;
revoke all on function public.audit_write(text, text, text, jsonb, jsonb, text) from public, anon, authenticated;

-- FR-096: verificación de la cadena; devuelve el primer id roto (null si íntegra)
create or replace function public.verify_audit_chain() returns bigint
language plpgsql security definer set search_path = public as $$
declare r public.audit_log; expected_prev text := '';
begin
  for r in select * from public.audit_log order by id loop
    if r.prev_hash <> expected_prev or r.hash <> public.audit_compute_hash(r) then
      return r.id;
    end if;
    expected_prev := r.hash;
  end loop;
  return null;
end $$;
revoke all on function public.verify_audit_chain() from public, anon, authenticated;

-- ---------------------------------------------------------------- reglas de negocio con auditoría
-- Un usuario no puede cambiar su propio rol, ni suspensión (FR-004)
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.suspended is distinct from old.suspended)
     and coalesce(current_setting('app.allow_role_change', true), '') <> 'on' then
    raise exception 'No puedes cambiar rol ni suspensión.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- El estado de la tienda solo cambia mediante admin_review_store (FR-003/FR-005)
create or replace function public.guard_store_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.owner_id is distinct from old.owner_id
      or new.reviewed_by is distinct from old.reviewed_by)
     and coalesce(current_setting('app.allow_store_review', true), '') <> 'on' then
    raise exception 'El estado de la tienda lo cambia solo el administrador.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger stores_guard before update on public.stores
  for each row execute function public.guard_store_update();

create or replace function public.require_mfa_if_enabled() returns void
language plpgsql stable as $$
begin
  if (select value = 'true'::jsonb from public.settings where key = 'require_admin_mfa')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'Se requiere verificación en dos pasos (2FA).' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_review_store(p_store_id uuid, p_decision public.store_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.stores; old_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede revisar tiendas.' using errcode = '42501';
  end if;
  perform public.require_mfa_if_enabled();
  if p_decision not in ('approved', 'rejected', 'suspended') then
    raise exception 'Decisión inválida.';
  end if;
  select * into s from public.stores where id = p_store_id for update;
  if not found then raise exception 'Tienda no encontrada.'; end if;
  old_row := to_jsonb(s);

  perform set_config('app.allow_store_review', 'on', true);
  update public.stores
     set status = p_decision, review_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_store_id;

  perform set_config('app.allow_role_change', 'on', true);
  if p_decision = 'approved' then
    update public.profiles set role = 'seller' where id = s.owner_id and role = 'buyer';
  elsif p_decision in ('rejected', 'suspended') then
    update public.profiles set role = 'buyer' where id = s.owner_id and role = 'seller';
  end if;

  perform public.audit_write('store.' || p_decision::text, 'stores', p_store_id::text,
                             old_row, (select to_jsonb(x) from public.stores x where x.id = p_store_id), p_reason);
end $$;

create or replace function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare old_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede suspender usuarios.' using errcode = '42501';
  end if;
  perform public.require_mfa_if_enabled();
  select to_jsonb(p) into old_row from public.profiles p where id = p_user_id;
  perform set_config('app.allow_role_change', 'on', true);
  update public.profiles set suspended = p_suspended where id = p_user_id;
  perform public.audit_write(case when p_suspended then 'user.suspend' else 'user.unsuspend' end,
                             'profiles', p_user_id::text, old_row,
                             (select to_jsonb(p) from public.profiles p where id = p_user_id), p_reason);
end $$;

-- Asignar roles de personal (admin/finance_admin): solo desde el panel SQL con rol de servicio
create or replace function public.bootstrap_staff_role(p_email text, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if p_role not in ('admin', 'finance_admin') then raise exception 'Rol inválido.'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'No existe un usuario con ese correo.'; end if;
  perform set_config('app.allow_role_change', 'on', true);
  update public.profiles set role = p_role where id = uid;
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, after, reason)
  values (null, 'system', 'staff.bootstrap', 'profiles', uid::text, jsonb_build_object('role', p_role), 'bootstrap');
end $$;
revoke all on function public.bootstrap_staff_role(text, public.user_role) from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS (NFR-001)
alter table public.profiles     enable row level security;
alter table public.stores       enable row level security;
alter table public.settings     enable row level security;
alter table public.bank_catalog enable row level security;
alter table public.audit_log    enable row level security;

-- profiles
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- stores: el dueño ve y crea la suya; el público ve las aprobadas; el personal ve todas
create policy stores_select on public.stores for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_staff());
create policy stores_insert_own on public.stores for insert to authenticated
  with check (owner_id = auth.uid() and status = 'pending'
              and exists (select 1 from public.profiles p where p.id = auth.uid() and not p.suspended));
create policy stores_update_own on public.stores for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- settings: solo personal; solo finance_admin modifica (con auditoría)
create policy settings_select on public.settings for select to authenticated using (public.is_staff());
create policy settings_update on public.settings for update to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

create or replace function public.audit_settings_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  perform public.audit_write('settings.update', 'settings', new.key, to_jsonb(old), to_jsonb(new), null);
  return new;
end $$;
create trigger settings_audit before update on public.settings
  for each row execute function public.audit_settings_change();

-- catálogo de bancos: lectura para autenticados; escritura admin
create policy bank_catalog_select on public.bank_catalog for select to authenticated using (true);
create policy bank_catalog_write on public.bank_catalog for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- audit_log: solo lectura para personal; nadie escribe directamente
create policy audit_select on public.audit_log for select to authenticated using (public.is_staff());

-- Permisos de tabla
revoke all on all tables in schema public from anon, authenticated;
grant select on public.stores to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.stores to authenticated;
grant select, update on public.settings to authenticated;
grant select, insert, update, delete on public.bank_catalog to authenticated;
grant select on public.audit_log to authenticated;

grant execute on function public.admin_review_store(uuid, public.store_status, text) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.app_role() to authenticated;
