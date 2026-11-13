import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cifrar, descifrar, EJEMPLO_MANUAL } from '../src/aes.mjs'

test('AES-01 el ejemplo PÚBLICO del manual del banco se descifra a "1234"', () => {
  assert.equal(descifrar(EJEMPLO_MANUAL.cifrado, EJEMPLO_MANUAL.llave), EJEMPLO_MANUAL.texto)
})
test('AES-02 cifrar y descifrar devuelve el texto original (incluye tildes)', () => {
  const llave = 'demo-llave-aes-de-32-caracteres!'
  for (const t of ['1234', 'cuenta 1234567890', 'ñandú ¡hola!', '']) assert.equal(descifrar(cifrar(t, llave), llave), t)
})
test('AES-03 el resultado tiene el formato del banco: base64 de 16 bytes de IV + bloques de 16', () => {
  const b = Buffer.from(cifrar('1234', 'demo-llave-aes-de-32-caracteres!'), 'base64')
  assert.equal(b.length, 32)
  assert.equal(Buffer.from(EJEMPLO_MANUAL.cifrado, 'base64').length, 32)
})
test('AES-04 cada cifrado usa un IV distinto', () => {
  const l = 'demo-llave-aes-de-32-caracteres!'
  assert.notEqual(cifrar('1234', l), cifrar('1234', l))
})
test('AES-05 una llave de largo incorrecto se rechaza con un mensaje claro', () => {
  assert.throws(() => cifrar('x', 'corta'), /32 caracteres/)
  assert.throws(() => cifrar('x', 'a'.repeat(33)), /32 caracteres/)
})
test('AES-06 con otra llave no se puede descifrar', () => {
  const c = cifrar('secreto', 'demo-llave-aes-de-32-caracteres!')
  assert.throws(() => descifrar(c, 'otra-llave-aes-de-32-caracteres!'))
})
