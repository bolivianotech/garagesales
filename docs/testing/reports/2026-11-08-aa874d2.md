# Reporte de pruebas automatizadas

> Generado por `scripts/test_report.py`. No editar a mano: se regenera en cada ejecución.

- **Fecha (UTC):** 2026-11-08 16:15
- **Commit:** `aa874d2` · **Rama:** `claude/dreamy-faraday-ivzqi8`
- **Entorno:** PostgreSQL 16 (esquema de Supabase simulado: `supabase/tests/00_mock_supabase.sql`), Node v22.23.4
- **Resultado global:** ✅ APROBADO

> **Alcance y límites:** estas pruebas validan la base de datos (RLS, reglas de negocio, auditoría) en un Postgres local y la lógica de la interfaz. **No** prueban el proyecto Supabase real, la red, ni el flujo con un navegador y fotos de celular: eso se cubre con las pruebas manuales de `docs/testing/test-plan.md`.

## Resumen

| Verificación | Resultado | Detalle |
|---|---|---|
| Base de datos · `001_rls.sql` | ✅ | 24 casos OK |
| Base de datos · `002_products.sql` | ✅ | 31 casos OK |
| Interfaz · Vitest | ✅ | 17/17 casos OK |
| Tipos · `tsc --noEmit` | ✅ | |
| Compilación · `vite build` | ✅ | |
| **Total de casos** | **72 OK / 0 fallan** | 0 sin identificador |

## Cobertura por requisito (specs aprobadas)

| Requisito | Spec | Casos automatizados | Estado |
|---|---|---|---|
| FR-001 | 001 | — | 🖐 prueba manual MT-01 (pendiente de ejecución) |
| FR-002 | 001 | TC-001-01, TC-001-03, TC-UI-14, TC-UI-15, TC-UI-16, TC-UI-17 | ✅ cubierto |
| FR-003 | 001 | TC-001-05, TC-001-06, TC-001-07, TC-002-07, TC-002-29 | ✅ cubierto |
| FR-004 | 001 | TC-001-02, TC-001-09, TC-001-10, TC-001-11, TC-002-02, TC-002-08, TC-002-16, TC-002-18, TC-002-28, TC-002-30, TC-UI-14, TC-UI-15, TC-UI-16, TC-UI-17 | ✅ cubierto |
| FR-005 | 001 | TC-001-08, TC-001-15, TC-002-22, TC-002-23, TC-002-24, TC-UI-14, TC-UI-15, TC-UI-16, TC-UI-17 | ✅ cubierto |
| FR-006 | 001 | TC-001-04 | ✅ cubierto |
| NFR-001 | 001 | TC-001-12, TC-001-13 | ✅ cubierto |
| FR-015 | 002 | — | 🖐 prueba manual MT-05 (pendiente de ejecución) |
| FR-016 | 002 | — | ⏳ diferido a Fase 4 (pago confirmado) |
| FR-010 | 002 | TC-002-01, TC-002-04, TC-002-05, TC-002-06, TC-002-09, TC-002-10, TC-002-11, TC-002-12, TC-002-15, TC-UI-01, TC-UI-02, TC-UI-03, TC-UI-04, TC-UI-09, TC-UI-10, TC-UI-11, TC-UI-12, TC-UI-13 | ✅ cubierto |
| FR-011 | 002 | TC-002-27, TC-002-31, TC-UI-05, TC-UI-06, TC-UI-07, TC-UI-08 | ✅ cubierto |
| FR-012 | 002 | TC-002-03, TC-002-13, TC-002-14, TC-002-21 | ✅ cubierto |
| FR-013 | 002 | — | ⏳ diferido a Fase 3 (pedidos) |
| FR-014 | 002 | — | ⏳ diferido a Fase 3 (ventas en el panel) |
| NFR-002 | 002 | — | 🖐 prueba manual MT-08 (pendiente de ejecución) |
| NFR-003 | 002 | — | ⏳ diferido a Fase 5 (modo sin red) |
| FR-020 | 003 | — | ⏳ fase aún no implementada |
| FR-021 | 003 | — | ⏳ fase aún no implementada |
| FR-022 | 003 | — | ⏳ fase aún no implementada |
| FR-023 | 003 | — | ⏳ fase aún no implementada |
| FR-024 | 003 | — | ⏳ fase aún no implementada |
| FR-025 | 003 | — | ⏳ fase aún no implementada |
| FR-026 | 003 | — | ⏳ fase aún no implementada |
| NFR-004 | 003 | — | ⏳ fase aún no implementada |
| FR-070 | 007 | — | ⏳ fase aún no implementada |
| FR-071 | 007 | — | ⏳ fase aún no implementada |
| FR-072 | 007 | — | ⏳ fase aún no implementada |
| FR-073 | 007 | — | ⏳ fase aún no implementada |
| FR-074 | 007 | — | ⏳ fase aún no implementada |
| FR-075 | 007 | — | ⏳ fase aún no implementada |
| FR-076 | 007 | — | ⏳ fase aún no implementada |
| FR-077 | 007 | — | ⏳ fase aún no implementada |
| FR-078 | 007 | — | ⏳ fase aún no implementada |
| FR-079 | 007 | — | ⏳ fase aún no implementada |
| FR-080 | 007 | — | ⏳ fase aún no implementada |
| FR-081 | 007 | — | ⏳ fase aún no implementada |
| FR-082 | 007 | — | ⏳ fase aún no implementada |
| NFR-011 | 007 | — | ⏳ fase aún no implementada |
| FR-090 | 008 | — | ⏳ fase aún no implementada |
| FR-091 | 008 | — | ⏳ fase aún no implementada |
| FR-092 | 008 | — | ⏳ fase aún no implementada |
| FR-093 | 008 | — | ⏳ fase aún no implementada |
| FR-094 | 008 | — | ⏳ fase aún no implementada |
| FR-095 | 008 | TC-001-20, TC-001-21, TC-001-22 | ✅ cubierto |
| FR-096 | 008 | TC-001-23, TC-001-24 | ✅ cubierto |
| FR-097 | 008 | — | ⏳ fase aún no implementada |
| FR-098 | 008 | — | ⏳ fase aún no implementada |
| FR-099 | 008 | TC-001-16, TC-001-17, TC-001-18 | ✅ cubierto |
| FR-099a | 008 | TC-001-19 | ✅ cubierto |
| FR-090a | 008 | — | ⏳ fase aún no implementada |
| NFR-012 | 008 | — | ⏳ fase aún no implementada |

**En alcance de lo implementado:** 16 requisitos · **con prueba automatizada:** 13 (81 %) · **solo prueba manual pendiente:** 3 · **sin prueba:** 0.
**Fuera de alcance por ahora:** 35 requisitos de fases futuras. Las specs en borrador (004, 005, 006) no se miden todavía.

## Detalle de casos ejecutados

| ID | Requisitos | Descripción | Suite | Resultado |
|---|---|---|---|---|
| TC-001-01 | FR-002 | FR-002 perfiles creados por trigger | `001_rls.sql` | ✅ PASS |
| TC-001-02 | FR-004 | FR-004 no se autoasciende a admin | `001_rls.sql` | ✅ PASS |
| TC-001-03 | FR-002 | FR-002 edita su nombre y teléfono | `001_rls.sql` | ✅ PASS |
| TC-001-04 | FR-006 | FR-006 comprador solo ve su perfil | `001_rls.sql` | ✅ PASS |
| TC-001-05 | FR-003 | FR-003 no puede crear tienda ya aprobada / segunda tienda | `001_rls.sql` | ✅ PASS |
| TC-001-06 | FR-003 | FR-003 no se autoaprueba | `001_rls.sql` | ✅ PASS |
| TC-001-07 | FR-003 | FR-003 un vendedor no puede ejecutar la revisión | `001_rls.sql` | ✅ PASS |
| TC-001-08 | FR-005 | FR-005 al aprobar, el usuario pasa a seller | `001_rls.sql` | ✅ PASS |
| TC-001-09 | FR-004 | FR-004 vendedor A ve su tienda | `001_rls.sql` | ✅ PASS |
| TC-001-10 | FR-004 | FR-004 vendedor A no modifica la tienda de B | `001_rls.sql` | ✅ PASS |
| TC-001-11 | FR-004 | FR-004 vendedor A no ve perfiles ajenos | `001_rls.sql` | ✅ PASS |
| TC-001-12 | NFR-001 | NFR-001 vendedor no ve auditoría | `001_rls.sql` | ✅ PASS |
| TC-001-13 | NFR-001 | NFR-001 vendedor no ve configuración | `001_rls.sql` | ✅ PASS |
| TC-001-14 | — | visitante ve tiendas aprobadas | `001_rls.sql` | ✅ PASS |
| TC-001-15 | FR-005 | FR-005 suspendido no puede crear tienda | `001_rls.sql` | ✅ PASS |
| TC-001-16 | FR-099 | FR-099 admin no cambia la comisión | `001_rls.sql` | ✅ PASS |
| TC-001-17 | FR-099 | FR-099 finance_admin sí cambia configuración | `001_rls.sql` | ✅ PASS |
| TC-001-18 | FR-099 | FR-099 finance_admin no revisa vendedores | `001_rls.sql` | ✅ PASS |
| TC-001-19 | FR-099a | FR-099a sin 2FA no se ejecutan acciones de admin | `001_rls.sql` | ✅ PASS |
| TC-001-20 | FR-095 | FR-095 audit_log no admite UPDATE | `001_rls.sql` | ✅ PASS |
| TC-001-21 | FR-095 | FR-095 audit_log no admite DELETE | `001_rls.sql` | ✅ PASS |
| TC-001-22 | FR-095 | FR-095 audit_log no admite TRUNCATE | `001_rls.sql` | ✅ PASS |
| TC-001-23 | FR-096 | FR-096 cadena de auditoría íntegra | `001_rls.sql` | ✅ PASS |
| TC-001-24 | FR-096 | FR-096 manipulación detectada | `001_rls.sql` | ✅ PASS |
| TC-002-01 | FR-010 | FR-010 producto nuevo en borrador con SKU automático | `002_products.sql` | ✅ PASS |
| TC-002-02 | FR-004 | FR-004 no crea productos en la tienda de otro vendedor | `002_products.sql` | ✅ PASS |
| TC-002-03 | FR-012 | FR-012 un producto nuevo no puede nacer publicado | `002_products.sql` | ✅ PASS |
| TC-002-04 | FR-010 | FR-010 precio negativo rechazado | `002_products.sql` | ✅ PASS |
| TC-002-05 | FR-010 | FR-010 cantidad negativa rechazada | `002_products.sql` | ✅ PASS |
| TC-002-06 | FR-010 | FR-010 no se publica sin fotos | `002_products.sql` | ✅ PASS |
| TC-002-07 | FR-003 | FR-003 tienda pendiente no puede crear productos | `002_products.sql` | ✅ PASS |
| TC-002-08 | FR-004 | FR-004 la foto debe ir en la carpeta de la propia tienda | `002_products.sql` | ✅ PASS |
| TC-002-09 | FR-010 | FR-010 agrega la primera foto | `002_products.sql` | ✅ PASS |
| TC-002-10 | FR-010 | FR-010 no se publica con precio 0 | `002_products.sql` | ✅ PASS |
| TC-002-11 | FR-010 | FR-010 publica con foto y precio | `002_products.sql` | ✅ PASS |
| TC-002-12 | FR-010 | FR-010 no se borra la única foto de un producto publicado | `002_products.sql` | ✅ PASS |
| TC-002-13 | FR-012 | FR-012 stock 0 pasa a agotado | `002_products.sql` | ✅ PASS |
| TC-002-14 | FR-012 | FR-012 stock > 0 reactiva | `002_products.sql` | ✅ PASS |
| TC-002-15 | FR-010 | FR-010 máximo 5 fotos | `002_products.sql` | ✅ PASS |
| TC-002-16 | FR-004 | FR-004 otro vendedor no modifica el producto | `002_products.sql` | ✅ PASS |
| TC-002-17 | — | visible: el producto activo es público | `002_products.sql` | ✅ PASS |
| TC-002-18 | FR-004 | FR-004 el vendedor C no ve el borrador de D | `002_products.sql` | ✅ PASS |
| TC-002-19 | — | visitante ve solo productos activos | `002_products.sql` | ✅ PASS |
| TC-002-20 | — | visitante ve las fotos de productos públicos | `002_products.sql` | ✅ PASS |
| TC-002-21 | FR-012 | FR-012 pausado no es público | `002_products.sql` | ✅ PASS |
| TC-002-22 | FR-005 | FR-005 el vendedor no se auto-modera | `002_products.sql` | ✅ PASS |
| TC-002-23 | FR-005 | FR-005 producto oculto por el admin no es público | `002_products.sql` | ✅ PASS |
| TC-002-24 | FR-005 | FR-005 reaparece al quitar la moderación | `002_products.sql` | ✅ PASS |
| TC-002-25 | — | solo se borran borradores (los publicados se pausan) | `002_products.sql` | ✅ PASS |
| TC-002-26 | — | se puede borrar un borrador | `002_products.sql` | ✅ PASS |
| TC-002-27 | FR-011 | FR-011 sube a la carpeta de su tienda | `002_products.sql` | ✅ PASS |
| TC-002-28 | FR-004 | FR-004 no sube a la carpeta de otra tienda | `002_products.sql` | ✅ PASS |
| TC-002-29 | FR-003 | FR-003 tienda pendiente no sube fotos | `002_products.sql` | ✅ PASS |
| TC-002-30 | FR-004 | FR-004 no borra fotos de otro vendedor | `002_products.sql` | ✅ PASS |
| TC-002-31 | FR-011 | FR-011 bucket público con límite de 1 MB | `002_products.sql` | ✅ PASS |
| TC-UI-01 | FR-010 | convierte texto a centavos | `catalog.test.ts` | ✅ PASS |
| TC-UI-02 | FR-010 | rechaza valores inválidos | `catalog.test.ts` | ✅ PASS |
| TC-UI-03 | FR-010 | formatea en bolivianos | `catalog.test.ts` | ✅ PASS |
| TC-UI-04 | FR-010 | muestra el valor en el campo | `catalog.test.ts` | ✅ PASS |
| TC-UI-05 | FR-011 | reduce a máximo 1600 px conservando proporción | `catalog.test.ts` | ✅ PASS |
| TC-UI-06 | FR-011 | no agranda fotos pequeñas | `catalog.test.ts` | ✅ PASS |
| TC-UI-07 | FR-011 | acepta JPG/PNG/WebP de hasta 5 MB | `catalog.test.ts` | ✅ PASS |
| TC-UI-08 | FR-011 | rechaza otros formatos y fotos de más de 5 MB | `catalog.test.ts` | ✅ PASS |
| TC-UI-09 | FR-010 | un producto completo no tiene errores | `catalog.test.ts` | ✅ PASS |
| TC-UI-10 | FR-010 | precio 0 o inválido impide publicar | `catalog.test.ts` | ✅ PASS |
| TC-UI-11 | FR-010 | cantidad negativa o decimal es inválida | `catalog.test.ts` | ✅ PASS |
| TC-UI-12 | FR-010 | publicar exige foto, guardar borrador no | `catalog.test.ts` | ✅ PASS |
| TC-UI-13 | FR-010 | máximo 5 fotos y título mínimo | `catalog.test.ts` | ✅ PASS |
| TC-UI-14 | FR-002, FR-004, FR-005 | FR-004: un comprador no accede a vender ni a administrar | `roles.test.ts` | ✅ PASS |
| TC-UI-15 | FR-002, FR-004, FR-005 | FR-004: solo seller vende, solo admin administra, solo finance_admin finanzas | `roles.test.ts` | ✅ PASS |
| TC-UI-16 | FR-002, FR-004, FR-005 | FR-005: un usuario suspendido no accede a nada | `roles.test.ts` | ✅ PASS |
| TC-UI-17 | FR-002, FR-004, FR-005 | FR-002: comprar exige nombre y teléfono | `roles.test.ts` | ✅ PASS |
