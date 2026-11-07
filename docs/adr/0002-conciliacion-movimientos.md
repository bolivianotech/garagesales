# ADR-0002: Confirmar pagos por estado del QR, con conciliación diaria

- **Estado:** Aceptada (verificada contra API Market v1.3.0) · 2026-11-07
- **Contexto:** El banco genera QR dinámicos (`generateQR`), informa su estado (`statusQR`, 1 = pagado), puede avisar el pago (`notifyPaymentQR`, opcional y sin firma documentada) y lista los QR pagados por día (`paidQR`). El QR es de la cuenta del dueño, que luego liquida a vendedores con 1 % de comisión.
- **Decisión:** Un QR de uso único por pedido; su `qrId` vincula pago y pedido. Se confirma consultando `statusQR`; el aviso solo acelera la consulta. `paidQR/{fecha}` y `accounts/history` sirven de conciliación diaria y control contable.
- **Consecuencias (+):** vínculo exacto pago↔pedido; el nombre y banco del pagador llegan en la respuesta; no se confía en datos entrantes sin verificar.
- **Consecuencias (−):** `dueDate` solo tiene fecha, el vencimiento corto se controla con `cancelQR` y reglas propias; posible exigencia de IP fija (H8).
- **Seguridad:** credenciales y llave AES solo en secretos de Edge Functions; cifrado AES local.
