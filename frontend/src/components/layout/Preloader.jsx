import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import MascotFace from '../mascot/MascotFace'
import { Wordmark } from '../brand/Brand'

const LINES = ['> iniciando coders_tick', '> preparando la cartelera', '> listo']
const KEY = 'coderstick.booted'

/** Pantalla de arranque estilo terminal (solo la primera vez en la sesión). */
export default function Preloader() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem(KEY) } catch { return false }
  })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!show) return
    const timers = LINES.map((_, i) => setTimeout(() => setStep(i + 1), 260 + i * 330))
    timers.push(setTimeout(() => {
      setShow(false)
      try { sessionStorage.setItem(KEY, '1') } catch { /* sin almacenamiento */ }
    }, 260 + LINES.length * 330 + 350))
    return () => timers.forEach(clearTimeout)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[200] grid grid-cols-1 place-items-center bg-ink-950"
        >
          <div className="flex flex-col items-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
              <MascotFace size={120} mood={step >= LINES.length ? 'happy' : 'idle'} />
            </motion.div>
            <div className="mt-8 h-28 w-72 font-mono text-sm">
              {LINES.slice(0, step).map((line, i) => (
                <motion.p key={line} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={i === LINES.length - 1 ? 'text-ok' : 'text-neon/80'}>
                  {line}{i === step - 1 && <span className="animate-blink">_</span>}
                </motion.p>
              ))}
            </div>
            <Wordmark className="mt-2 text-2xl" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
