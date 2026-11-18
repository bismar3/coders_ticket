import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import MascotFace from './MascotFace'
import { useMascot } from '../../context/MascotContext'
import { useAuth } from '../../context/AuthContext'

const GREETINGS = {
  '/': '¡Hola! Soy el coder de CODERS. ¿Listo para tu próximo evento?',
  '/cartelera': 'Filtra por tipo de evento o busca por nombre 🔎',
  '/mis-entradas': 'Toca una entrada para darle la vuelta y ver tu QR.',
  '/organizador': 'Aquí ves tus ventas en tiempo real 📈',
  '/puerta': 'Escanea el QR o escribe el código. ¡Yo te aviso si pasa!',
  '/login': '¿Nos conocemos? Inicia sesión y seguimos.',
  '/registro': '¡Bienvenido al equipo! Solo te tomará un minuto.',
}

const TIPS = [
  'Cada entrada tiene un QR único y solo sirve una vez.',
  'Puedes comprar hasta 6 entradas por compra.',
  'Pagas con QR desde la app de tu banco, en segundos.',
  'Toca tu nombre arriba para ver tu perfil.',
  'Hecho con </> por el equipo CODERS.',
]

/** Mascota flotante: saluda en cada sección, reacciona a lo que pasa y se duerme si no haces nada. */
export default function MascotAssistant() {
  const { mood, message, key, say } = useMascot()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [sleepy, setSleepy] = useState(false)
  const [hidden, setHidden] = useState(false)
  const tip = useRef(0)

  useEffect(() => {
    const base = '/' + (pathname.split('/')[1] || '')
    const greet = GREETINGS[base]
    if (!greet) return
    const t = setTimeout(() => say(base === '/' && user ? `¡Qué bueno verte, ${user.name.split(' ')[0]}!` : greet, 'happy', 3800), 900)
    return () => clearTimeout(t)
  }, [pathname, user, say])

  useEffect(() => {
    let timer
    const wake = () => {
      setSleepy(false)
      clearTimeout(timer)
      timer = setTimeout(() => setSleepy(true), 25000)
    }
    wake()
    window.addEventListener('pointermove', wake, { passive: true })
    window.addEventListener('keydown', wake)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} data-cursor="Hola" className="fixed bottom-4 right-4 z-50 rounded-full glass p-1.5" aria-label="Mostrar mascota">
        <MascotFace size={28} />
      </button>
    )
  }

  const currentMood = sleepy ? 'sleepy' : mood

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence mode="wait">
        {(message || sleepy) && (
          <motion.div
            key={sleepy ? 'zzz' : key}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative mb-6 hidden max-w-64 rounded-2xl rounded-br-sm glass px-4 py-3 text-sm text-white shadow-2xl sm:block"
          >
            {sleepy ? <span className="font-mono text-neon">z z z…</span> : message}
            <button onClick={() => setHidden(true)} className="absolute -right-2 -top-2 grid grid-cols-1 size-5 place-items-center rounded-full bg-ink-700 text-[10px] text-mute hover:text-white" aria-label="Ocultar mascota">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        data-cursor="Tip"
        aria-label="Mascota de CODERS"
        onClick={() => say(TIPS[tip.current++ % TIPS.length], 'wink')}
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.92 }}
        animate={currentMood === 'happy' ? { y: [0, -14, 0] } : { y: [0, -5, 0] }}
        transition={currentMood === 'happy' ? { duration: 0.6 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative grid grid-cols-1 size-12 place-items-center rounded-full border border-neon/30 bg-ink-900/80 shadow-[0_0_30px_-10px_rgba(34,211,238,0.6)] sm:size-20"
      >
        <MascotFace mood={currentMood} size={58} className="size-10 sm:size-[58px]" />
      </motion.button>
    </div>
  )
}
