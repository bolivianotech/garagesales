import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { storeStatusLabel, type Store, type StoreStatus } from '../lib/roles'

export function Admin() {
  const [stores, setStores] = useState<Store[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    if (error) setMsg(error.message)
    else setStores(data as Store[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function review(id: string, decision: Exclude<StoreStatus, 'pending'>) {
    const reason = decision === 'approved' ? null : window.prompt('Motivo (obligatorio):')
    if (decision !== 'approved' && !reason) return
    const { error } = await supabase.rpc('admin_review_store', { p_store_id: id, p_decision: decision, p_reason: reason })
    setMsg(error ? error.message : 'Listo.')
    await load()
  }

  return (
    <div className="stack">
      <h1>Vendedores</h1>
      {msg && <p className="muted">{msg}</p>}
      {stores.map((s) => (
        <article key={s.id} className="card">
          <h2>{s.name}</h2>
          <p className="muted">
            {s.seller_kind} · {storeStatusLabel[s.status]}
          </p>
          <p>{s.pickup_info}</p>
          <div className="row">
            {s.status !== 'approved' && <button onClick={() => void review(s.id, 'approved')}>Aprobar</button>}
            {s.status === 'pending' && (
              <button className="secondary" onClick={() => void review(s.id, 'rejected')}>
                Rechazar
              </button>
            )}
            {s.status === 'approved' && (
              <button className="secondary" onClick={() => void review(s.id, 'suspended')}>
                Suspender
              </button>
            )}
          </div>
        </article>
      ))}
      {stores.length === 0 && <p className="muted">No hay solicitudes.</p>}
    </div>
  )
}
