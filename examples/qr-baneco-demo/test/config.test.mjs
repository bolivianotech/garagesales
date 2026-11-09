import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { leerConfig } from '../src/config.mjs'
import { cifrar } from '../src/aes.mjs'
import { Bank } from '../src/bank.mjs'
import { crearBancoSimulado } from '../src/mock-bank.mjs'

const LLAVE = 'demo-llave-aes-de-32-caracteres!'
const base = { BANK_MODE: 'real', BANK_BASE_URL: 'https://x/ApiGateway', BANK_USERNAME: 'A123', BANK_AES_KEY: LLAVE, BANK_ACCOUNT_CREDIT: '1' }

test('CFG-01 modo real sin ninguna forma de password se rechaza con un mensaje que explica las opciones', () => {
  assert.throws(() => leerConfig(base), /BANK_PASSWORD_FROM/)
})
test('CFG-02 BANK_PASSWORD_FROM=vacio es válido y cifra una cadena vacía', () => {
  const c = leerConfig({ ...base, BANK_PASSWORD_FROM: 'vacio' })
  assert.equal(c.passwordPlano, '')
})
test('CFG-03 BANK_PASSWORD_FROM=usuario cifra el propio usuario', () => {
  assert.equal(leerConfig({ ...base, BANK_PASSWORD_FROM: 'usuario' }).passwordPlano, 'A123')
})
test('CFG-04 un valor desconocido en BANK_PASSWORD_FROM se rechaza', () => {
  assert.throws(() => leerConfig({ ...base, BANK_PASSWORD_FROM: 'otro' }), /usuario|vacio/)
})
test('CFG-05 el modo simulado no exige credenciales', () => {
  assert.equal(leerConfig({ BANK_MODE: 'mock' }).modo, 'mock')
})

test('CFG-06 el banco autentica cuando lo que se cifra es una cadena vacía (usuario sin contraseña)', async () => {
  const banco = crearBancoSimulado({ aesKey: LLAVE, usuario: 'A123', passwordPlano: '' })
  const url = await banco.iniciar(0)
  try {
    const b = new Bank({ baseUrl: url, usuario: 'A123', aesKey: LLAVE, passwordPlano: '', cuentaAbono: '1' })
    assert.match(await b.token(), /^tok_/)
  } finally { await banco.detener() }
})
test('CFG-07 el banco autentica cuando lo que se cifra es el propio usuario', async () => {
  const banco = crearBancoSimulado({ aesKey: LLAVE, usuario: 'A123', passwordPlano: 'A123' })
  const url = await banco.iniciar(0)
  try {
    const b = new Bank({ baseUrl: url, usuario: 'A123', aesKey: LLAVE, passwordPlano: 'A123', cuentaAbono: '1' })
    assert.match(await b.token(), /^tok_/)
  } finally { await banco.detener() }
})

const diag = (cifrado, extra = []) => spawnSync(process.execPath, ['scripts/diagnosticar-password.mjs', `--cifrado=${cifrado}`, ...extra], {
  encoding: 'utf8', env: { ...process.env, BANK_AES_KEY: LLAVE, BANK_USERNAME: 'A123' },
})
test('CFG-08 el diagnóstico reconoce un password vacío sin mostrar nada', () => {
  const r = diag(cifrar('', LLAVE))
  assert.equal(r.status, 0)
  assert.match(r.stdout, /Está vacío: SÍ/)
  assert.match(r.stdout, /BANK_PASSWORD_FROM=vacio/)
})
test('CFG-09 el diagnóstico reconoce que el password es el usuario', () => {
  assert.match(diag(cifrar('A123', LLAVE)).stdout, /Es igual a tu usuario: SÍ/)
})
test('CFG-10 SEGURIDAD: el diagnóstico NO imprime el texto del password salvo con --mostrar', () => {
  const secreto = 'ClaveSecreta77'
  const sin = diag(cifrar(secreto, LLAVE))
  assert.equal(sin.stdout.includes(secreto) || sin.stderr.includes(secreto), false)
  assert.match(sin.stdout, /Largo: 14/)
  assert.equal(diag(cifrar(secreto, LLAVE), ['--mostrar']).stdout.includes(secreto), true)
})
test('CFG-11 el diagnóstico avisa claro si la llave no corresponde', () => {
  const r = diag(cifrar('x', 'otra-llave-aes-de-32-caracteres!'))
  assert.equal(r.status, 1)
  assert.match(r.stderr, /No se pudo descifrar/)
})
