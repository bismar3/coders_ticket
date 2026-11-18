import { useState } from 'react'
import { motion } from 'motion/react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Download, MapPin, RefreshCw } from 'lucide-react'
import { EventArt } from '../events/EventCard'
import { ticketsApi } from '../../lib/api'
import { dateParts, time } from '../../lib/format'

/**
 * Entrada digital que se voltea en 3D: al frente los datos del evento, atrás el QR para la puerta.
 */
export default function TicketCard({ ticket, index = 0, used = false }) {
  const [flipped, setFlipped] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const { day, month, weekday } = dateParts(ticket.starts_at)

  const download = async (e) => {
    e.stopPropagation()
    setDownloading(true)
    try {
      await ticketsApi.downloadPdf(ticket.code)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDownloading(false)
    }
  }

  const face = 'absolute inset-0 overflow-hidden rounded-[28px] border border-line [backface-visibility:hidden]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="h-[430px] [perspective:1400px]"
    >
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`Entrada ${ticket.code}. Toca para ${flipped ? 'ver detalles' : 'ver el QR'}`}
        data-cursor={flipped ? 'Detalles' : 'Ver QR'}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped((f) => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        whileHover={{ y: -6 }}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        {/* Frente */}
        <div className={`${face} bg-ink-850`}>
          <div className="relative h-44 overflow-hidden">
            <EventArt event={{ ...ticket, category: ticket.category ?? 'otro', image_url: ticket.event_image_url }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-850 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-ink-950/70 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-neon backdrop-blur">
              {ticket.seat_number} / {ticket.seats_in_order}
            </span>
            {used && <span className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-soft backdrop-blur">Pasado</span>}
          </div>
          <div className="p-5 pt-2">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug">{ticket.event_title}</h3>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-mute"><MapPin className="size-3.5" /> {ticket.venue}, {ticket.city}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div><p className="text-mute">FECHA</p><p className="font-bold text-white">{day} {month}</p></div>
              <div><p className="text-mute">HORA</p><p className="font-bold text-white">{time(ticket.starts_at)}</p></div>
              <div><p className="text-mute">SECTOR</p><p className="truncate font-bold text-white">{ticket.sector_name}</p></div>
            </div>
            <div className="relative my-4 border-t border-dashed border-line">
              <span className="absolute -left-8 -top-3 size-6 rounded-full bg-ink-950" />
              <span className="absolute -right-8 -top-3 size-6 rounded-full bg-ink-950" />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neon">{ticket.code}</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-soft"><RefreshCw className="size-3" /> Ver QR</span>
            </div>
            <p className="mt-1 text-[11px] capitalize text-mute">{weekday} · {ticket.holder_name}</p>
          </div>
        </div>

        {/* Reverso */}
        <div className={`${face} flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_30%,#16204a,#070a16_70%)] p-6 [transform:rotateY(180deg)]`}>
          <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-neon">PRESENTA EN PUERTA</span>
          <div className="relative rounded-3xl bg-white p-4 shadow-[0_0_60px_-10px_rgba(34,211,238,0.8)]">
            <QRCodeSVG value={ticket.code} size={190} fgColor="#070a16" level="M" />
            <span aria-hidden className="absolute inset-x-3 h-0.5 animate-scan bg-neon shadow-[0_0_14px_#22d3ee]" />
          </div>
          <p className="font-mono text-base font-bold tracking-wider text-white">{ticket.code}</p>
          <button onClick={download} data-cursor="PDF" className="inline-flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-4 py-2 text-sm font-bold text-neon transition hover:bg-neon/20">
            <Download className={`size-4 ${downloading ? 'animate-bounce' : ''}`} /> Descargar PDF
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
