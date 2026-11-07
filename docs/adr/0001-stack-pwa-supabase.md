# ADR-0001: PWA + Supabase

- **Estado:** Aceptada · 2026-11-07
- **Contexto:** Se requiere app móvil sincronizada con web, marketplace multi-vendedor y pago QR, con equipo pequeño y necesidad de salir rápido.
- **Decisión:** Una PWA (React + Vite + TypeScript) instalable en móvil; backend en Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).
- **Consecuencias (+):** un solo código y sincronización inmediata; sin costos ni revisión de tiendas de apps; RLS da seguridad declarativa.
- **Consecuencias (−):** notificaciones push y APIs nativas limitadas en iOS; dependencia de Supabase. Si luego se requiere app nativa, se puede envolver con Capacitor reutilizando el código.
- **Alternativas descartadas:** Flutter/React Native (doble base de código), Firebase (datos relacionales menos naturales), API propia (más infraestructura).
