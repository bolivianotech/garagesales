import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/cuenta" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const res =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { name } } })
    setBusy(false)
    if (res.error) setMsg(res.error.message)
    else if (mode === 'register' && !res.data.session) setMsg('Revisa tu correo para confirmar la cuenta.')
  }

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/cuenta' } })
  }

  return (
    <form onSubmit={submit} className="card">
      <h1>{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</h1>
      {mode === 'register' && (
        <label>
          Nombre completo
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </label>
      )}
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>
      <button disabled={busy}>{mode === 'login' ? 'Ingresar' : 'Registrarme'}</button>
      <button type="button" className="secondary" onClick={google}>
        Continuar con Google
      </button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
      </button>
      {msg && <p className="error">{msg}</p>}
    </form>
  )
}
