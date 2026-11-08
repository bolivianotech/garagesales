# Spec NNN — <Nombre de la funcionalidad>

**Estado:** Draft | Approved (AAAA-MM-DD) · **Bloqueada por:** <preguntas abiertas, si las hay>

## Objetivo
Una o dos frases: qué problema resuelve y para quién. Sin tecnología.

## Historias
- Como **<rol>** quiero <acción> para <beneficio>.

## Requisitos
Cada requisito tiene un ID estable que **nunca se reutiliza**. `FR` = funcional, `NFR` = no funcional (rendimiento, seguridad, usabilidad).
- FR-NNN: <comportamiento observable y verificable>.
- NFR-NNN: <medida concreta: "< 10 s", "RLS en todas las tablas">.

## Criterios de aceptación
Formato Dado / Cuando / Entonces. Cada criterio se convierte en al menos un caso de prueba.
- **Dado** <contexto>, **cuando** <acción>, **entonces** <resultado observable>.

## Riesgos y preguntas abiertas
- <riesgo> → <mitigación o pregunta registrada en docs/open-questions.md>

---
Reglas: (1) la spec dice QUÉ y POR QUÉ, nunca CÓMO; (2) no se escribe código sin spec `Approved`; (3) si el código y la spec difieren, se corrige la spec en el mismo PR; (4) un cambio de decisión del dueño actualiza la spec **y** crea un ADR.
