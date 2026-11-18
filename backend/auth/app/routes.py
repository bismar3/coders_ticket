import logging
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import database_ok, get_db
from app.models import Role, User
from app.schemas import (
    LoginIn, PasswordIn, ProfileIn, RegisterIn, StaffIn, StaffPage, StaffUpdateIn, TokenOut, UserOut,
)
from app.security import CurrentUser, create_token, get_current_user, hash_password, verify_password

log = logging.getLogger("auth")
router = APIRouter()


def _token_for(user: User) -> TokenOut:
    token = create_token(str(user.id), user.name, user.email, user.role)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


def _send_welcome(user: User) -> None:
    """Correo de bienvenida opcional. Un fallo aquí nunca bloquea el registro."""
    if not settings.notifications_url:
        return
    try:
        httpx.post(
            f"{settings.notifications_url}/notifications/welcome",
            json={"to": user.email, "name": user.name},
            headers={"X-Internal-Key": settings.internal_api_key},
            timeout=settings.http_timeout_seconds,
        ).raise_for_status()
    except httpx.HTTPError as exc:
        log.warning("No se pudo enviar el correo de bienvenida a %s: %s", user.email, exc)


def _me(db: Session, current: CurrentUser) -> User:
    user = db.get(User, uuid.UUID(current.id))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Cuenta no disponible")
    return user


def _require_organizer(current: CurrentUser) -> None:
    if current.role != Role.ORGANIZADOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un organizador puede gestionar el personal")


@router.get("/health", tags=["health"])
def health():
    db = database_ok()
    body = {"service": settings.service_name, "status": "ok" if db else "degraded", "checks": {"database": "ok" if db else "down"}}
    return JSONResponse(body, status_code=200 if db else 503)


# ---------- Acceso ----------

@router.post("/auth/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED, tags=["auth"])
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password), role=Role.CLIENTE,
                last_login_at=datetime.now(UTC))
    db.add(user)
    db.commit()
    log.info("Nuevo cliente registrado: %s", email)
    _send_welcome(user)
    return _token_for(user)


@router.post("/auth/login", response_model=TokenOut, tags=["auth"])
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        log.info("Intento de inicio de sesión fallido: %s", data.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está desactivada. Habla con el organizador.")
    user.last_login_at = datetime.now(UTC)
    db.commit()
    log.info("Inicio de sesión: %s (%s)", user.email, user.role)
    return _token_for(user)


# ---------- Perfil propio (todos los roles) ----------

@router.get("/auth/me", response_model=UserOut, tags=["perfil"])
def me(current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return _me(db, current)


@router.put("/auth/me", response_model=TokenOut, tags=["perfil"])
def update_me(data: ProfileIn, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Actualiza el perfil y devuelve un token nuevo (el nombre viaja dentro del JWT)."""
    user = _me(db, current)
    user.name = data.name.strip()
    user.phone = data.phone or None
    user.document_id = data.document_id or None
    db.commit()
    log.info("Perfil actualizado: %s", user.email)
    return _token_for(user)


@router.post("/auth/me/password", status_code=status.HTTP_204_NO_CONTENT, tags=["perfil"])
def change_password(data: PasswordIn, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _me(db, current)
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contraseña actual no es correcta")
    if data.current_password == data.new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La nueva contraseña debe ser distinta")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    log.info("Contraseña cambiada: %s", user.email)


# ---------- Personal (solo organizador) ----------

@router.get("/auth/staff", response_model=StaffPage, tags=["personal"])
def list_staff(
    role: str | None = Query(default=None, pattern="^(organizador|portero)$"),
    q: str | None = Query(default=None, max_length=80),
    active: bool | None = None,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_organizer(current)
    base = select(User).where(User.role != Role.CLIENTE)
    counts = dict(db.execute(select(User.role, func.count()).where(User.role != Role.CLIENTE).group_by(User.role)).all())
    counts["clientes"] = db.scalar(select(func.count()).select_from(User).where(User.role == Role.CLIENTE)) or 0
    if role:
        base = base.where(User.role == role)
    if active is not None:
        base = base.where(User.is_active.is_(active))
    if q:
        like = f"%{q.strip()}%"
        base = base.where(or_(User.name.ilike(like), User.email.ilike(like), User.document_id.ilike(like)))
    items = db.scalars(base.order_by(User.role, User.name)).all()
    return StaffPage(items=items, total=len(items), counts=counts)


@router.post("/auth/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["personal"])
def create_staff(data: StaffIn, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_organizer(current)
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo")
    user = User(
        name=data.name.strip(), email=email, password_hash=hash_password(data.password), role=data.role,
        phone=data.phone, document_id=data.document_id, position=data.position, created_by=uuid.UUID(current.id),
    )
    db.add(user)
    db.commit()
    log.info("%s creó la cuenta %s con rol %s", current.email, email, data.role)
    return user


@router.patch("/auth/staff/{user_id}", response_model=UserOut, tags=["personal"])
def update_staff(user_id: uuid.UUID, data: StaffUpdateIn, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_organizer(current)
    user = db.get(User, user_id)
    if not user or user.role == Role.CLIENTE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personal no encontrado")
    if str(user.id) == current.id and data.is_active is False:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes desactivar tu propia cuenta")
    for field in ("name", "phone", "document_id", "position", "is_active"):
        value = getattr(data, field)
        if value is not None:
            setattr(user, field, value)
    if data.new_password:
        user.password_hash = hash_password(data.new_password)
    db.commit()
    log.info("%s actualizó la cuenta %s", current.email, user.email)
    return user
