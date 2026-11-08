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

## Portal de usuarios del banco (captura de pantalla recibida)
El portal muestra por usuario API: **Usuario**, nombre o razón social, **Tipo de uso = APIMARKET**, **Llave AES** (con botón de regenerar), **URL del servicio de notificación**, **tipo de autorización** del servicio de notificación (hoy "Sin autorización") y **token de autorización**. Implicaciones:
- El aviso de pago (`notifyPaymentQR`) sí admite autenticación: se registrará la URL de la Edge Function `notify-payment` con un tipo de autorización y un token (valor en `BANCO_ECONOMICO_NOTIFY_TOKEN`). Aun así el aviso se verifica con `statusQR`.
- **No pulsar "regenerar" la llave AES** sin planificarlo: invalida lo cifrado con la anterior y exige actualizar el secreto.
- La llave de certificación y la de producción son distintas.

## Dónde va la llave AES (y demás secretos)
Nunca en el chat, en el repo ni en el frontend. Dos lugares válidos:
1. **Desarrollo local:** archivo `.env` en la raíz del proyecto en tu máquina (`d:\ia\garagesales\.env`), que ya está en `.gitignore`. Se crea copiando `.env.example` y rellenando `BANCO_ECONOMICO_AES_KEY`, `BANCO_ECONOMICO_USERNAME` y `BANCO_ECONOMICO_PASSWORD`.
2. **Servidor (certificación/producción):** secretos de Supabase Edge Functions, con `supabase secrets set BANCO_ECONOMICO_AES_KEY=...` o desde el panel de Supabase (Edge Functions → Secrets).

## Hallazgos y puntos a verificar con el banco

| # | Hallazgo | Acción |
|---|---|---|
| H1 | La URL que indicaste (`accounts/queryMovements`) **no aparece** en el v1.3.0; el PDF documenta `POST /api/accounts/history`. | Confirmar con el banco cuál es la correcta; mientras tanto se usa `history`. |
| H2 | ~~Modo, IV y relleno de AES sin documentar~~ **Deducido y verificado con el ejemplo público del manual**: AES-256-CBC, llave = los 32 caracteres como UTF-8, IV de 16 bytes antepuesto, resultado `base64(IV + cifrado)`, relleno PKCS#7. Descifrar el ejemplo del manual (`KJAz…Seos=`) con la llave de ejemplo da `1234`. | Implementado en `examples/qr-baneco-demo/src/aes.mjs` con su prueba. Confirmar con **tu** usuario en certificación: `npm run probar-aes` (solo con la llave de certificación). |
| H3 | `transactionId` es id del comercio en `generateQR`, pero PaymentQR lo describe como número de transacción del banco. | Usar `qrId` como clave; verificar en certificación qué devuelve `transactionId`. |
| H4 | `dueDate` sin hora. | Ya cubierto con `cancelQR` + control propio. |
| H5 | Longitud máxima de `description`: **100 caracteres** (confirmado por el dueño). | Código de pedido primero y SKUs truncados con "…". |
| H6 | Sin firma documentada para `notifyPaymentQR`, pero el portal permite configurar tipo de autorización y token. | Configurar autorización + token, y aun así verificar con `statusQR`. |
| H7 | Expiración del token no documentada; sin límites de consulta (solo se piden rangos de fechas). | Reautenticar ante 401; consultar con moderación y backoff; rangos de fechas acotados. |
| H8 | El banco podría exigir IP fija para llamar su API; las Edge Functions de Supabase no tienen IP fija. | Preguntar; si es necesario, un proxy con IP fija. |
| H9 | `senderBankCode` es código ASFI; el catálogo de códigos no viene en el PDF. | Pedir el catálogo al banco para mostrar el nombre del banco. |
| H10 | El banco entregó usuario y llave AES, pero **ninguna contraseña**; el `authenticate` la exige (cifrada). | Preguntar al banco qué valor va en `password`; probar en certificación (no adivinar contra producción). |
