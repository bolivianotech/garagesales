import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { imageUrl } from '../lib/products'
import { formatBs } from '../lib/money'

interface Item { sku: string; title: string; qty: number; unit_price_cents: number; image_path: string | null }
interface Receipt {
  code: string; paid_at: string; total_cents: number; buyer_name: string
  payer: { name: string | null; bank_name: string | null; bank_code: string | null; account: string | null }
  stores: { store_name: string; pickup_info: string; pickup_code: string; pickup_status: string; items: Item[] }[]
}

/** Comprobante digital por enlace (FR-083) con el código de retiro de cada tienda (FR-073). Público: el enlace lleva un token secreto. */
export function Receipt() {
  const { token = '' } = useParams()
  const [r, setR] = useState<Receipt | null | undefined>(undefined)
  useEffect(() => {
    void supabase.rpc('get_receipt', { p_token: token }).then(({ data }) => setR((data as Receipt | null) ?? null))
  }, [token])
  if (r === undefined) return <p className="muted">Cargando comprobante…</p>
  if (r === null) return <p className="error">Comprobante no encontrado o el pedido aún no está pagado.</p>
  return (
    <div className="stack">
      <section className="card">
        <h1>Comprobante {r.code}</h1>
        <p>Pagado el {new Date(r.paid_at).toLocaleString('es-BO')}</p>
        <p><strong>Total {formatBs(r.total_cents)}</strong></p>
        <p className="muted">Comprador: {r.buyer_name}<br />Pagó: {r.payer.name ?? '—'}{r.payer.bank_name ? ` · ${r.payer.bank_name}` : ''}{r.payer.account ? ` · ${r.payer.account}` : ''}</p>
        <button className="secondary" onClick={() => window.print()}>Imprimir / guardar PDF</button>
      </section>
      {r.stores.map((s) => (
        <section key={s.store_name} className="card">
          <h2>{s.store_name}</h2>
          <p className="muted">Retiro: {s.pickup_info || 'a coordinar con el vendedor'}</p>
          <p>Código de retiro: <strong style={{ fontSize: '1.6rem', letterSpacing: 3 }}>{s.pickup_code}</strong> {s.pickup_status === 'delivered' && '· Entregado'}</p>
          {s.items.map((i) => (
            <div key={i.sku + i.title} className="row space">
              <div className="row">{i.image_path && <img src={imageUrl(i.image_path)} alt="" width={48} height={48} style={{ objectFit: 'cover', borderRadius: 8 }} />}<span>{i.qty}× {i.title} <span className="muted">({i.sku})</span></span></div>
              <span>{formatBs(i.unit_price_cents * i.qty)}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
