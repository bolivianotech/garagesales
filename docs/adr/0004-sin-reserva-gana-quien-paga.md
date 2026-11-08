# ADR-0004: Sin reserva de stock; gana quien paga primero

- **Estado:** Aceptada · 2026-11-08 (decisión del dueño del producto)
- **Contexto:** La spec 003 original reservaba el stock 10 minutos al crear el pedido. El dueño indicó que no quiere reservas: "si no paga no es suyo". Los vendedores venden saldos únicos (a menudo cantidad 1), a veces en vivo.
- **Decisión:** Crear un pedido no descuenta stock. El descuento ocurre dentro de `confirm_payment` (una transacción con bloqueo de filas de producto) cuando el banco confirma el pago. Si dos compradores pagan por la última unidad, el primer pago confirmado se queda con ella; el segundo queda en `review` (pedido y pago) para reembolso.
- **Consecuencias (+):** sin productos bloqueados por quien no paga; modelo simple y justo para ventas en vivo.
- **Consecuencias (−):** un comprador puede pagar y perder la carrera, lo que obliga a un reembolso manual (el sistema lo marca y lo reporta); se mitiga mostrando "Agotado" lo antes posible (stock en tiempo real) y validando stock al crear el pedido.
- **Seguridad:** `confirm_payment` solo es ejecutable por el rol de servicio (Edge Functions), nunca por el cliente.
