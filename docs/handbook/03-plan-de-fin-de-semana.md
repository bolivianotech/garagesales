# 03 · Plan de fin de semana: replicar GarageSales

> **Alcance honesto:** este plan te lleva de "cero" a **un marketplace desplegado con catálogo, pedidos y comprobante, listo para conectar el QR del banco** en dos días, **usando este repositorio como plantilla**. Construirlo desde cero siguiendo SDD toma entre una y dos semanas (ver `docs/estado-del-proyecto.md`). La integración con el banco depende de que el banco habilite tu usuario: **gestiónalo el viernes**.

## Antes del fin de semana (viernes, 1 hora)

| Tarea | Detalle | Listo cuando |
|---|---|---|
| Cuentas gratuitas | GitHub, Supabase, Cloudflare | Puedes ingresar a las tres |
| Banco | Solicitar usuario API Market/QR Conecta y su habilitación en certificación; pedir la llave AES por el canal seguro del banco | Tienes usuario habilitado (prueba de `authenticate` responde 200) |
| Herramientas | Node 22, Git, VS Code, un cliente HTTP (Hoppscotch o Postman) | `node -v` muestra 22 |
| Correos | Dos correos para administración y un Gmail para cuentas de prueba con `+` | Los puedes abrir |
| Asistente de IA | Claude Code (o similar) con acceso al repositorio | Responde en tu carpeta |

## Sábado: infraestructura y base (8 h)

| Hora | Bloque | Pasos | Salida |
|---|---|---|---|
| 09:00 | **Repositorio** (30 min) | Crear tu repositorio a partir de este (`Use this template` o clonar y cambiar el remoto). **Hazlo privado.** | Repo propio |
| 09:30 | **Supabase** (45 min) | Crear proyecto; guardar URL y clave pública; ejecutar en orden las migraciones de `supabase/migrations/` en el SQL Editor | Tablas creadas |
| 10:15 | **Pruebas locales** (30 min) | `bash supabase/tests/run.sh` y `cd apps/pwa && npm ci && npm test` | 163 casos verdes |
| 10:45 | **Cloudflare** (60 min) | Seguir `docs/deploy-cloudflare.md`: raíz `apps/pwa`, build `npm run build`, variables de Supabase | URL pública que carga |
| 11:45 | **Autenticación** (45 min) | Site URL y Redirect URLs en Supabase; crear usuarios admin y finanzas; `bootstrap_staff_role` | Ingresas como admin |
| 12:30 | Almuerzo | | |
| 13:30 | **Spec propia** (90 min) | Copiar plantillas de `docs/templates/`; escribir/ajustar specs (nombre del negocio, categorías, comisión) y aprobarlas | Specs `Approved` |
| 15:00 | **Marca y datos** (90 min) | Cambiar nombre, colores, categorías, textos; configurar `settings` (comisión, vigencia) | Se ve tu marca |
| 16:30 | **Pruebas manuales** (60 min) | Ejecutar `MT-01` a `MT-10` con `docs/testing/manual-test-guide.md` | `manual-results.md` completo |
| 17:30 | **Cierre** (30 min) | `python3 -I scripts/test_report.py`, commit, revisar el reporte | Reporte verde |

**Punto de control sábado:** tu sitio está en internet, con cuentas, roles y catálogo; el reporte automático está en verde.

## Domingo: pedidos, pago y UAT (8 h)

| Hora | Bloque | Pasos | Salida |
|---|---|---|---|
| 09:00 | **Pedidos** (45 min) | Aplicar migración `…_orders.sql`; correr pruebas de pedidos y concurrencia | 65 casos verdes |
| 09:45 | **Pantallas de compra** (150 min) | Carrito, pago, mis pedidos, comprobante, "Por entregar" (spec 003 y 007). Con asistente, cada pantalla es una tarea de `tasks.md` | Flujo visible |
| 12:15 | Almuerzo | | |
| 13:15 | **QR del banco** (150 min) | Seguir el [runbook de integración](../runbooks/01-integracion-qr-dinamico.md): secretos, Edge Functions, pruebas en certificación | Un QR generado y un pago de prueba confirmado |
| 15:45 | **E2E** (45 min) | `e2e/` con `E2E_BASE_URL` y cuentas de prueba | Ciclo completo en verde |
| 16:30 | **UAT** (60 min) | Un compañero por rol ejecuta `docs/uat/` | Defectos registrados |
| 17:30 | **Limpieza y lanzamiento** (30 min) | [Runbook de limpieza](../runbooks/03-limpieza-de-datos.md), cambiar a producción, probar con Bs 0,01 | Sitio listo |

**Punto de control domingo:** un comprador real puede pagar un producto de prueba y el vendedor entrega con código.

## Si algo falla, en este orden
1. Mira el log del paso (Cloudflare → *Deployments*; Supabase → *Logs*).
2. Busca el síntoma en [07 · Lecciones aprendidas](07-lecciones-aprendidas.md).
3. Si es del banco, usa `docs/integraciones/consulta-al-banco.md`.
4. Registra el problema en `docs/open-questions.md` y sigue con otra tarea; no te quedes bloqueado.

## Reparto sugerido para un equipo de 3
| Persona | Responsabilidad |
|---|---|
| Producto | Specs, decisiones, UAT, banco |
| Datos/Backend | Supabase, migraciones, Edge Functions, pruebas SQL |
| Frontend | PWA, E2E, despliegue |
