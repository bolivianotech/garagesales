# Runbook 02 · Operación diaria

Para el **Administrador General** y el **Administrador de Finanzas**. Cada tarea tiene su frecuencia y quién la hace.

## Rutina diaria (15 minutos)

| Hora | Tarea | Quién | Dónde | Si algo está mal |
|---|---|---|---|---|
| 08:30 | Revisar **pagos en revisión** | Finanzas | Panel → Pagos → En revisión | Reembolsar o resolver el mismo día (sección 2) |
| 08:40 | Revisar **solicitudes de vendedores** | Admin | Panel → Vendedores | Aprobar o rechazar con motivo |
| 08:50 | Revisar **entregas pendientes** | Admin | Panel → Retiros → No entregados | Contactar al comprador (reporte con teléfono) |
| 09:00 | Mirar **alertas** (conciliación, auditoría) | Admin | Correo/panel | Ver sección 4 |
| 18:00 | Cierre: pagos del día vs. cuenta del banco | Finanzas | Reporte "Quién pagó" y estado de cuenta | Diferencia → investigar antes de dormir |

## Rutina semanal
- Finanzas: generar **Saldos por pagar** (spec 006) y pagar a cada vendedor al QR/cuenta registrado; registrar la liquidación.
- Admin: revisar productos reportados u ocultos; revisar vendedores suspendidos.
- Ambos: revisar `audit_log` (accesos y cambios de datos de cobro).

## Rutina mensual
- Copia de seguridad verificada (restaurar en un proyecto de pruebas una vez al trimestre).
- Revisar uso de Supabase (almacenamiento, correos) y Cloudflare.
- Revisar vigencia de los QR de cobro de vendedores (alertas a 30 días).
- Probar el flujo de compra con Bs 0,01.
- Actualizar `docs/estado-del-proyecto.md` y el reporte de pruebas.

## 1. Aprobar o rechazar un vendedor
1. Panel de admin → **Vendedores** → abrir la solicitud.
2. Verificar nombre de tienda, tipo de vendedor y lugar de retiro; contactar si hay dudas.
3. **Aprobar**, o **Rechazar/Suspender** escribiendo el motivo (queda en la auditoría).
4. Un vendedor aprobado solo ve y edita lo suyo.

## 2. Resolver un pago en revisión
| Motivo | Qué significa | Qué hacer |
|---|---|---|
| Sin stock suficiente | Otro comprador pagó primero | **Reembolsar**: transferir al pagador (nombre y banco del reporte) y anotarlo |
| Monto distinto | Pagó otro valor | Reembolsar y pedir que repita el pedido |
| Pedido ya pagado | Pago duplicado | Reembolsar el duplicado |
| Tienda/producto no disponible | Se suspendió o se ocultó | Reembolsar |
Siempre: avisar al comprador por su teléfono, dejar nota y cerrar el caso el mismo día.

## 3. Entregas
- El vendedor ve en **Por entregar** el nombre, teléfono y pagador de cada comprador y valida el **código de retiro** al entregar.
- Reporte de **no entregados** y de **tiempo de retiro por cliente** (spec 007) para recordar a quienes tardan.
- Si un comprador pierde su código: se reabre su **comprobante** con el enlace guardado o el admin lo reenvía.

## 4. Alertas y qué hacer

| Alerta | Causa probable | Acción |
|---|---|---|
| `verify_audit_chain()` ≠ null | Alguien alteró el registro | **Incidente grave**: congelar cambios, revisar accesos al panel de Supabase, rotar credenciales |
| Diferencia en conciliación | Pago sin pedido o pedido sin pago | Revisar `payments` y estado de cuenta; corregir con asiento de reversa, nunca editando |
| `check-payment` sin correr | Falla del cron o de la función | Reiniciar tarea; revisar logs |
| Error de autenticación con el banco | Credenciales cambiadas o usuario deshabilitado | Contactar al banco; verificar secretos |
| Pagos en revisión acumulándose | Mucha competencia por pocos productos | Ver sección 2; considerar cantidades mayores |

## 5. Soporte a usuarios (preguntas frecuentes)
| Pregunta | Respuesta |
|---|---|
| "Pagué y no me aparece" | Esperar 1 minuto; ver "Mis pedidos"; si persiste, buscar el pedido en el reporte por nombre del pagador |
| "El producto ya no está" | Si pagó tarde, su pedido quedó en revisión: reembolso |
| "No me llegó el correo de confirmación" | Revisar Spam; crear la cuenta desde Supabase con *Auto Confirm* |
| "Olvidé mi contraseña" | Supabase Auth → *Send password recovery* o `ingresar` → recuperar |
| "Quiero vender" | Crear cuenta → *Mi cuenta* → *Solicitar ser vendedor* → esperar aprobación |

## 6. Operaciones de datos (siempre con copia de seguridad)
- **Nunca** editar `audit_log`, `ledger`, `payouts` ni métodos de cobro (son inmutables); las correcciones son nuevos asientos.
- Cambios de configuración (`commission_bps`, vigencia): solo Finanzas, quedan auditados.
- Cambios de datos de cobro de un vendedor: solicitud del vendedor → aprobación de Finanzas → 24 h de enfriamiento.

## 7. Contactos y escalamiento (completar antes del lanzamiento)
| Tema | Persona | Contacto |
|---|---|---|
| Banco / QR | | |
| Supabase / servidor | | |
| Soporte a compradores | | |
| Incidentes de seguridad | | |
