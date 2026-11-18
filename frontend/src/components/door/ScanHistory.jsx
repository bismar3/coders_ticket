import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, CircleCheck, CircleX, CopyX, DoorOpen, HelpCircle, ShieldAlert } from 'lucide-react'
import { SearchBox, Select } from '../admin/AdminUI'
import { checkinApi } from '../../lib/api'
import { time } from '../../lib/format'

export const REASONS = {
  ok: { label: 'Ingresó', icon: CircleCheck, tone: 'text-ok' },
  already_used: { label: 'Ya utilizada', icon: CopyX, tone: 'text-warn' },
  invalid: { label: 'Código inválido', icon: HelpCircle, tone: 'text-bad' },
  other_event: { label: 'Otro evento', icon: ShieldAlert, tone: 'text-bad' },
  annulled: { label: 'Anulada', icon: Ban, tone: 'text-bad' },
}

const FILTERS = [
  { key: 'all', label: 'Todos', params: {} },
  { key: 'ok', label: 'Ingresaron', params: { result: 'allowed' }, countKey: 'ok' },
  { key: 'rejected', label: 'Rechazados', params: { result: 'rejected' } },
  { key: 'already_used', label: 'Ya usadas', params: { reason: 'already_used' }, countKey: 'already_used' },
  { key: 'invalid', label: 'Inválidas', params: { reason: 'invalid' }, countKey: 'invalid' },
  { key: 'other_event', label: 'Otro evento', params: { reason: 'other_event' }, countKey: 'other_event' },
]

/** Historial de escaneos agrupable por motivo y portero (varias puertas, varios porteros). */
export default function ScanHistory({ eventId, stats, refreshKey = 0, compact = false }) {
  const [filter, setFilter] = useState('all')
  const [porter, setPorter] = useState('')
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const size = compact ? 8 : 15

  const fetchPage = useCallback((p) => {
    const f = FILTERS.find((x) => x.key === filter)
    return checkinApi.attempts(eventId, { ...f.params, porter_id: porter, q, page: p, size })
  }, [eventId, filter, porter, q, size])

  useEffect(() => {
    let alive = true
    fetchPage(1).then((res) => { if (alive) { setItems(res.items); setTotal(res.total); setPage(1) } }).catch(() => {})
    return () => { alive = false }
  }, [fetchPage, refreshKey])

  const more = () => fetchPage(page + 1).then((res) => { setItems((list) => [...list, ...res.items]); setPage(page + 1) })
  const byReason = stats?.by_reason ?? {}
  const countFor = (f) => (f.key === 'all' ? Object.values(byReason).reduce((a, b) => a + b, 0)
    : f.key === 'rejected' ? (stats?.rejected ?? 0) : byReason[f.countKey] ?? 0)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${filter === f.key ? 'border-neon/40 bg-neon/10 text-white' : 'border-line text-mute hover:text-white'}`}>
            {f.label} <span className="text-[11px] tabular-nums opacity-70">{countFor(f)}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <SearchBox className="flex-1" value={q} onChange={setQ} placeholder="Buscar código o titular…" />
        <Select value={porter} onChange={setPorter}>
          <option value="">Todos los porteros</option>
          {(stats?.by_porter ?? []).map((p) => <option key={p.porter_id} value={p.porter_id}>{p.porter_name}</option>)}
        </Select>
      </div>

      <ul className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((a) => {
            const r = REASONS[a.reason] ?? REASONS.invalid
            return (
              <motion.li key={a.id} layout="position" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border border-line bg-ink-850/70 px-3 py-2.5">
                <r.icon className={`size-5 shrink-0 ${r.tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{a.holder_name || 'Sin titular'} <span className="font-mono text-[11px] font-normal text-mute">{a.ticket_code}</span></p>
                  <p className="truncate text-xs text-mute">{r.label}{a.reason === 'already_used' ? ` · ${a.message.replace('Entrada ya utilizada ', '')}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-[11px] text-soft"><DoorOpen className="size-3" /> {a.porter_name}</p>
                  <p className="font-mono text-[11px] text-mute">{time(a.created_at)}</p>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
        {items.length === 0 && <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-mute">Sin escaneos con estos filtros.</li>}
      </ul>
      {items.length < total && (
        <button onClick={more} className="mt-3 w-full rounded-full border border-line py-2 text-sm font-bold text-soft hover:text-white">Ver más ({total - items.length})</button>
      )}
    </div>
  )
}

/** Resumen por portero / puerta. */
export function PorterBoard({ stats }) {
  const list = stats?.by_porter ?? []
  if (!list.length) return <p className="text-sm text-mute">Aún no hay escaneos.</p>
  const max = Math.max(1, ...list.map((p) => p.allowed + p.rejected))
  return (
    <ul className="space-y-3">
      {list.map((p) => (
        <li key={p.porter_id}>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold text-white"><DoorOpen className="size-4 text-neon" /> {p.porter_name}</span>
            <span className="font-mono text-xs text-mute"><span className="text-ok">{p.allowed}</span> · <span className="text-bad">{p.rejected}</span></span>
          </div>
          <div className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-ok/80" style={{ width: `${(p.allowed / max) * 100}%` }} />
            <div className="h-full bg-bad/70" style={{ width: `${(p.rejected / max) * 100}%` }} />
          </div>
        </li>
      ))}
      <li className="flex gap-4 pt-1 text-[11px] text-mute"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" /> Ingresaron</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-bad" /> Rechazados</span></li>
    </ul>
  )
}
