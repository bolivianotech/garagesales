# Guía paso a paso: pruebas manuales de la Fase 2

Objetivo: ejecutar los casos `MT-xx` del [plan de pruebas](test-plan.md) y registrar el resultado en [`manual-results.md`](manual-results.md). Tiempo estimado: 45 a 60 minutos.

> Regla simple: **si algo no sale como dice "Debe pasar", la prueba es FALLA**. No es un problema tuyo: es información valiosa. Anota qué hiciste y qué viste (captura de pantalla).

## Parte 0. Preparación (una sola vez)

### 0.1 Corregir la URL de Supabase
1. Entra a Supabase → tu proyecto → **Authentication → URL Configuration**.
2. **Site URL:** `https://garagesales.requenataniel.workers.dev`
3. **Redirect URLs:** agrega `https://garagesales.requenataniel.workers.dev/**` y `http://localhost:5173/**`.
4. Guarda.

### 0.2 Confirmar que las dos migraciones están aplicadas
En **SQL Editor** ejecuta:
```sql
select count(*) as tablas from information_schema.tables
where table_schema = 'public' and table_name in ('profiles','stores','products','product_images','audit_log');
```
Debe devolver `5`. Si devuelve menos, avísame antes de seguir.

### 0.3 Las cuentas que necesitas
Para el segundo vendedor y el comprador necesitas correos distintos, pero no hace falta crear cuentas de Gmail nuevas.

**Truco de Gmail (se llama "dirección con +"):** Gmail ignora todo lo que va entre el signo `+` y el `@`. Entonces `jimrequenallorentty+b@gmail.com` **llega a tu misma bandeja** que `jimrequenallorentty@gmail.com`, pero para Supabase es otro correo y por lo tanto otra cuenta. Se escribe **textualmente con el signo `+`**, en minúsculas.

> **Cuidado:** `jimrequenallorenttyb@gmail.com` (sin el `+`) **no es lo mismo**: sería una dirección de Gmail distinta que quizá pertenece a otra persona. No la uses.

Si el correo de confirmación de una cuenta con `+` no llega en unos minutos (revisa también Spam), crea la cuenta desde Supabase → **Authentication → Users → Add user → Create new user**, con **Auto Confirm User** marcado. Así no depende del correo.

| Rol | Correo (escríbelo exactamente así) | Cómo se crea |
|---|---|---|
| Admin | `jimrequena@bolivianotech.com` | Ya existe con rol `admin`. |
| Finanzas | `requenataniel@gmail.com` | Ya existe con rol `finance_admin`. |
| Vendedor A | `jimrequenallorentty@gmail.com` | Ya registrada y confirmada (aún `buyer` hasta que la apruebes en MT-02). |
| Vendedor B | `jimrequenallorentty+b@gmail.com` | Se crea en MT-03. |
| Comprador | `jimrequenallorentty+c@gmail.com` | Se crea en MT-01. |

### 0.4 Verificar los roles del personal
En **SQL Editor**:
```sql
select u.email, p.role, p.suspended
from auth.users u join public.profiles p on p.id = u.id
order by u.created_at;
```
Debes ver `admin` para el correo de admin y `finance_admin` para el de finanzas, y `buyer` para el vendedor A (todavía sin aprobar). Si falta algún rol de personal, ejecuta (con el correo correcto):
```sql
select public.bootstrap_staff_role('CORREO_DEL_ADMIN', 'admin');
select public.bootstrap_staff_role('CORREO_DE_FINANZAS', 'finance_admin');
```
**Nunca** ejecutes eso para un vendedor: los vendedores se aprueban desde el panel de admin de la app.

### 0.5 Qué necesitas a mano
- Computador con navegador y un **celular**.
- Una foto de ~4 MB (cualquier foto reciente del celular sirve; el límite de origen es 5 MB).
- 10 fotos en el celular (para MT-05).
- Un cronómetro (el del celular).
- La URL: `https://garagesales.requenataniel.workers.dev`

> Consejo: usa una ventana de incógnito para cada cuenta, así no se mezclan las sesiones.

## Parte 1. Orden de ejecución

`MT-10 → MT-01 → MT-02 → MT-04 → MT-06 → MT-07 → MT-05 → MT-03 → MT-08` (MT-09 queda bloqueada, ver al final).

---

### MT-10 · El sitio carga
1. En el computador abre la URL.
2. Debe verse la página "GarageSales" con buscador y categorías (aunque no haya productos).
3. Escribe a mano `…/cuenta` al final de la URL y pulsa Enter.
4. Repite en el celular.

**Debe pasar:** la página carga sin pantalla de error. En `/cuenta` sin sesión te lleva a "Ingresar" (no a una pantalla blanca ni a un error 404).
**Si falla:** anota la URL y copia el mensaje que ves.

### MT-01 · Registro, confirmación e ingreso
1. Ventana de incógnito → abre la URL → **Ingresar** → **¿No tienes cuenta? Regístrate**.
2. Nombre: `Comprador Prueba`; correo `jimrequenallorentty+c@gmail.com`; contraseña de 8+ caracteres. **Registrarme**.
3. Debe decir "Revisa tu correo para confirmar la cuenta".
4. Abre el correo de Supabase y pulsa **Confirm email address**.
5. Debe llevarte a la app (ya no a `localhost:3000`) y mostrar **Mi cuenta**.
6. En **Mi cuenta** escribe nombre y teléfono (ej. 70000000) → **Guardar**.
7. **Cerrar sesión** y vuelve a **Ingresar** con el mismo correo y contraseña.
8. Recarga la página.

**Debe pasar:** el enlace del correo abre la app en tu dominio; la sesión se mantiene al recargar; nombre y teléfono quedan guardados.
**Si falla:** anota en qué paso. Si el enlace va a `localhost:3000`, revisa la parte 0.1.

### MT-02 · Solicitud de vendedor y aprobación
1. Ventana de incógnito → ingresa con el **Vendedor A** (`jimrequenallorentty@gmail.com`).
2. **Mi cuenta** → completa nombre y teléfono → en **Vender**, nombre de tienda `Tienda A`, tipo `Revendedor de TikTok Live`, lugar de retiro `Av. Ejemplo 123, sábados 10-12` → **Solicitar ser vendedor**.
3. Debe verse "Tienda Tienda A: En revisión".
4. Otra ventana de incógnito → ingresa como **Admin** → **Mi cuenta** → **Ir al panel de administración**.
5. Pulsa **Aprobar** en `Tienda A`.
6. Vuelve a la ventana del vendedor A, recarga **Mi cuenta**.

**Debe pasar:** el estado cambia a "Aprobada" y aparece **Ir a mi panel de vendedor**.
**Si falla:** anota el mensaje de error en rojo.

### MT-04 · Producto con foto de ~4 MB (criterio de aceptación de la spec)
1. En el **celular**, ingresa como Vendedor A → **Ir a mi panel de vendedor** → **Nuevo producto**.
2. **+ Foto** → elige la foto de ~4 MB.
3. Título `Camisa azul`, precio `50`, cantidad `3`, categoría `Ropa` → **Publicar**.
4. Vuelve al panel: debe aparecer `Camisa azul`, Bs 50,00, cantidad 3, "Publicado".
5. Abre la URL **sin sesión** (incógnito) y busca la camisa.
6. Opcional: toca la foto con clic derecho → abrir imagen en pestaña nueva, y mira su tamaño.

**Debe pasar:** el producto aparece en el catálogo público con la foto y "Bs 50,00". La foto debería pesar bastante menos que 4 MB (≈ 400 KB).
**Si falla:** anota el mensaje. Si dice algo sobre "policy" o "permission", es el caso de las políticas de fotos: avísame de inmediato.

### MT-06 · Agotado automático
1. Como Vendedor A abre `Camisa azul` → **Editar** → cantidad `0` → **Guardar cambios**.
2. En el panel debe decir "Agotado". Mira el catálogo público: no debe aparecer.
3. Edita otra vez: cantidad `2` → guarda.

**Debe pasar:** pasa a "Agotado" y desaparece del catálogo; al reponer vuelve a "Publicado" y a verse.

### MT-07 · Pausar y publicar
1. En el panel, en `Camisa azul` pulsa **Pausar**. Mira el catálogo público: no aparece.
2. Pulsa **Publicar**. Mira el catálogo: aparece de nuevo.

**Debe pasar:** desaparece al pausar y vuelve al publicar.

### MT-05 · Carga rápida
1. En el celular, panel del Vendedor A → **Carga rápida** → **Elegir fotos** → selecciona 10 fotos.
2. Espera el mensaje "Subiendo N de 10…" hasta que te devuelva al panel.
3. Debe haber 10 borradores con el aviso "Tienes 10 borradores sin precio".
4. Abre dos borradores (**Completar**), pon título, precio y cantidad, y publica.

**Debe pasar:** se crean 10 borradores y los dos completados se publican y aparecen en el catálogo.

### MT-03 · Aislamiento entre vendedores
1. Ventana nueva → registra el **Vendedor B** (`jimrequenallorentty+b@gmail.com`), confirma su correo, completa su perfil y solicita ser vendedor con `Tienda B`. El admin la aprueba (como en MT-02).
2. Como Vendedor B, publica un producto `Zapatos B` (foto, precio 80, cantidad 1).
3. Como Vendedor B, abre **Mis productos**: solo debe ver `Zapatos B` (no la camisa ni los borradores del A).
4. Obtén el ID del producto del Vendedor A. En Supabase → **SQL Editor** ejecuta:
   ```sql
   select id, title from public.products where title = 'Camisa azul';
   ```
   Copia el valor de la columna `id` (una cadena larga como `3f2a…`).
5. En la sesión del **Vendedor B**, escribe en la barra del navegador: `https://garagesales.requenataniel.workers.dev/vender/producto/` seguido del ID copiado, y pulsa Enter.
6. Mira qué pasa.

**Debe pasar:** el Vendedor B ve únicamente lo suyo; al abrir la dirección del producto del A, no se cargan sus datos (aparece un error o un formulario vacío, nunca los datos del A).
**Si falla:** es una falla de seguridad importante. No sigas probando datos reales y avísame al instante.

### MT-08 · Tiempo de subida
1. En el celular con **4G** (no Wi-Fi), como Vendedor A → **Nuevo producto** con una foto de ~4 MB, título, precio y cantidad.
2. Inicia el cronómetro al pulsar **Publicar** y detenlo cuando vuelvas al panel.
3. Repite 2 veces más y anota el tiempo de cada una.

**Debe pasar:** menos de 10 segundos.
**Registra** los tres tiempos en Observaciones.

### MT-09 · BLOQUEADA
Ocultar un producto como admin necesita una pantalla que aún no existe. La función de base de datos no se puede ejecutar desde el SQL Editor porque identifica al admin por su sesión. Queda bloqueada hasta construir esa pantalla.

## Parte 2. Cómo registrar los resultados

Elige una de las dos formas:
1. **Por el chat (más fácil):** escríbeme, por ejemplo: `MT-10 OK, MT-01 OK, MT-02 FALLA: al aprobar sale error "xxx"`. Si tienes capturas, adjúntalas. Yo actualizo `manual-results.md`, guardo las capturas como evidencia y regenero el reporte.
2. **Tú mismo en GitHub:** abre `docs/testing/manual-results.md` → lápiz de editar → cambia `Pendiente` por `OK` o `FALLA` en cada fila, completa fecha y ejecutor → *Commit changes*.

Cada falla se convierte en una corrección con su propio caso de prueba automático, para que no vuelva a pasar.
