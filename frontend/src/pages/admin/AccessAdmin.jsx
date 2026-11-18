import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  CalendarDays, ChevronDown, Clock3, CopyX, DoorOpen, Download, HelpCircle, Layers, MapPin, Percent, RefreshCw, ShieldX, Ticket, Users,
} from 'lucide-react'
import { AdminHeader, Panel, SearchBox, Select, StatCard, Tabs } from '../../components/admin/AdminUI'
import ScanHistory, { REASONS } from '../../components/door/ScanHistory'
import { EventArt } from '../../components/events/EventCard'
import { Button, EmptyState, PageLoader } from '../../components/ui/ui'
import { categoryMeta, useCategories } from '../../lib/categories'
import { authApi, checkinApi, eventsApi } from '../../lib/api'
import { dateTime, shortDate, time } from '../../lib/format'

const REJECT_KEYS = ['already_used', 'invalid', 'other_event', 'annulled']
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()

function periodOf(e, now) {
  if (e.status === 'cancelado') return 'past'
  if (sameDay(e.starts_at, now)) return 'today'
  return new Date(e.starts_at) > now ? 'upcoming' : 'past'
}

const STATUS = {
  today: { label: 'Hoy', className: 'border-neon/40 bg-neon/15 text-neon' },
  upcoming: { label: 'Próximo', className: 'border-line bg-white/5 text-soft' },
  past: { label: 'Finalizado', className: 'border-line bg-white/5 text-mute' },
  cancelled: { label: 'Cancelado', className: 'border-bad/30 bg-bad/10 text-bad' },
}

/** Barra de proporción con el porcentaje (asistencia). */
function Meter({ value, total, className = '' }) {
  const p = pct(value, total)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-neon" style={{ width: `${Math.min(100, p)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs text-white">{p}%</span>
    </div>
  )
}

/** Ingresos por hora del día (una serie): barras finas, la hora pico se anota con texto. */
function HourChart({ hours }) {
  const entries = Object.entries(hours).map(([h, n]) => [Number(h), n])
  if (!entries.length) return <p className="py-8 text-center text-sm text-mute">Todavía no hay ingresos registrados.</p>
  const first = Math.max(0, Math.min(...entries.map(([h]) => h)) - 1)
  const last = Math.min(23, Math.max(...entries.map(([h]) => h)) + 1)
  const span = []
  for (let h = first; h <= last; h++) span.push(h)
  while (span.length < 8 && (span[0] > 0 || span.at(-1) < 23)) {
    if (span.at(-1) < 23) span.push(span.at(-1) + 1)
    if (span.length < 8 && span[0] > 0) span.unshift(span[0] - 1)
  }
  const max = Math.max(...entries.map(([, n]) => n))
  const [peakHour, peak] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  const hh = (h) => `${String(h).padStart(2, '0')}:00`
  return (
    <div>
      <p className="text-sm text-mute">Hora pico: <span className="font-bold text-white">{hh(peakHour)} – {hh((peakHour + 1) % 24)}</span> · {peak} {peak === 1 ? 'ingreso' : 'ingresos'}</p>
      <div className="mt-4 flex h-40 items-end gap-[2px] border-b border-line" role="img" aria-label={`Ingresos por hora. Hora pico ${hh(peakHour)} con ${peak}.`}>
        {span.map((h) => {
          const n = hours[h] ?? 0
          return (
            <div key={h} className="group relative flex h-full min-w-0 flex-1 items-end">
              <div className="w-full rounded-t-[4px] bg-neon/80 transition-colors group-hover:bg-neon" style={{ height: n ? `${Math.max(4, (n / max) * 100)}%` : '0%' }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-ink-850 px-2 py-1 text-[11px] text-white shadow-xl group-hover:block">
                {hh(h)} · <b>{n}</b>
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-center font-mono text-[10px] text-mute">
        {span.map((h, i) => <span key={h} className="min-w-0 flex-1">{i % (span.length > 14 ? 3 : 2) === 0 ? String(h).padStart(2, '0') : ''}</span>)}
      </div>
    </div>
  )
}

/** Lista con barra horizontal (categorías, motivos, sectores…). */
function BarList({ items, empty = 'Sin datos todavía.' }) {
  if (!items.length) return <p className="text-sm text-mute">{empty}</p>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-3">
      {items.map(({ key, label, icon: Icon, tone = 'text-neon', value, hint, bar = 'bg-neon/80' }) => (
        <li key={key}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold text-white">
              {Icon && <Icon className={`size-4 shrink-0 ${tone}`} />}<span className="truncate">{label}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-soft">{value}{hint && <span className="text-mute"> · {hint}</span>}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function PorterList({ porters }) {
  if (!porters.length) return <p className="text-sm text-mute">Aún no hay escaneos.</p>
  const max = Math.max(1, ...porters.map((p) => p.allowed + p.rejected))
  return (
    <ul className="space-y-3">
      {porters.map((p) => (
        <li key={p.porter_id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-white">{p.porter_name}</span>
              <span className="flex items-center gap-1 text-[11px] text-mute"><DoorOpen className="size-3" /> {p.position || 'Puerta sin asignar'} · {p.events} {p.events === 1 ? 'evento' : 'eventos'}</span>
            </span>
            <span className="shrink-0 font-mono text-xs"><span className="text-ok">{p.allowed}</span> <span className="text-mute">/</span> <span className="text-bad">{p.rejected}</span></span>
          </div>
          <div className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-ok/80" style={{ width: `${(p.allowed / max) * 100}%` }} />
            <div className="h-full bg-bad/70" style={{ width: `${(p.rejected / max) * 100}%` }} />
          </div>
        </li>
      ))}
      <li className="flex gap-4 pt-1 text-[11px] text-mute">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" /> Ingresaron</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-bad" /> Rechazados</span>
      </li>
    </ul>
  )
}

/** Detalle desplegable de un evento: sectores, puertas, motivos e historial completo. */
function EventDetail({ row, positions }) {
  const sectors = Object.entries(row.by_sector).sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ key: s, label: s, value: n }))
  const reasons = REJECT_KEYS.filter((k) => row.by_reason[k]).map((k) => ({
    key: k, label: REASONS[k].label, icon: REASONS[k].icon, tone: REASONS[k].tone, value: row.by_reason[k], bar: 'bg-bad/60',
  }))
  const porters = row.by_porter.map((p) => ({ ...p, position: positions[p.porter_id], events: 1 })).sort((a, b) => b.allowed + b.rejected - (a.allowed + a.rejected))
  return (
    <div className="space-y-4 border-t border-line bg-ink-950/40 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-line bg-ink-900/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-mute">Ingresos por sector</p>
          <BarList items={sectors} empty="Nadie ingresó todavía." />
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-ink-900/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-mute">Puertas y porteros</p>
          <PorterList porters={porters} />
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-ink-900/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-mute">Motivos de rechazo</p>
          <BarList items={reasons} empty="Sin rechazos. 👌" />
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-ink-900/60 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-mute">Historial de escaneos</p>
        <ScanHistory eventId={row.event.id} stats={{ by_reason: row.by_reason, rejected: row.rejected, by_porter: row.by_porter }} />
      </div>
    </div>
  )
}

function EventRow({ row, open, onToggle, positions }) {
  const { event: e } = row
  const status = e.status === 'cancelado' ? STATUS.cancelled : STATUS[row.period]
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
      <button onClick={onToggle} aria-expanded={open}
        className="grid w-full grid-cols-1 items-center gap-3 p-3 text-left transition-colors hover:bg-white/[0.03] sm:p-4 lg:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,0.7fr))_minmax(0,1.3fr)_minmax(0,0.9fr)_24px] lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-xl"><EventArt event={e} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span>
              <span className="truncate text-xs text-mute">{shortDate(e.starts_at)} · {time(e.starts_at)}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 font-bold leading-snug text-white lg:line-clamp-1">{e.title}</p>
            <p className="flex min-w-0 items-center gap-1 text-xs text-mute"><MapPin className="size-3 shrink-0" /><span className="truncate">{e.venue}, {e.city}</span></p>
          </div>
        </div>
        {/* cifras: en celular en una fila de 4; en PC como columnas de tabla */}
        <div className="grid grid-cols-4 gap-2 text-center lg:contents lg:text-right">
          <div><p className="text-[10px] uppercase tracking-wider text-mute lg:hidden">Vendidas</p><p className="font-mono text-sm text-soft">{row.sold}</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-mute lg:hidden">Ingresaron</p><p className="font-mono text-sm font-bold text-white">{row.entered}</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-mute lg:hidden">Rechazos</p><p className={`font-mono text-sm ${row.rejected ? 'text-bad' : 'text-mute'}`}>{row.rejected}</p></div>
          <div className="lg:hidden"><p className="text-[10px] uppercase tracking-wider text-mute">Asistencia</p><p className="font-mono text-sm text-white">{pct(row.entered, row.sold)}%</p></div>
        </div>
        <Meter value={row.entered} total={row.sold} className="hidden lg:flex" />
        <p className="hidden text-right text-xs text-mute lg:block">{row.last_at ? dateTime(row.last_at) : '—'}</p>
        <ChevronDown className={`hidden size-4 text-mute transition-transform lg:block ${open ? 'rotate-180 text-neon' : ''}`} />
        <p className="flex items-center justify-center gap-1 text-xs font-bold text-neon lg:hidden">{open ? 'Ocultar detalle' : 'Ver detalle'} <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></p>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <EventDetail row={row} positions={positions} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function CategoryGroup({ group, openId, setOpenId, positions }) {
  const [all, setAll] = useState(false)
  const shown = all ? group.rows : group.rows.slice(0, 5)
  const Icon = group.meta.icon
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">
          <span className="grid size-8 place-items-center rounded-xl border border-neon/25 bg-neon/5 text-neon"><Icon className="size-4" /></span>
          {group.meta.name}
        </h3>
        <p className="text-xs text-mute">
          {group.rows.length} {group.rows.length === 1 ? 'evento' : 'eventos'} · {group.entered} de {group.sold} ingresaron · <span className="text-white">{pct(group.entered, group.sold)}% asistencia</span>
          {group.rejected > 0 && <> · <span className="text-bad">{group.rejected} rechazos</span></>}
        </p>
      </header>
      <ul className="space-y-2">
        {shown.map((row) => (
          <EventRow key={row.event.id} row={row} positions={positions} open={openId === row.event.id} onToggle={() => setOpenId(openId === row.event.id ? null : row.event.id)} />
        ))}
      </ul>
      {group.rows.length > 5 && (
        <button onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-bold text-neon hover:underline">
          {all ? 'Mostrar menos' : `Ver los ${group.rows.length - 5} eventos restantes`}
        </button>
      )}
    </section>
  )
}

function exportCsv(rows, categories) {
  const head = ['Categoría', 'Evento', 'Fecha', 'Hora', 'Lugar', 'Ciudad', 'Vendidas', 'Ingresaron', 'Asistencia %', 'Rechazos', 'Ya utilizadas', 'Código inválido', 'Otro evento', 'Anuladas', 'Último escaneo']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((r) => [
    categoryMeta(r.event.category, categories).name, r.event.title, shortDate(r.event.starts_at), time(r.event.starts_at), r.event.venue, r.event.city,
    r.sold, r.entered, pct(r.entered, r.sold), r.rejected,
    r.by_reason.already_used ?? 0, r.by_reason.invalid ?? 0, r.by_reason.other_event ?? 0, r.by_reason.annulled ?? 0,
    r.last_at ? dateTime(r.last_at) : '',
  ].map(esc).join(';'))
  // BOM + ";" para que Excel en español lo abra con columnas y acentos correctos
  const blob = new Blob(['﻿' + [head.map(esc).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `reporte-accesos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Reportes de acceso del organizador: solo lectura (escanear es tarea del portero). */
export default function AccessAdmin() {
  const categories = useCategories()
  const [events, setEvents] = useState(null)
  const [report, setReport] = useState({})
  const [positions, setPositions] = useState({})
  const [period, setPeriod] = useState('all')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('date')
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    return Promise.all([eventsApi.mineAll(), checkinApi.report()])
      .then(([list, rep]) => {
        setEvents(list.filter((e) => e.status !== 'borrador'))
        setReport(Object.fromEntries(rep.events.map((r) => [r.event_id, r])))
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    authApi.staff({ role: 'portero' }).then((res) => setPositions(Object.fromEntries(res.items.map((u) => [u.id, u.position])))).catch(() => {})
    const t = setInterval(load, 30000) // en día de evento, los números se actualizan solos
    return () => clearInterval(t)
  }, [load])

  const now = useMemo(() => new Date(), [events]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => (events ?? []).map((e) => {
    const r = report[e.id] ?? { entered: 0, attempts: 0, rejected: 0, by_reason: {}, by_sector: {}, by_porter: [], by_hour: {}, last_at: null }
    return { ...r, event: e, sold: e.capacity - e.available, period: periodOf(e, now) }
  }), [events, report, now])

  const counts = useMemo(() => ({
    all: rows.length,
    today: rows.filter((r) => r.period === 'today').length,
    upcoming: rows.filter((r) => r.period === 'upcoming').length,
    past: rows.filter((r) => r.period === 'past').length,
  }), [rows])

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    const list = rows.filter((r) => (period === 'all' || r.period === period)
      && (!category || r.event.category === category)
      && (!text || `${r.event.title} ${r.event.venue} ${r.event.city}`.toLowerCase().includes(text)))
    const by = {
      date: (a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at),
      entered: (a, b) => b.entered - a.entered,
      attendance: (a, b) => pct(b.entered, b.sold) - pct(a.entered, a.sold),
      rejected: (a, b) => b.rejected - a.rejected,
    }[sort]
    return [...list].sort(by)
  }, [rows, period, category, q, sort])

  const summary = useMemo(() => {
    const sum = (f) => filtered.reduce((a, r) => a + f(r), 0)
    const reasons = Object.fromEntries(REJECT_KEYS.map((k) => [k, sum((r) => r.by_reason[k] ?? 0)]))
    const hours = {}
    const porters = {}
    for (const r of filtered) {
      for (const [h, n] of Object.entries(r.by_hour)) hours[h] = (hours[h] ?? 0) + n
      for (const p of r.by_porter) {
        const acc = porters[p.porter_id] ?? { porter_id: p.porter_id, porter_name: p.porter_name, position: positions[p.porter_id], allowed: 0, rejected: 0, events: 0 }
        acc.allowed += p.allowed; acc.rejected += p.rejected; acc.events += 1
        porters[p.porter_id] = acc
      }
    }
    const groups = new Map()
    for (const r of filtered) {
      const g = groups.get(r.event.category) ?? { slug: r.event.category, meta: categoryMeta(r.event.category, categories), rows: [], sold: 0, entered: 0, rejected: 0 }
      g.rows.push(r); g.sold += r.sold; g.entered += r.entered; g.rejected += r.rejected
      groups.set(r.event.category, g)
    }
    return {
      sold: sum((r) => r.sold), entered: sum((r) => r.entered), rejected: sum((r) => r.rejected), reasons, hours,
      porters: Object.values(porters).sort((a, b) => b.allowed + b.rejected - (a.allowed + a.rejected)),
      groups: [...groups.values()].sort((a, b) => b.entered - a.entered || b.sold - a.sold),
    }
  }, [filtered, categories, positions])

  if (!events) return <PageLoader label="preparando reportes" />

  const usedCategories = [...new Set(rows.map((r) => r.event.category))]
  const reasonItems = REJECT_KEYS.map((k) => ({ key: k, label: REASONS[k].label, icon: REASONS[k].icon, tone: REASONS[k].tone, value: summary.reasons[k], bar: 'bg-bad/60' })).filter((i) => i.value)
  const categoryItems = summary.groups.map((g) => ({ key: g.slug, label: g.meta.name, icon: g.meta.icon, value: g.entered, hint: `${pct(g.entered, g.sold)}% de ${g.sold}` }))

  return (
    <div className="space-y-5">
      <AdminHeader eyebrow="Operación" title="Reportes de acceso"
        subtitle="Cómo ingresó la gente a tus eventos: por categoría, evento, puerta y portero."
        actions={<>
          <Button variant="ghost" icon={RefreshCw} loading={loading} onClick={load}>Actualizar</Button>
          <Button variant="ghost" icon={Download} onClick={() => exportCsv(filtered, categories)} disabled={!filtered.length}>Exportar Excel</Button>
        </>} />

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-ink-900/50 p-3 sm:rounded-3xl">
        <Tabs value={period} onChange={setPeriod} items={[
          { key: 'all', label: 'Todos', count: counts.all },
          { key: 'today', label: 'Hoy', count: counts.today },
          { key: 'upcoming', label: 'Próximos', count: counts.upcoming },
          { key: 'past', label: 'Finalizados', count: counts.past },
        ]} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <SearchBox className="sm:col-span-2 lg:col-span-1" value={q} onChange={setQ} placeholder="Buscar evento o lugar…" />
          <Select value={category} onChange={setCategory}>
            <option value="">Todas las categorías</option>
            {usedCategories.map((slug) => <option key={slug} value={slug}>{categoryMeta(slug, categories).name}</option>)}
          </Select>
          <Select value={sort} onChange={setSort}>
            <option value="date">Ordenar por fecha</option>
            <option value="entered">Más ingresos</option>
            <option value="attendance">Mayor asistencia</option>
            <option value="rejected">Más rechazos</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState pose="durmiendo" title="No hay eventos con esos filtros" description="Prueba con otro periodo o categoría." />
      ) : (
        <>
          {/* Cifras clave del filtro actual */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={CalendarDays} label="Eventos" value={filtered.length} hint={`${summary.groups.length} ${summary.groups.length === 1 ? 'categoría' : 'categorías'}`} />
            <StatCard icon={Ticket} label="Vendidas" value={summary.sold} hint="entradas emitidas" />
            <StatCard icon={Users} label="Ingresaron" value={summary.entered} hint="personas en puerta" />
            <StatCard icon={Percent} label="Asistencia" value={pct(summary.entered, summary.sold)} format={(n) => `${Math.round(n)}%`} hint="ingresos / vendidas" />
            <StatCard icon={CopyX} label="Reintentos" value={summary.reasons.already_used} hint="entradas ya usadas" />
            <StatCard icon={ShieldX} label="Inválidas" value={summary.reasons.invalid + summary.reasons.other_event + summary.reasons.annulled} hint="falsas, de otro evento o anuladas" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title={<span className="flex items-center gap-2"><Layers className="size-4 text-neon" /> Asistencia por categoría</span>}>
              <BarList items={categoryItems} />
            </Panel>
            <Panel title={<span className="flex items-center gap-2"><HelpCircle className="size-4 text-neon" /> Rechazos por motivo</span>}>
              <BarList items={reasonItems} empty="Sin rechazos en este periodo. 👌" />
            </Panel>
            <Panel title={<span className="flex items-center gap-2"><Clock3 className="size-4 text-neon" /> Ingresos por hora</span>}>
              <HourChart hours={summary.hours} />
            </Panel>
            <Panel title={<span className="flex items-center gap-2"><DoorOpen className="size-4 text-neon" /> Puertas y porteros</span>}>
              <PorterList porters={summary.porters} />
            </Panel>
          </div>

          {/* Detalle por evento, agrupado por categoría */}
          <Panel title="Detalle por evento" action={<span className="text-xs text-mute">Toca un evento para ver sectores, puertas e historial</span>}>
            <div className="mb-3 hidden grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,0.7fr))_minmax(0,1.3fr)_minmax(0,0.9fr)_24px] gap-4 px-4 text-right text-[11px] font-bold uppercase tracking-wider text-mute lg:grid">
              <span className="text-left">Evento</span><span>Vendidas</span><span>Ingresaron</span><span>Rechazos</span><span className="text-left">Asistencia</span><span>Último escaneo</span><span />
            </div>
            <div className="space-y-7">
              {summary.groups.map((g) => <CategoryGroup key={g.slug} group={g} openId={openId} setOpenId={setOpenId} positions={positions} />)}
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
