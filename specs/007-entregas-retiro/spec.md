# Spec 007 — Retiro en persona y reporte "Por entregar"

**Estado:** Approved (2026-11-07)

## Objetivo
Evitar el dolor de "señalar lo comprado": al confirmarse un pago, el sistema sabe qué prenda es de quién y genera el reporte para entregarla cuando el comprador pase a recoger.

## Historias
- Como **vendedor** quiero que lo pagado desaparezca de mi inventario disponible y aparezca en mi lista "Por entregar" con el nombre del comprador.
- Como **vendedor** quiero marcar un ítem como entregado al verificar al comprador.
- Como **comprador** quiero un comprobante (código/QR de retiro) con mis ítems pagados.
- Como **dueño** quiero ver el reporte global de ítems por comprador.

## Requisitos
- FR-070: Al pasar un pedido a `paid` se crean registros `pickups` por tienda y comprador con estado `ready`.
- FR-071: El reporte "Por entregar" agrupa por comprador: nombre, teléfono, **nombre y banco del pagador** (según el banco), ítems (foto, **SKU**, título corto, cantidad) y vendedor dueño de cada ítem. Si el pagador difiere del comprador registrado, se muestran ambos y el retiro exige el código.
- FR-072: El vendedor solo ve los ítems que le pertenecen; el admin ve todos (RBAC).
- FR-073: El comprador ve un código de retiro (alfanumérico + QR) por pedido.
- FR-074: El vendedor confirma la entrega ingresando/escaneando el código; el ítem pasa a `delivered` con fecha y quién entregó.
- FR-075: Ítem pagado: no se muestra en catálogo ni en el inventario activo del vendedor (Q14).
- FR-076: Reporte imprimible/PDF y exportable a CSV por fecha de retiro.
- FR-077: Ubicación y horario de retiro por vendedor, visibles al comprador tras pagar.
- FR-078: Notificación al comprador cuando su pago se confirma.
- FR-083: **Comprobante digital:** al confirmarse el pago se genera un enlace único e imposible de adivinar (`/comprobante/<token>`) con: código del pedido, fecha de pago, total, **nombre y banco de quien pagó** (según el banco), y por cada vendedor su nombre, los ítems (SKU, título, cantidad, precio), el lugar y horario de retiro y el código de retiro.
- FR-084: **Reporte "Quién pagó"** para el admin: pedido, comprador, pagador y banco, monto, fecha, estado y enlace al comprobante. El vendedor ve el mismo dato solo de sus ítems (spec 007 FR-071/FR-072).
- FR-079: Reporte de **no entregados** (pagados y sin retirar) con antigüedad en días, filtrable por vendedor y comprador.
- FR-080: Reporte de **entregados** por rango de fechas, con vendedor, comprador y tiempo de retiro.
- FR-081: Reporte de **comportamiento de clientes**: por comprador, número de compras, tiempo promedio y mediano entre `paid_at` y `delivered_at`, y cantidad de pedidos pendientes de retiro. Ordenable para identificar a quienes demoran más.
- FR-082: Recordatorios automáticos al comprador cuando un ítem pagado lleva N días sin retirarse (N configurable).
- NFR-011: Los reportes de clientes son visibles solo para el admin; el vendedor ve únicamente los de sus propios ítems.

## Criterios de aceptación
- **Dado** un pedido pagado con ítems de dos vendedores, **cuando** cada vendedor abre "Por entregar", **entonces** ve solo sus ítems con el nombre del comprador.
- **Dado** un pago confirmado, **cuando** el comprador abre su enlace de comprobante, **entonces** ve vendedor, ítems, pagador y código de retiro; con un token inválido no ve nada.
- **Dado** el código de retiro correcto, **cuando** el vendedor lo valida, **entonces** el ítem pasa a `delivered`.
- **Dado** un ítem vendido, **cuando** otro comprador abre el catálogo, **entonces** no lo ve.
