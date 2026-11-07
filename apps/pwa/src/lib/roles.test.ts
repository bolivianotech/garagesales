import { describe, expect, it } from 'vitest'
import { canAccess, canBuy, type Profile } from './roles'

const base: Profile = { id: '1', name: 'Ana Perez', phone: '70000000', role: 'buyer', suspended: false }

describe('roles (FR-004, FR-005, FR-002)', () => {
  it('FR-004: un comprador no accede a vender ni a administrar', () => {
    expect(canAccess('sell', base)).toBe(false)
    expect(canAccess('admin', base)).toBe(false)
  })
  it('FR-004: solo seller vende, solo admin administra, solo finance_admin finanzas', () => {
    expect(canAccess('sell', { ...base, role: 'seller' })).toBe(true)
    expect(canAccess('admin', { ...base, role: 'admin' })).toBe(true)
    expect(canAccess('finance', { ...base, role: 'finance_admin' })).toBe(true)
    expect(canAccess('admin', { ...base, role: 'finance_admin' })).toBe(false)
  })
  it('FR-005: un usuario suspendido no accede a nada', () => {
    expect(canAccess('account', { ...base, suspended: true })).toBe(false)
    expect(canBuy({ ...base, suspended: true })).toBe(false)
  })
  it('FR-002: comprar exige nombre y teléfono', () => {
    expect(canBuy(base)).toBe(true)
    expect(canBuy({ ...base, phone: '' })).toBe(false)
    expect(canBuy({ ...base, name: ' ' })).toBe(false)
    expect(canBuy(null)).toBe(false)
  })
})
