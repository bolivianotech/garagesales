import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { canAccess } from '../lib/roles'

export function RequireRole({ area, children }: { area: 'account' | 'sell' | 'admin' | 'finance'; children: ReactNode }) {
  const { loading, session, profile } = useAuth()
  if (loading) return <p className="muted">Cargando…</p>
  if (!session) return <Navigate to="/ingresar" replace />
  if (!canAccess(area, profile)) return <Navigate to="/cuenta" replace />
  return <>{children}</>
}
