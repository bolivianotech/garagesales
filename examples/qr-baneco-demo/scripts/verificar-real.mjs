// Verificación REAL contra la API del banco (certificación). Muestra, paso a paso, que todo funciona:
//   autenticación → generar QR de 1 o 2 productos → guardar la imagen del QR → esperar el pago → confirmación.
// Uso:  npm run verificar:real            (crea el QR y espera hasta 5 minutos a que lo pagues)
//       npm run verificar:real -- --solo-crear   (solo genera el QR y termina)
//       npm run verificar:real -- --items=2      (QR de 2 productos; por defecto 1)
import fs from 'node:fs'
import path from 'node:path'
import { cargarEnv, leerConfig } from '../src/config.mjs'
import { Bank, BankError } from '../src/bank.mjs'
import { catalogoDemo, Pedidos } from '../src/pedidos.mjs'
import { armarGlosa, fechaVencimiento, formatearBs, hoyBolivia } from '../src/dinero.mjs'
import { descifrar, EJEMPLO_MANUAL } from '../src/aes.mjs'

cargarEnv()
const paso = (ok, texto) => { console.log(`${ok ? '✔' : '✘'} ${texto}`); if (!ok) { process.exitCode = 1; throw new Error('paso fallido') } }
const args = process.argv.slice(2)
const soloCrear = args.includes('--solo-crear')
const nItems = args.find((a) => a.startsWith('--items='))?.split('=')[1] === '2' ? 2 : 1
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))

try {
  const config = leerConfig({ ...process.env, BANK_MODE: 'real' })
  console.log('\nVERIFICACIÓN REAL CONTRA EL BANCO\n')
  paso(true, `Configuración completa. Ambiente: ${config.baseUrl}`)
  paso(descifrar(EJEMPLO_MANUAL.cifrado, EJEMPLO_MANUAL.llave) === '1234', 'Cifrado AES coincide con el ejemplo del manual')

  const bank = new Bank({ baseUrl: config.baseUrl, usuario: config.usuario, aesKey: config.aesKey, passwordPlano: config.passwordPlano, passwordCifrado: config.passwordCifrado, cuentaAbono: config.cuentaAbono })
  paso(!!(await bank.token()), 'Autenticación: el banco entregó un token')

  const pedidos = new Pedidos(null)
  const catalogo = catalogoDemo(config.precios)
  const pedido = pedidos.crear(catalogo.slice(0, nItems).map((p) => ({ id: p.id, qty: 1 })), catalogo)
  const qr = await bank.generateQR({ transactionId: pedido.codigo, centavos: pedido.totalCentavos, descripcion: armarGlosa(pedido.codigo, pedido.items), dueDate: fechaVencimiento(1) })
  paso(!!qr.qrId && qr.qrImage?.length > 100, `QR generado para ${nItems} producto(s) por ${formatearBs(pedido.totalCentavos)} (qrId ${qr.qrId})`)

  fs.mkdirSync('salida', { recursive: true })
  const archivo = path.resolve('salida', `qr-${pedido.codigo}.png`)
  fs.writeFileSync(archivo, Buffer.from(qr.qrImage, 'base64'))
  paso(true, `Imagen del QR guardada en ${archivo}`)
  if (soloCrear) { console.log('\nListo (--solo-crear). Escanea el QR con la app de tu banco para pagarlo.\n'); process.exit() }

  console.log('\n➜ Abre la imagen y paga el QR con la app de tu banco. Esperando hasta 5 minutos…\n')
  const limite = Date.now() + 5 * 60_000
  let estado = await bank.statusQR(qr.qrId)
  while (!estado.pagado && !estado.anulado && Date.now() < limite) { await dormir(3000); estado = await bank.statusQR(qr.qrId); process.stdout.write('.') }
  console.log()
  paso(estado.pagado, 'El banco confirma el pago (statusQRCode = 1)')
  const p = estado.pago || {}
  console.log(`   Pagó: ${p.senderName} · Banco ${p.senderBankCode} · Cuenta ${p.senderAccount} · Monto ${p.amount} ${p.currency} · ${p.paymentDate?.slice(0, 10)} ${p.paymentTime}`)
  paso(Math.round(p.amount * 100) === pedido.totalCentavos, 'El monto pagado coincide con el total del pedido')
  const hoy = hoyBolivia()
  paso((await bank.paidQR(hoy)).some((x) => x.qrId === qr.qrId), 'El QR aparece en la lista de pagados del día (conciliación)')
  console.log('\nTODO CORRE NORMALMENTE (banco real)\n')
} catch (e) {
  if (e.message !== 'paso fallido') console.error('\n✘ ' + (e instanceof BankError ? `El banco respondió: [${e.codigo}] ${e.message}` : e.message) + '\n')
  process.exitCode = 1
}
