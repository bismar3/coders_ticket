"""payments es un servicio interno: solo orders (con la clave compartida) puede llamarlo."""
import secrets

from fastapi import Header, HTTPException, status

from app.config import settings


def require_internal(x_internal_key: str | None = Header(default=None)) -> None:
    if not x_internal_key or not secrets.compare_digest(x_internal_key, settings.internal_api_key):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Servicio interno: acceso denegado")
