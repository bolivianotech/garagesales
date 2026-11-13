# Reporte de pruebas automatizadas

> Generado por `scripts/test_report.py`. No editar a mano: se regenera en cada ejecución.

- **Fecha (UTC):** 2026-11-09 00:59
- **Commit:** `7f5b197` · **Rama:** `claude/garagesales-limpia-ivzqi8`
- **Entorno:** PostgreSQL 16 (esquema de Supabase simulado: `supabase/tests/00_mock_supabase.sql`), Node v22.23.4
- **Resultado global:** ✅ APROBADO

> **Alcance y límites:** estas pruebas validan la base de datos (RLS, reglas de negocio, auditoría) en un Postgres local y la lógica de la interfaz. **No** prueban el proyecto Supabase real, la red, ni el flujo con un navegador y fotos de celular: eso se cubre con las pruebas manuales de `docs/testing/test-plan.md`.

## Resumen

| Verificación | Resultado | Detalle |
|---|---|---|
| Base de datos · `001_rls.sql` | ✅ | 24 casos OK |
| Base de datos · `002_products.sql` | ✅ | 31 casos OK |
| Base de datos · `003_orders.sql` | ✅ | 60 casos OK |
| Base de datos · `004_concurrency` | ✅ | 5 casos OK |
| Base de datos · `005_cleanup` | ✅ | 13 casos OK |
| Interfaz · Vitest | ✅ | 17/17 casos OK |
| Scripts · `cleanup-storage` (node --test) | ✅ | 6/6 casos OK |
| E2E · humo (Playwright) | ✅ | 5/5 casos OK; `@live` y `@full` no se ejecutan aquí (ver `docs/testing/e2e-plan.md`) |
| Demo QR del banco · `examples/qr-baneco-demo` (banco simulado) | ✅ | 49/49 casos OK; **no prueba el banco real** |
| Seguridad · escáner de secretos | ✅ | 2/2 casos OK |
| Tipos · `tsc --noEmit` | ✅ | |
| Compilación · `vite build` | ✅ | |
| **Total de casos** | **212 OK / 0 fallan** | 0 sin identificador |

## Cobertura por requisito (specs aprobadas)

| Requisito | Spec | Casos automatizados | Estado |
|---|---|---|---|
| FR-001 | 001 | — | 🖐 prueba manual MT-01: ✅ OK |
| FR-002 | 001 | TC-001-01, TC-001-03, TC-003-02, TC-UI-14, TC-UI-15, TC-UI-16, TC-UI-17 | ✅ cubierto |
| FR-003 | 001 | TC-001-05, TC-001-06, TC-001-07, TC-002-07, TC-002-29 | ✅ cubierto |
| FR-004 | 001 | TC-001-02, TC-001-09, TC-001-10, TC-001-11, TC-002-02, TC-002-08, TC-002-16, TC-002-18, TC-002-28, TC-002-30, TC-UI-14, TC-UI-15, TC-UI-16, TC-UI-17 | ✅ cubierto |
| FR-005 | 001 | TC-001-08, TC-001-15, TC-002-22, TC-002-23, TC-002-24, TC-UI-14, TC-UI-15, TC-UI-16, TC-UI-17 | ✅ cubierto |
| FR-006 | 001 | TC-001-04 | ✅ cubierto |
| NFR-001 | 001 | TC-001-12, TC-001-13, TC-003-17, TC-003-18 | ✅ cubierto |
| FR-015 | 002 | — | 🖐 prueba manual MT-05: ✅ OK |
| FR-016 | 002 | — | ⏳ diferido a Fase 4 (pago confirmado) |
| FR-010 | 002 | TC-002-01, TC-002-04, TC-002-05, TC-002-06, TC-002-09, TC-002-10, TC-002-11, TC-002-12, TC-002-15, TC-UI-01, TC-UI-02, TC-UI-03, TC-UI-04, TC-UI-09, TC-UI-10, TC-UI-11, TC-UI-12, TC-UI-13 | ✅ cubierto |
| FR-011 | 002 | TC-002-27, TC-002-31, TC-UI-05, TC-UI-06, TC-UI-07, TC-UI-08 | ✅ cubierto |
| FR-012 | 002 | TC-002-03, TC-002-13, TC-002-14, TC-002-21 | ✅ cubierto |
| FR-013 | 002 | TC-003-13 | ✅ cubierto |
| FR-014 | 002 | — | ⏳ diferido a Fase 3 (ventas en el panel) |
| NFR-002 | 002 | — | 🖐 prueba manual MT-08: ✅ OK |
| NFR-003 | 002 | — | ⏳ diferido a Fase 5 (modo sin red) |
| FR-020 | 003 | — | ⏳ diferido a Fase 3, interfaz (catálogo con filtros y stock en vivo) |
| FR-021 | 003 | — | ⏳ diferido a Fase 3, interfaz (carrito) |
| FR-022 | 003 | TC-003-01, TC-003-03, TC-003-04, TC-003-05, TC-003-06, TC-003-07, TC-003-08, TC-003-09, TC-003-10, TC-003-12, TC-003-16 | ✅ cubierto |
| FR-023 | 003 | TC-003-39, TC-003-40 | ✅ cubierto |
| FR-024 | 003 | TC-003-11 | ✅ cubierto |
| FR-025 | 003 | TC-003-14, TC-003-15, TC-003-19 | ✅ cubierto |
| FR-026 | 003 | — | ⏳ diferido a Fase 3, interfaz (pantalla de pago con datos de retiro) |
| FR-023a | 003 | TC-003-32, TC-003-33 | ✅ cubierto |
| NFR-004 | 003 | TC-003-31, TC-003-32, TC-003-33, TC-003-34, TC-004-01, TC-004-02, TC-004-03, TC-004-04, TC-004-05 | ✅ cubierto |
| FR-070 | 007 | TC-003-27 | ✅ cubierto |
| FR-071 | 007 | TC-003-49 | ✅ cubierto |
| FR-072 | 007 | TC-003-48, TC-003-50, TC-003-52, TC-003-53, TC-003-54 | ✅ cubierto |
| FR-073 | 007 | — | ⏳ fase aún no implementada |
| FR-074 | 007 | TC-003-51, TC-003-55, TC-003-56 | ✅ cubierto |
| FR-075 | 007 | — | ⏳ fase aún no implementada |
| FR-076 | 007 | — | ⏳ fase aún no implementada |
| FR-077 | 007 | — | ⏳ fase aún no implementada |
| FR-078 | 007 | — | ⏳ fase aún no implementada |
| FR-083 | 007 | TC-003-43, TC-003-44, TC-003-45, TC-003-46, TC-003-47 | ✅ cubierto |
| FR-084 | 007 | TC-003-58, TC-003-59, TC-003-60 | ✅ cubierto |
| FR-085 | 007 | — | ⏳ fase aún no implementada |
| FR-079 | 007 | TC-003-57 | ✅ cubierto |
| FR-080 | 007 | — | ⏳ fase aún no implementada |
| FR-081 | 007 | — | ⏳ fase aún no implementada |
| FR-082 | 007 | — | ⏳ fase aún no implementada |
| NFR-011 | 007 | — | ⏳ fase aún no implementada |
| FR-090 | 008 | — | ⏳ fase aún no implementada |
| FR-091 | 008 | — | ⏳ fase aún no implementada |
| FR-092 | 008 | — | ⏳ fase aún no implementada |
| FR-093 | 008 | — | ⏳ fase aún no implementada |
| FR-094 | 008 | — | ⏳ fase aún no implementada |
| FR-095 | 008 | TC-001-20, TC-001-21, TC-001-22, TC-005-13, TC-SEC-01 | ✅ cubierto |
| FR-096 | 008 | TC-001-23, TC-001-24, TC-005-10, TC-005-12 | ✅ cubierto |
| FR-097 | 008 | — | ⏳ fase aún no implementada |
| FR-098 | 008 | — | ⏳ fase aún no implementada |
| FR-099 | 008 | TC-001-16, TC-001-17, TC-001-18 | ✅ cubierto |
| FR-099a | 008 | TC-001-19 | ✅ cubierto |
| FR-090a | 008 | — | ⏳ fase aún no implementada |
| FR-100 | 008 | TC-005-01, TC-005-02, TC-005-03, TC-005-04, TC-005-05, TC-005-06, TC-005-07, TC-005-09 | ✅ cubierto |
| NFR-012 | 008 | — | ⏳ fase aún no implementada |

**En alcance de lo implementado:** 31 requisitos · **con prueba automatizada:** 28 (90 %) · **solo prueba manual pendiente:** 3 · **sin prueba:** 0.
**Fuera de alcance por ahora:** 25 requisitos de fases futuras. Las specs en borrador (004, 005, 006) no se miden todavía.

## Pruebas manuales (registro en `manual-results.md`)

| ID | Prueba | Resultado |
|---|---|---|
| MT-10 | El sitio carga y las rutas internas funcionan al recargar | ✅ OK |
| MT-01 | Registro, confirmación de correo, ingreso y datos de perfil | ✅ OK |
| MT-02 | Solicitud de vendedor y aprobación del admin | ✅ OK |
| MT-04 | Subir producto con foto de ~4 MB y verlo en el catálogo | ✅ OK |
| MT-06 | Cantidad 0 lo marca agotado; al reponer vuelve | ✅ OK |
| MT-07 | Pausar y publicar | ✅ OK |
| MT-05 | Carga rápida de 10 fotos | ✅ OK |
| MT-03 | Aislamiento: un vendedor no ve ni abre lo del otro | 🟡 Parcial |
| MT-08 | Subida en menos de 10 s con 4G | ✅ OK |
| MT-09 | Admin oculta un producto y queda auditado | ⛔ Bloqueada |

**Ejecutadas:** 8/10 · **Parciales:** 1 · **OK:** 8 · **Falla:** 0 · **Bloqueadas:** 1.

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
| TC-003-01 | FR-022 | FR-022 sin sesión no se crea pedido | `003_orders.sql` | ✅ PASS |
| TC-003-02 | FR-002 | FR-002 comprador sin teléfono no puede comprar | `003_orders.sql` | ✅ PASS |
| TC-003-03 | FR-022 | FR-022 carrito vacío rechazado | `003_orders.sql` | ✅ PASS |
| TC-003-04 | FR-022 | FR-022 cantidad mayor al stock rechazada | `003_orders.sql` | ✅ PASS |
| TC-003-05 | FR-022 | FR-022 producto pausado rechazado | `003_orders.sql` | ✅ PASS |
| TC-003-06 | FR-022 | FR-022 producto inexistente rechazado | `003_orders.sql` | ✅ PASS |
| TC-003-07 | FR-022 | FR-022 cantidad 0 rechazada | `003_orders.sql` | ✅ PASS |
| TC-003-08 | FR-022 | FR-022 no puede comprar sus propios productos | `003_orders.sql` | ✅ PASS |
| TC-003-09 | FR-022 | FR-022 el total se calcula en el servidor con los precios de la base | `003_orders.sql` | ✅ PASS |
| TC-003-10 | FR-022 | FR-022 líneas repetidas se suman en una sola | `003_orders.sql` | ✅ PASS |
| TC-003-11 | FR-024 | FR-024 cada ítem guarda su tienda (pedido con dos vendedores) | `003_orders.sql` | ✅ PASS |
| TC-003-12 | FR-022 | FR-022 crear el pedido NO descuenta stock | `003_orders.sql` | ✅ PASS |
| TC-003-13 | FR-013 | FR-013 el pedido conserva el precio con que se creó | `003_orders.sql` | ✅ PASS |
| TC-003-14 | FR-025 | FR-025 otro comprador no ve pedidos ajenos | `003_orders.sql` | ✅ PASS |
| TC-003-15 | FR-025 | FR-025 otro comprador no ve ítems ajenos | `003_orders.sql` | ✅ PASS |
| TC-003-16 | FR-022 | FR-022 no se crean pedidos por inserción directa | `003_orders.sql` | ✅ PASS |
| TC-003-17 | NFR-001 | NFR-001 el vendedor no lee la tabla de pedidos | `003_orders.sql` | ✅ PASS |
| TC-003-18 | NFR-001 | NFR-001 el vendedor no lee pagos | `003_orders.sql` | ✅ PASS |
| TC-003-19 | FR-025 | FR-025 el comprador ve su pedido | `003_orders.sql` | ✅ PASS |
| TC-003-20 | FR-033 | FR-033 el cliente no puede confirmar pagos | `003_orders.sql` | ✅ PASS |
| TC-003-21 | FR-033 | FR-033 el cliente no puede registrar QR | `003_orders.sql` | ✅ PASS |
| TC-003-22 | FR-033 | FR-033 confirma el pago del pedido | `003_orders.sql` | ✅ PASS |
| TC-003-23 | FR-033 | FR-033 el pedido pasa a pagado | `003_orders.sql` | ✅ PASS |
| TC-003-24 | FR-037 | FR-037 el stock se descuenta y el producto agotado pasa a sold_out | `003_orders.sql` | ✅ PASS |
| TC-003-25 | FR-037 | FR-037 solo se descuenta lo comprado | `003_orders.sql` | ✅ PASS |
| TC-003-26 | FR-037 | FR-037 el producto agotado sale del catálogo público | `003_orders.sql` | ✅ PASS |
| TC-003-27 | FR-070 | FR-070 se crea un retiro por tienda con código de 6 caracteres | `003_orders.sql` | ✅ PASS |
| TC-003-28 | FR-034 | FR-034 confirmar dos veces no duplica el descuento | `003_orders.sql` | ✅ PASS |
| TC-003-29 | FR-034 | FR-034 el stock no cambia en la segunda confirmación | `003_orders.sql` | ✅ PASS |
| TC-003-30 | FR-035 | FR-035 se guarda nombre y banco de quien pagó | `003_orders.sql` | ✅ PASS |
| TC-003-31 | NFR-004 | NFR-004 ambos compradores pueden crear el pedido (sin reserva) | `003_orders.sql` | ✅ PASS |
| TC-003-32 | FR-023a, NFR-004 | FR-023a NFR-004 el primer pago confirmado se queda con el producto | `003_orders.sql` | ✅ PASS |
| TC-003-33 | FR-023a, NFR-004 | FR-023a NFR-004 el segundo pago queda en revisión | `003_orders.sql` | ✅ PASS |
| TC-003-34 | NFR-004 | NFR-004 el stock nunca queda negativo | `003_orders.sql` | ✅ PASS |
| TC-003-35 | FR-039b | FR-039b el pedido perdedor queda en revisión con motivo | `003_orders.sql` | ✅ PASS |
| TC-003-36 | FR-039b | FR-039b un pedido en revisión no genera retiro | `003_orders.sql` | ✅ PASS |
| TC-003-37 | FR-039b | FR-039b un monto distinto al total queda en revisión | `003_orders.sql` | ✅ PASS |
| TC-003-38 | FR-039b | FR-039b un pago en revisión no toca el stock | `003_orders.sql` | ✅ PASS |
| TC-003-39 | FR-023 | FR-023 al vencer, el pedido se marca y se devuelve su QR para anularlo | `003_orders.sql` | ✅ PASS |
| TC-003-40 | FR-023 | FR-023 el pedido vencido pasa a expired | `003_orders.sql` | ✅ PASS |
| TC-003-41 | FR-039b | FR-039b un pago tardío se honra si el monto coincide y hay stock | `003_orders.sql` | ✅ PASS |
| TC-003-42 | FR-039b | FR-039b el pago tardío descuenta el stock | `003_orders.sql` | ✅ PASS |
| TC-003-43 | FR-083 | FR-083 el comprobante muestra quién pagó, sin iniciar sesión | `003_orders.sql` | ✅ PASS |
| TC-003-44 | FR-083 | FR-083 el comprobante muestra el nombre del banco del catálogo | `003_orders.sql` | ✅ PASS |
| TC-003-45 | FR-083 | FR-083 el comprobante separa los ítems por vendedor con su código de retiro | `003_orders.sql` | ✅ PASS |
| TC-003-46 | FR-083 | FR-083 un token inválido no devuelve nada | `003_orders.sql` | ✅ PASS |
| TC-003-47 | FR-083 | FR-083 un pedido sin pago confirmado no tiene comprobante | `003_orders.sql` | ✅ PASS |
| TC-003-48 | FR-072 | FR-072 el vendedor G ve solo los retiros de su tienda | `003_orders.sql` | ✅ PASS |
| TC-003-49 | FR-071 | FR-071 el vendedor ve nombre y teléfono de quien compró | `003_orders.sql` | ✅ PASS |
| TC-003-50 | FR-072 | FR-072 el vendedor no ve ítems de otra tienda del mismo pedido | `003_orders.sql` | ✅ PASS |
| TC-003-51 | FR-074 | FR-074 un código de retiro incorrecto se rechaza | `003_orders.sql` | ✅ PASS |
| TC-003-52 | FR-072 | FR-072 el vendedor H ve solo sus retiros | `003_orders.sql` | ✅ PASS |
| TC-003-53 | FR-072 | FR-072 otro vendedor no puede entregar un retiro ajeno | `003_orders.sql` | ✅ PASS |
| TC-003-54 | FR-072 | FR-072 un comprador no ve retiros de vendedores | `003_orders.sql` | ✅ PASS |
| TC-003-55 | FR-074 | FR-074 con el código correcto el retiro queda entregado | `003_orders.sql` | ✅ PASS |
| TC-003-56 | FR-074 | FR-074 un retiro entregado no se entrega dos veces | `003_orders.sql` | ✅ PASS |
| TC-003-57 | FR-079 | FR-079 el vendedor puede listar sus retiros entregados | `003_orders.sql` | ✅ PASS |
| TC-003-58 | FR-084 | FR-084 el admin ve pagos confirmados y en revisión | `003_orders.sql` | ✅ PASS |
| TC-003-59 | FR-084 | FR-084 cada pago confirmado trae pagador y enlace de comprobante | `003_orders.sql` | ✅ PASS |
| TC-003-60 | FR-084 | FR-084 el vendedor no accede al reporte global | `003_orders.sql` | ✅ PASS |
| TC-004-01 | NFR-004 | NFR-004 de 20 pagos simultáneos por 1 unidad, exactamente 1 queda pagado | `004_concurrency` | ✅ PASS |
| TC-004-02 | NFR-004 | NFR-004 los otros 19 pagos quedan en revisión | `004_concurrency` | ✅ PASS |
| TC-004-03 | NFR-004 | NFR-004 el stock termina en 0, nunca negativo | `004_concurrency` | ✅ PASS |
| TC-004-04 | NFR-004 | NFR-004 solo 1 pedido queda en estado pagado | `004_concurrency` | ✅ PASS |
| TC-004-05 | NFR-004 | NFR-004 se crea 1 solo retiro | `004_concurrency` | ✅ PASS |
| TC-005-01 | FR-100 | FR-100 la limpieza sin la frase de confirmación se cancela | `005_cleanup` | ✅ PASS |
| TC-005-02 | FR-100 | FR-100 la limpieza cancelada no borra ningún dato | `005_cleanup` | ✅ PASS |
| TC-005-03 | FR-100 | FR-100 la limpieza borra pedidos, ítems, pagos y retiros | `005_cleanup` | ✅ PASS |
| TC-005-04 | FR-100 | FR-100 la limpieza borra productos, fotos y tiendas | `005_cleanup` | ✅ PASS |
| TC-005-05 | FR-100 | FR-100 la limpieza borra las cuentas que no son administrativas | `005_cleanup` | ✅ PASS |
| TC-005-06 | FR-100 | FR-100 la limpieza conserva las cuentas administrativas | `005_cleanup` | ✅ PASS |
| TC-005-07 | FR-100 | FR-100 la limpieza conserva la configuración y el catálogo de bancos | `005_cleanup` | ✅ PASS |
| TC-005-08 | — | la numeración de pedidos vuelve a empezar | `005_cleanup` | ✅ PASS |
| TC-005-09 | FR-100 | FR-100 la limpieza queda registrada en la auditoría | `005_cleanup` | ✅ PASS |
| TC-005-10 | FR-096 | FR-096 la cadena de auditoría sigue íntegra tras la limpieza | `005_cleanup` | ✅ PASS |
| TC-005-11 | — | con el reinicio activado, la auditoría queda solo con la marca de limpieza | `005_cleanup` | ✅ PASS |
| TC-005-12 | FR-096 | FR-096 la cadena queda íntegra tras reiniciar la auditoría | `005_cleanup` | ✅ PASS |
| TC-005-13 | FR-095 | FR-095 la auditoría vuelve a ser inmutable después del reinicio | `005_cleanup` | ✅ PASS |
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
| TC-SCR-01 | — | sin --confirm solo simula y no borra nada | `cleanup-storage.test.mjs` | ✅ PASS |
| TC-SCR-02 | — | con la frase correcta borra todos los archivos, incluidas las carpetas anidadas | `cleanup-storage.test.mjs` | ✅ PASS |
| TC-SCR-03 | — | con una frase incorrecta se rechaza y no borra | `cleanup-storage.test.mjs` | ✅ PASS |
| TC-SCR-04 | — | sin credenciales en el entorno no hace nada | `cleanup-storage.test.mjs` | ✅ PASS |
| TC-SCR-05 | — | con una clave inválida falla sin borrar | `cleanup-storage.test.mjs` | ✅ PASS |
| TC-SCR-06 | — | maneja más de 100 archivos (paginación y borrado por lotes) | `cleanup-storage.test.mjs` | ✅ PASS |
| TC-SEC-01 | FR-095 | FR-095 la autoprueba del escáner de secretos detecta llaves, JWT y claves privadas | `check_secrets.py` | ✅ PASS |
| TC-SEC-02 | — | el repositorio no contiene secretos detectables | `check_secrets.py` | ✅ PASS |
| E2E-01 | — | @smoke la aplicación carga y muestra el catálogo público | `00-humo.spec.ts` | ✅ PASS |
| E2E-02 | — | @smoke las áreas privadas llevan a "Ingresar" sin sesión | `00-humo.spec.ts` | ✅ PASS |
| E2E-03 | — | @smoke el formulario alterna entre ingresar y crear cuenta | `00-humo.spec.ts` | ✅ PASS |
| E2E-04 | — | @smoke una dirección desconocida vuelve al inicio | `00-humo.spec.ts` | ✅ PASS |
| E2E-05 | — | @smoke el botón de Google no se muestra hasta configurarlo | `00-humo.spec.ts` | ✅ PASS |
| AES-01 | — | el ejemplo PÚBLICO del manual del banco se descifra a "1234" | `qr-baneco-demo` | ✅ PASS |
| AES-02 | — | cifrar y descifrar devuelve el texto original (incluye tildes) | `qr-baneco-demo` | ✅ PASS |
| AES-03 | — | el resultado tiene el formato del banco: base64 de 16 bytes de IV + bloques de 16 | `qr-baneco-demo` | ✅ PASS |
| AES-04 | — | cada cifrado usa un IV distinto | `qr-baneco-demo` | ✅ PASS |
| AES-05 | — | una llave de largo incorrecto se rechaza con un mensaje claro | `qr-baneco-demo` | ✅ PASS |
| AES-06 | — | con otra llave no se puede descifrar | `qr-baneco-demo` | ✅ PASS |
| APP-01 | — | la página principal y la salud responden | `qr-baneco-demo` | ✅ PASS |
| APP-02 | — | el catálogo trae 2 productos con precios del servidor | `qr-baneco-demo` | ✅ PASS |
| APP-03 | — | un pedido de 2 productos genera un QR por el total y queda pendiente | `qr-baneco-demo` | ✅ PASS |
| APP-04 | — | un pedido de 1 solo producto también funciona | `qr-baneco-demo` | ✅ PASS |
| APP-05 | — | SEGURIDAD: el precio que mande el navegador se ignora | `qr-baneco-demo` | ✅ PASS |
| APP-06 | — | se rechazan pedidos inválidos (vacío, 3 productos, cantidad 0 o 99, producto desconocido, repetido) | `qr-baneco-demo` | ✅ PASS |
| APP-07 | — | el pago se confirma al consultar: pendiente → pagado, con nombre y banco del pagador | `qr-baneco-demo` | ✅ PASS |
| APP-08 | — | consultar varias veces un pedido pagado no cambia nada (idempotente) | `qr-baneco-demo` | ✅ PASS |
| APP-09 | — | el aviso del banco sin token o con token falso se rechaza | `qr-baneco-demo` | ✅ PASS |
| APP-10 | — | SEGURIDAD: un aviso con el token correcto NO confirma un pago que el banco no reporta | `qr-baneco-demo` | ✅ PASS |
| APP-11 | — | un aviso legítimo (el banco sí lo marcó pagado) confirma el pedido | `qr-baneco-demo` | ✅ PASS |
| APP-12 | — | anular un pedido pendiente anula el QR; uno pagado no se puede anular | `qr-baneco-demo` | ✅ PASS |
| APP-13 | — | SEGURIDAD: la vista pública del pedido no expone qrId ni datos internos | `qr-baneco-demo` | ✅ PASS |
| APP-14 | — | un pedido que no existe o con id raro responde 404 sin romper el servidor | `qr-baneco-demo` | ✅ PASS |
| APP-15 | — | un cuerpo JSON roto o gigante se rechaza | `qr-baneco-demo` | ✅ PASS |
| APP-16 | — | las cabeceras de seguridad están presentes | `qr-baneco-demo` | ✅ PASS |
| APP-17 | — | el aviso AUTOMÁTICO del banco confirma el pedido sin que nadie consulte | `qr-baneco-demo` | ✅ PASS |
| BANCO-01 | — | autentica con el password cifrado y devuelve token | `qr-baneco-demo` | ✅ PASS |
| BANCO-02 | — | con una contraseña incorrecta falla igual que el banco real: "Usuario no habilitado para uso de apis" | `qr-baneco-demo` | ✅ PASS |
| BANCO-03 | — | una contraseña ya cifrada (como la del estudiante) también autentica | `qr-baneco-demo` | ✅ PASS |
| BANCO-04 | — | genera un QR de uso único con monto fijo y devuelve qrId e imagen | `qr-baneco-demo` | ✅ PASS |
| BANCO-05 | — | el banco rechaza una glosa de más de 100 caracteres (el cliente debe truncarla) | `qr-baneco-demo` | ✅ PASS |
| BANCO-06 | — | statusQR: pendiente (0) y luego pagado (1) con datos del pagador | `qr-baneco-demo` | ✅ PASS |
| BANCO-07 | — | se acepta tanto "statusQRCode" como "statusQrCode" (el manual trae ambas escrituras) | `qr-baneco-demo` | ✅ PASS |
| BANCO-08 | — | anular un QR pendiente funciona; anular uno pagado se rechaza | `qr-baneco-demo` | ✅ PASS |
| BANCO-09 | — | si el token vence (401) se vuelve a autenticar una vez y la operación sigue | `qr-baneco-demo` | ✅ PASS |
| BANCO-10 | — | paidQR lista los pagos del día para conciliar | `qr-baneco-demo` | ✅ PASS |
| CFG-01 | — | modo real sin ninguna forma de password se rechaza con un mensaje que explica las opciones | `qr-baneco-demo` | ✅ PASS |
| CFG-02 | — | BANK_PASSWORD_FROM=vacio es válido y cifra una cadena vacía | `qr-baneco-demo` | ✅ PASS |
| CFG-03 | — | BANK_PASSWORD_FROM=usuario cifra el propio usuario | `qr-baneco-demo` | ✅ PASS |
| CFG-04 | — | un valor desconocido en BANK_PASSWORD_FROM se rechaza | `qr-baneco-demo` | ✅ PASS |
| CFG-05 | — | el modo simulado no exige credenciales | `qr-baneco-demo` | ✅ PASS |
| CFG-06 | — | el banco autentica cuando lo que se cifra es una cadena vacía (usuario sin contraseña) | `qr-baneco-demo` | ✅ PASS |
| CFG-07 | — | el banco autentica cuando lo que se cifra es el propio usuario | `qr-baneco-demo` | ✅ PASS |
| CFG-08 | — | el diagnóstico reconoce un password vacío sin mostrar nada | `qr-baneco-demo` | ✅ PASS |
| CFG-09 | — | el diagnóstico reconoce que el password es el usuario | `qr-baneco-demo` | ✅ PASS |
| CFG-10 | — | SEGURIDAD: el diagnóstico NO imprime el texto del password salvo con --mostrar | `qr-baneco-demo` | ✅ PASS |
| CFG-11 | — | el diagnóstico avisa claro si la llave no corresponde | `qr-baneco-demo` | ✅ PASS |
| DIN-01 | — | los centavos pasan al banco como decimal de máximo 2 decimales, sin errores de coma flotante | `qr-baneco-demo` | ✅ PASS |
| DIN-02 | — | montos inválidos se rechazan | `qr-baneco-demo` | ✅ PASS |
| DIN-03 | — | formato en bolivianos | `qr-baneco-demo` | ✅ PASS |
| DIN-04 | — | la glosa nunca pasa de 100 caracteres y empieza por el código del pedido | `qr-baneco-demo` | ✅ PASS |
| DIN-05 | — | la fecha de vencimiento es yyyy-MM-dd en hora de La Paz | `qr-baneco-demo` | ✅ PASS |
