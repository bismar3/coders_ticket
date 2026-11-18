import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { ArrowRight, Download, ExternalLink, Hourglass, Mail, MailWarning, RefreshCw, Smartphone, Ticket, X } from 'lucide-react'
import { Button, EmptyState, Eyebrow, Page, PageLoader, StatusBadge } from '../components/ui/ui'
import MascotPose from '../components/mascot/MascotPose'
import TicketCard from '../components/tickets/TicketCard'
import { DownloadPdfButton, PrintArea, PrintButton, Receipt } from '../components/orders/Receipt'
import { useMascot } from '../context/MascotContext'
import { authApi, ordersApi, ticketsApi } from '../lib/api'
import { dateTime, longDate, money } from '../lib/format'

const POLL_MS = 5000

function celebrate() {
  const colors = ['#22d3ee', '#3b82f6', '#a5f3fc', '#ffffff']
  const shoot = (x, angle) => confetti({ particleCount: 90, spread: 70, startVelocity: 55, angle, origin: { x, y: 0.7 }, colors, ticks: 260 })
  shoot(0.1, 60)
  shoot(0.9, 120)
  setTimeout(() => confetti({ particleCount: 140, spread: 160, origin: { y: 0.35 }, colors, scalar: 1.1 }), 350)
}

function Summary({ order }) {
  return (
    <div className="rounded-3xl border border-line bg-ink-900/60 p-5 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-white">{order.event_title}</p>
          <p className="text-mute">{order.starts_at && longDate(order.starts_at)} · {order.venue}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div><dt className="text-xs text-mute">Sector</dt><dd className="font-semibold text-white">{order.sector_name}</dd></div>
        <div><dt className="text-xs text-mute">Entradas</dt><dd className="font-semibold text-white">{order.quantity}</dd></div>
        <div><dt className="text-xs text-mute">Total</dt><dd className="font-semibold text-white">{money(order.total)}</dd></div>
      </dl>
      <p className="mt-3 font-mono text-[11px] text-mute">Orden {order.id.slice(0, 8).toUpperCase()} · {dateTime(order.created_at)}</p>
    </div>
  )
}

async function downloadQr(order) {
  const name = `pago-qr-${order.id.slice(0, 8)}.png`
  try {
    const blob = await (await fetch(order.payment_qr_url, { mode: 'cors' })).blob()
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: name }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch {
    window.open(order.payment_qr_url, '_blank', 'noopener') // si no se permite la descarga directa, se abre para guardarla
  }
}

function Pending({ order, onCancel, onCheck, checking }) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-12">
      <div className="min-w-0">
        <Eyebrow>Pago pendiente</Eyebrow>
        <h1 className="mt-5 text-[clamp(2.1rem,7vw,3rem)] font-black leading-tight">Completa<br /><span className="text-gradient">tu pago</span></h1>
        <p className="mt-4 max-w-lg text-base text-mute sm:text-lg">Tus cupos están reservados. Escanea el QR con la app de tu banco. Si estás en el celular, descarga el QR y súbelo desde tu app bancaria.</p>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          <Hourglass className="mt-0.5 size-4 shrink-0 animate-spin [animation-duration:3s]" /> Verificando el pago automáticamente cada pocos segundos…
        </div>
        <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
          <Button variant="ghost" icon={RefreshCw} onClick={onCheck} loading={checking}>Ya pagué, verificar</Button>
          <Button variant="danger" icon={X} onClick={onCancel}>Cancelar compra</Button>
        </div>
        <div className="mt-8 hidden lg:block"><Summary order={order} /></div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="relative mx-auto w-full max-w-sm rounded-[32px] border border-neon/25 bg-ink-900/80 p-5 text-center sm:p-7">
        <p className="flex items-center justify-center gap-2 font-mono text-xs font-bold tracking-[0.25em] text-neon"><Smartphone className="size-4" /> PAGO CON QR</p>
        <div className="relative mx-auto mt-5 w-full max-w-[260px] rounded-3xl bg-white p-3">
          {order.payment_qr_url ? <img src={order.payment_qr_url} alt="QR de pago" className="aspect-square w-full" /> : <div className="aspect-square w-full" />}
          <span aria-hidden className="absolute inset-x-3 h-0.5 animate-scan bg-neon shadow-[0_0_14px_#22d3ee]" />
        </div>
        <p className="mt-5 font-display text-3xl font-bold text-white">{money(order.total)}</p>
        <p className="text-xs text-mute">Ref. {order.payment_reference}</p>
        <div className="mt-5 grid grid-cols-1 gap-2">
          <Button icon={Download} onClick={() => downloadQr(order)} className="w-full">Descargar QR</Button>
          <Button href={order.payment_url} target="_blank" rel="noreferrer" variant="ghost" icon={ExternalLink} className="w-full">Ver QR en pantalla completa</Button>
        </div>
      </motion.div>

      {/* en celular: acciones y resumen debajo del QR */}
      <div className="space-y-6 lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" icon={RefreshCw} onClick={onCheck} loading={checking} className="w-full px-3">Ya pagué</Button>
          <Button variant="danger" icon={X} onClick={onCancel} className="w-full px-3">Cancelar</Button>
        </div>
        <Summary order={order} />
      </div>
    </div>
  )
}

function Paid({ order, tickets, customer }) {
  const one = order.quantity === 1
  return (
    <div>
      <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Eyebrow>Compra confirmada</Eyebrow>
          <h1 className="mt-5 break-words text-[clamp(2rem,6.5vw,3.75rem)] font-black leading-[1.05]">¡Nos vemos en<br /><span className="text-gradient">{order.event_title}</span>!</h1>
          <p className="mt-4 text-base text-mute sm:text-lg">{one ? 'Tu entrada está lista.' : `Tus ${order.quantity} entradas están listas.`} {one ? 'Tiene' : 'Cada una tiene'} su propio QR de un solo uso.</p>
          <div className={`mt-6 inline-flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${order.notification_sent ? 'border-ok/30 bg-ok/5 text-ok' : 'border-warn/30 bg-warn/5 text-warn'}`}>
            {order.notification_sent
              ? <><Mail className="mt-0.5 size-4 shrink-0" /> <span>Te enviamos la confirmación a <b className="break-all">{order.customer_email}</b></span></>
              : <><MailWarning className="mt-0.5 size-4 shrink-0" /> No pudimos enviar el correo, pero tus entradas ya son válidas aquí.</>}
          </div>
        </div>
        <MascotPose pose="feliz" className="h-32 w-32 shrink-0 sm:h-52 sm:w-52 lg:h-64 lg:w-64" />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] xl:gap-14">
        <aside className="order-first min-w-0 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Nota de compra</h2>
              <p className="text-xs text-mute">Imprímela o descárgala en PDF, tal como la ves.</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto">
              <PrintButton onPrint={() => window.print()} label="Imprimir" />
              <DownloadPdfButton order={order} customer={customer} />
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="receipt-paper">
            <Receipt order={order} customer={customer} />
          </motion.div>
        </aside>

        <div className="min-w-0 lg:order-1">
          <h2 className="text-2xl font-bold">Tus entradas</h2>
          <p className="text-sm text-mute">Toca una entrada para ver su QR.</p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {tickets.map((t, i) => <TicketCard key={t.code} ticket={t} index={i} />)}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button to="/mis-entradas" icon={Ticket} iconRight={ArrowRight}>Ver todas mis entradas</Button>
            <Button to="/cartelera" variant="ghost">Seguir explorando</Button>
          </div>
        </div>
      </div>

      <PrintArea><Receipt order={order} customer={customer} /></PrintArea>
    </div>
  )
}

export default function OrderStatus() {
  const { id } = useParams()
  const { state } = useLocation()
  const { say } = useMascot()
  const [order, setOrder] = useState(null)
  const [tickets, setTickets] = useState([])
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [customer, setCustomer] = useState(null)
  const celebrated = useRef(false)
  const previous = useRef(null)

  const apply = useCallback((o) => {
    setOrder(o)
    if (o.status === 'pagada' && o.tickets_issued) ticketsApi.byOrder(o.id).then(setTickets).catch(() => {})
    const wasPending = previous.current === 'pendiente'
    if (o.status === 'pagada' && !celebrated.current && (state?.fresh || wasPending)) {
      celebrated.current = true
      celebrate()
      say('¡Lo lograste! Tus entradas ya están listas 🎉', 'happy', 5000)
    }
    if (o.status === 'rechazada' && previous.current !== 'rechazada') say('El pago no pasó… pero tus cupos volvieron a la venta.', 'sad')
    previous.current = o.status
  }, [state, say])

  // Al entrar se sincroniza (verifica el pago con Libélula si quedó pendiente)
  useEffect(() => {
    ordersApi.get(id)
      .then((o) => {
        apply(o)
        if (o.status === 'pendiente' || (o.status === 'pagada' && (!o.tickets_issued || !o.notification_sent))) {
          ordersApi.sync(id).then(apply).catch(() => {})
        }
      })
      .catch((e) => setError(e.message))
  }, [id, apply])

  useEffect(() => { authApi.me().then(setCustomer).catch(() => {}) }, [])

  // Mientras esté pendiente, se consulta periódicamente
  useEffect(() => {
    if (order?.status !== 'pendiente' || !order.payment_url) return
    const t = setInterval(() => ordersApi.sync(id).then(apply).catch(() => {}), POLL_MS)
    return () => clearInterval(t)
  }, [order?.status, order?.payment_url, id, apply])

  const check = async () => {
    setChecking(true)
    try {
      const o = await ordersApi.sync(id)
      apply(o)
      if (o.status === 'pendiente') toast('Aún no vemos el pago. Si ya pagaste, espera unos segundos.')
    } finally {
      setChecking(false)
    }
  }

  const cancel = async () => {
    try {
      apply(await ordersApi.cancel(id))
      toast('Compra cancelada. Los cupos volvieron a la venta.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (error) return <EmptyState className="pt-32" pose="triste" title="No encontramos esta compra" description={error} action={<Button to="/mis-compras">Ver mis compras</Button>} />
  if (!order) return <PageLoader label="verificando tu compra" />

  return (
    <Page>
      {order.status === 'pendiente' && <Pending order={order} onCancel={cancel} onCheck={check} checking={checking} />}
      {order.status === 'pagada' && <Paid order={order} tickets={tickets} customer={customer} />}
      {(order.status === 'rechazada' || order.status === 'cancelada') && (
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <Eyebrow>{order.status === 'rechazada' ? 'Pago rechazado' : 'Compra cancelada'}</Eyebrow>
            <h1 className="mt-5 text-[clamp(2rem,7vw,3rem)] font-black leading-tight">
              {order.failure_reason === 'Agotado' ? '¡Se agotó!' : order.status === 'rechazada' ? 'Tu pago no pasó' : 'Compra cancelada'}
            </h1>
            <p className="mt-4 text-lg text-mute">{order.failure_reason}. {order.status === 'rechazada' && 'No se realizó ningún cobro y los cupos volvieron a estar disponibles.'}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to={`/eventos/${order.event_id}`} iconRight={ArrowRight}>Intentar de nuevo</Button>
              <Button to="/cartelera" variant="ghost">Ver otros eventos</Button>
            </div>
            <div className="mt-8 max-w-xl"><Summary order={order} /></div>
          </div>
          <MascotPose pose={order.failure_reason === 'Agotado' ? 'sorprendido' : 'triste'} className="order-first mx-auto h-40 w-40 sm:h-72 sm:w-72 lg:order-none" />
        </div>
      )}
    </Page>
  )
}
