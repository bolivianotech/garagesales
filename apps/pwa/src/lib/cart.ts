// Carrito del comprador (FR-022). Vive en el navegador; el precio y el total los decide el servidor al crear el pedido (FR-013).
export interface CartLine { product_id: string; qty: number }
export const MAX_QTY = 50
export const MAX_LINES = 30
const KEY = 'garagesales.cart.v1'

export function addLine(cart: CartLine[], productId: string, qty = 1, stock = MAX_QTY): CartLine[] {
  const limit = Math.max(1, Math.min(MAX_QTY, stock))
  const found = cart.find((l) => l.product_id === productId)
  if (found) return cart.map((l) => (l.product_id === productId ? { ...l, qty: Math.min(limit, l.qty + qty) } : l))
  if (cart.length >= MAX_LINES) return cart
  return [...cart, { product_id: productId, qty: Math.min(limit, Math.max(1, qty)) }]
}
export function setQty(cart: CartLine[], productId: string, qty: number, stock = MAX_QTY): CartLine[] {
  if (!Number.isInteger(qty) || qty < 1) return cart.filter((l) => l.product_id !== productId)
  return cart.map((l) => (l.product_id === productId ? { ...l, qty: Math.min(Math.max(1, Math.min(MAX_QTY, stock)), qty) } : l))
}
export const removeLine = (cart: CartLine[], productId: string): CartLine[] => cart.filter((l) => l.product_id !== productId)
export const countItems = (cart: CartLine[]): number => cart.reduce((n, l) => n + l.qty, 0)
/** Total en centavos enteros, solo para mostrar: el servidor lo recalcula. */
export const totalCents = (cart: CartLine[], prices: Record<string, number>): number =>
  cart.reduce((sum, l) => sum + (prices[l.product_id] ?? 0) * l.qty, 0)

export function loadCart(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((l) => typeof l?.product_id === 'string' && Number.isInteger(l?.qty) && l.qty >= 1).slice(0, MAX_LINES)
  } catch { return [] }
}
export function saveCart(cart: CartLine[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); window.dispatchEvent(new Event('cart-changed')) } catch { /* sin almacenamiento */ }
}
