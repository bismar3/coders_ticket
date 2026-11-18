import logging

from fastapi import FastAPI

from app.config import settings
from app.logging_conf import setup_logging
from app.routes import internal, router

setup_logging(settings.log_level)
logging.getLogger("notifications").info("Servicio notifications iniciado (SMTP %s:%s)", settings.smtp_host, settings.smtp_port)

# Servicio interno: sin CORS, el navegador nunca lo llama directamente.
app = FastAPI(title="coders_tick · notifications", version="1.0.0", description="Correos del sistema (Mailpit en v1).")
app.include_router(router)
app.include_router(internal)
