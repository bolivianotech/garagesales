# UAT · Administrador de Finanzas

**Quién:** la persona responsable del dinero. **Dónde:** computador, con acceso al banco. Leyenda: 🔴 crítico · 🟠 importante · ✅ ejecutable hoy · ⏳ en construcción (specs 006/008).

## Preparación
- [ ] Cuenta `finance_admin` con 2FA
- [ ] Acceso al estado de cuenta del banco (para cruzar)
- [ ] Ventas de prueba pagadas por los UAT de comprador, incluyendo: Bs 0,01, Bs 1,50 y un pago en revisión
- [ ] Un vendedor con datos de cobro registrados

---

### UAT-FIN-01 · Ingreso y límites ✅ 🔴
**Pasos:** ingresa con 2FA. Intenta aprobar un vendedor (acción del Administrador General).
**Esperado:** entras; **no** puedes aprobar vendedores. Puedes cambiar configuración (UAT-FIN-10).

### UAT-FIN-02 · Pago en revisión y reembolso ⏳ 🔴
**Pasos:** abre el pago en revisión de la carrera (UAT-CMP-07). Verifica nombre y banco del pagador. Haz la transferencia de Bs 0,01 de vuelta. Registra **Reembolsado**, número de operación y nota.
**Esperado:** el pedido queda `cancelled`; la resolución está en la auditoría; el comprador es notificado.

### UAT-FIN-03 · Cuadre del día ⏳ 🔴
**Pasos:** suma en **Quién pagó** los pagos confirmados del día; compara con los créditos por QR del estado de cuenta.
**Esperado:** coinciden **al centavo**. Si no, el sistema alerta y puedes identificar la diferencia.

### UAT-FIN-04 · Conciliación diaria ⏳ 🟠
**Pasos:** revisa el resultado de la conciliación; **borra a propósito** (en certificación) un pago de la base y vuelve a correrla.
**Esperado:** sin diferencias en el caso normal; con el pago faltante, aparece una alerta con el monto.

### UAT-FIN-05 · Comisión del 1 % con redondeo ⏳ 🔴
**Pasos:** abre **Saldos por pagar** del vendedor A.
**Esperado (verifica cada fila):**

| Precio | Comisión | Neto |
|---|---|---|
| Bs 0,01 | Bs 0,01 | Bs 0,00 |
| Bs 1,50 | Bs 0,02 | Bs 1,48 |
| Bs 50,00 | Bs 0,50 | Bs 49,50 |
| Bs 99,99 | Bs 1,00 | Bs 98,99 |

La regla es `comisión = techo(precio × 1 %)` por producto vendido; el neto es el resto.

### UAT-FIN-06 · Crear liquidación ⏳ 🔴
**Pasos:** abre al vendedor → **Crear liquidación** → registra fecha y número de operación del pago a su QR/cuenta.
**Esperado:** las ventas quedan **liquidadas**; el total = suma de netos; se guarda la **versión exacta** del método de cobro usada.

### UAT-FIN-07 · No liquidar dos veces ⏳ 🔴
**Pasos:** intenta crear otra liquidación con las mismas ventas.
**Esperado:** rechazado; solo aparecen ventas pendientes.

### UAT-FIN-08 · Aprobar método de cobro (cuatro ojos) ⏳ 🔴
**Pasos:** abre la solicitud de datos de cobro de un vendedor. Verifica titular y QR y **Aprobar**. Intenta aprobar una solicitud que tú mismo registraste.
**Esperado:** se aprueba y crea nueva versión; **no se puede aprobar una solicitud propia**.

### UAT-FIN-09 · Espera de 24 horas ⏳ 🔴
**Pasos:** inmediatamente tras aprobar un método nuevo, intenta liquidar a ese vendedor.
**Esperado:** bloqueado hasta cumplir las 24 horas; el vendedor recibió aviso del cambio.

### UAT-FIN-10 · Configuración con auditoría ✅ ⏳ 🟠
**Pasos:** cambia `order_valid_hours` de 24 a 12 y vuelve a 24. Intenta cambiar `commission_bps` (y restaura).
**Esperado:** cada cambio queda en la auditoría con valor anterior y nuevo; el Administrador General **no** puede hacerlo; cambiar la comisión **no** altera ventas ya hechas.

### UAT-FIN-11 · QR de cobro vencido ⏳ 🟠
**Pasos:** con un método de cobro vencido o marcado inutilizado, intenta liquidar.
**Esperado:** bloqueado hasta que el vendedor renueve; hubo alertas previas (30, 7 y 1 día).

### UAT-FIN-12 · Exportar ⏳ ⚪
**Pasos:** exporta Saldos por pagar a CSV.
**Esperado:** el archivo abre en Excel con las mismas cifras.

### UAT-FIN-13 · Correcciones sin editar ⏳ 🟠
**Pasos:** intenta editar o borrar una liquidación ya registrada; luego regístrala mal a propósito y corrígela con una reversa.
**Esperado:** no se puede editar ni borrar (inmutable); la corrección es un asiento de reversa visible en el historial.

---

## Resultados
| ID | Crítico | Resultado | Fecha | Ejecutor | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| UAT-FIN-01 | 🔴 | | | | | |
| UAT-FIN-02 | 🔴 | | | | | |
| UAT-FIN-03 | 🔴 | | | | | |
| UAT-FIN-04 | 🟠 | | | | | |
| UAT-FIN-05 | 🔴 | | | | | |
| UAT-FIN-06 | 🔴 | | | | | |
| UAT-FIN-07 | 🔴 | | | | | |
| UAT-FIN-08 | 🔴 | | | | | |
| UAT-FIN-09 | 🔴 | | | | | |
| UAT-FIN-10 | 🟠 | | | | | |
| UAT-FIN-11 | 🟠 | | | | | |
| UAT-FIN-12 | ⚪ | | | | | |
| UAT-FIN-13 | 🟠 | | | | | |

Firma del Administrador de Finanzas: ____________  Fecha: ________
