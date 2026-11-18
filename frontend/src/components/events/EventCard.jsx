import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowRight, MapPin } from 'lucide-react'
import { Tilt } from '../fx/Interactive'
import { categoryMeta, iconFor, useCategories } from '../../lib/categories'
import { compactMoney, dateParts, relativeDay, time } from '../../lib/format'

/** Imagen del evento con respaldo sobrio si no hay foto (o falla al cargar). */
export function EventArt({ event, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (event.image_url && !failed) {
    return <img src={event.image_url} alt="" onError={() => setFailed(true)} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />
  }
  const Icon = iconFor(event.icon) // el respaldo usa el ícono de la categoría si viene
  return (
    <div className={`relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#16204a,#070a16_70%)] ${className}`}>
      <div className="absolute inset-0 bg-grid opacity-50" />
      <Icon className="relative size-14 text-neon/70" strokeWidth={1.3} />
    </div>
  )
}

export function availabilityOf(event) {
  const capacity = event.capacity || 1
  const sold = capacity - event.available
  return { ratio: sold / capacity, soldOut: event.available <= 0, low: event.available > 0 && event.available / capacity < 0.12 }
}

/**
 * Tarjeta de evento responsiva:
 * - Celular: fila compacta (foto a la izquierda, datos a la derecha) para ver varios eventos por pantalla.
 * - Tablet y PC: tarjeta vertical con foto, cupos y precio.
 */
export default function EventCard({ event, index = 0, preview = false }) {
  const categories = useCategories()
  const cat = categoryMeta(event.category, categories)
  const { day, month } = dateParts(event.starts_at)
  const { ratio, soldOut, low } = availabilityOf(event)
  const Wrapper = preview ? 'div' : Link

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.045, ease: [0.16, 1, 0.3, 1] }}
      className="min-w-0"
    >
      <Tilt max={6} glare={false} className="group rounded-2xl sm:rounded-[28px]">
        <Wrapper
          {...(preview ? {} : { to: `/eventos/${event.id}`, 'data-cursor': soldOut ? 'Agotado' : 'Ver' })}
          className="relative flex overflow-hidden rounded-2xl border border-line bg-ink-850 transition-colors duration-300 group-hover:border-neon/40 sm:block sm:rounded-[28px]"
        >
          <div className="relative min-h-28 w-[34%] min-w-24 max-w-40 shrink-0 self-stretch overflow-hidden sm:aspect-[16/10] sm:min-h-0 sm:w-auto sm:max-w-none">
            <div className="absolute inset-0"><EventArt event={{ ...event, icon: categories.find((c) => c.slug === event.category)?.icon }} className="transition-transform duration-700 ease-out group-hover:scale-105" /></div>
            <div className="absolute inset-0 hidden bg-gradient-to-t from-ink-850 via-ink-850/10 to-transparent sm:block" />

            <div className="absolute left-2 top-2 flex flex-col items-center rounded-xl border border-white/10 bg-ink-950/80 px-2 py-1 sm:left-4 sm:top-4 sm:rounded-2xl sm:px-3 sm:py-2">
              <span className="font-display text-sm font-bold leading-none text-white sm:text-xl">{day}</span>
              <span className="mt-0.5 text-[10px] font-bold tracking-wider text-soft sm:mt-1 sm:tracking-widest">{month}</span>
            </div>
            <span className="absolute right-4 top-4 hidden items-center gap-1.5 rounded-full border border-white/10 bg-ink-950/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white sm:inline-flex">
              <cat.icon className="size-3.5 text-neon" /> {cat.name}
            </span>
            {soldOut && (
              <div className="absolute inset-0 grid place-items-center bg-ink-950/65">
                <span className="-rotate-12 rounded-lg border-2 border-bad px-2 py-0.5 font-display text-[11px] font-black uppercase tracking-widest text-bad sm:rounded-xl sm:px-5 sm:py-2 sm:text-2xl">Agotado</span>
              </div>
            )}
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col p-3 sm:block sm:p-5 sm:pt-3">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neon sm:gap-2 sm:text-[11px] sm:tracking-widest">
              <span className="shrink-0">{relativeDay(event.starts_at)}</span>
              <span className="text-mute">·</span>
              <span className="shrink-0 text-mute">{time(event.starts_at)} h</span>
              <span className="truncate text-mute max-[359px]:hidden sm:hidden">· {cat.name}</span>
            </div>
            <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-white sm:mt-2 sm:text-lg">{event.title || 'Tu evento'}</h3>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-mute sm:mt-1.5 sm:text-sm">
              <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{event.venue || 'Lugar'} · {event.city || 'Ciudad'}</span>
            </p>

            <div className="mt-4 hidden h-1 overflow-hidden rounded-full bg-white/5 sm:block">
              <div className="h-full rounded-full bg-gradient-to-r from-neon to-volt" style={{ width: `${Math.max(3, ratio * 100)}%` }} />
            </div>

            <div className="mt-auto flex items-end justify-between gap-2 pt-2 sm:mt-4 sm:pt-0">
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-mute sm:text-[11px]">Desde</span>
                <p className="font-display text-base font-bold leading-tight text-white sm:text-xl">{compactMoney(event.min_price)}</p>
              </div>
              {soldOut ? (
                <span className="shrink-0 rounded-full bg-bad/10 px-2.5 py-1 text-[11px] font-bold text-bad sm:hidden">Agotado</span>
              ) : low ? (
                <span className="shrink-0 rounded-full bg-warn/10 px-2.5 py-1 text-[11px] font-bold text-warn sm:px-3 sm:text-xs">¡Últimos cupos!</span>
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-white transition-[background-color,color,border-color,transform] duration-300 group-hover:-rotate-45 group-hover:border-neon group-hover:bg-neon group-hover:text-ink-950 sm:size-10">
                  <ArrowRight className="size-4" />
                </span>
              )}
            </div>
          </div>
        </Wrapper>
      </Tilt>
    </motion.div>
  )
}
