# Preguntas abiertas

## Resueltas
| # | Decisión |
|---|---|
| Q2, Q3 | El QR es de la plataforma; comisión de liquidación **1 %** por transacción (`commission_bps = 100`). |
| Q4 | Entrega solo por **retiro en persona**. |
| Q5 | El admin **aprueba** a cada vendedor. RBAC estricto entre vendedores. |
| Q6 | Sin facturación por ahora. |
| Q7 | Dominio tentativo `garagesales.bo` (aún no comprado); primero despliegue con dominio gratuito. |
| Q9–Q11 | QR dinámico por pedido (`generateQR`), uso único, monto no modificable; pago confirmado con `statusQR` (`1`), aviso opcional, conciliación con `paidQR`. |
| Q12 | Comisión redondeada **hacia arriba** (a favor de la plataforma); neto del vendedor hacia abajo. |
| Q13 | Liquidación manual al QR/cuenta del vendedor. |
| Q14 | Ítem pagado sale del catálogo/inventario y queda en "Por entregar"; reportes de entregados, no entregados y tiempos de retiro. |
| Q17 | QR del pedido: vigencia corta, uso único, con descripción (SKU/ítems). QR del vendedor: cualquier banco, multipago, vigencia larga, versionado e inmutable (spec 008). |
| Q18 | PDF recibido y resumido en `docs/integraciones/banco-economico.md`. |
| Q19 | El dueño es `admin` y también `finance_admin`, con **dos cuentas de correo distintas**. Se exige 2FA en ambas y el `audit_log` registra la cuenta que actúa. Si más adelante hay otra persona, solo se reasigna el rol. |
| Q20 | El vendedor sube **foto del QR + datos** (banco, titular, cuenta, vigencia). |
| Q21 | No hay otra URL: se usa `POST /api/accounts/history` del PDF. |
| Q22 | El banco solo indica AES con llave de 256 bits (32 bytes). Modo/IV/relleno se determinan por pruebas en certificación (ver integración H2). |
| Q24 | `description` máx. **100 caracteres**. |
| Q25 | Sin límites de consulta documentados; los movimientos se piden por rango `startDate`–`endDate`, y `paidQR` por día. Se consulta con moderación y backoff. |
| Q26 | `senderBankCode` usa código ASFI; el catálogo no viene en el PDF (ver abierta Q26). |

## Abiertas
| # | Pregunta | Bloquea |
|---|---|---|
| Q23 | ¿El banco exige IP fija para llamar su API? (las Edge Functions de Supabase no la tienen). Se resuelve probando desde certificación; si falla, proxy con IP fija. | Fase 4 |
| Q26 | Catálogo de códigos ASFI para mostrar el nombre del banco pagador. Mientras tanto se muestra el código. Opción: construir el catálogo a partir de la lista pública de ASFI. | Spec 004 (solo visual) |
| Q27 | **Contraseña** del usuario API de certificación (el usuario y la llave AES ya existen en el portal del banco) y proceso/URL de producción. | Fase 4 |
| Q28 | **Notificación de pago:** el portal del banco permite registrar la *URL del servicio de notificación* y un *token de autorización*. Se configura cuando exista la URL pública de la Edge Function (requiere proyecto Supabase). | Fase 4 |
| Q15 | Dominio temporal gratuito (propuesta: Cloudflare Pages `*.pages.dev`). | Fase 1 |
| Q16 | Titular y facturación de la cuenta de Supabase. | Fase 1 |

> La llave AES y la contraseña nunca van en el chat ni en el repo: se cargan como secretos de Supabase (ver `docs/integraciones/banco-economico.md`, sección "Dónde va la llave AES").
