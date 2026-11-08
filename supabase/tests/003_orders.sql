-- Pruebas de la spec 003 (pedidos sin reserva) y del núcleo de las specs 004/007. Cada caso cita el requisito.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql

create or replace function pg_temp.last_order(p_buyer uuid) returns uuid language sql as $$
  select id from public.orders where buyer_id = p_buyer order by short_code desc limit 1 $$;

create or replace function pg_temp.pay(p_buyer uuid, p_qr text, p_amount int default null, p_name text default 'PEDRO PEREZ') returns text language plpgsql as $$
declare oid uuid := pg_temp.last_order(p_buyer); tot int;
begin
  select total_cents into tot from public.orders where id = oid;
  perform public.register_payment_qr(oid, p_qr, tot, 'iVBORw0KGgo=', current_date, 'P-test');
  return public.confirm_payment(oid, p_qr, coalesce(p_amount, tot), p_name, '1016', '******1913', now(), '{}'::jsonb);
end $$;

create or replace function pg_temp.expect_value(p_sql text, p_expected text, p_label text) returns void language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  if v is distinct from p_expected then raise exception 'FALLÓ %: esperado %, obtenido %', p_label, p_expected, coalesce(v, 'NULL'); end if;
  raise notice 'OK   %', p_label;
end $$;

-- ---------- Datos base (superusuario)
update public.settings set value = 'false' where key = 'require_admin_mfa';
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a3', 'admin3@test', '{"name":"Admin3"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'vendedor_g@test', '{"name":"Vendedor G"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'vendedor_h@test', '{"name":"Vendedor H"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'comprador_i@test', '{"name":"Ana Compradora"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'comprador_j@test', '{"name":"Jose"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'comprador_k@test', '{"name":"Karla Compradora"}');
select public.bootstrap_staff_role('admin3@test', 'admin');
update public.profiles set name = 'Ana Compradora', phone = '70000001' where id = '00000000-0000-0000-0000-0000000000d3';
update public.profiles set name = 'Karla Compradora', phone = '70000003' where id = '00000000-0000-0000-0000-0000000000f3';
update public.profiles set phone = '' where id = '00000000-0000-0000-0000-0000000000e3';
insert into public.stores (owner_id, name, status, pickup_info) values
  ('00000000-0000-0000-0000-0000000000b3', 'Tienda G', 'approved', 'Av. G 123, sábados'),
  ('00000000-0000-0000-0000-0000000000c3', 'Tienda H', 'approved', 'Calle H 45, domingos');
insert into public.products (store_id, title, price_cents, stock) values
  ((select id from public.stores where name = 'Tienda G'), 'Camisa G', 5000, 3),
  ((select id from public.stores where name = 'Tienda G'), 'Zapatos G', 8000, 1),
  ((select id from public.stores where name = 'Tienda G'), 'Reloj pausado', 9000, 1),
  ((select id from public.stores where name = 'Tienda G'), 'Borrador G', 0, 1),
  ((select id from public.stores where name = 'Tienda H'), 'Gorra H', 2000, 5);
insert into public.product_images (product_id, path)
  select id, store_id || '/' || id || '/1.webp' from public.products
   where title in ('Camisa G', 'Zapatos G', 'Reloj pausado', 'Gorra H');
update public.products set status = 'active' where title in ('Camisa G', 'Zapatos G', 'Gorra H');
update public.products set status = 'paused' where title = 'Reloj pausado';
insert into public.bank_catalog (code, name) values ('1016', 'Banco Económico (prueba)');

-- ---------- FR-022 / FR-002: validaciones al crear el pedido
begin;
select pg_temp.act_as(null);
select pg_temp.expect_error($$select * from public.create_order('[]'::jsonb)$$, 'TC-003-01 FR-022 sin sesión no se crea pedido');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e3');
select pg_temp.expect_error($$select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Camisa G'), 'qty', 1)))$$, 'TC-003-02 FR-002 comprador sin teléfono no puede comprar');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
select pg_temp.expect_error($$select * from public.create_order('[]'::jsonb)$$, 'TC-003-03 FR-022 carrito vacío rechazado');
select pg_temp.expect_error($$select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Camisa G'), 'qty', 4)))$$, 'TC-003-04 FR-022 cantidad mayor al stock rechazada');
select pg_temp.expect_error($$select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Reloj pausado'), 'qty', 1)))$$, 'TC-003-05 FR-022 producto pausado rechazado');
select pg_temp.expect_error($$select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(), 'qty', 1)))$$, 'TC-003-06 FR-022 producto inexistente rechazado');
select pg_temp.expect_error($$select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Camisa G'), 'qty', 0)))$$, 'TC-003-07 FR-022 cantidad 0 rechazada');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
update public.profiles set name = 'Vendedor G', phone = '70000009' where id = auth.uid();
select pg_temp.expect_error($$select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Camisa G'), 'qty', 1)))$$, 'TC-003-08 FR-022 no puede comprar sus propios productos');
reset role;
commit;

-- ---------- Pedido válido: total del servidor, sin reservar stock, ítems de dos tiendas
begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
select * from public.create_order(jsonb_build_array(
  jsonb_build_object('product_id', (select id from public.products where title = 'Camisa G'), 'qty', 2),
  jsonb_build_object('product_id', (select id from public.products where title = 'Gorra H'), 'qty', 1),
  jsonb_build_object('product_id', (select id from public.products where title = 'Camisa G'), 'qty', 1)));
select pg_temp.expect_count($$select 1 from public.orders where total_cents = 5000*3 + 2000 and status = 'pending'$$, 1, 'TC-003-09 FR-022 el total se calcula en el servidor con los precios de la base');
select pg_temp.expect_count($$select 1 from public.order_items where qty = 3 and unit_price_cents = 5000$$, 1, 'TC-003-10 FR-022 líneas repetidas se suman en una sola');
select pg_temp.expect_count($$select distinct store_id from public.order_items$$, 2, 'TC-003-11 FR-024 cada ítem guarda su tienda (pedido con dos vendedores)');
reset role;
commit;
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa G' and stock = 3$$, 1, 'TC-003-12 FR-022 crear el pedido NO descuenta stock');

-- FR-013: precio congelado
update public.products set price_cents = 9999 where title = 'Camisa G';
select pg_temp.expect_count($$select 1 from public.order_items where title = 'Camisa G' and unit_price_cents = 5000$$, 1, 'TC-003-13 FR-013 el pedido conserva el precio con que se creó');
update public.products set price_cents = 5000 where title = 'Camisa G';

-- ---------- Aislamiento (FR-025, NFR-001)
begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
select pg_temp.expect_count($$select 1 from public.orders$$, 0, 'TC-003-14 FR-025 otro comprador no ve pedidos ajenos');
select pg_temp.expect_count($$select 1 from public.order_items$$, 0, 'TC-003-15 FR-025 otro comprador no ve ítems ajenos');
select pg_temp.expect_error($$insert into public.orders (buyer_id, total_cents, expires_at) values (auth.uid(), 100, now() + interval '1 day')$$, 'TC-003-16 FR-022 no se crean pedidos por inserción directa');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect_count($$select 1 from public.orders$$, 0, 'TC-003-17 NFR-001 el vendedor no lee la tabla de pedidos');
select pg_temp.expect_count($$select 1 from public.payments$$, 0, 'TC-003-18 NFR-001 el vendedor no lee pagos');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
select pg_temp.expect_count($$select 1 from public.orders$$, 1, 'TC-003-19 FR-025 el comprador ve su pedido');
select pg_temp.expect_error($$select public.confirm_payment((select id from public.orders limit 1), 'X', 17000)$$, 'TC-003-20 FR-033 el cliente no puede confirmar pagos');
select pg_temp.expect_error($$select public.register_payment_qr((select id from public.orders limit 1), 'X', 17000, 'img', current_date, 'd')$$, 'TC-003-21 FR-033 el cliente no puede registrar QR');
reset role;
commit;

-- ---------- Confirmación atómica (FR-033, FR-034, FR-037, FR-070)
select pg_temp.expect_value($$select pg_temp.pay('00000000-0000-0000-0000-0000000000d3', 'QR-1')$$, 'paid', 'TC-003-22 FR-033 confirma el pago del pedido');
select pg_temp.expect_count($$select 1 from public.orders where status = 'paid' and paid_at is not null$$, 1, 'TC-003-23 FR-033 el pedido pasa a pagado');
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa G' and stock = 0 and status = 'sold_out'$$, 1, 'TC-003-24 FR-037 el stock se descuenta y el producto agotado pasa a sold_out');
select pg_temp.expect_count($$select 1 from public.products where title = 'Gorra H' and stock = 4 and status = 'active'$$, 1, 'TC-003-25 FR-037 solo se descuenta lo comprado');
begin;
select pg_temp.act_as(null);
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa G'$$, 0, 'TC-003-26 FR-037 el producto agotado sale del catálogo público');
reset role;
commit;
select pg_temp.expect_count($$select 1 from public.pickups where char_length(pickup_code) = 6 and status = 'ready'$$, 2, 'TC-003-27 FR-070 se crea un retiro por tienda con código de 6 caracteres');
select pg_temp.expect_value($$select public.confirm_payment(o.id, 'QR-1', o.total_cents, 'PEDRO PEREZ', '1016', '******1913', now(), '{}'::jsonb) from public.orders o where o.status = 'paid'$$, 'already_paid', 'TC-003-28 FR-034 confirmar dos veces no duplica el descuento');
select pg_temp.expect_count($$select 1 from public.products where title = 'Gorra H' and stock = 4$$, 1, 'TC-003-29 FR-034 el stock no cambia en la segunda confirmación');
select pg_temp.expect_count($$select 1 from public.payments where sender_name = 'PEDRO PEREZ' and sender_bank_code = '1016' and status = 'paid'$$, 1, 'TC-003-30 FR-035 se guarda nombre y banco de quien pagó');

-- ---------- NFR-004: dos pedidos por la última unidad; gana quien paga primero
begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Zapatos G'), 'qty', 1)));
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Zapatos G'), 'qty', 1)));
reset role;
commit;
select pg_temp.expect_count($$select 1 from public.order_items where title = 'Zapatos G'$$, 2, 'TC-003-31 NFR-004 ambos compradores pueden crear el pedido (sin reserva)');
select pg_temp.expect_value($$select pg_temp.pay('00000000-0000-0000-0000-0000000000f3', 'QR-2', null, 'KARLA')$$, 'paid', 'TC-003-32 FR-023a NFR-004 el primer pago confirmado se queda con el producto');
select pg_temp.expect_value($$select pg_temp.pay('00000000-0000-0000-0000-0000000000d3', 'QR-3', null, 'ANA')$$, 'review', 'TC-003-33 FR-023a NFR-004 el segundo pago queda en revisión');
select pg_temp.expect_count($$select 1 from public.products where title = 'Zapatos G' and stock = 0$$, 1, 'TC-003-34 NFR-004 el stock nunca queda negativo');
select pg_temp.expect_count($$select 1 from public.orders o where o.status = 'review' and o.review_reason like 'Sin stock%'$$, 1, 'TC-003-35 FR-039b el pedido perdedor queda en revisión con motivo');
select pg_temp.expect_count($$select 1 from public.pickups p join public.orders o on o.id = p.order_id where o.status = 'review'$$, 0, 'TC-003-36 FR-039b un pedido en revisión no genera retiro');

-- ---------- Monto distinto y pago tardío (FR-039b, FR-023)
begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Gorra H'), 'qty', 1)));
reset role;
commit;
select pg_temp.expect_value($$select pg_temp.pay('00000000-0000-0000-0000-0000000000f3', 'QR-4', 1999)$$, 'review', 'TC-003-37 FR-039b un monto distinto al total queda en revisión');
select pg_temp.expect_count($$select 1 from public.products where title = 'Gorra H' and stock = 4$$, 1, 'TC-003-38 FR-039b un pago en revisión no toca el stock');

begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f3');
select * from public.create_order(jsonb_build_array(jsonb_build_object('product_id', (select id from public.products where title = 'Gorra H'), 'qty', 1)));
reset role;
commit;
select public.register_payment_qr(pg_temp.last_order('00000000-0000-0000-0000-0000000000f3'), 'QR-5', 2000, 'img', current_date, 'late');
update public.orders set expires_at = now() - interval '1 hour' where id = pg_temp.last_order('00000000-0000-0000-0000-0000000000f3');
select pg_temp.expect_value($$select expired_bank_qr_id from public.expire_pending_orders()$$, 'QR-5', 'TC-003-39 FR-023 al vencer, el pedido se marca y se devuelve su QR para anularlo');
select pg_temp.expect_count($$select 1 from public.orders where status = 'expired'$$, 1, 'TC-003-40 FR-023 el pedido vencido pasa a expired');
select pg_temp.expect_value($$select public.confirm_payment(pg_temp.last_order('00000000-0000-0000-0000-0000000000f3'), 'QR-5', 2000, 'KARLA', '1016', '******1', now(), '{}'::jsonb)$$, 'paid', 'TC-003-41 FR-039b un pago tardío se honra si el monto coincide y hay stock');
select pg_temp.expect_count($$select 1 from public.products where title = 'Gorra H' and stock = 3$$, 1, 'TC-003-42 FR-039b el pago tardío descuenta el stock');

-- ---------- Comprobante digital (FR-083)
select o.receipt_token as tok from public.orders o join public.payments p on p.order_id = o.id where p.bank_qr_id = 'QR-1' \gset
begin;
select pg_temp.act_as(null);
select pg_temp.expect_value(format($q$select public.get_receipt(%L)->'payer'->>'name'$q$, :'tok'), 'PEDRO PEREZ', 'TC-003-43 FR-083 el comprobante muestra quién pagó, sin iniciar sesión');
select pg_temp.expect_value(format($q$select public.get_receipt(%L)->'payer'->>'bank_name'$q$, :'tok'), 'Banco Económico (prueba)', 'TC-003-44 FR-083 el comprobante muestra el nombre del banco del catálogo');
select pg_temp.expect_value(format($q$select jsonb_array_length(public.get_receipt(%L)->'stores')::text$q$, :'tok'), '2', 'TC-003-45 FR-083 el comprobante separa los ítems por vendedor con su código de retiro');
select pg_temp.expect_value($$select (public.get_receipt(gen_random_uuid()) is null)::text$$, 'true', 'TC-003-46 FR-083 un token inválido no devuelve nada');
reset role;
commit;
select o.receipt_token as tok_review from public.orders o where o.status = 'review' limit 1 \gset
select pg_temp.expect_value(format($q$select (public.get_receipt(%L) is null)::text$q$, :'tok_review'), 'true', 'TC-003-47 FR-083 un pedido sin pago confirmado no tiene comprobante');

-- ---------- Retiro (FR-071, FR-072, FR-074)
select id as pk_id, pickup_code as pk_code from public.pickups
 where store_id = (select id from public.stores where name = 'Tienda G') order by ready_at, id limit 1 \gset
begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect_count($$select 1 from public.seller_pickups()$$, 2, 'TC-003-48 FR-072 el vendedor G ve solo los retiros de su tienda');
select pg_temp.expect_count($$select 1 from public.seller_pickups() where buyer_name in ('Ana Compradora', 'Karla Compradora') and buyer_phone <> ''$$, 2, 'TC-003-49 FR-071 el vendedor ve nombre y teléfono de quien compró');
select pg_temp.expect_count($$select 1 from public.seller_pickups() where items::text like '%Gorra%'$$, 0, 'TC-003-50 FR-072 el vendedor no ve ítems de otra tienda del mismo pedido');
select pg_temp.expect_error(format($q$select public.mark_pickup_delivered(%L, 'ZZZZZZ')$q$, :'pk_id'), 'TC-003-51 FR-074 un código de retiro incorrecto se rechaza');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
select pg_temp.expect_count($$select 1 from public.seller_pickups()$$, 2, 'TC-003-52 FR-072 el vendedor H ve solo sus retiros');
select pg_temp.expect_error(format($q$select public.mark_pickup_delivered(%L, %L)$q$, :'pk_id', :'pk_code'), 'TC-003-53 FR-072 otro vendedor no puede entregar un retiro ajeno');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d3');
select pg_temp.expect_count($$select 1 from public.seller_pickups()$$, 0, 'TC-003-54 FR-072 un comprador no ve retiros de vendedores');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect_ok(format($q$select public.mark_pickup_delivered(%L, %L)$q$, :'pk_id', lower(:'pk_code')), 'TC-003-55 FR-074 con el código correcto el retiro queda entregado');
select pg_temp.expect_error(format($q$select public.mark_pickup_delivered(%L, %L)$q$, :'pk_id', :'pk_code'), 'TC-003-56 FR-074 un retiro entregado no se entrega dos veces');
select pg_temp.expect_count($$select 1 from public.seller_pickups('delivered')$$, 1, 'TC-003-57 FR-079 el vendedor puede listar sus retiros entregados');
reset role;
commit;

-- ---------- Reporte "Quién pagó" (FR-084)
begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
select pg_temp.expect_count($$select 1 from public.admin_payments_report()$$, 5, 'TC-003-58 FR-084 el admin ve pagos confirmados y en revisión');
select pg_temp.expect_count($$select 1 from public.admin_payments_report() where order_status = 'paid' and payer_name is not null and receipt_token is not null$$, 3, 'TC-003-59 FR-084 cada pago confirmado trae pagador y enlace de comprobante');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b3');
select pg_temp.expect_error($$select * from public.admin_payments_report()$$, 'TC-003-60 FR-084 el vendedor no accede al reporte global');
reset role;
commit;

\echo TODAS LAS PRUEBAS PASARON
