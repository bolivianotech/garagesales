# Despliegue gratuito en Cloudflare Pages

1. **Cuenta:** entra a `https://dash.cloudflare.com/sign-up`, regístrate con tu correo, confirma el correo y elige el plan **Free**. No pide tarjeta.
2. **Crear el proyecto:** en el panel, **Workers & Pages → Create → Pages → Import an existing Git repository** (la interfaz cambia a veces de nombre, busca "Pages" y "Connect to Git").
3. **Conectar GitHub:** autoriza a Cloudflare en GitHub y da acceso al repositorio `bolivianotech/garagesales`. Por ser de una organización, puede necesitar la aprobación de un propietario de `bolivianotech`.
4. **Configuración de compilación:**
   - Production branch: `main` (las demás ramas, como `claude/dreamy-faraday-ivzqi8`, reciben URLs de vista previa).
   - Root directory: `apps/pwa`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Variables de entorno** (Settings → Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (los valores de `apps/pwa/.env.example`) y `NODE_VERSION=22`.
6. **Desplegar.** Obtendrás una URL como `garagesales.pages.dev`.
7. **Volver a Supabase:** Authentication → URL Configuration → `Site URL` = esa URL, y añádela también a Redirect URLs.
8. Cuando compres `garagesales.bo`: Pages → Custom domains → Set up a domain.

El archivo `apps/pwa/public/_redirects` hace que las rutas de la app (`/cuenta`, `/admin`) funcionen al recargar.
