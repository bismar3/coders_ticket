# coders_tick · orders

Orquesta la compra (máximo 6 entradas): crea la orden *pendiente*, reserva en events, cobra en payments, pide las entradas a tickets y el correo a notifications. Si el pago se rechaza, libera los cupos. Si el correo falla, la compra sigue siendo válida.

| | |
|---|---|
| Puerto | `8003` |
| Base de datos | `orders` (propia) |
| Se comunica con | events, payments, tickets y notifications. |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8003/docs |

## Requisitos

- Python 3.12 o superior
- PostgreSQL 14+ con la base **`orders`** creada

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `orders` | Servicio |
| `HOST` | `0.0.0.0` | Servicio |
| `PORT` | `8003` | Servicio |
| `LOG_LEVEL` | `INFO` | Servicio |
| `CORS_ORIGINS` | `http://localhost:5173` | Servicio |
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:CONTRASENA@127.0.0.1:5432/orders` | Base de datos propia (orders_db) |
| `JWT_SECRET` | `cambia-este-secreto` | Seguridad (mismos valores que en el resto de servicios) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Seguridad (mismos valores que en el resto de servicios) |
| `EVENTS_URL` | `http://127.0.0.1:8002` | Servicios con los que se comunica |
| `PAYMENTS_URL` | `http://127.0.0.1:8004` | Servicios con los que se comunica |
| `TICKETS_URL` | `http://127.0.0.1:8005` | Servicios con los que se comunica |
| `NOTIFICATIONS_URL` | `http://127.0.0.1:8006` | Servicios con los que se comunica |
| `HTTP_TIMEOUT_SECONDS` | `5` | Tiempos máximos de espera (segundos) |
| `PAYMENTS_TIMEOUT_SECONDS` | `25` | Tiempos máximos de espera (segundos) |
| `TICKETS_TIMEOUT_SECONDS` | `20` | Tiempos máximos de espera (segundos) |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | URL pública del gateway (Libélula devuelve aquí al cliente) y de la web |
| `FRONTEND_URL` | `http://localhost:5173` | URL pública del gateway (Libélula devuelve aquí al cliente) y de la web |
| `MAX_TICKETS_PER_ORDER` | `6` | Reglas de negocio |
| `CURRENCY` | `BOB` | Reglas de negocio |
| `PENDING_EXPIRY_MINUTES` | `30` | Reglas de negocio |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/orders`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Aplica las migraciones (crea las tablas en `orders`):

   ```bash
   alembic upgrade head
   ```

5. Inicia el servicio:

   ```bash
   python -m app
   ```

6. Verifica: `curl http://localhost:8003/health`

Estados de una orden: `pendiente`, `pagada`, `rechazada`, `cancelada`.

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `POST` | `/orders` | cliente | Comprar `{event_id, sector_id, quantity, payment_method, card_number?}` |
| `GET` | `/orders/mine` | cliente | Historial de compras |
| `GET` | `/orders/{id}` | cliente | Detalle de una compra |
| `POST` | `/orders/{id}/sync` | cliente | Verifica el pago pendiente / reintenta entradas y correo |
| `POST` | `/orders/{id}/cancel` | cliente | Cancela una orden pendiente y libera cupos |
| `GET` | `/orders/{id}/payment-callback` | público | Retorno desde Libélula (se verifica el pago, no se confía en los parámetros) |
| `GET` | `/orders/stats/organizer` | organizador | Ingresos, entradas, clientes, serie de 14 días y ranking por evento |
| `GET` | `/orders/stats/sales` | organizador | Ventas con filtros (`event_id`, `status`, `q`) y paginación |
| `GET` | `/orders/stats/events/{id}/sales` | organizador | Ventas de un evento |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
orders/
├── app/
│   ├── __main__.py      # punto de entrada (python -m app)
│   ├── main.py          # aplicación FastAPI
│   ├── config.py        # configuración desde variables de entorno
│   ├── logging_conf.py  # logs en consola: fecha | nivel | mensaje
│   └── ...              # modelos, esquemas y rutas del servicio
├── migrations/          # migraciones Alembic
├── alembic.ini
├── requirements.txt
└── .env.example
```
