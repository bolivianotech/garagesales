-- Datos para la prueba de concurrencia (NFR-004): 20 compradores, 1 sola unidad.
update public.settings set value = 'false' where key = 'require_admin_mfa';
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000e' || lpad(g::text, 4, '0'))::uuid, 'conc' || g || '@test', jsonb_build_object('name', 'Comprador ' || g)
  from generate_series(1, 20) g;
update public.profiles set name = 'Comprador ' || right(id::text, 4), phone = '7000' || right(id::text, 4)
 where id::text like '00000000-0000-0000-0000-0000000e%';
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000e9999', 'vendedor_conc@test', '{"name":"Vendedor Conc"}');
insert into public.stores (owner_id, name, status) values ('00000000-0000-0000-0000-0000000e9999', 'Tienda Conc', 'approved');
insert into public.products (store_id, title, price_cents, stock)
values ((select id from public.stores where name = 'Tienda Conc'), 'Última unidad', 1000, 1);
insert into public.product_images (product_id, path)
select id, store_id || '/' || id || '/1.webp' from public.products where title = 'Última unidad';
update public.products set status = 'active' where title = 'Última unidad';
do $$
declare b record; oid uuid; i int := 0;
begin
  for b in select id from public.profiles where id::text like '00000000-0000-0000-0000-0000000e0%' order by id loop
    i := i + 1;
    perform set_config('request.jwt.claim.sub', b.id::text, true);
    select new_order_id into oid from public.create_order(jsonb_build_array(
      jsonb_build_object('product_id', (select id from public.products where title = 'Última unidad'), 'qty', 1)));
    perform public.register_payment_qr(oid, 'CQR-' || i, 1000, 'img', current_date, 'conc');
  end loop;
end $$;
