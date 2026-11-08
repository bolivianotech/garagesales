# Spec 003 — Catálogo público, carrito y pedido

**Estado:** Approved (2026-11-07)

## Objetivo
Que el comprador explore, arme un carrito y genere un pedido. **No hay reserva de stock: el producto es de quien paga primero.** Nunca se entrega más de lo que existe.

## Historias
- Como **comprador** quiero buscar y filtrar productos (texto, tienda, precio).
- Como **comprador** quiero un carrito y ver el total antes de pagar.
- Como **comprador** quiero ver el estado de mis pedidos.
- Como **vendedor** quiero ver los pedidos que incluyen mis productos.

## Requisitos
- FR-020: Catálogo público paginado con búsqueda y filtros; stock actualizado en tiempo real.
- FR-021: Carrito persistente (local y, si hay sesión, en servidor).
- FR-022: Crear un pedido **no reserva ni descuenta stock**. Valida que cada producto esté publicado y con stock suficiente en ese momento, calcula el total en el servidor con los precios de la base de datos y congela precios y datos del ítem (FR-013). Un vendedor no puede comprar sus propios productos.
- FR-023: El pedido pendiente vence a las `order_valid_hours` (por defecto 24 h); al vencer se anula su QR en el banco. No hay stock que liberar.
- FR-024: Un pedido con ítems de varias tiendas se divide lógicamente por tienda para liquidación.
- FR-025: Historial de pedidos para comprador y vendedor con estados.
- FR-026: Entrega únicamente por retiro en persona; el checkout muestra ubicación/horario de cada vendedor (spec 007).
- FR-023a: **Gana quien paga primero.** El stock se descuenta de forma atómica cuando el pago se confirma (spec 004). Si el stock ya no alcanza, el pedido queda en `review` para reembolso y el comprador ve un aviso.
- NFR-004: Con 50 pagos concurrentes sobre 1 unidad, exactamente 1 pedido pasa a `paid`; los demás quedan en `review` sin modificar el stock.

## Criterios de aceptación
- **Dado** 1 unidad en stock y dos pedidos creados, **cuando** ambos pagan, **entonces** solo el primer pago confirmado se queda con el producto y el otro queda en `review` para reembolso.
- **Dado** un pedido pendiente que vence, **cuando** pasa su plazo, **entonces** pasa a `expired` y se anula su QR; el stock no cambia.
