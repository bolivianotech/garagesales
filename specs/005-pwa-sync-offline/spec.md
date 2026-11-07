# Spec 005 — PWA, sincronización y modo offline

**Estado:** Draft

## Objetivo
Que la app se instale en el teléfono como app móvil y se mantenga sincronizada con la web.

## Requisitos
- FR-040: Manifest y service worker; instalable en Android (Chrome) e iOS (Safari, "Añadir a inicio").
- FR-041: Catálogo visto recientemente disponible sin conexión (solo lectura).
- FR-042: Cola de subida para vendedores: productos/fotos creados sin red se envían al reconectar, con indicador de estado.
- FR-043: Web y móvil comparten sesión y datos en tiempo real (Realtime).
- FR-044: Notificaciones Web Push de nueva venta para vendedores (donde la plataforma lo permita).
- FR-045: Aviso de nueva versión disponible y actualización controlada.
- NFR-007: Lighthouse PWA ≥ 90, rendimiento ≥ 80 en móvil con 3G simulado.
- NFR-008: Primera carga < 3 s en 4G; imágenes con lazy loading y tamaños responsivos.

## Criterios de aceptación
- **Dado** un vendedor sin conexión, **cuando** crea un producto, **entonces** queda "pendiente de subir" y se publica al volver la red.
- **Dado** un producto editado en la web, **cuando** el vendedor abre la app instalada, **entonces** ve el cambio sin recargar manualmente.
- **Dado** que el comprador no tiene red, **cuando** abre la app, **entonces** ve el último catálogo cacheado con aviso "sin conexión" y no puede pagar.
