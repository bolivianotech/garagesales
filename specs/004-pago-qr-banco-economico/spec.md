# Spec 004 — Pago con QR (Banco Económico)

**Estado:** Draft · **Bloqueada por:** Q1, Q2, Q3, Q6 (necesita el PDF del banco)

## Objetivo
Cobrar cada pedido con un QR bancario y confirmar el pago de forma segura y automática.

## Historias
- Como **comprador** quiero ver un QR con el monto exacto y pagarlo desde la app de mi banco.
- Como **comprador** quiero que la pantalla se actualice sola cuando el pago se acredite.
- Como **vendedor** quiero saber cuándo se pagó un pedido y cuánto me corresponde.
- Como **admin** quiero conciliar pagos contra el banco.

## Requisitos (independientes del detalle del banco)
- FR-030: Al iniciar el pago se genera un QR único por pedido, con monto exacto y vencimiento alineado a `orders.expires_at`.
- FR-031: Las credenciales del banco se usan solo en Edge Functions; el frontend nunca las ve.
- FR-032: La confirmación llega por webhook del banco y/o consulta de estado (según Q1); ambas rutas son idempotentes por `bank_ref`.
- FR-033: Solo el servidor marca `orders.status = paid`, tras validar monto, referencia y estado con el banco.
- FR-034: Pagos con monto distinto, duplicados o tardíos (pedido expirado) se registran y marcan para revisión manual, sin perder el dinero de vista.
- FR-035: Se guarda la respuesta cruda del banco (`payments.raw_response`) para auditoría.
- FR-036: Cada pago pagado genera asientos en `ledger` por tienda (bruto, comisión, neto) según Q2/Q3.
- FR-037: El comprador ve estado en vivo (Realtime): esperando → pagado / expirado.
- FR-038: Existe un `MockProvider` para desarrollo y pruebas automáticas.
- NFR-005: Confirmación visible al comprador < 5 s tras la notificación del banco.
- NFR-006: Rotación de secretos sin cambiar código.

## Criterios de aceptación
- **Dado** un pedido pendiente, **cuando** el comprador paga el QR, **entonces** el pedido pasa a `paid` y el vendedor es notificado.
- **Dado** el mismo webhook recibido dos veces, **cuando** se procesa, **entonces** el pedido se confirma una sola vez.
- **Dado** un webhook sin credencial/firma válida, **cuando** llega, **entonces** se rechaza y se registra el intento.
- **Dado** un pago por monto menor, **cuando** llega, **entonces** el pedido NO se marca pagado y queda en revisión.
- **Dado** un QR vencido, **cuando** el comprador intenta pagarlo, **entonces** debe generar un pedido/QR nuevo.

## Pendiente de completar con el PDF (Q1)
Endpoints y autenticación · formato del payload QR · sandbox · cabeceras/firma del webhook · códigos de error · límites de tasa · tiempos de expiración · reglas de conciliación.
