import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aMontoBanco, formatearBs, armarGlosa, fechaVencimiento, bsACentavos } from '../src/dinero.mjs'

test('DIN-01 los centavos pasan al banco como decimal de máximo 2 decimales, sin errores de coma flotante', () => {
  assert.equal(aMontoBanco(1), 0.01)
  assert.equal(aMontoBanco(1234), 12.34)
  assert.equal(aMontoBanco(29), 0.29)
  assert.equal(aMontoBanco(110), 1.1)
  assert.equal(bsACentavos('0.01'), 1)
  assert.equal(bsACentavos(19.99), 1999)
})
test('DIN-02 montos inválidos se rechazan', () => {
  for (const x of [0, -5, 1.5, NaN]) assert.throws(() => aMontoBanco(x))
})
test('DIN-03 formato en bolivianos', () => {
  assert.equal(formatearBs(1), 'Bs 0,01')
  assert.equal(formatearBs(125050), 'Bs 1.250,50')
})
test('DIN-04 la glosa nunca pasa de 100 caracteres y empieza por el código del pedido', () => {
  const corta = armarGlosa('D-0001', [{ qty: 1, sku: 'CAM-001' }, { qty: 2, sku: 'GOR-002' }])
  assert.equal(corta, 'D-0001 1x CAM-001, 2x GOR-002')
  const larga = armarGlosa('D-0002', Array.from({ length: 30 }, (_, i) => ({ qty: 1, sku: 'SKU-' + i })))
  assert.ok(larga.length <= 100 && larga.startsWith('D-0002') && larga.endsWith('…'))
})
test('DIN-05 la fecha de vencimiento es yyyy-MM-dd en hora de La Paz', () => {
  assert.match(fechaVencimiento(1), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(fechaVencimiento(0, new Date('2026-11-09T02:00:00Z')), '2026-11-08') // 22:00 del 8 en La Paz (UTC-4)
})
