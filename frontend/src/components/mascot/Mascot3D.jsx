import { useEffect, useRef, useState } from 'react'
import visorBody from '../../assets/mascot/frontal-visor.webp'

/**
 * Mascota CODERS en 2.5D que mira al cursor.
 * - El cuerpo (pose frontal real) se inclina en perspectiva hacia el mouse.
 * - La imagen base tiene el visor vacío (sin ojos pintados); los ojos son una capa vectorial en
 *   otra profundidad (translateZ) que sigue al cursor, parpadea y cambia de ánimo.
 *   Así nunca se asoman ojos "fantasma" detrás al girar.
 * Todo se anima con transform directo en un requestAnimationFrame (sin re-render de React)
 * y el ciclo se detiene al desmontar o cuando la mascota sale de la pantalla.
 *
 * Props opcionales para controlarla desde fuera (p. ej. el login):
 * - mood: idle | happy | wink | closed | sad | surprised | angry
 * - lookAt: { x, y } entre -1 y 1 para fijar la mirada (si no, sigue al cursor)
 *
 * Coordenadas en píxeles de la imagen frontal (405 × 560).
 */
const W = 405
const H = 560

const EYES = {
  idle: (
    <>
      <path d="M143 199 L195 230 L143 261" />
      <path d="M247 250 L301 250" className="mascot-blink" />
    </>
  ),
  happy: (
    <>
      <path d="M140 246 L168 214 L196 246" />
      <path d="M248 246 L276 214 L304 246" />
    </>
  ),
  wink: (
    <>
      <path d="M140 246 L168 214 L196 246" />
      <path d="M248 238 L302 238" />
    </>
  ),
  closed: (
    <>
      <path d="M140 232 Q168 250 196 232" />
      <path d="M248 232 Q276 250 304 232" />
    </>
  ),
  sad: (
    <>
      <path d="M142 240 Q168 220 194 240" />
      <path d="M250 240 Q276 220 302 240" />
    </>
  ),
  surprised: (
    <>
      <circle cx="168" cy="232" r="20" />
      <circle cx="276" cy="232" r="20" />
    </>
  ),
  angry: (
    <>
      <path d="M143 205 L195 232 L143 259" />
      <path d="M301 205 L249 232 L301 259" />
    </>
  ),
}

export default function Mascot3D({ className = '', mood: controlledMood, lookAt = null, interactive = true }) {
  const stage = useRef(null)
  const body = useRef(null)
  const eyes = useRef(null)
  const lids = useRef(null)
  const look = useRef(lookAt)
  const [hoverMood, setHoverMood] = useState('idle')
  const mood = controlledMood ?? hoverMood
  look.current = lookAt

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = { rx: 0, ry: 0, ex: 0, ey: 0 }
    const cur = { rx: 0, ry: 0, ex: 0, ey: 0 }
    let raf = 0
    let alive = true
    let visible = true
    const t0 = performance.now()

    const tick = (now) => {
      raf = 0
      if (!alive || !body.current || !eyes.current) return
      if (look.current) {
        target.ex = look.current.x * 16
        target.ey = look.current.y * 10
        target.ry = look.current.x * 12
        target.rx = -look.current.y * 6
      }
      for (const key of ['rx', 'ry', 'ex', 'ey']) cur[key] += (target[key] - cur[key]) * 0.09
      const bob = reduce ? 0 : Math.sin((now - t0) / 900) * 6
      body.current.style.transform = `translate3d(0, ${bob}px, 0) rotateX(${cur.rx}deg) rotateY(${cur.ry}deg)`
      eyes.current.setAttribute('transform', `translate(${cur.ex.toFixed(2)} ${cur.ey.toFixed(2)})`)
      if (visible && !document.hidden) raf = requestAnimationFrame(tick)
    }
    const start = () => { if (alive && !raf && visible && !document.hidden) raf = requestAnimationFrame(tick) }

    const onMove = (e) => {
      if (look.current) return
      const r = stage.current?.getBoundingClientRect()
      if (!r) return
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)))
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.35)) / (window.innerHeight / 2)))
      target.ry = nx * 16
      target.rx = -ny * 10
      target.ex = nx * 16
      target.ey = ny * 10
    }

    // Se pausa fuera de pantalla (ahorra batería en celulares)
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start() })
    if (stage.current) io.observe(stage.current)

    // Parpadeo aleatorio
    let blinkTimer
    const blink = () => {
      if (!alive) return
      lids.current?.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.08)' }, { transform: 'scaleY(1)' }],
        { duration: 180, easing: 'ease-in-out' })
      blinkTimer = setTimeout(blink, 2600 + Math.random() * 3200)
    }
    blinkTimer = setTimeout(blink, 2000)

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', start)
    start()
    return () => {
      alive = false
      if (raf) cancelAnimationFrame(raf)
      clearTimeout(blinkTimer)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  const wink = () => {
    if (controlledMood) return
    setHoverMood('wink')
    setTimeout(() => setHoverMood('happy'), 450)
  }

  return (
    <div ref={stage} className={`relative [perspective:1100px] ${className}`}
      {...(interactive ? { onPointerEnter: () => setHoverMood('happy'), onPointerLeave: () => setHoverMood('idle'), onClick: wink, 'data-cursor': 'Hola' } : {})}>
      <div aria-hidden className="absolute bottom-[1%] left-1/2 h-[7%] w-[52%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(34,211,238,0.35),transparent)]" />
      <div ref={body} className="relative h-full w-full will-change-transform [transform-style:preserve-3d]">
        <img src={visorBody} alt="Mascota de CODERS" draggable={false} className="h-full w-full object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.5)]" />
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full [transform:translateZ(28px)]">
          <defs>
            <clipPath id="m3d-visor">
              <ellipse cx="224" cy="232" rx="104" ry="58" />
            </clipPath>
            <filter id="m3d-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g clipPath="url(#m3d-visor)">
          <g ref={eyes}>
            <g ref={lids} style={{ transformOrigin: '222px 232px', transformBox: 'view-box' }}
              fill="none" stroke={mood === 'angry' ? '#fda4af' : '#7ff0ff'} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" filter="url(#m3d-glow)">
              {EYES[mood] ?? EYES.idle}
            </g>
          </g>
          </g>
          <ellipse cx="190" cy="196" rx="44" ry="10" fill="white" opacity="0.05" />
        </svg>
      </div>
    </div>
  )
}
