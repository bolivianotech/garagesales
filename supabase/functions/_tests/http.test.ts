import { test } from 'node:test'
import assert from 'node:assert/strict'
import { corsFor, errorResponse, HttpError, isBankNotification, requireCron, safeEqual } from '../_shared/http.ts'

test('TC-HTTP-01 NFR-004 safeEqual falla cerrado con valores vacíos o distintos', () => {
  assert.equal(safeEqual('a', 'a'), true); assert.equal(safeEqual('a', 'b'), false)
  assert.equal(safeEqual('', ''), false); assert.equal(safeEqual(undefined, undefined), false); assert.equal(safeEqual('a', 'ab'), false)
})

test('TC-HTTP-02 NFR-004 las tareas programadas exigen CRON_SECRET (y sin secreto configurado nadie entra)', () => {
  assert.throws(() => requireCron(new Headers(), { CRON_SECRET: 's' }), HttpError)
  assert.throws(() => requireCron(new Headers({ 'x-cron-secret': 'mal' }), { CRON_SECRET: 's' }), HttpError)
  assert.throws(() => requireCron(new Headers({ 'x-cron-secret': '' }), {}), HttpError)
  assert.doesNotThrow(() => requireCron(new Headers({ 'x-cron-secret': 's' }), { CRON_SECRET: 's' }))
})

test('TC-HTTP-03 NFR-004 el aviso del banco exige el token Bearer', () => {
  const env = { BANCO_ECONOMICO_NOTIFY_TOKEN: 'tok' }
  assert.equal(isBankNotification(new Headers({ authorization: 'Bearer tok' }), env), true)
  assert.equal(isBankNotification(new Headers({ authorization: 'Bearer otro' }), env), false)
  assert.equal(isBankNotification(new Headers(), env), false)
  assert.equal(isBankNotification(new Headers({ authorization: 'Bearer ' }), {}), false)
})

test('TC-HTTP-04 NFR-004 CORS solo permite los orígenes configurados', () => {
  const r = (o: string) => new Request('http://x', { headers: { origin: o } })
  assert.equal(corsFor(r('https://a.bo'), { ALLOWED_ORIGINS: 'https://a.bo' })['Access-Control-Allow-Origin'], 'https://a.bo')
  assert.equal(corsFor(r('https://evil'), { ALLOWED_ORIGINS: 'https://a.bo' })['Access-Control-Allow-Origin'], undefined)
})

test('TC-HTTP-05 NFR-004 los errores internos no filtran detalles', async () => {
  const res = errorResponse(new Error('clave secreta KEY=abc'))
  assert.equal(res.status, 500); assert.ok(!(await res.text()).includes('abc'))
})
