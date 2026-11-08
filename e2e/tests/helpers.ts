import { expect, type Page } from '@playwright/test'

export type Role = 'BUYER' | 'BUYER2' | 'VENDOR' | 'VENDOR2' | 'ADMIN' | 'FINANCE'

/** Cuentas de prueba por variables de entorno: E2E_<ROL>_EMAIL y E2E_<ROL>_PASSWORD. Nunca en el repositorio. */
export function creds(role: Role): { email: string; password: string } | null {
  const email = process.env[`E2E_${role}_EMAIL`]
  const password = process.env[`E2E_${role}_PASSWORD`]
  return email && password ? { email, password } : null
}

export function requireCreds(role: Role) {
  const c = creds(role)
  if (!c) throw new Error(`Faltan E2E_${role}_EMAIL y E2E_${role}_PASSWORD`)
  return c
}

export async function login(page: Page, role: Role) {
  const { email, password } = requireCreds(role)
  await page.goto('/ingresar')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page).toHaveURL(/\/cuenta$/)
}

/** PNG de 1x1 válido para subir como foto de prueba sin depender de archivos externos. */
export function tinyPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  )
}

export const stamp = () => new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
