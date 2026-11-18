import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, LogIn, LogOut, UserPlus, UserRound, X } from 'lucide-react'
import { Logo } from '../brand/Brand'
import MascotPose from '../mascot/MascotPose'
import { ROLE_LABEL, useAuth } from '../../context/AuthContext'
import { iconFor, useCategories } from '../../lib/categories'
import { menuSections } from '../../lib/navigation'
import { initials } from './ProfileDrawer'

function Item({ item, onNavigate, index }) {
  const { to, end, hash, label, hint, icon: Icon } = item
  const body = (active) => (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors ${active ? 'border-neon/40 bg-neon/15 text-neon' : 'border-line bg-ink-850 text-soft'}`}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-bold ${active ? 'text-white' : 'text-soft'}`}>{label}</span>
        {hint && <span className="block truncate text-xs text-mute">{hint}</span>}
      </span>
      <ChevronRight className={`size-4 shrink-0 ${active ? 'text-neon' : 'text-mute/60'}`} />
    </>
  )
  const cls = (active) => `flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors ${active ? 'bg-neon/[0.07]' : 'active:bg-white/5'}`
  return (
    <motion.li initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + index * 0.03 }}>
      {hash ? (
        <Link to={to} onClick={onNavigate} className={cls(false)}>{body(false)}</Link>
      ) : (
        <NavLink to={to} end={end} onClick={onNavigate} className={({ isActive }) => cls(isActive)}>
          {({ isActive }) => body(isActive)}
        </NavLink>
      )}
    </motion.li>
  )
}

/** Menú lateral para celular y tablet: secciones agrupadas según el rol, sin nada cortado. */
export default function MobileMenu({ open, onClose, onSignOut }) {
  const { user, openProfile } = useAuth()
  const categories = useCategories()
  const sections = menuSections(user?.role)
  const showCategories = !user || user.role === 'cliente'
  let n = 0

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { root.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={onClose} className="absolute inset-0 bg-ink-950/75" />
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Menú"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="absolute inset-y-0 right-0 flex w-[min(88vw,380px)] flex-col border-l border-line bg-ink-900 shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <Logo size={28} />
              <button onClick={onClose} className="grid size-9 place-items-center rounded-full border border-line text-soft" aria-label="Cerrar menú">
                <X className="size-4" />
              </button>
            </header>

            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-4">
              {/* Quién soy */}
              {user ? (
                <button onClick={() => { onClose(); openProfile() }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-850 p-3 text-left">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-neon/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.2))] font-display text-xs font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-white">{user.name}</span>
                    <span className="block truncate text-xs text-mute">{user.email}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-neon/30 bg-neon/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon">{ROLE_LABEL[user.role]}</span>
                </button>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-850 p-4">
                  <div aria-hidden className="absolute -right-1 top-1 h-24 w-20"><MascotPose pose="saludando" float={false} glow={false} className="h-full w-full" /></div>
                  <p className="pr-20 font-display text-base font-bold text-white">¡Hola!</p>
                  <p className="mt-1 pr-20 text-sm text-mute">Ingresa para comprar y tener tus entradas siempre a mano.</p>
                  <div className="relative mt-4 grid grid-cols-2 gap-2">
                    <Link to="/login" onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-ink-900 text-sm font-bold text-white">
                      <LogIn className="size-4" /> Ingresar
                    </Link>
                    <Link to="/registro" onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(110deg,#22d3ee,#3b82f6)] text-sm font-extrabold text-ink-950">
                      <UserPlus className="size-4" /> Crear cuenta
                    </Link>
                  </div>
                </div>
              )}

              {/* Secciones */}
              {sections.map((s) => (
                <nav key={s.label} className="mt-5" aria-label={s.label}>
                  <p className="mb-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-mute/80">{s.label}</p>
                  <ul className="space-y-0.5">
                    {s.items.map((item) => <Item key={item.to} item={item} index={n++} onNavigate={onClose} />)}
                  </ul>
                </nav>
              ))}

              {showCategories && categories.length > 0 && (
                <nav className="mt-5" aria-label="Categorías">
                  <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-mute/80">Categorías</p>
                  <div className="grid grid-cols-2 gap-2 px-1">
                    {categories.map((c) => {
                      const Icon = iconFor(c.icon)
                      return (
                        <Link key={c.slug} to={`/cartelera?category=${c.slug}`} onClick={onClose}
                          className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-ink-850 px-3 py-2.5 text-sm font-semibold text-soft active:border-neon/40">
                          <Icon className="size-4 shrink-0 text-neon" />
                          <span className="truncate">{c.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </nav>
              )}

              {user && (
                <nav className="mt-5" aria-label="Cuenta">
                  <p className="mb-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-mute/80">Cuenta</p>
                  <button onClick={() => { onClose(); openProfile() }} className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left active:bg-white/5">
                    <span className="grid size-10 place-items-center rounded-xl border border-line bg-ink-850 text-soft"><UserRound className="size-[18px]" /></span>
                    <span className="flex-1">
                      <span className="block text-[15px] font-bold text-soft">Mi perfil</span>
                      <span className="block text-xs text-mute">Datos y contraseña</span>
                    </span>
                    <ChevronRight className="size-4 text-mute/60" />
                  </button>
                </nav>
              )}
            </div>

            {user && (
              <footer className="shrink-0 border-t border-line p-3">
                <button onClick={onSignOut} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-bad/30 bg-bad/10 text-sm font-bold text-bad">
                  <LogOut className="size-4" /> Cerrar sesión
                </button>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
