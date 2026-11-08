# GarageSales

Marketplace de garage sales: los **vendedores** publican productos (foto, precio, cantidad) y los **compradores** compran desde una **PWA instalable** (web + móvil, un solo código) pagando con **QR del Banco Económico**.

> Metodología: **Spec Driven Development (SDD)**. Ningún código se escribe sin una spec aprobada. Ver [`docs/constitution.md`](docs/constitution.md).

## Mapa de documentación

| Documento | Para qué sirve |
|---|---|
| [`docs/constitution.md`](docs/constitution.md) | Principios y reglas no negociables del proyecto |
| [`docs/roadmap.md`](docs/roadmap.md) | **Paso a paso** de implementación (fases, entregables, criterios de salida) |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura, modelo de datos, seguridad |
| [`docs/integraciones/banco-economico.md`](docs/integraciones/banco-economico.md) | Contrato de la API del banco y puntos a verificar |
| [`docs/adr/`](docs/adr) | Decisiones de arquitectura (ADR) |
| [`docs/testing/test-plan.md`](docs/testing/test-plan.md) | Plan de pruebas y casos manuales |
| [`docs/testing/manual-test-guide.md`](docs/testing/manual-test-guide.md) | Guía paso a paso para ejecutar las pruebas manuales |
| [`docs/testing/manual-results.md`](docs/testing/manual-results.md) | Registro de resultados de las pruebas manuales |
| [`docs/testing/reports/latest.md`](docs/testing/reports/latest.md) | Último reporte de pruebas (resultados y cobertura por requisito) |
| [`docs/estado-del-proyecto.md`](docs/estado-del-proyecto.md) | **Qué está hecho, qué falta, cuánto tarda y qué bloquea** |
| [`docs/handbook/`](docs/handbook/00-indice.md) | Manual para construir y replicar el sistema (método, cronología, plan de fin de semana, lecciones) |
| [`docs/runbooks/`](docs/runbooks) | Integración del QR, operación diaria y limpieza de datos |
| [`docs/manuales/`](docs/manuales) | Manuales de usuario: comprador, vendedor, admin general, finanzas |
| [`docs/uat/`](docs/uat/00-plan-uat.md) | Pruebas de aceptación por rol (55 casos) |
| [`docs/testing/e2e-plan.md`](docs/testing/e2e-plan.md) | Plan de pruebas integrales (E2E) |
| [`docs/open-questions.md`](docs/open-questions.md) | Preguntas abiertas que bloquean specs |
| [`specs/`](specs) | Una carpeta por feature: `spec.md` → `plan.md` → `tasks.md` |

## Flujo SDD (por cada feature)

1. **Spec** (`spec.md`): QUÉ y POR QUÉ. Historias, requisitos (FR-xxx), criterios de aceptación Given/When/Then. Sin tecnología.
2. **Plan** (`plan.md`): CÓMO. Diseño técnico, datos, contratos. Se escribe solo con la spec aprobada.
3. **Tasks** (`tasks.md`): tareas pequeñas y verificables, cada una trazada a un FR.
4. **Implement**: código + pruebas que demuestran cada criterio de aceptación.
5. **Verify**: matriz de trazabilidad FR → test → PR.

## Stack decidido

Retiro en persona · comisión 1 % por transacción · vendedores aprobados por el admin (RBAC estricto) · foco en revendedores de TikTok Live y venta de pertenencias.

PWA (React + Vite + TypeScript) · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · API QR Banco Económico · hosting estático (GitHub Pages / Cloudflare Pages / Vercel).

## Seguridad de secretos

La *secret key* del banco **nunca** va al repo ni al frontend. Vive solo en los secretos de Supabase Edge Functions. Ver `.env.example`.
