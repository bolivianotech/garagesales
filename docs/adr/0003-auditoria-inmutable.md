# ADR-0003: Registros inmutables y auditoría encadenada

- **Estado:** Propuesta · 2026-11-07
- **Contexto:** Se manejan pagos a terceros y datos de cobro de vendedores; un cambio indebido puede desviar dinero. El dueño pidió una tabla inmutable donde todo quede registrado.
- **Decisión:**
  - Tablas sensibles (`seller_payout_methods`, `ledger`, `payouts`, `audit_log`) son append-only: sin permisos de UPDATE/DELETE y con triggers que lo impiden aun para roles privilegiados.
  - `audit_log` con hash encadenado (SHA-256 de la fila + hash anterior), verificado a diario.
  - Cambios de datos de cobro con aprobación de un rol distinto y período de enfriamiento.
- **Consecuencias (+):** trazabilidad y detección de manipulación; protege al dueño y a los vendedores.
- **Consecuencias (−):** correcciones por reversa, no por edición; más complejidad de consultas ("versión vigente").
- **Límite honesto:** un superusuario de la base de datos (service role/dueño del proyecto) podría alterar filas; la cadena de hashes lo vuelve detectable, no imposible. Mitigación: copia periódica del último hash fuera de la base de datos.
