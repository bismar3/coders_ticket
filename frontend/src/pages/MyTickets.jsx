import { useEffect, useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'motion/react'
import { Ticket } from 'lucide-react'
import TicketCard from '../components/tickets/TicketCard'
import { Button, EmptyState, Eyebrow, Page, Skeleton } from '../components/ui/ui'
import { SplitWords } from '../components/fx/Interactive'
import { ticketsApi } from '../lib/api'
import { longDate } from '../lib/format'

export default function MyTickets() {
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('upcoming')

  useEffect(() => { ticketsApi.mine().then(setTickets).catch((e) => setError(e.message)) }, [])

  const groups = useMemo(() => {
    if (!tickets) return []
    const now = new Date()
    const list = tickets.filter((t) => (tab === 'upcoming' ? new Date(t.starts_at) >= now : new Date(t.starts_at) < now))
    const byEvent = new Map()
    for (const t of list) {
      if (!byEvent.has(t.event_id)) byEvent.set(t.event_id, { event: t, tickets: [] })
      byEvent.get(t.event_id).tickets.push(t)
    }
    return [...byEvent.values()]
  }, [tickets, tab])

  return (
    <Page>
      <Eyebrow>Tu billetera</Eyebrow>
      <h1 className="mt-5 text-[clamp(2.1rem,9vw,3.75rem)] font-black leading-tight"><SplitWords text="Mis" /><span className="text-gradient"><SplitWords text="entradas" delay={0.1} /></span></h1>

      <LayoutGroup>
        <div className="mt-8 inline-flex rounded-full border border-line bg-ink-900/60 p-1">
          {[['upcoming', 'Próximas'], ['past', 'Pasadas']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className="relative rounded-full px-5 py-2 text-sm font-bold" data-cursor="Ver">
              {tab === key && <motion.span layoutId="tickets-tab" className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,#22d3ee,#3b82f6,#8b5cf6)]" />}
              <span className={`relative ${tab === key ? 'text-ink-950' : 'text-soft'}`}>{label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      {error && <EmptyState pose="enfadado" title="No pudimos cargar tus entradas" description={error} />}
      {!tickets && !error && (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[430px] rounded-[28px]" />)}</div>
      )}
      {tickets && groups.length === 0 && (
        <EmptyState
          pose={tab === 'upcoming' ? 'durmiendo' : 'espalda'}
          title={tab === 'upcoming' ? 'Aún no tienes entradas' : 'Sin eventos pasados'}
          description={tab === 'upcoming' ? 'Cuando compres, tus entradas con QR aparecerán aquí.' : 'Aquí verás los eventos a los que ya fuiste.'}
          action={tab === 'upcoming' && <Button to="/cartelera" icon={Ticket}>Buscar eventos</Button>}
        />
      )}

      <div className="mt-10 space-y-14">
        {groups.map(({ event, tickets: list }) => (
          <section key={event.event_id}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <h2 className="text-2xl font-bold">{event.event_title}</h2>
              <span className="text-sm text-mute">{longDate(event.starts_at)} · {list.length} {list.length === 1 ? 'entrada' : 'entradas'}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t, i) => <TicketCard key={t.code} ticket={t} index={i} used={tab === 'past'} />)}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}
