# Plan E2E (prueba integral de "terminado")

El E2E recorre **todo el negocio, de punta a punta, en un navegador real y con las cuentas de cada rol**. Es la última barrera antes de dar el sistema por terminado: si pasa completo en certificación y una vez en producción con Bs 0,01, el sistema está listo.

Código: [`e2e/`](../../e2e/README.md) · Resultados: `e2e/e2e-results.json` y [reporte](reports/latest.md) · UAT (personas): [`docs/uat/`](../uat/00-plan-uat.md)

## 1. Diferencia entre E2E y UAT
| | E2E | UAT |
|---|---|---|
| Quién | Un guion automático | Personas reales por rol |
| Qué busca | Que todas las piezas funcionen juntas, siempre igual | Que el sistema sea útil y claro |
| Cuándo | Antes y después de **cada** despliegue (humo) y antes del lanzamiento (completo) | Antes del lanzamiento y tras cambios grandes |
| Pago | Lo hace una persona con su app en certificación (`manual`) | Lo hace el comprador real |

## 2. Estado actual

| Nivel | Casos | Estado |
|---|---|---|
| `@smoke` | E2E-01 a E2E-05 | ✅ **Ejecutados: 5 de 5 pasan** (build local, Chromium) |
| `@live` | E2E-10, E2E-11 | ✍️ Escritos; **sin ejecutar** (necesitan Supabase real y cuentas) |
| `@full` | E2E-20 a E2E-26 | 🚧 Escritos como contrato; **no ejecutables** hasta construir las pantallas y el cobro (marcados `fixme`) |

## 3. Escenarios

| ID | Escenario | Roles | Requisitos | Automatizado |
|---|---|---|---|---|
| E2E-01 | La app carga y muestra el catálogo | — | FR-020 | ✅ |
| E2E-02 | Las áreas privadas exigen sesión | — | FR-004 | ✅ |
| E2E-03 | Formulario de ingreso y registro | — | FR-001 | ✅ |
| E2E-04 | Rutas desconocidas vuelven al inicio | — | — | ✅ |
| E2E-05 | Google oculto hasta configurarlo | — | FR-001 | ✅ |
| E2E-10 | Cada rol ve solo lo suyo | Comprador, Vendedor, Admin | FR-004, FR-005 | ✍️ |
| E2E-11 | Vendedor publica con foto → catálogo → pausa → desaparece | Vendedor | FR-010, FR-012 | ✍️ |
| E2E-20 | Compra, pago QR de Bs 0,01 y comprobante | Comprador | FR-022, FR-033, FR-083 | 🚧 |
| E2E-21 | Comprobante sin sesión; token alterado no funciona | Comprador | FR-083 | 🚧 |
| E2E-22 | Subir hasta 3 fotos del comprobante bancario | Comprador | FR-085 | 🚧 |
| E2E-23 | Vendedor ve venta, pagador y entrega con código | Vendedor | FR-071, FR-074 | 🚧 |
| E2E-24 | Admin ve "Quién pagó" con enlace | Admin | FR-084 | 🚧 |
| E2E-25 | Finanzas ve comisión del 1 % con redondeo | Finanzas | FR-060 | 🚧 |
| E2E-26 | Dos pagos por la última unidad | 2 compradores | FR-023a, NFR-004 | 🚧 |

## 4. El ciclo completo (E2E "de terminado"), paso a paso

Es la secuencia que debe pasar de principio a fin sin intervención, salvo el pago del QR:

1. **Vendedor** publica `Producto E2E` (Bs 0,01, cantidad 1) con foto. *(E2E-11)*
2. **Visitante** lo encuentra en el catálogo. *(E2E-11)*
3. **Comprador** lo agrega al carrito y paga: se genera el QR de **Bs 0,01**. *(E2E-20)*
4. **Una persona paga** el QR con su app bancaria *(único paso manual)*.
5. La pantalla pasa sola a **Pagado** y muestra el **comprobante** con nombre y banco del pagador. *(E2E-20)*
6. El **producto desaparece** del catálogo y del inventario del vendedor. *(E2E-23)*
7. El **vendedor** lo ve en *Por entregar* con comprador y pagador. *(E2E-23)*
8. El comprador **sube la foto** de su comprobante bancario. *(E2E-22)*
9. El vendedor **entrega con el código**; un código incorrecto se rechaza. *(E2E-23)*
10. El **admin** ve el pago en *Quién pagó*, con enlace al comprobante. *(E2E-24)*
11. **Finanzas** ve el saldo del vendedor con **comisión 1 %** y crea la liquidación. *(E2E-25)*
12. **Carrera:** dos compradores pagan la última unidad: uno gana, otro en revisión; Finanzas reembolsa. *(E2E-26)*
13. **Limpieza:** se ejecuta el runbook 03 y se comprueban conteos en 0. *(manual con verificación SQL)*

## 5. Cuándo se ejecuta

| Momento | Qué se ejecuta | Quién |
|---|---|---|
| Cada commit (CI) | `@smoke` contra el build local | Automático |
| **Antes** de desplegar | `@smoke` + `@live` en la rama de vista previa | Equipo técnico |
| **Después** de desplegar | `@smoke` contra la URL pública (15 min, ver `05-estrategia-de-pruebas.md`) | Equipo técnico |
| Antes del lanzamiento | `@full` completo en certificación **y** una vez en producción con Bs 0,01 | Dueño + técnico |
| Tras cambios grandes | `@full` | Equipo técnico |

## 6. Criterio de "terminado"
- [ ] `@smoke` y `@live` en verde en certificación
- [ ] `@full` (E2E-20 a E2E-26) sin `fixme` y en verde en certificación
- [ ] Un ciclo completo real en **producción** con Bs 0,01 (pasos 1 a 11)
- [ ] Evidencia (capturas o video) guardada en `docs/testing/evidence/`
- [ ] Reporte generado y commiteado con la versión probada

## 7. Cómo agregar un E2E nuevo
1. Escribe el escenario en la tabla de la sección 3 con su requisito.
2. Crea el caso en `e2e/tests/` con nombre `E2E-NN @etiqueta descripción`.
3. Usa `data-testid` (contrato en `e2e/README.md`), no textos que puedan cambiar.
4. Ejecútalo local; si necesita cuentas, usa variables de entorno `E2E_*`.
