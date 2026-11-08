# UAT · Administrador General

**Quién:** el dueño del producto. **Dónde:** computador. Leyenda: 🔴 crítico · 🟠 importante · ✅ ejecutable hoy · ⏳ en construcción.

## Preparación
- [ ] Cuenta `admin` con 2FA enrolado
- [ ] Un vendedor con solicitud pendiente, otro con tienda aprobada y productos
- [ ] Pagos de prueba de los UAT de comprador (algunos confirmados, uno en revisión)

---

### UAT-ADM-01 · Ingreso con 2FA ✅ 🔴
**Pasos:** ingresa con tu correo y contraseña. Completa el código de la app de autenticación. Prueba con un código incorrecto.
**Esperado:** con el código correcto entras al panel; con uno incorrecto, no. (Con `require_admin_mfa = true`, las acciones de administración sin 2FA se rechazan.)

### UAT-ADM-02 · Aprobar, rechazar y suspender vendedores ✅ 🔴
**Pasos:** **Panel → Vendedores:** aprueba una solicitud; rechaza otra con motivo; suspende una tienda aprobada con motivo.
**Esperado:** los estados cambian; el motivo es obligatorio para rechazar/suspender; el usuario aprobado pasa a vendedor.

### UAT-ADM-03 · Efecto de la suspensión ✅ 🔴
**Pasos:** con la tienda suspendida, entra como ese vendedor e intenta publicar; mira el catálogo.
**Esperado:** no puede publicar y sus productos **ya no se ven**.

### UAT-ADM-04 · Roles bien separados ✅ 🔴
**Pasos:** como comprador, abre `/admin`. Como vendedor, abre `/admin`.
**Esperado:** ambos son redirigidos a "Mi cuenta"; no ven nada del panel.

### UAT-ADM-05 · Ocultar y mostrar un producto ⏳ 🟠
**Pasos:** oculta un producto con motivo; míralo en el catálogo; vuelve a mostrarlo.
**Esperado:** oculto no aparece (el vendedor lo ve marcado "Ocultado por el administrador" y no puede reactivarlo); al mostrarlo vuelve. Cada acción queda en la auditoría.

### UAT-ADM-06 · Reporte "Quién pagó" ⏳ 🔴
**Pasos:** abre **Pagos → Quién pagó**; filtra por fecha; abre el enlace de un comprobante.
**Esperado:** cada fila muestra código, comprador, **nombre y banco del pagador**, monto, fecha y estado; el enlace abre el comprobante correcto. Los pagos en revisión aparecen identificados.

### UAT-ADM-07 · Retiros: no entregados, entregados y tiempos ⏳ 🟠
**Pasos:** abre los tres reportes de retiros.
**Esperado:** **No entregados** lista compras pagadas sin retirar con días de antigüedad y teléfono; **Entregados** por rango de fechas; **Tiempo por cliente** muestra promedio y mediana entre pago y retiro.

### UAT-ADM-08 · Auditoría legible ✅ 🟠
**Pasos:** en Supabase ejecuta `select at, actor_role, action, entity, reason from public.audit_log order by id desc limit 20;`.
**Esperado:** ves las aprobaciones, suspensiones y confirmaciones con fecha, rol y motivo.

### UAT-ADM-09 · Integridad de la auditoría ✅ 🔴
**Pasos:** ejecuta `select public.verify_audit_chain();`.
**Esperado:** devuelve **null** (cadena íntegra). Intenta `update public.audit_log set reason='x';` → error (la tabla es inmutable).

### UAT-ADM-10 · Límites de tu rol ✅ ⏳ 🟠
**Pasos:** intenta cambiar la comisión (`update public.settings …` en una sesión de administrador) y ver los datos de cobro completos de un vendedor.
**Esperado:** no puedes: solo Finanzas.

### UAT-ADM-11 · Catálogo de bancos ✅ 🟡
**Pasos:** agrega el nombre de un código de banco que aparece en un pago.
**Esperado:** el comprobante y el reporte muestran el nombre del banco además del código.

### UAT-ADM-12 · Reclamo "pagué y no me llegó" ⏳ 🟠
**Pasos:** a partir del nombre del pagador, busca el pago en el reporte y verifica estado y comprobante.
**Esperado:** encuentras el pago y puedes explicar al comprador qué pasó en menos de 2 minutos.

---

## Resultados
| ID | Crítico | Resultado | Fecha | Ejecutor | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| UAT-ADM-01 | 🔴 | | | | | |
| UAT-ADM-02 | 🔴 | | | | | |
| UAT-ADM-03 | 🔴 | | | | | |
| UAT-ADM-04 | 🔴 | | | | | |
| UAT-ADM-05 | 🟠 | | | | | |
| UAT-ADM-06 | 🔴 | | | | | |
| UAT-ADM-07 | 🟠 | | | | | |
| UAT-ADM-08 | 🟠 | | | | | |
| UAT-ADM-09 | 🔴 | | | | | |
| UAT-ADM-10 | 🟠 | | | | | |
| UAT-ADM-11 | 🟡 | | | | | |
| UAT-ADM-12 | 🟠 | | | | | |

Firma del Administrador General: ____________  Fecha: ________
