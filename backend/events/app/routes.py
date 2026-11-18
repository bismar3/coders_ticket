"""Rutas públicas (cartelera) y rutas del organizador."""
import logging
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import database_ok, get_db
from app.models import Category, Event, EventStatus, Sector
from app.schemas import EventIn, EventOut, EventPage, StatusIn
from app.security import CurrentUser, get_optional_user, require_roles

log = logging.getLogger("events")
router = APIRouter()
organizer_only = require_roles("organizador")

ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@router.get("/health", tags=["health"])
def health():
    db = database_ok()
    body = {"service": settings.service_name, "status": "ok" if db else "degraded", "checks": {"database": "ok" if db else "down"}}
    return JSONResponse(body, status_code=200 if db else 503)


# ---------- Cartelera pública ----------

@router.get("/events", response_model=list[EventOut], tags=["cartelera"])
def list_published(
    q: str | None = Query(default=None, max_length=80),
    category: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Event).where(Event.status == EventStatus.PUBLICADO)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Event.title.ilike(like), Event.venue.ilike(like), Event.subtitle.ilike(like)))
    if category:
        stmt = stmt.where(Event.category == category)
    if city:
        stmt = stmt.where(Event.city.ilike(city))
    return db.scalars(stmt.order_by(Event.starts_at)).all()


@router.get("/events/mine", response_model=EventPage, tags=["organizador"])
def list_mine(
    q: str | None = Query(default=None, max_length=80),
    category: str | None = None,
    status_: str | None = Query(default=None, alias="status", pattern="^(borrador|publicado|cancelado)$"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    when: str | None = Query(default=None, pattern="^(upcoming|past)$"),
    sort: str = Query(default="date_asc", pattern="^(date_asc|date_desc|created_desc|title)$"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=12, ge=1, le=100),
    user: CurrentUser = Depends(organizer_only),
    db: Session = Depends(get_db),
):
    """Eventos del organizador con búsqueda, filtros y paginación (pensado para cientos de eventos)."""
    mine = Event.organizer_id == uuid.UUID(user.id)
    stmt = select(Event).where(mine)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Event.title.ilike(like), Event.venue.ilike(like), Event.city.ilike(like)))
    if category:
        stmt = stmt.where(Event.category == category)
    if date_from:
        stmt = stmt.where(Event.starts_at >= date_from)
    if date_to:
        stmt = stmt.where(Event.starts_at <= date_to)
    if when == "upcoming":
        stmt = stmt.where(Event.starts_at >= func.now())
    elif when == "past":
        stmt = stmt.where(Event.starts_at < func.now())
    # conteo por estado (antes de filtrar por estado, para las pestañas)
    sub = stmt.subquery()
    counts = dict(db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all())
    counts["todos"] = sum(counts.values())
    if status_:
        stmt = stmt.where(Event.status == status_)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = {
        "date_asc": Event.starts_at.asc(), "date_desc": Event.starts_at.desc(),
        "created_desc": Event.created_at.desc(), "title": Event.title.asc(),
    }[sort]
    items = db.scalars(stmt.order_by(order).offset((page - 1) * size).limit(size)).all()
    return EventPage(items=items, total=total, page=page, size=size, counts=counts)


@router.get("/events/mine/all", response_model=list[EventOut], tags=["organizador"])
def list_mine_all(user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    """Listado completo (liviano para selectores y reportes)."""
    return db.scalars(select(Event).where(Event.organizer_id == uuid.UUID(user.id)).order_by(Event.starts_at.desc())).all()


@router.get("/events/{event_id}", response_model=EventOut, tags=["cartelera"])
def get_event(event_id: uuid.UUID, user: CurrentUser | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado")
    is_owner = user is not None and str(event.organizer_id) == user.id
    # Los porteros necesitan ver eventos publicados; los borradores solo los ve su organizador.
    if event.status == EventStatus.BORRADOR and not is_owner:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado")
    return event


# ---------- Organizador ----------

def _check_category(db: Session, slug: str) -> None:
    category = db.scalar(select(Category).where(Category.slug == slug))
    if not category or not category.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Elige una categoría válida")


def _owned_event(db: Session, event_id: uuid.UUID, user: CurrentUser) -> Event:
    event = db.get(Event, event_id)
    if not event or str(event.organizer_id) != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento no encontrado")
    return event


@router.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED, tags=["organizador"])
def create_event(data: EventIn, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    _check_category(db, data.category)
    event = Event(
        organizer_id=uuid.UUID(user.id),
        organizer_name=user.name,
        **data.model_dump(exclude={"sectors"}),
        status=EventStatus.BORRADOR,
    )
    event.sectors = [
        Sector(name=s.name, price=Decimal(str(s.price)), capacity=s.capacity, available=s.capacity, sort_order=i)
        for i, s in enumerate(data.sectors)
    ]
    db.add(event)
    db.commit()
    log.info("Evento creado '%s' por %s", event.title, user.email)
    return event


@router.put("/events/{event_id}", response_model=EventOut, tags=["organizador"])
def update_event(event_id: uuid.UUID, data: EventIn, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    event = _owned_event(db, event_id, user)
    if data.category != event.category:
        _check_category(db, data.category)
    for field, value in data.model_dump(exclude={"sectors"}).items():
        setattr(event, field, value)

    current = {s.id: s for s in event.sectors}
    keep: list[Sector] = []
    for i, s in enumerate(data.sectors):
        sector = current.pop(s.id, None) if s.id else None
        if sector is None:
            sector = Sector(name=s.name, price=Decimal(str(s.price)), capacity=s.capacity, available=s.capacity)
        else:
            sold = sector.capacity - sector.available
            if s.capacity < sold:
                raise HTTPException(status.HTTP_409_CONFLICT, f"El sector '{sector.name}' ya vendió {sold} entradas; el cupo no puede ser menor")
            sector.available = s.capacity - sold
            sector.capacity = s.capacity
            sector.name = s.name
            sector.price = Decimal(str(s.price))
        sector.sort_order = i
        keep.append(sector)

    for removed in current.values():
        if removed.capacity != removed.available:
            raise HTTPException(status.HTTP_409_CONFLICT, f"No se puede eliminar '{removed.name}': ya tiene entradas vendidas")
    event.sectors = keep
    db.commit()
    db.refresh(event)
    log.info("Evento actualizado '%s'", event.title)
    return event


@router.patch("/events/{event_id}/status", response_model=EventOut, tags=["organizador"])
def change_status(event_id: uuid.UUID, data: StatusIn, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    event = _owned_event(db, event_id, user)
    event.status = data.status
    db.commit()
    log.info("Evento '%s' ahora está %s", event.title, data.status)
    return event


@router.post("/events/{event_id}/image", response_model=EventOut, tags=["organizador"])
async def upload_image(
    event_id: uuid.UUID, file: UploadFile = File(...), user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)
):
    event = _owned_event(db, event_id, user)
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Formato no soportado (usa JPG, PNG o WEBP)")
    content = await file.read()
    if len(content) > settings.max_image_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"La imagen supera {settings.max_image_mb} MB")
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{event.id}-{uuid.uuid4().hex[:8]}.{ext}"
    (settings.media_dir / filename).write_bytes(content)
    event.image_url = f"{settings.media_public_url}/{filename}"
    db.commit()
    log.info("Imagen subida para '%s': %s", event.title, filename)
    return event
