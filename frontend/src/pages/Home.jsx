import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'motion/react'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRight, Mail, MousePointer2, QrCode, ScanLine, ShieldCheck, Sparkles, Ticket, Zap } from 'lucide-react'
import Constellation from '../components/fx/Constellation'
import { CountUp, Magnetic, Marquee, Reveal, SplitWords, Tilt } from '../components/fx/Interactive'
import MascotPose from '../components/mascot/MascotPose'
import Mascot3D from '../components/mascot/Mascot3D'
import { CodersSeal } from '../components/brand/Brand'
import EventCard from '../components/events/EventCard'
import { Button, Eyebrow, SectionTitle, Skeleton } from '../components/ui/ui'
import { iconFor, useCategories } from '../lib/categories'
import { eventsApi } from '../lib/api'
import { dateParts } from '../lib/format'
import { useIsDesktop } from '../lib/useMedia'

const WORDS = ['conciertos', 'partidos', 'festivales', 'obras de teatro', 'charlas']

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="relative inline-grid h-[1.15em] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout">
        <motion.span key={WORDS[i]} initial={{ y: '100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="whitespace-nowrap text-gradient">
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function HeroTicket({ event }) {
  const { day, month } = event ? dateParts(event.starts_at) : { day: '24', month: 'NOV' }
  return (
    <Tilt max={12} className="w-[270px] rounded-[26px] sm:w-[300px]">
      <div className="border-spin relative overflow-hidden rounded-[26px] bg-ink-850 p-5 shadow-[0_30px_80px_-30px_rgba(34,211,238,0.45)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-neon">ENTRADA DIGITAL</span>
          <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-bold text-ok">VÁLIDA</span>
        </div>
        <h3 className="mt-4 line-clamp-2 text-lg font-bold leading-tight">{event?.title ?? 'Neón Fest 2026'}</h3>
        <div className="mt-3 flex gap-5 text-xs">
          <div><p className="text-mute">FECHA</p><p className="font-bold text-white">{day} {month}</p></div>
          <div><p className="text-mute">SECTOR</p><p className="font-bold text-white">VIP</p></div>
          <div><p className="text-mute">ACCESO</p><p className="font-bold text-white">1 de 2</p></div>
        </div>
        <div className="relative my-4 border-t border-dashed border-line">
          <span className="absolute -left-8 -top-3 size-6 rounded-full bg-ink-950" />
          <span className="absolute -right-8 -top-3 size-6 rounded-full bg-ink-950" />
        </div>
        <div className="flex items-center gap-4">
          <div className="relative rounded-xl bg-white p-2">
            <QRCodeSVG value="CT-CODE-RSXX-2026" size={84} fgColor="#070a16" />
            <span aria-hidden className="absolute inset-x-1 h-0.5 animate-scan bg-neon shadow-[0_0_10px_#22d3ee]" />
          </div>
          <div className="font-mono text-[11px] leading-relaxed text-mute">
            <p className="text-neon">CT-K8S9-DOCK-2026</p>
            <p>Un solo uso.</p>
            <p>Muéstralo en puerta.</p>
          </div>
        </div>
      </div>
    </Tilt>
  )
}

function Hero({ featured }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yArt = useTransform(scrollYProgress, [0, 1], [0, 120])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const desktop = useIsDesktop()

  return (
    <section ref={ref} className="relative overflow-hidden pb-6 pt-[4.5rem] sm:pt-24 lg:min-h-[100svh] lg:pb-0 lg:pt-28">
      <Constellation />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-2 px-4 sm:gap-6 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:px-8">
        <motion.div style={{ opacity: desktop ? fade : 1 }} className="relative z-10 pt-4 sm:pt-8 lg:pt-14">
          <Eyebrow>En vivo · Bolivia 2026</Eyebrow>
          <h1 className="mt-4 text-[clamp(2rem,8.6vw,4.1rem)] font-black leading-[1.04] sm:mt-6 md:text-[clamp(2.3rem,5.2vw,4.1rem)]">
            <SplitWords text="Entradas para" delay={0.2} />
            <br />
            <RotatingWord />
            <br />
            <SplitWords text="en un clic." delay={0.4} className="text-chrome" />
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="mt-4 max-w-xl text-base text-mute sm:mt-6 sm:text-lg">
            Elige tu sector, paga con QR desde la app de tu banco y recibe tu entrada al instante.
            En la puerta, un escaneo y estás dentro.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6 }} className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:mt-9 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
            <Magnetic className="w-full sm:w-auto">
              <Button to="/cartelera" size="lg" iconRight={ArrowRight} cursor="Vamos" className="w-full max-sm:h-12 max-sm:px-5">Explorar cartelera</Button>
            </Magnetic>
            <Button href="#como-funciona" variant="ghost" size="lg" icon={Zap} cursor="Ver" className="max-sm:h-12 max-sm:px-5">Cómo funciona</Button>
          </motion.div>
          <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="mt-7 grid max-w-lg grid-cols-3 gap-3 border-t border-line pt-5 sm:mt-14 sm:gap-6 sm:pt-6">
            {[
              { value: 100, suffix: '%', label: 'entradas con QR' },
              { value: 1, suffix: '', label: 'escaneo para entrar' },
              { value: 24, suffix: '/7', label: 'compra cuando quieras' },
            ].map((s) => (
              <div key={s.label}>
                <dt className="font-display text-xl font-bold text-white sm:text-3xl"><CountUp value={s.value} />{s.suffix}</dt>
                <dd className="mt-1 text-[10px] uppercase leading-snug tracking-wider text-mute sm:text-xs sm:tracking-widest">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div style={{ y: desktop ? yArt : 0 }} className="relative mx-auto h-[330px] w-full max-w-[540px] min-[400px]:h-[360px] sm:h-[560px] md:h-[470px] lg:h-[620px]">
          <div aria-hidden className="absolute left-1/2 top-[45%] size-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-neon/10 sm:top-[42%] sm:size-[460px] md:size-[360px] lg:size-[480px]">
            <div className="absolute inset-0 animate-spin-slow rounded-full">
              <span className="absolute -top-1 left-1/2 size-2 rounded-full bg-neon shadow-[0_0_12px_#22d3ee]" />
            </div>
          </div>
          <div aria-hidden className="absolute left-1/2 top-[45%] size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.16),transparent_62%)] sm:top-[42%] sm:size-[340px]" />

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-0 h-[310px] w-[225px] min-[400px]:left-[4%] min-[400px]:h-[340px] min-[400px]:w-[245px] sm:inset-x-0 sm:mx-auto sm:h-[480px] sm:w-[350px] sm:-translate-x-10 md:h-[390px] md:w-[285px] md:-translate-x-6 lg:h-[500px] lg:w-[370px] lg:-translate-x-14">
            <Mascot3D className="h-full w-full" />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40, rotate: 10 }} animate={{ opacity: 1, x: 0, rotate: -6 }} transition={{ delay: 0.7, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 right-0 z-10 origin-bottom-right scale-[0.62] min-[400px]:scale-[0.68] sm:-bottom-4 sm:right-0 sm:scale-[0.85] md:bottom-0 md:scale-[0.72] lg:-bottom-4 lg:-right-10 lg:scale-90">
            <HeroTicket event={featured} />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="absolute left-0 top-[56%] z-10 hidden lg:block">
            <div className="rounded-2xl glass px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="size-4 text-ok" /> Pago aprobado</p>
              <p className="text-xs text-mute">Tu entrada ya está lista</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }} className="absolute right-2 top-12 z-10 hidden lg:block">
            <div className="rounded-2xl glass px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Mail className="size-4 text-neon" /> ¡Tus entradas llegaron!</p>
            </div>
          </motion.div>
          <div className="absolute -left-4 bottom-20 z-10 hidden lg:block">
            <CodersSeal size={100} />
          </div>
        </motion.div>
      </div>

      <motion.a href="#cartelera" style={{ opacity: fade }} className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-mute lg:flex" data-cursor="Bajar">
        <MousePointer2 className="size-4 animate-bounce text-neon" /> scroll
      </motion.a>
    </section>
  )
}

function UpcomingStrip({ events }) {
  if (!events.length) return null
  return (
    <div className="relative border-y border-line bg-ink-900/80 py-3 sm:py-5">
      <Marquee duration={50}>
        {events.map((e) => (
          <Link key={e.id} to={`/eventos/${e.id}`} data-cursor="Ver" className="flex items-center gap-3 whitespace-nowrap font-display text-base font-bold text-white/75 transition-colors hover:text-white sm:gap-4 sm:text-2xl">
            <span className="text-neon">&lt;/&gt;</span>
            {e.title}
            <span className="font-mono text-sm font-medium text-mute">{dateParts(e.starts_at).day} {dateParts(e.starts_at).month}</span>
          </Link>
        ))}
      </Marquee>
    </div>
  )
}

function Featured({ events, loading }) {
  return (
    <section id="cartelera" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
        <SectionTitle eyebrow="Próximamente" title={<>Lo que se viene <span className="text-gradient">esta temporada</span></>} subtitle="Asegura tu lugar antes de que se agoten. Los cupos se actualizan en tiempo real." />
        <Button to="/cartelera" variant="ghost" iconRight={ArrowRight} cursor="Todo" className="max-sm:hidden">Ver toda la cartelera</Button>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl sm:h-[400px] sm:rounded-[28px]" />)
          : events.slice(0, 6).map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
      </div>
      <div className="mt-5 sm:hidden"><Button to="/cartelera" variant="ghost" iconRight={ArrowRight} className="w-full">Ver toda la cartelera</Button></div>
    </section>
  )
}

function Categories() {
  const categories = useCategories()
  if (!categories.length) return null
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8 lg:pb-28">
      <SectionTitle eyebrow="Para cada plan" title="Una plataforma, todo tipo de eventos" subtitle="Conciertos, deportes, teatro, ferias o charlas: encuentra tu próximo plan por categoría." />
      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-12 sm:gap-3 md:grid-cols-4">
        {categories.map((c, i) => {
          const Icon = iconFor(c.icon)
          return (
            <Reveal key={c.id} delay={i * 0.04}>
              <Link to={`/cartelera?category=${c.slug}`} data-cursor="Ver"
                className="group flex h-full flex-col rounded-2xl border border-line bg-ink-900/70 p-3.5 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-neon/40 sm:rounded-3xl sm:p-6">
                <span className="grid size-10 place-items-center rounded-xl border border-neon/25 bg-neon/5 text-neon transition-colors group-hover:bg-neon group-hover:text-ink-950 sm:size-12 sm:rounded-2xl">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 text-[15px] font-bold sm:mt-7 sm:text-lg">{c.name}</h3>
                <p className="mt-1 hidden text-sm text-mute sm:block">{c.description}</p>
                <p className="mt-auto pt-1.5 font-mono text-[11px] text-soft sm:pt-4 sm:text-xs">{c.events_count} {c.events_count === 1 ? 'evento' : 'eventos'} <span className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

const STEPS = [
  { icon: Sparkles, pose: 'pensando', title: 'Elige tu experiencia', text: 'Explora la cartelera, mira los sectores con su precio y cupo real, y elige hasta 6 entradas por compra.' },
  { icon: QrCode, pose: 'trabajando', title: 'Paga con QR', text: 'Tus cupos quedan reservados mientras pagas con QR desde la app de tu banco. Si el pago no se completa, se liberan al instante.' },
  { icon: Ticket, pose: 'feliz', title: 'Recibe tu entrada', text: 'Cada asiento genera su propia entrada en PDF con un código QR único. Te llega al correo y queda guardada en tu cuenta.' },
  { icon: ScanLine, pose: 'corriendo', title: 'Entra en segundos', text: 'En la puerta escanean tu QR. Es de un solo uso: si alguien intenta reutilizarlo, el sistema lo rechaza al momento.' },
]

function Step({ step, index, onActive, desktop }) {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => { if (inView) onActive(index) }, [inView, index, onActive])
  const Icon = step.icon
  return (
    <div ref={ref} className="flex py-5 lg:min-h-[55vh] lg:items-center lg:py-0">
      <motion.div animate={{ opacity: inView || !desktop ? 1 : 0.3 }} transition={{ duration: 0.4 }} className="flex max-w-md gap-4 lg:block">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-neon/25 bg-neon/5 text-neon lg:hidden"><Icon className="size-5" /></span>
        <div className="min-w-0">
          <span className="font-mono text-xs text-neon sm:text-sm">0{index + 1} / 04</span>
          <h3 className="mt-1 text-xl font-bold sm:mt-3 sm:text-3xl lg:text-4xl">{step.title}</h3>
          <p className="mt-2 text-[15px] text-mute sm:mt-4 sm:text-lg">{step.text}</p>
        </div>
      </motion.div>
    </div>
  )
}

function HowItWorks() {
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] })
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const StepIcon = STEPS[active].icon
  const desktop = useIsDesktop()

  return (
    <section id="como-funciona" ref={ref} className="relative mx-auto max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
      <SectionTitle eyebrow="Cómo funciona" title={<>De la cartelera a la puerta <span className="text-gradient">en 4 pasos</span></>} />
      <div className="relative mt-4 grid grid-cols-1 gap-10 sm:mt-6 lg:mt-0 lg:grid-cols-2">
        <div className="relative pl-5 lg:pl-8">
          <div className="absolute bottom-0 left-0 top-0 w-px bg-line">
            <motion.div style={{ height }} className="w-px bg-gradient-to-b from-neon to-volt" />
          </div>
          {STEPS.map((s, i) => <Step key={s.title} step={s} index={i} onActive={setActive} desktop={desktop} />)}
        </div>
        <div className="sticky top-0 hidden h-screen items-center justify-center lg:flex">
          <div className="relative grid grid-cols-1 size-[440px] place-items-center">
            <div className="absolute inset-0 rounded-full border border-line bg-[radial-gradient(circle,rgba(34,211,238,0.1),transparent_65%)]" />
            <motion.div key={active} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute right-8 top-8 grid grid-cols-1 size-14 place-items-center rounded-2xl border border-line bg-ink-850">
              <StepIcon className="size-6 text-neon" />
            </motion.div>
            <MascotPose pose={STEPS[active].pose} className="h-80 w-80" />
            <div className="absolute bottom-6 flex gap-2">
              {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-8 bg-neon' : 'w-1.5 bg-white/20'}`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative mx-auto max-w-5xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pb-24 lg:pt-0">
      <Reveal>
        <h2 className="text-[clamp(2rem,7.5vw,3.75rem)] font-black leading-tight">Tu próxima noche épica<br /><span className="text-gradient">empieza aquí.</span></h2>
      </Reveal>
      <Reveal delay={0.1} className="mt-7 flex justify-center sm:mt-10">
        <Magnetic>
          <Button to="/cartelera" size="lg" icon={Ticket} cursor="Vamos">Conseguir entradas</Button>
        </Magnetic>
      </Reveal>
    </section>
  )
}

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    eventsApi.list().then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false))
  }, [])
  const upcoming = events.filter((e) => new Date(e.starts_at) > new Date())

  return (
    <>
      <Hero featured={upcoming[0]} />
      <UpcomingStrip events={upcoming} />
      <Featured events={upcoming} loading={loading} />
      <Categories />
      <HowItWorks />
      <FinalCta />
    </>
  )
}
