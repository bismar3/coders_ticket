import { forwardRef } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { LoaderCircle } from 'lucide-react'
import MascotPose from '../mascot/MascotPose'

const VARIANTS = {
  primary:
    'bg-[linear-gradient(110deg,#22d3ee,#3b82f6_45%,#8b5cf6)] bg-[length:200%_100%] text-ink-950 font-extrabold shadow-[0_10px_40px_-10px_rgba(34,211,238,0.8)] hover:bg-[position:100%_0] hover:shadow-[0_14px_50px_-8px_rgba(139,92,246,0.85)]',
  ghost: 'glass text-white hover:border-neon/50 hover:bg-white/5',
  outline: 'border border-line text-soft hover:border-neon/60 hover:text-white',
  danger: 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25',
  success: 'bg-ok/15 text-ok border border-ok/30 hover:bg-ok/25',
}
const SIZES = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-6 text-sm', lg: 'h-14 px-8 text-base' }

/** Botón principal de la marca. Acepta `to` (enlace interno) o `href`. */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, className = '', children, to, href, cursor, ...rest },
  ref,
) {
  const classes = `relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-[background-position,box-shadow,border-color,background-color,color] duration-500 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      <span>{children}</span>
      {IconRight && !loading && <IconRight className="size-4 transition-transform group-hover:translate-x-1" />}
    </>
  )
  const motionProps = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.96 }, transition: { type: 'spring', stiffness: 400, damping: 20 } }
  if (to) return <motion.div {...motionProps} className={`inline-flex ${className.split(' ').includes('w-full') ? 'w-full' : ''}`}><Link ref={ref} to={to} data-cursor={cursor} className={`group ${classes}`} {...rest}>{content}</Link></motion.div>
  if (href) return <motion.a ref={ref} href={href} data-cursor={cursor} className={`group ${classes}`} {...motionProps} {...rest}>{content}</motion.a>
  return <motion.button ref={ref} data-cursor={cursor} className={`group ${classes}`} disabled={loading || rest.disabled} {...motionProps} {...rest}>{content}</motion.button>
})

export const Field = forwardRef(function Field({ label, labelClassName = '', icon: Icon, error, hint, className = '', as = 'input', ...rest }, ref) {
  const Comp = as
  return (
    <label className={`block ${className}`}>
      {label && <span className={`mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-mute ${labelClassName}`}>{label}</span>}
      <span className="group relative flex items-center">
        {Icon && <Icon className="pointer-events-none absolute left-4 size-4 text-mute transition-colors group-focus-within:text-neon" />}
        <Comp
          ref={ref}
          className={`w-full rounded-2xl border bg-ink-900/70 px-4 py-3 text-white placeholder:text-mute/60 outline-none transition-all focus:border-neon/70 focus:bg-ink-850 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)] ${Icon ? 'pl-11' : ''} ${error ? 'border-bad/60' : 'border-line'} ${as === 'textarea' ? 'min-h-28 resize-y' : ''}`}
          {...rest}
        />
      </span>
      {(error || hint) && <span className={`mt-1.5 block text-xs ${error ? 'text-bad' : 'text-mute'}`}>{error || hint}</span>}
    </label>
  )
})

const BADGE = {
  pagada: 'bg-ok/15 text-ok border-ok/30',
  publicado: 'bg-ok/15 text-ok border-ok/30',
  valida: 'bg-ok/15 text-ok border-ok/30',
  pendiente: 'bg-warn/15 text-warn border-warn/30',
  borrador: 'bg-white/5 text-soft border-line',
  rechazada: 'bg-bad/15 text-bad border-bad/30',
  cancelada: 'bg-white/5 text-mute border-line',
  cancelado: 'bg-bad/15 text-bad border-bad/30',
  anulada: 'bg-bad/15 text-bad border-bad/30',
}

export function StatusBadge({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${BADGE[status] ?? BADGE.borrador} ${className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function Eyebrow({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/5 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-neon ${className}`}>
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-neon" />
      </span>
      {children}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, subtitle, className = '', align = 'left' }) {
  return (
    <div className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl ${className}`}>
      {eyebrow && <Eyebrow className="mb-3 sm:mb-5">{eyebrow}</Eyebrow>}
      <h2 className="text-[clamp(1.6rem,6.5vw,3rem)] font-bold leading-[1.1]">{title}</h2>
      {subtitle && <p className="mt-2 text-[15px] text-mute sm:mt-4 sm:text-lg">{subtitle}</p>}
    </div>
  )
}

/** Estado vacío / error con una pose de la mascota. */
export function EmptyState({ pose = 'durmiendo', title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14 ${className}`}>
      <MascotPose pose={pose} className="h-32 w-32 sm:h-44 sm:w-44" />
      <h3 className="mt-4 text-lg font-bold sm:mt-6 sm:text-xl">{title}</h3>
      {description && <p className="mt-2 max-w-md text-mute">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`relative overflow-hidden rounded-2xl bg-ink-800/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent ${className}`} />
}

export function PageLoader({ label = 'Cargando' }) {
  return (
    <div className="grid grid-cols-1 min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <MascotPose pose="trabajando" className="h-36 w-36" />
        <span className="font-mono text-sm text-neon">&gt; {label}<span className="animate-blink">_</span></span>
      </div>
    </div>
  )
}

/** Contenedor de página con el ancho y márgenes estándar. */
export function Page({ children, className = '' }) {
  return <main className={`mx-auto w-full max-w-7xl px-4 pb-24 pt-[5.25rem] sm:px-6 sm:pt-24 lg:px-8 lg:pb-28 lg:pt-28 ${className}`}>{children}</main>
}
