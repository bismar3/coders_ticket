import { AnimatePresence, motion } from 'motion/react'
import { POSES } from '../../lib/mascot'

// Estas poses vienen recortadas en el borde superior del PNG original: se suaviza el corte con una máscara.
const CLIPPED_TOP = new Set(['saludando', 'conLentes', 'saltando', 'pensando', 'corriendo'])
const FADE_TOP = { maskImage: 'linear-gradient(to bottom, transparent 0%, black 16%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16%)' }

/** Una pose de la mascota con flotación suave y halo de neón; cambia de pose con una transición. */
export default function MascotPose({ pose = 'frontal', className = '', float = true, glow = true, alt = 'Mascota de CODERS', ...rest }) {
  return (
    <div className={`relative ${className}`} {...rest}>
      {glow && <div aria-hidden className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.28),rgba(59,130,246,0.1)_40%,transparent_68%)]" />}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={pose}
          src={POSES[pose] ?? POSES.frontal}
          alt={alt}
          draggable={false}
          initial={{ opacity: 0, scale: 0.88, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -8 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          style={CLIPPED_TOP.has(pose) ? FADE_TOP : undefined}
          className={`relative h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)] ${float ? 'animate-float' : ''}`}
        />
      </AnimatePresence>
    </div>
  )
}
