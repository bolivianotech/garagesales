import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { RequireRole } from './auth/RequireRole'
import { Login } from './pages/Login'
import { Account } from './pages/Account'
import { Admin } from './pages/Admin'
import { Catalog } from './pages/Catalog'
import { SellerDashboard } from './pages/SellerDashboard'
import { ProductForm } from './pages/ProductForm'
import { QuickUpload } from './pages/QuickUpload'
import { isConfigured } from './lib/supabase'

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
          <Route path="/" element={<Catalog />} />
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
                <SellerDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/vender/producto/:id?"
            element={
              <RequireRole area="sell">
                <ProductForm />
              </RequireRole>
            }
          />
          <Route
            path="/vender/carga-rapida"
            element={
              <RequireRole area="sell">
                <QuickUpload />
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
