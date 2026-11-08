// Dinero en centavos enteros; el banco recibe decimales con punto y máximo 2 decimales.
export const aMontoBanco = (centavos) => {
  if (!Number.isInteger(centavos) || centavos <= 0) throw new Error('El monto debe ser un número entero de centavos mayor a 0.')
  return Number((centavos / 100).toFixed(2))
}
export const formatearBs = (centavos) => {
  const abs = Math.abs(centavos)
  const entero = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${centavos < 0 ? '-' : ''}Bs ${entero},${String(abs % 100).padStart(2, '0')}`
}
export const bsACentavos = (bs) => Math.round(Number(bs) * 100)

// El banco limita la glosa a 100 caracteres.
export function armarGlosa(codigo, items) {
  const cuerpo = items.map((i) => `${i.qty}x ${i.sku}`).join(', ')
  const glosa = `${codigo} ${cuerpo}`
  return glosa.length <= 100 ? glosa : glosa.slice(0, 99) + '…'
}

// dueDate del banco es solo fecha (yyyy-MM-dd). Se calcula en hora de La Paz.
export function fechaVencimiento(dias = 1, ahora = new Date()) {
  const futuro = new Date(ahora.getTime() + dias * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(futuro)
}
