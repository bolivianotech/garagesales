// Verificación completa en modo SIMULADO (sin credenciales): crea un pedido de 2 productos, genera el QR,
// simula el pago del comprador y comprueba que se muestra la confirmación. Úsala para ver que todo corre.
import { Bank } from '../src/bank.mjs'
import { crearBancoSimulado } from '../src/mock-bank.mjs'
import { Pedidos } from '../src/pedidos.mjs'
import { crearApp } from '../server.mjs'
import { formatearBs } from '../src/dinero.mjs'

const LLAVE = 'demo-llave-aes-de-32-caracteres!'
const paso = (ok, texto) => { console.log(`${ok ? '✔' : '✘'} ${texto}`); if (!ok) process.exitCode = 1 }

const banco = crearBancoSimulado({ aesKey: LLAVE, usuario: 'demo', passwordPlano: 'clave-demo-123' })
const url = await banco.iniciar(0)
const bank = new Bank({ baseUrl: url, usuario: 'demo', aesKey: LLAVE, passwordPlano: 'clave-demo-123', cuentaAbono: '1234567890' })
const pedidos = new Pedidos(null)
const app = crearApp({ bank, config: { modo: 'mock', precios: [0.01, 0.01], tokenAviso: 'x' }, pedidos, simulador: banco })
await new Promise((ok) => app.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${app.address().port}`
const j = (r) => r.json()

try {
  console.log('\nVERIFICACIÓN EN MODO SIMULADO\n')
  paso((await j(await fetch(base + '/api/health'))).ok, 'La aplicación responde')
  paso(!!(await bank.token()), 'Autenticación con el banco (password cifrado con AES)')
  const p = await j(await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: 'camisa', qty: 1 }, { id: 'gorra', qty: 1 }] }) }))
  paso(p.estado === 'pendiente' && p.qrImage?.length > 100, `Pedido ${p.codigo} de 2 productos por ${formatearBs(p.totalCentavos)} con QR generado`)
  paso((await j(await fetch(`${base}/api/orders/${p.id}`))).estado === 'pendiente', 'Antes de pagar el estado es "pendiente"')
  await fetch(`${base}/api/mock/pay/${p.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Ana Prueba' }) })
  const f = await j(await fetch(`${base}/api/orders/${p.id}`))
  paso(f.estado === 'pagado', 'Después de pagar el estado es "pagado"')
  paso(f.pagador?.nombre === 'ANA PRUEBA' && f.pagador?.banco === '1016', `Se guardó quién pagó: ${f.pagador?.nombre} (banco ${f.pagador?.banco})`)
  console.log(process.exitCode ? '\nHAY PROBLEMAS: revisa las líneas con ✘\n' : '\nTODO CORRE NORMALMENTE (modo simulado)\n')
} finally {
  app.close(); await banco.detener()
}
