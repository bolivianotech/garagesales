/** Convierte texto del usuario ("50", "50.5", "50,50") a centavos enteros. Devuelve null si no es válido. */
export function parseBsToCents(input: string): number | null {
  const t = input.trim().replace(/\s+/g, '').replace(',', '.')
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null
  const [int, dec = ''] = t.split('.')
  return Number(int) * 100 + Number((dec + '00').slice(0, 2))
}

/** Formato "Bs 1.250,50" (punto de miles, coma decimal). */
export function formatBs(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(Math.round(cents))
  const int = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const dec = (abs % 100).toString().padStart(2, '0')
  return `${sign}Bs ${int},${dec}`
}

/** Para mostrar un valor existente dentro de un campo de texto editable. */
export function centsToInput(cents: number): string {
  return cents === 0 ? '' : (cents / 100).toFixed(2).replace(/\.00$/, '')
}
