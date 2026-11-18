import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import categories, internal, routes
from app.config import settings
from app.logging_conf import setup_logging

setup_logging(settings.log_level)
logging.getLogger("events").info("Servicio events iniciado")

settings.media_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="coders_tick · events", version="1.0.0", description="Catálogo de eventos, sectores y cupos.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])
app.include_router(categories.router)  # antes que /events/{id}
app.include_router(routes.router)
app.include_router(internal.router)
app.mount("/events/media", StaticFiles(directory=settings.media_dir), name="media")
