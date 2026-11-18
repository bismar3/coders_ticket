"""Configuración del servicio: todo se lee de variables de entorno (o del archivo .env)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "orders"
    host: str = "0.0.0.0"
    port: int = 8003
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    database_url: str
    jwt_secret: str
    internal_api_key: str

    # Direcciones de los otros servicios
    events_url: str = "http://127.0.0.1:8002"
    payments_url: str = "http://127.0.0.1:8004"
    tickets_url: str = "http://127.0.0.1:8005"
    notifications_url: str = "http://127.0.0.1:8006"

    # Tiempos máximos de espera (segundos)
    http_timeout_seconds: float = 5.0
    payments_timeout_seconds: float = 25.0
    tickets_timeout_seconds: float = 20.0

    # URL pública (la del gateway) a la que Libélula devuelve al cliente después de pagar
    public_base_url: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"

    max_tickets_per_order: int = 6
    currency: str = "BOB"
    pending_expiry_minutes: int = 30

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
