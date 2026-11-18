"""Tipos de evento: el organizador los crea, edita, ordena y desactiva sin tocar código."""
import logging
import re
import unicodedata
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, Event
from app.schemas import CategoryIn, CategoryOut
from app.security import CurrentUser, require_roles

log = logging.getLogger("events.categories")
router = APIRouter(prefix="/events/categories", tags=["categorías"])
organizer_only = require_roles("organizador")


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:40] or "categoria"


def _with_counts(db: Session, categories: list[Category]) -> list[CategoryOut]:
    counts = dict(db.execute(select(Event.category, func.count()).group_by(Event.category)).all())
    return [CategoryOut.model_validate(c).model_copy(update={"events_count": counts.get(c.slug, 0)}) for c in categories]


@router.get("", response_model=list[CategoryOut])
def list_categories(all: bool = Query(default=False, description="Incluir inactivas"), db: Session = Depends(get_db)):
    stmt = select(Category).order_by(Category.sort_order, Category.name)
    if not all:
        stmt = stmt.where(Category.is_active.is_(True))
    return _with_counts(db, db.scalars(stmt).all())


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryIn, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    slug = slugify(data.name)
    if db.scalar(select(Category).where(Category.slug == slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una categoría con ese nombre")
    category = Category(slug=slug, **data.model_dump())
    db.add(category)
    db.commit()
    log.info("%s creó la categoría %s", user.email, slug)
    return _with_counts(db, [category])[0]


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: uuid.UUID, data: CategoryIn, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    for field, value in data.model_dump().items():
        setattr(category, field, value)
    db.commit()
    log.info("%s actualizó la categoría %s", user.email, category.slug)
    return _with_counts(db, [category])[0]


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada")
    if db.scalar(select(func.count()).select_from(Event).where(Event.category == category.slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Tiene eventos asociados: desactívala en lugar de eliminarla")
    db.delete(category)
    db.commit()
    log.info("%s eliminó la categoría %s", user.email, category.slug)
