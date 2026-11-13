// Servidor de la demo: crea pedidos de 1 o 2 productos, pide el QR al banco y muestra la confirmación del pago.
// Sin dependencias. Los secretos viven solo aquí (en .env); el navegador nunca los ve.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { cargarEnv, leerConfig } from './src/config.mjs'
import { Bank, BankError } from './src/bank.mjs'
import { crearBancoSimulado } from './src/mock-bank.mjs'
import { Pedidos, catalogoDemo } from './src/pedidos.mjs'
import { armarGlosa, fechaVencimiento } from './src/dinero.mjs'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const MOCK = { usuario: 'demo', passwordPlano: 'clave-demo-123', aesKey: 'demo-llave-aes-de-32-caracteres!', tokenAviso: 'token-de-aviso-demo' }

const iguales = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y) }

export function crearApp({ bank, config, pedidos, simulador = null }) {
  const catalogo = catalogoDemo(config.precios)
  const json = (res, estado, obj) => { res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)) }
  const leer = (req) => new Promise((ok, fallo) => {
    let b = ''
    req.on('data', (c) => { b += c; if (b.length > 100_000) { fallo(Object.assign(new Error('Cuerpo demasiado grande'), { http: 413 })); req.destroy() } })
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}) } catch { fallo(Object.assign(new Error('JSON inválido'), { http: 400 })) } })
  })

  async function refrescar(pedido) {
    if (pedido.estado !== 'pendiente' || !pedido.qrId) return null
    try {
      pedidos.aplicarEstadoBanco(pedido, await bank.statusQR(pedido.qrId))
      return null
    } catch (e) {
      return e instanceof BankError ? e.message : 'No se pudo consultar al banco'
    }
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const ruta = url.pathname
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'")
    try {
      if (req.method === 'GET' && ruta === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        return res.end(fs.readFileSync(path.join(aqui, 'public', 'index.html')))
      }
      if (req.method === 'GET' && ruta === '/api/health') return json(res, 200, { ok: true, modo: config.modo })
      if (req.method === 'GET' && ruta === '/api/config') {
        return json(res, 200, { modo: config.modo, productos: catalogo.map(({ id, sku, titulo, precioCentavos }) => ({ id, sku, titulo, precioCentavos })) })
      }

      if (req.method === 'POST' && ruta === '/api/orders') {
        const cuerpo = await leer(req)
        const pedido = pedidos.crear(cuerpo.items, catalogo) // precio y total salen del servidor
        try {
          const qr = await bank.generateQR({
            transactionId: pedido.codigo, centavos: pedido.totalCentavos,
            descripcion: armarGlosa(pedido.codigo, pedido.items), dueDate: fechaVencimiento(1),
          })
          Object.assign(pedido, { qrId: qr.qrId, qrImage: qr.qrImage, vence: fechaVencimiento(1) })
          pedidos._guardar()
        } catch (e) {
          pedido.estado = 'error'
          pedidos._guardar()
          return json(res, 502, { error: 'El banco no pudo generar el QR: ' + (e instanceof BankError ? e.message : 'error de conexión') })
        }
        return json(res, 201, pedidos.vista(pedido))
      }

      let m = ruta.match(/^\/api\/orders\/([0-9a-f-]{36})$/)
      if (req.method === 'GET' && m) {
        const pedido = pedidos.obtener(m[1])
        if (!pedido) return json(res, 404, { error: 'Pedido no encontrado' })
        const avisoBanco = await refrescar(pedido)
        return json(res, 200, { ...pedidos.vista(pedido), avisoBanco })
      }

      m = ruta.match(/^\/api\/orders\/([0-9a-f-]{36})\/cancel$/)
      if (req.method === 'POST' && m) {
        const pedido = pedidos.obtener(m[1])
        if (!pedido) return json(res, 404, { error: 'Pedido no encontrado' })
        if (pedido.estado !== 'pendiente') return json(res, 409, { error: 'Solo se anulan pedidos pendientes' })
        try { await bank.cancelQR(pedido.qrId) } catch (e) {
          await refrescar(pedido) // si falló porque ya estaba pagado, el banco lo dirá
          return json(res, 409, { error: e.message, ...pedidos.vista(pedido) })
        }
        pedidos.aplicarEstadoBanco(pedido, { pagado: false, anulado: true })
        return json(res, 200, pedidos.vista(pedido))
      }

      // Aviso del banco (opcional). NUNCA se confía en el cuerpo: solo se usa el qrId y se pregunta al banco.
      if (req.method === 'POST' && ruta === '/api/notify') {
        const auth = (req.headers.authorization || '').replace(/^Bearer /, '')
        if (!config.tokenAviso || !iguales(auth, config.tokenAviso)) return json(res, 401, { responseCode: 401, message: 'No autorizado' })
        const cuerpo = await leer(req)
        const pedido = cuerpo?.payment?.qrId ? pedidos.porQr(String(cuerpo.payment.qrId)) : null
        if (pedido) await refrescar(pedido)
        return json(res, 200, { responseCode: 0, message: '' })
      }

      m = ruta.match(/^\/api\/mock\/pay\/([0-9a-f-]{36})$/)
      if (req.method === 'POST' && m && simulador) {
        const pedido = pedidos.obtener(m[1])
        if (!pedido?.qrId) return json(res, 404, { error: 'Pedido no encontrado' })
        const cuerpo = await leer(req)
        simulador.pagar(pedido.qrId, { senderName: String(cuerpo.nombre || 'PEDRO PEREZ').slice(0, 40).toUpperCase() })
        return json(res, 200, { ok: true })
      }
      return json(res, 404, { error: 'No encontrado' })
    } catch (e) {
      return json(res, e.http || 500, { error: e.http ? e.message : 'Error interno' })
    }
  })
}

async function principal() {
  cargarEnv()
  const config = leerConfig()
  let bank, simulador = null
  if (config.modo === 'mock') {
    config.tokenAviso = MOCK.tokenAviso
    const banco = crearBancoSimulado({ aesKey: MOCK.aesKey, usuario: MOCK.usuario, passwordPlano: MOCK.passwordPlano,
      avisoUrl: `http://127.0.0.1:${config.puerto}/api/notify`, avisoToken: MOCK.tokenAviso })
    const url = await banco.iniciar(0)
    bank = new Bank({ baseUrl: url, usuario: MOCK.usuario, aesKey: MOCK.aesKey, passwordPlano: MOCK.passwordPlano, cuentaAbono: '1234567890' })
    simulador = banco
  } else {
    bank = new Bank({ baseUrl: config.baseUrl, usuario: config.usuario, aesKey: config.aesKey, passwordPlano: config.passwordPlano, passwordCifrado: config.passwordCifrado, cuentaAbono: config.cuentaAbono })
  }
  const pedidos = new Pedidos(path.join(aqui, 'data', 'pedidos.json'))
  crearApp({ bank, config, pedidos, simulador }).listen(config.puerto, () => {
    console.log(`Demo QR Baneco en http://localhost:${config.puerto}  (modo ${config.modo.toUpperCase()})`)
    if (config.modo === 'mock') console.log('Banco SIMULADO: el QR no se puede escanear; usa el botón "Simular pago".')
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal().catch((e) => { console.error('Error:', e.message); process.exit(1) })
