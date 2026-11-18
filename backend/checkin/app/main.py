import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_conf import setup_logging
from app.routes import router

setup_logging(settings.log_level)
logging.getLogger("checkin").info("Servicio checkin iniciado")

app = FastAPI(title="coders_tick · checkin", version="1.0.0", description="Control de ingreso: escaneo de QR y entradas de un solo uso.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
