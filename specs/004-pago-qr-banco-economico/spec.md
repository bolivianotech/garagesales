# Spec 004 — Cobro con QR y confirmación bancaria (Banco Económico)

**Estado:** Draft · **Bloqueada por:** Q1, Q9, Q10, Q11 (PDFs del banco)

## Objetivo
Cobrar cada pedido a la cuenta de la plataforma con un QR y confirmar el pago automáticamente verificándolo contra los movimientos reales de la cuenta.

## Contexto de integración
- Endpoint de consulta de movimientos (ambiente de **desarrollo**): `https://apimktdesa.baneco.com.bo/ApiGateway/api/accounts/queryMovements`. La URL base va en `BANCO_ECONOMICO_BASE_URL`; producción usará otra.
- Este endpoint permite **conciliar** pagos consultando los movimientos. Si el banco no ofrece webhook (Q11), la confirmación se hace por **polling** desde un job del servidor.

## Historias
- Como **comprador** quiero ver un QR con el monto exacto y pagarlo desde la app de mi banco.
- Como **comprador** quiero que la pantalla me confirme sola cuando el pago se acredite.
- Como **dueño de la plataforma** quiero que los pagos se verifiquen contra el banco sin intervención manual.
- Como **vendedor** quiero que, al confirmarse el pago, mi producto deje de estar disponible.

## Requisitos
- FR-030: Al iniciar el pago se muestra un QR por pedido con el monto exacto y vencimiento igual a `orders.expires_at`.
- FR-031: Credenciales del banco solo en Edge Functions; el frontend nunca las ve.
- FR-032: Un job de servidor consulta `queryMovements` a intervalo corto mientras existan pedidos pendientes y concilia créditos nuevos con pedidos pendientes (criterio de vínculo según Q10). Si hay webhook, se usa además de la consulta.
- FR-033: Solo el servidor marca `orders.status = paid`, tras validar monto exacto y referencia del movimiento.
- FR-034: Cada movimiento bancario se procesa una sola vez (idempotencia por id/referencia del movimiento).
- FR-035: Movimientos que no calzan con ningún pedido, con monto distinto, o llegados tras expirar el pedido se guardan en `bank_movements` con estado `unmatched`/`review` para revisión manual del admin.
- FR-036: Se guarda el movimiento crudo del banco (`bank_movements.raw`) para auditoría.
- FR-037: Al pasar a `paid`, los productos del pedido quedan **vendidos de forma definitiva**: salen del catálogo y del inventario activo del vendedor y pasan a "Por entregar" (spec 007).
- FR-038: El comprador ve el estado en vivo (Realtime): esperando → pagado / expirado.
- FR-039: `MockProvider` para desarrollo y pruebas automáticas, sin tocar el banco.
- FR-039a: El pago confirmado genera asientos en `ledger` (spec 006).
- NFR-005: Pago visible al comprador en < 30 s desde que se acredita en el banco (polling cada ≤ 10 s mientras haya pedidos pendientes; ajustar según límite Q11).
- NFR-006: Rotación de secretos sin cambiar código.
- NFR-009: Si el banco no responde, se reintenta con backoff y no se pierden movimientos (se consulta por rango de fechas desde la última marca de agua).

## Criterios de aceptación
- **Dado** un pedido pendiente, **cuando** aparece en el banco el crédito conciliable, **entonces** el pedido pasa a `paid`, el comprador lo ve y el producto desaparece de la vista del vendedor y del catálogo.
- **Dado** el mismo movimiento consultado dos veces, **cuando** se procesa, **entonces** el pedido se confirma una sola vez.
- **Dado** un crédito con monto menor al total, **cuando** se concilia, **entonces** el pedido NO se marca pagado y queda en revisión.
- **Dado** un crédito sin pedido asociado, **cuando** se detecta, **entonces** queda en `unmatched` y aparece en el reporte del admin.
- **Dado** que el banco no responde, **cuando** vuelve, **entonces** se recuperan los movimientos del intervalo perdido.

## Riesgos
- Si `queryMovements` no trae glosa/referencia utilizable (Q10), habrá que usar **montos únicos** por pedido (centavos distintivos) para evitar atribuir mal un pago. Se decide al leer los PDFs.
