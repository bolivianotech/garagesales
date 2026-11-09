// POST { order_id } con la sesión del comprador → pregunta al banco si ESE pedido ya se pagó (camino 1). FR-032, NFR-009.
import { bancoFromEnv } from '../_shared/baneco.ts'
import { corsFor, errorResponse, HttpError, json } from '../_shared/http.ts'
import { checkOrder } from '../_shared/payments.ts'
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
    const db = makeDb(env, buyer)
    // Propiedad: con la sesión del comprador, RLS solo deja ver sus pedidos.
    const order = await db.getBuyerOrder(body.order_id)
    if (!order) throw new HttpError(404, 'Pedido no encontrado')
    const r = await checkOrder({ db, bank: bancoFromEnv(env), orderId: order.id })
    return json(200, { order_status: order.status, ...r }, cors)
  } catch (e) {
    return errorResponse(e, cors)
  }
})
