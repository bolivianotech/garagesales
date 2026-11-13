import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { imageUrl } from '../lib/products'
import { formatBs } from '../lib/money'

interface Row {
  pickup_id: string; order_code: string; buyer_name: string; buyer_phone: string; payer_name: string | null; payer_bank_code: string | null
  paid_at: string; pickup_status: string; items: { sku: string; title: string; qty: number; unit_price_cents: number; image_path: string | null }[]
}

/** "Por entregar" del vendedor (FR-071/FR-074): confirma la entrega ingresando el código que muestra el comprador. */
export function SellerPickups() {
  const [rows, setRows] = useState<Row[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('seller_pickups', { p_status: 'ready' })
    if (error) setMsg(error.message); else setRows(data as Row[])
  }, [])
  useEffect(() => { void load() }, [load])

  async function deliver(id: string) {
    setMsg(null)
    const { error } = await supabase.rpc('mark_pickup_delivered', { p_pickup_id: id, p_code: codes[id] ?? '' })
    if (error) setMsg(error.message); else { setMsg('Entrega registrada.'); await load() }
  }
  return (
    <div className="stack">
      <div className="row space"><h1>Por entregar</h1><Link to="/vender">Volver</Link></div>
      {msg && <p className={msg === 'Entrega registrada.' ? 'muted' : 'error'}>{msg}</p>}
      {rows.length === 0 && <p className="muted">No hay pedidos pagados esperando retiro.</p>}
      {rows.map((r) => (
        <section key={r.pickup_id} className="card">
          <div className="row space"><strong>{r.order_code}</strong><span className="muted">{new Date(r.paid_at).toLocaleDateString('es-BO')}</span></div>
          <p>{r.buyer_name} · {r.buyer_phone}{r.payer_name && r.payer_name !== r.buyer_name ? <><br /><span className="muted">Pagó: {r.payer_name} (banco {r.payer_bank_code})</span></> : null}</p>
          {r.items.map((i) => (
            <div key={i.sku} className="row space">
              <div className="row">{i.image_path && <img src={imageUrl(i.image_path)} alt="" width={48} height={48} style={{ objectFit: 'cover', borderRadius: 8 }} />}<span>{i.qty}× {i.title} <span className="muted">({i.sku})</span></span></div>
              <span>{formatBs(i.unit_price_cents * i.qty)}</span>
            </div>
          ))}
          <div className="row">
            <input placeholder="Código de retiro" value={codes[r.pickup_id] ?? ''} onChange={(e) => setCodes({ ...codes, [r.pickup_id]: e.target.value })} aria-label="Código de retiro" />
            <button onClick={() => void deliver(r.pickup_id)}>Entregar</button>
          </div>
        </section>
      ))}
    </div>
  )
}
