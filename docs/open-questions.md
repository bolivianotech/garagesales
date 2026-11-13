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
| Q26 | `senderBankCode` usa código ASFI; catálogo editable en `bank_catalog` (ver abajo). |

## Abiertas
| # | Pregunta | Bloquea |
|---|---|---|
| Q27 | **Credencial `password` del `authenticate`:** el PDF pide `userName` + `password` (cifrado), pero el banco entregó solo el usuario (A24627210) y la llave AES. Preguntar al banco qué valor va en `password` (¿la clave del portal de usuarios?, ¿se genera aparte?) y la URL de producción. | Fase 4 |
| Q28 | **Notificación de pago:** registrar en el portal del banco la URL de la función de aviso y su token, cuando exista el despliegue en Supabase. | Fase 4 |
| Q29 | **Correos de personal:** el de `admin` y el de `finance_admin` (se registran en la app y luego se asignan con `bootstrap_staff_role`). | T10 |
| Q30 | **Aplicar la migración** en Supabase y habilitar Google/confirmación de correo (ver `docs/setup-supabase.md`). | T9, T11 |
| Q15 | Dominio temporal gratuito (propuesta: Cloudflare Pages `*.pages.dev`). ¿Tienes cuenta de Cloudflare? | T13 |

## Abiertas nuevas (2026-11-08)
| # | Pregunta | Bloquea |
|---|---|---|
| Q31 | **Rotar la llave AES y la credencial de API** (se expusieron en un repo público), **pasar el repositorio a privado**, fusionar la rama limpia `claude/garagesales-limpia-ivzqi8` y **borrar la rama anterior**. Ver `docs/handbook/09-seguridad-y-secretos.md`. | Todo uso real del banco |
| Q32 | El banco responde `404 "Usuario no habilitado para uso de apis"` a `authenticate`: pedir la habilitación del usuario en certificación (punto 3 de la consulta). | Fase 4 |
| Q33 | El estudiante que integró QR Conecta en 2 sistemas puede aclarar: qué lleva `password`, modo AES/IV/relleno, ambiente y usuario que usó. Compartir **solo explicación**, nunca llaves. | Fase 4 |
| Q34 | Confirmar el mínimo de pago por QR (¿Bs 0,01?) para los UAT. | UAT |
| Q35 | Foto del comprobante del comprador (FR-085): ¿obligatoria u opcional? Propuesta: opcional, hasta 3 imágenes. | E2 |
| Q36 | Contraseña del usuario de certificación: el dueño dice que no tiene, pero `password` es obligatorio en `authenticate`. ¿El banco acepta cadena vacía o el propio usuario cifrado? Probar con `diagnosticar-password` y confirmar con el banco. | E1 |

## Resueltas en esta ronda
- **Q16:** proyecto Supabase `garajesales` creado (ref `pfhgqoeobboriounehat`).
- **Q23:** el banco **no exige IP fija**; las Edge Functions funcionan sin proxy.
- **Q26 (catálogo de bancos):** no se pudo obtener de fuentes públicas ni del PDF; el listado de ASFI que aparece en la web usa otro tipo de código (códigos de envío de información, 5 dígitos), así que **no se usa**. Decisión: tabla `bank_catalog` editable; se muestra "Banco <código>" mientras no esté cargado y se completa con los códigos que aparezcan en pagos reales o con el listado que entregue el banco.

> La llave AES y la contraseña nunca van en el chat ni en el repo: se cargan como secretos de Supabase (ver `docs/integraciones/banco-economico.md`, sección "Dónde va la llave AES").
