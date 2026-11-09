# Guía completa: integración del QR del Banco Económico (proyecto demo)

> **Para quién:** el programador que implementará el cobro con QR. No necesita acceso al repositorio principal del negocio.
> **Estado verificado hoy:** cifrado AES contra el ejemplo público del manual ✔ · cliente del banco y aplicación contra un **banco simulado** ✔ (49 pruebas) · pantalla probada en navegador ✔.
> **No verificado todavía:** nada contra el **banco real**. Ese es el objetivo de la sección 6.

## Índice
1. [Qué demuestra este proyecto](#1-qué-demuestra-este-proyecto)
2. [Qué recibes del dueño y qué NO se comparte](#2-qué-recibes-del-dueño-y-qué-no-se-comparte)
3. [Cómo está armado](#3-cómo-está-armado)
4. [Paso 1: correr todo en modo simulado](#4-paso-1-correr-todo-en-modo-simulado)
5. [Cómo funciona la integración (llamada por llamada)](#5-cómo-funciona-la-integración-llamada-por-llamada)
6. [Paso 2: pasar al banco real (certificación)](#6-paso-2-pasar-al-banco-real-certificación)
7. [Lista de aceptación: "todo corre normalmente"](#7-lista-de-aceptación-todo-corre-normalmente)
8. [Reglas de seguridad ya implementadas](#8-reglas-de-seguridad-ya-implementadas)
9. [Llevarlo a otro sistema](#9-llevarlo-a-otro-sistema)
10. [Errores comunes](#10-errores-comunes)
11. [Pruebas y resultados](#11-pruebas-y-resultados)
12. [Mapa de archivos](#12-mapa-de-archivos)

---

## 1. Qué demuestra este proyecto

El ciclo mínimo de un cobro por QR:

```
Navegador ── elige 1 o 2 productos ──▶ Servidor (este proyecto)
                                         │ 1. calcula el total con SUS precios
                                         │ 2. autentica con el banco (token)
                                         │ 3. generateQR  (uso único, monto fijo)
Navegador ◀── imagen del QR ─────────────┘
Comprador paga con la app de su banco
Servidor ── statusQR (cada 3 s)  ──▶ Banco ── statusQRCode = 1 ──▶ "Pago confirmado" + quién pagó
Banco ──▶ /api/notify (aviso opcional) ──▶ el servidor VERIFICA con statusQR antes de creerlo
```

Decisiones de diseño que importan:
- **El precio y el total salen del servidor**, nunca del navegador.
- **El pago se confirma solo con la respuesta del banco** (`statusQR`), nunca con lo que diga el navegador ni el cuerpo del aviso.
- **Un QR por pedido**, de **uso único** y con **monto no modificable**.

## 2. Qué recibes del dueño y qué NO se comparte

### Lo que sí te pasan (por un canal seguro, nunca por chat ni correo)
| Dato | Para qué | Cómo se guarda |
|---|---|---|
| Usuario de API (ej. `A…`) | Autenticarse | `.env` → `BANK_USERNAME` |
| Contraseña de API, **si existe** (en claro o ya cifrada) | Autenticarse | `.env` → `BANK_PASSWORD_PLAIN`, `BANK_PASSWORD_ENCRYPTED` o `BANK_PASSWORD_FROM` (sección 6.0) |
| Llave AES de **certificación** (32 caracteres) | Cifrar contraseña y cuenta | `.env` → `BANK_AES_KEY` |
| Cuenta de abono de **pruebas** | Recibe los cobros de prueba | `.env` → `BANK_ACCOUNT_CREDIT` |
| URL de certificación | Dónde llamar | `.env` → `BANK_BASE_URL` |

### Reglas para el programador
1. Trabaja **solo con credenciales de certificación**. Las de producción las configura el dueño directamente en el servidor.
2. El archivo `.env` **no se sube a ningún repositorio**, no se envía por chat ni correo, no se captura en pantalla. (Ya está en `.gitignore`.)
3. **No compartas este proyecto ni sus credenciales con terceros.** Si necesitas ayuda de otra persona, pídele permiso al dueño.
4. No pegues respuestas reales del banco en foros ni chats de IA sin quitar llaves, tokens y datos de personas.
5. Al terminar el trabajo, el dueño **rota** la llave AES y la contraseña de API.

### Recomendación para el dueño
- Pide al banco **un segundo usuario de API solo para certificación** para el programador, así no compartes el tuyo.
- Firma un **acuerdo de confidencialidad** simple con el programador (conviene que lo revise un abogado).
- Entrega las credenciales con un gestor de contraseñas compartido o en persona, y revócalas al finalizar.

## 3. Cómo está armado

| Archivo | Responsabilidad |
|---|---|
| `server.mjs` | API web: crear pedido, consultar, anular, recibir aviso del banco |
| `src/bank.mjs` | **El cliente del banco**: `authenticate`, `generateQR`, `statusQR`, `cancelQR`, `paidQR` |
| `src/aes.mjs` | **Cifrado AES** compatible con el banco |
| `src/dinero.mjs` | Centavos ↔ decimales del banco, glosa de ≤ 100 caracteres, fecha de vencimiento |
| `src/pedidos.mjs` | Pedidos y catálogo demo; aplica el estado que reporta el banco |
| `src/mock-bank.mjs` | Banco **simulado** que imita los endpoints del manual |
| `public/index.html` | Pantalla: productos → QR → confirmación |
| `scripts/` | `verificar-mock`, `verificar-real`, `probar-aes` |
| `test/` | 49 pruebas automáticas |

## 4. Paso 1: correr todo en modo simulado

```bash
npm run verificar       # debe terminar con: TODO CORRE NORMALMENTE (modo simulado)
npm test                # # pass 49 · # fail 0
npm run mock            # http://localhost:3000
```
En la pantalla: marca 1 o 2 productos → **Generar QR de pago** → **Simular pago** → aparece **✅ Pago confirmado** con el nombre del pagador.

Resultado esperado de `npm run verificar`:
```
✔ La aplicación responde
✔ Autenticación con el banco (password cifrado con AES)
✔ Pedido D-0001 de 2 productos por Bs 0,02 con QR generado
✔ Antes de pagar el estado es "pendiente"
✔ Después de pagar el estado es "pagado"
✔ Se guardó quién pagó: ANA PRUEBA (banco 1016)
TODO CORRE NORMALMENTE (modo simulado)
```

## 5. Cómo funciona la integración (llamada por llamada)

Base de certificación: `https://apimktdesa.baneco.com.bo/ApiGateway`. Todas las llamadas (salvo autenticar) llevan `Authorization: Bearer <token>`. Fechas `yyyy-MM-dd`, importes con **punto** y **máximo 2 decimales**.

### 5.1 Cifrado AES (la parte que más confunde)
El banco exige cifrar `password`, `accountCredit` y `accountCode`. El manual solo dice "AES con llave de 256 bits (32 bytes)". **Con el ejemplo público del manual se dedujo y verificó la configuración exacta:**

| Parámetro | Valor |
|---|---|
| Algoritmo | AES-256-CBC, relleno PKCS#7 |
| Llave | Los **32 caracteres** de la llave, tomados como texto UTF-8 (32 bytes) |
| IV | 16 bytes aleatorios, **antepuestos** al cifrado |
| Resultado | `base64( IV + cifrado )` |

Prueba: el manual muestra que el texto `1234` con la llave de ejemplo da `KJAzqjmwjxIOqVo5J3IH0/7fGmNdzuyszrlqexVSeos=` (32 bytes). Con la configuración de arriba, **descifrar ese valor devuelve `1234`** (prueba `AES-01`). Esa llave es el ejemplo público del manual, no una credencial.

Aun así, la compatibilidad **con tu usuario real** se confirma con `npm run probar-aes` (sección 6, paso 2).

### 5.2 Autenticar
`POST /api/authentication/authenticate`
```json
{ "userName": "<usuario>", "password": "<password cifrado con AES>" }
```
Respuesta correcta: `{ "token": "eyJ…", "responseCode": 0, "message": "" }`.
Si el usuario no está habilitado: `{ "token": "", "responseCode": 404, "message": "Usuario no habilitado para uso de apis" }` → **hay que pedir al banco que habilite el usuario en ese ambiente** (no es un error de código).

### 5.3 Generar el QR
`POST /api/qrsimple/generateQR`
```json
{
  "transactionId": "D-0001",
  "accountCredit": "<cuenta de abono cifrada con AES>",
  "currency": "BOB",
  "amount": 0.02,
  "description": "D-0001 1x CAM-001, 1x GOR-002",
  "dueDate": "2026-11-09",
  "singleUse": true,
  "modifyAmount": false
}
```
| Campo | Regla en este proyecto |
|---|---|
| `transactionId` | Código del pedido |
| `amount` | Total del servidor, 2 decimales (`aMontoBanco`) |
| `description` | Máx. **100** caracteres; empieza con el código del pedido |
| `dueDate` | Solo fecha (sin hora), en hora de La Paz |
| `singleUse` | `true`: un solo pago |
| `modifyAmount` | `false`: el banco rechaza un monto distinto |

Respuesta: `{ "qrId": "21061401016000000003", "qrImage": "<PNG en base64>", "responseCode": 0 }`. Se muestra con `<img src="data:image/png;base64,…">`.

### 5.4 Consultar el estado
`GET /api/qrsimple/v2/statusQR/{qrId}`
- `statusQRCode`: **0** pendiente · **1** pagado · **9** anulado.
- Con `1`, `payment` trae `senderName`, `senderBankCode`, `senderAccount` (ofuscada), `amount`, `paymentDate`, `paymentTime`.
- ⚠️ **Detalle del manual:** la tabla dice `statusQRCode` pero su ejemplo responde `statusQrCode` (con `r` minúscula), y `payment` aparece como **lista**. `bank.mjs` acepta ambas escrituras y ambas formas (prueba `BANCO-07`). Confirma con el banco real cuál usa.

### 5.5 Anular un QR
`DELETE /api/qrsimple/cancelQR` con `{ "qrId": "…" }`. Un QR de uso único **pagado no se puede anular** (el sistema lo respeta: pregunta al banco y deja el pedido como pagado).

### 5.6 Aviso de pago del banco (opcional)
El banco puede llamar `POST /api/qrsimple/notifyPaymentQR` **en tu servidor** con `{ "payment": { … } }`. La URL y el token se registran en el portal del banco. Este proyecto la expone como `POST /api/notify` y:
1. Exige `Authorization: Bearer <BANK_NOTIFY_TOKEN>` (comparación segura).
2. **Ignora el cuerpo** salvo el `qrId` y **pregunta al banco** con `statusQR`.
3. Responde `{ "responseCode": 0, "message": "" }`.

Así un atacante que adivine la URL no puede "marcar como pagado" un pedido (pruebas `APP-09` y `APP-10`).

### 5.7 Conciliación
`GET /api/qrsimple/v2/paidQR/{yyyyMMdd}` lista los QR pagados de un día. Sirve para comparar con tus pedidos.

## 6. Paso 2: pasar al banco real (certificación)

### 6.0 Si tu usuario "no tiene contraseña"

El manual exige el campo `password` **cifrado**. Si el banco no te dio ninguna contraseña, lo más probable es que lo que se cifra sea una **cadena vacía** o tu propio **usuario**. No lo sabemos con certeza y **no se debe adivinar a ciegas** (un usuario puede bloquearse por intentos fallidos). Hazlo en este orden:

1. **Si ya existe una petición que funciona** (Hoppscotch, Postman o el sistema de otra persona), copia el valor del campo `password` (cifrado) y ejecuta, con la llave en tu `.env`:
   ```bash
   npm run diagnosticar-password -- --cifrado=<valor del campo password>
   ```
   El script **no muestra el texto**; solo dice si está vacío, si es igual a tu usuario o si es un valor propio, y qué variable poner en `.env`. Ejemplo de salida:
   ```
   ✔ Se pudo descifrar con tu llave: el formato de cifrado coincide con el del banco.
   El "password" cifrado contiene:
     • Largo: 0 carácter(es)
     • Está vacío: SÍ  → usa BANK_PASSWORD_FROM=vacio
   ```
   Esto además confirma, con tu llave real, que el cifrado de esta guía coincide con el del banco.
2. **Pon la variante que indique** en `.env` (`BANK_PASSWORD_FROM=vacio`, `BANK_PASSWORD_FROM=usuario`, `BANK_PASSWORD_PLAIN=...` o `BANK_PASSWORD_ENCRYPTED=...`).
3. **Si no hay ninguna petición de referencia**, prueba como máximo **dos variantes, una llamada cada una**: primero `BANK_PASSWORD_FROM=vacio` y luego `BANK_PASSWORD_FROM=usuario`, con
   ```bash
   npm run verificar:real -- --solo-crear
   ```
   Si recibes `[404] Usuario no habilitado para uso de apis`, **no concluyas** que la variante es mala: ese mensaje también aparece cuando el banco aún no habilitó el usuario, y no sabemos si distingue una contraseña incorrecta. Si las dos variantes fallan, **para** y consulta al banco o a quien ya integró el QR.
4. Cuando obtengas un token (`✔ Autenticación: el banco entregó un token`), anota qué variante funcionó y sigue con los pasos 2 a 6.

**Requisitos:** usuario de API **habilitado** en certificación, llave AES de certificación, **cuenta de abono de pruebas** (`BANK_ACCOUNT_CREDIT`) y saber qué se cifra como `password` (6.0).

1. **Crear `.env`** (`cp .env.example .env`) y poner `BANK_MODE=real` más los datos de la sección 2.
2. **Comprobar el cifrado** (usa los endpoints `encrypt`/`decrypt` del banco, que reciben la llave en la URL: **solo con la llave de certificación**):
   ```bash
   npm run probar-aes
   ```
   Esperado:
   ```
   ✔ Ejemplo del manual del banco se descifra a "1234" (prueba sin conexión)
   ✔ Lo que cifra el banco se descifra aquí → nuestro formato de lectura coincide
   ✔ Lo que ciframos aquí lo descifra el banco → nuestro formato de escritura coincide
   Cifrado compatible con el banco.
   ```
   Si el segundo o tercer ✔ falla, el banco usa otra variante: ajusta `src/aes.mjs` (modo, IV, formato de llave) hasta que coincida y deja ese caso como prueba.
3. **Generar un QR real sin pagar:**
   ```bash
   npm run verificar:real -- --solo-crear
   ```
   Esperado: `✔ Autenticación…`, `✔ QR generado para 1 producto(s) por Bs 0,01 (qrId …)`, `✔ Imagen del QR guardada en …/salida/qr-D-0001.png`. Abre la imagen y escanéala con la app de un banco: debe mostrar el monto y la glosa.
4. **Ciclo completo con pago de Bs 0,01** (2 productos = Bs 0,02):
   ```bash
   npm run verificar:real -- --items=2
   ```
   Escanea y paga. Esperado:
   ```
   ✔ El banco confirma el pago (statusQRCode = 1)
      Pagó: <NOMBRE> · Banco <código> · Cuenta ******1234 · Monto 0.02 BOB · 2026-… …
   ✔ El monto pagado coincide con el total del pedido
   ✔ El QR aparece en la lista de pagados del día (conciliación)
   TODO CORRE NORMALMENTE (banco real)
   ```
5. **La aplicación web con el banco real:**
   ```bash
   BANK_MODE=real npm start      # (PowerShell: $env:BANK_MODE="real"; npm start)
   ```
   Abre `http://localhost:3000`, elige productos, genera el QR, paga y comprueba que la pantalla pasa sola a **Pago confirmado**.
6. **Aviso del banco (opcional):** necesitas una URL pública (por ejemplo con un túnel temporal) y registrarla en el portal del banco con el tipo de autorización y el `BANK_NOTIFY_TOKEN`. Paga otro QR y comprueba en el registro del servidor que llega el aviso.

## 7. Lista de aceptación: "todo corre normalmente"

Para dar por demostrada la integración, el programador entrega **capturas o el texto de la terminal** de:

| # | Prueba | Evidencia esperada | ¿Listo? |
|---|---|---|---|
| A | `npm test` | `# pass 49 · # fail 0` | ☐ |
| B | `npm run verificar` | "TODO CORRE NORMALMENTE (modo simulado)" | ☐ |
| C | `npm run probar-aes` | "Cifrado compatible con el banco" | ☐ |
| D | `verificar:real -- --solo-crear` | QR guardado y escaneable, con monto y glosa correctos | ☐ |
| E | `verificar:real -- --items=1` | Pago confirmado, 1 producto | ☐ |
| F | `verificar:real -- --items=2` | Pago confirmado, 2 productos, monto = suma | ☐ |
| G | Pantalla web con banco real | "✅ Pago confirmado" con el nombre del pagador | ☐ |
| H | Intento de pagar un QR **ya pagado** | El banco lo rechaza (uso único) | ☐ |
| I | Anular un QR pendiente y mirar `statusQR` | `statusQRCode = 9` | ☐ |
| J | Aviso del banco (si se activó) | El servidor registra el aviso y confirma tras verificar | ☐ |
| K | Revisión de secretos | `.env` no está en git; ninguna llave en el código ni en capturas | ☐ |

**Nunca** incluyas la llave AES, la contraseña ni el token en las capturas.

## 8. Reglas de seguridad ya implementadas

| Regla | Dónde | Prueba |
|---|---|---|
| El precio del navegador se ignora | `pedidos.mjs` | `APP-05` |
| Solo 1 o 2 productos, cantidades 1–5, sin repetidos | `pedidos.mjs` | `APP-06` |
| El pago solo lo confirma el banco | `server.mjs` | `APP-07`, `APP-10` |
| Un aviso falso no confirma pagos | `server.mjs` | `APP-09`, `APP-10` |
| Confirmar es idempotente | `pedidos.mjs` | `APP-08` |
| La vista pública no expone `qrId`, llaves ni contraseñas | `pedidos.mjs` | `APP-13` |
| Cuerpos rotos o enormes se rechazan | `server.mjs` | `APP-15` |
| Cabeceras de seguridad (CSP, nosniff) | `server.mjs` | `APP-16` |
| Token vencido se renueva solo | `bank.mjs` | `BANCO-09` |
| Los secretos viven solo en `.env` del servidor | `config.mjs` | — |

## 9. Llevarlo a otro sistema

Para integrarlo en el sistema real del negocio, copia **tal cual** `src/aes.mjs`, `src/bank.mjs`, `src/dinero.mjs` y sus pruebas (`aes`, `bank`, `dinero`), y reemplaza la parte de `pedidos.mjs`/`server.mjs` por la de tu sistema respetando este contrato:

| Momento | Qué debe hacer tu sistema |
|---|---|
| Crear el pedido | Calcular el total en el servidor con los precios de tu base de datos y guardar los precios del pedido |
| Mostrar el pago | Llamar `generateQR` (uso único, monto fijo), guardar `qrId`, mostrar `qrImage` |
| Confirmar | Llamar `statusQR`; con `statusQRCode = 1`, marcar pagado **en una sola transacción** (verificar monto, y stock si hay existencias limitadas) y guardar nombre y banco del pagador |
| Aviso del banco | Verificar token, ignorar el cuerpo y repetir `statusQR` |
| Vencimiento | Anular el QR con `cancelQR`; si responde "ya pagado", consultar `statusQR` |
| Cierre del día | `paidQR` contra tus pedidos |

Si hay **existencias limitadas** (una sola unidad), dos personas pueden pagar el mismo producto: el primer pago confirmado se queda con él y el otro debe reembolsarse. Este demo no maneja stock a propósito.

## 10. Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[404] Usuario no habilitado para uso de apis` | Usuario no habilitado en ese ambiente, **o** valor de `password` incorrecto (no se sabe si el banco distingue) | Confirmar la habilitación con el banco; usar `diagnosticar-password` (sección 6.0) |
| `La llave AES debe tener exactamente 32 caracteres` | Llave con espacios, comillas o de otro largo | Revisar `.env`: sin comillas ni espacios; 32 caracteres exactos |
| `accountCredit` inválido / error al generar el QR | Cuenta mal escrita o llave AES distinta a la del ambiente | Verificar cuenta y llave; correr `probar-aes` |
| `amount` rechazado | Más de 2 decimales o ≤ 0 | Usar `aMontoBanco(centavos)`; trabajar en centavos enteros |
| `description` rechazada | Más de 100 caracteres | Usar `armarGlosa` |
| El pedido nunca pasa a "pagado" | El pago se hizo a otro QR, o el banco usa otra escritura de la respuesta | Revisar `qrId`; ver sección 5.4 |
| Aviso del banco no llega | URL no pública o token mal registrado | Probar con un túnel; revisar el portal del banco |
| `401` repetido | Credenciales cambiadas | Volver a pedir credenciales; el cliente ya reintenta una vez |
| El QR de la demo no se escanea | Estás en modo simulado | Es lo esperado; usa `BANK_MODE=real` |

## 11. Pruebas y resultados

`npm test` ejecuta **49 casos** (todos pasan al momento de escribir esta guía):

| Archivo | Casos | Qué cubre |
|---|---|---|
| `test/aes.test.mjs` | 6 | Ejemplo del manual, ida y vuelta, formato, IV distinto, llave inválida |
| `test/dinero.test.mjs` | 5 | Centavos ↔ decimales, formato, glosa de 100, fecha en La Paz |
| `test/bank.test.mjs` | 10 | Autenticación (ok, fallo, password ya cifrado), QR, glosa larga, estados, casing, anular, token vencido, conciliación |
| `test/app.test.mjs` | 17 | API completa, seguridad, aviso falso/legítimo/automático, anulación |
| `test/config.test.mjs` | 11 | Configuración, password vacío o igual al usuario, diagnóstico sin mostrar secretos |

**Qué NO cubren:** el banco real (la simulación imita el manual, no al banco), un QR escaneable real, ni la carga de muchos usuarios. Por eso existe la sección 6 y la lista de aceptación.

## 12. Mapa de archivos

```
qr-baneco-demo/
├─ README.md · GUIA.md            ← empieza aquí
├─ package.json                   ← scripts: start, mock, test, verificar, verificar:real, probar-aes
├─ .env.example                   ← plantilla de configuración (el .env real NO se comparte)
├─ server.mjs                     ← API web
├─ public/index.html              ← pantalla
├─ src/ aes · bank · dinero · pedidos · mock-bank · png · config
├─ scripts/ verificar-mock · verificar-real · probar-aes
└─ test/ aes · dinero · bank · app
```
