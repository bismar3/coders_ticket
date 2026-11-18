"""Punto de entrada: python -m app"""
import uvicorn

from app.config import settings
from app.logging_conf import uvicorn_log_config

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, log_config=uvicorn_log_config(settings.log_level))
