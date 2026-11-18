import { NavLink, Outlet, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { ChevronDown, ExternalLink, UserCog, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../components/layout/ProfileDrawer'
import { ADMIN_GROUPS as GROUPS, openNavMenu } from '../../lib/navigation'

/** Módulo activo según la URL (para el selector en celular y tablet). */
function currentModule(pathname) {
  for (const g of GROUPS) {
    for (const item of g.items) {
      if (item.end ? pathname === item.to : pathname.startsWith(item.to)) return { ...item, group: g.label }
    }
  }
  return { ...GROUPS[0].items[0], group: GROUPS[0].label }
}

/** Panel de administración del organizador: barra lateral por secciones y cada módulo en su lugar. */
export default function AdminLayout() {
  const { pathname } = useLocation()
  const { user, openProfile } = useAuth()
  const section = pathname.split('/').slice(0, 3).join('/')
  const current = currentModule(pathname)

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 pb-24 pt-[4.75rem] sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
      <aside className="sticky top-24 hidden h-[calc(100svh-7rem)] w-60 shrink-0 flex-col lg:flex">
        <nav className="flex-1 space-y-6 overflow-y-auto pr-2" data-lenis-prevent>
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-mute/70">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map(({ to, end, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors">
                      {({ isActive }) => (
                        <>
                          {isActive && <motion.span layoutId="admin-active" className="absolute inset-0 rounded-xl border border-neon/25 bg-neon/[0.07]" transition={{ type: 'spring', stiffness: 450, damping: 36 }} />}
                          {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-neon" />}
                          <Icon className={`relative size-4 ${isActive ? 'text-neon' : 'text-mute'}`} />
                          <span className={`relative ${isActive ? 'text-white' : 'text-soft hover:text-white'}`}>{label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-mute/70">Cuenta</p>
            <button onClick={openProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-soft hover:text-white">
              <UserRound className="size-4 text-mute" /> Mi perfil
            </button>
            <a href="/cartelera" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-soft hover:text-white">
              <ExternalLink className="size-4 text-mute" /> Ver sitio público
            </a>
          </div>
        </nav>
        <button onClick={openProfile} className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-ink-900/70 p-3 text-left transition hover:border-neon/30">
          <span className="grid grid-cols-1 size-10 place-items-center rounded-xl border border-neon/30 bg-neon/10 font-display text-xs font-bold text-white">{initials(user.name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-white">{user.name}</span>
            <span className="flex items-center gap-1 text-[11px] text-mute"><UserCog className="size-3" /> Administrador</span>
          </span>
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* celular y tablet: dónde estoy + abrir los módulos (sin pestañas cortadas) */}
        <button onClick={openNavMenu} className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-900/70 p-2.5 pr-4 text-left lg:hidden" aria-label="Cambiar de módulo">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-neon/30 bg-neon/10 text-neon"><current.icon className="size-[18px]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-mute">Panel · {current.group}</span>
            <span className="block truncate font-bold text-white">{current.label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-neon">Módulos <ChevronDown className="size-3.5" /></span>
        </button>
        {/* Animación CSS al cambiar de módulo: si el módulo tarda en cargar, igual termina visible */}
        <div key={section} className="page-enter">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
