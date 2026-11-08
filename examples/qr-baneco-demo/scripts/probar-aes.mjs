// Comprueba que NUESTRO cifrado es compatible con el del banco, en CERTIFICACIÓN.
//  1) Offline: descifra el ejemplo público del manual (debe dar "1234").
//  2) Online: pide al banco cifrar "1234" y lo descifra aquí; luego ciframos aquí y pedimos al banco descifrar.
//
// ¡CUIDADO! Los endpoints /encrypt y /decrypt del banco reciben la llave en la URL. Úsalos SOLO con la llave de
// CERTIFICACIÓN, nunca con la de producción.
//   BANK_BASE_URL=https://apimktdesa.baneco.com.bo/ApiGateway BANK_AES_KEY=<llave de certificación> npm run probar-aes
import { cargarEnv } from '../src/config.mjs'
import { cifrar, descifrar, EJEMPLO_MANUAL } from '../src/aes.mjs'

cargarEnv()
const ok = (b, t) => { console.log(`${b ? '✔' : '✘'} ${t}`); if (!b) process.exitCode = 1 }

ok(descifrar(EJEMPLO_MANUAL.cifrado, EJEMPLO_MANUAL.llave) === EJEMPLO_MANUAL.texto, 'Ejemplo del manual del banco se descifra a "1234" (prueba sin conexión)')

const base = (process.env.BANK_BASE_URL || '').replace(/\/$/, ''), llave = process.env.BANK_AES_KEY || ''
if (!base || !llave) { console.log('\nSin BANK_BASE_URL y BANK_AES_KEY no se hace la prueba con el banco.'); process.exit() }
if (!/apimktdesa|cert|desa/i.test(base) && process.env.FORZAR_PRODUCCION !== 'si') {
  console.error('\nLa URL no parece de certificación. Por seguridad no se envía la llave. (Si estás seguro: FORZAR_PRODUCCION=si)')
  process.exit(2)
}
const texto = '1234'
let r = await fetch(`${base}/api/authentication/encrypt?text=${encodeURIComponent(texto)}&aesKey=${encodeURIComponent(llave)}`)
const deBanco = (await r.text()).replace(/^"|"$/g, '')
let dec = null
try { dec = descifrar(deBanco, llave) } catch {}
ok(dec === texto, 'Lo que cifra el banco se descifra aquí → nuestro formato de lectura coincide')

const nuestro = cifrar(texto, llave)
r = await fetch(`${base}/api/authentication/decrypt?text=${encodeURIComponent(nuestro)}&aesKey=${encodeURIComponent(llave)}`)
const deVuelta = (await r.text()).replace(/^"|"$/g, '')
ok(deVuelta === texto, 'Lo que ciframos aquí lo descifra el banco → nuestro formato de escritura coincide')
console.log(process.exitCode ? '\nNo coincide: revisa la llave (32 caracteres exactos) y src/aes.mjs.' : '\nCifrado compatible con el banco.')
