# Manual del Administrador de Finanzas

Responsable del dinero: concilia pagos con el banco, resuelve reembolsos, calcula cuánto pagar a cada vendedor (descontando la comisión del 1 %), aprueba los datos de cobro y administra la configuración financiera.

> **Estado de las pantallas:** ✅ disponible hoy · ⏳ en construcción (specs 006 y 008).

## 1. Tu cuenta
- Rol `finance_admin`, con **2FA obligatorio**. Correo distinto al del Administrador General.
- Solo tú puedes: aprobar métodos de cobro de vendedores, registrar liquidaciones y cambiar la configuración (comisión, vigencias).
- Todo lo que hagas queda en la **auditoría inmutable**: nada se edita ni se borra; las correcciones son asientos de reversa.

## 2. Conceptos
| Término | Significado |
|---|---|
| **Bruto** | Precio del producto vendido |
| **Comisión** | 1 % del bruto **redondeado hacia arriba** al centavo (a favor de la plataforma) |
| **Neto** | Bruto − comisión (lo que recibe el vendedor) |
| **Liquidación** | Pago agrupado a un vendedor por varias ventas |
| **En revisión** | Pago recibido que no se pudo asignar (sin stock, monto distinto…) |

Ejemplo: producto de Bs 1,50 → comisión = techo(1,50 × 1 %) = Bs 0,02 → neto Bs 1,48. Un producto de Bs 0,01 → comisión Bs 0,01 → neto Bs 0,00 (por eso las pruebas de 1 centavo no generan saldo para el vendedor).

## 3. Rutina diaria ⏳
1. **Pagos → En revisión:** resuelve cada caso (sección 4).
2. **Conciliación:** el sistema compara a diario los pagos con el banco. Si hay una diferencia, aparece una alerta. Revisa el estado de cuenta del banco y corrige con un asiento de reversa.
3. **Cierre del día:** suma de **Quién pagó** del día = créditos en el banco por QR. Debe coincidir al centavo.

## 4. Reembolsos ⏳
1. Abre el pago en revisión: ves **nombre y banco del pagador**, monto y motivo.
2. Haz la **transferencia manual** desde la cuenta de la plataforma al pagador.
3. Registra la resolución: **Reembolsado** + número de operación + nota.
4. El comprador recibe aviso; el pedido queda `cancelled`.
> Si decides **honrar** el pago (puedes entregar igual), registra el motivo.

## 5. Saldos por pagar y liquidaciones ⏳ (spec 006)
1. **Finanzas → Saldos por pagar:** por vendedor, bruto, comisión, neto y detalle de ventas.
2. Verifica el **cuadre**: Σ bruto de pedidos pagados = Σ comisión + Σ neto, y = créditos del banco.
3. Para pagar: abre al vendedor → **Crear liquidación** → el sistema agrupa sus ventas pendientes.
4. Haz el pago al **QR/cuenta vigente** del vendedor (se muestra la versión exacta y su vencimiento).
5. Registra **fecha y número de operación** → la liquidación queda cerrada; esas ventas no pueden liquidarse otra vez.
6. Exporta a CSV si lo necesitas.

No se puede liquidar si el método de cobro está vencido, inutilizado o en período de espera.

## 6. Datos de cobro de vendedores ⏳ (spec 008)
Cada vendedor registra banco, titular, cuenta y **foto de su QR** (cualquier banco, multipago, vigencia larga).
1. **Finanzas → Métodos de cobro → Solicitudes.**
2. Verifica titular y QR (que sea legible y corresponda al titular).
3. **Aprobar** (no puede aprobar quien lo registró). Queda una **versión nueva**; la anterior se conserva.
4. **24 horas de espera** antes de poder pagar a una cuenta nueva o modificada (protege contra desvío de pagos). El vendedor recibe aviso.
5. Alertas de vencimiento del QR a 30, 7 y 1 día. Si un QR quedó inutilizado, márcalo con motivo y pide uno nuevo.

## 7. Configuración financiera ⏳
| Parámetro | Valor inicial | Efecto |
|---|---|---|
| `commission_bps` | 100 | Comisión: 100 = 1 % |
| `order_valid_hours` | 24 | Vigencia de un pedido sin pagar |
| `payout_cooling_hours` | 24 | Espera tras cambiar datos de cobro |
| `require_admin_mfa` | true | 2FA obligatorio para administración |
Cambiarlos queda auditado. Los cambios de comisión **no** afectan ventas ya hechas.

## 8. Reportes
- **Quién pagó** (con enlace de comprobante) · **Saldos por pagar** · **Liquidaciones** · **Pagos en revisión** · **Diferencias de conciliación**.

## 9. Seguridad
- Nunca pagues a una cuenta que no esté en el sistema, aunque te lo pidan por WhatsApp.
- Si un vendedor pide cambiar su cuenta de cobro "urgente", sigue igual el proceso y la espera.
- Las llaves y contraseñas del banco **nunca** se envían por correo ni chat.

## 10. Preguntas frecuentes
| Pregunta | Respuesta |
|---|---|
| ¿Por qué el neto de un producto de Bs 0,01 es 0? | La comisión mínima es de 1 centavo (se redondea hacia arriba) |
| Me equivoqué en una liquidación | No se edita: registra una reversa y crea una nueva |
| Un pago del banco no tiene pedido | Queda en conciliación como diferencia; investiga con el estado de cuenta |
| ¿Puedo cambiar la comisión para un solo vendedor? | No; la comisión es global por diseño |
