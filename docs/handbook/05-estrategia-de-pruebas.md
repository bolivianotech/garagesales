# 05 · Estrategia de pruebas

> Principio: **una funcionalidad no está terminada si no tiene una prueba que falle cuando se rompe.** Y una prueba que nadie ejecutó no cuenta.

## 1. La pirámide

```
                       ┌───────────────┐
                       │  UAT por rol  │  personas reales, ambiente real        (docs/uat/)
                       ├───────────────┤
                       │  E2E integral │  navegador + base real + banco         (e2e/)
                    ┌──┴───────────────┴──┐
                    │  Integración         │  Edge Functions ↔ banco certificación
                 ┌──┴──────────────────────┴──┐
                 │  Concurrencia              │  20 pagos simultáneos, 1 unidad
              ┌──┴────────────────────────────┴──┐
              │  Base de datos (SQL)             │  RLS, reglas, auditoría   (supabase/tests/)
           ┌──┴──────────────────────────────────┴──┐
           │  Unitarias (Vitest)                    │  dinero, fotos, validaciones, permisos
        ┌──┴────────────────────────────────────────┴──┐
        │  Estáticas: tipos (tsc) y compilación (vite) │
        └──────────────────────────────────────────────┘
```

## 2. Qué cubre cada nivel

| Nivel | Herramienta | Ejemplos de este proyecto | Cuándo corre |
|---|---|---|---|
| Estáticas | `tsc --noEmit`, `vite build` | Errores de tipos, compilación | Cada commit (CI) y en cada build de Cloudflare |
| Unitarias | Vitest (`TC-UI-xx`) | `parseBsToCents("49,90") = 4990`; fotos ≤ 1600 px | Cada commit |
| Base de datos | SQL puro (`TC-001/002/003-xx`) | "Un vendedor no ve productos de otro", "no se publica sin foto" | Cada commit y antes de aplicar migraciones |
| Concurrencia | psql en paralelo (`TC-004-xx`) | 20 pagos, 1 unidad → 1 pagado, 19 en revisión | Cada commit |
| Integración | Edge Functions contra certificación | `generateQR` devuelve `qrId`; `statusQR = 1` | Antes de cada despliegue de funciones |
| E2E | Playwright (`E2E-xx`) | Compra completa de ida y vuelta | Antes y después de cada despliegue |
| UAT | Personas, [`docs/uat/`](../uat/) | Un comprador real paga Bs 0,01 | Antes del lanzamiento y tras cambios grandes |
| Manuales (`MT-xx`) | [`manual-test-guide.md`](../testing/manual-test-guide.md) | Subir foto de 4 MB desde el celular | Cada fase |

## 3. Reglas de las pruebas
1. **ID estable e irrepetible:** `TC-003-12`, `MT-04`, `UAT-CMP-03`, `E2E-02`.
2. **Citan el requisito** (`FR-022`) en el nombre; así el reporte arma la trazabilidad.
3. **Positivo y negativo** para toda regla de seguridad.
4. **Datos propios:** cada suite crea sus datos; jamás depende de datos "que ya estaban".
5. **Sin secretos:** las pruebas usan datos ficticios y un `MockProvider` para el banco.
6. **El reporte se genera, no se escribe a mano:** `python3 -I scripts/test_report.py`.

## 4. Puertas de calidad (gates)

### Antes de integrar un cambio (todo desarrollador)
- [ ] `cd apps/pwa && npm run typecheck && npm test && npm run build`
- [ ] `bash supabase/tests/run.sh`
- [ ] `python3 scripts/check_secrets.py` (sin hallazgos)
- [ ] Reporte regenerado y commiteado cuando cambió algo funcional

### Antes de **desplegar** (checklist pre-despliegue)
- [ ] CI en verde en la rama a fusionar
- [ ] Migración nueva revisada y probada en local; copia de seguridad de la base (Supabase → *Database → Backups*)
- [ ] Variables y secretos presentes en el ambiente destino (nombres, no valores)
- [ ] Si cambian Edge Functions: pruebas de integración en certificación en verde
- [ ] Ventana de despliegue avisada a los usuarios si hay cambios de datos
- [ ] Plan de reversa a la mano (sección 6 de [06 · Despliegue](06-despliegue.md))

### Después de desplegar (checklist post-despliegue, 15 minutos)
- [ ] El sitio carga y `/cuenta` sin sesión lleva a "Ingresar" (`MT-10`)
- [ ] Prueba humo E2E: `npx playwright test --grep @smoke` contra la URL pública
- [ ] Ingreso con cada rol de prueba
- [ ] Catálogo muestra productos; una foto abre
- [ ] Pago de Bs 0,01 de punta a punta (cuando el cobro esté activo)
- [ ] `select public.verify_audit_chain();` devuelve `null`
- [ ] Revisar logs de Edge Functions y de Cloudflare sin errores nuevos
- [ ] Registrar la versión (commit) desplegada y el resultado en `docs/testing/reports/`

## 5. Cómo se lee el reporte
`docs/testing/reports/latest.md` contiene: resumen por suite, **cobertura por requisito** (✅/🖐/⏳/⚠️), pruebas manuales y el detalle de cada caso. Un ⚠️ significa que un requisito aprobado y en alcance **no tiene prueba**: se corrige antes de seguir.

## 6. Qué prueba cada capa en el flujo de compra

| Paso del flujo | Casos que lo cubren |
|---|---|
| Crear pedido con total del servidor | `TC-003-09`, `TC-003-10`, `TC-003-13` |
| Cliente no puede confirmar pagos | `TC-003-20`, `TC-003-21` |
| Confirmación atómica e idempotente | `TC-003-22` a `TC-003-30` |
| Dos pagos, una unidad | `TC-003-31` a `TC-003-36`, `TC-004-01` a `TC-004-05` |
| Monto distinto / pago tardío | `TC-003-37` a `TC-003-42` |
| Comprobante | `TC-003-43` a `TC-003-47` |
| Entrega con código | `TC-003-48` a `TC-003-57` |
| Reporte de pagos | `TC-003-58` a `TC-003-60` |
| Pago real con el banco | `E2E-02` y `UAT-CMP-04` (pendiente de ejecutar) |

## 7. Lo que NO prueban las automáticas (y cómo se cubre)
| Limitación | Cobertura |
|---|---|
| Corren en PostgreSQL local con Supabase simulado | Aplicar migraciones en Supabase y ejecutar `MT-xx` y E2E allí |
| No tocan el banco | Pruebas de integración en certificación + UAT con Bs 0,01 |
| No usan un celular real | `MT-04`, `MT-05`, `MT-08` y UAT del comprador |
| No miden carga de cientos de usuarios | Prueba de carga previa al lanzamiento masivo (pendiente) |
