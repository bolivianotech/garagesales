# GarageSales

Marketplace de garage sales: los **vendedores** publican productos (foto, precio, cantidad) y los **compradores** compran desde una **PWA instalable** (web + móvil, un solo código) pagando con **QR del Banco Económico**.

> Metodología: **Spec Driven Development (SDD)**. Ningún código se escribe sin una spec aprobada. Ver [`docs/constitution.md`](docs/constitution.md).

## Mapa de documentación

| Documento | Para qué sirve |
|---|---|
| [`docs/constitution.md`](docs/constitution.md) | Principios y reglas no negociables del proyecto |
| [`docs/roadmap.md`](docs/roadmap.md) | **Paso a paso** de implementación (fases, entregables, criterios de salida) |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura, modelo de datos, seguridad |
| [`docs/adr/`](docs/adr) | Decisiones de arquitectura (ADR) |
| [`docs/open-questions.md`](docs/open-questions.md) | Preguntas abiertas que bloquean specs |
| [`specs/`](specs) | Una carpeta por feature: `spec.md` → `plan.md` → `tasks.md` |

## Flujo SDD (por cada feature)

1. **Spec** (`spec.md`): QUÉ y POR QUÉ. Historias, requisitos (FR-xxx), criterios de aceptación Given/When/Then. Sin tecnología.
2. **Plan** (`plan.md`): CÓMO. Diseño técnico, datos, contratos. Se escribe solo con la spec aprobada.
3. **Tasks** (`tasks.md`): tareas pequeñas y verificables, cada una trazada a un FR.
4. **Implement**: código + pruebas que demuestran cada criterio de aceptación.
5. **Verify**: matriz de trazabilidad FR → test → PR.

## Stack decidido

PWA (React + Vite + TypeScript) · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · API QR Banco Económico · hosting estático (GitHub Pages / Cloudflare Pages / Vercel).

## Seguridad de secretos

La *secret key* del banco **nunca** va al repo ni al frontend. Vive solo en los secretos de Supabase Edge Functions. Ver `.env.example`.
