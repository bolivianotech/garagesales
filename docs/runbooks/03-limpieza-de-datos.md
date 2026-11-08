# Runbook 03 · Limpieza de datos de prueba

> **Cuándo:** una sola vez, **justo antes del lanzamiento público**, cuando terminaron las pruebas (UAT y E2E) y todavía no hay clientes reales. **Nunca** con clientes reales: es irreversible.
> **Quién:** el Administrador General, con el Administrador de Finanzas presente.
> **Verificado:** el SQL se probó en un PostgreSQL local (`TC-005-01` a `TC-005-13`) y el script de imágenes contra un servidor Storage simulado (`TC-SCR-01` a `TC-SCR-06`). **No se ha ejecutado contra tu proyecto Supabase real.**

## Qué borra y qué conserva

| Se borra | Se conserva |
|---|---|
| Pedidos, ítems, pagos, retiros | Cuentas `admin` y `finance_admin` |
| Productos y registros de fotos | Configuración (`settings`: comisión, vigencia…) |
| Tiendas | Catálogo de bancos |
| Cuentas de compradores y vendedores (opcional, por defecto sí) | Estructura de la base de datos (tablas, reglas, funciones) |
| Archivos de fotos del bucket `product-images` (con el script de Node) | Auditoría (salvo que actives el reinicio) |
| Numeración (`P-001000`, `GS-000001` vuelven a empezar) | |

## Paso 0 · Preparación (10 min)
- [ ] Hay copia de seguridad reciente: Supabase → **Database → Backups** (o descarga un volcado).
- [ ] Nadie está usando el sitio (avisa al equipo de pruebas).
- [ ] Anota cuántos datos hay (paso 1) para comparar al final.
- [ ] Estás en el **proyecto correcto** (nombre y referencia en la esquina superior de Supabase).

## Paso 1 · Vista previa (solo lee)
SQL Editor → abre `supabase/maintenance/01_vista_previa.sql` → **Run**.
Debes ver cantidades de pedidos, productos, cuentas no administrativas y **archivos del bucket**. Confirma que las **cuentas administrativas** listadas son las tuyas.

## Paso 2 · Borrar datos de la base
1. SQL Editor → abre `supabase/maintenance/02_limpiar_datos_de_prueba.sql`.
2. En la primera línea de configuración, **reemplaza** `ESCRIBE-AQUI-LA-FRASE` por exactamente:
   `BORRAR-DATOS-DE-PRUEBA`
3. Opciones:
   - `app.cleanup_delete_users` = `'si'` borra cuentas de compradores/vendedores de prueba; `'no'` las conserva (los vendedores vuelven a ser compradores).
   - `app.cleanup_reset_audit` = `'no'` **(recomendado)** conserva la historia de auditoría; `'si'` la reinicia (solo si quieres arrancar con el registro vacío; queda una marca `system.cleanup` y el registro sigue siendo inmutable).
4. **Run**. Al final aparece una tabla con los conteos: todo en 0 salvo las cuentas administrativas y la auditoría.
5. Si ves el error *"Limpieza cancelada: la frase de confirmación no coincide"*, no se borró nada: revisa el texto.

## Paso 3 · Borrar las fotos (archivos)
El SQL no borra archivos. Se usa la API de Storage con la clave `service_role`.

1. Supabase → **Project Settings → API** → copia la **service_role key**. **Es secreta: no la pegues en chats, correos ni archivos del repositorio.**
2. En una terminal en la carpeta del proyecto:

**Windows (PowerShell)**
```powershell
$env:SUPABASE_URL = "https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<pega la clave aquí>"
node scripts/cleanup-storage.mjs                       # simulación: solo cuenta
node scripts/cleanup-storage.mjs --confirm BORRAR-IMAGENES   # borra de verdad
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY              # limpia la clave de la sesión
```
**macOS / Linux**
```bash
export SUPABASE_URL="https://<ref>.supabase.co"
read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY   # escribe la clave sin que se vea
node scripts/cleanup-storage.mjs
node scripts/cleanup-storage.mjs --confirm BORRAR-IMAGENES
unset SUPABASE_SERVICE_ROLE_KEY
```
3. El script informa `Borrados. Quedan 0 archivo(s).`

## Paso 4 · Verificación
```sql
select count(*) from public.orders;      -- 0
select count(*) from public.products;    -- 0
select count(*) from storage.objects where bucket_id = 'product-images';   -- 0
select email, role from auth.users u join public.profiles p on p.id = u.id;  -- solo administración
select coalesce(public.verify_audit_chain()::text, 'integra');             -- integra
select key, value from public.settings order by key;                          -- configuración intacta
```
- [ ] Ingresa con el admin y el de finanzas: funcionan.
- [ ] Revisa `settings`: `commission_bps = 100`, `order_valid_hours = 24`, `require_admin_mfa = true`.
- [ ] Crea una cuenta nueva de comprador: el flujo de registro funciona.
- [ ] Si borraste cuentas: los correos de prueba pueden reutilizarse.

## Paso 5 · Después de limpiar
- [ ] Rota cualquier contraseña de prueba compartida.
- [ ] Regenera el reporte de pruebas y anota la fecha de limpieza en `docs/estado-del-proyecto.md`.
- [ ] Ejecuta el E2E de humo (`@smoke`) y un pago de Bs 0,01 real **después** de la limpieza (ese pedido queda como dato real: anótalo).
- [ ] Anuncia el lanzamiento.

## Si algo sale mal
| Problema | Acción |
|---|---|
| Borraste en el proyecto equivocado | Restaurar la copia de seguridad del paso 0 |
| El script de Node falla con 401 | La clave es incorrecta o es la `anon`; usa la `service_role` |
| Quedan archivos después del script | Vuelve a ejecutarlo con `--confirm`; revisa en *Storage* que no haya otro bucket |
| Error de FK al ejecutar el SQL | Hay datos nuevos fuera del esquema documentado; revisa la migración más reciente y actualiza el script |

## Alternativa más segura
En lugar de limpiar el proyecto de pruebas, crea un **proyecto Supabase nuevo para producción**, aplica las migraciones, crea los dos administradores y despliega con las variables de ese proyecto. Es más limpio y no hay riesgo de borrar datos reales por error.
