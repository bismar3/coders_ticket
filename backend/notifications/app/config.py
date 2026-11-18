"""Configuración del servicio: todo se lee de variables de entorno (o del archivo .env)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "notifications"
    host: str = "0.0.0.0"
    port: int = 8006
    log_level: str = "INFO"

    internal_api_key: str

    # SMTP (en v1: Mailpit en localhost:1025, sin usuario ni TLS)
    smtp_host: str = "127.0.0.1"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = False
    smtp_timeout_seconds: float = 5.0
    mail_from: str = "coders_tick <no-reply@coderstick.bo>"

    frontend_url: str = "http://localhost:5173"
    timezone: str = "America/La_Paz"


settings = Settings()
