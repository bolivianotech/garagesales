import { describe, expect, it } from 'vitest'
import { addLine, countItems, removeLine, setQty, totalCents } from './cart'

describe('carrito (FR-022)', () => {
  it('TC-UI-20 FR-022 agregar suma cantidades y respeta el stock', () => {
    let c = addLine([], 'a', 1, 3)
    c = addLine(c, 'a', 5, 3)
    expect(c).toEqual([{ product_id: 'a', qty: 3 }])
  })
  it('TC-UI-21 FR-022 cambiar cantidad a 0 quita la línea; quitar elimina', () => {
    const c = [{ product_id: 'a', qty: 2 }, { product_id: 'b', qty: 1 }]
    expect(setQty(c, 'a', 0)).toEqual([{ product_id: 'b', qty: 1 }])
    expect(removeLine(c, 'b')).toEqual([{ product_id: 'a', qty: 2 }])
  })
  it('TC-UI-22 FR-013 el total se calcula en centavos enteros', () => {
    const c = [{ product_id: 'a', qty: 3 }, { product_id: 'b', qty: 1 }]
    expect(totalCents(c, { a: 1999, b: 10 })).toBe(6007)
    expect(countItems(c)).toBe(4)
  })
  it('TC-UI-23 FR-022 el carrito no pasa de 30 líneas', () => {
    let c = [] as ReturnType<typeof addLine>
    for (let i = 0; i < 35; i++) c = addLine(c, `p${i}`)
    expect(c.length).toBe(30)
  })
})
