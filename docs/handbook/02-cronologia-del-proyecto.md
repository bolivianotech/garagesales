# 02 · Cronología real del proyecto

Línea de tiempo reconstruida desde el historial de git (30 commits y 6 pull requests al 8 de noviembre). El historial solo registra la hora de cada commit; las **horas de trabajo efectivo son estimaciones** según el volumen de cada entrega y sirven para dimensionar el esfuerzo, no como registro contable.

## Resumen de esfuerzo

| Fase | Fechas | Trabajo efectivo aprox. | Entregable |
|---|---|---|---|
| 0 · Inception | 6–7 nov | 4 h | Constitución, 8 specs, arquitectura, ADR 0001–0003, contrato del banco |
| 1 · Cuentas y RBAC | 7 nov | 3 h | Migración, auditoría inmutable, login, panel admin, CI |
| Despliegue inicial | 7–8 nov | 3 h (con esperas) | Cloudflare funcionando, correcciones de Vite y wrangler |
| 2 · Catálogo | 8 nov | 3 h | Productos, fotos, carga rápida, catálogo público, 55 casos |
| Pruebas profesionales | 8 nov | 2 h | IDs estables, reporte con trazabilidad, plan, guía manual |
| 3 · Pedidos (base de datos) | 8 nov | 3 h | Pedidos, pagos, retiros, comprobante, concurrencia, 65 casos |
| **Total** | **~2 días calendario** | **≈ 18 h** | 163 casos automáticos verdes (tras agregar limpieza, escáner de secretos y E2E de humo) |

## Día a día

### Viernes 6 de noviembre (noche)
- Se crea el repositorio vacío (`Initial commit`).

### Sábado 7 de noviembre
**Inception (madrugada, UTC)**
1. Primer mensaje del dueño: app móvil + web, productos con foto/precio/cantidad, pago por QR del banco, "paso a paso con SDD".
2. El asistente hace 4 preguntas (banco, stack, vendedores, backend). Respuestas: Banco Económico, PWA, marketplace multivendedor, Supabase.
3. Se escribe la base: `README`, constitución, roadmap, arquitectura, ADR-0001, specs 001–005, preguntas abiertas.
4. El dueño agrega reglas de negocio: comisión 1 %, retiro en persona, aprobación de vendedores, foco TikTok Live. Nacen las specs 006 y 007.
5. El dueño entrega el PDF del banco. Se descubre que la URL de movimientos que tenía no está en el manual (el PDF documenta `accounts/history`). Nace el documento de integración y la spec 008 (datos de cobro versionados e inmutables).

**Fase 1 (tarde)**
6. El dueño crea el proyecto Supabase y pasa URL y clave pública. El entorno del asistente no alcanza `supabase.co`, así que las pruebas SQL corren en un PostgreSQL local con un Supabase simulado.
7. Se construyen migración 001, 24 pruebas de seguridad, PWA base, CI. Resultado: todo verde en local.
8. El dueño aplica la migración en el SQL Editor y registra a los dos administradores.

**Despliegue (noche)**
9. Cloudflare muestra el flujo "Workers" (no "Pages"). Se agrega `wrangler.jsonc`. Primer fallo: Vite 5 no es configurable automáticamente → se sube a Vite 6.

### Domingo 8 de noviembre
10. Segundo fallo de Cloudflare (vistas previas): `wrangler preview` exige `"previews": {}`. Se corrige (PR #4).
11. **Fase 2:** migración 002 (productos, fotos, Storage), compresión de fotos en el navegador, carga rápida, catálogo público. 31 casos SQL + 13 de interfaz.
12. El dueño señala que faltaba documentar pruebas y resultados. Se crean IDs estables (`TC-…`), el generador `test_report.py`, el plan de pruebas y las pruebas manuales `MT-01…10`.
13. Error de confirmación de correo (`localhost:3000`): era la URL por defecto de Supabase. Se corrige el código y la guía.
14. El dueño ejecuta las pruebas manuales: **7 OK**, 1 parcial, 1 bloqueada.
15. Decisiones nuevas: **solo cobro automático** y **sin reserva de stock**. Se actualizan specs y se escribe ADR-0004.
16. **Fase 3 (base de datos):** pedidos, `confirm_payment` atómico, comprobante por token, retiros, reporte de pagos. Prueba de concurrencia real con 20 conexiones simultáneas.
17. El dueño sube archivos desde su computador, incluyendo dos capturas con la llave AES y un password cifrado. El repositorio es público. Se retiran del árbol, pero siguen en el historial: **incidente de seguridad** (ver capítulo 09).

## Pull requests

| PR | Contenido |
|---|---|
| #1 | Fase 0 y Fase 1 |
| #2 | Despliegue: Cloudflare, Vite 6, wrangler |
| #3 | Fase 2 + documentación de pruebas |
| #4 | Arreglo de vistas previas |
| #5 | Arreglo del correo de confirmación + guía de pruebas manuales |
| #6 | (abierto) Resultados manuales + Fase 3 de base de datos |

## Qué esperar si lo repites
- Lo que más tiempo consumió **no fue programar**: fueron las esperas por decisiones, credenciales y configuraciones externas (Supabase, Cloudflare, banco).
- Los problemas de despliegue aparecen en el primer día; por eso en el plan de fin de semana se despliega **primero** una versión vacía.
- Cada fase cerró con pruebas en verde antes de empezar la siguiente.
