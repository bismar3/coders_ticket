const TZ = 'America/La_Paz'
const LOCALE = 'es-BO'

const fmt = (options) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...options })
const dayF = fmt({ day: '2-digit' })
const monthF = fmt({ month: 'short' })
const weekdayF = fmt({ weekday: 'long' })
const longF = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const shortF = fmt({ day: 'numeric', month: 'short', year: 'numeric' })
const timeF = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })
const dateTimeF = fmt({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

const d = (value) => (value instanceof Date ? value : new Date(value))
const clean = (s) => s.replace('.', '')

export const money = (value, currency = 'Bs') =>
  `${currency} ${Number(value || 0).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const compactMoney = (value) =>
  `Bs ${Number(value || 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`

export const dateParts = (value) => ({
  day: dayF.format(d(value)),
  month: clean(monthF.format(d(value))).toUpperCase(),
  weekday: weekdayF.format(d(value)),
})

export const longDate = (value) => {
  const s = longF.format(d(value))
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const shortDate = (value) => shortF.format(d(value))
export const time = (value) => timeF.format(d(value))
export const dateTime = (value) => dateTimeF.format(d(value))

/** "en 3 días", "mañana", "hoy" */
export function relativeDay(value) {
  const today = new Date().setHours(0, 0, 0, 0)
  const target = new Date(value).setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86_400_000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff > 1 && diff < 30) return `En ${diff} días`
  if (diff < 0) return 'Finalizado'
  return shortDate(value)
}

/** Para <input type="datetime-local"> en hora de Bolivia (UTC-4, sin horario de verano). */
export function toLocalInput(value) {
  const date = new Date(d(value).getTime() - 4 * 3_600_000)
  return date.toISOString().slice(0, 16)
}
export const fromLocalInput = (value) => `${value}:00-04:00`

export const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many}`
