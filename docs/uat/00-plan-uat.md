# Plan de UAT (Pruebas de Aceptación de Usuario)

> **Qué es:** personas reales, en roles reales, ejecutan el sistema **como lo usarían** y confirman que hace lo que se prometió en las specs. **No** buscan errores de código (eso lo hacen las pruebas automáticas): buscan que el sistema **sirva**.
> **Estado:** guion completo y listo. **Ejecución pendiente**, porque depende de las pantallas de compra y del cobro con QR (ver `docs/estado-del-proyecto.md`). Los casos que ya se pueden ejecutar hoy están marcados ✅.

## 1. Alcance y roles

| Rol | Guion | Quién ejecuta | Cuentas |
|---|---|---|---|
| Comprador | [`uat-comprador.md`](uat-comprador.md) | 2 personas ajenas al equipo | `+c` y `+d` |
| Vendedor / Administrador de negocio | [`uat-vendedor.md`](uat-vendedor.md) | 2 vendedores (uno con TikTok Live, otro persona común) | Vendedor A y B |
| Administrador General | [`uat-admin-general.md`](uat-admin-general.md) | El dueño | `jimrequena@…` |
| Administrador de Finanzas | [`uat-admin-finanzas.md`](uat-admin-finanzas.md) | La persona de finanzas | `requenataniel@…` |

## 2. Ambiente
- **Certificación**: sitio de Cloudflare, proyecto Supabase de pruebas, banco en `apimktdesa` (o producción con Bs 0,01 en la prueba final).
- Navegador: Chrome en computador y el celular real de cada participante.
- Banco: cada comprador necesita una app bancaria con saldo para pagar **Bs 0,01** por prueba.

> **[VERIFICAR]** que el banco acepte pagos de Bs 0,01 por QR. Si el mínimo es mayor, ajusta los precios de prueba al mínimo permitido y recalcula los ejemplos de comisión.

## 3. Datos de prueba (prepararlos antes)

| Dato | Cantidad | Detalle |
|---|---|---|
| Vendedor A, tienda "UAT Tienda A" | 1 | Aprobada; lugar de retiro real del evaluador |
| Vendedor B, tienda "UAT Tienda B" | 1 | Aprobada |
| Productos de Bs 0,01 | 6 | A1 "Camisa UAT" (cantidad 5), A2 "Gorra UAT" (cantidad 5), A3 "Última unidad UAT" (cantidad **1**), B1 "Zapatos UAT" (cantidad 5), B2 "Cartera UAT" (cantidad 5), B3 "Reloj UAT" (cantidad 5) |
| Un producto de Bs 1,50 | 1 | Para validar el redondeo de la comisión (Bs 0,02) |
| Un producto de Bs 50,00 | 1 | Para validar comisión Bs 0,50 (sin pagarlo; solo en UAT de finanzas con pago simulado en certificación) |
| Compradores | 2 | Perfil completo con teléfono |

Todos los productos con fotos reales o de muestra y la palabra **UAT** en el nombre para poder limpiarlos.

## 4. Cronograma (1 día, dos turnos)

| Hora | Bloque | Participantes |
|---|---|---|
| 08:30 | Preparación de datos y cuentas | Equipo técnico |
| 09:00 | UAT Vendedor (publicación) | Vendedores |
| 10:00 | UAT Comprador (compra, pago, comprobante) | Compradores + vendedores atentos |
| 11:30 | UAT Vendedor (entregas) y Admin General | Vendedores, Admin |
| 13:30 | UAT Finanzas (reembolso, saldos, liquidación) | Finanzas |
| 15:00 | Carrera de pagos (UAT-CMP-07) | 2 compradores |
| 16:00 | Revisión de defectos y cierre | Todos |
| 17:00 | Firmas | Dueño |

## 5. Reglas de oro
1. **Cada participante usa su propia cuenta y su propio celular.**
2. Un caso se marca **OK** solo si el resultado coincide **exactamente** con "Esperado". Si hay duda, es **FALLA**.
3. Toda falla lleva captura y la hora aproximada.
4. No se corrigen cosas durante la ejecución: se registran y se corrigen después.
5. Dinero: máximo **Bs 0,01 por pago**; los reembolsos de prueba los hace Finanzas.
6. Datos personales: usar solo cuentas de prueba.

## 6. Criterios
**Entrada (para empezar):**
- [ ] Reporte automático en verde (sin fallas)
- [ ] Integración con el banco en certificación validada (`INT-01` a `INT-15`)
- [ ] Datos de prueba creados (sección 3)
- [ ] Participantes convocados y con acceso a sus cuentas

**Salida (para aprobar):**
- [ ] **100 %** de los casos críticos (🔴) en OK
- [ ] ≥ 95 % del total en OK
- [ ] 0 defectos críticos o altos abiertos
- [ ] Defectos medios/bajos con fecha de corrección
- [ ] Firma del dueño

## 7. Severidad de defectos

| Nivel | Ejemplo | Acción |
|---|---|---|
| 🔴 Crítico | Un pago se pierde; un vendedor ve datos de otro; se descuenta stock sin pago | Detiene el lanzamiento |
| 🟠 Alto | El comprobante muestra datos incorrectos; no se puede entregar | Corregir antes del lanzamiento |
| 🟡 Medio | Mensaje confuso; pantalla lenta | Corregir en la primera semana |
| ⚪ Bajo | Texto, ortografía, estilo | Lista de mejoras |

## 8. Registro de defectos

| ID | Caso UAT | Severidad | Descripción | Pasos para reproducirlo | Evidencia | Estado | Responsable |
|---|---|---|---|---|---|---|---|
| D-001 | | | | | | Abierto | |

## 9. Resultados
Se registran en [`uat-resultados.md`](uat-resultados.md). El reporte automático (`scripts/test_report.py`) puede leerlo cuando se ejecute.

## 10. Aprobación

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Dueño del producto | | | |
| Administrador General | | | |
| Administrador de Finanzas | | | |
| Representante de vendedores | | | |
| Representante de compradores | | | |
