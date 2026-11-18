import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Clock, CreditCard, MapPin, Minus, Plus, QrCode, ShieldCheck, Ticket, User } from 'lucide-react'
import { EventArt } from '../components/events/EventCard'
import ProcessingOverlay from '../components/events/ProcessingOverlay'
import { CountUp, Magnetic } from '../components/fx/Interactive'
import { Button, EmptyState, Field, PageLoader } from '../components/ui/ui'
import MascotPose from '../components/mascot/MascotPose'
import { useAuth } from '../context/AuthContext'
import { useMascot } from '../context/MascotContext'
import { categoryMeta, useCategories } from '../lib/categories'

// Un solo acento de marca para todos los eventos (sin "carnaval" de colores)
const BRAND = { from: '#22d3ee', to: '#3b82f6' }
import { eventsApi, ordersApi } from '../lib/api'
import { longDate, money, time } from '../lib/format'

const MAX_PER_ORDER = 6

// Pago real con QR + tarjeta de prueba (simulador: si termina en 0000 se rechaza) para demostrar
// los casos de error en clase. La tarjeta de prueba se puede ocultar con VITE_DEMO_PAYMENTS=false.
const DEMO_PAYMENTS = import.meta.env.VITE_DEMO_PAYMENTS !== 'false'
const PAYMENT_METHODS = [
  { key: 'libelula', title: 'Pago con QR', text: 'Escanéalo con la app de tu banco', icon: QrCode },
  ...(DEMO_PAYMENTS ? [{ key: 'simulado', title: 'Tarjeta (demo)', text: 'Pago simulado para pruebas', icon: CreditCard }] : []),
]

function SectorOption({ sector, selected, onSelect, accent }) {
  const soldOut = sector.available <= 0
  const ratio = sector.capacity ? sector.sold / sector.capacity : 0
  return (
    <motion.button
      type="button"
      disabled={soldOut}
      onClick={onSelect}
      whileHover={soldOut ? {} : { scale: 1.015 }}
      whileTap={soldOut ? {} : { scale: 0.985 }}
      data-cursor={soldOut ? 'Agotado' : 'Elegir'}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-colors ${selected ? 'border-transparent' : 'border-line hover:border-white/20'} ${soldOut ? 'opacity-45' : ''}`}
    >
      {selected && <motion.span layoutId="sector-ring" className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: accent.from, boxShadow: `0 0 30px -8px ${accent.from}` }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">{sector.name}</p>
          <p className="text-xs text-mute">{soldOut ? 'Agotado' : sector.available < 20 ? `¡Solo quedan ${sector.available}!` : `${sector.available.toLocaleString('es-BO')} disponibles`}</p>
        </div>
        <p className="shrink-0 whitespace-nowrap font-display text-base font-bold text-white min-[360px]:text-lg">{money(sector.price)}</p>
      </div>
      <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, ratio * 100)}%`, background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }} />
      </div>
    </motion.button>
  )
}

function formatCard(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

/** Portada con parallax: la imagen se desplaza más lento que el contenido. */
function EventHero({ event, onBack }) {
  const categories = useCategories()
  const c = { ...categoryMeta(event.category, categories), ...BRAND }
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2])
  return (
    <section ref={heroRef} className="relative h-[58svh] min-h-[400px] overflow-hidden sm:h-[72vh] sm:min-h-[520px]">
      <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0">
        <EventArt event={event} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/20" />
      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8 sm:px-6 sm:pb-14 lg:px-8">
        <button onClick={onBack} data-cursor="Volver" className="mb-auto mt-[4.5rem] inline-flex w-fit items-center gap-2 rounded-full glass px-3.5 py-1.5 text-sm font-semibold text-white hover:border-white/30 sm:mt-28 sm:px-4 sm:py-2">
          <ArrowLeft className="size-4" /> Volver
        </button>
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ink-950 sm:px-3.5 sm:py-1.5 sm:text-xs" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
          <c.icon className="size-4" /> {c.name}
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="mt-3 max-w-4xl break-words text-[clamp(1.7rem,7vw,4.5rem)] font-black leading-[1.05] sm:mt-5">
          {event.title}
        </motion.h1>
        {event.subtitle && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-2 max-w-2xl text-[15px] text-soft sm:mt-4 sm:text-lg">{event.subtitle}</motion.p>}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-4 flex flex-wrap gap-2 text-xs sm:mt-7 sm:gap-3 sm:text-sm">
          {[
            [CalendarDays, longDate(event.starts_at)],
            [Clock, `${time(event.starts_at)} h`],
            [MapPin, `${event.venue}, ${event.city}`],
          ].map(([Icon, text]) => (
            <span key={text} className="inline-flex max-w-full items-center gap-2 rounded-full glass px-3 py-1.5 font-semibold text-white sm:px-4 sm:py-2">
              <Icon className="size-4 shrink-0" style={{ color: c.from }} /> <span className="truncate">{text}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { say } = useMascot()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)
  const [sectorId, setSectorId] = useState(null)
  const [qty, setQty] = useState(1)
  const [method, setMethod] = useState('libelula')
  const [card, setCard] = useState('')
  const [processing, setProcessing] = useState(false)
  const buyRef = useRef(null)
  const [buyVisible, setBuyVisible] = useState(false)

  // En celular: barra fija "Comprar" mientras el panel de compra no está en pantalla
  useEffect(() => {
    if (!buyRef.current) return
    const io = new IntersectionObserver(([entry]) => setBuyVisible(entry.isIntersecting), { rootMargin: '0px 0px -15% 0px' })
    io.observe(buyRef.current)
    return () => io.disconnect()
  }, [event])

  const load = () => eventsApi.get(id).then((e) => {
    setEvent(e)
    setSectorId((current) => current ?? e.sectors.find((s) => s.available > 0)?.id ?? null)
  }).catch((e) => setError(e))

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <EmptyState className="pt-32" pose="triste" title="No encontramos este evento" description={error.message} action={<Button to="/cartelera" icon={ArrowLeft}>Volver a la cartelera</Button>} />
  if (!event) return <PageLoader label="cargando evento" />

  const c = BRAND
  const sector = event.sectors.find((s) => s.id === sectorId)
  const maxQty = Math.min(MAX_PER_ORDER, sector?.available ?? 0)
  const total = (sector?.price ?? 0) * qty
  const isPast = new Date(event.starts_at) < new Date()
  const canBuy = event.status === 'publicado' && !isPast && sector && sector.available > 0

  const buy = async () => {
    if (!user) {
      toast('Inicia sesión para comprar tus entradas')
      return navigate('/login', { state: { from: location.pathname } })
    }
    if (user.role !== 'cliente') return toast.error('Las compras se hacen con una cuenta de cliente')
    if (method === 'simulado' && card.replace(/\s/g, '').length < 12) return toast.error('Ingresa un número de tarjeta de prueba')

    setProcessing(true)
    try {
      const order = await ordersApi.create({
        event_id: event.id,
        sector_id: sector.id,
        quantity: qty,
        payment_method: method,
        card_number: method === 'simulado' ? card : undefined,
      })
      await new Promise((r) => setTimeout(r, 900)) // deja ver la animación completa
      navigate(`/compra/${order.id}`, { state: { fresh: true } })
    } catch (err) {
      setProcessing(false)
      if (err.status === 409) {
        say('¡Uy! Alguien fue más rápido. Ese sector se agotó.', 'surprised')
        toast.error(err.message === 'Agotado' ? 'Agotado: ya no hay cupos suficientes en este sector' : err.message)
        load()
      } else {
        say('Algo salió mal con la compra 😤', 'angry')
        toast.error(err.message)
      }
    }
  }

  return (
    <div>
      <ProcessingOverlay open={processing} method={method} />

      <EventHero event={event} onBack={() => navigate(-1)} />

      <AnimatePresence>
        {canBuy && !buyVisible && !processing && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-ink-950/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-mute">Desde</p>
              <p className="whitespace-nowrap font-display text-lg font-bold leading-tight text-white">{money(Math.min(...event.sectors.filter((s) => s.available > 0).map((s) => s.price)))}</p>
            </div>
            <button onClick={() => buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[linear-gradient(110deg,#22d3ee,#3b82f6)] px-5 text-sm font-extrabold text-ink-950 min-[360px]:px-6">
              <Ticket className="size-4" /> Comprar entradas
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-28 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10 lg:px-8 lg:pb-32 lg:pt-10">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl">Sobre el evento</h2>
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-soft sm:mt-4 sm:text-lg">{event.description || 'Pronto más detalles.'}</p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
            {[
              { icon: QrCode, title: 'Entrada con QR', text: 'Una por persona, de un solo uso.' },
              { icon: ShieldCheck, title: 'Pago con QR', text: 'Desde la app de tu banco.' },
              { icon: User, title: 'Organiza', text: event.organizer_name },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4 rounded-2xl border border-line bg-ink-900/60 p-4 sm:block sm:rounded-3xl sm:p-5">
                <f.icon className="size-6 shrink-0" style={{ color: c.from }} />
                <div className="min-w-0">
                  <p className="font-bold text-white sm:mt-3">{f.title}</p>
                  <p className="text-sm text-mute">{f.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-ink-900/60 p-4 sm:mt-10 sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Ocupación del evento</h3>
              <span className="font-mono text-sm text-mute">{(event.capacity - event.available).toLocaleString('es-BO')} / {event.capacity.toLocaleString('es-BO')}</span>
            </div>
            <div className="mt-5 space-y-4">
              {event.sectors.map((s) => (
                <div key={s.id}>
                  <div className="mb-1.5 flex justify-between text-sm"><span className="text-soft">{s.name}</span><span className="text-mute">{Math.round((s.sold / s.capacity) * 100)}% vendido</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${(s.sold / s.capacity) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c.from}, ${c.to})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel de compra */}
        <aside ref={buyRef} id="comprar" className="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl glass p-4 shadow-[0_40px_100px_-50px_rgba(34,211,238,0.5)] sm:rounded-[32px] sm:p-6">
            <h2 className="relative flex items-center gap-2 text-xl font-bold"><Ticket className="size-5" style={{ color: c.from }} /> Elige tus entradas</h2>

            {isPast || event.status !== 'publicado' ? (
              <div className="relative mt-6 text-center">
                <MascotPose pose="durmiendo" className="mx-auto h-32 w-40" float={false} />
                <p className="mt-2 font-semibold text-white">{event.status === 'cancelado' ? 'Este evento fue cancelado' : isPast ? 'Este evento ya pasó' : 'Aún no está a la venta'}</p>
              </div>
            ) : (
              <>
                <div className="relative mt-5 space-y-2.5">
                  {event.sectors.map((s) => (
                    <SectorOption key={s.id} sector={s} accent={c} selected={s.id === sectorId} onSelect={() => { setSectorId(s.id); setQty(1) }} />
                  ))}
                </div>

                <div className="relative mt-6 flex items-center justify-between">
                  <span className="text-sm font-bold text-soft">Cantidad <span className="text-mute">(máx. {MAX_PER_ORDER})</span></span>
                  <div className="flex items-center gap-1 rounded-full border border-line bg-ink-900/70 p-1">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="grid grid-cols-1 size-9 place-items-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-30" aria-label="Menos" data-cursor="−"><Minus className="size-4" /></button>
                    <AnimatePresence mode="popLayout">
                      <motion.span key={qty} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} className="w-8 text-center font-display text-lg font-bold text-white">{qty}</motion.span>
                    </AnimatePresence>
                    <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} className="grid grid-cols-1 size-9 place-items-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-30" aria-label="Más" data-cursor="+"><Plus className="size-4" /></button>
                  </div>
                </div>

                <div className="relative mt-6">
                  <span className="text-sm font-bold text-soft">Método de pago</span>
                  <div className={`mt-2 grid gap-2 ${PAYMENT_METHODS.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {PAYMENT_METHODS.map((m) => (
                      <button key={m.key} type="button" onClick={() => setMethod(m.key)} data-cursor="Elegir"
                        className={`relative rounded-2xl border p-3 text-left transition-colors ${method === m.key ? 'border-transparent bg-white/5' : 'border-line hover:border-white/20'}`}>
                        {method === m.key && <motion.span layoutId="pay-ring" className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: c.from }} />}
                        <m.icon className="relative size-5" style={{ color: method === m.key ? c.from : undefined }} />
                        <p className="relative mt-2 text-sm font-bold text-white">{m.title}</p>
                        <p className="relative text-[11px] text-mute">{m.text}</p>
                      </button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {method === 'simulado' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <Field className="mt-3" icon={CreditCard} inputMode="numeric" placeholder="4111 1111 1111 1111" value={card} onChange={(e) => setCard(formatCard(e.target.value))}
                          hint="Prueba: cualquier tarjeta se aprueba; si termina en 0000 se rechaza." />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative mt-6 flex items-end justify-between border-t border-line pt-5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-mute">Total</p>
                    <p className="whitespace-nowrap font-display text-2xl font-bold text-white min-[360px]:text-3xl">
                      Bs <CountUp key={total} value={total} duration={0.6} format={(n) => n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                    </p>
                  </div>
                  <p className="text-right text-xs text-mute">{qty} × {sector ? money(sector.price) : '—'}<br />{sector?.name}</p>
                </div>

                <Magnetic strength={0.15} className="relative mt-5 w-full">
                  <Button size="lg" className="w-full" onClick={buy} disabled={!canBuy} loading={processing} cursor="Comprar"
>
                    {canBuy ? `Comprar ${qty} ${qty === 1 ? 'entrada' : 'entradas'}` : 'Agotado'}
                  </Button>
                </Magnetic>
                <p className="relative mt-3 text-center text-xs text-mute">Reservamos tus cupos mientras completas el pago.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
