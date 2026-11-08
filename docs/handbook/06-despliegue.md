# 06 · Despliegue

## 1. Ambientes

| Ambiente | Para qué | Base de datos | Banco | URL |
|---|---|---|---|---|
| Local | Desarrollo y pruebas automáticas | PostgreSQL con Supabase simulado | `MockProvider` | `localhost:5173` |
| Certificación | UAT y E2E con dinero de prueba | Proyecto Supabase de pruebas | `apimktdesa.baneco.com.bo` | URL de Cloudflare de la rama |
| Producción | Público | Proyecto Supabase de producción | URL de producción del banco | `garagesales.bo` (cuando exista) |

> Recomendación: **dos proyectos Supabase** (pruebas y producción) para poder borrar datos de prueba sin riesgo. Hoy existe uno solo (`pfhgqoeobboriounehat`); antes del lanzamiento se limpia con el [runbook de limpieza](../runbooks/03-limpieza-de-datos.md) o se crea el de producción.

## 2. Orden de despliegue (siempre el mismo)
1. **Base de datos** (migraciones, en orden).
2. **Secretos** del servidor.
3. **Edge Functions**.
4. **Frontend** (Cloudflare, automático al fusionar a `main`).
5. **Configuración del banco** (URL de notificación).
6. **Prueba post-despliegue** (ver [05](05-estrategia-de-pruebas.md)).

## 3. Migraciones
- Cada migración es un archivo `AAAAMMDDHHMMSS_nombre.sql` en `supabase/migrations/`. **Nunca se edita una migración ya aplicada**; se crea una nueva.
- Aplicar: SQL Editor de Supabase (pegar el archivo, *Run*) o `npx supabase db push`.
- Antes: copia de seguridad y prueba local (`bash supabase/tests/run.sh`).
- "Success. No rows returned" es la respuesta normal de un script que solo define estructuras.

## 4. Secretos y variables

| Dónde | Qué | Cómo se carga |
|---|---|---|
| Cloudflare (variables de compilación) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22` | Panel de Cloudflare |
| Supabase (secretos de Edge Functions) | `BANCO_ECONOMICO_*`, `SUPABASE_SERVICE_ROLE_KEY` | `supabase secrets set NOMBRE=valor` o panel *Edge Functions → Secrets* |
| Tu computador | `.env` local (ignorado por git) | Copiar `.env.example` |

Reglas completas en [09 · Seguridad y secretos](09-seguridad-y-secretos.md).

## 5. Edge Functions
```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase functions deploy create-qr check-payment notify-payment expire-orders reconcile-daily
npx supabase secrets list            # solo muestra nombres, nunca valores
```
Programación de tareas (cada 1 minuto `check-payment`, cada 15 minutos `expire-orders`, diaria `reconcile-daily`): ver el runbook de integración, sección 6.

## 6. Frontend en Cloudflare
- Se despliega solo al fusionar a `main` (producción) y crea vistas previas por rama.
- Configuración: raíz `apps/pwa`, build `npm run build`, salida `dist`; `apps/pwa/wrangler.jsonc` ya incluye `"previews": {}`.
- Dominio propio: *Settings → Domains & Routes → Add → Custom domain*; luego actualizar el Site URL y Redirect URLs en Supabase.

## 7. Reversa (rollback)

| Qué falló | Cómo se revierte | Tiempo |
|---|---|---|
| Frontend | Cloudflare → *Deployments* → versión anterior → *Rollback* | 2 min |
| Edge Function | Redesplegar el commit anterior (`git checkout <commit> && supabase functions deploy …`) | 5 min |
| Migración | Escribir una migración inversa (`…_revert_x.sql`) y aplicarla; si hubo daño de datos, restaurar la copia de seguridad | 15–60 min |
| Credenciales del banco comprometidas | Rotar llave y contraseña en el portal, actualizar secretos, redesplegar funciones | 30 min |

## 8. Registro del despliegue
Cada despliegue deja una línea en `docs/testing/reports/` (commit, fecha, resultado de las pruebas post-despliegue) y, si fue un lanzamiento, una etiqueta de git (`git tag v1.0.0`).

## 9. Lista rápida de verificación de configuración
- [ ] Supabase → *Authentication → URL Configuration*: Site URL y Redirect URLs correctos
- [ ] Supabase → *Authentication → Providers → Email*: confirmación de correo activa
- [ ] Supabase → *Storage*: bucket `product-images` público, límite 1 MB
- [ ] Cloudflare → rama de producción = `main`
- [ ] `select public.verify_audit_chain();` → `null`
- [ ] `select value from public.settings where key = 'require_admin_mfa';` → `true` una vez enrolado el 2FA
