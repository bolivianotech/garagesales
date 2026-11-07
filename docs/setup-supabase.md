# Puesta en marcha de Supabase (Fase 1)

Proyecto: `garajesales` · ref `pfhgqoeobboriounehat` · URL `https://pfhgqoeobboriounehat.supabase.co`

La URL y la clave **publishable** (anon) son públicas por diseño y van en el frontend. La clave `service_role`, la contraseña de la base de datos y la llave AES del banco **nunca** van al repo ni al chat.

## 1. Aplicar la migración (T9)
Opción A — SQL Editor (la más rápida):
1. Panel de Supabase → **SQL Editor** → New query.
2. Pega el contenido de `supabase/migrations/20261107000001_foundation.sql` y pulsa **Run**.

Opción B — CLI:
```bash
npx supabase login
npx supabase link --project-ref pfhgqoeobboriounehat
npx supabase db push
```

## 2. Autenticación (T11)
- **Authentication → Providers → Email:** activo; mantén "Confirm email" activado.
- **Authentication → Providers → Google:** activa e ingresa el Client ID y Secret de Google Cloud (si lo dejas para después, el botón fallará; el correo funciona igual).
- **Authentication → URL Configuration:** `Site URL` = la URL de despliegue; agrega `http://localhost:5173` en Redirect URLs.
- **Authentication → Multi-Factor:** TOTP habilitado.

## 3. Crear el personal (T10)
1. En la PWA, registra los dos correos (admin y finanzas).
2. En **SQL Editor**, ejecuta (con tus correos reales; no los guardes en el repo):
```sql
select public.bootstrap_staff_role('tu-correo-admin@...', 'admin');
select public.bootstrap_staff_role('tu-correo-finanzas@...', 'finance_admin');
```

## 4. Activar 2FA obligatorio (T12)
Con ambas cuentas ya enroladas con TOTP desde su sesión:
```sql
update public.settings set value = 'true' where key = 'require_admin_mfa';
```

## 5. Correr la PWA en local
```bash
cd apps/pwa
cp .env.example .env
npm install
npm run dev
```

## 6. Pruebas
```bash
cd apps/pwa && npm test            # reglas de la interfaz
bash supabase/tests/run.sh         # RLS y auditoría (requiere binarios de PostgreSQL)
```

## Alternativa sin la app: crear usuarios desde el panel (recomendada al inicio)
**Authentication → Users → Add user → Create new user**: ingresa correo y una contraseña fuerte propia y marca **Auto Confirm User**. Así no dependes del envío de correos de confirmación (el correo por defecto de Supabase tiene un límite muy bajo). El perfil se crea solo por el trigger. Luego ejecuta `bootstrap_staff_role` (sección 3).

## Google (opcional, se puede dejar para después)
El botón "Continuar con Google" está oculto (`VITE_ENABLE_GOOGLE=false`). Para activarlo hace falta crear credenciales OAuth en Google Cloud y pegarlas en Supabase → Authentication → Providers → Google. Sin eso, el registro con correo y contraseña funciona igual.
