# Estado del proyecto (verdad única)

> Actualizado: 2026-11-08. Este documento separa lo **hecho y verificado** de lo **pendiente**. Todo el resto de la documentación (manuales, UAT, runbooks) describe el sistema **terminado**; aquí se ve cuánto falta para llegar a él.

## 1. Resumen en una tabla

| Fase | Qué es | Estado | Evidencia |
|---|---|---|---|
| 0 | Inception: constitución, specs, arquitectura, ADR | ✅ Hecha | `specs/`, `docs/adr/` |
| 1 | Cuentas, roles, RBAC, auditoría inmutable | ✅ Hecha y probada | `TC-001-xx` (24), `MT-01`, `MT-02` OK |
| 2 | Catálogo del vendedor y catálogo público | ✅ Hecha y probada | `TC-002-xx` (31), `MT-04..08`, `MT-10` OK; `MT-03` parcial |
| 3 | Pedidos, confirmación de pago, comprobante, retiros (**base de datos**) | ✅ Hecha y probada en local | `TC-003-xx` (60), `TC-004-xx` (5, concurrencia real) |
| 3 | Pedidos (**pantallas**: carrito, pago, mis pedidos, comprobante, "Por entregar") | ⏳ Pendiente | — |
| 4 | Cobro con QR dinámico (Edge Functions + pantalla de pago) | 🟡 Edge Functions y SQL de apoyo escritos y probados con banco simulado (`TC-BN`, `TC-PAY`, `TC-HTTP`, `TC-006`); **sin probar contra el banco ni Supabase reales**; falta la pantalla de pago | `docs/integraciones/conector-del-programador.md` |
| 4b | Libro mayor, comisión 1 %, liquidaciones, datos de cobro del vendedor | ⏳ Pendiente (specs 006 y 008) | — |
| 5 | PWA instalable y modo sin red | ⏳ Pendiente (spec 005) | — |
| 6 | UAT, E2E, limpieza y lanzamiento | 📄 Guías y scripts listos; limpieza y E2E de humo **probados**; UAT, E2E completo y lanzamiento pendientes | `docs/uat/`, `e2e/`, `supabase/maintenance/` (`TC-005-xx`, `TC-SCR-xx`, `E2E-01..05`) |

Pruebas automáticas hoy: **163 casos, 0 fallan** (`docs/testing/reports/latest.md`): 133 de base de datos y concurrencia, 17 de interfaz, 6 de scripts, 5 E2E de humo y 2 de seguridad. Pruebas manuales: 8 OK (MT-01, 02, 04, 05, 06, 07, 08, 10), 1 parcial (MT-03), 1 bloqueada (MT-09). UAT (55 casos) y E2E `@live`/`@full`: escritos, **sin ejecutar**.

## 2. Lo que falta, con tiempos estimados

Los tiempos son **horas de trabajo efectivo** (no calendario) con el equipo ya familiarizado. Se estimaron al revisar el trabajo real hecho hasta ahora: Fases 0 a 3 (base de datos) tomaron unas **18 horas de trabajo asistido** repartidas en dos días calendario (6 al 8 de noviembre de 2026), incluyendo esperas por decisiones.

| # | Entregable | Horas | Depende de |
|---|---|---|---|
| E1 | Adaptador del banco y Edge Functions (`create-qr`, `check-payment`, `notify-payment`, `expire-orders`, `reconcile-daily`) con pruebas | 6–10 | Credenciales y certificación del banco |
| E2 | Pantallas del comprador: carrito, pago con QR y estado en vivo, mis pedidos, comprobante, subir foto del comprobante | 8–12 | E1 para el pago real |
| E3 | Pantallas del vendedor: "Por entregar", entrega con código, ventas | 3–4 | Migración 003 aplicada |
| E4 | Pantallas del admin: reporte "Quién pagó", pagos en revisión y reembolsos, ocultar productos | 4–6 | — |
| E5 | Specs 006 y 008: libro mayor, comisión 1 %, liquidaciones, datos de cobro del vendedor (versionados) y pantallas de finanzas | 10–14 | Aprobar spec 006 |
| E6 | Spec 005: PWA instalable, caché del catálogo, cola sin red | 6–8 | — |
| E7 | Ejecutar E2E y UAT completos, corregir hallazgos | 6–10 | E1–E5 |
| E8 | Limpieza de datos de prueba y lanzamiento público | 2–3 | E7 |
| | **Total restante** | **≈ 45–67 h** | |

**Lectura honesta:** con dedicación completa son entre 1 y 1,5 semanas, no un fin de semana. El "fin de semana" de `docs/handbook/03-plan-de-fin-de-semana.md` se refiere a **replicar** el sistema partiendo de este repositorio como plantilla, no a construirlo desde cero.

## 3. Bloqueos del banco (QR Conecta / API Market)

| Bloqueo | Evidencia | Qué hacer | Responsable |
|---|---|---|---|
| El usuario API no está habilitado en certificación | Prueba con Hoppscotch al endpoint `authenticate` devolvió `404 "Usuario no habilitado para uso de apis"` | Pedir al banco habilitar el usuario en `apimktdesa` (punto 3 de `docs/integraciones/consulta-al-banco.md`). Preguntar al estudiante que ya integró QR Conecta en qué ambiente y con qué usuario lo hizo | Dueño |
| Qué lleva el campo `password` | El banco no entregó contraseña; el ejemplo de Hoppscotch envía un valor cifrado | Pedir al estudiante o al banco cómo se obtiene el texto que se cifra | Dueño |
| ~~Modo AES, IV y relleno~~ | **Resuelto** con el ejemplo público del manual (AES-256-CBC, IV antepuesto, llave UTF-8 de 32 caracteres) | Confirmar con tu usuario en certificación con `npm run probar-aes` del proyecto de ejemplo | Programador |
| URL de producción y proceso de paso a producción | No documentado | Consulta al banco | Dueño |

> **Seguridad:** el 2026-11-08 se subieron al repositorio público dos capturas con la llave AES y un valor de password cifrado (commit `6ca9b28`, solo en la rama de trabajo anterior; **`main` está limpia**, verificado en sus 29 commits). Se creó una **rama limpia** (`claude/garagesales-limpia-ivzqi8`) sin ese commit. Obligatorio: regenerar la llave AES y cambiar la contraseña en el portal del banco, pasar el repositorio a privado y borrar la rama anterior. Ver `docs/handbook/09-seguridad-y-secretos.md`.

> **Proyecto de ejemplo para el programador:** `examples/qr-baneco-demo/` (independiente, sin dependencias, 38 pruebas) demuestra la integración con el banco; su guía está en `GUIA.md`.

## 4. Decisiones del dueño del producto (cronológico)

| Fecha | Decisión | Dónde quedó |
|---|---|---|
| 2026-11-07 | PWA única (web + móvil), Supabase, marketplace multivendedor | ADR-0001 |
| 2026-11-07 | Retiro en persona; admin aprueba vendedores; RBAC estricto; sin facturación | Specs 001, 003, 007 |
| 2026-11-07 | QR del dueño; comisión 1 %, redondeo a favor de la plataforma; pago manual a vendedores | Spec 006 |
| 2026-11-07 | QR dinámico por pedido (uso único); QR del vendedor de cualquier banco, versionado e inmutable | Specs 004 y 008, ADR-0002/0003 |
| 2026-11-07 | Admin y finance_admin con dos correos distintos del dueño; 2FA | Spec 001 y 008 |
| 2026-11-08 | **Solo cobro automático** (sin confirmación manual de pagos) | Esta página |
| 2026-11-08 | **Sin reserva de stock: gana quien paga primero** | ADR-0004, spec 003 |
| 2026-11-08 | Comprobante digital con nombre y banco del pagador y datos del vendedor; el comprador puede subir foto de su comprobante | Spec 007 (FR-083, FR-085) |

## 5. Criterio de "terminado" del proyecto completo

El sistema se considera terminado cuando **todas** estas condiciones se cumplen y quedan registradas:

1. Las specs 001 a 008 están en `Approved` y cada requisito tiene al menos una prueba (automática o UAT ejecutada).
2. `python3 -I scripts/test_report.py` termina sin fallas y su reporte está commiteado.
3. El E2E completo (`docs/testing/e2e-plan.md`) pasó en el ambiente de certificación **y** una vez en producción con Bs 0,01.
4. Los UAT de los cuatro roles están ejecutados, firmados y sin defectos críticos abiertos.
5. Se ejecutó el procedimiento de limpieza de datos de prueba y el sitio quedó listo para el público.
6. Las credenciales del banco fueron rotadas después del incidente de seguridad y están solo en secretos del servidor.
