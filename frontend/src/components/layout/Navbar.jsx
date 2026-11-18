import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ChevronDown, Menu } from 'lucide-react'
import { Logo } from '../brand/Brand'
import { Button } from '../ui/ui'
import { ROLE_LABEL, useAuth } from '../../context/AuthContext'
import { initials } from './ProfileDrawer'
import MobileMenu from './MobileMenu'

/** Enlaces de la barra en PC (en celular y tablet todo vive en el menú lateral). */
const LINKS = {
  guest: [{ to: '/cartelera', label: 'Cartelera' }],
  cliente: [
    { to: '/cartelera', label: 'Cartelera' },
    { to: '/mis-entradas', label: 'Mis entradas' },
    { to: '/mis-compras', label: 'Mis compras' },
  ],
  organizador: [{ to: '/organizador', label: 'Panel de administración' }],
  portero: [{ to: '/puerta', label: 'Control de puerta' }],
}

export default function Navbar() {
  const { user, logout, openProfile } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const links = LINKS[user?.role ?? 'guest']

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setCompact(y > 40)
    setHidden(y > 300 && y > prev && !open)
  })
  useEffect(() => setOpen(false), [pathname])
  // el selector de módulos del panel (y otros) pueden abrir este mismo menú
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener('coders:open-nav', show)
    return () => window.removeEventListener('coders:open-nav', show)
  }, [])
  const close = useCallback(() => setOpen(false), [])

  const signOut = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: hidden ? -110 : 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-40 lg:px-6 lg:pt-3"
      >
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between gap-3 transition-[height,background-color,border-color,box-shadow] duration-500
            max-lg:h-14 max-lg:border-b max-lg:border-line max-lg:bg-ink-950/95 max-lg:px-4 max-lg:sm:px-6
            lg:rounded-full lg:px-5 ${compact ? 'lg:glass lg:h-14 lg:shadow-[0_20px_60px_-25px_rgba(34,211,238,0.35)]' : 'lg:h-16 lg:border lg:border-transparent'}`}
        >
          <Logo size={30} />

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map(({ to, label }) => (
              <li key={to}>
                <NavLink to={to} data-cursor="Ir" className="relative block rounded-full px-4 py-2 text-sm font-semibold text-soft transition-colors hover:text-white">
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border border-neon/30 bg-neon/10 shadow-[0_0_20px_-4px_rgba(34,211,238,0.6)]" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                      )}
                      <span className={`relative ${isActive ? 'text-white' : ''}`}>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <button onClick={openProfile} data-cursor="Perfil" aria-label="Abrir mi perfil"
                className="group flex items-center gap-2.5 rounded-full border border-line bg-ink-900/60 py-1 pl-1 pr-3 transition-colors hover:border-neon/40">
                <span className="grid size-8 place-items-center rounded-full border border-neon/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.2))] font-display text-[11px] font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="text-left leading-tight">
                  <span className="block max-w-36 truncate text-sm font-bold text-white">{user.name}</span>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-neon">{ROLE_LABEL[user.role]}</span>
                </span>
                <ChevronDown className="size-4 text-mute transition-transform group-hover:translate-y-0.5" />
              </button>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm" cursor="Entrar">Ingresar</Button>
                <Button to="/registro" size="sm" cursor="Unirme">Crear cuenta</Button>
              </>
            )}
          </div>

          {/* Celular y tablet: acceso rápido + menú */}
          <div className="flex items-center gap-2 lg:hidden">
            {user ? (
              <button onClick={openProfile} aria-label="Abrir mi perfil"
                className="grid size-9 place-items-center rounded-full border border-neon/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.2))] font-display text-[11px] font-bold text-white">
                {initials(user.name)}
              </button>
            ) : (
              pathname !== '/login' && (
                <Link to="/login" className="flex h-9 items-center rounded-full border border-line px-4 text-sm font-bold text-white max-[359px]:hidden">Ingresar</Link>
              )
            )}
            <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-2 rounded-full border border-line bg-ink-900 px-3 text-sm font-bold text-white" aria-label="Abrir menú" aria-expanded={open}>
              <Menu className="size-4" />
              <span className="hidden min-[400px]:inline">Menú</span>
            </button>
          </div>
        </nav>
      </motion.header>

      <MobileMenu open={open} onClose={close} onSignOut={signOut} />
    </>
  )
}
