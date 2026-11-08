export const MAX_SOURCE_BYTES = 5 * 1024 * 1024 // FR-011: origen ≤ 5 MB
export const MAX_DIMENSION = 1600 // FR-011: lado mayor ≤ 1600 px
export const TARGET_BYTES = 400 * 1024 // FR-011: ≈ 400 KB tras comprimir
export const MAX_IMAGES = 5 // FR-010
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Reduce manteniendo proporción; nunca agranda. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const k = max / longest
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

/** Devuelve un mensaje de error en español, o null si el archivo es aceptable. */
export function validateImageFile(file: { type: string; size: number; name?: string }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Solo se aceptan fotos JPG, PNG o WebP.'
  if (file.size > MAX_SOURCE_BYTES) return 'La foto pesa más de 5 MB. Prueba con una de menor tamaño.'
  return null
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** FR-011: redimensiona a ≤ 1600 px y comprime a ≈ 400 KB (WebP; JPEG si el navegador no lo soporta). */
export async function compressImage(file: File): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede procesar la foto.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  for (const type of ['image/webp', 'image/jpeg']) {
    let best: Blob | null = null
    for (const quality of [0.82, 0.68, 0.55]) {
      const blob = await toBlob(canvas, type, quality)
      if (!blob || blob.type !== type) break // formato no soportado
      best = blob
      if (blob.size <= TARGET_BYTES) break
    }
    if (best) return { blob: best, ext: type === 'image/webp' ? 'webp' : 'jpg' }
  }
  throw new Error('No se pudo comprimir la foto.')
}
