# Constitución del proyecto

Reglas que toda spec, plan y PR deben respetar.

1. **Spec primero.** Todo cambio de comportamiento parte de una spec aprobada en `specs/NNN-nombre/`. Si el código y la spec difieren, se corrige la spec en el mismo PR.
2. **Requisitos trazables.** Cada requisito tiene ID (`FR-`, `NFR-`) y cada ID debe tener al menos un test.
3. **Secretos solo en servidor.** Credenciales del banco y service-role de Supabase jamás en frontend, repo ni logs.
4. **El pago se confirma en servidor.** El cliente nunca marca un pedido como pagado; solo una Edge Function tras verificar con el banco.
5. **Inventario consistente.** Nunca se vende más stock del existente (reserva atómica en base de datos).
6. **Seguridad por defecto.** Row Level Security (RLS) activo en todas las tablas; un vendedor solo ve/edita lo suyo.
7. **Mobile-first y offline-tolerante.** Diseñar para teléfono con conexión inestable (Bolivia): imágenes comprimidas, caché de catálogo.
8. **Idioma:** documentación y UI en español (Bolivia); código e identificadores en inglés. Moneda: Bolivianos (BS), enteros en centavos.
9. **Cambios pequeños.** PRs enfocados a una tarea de `tasks.md`; CI verde antes de fusionar.
10. **Decisiones documentadas** en ADR cuando afecten arquitectura, seguridad o costos.
