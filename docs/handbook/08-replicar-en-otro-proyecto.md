# 08 · Replicar la solución en tu propio proyecto

## Qué es reutilizable tal cual
| Pieza | Dónde | Reutilizable en… |
|---|---|---|
| Método SDD y plantillas | `docs/templates/`, `docs/handbook/01…` | Cualquier proyecto de software |
| Roles, RBAC y auditoría inmutable | migración `…foundation.sql` | Cualquier app con administradores y usuarios |
| Catálogo con fotos (compresión + Storage) | migración `…products.sql`, `apps/pwa/src/lib/images.ts` | Tiendas, inmuebles, vehículos, servicios |
| Pedidos, confirmación atómica y concurrencia | migración `…orders.sql` | Cualquier venta de existencias limitadas |
| Generador de reporte con trazabilidad | `scripts/test_report.py` | Cualquier proyecto con specs numeradas |
| Pruebas SQL con Postgres local | `supabase/tests/` | Cualquier proyecto Supabase |

## Qué debes adaptar
| Elemento | Cambio |
|---|---|
| Nombre, textos, categorías | `apps/pwa/src/lib/products.ts` (`CATEGORIES`), textos de pantallas, `index.html` |
| Moneda | Hoy `BOB` con centavos enteros; cambiar `currency` y `formatBs` |
| Proveedor de pago | Escribir otro adaptador que cumpla la misma interfaz (`createQr`, `getStatus`, `cancelQr`) — el resto no cambia |
| Comisión y vigencia | Tabla `settings` (`commission_bps`, `order_valid_hours`) |
| Reglas de negocio | Nuevas specs; si cambian reglas centrales (p. ej. reserva), ADR |

## Plantilla de arranque (pasos)
1. **Duplica** el repositorio y hazlo **privado**.
2. Reemplaza identificadores del negocio (`GarageSales`, dominios, textos).
3. Reescribe `docs/open-questions.md` con **tus** preguntas.
4. Ajusta o crea specs con la [plantilla](../templates/spec-template.md) y apruébalas.
5. Aplica migraciones, corre `bash supabase/tests/run.sh` y verifica verde.
6. Despliega primero la versión vacía (capítulo 06).
7. Sigue el plan del capítulo 03.

## Cómo pedirle ayuda al asistente de IA (prompts que funcionaron)
Escribe en el primer mensaje: **qué es el producto, quién lo usa, qué API de pago tienes, dónde está el repositorio** y pide explícitamente SDD.

```text
Quiero construir <producto>. Usuarios: <roles>. Pago: <banco/API>. Repositorio: <url>.
Trabajemos con Spec Driven Development: primero el paso a paso y las specs con requisitos
numerados; pregúntame lo que no sepas con opciones y una recomendación.
```
```text
Escribe la spec NNN con el formato de docs/templates/spec-template.md. Incluye FR y NFR con ID
y criterios Dado/Cuando/Entonces. No escribas código todavía.
```
```text
La spec NNN está Approved. Escribe plan.md y tasks.md; luego implementa la migración y las
pruebas con IDs TC-…, ejecútalas y regenera el reporte. Dime qué quedó verificado y qué no.
```
```text
Revisa que no haya secretos en el repositorio y en el historial antes de hacerlo público.
```

## Errores a evitar al replicar
- Subir capturas, `.env`, llaves o contraseñas (revisa el capítulo 09).
- Empezar por pantallas sin spec aprobada.
- Dejar el banco para el final.
- No probar concurrencia en una tienda de existencias limitadas.
- Aceptar "listo" sin reporte de pruebas.

## Lista de comprobación final de réplica
- [ ] Repo privado y sin secretos en el historial
- [ ] Specs aprobadas y reporte en verde
- [ ] Sitio desplegado con dominio propio
- [ ] Un comprador de prueba pagó y el vendedor entregó
- [ ] Datos de prueba limpiados
- [ ] Manuales de usuario entregados a cada rol
