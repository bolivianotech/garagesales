-- Pruebas de las funciones de apoyo al cobro (spec 004). Cada caso cita el requisito.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql

update public.settings set value = 'false' where key = 'require_admin_mfa';
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000a6001', 'vendedor_p6@test', '{"name":"Vendedor P6"}'),
  ('00000000-0000-0000-0000-0000000a6002', 'comprador_p6@test', '{"name":"Comprador P6"}');
update public.profiles set name = 'Comprador P6', phone = '70000066' where id = '00000000-0000-0000-0000-0000000a6002';
insert into public.stores (owner_id, name, status) values ('00000000-0000-0000-0000-0000000a6001', 'Tienda P6', 'approved');
insert into public.products (store_id, title, price_cents, stock)
  values ((select id from public.stores where name = 'Tienda P6'), 'Producto P6', 100, 50);
insert into public.product_images (product_id, path)
  select id, store_id || '/' || id || '/1.webp' from public.products where title = 'Producto P6';
update public.products set status = 'active' where title = 'Producto P6';

-- Seis pedidos con su QR: A (reciente), B (antiguo), C (vencido hace 1 h), D (pagado), E (vencido hace 3 días), F (reciente)
do $$
declare oid uuid; n int := 0; codigo text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000a6002', true);
  foreach codigo in array array['A', 'B', 'C', 'D', 'E', 'F'] loop
    n := n + 1;
    select new_order_id into oid from public.create_order(jsonb_build_array(
      jsonb_build_object('product_id', (select id from public.products where title = 'Producto P6'), 'qty', 1)));
    perform public.register_payment_qr(oid, 'P6-' || codigo, 100, 'img', current_date, 'p6 ' || codigo);
  end loop;
end $$;
update public.payments set created_at = now() - interval '2 hours' where bank_qr_id = 'P6-B';
update public.orders set status = 'expired', expires_at = now() - interval '1 hour'
  where id = (select order_id from public.payments where bank_qr_id = 'P6-C');
update public.payments set status = 'cancelled' where bank_qr_id = 'P6-C';
select public.confirm_payment((select order_id from public.payments where bank_qr_id = 'P6-D'), 'P6-D', 100, 'PAGADOR', '1016', '***', now(), '{}'::jsonb);
update public.orders set status = 'expired', expires_at = now() - interval '3 days'
  where id = (select order_id from public.payments where bank_qr_id = 'P6-E');
update public.payments set status = 'cancelled' where bank_qr_id = 'P6-E';

select pg_temp.expect_value($$select count(*)::text from public.payments_to_check(100, 0, 20) where bank_qr_id like 'P6-%'$$, '2', 'TC-006-01 FR-032 el camino rápido entrega solo pagos pendientes y recientes (A y F)');
select pg_temp.expect_value($$select count(*)::text from public.payments_to_check(100, 20, 20) where bank_qr_id like 'P6-%'$$, '0', 'TC-006-02 NFR-009 un pago recién consultado no se vuelve a entregar antes del tiempo mínimo');
select pg_temp.expect_count($$select 1 from public.payments where bank_qr_id like 'P6-%' and last_checked_at is not null$$, 2, 'TC-006-03 NFR-009 se marca la hora de consulta solo de los entregados');
update public.payments set last_checked_at = null where bank_qr_id like 'P6-%';
select pg_temp.expect_value($$select count(*)::text from public.payments_to_check(1, 0, 20) where bank_qr_id like 'P6-%'$$, '1', 'TC-006-04 NFR-009 se respeta el límite pedido');
select pg_temp.expect_value($$select count(*)::text from public.payments_to_check(100, 0, 600) where bank_qr_id = 'P6-B'$$, '1', 'TC-006-05 FR-032 con una ventana mayor también entrega pagos más antiguos');

select pg_temp.expect_value($$select string_agg(bank_qr_id, ',' order by bank_qr_id) from public.payments_by_qr(array['P6-A','P6-B','P6-C','P6-D','P6-E','P6-X'])$$, 'P6-A,P6-B,P6-C', 'TC-006-06 FR-039b cruzar con el banco devuelve pendientes y cancelados recientes, no pagados, no muy antiguos ni desconocidos');
select pg_temp.expect_value($$select count(*)::text from public.payments_by_qr(null)$$, '0', 'TC-006-07 FR-032 una lista vacía no devuelve nada');

update public.payments set last_checked_at = null where bank_qr_id like 'P6-%';
select pg_temp.expect_value($$select count(*)::text from public.claim_payment_check((select order_id from public.payments where bank_qr_id = 'P6-A'), 3)$$, '1', 'TC-006-08 FR-032 la pantalla de pago puede consultar su pedido pendiente');
select pg_temp.expect_value($$select count(*)::text from public.claim_payment_check((select order_id from public.payments where bank_qr_id = 'P6-A'), 3)$$, '0', 'TC-006-09 NFR-009 no se consulta al banco más de una vez cada pocos segundos por pedido');
select pg_temp.expect_value($$select count(*)::text from public.claim_payment_check((select order_id from public.payments where bank_qr_id = 'P6-D'), 0)$$, '0', 'TC-006-10 FR-034 un pedido ya pagado no se vuelve a consultar');

begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000a6002');
select pg_temp.expect_error($$select * from public.payments_to_check(10, 0, 20)$$, 'TC-006-11 FR-031 el cliente no puede ejecutar payments_to_check');
select pg_temp.expect_error($$select * from public.payments_by_qr(array['P6-A'])$$, 'TC-006-12 FR-031 el cliente no puede ejecutar payments_by_qr');
select pg_temp.expect_error($$select * from public.claim_payment_check(gen_random_uuid(), 0)$$, 'TC-006-13 FR-031 el cliente no puede ejecutar claim_payment_check');
reset role;
commit;

\echo TODAS LAS PRUEBAS PASARON
