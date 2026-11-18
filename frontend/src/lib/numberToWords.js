/** Convierte un monto a letras en español (formato de comprobantes bolivianos). */
const UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece',
  'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function upTo999(n) {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  const h = Math.floor(n / 100)
  const rest = n % 100
  let out = HUNDREDS[h]
  if (rest) {
    const words = rest < 30 ? UNITS[rest] : TENS[Math.floor(rest / 10)] + (rest % 10 ? ` y ${UNITS[rest % 10]}` : '')
    out = out ? `${out} ${words}` : words
  }
  return out
}

export function integerToWords(n) {
  if (n === 0) return 'cero'
  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  const parts = []
  if (millions) parts.push(millions === 1 ? 'un millón' : `${upTo999(millions).replace(/uno$/, 'un')} millones`)
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${upTo999(thousands).replace(/uno$/, 'un')} mil`)
  if (rest) parts.push(upTo999(rest))
  return parts.join(' ')
}

/** 240.5 -> "Doscientos cuarenta 50/100 Bolivianos" */
export function amountToWords(amount, currency = 'Bolivianos') {
  const value = Math.round(Number(amount || 0) * 100)
  const integer = Math.floor(value / 100)
  const cents = String(value % 100).padStart(2, '0')
  const words = integerToWords(integer)
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} ${cents}/100 ${currency}`
}
