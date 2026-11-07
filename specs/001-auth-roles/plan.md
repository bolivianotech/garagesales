# Plan 001 — Autenticación, roles y RBAC

Spec: [`spec.md`](spec.md) (Approved 2026-11-07)

## Diseño
- **Auth:** Supabase Auth (email + contraseña, Google). El perfil se crea con un trigger sobre `auth.users` (FR-001/002).
- **Roles:** enum `user_role` en `profiles.role`: `buyer`, `seller`, `admin`, `finance_admin`. Ser `seller` exige una tienda `approved`; la aprobación pasa por `admin_review_store` (FR-003/005), que además audita.
- **RBAC (NFR-001):** RLS en todas las tablas; `profiles` solo propio (personal ve todo); `stores` visible si aprobada, propia o personal; el estado y el rol no se modifican directamente (triggers `guard_*` + funciones `security definer`).
- **Admin de personal:** `bootstrap_staff_role` (solo desde el SQL Editor con rol de servicio) crea `admin` y `finance_admin`; el dueño usa dos correos.
- **2FA (FR-099a):** `settings.require_admin_mfa`; cuando es `true`, las acciones de admin exigen sesión `aal2`. Se activa tras enrolar TOTP en ambas cuentas.
- **Auditoría (FR-095/096):** `audit_log` append-only con hash SHA-256 encadenado; triggers bloquean UPDATE/DELETE/TRUNCATE; `verify_audit_chain()` detecta alteraciones.
- **Catálogo de bancos:** tabla `bank_catalog` editable por el admin; el código ASFI del pagador se mostrará con su nombre cuando esté cargado.
- **PWA:** React + Vite + TypeScript; rutas protegidas por rol (`RequireRole`) solo como guía visual: la seguridad real está en RLS.

## Pruebas
- `supabase/tests/001_rls.sql` (24 verificaciones, ejecutables con `supabase/tests/run.sh` y en CI).
- `apps/pwa/src/lib/roles.test.ts` (reglas de acceso de la interfaz).

## Riesgos
- Confirmación de correo y Google requieren configuración en el panel de Supabase (ver `docs/setup-supabase.md`).
- Un administrador de la base de datos con acceso total podría alterar filas: la cadena de hashes lo hace detectable (ADR-0003).
