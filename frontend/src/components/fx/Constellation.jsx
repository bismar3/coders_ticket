import { useEffect, useRef } from 'react'

/**
 * Red de nodos que flota y se ilumina alrededor del cursor.
 * Optimizada: pocos nodos, DPR limitado, distancias al cuadrado (sin sqrt) y se pausa
 * cuando sale de la pantalla o la pestaña no está visible.
 */
export default function Constellation({ max = 55, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d', { alpha: true })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let nodes = []
    let raf = 0
    let visible = true
    const mouse = { x: -9999, y: -9999 }
    const LINK = 110 * 110
    const NEAR = 190 * 190

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(max, Math.floor((width * height) / 22000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.lineWidth = 0.7
      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 0 || n.x > width) n.vx *= -1
          if (n.y < 0 || n.y > height) n.vy *= -1
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        const mdx = mouse.x - a.x
        const mdy = mouse.y - a.y
        const hot = mdx * mdx + mdy * mdy < NEAR
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = dx * dx + dy * dy
          if (d < LINK) {
            const t = 1 - d / LINK
            ctx.strokeStyle = hot ? `rgba(34,211,238,${t * 0.5})` : `rgba(99,132,255,${t * 0.14})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
        ctx.fillStyle = hot ? 'rgba(165,243,252,0.95)' : 'rgba(147,197,253,0.45)'
        ctx.fillRect(a.x - 1, a.y - 1, hot ? 2.6 : 2, hot ? 2.6 : 2)
      }
      raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0
    }
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw) }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start() })
    io.observe(canvas)

    resize()
    start()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', start)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', start)
    }
  }, [max])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}
