# 04 · Arquitectura y decisiones

## Vista general

```
 Comprador / Vendedor / Admin
        │  (navegador o PWA instalada)
        ▼
 ┌────────────────────┐        ┌─────────────────────────────────────────┐
 │  PWA React + Vite  │──────▶ │  Supabase                               │
 │  Cloudflare        │  HTTPS │  · Auth (usuarios, sesiones, 2FA)       │
 └────────────────────┘        │  · Postgres + RLS (reglas y seguridad)  │
                               │  · Storage (fotos de productos)         │
                               │  · Edge Functions  ◀─────────┐          │
                               └──────────────┬───────────────┼──────────┘
                                              │               │
                                              ▼               │
                                   ┌──────────────────────┐   │ notifyPaymentQR (aviso)
                                   │ Banco Económico      │───┘
                                   │ QR Conecta / API Mkt │
                                   └──────────────────────┘
```

**Principio rector:** la seguridad vive en la base de datos (RLS y funciones), no en la pantalla. Lo que esconde la interfaz es comodidad; lo que impide la base de datos es seguridad.

## Componentes y responsabilidades

| Componente | Responsabilidad | Nunca hace |
|---|---|---|
| PWA | Mostrar, capturar datos, comprimir fotos | Calcular totales finales, confirmar pagos, guardar secretos |
| Base de datos | Reglas de negocio, RLS, atomicidad de stock, auditoría inmutable | Hablar con el banco |
| Edge Functions | Autenticarse en el banco, generar/consultar/anular QR, confirmar pagos | Exponer credenciales |
| Cloudflare | Servir la PWA | Procesar datos sensibles |

## Modelo de datos (resumen)

| Tabla | Idea |
|---|---|
| `profiles` | Un perfil por usuario; contiene el rol (`buyer`, `seller`, `admin`, `finance_admin`) |
| `stores` | La tienda de un vendedor; estado `pending/approved/rejected/suspended` |
| `products`, `product_images` | Catálogo; SKU automático; estados incluido `sold_out` automático |
| `orders`, `order_items` | Pedido con **precios congelados** y token de comprobante |
| `payments` | QR, monto, pagador (nombre y banco) y respuesta cruda del banco |
| `pickups` | Un retiro por tienda con código de 6 caracteres |
| `audit_log` | Registro **inmutable** con hash encadenado |
| `settings`, `bank_catalog` | Configuración y catálogo de bancos |
| *(pendiente)* `ledger`, `payouts`, `seller_payout_methods` | Comisión, liquidación y datos de cobro (specs 006 y 008) |

## Flujo de una compra (objetivo final)

```
1  Comprador arma carrito           (cliente)
2  create_order(items)              (BD: valida stock, calcula total, congela precios; NO reserva)
3  Edge create-qr                   (banco: generateQR, uso único, monto fijo, glosa con pedido y SKU)
4  Comprador paga desde su banco
5  Edge check-payment / notify      (banco: statusQR = 1)
6  confirm_payment()                (BD, una transacción: verifica monto y stock, descuenta, crea retiro)
   ├─ éxito → pedido pagado, comprobante, retiro
   └─ stock agotado por otro → pedido en revisión (reembolso)
7  Comprador ve comprobante         (enlace con token)
8  Vendedor entrega con código      (mark_pickup_delivered)
```

## Índice de decisiones (ADR)

| ADR | Decisión | Por qué |
|---|---|---|
| [0001](../adr/0001-stack-pwa-supabase.md) | PWA + Supabase | Un solo código web/móvil, backend sin servidor propio |
| [0002](../adr/0002-conciliacion-movimientos.md) | Confirmar pagos por estado del QR + conciliación diaria | El `qrId` identifica el pedido sin depender de la glosa |
| [0003](../adr/0003-auditoria-inmutable.md) | Registros inmutables con hash encadenado | Proteger dinero y datos de cobro |
| [0004](../adr/0004-sin-reserva-gana-quien-paga.md) | Sin reserva; gana quien paga primero | Decisión del dueño; ventas de saldos únicos |

## Seguridad en capas
1. **RLS** en cada tabla: cada rol ve solo lo suyo.
2. **Funciones `security definer`** con permisos explícitos; `confirm_payment` solo el rol de servicio.
3. **Tokens** de comprobante aleatorios (UUID) y rutas de aviso con token secreto.
4. **Auditoría inmutable**: UPDATE/DELETE/TRUNCATE bloqueados y verificación diaria de la cadena.
5. **Secretos** únicamente en variables del servidor; escáner de secretos antes de cada commit.

## Escalabilidad y límites conocidos
- Supabase gratuito sirve para pruebas y un lanzamiento pequeño; revisar límites de almacenamiento y correos (el servicio de correo por defecto es muy limitado).
- El catálogo público está paginado a 48 productos; con miles de productos hay que agregar búsqueda por texto completo (hoy `ilike`).
- La reconciliación contra el banco se hace por día; con alto volumen conviene paginar `paidQR`.
