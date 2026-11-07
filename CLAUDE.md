# GarageSales — instrucciones para Claude

- Seguimos SDD: lee `docs/constitution.md` y la `specs/NNN-*/spec.md` de la feature antes de tocar código. No implementes algo sin spec en estado `Approved`.
- Orden por feature: spec → plan → tasks → código + tests. Cada test cita el ID del requisito (`FR-xxx`).
- Nunca escribas secretos; usa `.env.example` como referencia. Pagos solo en Edge Functions.
- Dinero en centavos enteros (BS). UI en español, código en inglés.
- Preguntas sin resolver van a `docs/open-questions.md`, no se suponen.
