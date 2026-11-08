# UAT · Comprador

**Quién:** dos personas que nunca vieron el sistema (Comprador 1 y Comprador 2). **Dónde:** su celular real. **Dinero:** Bs 0,01 por pago.
**Leyenda:** 🔴 crítico · 🟠 importante · ✅ ejecutable hoy · ⏳ requiere pantallas/cobro en construcción.

## Preparación
- [ ] Un correo propio (si usan Gmail: `nombre+uat@gmail.com`)
- [ ] App de su banco con saldo mínimo
- [ ] Los productos UAT publicados (ver plan, sección 3)
- [ ] Papel y lápiz o notas para anotar dudas de uso

---

### UAT-CMP-01 · Ver el catálogo sin cuenta ✅ 🟠
**Pasos:** 1) Abre el sitio sin iniciar sesión. 2) Escribe "Camisa" en el buscador. 3) Toca la categoría **Ropa**. 4) Toca **Todo**.
**Esperado:** se ven los productos UAT con foto, precio en Bs y tienda; el buscador y las categorías filtran; no pide cuenta.

### UAT-CMP-02 · Crear cuenta y confirmar correo ✅ 🔴
**Pasos:** 1) **Ingresar → Regístrate**. 2) Nombre, correo, contraseña de 8+ caracteres. 3) Abre el correo y toca **Confirm email address**.
**Esperado:** el enlace abre el sitio (no `localhost`), entras a **Mi cuenta** con sesión iniciada.

### UAT-CMP-03 · Perfil obligatorio para comprar ✅ ⏳ 🟠
**Pasos:** 1) Sin completar teléfono, intenta pagar un producto. 2) Completa nombre y teléfono en **Mi cuenta**. 3) Reintenta.
**Esperado:** el primer intento se bloquea con el mensaje "Completa tu nombre y teléfono…"; el segundo funciona.

### UAT-CMP-04 · Compra y pago con QR ⏳ 🔴
**Pasos:** 1) Agrega **Camisa UAT** al carrito. 2) Abre el carrito → **Pagar**. 3) Con la app de tu banco, escanea el QR y paga **Bs 0,01**. 4) No cierres la pantalla.
**Esperado:** el QR muestra **Bs 0,01** exacto; en menos de 1 minuto la pantalla cambia sola a **Pagado** y abre el comprobante. **Anota la hora de pago y la hora en que apareció.**

### UAT-CMP-05 · Comprobante completo ⏳ 🔴
**Pasos:** 1) En el comprobante revisa cada dato. 2) Copia el enlace y ábrelo en otro navegador **sin sesión**. 3) Cambia una letra del enlace y ábrelo.
**Esperado:** muestra código de pedido, fecha, total **Bs 0,01**, **tu nombre y tu banco** como pagador, el vendedor, el producto con SKU, el lugar y horario de retiro y tu **código de retiro de 6 caracteres**. El enlace sin sesión funciona; el enlace alterado **no** muestra nada.

### UAT-CMP-06 · Subir foto del comprobante bancario ⏳ 🟠
**Pasos:** 1) En el pedido pagado toca **Subir comprobante**. 2) Elige una captura del comprobante de tu banco. 3) Sube una segunda y una tercera. 4) Intenta subir una cuarta.
**Esperado:** se aceptan hasta 3 imágenes; la cuarta se rechaza con mensaje claro; las fotos se ven en el pedido. El otro comprador **no** puede ver las tuyas.

### UAT-CMP-07 · Carrera por la última unidad ⏳ 🔴
**Preparación:** el producto **Última unidad UAT** tiene cantidad **1**. Comprador 1 y Comprador 2 crean cada uno su pedido y **no pagan todavía**.
**Pasos:** 1) A la cuenta de tres, ambos pagan Bs 0,01 al mismo tiempo.
**Esperado:** **uno** queda **Pagado** con su código de retiro; el otro ve **En revisión** con el mensaje de reembolso. El producto desaparece del catálogo. Finanzas ve el pago en revisión (continúa en UAT-FIN-02).

### UAT-CMP-08 · Un pago, dos vendedores ⏳ 🟠
**Pasos:** 1) Agrega **Camisa UAT** (Tienda A) y **Zapatos UAT** (Tienda B). 2) Paga una sola vez (Bs 0,02).
**Esperado:** un solo pago; el comprobante separa **dos vendedores**, cada uno con su lugar de retiro y su propio código.

### UAT-CMP-09 · Pedido vencido ⏳ 🟠
**Preparación (equipo técnico):** un pedido pendiente con vencimiento adelantado.
**Pasos:** 1) Abre el pedido vencido. 2) Toca **Volver a intentar**.
**Esperado:** muestra "Vencido" y permite generar un QR nuevo para el mismo pedido o crear otro; el QR viejo no sirve.

### UAT-CMP-10 · Mis pedidos ⏳ 🟠
**Pasos:** 1) Abre **Mis pedidos**.
**Esperado:** lista tus pedidos con estado (Pendiente, Pagado, En revisión, Vencido, Entregado), código, fecha y total; solo los tuyos.

### UAT-CMP-11 · Retiro y entrega ⏳ 🔴
**Pasos:** 1) Ve al lugar de retiro (o simula con el vendedor). 2) Dile tu código. 3) El vendedor lo confirma. 4) Refresca tu comprobante.
**Esperado:** el vendedor valida el código y tu pedido muestra **Entregado** con fecha. Un código incorrecto es rechazado.

### UAT-CMP-12 · Producto agotado en el carrito ⏳ 🟠
**Pasos:** 1) Comprador 1 agrega **Última unidad UAT** al carrito. 2) Comprador 2 la compra y paga. 3) Comprador 1 intenta pagar.
**Esperado:** el pedido no se crea y se muestra "Un producto del carrito ya no está disponible" (o "No hay stock suficiente"); si pagó con un QR previo, queda en revisión (UAT-CMP-07).

### UAT-CMP-13 · Seguridad de datos ✅ ⏳ 🔴
**Pasos:** 1) Comprador 1 copia la dirección de su pedido y se la pasa a Comprador 2. 2) Comprador 2 la abre con su sesión.
**Esperado:** Comprador 2 **no** ve el pedido de Comprador 1 (error o vacío).

### UAT-CMP-14 · Instalar en el celular ⏳ ⚪ (spec 005)
**Pasos:** instalar como app (Android Chrome o Safari iPhone) y abrir.
**Esperado:** aparece el ícono, abre a pantalla completa y mantiene la sesión.

### UAT-CMP-15 · Claridad (opinión) ✅ ⏳ 🟡
Pregunta a cada comprador, de 1 a 5: ¿entendiste qué hacer en cada pantalla sin ayuda? ¿Qué te confundió? ¿Pagarías de verdad? Registra comentarios.

---

## Resultados
| ID | Crítico | Resultado (OK / FALLA / Bloqueada) | Fecha | Ejecutor | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| UAT-CMP-01 | 🟠 | | | | | |
| UAT-CMP-02 | 🔴 | | | | | |
| UAT-CMP-03 | 🟠 | | | | | |
| UAT-CMP-04 | 🔴 | | | | | |
| UAT-CMP-05 | 🔴 | | | | | |
| UAT-CMP-06 | 🟠 | | | | | |
| UAT-CMP-07 | 🔴 | | | | | |
| UAT-CMP-08 | 🟠 | | | | | |
| UAT-CMP-09 | 🟠 | | | | | |
| UAT-CMP-10 | 🟠 | | | | | |
| UAT-CMP-11 | 🔴 | | | | | |
| UAT-CMP-12 | 🟠 | | | | | |
| UAT-CMP-13 | 🔴 | | | | | |
| UAT-CMP-14 | ⚪ | | | | | |
| UAT-CMP-15 | 🟡 | | | | | |

Firma del comprador: ____________  Fecha: ________
