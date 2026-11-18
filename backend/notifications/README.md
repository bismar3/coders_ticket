# coders_tick · notifications

Envía los correos del sistema: confirmación de compra con el enlace a las entradas y bienvenida al registrarse. No guarda datos: solo deja registro en sus logs. Es interno: no se publica en Nginx.

| | |
|---|---|
| Puerto | `8006` |
| Base de datos | ninguna |
| Se comunica con | Mailpit por SMTP (en v1 no se envía nada real). |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8006/docs |

## Requisitos

- Python 3.12 o superior
- Mailpit (o cualquier servidor SMTP)

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `notifications` | Servicio (interno: no se expone en Nginx) |
| `HOST` | `0.0.0.0` | Servicio (interno: no se expone en Nginx) |
| `PORT` | `8006` | Servicio (interno: no se expone en Nginx) |
| `LOG_LEVEL` | `INFO` | Servicio (interno: no se expone en Nginx) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Clave compartida con los servicios que envían correos |
| `SMTP_HOST` | `127.0.0.1` | SMTP (Mailpit en v1) |
| `SMTP_PORT` | `1025` | SMTP (Mailpit en v1) |
| `SMTP_USER` | `(vacío)` | SMTP (Mailpit en v1) |
| `SMTP_PASSWORD` | `(vacío)` | SMTP (Mailpit en v1) |
| `SMTP_STARTTLS` | `false` | SMTP (Mailpit en v1) |
| `SMTP_TIMEOUT_SECONDS` | `5` | SMTP (Mailpit en v1) |
| `MAIL_FROM` | `coders_tick <no-reply@coderstick.bo>` | SMTP (Mailpit en v1) |
| `FRONTEND_URL` | `http://localhost:5173` | Enlaces dentro de los correos |
| `TIMEZONE` | `America/La_Paz` | Enlaces dentro de los correos |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/notifications`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Inicia el servicio:

   ```bash
   python -m app
   ```

5. Verifica: `curl http://localhost:8006/health`

Mailpit muestra los correos en http://localhost:8025. Con el script `scripts/dev.py` se levanta solo; también puedes ejecutarlo a mano: `mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025`.

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `POST` | `/notifications/purchase` | interno | Correo de confirmación de compra |
| `POST` | `/notifications/welcome` | interno | Correo de bienvenida |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
notifications/
├── app/
│   ├── __main__.py      # punto de entrada (python -m app)
│   ├── main.py          # aplicación FastAPI
│   ├── config.py        # configuración desde variables de entorno
│   ├── logging_conf.py  # logs en consola: fecha | nivel | mensaje
│   └── ...              # modelos, esquemas y rutas del servicio
├── requirements.txt
└── .env.example
```
