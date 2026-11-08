# Plan 002 — Catálogo del vendedor

Spec: [`spec.md`](spec.md) (Approved 2026-11-07)

## Diseño
- **Datos (`20261108000001_products.sql`):** `products` (SKU automático `GS-000123`, precio en centavos, stock, categoría, estado, talla) y `product_images` (máx. 5, ruta `{store_id}/{product_id}/{uuid}.webp`).
- **Estados (FR-012):** `draft → active ⇄ paused`; `sold_out` se aplica solo cuando `stock = 0` y vuelve a `active` al reponer. Publicar exige tienda aprobada, precio > 0 y ≥ 1 foto (trigger `products_before_write`).
- **RLS (FR-004):** el público ve solo productos `active` y no ocultos de tiendas aprobadas; el vendedor ve y edita únicamente los de su tienda; el admin puede ocultar (`admin_set_product_hidden`, auditado). Solo se borran borradores.
- **Fotos (FR-011):** el navegador reduce a ≤ 1600 px y comprime a ≈ 400 KB (WebP, o JPEG si hace falta) antes de subir. El bucket público `product-images` limita a 1 MB y a JPG/PNG/WebP; las políticas de Storage solo dejan subir y borrar en la carpeta de la tienda propia.
- **Carga rápida (FR-015):** varias fotos → un borrador por foto (precio 0, título "Sin título") que el vendedor completa luego.
- **PWA:** panel `/vender`, formulario `/vender/producto/:id?`, `/vender/carga-rapida` y catálogo público en `/` (búsqueda por título y filtro por categoría; lo demás llega con la spec 003).

## Pendiente fuera de esta fase
- FR-013 (congelar precio en pedidos) y las "ventas" de FR-014: dependen de la tabla de pedidos (spec 003).
- FR-016 (producto pagado sale del inventario): spec 004.
- NFR-003 (borradores sin red): spec 005.
- Pantalla del admin para ocultar productos (la función ya existe).

## Pruebas
- `supabase/tests/002_products.sql` (31 verificaciones de RLS, reglas de estado, fotos y Storage).
- `apps/pwa/src/lib/catalog.test.ts` (dinero, fotos y validaciones).

## Riesgos
- Las políticas de `storage.objects` se probaron en un Postgres local con un esquema de Storage simulado. Si el SQL Editor de Supabase rechaza crearlas ("must be owner"), crearlas desde el panel: Storage → Policies.
- La compresión usa `createImageBitmap` y canvas: se probó la lógica de tamaños, pero no el flujo con fotos reales de teléfonos.
