# ADR-0002: Confirmar pagos por estado del QR, con conciliación de movimientos

- **Estado:** Propuesta (validar con el PDF "Api Market Baneco v1.3.0") · 2026-11-07
- **Contexto:** El banco permite generar QR dinámicos (§7.2) y consultar su estado (`statusQRCode = 1` = pagado). También existe `accounts/queryMovements`. El QR es de la cuenta del dueño de la plataforma, que luego liquida a vendedores con 1 % de comisión.
- **Decisión:** Un QR por pedido; el identificador del QR vincula pago y pedido. Un job consulta `statusQRCode` de los QR pendientes y confirma. `queryMovements` se usa como conciliación diaria de respaldo, no para atribuir pagos.
- **Consecuencias (+):** vínculo exacto pago↔pedido sin montos únicos; auditable contra el banco.
- **Consecuencias (−):** latencia de polling si no hay callback; depende de límites de tasa del banco.
- **Seguridad:** credenciales solo en secretos de Edge Functions; URLs por variable de entorno (el host actual es de **desarrollo**).
