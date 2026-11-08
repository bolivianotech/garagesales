-- Fase 3 · Spec 003 (pedidos sin reserva) + núcleo de las specs 004 y 007
-- (confirmación atómica del pago, comprobante digital, retiro). ADR-0004: gana quien paga primero.
-- Requisitos: FR-013, FR-022, FR-023, FR-023a, FR-024, FR-025, FR-033, FR-034, FR-037, FR-039b,
--             FR-070, FR-071, FR-072, FR-074, FR-083, FR-084, NFR-001, NFR-004

create type public.order_status as enum ('pending', 'paid', 'expired', 'cancelled', 'review');
create type public.payment_status as enum ('pending', 'paid', 'review', 'cancelled');
create type public.pickup_status as enum ('ready', 'delivered');

create sequence public.order_code_seq start 1000;

-- Ya no hay reserva de stock: se reemplaza el TTL de minutos por la vigencia del pedido (ADR-0004)
delete from public.settings where key = 'order_ttl_minutes';
insert into public.settings (key, value) values ('order_valid_hours', '24') on conflict (key) do nothing;

-- ---------------------------------------------------------------- tablas
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  short_code    text not null unique default ('P-' || lpad(nextval('public.order_code_seq')::text, 6, '0')),
  buyer_id      uuid not null references public.profiles (id),
  status        public.order_status not null default 'pending',
  total_cents   integer not null check (total_cents > 0),
  review_reason text,
  receipt_token uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  paid_at       timestamptz
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_pending_idx on public.orders (expires_at) where status = 'pending';

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid not null references public.products (id),
  store_id         uuid not null references public.stores (id),
  sku              text not null,
  title            text not null,
  image_path       text,
  qty              integer not null check (qty between 1 and 50),
  unit_price_cents integer not null check (unit_price_cents > 0)   -- FR-013: precio congelado
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_store_idx on public.order_items (store_id);

create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id),
  bank_qr_id            text not null unique,
  amount_cents          integer not null check (amount_cents > 0),
  status                public.payment_status not null default 'pending',
  qr_image              text,
  due_date              date,
  description           text,
  sender_name           text,
  sender_bank_code      text,
  sender_account_masked text,
  paid_at               timestamptz,
  raw_response          jsonb,
  created_at            timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

create table public.pickups (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id),
  store_id     uuid not null references public.stores (id),
  buyer_id     uuid not null references public.profiles (id),
  pickup_code  text not null,
  status       public.pickup_status not null default 'ready',
  ready_at     timestamptz not null default now(),
  delivered_at timestamptz,
  delivered_by uuid references public.profiles (id),
  unique (order_id, store_id)
);
create index pickups_store_idx on public.pickups (store_id, status);

-- ---------------------------------------------------------------- utilidades
create or replace function public.gen_pickup_code() returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 31), 1), '' order by i)
  from (select gen_random_bytes(6) as b) x, generate_series(0, 5) i
$$;

-- ---------------------------------------------------------------- crear pedido (FR-022, FR-013, FR-024)
-- Devuelve columnas con prefijo new_ para no chocar con nombres de columnas.
create or replace function public.create_order(p_items jsonb)
returns table (new_order_id uuid, new_short_code text, new_total_cents integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  prof public.profiles;
  r record;
  prod public.products;
  st public.stores;
  total integer := 0;
  oid uuid;
  code text;
  hours integer;
begin
  if uid is null then
    raise exception 'Debes ingresar para comprar.' using errcode = '42501';
  end if;
  select * into prof from public.profiles where id = uid;
  if not found or prof.suspended then
    raise exception 'Tu cuenta no puede comprar.' using errcode = '42501';
  end if;
  if char_length(btrim(prof.name)) < 2 or char_length(btrim(prof.phone)) < 7 then
    raise exception 'Completa tu nombre y teléfono en Mi cuenta para comprar.' using errcode = '23514';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then
    raise exception 'El carrito está vacío o es demasiado grande.' using errcode = '23514';
  end if;

  select coalesce((select (value #>> '{}')::integer from public.settings where key = 'order_valid_hours'), 24)
    into hours;

  -- Validación y total con precios de la base (el cliente no decide el precio)
  for r in
    select (e ->> 'product_id')::uuid as pid, sum((e ->> 'qty')::integer)::integer as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    if r.qty is null or r.qty < 1 or r.qty > 50 then
      raise exception 'Cantidad inválida.' using errcode = '23514';
    end if;
    select * into prod from public.products where id = r.pid;
    if not found or prod.status <> 'active' or prod.hidden then
      raise exception 'Un producto del carrito ya no está disponible.' using errcode = '23514';
    end if;
    select * into st from public.stores where id = prod.store_id;
    if st.status <> 'approved' then
      raise exception 'Un producto del carrito ya no está disponible.' using errcode = '23514';
    end if;
    if st.owner_id = uid then
      raise exception 'No puedes comprar tus propios productos.' using errcode = '23514';
    end if;
    if prod.stock < r.qty then
      raise exception 'No hay stock suficiente de "%".', prod.title using errcode = '23514';
    end if;
    total := total + prod.price_cents * r.qty;
  end loop;

  insert into public.orders (buyer_id, total_cents, expires_at)
  values (uid, total, now() + make_interval(hours => hours))
  returning id, short_code into oid, code;

  insert into public.order_items (order_id, product_id, store_id, sku, title, image_path, qty, unit_price_cents)
  select oid, p.id, p.store_id, p.sku, p.title,
         (select i.path from public.product_images i where i.product_id = p.id order by i.position, i.created_at limit 1),
         q.qty, p.price_cents
    from (select (e ->> 'product_id')::uuid as pid, sum((e ->> 'qty')::integer)::integer as qty
            from jsonb_array_elements(p_items) e group by 1) q
    join public.products p on p.id = q.pid;

  return query select oid, code, total;
end $$;
revoke all on function public.create_order(jsonb) from public, anon;
grant execute on function public.create_order(jsonb) to authenticated;

-- ---------------------------------------------------------------- funciones solo para el servidor (Edge Functions)
create or replace function public.register_payment_qr(
  p_order_id uuid, p_bank_qr_id text, p_amount_cents integer,
  p_qr_image text, p_due_date date, p_description text
) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if o.status <> 'pending' then raise exception 'El pedido no está pendiente de pago.'; end if;
  if o.total_cents <> p_amount_cents then raise exception 'El monto del QR no coincide con el pedido.'; end if;
  insert into public.payments (order_id, bank_qr_id, amount_cents, qr_image, due_date, description)
  values (p_order_id, p_bank_qr_id, p_amount_cents, p_qr_image, p_due_date, p_description);
end $$;

-- FR-033/FR-034/FR-037/FR-039b/NFR-004: confirmación atómica e idempotente. Devuelve 'paid' | 'already_paid' | 'review'.
create or replace function public.confirm_payment(
  p_order_id uuid, p_bank_qr_id text, p_amount_cents integer,
  p_sender_name text default null, p_sender_bank_code text default null,
  p_sender_account text default null, p_paid_at timestamptz default null,
  p_raw jsonb default null
) returns text language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  pay public.payments;
  it record;
  prod public.products;
  reason text;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  select * into pay from public.payments where bank_qr_id = p_bank_qr_id and order_id = p_order_id for update;
  if not found then raise exception 'El QR no corresponde al pedido.'; end if;

  if pay.status = 'paid' then return 'already_paid'; end if;
  if pay.status = 'review' then return 'review'; end if;

  if o.status = 'paid' then
    reason := 'El pedido ya estaba pagado (posible pago duplicado).';
  elsif p_amount_cents <> o.total_cents then
    reason := 'El monto pagado no coincide con el total del pedido.';
  else
    -- Bloqueo ordenado de productos y verificación de stock (gana quien paga primero)
    for it in
      select product_id, sum(qty)::integer as qty from public.order_items
       where order_id = o.id group by product_id order by product_id
    loop
      select * into prod from public.products where id = it.product_id for update;
      if not found or prod.hidden then
        reason := 'Un producto ya no está disponible.'; exit;
      end if;
      if not exists (select 1 from public.stores s where s.id = prod.store_id and s.status = 'approved') then
        reason := 'La tienda ya no está disponible.'; exit;
      end if;
      if prod.stock < it.qty then
        reason := 'Sin stock suficiente: ' || prod.title; exit;
      end if;
    end loop;
  end if;

  if reason is not null then
    update public.orders set status = 'review', review_reason = reason where id = o.id;
    update public.payments
       set status = 'review', sender_name = p_sender_name, sender_bank_code = p_sender_bank_code,
           sender_account_masked = p_sender_account, paid_at = coalesce(p_paid_at, now()), raw_response = p_raw
     where id = pay.id;
    perform public.audit_write('payment.review', 'orders', o.id::text, to_jsonb(o),
                               jsonb_build_object('payment', p_bank_qr_id, 'amount_cents', p_amount_cents), reason);
    return 'review';
  end if;

  for it in
    select product_id, sum(qty)::integer as qty from public.order_items
     where order_id = o.id group by product_id order by product_id
  loop
    update public.products set stock = stock - it.qty where id = it.product_id;
  end loop;

  update public.orders set status = 'paid', paid_at = coalesce(p_paid_at, now()), review_reason = null where id = o.id;
  update public.payments
     set status = 'paid', sender_name = p_sender_name, sender_bank_code = p_sender_bank_code,
         sender_account_masked = p_sender_account, paid_at = coalesce(p_paid_at, now()), raw_response = p_raw
   where id = pay.id;

  insert into public.pickups (order_id, store_id, buyer_id, pickup_code)
  select o.id, s.store_id, o.buyer_id, public.gen_pickup_code()
    from (select distinct store_id from public.order_items where order_id = o.id) s;

  perform public.audit_write('payment.paid', 'orders', o.id::text, null,
                             jsonb_build_object('payment', p_bank_qr_id, 'amount_cents', p_amount_cents), null);
  return 'paid';
end $$;

-- Pedidos vencidos: se marcan y se devuelven los QR a anular en el banco
create or replace function public.expire_pending_orders()
returns table (expired_order_id uuid, expired_bank_qr_id text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with ex as (
    update public.orders set status = 'expired'
     where status = 'pending' and expires_at < now()
    returning id
  ), px as (
    update public.payments p set status = 'cancelled'
      from ex where p.order_id = ex.id and p.status = 'pending'
    returning p.order_id, p.bank_qr_id
  )
  select ex.id, px.bank_qr_id from ex left join px on px.order_id = ex.id;
end $$;

do $$ begin
  if exists (select from pg_roles where rolname = 'service_role') then
    revoke all on function public.register_payment_qr(uuid, text, integer, text, date, text) from public, anon, authenticated;
    revoke all on function public.confirm_payment(uuid, text, integer, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
    revoke all on function public.expire_pending_orders() from public, anon, authenticated;
    grant execute on function public.register_payment_qr(uuid, text, integer, text, date, text) to service_role;
    grant execute on function public.confirm_payment(uuid, text, integer, text, text, text, timestamptz, jsonb) to service_role;
    grant execute on function public.expire_pending_orders() to service_role;
  else
    revoke all on function public.register_payment_qr(uuid, text, integer, text, date, text) from public, anon, authenticated;
    revoke all on function public.confirm_payment(uuid, text, integer, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
    revoke all on function public.expire_pending_orders() from public, anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------- lectura para el comprador
create or replace function public.get_order_payment(p_order_id uuid)
returns table (qr_image text, amount_cents integer, due_date date, payment_status public.payment_status, bank_qr_id text)
language sql stable security definer set search_path = public as $$
  select p.qr_image, p.amount_cents, p.due_date, p.status, p.bank_qr_id
    from public.payments p join public.orders o on o.id = p.order_id
   where p.order_id = p_order_id and (o.buyer_id = auth.uid() or public.is_staff())
   order by p.created_at desc limit 1
$$;
revoke all on function public.get_order_payment(uuid) from public, anon;
grant execute on function public.get_order_payment(uuid) to authenticated;

-- FR-083: comprobante digital por enlace con token
create or replace function public.get_receipt(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o public.orders; pay public.payments; buyer public.profiles; result jsonb;
begin
  select * into o from public.orders where receipt_token = p_token and status = 'paid';
  if not found then return null; end if;
  select * into pay from public.payments where order_id = o.id and status = 'paid' order by paid_at desc limit 1;
  select * into buyer from public.profiles where id = o.buyer_id;
  select jsonb_build_object(
    'code', o.short_code,
    'paid_at', o.paid_at,
    'total_cents', o.total_cents,
    'buyer_name', buyer.name,
    'payer', jsonb_build_object(
      'name', pay.sender_name,
      'bank_code', pay.sender_bank_code,
      'bank_name', (select c.name from public.bank_catalog c where c.code = pay.sender_bank_code),
      'account', pay.sender_account_masked),
    'stores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'store_name', s.name,
        'pickup_info', s.pickup_info,
        'pickup_code', pk.pickup_code,
        'pickup_status', pk.status,
        'items', (select jsonb_agg(jsonb_build_object(
                    'sku', i.sku, 'title', i.title, 'qty', i.qty, 'unit_price_cents', i.unit_price_cents,
                    'image_path', i.image_path) order by i.title)
                   from public.order_items i where i.order_id = o.id and i.store_id = s.id)
      ) order by s.name)
      from public.pickups pk join public.stores s on s.id = pk.store_id
      where pk.order_id = o.id), '[]'::jsonb)
  ) into result;
  return result;
end $$;
grant execute on function public.get_receipt(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- retiro (FR-071/FR-072/FR-074)
create or replace function public.seller_pickups(p_status public.pickup_status default null)
returns table (
  pickup_id uuid, order_code text, buyer_name text, buyer_phone text,
  payer_name text, payer_bank_code text, paid_at timestamptz,
  pickup_status public.pickup_status, delivered_at timestamptz, items jsonb
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  select pk.id, o.short_code, b.name, b.phone, pay.sender_name, pay.sender_bank_code, o.paid_at,
         pk.status, pk.delivered_at,
         (select jsonb_agg(jsonb_build_object('sku', i.sku, 'title', i.title, 'qty', i.qty,
                  'unit_price_cents', i.unit_price_cents, 'image_path', i.image_path) order by i.title)
            from public.order_items i where i.order_id = o.id and i.store_id = pk.store_id)
    from public.pickups pk
    join public.orders o on o.id = pk.order_id
    join public.profiles b on b.id = pk.buyer_id
    left join public.payments pay on pay.order_id = o.id and pay.status = 'paid'
   where pk.store_id = (select s.id from public.stores s where s.owner_id = auth.uid())
     and (p_status is null or pk.status = p_status)
   order by o.paid_at desc;
end $$;
revoke all on function public.seller_pickups(public.pickup_status) from public, anon;
grant execute on function public.seller_pickups(public.pickup_status) to authenticated;

create or replace function public.mark_pickup_delivered(p_pickup_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare pk public.pickups;
begin
  select * into pk from public.pickups
   where id = p_pickup_id
     and store_id = (select s.id from public.stores s where s.owner_id = auth.uid())
   for update;
  if not found then raise exception 'Retiro no encontrado.' using errcode = '42501'; end if;
  if pk.status = 'delivered' then raise exception 'Este retiro ya fue entregado.' using errcode = '23514'; end if;
  if upper(btrim(coalesce(p_code, ''))) <> pk.pickup_code then
    raise exception 'El código de retiro no coincide.' using errcode = '23514';
  end if;
  update public.pickups set status = 'delivered', delivered_at = now(), delivered_by = auth.uid() where id = pk.id;
  perform public.audit_write('pickup.delivered', 'pickups', pk.id::text, to_jsonb(pk), null, null);
end $$;
revoke all on function public.mark_pickup_delivered(uuid, text) from public, anon;
grant execute on function public.mark_pickup_delivered(uuid, text) to authenticated;

-- FR-084: reporte "Quién pagó" para el personal
create or replace function public.admin_payments_report(p_from date default null, p_to date default null)
returns table (
  order_code text, order_status public.order_status, buyer_name text, payer_name text, payer_bank_code text,
  payer_bank_name text, amount_cents integer, paid_at timestamptz, receipt_token uuid, review_reason text
) language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_staff() then
    raise exception 'Solo el personal puede ver este reporte.' using errcode = '42501';
  end if;
  return query
  select o.short_code, o.status, b.name, pay.sender_name, pay.sender_bank_code,
         (select c.name from public.bank_catalog c where c.code = pay.sender_bank_code),
         o.total_cents, coalesce(o.paid_at, pay.paid_at), o.receipt_token, o.review_reason
    from public.orders o
    join public.profiles b on b.id = o.buyer_id
    left join public.payments pay on pay.order_id = o.id and pay.status in ('paid', 'review')
   where o.status in ('paid', 'review')
     and (p_from is null or coalesce(o.paid_at, pay.paid_at) >= p_from)
     and (p_to is null or coalesce(o.paid_at, pay.paid_at) < p_to + 1)
   order by coalesce(o.paid_at, pay.paid_at) desc;
end $$;
revoke all on function public.admin_payments_report(date, date) from public, anon;
grant execute on function public.admin_payments_report(date, date) to authenticated;

-- ---------------------------------------------------------------- RLS (NFR-001)
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;
alter table public.pickups     enable row level security;

create policy orders_select on public.orders for select to authenticated
  using (buyer_id = auth.uid() or public.is_staff());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.is_staff())));
create policy payments_select on public.payments for select to authenticated using (public.is_staff());
create policy pickups_select on public.pickups for select to authenticated
  using (buyer_id = auth.uid() or public.is_staff());

grant select on public.orders, public.order_items, public.pickups to authenticated;
grant select on public.payments to authenticated;
