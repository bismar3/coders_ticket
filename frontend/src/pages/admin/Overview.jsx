import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ArrowRight, CalendarRange, Plus, ScanLine, ShoppingBag, Ticket, Users, Wallet } from 'lucide-react'
import { AdminHeader, Badge, Panel, RevenueChart, StatCard } from '../../components/admin/AdminUI'
import { Button, PageLoader, StatusBadge } from '../../components/ui/ui'
import { EventArt } from '../../components/events/EventCard'
import { useAuth } from '../../context/AuthContext'
import { checkinApi, eventsApi, ordersApi } from '../../lib/api'
import { dateTime, money, shortDate } from '../../lib/format'

export default function Overview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    Promise.all([
      ordersApi.organizerStats(),
      eventsApi.mine({ when: 'upcoming', sort: 'date_asc', size: 5 }),
      ordersApi.sales({ size: 6 }),
      checkinApi.perEvent().catch(() => ({})),
    ]).then(([stats, upcoming, sales, door]) => setData({ stats, upcoming, sales, door }))
      .catch((e) => toast.error(e.message))
  }, [])

  if (!data) return <PageLoader label="cargando el resumen" />
  const { stats, upcoming, sales, door } = data
  const entered = Object.values(door).reduce((a, b) => a + b, 0)
  const top = stats.events.slice(0, 5)
  const maxRevenue = Math.max(1, ...top.map((e) => e.revenue))
  const last14 = stats.daily.reduce((a, d) => a + d.revenue, 0)

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Resumen"
        title={<>Hola, <span className="text-gradient">{user.name.split(' ')[0]}</span></>}
        subtitle="Así van tus eventos hoy."
        actions={<Button to="/organizador/eventos/nuevo" icon={Plus}>Nuevo evento</Button>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Ingresos" value={stats.total_revenue} format={(n) => money(n)} hint={`${money(last14)} en los últimos 14 días`} />
        <StatCard icon={Ticket} label="Entradas vendidas" value={stats.total_tickets} hint={`${stats.total_orders} compras pagadas`} />
        <StatCard icon={Users} label="Clientes" value={stats.unique_customers} hint={`${stats.orders_pending} pagos pendientes`} />
        <StatCard icon={ScanLine} label="Ingresos en puerta" value={entered} hint={`${stats.orders_rejected} pagos rechazados`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Ingresos · últimos 14 días">
          <RevenueChart data={stats.daily} />
        </Panel>
        <Panel title="Eventos con más ingresos" action={<Link to="/organizador/ventas" className="text-xs font-bold text-neon hover:underline">Ver ventas</Link>}>
          {top.length === 0 ? <p className="text-sm text-mute">Todavía no hay ventas.</p> : (
            <ul className="space-y-4">
              {top.map((e) => (
                <li key={e.event_id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold text-white">{e.event_title}</span>
                    <span className="shrink-0 font-mono text-xs text-soft">{money(e.revenue)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-neon" style={{ width: `${(e.revenue / maxRevenue) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-mute">{e.tickets_sold} entradas · {e.orders_paid} compras</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Próximos eventos" action={<Link to="/organizador/eventos" className="text-xs font-bold text-neon hover:underline">Ver todos</Link>}>
          {upcoming.items.length === 0 ? <p className="text-sm text-mute">No tienes eventos próximos.</p> : (
            <ul className="divide-y divide-line">
              {upcoming.items.map((e) => {
                const sold = e.capacity - e.available
                return (
                  <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="size-12 shrink-0 overflow-hidden rounded-xl"><EventArt event={e} /></div>
                    <div className="min-w-0 flex-1">
                      <Link to={`/organizador/eventos/${e.id}`} className="block truncate text-sm font-bold text-white hover:text-neon">{e.title}</Link>
                      <p className="text-xs text-mute">{shortDate(e.starts_at)} · {e.city}</p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-neon/80" style={{ width: `${(sold / e.capacity) * 100}%` }} /></div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={e.status} />
                      <p className="mt-1 font-mono text-[11px] text-mute">{sold}/{e.capacity}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Últimas ventas" action={<Link to="/organizador/ventas" className="flex items-center gap-1 text-xs font-bold text-neon hover:underline">Todas <ArrowRight className="size-3" /></Link>}>
          {sales.items.length === 0 ? <p className="text-sm text-mute">Aún no hay ventas.</p> : (
            <ul className="divide-y divide-line">
              {sales.items.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid grid-cols-1 size-10 shrink-0 place-items-center rounded-xl border border-line bg-ink-850"><ShoppingBag className="size-4 text-neon" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{s.customer_name}</p>
                    <p className="truncate text-xs text-mute">{s.event_title} · {s.quantity} × {s.sector_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{money(s.total)}</p>
                    <p className="text-[11px] text-mute">{dateTime(s.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { to: '/organizador/categorias', icon: CalendarRange, title: 'Categorías', text: 'Crea y ordena los tipos de evento.' },
          { to: '/organizador/personal', icon: Users, title: 'Personal', text: 'Porteros y administradores.' },
          { to: '/organizador/accesos', icon: ScanLine, title: 'Reportes de acceso', text: 'Asistencia por evento, categoría y puerta.' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="group flex items-center gap-4 rounded-3xl border border-line bg-ink-900/70 p-5 transition-colors hover:border-neon/40">
            <a.icon className="size-5 text-neon" />
            <span className="flex-1"><span className="block font-bold text-white">{a.title}</span><span className="text-sm text-mute">{a.text}</span></span>
            <ArrowRight className="size-4 text-mute transition-transform group-hover:translate-x-1 group-hover:text-neon" />
          </Link>
        ))}
      </div>
      <p className="text-center text-xs text-mute"><Badge tone="neon">Tip</Badge> Toca tu nombre en la barra lateral para editar tu perfil o cambiar tu contraseña.</p>
    </div>
  )
}
