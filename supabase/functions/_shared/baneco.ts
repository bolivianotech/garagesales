// Cliente de la API Market del Banco Económico (QR Simple / QR Conecta, manual v1.3.0).
// Funciona en Deno (Edge Functions de Supabase) y en Node 22 (pruebas). Sin dependencias. Solo sintaxis TypeScript "borrable".
//
// Cifrado (deducido del ejemplo público del manual y confirmado por el conector que entregó el programador):
// AES-256-CBC; la llave son sus 32 caracteres como UTF-8; IV aleatorio de 16 bytes ANTEPUESTO; resultado en base64.
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'

export const PRODUCTION_URL = 'https://apimkt.baneco.com.bo/ApiGateway/'
export const CERTIFICATION_URL = 'https://apimktdesa.baneco.com.bo/ApiGateway/'
export const QR_STATUS = { PENDING: 0, PAID: 1, CANCELLED: 9 } as const

export class BanecoError extends Error {
  code: number | null
  status: number | null
  constructor(message: string, opts: { code?: number | null; status?: number | null } = {}) {
    super(message)
    this.name = 'BanecoError'
    this.code = opts.code ?? null // responseCode que mandó el banco (null si no hubo respuesta)
    this.status = opts.status ?? null // código HTTP
  }
}

export interface BankPayment {
  qrId: string
  transactionId?: string
  paymentDate?: string
  paymentTime?: string
  currency?: string
  amount: number
  senderBankCode?: string
  senderName?: string
  senderDocumentId?: string
  senderAccount?: string
  description?: string
  branchCode?: string
}

export interface QrStatus {
  status: number
  paid: boolean
  cancelled: boolean
  payment: BankPayment | null
}

/** Fecha de Bolivia (UTC-4) como yyyy-MM-dd, desplazada N días. El banco habla en hora de Bolivia. */
export function boliviaDate(offsetDays = 0, now: number = Date.now()): string {
  return new Date(now - 4 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

/** El banco acepta ASCII imprimible y las letras del español; lo demás (emojis, "…", saltos de línea) se quita. */
export function sanitizeText(input: unknown, max = 100): string {
  return String(input ?? '')
    .replace(/[^\x20-\x7EáéíóúñÁÉÍÓÚÑüÜ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Glosa del QR: código del pedido primero y luego "2x SKU"; nunca más de 100 caracteres. */
export function buildDescription(code: string, items: { sku: string; qty: number }[]): string {
  const body = items.map((i) => `${i.qty}x ${i.sku}`).join(', ')
  return sanitizeText(`${code} ${body}`, 100)
}

export interface BanecoOptions {
  baseUrl: string
  username: string
  /** Contraseña en claro (se cifra aquí). Si el usuario no tiene, usa passwordFrom. */
  password?: string
  /** Contraseña ya cifrada (por ejemplo la de un sistema que ya funciona). */
  passwordEncrypted?: string
  /** 'vacio' cifra una cadena vacía; 'usuario' cifra el propio usuario. Ver docs/integraciones. */
  passwordFrom?: 'vacio' | 'usuario'
  aesKey: string
  accountNumber: string
  timeoutMs?: number
  fetchFn?: typeof fetch
  now?: () => number
}

export class BanecoClient {
  baseUrl: string
  username: string
  private key: Buffer
  private account: string
  private passwordPlain: string | null
  private passwordEncrypted: string | null
  private timeoutMs: number
  private fetchFn: typeof fetch
  private now: () => number
  private token = ''
  private tokenExpires = 0
  private signingIn: Promise<string> | null = null

  constructor(o: BanecoOptions) {
    const missing = [!o.baseUrl && 'baseUrl', !o.username && 'username', !o.aesKey && 'aesKey', !o.accountNumber && 'accountNumber'].filter(Boolean)
    if (missing.length) throw new BanecoError(`Faltan datos del banco: ${missing.join(', ')}`)
    this.key = Buffer.from(String(o.aesKey), 'utf8')
    if (this.key.length !== 32) throw new BanecoError(`La llave AES debe tener exactamente 32 caracteres; tiene ${this.key.length}.`)
    this.baseUrl = String(o.baseUrl).replace(/\/?$/, '/')
    this.username = String(o.username).trim()
    this.account = String(o.accountNumber).trim()
    this.passwordEncrypted = o.passwordEncrypted ? String(o.passwordEncrypted) : null
    this.passwordPlain =
      o.password !== undefined && o.password !== '' ? String(o.password) : o.passwordFrom === 'usuario' ? this.username : o.passwordFrom === 'vacio' ? '' : null
    if (this.passwordPlain === null && !this.passwordEncrypted) {
      throw new BanecoError('Falta la contraseña: define password, passwordEncrypted o passwordFrom (vacio | usuario).')
    }
    this.timeoutMs = o.timeoutMs ?? 20_000
    this.fetchFn = o.fetchFn ?? fetch
    this.now = o.now ?? Date.now
  }

  // ── Cifrado ──
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const c = crypto.createCipheriv('aes-256-cbc', this.key, iv)
    return Buffer.concat([iv, c.update(String(text), 'utf8'), c.final()]).toString('base64')
  }
  decrypt(base64: string): string {
    const b = Buffer.from(String(base64), 'base64')
    if (b.length < 32 || b.length % 16 !== 0) throw new BanecoError('Texto cifrado inválido')
    const d = crypto.createDecipheriv('aes-256-cbc', this.key, b.subarray(0, 16))
    return Buffer.concat([d.update(b.subarray(16)), d.final()]).toString('utf8')
  }

  // ── HTTP ──
  private async send(method: string, path: string, body: unknown, withToken: boolean, ms: number): Promise<Record<string, unknown>> {
    let res: Response
    try {
      res = await this.fetchFn(this.baseUrl + path, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(withToken ? { Authorization: `Bearer ${this.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(ms),
      })
    } catch (e) {
      const err = e as { name?: string; message?: string }
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      throw new BanecoError(`Banco Económico: ${timedOut ? `no contestó en ${Math.round(ms / 1000)} s` : err?.message || 'sin conexión'}`)
    }
    if (res.status === 401) {
      this.token = ''
      throw new BanecoError('Banco Económico: la sesión venció', { status: 401 })
    }
    const text = await res.text()
    let json: Record<string, unknown> | null = null
    try { json = JSON.parse(text) } catch { /* no es JSON */ }
    if (!res.ok || !json) throw new BanecoError(`Banco Económico respondió ${res.status}`, { status: res.status })
    return json
  }

  /** Inicia sesión. Varias llamadas a la vez comparten UNA sola sesión; se renueva 5 minutos antes de vencer. */
  async signIn(force = false): Promise<string> {
    if (!force && this.token && this.now() < this.tokenExpires) return this.token
    if (!this.signingIn) {
      this.signingIn = (async () => {
        const password = this.passwordEncrypted ?? this.encrypt(this.passwordPlain ?? '')
        const j = await this.send('POST', 'api/authentication/authenticate', { userName: this.username, password }, false, this.timeoutMs)
        const token = typeof j.token === 'string' ? j.token : ''
        if (!token) {
          const msg = String(j.message ?? 'sin mensaje')
          const hint = /no habilitado/i.test(msg) ? ' — revisa el usuario (un 0 en lugar de un 5) y que el banco lo haya habilitado en este ambiente' : ''
          throw new BanecoError(`El banco no aceptó el usuario (${j.responseCode}: ${msg})${hint}`, { code: typeof j.responseCode === 'number' ? j.responseCode : null })
        }
        let expires = this.now() + 30 * 60_000
        try { expires = Number(JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).exp) * 1000 || expires } catch { /* no es JWT */ }
        this.token = token
        this.tokenExpires = expires - 5 * 60_000
        return token
      })().finally(() => { this.signingIn = null })
    }
    return this.signingIn
  }

  private async session(method: string, path: string, body?: unknown, ms = this.timeoutMs): Promise<Record<string, unknown>> {
    await this.signIn()
    try {
      return await this.send(method, path, body, true, ms)
    } catch (e) {
      if (!(e instanceof BanecoError) || e.status !== 401) throw e
      await this.signIn(true)
      return this.send(method, path, body, true, ms)
    }
  }

  private fail(what: string, j: Record<string, unknown>): never {
    throw new BanecoError(`${what} (${j.responseCode}: ${String(j.message ?? 'sin mensaje')})`, { code: typeof j.responseCode === 'number' ? j.responseCode : null })
  }

  // ── QR ──
  /** QR de uso único y monto fijo. El monto va en centavos enteros; se envía como decimal de 2 posiciones. */
  async generateQR(p: {
    transactionId: string; amountCents: number; description?: string; dueDate: string
    singleUse?: boolean; modifyAmount?: boolean; branchCode?: string
  }): Promise<{ qrId: string; qrImage: string }> {
    if (!Number.isInteger(p.amountCents) || p.amountCents <= 0) throw new BanecoError('El monto debe ser un número entero de centavos mayor a 0')
    const transactionId = String(p.transactionId).replace(/[^A-Za-z0-9_-]/g, '')
    if (!transactionId || transactionId.length > 30) throw new BanecoError('transactionId debe tener entre 1 y 30 letras, números, guion o guion bajo')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate)) throw new BanecoError('dueDate debe ser yyyy-MM-dd')
    const body: Record<string, unknown> = {
      transactionId,
      accountCredit: this.encrypt(this.account),
      currency: 'BOB',
      amount: Number((p.amountCents / 100).toFixed(2)),
      description: sanitizeText(p.description ?? 'Pago', 100) || 'Pago',
      dueDate: p.dueDate,
      singleUse: p.singleUse ?? true,
      modifyAmount: p.modifyAmount ?? false,
    }
    if (p.branchCode) body.branchCode = String(p.branchCode).slice(0, 5)
    const j = await this.session('POST', 'api/qrsimple/generateQR', body)
    if (j.responseCode !== 0 || !j.qrId || !j.qrImage) this.fail('El banco no generó el QR', j)
    return { qrId: String(j.qrId), qrImage: String(j.qrImage).replace(/^data:image\/\w+;base64,/, '') }
  }

  /** Estado de un QR: 0 esperando · 1 pagado · 9 anulado. El manual escribe statusQRCode pero su ejemplo trae statusQrCode. */
  async statusQR(qrId: string): Promise<QrStatus> {
    const j = await this.session('GET', `api/qrsimple/v2/statusQR/${encodeURIComponent(String(qrId))}`, undefined, 15_000)
    if (j.responseCode !== 0) this.fail('El banco no informó el estado', j)
    const status = Number(j.statusQrCode ?? j.statusQRCode)
    const raw = Array.isArray(j.payment) ? j.payment[0] : j.payment
    return { status, paid: status === QR_STATUS.PAID, cancelled: status === QR_STATUS.CANCELLED, payment: (raw as BankPayment) ?? null }
  }

  /** Anula un QR. Lanza error si el banco no lo anula (por ejemplo, ya está pagado). */
  async cancelQR(qrId: string): Promise<true> {
    const j = await this.session('DELETE', 'api/qrsimple/cancelQR', { qrId: String(qrId) }, 15_000)
    if (j.responseCode !== 0) this.fail('El banco no anuló el QR', j)
    return true
  }

  /** QR pagados en una fecha (yyyy-MM-dd, hora de Bolivia). Si el banco falla, lanza error: nunca devuelve "vacío" por un fallo. */
  async paidQR(date: string = boliviaDate()): Promise<BankPayment[]> {
    const j = await this.session('GET', `api/qrsimple/v2/paidQR/${String(date).replace(/-/g, '')}`, undefined, 30_000)
    if (j.responseCode !== 0) this.fail('El banco no entregó la lista de pagados', j)
    return Array.isArray(j.paymentList) ? (j.paymentList as BankPayment[]) : []
  }

  /**
   * Aviso de pago del banco. NUNCA se confía en el cuerpo: solo se toma el qrId y se pregunta al banco.
   * - El banco dice que ese QR no existe o no es nuestro → el aviso es falso: se ignora.
   * - No se pudo hablar con el banco → se lanza el error para que el banco vuelva a avisar.
   */
  async verifyNotification(body: unknown): Promise<{ qrId: string; paid: boolean; payment: BankPayment | null }> {
    const b = (body ?? {}) as Record<string, unknown>
    const p = ((b.payment ?? b.Payment ?? b) as Record<string, unknown>) || {}
    const qrId = String(p.qrId ?? '').trim()
    if (!qrId) return { qrId: '', paid: false, payment: null }
    try {
      const s = await this.statusQR(qrId)
      return { qrId, paid: s.paid, payment: s.payment }
    } catch (e) {
      if (e instanceof BanecoError && e.code !== null) return { qrId, paid: false, payment: null }
      throw e
    }
  }
}

/** Crea el cliente con los secretos de las Edge Functions (BANCO_ECONOMICO_*). */
export function bancoFromEnv(env: Record<string, string | undefined>): BanecoClient {
  const from = (env.BANCO_ECONOMICO_PASSWORD_FROM ?? '').toLowerCase()
  if (from && from !== 'vacio' && from !== 'usuario') throw new BanecoError('BANCO_ECONOMICO_PASSWORD_FROM debe ser "vacio" o "usuario".')
  return new BanecoClient({
    baseUrl: env.BANCO_ECONOMICO_BASE_URL ?? '',
    username: env.BANCO_ECONOMICO_USERNAME ?? '',
    password: env.BANCO_ECONOMICO_PASSWORD,
    passwordEncrypted: env.BANCO_ECONOMICO_PASSWORD_ENCRYPTED,
    passwordFrom: from === 'vacio' || from === 'usuario' ? from : undefined,
    aesKey: env.BANCO_ECONOMICO_AES_KEY ?? '',
    accountNumber: env.BANCO_ECONOMICO_ACCOUNT_CREDIT ?? '',
  })
}
