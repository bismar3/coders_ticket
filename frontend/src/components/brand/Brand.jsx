import { useId } from 'react'
import { Link } from 'react-router'
import { motion, useScroll, useTransform, useVelocity, useSpring } from 'motion/react'
import MascotFace from '../mascot/MascotFace'

/** Logo del producto: cabeza de la mascota + "coders_tick" con el guion bajo parpadeando. */
export function Logo({ size = 34, className = '' }) {
  return (
    <Link to="/" className={`group flex items-center gap-2.5 ${className}`} data-cursor="Inicio" aria-label="coders_tick, inicio">
      <motion.span whileHover={{ rotate: [0, -12, 10, 0] }} transition={{ duration: 0.5 }}>
        <MascotFace size={size} />
      </motion.span>
      <span className="font-display text-lg font-bold tracking-tight text-white">
        coders<span className="text-neon text-glow">_</span><span className="text-gradient">tick</span>
      </span>
    </Link>
  )
}

/** Marca del equipo: C<>DERS, con los chevrones de neón como en el logo oficial. */
export function Wordmark({ className = '', glow = true }) {
  return (
    <span className={`inline-flex items-center font-display font-black italic tracking-tight ${className}`} aria-label="CODERS">
      <span className="text-chrome">C</span>
      <svg viewBox="0 0 100 80" className={`mx-[0.03em] h-[0.74em] w-[0.95em] -skew-x-6 ${glow ? 'drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]' : ''}`} aria-hidden>
        <defs>
          <linearGradient id="wm-chev" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M40 8 L10 40 L40 72" fill="none" stroke="url(#wm-chev)" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 8 L90 40 L60 72" fill="none" stroke="url(#wm-chev)" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-chrome">DERS</span>
    </span>
  )
}

/**
 * Sello giratorio "HECHO POR CODERS": gira solo y acelera con el scroll.
 */
export function CodersSeal({ size = 116, className = '', to = '/#coders' }) {
  const id = useId().replace(/:/g, '')
  const { scrollY } = useScroll()
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 })
  const extra = useTransform(velocity, [-3000, 0, 3000], [-180, 0, 180])
  const text = 'HECHO POR CODERS • DEV TEAM • 2026 • '

  return (
    <Link to={to} data-cursor="Equipo" className={`group relative block ${className}`} style={{ width: size, height: size }} aria-label="Hecho por el equipo CODERS">
      <motion.div style={{ rotate: extra }} className="absolute inset-0">
        <svg viewBox="0 0 120 120" className="h-full w-full animate-spin-slow group-hover:[animation-duration:4s]">
          <defs>
            <path id={`circle-${id}`} d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
          </defs>
          <circle cx="60" cy="60" r="58" fill="rgba(7,10,22,0.85)" stroke="rgba(34,211,238,0.35)" />
          <circle cx="60" cy="60" r="36" fill="none" stroke="rgba(34,211,238,0.18)" strokeDasharray="2 4" />
          <text className="fill-soft font-mono text-[9.4px] font-bold tracking-[0.18em]">
            <textPath href={`#circle-${id}`}>{text}</textPath>
          </text>
        </svg>
      </motion.div>
      <div className="absolute inset-0 grid grid-cols-1 place-items-center">
        <MascotFace size={size * 0.42} />
      </div>
    </Link>
  )
}
