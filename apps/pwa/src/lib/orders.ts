import { supabase } from './supabase'

export interface CreatedOrder { id: string; code: string; totalCents: number }

export async function createOrder(items: { product_id: string; qty: number }[]): Promise<CreatedOrder> {
  const { data, error } = await supabase.rpc('create_order', { p_items: items })
  if (error) throw new Error(error.message)
  const r = (data as { new_order_id: string; new_short_code: string; new_total_cents: number }[])[0]
  return { id: r.new_order_id, code: r.new_short_code, totalCents: r.new_total_cents }
}

export interface QrInfo { qr_image: string; amount_cents: number; due_date: string | null; status: 'pending' }

async function callFunction<T>(name: string, orderId: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: { order_id: orderId } })
  if (error) {
    // supabase-js entrega el cuerpo de la respuesta de error en error.context
    let detail = error.message
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) detail = j.error } catch { /* sin detalle */ }
    throw new Error(detail)
  }
  return data as T
}
export const requestQr = (orderId: string) => callFunction<QrInfo>('create-qr', orderId)
export const checkOrder = (orderId: string) => callFunction<{ order_status: string; state: string }>('check-order', orderId)

export const qrSrc = (b64: string) => (b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`)

export interface MyOrder { id: string; short_code: string; status: string; total_cents: number; created_at: string; expires_at: string; receipt_token: string }
export const orderStatusLabel: Record<string, string> = {
  pending: 'Esperando pago', paid: 'Pagado', expired: 'Vencido', review: 'En revisión', cancelled: 'Cancelado',
}

/** Tiempo restante como mm:ss o "Xh Ym". */
export function remaining(expiresAt: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000))
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
