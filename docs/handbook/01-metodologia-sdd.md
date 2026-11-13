# 01 · Metodología: Spec Driven Development

## La idea en una frase
**Nada se programa sin una especificación aprobada, y nada se da por terminado sin una prueba que lo demuestre.** El asistente de IA escribe mucho código muy rápido; la spec es lo que evita que escriba lo equivocado rápido.

## El ciclo de cada funcionalidad

```
 1. SPEC        2. PLAN        3. TASKS       4. CÓDIGO + PRUEBAS     5. VERIFICACIÓN
 qué y por qué  cómo (diseño)  trabajo en     migración, pantallas,   reporte con trazabilidad
 (Approved)     (tablas, RLS)  pasos de 1–4 h  casos con ID           requisito → prueba → resultado
```

| Paso | Archivo | Quién decide | Se cierra cuando |
|---|---|---|---|
| Spec | `specs/NNN-x/spec.md` | El dueño del producto aprueba | Estado `Approved (fecha)` |
| Plan | `specs/NNN-x/plan.md` | El equipo técnico | Spec aprobada |
| Tasks | `specs/NNN-x/tasks.md` | El equipo técnico | Cada tarea cita un FR |
| Código | `supabase/`, `apps/` | El equipo técnico | Pruebas en verde |
| Verificación | `docs/testing/reports/latest.md` | Automática | 0 fallas y cobertura declarada |

Plantillas listas en [`docs/templates/`](../templates/).

## Cómo se escribe una spec (formato oficial)

1. **Encabezado:** número, nombre, estado (`Draft` o `Approved (fecha)`) y qué la bloquea.
2. **Objetivo:** una o dos frases, sin tecnología.
3. **Historias:** "Como *rol* quiero *acción* para *beneficio*".
4. **Requisitos con ID estable:** `FR-010`, `NFR-002`. Un ID **nunca se reutiliza**; si el requisito cambia, se edita; si desaparece, se marca como retirado.
5. **Criterios de aceptación** en formato *Dado / Cuando / Entonces*.
6. **Riesgos y preguntas** que van a `docs/open-questions.md`; no se suponen respuestas.

Ejemplo real (spec 002, recortado):

```markdown
- FR-012: Estados: borrador, activo, pausado, agotado (automático cuando stock = 0).
- **Dado** un producto con stock 1, **cuando** se vende, **entonces** pasa a `sold_out` y deja de ofrecerse.
```
Ese criterio se volvió el caso `TC-002-13 FR-012 stock 0 pasa a agotado` y se verifica en cada corrida.

## Numeración de las specs (esta repetición evita desorden)

| Rango | Tema |
|---|---|
| 001 | Cuentas y roles |
| 002 | Catálogo del vendedor |
| 003 | Compra y pedidos |
| 004 | Cobro con QR |
| 005 | PWA y sin red |
| 006 | Liquidación y comisión |
| 007 | Retiro y comprobantes |
| 008 | Datos de cobro y auditoría |

Requisitos: el rango de IDs sigue al de la spec (la 007 usa FR-070 a FR-089), así un ID revela de dónde viene.

## Reglas de trabajo (la "constitución")
Viven en [`docs/constitution.md`](../constitution.md) y en `CLAUDE.md` (las lee el asistente en cada sesión). Las más importantes:

- Secretos solo en el servidor. El pago se confirma solo en el servidor.
- RLS activo en todas las tablas.
- Dinero en centavos enteros.
- Toda decisión importante deja un ADR.
- **Definición de terminado por fase:** spec Approved → plan → tasks → código → pruebas con ID → reporte generado y commiteado.

## Cómo se decide con el dueño del producto
- El asistente **pregunta lo que no sabe** (una tanda corta de preguntas con opciones y una recomendación) y registra la respuesta en `docs/open-questions.md`.
- Una decisión que cambia una spec aprobada se refleja en la spec **y** en un ADR el mismo día (ejemplo: "sin reserva" → ADR-0004 + cambios en specs 003, 004 y 007).
- Una pregunta bloqueante se marca con el nombre de la spec que bloquea.

## Trazabilidad: la cadena que no se rompe

```
Historia → FR-022 → plan.md → migración create_order → TC-003-04 (SQL) → reporte (✅) → UAT-CMP-03
```

El script `scripts/test_report.py` recorre las specs aprobadas, busca cada ID de requisito en los nombres de las pruebas y marca:
✅ cubierto · 🖐 prueba manual · ⏳ fase aún no implementada · ⚠️ **sin prueba** (el único estado que no se tolera).

## Pruebas dentro del método
Se escriben **junto con** el código, nunca después. Reglas: ID estable (`TC-003-04`), cita del requisito en el nombre, caso negativo y positivo para toda regla de seguridad. Detalle en [05 · Estrategia de pruebas](05-estrategia-de-pruebas.md).

## Errores de método que cometimos (y cómo se corrigieron)
| Error | Corrección |
|---|---|
| Prometer fechas ("mañana vendemos") sin medir lo que faltaba | `docs/estado-del-proyecto.md` con horas estimadas y bloqueos |
| Reportar resultados sin registrar | Plan de pruebas + registro de resultados + reporte generado |
| Escribir la spec con una regla (reserva de 10 min) que el dueño no quería | Preguntar antes de aprobar y escribir ADR cuando cambia |
| Aprobar specs con requisitos de fases lejanas sin etiquetar | El reporte separa "fase aún no implementada" de "sin prueba" |
