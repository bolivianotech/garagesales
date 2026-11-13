import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { loadCart, removeLine, saveCart, setQty, totalCents, type CartLine } from '../lib/cart'
import { firstImage, type Product } from '../lib/products'
import { formatBs } from '../lib/money'
import { createOrder } from '../lib/orders'

export function Cart() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [cart, setCart] = useState<CartLine[]>(loadCart)
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const ids = cart.map((l) => l.product_id)
    if (!ids.length) return
    void supabase.from('products').select('*, product_images(path, position), stores(name)').in('id', ids).then(({ data }) => {
      setProducts(Object.fromEntries(((data ?? []) as unknown as Product[]).map((p) => [p.id, p])))
    })
  }, [cart])

  const update = (next: CartLine[]) => { setCart(next); saveCart(next) }
  const unavailable = cart.filter((l) => products[l.product_id] && products[l.product_id].status !== 'active')
  const prices = Object.fromEntries(Object.values(products).map((p) => [p.id, p.price_cents]))
  const total = totalCents(cart, prices)

  async function pay() {
    if (!session) return nav('/ingresar')
    setBusy(true); setMsg(null)
    try {
      const order = await createOrder(cart)
      update([])
      nav(`/pagar/${order.id}`)
    } catch (e) {
      setMsg((e as Error).message)
    } finally { setBusy(false) }
  }

  if (!cart.length) return <div className="stack"><h1>Tu carrito</h1><p className="muted">Está vacío. <Link to="/">Ver productos</Link></p></div>
  return (
    <div className="stack">
      <h1>Tu carrito</h1>
      {cart.map((l) => {
        const p = products[l.product_id]
        const img = p ? firstImage(p) : null
        return (
          <section key={l.product_id} className="card">
            <div className="row space">
              <div className="row">
                {img && <img src={img} alt="" width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />}
                <div><strong>{p?.title ?? 'Cargando…'}</strong><div className="muted">{p?.stores?.name}</div></div>
              </div>
              <strong>{p ? formatBs(p.price_cents * l.qty) : ''}</strong>
            </div>
            <div className="row space">
              <div className="row">
                <button className="secondary" aria-label="Menos" onClick={() => update(setQty(cart, l.product_id, l.qty - 1, p?.stock))}>−</button>
                <span>{l.qty}</span>
                <button className="secondary" aria-label="Más" onClick={() => update(setQty(cart, l.product_id, l.qty + 1, p?.stock))}>+</button>
              </div>
              <button className="secondary" onClick={() => update(removeLine(cart, l.product_id))}>Quitar</button>
            </div>
          </section>
        )
      })}
      {unavailable.length > 0 && <p className="error">Algún producto ya no está disponible. Quítalo para continuar.</p>}
      <section className="card">
        <div className="row space"><span>Total</span><strong>{formatBs(total)}</strong></div>
        <p className="muted">Se retira en persona. Sin reserva: el producto es de quien paga primero.</p>
        {msg && <p className="error">{msg}</p>}
        <button disabled={busy || unavailable.length > 0} onClick={() => void pay()}>{busy ? 'Creando pedido…' : session ? 'Pagar con QR' : 'Ingresar para pagar'}</button>
      </section>
    </div>
  )
}
