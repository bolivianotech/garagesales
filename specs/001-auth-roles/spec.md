# Spec 001 — Autenticación y roles

**Estado:** Draft · **Bloqueada por:** Q5

## Objetivo
Permitir que las personas se registren e ingresen, y que cada una actúe como comprador, vendedor o administrador con permisos correctos.

## Historias
- Como **visitante** quiero ver el catálogo sin registrarme.
- Como **comprador** quiero registrarme con email o Google para comprar.
- Como **vendedor** quiero crear mi tienda (nombre, descripción, teléfono) para publicar productos.
- Como **admin** quiero suspender usuarios o productos indebidos.

## Requisitos
- FR-001: Registro/ingreso con email+contraseña y Google.
- FR-002: Todo usuario tiene perfil con nombre y teléfono (obligatorio para comprar).
- FR-003: Un usuario puede activar el rol vendedor y crear exactamente una tienda (aprobación según Q5).
- FR-004: Un vendedor solo puede ver y modificar datos de su propia tienda.
- FR-005: Un admin puede suspender usuarios/tiendas/productos.
- NFR-001: RLS activa en todas las tablas; tests automáticos de acceso cruzado.

## Criterios de aceptación
- **Dado** un usuario vendedor A, **cuando** intenta editar un producto del vendedor B, **entonces** recibe acceso denegado.
- **Dado** un visitante anónimo, **cuando** abre el catálogo, **entonces** ve solo productos `active`.
- **Dado** un usuario suspendido, **cuando** inicia sesión, **entonces** no puede comprar ni publicar.
