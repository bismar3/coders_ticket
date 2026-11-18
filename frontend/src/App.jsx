import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { motion, useScroll, useTransform } from 'motion/react'
import Lenis from 'lenis'
import { Toaster } from 'sonner'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Preloader from './components/layout/Preloader'
import { GuestOnly, RequireRole } from './components/layout/Guards'
import ProfileDrawer from './components/layout/ProfileDrawer'
import Backdrop from './components/fx/Backdrop'
import CustomCursor from './components/fx/CustomCursor'
import MascotAssistant from './components/mascot/MascotAssistant'
import { CodersSeal } from './components/brand/Brand'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import OrderStatus from './pages/OrderStatus'
import MyTickets from './pages/MyTickets'
import MyOrders from './pages/MyOrders'
import { Login, NotFound, Register } from './pages/Auth'
import { PageLoader } from './components/ui/ui'
import { preloadPoses } from './lib/mascot'

// Paneles de organizador y portero: se cargan solo cuando se usan (el escáner QR pesa bastante)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const Overview = lazy(() => import('./pages/admin/Overview'))
const EventsAdmin = lazy(() => import('./pages/admin/EventsAdmin'))
const EventEditor = lazy(() => import('./pages/admin/EventEditor'))
const CategoriesAdmin = lazy(() => import('./pages/admin/CategoriesAdmin'))
const SalesAdmin = lazy(() => import('./pages/admin/SalesAdmin'))
const StaffAdmin = lazy(() => import('./pages/admin/StaffAdmin'))
const AccessAdmin = lazy(() => import('./pages/admin/AccessAdmin'))
const DoorControl = lazy(() => import('./pages/door/DoorControl'))

let lenis

function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    lenis = new Lenis({ lerp: 0.14, smoothWheel: true, anchors: { offset: -90 } })
    let raf
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenis = undefined }
  }, [])
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash)
      if (target) return void setTimeout(() => (lenis ? lenis.scrollTo(target, { offset: -90 }) : target.scrollIntoView()), 350)
    }
    lenis ? lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/** Sello CODERS fijo: aparece cuando ya pasaste la portada. */
function FloatingSeal() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [500, 800], [0, 1])
  const scale = useTransform(scrollY, [500, 800], [0.6, 1])
  return (
    <motion.div style={{ opacity, scale }} className="fixed bottom-5 left-4 z-40 hidden xl:block">
      <CodersSeal size={78} />
    </motion.div>
  )
}

const FULL_BLEED = ['/login', '/registro']
const APP_AREAS = ['/organizador', '/puerta'] // paneles de trabajo: sin pie de página

export default function App() {
  const location = useLocation()
  useSmoothScroll()
  useEffect(() => { preloadPoses() }, [])
  const area = APP_AREAS.find((a) => location.pathname.startsWith(a))
  const bare = FULL_BLEED.includes(location.pathname) || !!area
  const pageKey = area ?? location.pathname

  return (
    <div className="relative min-h-[100svh]">
      <Preloader />
      <Backdrop />
      <CustomCursor />
      <ScrollToTop />
      <Navbar />

      {/* Cambio de página con animación CSS: nunca queda trabada aunque la página se cargue por partes */}
      <div key={pageKey} className="page-enter">
          <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/cartelera" element={<Events />} />
            <Route path="/eventos/:id" element={<EventDetail />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/registro" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/compra/:id" element={<RequireRole roles={['cliente']}><OrderStatus /></RequireRole>} />
            <Route path="/mis-entradas" element={<RequireRole roles={['cliente']}><MyTickets /></RequireRole>} />
            <Route path="/mis-compras" element={<RequireRole roles={['cliente']}><MyOrders /></RequireRole>} />
            <Route path="/organizador" element={<RequireRole roles={['organizador']}><AdminLayout /></RequireRole>}>
              <Route index element={<Overview />} />
              <Route path="eventos" element={<EventsAdmin />} />
              <Route path="eventos/nuevo" element={<EventEditor />} />
              <Route path="eventos/:id" element={<EventEditor />} />
              <Route path="categorias" element={<CategoriesAdmin />} />
              <Route path="ventas" element={<SalesAdmin />} />
              <Route path="personal" element={<StaffAdmin />} />
              <Route path="accesos" element={<AccessAdmin />} />
            </Route>
            <Route path="/puerta" element={<RequireRole roles={['portero']}><DoorControl /></RequireRole>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          {!bare && <Footer />}
      </div>

      {!area && <FloatingSeal />}
      <ProfileDrawer />
      {!area && !FULL_BLEED.includes(location.pathname) && (
        <div className={location.pathname.startsWith('/eventos/') ? 'max-lg:hidden' : ''}><MascotAssistant /></div>
      )}
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </div>
  )
}
