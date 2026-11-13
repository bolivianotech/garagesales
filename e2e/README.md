# Pruebas E2E (integrales) con Playwright

Validan el sistema **completo, en un navegador real**. Hay tres niveles, marcados con etiquetas:

| Etiqueta | Qué prueba | Necesita | Estado |
|---|---|---|---|
| `@smoke` | La app carga, rutas protegidas, formulario | Solo el sitio (local o desplegado) | ✅ 5 casos, ejecutados |
| `@live` | Roles reales, publicar y despublicar productos | Sitio con base de datos real y cuentas de prueba | ✍️ escritos, **sin ejecutar** |
| `@full` | Compra → pago QR → comprobante → entrega → reportes | Pantallas de Fase 3, banco en certificación | 🚧 escritos como contrato (`fixme`) |

## Instalar
```bash
cd e2e
npm install
npx playwright install chromium          # una vez
```

## Ejecutar
```bash
# Humo contra el build local (primero: cd ../apps/pwa && npm run build)
npm run smoke

# Humo contra el sitio desplegado (antes y después de cada despliegue)
E2E_BASE_URL=https://garagesales.requenataniel.workers.dev npm run smoke      # macOS/Linux
$env:E2E_BASE_URL="https://garagesales.requenataniel.workers.dev"; npm run smoke   # PowerShell

# Con cuentas de prueba (nunca las guardes en archivos del repositorio)
$env:E2E_BUYER_EMAIL="..."; $env:E2E_BUYER_PASSWORD="..."   # idem VENDOR, ADMIN, FINANCE, BUYER2
npm run live
```

## Contrato de `data-testid` para las pantallas de la Fase 3
Las pruebas `@full` esperan estos identificadores; las pantallas deben exponerlos:

| Pantalla | Identificadores |
|---|---|
| Catálogo | `btn-add-to-cart` |
| Carrito | `cart-pay` |
| Pago | `payment-qr`, `payment-amount`, `payment-status` |
| Comprobante | `receipt-payer-name`, `receipt-payer-bank`, `receipt-pickup-code` |
| Mis pedidos | `order-status`, `order-open`, `order-receipt-link` |
| Subir comprobante | `proof-input`, `proof-thumb`, `proof-add` |
| Por entregar (vendedor) | `pickup-row`, `pickup-buyer-name`, `pickup-payer-name`, `pickup-code-input`, `pickup-confirm`, `toast-error` |
| Admin · pagos | `payment-row`, `payment-payer-bank`, `payment-receipt-link` |
| Finanzas | `balance-commission` |

## Pago en las pruebas
- Certificación: el banco permite generar QR; el pago lo hace una persona con su app (`E2E_PAYMENT_MODE=manual`) y la prueba espera hasta `E2E_PAYMENT_TIMEOUT_MS` (180 s por defecto).
- Nunca se automatiza un pago con dinero real.

## Resultados
Playwright escribe `e2e-results.json`; `scripts/test_report.py` incluye los casos `@smoke` en el reporte general. Las capturas de fallos quedan en `test-results/` (ignorado por git).
