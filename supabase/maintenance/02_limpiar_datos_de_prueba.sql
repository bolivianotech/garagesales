-- ============================================================================
--  LIMPIEZA DE DATOS DE PRUEBA  ·  DESTRUCTIVO E IRREVERSIBLE
--  Antes: 1) copia de seguridad (Supabase → Database → Backups)
--         2) ejecuta 01_vista_previa.sql y confirma las cantidades
--  Qué borra: pedidos, ítems, pagos, retiros, productos, fotos (registros), tiendas
--             y, si lo activas, las cuentas que no son administrativas.
--  Qué NO borra: cuentas admin / finance_admin, configuración (settings),
--             catálogo de bancos, la estructura de la base de datos.
--  Las FOTOS (archivos) se borran aparte con: node scripts/cleanup-storage.mjs
-- ============================================================================

-- PASO 1. Para habilitar el borrado reemplaza el texto entre comillas por EXACTAMENTE:
--         BORRAR-DATOS-DE-PRUEBA
select set_config('app.cleanup_confirm', 'ESCRIBE-AQUI-LA-FRASE', false);

-- PASO 2. Opciones ('si' o 'no')
select set_config('app.cleanup_delete_users', 'si', false);  -- borra cuentas no administrativas
select set_config('app.cleanup_reset_audit', 'no', false);   -- 'si' reinicia el registro de auditoría (solo antes del lanzamiento)

-- PASO 3. Ejecuta todo el archivo.
do $$
declare
  n_orders integer; n_products integer; n_users integer := 0;
  del_users boolean := coalesce(current_setting('app.cleanup_delete_users', true), 'no') = 'si';
  reset_audit boolean := coalesce(current_setting('app.cleanup_reset_audit', true), 'no') = 'si';
begin
  if current_setting('app.cleanup_confirm', true) is distinct from 'BORRAR-DATOS-DE-PRUEBA' then
    raise exception 'Limpieza cancelada: la frase de confirmación no coincide. No se borró nada.';
  end if;

  select count(*) into n_orders from public.orders;
  select count(*) into n_products from public.products;

  -- Orden respetando las relaciones entre tablas
  delete from public.pickups;
  delete from public.payments;
  delete from public.order_items;
  delete from public.orders;
  delete from public.products;     -- elimina también sus fotos (registros)
  delete from public.stores;

  if del_users then
    select count(*) into n_users from public.profiles where role not in ('admin', 'finance_admin');
    delete from auth.users where id in (select id from public.profiles where role not in ('admin', 'finance_admin'));
  else
    perform set_config('app.allow_role_change', 'on', true);
    update public.profiles set role = 'buyer' where role = 'seller';
  end if;

  -- Numeración desde cero
  alter sequence public.order_code_seq restart with 1000;
  alter sequence public.product_sku_seq restart with 1;

  if reset_audit then
    alter table public.audit_log disable trigger audit_no_update;
    alter table public.audit_log disable trigger audit_no_truncate;
    truncate public.audit_log restart identity;
    alter table public.audit_log enable trigger audit_no_update;
    alter table public.audit_log enable trigger audit_no_truncate;
  end if;

  perform public.audit_write('system.cleanup', 'database', null, null,
    jsonb_build_object('orders', n_orders, 'products', n_products, 'users_deleted', n_users, 'audit_reset', reset_audit),
    'Limpieza de datos de prueba');
end $$;

-- Resultado
select 'pedidos' as dato, count(*) as cantidad from public.orders
union all select 'productos', count(*) from public.products
union all select 'tiendas', count(*) from public.stores
union all select 'cuentas no administrativas', count(*) from public.profiles where role not in ('admin', 'finance_admin')
union all select 'cuentas administrativas (se conservan)', count(*) from public.profiles where role in ('admin', 'finance_admin')
union all select 'registros de auditoría', count(*) from public.audit_log;
