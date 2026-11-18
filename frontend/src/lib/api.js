/**
 * Cliente HTTP único de la web. Todo pasa por el gateway (/api/<servicio>/...), nunca directo a un servicio.
 */
const BASE = import.meta.env.VITE_API_BASE ?? '/api'
const TOKEN_KEY = 'coderstick.token'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (token) => {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* modo privado */ }
  },
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

const FIELDS = {
  email: 'el correo', password: 'la contraseña', new_password: 'la nueva contraseña', current_password: 'la contraseña actual',
  name: 'el nombre', phone: 'el teléfono', document_id: 'el documento', title: 'el nombre del evento', venue: 'el lugar',
  city: 'la ciudad', starts_at: 'la fecha', price: 'el precio', capacity: 'el cupo', quantity: 'la cantidad', code: 'el código',
  description: 'la descripción', icon: 'el ícono', category: 'la categoría', card_number: 'la tarjeta',
}

/** Traduce los errores de validación de FastAPI/Pydantic (vienen en inglés) a mensajes claros en español. */
function translate(d) {
  const field = FIELDS[d.loc?.[d.loc.length - 1]] ?? 'este campo'
  const ctx = d.ctx ?? {}
  if (d.type === 'value_error') {
    if (/valid email/i.test(d.msg)) return 'Ingresa un correo válido (ej. nombre@correo.com)'
    return d.msg.replace(/^Value error, /, '')
  }
  const map = {
    missing: `Falta ${field}`,
    string_too_short: `${field} debe tener al menos ${ctx.min_length} caracteres`,
    string_too_long: `${field} no puede superar ${ctx.max_length} caracteres`,
    greater_than_equal: `${field} debe ser mayor o igual a ${ctx.ge}`,
    less_than_equal: `${field} debe ser menor o igual a ${ctx.le}`,
    greater_than: `${field} debe ser mayor a ${ctx.gt}`,
    string_pattern_mismatch: `${field} no tiene un formato válido`,
    int_parsing: `${field} debe ser un número entero`,
    float_parsing: `${field} debe ser un número`,
    uuid_parsing: `${field} no es válido`,
    datetime_from_date_parsing: `${field} no es una fecha válida`,
    datetime_parsing: `${field} no es una fecha válida`,
    too_short: `${field} necesita al menos ${ctx.min_length} elemento(s)`,
  }
  const text = map[d.type] ?? `Revisa ${field}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function messageFrom(data, status) {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return [...new Set(detail.map(translate))].join(' · ')
  if (status >= 500) return 'El servicio no está disponible en este momento'
  return 'Algo salió mal, intenta de nuevo'
}

async function request(method, path, { body, form, raw } = {}) {
  const headers = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError('No hay conexión con el servidor', 0)
  }

  if (raw && response.ok) return response
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized()
    throw new ApiError(messageFrom(data, response.status), response.status, data)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (path, file) => {
    const form = new FormData()
    form.append('file', file)
    return request('POST', path, { form })
  },
  /** Descarga un archivo protegido (PDF de la entrada) y lo guarda en el equipo. */
  download: async (path, filename) => {
    const response = await request('GET', path, { raw: true })
    const url = URL.createObjectURL(await response.blob())
    const link = Object.assign(document.createElement('a'), { href: url, download: filename })
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  },
}

const qs = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()
  return q ? `?${q}` : ''
}

// Endpoints por servicio: así queda claro qué microservicio atiende cada pantalla.
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (current_password, new_password) => api.post('/auth/me/password', { current_password, new_password }),
  staff: (params) => api.get(`/auth/staff${qs(params)}`),
  createStaff: (data) => api.post('/auth/staff', data),
  updateStaff: (id, data) => api.patch(`/auth/staff/${id}`, data),
}

export const eventsApi = {
  list: (params) => api.get(`/events${qs(params)}`),
  get: (id) => api.get(`/events/${id}`),
  mine: (params) => api.get(`/events/mine${qs(params)}`),
  mineAll: () => api.get('/events/mine/all'),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  setStatus: (id, status) => api.patch(`/events/${id}/status`, { status }),
  uploadImage: (id, file) => api.upload(`/events/${id}/image`, file),
  categories: (all = false) => api.get(`/events/categories${all ? '?all=true' : ''}`),
  createCategory: (data) => api.post('/events/categories', data),
  updateCategory: (id, data) => api.put(`/events/categories/${id}`, data),
  deleteCategory: (id) => api.del(`/events/categories/${id}`),
}

export const ordersApi = {
  create: (data) => api.post('/orders', data),
  mine: () => api.get('/orders/mine'),
  get: (id) => api.get(`/orders/${id}`),
  sync: (id) => api.post(`/orders/${id}/sync`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  organizerStats: () => api.get('/orders/stats/organizer'),
  sales: (params) => api.get(`/orders/stats/sales${qs(params)}`),
}

export const ticketsApi = {
  mine: () => api.get('/tickets/mine'),
  byOrder: (orderId) => api.get(`/tickets/order/${orderId}`),
  downloadPdf: (code) => api.download(`/tickets/${code}/pdf`, `entrada-${code}.pdf`),
}

export const checkinApi = {
  scan: (code, eventId) => api.post('/checkin', { code, event_id: eventId }),
  eventStats: (eventId) => api.get(`/checkin/events/${eventId}/stats`),
  attempts: (eventId, params) => api.get(`/checkin/events/${eventId}/attempts${qs(params)}`),
  perEvent: () => api.get('/checkin/stats'),
  report: () => api.get('/checkin/report'),
}
