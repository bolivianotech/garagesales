// Banco SIMULADO que imita los endpoints del manual v1.3.0, para desarrollar y probar sin credenciales.
// Valida lo mismo que el banco real: autenticación con password cifrado, accountCredit cifrado, monto con
// máximo 2 decimales, glosa de hasta 100 caracteres, dueDate yyyy-MM-dd, singleUse y modifyAmount booleanos.
import http from 'node:http'
import crypto from 'node:crypto'
import { descifrar } from './aes.mjs'
import { pngSimulado } from './png.mjs'
import { hoyBolivia } from './dinero.mjs'

export function crearBancoSimulado({ aesKey, usuario, passwordPlano, avisoUrl = null, avisoToken = null }) {
  const tokens = new Set()
  const qrs = new Map()
  let invalidarTokenUnaVez = false
  const hoy = () => hoyBolivia().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')

  // El comprador paga desde su app bancaria: el QR queda pagado y el banco AVISA al comercio (si hay URL registrada).
  function pagarQr(qrId, datos = {}) {
    const q = qrs.get(qrId)
    if (!q) throw new Error('QR no existe')
    if (q.estado === 1 && q.singleUse) throw new Error('QR ya pagado')
    q.estado = 1
    q.pago = { qrId, transactionId: String(Math.floor(1e6 + Math.random() * 9e6)), paymentDate: hoy() + 'T00:00:00', paymentTime: new Date(Date.now() - 4 * 3600_000).toISOString().slice(11, 19),
      currency: q.currency, amount: q.amount, senderBankCode: datos.senderBankCode || '1016', senderName: datos.senderName || 'PEDRO PEREZ', senderDocumentId: '0', senderAccount: '******1913', description: q.description, branchCode: q.branchCode }
    if (avisoUrl) {
      fetch(avisoUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + avisoToken }, body: JSON.stringify({ payment: q.pago }) }).catch(() => {})
    }
  }

  const responder = (res, http_, obj) => { res.writeHead(http_, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }
  const error = (res, codigo, mensaje, h = 200) => responder(res, h, { responseCode: codigo, message: mensaje })
  const leer = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}) } catch { ok(null) } }) })

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const ruta = url.pathname
    const cuerpo = await leer(req)
    if (cuerpo === null) return error(res, 400, 'JSON inválido', 400)

    if (req.method === 'POST' && ruta === '/api/authentication/authenticate') {
      let ok = false
      try { ok = cuerpo.userName === usuario && descifrar(cuerpo.password, aesKey) === passwordPlano } catch { ok = false }
      if (!ok) return responder(res, 200, { token: '', responseCode: 404, message: 'Usuario no habilitado para uso de apis' })
      const token = 'tok_' + crypto.randomBytes(12).toString('hex')
      tokens.add(token)
      return responder(res, 200, { token, responseCode: 0, message: '' })
    }

    // Simulación de pago (no existe en el banco real): el comprador paga desde su app bancaria.
    if (req.method === 'POST' && ruta.startsWith('/_sim/pay/')) {
      try { pagarQr(decodeURIComponent(ruta.split('/').pop()), cuerpo) } catch (e) { return error(res, 409, e.message) }
      return responder(res, 200, { responseCode: 0, message: '' })
    }
    if (ruta === '/_sim/invalidar-token' && req.method === 'POST') { tokens.clear(); invalidarTokenUnaVez = false; return responder(res, 200, { ok: true }) }

    // Todo lo demás exige token
    const auth = (req.headers.authorization || '').replace('Bearer ', '')
    if (!tokens.has(auth)) return responder(res, 401, { responseCode: 401, message: 'No autorizado' })

    if (req.method === 'POST' && ruta === '/api/qrsimple/generateQR') {
      let cuenta
      try { cuenta = descifrar(cuerpo.accountCredit, aesKey) } catch { return error(res, 400, 'accountCredit no se pudo descifrar') }
      if (!cuerpo.transactionId) return error(res, 400, 'transactionId es obligatorio')
      if (!['BOB', 'USD'].includes(cuerpo.currency)) return error(res, 400, 'currency inválida')
      if (typeof cuerpo.amount !== 'number' || !(cuerpo.amount > 0) || Math.round(cuerpo.amount * 100) / 100 !== cuerpo.amount) return error(res, 400, 'amount inválido (máximo 2 decimales)')
      if (cuerpo.description && cuerpo.description.length > 100) return error(res, 400, 'description supera 100 caracteres')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cuerpo.dueDate || '')) return error(res, 400, 'dueDate debe ser yyyy-MM-dd')
      if (typeof cuerpo.singleUse !== 'boolean' || typeof cuerpo.modifyAmount !== 'boolean') return error(res, 400, 'singleUse y modifyAmount son obligatorios (booleanos)')
      const qrId = '2' + Date.now().toString().slice(-8) + String(qrs.size + 1).padStart(9, '0')
      qrs.set(qrId, { qrId, cuenta, estado: 0, ...cuerpo })
      return responder(res, 200, { qrId, qrImage: pngSimulado(qrId), responseCode: 0, message: '' })
    }
    if (req.method === 'GET' && ruta.startsWith('/api/qrsimple/v2/statusQR/')) {
      const q = qrs.get(decodeURIComponent(ruta.split('/').pop()))
      if (!q) return error(res, 404, 'QR no encontrado')
      // Igual que el ejemplo del manual: la clave llega como "statusQrCode" y el pago como lista.
      return responder(res, 200, { statusQrCode: q.estado, ...(q.estado === 1 ? { payment: [q.pago] } : {}), responseCode: 0, message: '' })
    }
    if (req.method === 'DELETE' && ruta === '/api/qrsimple/cancelQR') {
      const q = qrs.get(cuerpo.qrId)
      if (!q) return error(res, 404, 'QR no encontrado')
      if (q.estado === 1 && q.singleUse) return error(res, 409, 'No se puede anular un QR de uso único ya pagado')
      q.estado = 9
      return responder(res, 200, { responseCode: 0, message: '' })
    }
    if (req.method === 'GET' && ruta.startsWith('/api/qrsimple/v2/paidQR/')) {
      const f = ruta.split('/').pop()
      const lista = [...qrs.values()].filter((q) => q.estado === 1 && q.pago.paymentDate.replace(/-/g, '').startsWith(f)).map((q) => q.pago)
      return responder(res, 200, { paymentList: lista, responseCode: 0, message: '' })
    }
    return error(res, 404, 'Ruta no encontrada', 404)
  })

  return {
    servidor,
    qrs,
    async iniciar(puerto = 0) {
      await new Promise((ok) => servidor.listen(puerto, '127.0.0.1', ok))
      return `http://127.0.0.1:${servidor.address().port}`
    },
    detener: () => new Promise((ok) => servidor.close(ok)),
    configurarAviso(url, token) { avisoUrl = url; avisoToken = token },
    pagar(qrId, datos = {}) { return pagarQr(qrId, datos) },
    invalidarTokens: () => tokens.clear(),
  }
}
