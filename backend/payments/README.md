# coders_tick · payments

Pasarela de pagos. Dos modos:

- **libelula**: registra una deuda en el sandbox de Libélula y devuelve la URL de la pasarela y el QR Simple. El estado se confirma consultando la deuda (`pagado`).
- **simulado**: aprueba cualquier tarjeta y **rechaza las que terminan en `0000`**.

No cobra dos veces la misma orden (`UNIQUE(order_id)`) y registra cada transacción con monto, fecha y resultado. Es interno: no se publica en Nginx.

| | |
|---|---|
| Puerto | `8004` |
| Base de datos | `payments` (propia) |
| Se comunica con | Libélula (API externa). Internamente solo responde a orders (clave `X-Internal-Key`). |
| Chequeo de salud | `GET /health` → `200` si está listo, `503` si su dependencia no responde |
| Documentación interactiva | http://localhost:8004/docs |

## Requisitos

- Python 3.12 o superior
- PostgreSQL 14+ con la base **`payments`** creada

## Variables de entorno

Toda la configuración se lee del entorno (o de un archivo `.env` en esta carpeta). Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Ejemplo | Sección |
|---|---|---|
| `SERVICE_NAME` | `payments` | Servicio (interno: no se expone en Nginx) |
| `HOST` | `0.0.0.0` | Servicio (interno: no se expone en Nginx) |
| `PORT` | `8004` | Servicio (interno: no se expone en Nginx) |
| `LOG_LEVEL` | `INFO` | Servicio (interno: no se expone en Nginx) |
| `DATABASE_URL` | `postgresql+psycopg://USUARIO:CONTRASENA@127.0.0.1:5432/payments` | Base de datos propia (payments_db) |
| `INTERNAL_API_KEY` | `cambia-esta-clave-interna` | Clave compartida con orders (único servicio que puede llamar a payments) |
| `LIBELULA_APPKEY` | `tu-appkey-de-pruebas` | Libélula (sandbox) |
| `LIBELULA_REGISTER_URL` | `https://api.libelula.bo/rest/deuda/registrar` | Libélula (sandbox) |
| `LIBELULA_QUERY_URL` | `https://api.libelula.bo/rest/deuda/consultar_deudas/por_identificador` | Libélula (sandbox) |
| `LIBELULA_IDENTIFIER_PREFIX` | `coderstick-` | Libélula (sandbox) |
| `LIBELULA_TIMEOUT_SECONDS` | `15` | Libélula (sandbox) |
| `SIMULATED_REJECT_SUFFIX` | `0000` | Simulador interno: tarjetas que terminan en este sufijo se rechazan |

> Usa `127.0.0.1` en lugar de `localhost` para hablar con otros servicios: en Windows `localhost` intenta primero IPv6 y cada llamada tarda ~2 s (ver `docs/bitacora.md`).

## Ejecutar en local

1. Entra a la carpeta del servicio: `cd backend/payments`
2. Crea el entorno virtual e instala dependencias:

   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate   ·   Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia la configuración: `cp .env.example .env` y edítala.
4. Aplica las migraciones (crea las tablas en `payments`):

   ```bash
   alembic upgrade head
   ```

5. Inicia el servicio:

   ```bash
   python -m app
   ```

6. Verifica: `curl http://localhost:8004/health`


## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | público | Estado del servicio y de sus dependencias |
| `POST` | `/payments` | interno | Iniciar cobro de una orden (idempotente) |
| `POST` | `/payments/{order_id}/verify` | interno | Consultar a Libélula si ya se pagó |
| `POST` | `/payments/{order_id}/cancel` | interno | Marcar como rechazado un pago abandonado |
| `GET` | `/payments/{order_id}` | interno | Transacción de una orden |

*Acceso:* `JWT` = cualquier usuario con sesión · `interno` = solo otros servicios con la cabecera `X-Internal-Key`.

## Estructura

```
payments/
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
