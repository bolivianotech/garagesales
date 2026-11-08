# Registro de resultados de pruebas manuales

Los casos (pasos, precondiciones, resultado esperado) están en [`test-plan.md`](test-plan.md) y la guía de ejecución en [`manual-test-guide.md`](manual-test-guide.md).

**Cómo registrar:** cada prueba termina con uno de estos resultados: `OK`, `FALLA` o `Bloqueada`. Anota fecha, quién la ejecutó, la evidencia (captura guardada en `docs/testing/evidence/` o enlace) y observaciones. Puedes editar esta tabla directamente en GitHub o enviarme los resultados por el chat y yo los registro. El reporte automático (`reports/latest.md`) lee esta tabla.

| ID | Prueba | Resultado | Fecha | Ejecutor | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| MT-10 | El sitio carga y las rutas internas funcionan al recargar | OK | 2026-11-08 | Dueño del producto | |  |
| MT-01 | Registro, confirmación de correo, ingreso y datos de perfil | OK | 2026-11-08 | Dueño del producto | |  |
| MT-02 | Solicitud de vendedor y aprobación del admin | OK | 2026-11-08 | Dueño del producto | |  |
| MT-04 | Subir producto con foto de ~4 MB y verlo en el catálogo | OK | 2026-11-08 | Dueño del producto | | Confirmado por el dueño en el chat. |
| MT-06 | Cantidad 0 lo marca agotado; al reponer vuelve | OK | 2026-11-08 | Dueño del producto | |  |
| MT-07 | Pausar y publicar | OK | 2026-11-08 | Dueño del producto | |  |
| MT-05 | Carga rápida de 10 fotos | OK | 2026-11-08 | Dueño del producto | |  |
| MT-03 | Aislamiento: un vendedor no ve ni abre lo del otro | Parcial | 2026-11-08 | Dueño del producto | | Pasos 1 a 3 OK (cada vendedor ve solo lo suyo). Paso 4 sin comprobar: no se conocía el ID del producto del otro vendedor. Se completa con la consulta SQL de la guía. |
| MT-08 | Subida en menos de 10 s con 4G | OK | 2026-11-08 | Dueño del producto | |  |
| MT-09 | Admin oculta un producto y queda auditado | Bloqueada | | | | Requiere la pantalla de admin para ocultar productos (T12 de la spec 002). La función SQL no se puede ejecutar desde el SQL Editor porque depende de la sesión del admin. |
