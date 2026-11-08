# Despliegue gratuito en Cloudflare (Workers Builds)

Cloudflare ahora ofrece primero el flujo "Workers" (`npx wrangler deploy`). Sirve igual para una PWA estática: `apps/pwa/wrangler.jsonc` ya indica que se publique la carpeta `dist` y que las rutas de la app caigan en `index.html`.

## Pantalla "Set up your application"
| Campo | Valor |
|---|---|
| Project name | `garagesales` (debe coincidir con `name` en `wrangler.jsonc`) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` (déjalo como está) |
| Preview command | `npx wrangler versions upload` (puedes dejar el que trae) |
| **Advanced settings → Root directory** | `apps/pwa` |
| **Advanced settings → Build variables** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (valores en `apps/pwa/.env.example`) y `NODE_VERSION` = `22` |

## Rama que se publica
Cloudflare publica la rama de producción (por defecto `main`). Mientras el código siga en `claude/dreamy-faraday-ivzqi8`:
1. Proyecto → **Settings → Builds → Branch control** → *Production branch* = `claude/dreamy-faraday-ivzqi8`.
2. **Deployments → Retry deployment** (o haz un nuevo push).
Cuando fusiones la rama en `main`, vuelve a poner `main`.

## Después del primer despliegue
1. Copia la URL (`garagesales.<tu-subdominio>.workers.dev`).
2. Supabase → Authentication → URL Configuration → `Site URL` = esa URL, y agrégala a Redirect URLs.
3. Con `garagesales.bo` ya comprado: Settings → Domains & Routes → Add → Custom domain.

## Solución de problemas
- **`Your Wrangler configuration is missing a previews block`** (compilaciones de ramas distintas de `main`): el comando de vista previa de Cloudflare ahora es `npx wrangler preview` y exige `"previews": {}` en `apps/pwa/wrangler.jsonc`. Ya está agregado. Esas compilaciones solo afectan las vistas previas; el despliegue de `main` usa `npx wrangler deploy` y no depende de ese bloque.
- **`The version of Vite ... cannot be automatically configured`**: usar Vite 6 o superior (ya aplicado).
