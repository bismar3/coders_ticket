# coders_tick · tickets

Genera una entrada por asiento con un código único (`CT-XXXX-XXXX-XXXX`), crea un PDF con el QR (reportlab + qrcode) y lo guarda en una carpeta local (`STORAGE_DIR`). Informa si un código existe, a qué evento pertenece y si es válido.

| | |
|---|---|
| Puerto | `8005` |
| Base de datos | `tickets` (propia) |
| Se comunica con | Ningún servicio. Responde a orders y a checkin. |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8005/docs |

## Requisitos

- Python 3.12 o superior
- PostgreSQL 14+ con la base **`tickets`** creada

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `tickets` | Servicio |
| `HOST` | `0.0.0.0` | Servicio |
| `PORT` | `8005` | Servicio |
| `LOG_LEVEL` | `INFO` | Servicio |
| `CORS_ORIGINS` | `http://localhost:5173` | Servicio |
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:CONTRASENA@127.0.0.1:5432/tickets` | Base de datos propia (tickets_db) |
| `JWT_SECRET` | `cambia-este-secreto` | Seguridad (mismos valores que en el resto de servicios) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Seguridad (mismos valores que en el resto de servicios) |
| `STORAGE_DIR` | `./storage` | Carpeta local de los PDF y zona horaria de impresión |
| `BRAND_NAME` | `coders_tick` | Carpeta local de los PDF y zona horaria de impresión |
| `TIMEZONE` | `America/La_Paz` | Carpeta local de los PDF y zona horaria de impresión |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/tickets`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Aplica las migraciones (crea las tablas en `tickets`):

   ```bash
   alembic upgrade head
   ```

5. Inicia el servicio:

   ```bash
   python -m app
   ```

6. Verifica: `curl http://localhost:8005/health`


## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `POST` | `/internal/tickets/issue` | interno | Emitir entradas de una orden (idempotente) |
| `GET` | `/internal/tickets/validate/{code}` | interno | ¿Existe? ¿De qué evento? ¿Es válido? |
| `GET` | `/tickets/mine` | cliente | Entradas del cliente |
| `GET` | `/tickets/order/{order_id}` | cliente | Entradas de una compra |
| `GET` | `/tickets/{code}/pdf` | cliente | Descargar el PDF |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
tickets/
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
