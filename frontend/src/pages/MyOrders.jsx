import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, CreditCard, QrCode } from 'lucide-react'
import { EventArt } from '../components/events/EventCard'
import { Button, EmptyState, Eyebrow, Page, Skeleton, StatusBadge } from '../components/ui/ui'
import { SplitWords } from '../components/fx/Interactive'
import { ordersApi } from '../lib/api'
import { dateTime, money, shortDate } from '../lib/format'

export default function MyOrders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { ordersApi.mine().then(setOrders).catch((e) => setError(e.message)) }, [])

  const paid = orders?.filter((o) => o.status === 'pagada') ?? []
  const spent = paid.reduce((sum, o) => sum + o.total, 0)

  return (
    <Page>
      <Eyebrow>Historial</Eyebrow>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-[clamp(2.1rem,9vw,3.75rem)] font-black leading-tight"><SplitWords text="Mis" /><span className="text-gradient"><SplitWords text="compras" delay={0.1} /></span></h1>
        {orders && orders.length > 0 && (
          <div className="flex gap-8 rounded-3xl border border-line bg-ink-900/60 px-6 py-4">
            <div><p className="text-xs uppercase tracking-widest text-mute">Compras</p><p className="font-display text-2xl font-bold text-white">{paid.length}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-mute">Invertido</p><p className="font-display text-2xl font-bold text-white">{money(spent)}</p></div>
          </div>
        )}
      </div>

      {error && <EmptyState pose="enfadado" title="No pudimos cargar tus compras" description={error} />}
      {!orders && !error && <div className="mt-10 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {orders?.length === 0 && <EmptyState pose="pensando" title="Todavía no compraste nada" description="Tu historial aparecerá aquí." action={<Button to="/cartelera">Explorar la cartelera</Button>} />}

      <ol className="relative mt-10 space-y-3">
        {orders?.map((o, i) => (
          <motion.li key={o.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/compra/${o.id}`} data-cursor="Abrir" className="group flex items-center gap-4 rounded-3xl border border-line bg-ink-900/60 p-3 pr-5 transition-all hover:-translate-y-0.5 hover:border-neon/40 hover:bg-ink-850">
              <div className="size-16 shrink-0 overflow-hidden rounded-2xl sm:size-20">
                <EventArt event={{ category: 'otro', image_url: o.event_image_url }} className="transition-transform duration-700 group-hover:scale-110" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-bold leading-snug text-white sm:line-clamp-1">{o.event_title || 'Evento'}</p>
                <p className="text-sm text-mute sm:truncate">{o.starts_at && shortDate(o.starts_at)} · {o.sector_name} · {o.quantity} {o.quantity === 1 ? 'entrada' : 'entradas'}</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-mute">
                  {o.payment_method === 'libelula' ? <QrCode className="size-3" /> : <CreditCard className="size-3" />}
                  {o.payment_method === 'libelula' ? 'Pago con QR' : 'Tarjeta (demo)'} · {dateTime(o.created_at)}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-display text-lg font-bold text-white">{money(o.total)}</p>
                <StatusBadge status={o.status} className="mt-1" />
              </div>
              <ArrowUpRight className="size-5 text-mute transition-all group-hover:rotate-45 group-hover:text-neon" />
            </Link>
          </motion.li>
        ))}
      </ol>
    </Page>
  )
}
