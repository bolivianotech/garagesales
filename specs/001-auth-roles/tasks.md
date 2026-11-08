# Tareas 001 — Autenticación, roles y RBAC

| # | Tarea | Requisito | Estado |
|---|---|---|---|
| T1 | Migración base: tipos, `profiles`, trigger de alta, `stores` | FR-001, FR-002, FR-003 | ✅ hecha |
| T2 | Funciones de rol y revisión (`admin_review_store`, suspensión, bootstrap) | FR-003, FR-005, FR-099 | ✅ hecha |
| T3 | RLS en todas las tablas y permisos mínimos | FR-004, FR-006, NFR-001 | ✅ hecha |
| T4 | `audit_log` inmutable con hash encadenado + verificación | FR-095, FR-096 | ✅ hecha |
| T5 | Pruebas SQL de RLS y auditoría (24 casos) | NFR-001 | ✅ pasan |
| T6 | PWA: login/registro, cuenta, solicitud de vendedor | FR-001, FR-002, FR-003 | ✅ hecha |
| T7 | PWA: panel admin de revisión de vendedores | FR-005 | ✅ hecha |
| T8 | CI: typecheck, tests y pruebas SQL | — | ✅ definida |
| T9 | Aplicar la migración al proyecto Supabase `pfhgqoeobboriounehat` | — | ✅ aplicada por el dueño |
| T10 | Crear los dos usuarios de personal y asignar roles | FR-099 | ⏳ requiere correos |
| T11 | Habilitar Google y confirmación de correo en Supabase | FR-001 | ⏳ requiere acción del dueño |
| T12 | Enrolar TOTP en ambas cuentas y activar `require_admin_mfa` | FR-099a | ⏳ después de T10 |
| T13 | Desplegar PWA con dominio gratuito (Cloudflare Pages) | — | ⏳ requiere cuenta |
| T14 | Prueba manual de extremo a extremo con 3 cuentas | todos | ⏳ después de T9–T10 |
