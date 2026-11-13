// Dice QUÉ contiene un "password" cifrado que ya funciona (por ejemplo el de Hoppscotch o el del sistema de tu
// estudiante), SIN mostrarlo en pantalla, para saber qué debes cifrar tú. Todo ocurre en tu computador.
//
//   BANK_AES_KEY va en tu .env.   Uso:
//   npm run diagnosticar-password -- --cifrado=<valor base64 del campo "password">
//   Añade --mostrar solo si quieres VER el texto (cuidado: es una credencial).
import { cargarEnv } from '../src/config.mjs'
import { descifrar } from '../src/aes.mjs'

cargarEnv()
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const cifrado = arg('cifrado') || process.env.BANK_PASSWORD_ENCRYPTED || ''
const llave = process.env.BANK_AES_KEY || ''
const usuario = process.env.BANK_USERNAME || ''
const mostrar = process.argv.includes('--mostrar')

if (!cifrado || !llave) {
  console.error('Falta el valor cifrado (--cifrado=...) o BANK_AES_KEY en tu .env.')
  process.exit(2)
}
let texto
try { texto = descifrar(cifrado, llave) } catch (e) {
  console.error('✘ No se pudo descifrar: la llave no corresponde a ese valor, o el valor no es un cifrado del banco.')
  console.error('  Revisa que BANK_AES_KEY tenga 32 caracteres exactos y sea la llave del MISMO ambiente.')
  process.exit(1)
}
console.log('✔ Se pudo descifrar con tu llave: el formato de cifrado coincide con el del banco.\n')
console.log('El "password" cifrado contiene:')
console.log(`  • Largo: ${texto.length} carácter(es)`)
console.log(`  • Está vacío: ${texto.length === 0 ? 'SÍ  → usa BANK_PASSWORD_FROM=vacio' : 'no'}`)
console.log(`  • Es igual a tu usuario: ${usuario ? (texto === usuario ? 'SÍ  → usa BANK_PASSWORD_FROM=usuario' : 'no') : '(define BANK_USERNAME para comparar)'}`)
console.log(`  • Solo dígitos: ${/^\d+$/.test(texto) ? 'sí' : 'no'}`)
if (texto.length && texto !== usuario) console.log('\nEs un valor propio: usa BANK_PASSWORD_PLAIN con ese texto, o BANK_PASSWORD_ENCRYPTED con el valor cifrado.')
if (mostrar) console.log(`\nTexto (¡credencial!): ${JSON.stringify(texto)}`)
else console.log('\n(El texto no se muestra. Añade --mostrar si lo necesitas.)')
