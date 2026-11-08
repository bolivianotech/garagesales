-- Pruebas de la spec 002 (catálogo del vendedor). Cada caso cita el requisito.
\set ON_ERROR_STOP on
\set QUIET on
\ir helpers.sql

-- Datos base (superusuario). La configuración de 2FA queda desactivada para esta prueba.
update public.settings set value = 'false' where key = 'require_admin_mfa';
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa', 'admin2@test', '{"name":"Admin2"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'vendedor_c@test', '{"name":"Vendedor C"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'vendedor_d@test', '{"name":"Vendedor D"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'comprador2@test', '{"name":"Comprador2"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'vendedor_f@test', '{"name":"Vendedor F"}');
select public.bootstrap_staff_role('admin2@test', 'admin');

begin;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
insert into public.stores (owner_id, name) values (auth.uid(), 'Tienda C');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
insert into public.stores (owner_id, name) values (auth.uid(), 'Tienda D');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f2');
insert into public.stores (owner_id, name) values (auth.uid(), 'Tienda F pendiente');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
select public.admin_review_store((select id from public.stores where name = 'Tienda C'), 'approved');
select public.admin_review_store((select id from public.stores where name = 'Tienda D'), 'approved');
reset role;

-- ---------- FR-010: creación y validaciones
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
insert into public.products (store_id, title, price_cents, stock, category)
values ((select id from public.stores where name = 'Tienda C'), 'Camisa', 5000, 3, 'ropa');
select pg_temp.expect_count($$select 1 from public.products where sku like 'GS-%' and status = 'draft'$$, 1, 'TC-002-01 FR-010 producto nuevo en borrador con SKU automático');
select pg_temp.expect_error($$insert into public.products (store_id, title, price_cents) values ((select id from public.stores where name = 'Tienda D'), 'Intruso', 100)$$, 'TC-002-02 FR-004 no crea productos en la tienda de otro vendedor');
select pg_temp.expect_error($$insert into public.products (store_id, title, price_cents, status) values ((select id from public.stores where name = 'Tienda C'), 'Directo', 100, 'active')$$, 'TC-002-03 FR-012 un producto nuevo no puede nacer publicado');
select pg_temp.expect_error($$insert into public.products (store_id, title, price_cents) values ((select id from public.stores where name = 'Tienda C'), 'Negativo', -5)$$, 'TC-002-04 FR-010 precio negativo rechazado');
select pg_temp.expect_error($$insert into public.products (store_id, title, stock) values ((select id from public.stores where name = 'Tienda C'), 'Sin stock neg', -1)$$, 'TC-002-05 FR-010 cantidad negativa rechazada');
select pg_temp.expect_error($$update public.products set status = 'active' where title = 'Camisa'$$, 'TC-002-06 FR-010 no se publica sin fotos');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000f2');
select pg_temp.expect_error($$insert into public.products (store_id, title, price_cents) values ((select id from public.stores where name = 'Tienda F pendiente'), 'Pendiente', 100)$$, 'TC-002-07 FR-003 tienda pendiente no puede crear productos');
reset role;

-- ---------- Fotos: ruta, límite y publicación
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect_error($$insert into public.product_images (product_id, path) select id, (select id::text from public.stores where name = 'Tienda D') || '/' || id || '/x.webp' from public.products where title = 'Camisa'$$, 'TC-002-08 FR-004 la foto debe ir en la carpeta de la propia tienda');
select pg_temp.expect_ok($$insert into public.product_images (product_id, path) select id, store_id || '/' || id || '/1.webp' from public.products where title = 'Camisa'$$, 'TC-002-09 FR-010 agrega la primera foto');
select pg_temp.expect_error($$update public.products set price_cents = 0, status = 'active' where title = 'Camisa'$$, 'TC-002-10 FR-010 no se publica con precio 0');
update public.products set status = 'active' where title = 'Camisa';
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa' and status = 'active'$$, 1, 'TC-002-11 FR-010 publica con foto y precio');
select pg_temp.expect_error($$delete from public.product_images where path like '%/1.webp'$$, 'TC-002-12 FR-010 no se borra la única foto de un producto publicado');

-- FR-012: agotado y reactivación automáticos
update public.products set stock = 0 where title = 'Camisa';
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa' and status = 'sold_out'$$, 1, 'TC-002-13 FR-012 stock 0 pasa a agotado');
update public.products set stock = 2 where title = 'Camisa';
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa' and status = 'active'$$, 1, 'TC-002-14 FR-012 stock > 0 reactiva');

-- Máximo 5 fotos
insert into public.product_images (product_id, path)
  select id, store_id || '/' || id || '/' || g || '.webp' from public.products, generate_series(2, 5) g where title = 'Camisa';
select pg_temp.expect_error($$insert into public.product_images (product_id, path) select id, store_id || '/' || id || '/6.webp' from public.products where title = 'Camisa'$$, 'TC-002-15 FR-010 máximo 5 fotos');
reset role;

-- ---------- Aislamiento (NFR-001 / FR-004) y visibilidad pública
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select pg_temp.expect_affected($$update public.products set price_cents = 1 where title = 'Camisa'$$, 0, 'TC-002-16 FR-004 otro vendedor no modifica el producto');
select pg_temp.expect_count($$select 1 from public.products where title = 'Camisa'$$, 1, 'TC-002-17 visible: el producto activo es público');
insert into public.products (store_id, title, price_cents) values ((select id from public.stores where name = 'Tienda D'), 'Borrador D', 0);
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect_count($$select 1 from public.products where title = 'Borrador D'$$, 0, 'TC-002-18 FR-004 el vendedor C no ve el borrador de D');
reset role;
select pg_temp.act_as(null);
select pg_temp.expect_count($$select 1 from public.products$$, 1, 'TC-002-19 visitante ve solo productos activos');
select pg_temp.expect_count($$select 1 from public.product_images$$, 5, 'TC-002-20 visitante ve las fotos de productos públicos');
reset role;

-- Pausar lo oculta
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
update public.products set status = 'paused' where title = 'Camisa';
reset role;
select pg_temp.act_as(null);
select pg_temp.expect_count($$select 1 from public.products$$, 0, 'TC-002-21 FR-012 pausado no es público');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
update public.products set status = 'active' where title = 'Camisa';

-- Moderación
select pg_temp.expect_error($$update public.products set hidden = true where title = 'Camisa'$$, 'TC-002-22 FR-005 el vendedor no se auto-modera');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
select public.admin_review_store((select id from public.stores where name = 'Tienda D'), 'suspended', 'prueba');
select public.admin_set_product_hidden((select id from public.products where title = 'Camisa'), true, 'contenido indebido');
reset role;
select pg_temp.act_as(null);
select pg_temp.expect_count($$select 1 from public.products$$, 0, 'TC-002-23 FR-005 producto oculto por el admin no es público');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
select public.admin_set_product_hidden((select id from public.products where title = 'Camisa'), false);
reset role;
select pg_temp.act_as(null);
select pg_temp.expect_count($$select 1 from public.products$$, 1, 'TC-002-24 FR-005 reaparece al quitar la moderación');
reset role;

-- ---------- Borrado
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
insert into public.products (store_id, title, price_cents) values ((select id from public.stores where name = 'Tienda C'), 'Borrador C', 0);
select pg_temp.expect_affected($$delete from public.products where title = 'Camisa'$$, 0, 'TC-002-25 solo se borran borradores (los publicados se pausan)');
select pg_temp.expect_affected($$delete from public.products where title = 'Borrador C'$$, 1, 'TC-002-26 se puede borrar un borrador');
reset role;

select id as store_d from public.stores where name = 'Tienda D' \gset
-- ---------- Storage (FR-011)
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect_ok($$insert into storage.objects (bucket_id, name) select 'product-images', id || '/p/a.webp' from public.stores where name = 'Tienda C'$$, 'TC-002-27 FR-011 sube a la carpeta de su tienda');
select pg_temp.expect_error(format($q$insert into storage.objects (bucket_id, name) values ('product-images', %L)$q$, :'store_d' || '/p/b.webp'), 'TC-002-28 FR-004 no sube a la carpeta de otra tienda');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f2');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) select 'product-images', id || '/p/c.webp' from public.stores where name = 'Tienda F pendiente'$$, 'TC-002-29 FR-003 tienda pendiente no sube fotos');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select pg_temp.expect_affected($$delete from storage.objects where name like '%/p/a.webp'$$, 0, 'TC-002-30 FR-004 no borra fotos de otro vendedor');
reset role;
commit;

select pg_temp.expect_count($$select 1 from storage.buckets where id = 'product-images' and public and file_size_limit = 1048576$$, 1, 'TC-002-31 FR-011 bucket público con límite de 1 MB');
\echo TODAS LAS PRUEBAS PASARON
