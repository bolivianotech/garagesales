# Plantilla de caso de prueba

| Campo | Contenido |
|---|---|
| **ID** | `TC-<suite>-NN` (automático) · `MT-NN` (manual) · `UAT-<ROL>-NN` (aceptación) · `E2E-NN` (integral) |
| **Requisito(s)** | FR-NNN, NFR-NNN |
| **Tipo** | Unitaria · Base de datos · Concurrencia · Integración · E2E · UAT |
| **Precondiciones** | Datos y cuentas necesarios |
| **Pasos** | 1. … 2. … |
| **Resultado esperado** | Observable y sin ambigüedad |
| **Resultado** | OK · FALLA · Bloqueada · Pendiente |
| **Evidencia** | Captura o enlace en `docs/testing/evidence/` |

Regla de redacción: un caso prueba **una** cosa; si falla, debe estar claro qué se rompió. Para seguridad, siempre dos casos: el acceso indebido falla **y** el legítimo funciona.
