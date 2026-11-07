# Arquitectura

```
[PWA React] ──HTTPS──> [Supabase: Auth · Postgres(RLS) · Storage · Realtime]
     │                          │
     └────> [Edge Functions] <──┘──> [API QR Banco Económico]
              create-qr / check-payment / bank-webhook
```

## Principios
- El frontend usa solo la *anon key* y RLS. Toda operación privilegiada (crear QR, confirmar pago) ocurre en Edge Functions.
- Web y "móvil" son **una sola PWA**: sincronización inmediata, un solo código (ADR-0001).

## Modelo de datos (borrador)
| Tabla | Campos clave |
|---|---|
| `profiles` | id (= auth.uid), name, phone, role |
| `stores` | id, owner_id, name, description, payout_account |
| `products` | id, store_id, title, description, price_cents, stock, image_path, status(`draft`/`active`/`paused`/`sold_out`) |
| `orders` | id, buyer_id, status(`pending`/`paid`/`expired`/`cancelled`), total_cents, expires_at |
| `order_items` | order_id, product_id, store_id, qty, unit_price_cents |
| `payments` | id, order_id, bank_ref, qr_payload, amount_cents, status, paid_at, raw_response |
| `ledger` | id, payment_id, store_id, gross_cents, fee_cents, net_cents, settled_at |

## Reserva de stock
Función SQL `create_order(items)` en una transacción con `SELECT … FOR UPDATE`; descuenta stock al crear el pedido, y un job (pg_cron) lo devuelve si `expires_at` vence sin pago.

## Seguridad
- RLS: compradores leen productos `active` y sus propios pedidos; vendedores escriben solo en su tienda.
- Webhook del banco: verificación de firma/credencial + idempotencia por `bank_ref`.
- Imágenes: tipos y tamaño validados; bucket público de lectura, escritura solo del dueño.
- Auditoría: `payments.raw_response` guardado para conciliación.

## Integración de pago (contrato interno, independiente del banco)
`PaymentProvider { createQr(order) -> {ref, qrPayload, expiresAt}; getStatus(ref) -> pending|paid|expired }`.
Implementación `BancoEconomicoProvider` se completa al recibir el PDF; un `MockProvider` permite desarrollar y probar sin banco.
