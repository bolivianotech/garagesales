# Plan 003 — Catálogo público, carrito y pedido

Spec: [`spec.md`](spec.md) (Approved; actualizada el 2026-11-08 por la decisión "sin reserva", ver ADR-0004)

## Diseño
- **Sin reserva:** `create_order(p_items)` valida y congela precios, pero no toca el stock. El stock se descuenta en `confirm_payment` (spec 004), dentro de una transacción que bloquea las filas de producto en orden (`FOR UPDATE`), de modo que con pagos simultáneos solo el primero se queda con la unidad.
- **Datos (`20261108000002_orders.sql`):** `orders` (código `P-001000`, token de comprobante, vencimiento), `order_items` (precio y datos congelados), `payments` (QR, pagador, respuesta del banco), `pickups` (un retiro por tienda con código de 6 caracteres).
- **Seguridad:** los pedidos solo se crean con `create_order`; `confirm_payment`, `register_payment_qr` y `expire_pending_orders` son ejecutables solo por el rol de servicio (Edge Functions). El comprador ve sus pedidos; el vendedor solo ve sus retiros mediante `seller_pickups()`; los pagos solo los lee el personal.
- **Comprobante:** `get_receipt(token)` devuelve un JSON con pagador, vendedores, ítems y códigos de retiro; el token es un UUID aleatorio no adivinable.
- **Reportes:** `admin_payments_report()` ("Quién pagó" con enlace de comprobante) y `seller_pickups()`.

## Pendiente (siguientes entregas)
- Interfaz: carrito, pantalla de pago con QR, "Mis pedidos", página del comprobante, panel "Por entregar" del vendedor y reporte del admin.
- Stock en tiempo real en el catálogo (Realtime).
- Edge Functions del banco (spec 004).

## Pruebas
- `supabase/tests/003_orders.sql` (60 casos) y `supabase/tests/run.sh` bloque `004_concurrency` (5 casos con 20 conexiones simultáneas).

## Riesgos
- El comprador que paga y pierde la carrera necesita un reembolso manual (queda en `review` y en el reporte).
- La concurrencia se probó en un PostgreSQL local, no contra Supabase real.

## Nota sobre el libro mayor
`confirm_payment` todavía no escribe el `ledger` (comisión del 1 %), porque la spec 006 sigue en borrador. El `ledger` se calculará a partir de `payments` y `order_items` (que ya guardan todo lo necesario), con una función de relleno al aprobar la spec 006, para no perder ventas hechas antes.
