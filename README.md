# coders_tick 🎟️

Plataforma de venta de entradas para conciertos, partidos, teatro, ferias y charlas. Los organizadores publican eventos con sectores, precios y cupos; los clientes compran y reciben su entrada en PDF con QR; en la puerta, el portero escanea el QR y cada entrada sirve **una sola vez**.

Proyecto del módulo **Contenedores** · versión 1 (servicios REST, sin contenedores) · hecho por **CODERS**.

## Arquitectura

```
                 ┌──────────────────────── Gateway (Nginx en la VM · proxy de Vite en local) ────────────────────────┐
 Cliente ──┐     │  /            → web (React)                                                                         │
 Organizador ─── │  /api/auth    → auth    :8001  ── auth                                                           │
 Portero ──┘     │  /api/events  → events  :8002  ── events                                                         │
                 │  /api/orders  → orders  :8003  ── orders ──► events · payments · tickets · notifications         │
                 │  /api/tickets → tickets :8005  ── tickets + carpeta local de PDFs                                │
                 │  /api/checkin → checkin :8007  ── checkin ──► tickets                                            │
                 └─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                   internos (no se publican):  payments :8004 ── payments ──► Libélula (sandbox)
                                               notifications :8006 ──► Mailpit (SMTP :1025 · web :8025)
```

| Servicio | Tecnología | Puerto | Base de datos | README |
|---|---|---|---|---|
| web | React 19 + Vite + Tailwind 4 | 5173 | — | [frontend/](frontend/README.md) |
| auth | Python · FastAPI | 8001 | `auth` | [backend/auth](backend/auth/README.md) |
| events | Python · FastAPI | 8002 | `events` | [backend/events](backend/events/README.md) |
| orders | Python · FastAPI | 8003 | `orders` | [backend/orders](backend/orders/README.md) |
| payments | Python · FastAPI + Libélula | 8004 | `payments` | [backend/payments](backend/payments/README.md) |
| tickets | Python · FastAPI + reportlab | 8005 | `tickets` | [backend/tickets](backend/tickets/README.md) |
| notifications | Python · FastAPI + SMTP | 8006 | — | [backend/notifications](backend/notifications/README.md) |
| checkin | Python · FastAPI | 8007 | `checkin` | [backend/checkin](backend/checkin/README.md) |

Reglas que cumplen todos los servicios: configuración solo por variables de entorno, una base de datos propia (nunca leen la de otro), comunicación solo HTTP/JSON con tiempo máximo de espera, `GET /health` que revisa sus dependencias, logs en consola con fecha y nivel, y README propio.

## Puesta en marcha rápida (local)

**Requisitos:** Python 3.12+, Node.js 20+, PostgreSQL 14+.

1. Crea las bases de datos (por ejemplo con pgAdmin o `psql`):

   ```sql
   CREATE DATABASE auth;      CREATE DATABASE events;   CREATE DATABASE orders;
   CREATE DATABASE payments;  CREATE DATABASE tickets;  CREATE DATABASE checkin;
   ```

2. Prepara los servicios (entornos virtuales, dependencias, migraciones y cuentas demo):

   ```bash
   python scripts/setup.py
   ```

   Si es la primera vez, revisa el `.env` de cada servicio (se crea desde `.env.example`).

3. Instala la web: `cd frontend && npm install`
4. Descarga [Mailpit](https://github.com/axllent/mailpit/releases) en `tools/mailpit/` (opcional: sin él la compra funciona, pero el correo no sale).
5. Levanta todo con un solo comando:

   ```bash
   python scripts/dev.py
   ```

6. Carga eventos de demostración: `python scripts/seed_demo.py`

| Qué | Dónde |
|---|---|
| Web | http://localhost:5173 |
| Correos (Mailpit) | http://localhost:8025 |
| API de cada servicio | http://localhost:800X/docs |

**Cuentas demo** (clave `coders123`): `cliente@coderstick.bo`, `organizador@coderstick.bo`, `portero@coderstick.bo` y `portero2@coderstick.bo` (segunda puerta).

| Rol | Qué puede hacer en la web |
|---|---|
| Cliente | Cartelera, compra, mis entradas (QR), mis compras y su perfil (datos y contraseña) |
| Organizador (administrador) | Panel por módulos: resumen con gráfico de ingresos, eventos (búsqueda, filtros, agrupación, paginación), categorías administrables, ventas, control de acceso por puerta/portero y personal |
| Portero | Control de puerta: elige el evento, escanea o escribe el código, historial filtrable (ingresaron, rechazados, ya usadas, inválidas, otro evento) y resumen por portero |

## Pagos

- **Pago con QR (Libélula, sandbox real):** es el único método que ve el cliente. La compra crea una deuda y la web muestra el QR (con botón para descargarlo). Cada 5 s, o al volver de la pasarela, orders pide a payments que **verifique la deuda** en Libélula; nunca se confía en los parámetros del callback.
- **Tarjeta (demo, simulador):** visible junto al QR para pruebas. Cualquier tarjeta se aprueba y una que termina en **`0000`** se rechaza, lo que sirve para demostrar que *un pago rechazado libera los cupos*. Se puede ocultar con `VITE_DEMO_PAYMENTS=false` en `frontend/.env.local`.

Al pagar, el cliente ve su **nota de compra** (número de nota, detalle, total en literal, referencia del pago y códigos de las entradas) con dos botones: **Imprimir** (misma nota y tamaño, sin encabezados del navegador) y **Descargar PDF** (archivo idéntico a la vista previa).

### Probar la pasarela desde internet (ngrok)

La web se sigue usando en `http://localhost:5173`. El túnel solo hace falta para que Libélula, que está en internet, pueda avisar al sistema que se pagó:

1. `ngrok http 5173` y copiar la URL `https://….ngrok-free.dev`.
2. En `backend/orders/.env` poner esa URL solo en `PUBLIC_BASE_URL` (dirección del aviso de pago). `FRONTEND_URL` se queda en `http://localhost:5173`: es adonde vuelve el navegador después de pagar, y como el navegador está en la misma PC, localhost funciona.
3. Reiniciar `python scripts/dev.py`.

Aunque el túnel se caiga, la página de compra consulta el estado del pago a Libélula cada 5 segundos, así que la compra igual se confirma.

## Correos

En v1 los correos van a **Mailpit** (http://localhost:8025), que es un buzón de pruebas para desarrolladores: atrapa **todos** los correos que envía el sistema, sin importar el destinatario, y no requiere iniciar sesión. Su interfaz solo existe en inglés. El correo de compra incluye el **QR de cada entrada**.

Para que el correo llegue a la bandeja real del comprador con Gmail (solo se cambian variables, no código):

1. En la cuenta de Gmail que enviará los correos, activar la **Verificación en 2 pasos** (myaccount.google.com → Seguridad).
2. Crear una **contraseña de aplicación** en https://myaccount.google.com/apppasswords (nombre: `coders_tick`) y copiar las 16 letras.
3. En `backend/notifications/.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_STARTTLS=true
   SMTP_USER=tucorreo@gmail.com
   SMTP_PASSWORD=las16letrassinespacios
   SMTP_TIMEOUT_SECONDS=20
   MAIL_FROM=coders_tick <tucorreo@gmail.com>
   ```
4. Reiniciar `python scripts/dev.py`.
5. Comprar con una cuenta de cliente que tenga un **correo real** (las cuentas demo `@coderstick.bo` no existen y Gmail no puede entregarles).

Mientras Gmail está activo, Mailpit deja de recibir correos. Para volver a Mailpit: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_STARTTLS=false` y usuario/contraseña vacíos.

## Verificación de los criterios de aceptación

```bash
python scripts/e2e_check.py
```

Para revisar que todas las pantallas se adapten a celular, tablet y PC: `uv run --no-project --with playwright python scripts/device_check.py`. Emula 17 dispositivos reales (Samsung, iPhone, Xiaomi, Pixel, Motorola, Huawei, iPad, Galaxy Tab, laptops y monitor Full HD), abre 22 pantallas en cada uno, guarda capturas en `scripts/audit/devices/` y avisa si algo se sale de la pantalla, queda escondido en una fila con scroll o tiene letra ilegible.

Recorre el flujo completo contra los servicios en ejecución: registro → compra → pago → PDF con QR → correo en Mailpit → ingreso → segundo escaneo rechazado, más agotado, pago rechazado que libera cupos y pago pendiente en Libélula. Para probar *"la compra se completa aunque notifications esté apagado"*, detén notifications y compra: la orden queda `pagada` y con entradas.

## Despliegue en la VM Ubuntu (v1)

- `infra/nginx/coders_tick.conf`: gateway (web + `/api/*`; payments y notifications no se exponen).
- `infra/systemd/coders-tick@.service`: un servicio systemd por microservicio.

## Estructura

```
coders_ticket/
├── backend/          # un microservicio por carpeta, cada uno independiente
├── frontend/         # web (React + Vite)
├── infra/            # Nginx y systemd para la VM
├── scripts/          # setup, dev (levantar todo), seed_demo, e2e_check
└── docs/             # bitácora de problemas
```
