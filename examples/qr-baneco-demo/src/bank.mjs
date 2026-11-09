// Cliente de la API Market del Banco Económico (QR Simple / QR Conecta).
// Endpoints (manual v1.3.0): authenticate, qrsimple/generateQR, qrsimple/v2/statusQR/{id}, qrsimple/cancelQR, qrsimple/v2/paidQR/{fecha}.
import { cifrar } from './aes.mjs'
import { aMontoBanco } from './dinero.mjs'

export class BankError extends Error {
  constructor(mensaje, codigo, http) {
    super(mensaje)
    this.name = 'BankError'
    this.codigo = codigo
    this.http = http
  }
}

export class Bank {
  constructor({ baseUrl, usuario, aesKey, passwordPlano, passwordCifrado, cuentaAbono, fetchFn = fetch }) {
    Object.assign(this, { baseUrl, usuario, aesKey, cuentaAbono, fetchFn })
    // Si ya tienes la contraseña cifrada se usa tal cual; si no, se cifra con la llave AES.
    this.passwordCifrado = passwordCifrado || cifrar(passwordPlano ?? '', aesKey)
    this._token = null
  }

  async _http(metodo, ruta, cuerpo, conToken = true, reintento = true) {
    const headers = { 'Content-Type': 'application/json' }
    if (conToken) headers.Authorization = 'Bearer ' + (await this.token())
    const res = await this.fetchFn(this.baseUrl + ruta, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined })
    if (res.status === 401 && conToken && reintento) {
      this._token = null // el token venció: se vuelve a autenticar una vez
      return this._http(metodo, ruta, cuerpo, conToken, false)
    }
    let json
    try { json = await res.json() } catch { throw new BankError(`Respuesta no válida del banco (HTTP ${res.status}).`, null, res.status) }
    if (json.responseCode !== undefined && json.responseCode !== 0) {
      throw new BankError(json.message || 'Error del banco', json.responseCode, res.status)
    }
    return json
  }

  async token() {
    if (this._token) return this._token
    const r = await this._http('POST', '/api/authentication/authenticate', { userName: this.usuario, password: this.passwordCifrado }, false)
    if (!r.token) throw new BankError('El banco no devolvió token.', null, 200)
    this._token = r.token
    return this._token
  }

  /** Genera un QR de uso único con monto fijo. Devuelve { qrId, qrImage (base64 PNG) }. */
  async generateQR({ transactionId, centavos, descripcion, dueDate, moneda = 'BOB', singleUse = true, modifyAmount = false, branchCode }) {
    const cuerpo = {
      transactionId,
      accountCredit: cifrar(this.cuentaAbono, this.aesKey),
      currency: moneda,
      amount: aMontoBanco(centavos),
      description: descripcion,
      dueDate,
      singleUse,
      modifyAmount,
    }
    if (branchCode) cuerpo.branchCode = branchCode
    const r = await this._http('POST', '/api/qrsimple/generateQR', cuerpo)
    return { qrId: r.qrId, qrImage: r.qrImage }
  }

  /** statusQRCode: 0 pendiente · 1 pagado · 9 anulado. El manual escribe "statusQRCode" pero su ejemplo trae "statusQrCode": se aceptan ambos. */
  async statusQR(qrId) {
    const r = await this._http('GET', '/api/qrsimple/v2/statusQR/' + encodeURIComponent(qrId))
    const codigo = r.statusQRCode ?? r.statusQrCode
    const pago = Array.isArray(r.payment) ? r.payment[0] : r.payment
    return { codigo, pagado: codigo === 1, anulado: codigo === 9, pago: pago || null, crudo: r }
  }

  async cancelQR(qrId) {
    return this._http('DELETE', '/api/qrsimple/cancelQR', { qrId })
  }

  /** Lista de QR pagados en una fecha (yyyyMMdd), para conciliación. */
  async paidQR(fechaYyyyMMdd) {
    const r = await this._http('GET', '/api/qrsimple/v2/paidQR/' + fechaYyyyMMdd)
    return r.paymentList || []
  }
}
