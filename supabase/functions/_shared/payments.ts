// Lógica de cobro con QR: crear el QR de un pedido y confirmar pagos por TRES caminos que se refuerzan:
//   1. La pantalla del comprador pregunta cada pocos segundos           → checkOrder
//   2. El banco avisa a nuestra URL de notificación                      → handleNotification
//   3. Una revisión cada minuto lee la lista de "pagados del día"         → checkPayments
// Un pago se confirma UNA sola vez, venga por donde venga: la base de datos lo garantiza (confirm_payment es idempotente).
// Nunca se confía en lo que diga el navegador o el cuerpo de un aviso: siempre se pregunta al banco.
import { boliviaDate, buildDescription, type BankPayment, type BanecoClient } from './baneco.ts'

export interface PendingPayment { payment_id: string; order_id: string; bank_qr_id: string; amount_cents: number }
export interface OrderRow { id: string; short_code: string; status: string; total_cents: number; expires_at: string }
export interface StoredPayment { bank_qr_id: string; qr_image: string | null; payment_status: string; due_date: string | null; amount_cents: number }
export type ConfirmResult = 'paid' | 'already_paid' | 'review'

export interface PaymentsDb {
  // Con la sesión del comprador (RLS decide qué ve):
  getBuyerOrder(orderId: string): Promise<OrderRow | null>
  getOrderItems(orderId: string): Promise<{ sku: string; qty: number }[]>
  getStoredPayment(orderId: string): Promise<StoredPayment | null>
  // Con el rol de servicio:
  registerQr(p: { orderId: string; qrId: string; amountCents: number; qrImage: string; dueDate: string; description: string }): Promise<void>
  confirmPayment(p: {
    orderId: string; qrId: string; amountCents: number; senderName: string | null; senderBankCode: string | null
    senderAccount: string | null; paidAt: string | null; raw: unknown
  }): Promise<ConfirmResult>
  claimOrderCheck(orderId: string): Promise<PendingPayment | null>
  paymentsToCheck(limit: number): Promise<PendingPayment[]>
  paymentsByQr(qrIds: string[]): Promise<PendingPayment[]>
  expirePending(): Promise<{ order_id: string; bank_qr_id: string | null }[]>
}

export class PaymentError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PaymentError'
    this.status = status
  }
}

/** Fecha y hora que informa el banco (hora de Bolivia, UTC-4) → ISO en UTC. null si no se puede interpretar. */
export function bankPaidAt(p: Pick<BankPayment, 'paymentDate' | 'paymentTime'>): string | null {
  const d = String(p.paymentDate ?? '').slice(0, 10)
  const t = String(p.paymentTime ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}:\d{2}$/.test(t)) return null
  const ms = Date.parse(`${d}T${t}-04:00`)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** El banco informa decimales; internamente son centavos enteros (sin errores de coma flotante). */
export const toCents = (amount: unknown): number => Math.round(Number(amount) * 100)

/** Pasa un pago que el BANCO reportó como pagado a la confirmación atómica de la base de datos. */
export async function confirmFromBank(db: PaymentsDb, pending: PendingPayment, p: BankPayment): Promise<ConfirmResult> {
  return db.confirmPayment({
    orderId: pending.order_id,
    qrId: pending.bank_qr_id,
    amountCents: toCents(p.amount),
    senderName: p.senderName ?? null,
    senderBankCode: p.senderBankCode != null ? String(p.senderBankCode) : null,
    senderAccount: p.senderAccount ?? null,
    paidAt: bankPaidAt(p),
    raw: p,
  })
}

export interface QrResult { qr_image: string; amount_cents: number; due_date: string | null; status: 'pending' }

/** Genera (o recupera) el QR de un pedido del comprador. Idempotente: no crea otro QR si ya hay uno vigente. */
export async function createQrForOrder(a: { db: PaymentsDb; bank: BanecoClient; orderId: string; now?: () => number }): Promise<QrResult> {
  const now = a.now ?? Date.now
  const order = await a.db.getBuyerOrder(a.orderId)
  if (!order) throw new PaymentError(404, 'Pedido no encontrado')
  if (order.status !== 'pending') throw new PaymentError(409, 'Este pedido ya no está pendiente de pago')
  if (Date.parse(order.expires_at) <= now()) throw new PaymentError(410, 'El pedido venció. Crea uno nuevo.')

  const existing = await a.db.getStoredPayment(order.id)
  if (existing && existing.payment_status === 'pending' && existing.qr_image) {
    return { qr_image: existing.qr_image, amount_cents: existing.amount_cents, due_date: existing.due_date, status: 'pending' }
  }

  const items = await a.db.getOrderItems(order.id)
  const description = buildDescription(order.short_code, items)
  // El banco vence los QR por DÍA (no por minutos): el vencimiento fino lo controla expireOrders.
  const dueDate = boliviaDate(0, Date.parse(order.expires_at))
  const qr = await a.bank.generateQR({ transactionId: order.short_code, amountCents: order.total_cents, description, dueDate })
  await a.db.registerQr({ orderId: order.id, qrId: qr.qrId, amountCents: order.total_cents, qrImage: qr.qrImage, dueDate, description })
  return { qr_image: qr.qrImage, amount_cents: order.total_cents, due_date: dueDate, status: 'pending' }
}

export interface CheckOrderResult { state: 'skipped' | 'pending' | 'cancelled' | ConfirmResult }

/** Camino 1: la pantalla del comprador pregunta por SU pedido. La propiedad del pedido ya se verificó antes. */
export async function checkOrder(a: { db: PaymentsDb; bank: BanecoClient; orderId: string }): Promise<CheckOrderResult> {
  const claim = await a.db.claimOrderCheck(a.orderId)
  if (!claim) return { state: 'skipped' } // no hay pago pendiente, o se consultó hace pocos segundos
  const s = await a.bank.statusQR(claim.bank_qr_id)
  if (s.paid && s.payment) return { state: await confirmFromBank(a.db, claim, s.payment) }
  return { state: s.cancelled ? 'cancelled' : 'pending' }
}

export interface CheckPaymentsResult { confirmed: number; review: number; alreadyPaid: number; checked: number; errors: number }

/** Camino 3: revisión periódica. Cubre al comprador que cerró la pantalla o cuyo teléfono pausó el navegador. */
export async function checkPayments(a: { db: PaymentsDb; bank: BanecoClient; now?: () => number }): Promise<CheckPaymentsResult> {
  const now = a.now ?? Date.now
  const r: CheckPaymentsResult = { confirmed: 0, review: 0, alreadyPaid: 0, checked: 0, errors: 0 }
  const tally = (c: ConfirmResult) => { if (c === 'paid') r.confirmed++; else if (c === 'review') r.review++; else r.alreadyPaid++ }
  const handled = new Set<string>()

  // A) Lista de pagados del día del banco (y la de ayer durante la primera hora del día)
  try {
    const boliviaHour = new Date(now() - 4 * 3600_000).getUTCHours()
    const dates = boliviaHour < 1 ? [boliviaDate(0, now()), boliviaDate(-1, now())] : [boliviaDate(0, now())]
    const paid = new Map<string, BankPayment>()
    for (const d of dates) for (const p of await a.bank.paidQR(d)) paid.set(String(p.qrId), p)
    for (const m of await a.db.paymentsByQr([...paid.keys()])) {
      try { tally(await confirmFromBank(a.db, m, paid.get(m.bank_qr_id)!)); handled.add(m.bank_qr_id) } catch (e) { r.errors++; log('confirmación', e) }
    }
  } catch (e) { r.errors++; log('lista de pagados', e) }

  // B) Camino rápido: pagos recientes aún pendientes, uno por uno (un fallo no detiene a los demás)
  for (const p of await a.db.paymentsToCheck(40)) {
    if (handled.has(p.bank_qr_id)) continue
    r.checked++
    try {
      const s = await a.bank.statusQR(p.bank_qr_id)
      if (s.paid && s.payment) tally(await confirmFromBank(a.db, p, s.payment))
    } catch (e) { r.errors++; log('consulta de estado', e) }
  }
  return r
}

/** Camino 2: aviso del banco. Se ignora el cuerpo y se pregunta al banco. Si el banco no responde, lanza error (el banco reintenta). */
export async function handleNotification(a: { db: PaymentsDb; bank: BanecoClient; body: unknown }): Promise<{ confirmed: ConfirmResult | null }> {
  const v = await a.bank.verifyNotification(a.body)
  if (!v.paid || !v.payment || !v.qrId) return { confirmed: null }
  const [match] = await a.db.paymentsByQr([v.qrId])
  if (!match) return { confirmed: null } // QR que no es de un pedido nuestro pendiente (o ya confirmado)
  return { confirmed: await confirmFromBank(a.db, match, v.payment) }
}

export interface ExpireResult { expired: number; cancelledAtBank: number; rescued: number; errors: number }

/** Vence los pedidos y anula sus QR en el banco. Si justo se había pagado, se honra el pago (pago tardío). */
export async function expireOrders(a: { db: PaymentsDb; bank: BanecoClient }): Promise<ExpireResult> {
  const r: ExpireResult = { expired: 0, cancelledAtBank: 0, rescued: 0, errors: 0 }
  for (const row of await a.db.expirePending()) {
    r.expired++
    if (!row.bank_qr_id) continue
    try {
      await a.bank.cancelQR(row.bank_qr_id)
      r.cancelledAtBank++
    } catch (e) {
      try {
        const s = await a.bank.statusQR(row.bank_qr_id)
        if (s.paid && s.payment) {
          const [m] = await a.db.paymentsByQr([row.bank_qr_id])
          if (m) { await confirmFromBank(a.db, m, s.payment); r.rescued++ }
        } else if (!s.cancelled) { r.errors++; log('anulación', e) }
      } catch (e2) { r.errors++; log('anulación', e2) }
    }
  }
  return r
}

function log(what: string, e: unknown) {
  console.error(`Cobro · error en ${what}:`, (e as Error)?.message ?? 'desconocido')
}
