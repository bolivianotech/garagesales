import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { firstImage, statusLabel, type Product } from '../lib/products'
import { formatBs } from '../lib/money'

export function SellerDashboard() {
  const { store } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!store) return
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(path, position)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
    if (error) setMsg(error.message)
    else setProducts(data as Product[])
    setLoading(false)
  }, [store])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(p: Product, status: 'active' | 'paused') {
    const { error } = await supabase.from('products').update({ status }).eq('id', p.id)
    setMsg(error ? error.message : null)
    await load()
  }

  const drafts = products.filter((p) => p.status === 'draft')
  const incomplete = drafts.filter((p) => p.price_cents === 0).length

  return (
    <div className="stack">
      <div className="row space">
        <h1>Mis productos</h1>
        <div className="row">
          <Link className="btn" to="/vender/producto">
            Nuevo producto
          </Link>
          <Link className="btn secondary" to="/vender/carga-rapida">
            Carga rápida
          </Link>
          <Link className="btn secondary" to="/vender/entregas">
            Por entregar
          </Link>
        </div>
      </div>
      {store && <p className="muted">Tienda: {store.name}</p>}
      {incomplete > 0 && (
        <p className="notice">
          Tienes {incomplete} borrador{incomplete > 1 ? 'es' : ''} sin precio. Ábrelos para completar precio y cantidad.
        </p>
      )}
      {msg && <p className="error">{msg}</p>}
      {loading && <p className="muted">Cargando…</p>}
      {!loading && products.length === 0 && <p className="muted">Aún no tienes productos. Empieza con “Carga rápida”.</p>}

      {products.map((p) => {
        const img = firstImage(p)
        return (
          <article key={p.id} className="item">
            {img ? <img src={img} alt="" loading="lazy" /> : <div className="ph">Sin foto</div>}
            <div className="grow">
              <strong>{p.title}</strong>
              <p className="muted">
                {p.sku} · {p.price_cents > 0 ? formatBs(p.price_cents) : 'Sin precio'} · Cantidad {p.stock}
              </p>
              <p className={`tag ${p.hidden ? 'warn' : ''}`}>{p.hidden ? 'Ocultado por el administrador' : statusLabel[p.status]}</p>
              <div className="row">
                <Link to={`/vender/producto/${p.id}`}>{p.status === 'draft' ? 'Completar' : 'Editar'}</Link>
                {p.status === 'active' && (
                  <button className="link" onClick={() => void setStatus(p, 'paused')}>
                    Pausar
                  </button>
                )}
                {p.status === 'paused' && (
                  <button className="link" onClick={() => void setStatus(p, 'active')}>
                    Publicar
                  </button>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
