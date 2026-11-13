# Guía de puesta en marcha del cobro (para enseñarla en vivo)

> Úsala junto a las diapositivas 14b, 14c y 14d de `docs/presentations/GarageSales-taller-fin-de-semana.pptx`.
> Tiempo: 30–40 min. Los comandos son para **PowerShell de Windows**. Todos se ejecutan en tu computadora, en la carpeta del repositorio.
> **Estado honesto:** el código está probado contra un banco *simulado*. El primer cobro real en certificación (paso 6) es la prueba que falta.

## 0. La idea en un minuto

```
Comprador ──► Web (Cloudflare) ──► Edge Function create-qr ──► API del Banco (genera el QR)
                  ▲  consulta cada 4 s (check-order)                 │
                  │                                                  ▼
            Base de datos ◄── confirm_payment (UNA sola vez) ◄── 3 caminos: pantalla · aviso · reloj de 1 min
```

- **No registramos nada en el banco.** La API ya trae un endpoint para consultar el estado de cada QR (`statusQR`) y otro con los pagados del día (`paidQR`). El aviso del banco (`notifyPaymentQR`) es **opcional**.
- La **base de datos** decide si un pago cuenta (idempotente: 20 pagos a la vez → 1 solo ganador).

## 1. Dónde vive cada secreto (y por qué)

| Lugar | Qué guarda | Quién lo lee | Cómo se carga |
|---|---|---|---|
| **Secretos de Supabase** | usuario del banco, llave AES, cuenta, tokens | las Edge Functions (`Deno.env`) | `npx supabase secrets set NOMBRE=valor` |
| **Vault de Supabase** | `CRON_SECRET` para el reloj de cada minuto | la base de datos (`pg_cron`) | una vez, desde el SQL Editor (paso 4) |
| **Variables de Cloudflare** | solo cosas **públicas**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | la web (navegador) | panel de Cloudflare |

**Pregunta frecuente: «si el código ya lo usa, ¿para qué cargarlo con el CLI?»**
El código solo conoce el **nombre** (`BANCO_ECONOMICO_AES_KEY`), nunca el valor. Si el valor estuviera en el código, quedaría en git para siempre (por eso hubo que rotar la llave). El CLI guarda el valor cifrado en Supabase, fuera del repositorio.

Supabase inyecta solo `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en las funciones. No hace falta cargarlos (y el CLI no deja).

**Regla de oro:** jamás en el chat, en git, en capturas ni en el código.

## 2. Preparar la terminal

```powershell
cd D:\ai\garagesales
git checkout claude/garagesales-limpia-ivzqi8
git pull
```
```powershell
npx supabase login
npx supabase link --project-ref pfhgqoeobboriounehat
```

## 3. Paso 1 — Migraciones

```powershell
npx supabase db push
```
Aplica, en orden: fundación, productos, pedidos, `payment_checks` (consultas del cobro) y `payment_cron` (el reloj). **Verás:** la lista de migraciones nuevas y «Finished».

## 4. Paso 2 — Secretos del banco (certificación primero)

Cada comando es independiente. **Pon los valores reales solo en tu terminal.**

```powershell
npx supabase secrets set "BANCO_ECONOMICO_BASE_URL=https://apimktdesa.baneco.com.bo/ApiGateway/" "BANCO_ECONOMICO_USERNAME=A24627210"
```
```powershell
npx supabase secrets set "BANCO_ECONOMICO_AES_KEY=<tu llave de 32 caracteres>" "BANCO_ECONOMICO_ACCOUNT_CREDIT=<número de cuenta que recibe>"
```

**La contraseña** (lo que enviaste en Hoppscotch al validar `authenticate`):

| Qué mandaste en `password` | Qué cargar |
|---|---|
| El texto vacío, cifrado | `npx supabase secrets set "BANCO_ECONOMICO_PASSWORD_FROM=vacio"` |
| Tu usuario, cifrado | `npx supabase secrets set "BANCO_ECONOMICO_PASSWORD_FROM=usuario"` |
| Una contraseña real, cifrada | `npx supabase secrets set 'BANCO_ECONOMICO_PASSWORD=<la contraseña>'` (comillas simples) |

Secretos propios (los inventamos nosotros; **no** vienen del banco). Genéralos en PowerShell (`openssl` no existe en Windows):

```powershell
function NuevoSecreto { $b = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' }
$tok = NuevoSecreto; $cron = NuevoSecreto
npx supabase secrets set "BANCO_ECONOMICO_NOTIFY_TOKEN=$tok" "CRON_SECRET=$cron" "ALLOWED_ORIGINS=https://TU-DOMINIO"
```
**Deja esta ventana abierta**: el paso 4 usa `$cron`. Comprueba qué quedó guardado (muestra nombres, no valores):
```powershell
npx supabase secrets list
```

## 5. Paso 3 — Desplegar las funciones

```powershell
npx supabase functions deploy create-qr check-order check-payments expire-orders notify-payment
```
El archivo `supabase/config.toml` ya dice cuáles exigen sesión de usuario (`create-qr`, `check-order`) y cuáles se protegen con su propio secreto (`check-payments`, `expire-orders`, `notify-payment`).

## 6. Paso 4 — El reloj de cada minuto

En la misma ventana, copia el SQL ya armado al portapapeles (el secreto no se imprime):
```powershell
"select public.setup_payment_cron('https://pfhgqoeobboriounehat.supabase.co', '$cron');" | Set-Clipboard
```
Pégalo en Supabase → **SQL Editor** → Run. **Verás:** `Programado: check-payments y expire-orders cada minuto`.
Si dice que no existe `vault` o `cron`: Supabase → Database → Extensions → activar `pg_cron`, `pg_net` y `supabase_vault`, y repetir.

## 7. Paso 5 — La web

En Cloudflare → tu proyecto → Settings → Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (públicas). Haz *push* a `main` para desplegar. Es la **única** parte que lleva datos «visibles»; ninguna lleva secretos del banco.

## 8. Paso 6 — Primer cobro de Bs 1 en certificación

1. Con un vendedor aprobado, crea un producto de **Bs 1** con foto y publícalo.
2. Con otra cuenta (comprador, con nombre y teléfono en *Mi cuenta*): **Agregar al carrito → Pagar con QR**.
3. Debe aparecer el QR de Bs 1,00. Págalo con la app de un banco **de certificación**.
4. En ≤ 4 s la pantalla pasa sola al **comprobante** con el código de retiro.
5. En Supabase → *Table Editor* → `payments`: estado `paid`, con `sender_name` y banco.
6. Con el vendedor: **Por entregar** → escribe el código → **Entregar**.

Si algo falla, **Supabase → Edge Functions → (función) → Logs**.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El QR no aparece, error «El banco no aceptó el usuario» | usuario no habilitado, o contraseña incorrecta | revisar el cero/«5» del usuario; probar `vacio`/`usuario`; confirmar en Hoppscotch |
| Error de llave / «32 caracteres» | llave mal copiada | `secrets set` de nuevo, sin espacios |
| Pagué y no cambia | revisar el reloj | `select * from cron.job_run_details order by start_time desc limit 5;` |
| 401 en `check-payments` | `CRON_SECRET` distinto en Vault y en secretos | repetir pasos 2 y 4 con el mismo `$cron` |
| «El pedido venció» | pasó el plazo del pedido | crear otro pedido |

## 9. Paso 7 — Producción

Cuando el banco entregue los datos de producción: nueva `BASE_URL` (`https://apimkt.baneco.com.bo/ApiGateway/`), **nueva llave AES** y usuario/cuenta de producción con `secrets set`. No hay que tocar código. Antes: **rotar** la llave y la clave que se expusieron, y hacer el repositorio **privado**.

## 10. Aviso del banco (opcional)

Si el banco permite registrar una URL de notificación: `https://pfhgqoeobboriounehat.supabase.co/functions/v1/notify-payment` con `Authorization: Bearer <NOTIFY_TOKEN>`. Sin esto, el sistema funciona igual (caminos 1 y 3).

## 11. Guion para la charla (qué diapositiva con qué paso)

| Diapositiva | Qué decir | Demo en vivo |
|---|---|---|
| 14b · Tres caminos | «No registramos nada: preguntamos al banco» | abrir `supabase/functions/_shared/payments.ts` |
| 14c · Dónde vive cada secreto | «El código sabe el nombre, no el valor» | `npx supabase secrets list` |
| 14d · 7 pasos | recorrer los pasos 1–7 | ejecutar pasos 3 a 6 |
| Cierre | primer cobro de Bs 1 | pagar y ver el comprobante |
