import { test, expect } from '@playwright/test'
import { creds, login, stamp, tinyPng } from './helpers'

// @live: necesitan el sitio con su base de datos real y cuentas de prueba (variables E2E_*). No se ejecutaron en el
// entorno de desarrollo del asistente (no alcanza Supabase); se ejecutan contra certificación antes del lanzamiento.

test.describe('@live roles y publicación', () => {
  test('E2E-10 @live cada rol ve solo lo suyo', async ({ page }) => {
    test.skip(!creds('BUYER') || !creds('VENDOR') || !creds('ADMIN'), 'Faltan cuentas E2E_BUYER, E2E_VENDOR y E2E_ADMIN')

    await login(page, 'BUYER')
    await expect(page.getByRole('link', { name: 'Ir a mi panel de vendedor' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ir al panel de administración' })).toHaveCount(0)
    await page.goto('/vender')
    await expect(page).toHaveURL(/\/cuenta$/)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/cuenta$/)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await login(page, 'VENDOR')
    await expect(page.getByRole('link', { name: 'Ir a mi panel de vendedor' })).toBeVisible()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/cuenta$/)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await login(page, 'ADMIN')
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Vendedores' })).toBeVisible()
  })

  test('E2E-11 @live el vendedor publica, aparece en el catálogo, pausa y desaparece', async ({ page, browser }) => {
    test.skip(!creds('VENDOR'), 'Falta la cuenta E2E_VENDOR (aprobada como vendedor)')
    const title = `E2E ${stamp()}`

    await login(page, 'VENDOR')
    await page.goto('/vender/producto')
    await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: tinyPng() })
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Precio (Bs)').fill('0,01')
    await page.getByLabel('Cantidad').fill('1')
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(page).toHaveURL(/\/vender$/)
    const card = page.locator('article', { hasText: title })
    await expect(card).toContainText('Publicado')

    const publico = await (await browser.newContext()).newPage()
    await publico.goto('/')
    await publico.getByPlaceholder('Buscar…').fill(title)
    await expect(publico.getByText(title)).toBeVisible()

    await card.getByRole('button', { name: 'Pausar' }).click()
    await expect(card).toContainText('Pausado')
    await publico.reload()
    await publico.getByPlaceholder('Buscar…').fill(title)
    await expect(publico.getByText(title)).toHaveCount(0)
  })
})
