# Manual para construir (y replicar) GarageSales

Un marketplace de garage sales con pago por QR bancario, construido con **Spec Driven Development (SDD)**, una PWA y Supabase. Este manual cuenta **cómo se hizo de verdad**, con sus errores, para que otra persona pueda repetirlo con otro proyecto.

## ¿Para quién es?
Estudiantes y emprendedores con conocimientos básicos de programación que quieren lanzar una tienda en línea con cobro por QR (Bolivia) usando herramientas gratuitas y un asistente de IA.

## Cómo leerlo

| Si quieres… | Lee |
|---|---|
| Entender el método | [01 · Metodología SDD](01-metodologia-sdd.md) |
| Ver qué pasó, día por día | [02 · Cronología real](02-cronologia-del-proyecto.md) |
| Repetirlo en un fin de semana | [03 · Plan de fin de semana](03-plan-de-fin-de-semana.md) |
| Entender la arquitectura | [04 · Arquitectura y decisiones](04-arquitectura-y-decisiones.md) |
| Saber cómo se prueba todo | [05 · Estrategia de pruebas](05-estrategia-de-pruebas.md) |
| Desplegar y volver atrás | [06 · Despliegue](06-despliegue.md) |
| No repetir nuestros errores | [07 · Lecciones aprendidas](07-lecciones-aprendidas.md) |
| Llevarlo a tu propio proyecto | [08 · Replicar en otro proyecto](08-replicar-en-otro-proyecto.md) |
| Proteger credenciales | [09 · Seguridad y secretos](09-seguridad-y-secretos.md) |
| Validar todo de punta a punta | [Plan E2E](../testing/e2e-plan.md) |
| Presentación para el taller | [`docs/presentations/`](../presentations/README.md) |
| Integrar el QR del banco | [Runbook de integración QR](../runbooks/01-integracion-qr-dinamico.md) |
| Operar el día a día | [Runbook de operación](../runbooks/02-operacion-diaria.md) |
| Borrar los datos de prueba | [Runbook de limpieza](../runbooks/03-limpieza-de-datos.md) |
| Enseñarle el sistema a usuarios | [Manuales de usuario](../manuales/) |
| Validar con usuarios reales | [Plan UAT](../uat/00-plan-uat.md) |
| Saber qué falta | [Estado del proyecto](../estado-del-proyecto.md) |

## Mapa del repositorio

```
specs/NNN-nombre/     spec.md  plan.md  tasks.md         ← QUÉ se construye y por qué
docs/                 constitución, ADR, arquitectura, runbooks, manuales, UAT, pruebas
supabase/migrations/  la base de datos como código (SQL versionado)
supabase/tests/       pruebas SQL de seguridad, reglas y concurrencia
apps/pwa/             la aplicación (React + Vite + TypeScript)
e2e/                  pruebas integrales con navegador (Playwright)
scripts/              generador del reporte de pruebas, verificación de secretos, limpieza
```

## Glosario mínimo

| Término | Significado |
|---|---|
| **SDD** | Spec Driven Development: primero se escribe y aprueba la especificación; el código la obedece |
| **Spec** | Documento que dice qué debe hacer una funcionalidad, con requisitos numerados |
| **FR / NFR** | Requisito funcional / no funcional (ej. FR-022, NFR-004) |
| **ADR** | Registro de una decisión de arquitectura y su porqué |
| **RLS** | *Row Level Security*: reglas en la base de datos que dicen qué filas ve cada usuario |
| **PWA** | App web instalable en el teléfono |
| **Edge Function** | Código que corre en el servidor de Supabase (aquí habla con el banco) |
| **QR dinámico** | Un QR distinto por pedido, con el monto exacto y de un solo uso |
| **TC / MT / UAT / E2E** | Casos de prueba automáticos / manuales / de aceptación por rol / integrales |
| **Gana quien paga primero** | No hay reserva de stock; el producto es de quien confirma el pago antes |
