# Arquitectura

```
[PWA React] ──HTTPS──> [Supabase: Auth · Postgres(RLS) · Storage · Realtime]
     │                          │
     └────> [Edge Functions] <──┘──> [API Market Banco Económico]
              create-qr · check-payment · notify-payment · reconcile-daily · cancel-qr
```

Detalle de la integración bancaria: [`integraciones/banco-economico.md`](integraciones/banco-economico.md).

## Principios
- El frontend usa solo la *anon key* y RLS. Toda operación privilegiada (crear QR, confirmar pago, liquidar) ocurre en Edge Functions.
- Web y "móvil" son **una sola PWA** (ADR-0001).
- Registros financieros y de auditoría **inmutables** (ADR-0003).

## Modelo de datos (borrador)
| Tabla | Campos clave |
|---|---|
| `profiles` | id (= auth.uid), name, phone, role (`buyer`/`seller`/`admin`/`finance_admin`) |
| `stores` | id, owner_id, name, description, status(`pending`/`approved`/`suspended`), pickup_info |
| `products` | id, store_id, sku, title, description, price_cents, stock, image_path, status |
| `orders` | id, short_code, buyer_id, status(`pending`/`paid`/`expired`/`cancelled`/`review`), total_cents, expires_at |
| `order_items` | order_id, product_id, store_id, sku, title_snapshot, qty, unit_price_cents |
| `payments` | id, order_id, bank_qr_id (único), amount_cents, status, sender_name, sender_bank_code, sender_account_masked, paid_at, description, raw_response |
| `bank_reconciliation` | id, date, source(`paidQR`/`history`), bank_ref, amount_cents, status(`matched`/`unmatched`/`review`), payment_id? , raw |
| `ledger` (append-only) | id, payment_id, order_item_id, store_id, gross_cents, fee_cents, net_cents, status, payout_id?, reverses_id? |
| `payouts` (append-only) | id, store_id, total_net_cents, payout_method_version_id, paid_at, transfer_ref, created_by |
| `seller_payout_methods` (append-only) | id, store_id, version, bank, holder, account_encrypted, qr_image_path, qr_expires_at, status, requested_by, approved_by, effective_at |
| `pickups` | id, order_id, store_id, buyer_id, pickup_code, status, ready_at, delivered_at |
| `audit_log` (append-only, hash encadenado) | id, at, actor_id, actor_role, ip, action, entity, before, after, reason, prev_hash, hash |
| `settings` | commission_bps (=100), order_ttl_minutes (=10), payout_cooling_hours (=24), pickup_reminder_days |

## Reserva de stock
Función SQL `create_order(items)` en transacción con `SELECT … FOR UPDATE`; descuenta stock al crear el pedido y un job lo devuelve si `expires_at` vence sin pago (llamando antes a `cancelQR`).

## Confirmación de pago
`create-qr` genera el QR del pedido; `check-payment` consulta `statusQR` de los pendientes; `notify-payment` recibe el aviso opcional y solo dispara la consulta; `reconcile-daily` compara `paidQR/{fecha}` y `accounts/history`. Al ver `statusQRCode = 1` se ejecuta `confirm_payment(order_id)` en una transacción: pedido `paid`, `payments` con datos del pagador, `ledger` con comisión (redondeo a favor de la plataforma), `pickups` y salida de stock/catálogo.

## Seguridad
- RLS por `store_id`; compradores ven sus pedidos; vendedores solo lo suyo.
- Datos de cuenta cifrados en reposo; secretos del banco solo en Edge Functions.
- Aviso del banco: ruta con token secreto + verificación con `statusQR`.
- Auditoría: ver spec 008.
