# coders_tick · auth

Gestiona usuarios, roles (cliente, organizador, portero), perfiles y el personal, y emite tokens JWT con el id y el rol. Las contraseñas se guardan cifradas con bcrypt. Las cuentas desactivadas no pueden iniciar sesión.

| | |
|---|---|
| Puerto | `8001` |
| Base de datos | `auth` (propia) |
| Se comunica con | Ningún servicio (opcionalmente notifications para el correo de bienvenida). Los demás confían en el JWT que emite. |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8001/docs |

## Requisitos

- Python 3.12 o superior
- PostgreSQL 14+ con la base **`auth`** creada

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `auth` | Servicio |
| `HOST` | `0.0.0.0` | Servicio |
| `PORT` | `8001` | Servicio |
| `LOG_LEVEL` | `INFO` | Servicio |
| `CORS_ORIGINS` | `http://localhost:5173` | Servicio |
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:CONTRASENA@127.0.0.1:5432/auth` | Base de datos propia (auth_db) |
| `JWT_SECRET` | `cambia-este-secreto` | Tokens (el mismo JWT_SECRET en todos los servicios que validan tokens) |
| `JWT_EXPIRES_MINUTES` | `720` | Tokens (el mismo JWT_SECRET en todos los servicios que validan tokens) |
| `NOTIFICATIONS_URL` | `http://127.0.0.1:8006` | Correo de bienvenida opcional (notifications) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Correo de bienvenida opcional (notifications) |
| `HTTP_TIMEOUT_SECONDS` | `3` | Correo de bienvenida opcional (notifications) |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/auth`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Aplica las migraciones (crea las tablas en `auth`):

   ```bash
   alembic upgrade head
   ```

5. Inicia el servicio:

   ```bash
   python -m app
   ```

6. Verifica: `curl http://localhost:8001/health`

Después de migrar, crea las cuentas de demostración:

```bash
python -m app.seed   # organizador@, portero@ y cliente@coderstick.bo (clave coders123)
```

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `POST` | `/auth/register` | público | Registro de clientes (nombre, correo, contraseña) |
| `POST` | `/auth/login` | público | Inicio de sesión → `access_token` JWT |
| `GET` | `/auth/me` | JWT | Perfil del usuario actual |
| `PUT` | `/auth/me` | JWT | Editar perfil (devuelve un token nuevo) |
| `POST` | `/auth/me/password` | JWT | Cambiar contraseña (pide la actual) |
| `GET` | `/auth/staff` | organizador | Personal con filtros `role`, `q`, `active` y conteos |
| `POST` | `/auth/staff` | organizador | Crear portero u organizador (organizador exige teléfono y documento) |
| `PATCH` | `/auth/staff/{id}` | organizador | Editar datos, activar/desactivar o restablecer contraseña |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
auth/
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
