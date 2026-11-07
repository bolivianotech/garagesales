# Spec 002 — Catálogo del vendedor

**Estado:** Draft

## Objetivo
Que el dueño de productos publique y gestione lo que ofrece: foto, precio y cantidad.

## Historias
- Como **vendedor** quiero subir un producto con foto, título, precio y cantidad desde mi teléfono en menos de 1 minuto.
- Como **vendedor** quiero editar precio/cantidad, pausar o marcar agotado.
- Como **vendedor** quiero ver qué se vendió y qué queda.

## Requisitos
- FR-010: Crear producto con título, descripción opcional, precio (BS, > 0), cantidad (entero ≥ 0) y 1–5 fotos.
- FR-011: Fotos se comprimen en el cliente (máx. 1600 px, ≤ 400 KB aprox.) y se aceptan solo JPG/PNG/WebP ≤ 5 MB de origen.
- FR-012: Estados: borrador, activo, pausado, agotado (automático cuando stock = 0).
- FR-013: Editar precio o stock no altera pedidos ya creados (se congela `unit_price_cents` en el pedido).
- FR-014: Panel con lista de productos, stock y ventas.
- NFR-002: Subir un producto con foto en 4G toma < 10 s.
- NFR-003: Si no hay red, el borrador se guarda localmente y se sube al recuperar conexión (ver spec 005).

## Criterios de aceptación
- **Dado** un vendedor con tienda, **cuando** sube una foto de 4 MB, precio 50 BS y cantidad 3, **entonces** el producto aparece en el catálogo con la foto optimizada.
- **Dado** un producto con stock 1, **cuando** se vende, **entonces** pasa a `sold_out` y deja de ofrecerse.
- **Dado** precio ≤ 0 o cantidad negativa, **cuando** se intenta guardar, **entonces** se muestra un error de validación.
