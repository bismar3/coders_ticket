import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { LayoutGrid, MapPin, Search, X } from 'lucide-react'
import EventCard from '../components/events/EventCard'
import { Button, EmptyState, Eyebrow, Page, Skeleton } from '../components/ui/ui'
import { SplitWords } from '../components/fx/Interactive'
import { iconFor, useCategories } from '../lib/categories'
import { eventsApi } from '../lib/api'

export default function Events() {
  const [params, setParams] = useSearchParams()
  const categories = useCategories()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const active = params.get('category') ?? ''
  const city = params.get('city') ?? ''

  useEffect(() => {
    eventsApi.list().then(setEvents).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  // búsqueda con pequeño retardo para no filtrar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      query ? next.set('q', query) : next.delete('q')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next, { replace: true })
  }

  const cities = useMemo(() => [...new Set(events.map((e) => e.city))].sort(), [events])
  const q = (params.get('q') ?? '').toLowerCase()
  const filtered = events.filter(
    (e) =>
      (!active || e.category === active) &&
      (!city || e.city === city) &&
      (!q || `${e.title} ${e.subtitle} ${e.venue} ${e.city}`.toLowerCase().includes(q)),
  )
  const chips = [{ slug: '', name: 'Todo', Icon: LayoutGrid }, ...categories.map((c) => ({ slug: c.slug, name: c.name, Icon: iconFor(c.icon) }))]

  return (
    <Page>
      <header className="relative">
        <Eyebrow>Cartelera</Eyebrow>
        <h1 className="mt-3 text-[clamp(1.9rem,8vw,3.75rem)] font-black leading-[1.04] sm:mt-5">
          <SplitWords text="Encuentra tu" />
          <span className="text-gradient"><SplitWords text="próximo plan" delay={0.15} /></span>
        </h1>

        <div className="mt-5 flex flex-col gap-2.5 sm:mt-10 sm:gap-4 lg:flex-row lg:items-center">
          <label className="group relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-4 size-5 text-mute transition-colors group-focus-within:text-neon sm:left-5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca eventos o lugares…"
              className="h-12 w-full rounded-full border border-line bg-ink-900/70 pl-12 pr-11 text-white outline-none transition-all placeholder:text-mute/60 focus:border-neon/60 focus:shadow-[0_0_0_5px_rgba(34,211,238,0.1)] sm:h-14 sm:pl-14 sm:pr-12"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 grid grid-cols-1 size-7 place-items-center rounded-full bg-white/5 text-mute hover:text-white" aria-label="Limpiar búsqueda">
                <X className="size-4" />
              </button>
            )}
          </label>
          <label className="relative flex w-full items-center lg:w-auto">
            <MapPin className="pointer-events-none absolute left-4 size-4 text-mute sm:left-5" />
            <select
              value={city}
              onChange={(e) => setParam('city', e.target.value)}
              className="h-12 w-full appearance-none rounded-full border border-line bg-ink-900/70 pl-11 pr-10 text-white outline-none focus:border-neon/60 sm:h-14 sm:pl-12 lg:w-auto"
            >
              <option value="">Todas las ciudades</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <LayoutGroup>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-6">
            {chips.map(({ slug, name, Icon }) => {
              const on = active === slug
              return (
                <button
                  key={slug || 'all'}
                  onClick={() => setParam('category', slug)}
                  data-cursor="Filtrar"
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${on ? 'text-ink-950' : 'text-soft hover:text-white'}`}
                >
                  {on && <motion.span layoutId="chip" className="absolute inset-0 rounded-full bg-neon" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  {!on && <span className="absolute inset-0 rounded-full border border-line bg-ink-900/60" />}
                  <Icon className="relative size-4" />
                  <span className="relative">{name}</span>
                </button>
              )
            })}
          </div>
        </LayoutGroup>
      </header>

      <div className="mt-4 flex items-center justify-between text-sm text-mute">
        <span>{loading ? 'Buscando eventos…' : `${filtered.length} ${filtered.length === 1 ? 'evento' : 'eventos'}`}</span>
        {(active || city || q) && (
          <button onClick={() => { setQuery(''); setParams({}, { replace: true }) }} className="text-neon hover:underline">Limpiar filtros</button>
        )}
      </div>

      {error ? (
        <EmptyState pose="enfadado" title="No pudimos cargar la cartelera" description={error} action={<Button onClick={() => window.location.reload()}>Reintentar</Button>} />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl sm:h-[400px] sm:rounded-[28px]" />)
            : (
              <AnimatePresence mode="popLayout">
                {filtered.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
              </AnimatePresence>
            )}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState pose="durmiendo" title="Nada por aquí… todavía" description="No hay eventos con esos filtros. Prueba otra categoría o ciudad." />
      )}
    </Page>
  )
}
