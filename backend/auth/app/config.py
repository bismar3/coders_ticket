"""Configuración del servicio: todo se lee de variables de entorno (o del archivo .env)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "auth"
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "INFO"

    database_url: str
    jwt_secret: str
    jwt_expires_minutes: int = 720
    cors_origins: str = "http://localhost:5173"

    # Correo de bienvenida (opcional): si notifications no responde, el registro sigue siendo válido.
    notifications_url: str = ""
    internal_api_key: str = ""
    http_timeout_seconds: float = 3.0

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
