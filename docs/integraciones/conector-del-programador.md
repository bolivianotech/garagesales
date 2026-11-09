# Revisión del conector entregado por el programador (`conector-banco-economico`)

**Fecha:** 2026-11-09 · **Estado:** revisado e integrado como código propio · **Verificado contra el banco real:** NO

## Qué se recibió
Paquete Node.js sin dependencias (11 archivos): cliente de la API (`src/baneco.js`), un servidor de ejemplo con tres caminos de confirmación, banco falso y 29 pruebas.

## Revisión de seguridad
- Sin código malicioso, sin secretos embebidos, sin dependencias externas; solo habla con los dominios del banco.
- Las credenciales se leen de variables de entorno (`.env.ejemplo` solo con nombres).

## Decisión: no se copiaron sus archivos al repositorio
1. El repositorio es público y el paquete declara `"license": "UNLICENSED"`. Hace falta que el programador confirme por escrito que cede el código (contrato/licencia) antes de incorporarlo tal cual.
2. GarageSales ya tiene su propia base (`confirm_payment`, RLS, auditoría) y corre en Edge Functions (Deno) con Supabase, no en un servidor Node.

Se **adoptaron sus ideas** y se reescribieron como código propio en `supabase/functions/`:

| Idea del conector | Dónde quedó |
|---|---|
| Una sola sesión compartida y renovación antes del vencimiento | `_shared/baneco.ts` (`signIn`) · TC-BN-05/06/07 |
| Tres caminos de confirmación (pantalla, aviso, revisión por minuto) | `_shared/payments.ts` · TC-PAY-04…09 |
| El aviso del banco nunca se cree: se pregunta con `statusQR` | `verifyNotification` · TC-BN-15/16/17 |
| `paidQR` lanza error si el banco falla (no "lista vacía") | TC-BN-14 |
| Anular el QR al vencer el pedido; rescatar pago tardío | `expireOrders` · TC-PAY-11/12 |
| Glosa limpia y ≤ 100 caracteres | `sanitizeText`, `buildDescription` · TC-BN-11 |

## Hallazgos que se corrigieron o quedan abiertos
- **Fecha del banco:** el banco usa hora de Bolivia (UTC-4). Pedir `paidQR` con la fecha UTC falla después de las 20:00 hora local. Corregido en las Edge Functions y en el demo (`hoyBolivia`). TC-BN-19.
- **Contraseña:** el conector exige `BANECO_CLAVE`, pero el dueño indica que el usuario de certificación no tiene contraseña. El campo `password` sigue siendo obligatorio en la API. Se soportan `BANCO_ECONOMICO_PASSWORD_FROM=vacio|usuario`, **sin confirmar cuál acepta el banco**: pregunta abierta (docs/open-questions.md).
- **"Probado en producción"** (afirmación del programador): no verificada por nosotros.

## Lo que NO está verificado
Las Edge Functions solo se probaron con un banco simulado y una base en memoria; el SQL, con PostgreSQL local. No se ejecutaron en Deno ni contra Supabase o el banco reales. Primer paso real: certificación (`apimktdesa`) con `examples/qr-baneco-demo` → luego desplegar (`supabase functions deploy`) y repetir un cobro de Bs 1.
