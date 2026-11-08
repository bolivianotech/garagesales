import { defineConfig } from '@playwright/test'

/**
 * Variables:
 *   E2E_BASE_URL   Sitio a probar (por defecto el build local en http://127.0.0.1:4173)
 *   PW_CHROMIUM    Ruta de Chromium si no usas el que instala Playwright
 * Las cuentas de prueba (E2E_*_EMAIL / E2E_*_PASSWORD) se leen en tests/helpers.ts.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const local = !process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] },
  },
  webServer: local
    ? {
        command: 'npm --prefix ../apps/pwa run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
})
