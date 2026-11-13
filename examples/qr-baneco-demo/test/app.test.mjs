import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Bank } from '../src/bank.mjs'
import { crearBancoSimulado } from '../src/mock-bank.mjs'
import { Pedidos } from '../src/pedidos.mjs'
import { crearApp } from '../server.mjs'

const LLAVE = 'demo-llave-aes-de-32-caracteres!'
const TOKEN_AVISO = 'token-de-aviso-demo'
let banco, app, base, pedidos

before(async () => {
  banco = crearBancoSimulado({ aesKey: LLAVE, usuario: 'demo', passwordPlano: 'clave-demo-123' })
  const urlBanco = await banco.iniciar(0)
  const bank = new Bank({ baseUrl: urlBanco, usuario: 'demo', aesKey: LLAVE, passwordPlano: 'clave-demo-123', cuentaAbono: '1234567890' })
  pedidos = new Pedidos(null)
  const config = { modo: 'mock', precios: [0.01, 0.01], tokenAviso: TOKEN_AVISO }
  app = crearApp({ bank, config, pedidos, simulador: banco })
  await new Promise((ok) => app.listen(0, '127.0.0.1', ok))
  base = `http://127.0.0.1:${app.address().port}`
})
after(async () => { await new Promise((ok) => app.close(ok)); await banco.detener() })

const post = (ruta, cuerpo, headers = {}) => fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(cuerpo ?? {}) })
const get = (ruta) => fetch(base + ruta)

test('APP-01 la página principal y la salud responden', async () => {
  assert.match(await (await get('/')).text(), /Demo de cobro con QR/)
  assert.deepEqual(await (await get('/api/health')).json(), { ok: true, modo: 'mock' })
})
test('APP-02 el catálogo trae 2 productos con precios del servidor', async () => {
  const c = await (await get('/api/config')).json()
  assert.equal(c.productos.length, 2)
  assert.deepEqual(c.productos.map((p) => p.precioCentavos), [1, 1])
})
test('APP-03 un pedido de 2 productos genera un QR por el total y queda pendiente', async () => {
  const r = await post('/api/orders', { items: [{ id: 'camisa', qty: 2 }, { id: 'gorra', qty: 1 }] })
  assert.equal(r.status, 201)
  const p = await r.json()
  assert.equal(p.totalCentavos, 3)
  assert.equal(p.estado, 'pendiente')
  assert.ok(p.qrImage.length > 100)
  const q = banco.qrs.get(pedidos.obtener(p.id).qrId)
  assert.equal(q.amount, 0.03)
  assert.equal(q.transactionId, p.codigo)
  assert.match(q.description, /^D-\d{4} 2x CAM-001, 1x GOR-002$/)
})
test('APP-04 un pedido de 1 solo producto también funciona', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'gorra', qty: 1 }] })).json()
  assert.equal(p.totalCentavos, 1)
})
test('APP-05 SEGURIDAD: el precio que mande el navegador se ignora', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1, precioCentavos: 1, price: 0.0001, total: 0 }] })).json()
  assert.equal(p.totalCentavos, 1)
  const trampa = await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }], totalCentavos: 1 })
  assert.equal((await trampa.json()).totalCentavos, 1)
})
test('APP-06 se rechazan pedidos inválidos (vacío, 3 productos, cantidad 0 o 99, producto desconocido, repetido)', async () => {
  for (const items of [[], [{ id: 'camisa', qty: 0 }], [{ id: 'camisa', qty: 99 }], [{ id: 'nada', qty: 1 }], [{ id: 'camisa', qty: 1 }, { id: 'camisa', qty: 1 }], [{ id: 'a' }, { id: 'b' }, { id: 'c' }]]) {
    assert.equal((await post('/api/orders', { items })).status, 400, JSON.stringify(items))
  }
})
test('APP-07 el pago se confirma al consultar: pendiente → pagado, con nombre y banco del pagador', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }, { id: 'gorra', qty: 1 }] })).json()
  assert.equal((await (await get('/api/orders/' + p.id)).json()).estado, 'pendiente')
  const sim = await post('/api/mock/pay/' + p.id, { nombre: 'Ana Prueba' })
  assert.equal(sim.status, 200)
  const listo = await (await get('/api/orders/' + p.id)).json()
  assert.equal(listo.estado, 'pagado')
  assert.equal(listo.pagador.nombre, 'ANA PRUEBA')
  assert.equal(listo.pagador.banco, '1016')
  assert.equal(listo.pagador.monto, 0.02)
})
test('APP-08 consultar varias veces un pedido pagado no cambia nada (idempotente)', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }] })).json()
  await post('/api/mock/pay/' + p.id)
  const a = await (await get('/api/orders/' + p.id)).json()
  const b = await (await get('/api/orders/' + p.id)).json()
  assert.equal(a.pagadoEn, b.pagadoEn)
})
test('APP-09 el aviso del banco sin token o con token falso se rechaza', async () => {
  assert.equal((await post('/api/notify', { payment: { qrId: '1' } })).status, 401)
  assert.equal((await post('/api/notify', { payment: { qrId: '1' } }, { Authorization: 'Bearer falso' })).status, 401)
})
test('APP-10 SEGURIDAD: un aviso con el token correcto NO confirma un pago que el banco no reporta', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }] })).json()
  const qrId = pedidos.obtener(p.id).qrId
  const r = await post('/api/notify', { payment: { qrId, amount: 0.01, senderName: 'ESTAFADOR', statusQRCode: 1 } }, { Authorization: 'Bearer ' + TOKEN_AVISO })
  assert.equal((await r.json()).responseCode, 0)
  assert.equal(pedidos.obtener(p.id).estado, 'pendiente') // el cuerpo mentía; el banco dice 0
})
test('APP-11 un aviso legítimo (el banco sí lo marcó pagado) confirma el pedido', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'gorra', qty: 1 }] })).json()
  const qrId = pedidos.obtener(p.id).qrId
  banco.pagar(qrId, { senderName: 'LUIS GOMEZ' })
  await post('/api/notify', { payment: { qrId } }, { Authorization: 'Bearer ' + TOKEN_AVISO })
  assert.equal(pedidos.obtener(p.id).estado, 'pagado')
  assert.equal(pedidos.obtener(p.id).pagador.nombre, 'LUIS GOMEZ')
})
test('APP-12 anular un pedido pendiente anula el QR; uno pagado no se puede anular', async () => {
  const a = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }] })).json()
  assert.equal((await (await post(`/api/orders/${a.id}/cancel`)).json()).estado, 'anulado')
  const b = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }] })).json()
  banco.pagar(pedidos.obtener(b.id).qrId)
  const r = await post(`/api/orders/${b.id}/cancel`)
  assert.equal(r.status, 409)
  assert.equal(pedidos.obtener(b.id).estado, 'pagado') // el banco decidió: ya estaba pagado
})
test('APP-13 SEGURIDAD: la vista pública del pedido no expone qrId ni datos internos', async () => {
  const p = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }] })).json()
  const v = await (await get('/api/orders/' + p.id)).json()
  for (const clave of ['qrId', 'cuenta', 'token', 'password', 'aesKey']) assert.equal(clave in v, false, clave)
})
test('APP-14 un pedido que no existe o con id raro responde 404 sin romper el servidor', async () => {
  assert.equal((await get('/api/orders/00000000-0000-0000-0000-000000000000')).status, 404)
  assert.equal((await get('/api/orders/../../etc/passwd')).status, 404)
})
test('APP-15 un cuerpo JSON roto o gigante se rechaza', async () => {
  const roto = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{no es json' })
  assert.equal(roto.status, 400)
  const grande = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(200_000) }) }).catch(() => ({ status: 413 }))
  assert.ok([413, 400].includes(grande.status))
})
test('APP-16 las cabeceras de seguridad están presentes', async () => {
  const r = await get('/')
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/)
})

test('APP-17 el aviso AUTOMÁTICO del banco confirma el pedido sin que nadie consulte', async () => {
  banco.configurarAviso(base + '/api/notify', TOKEN_AVISO)
  const p = await (await post('/api/orders', { items: [{ id: 'camisa', qty: 1 }, { id: 'gorra', qty: 1 }] })).json()
  banco.pagar(pedidos.obtener(p.id).qrId, { senderName: 'MARIA ROJAS' })
  for (let i = 0; i < 40 && pedidos.obtener(p.id).estado !== 'pagado'; i++) await new Promise((ok) => setTimeout(ok, 50))
  assert.equal(pedidos.obtener(p.id).estado, 'pagado') // llegó por el aviso, no por una consulta del navegador
  assert.equal(pedidos.obtener(p.id).pagador.nombre, 'MARIA ROJAS')
  banco.configurarAviso(null, null)
})
