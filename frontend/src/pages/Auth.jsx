import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { toast } from 'sonner'
import { ArrowRight, CalendarDays, Eye, EyeOff, LayoutDashboard, Lock, Mail, ScanLine, Sparkles, Ticket, User } from 'lucide-react'
import { Button, Eyebrow, Field } from '../components/ui/ui'
import MascotPose from '../components/mascot/MascotPose'
import Mascot3D from '../components/mascot/Mascot3D'
import PosterWall from '../components/auth/PosterWall'
import { SplitWords } from '../components/fx/Interactive'
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext'
import { eventsApi } from '../lib/api'
import { dateParts } from '../lib/format'

// Acceso rápido por rol (llena el formulario; no se muestra la clave en pantalla)
const DEMO = [
  { role: 'Cliente', email: 'cliente@coderstick.bo', icon: User },
  { role: 'Organizador', email: 'organizador@coderstick.bo', icon: LayoutDashboard },
  { role: 'Portero', email: 'portero@coderstick.bo', icon: ScanLine },
]

/** Sacudida del formulario cuando hay un error. */
function useShake() {
  const [scope, animate] = useAnimate()
  return [scope, () => animate(scope.current, { x: [0, -12, 12, -7, 7, 0] }, { duration: 0.45 })]
}

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

/** Estado de la mascota según lo que hace la persona en el formulario. */
function useMascotReaction() {
  const [state, setState] = useState({ mood: undefined, look: null, say: '¡Hola! ¿Listo para tu próximo evento?' })
  const react = useMemo(() => ({
    typing: (text, sayText = 'Mmm, déjame ver…') => {
      const progress = Math.min(1, (text?.length ?? 0) / 28)
      // en PC el formulario está a la izquierda de la mascota; en celular, debajo
      const look = isDesktop() ? { x: -0.95 + progress * 0.7, y: 0.35 } : { x: -0.5 + progress, y: 0.9 }
      setState({ mood: 'idle', look, say: sayText })
    },
    secret: () => setState({ mood: 'closed', look: null, say: 'No miro, tranquilo 🙈' }),
    happy: (say) => setState({ mood: 'happy', look: null, say }),
    sad: (say) => setState({ mood: 'sad', look: null, say }),
    idle: (say) => setState((s) => ({ mood: undefined, look: null, say: say ?? s.say })),
  }), [])
  return [state, react]
}

function Bubble({ text, className = '' }) {
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.p key={text} initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className={`rounded-2xl rounded-bl-sm border border-neon/25 bg-ink-850/95 px-4 py-2.5 text-sm font-semibold text-white shadow-xl ${className}`}>
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

function Shell({ title, subtitle, children, aside, mascot, events }) {
  const upcoming = events.filter((e) => new Date(e.starts_at) > new Date())
  const next = upcoming[0]
  return (
    <main className="relative grid min-h-[100svh] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* celular/tablet: muro de carteles tenue de fondo */}
      <PosterWall events={upcoming} columns={3} className="opacity-25 lg:hidden" />

      <section className="relative z-10 flex items-center justify-center px-4 pb-16 pt-20 sm:px-8 sm:pt-24 lg:pt-28">
        <div className="w-full max-w-md">
          {/* mascota en celular, arriba del formulario */}
          <div className="mb-2 flex items-end justify-center gap-2 lg:hidden">
            <Mascot3D className="h-40 w-32 sm:h-48 sm:w-40" mood={mascot.mood} lookAt={mascot.look} interactive={false} />
            <Bubble text={mascot.say} className="mb-16 max-w-44 text-xs" />
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <h1 className="text-center text-[clamp(2rem,8vw,3rem)] font-black leading-[1.05] lg:text-left">{title}</h1>
            <p className="mt-3 text-center text-mute lg:text-left">{subtitle}</p>
          </motion.div>
          {children}
          {aside}
        </div>
      </section>

      {/* PC: escenario con carteles en movimiento y la mascota reaccionando */}
      <section className="relative hidden overflow-hidden border-l border-line lg:block">
        <PosterWall events={upcoming} columns={4} />
        <div className="absolute inset-0 grid grid-cols-1 place-items-center">
          <div className="relative">
            <div aria-hidden className="absolute inset-[-15%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),transparent_62%)]" />
            <Mascot3D className="h-[440px] w-[330px] xl:h-[500px] xl:w-[370px]" mood={mascot.mood} lookAt={mascot.look} interactive={false} />
            <div className="absolute -top-4 left-[58%] w-48 xl:w-56"><Bubble text={mascot.say} /></div>
          </div>
        </div>
        <div className="absolute inset-x-8 bottom-8 flex flex-wrap items-end justify-between gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-ink-900/85 px-4 py-3">
            <span className="grid size-10 place-items-center rounded-xl bg-neon/10 text-neon"><Ticket className="size-5" /></span>
            <div>
              <p className="font-display text-xl font-bold text-white">{upcoming.length}</p>
              <p className="text-xs text-mute">eventos en cartelera</p>
            </div>
          </motion.div>
          {next && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
              className="flex max-w-xs items-center gap-3 rounded-2xl border border-line bg-ink-900/85 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neon/10 text-neon"><CalendarDays className="size-5" /></span>
              <div className="min-w-0">
                <p className="text-xs text-mute">Próximo evento · {dateParts(next.starts_at).day} {dateParts(next.starts_at).month}</p>
                <p className="truncate text-sm font-bold text-white">{next.title}</p>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  )
}

function useEvents() {
  const [events, setEvents] = useState([])
  useEffect(() => { eventsApi.list().then(setEvents).catch(() => {}) }, [])
  return events
}

function PasswordField({ value, onChange, onFocus, onBlur, autoComplete, label = 'Contraseña', placeholder = '••••••••', minLength }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Field label={label} icon={Lock} type={show ? 'text' : 'password'} required minLength={minLength} autoComplete={autoComplete}
        placeholder={placeholder} value={value} onChange={onChange} onFocus={onFocus} onBlur={onBlur} className="[&_input]:pr-12" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute bottom-0 right-1 grid h-[50px] w-11 place-items-center text-mute hover:text-white">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const events = useEvents()
  const [mascot, react] = useMascotReaction()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [formRef, shake] = useShake()

  const submit = async (e) => {
    e?.preventDefault()
    setLoading(true)
    react.idle('Verificando…')
    try {
      const user = await login(form.email, form.password)
      react.happy(`¡Bienvenido, ${user.name.split(' ')[0]}!`)
      toast.success(`¡Hola de nuevo, ${user.name.split(' ')[0]}!`)
      setTimeout(() => navigate(location.state?.from ?? HOME_BY_ROLE[user.role], { replace: true }), 500)
    } catch (err) {
      react.sad('Mmm… algo no coincide. ¿Lo intentamos de nuevo?')
      shake()
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell
      events={events}
      mascot={mascot}
      title={<><SplitWords text="Bienvenido" /><span className="text-gradient"><SplitWords text="de vuelta" delay={0.12} /></span></>}
      subtitle="Ingresa para comprar, ver tus entradas o gestionar tus eventos."
      aside={
        <div className="mt-6 grid grid-cols-3 gap-2">
          {DEMO.map((d, i) => (
            <motion.button key={d.role} type="button" data-cursor="Usar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
              onMouseEnter={() => react.happy(`Entrar como ${d.role.toLowerCase()}`)}
              onClick={() => { setForm({ email: d.email, password: 'coders123' }); react.happy('¡Listo! Solo presiona Ingresar') }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-ink-900/70 px-2 py-3 text-xs font-bold text-soft transition-colors hover:border-neon/40 hover:text-white">
              <d.icon className="size-4 text-neon" /> {d.role}
            </motion.button>
          ))}
        </div>
      }
    >
      <motion.form ref={formRef} onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
        className="border-spin relative mt-8 space-y-4 rounded-[28px] bg-ink-900/90 p-5 sm:p-7">
        <Field label="Correo" icon={Mail} type="email" required autoComplete="email" placeholder="tu@correo.com" value={form.email}
          onChange={(e) => { setForm({ ...form, email: e.target.value }); react.typing(e.target.value) }}
          onFocus={(e) => react.typing(e.target.value, 'Escribe tu correo, yo te espero')} onBlur={() => react.idle()} />
        <PasswordField autoComplete="current-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} onFocus={react.secret} onBlur={() => react.idle('¿Todo listo?')} />
        <Button type="submit" size="lg" className="w-full" loading={loading} iconRight={ArrowRight} cursor="Entrar">Ingresar</Button>
        <p className="text-center text-sm text-mute">¿No tienes cuenta? <Link to="/registro" state={location.state} className="font-bold text-neon hover:underline">Créala gratis</Link></p>
      </motion.form>
    </Shell>
  )
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const events = useEvents()
  const [mascot, react] = useMascotReaction()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [formRef, shake] = useShake()
  const firstName = form.name.trim().split(' ')[0]

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password)
      react.happy('¡Bienvenido al equipo! 🎉')
      toast.success(`¡Bienvenido, ${user.name.split(' ')[0]}! Revisa tu correo 📬`)
      setTimeout(() => navigate(location.state?.from ?? '/cartelera', { replace: true }), 500)
    } catch (err) {
      react.sad('Ups… revisemos los datos')
      shake()
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell
      events={events}
      mascot={mascot}
      title={<><SplitWords text="Únete a la" /><span className="text-gradient"><SplitWords text="primera fila" delay={0.12} /></span></>}
      subtitle="Crea tu cuenta y asegura tus entradas en segundos."
      aside={
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-mute">
          <Sparkles className="size-3.5 text-neon" /> Tus entradas con QR llegan a tu correo y quedan guardadas en tu cuenta.
        </p>
      }
    >
      <motion.form ref={formRef} onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
        className="border-spin relative mt-8 space-y-4 rounded-[28px] bg-ink-900/90 p-5 sm:p-7">
        <Field label="Nombre completo" icon={User} required minLength={2} autoComplete="name" placeholder="Ana Pérez" value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); react.happy(e.target.value.trim() ? `¡Hola, ${e.target.value.trim().split(' ')[0]}!` : '¿Cómo te llamas?') }}
          onFocus={() => react.happy(firstName ? `¡Hola, ${firstName}!` : '¿Cómo te llamas?')} onBlur={() => react.idle()} />
        <Field label="Correo" icon={Mail} type="email" required autoComplete="email" placeholder="tu@correo.com" value={form.email}
          onChange={(e) => { setForm({ ...form, email: e.target.value }); react.typing(e.target.value, 'Ahí te llegarán tus entradas') }}
          onFocus={(e) => react.typing(e.target.value, 'Ahí te llegarán tus entradas')} onBlur={() => react.idle()} />
        <PasswordField label="Contraseña" placeholder="Mínimo 6 caracteres" minLength={6} autoComplete="new-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} onFocus={react.secret} onBlur={() => react.idle('¡Ya casi!')} />
        <Button type="submit" size="lg" className="w-full" loading={loading} iconRight={ArrowRight} cursor="Unirme">Crear cuenta</Button>
        <p className="text-center text-sm text-mute">¿Ya tienes cuenta? <Link to="/login" state={location.state} className="font-bold text-neon hover:underline">Ingresa</Link></p>
      </motion.form>
    </Shell>
  )
}

export function NotFound() {
  return (
    <main className="grid min-h-[100svh] grid-cols-1 place-items-center px-4 pt-20 text-center">
      <div>
        <Eyebrow>Error 404</Eyebrow>
        <MascotPose pose="durmiendo" className="mx-auto mt-6 h-40 w-56 sm:h-56 sm:w-72" />
        <h1 className="mt-6 text-[clamp(2rem,8vw,3.75rem)] font-black leading-tight">Esta página <span className="text-gradient">se fue de gira</span></h1>
        <p className="mt-3 text-mute">No encontramos lo que buscas, pero hay muchos eventos esperándote.</p>
        <div className="mt-8 flex justify-center"><Button to="/cartelera" iconRight={ArrowRight}>Ir a la cartelera</Button></div>
      </div>
    </main>
  )
}
