# Puesta en marcha de Supabase (Fase 1)

Proyecto: `garajesales` · ref `pfhgqoeobboriounehat` · URL `https://pfhgqoeobboriounehat.supabase.co`

La URL y la clave **publishable** (anon) son públicas por diseño y van en el frontend. La clave `service_role`, la contraseña de la base de datos y la llave AES del banco **nunca** van al repo ni al chat.

## 1. Aplicar las migraciones (T9)
Aplícalas **en orden** (`20261107000001_foundation.sql` primero y luego `20261108000001_products.sql`). Ya aplicaste la primera; para la Fase 2 ejecuta solo la segunda.

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

## Enlace del correo de confirmación (error `localhost:3000`)
Si al confirmar el correo el navegador va a `http://localhost:3000/#access_token=...` y muestra error, **la cuenta sí quedó confirmada**: Supabase usa por defecto `localhost:3000` como *Site URL*. Corrección:
1. Supabase → **Authentication → URL Configuration → Site URL** = `https://garagesales.requenataniel.workers.dev`.
2. En **Redirect URLs** agrega `https://garagesales.requenataniel.workers.dev/**` y `http://localhost:5173/**`.
3. Entra a la app e ingresa con el correo y la contraseña.

La app ya pide a Supabase volver a su propio dominio (`emailRedirectTo`), pero ese dominio debe estar permitido en la lista de Redirect URLs.

## Quién puede registrarse y qué rol tiene
- **Cualquier persona puede crear una cuenta** y queda como *comprador*: es necesario para poder comprar.
- **Vendedor:** el usuario pide serlo desde "Mi cuenta" y el `admin` lo aprueba en el panel. **No se ejecuta SQL para vendedores.**
- **`admin` y `finance_admin`:** solo se asignan con `bootstrap_staff_role` desde el SQL Editor (la función no es ejecutable desde la app).

## Correos de Supabase (remitente y texto)
Con el servicio de correo por defecto de Supabase, el remitente es `noreply@mail.app.supabase.io` y el texto viene en inglés. Para marca propia en español: **Authentication → Email Templates** (textos) y, para cambiar el remitente, un SMTP propio (Authentication → SMTP Settings). El servicio por defecto además tiene un límite bajo de correos por hora; para producción conviene SMTP propio.
