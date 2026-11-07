# Spec 006 — Liquidación a vendedores y comisión del 1 %

**Estado:** Draft · **Depende de:** spec 004 · Redondeo y pago manual decididos

## Objetivo
Que el dueño de la plataforma vea, automáticamente y por vendedor, **cuánto debe pagar** descontando la comisión de 1 % por transacción.

## Reglas de negocio
- La plataforma cobra todos los pagos (QR propio) y luego paga a cada vendedor.
- Comisión: **1 % del precio de cada ítem vendido**, parametrizable (`commission_bps = 100`).
- **Redondeo a favor de la plataforma:** `fee_cents = ceil(gross_cents × commission_bps / 10000)` por ítem (la comisión siempre sube al centavo siguiente si hay fracción) y `net_cents = gross_cents − fee_cents` (el vendedor recibe el redondeo hacia abajo). Todo en centavos enteros, sin flotantes.
- Pago manual: el admin transfiere al QR/cuenta que el vendedor registró.
- El vendedor registra su banco, cuenta y su QR de cobro; el QR debe tener vigencia amplia (2 años) para no tener que renovarlo (interpretación a confirmar, Q17).
- Solo cuentan ítems de pedidos `paid` y todavía no liquidados.

## Historias
- Como **dueño** quiero ver por vendedor: ventas brutas, comisión, neto a pagar y detalle de transacciones.
- Como **dueño** quiero marcar una liquidación como pagada (con fecha y referencia de la transferencia).
- Como **vendedor** quiero ver mis ventas, mi comisión y mi saldo pendiente (solo los míos).

## Requisitos
- FR-060: Cada pago confirmado crea líneas en `ledger` por ítem y tienda: `gross_cents`, `fee_cents`, `net_cents`, `status = pending`.
- FR-061: Reporte "Saldos por pagar": total neto pendiente por vendedor, con desglose y exportación CSV.
- FR-062: El admin crea una liquidación (`payout`) que agrupa líneas pendientes de un vendedor; las líneas pasan a `settled`. Una línea no puede liquidarse dos veces.
- FR-063: Validación automática de cuadre: Σ `gross` de pedidos pagados = Σ `fee` + Σ `net`; y Σ bruto conciliado = movimientos bancarios acreditados. Diferencias se alertan al admin.
- FR-064: El vendedor ve su propio estado de cuenta; RLS impide ver el de otros.
- FR-065: Cada vendedor registra sus datos de cobro (banco, cuenta, titular); el admin los usa para pagar.
- NFR-010: Montos exactos (sin flotantes); pruebas de propiedad para redondeo.

## Criterios de aceptación
- **Dado** un vendedor con ventas pagadas por 1.000,00 BS, **cuando** el admin abre "Saldos por pagar", **entonces** ve bruto 1.000,00, comisión 10,00 y neto 990,00.
- **Dado** un ítem de 1,50 BS (150 centavos), **cuando** se calcula, **entonces** la comisión es 2 centavos (redondeo hacia arriba) y el neto 148 centavos.
- **Dado** una liquidación creada, **cuando** se intenta liquidar otra vez las mismas líneas, **entonces** se rechaza.
- **Dado** un desfase entre ledger y banco, **cuando** corre la validación, **entonces** se muestra una alerta con el monto de la diferencia.
