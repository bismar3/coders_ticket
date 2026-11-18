"""Configuración del servicio: todo se lee de variables de entorno (o del archivo .env)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "tickets"
    host: str = "0.0.0.0"
    port: int = 8005
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    database_url: str
    jwt_secret: str
    internal_api_key: str

    # Carpeta local donde se guardan los PDF generados
    storage_dir: Path = SERVICE_DIR / "storage"
    brand_name: str = "coders_tick"
    timezone: str = "America/La_Paz"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
