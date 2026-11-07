# Spec 001 — Autenticación, roles y RBAC

**Estado:** Approved (2026-11-07)

## Objetivo
Registro/ingreso y control de acceso estricto: comprador, vendedor (aprobado por el admin) y admin.

## Roles
| Rol | Puede |
|---|---|
| `visitor` | Ver catálogo público |
| `buyer` | Comprar, ver sus pedidos y códigos de retiro |
| `seller` (aprobado) | Gestionar **solo su** catálogo, sus pedidos por entregar y su estado de cuenta |
| `admin` | Aprobar/suspender vendedores, ver reportes |
| `finance_admin` | Aprobar métodos de cobro de vendedores y registrar liquidaciones (spec 008; confirmar en Q19) |

## Historias
- Como **persona** quiero registrarme con email o Google.
- Como **aspirante a vendedor** quiero solicitar ser vendedor (nombre de tienda, teléfono, tipo: persona / revendedor de TikTok live / etc.) y esperar aprobación.
- Como **admin** quiero aprobar, rechazar o suspender vendedores.

## Requisitos
- FR-001: Registro/ingreso con email+contraseña y Google.
- FR-002: Perfil con nombre y teléfono (obligatorio para comprar).
- FR-003: Solicitud de vendedor → estado `pending`; hasta que el admin la apruebe no puede publicar. Un vendedor suspendido no puede publicar ni ver nuevos datos.
- FR-004: **RBAC estricto:** un vendedor nunca puede leer ni modificar productos, pedidos, pickups ni liquidaciones de otro vendedor (RLS por `store_id`).
- FR-005: El admin puede aprobar, rechazar y suspender usuarios/tiendas/productos.
- FR-006: Un comprador solo ve sus propios pedidos y códigos de retiro.
- NFR-001: RLS activa en todas las tablas; tests automáticos de acceso cruzado entre vendedores y entre compradores.

## Criterios de aceptación
- **Dado** el vendedor A, **cuando** consulta la API por un producto del vendedor B (aunque conozca su id), **entonces** no obtiene datos.
- **Dado** un vendedor `pending`, **cuando** intenta publicar, **entonces** se rechaza.
- **Dado** el admin, **cuando** aprueba una solicitud, **entonces** el usuario pasa a `seller` y puede publicar.
