"""Configuración del servicio: todo se lee de variables de entorno (o del archivo .env)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "payments"
    host: str = "0.0.0.0"
    port: int = 8004
    log_level: str = "INFO"

    database_url: str
    internal_api_key: str

    # Pasarela Libélula (sandbox)
    libelula_appkey: str = ""
    libelula_register_url: str = "https://api.libelula.bo/rest/deuda/registrar"
    libelula_query_url: str = "https://api.libelula.bo/rest/deuda/consultar_deudas/por_identificador"
    libelula_identifier_prefix: str = "coderstick-"
    libelula_timeout_seconds: float = 15.0

    # Simulador interno: una tarjeta que termina en este sufijo se rechaza
    simulated_reject_suffix: str = "0000"


settings = Settings()
