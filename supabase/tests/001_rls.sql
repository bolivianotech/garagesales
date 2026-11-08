-- Pruebas de RLS y reglas de la spec 001/008. Cada bloque cita el requisito.
-- Ejecutar con: supabase/tests/run.sh
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
  execute 'set local role ' || case when p_uid is null then 'anon' else 'authenticated' end;
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'OK   %', p_label; return;
  end;
  raise exception 'FALLÓ (debía rechazarse): %', p_label;
end $$;

create or replace function pg_temp.expect_count(p_sql text, p_expected int, p_label text) returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || p_sql || ') q' into n;
  if n <> p_expected then raise exception 'FALLÓ %: esperado %, obtenido %', p_label, p_expected, n; end if;
  raise notice 'OK   %', p_label;
end $$;

create or replace function pg_temp.expect_affected(p_sql text, p_expected int, p_label text) returns void language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_expected then raise exception 'FALLÓ %: filas afectadas esperadas %, obtenidas %', p_label, p_expected, n; end if;
  raise notice 'OK   %', p_label;
end $$;

-- Datos base (como superusuario)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000f', 'finanzas@test', '{"name":"Finanzas"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'vendedor_a@test', '{"name":"Vendedor A"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'vendedor_b@test', '{"name":"Vendedor B"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'comprador@test', '{"name":"Comprador"}');
select public.bootstrap_staff_role('admin@test', 'admin');
select public.bootstrap_staff_role('finanzas@test', 'finance_admin');

begin;
-- FR-001/FR-002: el perfil se crea al registrarse
select pg_temp.expect_count($$select 1 from public.profiles$$, 5, 'TC-001-01 FR-002 perfiles creados por trigger');

-- FR-004: el usuario no puede cambiar su propio rol
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'TC-001-02 FR-004 no se autoasciende a admin');
update public.profiles set name = 'Comprador Uno', phone = '70000000' where id = auth.uid();
select pg_temp.expect_count($$select 1 from public.profiles where name = 'Comprador Uno'$$, 1, 'TC-001-03 FR-002 edita su nombre y teléfono');
-- FR-006: solo ve su propio perfil
select pg_temp.expect_count($$select 1 from public.profiles$$, 1, 'TC-001-04 FR-006 comprador solo ve su perfil');

-- FR-003: solicitud de vendedor queda pendiente
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.stores (owner_id, name, seller_kind) values (auth.uid(), 'Tienda A', 'tiktok_live');
select pg_temp.expect_error($$insert into public.stores (owner_id, name, status) values (auth.uid(), 'Otra', 'approved')$$, 'TC-001-05 FR-003 no puede crear tienda ya aprobada / segunda tienda');
select pg_temp.expect_error($$update public.stores set status = 'approved' where owner_id = auth.uid()$$, 'TC-001-06 FR-003 no se autoaprueba');
select pg_temp.expect_error($$select public.admin_review_store((select id from public.stores limit 1), 'approved')$$, 'TC-001-07 FR-003 un vendedor no puede ejecutar la revisión');

reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.stores (owner_id, name) values (auth.uid(), 'Tienda B');

-- FR-005: el admin aprueba
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.admin_review_store((select id from public.stores where name = 'Tienda A'), 'approved', 'ok');
select public.admin_review_store((select id from public.stores where name = 'Tienda B'), 'approved', 'ok');
select pg_temp.expect_count($$select 1 from public.profiles where role = 'seller'$$, 2, 'TC-001-08 FR-005 al aprobar, el usuario pasa a seller');

-- FR-004 / NFR-001: aislamiento entre vendedores
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_count($$select 1 from public.stores where owner_id = auth.uid()$$, 1, 'TC-001-09 FR-004 vendedor A ve su tienda');
select pg_temp.expect_affected($$update public.stores set name = 'Hackeada' where name = 'Tienda B'$$, 0, 'TC-001-10 FR-004 vendedor A no modifica la tienda de B');
select pg_temp.expect_count($$select 1 from public.profiles where id <> auth.uid()$$, 0, 'TC-001-11 FR-004 vendedor A no ve perfiles ajenos');
select pg_temp.expect_count($$select 1 from public.audit_log$$, 0, 'TC-001-12 NFR-001 vendedor no ve auditoría');
select pg_temp.expect_count($$select 1 from public.settings$$, 0, 'TC-001-13 NFR-001 vendedor no ve configuración');

-- Público: solo tiendas aprobadas
reset role;
select pg_temp.act_as(null);
select pg_temp.expect_count($$select 1 from public.stores$$, 2, 'TC-001-14 visitante ve tiendas aprobadas');
reset role;

-- Suspensión
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.admin_set_user_suspended('00000000-0000-0000-0000-0000000000b1', true, 'prueba');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($$insert into public.stores (owner_id, name) values (auth.uid(), 'x')$$, 'TC-001-15 FR-005 suspendido no puede crear tienda');
reset role;

-- Finanzas: solo finance_admin cambia configuración; admin no
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_affected($$update public.settings set value = '200' where key = 'commission_bps'$$, 0, 'TC-001-16 FR-099 admin no cambia la comisión');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect_affected($$update public.settings set value = '100' where key = 'commission_bps'$$, 1, 'TC-001-17 FR-099 finance_admin sí cambia configuración');
select pg_temp.expect_error($$select public.admin_review_store((select id from public.stores limit 1), 'suspended')$$, 'TC-001-18 FR-099 finance_admin no revisa vendedores');
reset role;

-- 2FA obligatorio cuando se activa
update public.settings set value = 'true' where key = 'require_admin_mfa';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.admin_set_user_suspended('00000000-0000-0000-0000-0000000000c1', true)$$, 'TC-001-19 FR-099a sin 2FA no se ejecutan acciones de admin');
reset role;
commit;

-- FR-095: auditoría inmutable y encadenada
select pg_temp.expect_error($$update public.audit_log set action = 'x'$$, 'TC-001-20 FR-095 audit_log no admite UPDATE');
select pg_temp.expect_error($$delete from public.audit_log$$, 'TC-001-21 FR-095 audit_log no admite DELETE');
select pg_temp.expect_error($$truncate public.audit_log$$, 'TC-001-22 FR-095 audit_log no admite TRUNCATE');
do $$ begin
  if public.verify_audit_chain() is not null then raise exception 'FALLÓ FR-096: cadena rota sin manipulación'; end if;
  raise notice 'OK   TC-001-23 FR-096 cadena de auditoría íntegra';
end $$;

-- Manipulación detectable: se desactivan triggers como superusuario y se altera una fila
alter table public.audit_log disable trigger audit_no_update;
update public.audit_log set reason = 'alterado' where id = (select min(id) from public.audit_log where action like 'store.%');
alter table public.audit_log enable trigger audit_no_update;
do $$ begin
  if public.verify_audit_chain() is null then raise exception 'FALLÓ FR-096: no se detectó la manipulación'; end if;
  raise notice 'OK   TC-001-24 FR-096 manipulación detectada';
end $$;

\echo TODAS LAS PRUEBAS PASARON
