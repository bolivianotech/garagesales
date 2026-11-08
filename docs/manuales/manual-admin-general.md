# Manual del Administrador General

Responsable de la plataforma: aprueba vendedores, supervisa productos y entregas, atiende reclamos y vigila la salud del sistema. **No** maneja dinero ni datos de cobro (eso es del Administrador de Finanzas).

> **Estado de las pantallas:** ✅ disponible hoy · ⏳ en construcción.

## 1. Tu cuenta
- Ingresa con tu correo de administración. Tienes **verificación en dos pasos (2FA)** obligatoria: usa una app de autenticación (Google Authenticator, Authy…).
- Tu rol es `admin`. Si ves "Se requiere verificación en dos pasos", cierra sesión e ingresa completando el código.
- **Nunca compartas tu contraseña ni tu código 2FA.**

## 2. Aprobar vendedores ✅
1. **Mi cuenta → Ir al panel de administración**.
2. Verás la lista de tiendas con su tipo y lugar de retiro.
3. **Aprobar** → el usuario pasa a vendedor. **Rechazar** o **Suspender** → escribe el motivo (obligatorio, queda auditado).
4. Un vendedor suspendido deja de publicar y sus productos dejan de verse.

Criterios sugeridos: nombre de tienda claro, lugar de retiro realista, contacto válido, sin duplicados.

## 3. Moderar productos ⏳
- **Ocultar** un producto (contenido indebido, precio engañoso, fotos ajenas): escribe el motivo; deja de verse y queda auditado.
- **Mostrar** de nuevo cuando se corrija.
- La función ya existe en la base de datos; la pantalla está en construcción.

## 4. Reporte "Quién pagó" ⏳
Para cada pago confirmado o en revisión: pedido, comprador, **nombre y banco del pagador**, monto, fecha, estado y **enlace al comprobante**.
Uso: resolver reclamos ("pagué y no me llegó"), cruzar con el estado de cuenta del banco, verificar entregas.

## 5. Pagos en revisión ⏳ (con Finanzas)
Un pago queda en revisión cuando otra persona pagó primero la última unidad, el monto no coincidió o el producto dejó de estar disponible.
1. Ábrelo en **Pagos → En revisión**.
2. Avisa a Finanzas para el **reembolso**.
3. Comunica al comprador (teléfono en el pedido).

## 6. Retiros y entregas ⏳
- **No entregados:** compras pagadas que nadie retiró, con antigüedad en días y teléfono del comprador. Envíales un recordatorio.
- **Entregados:** historial por rango de fechas.
- **Tiempo de retiro por cliente:** promedio de días entre pago y retiro; sirve para identificar compradores que demoran.

## 7. Auditoría y salud del sistema
- **Registro de auditoría:** toda acción sensible queda guardada y no se puede modificar. Revísalo semanalmente.
- **Integridad:** el sistema verifica a diario que el registro no fue alterado. Si alerta, es un incidente grave: sigue el Runbook 02, sección 4.
- **Catálogo de bancos:** completa nombre de cada código de banco que aparece en los pagos (tabla `bank_catalog`).

## 8. Rutina recomendada
Ver `docs/runbooks/02-operacion-diaria.md` (diaria, semanal, mensual).

## 9. Lo que NO puedes hacer (por diseño)
- Cambiar comisión, vigencias ni datos de cobro (solo Finanzas).
- Modificar el registro de auditoría ni pagos confirmados.
- Ver cuentas bancarias completas de vendedores.
Estas barreras protegen a la plataforma y a ti.

## 10. Preguntas frecuentes
| Pregunta | Respuesta |
|---|---|
| ¿Puedo ser vendedor y administrador a la vez? | No con la misma cuenta; usa otra cuenta de compra/venta |
| Aprobé por error | **Suspender** con motivo y volver a evaluar |
| Un vendedor no ve sus ventas | Revisa que su tienda esté `Aprobada` y que el pago esté confirmado |
| Necesito dar de baja a un usuario | Suspender (no se borra; se conserva la historia) |
