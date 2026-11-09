// Tarea programada (cada minuto): camino 3. Cruza los pendientes con la lista "pagados del día" del banco. FR-032, FR-039b.
import { bancoFromEnv } from '../_shared/baneco.ts'
import { errorResponse, json, requireCron } from '../_shared/http.ts'
import { checkPayments } from '../_shared/payments.ts'
import { makeDb } from '../_shared/supabase-db.ts'

Deno.serve(async (req: Request) => {
  const env = Deno.env.toObject()
  try {
    requireCron(req.headers, env)
    return json(200, await checkPayments({ db: makeDb(env, null), bank: bancoFromEnv(env) }))
  } catch (e) {
    return errorResponse(e)
  }
})
