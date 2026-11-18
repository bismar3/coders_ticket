import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { amountToWords } from '../../lib/numberToWords'
import { money } from '../../lib/format'

const fmt = (value, options) => new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', ...options }).format(new Date(value))
const issued = (v) => fmt(v, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
const eventDate = (v) => {
  const s = fmt(v, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const receiptNumber = (order) => `NV-${order.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`

/**
 * Nota de venta (comprobante de compra). El mismo diseño se usa en pantalla, al imprimir y en el PDF.
 * Casi todo en blanco y negro para imprimir sin gastar tinta de color.
 */
export function Receipt({ order, customer }) {
  const method = order.payment_method === 'libelula' ? 'Pago con QR' : 'Tarjeta (demo)'
  return (
    <article className="receipt mx-auto w-full max-w-[420px] bg-white px-6 pb-8 pt-7 font-sans text-[13px] leading-relaxed text-neutral-800 sm:px-8">
      <header className="flex items-start justify-between gap-4 border-b border-dashed border-neutral-300 pb-4">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-neutral-900">coders<span className="text-cyan-600">_tick</span></p>
          <p className="text-[11px] text-neutral-500">Venta de entradas en línea · Bolivia</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Nota de venta</p>
          <p className="font-mono text-sm font-bold text-neutral-900">{receiptNumber(order)}</p>
        </div>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 border-b border-dashed border-neutral-300 py-4 text-[12px]">
        <dt className="text-neutral-500">Fecha de emisión</dt><dd className="text-right font-medium">{issued(order.paid_at ?? order.created_at)}</dd>
        <dt className="text-neutral-500">Cliente</dt><dd className="truncate text-right font-medium">{order.customer_name}</dd>
        <dt className="text-neutral-500">Correo</dt><dd className="truncate text-right">{order.customer_email}</dd>
        {customer?.document_id && (<><dt className="text-neutral-500">CI / NIT</dt><dd className="text-right">{customer.document_id}</dd></>)}
      </dl>

      <table className="w-full border-b border-dashed border-neutral-300 text-[12px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
            <th className="py-3 pr-2 text-left font-bold">Cant.</th>
            <th className="py-3 text-left font-bold">Detalle</th>
            <th className="py-3 pl-2 text-right font-bold">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            <td className="pb-4 pr-2 font-mono">{order.quantity}</td>
            <td className="pb-4">
              <p className="font-semibold text-neutral-900">Entrada · {order.sector_name}</p>
              <p className="text-neutral-600">{order.event_title}</p>
              {order.starts_at && <p className="text-[11px] text-neutral-500">{eventDate(order.starts_at)}</p>}
              <p className="text-[11px] text-neutral-500">{order.venue}{order.city ? `, ${order.city}` : ''}</p>
              <p className="mt-1 font-mono text-[11px] text-neutral-500">P. unit. {money(order.unit_price)}</p>
            </td>
            <td className="pb-4 pl-2 text-right font-mono font-semibold">{money(order.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-1 border-b border-dashed border-neutral-300 py-4">
        <div className="flex justify-between text-[12px] text-neutral-600"><span>Subtotal</span><span className="font-mono">{money(order.total)}</span></div>
        <div className="flex justify-between text-[12px] text-neutral-600"><span>Descuento</span><span className="font-mono">{money(0)}</span></div>
        <div className="flex items-baseline justify-between pt-1 text-neutral-900">
          <span className="text-sm font-bold uppercase tracking-wider">Total</span>
          <span className="font-mono text-xl font-bold">{money(order.total)}</span>
        </div>
        <p className="pt-1 text-[11px] italic text-neutral-600">Son: {amountToWords(order.total)}</p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 border-b border-dashed border-neutral-300 py-4 text-[12px]">
        <dt className="text-neutral-500">Método de pago</dt><dd className="text-right font-medium">{method}</dd>
        <dt className="text-neutral-500">Referencia</dt><dd className="truncate text-right font-mono">{order.payment_reference ?? '—'}</dd>
        <dt className="text-neutral-500">Estado</dt><dd className="text-right font-bold text-neutral-900">PAGADO</dd>
      </dl>

      <div className="flex gap-4 py-4">
        <QRCodeSVG value={`coders_tick|${order.id}|${order.total}`} size={84} fgColor="#111827" className="shrink-0" />
        <div className="min-w-0 text-[11px]">
          <p className="font-bold uppercase tracking-wider text-neutral-500">Entradas emitidas</p>
          <ul className="mt-1 space-y-0.5 font-mono text-neutral-800">
            {order.ticket_codes.map((c) => <li key={c} className="truncate">{c}</li>)}
          </ul>
        </div>
      </div>

      <footer className="border-t border-dashed border-neutral-300 pt-4 text-center text-[11px] text-neutral-500">
        <p className="font-semibold text-neutral-700">¡Gracias por tu compra!</p>
        <p>Orden {order.id}</p>
        <p className="mt-1">Este documento es un comprobante de compra y no reemplaza a una factura fiscal.</p>
      </footer>
    </article>
  )
}

/** Botón "Imprimir" animado: la hoja sale de la impresora y luego se abre el diálogo de impresión. */
export function PrintButton({ onPrint, label = 'Imprimir nota' }) {
  const [state, setState] = useState('rest')
  const click = () => {
    if (state === 'printing') return
    setState('printing')
    setTimeout(() => { onPrint(); setState('done') }, 750)
    setTimeout(() => setState('rest'), 2600)
  }
  return (
    <motion.button
      type="button"
      onClick={click}
      initial="rest"
      animate={state}
      whileHover="hover"
      whileTap={{ scale: 0.96 }}
      data-cursor="Imprimir"
      className="group relative inline-flex h-12 items-center justify-center gap-3 overflow-hidden rounded-full bg-[linear-gradient(110deg,#22d3ee,#3b82f6)] px-6 font-extrabold text-ink-950 shadow-[0_12px_40px_-12px_rgba(34,211,238,0.8)]"
    >
      {/* brillo que recorre el botón */}
      <span aria-hidden className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/40 transition-transform duration-700 group-hover:translate-x-[420%]" />
      <svg viewBox="0 0 24 24" className="relative size-5 overflow-visible" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M7 9V3h10v6" variants={{ rest: { y: 0 }, hover: { y: -1.5 }, printing: { y: 2 } }} />
        <rect x="3" y="9" width="18" height="8" rx="2" fill="currentColor" fillOpacity="0.15" />
        <motion.g variants={{ rest: { y: 0 }, hover: { y: 1.5 }, printing: { y: [0, 7, 7], transition: { duration: 0.7 } }, done: { y: 7 } }}>
          <rect x="7" y="14" width="10" height="7" rx="0.5" fill="white" />
          <path d="M9 17h6M9 19h4" strokeWidth="1.4" />
        </motion.g>
        <motion.circle cx="17.5" cy="12" r="0.6" fill="currentColor" variants={{ rest: { opacity: 1 }, printing: { opacity: [1, 0, 1, 0, 1], transition: { duration: 0.7 } } }} />
      </svg>
      <span className="relative">{state === 'printing' ? 'Imprimiendo…' : state === 'done' ? '¡Lista!' : label}</span>
    </motion.button>
  )
}

/** Copia de la nota que solo existe para la impresora (fuera de la app, en <body>). */
export function PrintArea({ children }) {
  return createPortal(<div className="print-only"><div className="receipt-paper">{children}</div></div>, document.body)
}

const PX_TO_MM = 25.4 / 96

/**
 * Genera un PDF idéntico a la vista previa: se dibuja la nota a 420 px (≈ 111 mm) fuera de pantalla,
 * se convierte en imagen nítida (x3) y se coloca en una página del tamaño exacto de la nota.
 * Las librerías se cargan solo al presionar el botón.
 */
async function exportReceiptPdf(node, fileName) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  await document.fonts?.ready
  const { width, height } = node.getBoundingClientRect()
  const png = await toPng(node, { pixelRatio: 3, cacheBust: true })
  const margin = 8
  const w = width * PX_TO_MM
  const h = height * PX_TO_MM
  const pdf = new jsPDF({ unit: 'mm', format: [w + margin * 2, h + margin * 2], orientation: 'portrait', compress: true })
  pdf.setFillColor(238, 241, 246)
  pdf.rect(0, 0, w + margin * 2, h + margin * 2, 'F')
  pdf.addImage(png, 'PNG', margin, margin, w, h, undefined, 'FAST')
  pdf.setProperties({ title: fileName.replace('.pdf', ''), author: 'coders_tick', subject: 'Nota de venta' })
  pdf.save(fileName)
}

/** Botón "Descargar PDF" animado: la flecha baja a la bandeja y el documento se guarda. */
export function DownloadPdfButton({ order, customer }) {
  const [state, setState] = useState('rest')
  const [rendering, setRendering] = useState(false)
  const box = useRef(null)

  const click = async () => {
    if (state === 'working') return
    setState('working')
    setRendering(true)
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      await exportReceiptPdf(box.current.querySelector('.receipt'), `nota-${receiptNumber(order)}.pdf`)
      setState('done')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo generar el PDF. Prueba con "Imprimir nota" → Guardar como PDF.')
      setState('rest')
    } finally {
      setRendering(false)
      setTimeout(() => setState('rest'), 2400)
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={click}
        initial="rest"
        animate={state}
        whileHover="hover"
        whileTap={{ scale: 0.96 }}
        data-cursor="PDF"
        className="group relative inline-flex h-12 items-center justify-center gap-3 overflow-hidden rounded-full border border-neon/40 bg-ink-900 px-6 font-bold text-white transition-colors hover:border-neon"
      >
        <svg viewBox="0 0 24 24" className="relative size-5 overflow-visible text-neon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <motion.g variants={{ rest: { y: 0 }, hover: { y: [0, 2.5, 0], transition: { duration: 0.8, repeat: Infinity } }, working: { y: [0, 4, 0], transition: { duration: 0.6, repeat: Infinity } }, done: { y: 0 } }}>
            <path d="M12 3v11" />
            <path d="m7.5 10 4.5 4.5 4.5-4.5" />
          </motion.g>
          <motion.path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" variants={{ rest: { pathLength: 1 }, done: { pathLength: [0, 1], transition: { duration: 0.4 } } }} />
        </svg>
        <span className="relative">{state === 'working' ? 'Generando PDF…' : state === 'done' ? '¡Descargado!' : 'Descargar PDF'}</span>
      </motion.button>
      {/* copia a tamaño real, fuera de pantalla, solo mientras se genera el PDF */}
      {rendering && createPortal(
        <div ref={box} aria-hidden className="receipt-paper pointer-events-none fixed left-[-10000px] top-0 w-[420px] [filter:none]">
          <Receipt order={order} customer={customer} />
        </div>,
        document.body,
      )}
    </>
  )
}
