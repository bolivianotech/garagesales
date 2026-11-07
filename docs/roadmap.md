# Roadmap: paso a paso

Cada fase termina con un **criterio de salida** verificable. No se pasa a la siguiente sin cumplirlo.

## Fase 0 — Inception (esta fase)
- [x] Constitución, arquitectura base, ADR de stack, specs 001–005 en borrador.
- [ ] Responder `docs/open-questions.md` (bloqueante: PDF del Banco Económico).
- [ ] Aprobar specs (revisión del dueño del producto).
**Salida:** specs 001–005 en estado `Approved`.

## Ruta rápida al MVP desplegado ("tiempo récord")
Orden de valor: **1 → 2 → 3 → 4 (con `MockProvider`) → 7 → desplegar con dominio gratuito (`*.pages.dev`) → 4 real en sandbox → 6 → 5**. Así se prueba el flujo completo en producción de pruebas antes de comprar `garagesales.bo`.

## Fase 1 — Cimientos (spec 001 + infraestructura)
1. Crear proyecto Supabase (dev y prod separados).
2. Monorepo ligero: `apps/pwa`, `supabase/` (migraciones, funciones), `packages/shared` (tipos).
3. Migraciones: perfiles, roles, tiendas, RLS.
4. Auth (email/Google) y roles `buyer`, `seller`, `admin`.
5. CI: lint, typecheck, tests, despliegue de preview.
**Salida:** usuario se registra, elige rol vendedor y ve un panel vacío; RLS probada con tests.

## Fase 2 — Catálogo del vendedor (spec 002)
1. Tabla `products` + bucket `product-images`.
2. Formulario: foto (compresión en cliente), precio, cantidad, descripción.
3. Publicar / pausar / marcar agotado; edición de stock.
**Salida:** vendedor publica un producto con foto y aparece en el catálogo público.

## Fase 3 — Compra (spec 003)
1. Catálogo público con búsqueda y filtros; Realtime de stock.
2. Carrito y checkout; creación de pedido con reserva atómica de stock (expira en 10 min).
3. Historial de pedidos del comprador y del vendedor.
**Salida:** no es posible sobrevender en prueba de concurrencia.

## Fase 4 — Pago QR Banco Económico (spec 004)
1. Edge Function `create-qr` (autentica con banco, genera QR por pedido).
2. Edge Function `bank-webhook` / `check-payment` (confirmación + idempotencia).
3. Pantalla de pago: QR, cuenta regresiva, estado en vivo.
4. Libro mayor (`ledger`) y liquidación a vendedores (según decisión pendiente).
5. Pruebas en sandbox del banco; luego piloto con montos reales mínimos.
**Salida:** pago real de prueba confirma el pedido, descuenta stock y notifica al vendedor.

## Fase 4b — Retiro y liquidación (specs 007 y 006)
1. Reporte "Por entregar" por comprador/vendedor y código de retiro.
2. Ledger con comisión 1 %, reporte "Saldos por pagar", liquidaciones y validación de cuadre contra el banco.
**Salida:** el admin ve cuánto pagar a cada vendedor, neto de comisión, y cada vendedor ve solo lo suyo.

## Fase 5 — PWA y sincronización (spec 005)
1. Manifest, service worker, instalación en Android/iOS.
2. Caché offline del catálogo; cola de subida para vendedores sin red.
3. Notificaciones (Web Push) de nueva venta.
**Salida:** Lighthouse PWA ≥ 90; instalable; funciona en 3G.

## Fase 6 — Lanzamiento
- Pruebas end-to-end (Playwright), prueba de carga básica, revisión de seguridad.
- Términos, privacidad, política de devolución.
- Monitoreo (Sentry) y backups; piloto con un garage sale real.
