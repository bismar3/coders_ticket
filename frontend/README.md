# coders_tick · web

Interfaz única para los tres tipos de usuario (cliente, organizador y portero). No guarda datos: todo lo pide a los servicios **siempre a través del gateway** (`/api/<servicio>/...`).

## Requisitos

- Node.js 20+ y npm
- Los servicios del backend corriendo (ver el README de la raíz)

## Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_BASE` | `/api` | Prefijo del gateway que usa la web |
| `VITE_DEMO_PAYMENTS` | `true` | Muestra la "Tarjeta (demo)" (simulador) junto al pago con QR; `false` la oculta |
| `AUTH_URL`, `EVENTS_URL`, `ORDERS_URL`, `TICKETS_URL`, `CHECKIN_URL` | `http://127.0.0.1:800X` | Solo en desarrollo: a dónde reenvía el proxy de Vite |

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173 (el proxy de Vite hace de Nginx)
npm run build      # genera dist/ para servirlo con Nginx
```

## Pantallas

| Ruta | Rol | Qué hace |
|---|---|---|
| `/` | todos | Portada: hero animado, próximos eventos, categorías, cómo funciona, sección CODERS |
| `/cartelera` | todos | Búsqueda y filtros por tipo de evento y ciudad |
| `/eventos/:id` | todos | Detalle con sectores, cantidad (máx. 6) y pago (Libélula o tarjeta demo) |
| `/compra/:id` | cliente | Estado de la compra: QR de Libélula, celebración y entradas |
| `/mis-entradas` | cliente | Entradas con QR (tarjetas que se voltean) y descarga del PDF |
| `/mis-compras` | cliente | Historial de compras |
| `/organizador` | organizador | Resumen: cifras clave, ingresos de 14 días, ranking, próximos eventos y últimas ventas |
| `/organizador/eventos` | organizador | Eventos con búsqueda, filtros (categoría, fecha, estado), orden, agrupación por categoría y paginación |
| `/organizador/eventos/nuevo` · `/:id` | organizador | Editor por secciones con vista previa en vivo |
| `/organizador/categorias` | organizador | Tipos de evento: crear, editar, ordenar, activar/desactivar, ícono |
| `/organizador/ventas` | organizador | Todas las compras con filtros y paginación |
| `/organizador/accesos` | organizador | Ingresos por evento, por portero/puerta, por sector e historial |
| `/organizador/personal` | organizador | Porteros y administradores: alta, edición, activación, restablecer contraseña |
| `/puerta` | portero | Bienvenida con eventos de hoy/próximos, escáner QR o código manual, historial filtrable y resumen por puerta |
| (panel lateral) | todos | Perfil: ver datos, editarlos y cambiar la contraseña (tocando el nombre en la barra superior) |

## Diseño

- Identidad CODERS: mascota en 2.5D en la portada (el cuerpo se inclina en perspectiva y el visor redibuja los ojos mirando al cursor, con parpadeo y ánimos), cabeza SVG en el logo y el asistente, sello giratorio "HECHO POR CODERS".
- Paleta sobria de un solo acento (cian/azul de la marca); los colores de estado (verde/ámbar/rojo) solo indican estado.
- Rendimiento: cursor y mascota animados con `transform` en un solo `requestAnimationFrame` (sin re-render de React), fondo estático sin filtros, red de nodos limitada que se pausa fuera de pantalla, paneles cargados bajo demanda.
- Respeta `prefers-reduced-motion` y en pantallas táctiles usa el cursor nativo.
- **Responsivo** de 320 px a monitores de 1920 px o más. No solo "entra" en la pantalla: cada tamaño tiene su propio diseño.
  - Celular y tablet: barra superior fija y un **menú lateral con las secciones agrupadas según el rol** (cliente, organizador, portero o visitante).
  - Celular: tarjetas de evento en formato fila (foto + datos) para ver varios eventos por pantalla, portada compacta, filtros plegables, barra fija de "Comprar" en el detalle del evento y tablas del panel convertidas en tarjetas.
  - Panel del organizador: barra lateral en PC y selector de "Módulos" en celular y tablet.
  - Se verifica con `scripts/device_check.py` (17 dispositivos reales emulados).

```
src/
├── components/   # admin, brand, door, events, fx (efectos), layout, mascot, tickets, ui
├── context/      # sesión (JWT) y mascota
├── lib/          # cliente de la API, formatos, categorías
└── pages/        # admin/ (panel del organizador), door/ (portero) y páginas públicas
```
