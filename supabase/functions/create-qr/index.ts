// POST { order_id } con la sesión del comprador → genera (o recupera) el QR de su pedido. Requisitos: FR-031, FR-032.
import { bancoFromEnv } from '../_shared/baneco.ts'
import { corsFor, errorResponse, HttpError, json } from '../_shared/http.ts'
import { createQrForOrder, PaymentError } from '../_shared/payments.ts'
import { buyerClient, makeDb } from '../_shared/supabase-db.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  const env = Deno.env.toObject()
  const cors = corsFor(req, env)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido')
    const buyer = await buyerClient(req, env)
    const body = await req.json().catch(() => ({}))
    if (!UUID.test(String(body?.order_id ?? ''))) throw new HttpError(400, 'order_id inválido')
    const qr = await createQrForOrder({ db: makeDb(env, buyer), bank: bancoFromEnv(env), orderId: body.order_id })
    return json(200, qr, cors)
  } catch (e) {
    if (e instanceof PaymentError) return json(e.status, { error: e.message }, cors)
    return errorResponse(e, cors)
  }
})
