// Base de datos en memoria que imita las reglas de confirm_payment (la real está probada en supabase/tests/*.sql).
import type { ConfirmResult, OrderRow, PaymentsDb, PendingPayment, StoredPayment } from '../_shared/payments.ts'

interface Pay { id: string; orderId: string; qrId: string; amountCents: number; status: 'pending' | 'paid' | 'cancelled'; qrImage: string; dueDate: string; lastChecked: number }

export class FakeDb implements PaymentsDb {
  orders = new Map<string, OrderRow & { items: { sku: string; qty: number }[] }>()
  pays: Pay[] = []
  confirmCalls: Parameters<PaymentsDb['confirmPayment']>[0][] = []
  clock = () => Date.now()
  minAgeMs = 20_000

  addOrder(id: string, code: string, totalCents: number, items = [{ sku: 'SKU-1', qty: 1 }], expiresInMs = 15 * 60_000) {
    this.orders.set(id, { id, short_code: code, status: 'pending', total_cents: totalCents, expires_at: new Date(Date.now() + expiresInMs).toISOString(), items })
  }
  async getBuyerOrder(id: string) { return this.orders.get(id) ?? null }
  async getOrderItems(id: string) { return this.orders.get(id)?.items ?? [] }
  async getStoredPayment(id: string): Promise<StoredPayment | null> {
    const p = this.pays.filter((x) => x.orderId === id).at(-1)
    return p ? { bank_qr_id: p.qrId, qr_image: p.qrImage, payment_status: p.status, due_date: p.dueDate, amount_cents: p.amountCents } : null
  }
  async registerQr(p: { orderId: string; qrId: string; amountCents: number; qrImage: string; dueDate: string }) {
    this.pays.push({ id: `pay-${this.pays.length + 1}`, orderId: p.orderId, qrId: p.qrId, amountCents: p.amountCents, status: 'pending', qrImage: p.qrImage, dueDate: p.dueDate, lastChecked: 0 })
  }
  async confirmPayment(p: Parameters<PaymentsDb['confirmPayment']>[0]): Promise<ConfirmResult> {
    this.confirmCalls.push(p)
    const pay = this.pays.find((x) => x.qrId === p.qrId)!
    const order = this.orders.get(p.orderId)!
    if (pay.status === 'paid') return 'already_paid'
    if (p.amountCents !== pay.amountCents) { order.status = 'review'; return 'review' }
    pay.status = 'paid'; order.status = 'paid'
    return 'paid'
  }
  private pend(p: Pay): PendingPayment { return { payment_id: p.id, order_id: p.orderId, bank_qr_id: p.qrId, amount_cents: p.amountCents } }
  private claimable(p: Pay, ageMs: number) {
    return p.status === 'pending' && this.orders.get(p.orderId)?.status === 'pending' && this.clock() - p.lastChecked >= ageMs
  }
  async claimOrderCheck(orderId: string) {
    const p = this.pays.filter((x) => x.orderId === orderId && this.claimable(x, 3000)).at(-1)
    if (!p) return null
    p.lastChecked = this.clock(); return this.pend(p)
  }
  async paymentsToCheck(limit: number) {
    const r = this.pays.filter((x) => this.claimable(x, this.minAgeMs)).slice(0, limit)
    r.forEach((p) => (p.lastChecked = this.clock())); return r.map((p) => this.pend(p))
  }
  async paymentsByQr(ids: string[]) {
    return this.pays.filter((p) => ids.includes(p.qrId) && (p.status === 'pending' || p.status === 'cancelled') && ['pending', 'review', 'expired'].includes(this.orders.get(p.orderId)!.status)).map((p) => this.pend(p))
  }
  async expirePending() {
    const out: { order_id: string; bank_qr_id: string | null }[] = []
    for (const o of this.orders.values()) {
      if (o.status === 'pending' && Date.parse(o.expires_at) <= Date.now()) {
        o.status = 'expired'
        const p = this.pays.filter((x) => x.orderId === o.id).at(-1)
        if (p) p.status = 'cancelled'
        out.push({ order_id: o.id, bank_qr_id: p?.qrId ?? null })
      }
    }
    return out
  }
}
