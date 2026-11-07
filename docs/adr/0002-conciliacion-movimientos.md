# ADR-0002: Confirmar pagos por conciliación de movimientos bancarios

- **Estado:** Propuesta (pendiente de validar con los PDFs del banco) · 2026-11-07
- **Contexto:** El endpoint disponible es `accounts/queryMovements` (consulta de movimientos de cuenta). El QR es de la cuenta del dueño de la plataforma, que cobra y luego liquida a vendedores con 1 % de comisión.
- **Decisión:** Un job del servidor consulta los movimientos, los guarda de forma idempotente y concilia créditos con pedidos pendientes. Si el banco ofrece webhook, se añade como acelerador, no como único mecanismo.
- **Consecuencias (+):** la verdad es la cuenta bancaria; auditable y reconciliable con el ledger.
- **Consecuencias (−):** latencia de polling; atribución depende de referencia/glosa o de montos únicos (riesgo Q10).
- **Seguridad:** credenciales solo en secretos de Edge Functions; URL por variable de entorno (el host actual es de **desarrollo**).
