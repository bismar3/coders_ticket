"""Configuración del servicio: todo se lee de variables de entorno (o del archivo .env)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "events"
    host: str = "0.0.0.0"
    port: int = 8002
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    database_url: str
    jwt_secret: str
    internal_api_key: str

    # Imágenes subidas por el organizador
    media_dir: Path = SERVICE_DIR / "media"
    media_public_url: str = "/api/events/media"
    max_image_mb: int = 5

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
