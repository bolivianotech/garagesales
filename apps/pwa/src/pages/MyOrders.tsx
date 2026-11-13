import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { orderStatusLabel, type MyOrder } from '../lib/orders'
import { formatBs } from '../lib/money'

export function MyOrders() {
  const [orders, setOrders] = useState<MyOrder[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    void supabase.from('orders').select('id, short_code, status, total_cents, created_at, expires_at, receipt_token').order('created_at', { ascending: false }).limit(50)
      .then(({ data, error }) => (error ? setMsg(error.message) : setOrders(data as MyOrder[])))
  }, [])
  return (
    <div className="stack">
      <h1>Mis pedidos</h1>
      {msg && <p className="error">{msg}</p>}
      {orders?.length === 0 && <p className="muted">Aún no tienes pedidos.</p>}
      {orders?.map((o) => (
        <section key={o.id} className="card">
          <div className="row space"><strong>{o.short_code}</strong><span>{orderStatusLabel[o.status] ?? o.status}</span></div>
          <div className="row space"><span className="muted">{new Date(o.created_at).toLocaleString('es-BO')}</span><strong>{formatBs(o.total_cents)}</strong></div>
          {o.status === 'pending' && <Link to={`/pagar/${o.id}`}>Pagar ahora</Link>}
          {o.status === 'paid' && <Link to={`/comprobante/${o.receipt_token}`}>Ver comprobante y código de retiro</Link>}
        </section>
      ))}
    </div>
  )
}
