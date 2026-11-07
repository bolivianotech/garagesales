# Spec 007 — Retiro en persona y reporte "Por entregar"

**Estado:** Draft

## Objetivo
Evitar el dolor de "señalar lo comprado": al confirmarse un pago, el sistema sabe qué prenda es de quién y genera el reporte para entregarla cuando el comprador pase a recoger.

## Historias
- Como **vendedor** quiero que lo pagado desaparezca de mi inventario disponible y aparezca en mi lista "Por entregar" con el nombre del comprador.
- Como **vendedor** quiero marcar un ítem como entregado al verificar al comprador.
- Como **comprador** quiero un comprobante (código/QR de retiro) con mis ítems pagados.
- Como **dueño** quiero ver el reporte global de ítems por comprador.

## Requisitos
- FR-070: Al pasar un pedido a `paid` se crean registros `pickups` por tienda y comprador con estado `ready`.
- FR-071: El reporte "Por entregar" agrupa por comprador: nombre, teléfono, ítems (foto, título, cantidad) y vendedor dueño de cada ítem.
- FR-072: El vendedor solo ve los ítems que le pertenecen; el admin ve todos (RBAC).
- FR-073: El comprador ve un código de retiro (alfanumérico + QR) por pedido.
- FR-074: El vendedor confirma la entrega ingresando/escaneando el código; el ítem pasa a `delivered` con fecha y quién entregó.
- FR-075: Ítem pagado: no se muestra en catálogo ni en el inventario activo del vendedor (Q14).
- FR-076: Reporte imprimible/PDF y exportable a CSV por fecha de retiro.
- FR-077: Ubicación y horario de retiro por vendedor, visibles al comprador tras pagar.
- FR-078: Notificación al comprador cuando su pago se confirma.

## Criterios de aceptación
- **Dado** un pedido pagado con ítems de dos vendedores, **cuando** cada vendedor abre "Por entregar", **entonces** ve solo sus ítems con el nombre del comprador.
- **Dado** el código de retiro correcto, **cuando** el vendedor lo valida, **entonces** el ítem pasa a `delivered`.
- **Dado** un ítem vendido, **cuando** otro comprador abre el catálogo, **entonces** no lo ve.
