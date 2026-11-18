# coders_tick · checkin

Control de ingreso: recibe el código escaneado por el portero y el evento en el que trabaja, pide a tickets que lo valide y registra el ingreso con fecha, hora y portero. `UNIQUE(ticket_code)` garantiza que cada entrada se use **una sola vez**. Rechaza con motivo: código inválido, entrada de otro evento o entrada ya utilizada (con la hora del primer ingreso).

| | |
|---|---|
| Puerto | `8007` |
| Base de datos | `checkin` (propia) |
| Se comunica con | tickets. |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8007/docs |

## Requisitos

- Python 3.12 o superior
- PostgreSQL 14+ con la base **`checkin`** creada

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `checkin` | Servicio |
| `HOST` | `0.0.0.0` | Servicio |
| `PORT` | `8007` | Servicio |
| `LOG_LEVEL` | `INFO` | Servicio |
| `CORS_ORIGINS` | `http://localhost:5173` | Servicio |
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:CONTRASENA@127.0.0.1:5432/checkin` | Base de datos propia (checkin_db) |
| `JWT_SECRET` | `cambia-este-secreto` | Seguridad (mismos valores que en el resto de servicios) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Seguridad (mismos valores que en el resto de servicios) |
| `TICKETS_URL` | `http://127.0.0.1:8005` | Servicio con el que se comunica |
| `HTTP_TIMEOUT_SECONDS` | `4` | Servicio con el que se comunica |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/checkin`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Aplica las migraciones (crea las tablas en `checkin`):

   ```bash
   alembic upgrade head
   ```

5. Inicia el servicio:

   ```bash
   python -m app
   ```

6. Verifica: `curl http://localhost:8007/health`


## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `POST` | `/checkin` | portero / organizador | Validar y registrar `{code, event_id}` |
| `GET` | `/checkin/events/{id}/stats` | portero / organizador | Ingresos, rechazos por motivo, por portero, por sector y los del portero actual |
| `GET` | `/checkin/events/{id}/attempts` | portero / organizador | Historial filtrable (`result`, `reason`, `porter_id`, `q`) y paginado |
| `GET` | `/checkin/stats` | portero / organizador | Ingresos por evento |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
checkin/
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
