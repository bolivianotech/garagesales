# Spec 004 — Cobro con QR dinámico y confirmación bancaria (Banco Económico)

**Estado:** Draft · **Bloqueada por:** lectura del PDF "Api Market Baneco v1.3.0" (§7.2 generación de QR y consulta de estado `statusQRCode`), que aún no está en el repo. Los nombres de endpoints/campos de esta spec son provisionales hasta verificarlos.

## Objetivo
Generar un QR dinámico por pedido con el monto exacto (Σ precio × cantidad) y confirmar el pago automáticamente consultando el estado del QR en el banco.

## Contexto de integración
- QR dinámico: se genera por pedido según §7.2 del PDF, con el monto total calculado en servidor.
- Estado de pago: el banco expone `statusQRCode`; el valor `1` indica **QR pagado**.
- Respaldo: `accounts/queryMovements` (desarrollo: `https://apimktdesa.baneco.com.bo/ApiGateway/api/accounts/queryMovements`) para conciliación diaria contra la cuenta.
- Todas las URLs van en variables de entorno; el host actual es de **desarrollo**.
- Vínculo pago↔pedido: cada pedido tiene **su propio QR**; el identificador del QR devuelto por el banco se guarda en `payments.bank_qr_id`. Así `statusQRCode = 1` de ese QR identifica el pedido sin depender de glosa ni de montos únicos.

## Historias
- Como **comprador** quiero un QR con el total exacto de mi carrito y pagarlo desde mi banco.
- Como **comprador** quiero que la pantalla confirme sola mi pago.
- Como **dueño** quiero que los pagos se verifiquen contra el banco sin intervención manual.
- Como **vendedor** quiero que, al confirmarse el pago, el producto deje de estar disponible.

## Requisitos
- FR-030: Al pagar, el servidor calcula el total (Σ `unit_price_cents × qty`) y solicita al banco un QR dinámico por ese monto, guardando `bank_qr_id`, el payload/imagen y su vencimiento.
- FR-031: Credenciales y llamadas al banco solo desde Edge Functions; el frontend nunca las ve.
- FR-032: Un job consulta `statusQRCode` de los QR de pedidos pendientes (intervalo corto); si el estado es `1` (pagado) confirma el pedido. Si el banco ofrece callback, se usa además.
- FR-033: Solo el servidor marca `orders.status = paid`, validando estado `1`, que el `bank_qr_id` corresponda al pedido y, si el banco lo devuelve, que el monto coincida con el total.
- FR-034: Confirmación idempotente por `bank_qr_id`: un QR confirma un pedido una sola vez.
- FR-035: Conciliación diaria: `queryMovements` se compara con `payments` pagados; créditos sin pedido o pedidos pagados sin crédito generan alerta al admin (`bank_movements`, estado `unmatched`/`review`).
- FR-036: Se guarda la respuesta cruda del banco (`payments.raw_response`) para auditoría.
- FR-037: Al pasar a `paid`, el producto es **vendido definitivamente**: sale del catálogo y del inventario del vendedor y pasa a "Por entregar" (spec 007).
- FR-038: El comprador ve el estado en vivo (Realtime).
- FR-039: `MockProvider` para desarrollo y pruebas, sin tocar el banco.
- FR-039a: El pago confirmado genera asientos en `ledger` (spec 006).
- FR-039b: **Pago tardío:** si un QR se paga cuando el pedido ya expiró (stock liberado), el sistema intenta re-reservar los ítems; si no es posible, el pago queda en `review` para reembolso/decisión manual del admin. Nunca se pierde un pago.
- NFR-005: Pago visible al comprador en < 30 s desde que el banco lo marca pagado (ajustar a límites de tasa del PDF).
- NFR-006: Rotación de secretos sin cambiar código.
- NFR-009: Si el banco no responde, reintentos con backoff sin perder pagos.

## Criterios de aceptación
- **Dado** un carrito de 2 × 50 BS y 1 × 30 BS, **cuando** el comprador paga, **entonces** se genera un QR por 130,00 BS.
- **Dado** un QR con `statusQRCode = 1`, **cuando** el job lo consulta, **entonces** el pedido pasa a `paid` y el producto desaparece del catálogo y del inventario del vendedor.
- **Dado** el mismo QR consultado varias veces en estado `1`, **entonces** el pedido se confirma una sola vez.
- **Dado** un QR pagado tras expirar el pedido y sin stock, **entonces** el pago queda en `review` y el admin recibe alerta.
- **Dado** que el banco no responde, **cuando** vuelve, **entonces** los pedidos pendientes se verifican sin pérdida.

## Riesgos
- **Vigencia del QR vs reserva de stock:** si el QR de un pedido tiene vigencia larga, un comprador podría pagar mucho después de que el stock se liberó (ver FR-039b). Recomendación: QR del pedido con vigencia corta, y reservar la vigencia de 2 años solo para los QR de cobro de vendedores (spec 006). Pendiente de confirmar (Q17).
