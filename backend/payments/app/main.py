import logging

from fastapi import FastAPI

from app.config import settings
from app.logging_conf import setup_logging
from app.routes import internal, router

setup_logging(settings.log_level)
logging.getLogger("payments").info("Servicio payments iniciado (Libélula %s)", "activa" if settings.libelula_appkey else "sin appkey")

# Servicio interno: sin CORS, el navegador nunca lo llama directamente.
app = FastAPI(title="coders_tick · payments", version="1.0.0", description="Pasarela de pagos (Libélula sandbox + simulador).")
app.include_router(router)
app.include_router(internal)
