# Integración Banco Económico — API Market v1.3.0 (resumen técnico)

Fuente: "API Market · Especificaciones Técnicas v1.3.0" (28/04/2025). El PDF original **no se versiona** en el repo (`.gitignore` bloquea `*.pdf`); este resumen es la referencia del equipo.

- Ambiente de certificación: `https://apimktdesa.baneco.com.bo/ApiGateway/` (los ejemplos del PDF usan `https`; las URI tipo `http://[dominio]:[puerto]/api/...` son plantilla). Producción: URL por definir con el banco.
- Estilo: REST + JSON, camelCase. Importes con punto y **máx. 2 decimales**; fechas `yyyy-MM-dd`; horas `HH:mm:ss`.
- Toda llamada (salvo autenticación) lleva `Authorization: Bearer <token>`.
- `responseCode ≠ 0` es error; `message` trae el detalle.
- Cifrado: AES con llave de **256 bits** que entrega el banco (certificación y producción). Se cifran `password` (autenticación), `accountCredit` (generar QR) y `accountCode` (consulta de movimientos).

## Endpoints que usamos

| Uso | Método y ruta | Datos clave |
|---|---|---|
| Token | `POST /api/authentication/authenticate` | Body `userName`, `password` (cifrado) → `token` |
| Generar QR (§7.2) | `POST /api/qrsimple/generateQR` | `transactionId`, `accountCredit` (cifrado), `currency` (BOB/USD), `amount`, `description` (opc.), `dueDate` (**solo fecha**), `singleUse`, `modifyAmount`, `branchCode` (opc., ≤5) → `qrId`, `qrImage` (base64) |
| Anular QR (§7.3) | `DELETE /api/qrsimple/cancelQR` | `qrId`. Un QR de uso único solo se anula si **no está pagado** |
| Estado del QR (§7.4) | `GET /api/qrsimple/v2/statusQR/{id}` | `statusQRCode`: **0** activo pendiente · **1** pagado (en multipago, si hay ≥1 pago) · **9** anulado; `payment` con datos del pago |
| Aviso de pago (§7.5, opcional) | `POST` a un endpoint **nuestro** (`.../api/qrsimple/notifyPaymentQR`) | Objeto `payment` (PaymentQR). Sin firma documentada |
| QR pagados del día (§7.6) | `GET /api/qrsimple/v2/paidQR/{yyyyMMdd}` | `paymentList[]` de PaymentQR, para conciliación |
| Movimientos (§8.1) | `POST /api/accounts/history` | `accountCode` (cifrado), `startDate`, `endDate` → cabecera, detalle y retenciones |
| Planilla de pagos (§9) | `POST /api/batchPayment/upload` | Pago a proveedores; el banco confirma por `notifyStatus` |

**Objeto PaymentQR:** `qrId`, `transactionId`, `paymentDate`, `paymentTime`, `currency`, `amount`, `senderBankCode` (código ASFI), `senderName`, `senderDocumentId` (siempre "0"), `senderAccount` (ofuscado `******1913`), `description` (glosa del QR), `branchCode`.

## Decisiones de diseño derivadas

1. **QR por pedido:** `singleUse = true`, `modifyAmount = false` (el banco rechaza montos distintos), `amount` = total del pedido, `transactionId` = id del pedido, `description` = código corto del pedido + SKU/descripción corta de los ítems.
2. **Identificación del pago:** el `qrId` guardado en `payments` identifica el pedido. No se necesita vincular por glosa ni por montos únicos.
3. **Nombre y banco del pagador:** llegan en `payment.senderName` y `payment.senderBankCode` al consultar `statusQR` o recibir el aviso; se guardan en `payments` y se muestran en el reporte "Por entregar". Pueden diferir del titular de la cuenta del comprador, por eso el retiro exige código.
4. **Vencimiento:** `dueDate` es solo fecha, así que el vencimiento real de 10 min lo controlamos nosotros. Al expirar o cancelar un pedido llamamos `cancelQR`; si el banco responde que ya está pagado, tratamos el pedido como pagado (carrera pago/cancelación).
5. **Confirmación en 3 capas:** (a) consulta a `statusQR` mientras el pedido está pendiente; (b) aviso `notifyPaymentQR` si el banco lo activa; (c) conciliación diaria con `paidQR/{fecha}` y, como control contable, `accounts/history`. El aviso **no se confía solo**: siempre se verifica con `statusQR`.
6. **QR de cobro de vendedores (para pagarles):** es un QR de cualquier banco boliviano, de vigencia larga y multipago; se registra y versiona según spec 008. No se genera con esta API.
7. **Pago a vendedores:** manual (decisión del dueño). La planilla de pagos (§9) queda como mejora futura para automatizar.

## Hallazgos y puntos a verificar con el banco

| # | Hallazgo | Acción |
|---|---|---|
| H1 | La URL que indicaste (`accounts/queryMovements`) **no aparece** en el v1.3.0; el PDF documenta `POST /api/accounts/history`. | Confirmar con el banco cuál es la correcta; mientras tanto se usa `history`. |
| H2 | El algoritmo AES no especifica modo, IV, relleno ni formato de la llave (¿hex de 32 caracteres = 16 bytes o texto de 32 bytes?). El ejemplo cifra "1234" a 32 bytes en base64. | Cifrar localmente y validar contra `/authentication/encrypt` en **certificación**. Nunca enviar la llave de producción a ese endpoint: viaja en la URL (`aesKey=` en query). |
| H3 | `transactionId` es id del comercio en `generateQR`, pero PaymentQR lo describe como número de transacción del banco. | Usar `qrId` como clave; verificar en certificación qué devuelve `transactionId`. |
| H4 | `dueDate` sin hora. | Ya cubierto con `cancelQR` + control propio. |
| H5 | Longitud máxima de `description` no documentada. | Probar en certificación; por defecto ≤ 100 caracteres con código de pedido primero. |
| H6 | Sin firma ni autenticación documentada para `notifyPaymentQR`. | Ruta con token secreto, verificación obligatoria con `statusQR`; preguntar si hay lista de IP. |
| H7 | Expiración del token y límites de consulta no documentados. | Reautenticar ante 401; consultar con backoff; preguntar límites. |
| H8 | El banco podría exigir IP fija para llamar su API; las Edge Functions de Supabase no tienen IP fija. | Preguntar; si es necesario, un proxy con IP fija. |
| H9 | `senderBankCode` es código ASFI; el catálogo de códigos no viene en el PDF. | Pedir el catálogo al banco para mostrar el nombre del banco. |
| H10 | Credenciales y llave de certificación aún no se han cargado. | Cargar como secretos de Supabase (nunca en el chat ni en el repo). |
