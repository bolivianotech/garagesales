import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { RequireRole } from './auth/RequireRole'
import { Login } from './pages/Login'
import { Account } from './pages/Account'
import { Admin } from './pages/Admin'
import { isConfigured } from './lib/supabase'

function Home() {
  return (
    <section className="card">
      <h1>GarageSales</h1>
      <p>Compra y vende de todo, con pago por QR y retiro en persona.</p>
      <p className="muted">El catálogo llegará en la siguiente fase.</p>
    </section>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="card">
      <h1>{title}</h1>
      <p className="muted">Disponible en una fase próxima.</p>
    </section>
  )
}

export function App() {
  const { session } = useAuth()
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand">
          GarageSales
        </Link>
        <nav>
          <Link to={session ? '/cuenta' : '/ingresar'}>{session ? 'Mi cuenta' : 'Ingresar'}</Link>
        </nav>
      </header>
      <main>
        {!isConfigured && (
          <p className="error">Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver .env.example).</p>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ingresar" element={<Login />} />
          <Route
            path="/cuenta"
            element={
              <RequireRole area="account">
                <Account />
              </RequireRole>
            }
          />
          <Route
            path="/vender"
            element={
              <RequireRole area="sell">
                <Placeholder title="Panel de vendedor" />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole area="admin">
                <Admin />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
