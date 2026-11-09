import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIES, firstImage, type Product } from '../lib/products'
import { formatBs } from '../lib/money'
import { addLine, loadCart, saveCart } from '../lib/cart'

/** Catálogo público básico (la búsqueda avanzada y el carrito llegan con la spec 003). */
export function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      let query = supabase
        .from('products')
        .select('*, product_images(path, position), stores(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(48)
      if (category) query = query.eq('category', category)
      const term = q.trim().replace(/[%,()]/g, ' ')
      if (term) query = query.ilike('title', `%${term}%`)
      const { data, error } = await query
      if (cancelled) return
      if (error) setMsg(error.message)
      else {
        setMsg(null)
        setProducts(data as unknown as Product[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [category, q])

  return (
    <div className="stack">
      <h1>GarageSales</h1>
      <input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar productos" />
      <div className="chips">
        <button className={category === '' ? '' : 'secondary'} onClick={() => setCategory('')}>
          Todo
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.value} className={category === c.value ? '' : 'secondary'} onClick={() => setCategory(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
      {msg && <p className="error">{msg}</p>}
      {loading && <p className="muted">Cargando…</p>}
      {!loading && products.length === 0 && <p className="muted">No hay productos publicados todavía.</p>}
      <div className="grid">
        {products.map((p) => {
          const img = firstImage(p)
          return (
            <article key={p.id} className="tile">
              {img ? <img src={img} alt={p.title} loading="lazy" /> : <div className="ph">Sin foto</div>}
              <strong>{formatBs(p.price_cents)}</strong>
              <span>{p.title}</span>
              <span className="muted">
                {p.stores?.name ?? ''}
                {p.size ? ` · Talla ${p.size}` : ''}
              </span>
              <button onClick={() => { saveCart(addLine(loadCart(), p.id, 1, p.stock)); setAdded(p.id); setTimeout(() => setAdded(null), 1200) }}>
                {added === p.id ? 'Agregado ✓' : 'Agregar al carrito'}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
