# Preguntas abiertas

## Resueltas (2026-11-07)
| # | Decisión |
|---|---|
| Q2 | El QR es de la plataforma (cuenta del dueño). Ella cobra y luego liquida a cada vendedor. |
| Q3 | Comisión de liquidación: **1 % por transacción**, configurable (`commission_bps = 100`). |
| Q4 | Entrega: **solo retiro en persona**. |
| Q5 | El admin **aprueba** a cada vendedor. RBAC estricto: ningún vendedor ve datos de otro. |
| Q6 | Sin facturación por ahora (se reevaluará). |
| Q7 | Dominio: tentativo `garagesales.bo` (aún no comprado). Primero despliegue y pruebas con dominio gratuito temporal. |

## Abiertas
| # | Pregunta | Bloquea | Estado |
|---|---|---|---|
| Q1 | **PDFs del Banco Económico.** Los PDFs están en `docs/` de la máquina local, pero **no están en el repo** (el `.gitignore` bloquea `*.pdf`). Hay que compartirlos en el chat o commitearlos de forma privada para que yo pueda leerlos. | Spec 004 | Pendiente |
| Q9 | **¿Cómo se genera el QR?** El endpoint `accounts/queryMovements` solo consulta movimientos de cuenta. ¿El PDF incluye un endpoint de generación de QR, o el QR se genera con otro método (QR estático/interoperable de la cuenta)? | Spec 004 | Pendiente |
| Q10 | **¿Cómo se vincula un movimiento bancario con un pedido?** Opciones: referencia/glosa en el QR, o monto único (centavos distintivos). Depende de lo que devuelva `queryMovements` (¿trae glosa, referencia, nombre del pagador?). | Spec 004 | Pendiente |
| Q11 | ¿Existe webhook del banco o solo consulta (polling)? ¿Límite de frecuencia de consulta? | Spec 004 | Pendiente |
| Q12 | Redondeo de la comisión (1 % de montos en centavos) y si se calcula por pedido o por ítem. Propuesta: por ítem vendido, redondeo al centavo más cercano. | Spec 006 | Propuesta |
| Q13 | Frecuencia y forma de liquidar a vendedores (semanal, a pedido) y cómo se registran sus cuentas/QR de cobro. Propuesta: el vendedor registra banco+cuenta; liquidación manual desde el reporte. | Spec 006 | Propuesta |
| Q14 | Un producto vendido: ¿desaparece totalmente de la vista del vendedor, o pasa a la lista "Vendidos / por entregar"? Propuesta: sale del inventario y catálogo, y aparece solo en "Por entregar" hasta ser retirado. | Spec 002/007 | Propuesta |
| Q15 | Dominio temporal gratuito para el primer despliegue (`*.pages.dev`, `*.vercel.app`, `*.github.io`). Propuesta: Cloudflare Pages. | Fase 1 | Propuesta |
| Q16 | Cuenta de Supabase: titular y facturación. | Fase 1 | Pendiente |

> Las credenciales (secret key, API key) nunca se escriben aquí ni en chats; se cargan como secretos de Supabase.
> El endpoint dado es de **desarrollo** (`apimktdesa`). No se hardcodea: va en `BANCO_ECONOMICO_BASE_URL`.
