export type UserRole = 'buyer' | 'seller' | 'admin' | 'finance_admin'
export type StoreStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Profile {
  id: string
  name: string
  phone: string
  role: UserRole
  suspended: boolean
}

export interface Store {
  id: string
  owner_id: string
  name: string
  description: string
  seller_kind: 'individual' | 'tiktok_live' | 'negocio'
  pickup_info: string
  status: StoreStatus
  review_reason: string | null
}

/** FR-004/FR-005: qué roles pueden entrar a cada área. La seguridad real está en RLS; esto solo guía la interfaz. */
export function canAccess(area: 'account' | 'sell' | 'admin' | 'finance', profile: Profile | null): boolean {
  if (!profile || profile.suspended) return false
  switch (area) {
    case 'account':
      return true
    case 'sell':
      return profile.role === 'seller'
    case 'admin':
      return profile.role === 'admin'
    case 'finance':
      return profile.role === 'finance_admin'
  }
}

/** FR-002: para comprar se exige nombre y teléfono. */
export function canBuy(profile: Profile | null): boolean {
  return !!profile && !profile.suspended && profile.name.trim().length > 1 && profile.phone.trim().length >= 7
}

export const storeStatusLabel: Record<StoreStatus, string> = {
  pending: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  suspended: 'Suspendida',
}
