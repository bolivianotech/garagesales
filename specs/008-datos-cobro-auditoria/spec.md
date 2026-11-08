# Spec 008 — Datos de cobro del vendedor y auditoría inmutable

**Estado:** Approved (2026-11-07)

## Objetivo
Registrar el QR/cuenta con la que se paga a cada vendedor, sin pedirle que lo actualice salvo que quede inutilizado, con control de quién puede modificarlo y un registro que no se pueda alterar.

## Contexto
El QR de cobro del vendedor es un QR de **cualquier banco o entidad financiera de Bolivia**, con vigencia larga (hasta 2 años) y aceptación de varios pagos. No lo genera esta app: el vendedor lo registra.

## Historias
- Como **vendedor** quiero registrar mi QR y datos de cuenta una vez y no repetirlo mientras siga vigente.
- Como **vendedor** quiero solicitar un cambio cuando mi QR quede inutilizado.
- Como **finance_admin** quiero aprobar cambios y pagar sabiendo exactamente a qué QR/cuenta pagué.
- Como **dueño** quiero un historial imposible de alterar de todo cambio sensible.

## Requisitos
- FR-090: El vendedor registra su método de cobro: banco/entidad, titular, número de cuenta, imagen del QR, fecha de vencimiento del QR y observaciones.
- FR-091: `seller_payout_methods` es **append-only**: un cambio crea una versión nueva; nunca hay UPDATE ni DELETE (bloqueado por permisos y triggers). El método vigente es la última versión aprobada y no revocada.
- FR-092: El vendedor propone cambios; solo un `finance_admin` puede aprobarlos. Quien aprueba no puede ser quien lo registró (cuatro ojos).
- FR-093: Un método nuevo o modificado queda en período de enfriamiento (propuesta: 24 h) antes de recibir liquidaciones, y se notifica al vendedor por todos sus canales (protege contra desvío de pagos por cuentas robadas).
- FR-094: Alertas de vencimiento del QR a 30, 7 y 1 día, al vendedor y al admin. El `finance_admin` puede marcar un QR como "inutilizado" con motivo; sin método vigente no se liquida.
- FR-095: `audit_log` append-only con hash encadenado (cada fila incluye el hash de la anterior). Registra: actor, rol, IP, acción, entidad, valor anterior y nuevo, motivo y hora del servidor. Cubre métodos de cobro, aprobaciones y suspensiones, confirmaciones de pago, liquidaciones, cambios de configuración (comisión) y accesos a datos sensibles.
- FR-096: Job diario que recalcula la cadena de hashes y alerta si encuentra una ruptura.
- FR-097: Cada liquidación (`payout`) guarda el id de la **versión exacta** del método de cobro usada.
- FR-098: El `ledger` y `payouts` también son inmutables; las correcciones se hacen con asientos de reversa.
- FR-099: Roles: `admin` aprueba vendedores y ve reportes; `finance_admin` aprueba métodos de cobro y registra liquidaciones. Inicialmente el dueño usa dos cuentas de correo distintas, una por rol; la regla de cuatro ojos se aplica por cuenta y es configurable para cuando haya otra persona.
- FR-099a: 2FA obligatorio para las cuentas `admin` y `finance_admin`; el `audit_log` registra la cuenta que actúa.
- FR-090a: La foto del QR se guarda en almacenamiento privado (solo vendedor, `finance_admin`).
- FR-100: **Limpieza de datos de prueba.** Existe un procedimiento (`supabase/maintenance/`) con vista previa de lo que borra, frase de confirmación obligatoria (sin ella no se borra nada) y opciones explícitas. Borra pedidos, pagos, productos, tiendas y, si se activa, cuentas no administrativas; **conserva** cuentas `admin` y `finance_admin`, configuración y catálogo de bancos; reinicia la numeración; deja una entrada `system.cleanup` en la auditoría. El reinicio de la auditoría solo ocurre con una opción explícita y la deja inmutable de nuevo. Las fotos se borran con un script aparte que usa la API de Storage.
- NFR-012: Números de cuenta cifrados en reposo y enmascarados en pantalla (`****1234`), visibles completos solo al `finance_admin`.

## Criterios de aceptación
- **Dado** un vendedor con QR vigente, **cuando** pasa el tiempo sin vencer, **entonces** no se le pide actualizarlo.
- **Dado** un intento de UPDATE o DELETE sobre un método de cobro, **cuando** se ejecuta con cualquier rol, **entonces** falla y queda registrado.
- **Dado** un cambio propuesto, **cuando** lo aprueba la misma persona que lo registró, **entonces** se rechaza.
- **Dado** un nuevo método aprobado hace menos de 24 h, **cuando** se intenta liquidar, **entonces** se bloquea hasta terminar el enfriamiento.
- **Dado** que se ejecuta la limpieza sin la frase de confirmación, **cuando** corre, **entonces** se cancela y no se borra nada.
- **Dado** que se altera una fila antigua del `audit_log`, **cuando** corre la verificación diaria, **entonces** se detecta la ruptura y se alerta.
- **Dado** un QR a 7 días de vencer, **entonces** vendedor y admin reciben aviso.
