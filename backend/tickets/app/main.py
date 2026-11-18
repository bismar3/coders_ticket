import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_conf import setup_logging
from app.routes import internal, router

setup_logging(settings.log_level)
settings.storage_dir.mkdir(parents=True, exist_ok=True)
logging.getLogger("tickets").info("Servicio tickets iniciado (PDF en %s)", settings.storage_dir)

app = FastAPI(title="coders_tick · tickets", version="1.0.0", description="Emisión de entradas con PDF + QR y su validación.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
app.include_router(internal)
