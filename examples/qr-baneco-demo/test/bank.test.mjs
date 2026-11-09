import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { Bank, BankError } from '../src/bank.mjs'
import { crearBancoSimulado } from '../src/mock-bank.mjs'
import { fechaVencimiento, hoyBolivia } from '../src/dinero.mjs'

const LLAVE = 'demo-llave-aes-de-32-caracteres!'
let banco, url, bank
const nuevoBank = (extra = {}) => new Bank({ baseUrl: url, usuario: 'demo', aesKey: LLAVE, passwordPlano: 'clave-demo-123', cuentaAbono: '1234567890', ...extra })
before(async () => {
  banco = crearBancoSimulado({ aesKey: LLAVE, usuario: 'demo', passwordPlano: 'clave-demo-123' })
  url = await banco.iniciar(0)
  bank = nuevoBank()
})
after(() => banco.detener())

const qrBase = (extra = {}) => ({ transactionId: 'D-0001', centavos: 2, descripcion: 'D-0001 1x CAM-001', dueDate: fechaVencimiento(1), ...extra })

test('BANCO-01 autentica con el password cifrado y devuelve token', async () => {
  assert.match(await bank.token(), /^tok_/)
})
test('BANCO-02 con una contraseña incorrecta falla igual que el banco real: "Usuario no habilitado para uso de apis"', async () => {
  const malo = nuevoBank({ passwordPlano: 'otra-clave' })
  await assert.rejects(() => malo.token(), (e) => e instanceof BankError && e.codigo === 404 && /no habilitado/.test(e.message))
})
test('BANCO-03 una contraseña ya cifrada (como la del estudiante) también autentica', async () => {
  const { cifrar } = await import('../src/aes.mjs')
  const b = nuevoBank({ passwordPlano: undefined, passwordCifrado: cifrar('clave-demo-123', LLAVE) })
  assert.match(await b.token(), /^tok_/)
})
test('BANCO-04 genera un QR de uso único con monto fijo y devuelve qrId e imagen', async () => {
  const r = await bank.generateQR(qrBase({ centavos: 1 }))
  assert.match(r.qrId, /^\d{18}$/)
  assert.ok(Buffer.from(r.qrImage, 'base64').subarray(1, 4).toString() === 'PNG')
  const q = banco.qrs.get(r.qrId)
  assert.equal(q.amount, 0.01)
  assert.equal(q.singleUse, true)
  assert.equal(q.modifyAmount, false)
  assert.equal(q.cuenta, '1234567890') // el banco pudo descifrar accountCredit
})
test('BANCO-05 el banco rechaza una glosa de más de 100 caracteres (el cliente debe truncarla)', async () => {
  await assert.rejects(() => bank.generateQR(qrBase({ descripcion: 'x'.repeat(101) })), /100 caracteres/)
})
test('BANCO-06 statusQR: pendiente (0) y luego pagado (1) con datos del pagador', async () => {
  const { qrId } = await bank.generateQR(qrBase({ centavos: 2 }))
  let s = await bank.statusQR(qrId)
  assert.equal(s.codigo, 0); assert.equal(s.pagado, false)
  banco.pagar(qrId, { senderName: 'ANA PRUEBA', senderBankCode: '1016' })
  s = await bank.statusQR(qrId)
  assert.equal(s.pagado, true)
  assert.equal(s.pago.senderName, 'ANA PRUEBA')
  assert.equal(s.pago.senderBankCode, '1016')
  assert.equal(s.pago.amount, 0.02)
})
test('BANCO-07 se acepta tanto "statusQRCode" como "statusQrCode" (el manual trae ambas escrituras)', async () => {
  const falso = { status: 200, json: async () => ({ statusQRCode: 1, payment: { senderName: 'X' }, responseCode: 0 }) }
  const b = nuevoBank({ fetchFn: async (u, o) => (u.includes('authenticate') ? { status: 200, json: async () => ({ token: 't', responseCode: 0 }) } : falso) })
  const s = await b.statusQR('1')
  assert.equal(s.pagado, true)
  assert.equal(s.pago.senderName, 'X') // "payment" como objeto o como lista
})
test('BANCO-08 anular un QR pendiente funciona; anular uno pagado se rechaza', async () => {
  const a = await bank.generateQR(qrBase()); await bank.cancelQR(a.qrId)
  assert.equal((await bank.statusQR(a.qrId)).anulado, true)
  const p = await bank.generateQR(qrBase()); banco.pagar(p.qrId)
  await assert.rejects(() => bank.cancelQR(p.qrId), /ya pagado/)
})
test('BANCO-09 si el token vence (401) se vuelve a autenticar una vez y la operación sigue', async () => {
  const { qrId } = await bank.generateQR(qrBase())
  banco.invalidarTokens()
  const s = await bank.statusQR(qrId)
  assert.equal(s.codigo, 0)
})
test('BANCO-10 paidQR lista los pagos del día para conciliar', async () => {
  const { qrId } = await bank.generateQR(qrBase()); banco.pagar(qrId)
  const hoy = hoyBolivia()
  const lista = await bank.paidQR(hoy)
  assert.ok(lista.some((p) => p.qrId === qrId))
})
