# Demo: cobro con QR del Banco Económico (1 o 2 productos)

Proyecto **pequeño e independiente** (sin dependencias, solo Node 20 o superior) que:

1. Muestra 2 productos y deja elegir 1 o 2.
2. Pide al banco un **QR de uso único** con el total exacto.
3. Muestra el QR y espera el pago.
4. Muestra **"Pago confirmado"** con quién pagó (nombre, banco y cuenta ofuscada).

Sirve para **demostrar que la integración con la API del banco funciona** y como modelo para llevarla a cualquier sistema.

> **Léelo en este orden:** este README → [`GUIA.md`](GUIA.md) (la guía completa paso a paso).

## Probarlo en 1 minuto (sin credenciales)

```bash
node --version          # 20 o superior
npm run verificar       # prueba automática completa en modo simulado
npm test                # 38 pruebas
npm run mock            # abre http://localhost:3000 con un banco SIMULADO
```

En modo simulado el QR **no se puede escanear**; el botón **Simular pago** reemplaza al comprador.

## Probarlo con el banco real (certificación)

```bash
cp .env.example .env    # (Windows: copy .env.example .env)  → completa tus datos
npm run probar-aes                          # cifrado compatible con el banco
npm run verificar:real -- --solo-crear      # genera un QR real y guarda la imagen en salida/
npm run verificar:real -- --items=2         # QR de 2 productos y espera tu pago
BANK_MODE=real npm start                    # la aplicación web contra el banco real
```

Detalles, explicación de cada llamada, errores comunes y la lista de aceptación: [`GUIA.md`](GUIA.md).

## Seguridad en una línea
**Las llaves, contraseñas y el archivo `.env` nunca se comparten por chat, correo ni repositorios.** El `.env` está en `.gitignore`. Lee la sección 2 de la guía antes de compartir este proyecto.
