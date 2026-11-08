import { test, expect } from '@playwright/test'

// E2E-01 y E2E-02: no necesitan cuentas ni base de datos real. Sirven como prueba humo antes y después de cada despliegue.

test('E2E-01 @smoke la aplicación carga y muestra el catálogo público', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'GarageSales' })).toBeVisible()
  await expect(page.getByPlaceholder('Buscar…')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ropa' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible()
})

test('E2E-02 @smoke las áreas privadas llevan a "Ingresar" sin sesión', async ({ page }) => {
  for (const ruta of ['/cuenta', '/vender', '/admin']) {
    await page.goto(ruta)
    await expect(page).toHaveURL(/\/ingresar$/)
    await expect(page.getByRole('heading', { name: 'Ingresar' })).toBeVisible()
  }
})

test('E2E-03 @smoke el formulario alterna entre ingresar y crear cuenta', async ({ page }) => {
  await page.goto('/ingresar')
  await page.getByRole('button', { name: '¿No tienes cuenta? Regístrate' }).click()
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  await expect(page.getByLabel('Nombre completo')).toBeVisible()
  await page.getByRole('button', { name: '¿Ya tienes cuenta? Ingresa' }).click()
  await expect(page.getByRole('heading', { name: 'Ingresar' })).toBeVisible()
})

test('E2E-04 @smoke una dirección desconocida vuelve al inicio', async ({ page }) => {
  await page.goto('/esto-no-existe')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'GarageSales' })).toBeVisible()
})

test('E2E-05 @smoke el botón de Google no se muestra hasta configurarlo', async ({ page }) => {
  await page.goto('/ingresar')
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toHaveCount(0)
})
