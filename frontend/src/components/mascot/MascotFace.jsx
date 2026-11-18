import { useEffect, useId, useRef } from 'react'
import { motion, useSpring } from 'motion/react'

/**
 * Cabeza de la mascota CODERS dibujada en SVG: capucha, visor negro y ojos de neón.
 * Los ojos siguen al cursor y el "_" parpadea como el cursor de una terminal.
 */
const EYES = {
  idle: (
    <>
      <path d="M38 52 L48 60 L38 68" />
      <path d="M66 68 L82 68" className="animate-blink" />
    </>
  ),
  happy: (
    <>
      <path d="M36 64 L44 55 L52 64" />
      <path d="M68 64 L76 55 L84 64" />
    </>
  ),
  surprised: (
    <>
      <circle cx="44" cy="60" r="7" />
      <circle cx="76" cy="60" r="7" />
    </>
  ),
  angry: (
    <>
      <path d="M37 53 L48 60 L37 67" />
      <path d="M83 53 L72 60 L83 67" />
    </>
  ),
  sad: (
    <>
      <path d="M36 62 Q44 57 52 62" />
      <path d="M68 62 Q76 57 84 62" />
    </>
  ),
  thinking: (
    <>
      <path d="M38 52 L48 60 L38 68" />
      <circle cx="70" cy="64" r="1.6" className="animate-blink" />
      <circle cx="76" cy="64" r="1.6" className="animate-blink [animation-delay:.2s]" />
      <circle cx="82" cy="64" r="1.6" className="animate-blink [animation-delay:.4s]" />
    </>
  ),
  sleepy: (
    <>
      <path d="M36 63 L52 63" />
      <path d="M68 63 L84 63" />
    </>
  ),
  wink: (
    <>
      <path d="M36 64 L44 55 L52 64" />
      <path d="M66 66 L82 66" />
    </>
  ),
}

export default function MascotFace({ mood = 'idle', size = 48, follow = true, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const ref = useRef(null)
  const gx = useSpring(0, { stiffness: 160, damping: 16 })
  const gy = useSpring(0, { stiffness: 160, damping: 16 })

  useEffect(() => {
    if (!follow) return
    const onMove = (e) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const dist = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, dist / 260)
      gx.set((dx / dist) * 6 * reach)
      gy.set((dy / dist) * 4.5 * reach)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [follow, gx, gy])

  return (
    <svg ref={ref} viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id={`hood-${uid}`} cx="40%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#2a2f7a" />
          <stop offset="55%" stopColor="#141850" />
          <stop offset="100%" stopColor="#080a26" />
        </radialGradient>
        <radialGradient id={`visor-${uid}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#0d1022" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* capucha */}
      <path d="M60 4 C26 4 8 30 8 62 C8 94 30 114 60 114 C90 114 112 94 112 62 C112 30 94 4 60 4 Z" fill={`url(#hood-${uid})`} />
      {/* aro luminoso */}
      <ellipse cx="60" cy="64" rx="43" ry="38" fill="none" stroke="#22d3ee" strokeWidth="5" filter={`url(#glow-${uid})`} opacity="0.95" />
      {/* visor */}
      <ellipse cx="60" cy="64" rx="38" ry="33" fill={`url(#visor-${uid})`} />
      <ellipse cx="48" cy="46" rx="16" ry="6" fill="white" opacity="0.06" />
      {/* ojos */}
      <motion.g
        key={mood}
        style={{ x: gx, y: gy }}
        initial={{ scaleY: 0.2, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        fill={mood === 'surprised' ? 'none' : '#67e8f9'}
        stroke="#67e8f9"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${uid})`}
        className="origin-center"
      >
        {EYES[mood] ?? EYES.idle}
      </motion.g>
    </svg>
  )
}
