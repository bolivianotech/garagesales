-- Vista previa de lo que borraría la limpieza. SOLO LEE; no modifica nada. Ejecútalo primero.
select 'pedidos' as dato, count(*) as cantidad from public.orders
union all select 'ítems de pedidos', count(*) from public.order_items
union all select 'pagos', count(*) from public.payments
union all select 'retiros', count(*) from public.pickups
union all select 'productos', count(*) from public.products
union all select 'fotos (registros)', count(*) from public.product_images
union all select 'tiendas', count(*) from public.stores
union all select 'cuentas NO administrativas (se borrarían si activas la opción)', count(*)
  from public.profiles where role not in ('admin', 'finance_admin')
union all select 'cuentas administrativas (NUNCA se borran)', count(*)
  from public.profiles where role in ('admin', 'finance_admin')
union all select 'archivos en el bucket product-images (se borran con el script de Node)', count(*)
  from storage.objects where bucket_id = 'product-images'
union all select 'registros de auditoría (se conservan salvo que actives el reinicio)', count(*) from public.audit_log
order by 1;
