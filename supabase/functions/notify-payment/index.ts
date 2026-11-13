// URL de notificación del banco (camino 2). El cuerpo NUNCA se toma como verdad: se pregunta al banco (statusQR). FR-031, FR-032.
import { bancoFromEnv } from '../_shared/baneco.ts'
import { isBankNotification, json } from '../_shared/http.ts'
import { handleNotification } from '../_shared/payments.ts'
import { makeDb } from '../_shared/supabase-db.ts'

Deno.serve(async (req: Request) => {
  const env = Deno.env.toObject()
  if (req.method !== 'POST') return json(405, { responseCode: 1, message: 'Método no permitido' })
  if (!isBankNotification(req.headers, env)) return json(401, { responseCode: 1, message: 'No autorizado' })
  try {
    const body = await req.json().catch(() => null)
    await handleNotification({ db: makeDb(env, null), bank: bancoFromEnv(env), body })
    return json(200, { responseCode: 0, message: '' })
  } catch (e) {
    console.error('notify-payment:', (e as Error)?.name ?? 'error')
    return json(500, { responseCode: 1, message: 'Error' }) // el banco reintenta
  }
})
