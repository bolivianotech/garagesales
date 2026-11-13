// Banco simulado para pruebas: responde como la API del manual v1.3.0 mediante un fetch falso. No es el banco real.
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'

export const KEY = 'demo-llave-aes-de-32-caracteres!'
export interface FakeQr { qrId: string; transactionId: string; amount: number; status: number; payment?: Record<string, unknown>; account: string; description: string; dueDate: string }

export function decrypt(b64: string): string {
  const b = Buffer.from(b64, 'base64')
  const d = crypto.createDecipheriv('aes-256-cbc', Buffer.from(KEY), b.subarray(0, 16))
  return Buffer.concat([d.update(b.subarray(16)), d.final()]).toString('utf8')
}

export class FakeBank {
  qrs = new Map<string, FakeQr>()
  calls: string[] = []
  signIns = 0
  failNext: { path: RegExp; status?: number; code?: number; times: number } | null = null
  tokenExp = Math.floor(Date.now() / 1000) + 3600
  expectedUser = 'A00000001'
  private n = 0

  pay(qrId: string, extra: Record<string, unknown> = {}, date = '2026-11-09', time = '10:30:00') {
    const q = this.qrs.get(qrId)!
    q.status = 1
    q.payment = { qrId, transactionId: q.transactionId, amount: q.amount, paymentDate: date, paymentTime: time, senderName: 'JUAN PEREZ', senderBankCode: '1016', senderAccount: '***1234', ...extra }
  }

  fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url))
    const path = u.pathname.replace('/ApiGateway/', '')
    const method = init?.method ?? 'GET'
    this.calls.push(`${method} ${path}`)
    const reply = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status })
    if (this.failNext && this.failNext.path.test(path) && this.failNext.times > 0) {
      this.failNext.times--
      if (this.failNext.status) return new Response('', { status: this.failNext.status })
      return reply({ responseCode: this.failNext.code ?? 1, message: 'Error simulado' })
    }
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (path === 'api/authentication/authenticate') {
      this.signIns++
      await new Promise((r) => setTimeout(r, 5))
      if (body.userName !== this.expectedUser) return reply({ responseCode: 1, message: 'Usuario no habilitado' })
      decrypt(body.password) // debe ser descifrable con la llave
      const payload = Buffer.from(JSON.stringify({ exp: this.tokenExp })).toString('base64url')
      return reply({ responseCode: 0, token: `h.${payload}.s` })
    }
    const auth = (init?.headers as Record<string, string>)?.Authorization
    if (!auth?.startsWith('Bearer h.')) return new Response('', { status: 401 })
    if (path === 'api/qrsimple/generateQR') {
      const qrId = `QR${++this.n}`
      this.qrs.set(qrId, { qrId, transactionId: body.transactionId, amount: body.amount, status: 0, account: decrypt(body.accountCredit), description: body.description, dueDate: body.dueDate })
      return reply({ responseCode: 0, qrId, qrImage: 'data:image/png;base64,QUJD' })
    }
    const st = path.match(/^api\/qrsimple\/v2\/statusQR\/(.+)$/)
    if (st) {
      const q = this.qrs.get(decodeURIComponent(st[1]))
      if (!q) return reply({ responseCode: 1, message: 'QR no existe' })
      return reply({ responseCode: 0, statusQrCode: q.status, payment: q.payment ? [q.payment] : undefined })
    }
    if (path === 'api/qrsimple/cancelQR') {
      const q = this.qrs.get(body.qrId)
      if (!q || q.status === 1) return reply({ responseCode: 1, message: 'No se puede anular' })
      q.status = 9
      return reply({ responseCode: 0 })
    }
    const pd = path.match(/^api\/qrsimple\/v2\/paidQR\/(\d{8})$/)
    if (pd) return reply({ responseCode: 0, paymentList: [...this.qrs.values()].filter((q) => q.status === 1 && q.payment).map((q) => q.payment) })
    return new Response('', { status: 404 })
  }
}
