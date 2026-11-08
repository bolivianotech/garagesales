import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import {
  CATEGORIES,
  imageUrl,
  uploadProductImage,
  validateProduct,
  type Product,
  type ProductImage,
} from '../lib/products'
import { centsToInput, parseBsToCents } from '../lib/money'
import { MAX_IMAGES, compressImage, validateImageFile } from '../lib/images'

interface NewPhoto {
  file: File
  preview: string
}

export function ProductForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const { store } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('otros')
  const [condition, setCondition] = useState<'new' | 'used'>('used')
  const [size, setSize] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [existing, setExisting] = useState<ProductImage[]>([])
  const [added, setAdded] = useState<NewPhoto[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data, error } = await supabase.from('products').select('*, product_images(id, path, position)').eq('id', id).maybeSingle()
      if (error || !data) {
        setErrors([error?.message ?? 'Producto no encontrado.'])
      } else {
        const p = data as Product
        setProduct(p)
        setTitle(p.title)
        setDescription(p.description)
        setCategory(p.category)
        setCondition(p.condition)
        setSize(p.size)
        setPrice(centsToInput(p.price_cents))
        setStock(String(p.stock))
        setExisting([...p.product_images].sort((a, b) => a.position - b.position))
      }
      setLoading(false)
    })()
  }, [id])

  if (!store || store.status !== 'approved') return <p className="error">Tu tienda debe estar aprobada para publicar.</p>
  if (loading) return <p className="muted">Cargando…</p>

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const room = MAX_IMAGES - existing.length - added.length
    const errs: string[] = []
    const accepted: NewPhoto[] = []
    for (const f of files.slice(0, Math.max(room, 0))) {
      const problem = validateImageFile(f)
      if (problem) errs.push(`${f.name}: ${problem}`)
      else accepted.push({ file: f, preview: URL.createObjectURL(f) })
    }
    if (files.length > room) errs.push(`Máximo ${MAX_IMAGES} fotos por producto.`)
    setErrors(errs)
    setAdded((a) => [...a, ...accepted])
  }

  async function removeExisting(img: ProductImage) {
    if (!img.id) return
    const { error } = await supabase.from('product_images').delete().eq('id', img.id)
    if (error) {
      setErrors([error.message])
      return
    }
    await supabase.storage.from('product-images').remove([img.path])
    setExisting((x) => x.filter((i) => i.id !== img.id))
  }

  async function save(target: 'draft' | 'active' | 'paused') {
    const priceCents = price.trim() === '' ? 0 : parseBsToCents(price)
    const stockNum = Number(stock)
    const publish = target === 'active'
    const problems = validateProduct({
      title,
      priceCents,
      stock: stockNum,
      imageCount: existing.length + added.length,
      publish,
    })
    if (problems.length) {
      setErrors(problems)
      return
    }
    setBusy(true)
    setErrors([])
    try {
      const fields = {
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        size: size.trim(),
        price_cents: priceCents ?? 0,
        stock: stockNum,
      }
      let productId = product?.id
      if (productId) {
        const { error } = await supabase.from('products').update(fields).eq('id', productId)
        if (error) throw new Error(error.message)
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({ ...fields, store_id: store!.id })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        productId = data.id as string
      }

      let position = existing.length
      for (const photo of added) {
        const { blob, ext } = await compressImage(photo.file)
        await uploadProductImage(store!.id, productId, blob, ext, position++)
      }

      if (target !== 'draft' && !(product && product.status === target)) {
        const { error } = await supabase.from('products').update({ status: target }).eq('id', productId)
        if (error) throw new Error(error.message)
      }
      nav('/vender')
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'No se pudo guardar.'])
    } finally {
      setBusy(false)
    }
  }

  async function removeProduct() {
    if (!product || !window.confirm('¿Borrar este borrador?')) return
    const paths = existing.map((i) => i.path)
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      setErrors([error.message])
      return
    }
    if (paths.length) await supabase.storage.from('product-images').remove(paths)
    nav('/vender')
  }

  const isDraft = !product || product.status === 'draft'
  const canAddMore = existing.length + added.length < MAX_IMAGES

  return (
    <form
      className="card"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        void save(isDraft ? 'active' : (product?.status === 'paused' ? 'paused' : 'active'))
      }}
    >
      <h1>{product ? 'Editar producto' : 'Nuevo producto'}</h1>
      {product && <p className="muted">{product.sku}</p>}

      <div className="photos">
        {existing.map((i) => (
          <div key={i.id ?? i.path} className="photo">
            <img src={imageUrl(i.path)} alt="" />
            <button type="button" className="x" onClick={() => void removeExisting(i)} aria-label="Quitar foto">
              ×
            </button>
          </div>
        ))}
        {added.map((a, idx) => (
          <div key={a.preview} className="photo">
            <img src={a.preview} alt="" />
            <button
              type="button"
              className="x"
              onClick={() => setAdded((x) => x.filter((_, j) => j !== idx))}
              aria-label="Quitar foto"
            >
              ×
            </button>
          </div>
        ))}
        {canAddMore && (
          <label className="photo add">
            + Foto
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPick} />
          </label>
        )}
      </div>
      <p className="muted">Hasta {MAX_IMAGES} fotos. Se optimizan solas antes de subir.</p>

      <label>
        Título
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
      </label>
      <div className="row">
        <label className="grow">
          Precio (Bs)
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="50" />
        </label>
        <label className="grow">
          Cantidad
          <input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
        </label>
      </div>
      <div className="row">
        <label className="grow">
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Estado
          <select value={condition} onChange={(e) => setCondition(e.target.value as 'new' | 'used')}>
            <option value="used">Usado</option>
            <option value="new">Nuevo</option>
          </select>
        </label>
      </div>
      <label>
        Talla (opcional)
        <input value={size} onChange={(e) => setSize(e.target.value)} maxLength={20} />
      </label>
      <label>
        Descripción (opcional)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
      </label>

      {errors.length > 0 && (
        <ul className="error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="row">
        <button disabled={busy}>{busy ? 'Guardando…' : isDraft ? 'Publicar' : 'Guardar cambios'}</button>
        {isDraft && (
          <button type="button" className="secondary" disabled={busy} onClick={() => void save('draft')}>
            Guardar borrador
          </button>
        )}
        {product && isDraft && (
          <button type="button" className="link" onClick={() => void removeProduct()}>
            Borrar
          </button>
        )}
      </div>
    </form>
  )
}
