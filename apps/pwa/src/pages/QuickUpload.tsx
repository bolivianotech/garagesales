import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { uploadProductImage } from '../lib/products'
import { compressImage, validateImageFile } from '../lib/images'

/** FR-015: varias fotos de golpe → un borrador por foto (precio y cantidad se completan después). */
export function QuickUpload() {
  const { store } = useAuth()
  const nav = useNavigate()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  if (!store || store.status !== 'approved') return <p className="error">Tu tienda debe estar aprobada para publicar.</p>

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    const errs: string[] = []
    const valid = files.filter((f) => {
      const problem = validateImageFile(f)
      if (problem) errs.push(`${f.name}: ${problem}`)
      return !problem
    })
    setErrors(errs)
    setProgress({ done: 0, total: valid.length })
    let done = 0
    for (const file of valid) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({ store_id: store!.id, title: 'Sin título', price_cents: 0, stock: 1 })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        const { blob, ext } = await compressImage(file)
        try {
          await uploadProductImage(store!.id, data.id as string, blob, ext, 0)
        } catch (err) {
          await supabase.from('products').delete().eq('id', data.id as string)
          throw err
        }
      } catch (err) {
        errs.push(`${file.name}: ${err instanceof Error ? err.message : 'no se pudo subir'}`)
        setErrors([...errs])
      }
      done += 1
      setProgress({ done, total: valid.length })
    }
    if (errs.length === 0) nav('/vender')
  }

  return (
    <div className="card">
      <h1>Carga rápida</h1>
      <p className="muted">
        Elige muchas fotos de una vez. Se crea un borrador por foto y luego completas el precio y la cantidad de cada uno.
      </p>
      <label className="btn">
        Elegir fotos
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void onPick(e)} disabled={progress !== null && progress.done < progress.total} />
      </label>
      {progress && (
        <p>
          Subiendo {progress.done} de {progress.total}…
        </p>
      )}
      {errors.length > 0 && (
        <ul className="error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <Link to="/vender">Volver a mis productos</Link>
    </div>
  )
}
