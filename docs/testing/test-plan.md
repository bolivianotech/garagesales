# Plan de pruebas

Este documento define **cómo** se prueba GarageSales. Los **resultados** de cada corrida automatizada se publican en [`reports/latest.md`](reports/latest.md) (con historial fechado en `reports/`).

## 1. Estrategia

| Nivel | Qué verifica | Herramienta | Dónde corre | Quién lo ejecuta |
|---|---|---|---|---|
| Base de datos | RLS, reglas de negocio, estados, auditoría inmutable, Storage | SQL puro (`supabase/tests/*.sql`) sobre PostgreSQL | Local y CI (Postgres 16, Supabase simulado) | Automático |
| Lógica de interfaz | Validaciones, dinero, fotos, permisos de pantalla | Vitest (`apps/pwa/src/**/*.test.ts`) | Local y CI | Automático |
| Calidad estática | Tipos y compilación | `tsc --noEmit`, `vite build` | Local, CI y Cloudflare | Automático |
| Integración real | Supabase real, Storage, Auth, Cloudflare | Casos manuales `MT-xx` (sección 4) | Entorno desplegado | Dueño del producto |
| Aceptación | Criterios Given/When/Then de cada spec | Casos manuales y automáticos trazados | — | Dueño + equipo |
| Integración bancaria | QR, estado del pago, conciliación | Sandbox del banco (spec 004) | Certificación | Pendiente (Fase 4) |

## 2. Convenciones

- **Identificadores estables:** `TC-001-NN` y `TC-002-NN` (SQL de cada suite), `TC-UI-NN` (Vitest), `MT-NN` (manuales). Un ID nunca se reutiliza; los casos nuevos continúan la numeración.
- **Trazabilidad:** cada caso cita el requisito que verifica (`FR-xxx` / `NFR-xxx`) en su descripción. El reporte cruza requisitos de las specs aprobadas contra casos y marca los que no tienen prueba.
- **Dos tipos de caso negativo obligatorios** en seguridad: el acceso indebido debe fallar *y* quedar demostrado el acceso legítimo.
- **Datos de prueba** se crean dentro de cada suite; nunca se usan datos ni credenciales reales.

## 3. Criterios

- **Entrada (para empezar a probar una fase):** spec en `Approved`, plan y tareas escritos, migración aplicada en el entorno.
- **Salida (para cerrar una fase):** 0 casos fallando, reporte actualizado y commiteado, requisitos en alcance con prueba automatizada o prueba manual ejecutada y registrada, riesgos pendientes documentados en el plan.
- **Regla de oro:** no se declara "terminado" lo que no tiene resultado registrado.

## 4. Casos manuales (aceptación e integración real)

Se ejecutan en el entorno desplegado siguiendo la [guía paso a paso](manual-test-guide.md). Los resultados se registran en [`manual-results.md`](manual-results.md). Estado inicial: **pendiente de ejecución**.

| ID | Requisito | Precondición | Pasos | Resultado esperado |
|---|---|---|---|---|
| MT-01 | FR-001, FR-002 | Migraciones aplicadas; correo de prueba | 1. Abrir la app. 2. Registrarse con correo y contraseña de 8+ caracteres. 3. Cerrar sesión e ingresar de nuevo. 4. Completar nombre y teléfono en "Mi cuenta". | Se crea la cuenta, se ingresa y los datos quedan guardados.
| MT-02 | FR-003, FR-005 | Cuenta comprador; cuenta admin con rol asignado | 1. Comprador: "Solicitar ser vendedor". 2. Admin: abrir el panel y aprobar. 3. Comprador: recargar "Mi cuenta". | La tienda pasa de "En revisión" a "Aprobada" y aparece "Ir a mi panel de vendedor".
| MT-03 | FR-004, NFR-001 | Dos vendedores aprobados A y B (el B puede ser un alias `+b` del mismo Gmail), cada uno con productos | 1. Entrar como A y mirar "Mis productos". 2. Entrar como B y repetir. 3. Como A, intentar abrir `/vender/producto/<id de B>`. | Cada vendedor ve solo lo suyo; el producto ajeno no carga.
| MT-04 | FR-010, FR-011 (criterio de aceptación de la spec 002) | Vendedor aprobado; celular; foto de ~4 MB | 1. "Nuevo producto". 2. Subir la foto, precio 50, cantidad 3, publicar. 3. Abrir el catálogo (sin sesión). | El producto aparece con la foto reducida (≈ 400 KB, ≤ 1600 px) y precio Bs 50,00.
| MT-05 | FR-015 | Vendedor aprobado | 1. "Carga rápida". 2. Elegir 10 fotos a la vez. 3. Completar precio y cantidad de dos borradores. | Se crean 10 borradores; los completados se pueden publicar.
| MT-06 | FR-012 | Producto publicado con cantidad 1 | 1. Editar y poner cantidad 0. 2. Mirar el catálogo. 3. Reponer cantidad 2. | Pasa a "Agotado" y desaparece; al reponer vuelve a publicarse.
| MT-07 | FR-012 | Producto publicado | 1. "Pausar". 2. Mirar el catálogo. 3. "Publicar". | Desaparece del catálogo al pausar y vuelve al publicar.
| MT-08 | NFR-002 | Celular con 4G | Subir un producto con una foto de ~4 MB y cronometrar desde "Publicar" hasta volver al panel. | < 10 segundos.
| MT-09 | NFR-001, FR-005 | Admin y un producto publicado | Ocultar el producto desde la pantalla de admin y mirar el catálogo. | El producto deja de verse en el catálogo y queda un registro en `audit_log`. **Bloqueada** hasta que exista la pantalla de admin (T12 de la spec 002): la función SQL depende de la sesión del admin y no se puede ejecutar desde el SQL Editor. |
| MT-10 | Despliegue | Cloudflare con `main` actualizado | Abrir la URL pública en celular y en computador; recargar en `/cuenta`. | Carga sin errores; la recarga en rutas internas funciona.

## 5. Cómo ejecutar todo

```bash
python3 -I scripts/test_report.py   # corre SQL + Vitest + tipos + build y regenera docs/testing/reports/
```

Por separado: `bash supabase/tests/run.sh` (base de datos) y `cd apps/pwa && npm test` (interfaz).

## 6. Limitaciones conocidas

- La base de datos se prueba en un Postgres local con un esquema de Supabase simulado (`auth`, `storage`). Las políticas de Storage y Auth reales solo se validan con los casos manuales.
- No hay pruebas de navegador automatizadas todavía (Playwright está previsto para la Fase 6).
- La compresión de fotos se prueba por su lógica de tamaños; la compresión real con `canvas` se verifica en MT-04/MT-08.
