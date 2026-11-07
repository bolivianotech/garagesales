# Preguntas abiertas

## Resueltas
| # | Decisión |
|---|---|
| Q2, Q3 | El QR es de la plataforma; comisión de liquidación **1 %** por transacción (`commission_bps = 100`). |
| Q4 | Entrega solo por **retiro en persona**. |
| Q5 | El admin **aprueba** a cada vendedor. RBAC estricto entre vendedores. |
| Q6 | Sin facturación por ahora. |
| Q7 | Dominio tentativo `garagesales.bo` (aún no comprado); primero despliegue con dominio gratuito. |
| Q9, Q10, Q11 | QR dinámico por pedido (`generateQR`), uso único, monto no modificable; pago confirmado con `statusQR` (`1`), aviso opcional, conciliación con `paidQR`. |
| Q12 | Comisión redondeada **hacia arriba** (a favor de la plataforma); neto del vendedor hacia abajo. |
| Q13 | Liquidación manual al QR/cuenta del vendedor. |
| Q14 | Ítem pagado sale del catálogo/inventario y queda en "Por entregar"; reportes de entregados, no entregados y tiempos de retiro. |
| Q17 | QR del pedido: vigencia corta y uso único, con descripción (SKU/ítems); nombre y banco del pagador vienen del banco. QR del vendedor: cualquier banco, multipago, vigencia larga (hasta 2 años), versionado e inmutable (spec 008). |
| Q18 | PDF recibido y resumido en `docs/integraciones/banco-economico.md`. |

## Abiertas — confirmar con el dueño del producto
| # | Pregunta | Bloquea |
|---|---|---|
| Q19 | **Roles de finanzas:** propongo `finance_admin` (aprueba métodos de cobro y liquidaciones) distinto de `admin` (aprueba vendedores, reportes), con aprobación de cuatro ojos y 24 h de enfriamiento al cambiar una cuenta. ¿Quién tendrá cada rol? ¿Basta una sola persona con ambos al inicio? | Spec 008 |
| Q20 | ¿El vendedor sube una **foto/captura de su QR** o prefieres que ingrese banco + cuenta + titular y vigencia? Propongo ambos (imagen + datos). | Spec 008 |
| Q21 | **URL de movimientos:** me diste `accounts/queryMovements`, pero el PDF v1.3.0 documenta `POST /api/accounts/history`. ¿El banco te dio otra URL? | Spec 004 |

## Abiertas — consultar al banco (H1–H10 en `docs/integraciones/banco-economico.md`)
| # | Pregunta |
|---|---|
| Q22 | Algoritmo AES exacto (modo, IV, relleno, formato de la llave). |
| Q23 | ¿Exigen IP fija para llamar su API? (las Edge Functions de Supabase no la tienen). |
| Q24 | Longitud máxima de `description`; significado de `transactionId` en la respuesta de pago. |
| Q25 | Expiración del token y límites de consulta; si el aviso `notifyPaymentQR` se puede activar y desde qué IP llega. |
| Q26 | Catálogo de códigos de banco (ASFI) para mostrar el nombre del banco pagador. |
| Q27 | Credenciales y llave de **certificación** y proceso para producción. |

## Abiertas — infraestructura
| # | Pregunta |
|---|---|
| Q15 | Dominio temporal gratuito (propuesta: Cloudflare Pages `*.pages.dev`). |
| Q16 | Titular y facturación de la cuenta de Supabase. |

> Credenciales y llave AES nunca van en el chat ni en el repo: se cargan como secretos de Supabase.
