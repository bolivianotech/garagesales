import { describe, expect, it } from 'vitest'
import { centsToInput, formatBs, parseBsToCents } from './money'
import { ALLOWED_TYPES, fitWithin, validateImageFile } from './images'
import { validateProduct } from './products'

describe('dinero (FR-010)', () => {
  it('TC-UI-01 convierte texto a centavos', () => {
    expect(parseBsToCents('50')).toBe(5000)
    expect(parseBsToCents('49,90')).toBe(4990)
    expect(parseBsToCents('49.9')).toBe(4990)
    expect(parseBsToCents(' 1250 ')).toBe(125000)
    expect(parseBsToCents('0,05')).toBe(5)
  })
  it('TC-UI-02 rechaza valores inválidos', () => {
    expect(parseBsToCents('')).toBeNull()
    expect(parseBsToCents('abc')).toBeNull()
    expect(parseBsToCents('-5')).toBeNull()
    expect(parseBsToCents('1,234')).toBeNull()
    expect(parseBsToCents('10.5.2')).toBeNull()
  })
  it('TC-UI-03 formatea en bolivianos', () => {
    expect(formatBs(5000)).toBe('Bs 50,00')
    expect(formatBs(125050)).toBe('Bs 1.250,50')
    expect(formatBs(5)).toBe('Bs 0,05')
  })
  it('TC-UI-04 muestra el valor en el campo', () => {
    expect(centsToInput(5000)).toBe('50')
    expect(centsToInput(4990)).toBe('49.90')
    expect(centsToInput(0)).toBe('')
  })
})

describe('fotos (FR-011)', () => {
  it('TC-UI-05 reduce a máximo 1600 px conservando proporción', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })
  it('TC-UI-06 no agranda fotos pequeñas', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
  it('TC-UI-07 acepta JPG/PNG/WebP de hasta 5 MB', () => {
    for (const type of ALLOWED_TYPES) expect(validateImageFile({ type, size: 1000 })).toBeNull()
    expect(validateImageFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull()
  })
  it('TC-UI-08 rechaza otros formatos y fotos de más de 5 MB', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1000 })).not.toBeNull()
    expect(validateImageFile({ type: 'application/pdf', size: 1000 })).not.toBeNull()
    expect(validateImageFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).not.toBeNull()
  })
})

describe('validación de producto (FR-010)', () => {
  const ok = { title: 'Camisa', priceCents: 5000, stock: 3, imageCount: 1, publish: true }
  it('TC-UI-09 un producto completo no tiene errores', () => {
    expect(validateProduct(ok)).toEqual([])
  })
  it('TC-UI-10 precio 0 o inválido impide publicar', () => {
    expect(validateProduct({ ...ok, priceCents: 0 })).not.toEqual([])
    expect(validateProduct({ ...ok, priceCents: null })).not.toEqual([])
  })
  it('TC-UI-11 cantidad negativa o decimal es inválida', () => {
    expect(validateProduct({ ...ok, stock: -1 })).not.toEqual([])
    expect(validateProduct({ ...ok, stock: 1.5 })).not.toEqual([])
  })
  it('TC-UI-12 publicar exige foto, guardar borrador no', () => {
    expect(validateProduct({ ...ok, imageCount: 0 })).not.toEqual([])
    expect(validateProduct({ ...ok, imageCount: 0, publish: false })).toEqual([])
  })
  it('TC-UI-13 máximo 5 fotos y título mínimo', () => {
    expect(validateProduct({ ...ok, imageCount: 6 })).not.toEqual([])
    expect(validateProduct({ ...ok, title: ' a ' })).not.toEqual([])
  })
})
