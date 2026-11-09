# Spec 004 — Cobro con QR dinámico y confirmación bancaria (Banco Económico)

**Estado:** Approved (aprobada por el dueño del producto el 2026-11-09; implementación de Edge Functions verificada solo contra banco simulado; contrato verificado contra API Market v1.3.0; contrato verificado contra API Market v1.3.0; ver `docs/integraciones/banco-economico.md`)

## Objetivo
Generar un QR de uso único por pedido con el monto exacto (Σ precio × cantidad) y confirmar el pago automáticamente verificándolo con el banco.

## Historias
- Como **comprador** quiero un QR con el total exacto de mi carrito y pagarlo desde la app de cualquier banco.
- Como **comprador** quiero que la pantalla confirme sola mi pago.
- Como **dueño** quiero que cada pago quede registrado con el nombre y banco de quien pagó y qué se compró.
- Como **vendedor** quiero que, al confirmarse el pago, el producto deje de estar disponible.

## Flujo
1. Comprador confirma carrito → se crea el pedido (sin reservar stock).
2. `create-qr` (Edge Function): obtiene token, calcula el total en servidor y llama `generateQR` con `singleUse=true`, `modifyAmount=false`, `currency=BOB`, `transactionId`=id del pedido, `description` con código de pedido y SKU/descripción corta de los ítems.
3. Se guarda `qrId` y `qrImage`; la PWA muestra el QR y la cuenta regresiva.
4. Confirmación: consulta de `statusQR` + aviso `notifyPaymentQR` (si está activo) + conciliación diaria con `paidQR/{fecha}`.
5. Con `statusQRCode = 1`: `confirm_payment` (transacción única) → pedido `paid`, ledger, pickups, salida de catálogo.
6. Si el pedido expira o se cancela: `cancelQR`.

## Requisitos
- FR-030: El total se calcula en servidor (Σ `unit_price_cents × qty`) y se envía al banco como decimal de 2 dígitos; `singleUse = true`, `modifyAmount = false`.
- FR-031: Credenciales, llave AES, número de cuenta destino y llamadas al banco solo en Edge Functions. `accountCredit` y `password` se cifran localmente con AES-256 (nunca con el endpoint de cifrado del banco usando la llave real).
- FR-032: Un job consulta `statusQR(qrId)` de los pedidos pendientes con backoff; el aviso `notifyPaymentQR` solo acelera la consulta y **nunca** confirma por sí solo.
  - Tres caminos que se refuerzan (el estado final lo decide siempre `confirm_payment`, idempotente): (1) la pantalla del comprador consulta su pedido (`check-order`, como máximo cada 3 s por pedido); (2) el aviso del banco (`notify-payment`) solo dispara una consulta `statusQR` y **se ignora su cuerpo**; (3) cada minuto `check-payments` cruza la lista `paidQR` del día (hora de Bolivia, UTC-4) con los pendientes y consulta los recientes con reparto de carga (`payments_to_check`). Un fallo del banco nunca confirma ni cancela nada.
- FR-033: Solo el servidor marca `paid`, cuando `statusQRCode = 1`, el `qrId` pertenece al pedido y `payment.amount` coincide con el total y la moneda.
- FR-034: Idempotencia por `qrId`: un QR confirma un pedido una sola vez; avisos y consultas repetidos no duplican ledger ni pickups.
- FR-035: Se guardan en `payments`: `qrId`, `senderName`, `senderBankCode` (y nombre del banco por catálogo), `senderAccount` ofuscado, fecha/hora de pago, monto, `description` y la respuesta cruda.
- FR-036: Conciliación diaria: `paidQR/{yyyyMMdd}` contra `payments`; pagos sin pedido o pedidos pagados que el banco no reporta generan alerta. Control contable adicional con `accounts/history` (saldo/ingresos vs ledger).
- FR-037: Al pasar a `paid`, en una sola transacción se descuenta el stock, los ítems agotados salen del catálogo y van a "Por entregar" (spec 007). **Gana quien paga primero** (spec 003).
- FR-038: El comprador ve el estado en vivo (Realtime): esperando → pagado / expirado.
- FR-039: `MockProvider` con la misma interfaz para desarrollo y pruebas.
- FR-039a: El pago confirmado genera asientos en `ledger` (spec 006).
- FR-039b: **Pago tardío o carrera:** al vencer un pedido se llama `cancelQR`. Si el banco indica que ya fue pagado, o llega un pago de un pedido vencido, se confirma siempre que el monto coincida y el stock alcance. Si el stock ya no alcanza (otro pagó antes) o el monto no coincide, el pedido y el pago quedan en `review` para reembolso o decisión del admin. Nunca se pierde un pago.
- FR-039c: Token del banco en caché, renovado ante 401; no se escribe en logs.
- FR-039e: La glosa del QR (`description`) mide como máximo 100 caracteres, empieza por el código del pedido y solo lleva ASCII imprimible y letras del español. El banco vence los QR por día: `expire-orders` (cada minuto) vence pedidos y anula su QR en el banco con `cancelQR`. Toda llamada al banco tiene tiempo máximo de espera y las sesiones se comparten (una sola autenticación simultánea).
- FR-039d: El endpoint de aviso va en una ruta con token secreto y rechaza peticiones sin él.
- NFR-005: Pago visible al comprador < 30 s desde que el banco lo reporta (ajustar a límites del banco).
- NFR-006: Rotación de credenciales y llave AES sin cambiar código.
- NFR-009: Si el banco falla, reintentos con backoff sin perder pagos; la conciliación diaria recupera lo omitido.

## Criterios de aceptación
- **Dado** un carrito de 2 × 50 BS y 1 × 30 BS, **cuando** el comprador paga, **entonces** se genera un QR por 130.00 BOB, de uso único y sin monto modificable.
- **Dado** `statusQRCode = 1`, **cuando** el job lo consulta, **entonces** el pedido pasa a `paid`, se guarda nombre y banco del pagador, y los productos salen del catálogo y del inventario del vendedor.
- **Dado** el mismo QR consultado o avisado varias veces, **entonces** el pedido se confirma una sola vez.
- **Dado** un aviso `notifyPaymentQR` con QR desconocido o sin token, **entonces** se rechaza y se registra.
- **Dado** un pedido que expira, **cuando** se cancela, **entonces** se llama `cancelQR`; si el banco dice "ya pagado", el pedido queda pagado.
- **Dado** un pago con stock ya liberado y sin re-reserva posible, **entonces** queda en `review` y el admin recibe alerta.
- **Dado** que el banco no responde, **cuando** vuelve, **entonces** los pendientes se verifican sin pérdidas.
