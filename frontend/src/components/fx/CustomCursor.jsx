import { useEffect, useRef, useState } from 'react'

const INTERACTIVE = 'a, button, [role="button"], [data-cursor], label, summary, select'
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]'

/**
 * Cursor de la marca: punto de neón + anillo que lo sigue con inercia.
 * Optimizado: un solo requestAnimationFrame, solo `transform` (GPU), sin canvas ni re-render de React por movimiento.
 * - Sobre enlaces/botones el anillo crece; con data-cursor="Texto" lo muestra dentro.
 * - Sobre campos de texto se convierte en una barra de terminal.
 */
export default function CustomCursor() {
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)
  const dot = useRef(null)
  const ring = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-custom-cursor')
    const target = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    let mode = ''
    let raf = 0
    let moving = false

    const setMode = (next, text = '') => {
      if (next === mode && label.current.textContent === text) return
      mode = next
      ring.current.dataset.mode = next
      label.current.textContent = text
    }

    const loop = () => {
      pos.x += (target.x - pos.x) * 0.22
      pos.y += (target.y - pos.y) * 0.22
      ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
      if (Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.3) raf = requestAnimationFrame(loop)
      else moving = false
    }

    const move = (e) => {
      target.x = e.clientX
      target.y = e.clientY
      dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      root.dataset.cursorVisible = '1'
      if (!moving) { moving = true; raf = requestAnimationFrame(loop) }
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest(TEXT)) return setMode('text')
      const hover = el?.closest(INTERACTIVE)
      if (hover) return setMode('hover', hover.getAttribute('data-cursor') || '')
      setMode('')
    }
    const down = () => ring.current.classList.add('is-down')
    const up = () => ring.current.classList.remove('is-down')
    const leave = () => { root.dataset.cursorVisible = '0' }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      root.classList.remove('has-custom-cursor')
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.removeEventListener('pointerleave', leave)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div ref={ring} aria-hidden className="cursor-ring">
        <span ref={label} className="cursor-label" />
      </div>
      <div ref={dot} aria-hidden className="cursor-dot" />
    </>
  )
}
