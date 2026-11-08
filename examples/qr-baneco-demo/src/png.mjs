// Genera un PNG simple (patrón tipo QR) SOLO para el banco simulado. NO es un QR válido: no se puede escanear.
import zlib from 'node:zlib'
import crypto from 'node:crypto'

const tabla = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = tabla[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const trozo = (tipo, datos) => {
  const t = Buffer.from(tipo), len = Buffer.alloc(4), crc = Buffer.alloc(4)
  len.writeUInt32BE(datos.length); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])))
  return Buffer.concat([len, t, datos, crc])
}

export function pngSimulado(semilla, modulos = 25, escala = 8) {
  const h = crypto.createHash('sha256').update(String(semilla)).digest()
  const celda = (r, c) => {
    const buscador = (r0, c0) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7 && (r === r0 || r === r0 + 6 || c === c0 || c === c0 + 6 || (r >= r0 + 2 && r <= r0 + 4 && c >= c0 + 2 && c <= c0 + 4))
    if (buscador(0, 0) || buscador(0, modulos - 7) || buscador(modulos - 7, 0)) return true
    if ((r < 8 && c < 8) || (r < 8 && c >= modulos - 8) || (r >= modulos - 8 && c < 8)) return false
    return (h[(r * modulos + c) % 32] >> ((r + c) % 8)) & 1
  }
  const borde = 4, lado = (modulos + borde * 2) * escala
  const filas = []
  for (let y = 0; y < lado; y++) {
    const fila = Buffer.alloc(1 + lado)
    for (let x = 0; x < lado; x++) {
      const r = Math.floor(y / escala) - borde, c = Math.floor(x / escala) - borde
      fila[1 + x] = r >= 0 && c >= 0 && r < modulos && c < modulos && celda(r, c) ? 0 : 255
    }
    filas.push(fila)
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(lado, 0); ihdr.writeUInt32BE(lado, 4); ihdr[8] = 8; ihdr[9] = 0
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(Buffer.concat(filas))), trozo('IEND', Buffer.alloc(0))])
  return png.toString('base64')
}
