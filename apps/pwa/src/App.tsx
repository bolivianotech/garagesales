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
import { Cart } from './pages/Cart'
import { Pay } from './pages/Pay'
import { MyOrders } from './pages/MyOrders'
import { Receipt } from './pages/Receipt'
import { SellerPickups } from './pages/SellerPickups'
import { countItems, loadCart } from './lib/cart'
import { useEffect, useState } from 'react'
import { isConfigured } from './lib/supabase'

export function App() {
  const { session } = useAuth()
  const [items, setItems] = useState(() => countItems(loadCart()))
  useEffect(() => {
    const on = () => setItems(countItems(loadCart()))
    window.addEventListener('cart-changed', on)
    return () => window.removeEventListener('cart-changed', on)
  }, [])
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand">
          GarageSales
        </Link>
        <nav>
          <Link to="/carrito">Carrito{items > 0 ? ` (${items})` : ''}</Link>
          {session && <Link to="/mis-pedidos">Mis pedidos</Link>}
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
          <Route path="/carrito" element={<Cart />} />
          <Route path="/comprobante/:token" element={<Receipt />} />
          <Route path="/pagar/:id" element={<RequireRole area="account"><Pay /></RequireRole>} />
          <Route path="/mis-pedidos" element={<RequireRole area="account"><MyOrders /></RequireRole>} />
          <Route path="/vender/entregas" element={<RequireRole area="sell"><SellerPickups /></RequireRole>} />
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
