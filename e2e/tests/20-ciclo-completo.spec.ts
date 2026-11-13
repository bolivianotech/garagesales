import { test, expect } from '@playwright/test'
import { login } from './helpers'

/**
 * @full: el ciclo completo de negocio. Son el CONTRATO de las pantallas de la Fase 3 y del cobro con QR:
 * usan `data-testid` que las pantallas deben exponer (ver e2e/README.md). Hoy están marcadas como "fixme" porque
 * esas pantallas y la integración con el banco aún no existen. Al construirlas, se quita el `test.fixme` de cada caso.
 *
 * Variables extra: E2E_PAYMENT_MODE = "manual" (el evaluador paga el QR con su app bancaria y la prueba espera la
 * confirmación) | "skip".
 */

const PENDIENTE = 'Pendiente: pantallas de la Fase 3 y cobro con QR (ver docs/estado-del-proyecto.md)'
const esperaPago = Number(process.env.E2E_PAYMENT_TIMEOUT_MS || 180_000)

test.describe('@full ciclo completo', () => {
  test('E2E-20 @full el comprador compra y paga Bs 0,01 con QR y recibe su comprobante', async ({ page }) => {
    test.fixme(true, PENDIENTE)
    await login(page, 'BUYER')
    await page.goto('/')
    await page.getByPlaceholder('Buscar…').fill('Camisa UAT')
    await page.getByTestId('btn-add-to-cart').first().click()
    await page.goto('/carrito')
    await page.getByTestId('cart-pay').click()
    await expect(page.getByTestId('payment-qr')).toBeVisible()
    await expect(page.getByTestId('payment-amount')).toHaveText(/Bs 0,01/)
    // El evaluador paga el QR desde su app bancaria; aquí solo se espera la confirmación del banco.
    await expect(page.getByTestId('payment-status')).toHaveText(/Pagado/, { timeout: esperaPago })
    await expect(page.getByTestId('receipt-payer-name')).not.toBeEmpty()
    await expect(page.getByTestId('receipt-pickup-code')).toHaveText(/^[A-Z2-9]{6}$/)
  })

  test('E2E-21 @full el comprobante se abre sin sesión y un token alterado no muestra nada', async ({ page, browser }) => {
    test.fixme(true, PENDIENTE)
    await login(page, 'BUYER')
    await page.goto('/mis-pedidos')
    await page.getByTestId('order-receipt-link').first().click()
    const url = page.url()
    const anon = await (await browser.newContext()).newPage()
    await anon.goto(url)
    await expect(anon.getByTestId('receipt-payer-name')).toBeVisible()
    await anon.goto(url.slice(0, -1) + (url.endsWith('a') ? 'b' : 'a'))
    await expect(anon.getByTestId('receipt-payer-name')).toHaveCount(0)
  })

  test('E2E-22 @full el comprador sube la foto de su comprobante bancario (máx. 3)', async ({ page }) => {
    test.fixme(true, PENDIENTE)
    await login(page, 'BUYER')
    await page.goto('/mis-pedidos')
    await page.getByTestId('order-open').first().click()
    const input = page.getByTestId('proof-input')
    await input.setInputFiles([1, 2, 3].map((n) => ({ name: `c${n}.png`, mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgo=', 'base64') })))
    await expect(page.getByTestId('proof-thumb')).toHaveCount(3)
    await expect(page.getByTestId('proof-add')).toHaveCount(0)
  })

  test('E2E-23 @full el vendedor ve la venta con comprador y pagador, y entrega con código', async ({ page }) => {
    test.fixme(true, PENDIENTE)
    await login(page, 'VENDOR')
    await page.goto('/vender/por-entregar')
    const fila = page.getByTestId('pickup-row').first()
    await expect(fila.getByTestId('pickup-buyer-name')).not.toBeEmpty()
    await expect(fila.getByTestId('pickup-payer-name')).not.toBeEmpty()
    await fila.getByTestId('pickup-code-input').fill('ZZZZZZ')
    await fila.getByTestId('pickup-confirm').click()
    await expect(page.getByTestId('toast-error')).toBeVisible()
  })

  test('E2E-24 @full el administrador ve "Quién pagó" con enlace al comprobante', async ({ page }) => {
    test.fixme(true, PENDIENTE)
    await login(page, 'ADMIN')
    await page.goto('/admin/pagos')
    await expect(page.getByTestId('payment-row').first().getByTestId('payment-payer-bank')).not.toBeEmpty()
    await expect(page.getByTestId('payment-row').first().getByTestId('payment-receipt-link')).toBeVisible()
  })

  test('E2E-25 @full finanzas ve saldos con comisión del 1 % redondeada hacia arriba', async ({ page }) => {
    test.fixme(true, PENDIENTE + ' y spec 006')
    await login(page, 'FINANCE')
    await page.goto('/finanzas/saldos')
    await expect(page.getByTestId('balance-commission').first()).toHaveText(/Bs 0,01/)
  })

  test('E2E-26 @full dos compradores pagan la última unidad: uno gana y el otro queda en revisión', async ({ browser }) => {
    test.fixme(true, PENDIENTE)
    const a = await (await browser.newContext()).newPage()
    const b = await (await browser.newContext()).newPage()
    await login(a, 'BUYER')
    await login(b, 'BUYER2')
    // Ambos crean su pedido de "Última unidad UAT" y pagan al mismo tiempo (E2E_PAYMENT_MODE=manual).
    await Promise.all([a, b].map((p) => p.goto('/mis-pedidos')))
    const estados = await Promise.all([a, b].map((p) => p.getByTestId('order-status').first().innerText()))
    expect(estados.filter((e) => /Pagado/.test(e))).toHaveLength(1)
    expect(estados.filter((e) => /revisi/i.test(e))).toHaveLength(1)
  })
})
