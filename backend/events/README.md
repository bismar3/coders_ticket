# coders_tick · events

Catálogo de eventos con sectores (precio y cupo) y categorías administrables por el organizador (sin tocar código). Estados: borrador, publicado, cancelado; solo los publicados salen en la cartelera. Reserva y libera cupos para orders con un `UPDATE` condicional, así nunca se vende más que el cupo disponible.

| | |
|---|---|
| Puerto | `8002` |
| Base de datos | `events` (propia) |
| Se comunica con | Ningún servicio. Solo responde solicitudes. |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8002/docs |

## Requisitos

- Python 3.12 o superior
- PostgreSQL 14+ con la base **`events`** creada

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `events` | Servicio |
| `HOST` | `0.0.0.0` | Servicio |
| `PORT` | `8002` | Servicio |
| `LOG_LEVEL` | `INFO` | Servicio |
| `CORS_ORIGINS` | `http://localhost:5173` | Servicio |
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:CONTRASENA@127.0.0.1:5432/events` | Base de datos propia (events_db) |
| `JWT_SECRET` | `cambia-este-secreto` | Seguridad (mismos valores que en el resto de servicios) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Seguridad (mismos valores que en el resto de servicios) |
| `MEDIA_DIR` | `./media` | Imágenes de los eventos |
| `MEDIA_PUBLIC_URL` | `/api/events/media` | Imágenes de los eventos |
| `MAX_IMAGE_MB` | `5` | Imágenes de los eventos |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/events`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Aplica las migraciones (crea las tablas en `events`):

   ```bash
   alembic upgrade head
   ```

5. Inicia el servicio:

   ```bash
   python -m app
   ```

6. Verifica: `curl http://localhost:8002/health`


## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `GET` | `/events` | público | Cartelera (solo publicados). Filtros `q`, `category`, `city` |
| `GET` | `/events/{id}` | público | Detalle (los borradores solo los ve su organizador) |
| `GET` | `/events/mine` | organizador | Eventos del organizador: búsqueda, filtros (categoría, estado, fechas), orden y paginación |
| `GET` | `/events/mine/all` | organizador | Listado completo para selectores |
| `GET` | `/events/categories` | público | Categorías activas (`?all=true` incluye inactivas) con su cantidad de eventos |
| `POST` | `/events/categories` | organizador | Crear categoría (nombre, descripción, ícono) |
| `PUT` | `/events/categories/{id}` | organizador | Editar, ordenar o activar/desactivar |
| `DELETE` | `/events/categories/{id}` | organizador | Eliminar (solo si no tiene eventos) |
| `POST` | `/events` | organizador | Crear evento con sectores |
| `PUT` | `/events/{id}` | organizador | Editar evento y sectores |
| `PATCH` | `/events/{id}/status` | organizador | Publicar / borrador / cancelar |
| `POST` | `/events/{id}/image` | organizador | Subir imagen (JPG, PNG, WEBP) |
| `POST` | `/internal/reservations` | interno | Reservar cupos de una orden (409 `Agotado`) |
| `POST` | `/internal/reservations/{order_id}/release` | interno | Liberar cupos |
| `POST` | `/internal/reservations/{order_id}/confirm` | interno | Confirmar reserva pagada |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
events/
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
