# Spec 003 — Catálogo público, carrito y pedido

**Estado:** Draft · **Bloqueada por:** Q4

## Objetivo
Que el comprador explore, arme un carrito y genere un pedido sin sobreventa.

## Historias
- Como **comprador** quiero buscar y filtrar productos (texto, tienda, precio).
- Como **comprador** quiero un carrito y ver el total antes de pagar.
- Como **comprador** quiero ver el estado de mis pedidos.
- Como **vendedor** quiero ver los pedidos que incluyen mis productos.

## Requisitos
- FR-020: Catálogo público paginado con búsqueda y filtros; stock actualizado en tiempo real.
- FR-021: Carrito persistente (local y, si hay sesión, en servidor).
- FR-022: Crear pedido reserva stock de forma atómica; si falta stock, el pedido falla indicando qué ítem.
- FR-023: El pedido expira a los 10 min sin pago y libera el stock.
- FR-024: Un pedido con ítems de varias tiendas se divide lógicamente por tienda para liquidación.
- FR-025: Historial de pedidos para comprador y vendedor con estados.
- FR-026: Método de entrega según Q4 (retiro/envío).
- NFR-004: Con 50 compradores concurrentes sobre 1 unidad, exactamente 1 pedido tiene éxito.

## Criterios de aceptación
- **Dado** 1 unidad en stock y dos compradores pagando a la vez, **cuando** ambos crean pedido, **entonces** solo uno lo logra y el otro ve "agotado".
- **Dado** un pedido pendiente que vence, **cuando** pasan 10 min, **entonces** el stock se restituye.
