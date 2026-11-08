# UAT · Vendedor / Administrador de negocio

**Quién:** Vendedor A (revendedor de TikTok Live) y Vendedor B (persona que vende sus cosas). **Dónde:** su celular. Leyenda: 🔴 crítico · 🟠 importante · ✅ ejecutable hoy · ⏳ en construcción.

## Preparación
- [ ] Cuenta de comprador creada y confirmada
- [ ] 10 fotos de productos en el celular y una de ~4 MB
- [ ] Un lugar y horario de retiro reales
- [ ] Un compañero que actúe como comprador en los casos de entrega

---

### UAT-VEN-01 · Solicitar ser vendedor ✅ 🔴
**Pasos:** **Mi cuenta → Vender** → nombre de tienda (`UAT Tienda A`), tipo, lugar de retiro → **Solicitar ser vendedor**. Pide al Administrador General que apruebe.
**Esperado:** antes de la aprobación dice "En revisión" y **no** puede publicar; después de aprobada aparece **Ir a mi panel de vendedor**.

### UAT-VEN-02 · Publicar un producto con foto de ~4 MB ✅ 🔴
**Pasos:** **Nuevo producto** → foto de 4 MB → título `Camisa UAT`, precio `0,01`, cantidad `5`, categoría **Ropa** → **Publicar**. Abre el catálogo en otra ventana sin sesión.
**Esperado:** aparece con la foto (reducida) y **Bs 0,01**. Cronometra: menos de 10 segundos con 4G.

### UAT-VEN-03 · Validaciones ✅ 🟠
**Pasos:** intenta publicar sin foto; con precio `0`; con cantidad `-1`; con 6 fotos.
**Esperado:** cada intento muestra un mensaje claro y no se publica.

### UAT-VEN-04 · Carga rápida de 10 fotos ✅ 🟠
**Pasos:** **Carga rápida** → selecciona 10 fotos → espera. Completa precio y cantidad de dos y publícalos.
**Esperado:** aparecen 10 borradores y el aviso de "borradores sin precio"; los dos completados se publican.

### UAT-VEN-05 · Pausar, publicar y agotado ✅ 🟠
**Pasos:** **Pausar** `Camisa UAT` y mira el catálogo; **Publicar**. Edita la cantidad a `0` y mira el catálogo; luego `3`.
**Esperado:** pausado y agotado desaparecen del catálogo; al reponer o publicar vuelven. El estado "Agotado" se pone solo.

### UAT-VEN-06 · Privacidad entre vendedores ✅ 🔴
**Pasos:** Vendedor A copia la dirección de uno de sus productos. Vendedor B la abre con su sesión. Vendedor B revisa su lista de productos.
**Esperado:** B **no** ve datos del producto de A, y su lista solo contiene lo suyo.

### UAT-VEN-07 · Un producto pagado sale del inventario ⏳ 🔴
**Pasos:** un comprador paga `Camisa UAT` (cantidad 1 en este caso). Mira tu panel y el catálogo.
**Esperado:** el producto **sale del catálogo y de tu inventario disponible** (cantidad 0, agotado) y aparece en **Por entregar**. No tuviste que hacer nada.

### UAT-VEN-08 · Por entregar: datos completos ⏳ 🔴
**Pasos:** abre **Por entregar**.
**Esperado:** por cada compra pagada ves **foto, SKU, título, cantidad**, **nombre y teléfono del comprador**, **quién pagó y desde qué banco**, y la fecha. Solo ves **tus** ítems aunque el pedido incluya productos de otro vendedor.

### UAT-VEN-09 · Entrega con código ⏳ 🔴
**Pasos:** 1) Código incorrecto → **Confirmar**. 2) Código correcto (en minúsculas) → **Confirmar**. 3) Repite el código correcto.
**Esperado:** 1) rechazado con mensaje; 2) pasa a **Entregado** con fecha (el código no distingue mayúsculas); 3) rechazado: "ya fue entregado". Aparece en la pestaña **Entregados**.

### UAT-VEN-10 · Un pedido con dos vendedores ⏳ 🟠
**Pasos:** un comprador paga `Camisa UAT` (A) y `Zapatos UAT` (B) en un solo pago.
**Esperado:** cada vendedor ve **solo su parte** con **su propio código de retiro**.

### UAT-VEN-11 · Mis ventas y comisión ⏳ 🟠
**Pasos:** abre **Ventas**.
**Esperado:** lista de ventas con precio; **comisión = 1 % redondeada hacia arriba al centavo** y neto. Con `Bs 0,01` → comisión Bs 0,01, neto Bs 0,00; con `Bs 1,50` → comisión Bs 0,02, neto Bs 1,48.

### UAT-VEN-12 · Registrar datos de cobro ⏳ 🟠 (spec 008)
**Pasos:** **Datos de cobro** → banco, titular, cuenta, foto de tu QR (con vigencia) → **Enviar**.
**Esperado:** queda **Pendiente de aprobación**; no se puede liquidar hasta que Finanzas apruebe y pasen 24 horas. Los números de cuenta se muestran enmascarados (`****1234`).

### UAT-VEN-13 · Cambio de datos de cobro ⏳ 🟠
**Pasos:** solicita cambiar la cuenta.
**Esperado:** se crea una **nueva versión**; la anterior se conserva; recibes aviso; hay espera de 24 horas antes de que se use.

### UAT-VEN-14 · Aviso de vencimiento del QR ⏳ ⚪
**Esperado:** recibes aviso cuando tu QR de cobro está por vencer (30, 7 y 1 día).

### UAT-VEN-15 · Claridad (opinión) ✅ ⏳ 🟡
¿Pudiste publicar sin ayuda? ¿Cuánto tardaste en publicar 10 productos? ¿Qué cambiarías?

---

## Resultados
| ID | Crítico | Resultado | Fecha | Ejecutor | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| UAT-VEN-01 | 🔴 | | | | | |
| UAT-VEN-02 | 🔴 | | | | | |
| UAT-VEN-03 | 🟠 | | | | | |
| UAT-VEN-04 | 🟠 | | | | | |
| UAT-VEN-05 | 🟠 | | | | | |
| UAT-VEN-06 | 🔴 | | | | | |
| UAT-VEN-07 | 🔴 | | | | | |
| UAT-VEN-08 | 🔴 | | | | | |
| UAT-VEN-09 | 🔴 | | | | | |
| UAT-VEN-10 | 🟠 | | | | | |
| UAT-VEN-11 | 🟠 | | | | | |
| UAT-VEN-12 | 🟠 | | | | | |
| UAT-VEN-13 | 🟠 | | | | | |
| UAT-VEN-14 | ⚪ | | | | | |
| UAT-VEN-15 | 🟡 | | | | | |

Firma del vendedor: ____________  Fecha: ________
