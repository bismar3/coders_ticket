import {
  CalendarRange, ChartColumn, History, House, LayoutDashboard, ScanLine, ShoppingBag, Sparkles, Tags, Ticket, Users, Zap,
} from 'lucide-react'

/** Módulos del panel del organizador (barra lateral en PC y menú en celular/tablet). */
export const ADMIN_GROUPS = [
  { label: 'General', items: [{ to: '/organizador', end: true, label: 'Resumen', icon: LayoutDashboard, hint: 'Ingresos y actividad' }] },
  {
    label: 'Gestión',
    items: [
      { to: '/organizador/eventos', label: 'Eventos', icon: CalendarRange, hint: 'Crear, editar y publicar' },
      { to: '/organizador/categorias', label: 'Categorías', icon: Tags, hint: 'Tipos de evento' },
      { to: '/organizador/ventas', label: 'Ventas', icon: ShoppingBag, hint: 'Compras y pagos' },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/organizador/accesos', label: 'Reportes de acceso', icon: ChartColumn, hint: 'Ingresos por evento, categoría y puerta' },
      { to: '/organizador/personal', label: 'Personal', icon: Users, hint: 'Porteros y organizadores' },
    ],
  },
]

const EXPLORE = { to: '/cartelera', label: 'Cartelera', icon: Sparkles, hint: 'Todos los eventos' }

/** Secciones del menú (celular y tablet) según el rol. */
export function menuSections(role) {
  switch (role) {
    case 'organizador':
      return [
        ...ADMIN_GROUPS,
        { label: 'Sitio', items: [{ ...EXPLORE, label: 'Ver cartelera', hint: 'Como la ve el público' }] },
      ]
    case 'portero':
      return [{ label: 'Operación', items: [{ to: '/puerta', label: 'Control de puerta', icon: ScanLine, hint: 'Escanear y validar entradas' }] }]
    case 'cliente':
      return [
        { label: 'Explorar', items: [{ to: '/', end: true, label: 'Inicio', icon: House }, EXPLORE] },
        {
          label: 'Mi cuenta',
          items: [
            { to: '/mis-entradas', label: 'Mis entradas', icon: Ticket, hint: 'Tus QR para entrar' },
            { to: '/mis-compras', label: 'Mis compras', icon: History, hint: 'Pagos y notas de compra' },
          ],
        },
      ]
    default:
      return [
        {
          label: 'Explorar',
          items: [
            { to: '/', end: true, label: 'Inicio', icon: House },
            EXPLORE,
            { to: '/#como-funciona', hash: true, label: 'Cómo funciona', icon: Zap, hint: 'Compra en 4 pasos' },
          ],
        },
      ]
  }
}

/** Abre el menú de navegación desde cualquier parte (p. ej. el selector de módulos del panel). */
export const openNavMenu = () => window.dispatchEvent(new Event('coders:open-nav'))
