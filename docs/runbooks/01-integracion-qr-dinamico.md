# Runbook 01 · Integración del pago por QR dinámico (QR Conecta / API Market Banco Económico)

> **Estado:** guía completa para dejar el cobro funcionando. La base de datos del flujo ya existe y está probada (`confirm_payment`, `register_payment_qr`, `expire_pending_orders`, comprobante, retiros). **Falta** construir y desplegar las Edge Functions y la pantalla de pago, y validar todo en el ambiente de certificación del banco.
> Los pasos marcados **[VERIFICAR]** dependen de información del banco que aún no está confirmada. No se asume nada: se prueba en certificación.

## 0. Resumen del flujo

```
Comprador ── pedido creado ──▶ create-qr ──▶ banco: generateQR ──▶ QR (imagen) ──▶ pantalla de pago
Comprador paga con su banco ─────────────────────────────────────────────────────────────┐
                                                                                         ▼
check-payment (cada 1 min, y al abrir la pantalla) ──▶ banco: statusQR ─┐        banco registra el pago
notify-payment  (aviso del banco, opcional) ──────────▶ verifica statusQR ┤
                                                                         ▼
                                             statusQRCode = 1 ──▶ confirm_payment() ──▶ pagado | en revisión
expire-orders (cada 15 min) ──▶ expire_pending_orders() ──▶ banco: cancelQR
reconcile-daily (04:00)  ──▶ banco: paidQR/{fecha} y accounts/history ──▶ alertas de diferencias
```

## 1. Requisitos previos (checklist)

| # | Requisito | Cómo se verifica | Estado |
|---|---|---|---|
| 1 | Usuario API habilitado en **certificación** | `POST /api/authentication/authenticate` devuelve `responseCode: 0` y `token` | ❌ hoy responde `404 "Usuario no habilitado para uso de apis"` |
| 2 | Llave AES **nueva** (la anterior se expuso) | Regenerada en el portal; guardada en el gestor de contraseñas | ❌ pendiente |
| 3 | Valor del campo `password` y su método de cifrado | Confirmado por el banco o por el estudiante que ya integró QR Conecta | ❌ pendiente |
| 4 | Cuenta de abono de pruebas (`accountCredit`) | Entregada por el banco | ❌ pendiente |
| 5 | Proyecto Supabase con migraciones 001–003 aplicadas | `select count(*) from public.orders;` no da error | ⚠️ falta aplicar la 003 |
| 6 | Supabase CLI instalada y enlazada | `npx supabase --version`, `supabase link` | ⏳ |
| 7 | Secretos cargados | `supabase secrets list` muestra los nombres de la sección 3 | ⏳ |
| 8 | Repositorio **privado** y sin secretos | `python3 -I scripts/check_secrets.py` limpio | ⏳ |

## 2. Qué construir (entregables con sus pruebas)

Carpeta: `supabase/functions/`. Código compartido en `_shared/`.

| Archivo | Responsabilidad | Prueba |
|---|---|---|
| `_shared/aes.ts` | Cifrar `password`, `accountCredit` y `accountCode` con AES-256 | Vector de prueba obtenido del banco **[VERIFICAR modo/IV/relleno]** |
| `_shared/bank.ts` | Cliente HTTP: `authenticate`, `generateQR`, `statusQR`, `cancelQR`, `paidQR`, `history`; token en caché; reautenticar ante 401 | Pruebas con servidor simulado (Vitest/Deno test) |
| `_shared/provider.ts` | Interfaz `PaymentProvider` y `MockProvider` | Prueba unitaria |
| `create-qr/` | Genera el QR de un pedido | Integración + E2E |
| `check-payment/` | Consulta estados y confirma pagos | Integración + concurrencia |
| `notify-payment/` | Recibe el aviso del banco | Integración |
| `expire-orders/` | Vence pedidos y anula QR | Integración |
| `reconcile-daily/` | Concilia con el banco | Integración |

### 2.1 Contratos de las funciones

**`create-qr`** (la llama el comprador autenticado)
- Entrada: `{ "order_id": "<uuid>" }` con el JWT del comprador.
- Pasos:
  1. Verificar que el pedido es del comprador y está `pending` y no vencido.
  2. Si ya existe un pago `pending` vigente para el pedido → devolverlo (idempotencia).
  3. Total = `orders.total_cents / 100` con 2 decimales (jamás recalcular con datos del cliente).
  4. Llamar `generateQR` con: `transactionId` = código del pedido (`P-001234`), `accountCredit` = cuenta cifrada, `currency` = `BOB`, `amount`, `description` (≤ 100 caracteres: `P-001234 ` + SKU/título corto de los ítems, truncado con `…`), `dueDate` = fecha (zona La Paz) de `orders.expires_at`, `singleUse` = `true`, `modifyAmount` = `false`.
  5. Guardar con `register_payment_qr(order_id, qrId, amount_cents, qrImage, due_date, description)`.
- Salida: `{ "qr_image": "<base64>", "amount_cents": 1234, "due_date": "2026-11-09", "status": "pending" }`.
- Errores → mensajes en español: pedido ajeno (403), vencido (410), banco no disponible (503, reintentar).

**`check-payment`** (cron cada 1 minuto y a pedido del comprador para su pedido)
- Selecciona pagos `pending` (o `cancelled` de pedidos vencidos de las últimas 48 h), máximo 50 por corrida, del más antiguo al más nuevo.
- Por cada uno: `GET statusQR/{qrId}`.
  - `statusQRCode = 1` → `confirm_payment(order_id, qrId, round(payment.amount*100), senderName, senderBankCode, senderAccount, fecha+hora, respuesta_cruda)`. Resultado `paid`, `already_paid` o `review`.
  - `9` (anulado) → marcar `cancelled`.
  - `0` → sin cambios.
  - `responseCode ≠ 0` → registrar y reintentar con espera creciente (1, 2, 4 minutos).
- Nunca confirmar con datos que no vengan de `statusQR`.

**`notify-payment`** (la llama el banco)
- Ruta protegida: cabecera de autorización que se registra en el portal del banco, o token en la ruta **[VERIFICAR tipo soportado]**.
- Cuerpo: `{ "payment": { "qrId": … } }`. **No se confía en el cuerpo**: solo se usa `qrId` para ejecutar la misma lógica de `check-payment` sobre ese QR.
- Responde siempre `{ "responseCode": 0, "message": "" }` cuando la petición es válida y ya fue procesada; `responseCode` distinto de 0 si el token es inválido.

**`expire-orders`** (cron cada 15 minutos)
- `select * from public.expire_pending_orders();` → por cada `expired_bank_qr_id` llama `cancelQR`.
- Si `cancelQR` responde que el QR ya está pagado → ejecuta `check-payment` sobre ese QR (se honra el pago tardío si hay stock).

**`reconcile-daily`** (cron 04:00 hora de La Paz)
- `GET paidQR/{yyyyMMdd}` de ayer y hoy; compara con `payments`. Diferencias → alerta al admin.
- Control contable con `POST accounts/history` (rango de fechas): suma de créditos vs. suma de pagos confirmados.
- Requiere una migración adicional `…_reconciliation.sql` (tabla `bank_reconciliation`).

### 2.2 Cifrado AES (el punto más delicado)
- Llave: 256 bits (32 bytes), la entrega el banco; vive en `BANCO_ECONOMICO_AES_KEY`.
- **[VERIFICAR]** modo (CBC/ECB/GCM), vector de inicialización, relleno y formato de la llave (32 caracteres de texto o 64 hexadecimales).
- Procedimiento para fijarlo sin adivinar:
  1. En **certificación**, llamar `GET /api/authentication/encrypt?text=1234&aesKey=<LLAVE DE PRUEBA>` (la llave viaja en la URL, por eso **solo** con la llave de certificación, nunca la de producción).
  2. Probar combinaciones hasta que `aes.ts` produzca el mismo resultado para el mismo texto.
  3. Guardar ese par como caso de prueba permanente.
  4. Verificar que `authenticate` con el `password` cifrado devuelva `responseCode: 0`.
- Mientras tanto, el `MockProvider` permite desarrollar y probar todo lo demás.

## 3. Secretos a cargar (nombres; los valores nunca van en el repositorio)

```bash
npx supabase secrets set \
  BANCO_ECONOMICO_BASE_URL=https://apimktdesa.baneco.com.bo/ApiGateway \
  BANCO_ECONOMICO_USERNAME=<usuario-api> \
  BANCO_ECONOMICO_PASSWORD=<valor-del-password> \
  BANCO_ECONOMICO_AES_KEY=<llave-nueva> \
  BANCO_ECONOMICO_ACCOUNT_CREDIT=<cuenta-de-abono> \
  BANCO_ECONOMICO_NOTIFY_TOKEN=<token-aleatorio-largo> \
  CRON_SECRET=<token-aleatorio-largo>
npx supabase secrets list     # solo nombres
```
Generar tokens: `openssl rand -hex 32`. Los valores se escriben en la terminal, no en archivos del repositorio. La URL de producción **[VERIFICAR]** la entrega el banco.

## 4. Pantalla de pago (frontend)
Ruta `/pedido/:id/pagar`:
1. Muestra el resumen del pedido y llama `create-qr`.
2. Muestra el QR (imagen base64), el monto en Bs, "Escanea con la app de tu banco" y un botón para guardar la imagen.
3. Consulta `payment_status` cada 5 segundos (`get_order_payment`) o con Realtime sobre `orders`.
4. Estados: **Esperando pago** → **Pagado** (lleva a `/comprobante/<token>`) → **En revisión** (mensaje: "Tu pago se recibió pero el producto ya no estaba disponible; te devolveremos el dinero") → **Vencido** (botón "Volver a intentar").
5. Si el QR vence, permite crear uno nuevo para el mismo pedido o crear otro pedido.

## 5. Despliegue paso a paso
1. Aplicar migraciones pendientes (003 y la de conciliación) en Supabase.
2. Cargar secretos (sección 3).
3. `npx supabase functions deploy create-qr check-payment notify-payment expire-orders reconcile-daily`
4. En el portal del banco: **URL Servicio de Notificación** = `https://<ref>.supabase.co/functions/v1/notify-payment` y el **tipo de autorización** y **token** acordados.
5. Frontend: fusionar a `main` (Cloudflare despliega solo).
6. Ejecutar la matriz de pruebas de la sección 7 en certificación.

## 6. Tareas programadas
Con Supabase Cron (Integrations → Cron; usa `pg_cron`) o un cron externo que llame a cada función con la cabecera `x-cron-secret: <CRON_SECRET>`:

| Tarea | Frecuencia | Función |
|---|---|---|
| Consultar pagos | cada 1 minuto | `check-payment` |
| Vencer pedidos | cada 15 minutos | `expire-orders` |
| Conciliación | diaria 04:00 (UTC-4) | `reconcile-daily` |
| Verificar auditoría | diaria | `select public.verify_audit_chain();` debe dar `null` |

**[VERIFICAR]** límites de consultas del banco: el manual no los indica; si el banco los impone, reducir la frecuencia y priorizar pedidos con la pantalla de pago abierta.

## 7. Matriz de pruebas en certificación (integración)

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| INT-01 | Autenticación | `authenticate` con password cifrado | `responseCode 0`, token no vacío |
| INT-02 | Token vencido | Usar un token viejo | Se reautentica solo (401 → nuevo token) |
| INT-03 | Generar QR | Pedido de Bs 0,01 → `create-qr` | `qrId` y `qrImage`; fila en `payments` `pending` |
| INT-04 | Descripción larga | Pedido con 10 ítems | `description` ≤ 100 caracteres, empieza por el código del pedido |
| INT-05 | Pago exacto | Pagar el QR desde una app bancaria | `statusQR = 1`; pedido `paid` en < 30 s; stock descontado; retiro creado |
| INT-06 | Datos del pagador | Revisar `payments` | Nombre y código de banco del pagador guardados |
| INT-07 | Aviso del banco | Con URL de notificación registrada | Llega `notifyPaymentQR`; se verifica con `statusQR`; sin duplicados |
| INT-08 | Aviso sin token | `curl` sin autorización | Rechazado y registrado |
| INT-09 | Repetición | Llamar `check-payment` 3 veces tras pagar | Un solo `confirm_payment` efectivo (`already_paid`) |
| INT-10 | Monto distinto | Intentar pagar otro monto (`modifyAmount=false`) | El banco rechaza; nada cambia |
| INT-11 | Vencimiento | Dejar vencer un pedido | `expire-orders` anula el QR; el pedido pasa a `expired` |
| INT-12 | Pago tardío | Pagar un QR justo antes de anular | Pedido pagado si hay stock; si no, `review` |
| INT-13 | Dos pagos, una unidad | Dos compradores pagan la última unidad | Uno `paid`, otro `review` |
| INT-14 | Banco caído | Simular fallo de red | Reintentos con espera; sin pérdida de pagos |
| INT-15 | Conciliación | Ejecutar `reconcile-daily` | Sin diferencias; con un pago borrado a mano, alerta |

Cada caso se registra en `docs/testing/` con fecha, ejecutor y evidencia.

## 8. Puesta en producción (go-live)
- [ ] INT-01 a INT-15 en verde en certificación
- [ ] E2E completo en verde (`docs/testing/e2e-plan.md`)
- [ ] UAT de los 4 roles firmado (`docs/uat/`)
- [ ] Llave AES y credenciales de **producción** entregadas por el banco, cargadas como secretos del proyecto de producción
- [ ] URL de producción del banco configurada; URL de notificación registrada en producción
- [ ] Un pago de **Bs 0,01** real de punta a punta
- [ ] Limpieza de datos de prueba hecha ([runbook 03](03-limpieza-de-datos.md))
- [ ] Repositorio privado; escáner de secretos limpio; rotación del incidente confirmada
- [ ] Copia de seguridad de la base de datos tomada
- [ ] Persona de guardia y canal de soporte definidos
- [ ] Comunicado a los compradores

## 9. Operación de pagos en revisión (reembolsos)
Un pago queda en **revisión** cuando: el monto no coincide, el stock ya no alcanza (otro pagó antes) o el producto/tienda dejó de estar disponible.
1. El admin ve el caso en **Pagos → En revisión** (reporte `admin_payments_report`).
2. Decide: **reembolsar** (transferencia manual desde la cuenta del banco al pagador, usando nombre y banco del pagador) o **honrar** (si hay forma de entregar).
3. Registra la resolución con nota (función `admin_resolve_review`, **pendiente de construir**, tarea E4); mientras tanto, queda como nota en el pedido y entrada de auditoría.
4. Notifica al comprador.

## 9.1 Observabilidad
- Logs: Supabase → *Edge Functions → Logs*; Cloudflare → *Observability*.
- Alertas mínimas: pagos en `review` > 0, `check-payment` sin ejecutarse por 10 minutos, errores de autenticación con el banco, `verify_audit_chain()` distinto de `null`.

## 10. Plan de reversa
| Problema | Acción |
|---|---|
| El banco rechaza autenticación | Pausar las tareas programadas; verificar secretos; contactar al banco; los pedidos siguen pendientes |
| Pagos mal confirmados | Imposible por diseño (solo `confirm_payment` con datos del banco); revisar `audit_log` |
| Función con error | Redesplegar versión anterior; los pagos `pending` se retoman en la siguiente corrida |
| Credenciales comprometidas | Rotar (capítulo 09), actualizar secretos, redesplegar |
