"""Validación local del JWT emitido por auth (sin llamar a auth) y de la clave interna entre servicios."""
import secrets

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    id: str
    name: str
    email: str
    role: str


def _decode(token: str) -> CurrentUser:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado")
    return CurrentUser(id=data["sub"], name=data["name"], email=data["email"], role=data["role"])


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> CurrentUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token de acceso")
    return _decode(creds.credentials)


def get_optional_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> CurrentUser | None:
    return _decode(creds.credentials) if creds else None


def require_roles(*roles: str):
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para esta acción")
        return user

    return dependency


def require_internal(x_internal_key: str | None = Header(default=None)) -> None:
    """Rutas internas: solo otros servicios (con la clave compartida) pueden llamarlas."""
    if not x_internal_key or not secrets.compare_digest(x_internal_key, settings.internal_api_key):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruta interna")
