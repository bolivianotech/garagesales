import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { checkOrder, qrSrc, remaining, requestQr, type QrInfo } from '../lib/orders'
import { formatBs } from '../lib/money'

/** Pantalla de pago: muestra el QR y pregunta cada 4 s si ya se pagó (camino 1; el servidor además revisa cada minuto). */
export function Pay() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [qr, setQr] = useState<QrInfo | null>(null)
  const [order, setOrder] = useState<{ status: string; expires_at: string; short_code: string; receipt_token: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const done = useRef(false)

  async function loadOrder() {
    const { data } = await supabase.from('orders').select('status, expires_at, short_code, receipt_token').eq('id', id).maybeSingle()
    if (data) {
      setOrder(data)
      if (data.status === 'paid' && !done.current) { done.current = true; nav(`/comprobante/${data.receipt_token}`, { replace: true }) }
    }
    return data
  }

  useEffect(() => {
    let stop = false
    void (async () => {
      const o = await loadOrder()
      if (stop || !o || o.status !== 'pending') return
      try { setQr(await requestQr(id)) } catch (e) { setMsg((e as Error).message) }
    })()
    const poll = setInterval(() => {
      void (async () => {
        if (done.current) return
        try { await checkOrder(id) } catch { /* se reintenta en el próximo ciclo */ }
        await loadOrder()
      })()
    }, 4000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => { stop = true; clearInterval(poll); clearInterval(tick) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const expired = order && (order.status === 'expired' || (order.status === 'pending' && Date.parse(order.expires_at) <= now))
  return (
    <div className="stack">
      <h1>Pagar pedido {order?.short_code}</h1>
      {msg && <p className="error">{msg}</p>}
      {order?.status === 'review' && <p className="card">Tu pago llegó pero necesita revisión del administrador (monto distinto o producto agotado). Te contactaremos.</p>}
      {expired && <p className="card">Este pedido venció. <Link to="/">Volver al catálogo</Link></p>}
      {qr && order?.status === 'pending' && !expired && (
        <section className="card" style={{ alignItems: 'center' }}>
          <strong style={{ fontSize: '1.6rem' }}>{formatBs(qr.amount_cents)}</strong>
          <img src={qrSrc(qr.qr_image)} alt="Código QR de pago" style={{ width: 260, maxWidth: '100%', background: '#fff', padding: 8, borderRadius: 8 }} />
          <p className="muted">Escanéalo con la app de cualquier banco. Vence en {remaining(order.expires_at, now)}.</p>
          <p className="muted">Esta pantalla se actualiza sola cuando el pago llega.</p>
        </section>
      )}
      {!qr && !msg && !expired && order?.status === 'pending' && <p className="muted">Generando tu QR…</p>}
      <Link to="/mis-pedidos">Mis pedidos</Link>
    </div>
  )
}
