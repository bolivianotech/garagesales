// Pruebas de la lógica de cobro (tres caminos) con base en memoria y banco simulado.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BanecoClient, CERTIFICATION_URL } from '../_shared/baneco.ts'
import { bankPaidAt, checkOrder, checkPayments, createQrForOrder, expireOrders, handleNotification, PaymentError, toCents } from '../_shared/payments.ts'
import { FakeBank, KEY } from './fake-bank.ts'
import { FakeDb } from './fake-db.ts'

function setup() {
  const bank = new FakeBank(); const db = new FakeDb()
  const client = new BanecoClient({ baseUrl: CERTIFICATION_URL, username: 'A00000001', passwordFrom: 'vacio', aesKey: KEY, accountNumber: '1234567890', fetchFn: bank.fetch as typeof fetch })
  db.addOrder('o1', 'GS-O1', 2550)
  return { bank, db, client }
}
const qrOf = (b: FakeBank) => [...b.qrs.keys()][0]

test('TC-PAY-01 FR-031 crea el QR con el monto del pedido y lo registra', async () => {
  const { bank, db, client } = setup()
  const r = await createQrForOrder({ db, bank: client, orderId: 'o1' })
  assert.equal(r.amount_cents, 2550); assert.equal(bank.qrs.get(qrOf(bank))!.amount, 25.5)
  assert.equal(db.pays.length, 1)
})

test('TC-PAY-02 FR-031 crear el QR dos veces no genera otro (idempotente)', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' }); await createQrForOrder({ db, bank: client, orderId: 'o1' })
  assert.equal(bank.qrs.size, 1)
})

test('TC-PAY-03 FR-031 no se crea QR de un pedido ajeno, pagado o vencido', async () => {
  const { db, client } = setup()
  await assert.rejects(createQrForOrder({ db, bank: client, orderId: 'nope' }), (e: PaymentError) => e.status === 404)
  db.orders.get('o1')!.status = 'paid'
  await assert.rejects(createQrForOrder({ db, bank: client, orderId: 'o1' }), (e: PaymentError) => e.status === 409)
  db.addOrder('o2', 'GS-O2', 100, undefined, -1000)
  await assert.rejects(createQrForOrder({ db, bank: client, orderId: 'o2' }), (e: PaymentError) => e.status === 410)
})

test('TC-PAY-04 FR-032 camino 1: la pantalla confirma el pago y guarda quién pagó', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  assert.equal((await checkOrder({ db, bank: client, orderId: 'o1' })).state, 'pending')
  db.pays[0].lastChecked = 0
  bank.pay(qrOf(bank))
  assert.equal((await checkOrder({ db, bank: client, orderId: 'o1' })).state, 'paid')
  assert.equal(db.orders.get('o1')!.status, 'paid')
  assert.equal(db.confirmCalls[0].senderName, 'JUAN PEREZ'); assert.equal(db.confirmCalls[0].senderBankCode, '1016')
})

test('TC-PAY-05 NFR-009 consultar otra vez de inmediato no llama al banco', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  await checkOrder({ db, bank: client, orderId: 'o1' })
  const n = bank.calls.length
  assert.equal((await checkOrder({ db, bank: client, orderId: 'o1' })).state, 'skipped'); assert.equal(bank.calls.length, n)
})

test('TC-PAY-06 FR-032 camino 3: la revisión periódica confirma con la lista de pagados', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  bank.pay(qrOf(bank))
  const r = await checkPayments({ db, bank: client })
  assert.equal(r.confirmed, 1); assert.equal(db.orders.get('o1')!.status, 'paid')
})

test('TC-PAY-07 FR-034 un pago confirmado por dos caminos cuenta una sola vez', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  bank.pay(qrOf(bank))
  const [a, b] = await Promise.all([checkPayments({ db, bank: client }), handleNotification({ db, bank: client, body: { payment: { qrId: qrOf(bank) } } })])
  const again = await checkPayments({ db, bank: client })
  assert.equal(again.confirmed, 0)
  assert.equal(db.pays[0].status, 'paid'); assert.ok(a.confirmed + (b.confirmed === 'paid' ? 1 : 0) >= 1)
})

test('TC-PAY-08 FR-032 camino 3: un fallo del banco no confirma nada ni rompe la revisión', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  bank.failNext = { path: /paidQR/, code: 5, times: 1 }
  const r = await checkPayments({ db, bank: client })
  assert.equal(r.confirmed, 0); assert.ok(r.errors >= 1); assert.equal(db.orders.get('o1')!.status, 'pending')
})

test('TC-PAY-09 FR-032 camino 2: aviso legítimo confirma; aviso falso no', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  assert.deepEqual(await handleNotification({ db, bank: client, body: { payment: { qrId: 'FALSO', amount: 25.5 } } }), { confirmed: null })
  assert.deepEqual(await handleNotification({ db, bank: client, body: { payment: { qrId: qrOf(bank), amount: 25.5 } } }), { confirmed: null }, 'el banco aún dice pendiente')
  assert.equal(db.orders.get('o1')!.status, 'pending')
  bank.pay(qrOf(bank))
  assert.deepEqual(await handleNotification({ db, bank: client, body: { payment: { qrId: qrOf(bank) } } }), { confirmed: 'paid' })
})

test('TC-PAY-10 FR-033 monto distinto al del pedido va a revisión, no se entrega', async () => {
  const { bank, db, client } = setup()
  await createQrForOrder({ db, bank: client, orderId: 'o1' })
  bank.pay(qrOf(bank), { amount: 10 })
  const r = await checkPayments({ db, bank: client })
  assert.equal(r.review, 1); assert.equal(db.orders.get('o1')!.status, 'review')
})

test('TC-PAY-11 FR-039b vencimiento: se anula el QR en el banco', async () => {
  const { bank, db, client } = setup()
  db.addOrder('o3', 'GS-O3', 500, undefined, 5)
  await createQrForOrder({ db, bank: client, orderId: 'o3' })
  await new Promise((r) => setTimeout(r, 15))
  const r = await expireOrders({ db, bank: client })
  assert.equal(r.expired, 1); assert.equal(r.cancelledAtBank, 1); assert.equal(bank.qrs.get(qrOf(bank))!.status, 9)
})

test('TC-PAY-12 FR-039b vencimiento: si justo se había pagado, el pago tardío se honra', async () => {
  const { bank, db, client } = setup()
  db.addOrder('o3', 'GS-O3', 500, undefined, 5)
  await createQrForOrder({ db, bank: client, orderId: 'o3' })
  bank.pay(qrOf(bank))
  await new Promise((r) => setTimeout(r, 15))
  const r = await expireOrders({ db, bank: client })
  assert.equal(r.rescued, 1); assert.equal(db.pays[0].status, 'paid')
})

test('TC-PAY-13 FR-033 el banco informa decimales: los centavos no pierden exactitud', () => {
  assert.equal(toCents(0.1 + 0.2), 30); assert.equal(toCents(1.15), 115); assert.equal(toCents('25.50'), 2550); assert.equal(toCents(19.99), 1999)
})

test('TC-PAY-14 FR-083 la hora del pago es la de Bolivia convertida a UTC', () => {
  assert.equal(bankPaidAt({ paymentDate: '2026-11-09', paymentTime: '10:30:00' }), '2026-11-09T14:30:00.000Z')
  assert.equal(bankPaidAt({ paymentDate: 'x', paymentTime: '10:30:00' }), null)
})
