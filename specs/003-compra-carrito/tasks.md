# Tareas 003 — Pedidos

| # | Tarea | Requisito | Estado |
|---|---|---|---|
| T1 | Migración de pedidos, ítems, pagos y retiros | FR-022, FR-024 | ✅ |
| T2 | `create_order` sin reserva, con total del servidor y precios congelados | FR-022, FR-013 | ✅ |
| T3 | `confirm_payment` atómico, idempotente y con revisión | FR-033, FR-034, FR-037, FR-039b, NFR-004 | ✅ |
| T4 | Vencimiento de pedidos (`expire_pending_orders`) | FR-023 | ✅ |
| T5 | Comprobante digital (`get_receipt`) | FR-083 | ✅ |
| T6 | Retiros del vendedor y entrega con código | FR-071, FR-072, FR-074 | ✅ |
| T7 | Reporte "Quién pagó" | FR-084 | ✅ |
| T8 | Pruebas SQL (60 casos) y de concurrencia (5 casos) | NFR-001, NFR-004 | ✅ pasan |
| T9 | Interfaz: carrito y creación del pedido | FR-021, FR-022 | ⏳ siguiente |
| T10 | Interfaz: pantalla de pago (QR) y estado en vivo | FR-026, spec 004 | ⏳ depende de las Edge Functions |
| T11 | Interfaz: Mis pedidos y página del comprobante | FR-025, FR-083 | ⏳ siguiente |
| T12 | Interfaz: "Por entregar" del vendedor y reporte del admin | FR-071, FR-084 | ⏳ siguiente |
| T13 | Stock en tiempo real | FR-020 | ⏳ pendiente |
| T14 | Aplicar `20261108000002_orders.sql` en Supabase | — | ⏳ dueño |
