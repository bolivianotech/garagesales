// Tarea programada (cada minuto): vence pedidos y anula su QR en el banco; rescata pagos tardíos. FR-034, FR-039b.
import { bancoFromEnv } from '../_shared/baneco.ts'
import { errorResponse, json, requireCron } from '../_shared/http.ts'
import { expireOrders } from '../_shared/payments.ts'
import { makeDb } from '../_shared/supabase-db.ts'

Deno.serve(async (req: Request) => {
  const env = Deno.env.toObject()
  try {
    requireCron(req.headers, env)
    return json(200, await expireOrders({ db: makeDb(env, null), bank: bancoFromEnv(env) }))
  } catch (e) {
    return errorResponse(e)
  }
})
