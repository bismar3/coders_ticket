import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { CountUp } from '../fx/Interactive'
import { money } from '../../lib/format'

/** Encabezado de cada módulo del panel. */
export function AdminHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-neon">{eyebrow}</p>}
        <h1 className="text-[clamp(1.5rem,6vw,2.25rem)] font-black leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute sm:mt-1.5 sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">{actions}</div>}
    </div>
  )
}

/** Tarjeta de cifra clave: sobria, un solo acento. */
export function StatCard({ icon: Icon, label, value, format, hint }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-ink-900/70 p-3.5 sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-wider text-mute sm:text-xs sm:tracking-widest">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-neon" />}
      </div>
      <p className="mt-2 break-words font-display text-lg font-bold leading-tight text-white sm:mt-3 sm:text-3xl"><CountUp value={value} format={format} /></p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-mute sm:text-xs">{hint}</p>}
    </div>
  )
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-ink-900/70 sm:rounded-3xl ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

/** Buscador con retardo (no dispara una búsqueda por cada tecla). */
export function SearchBox({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  const [text, setText] = useState(value ?? '')
  const first = useRef(true)
  useEffect(() => { setText(value ?? '') }, [value])
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className={`group relative flex items-center ${className}`}>
      <Search className="pointer-events-none absolute left-4 size-4 text-mute group-focus-within:text-neon" />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
        className="h-11 w-full rounded-full border border-line bg-ink-900/70 pl-11 pr-10 text-sm text-white outline-none placeholder:text-mute/60 focus:border-neon/60" />
      {text && <button onClick={() => setText('')} className="absolute right-3 grid grid-cols-1 size-6 place-items-center rounded-full text-mute hover:text-white" aria-label="Limpiar"><X className="size-3.5" /></button>}
    </label>
  )
}

export function Select({ value, onChange, children, className = '', ...rest }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`h-11 appearance-none rounded-full border border-line bg-ink-900/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238b95b7%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pl-4 pr-9 text-sm text-white outline-none focus:border-neon/60 ${className}`} {...rest}>
      {children}
    </select>
  )
}

/** Pestañas tipo segmento con contador. */
export function Tabs({ value, onChange, items }) {
  return (
    <div className="flex w-full flex-wrap gap-1 rounded-2xl border border-line bg-ink-900/70 p-1 sm:w-auto sm:rounded-full">
      {items.map(({ key, label, count }) => {
        const on = value === key
        return (
          <button key={key} onClick={() => onChange(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${on ? 'bg-white/10 text-white' : 'text-mute hover:text-white'}`}>
            {label}
            {count !== undefined && <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-neon text-ink-950' : 'bg-white/5 text-mute'}`}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Pagination({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (total <= size) return null
  const from = (page - 1) * size + 1
  const to = Math.min(total, page * size)
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-mute">
      <span className="text-xs sm:text-sm">{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line hover:text-white disabled:opacity-30" aria-label="Anterior"><ChevronLeft className="size-4" /></button>
        <span className="px-3 font-mono text-xs">{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="grid grid-cols-1 size-9 place-items-center rounded-full border border-line hover:text-white disabled:opacity-30" aria-label="Siguiente"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  )
}

/** Tabla base del panel. */
export function Table({ head, children, empty }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-ink-900/70">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-[11px] uppercase tracking-wider text-mute">
          <tr>{head.map((h, i) => <th key={i} className={`px-4 py-3 font-bold ${h.className ?? ''}`}>{h.label ?? h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  )
}

/**
 * Ingresos por día (una sola serie): línea de 2px, área tenue, rejilla discreta,
 * cruz y tooltip al pasar el mouse. Sin leyenda: el título nombra la serie.
 */
export function RevenueChart({ data }) {
  const [hover, setHover] = useState(null)
  const box = useRef(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const W = width
  const H = width < 480 ? 190 : 220
  const P = { l: 44, r: 10, t: 12, b: 26 }
  const every = width < 420 ? 4 : width < 560 ? 3 : 2
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const nice = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / nice) * nice
  const x = (i) => P.l + (i / Math.max(1, data.length - 1)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - v / top) * (H - P.t - P.b)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const ticks = [0, 0.5, 1].map((f) => top * f)
  const label = (iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Ingresos de los últimos 14 días">
        <defs>
          <linearGradient id="rev-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.22" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgba(140,160,255,0.1)" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="fill-mute text-[11px]">{t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : t}</text>
          </g>
        ))}
        {data.map((d, i) => ((data.length - 1 - i) % every === 0) && (
          <text key={d.day} x={x(i)} y={H - 8} textAnchor={i === data.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} className="fill-mute text-[11px]">{label(d.day)}</text>
        ))}
        <path d={area} fill="url(#rev-area)" />
        <path d={line} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={y(0)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].revenue)} r="5" fill="#22d3ee" stroke="#070a16" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-xl border border-line bg-ink-850 px-3 py-2 text-xs shadow-xl"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? '-105%' : '5%'})` }}>
          <p className="font-mono text-mute">{label(data[hover].day)}</p>
          <p className="font-bold text-white">{money(data[hover].revenue)}</p>
          <p className="text-mute">{data[hover].tickets} entradas</p>
        </div>
      )}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-white/5 text-soft',
    ok: 'border-ok/30 bg-ok/10 text-ok',
    bad: 'border-bad/30 bg-bad/10 text-bad',
    warn: 'border-warn/30 bg-warn/10 text-warn',
    neon: 'border-neon/30 bg-neon/10 text-neon',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}
