import { supabase } from './supabase'

export type ProductStatus = 'draft' | 'active' | 'paused' | 'sold_out'

export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ropa', label: 'Ropa' },
  { value: 'calzado', label: 'Calzado' },
  { value: 'accesorios', label: 'Accesorios' },
  { value: 'electrodomesticos', label: 'Electrodomésticos' },
  { value: 'computacion', label: 'Computación' },
  { value: 'tv_audio', label: 'TV y audio' },
  { value: 'otros', label: 'Otros' },
]

export const statusLabel: Record<ProductStatus, string> = {
  draft: 'Borrador',
  active: 'Publicado',
  paused: 'Pausado',
  sold_out: 'Agotado',
}

export interface ProductImage {
  id?: string
  path: string
  position: number
}

export interface Product {
  id: string
  store_id: string
  sku: string
  title: string
  description: string
  category: string
  condition: 'new' | 'used'
  size: string
  price_cents: number
  stock: number
  status: ProductStatus
  hidden: boolean
  product_images: ProductImage[]
  stores?: { name: string } | null
}

export interface ProductInput {
  title: string
  priceCents: number | null
  stock: number
  imageCount: number
  publish: boolean
}

/** FR-010: validaciones de formulario (el servidor las vuelve a aplicar). */
export function validateProduct(i: ProductInput): string[] {
  const errors: string[] = []
  if (i.title.trim().length < 2) errors.push('Escribe un título (mínimo 2 letras).')
  if (i.title.trim().length > 100) errors.push('El título no puede pasar de 100 caracteres.')
  if (i.priceCents === null) errors.push('El precio no es válido. Usa números, por ejemplo 50 o 49,90.')
  if (!Number.isInteger(i.stock) || i.stock < 0) errors.push('La cantidad debe ser un número entero, 0 o mayor.')
  if (i.publish) {
    if (i.priceCents === null || i.priceCents <= 0) errors.push('Para publicar, el precio debe ser mayor a 0.')
    if (i.imageCount < 1) errors.push('Para publicar, agrega al menos una foto.')
  }
  if (i.imageCount > 5) errors.push('Máximo 5 fotos por producto.')
  return errors
}

export function imageUrl(path: string): string {
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

export function firstImage(p: { product_images: ProductImage[] }): string | null {
  const sorted = [...p.product_images].sort((a, b) => a.position - b.position)
  return sorted[0] ? imageUrl(sorted[0].path) : null
}

/** Sube una foto ya comprimida y la registra (FR-010/FR-011). */
export async function uploadProductImage(
  storeId: string,
  productId: string,
  blob: Blob,
  ext: string,
  position: number,
): Promise<void> {
  const path = `${storeId}/${productId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('product-images').upload(path, blob, { contentType: blob.type, upsert: false })
  if (up.error) throw new Error(up.error.message)
  const ins = await supabase.from('product_images').insert({ product_id: productId, path, position })
  if (ins.error) {
    await supabase.storage.from('product-images').remove([path])
    throw new Error(ins.error.message)
  }
}
