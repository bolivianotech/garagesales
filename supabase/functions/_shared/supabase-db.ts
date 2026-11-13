// Adaptador de PaymentsDb sobre Supabase: dos clientes, uno con la sesión del comprador (RLS) y otro con el rol de servicio.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './http.ts'
import type { ConfirmResult, OrderRow, PaymentsDb, PendingPayment, StoredPayment } from './payments.ts'

type Env = Record<string, string | undefined>

function need(env: Env, name: string): string {
  const v = env[name]
  if (!v) throw new Error(`Falta la variable ${name}`)
  return v
}

const serviceClient = (env: Env): SupabaseClient =>
  createClient(need(env, 'SUPABASE_URL'), need(env, 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })

/** Cliente con la sesión del comprador (la que llega en Authorization). Verifica que el token sea válido. */
export async function buyerClient(req: Request, env: Env): Promise<SupabaseClient> {
  const authorization = req.headers.get('Authorization')
  if (!authorization) throw new HttpError(401, 'Debes iniciar sesión')
  const client = createClient(need(env, 'SUPABASE_URL'), need(env, 'SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) throw new HttpError(401, 'Sesión inválida')
  return client
}

const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`)
  return r.data as T
}

/** db completo (comprador + servicio). Para tareas programadas pasa buyer = null. */
export function makeDb(env: Env, buyer: SupabaseClient | null): PaymentsDb {
  const svc = serviceClient(env)
  const needBuyer = (): SupabaseClient => { if (!buyer) throw new Error('Esta operación requiere la sesión de un comprador'); return buyer }
  return {
    async getBuyerOrder(orderId) {
      const r = await needBuyer().from('orders').select('id, short_code, status, total_cents, expires_at').eq('id', orderId).maybeSingle()
      return must<OrderRow | null>(r as never, 'leer pedido')
    },
    async getOrderItems(orderId) {
      return must<{ sku: string; qty: number }[]>((await needBuyer().from('order_items').select('sku, qty').eq('order_id', orderId)) as never, 'leer ítems') ?? []
    },
    async getStoredPayment(orderId) {
      const rows = must<StoredPayment[]>((await needBuyer().rpc('get_order_payment', { p_order_id: orderId })) as never, 'leer pago')
      return rows?.[0] ?? null
    },
    async registerQr(p) {
      must((await svc.rpc('register_payment_qr', {
        p_order_id: p.orderId, p_bank_qr_id: p.qrId, p_amount_cents: p.amountCents, p_qr_image: p.qrImage, p_due_date: p.dueDate, p_description: p.description,
      })) as never, 'registrar QR')
    },
    async confirmPayment(p) {
      return must<ConfirmResult>((await svc.rpc('confirm_payment', {
        p_order_id: p.orderId, p_bank_qr_id: p.qrId, p_amount_cents: p.amountCents, p_sender_name: p.senderName,
        p_sender_bank_code: p.senderBankCode, p_sender_account: p.senderAccount, p_paid_at: p.paidAt, p_raw: p.raw,
      })) as never, 'confirmar pago')
    },
    async claimOrderCheck(orderId) {
      const rows = must<PendingPayment[]>((await svc.rpc('claim_payment_check', { p_order_id: orderId, p_min_seconds: 3 })) as never, 'reclamar consulta')
      return rows?.[0] ?? null
    },
    async paymentsToCheck(limit) {
      return must<PendingPayment[]>((await svc.rpc('payments_to_check', { p_limit: limit, p_min_age_seconds: 20, p_recent_minutes: 20 })) as never, 'pagos por consultar') ?? []
    },
    async paymentsByQr(qrIds) {
      if (!qrIds.length) return []
      return must<PendingPayment[]>((await svc.rpc('payments_by_qr', { p_qr_ids: qrIds })) as never, 'pagos por QR') ?? []
    },
    async expirePending() {
      const rows = must<{ expired_order_id: string; expired_bank_qr_id: string | null }[]>((await svc.rpc('expire_pending_orders')) as never, 'vencer pedidos') ?? []
      return rows.map((x) => ({ order_id: x.expired_order_id, bank_qr_id: x.expired_bank_qr_id }))
    },
  }
}
