import { EventArt } from '../events/EventCard'

/**
 * Muro de carteles inclinado: columnas con las imágenes de los eventos que se desplazan sin fin.
 * Solo anima `transform` (barato para la GPU); con "reducir movimiento" queda quieto.
 */
export default function PosterWall({ events, columns = 3, className = '' }) {
  const posters = events.length ? events : Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, image_url: '' }))
  const cols = Array.from({ length: columns }, (_, c) => {
    const list = posters.filter((_, i) => i % columns === c)
    const filled = list.length ? list : posters
    while (filled.length < 4) filled.push(...filled)
    return filled
  })
  const speeds = [46, 62, 54, 70]

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -inset-[20%] flex rotate-[-10deg] gap-4">
        {cols.map((list, c) => (
          <div key={c} className="relative flex-1 overflow-hidden">
            <div className="poster-col flex flex-col gap-4" style={{ animationDuration: `${speeds[c % speeds.length]}s`, animationDirection: c % 2 ? 'reverse' : 'normal' }}>
              {[...list, ...list].map((e, i) => (
                <div key={`${e.id}-${i}`} className="aspect-[3/4] w-full shrink-0 overflow-hidden rounded-2xl border border-white/5">
                  <EventArt event={e} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(3,4,11,0.55),rgba(3,4,11,0.92)_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/80" />
    </div>
  )
}
