import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AdminHeader, Pagination, SearchBox, Select, Table, Tabs } from '../../components/admin/AdminUI'
import { Skeleton, StatusBadge } from '../../components/ui/ui'
import { eventsApi, ordersApi } from '../../lib/api'
import { dateTime, money } from '../../lib/format'

export default function SalesAdmin() {
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [data, setData] = useState(null)
  const filters = { event_id: params.get('event') ?? '', status: params.get('status') ?? '', q: params.get('q') ?? '', page: Number(params.get('page') ?? 1) }
  const set = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => { eventsApi.mineAll().then(setEvents).catch(() => {}) }, [])
  useEffect(() => {
    setData(null)
    ordersApi.sales({ ...filters, size: 15 }).then(setData).catch((e) => toast.error(e.message))
  }, [params.toString()]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <AdminHeader eyebrow="Gestión" title="Ventas" subtitle="Todas las compras de tus eventos, con su estado de pago." />

      <div className="flex flex-col gap-2 rounded-3xl border border-line bg-ink-900/50 p-3 lg:flex-row">
        <SearchBox className="flex-1" value={filters.q} onChange={(v) => set('q', v)} placeholder="Buscar cliente o evento…" />
        <Select value={filters.event_id} onChange={(v) => set('event', v)} className="lg:max-w-xs">
          <option value="">Todos los eventos</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filters.status} onChange={(v) => set('status', v)} items={[
          { key: '', label: 'Todas' }, { key: 'pagada', label: 'Pagadas' }, { key: 'pendiente', label: 'Pendientes' },
          { key: 'rechazada', label: 'Rechazadas' }, { key: 'cancelada', label: 'Canceladas' },
        ]} />
        {data && <p className="text-sm text-mute">{data.total} compras · <b className="text-white">{money(data.revenue)}</b> cobrados</p>}
      </div>

      {!data ? <Skeleton className="h-96" /> : (
        <>
          {/* celular: tarjetas */}
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:hidden">
            {data.items.map((s) => (
              <li key={s.id} className="rounded-2xl border border-line bg-ink-900/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{s.customer_name}</p>
                    <p className="truncate text-xs text-mute">{s.customer_email}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-3 truncate text-sm text-soft">{s.event_title}</p>
                <div className="mt-2 flex items-end justify-between gap-3 text-xs text-mute">
                  <span>{s.quantity} × {s.sector_name} · {dateTime(s.created_at)}</span>
                  <span className="font-display text-base font-bold text-white">{money(s.total)}</span>
                </div>
                {s.failure_reason && <p className="mt-2 text-[11px] text-mute">{s.failure_reason}</p>}
              </li>
            ))}
            {data.items.length === 0 && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mute">No hay ventas con estos filtros.</li>}
          </ul>
          <div className="hidden xl:block">
          <Table head={['Cliente', 'Evento', 'Sector', { label: 'Cant.', className: 'text-right' }, { label: 'Total', className: 'text-right' }, 'Estado', 'Fecha']}
            empty={data.items.length === 0 && <p className="p-8 text-center text-sm text-mute">No hay ventas con estos filtros.</p>}>
            {data.items.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3"><p className="font-semibold text-white">{s.customer_name}</p><p className="text-xs text-mute">{s.customer_email}</p></td>
                <td className="max-w-56 truncate px-4 py-3 text-soft">{s.event_title}</td>
                <td className="px-4 py-3 text-soft">{s.sector_name}</td>
                <td className="px-4 py-3 text-right font-mono">{s.quantity}</td>
                <td className="px-4 py-3 text-right font-bold text-white">{money(s.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} />{s.failure_reason && <p className="mt-1 max-w-40 truncate text-[11px] text-mute" title={s.failure_reason}>{s.failure_reason}</p>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-mute">{dateTime(s.created_at)}</td>
              </tr>
            ))}
          </Table>
          </div>
          <Pagination page={data.page} size={data.size} total={data.total} onPage={(p) => set('page', String(p))} />
        </>
      )}
    </div>
  )
}
