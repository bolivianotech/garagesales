// Utilidades HTTP de las Edge Functions (sin dependencias).
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/** Comparación en tiempo constante. Falla cerrado: si falta alguno de los dos valores, es falso. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/** Las tareas programadas se identifican con el secreto CRON_SECRET en la cabecera x-cron-secret. */
export function requireCron(headers: Headers, env: Record<string, string | undefined>): void {
  if (!safeEqual(headers.get('x-cron-secret'), env.CRON_SECRET)) throw new HttpError(401, 'No autorizado')
}

/** El aviso del banco debe traer Authorization: Bearer <BANCO_ECONOMICO_NOTIFY_TOKEN>. */
export function isBankNotification(headers: Headers, env: Record<string, string | undefined>): boolean {
  const given = (headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  return safeEqual(given, env.BANCO_ECONOMICO_NOTIFY_TOKEN)
}

/** CORS para la PWA. ALLOWED_ORIGINS = lista separada por comas; si no se define, se permite cualquier origen (la autenticación va por Bearer, no por cookies). */
export function corsFor(req: Request, env: Record<string, string | undefined>): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const origin = req.headers.get('origin') ?? ''
  const base = { 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
  if (!allowed.length) return { ...base, 'Access-Control-Allow-Origin': '*' }
  return allowed.includes(origin) ? { ...base, 'Access-Control-Allow-Origin': origin } : base
}

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } })
}

/** Convierte cualquier error en una respuesta segura: sin detalles internos ni secretos. */
export function errorResponse(e: unknown, extra: Record<string, string> = {}): Response {
  if (e instanceof HttpError) return json(e.status, { error: e.message }, extra)
  const name = (e as { name?: string })?.name
  console.error('Error en la función:', name === 'BanecoError' ? (e as Error).message : name ?? 'desconocido')
  return json(name === 'BanecoError' ? 502 : 500, { error: name === 'BanecoError' ? 'El banco no respondió bien. Intenta de nuevo en un momento.' : 'Error interno' }, extra)
}
