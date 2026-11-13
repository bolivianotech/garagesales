// Pruebas del cliente del banco contra el banco simulado. Cita requisitos de specs/004-pago-qr-banco-economico.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BanecoClient, BanecoError, boliviaDate, buildDescription, sanitizeText, bancoFromEnv, CERTIFICATION_URL } from '../_shared/baneco.ts'
import { FakeBank, KEY, decrypt } from './fake-bank.ts'

const mk = (bank: FakeBank, o: Partial<ConstructorParameters<typeof BanecoClient>[0]> = {}) =>
  new BanecoClient({ baseUrl: CERTIFICATION_URL, username: 'A00000001', passwordFrom: 'vacio', aesKey: KEY, accountNumber: '1234567890', fetchFn: bank.fetch as typeof fetch, ...o })

test('TC-BN-01 FR-031 cifrado AES-256-CBC: ida y vuelta y IV distinto cada vez', () => {
  const c = mk(new FakeBank())
  const a = c.encrypt('1234567890'), b = c.encrypt('1234567890')
  assert.notEqual(a, b)
  assert.equal(c.decrypt(a), '1234567890')
  assert.equal(decrypt(b), '1234567890')
  assert.equal(Buffer.from(a, 'base64').length % 16, 0)
})

test('TC-BN-02 FR-031 la llave debe medir 32 caracteres', () => {
  assert.throws(() => mk(new FakeBank(), { aesKey: 'corta' }), /32 caracteres/)
})

test('TC-BN-03 FR-031 sin contraseña configurada no arranca (falla cerrado)', () => {
  assert.throws(() => mk(new FakeBank(), { passwordFrom: undefined }), /Falta la contraseña/)
})

test('TC-BN-04 FR-031 passwordFrom=usuario cifra el usuario; vacio cifra cadena vacía', async () => {
  const sent: string[] = []
  const bank = new FakeBank()
  const spy = (async (u: string, i: RequestInit) => { if (String(u).endsWith('authenticate')) sent.push(JSON.parse(String(i.body)).password); return bank.fetch(u, i) }) as typeof fetch
  await mk(bank, { passwordFrom: 'usuario', fetchFn: spy }).signIn()
  await mk(bank, { passwordFrom: 'vacio', fetchFn: spy }).signIn()
  assert.deepEqual(sent.map(decrypt), ['A00000001', ''])
})

test('TC-BN-05 NFR-009 varias llamadas a la vez comparten UNA sola sesión', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  await Promise.all([c.signIn(), c.signIn(), c.signIn(), c.generateQR({ transactionId: 'T1', amountCents: 100, dueDate: '2026-11-09' })])
  assert.equal(bank.signIns, 1)
})

test('TC-BN-06 NFR-009 la sesión se renueva antes de vencer', async () => {
  const bank = new FakeBank(); let t = Date.now()
  const c = mk(bank, { now: () => t })
  await c.signIn(); await c.signIn(); assert.equal(bank.signIns, 1)
  t += 56 * 60_000; await c.signIn(); assert.equal(bank.signIns, 2)
})

test('TC-BN-07 NFR-009 si el banco responde 401 se vuelve a entrar una vez y se reintenta', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  await c.signIn()
  bank.failNext = { path: /statusQR/, status: 401, times: 1 }
  await c.statusQR('NO').catch(() => {})
  bank.qrs.set('Q', { qrId: 'Q', transactionId: 'T', amount: 1, status: 0, account: '', description: '', dueDate: '' })
  bank.failNext = { path: /statusQR/, status: 401, times: 1 }
  const s = await c.statusQR('Q')
  assert.equal(s.status, 0); assert.ok(bank.signIns >= 2)
})

test('TC-BN-08 FR-031 usuario no habilitado: error claro sin exponer secretos', async () => {
  const bank = new FakeBank(); bank.expectedUser = 'OTRO'
  await assert.rejects(mk(bank).signIn(), (e: BanecoError) => /no aceptó el usuario/.test(e.message) && !e.message.includes(KEY))
})

test('TC-BN-09 FR-031 generateQR: monto decimal exacto, único uso, monto fijo, cuenta cifrada', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  const r = await c.generateQR({ transactionId: 'GS-ABC123', amountCents: 12345, description: 'x', dueDate: '2026-11-09' })
  const q = bank.qrs.get(r.qrId)!
  assert.equal(q.amount, 123.45); assert.equal(q.account, '1234567890')
  assert.equal(r.qrImage, 'QUJD', 'se quita el prefijo data:')
})

test('TC-BN-10 FR-031 generateQR rechaza montos y fechas inválidos', async () => {
  const c = mk(new FakeBank())
  for (const a of [0, -5, 10.5, NaN]) await assert.rejects(c.generateQR({ transactionId: 'T', amountCents: a, dueDate: '2026-11-09' }), /entero de centavos/)
  await assert.rejects(c.generateQR({ transactionId: 'T', amountCents: 100, dueDate: '09/11/2026' }), /yyyy-MM-dd/)
  await assert.rejects(c.generateQR({ transactionId: '', amountCents: 100, dueDate: '2026-11-09' }), /transactionId/)
})

test('TC-BN-11 FR-031 la glosa nunca pasa de 100 caracteres ni lleva emojis o saltos de línea', () => {
  const d = buildDescription('GS-1', Array.from({ length: 40 }, (_, i) => ({ sku: `SKU-LARGO-${i}`, qty: 2 })))
  assert.ok(d.length <= 100); assert.ok(d.startsWith('GS-1 2x SKU-LARGO-0'))
  assert.equal(sanitizeText('Hola 😀\nmundo… ñandú'), 'Hola mundo ñandú')
})

test('TC-BN-12 FR-032 statusQR entiende statusQrCode y payment como lista', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  const { qrId } = await c.generateQR({ transactionId: 'T', amountCents: 500, dueDate: '2026-11-09' })
  assert.equal((await c.statusQR(qrId)).paid, false)
  bank.pay(qrId)
  const s = await c.statusQR(qrId)
  assert.equal(s.paid, true); assert.equal(s.payment?.senderName, 'JUAN PEREZ')
})

test('TC-BN-13 FR-039b cancelQR lanza error si el banco no anula (QR ya pagado)', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  const { qrId } = await c.generateQR({ transactionId: 'T', amountCents: 500, dueDate: '2026-11-09' })
  bank.pay(qrId)
  await assert.rejects(c.cancelQR(qrId), /no anuló/)
})

test('TC-BN-14 FR-032 paidQR lanza error si el banco falla (nunca devuelve "vacío" por un fallo)', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  bank.failNext = { path: /paidQR/, code: 5, times: 1 }
  await assert.rejects(c.paidQR('2026-11-09'), /lista de pagados/)
  assert.deepEqual(await c.paidQR('2026-11-09'), [])
})

test('TC-BN-15 FR-032 un aviso falso (QR que el banco no conoce) se ignora', async () => {
  const c = mk(new FakeBank())
  const v = await c.verifyNotification({ payment: { qrId: 'INVENTADO', amount: 9999 } })
  assert.equal(v.paid, false)
})

test('TC-BN-16 FR-032 un aviso que dice "pagado" pero el banco dice pendiente no confirma', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  const { qrId } = await c.generateQR({ transactionId: 'T', amountCents: 500, dueDate: '2026-11-09' })
  const v = await c.verifyNotification({ payment: { qrId, amount: 5, statusQrCode: 1 } })
  assert.equal(v.paid, false)
})

test('TC-BN-17 FR-032 si el banco no responde al verificar un aviso, se lanza error para que reintente', async () => {
  const bank = new FakeBank(); const c = mk(bank)
  await c.signIn()
  bank.failNext = { path: /statusQR/, status: 500, times: 1 }
  await assert.rejects(c.verifyNotification({ qrId: 'X' }))
})

test('TC-BN-18 NFR-009 tiempo de espera: un banco que no contesta no cuelga la función', async () => {
  // AbortSignal.timeout no mantiene vivo el proceso: un temporizador propio evita que Node termine antes de tiempo.
  const slow = ((_u: string, i: RequestInit) => new Promise((_r, rej) => {
    const keep = setTimeout(() => {}, 2000)
    i.signal!.addEventListener('abort', () => { clearTimeout(keep); rej(Object.assign(new Error('t'), { name: 'TimeoutError' })) })
  })) as unknown as typeof fetch
  await assert.rejects(mk(new FakeBank(), { fetchFn: slow, timeoutMs: 30 }).signIn(), /no contestó/)
})

test('TC-BN-19 FR-039b la fecha de Bolivia (UTC-4) no es la de UTC a medianoche', () => {
  const t = Date.parse('2026-11-10T02:00:00Z') // en La Paz todavía es 9 de noviembre, 22:00
  assert.equal(boliviaDate(0, t), '2026-11-09'); assert.equal(boliviaDate(-1, t), '2026-11-08')
})

test('TC-BN-20 NFR-004 bancoFromEnv exige los secretos y valida PASSWORD_FROM', () => {
  assert.throws(() => bancoFromEnv({}), /Faltan datos/)
  assert.throws(() => bancoFromEnv({ BANCO_ECONOMICO_BASE_URL: 'u', BANCO_ECONOMICO_USERNAME: 'a', BANCO_ECONOMICO_AES_KEY: KEY, BANCO_ECONOMICO_ACCOUNT_CREDIT: '1', BANCO_ECONOMICO_PASSWORD_FROM: 'x' }), /vacio/)
  assert.ok(bancoFromEnv({ BANCO_ECONOMICO_BASE_URL: 'u', BANCO_ECONOMICO_USERNAME: 'a', BANCO_ECONOMICO_AES_KEY: KEY, BANCO_ECONOMICO_ACCOUNT_CREDIT: '1', BANCO_ECONOMICO_PASSWORD_FROM: 'vacio' }))
})
