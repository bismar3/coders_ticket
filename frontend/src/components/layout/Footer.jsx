import { Link } from 'react-router'
import { motion } from 'motion/react'
import { Logo, Wordmark } from '../brand/Brand'
import MascotPose from '../mascot/MascotPose'

export default function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-line">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/60 to-transparent" />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 pb-8 pt-10 sm:px-6 sm:pt-16 md:grid-cols-[1.4fr_1fr_1fr] md:gap-12 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-mute">
            Entradas para conciertos, partidos, teatro, ferias y charlas. Compra en segundos, recibe tu QR y entra sin filas.
          </p>
        </div>
        <div>
          <h4 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-neon">Explorar</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-white" to="/cartelera">Cartelera</Link></li>
            <li><Link className="hover:text-white" to="/cartelera?category=concierto">Conciertos</Link></li>
            <li><Link className="hover:text-white" to="/cartelera?category=deporte">Deportes</Link></li>
            <li><Link className="hover:text-white" to="/mis-entradas">Mis entradas</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-neon">Pagos</h4>
          <p className="text-sm text-mute">Paga con QR desde la app de tu banco. Si un pago no se completa, tus cupos vuelven a la venta.</p>
          <p className="mt-4 text-sm text-mute">¿Organizas eventos? <Link to="/login" className="text-white underline decoration-neon/50 underline-offset-4">Ingresa a tu panel</Link></p>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative select-none text-center leading-none"
        >
          <Wordmark className="text-[19vw] opacity-[0.13] lg:text-[15rem]" glow={false} />
          <div aria-hidden className="absolute bottom-[8%] right-[2%] h-[38%] w-[16%] min-w-16"><MascotPose pose="saludando" float={false} className="h-full w-full" /></div>
        </motion.div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-mute sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} coders_tick · Todos los derechos reservados</span>
          <span>Diseñado y desarrollado con <span className="text-neon">&lt;/&gt;</span> por <Wordmark className="text-xs" /></span>
        </div>
      </div>
    </footer>
  )
}
