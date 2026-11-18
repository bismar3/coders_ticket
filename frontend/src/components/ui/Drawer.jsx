import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

/** Panel lateral deslizante (perfil, formularios del panel de administración…). */
export default function Drawer({ open, onClose, title, subtitle, children, width = 'max-w-md', footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={onClose} className="absolute inset-0 bg-ink-950/70" />
          <motion.aside
            role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col border-l border-line bg-ink-900 shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.7)]`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 className="font-display text-lg font-bold text-white">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-mute">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line text-mute transition hover:text-white" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            </header>
            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">{children}</div>
            {footer && <footer className="border-t border-line px-4 py-3 sm:px-6 sm:py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
