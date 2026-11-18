import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CreditCard, Mail, QrCode, Ticket } from 'lucide-react'
import MascotPose from '../mascot/MascotPose'

const STEPS = [
  { icon: Ticket, label: 'Reservando tus cupos' },
  { icon: CreditCard, label: 'Procesando el pago' },
  { icon: QrCode, label: 'Generando tus entradas' },
  { icon: Mail, label: 'Enviando confirmación' },
]

/** Pantalla mientras orders coordina a los demás servicios. */
export default function ProcessingOverlay({ open, method }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!open) return setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), method === 'libelula' ? 900 : 650)
    return () => clearInterval(t)
  }, [open, method])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid grid-cols-1 place-items-center bg-ink-950/90 px-4">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-[32px] glass p-8 text-center">
            <MascotPose pose={step < 2 ? 'trabajando' : 'programando'} className="mx-auto h-40 w-40" />
            <h3 className="mt-4 text-xl font-bold">Procesando tu compra</h3>
            <p className="mt-1 text-sm text-mute">Esto toma solo unos segundos…</p>
            <ol className="mt-6 space-y-2 text-left">
              {STEPS.map((s, i) => {
                const done = i < step
                const current = i === step
                return (
                  <motion.li key={s.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= step ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${current ? 'border-neon/40 bg-neon/5' : 'border-line'}`}>
                    <span className={`grid size-8 place-items-center rounded-xl ${done ? 'bg-ok/20 text-ok' : current ? 'bg-neon/15 text-neon' : 'bg-white/5 text-mute'}`}>
                      {done ? <Check className="size-4" /> : <s.icon className={`size-4 ${current ? 'animate-pulse' : ''}`} />}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-white">{s.label}</span>
                  </motion.li>
                )
              })}
            </ol>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
