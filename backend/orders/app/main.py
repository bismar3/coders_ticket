import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_conf import setup_logging
from app.routes import router

setup_logging(settings.log_level)
logging.getLogger("orders").info("Servicio orders iniciado")

app = FastAPI(title="coders_tick · orders", version="1.0.0", description="Compras: coordina events, payments, tickets y notifications.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
