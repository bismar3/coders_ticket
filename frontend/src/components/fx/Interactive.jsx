import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'

/** Atrae suavemente su contenido hacia el cursor (botones "magnéticos"). */
export function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null)
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 })
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 })
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => { x.set(0); y.set(0) }
  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x, y }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  )
}

/** Tarjeta con inclinación 3D y reflejo que sigue al cursor. */
export function Tilt({ children, max = 10, className = '', glare = true, ...rest }) {
  const ref = useRef(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 18 })
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 18 })
  const gx = useTransform(px, [0, 1], ['0%', '100%'])
  const gy = useTransform(py, [0, 1], ['0%', '100%'])
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.10), transparent 45%)`

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const reset = () => { px.set(0.5); py.set(0.5) }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={`relative ${className}`}
      {...rest}
    >
      {children}
      {glare && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60" style={{ background: glareBg }} />}
    </motion.div>
  )
}

/** Aparece al entrar en pantalla (fade + subida + desenfoque). */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div' }) {
  const Comp = motion[as]
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Comp>
  )
}

/** Titular que entra palabra por palabra. */
export function SplitWords({ text, className = '', delay = 0, stagger = 0.06 }) {
  return (
    <span className={className}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 6 }}
            animate={{ y: '0%', rotate: 0 }}
            transition={{ duration: 0.9, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  )
}

const GLYPHS = '<>/_{}[]#$%&01'

/** Texto que se "decodifica" como en una terminal. */
export function Scramble({ text, className = '', duration = 900, trigger = true }) {
  const [out, setOut] = useState(text)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!trigger || !inView) return
    let frame
    const start = performance.now()
    const run = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const revealed = Math.floor(progress * text.length)
      setOut(text.split('').map((ch, i) => (i < revealed || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''))
      if (progress < 1) frame = requestAnimationFrame(run)
    }
    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [text, duration, trigger, inView])

  return <span ref={ref} className={className}>{out}</span>
}

/** Número que cuenta hasta su valor al entrar en pantalla. */
export function CountUp({ value, duration = 1.6, format = (n) => Math.round(n).toLocaleString('es-BO'), className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(format(0))
  const formatRef = useRef(format)
  formatRef.current = format
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, Number(value) || 0, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setDisplay(formatRef.current(v)) })
    return () => controls.stop()
  }, [inView, value, duration])
  return <span ref={ref} className={className}>{display}</span>
}

/** Cinta infinita. */
export function Marquee({ children, duration = 40, reverse = false, className = '' }) {
  return (
    <div className={`group relative flex overflow-hidden mask-fade-x ${className}`}>
      {[0, 1].map((k) => (
        <div
          key={k}
          aria-hidden={k === 1}
          className="flex shrink-0 animate-marquee items-center gap-10 pr-10 group-hover:[animation-play-state:paused]"
          style={{ '--marquee-duration': `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}

/** Brillo que sigue al cursor dentro de una tarjeta. */
export function Spotlight({ children, className = '', color = 'rgba(34,211,238,0.14)' }) {
  const x = useMotionValue(-500)
  const y = useMotionValue(-500)
  const bg = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, ${color}, transparent 70%)`
  return (
    <div
      className={`group relative ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - r.left)
        y.set(e.clientY - r.top)
      }}
      onPointerLeave={() => { x.set(-500); y.set(-500) }}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]" style={{ background: bg }} />
      {children}
    </div>
  )
}
