import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Camera, CameraOff, CircleCheck, CircleX, Clock3, DoorOpen, Keyboard, MapPin, ScanLine, Search } from 'lucide-react'
import { Button, EmptyState, Eyebrow, PageLoader } from '../../components/ui/ui'
import { Panel } from '../../components/admin/AdminUI'
import MascotPose from '../../components/mascot/MascotPose'
import MascotFace from '../../components/mascot/MascotFace'
import ScanHistory, { PorterBoard } from '../../components/door/ScanHistory'
import { EventArt } from '../../components/events/EventCard'
import { useAuth } from '../../context/AuthContext'
import { useMascot } from '../../context/MascotContext'
import { authApi, checkinApi, eventsApi } from '../../lib/api'
import { longDate, relativeDay, time } from '../../lib/format'

const READER_ID = 'qr-reader'
const STORAGE_KEY = 'coderstick.door.event'

/** Pitido de confirmación (agudo) o rechazo (grave) con Web Audio. */
function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = ok ? [880, 1320] : [220, 180]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = ok ? 'sine' : 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.13)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.13 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.13 + 0.12)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.13)
      osc.stop(ctx.currentTime + i * 0.13 + 0.13)
    })
    navigator.vibrate?.(ok ? 80 : [120, 60, 120])
  } catch { /* sin audio */ }
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])
  return now
}

const REASON_POSE = { ok: 'feliz', already_used: 'enfadado', other_event: 'sorprendido', invalid: 'enfadado', annulled: 'triste', unavailable: 'pensando' }

function ResultOverlay({ result, onClose }) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onClose, result.allowed ? 2400 : 3600)
    return () => clearTimeout(t)
  }, [result, onClose])

  return createPortal(
    <AnimatePresence>
      {result && (
        <motion.div key={result.code + result.reason + (result.checked_in_at ?? '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
          className={`fixed inset-0 z-[85] grid place-items-center px-4 ${result.allowed ? 'bg-emerald-950/95' : 'bg-rose-950/95'}`}>
          <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }} className="text-center">
            <MascotPose pose={REASON_POSE[result.reason] ?? 'pensando'} float={false} glow={false} className="mx-auto h-40 w-40" />
            <div className={`mt-6 inline-flex items-center gap-3 ${result.allowed ? 'text-ok' : 'text-bad'}`}>
              {result.allowed ? <CircleCheck className="size-10" /> : <CircleX className="size-10" />}
              <span className="font-display text-[clamp(2.2rem,11vw,3.75rem)] font-black uppercase">{result.allowed ? 'Adelante' : 'Rechazado'}</span>
            </div>
            <p className="mt-3 text-xl font-bold text-white">{result.message}</p>
            {result.holder_name && <p className="mt-2 text-white/80">{result.holder_name} · {result.sector_name}{result.seat_number ? ` · entrada ${result.seat_number}` : ''}</p>}
            {result.first_checkin_by && <p className="mt-1 text-sm text-white/60">Primer ingreso registrado por {result.first_checkin_by}</p>}
            <p className="mt-6 font-mono text-sm text-white/60">{result.code}</p>
            <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/40">toca para continuar</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Scanner({ onCode }) {
  const [state, setState] = useState('idle')
  const scanner = useRef(null)
  const last = useRef({ code: '', at: 0 })

  const stop = useCallback(async () => {
    try { if (scanner.current?.isScanning) await scanner.current.stop() } catch { /* ya detenido */ }
    setState('idle')
  }, [])

  const start = async () => {
    setState('starting')
    try {
      scanner.current = scanner.current ?? new Html5Qrcode(READER_ID, { verbose: false })
      await scanner.current.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s } } },
        (text) => {
          const now = Date.now()
          if (text === last.current.code && now - last.current.at < 3500) return
          last.current = { code: text, at: now }
          onCode(text)
        },
        () => {},
      )
      setState('on')
    } catch {
      setState('error')
      toast.error('No se pudo abrir la cámara. Revisa los permisos o escribe el código.')
    }
  }
  useEffect(() => () => { stop() }, [stop])

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-line bg-ink-950">
      <div id={READER_ID} className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {state !== 'on' && (
        <div className="absolute inset-0 grid grid-cols-1 place-items-center bg-[radial-gradient(circle_at_center,#101a3a,#03040b_70%)]">
          <div className="text-center">
            <ScanLine className="mx-auto size-14 text-neon" strokeWidth={1.2} />
            <p className="mt-3 text-sm text-mute">{state === 'error' ? 'Cámara no disponible' : 'Apunta al QR de la entrada'}</p>
            <Button className="mt-5" icon={Camera} loading={state === 'starting'} onClick={start} cursor="Cámara">Activar cámara</Button>
          </div>
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-[15%]">
        {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl'].map((c) => (
          <span key={c} className={`absolute size-12 border-neon ${c}`} />
        ))}
        {state === 'on' && <span className="absolute inset-x-2 h-0.5 animate-scan bg-neon shadow-[0_0_14px_#22d3ee]" />}
      </div>
      {state === 'on' && (
        <button onClick={stop} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-ink-950/80 px-3 py-2 text-xs font-bold text-white" data-cursor="Apagar">
          <CameraOff className="size-4" /> Apagar
        </button>
      )}
    </div>
  )
}

function greeting(d) {
  const h = d.getHours()
  return h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

function EventPicker({ events, door, profile, onPick }) {
  const { user } = useAuth()
  const now = useClock()
  const isToday = (d) => new Date(d).toDateString() === now.toDateString()
  const [tab, setTab] = useState(() => (events.some((e) => isToday(e.starts_at)) ? 'today' : 'next'))
  const [q, setQ] = useState('')
  const upcoming = events.filter((e) => new Date(e.starts_at) >= new Date(now.getTime() - 6 * 3600_000))
  const groups = {
    today: upcoming.filter((e) => isToday(e.starts_at)),
    next: upcoming.filter((e) => !isToday(e.starts_at)),
    all: events,
  }
  const list = groups[tab].filter((e) => !q || `${e.title} ${e.venue} ${e.city}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-[5.25rem] sm:px-6 sm:pt-24 lg:pt-28">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-ink-900/70 p-4 sm:rounded-[32px] sm:p-8">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-25 mask-radial" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <MascotFace size={72} className="size-12 shrink-0 sm:size-[72px]" />
            <div>
              <Eyebrow>Control de puerta</Eyebrow>
              <h1 className="mt-2 text-[clamp(1.35rem,6vw,2.25rem)] font-black leading-tight sm:mt-3">{greeting(now)}, <span className="text-gradient">{user.name.split(' ')[0]}</span></h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute sm:text-sm">
                {profile?.position && <span className="flex items-center gap-1.5 text-soft"><DoorOpen className="size-4 text-neon" /> {profile.position}</span>}
                <span className="flex items-center gap-1.5"><Clock3 className="size-4" /> {now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} · {longDate(now)}</span>
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between rounded-2xl border border-line bg-ink-850 px-4 py-2.5 sm:block sm:w-auto sm:px-5 sm:py-4 sm:text-right">
            <p className="text-[11px] uppercase tracking-widest text-mute sm:text-xs">Eventos hoy</p>
            <p className="font-display text-xl font-bold text-white sm:text-3xl">{groups.today.length}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="grid grid-cols-3 gap-1 rounded-full border border-line bg-ink-900/70 p-1 sm:flex">
          {[['today', 'Hoy'], ['next', 'Próximos'], ['all', 'Todos']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold sm:px-4 ${tab === key ? 'bg-white/10 text-white' : 'text-mute hover:text-white'}`}>
              {label} <span className="ml-1 text-[11px] tabular-nums opacity-70">{groups[key].length}</span>
            </button>
          ))}
        </div>
        <label className="relative flex items-center sm:w-80">
          <Search className="pointer-events-none absolute left-4 size-4 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar evento…" className="h-11 w-full rounded-full border border-line bg-ink-900/70 pl-11 pr-4 text-sm text-white outline-none focus:border-neon/60" />
        </label>
      </div>

      {list.length === 0 ? (
        <EmptyState pose="durmiendo" title={tab === 'today' ? 'No hay eventos hoy' : 'No hay eventos aquí'} description="Revisa la pestaña de próximos eventos." />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
          {list.map((e, i) => {
            const sold = e.capacity - e.available
            const entered = door[e.id] ?? 0
            return (
              <motion.button key={e.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => onPick(e)} data-cursor="Abrir"
                className="group flex min-w-0 overflow-hidden rounded-2xl border border-line bg-ink-900/70 text-left transition-colors hover:border-neon/40 sm:rounded-3xl">
                <div className="relative min-h-28 w-24 shrink-0 self-stretch sm:w-32"><div className="absolute inset-0"><EventArt event={e} /></div><div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink-900/80" /></div>
                <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                  <span className={`w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isToday(e.starts_at) ? 'bg-neon text-ink-950' : 'bg-white/5 text-soft'}`}>{relativeDay(e.starts_at)} · {time(e.starts_at)}</span>
                  <p className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-white sm:mt-2 sm:text-base">{e.title}</p>
                  <p className="flex min-w-0 items-center gap-1 text-xs text-mute"><MapPin className="size-3 shrink-0" /> <span className="truncate">{e.venue}</span></p>
                  <div className="mt-auto pt-2 sm:pt-3">
                    <div className="flex justify-between gap-2 text-[11px] text-mute"><span>Ingresaron {entered}</span><span>{sold} vendidas</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-ok/80" style={{ width: `${sold ? (entered / sold) * 100 : 0}%` }} /></div>
                  </div>
                </div>
                <span className="hidden w-12 place-items-center border-l border-line text-mute transition-colors group-hover:bg-neon group-hover:text-ink-950 sm:grid"><ArrowRight className="size-4" /></span>
              </motion.button>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default function DoorControl() {
  const { say } = useMascot()
  const [events, setEvents] = useState(null)
  const [door, setDoor] = useState({})
  const [profile, setProfile] = useState(null)
  const [event, setEvent] = useState(null)
  const [stats, setStats] = useState(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('historial')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    authApi.me().then(setProfile).catch(() => {})
    checkinApi.perEvent().then(setDoor).catch(() => {})
    eventsApi.list().then((list) => {
      setEvents(list)
      const saved = (() => { try { return localStorage.getItem(STORAGE_KEY) } catch { return null } })()
      const found = list.find((e) => e.id === saved)
      if (found) setEvent(found)
    }).catch((e) => { toast.error(e.message); setEvents([]) })
  }, [])

  const refreshStats = useCallback(() => {
    if (event) checkinApi.eventStats(event.id).then(setStats).catch(() => {})
  }, [event])
  useEffect(() => { refreshStats() }, [refreshStats])
  // otros porteros también escanean: se refresca cada 15 s
  useEffect(() => {
    if (!event) return
    const t = setInterval(() => { refreshStats(); setTick((n) => n + 1) }, 15000)
    return () => clearInterval(t)
  }, [event, refreshStats])

  const pick = (e) => {
    setEvent(e)
    try { localStorage.setItem(STORAGE_KEY, e.id) } catch { /* sin almacenamiento */ }
  }
  const leave = () => {
    setEvent(null)
    setStats(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* sin almacenamiento */ }
    checkinApi.perEvent().then(setDoor).catch(() => {})
  }

  const validate = useCallback(async (raw) => {
    const value = raw.trim().toUpperCase()
    if (!value || busy) return
    setBusy(true)
    try {
      const res = await checkinApi.scan(value, event.id)
      setResult(res)
      beep(res.allowed)
      say(res.allowed ? '¡Adelante! Que lo disfrute.' : res.message, res.allowed ? 'happy' : 'angry', 2500)
      setCode('')
      refreshStats()
      setTick((n) => n + 1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }, [busy, event, say, refreshStats])

  const closeResult = useCallback(() => setResult(null), [])
  const sold = useMemo(() => (event ? event.capacity - event.available : 0), [event])

  if (!events) return <PageLoader label="cargando eventos" />
  if (!event) return <EventPicker events={events} door={door} profile={profile} onPick={pick} />

  const entered = stats?.entered ?? 0
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-[5.25rem] sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
      <ResultOverlay result={result} onClose={closeResult} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <button onClick={leave} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-mute hover:text-white" data-cursor="Cambiar"><ArrowLeft className="size-4" /> Cambiar de evento</button>
          <h1 className="break-words text-[clamp(1.6rem,6.5vw,2.25rem)] font-black leading-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-mute sm:text-base">{longDate(event.starts_at)} · {time(event.starts_at)} · {event.venue}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
          <div className="flex flex-col justify-center rounded-2xl border border-line bg-ink-900/70 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-mute">Tus escaneos</p>
            <p className="mt-1 font-mono text-lg sm:mt-0 sm:text-sm"><span className="font-bold text-ok">{stats?.mine?.allowed ?? 0}</span> <span className="text-mute">/</span> <span className="font-bold text-bad">{stats?.mine?.rejected ?? 0}</span></p>
          </div>
          <div className="min-w-0 rounded-2xl border border-ok/30 bg-ok/5 px-4 py-3 sm:min-w-44">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[10px] uppercase tracking-widest text-ok/80">Ingresaron</p>
              <p className="whitespace-nowrap font-mono text-[11px] text-mute">{sold} vendidas</p>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.p key={entered} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-2xl font-bold text-white">{entered}</motion.p>
            </AnimatePresence>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-ok" style={{ width: `${sold ? (entered / sold) * 100 : 0}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[480px] lg:max-w-none">
          <Scanner onCode={validate} />
          <form onSubmit={(e) => { e.preventDefault(); validate(code) }} className="mt-4 flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Keyboard className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código manual" aria-label="Código de la entrada"
                className="h-12 w-full min-w-0 rounded-full border border-line bg-ink-900/70 pl-11 pr-4 font-mono text-base tracking-wider text-white outline-none placeholder:font-sans placeholder:tracking-normal focus:border-neon/60 sm:h-14 sm:text-lg" />
            </label>
            <Button type="submit" size="lg" loading={busy} cursor="Validar" className="shrink-0 max-sm:h-12 max-sm:px-6">Validar</Button>
          </form>
        </div>

        <Panel title={
          <div className="flex gap-1 rounded-full bg-ink-850 p-1 text-sm">
            {[['historial', 'Historial'], ['puertas', 'Puertas y porteros']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} className={`rounded-full px-3 py-1 font-bold ${tab === key ? 'bg-white/10 text-white' : 'text-mute'}`}>{label}</button>
            ))}
          </div>
        }>
          {tab === 'historial'
            ? <ScanHistory eventId={event.id} stats={stats} refreshKey={tick} compact />
            : (
              <div className="space-y-6">
                <PorterBoard stats={stats} />
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-mute">Ingresos por sector</p>
                  <ul className="space-y-1.5 text-sm">
                    {Object.entries(stats?.by_sector ?? {}).map(([s, n]) => <li key={s} className="flex justify-between"><span className="text-soft">{s}</span><span className="font-bold text-white">{n}</span></li>)}
                    {!Object.keys(stats?.by_sector ?? {}).length && <li className="text-mute">Sin ingresos aún.</li>}
                  </ul>
                </div>
              </div>
            )}
        </Panel>
      </div>
    </main>
  )
}
