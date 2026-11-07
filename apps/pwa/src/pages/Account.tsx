import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { storeStatusLabel } from '../lib/roles'

export function Account() {
  const { profile, store, session, refresh, signOut } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [msg, setMsg] = useState<string | null>(null)

  const [storeName, setStoreName] = useState('')
  const [kind, setKind] = useState<'individual' | 'tiktok_live' | 'negocio'>('individual')
  const [pickup, setPickup] = useState('')

  if (!profile || !session) return <p className="muted">Cargando perfil…</p>

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('profiles').update({ name, phone }).eq('id', profile!.id)
    setMsg(error ? error.message : 'Datos guardados.')
    await refresh()
  }

  async function requestSeller(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('stores')
      .insert({ owner_id: profile!.id, name: storeName, seller_kind: kind, pickup_info: pickup })
    setMsg(error ? error.message : 'Solicitud enviada. El administrador la revisará.')
    await refresh()
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Mi cuenta</h1>
        <p className="muted">{session.user.email}</p>
        <form onSubmit={saveProfile} className="stack">
          <label>
            Nombre completo
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </label>
          <label>
            Teléfono (WhatsApp)
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required minLength={7} />
          </label>
          <button>Guardar</button>
        </form>
      </section>

      <section className="card">
        <h2>Vender</h2>
        {!store && (
          <form onSubmit={requestSeller} className="stack">
            <p className="muted">Solicita ser vendedor. El administrador debe aprobarte para publicar.</p>
            <label>
              Nombre de tu tienda
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required minLength={2} maxLength={80} />
            </label>
            <label>
              Tipo de vendedor
              <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="individual">Persona (vendo mis cosas)</option>
                <option value="tiktok_live">Revendedor de TikTok Live</option>
                <option value="negocio">Negocio</option>
              </select>
            </label>
            <label>
              Dónde y cuándo se retira
              <textarea value={pickup} onChange={(e) => setPickup(e.target.value)} rows={2} />
            </label>
            <button>Solicitar ser vendedor</button>
          </form>
        )}
        {store && (
          <p>
            Tienda <strong>{store.name}</strong>: {storeStatusLabel[store.status]}
            {store.review_reason ? ` — ${store.review_reason}` : ''}
          </p>
        )}
        {profile.role === 'seller' && <Link to="/vender">Ir a mi panel de vendedor</Link>}
        {profile.role === 'admin' && <Link to="/admin">Ir al panel de administración</Link>}
      </section>

      {msg && <p className="muted">{msg}</p>}
      <button className="secondary" onClick={() => void signOut()}>
        Cerrar sesión
      </button>
    </div>
  )
}
