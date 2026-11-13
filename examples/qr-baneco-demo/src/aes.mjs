// Cifrado que exige la API del banco para: password, accountCredit y accountCode.
//
// Configuración DEDUCIDA Y VERIFICADA con el ejemplo público del manual del banco (v1.3.0):
//   texto "1234" + llave "40A318B299F245C2B697176723088629"  ->  "KJAzqjmwjxIOqVo5J3IH0/7fGmNdzuyszrlqexVSeos="
//   - Algoritmo : AES-256-CBC, relleno PKCS#7
//   - Llave     : los 32 caracteres de la llave, tomados como texto UTF-8 (32 bytes = 256 bits)
//   - IV        : 16 bytes; el resultado es  base64( IV + texto_cifrado )  (el IV va al principio)
// Descifrar el ejemplo del manual con esta configuración devuelve "1234" (ver test/aes.test.mjs).
import crypto from 'node:crypto'

function clave(llave) {
  const buf = Buffer.from(String(llave), 'utf8')
  if (buf.length !== 32) {
    throw new Error(`La llave AES debe tener exactamente 32 caracteres (256 bits); tiene ${buf.length}.`)
  }
  return buf
}

export function cifrar(texto, llave) {
  const iv = crypto.randomBytes(16)
  const c = crypto.createCipheriv('aes-256-cbc', clave(llave), iv)
  const cifrado = Buffer.concat([c.update(String(texto), 'utf8'), c.final()])
  return Buffer.concat([iv, cifrado]).toString('base64')
}

export function descifrar(base64, llave) {
  const datos = Buffer.from(String(base64), 'base64')
  if (datos.length < 32 || datos.length % 16 !== 0) throw new Error('Texto cifrado inválido.')
  const d = crypto.createDecipheriv('aes-256-cbc', clave(llave), datos.subarray(0, 16))
  return Buffer.concat([d.update(datos.subarray(16)), d.final()]).toString('utf8')
}

// Ejemplo público del manual del banco (NO es una credencial real).
export const EJEMPLO_MANUAL = {
  texto: '1234',
  llave: '40A318B299F245C2B697176723088629',
  cifrado: 'KJAzqjmwjxIOqVo5J3IH0/7fGmNdzuyszrlqexVSeos=',
}
