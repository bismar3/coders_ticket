import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class EventStatus(StrEnum):
    BORRADOR = "borrador"
    PUBLICADO = "publicado"
    CANCELADO = "cancelado"


class ReservationStatus(StrEnum):
    RESERVADA = "reservada"
    CONFIRMADA = "confirmada"
    LIBERADA = "liberada"


class Category(Base):
    """Tipos de evento administrados por el organizador (concierto, deporte, ...)."""

    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(160), default="")
    icon: Mapped[str] = mapped_column(String(40), default="sparkles")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organizer_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    organizer_name: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(160))
    subtitle: Mapped[str] = mapped_column(String(200), default="")
    category: Mapped[str] = mapped_column(ForeignKey("categories.slug", onupdate="CASCADE", ondelete="RESTRICT"), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    venue: Mapped[str] = mapped_column(String(160))
    city: Mapped[str] = mapped_column(String(80))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    image_url: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(20), default=EventStatus.BORRADOR, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sectors: Mapped[list["Sector"]] = relationship(
        back_populates="event", cascade="all, delete-orphan", order_by="Sector.sort_order", lazy="selectin"
    )


class Sector(Base):
    __tablename__ = "sectors"
    __table_args__ = (
        CheckConstraint("available >= 0", name="ck_sector_available_non_negative"),
        CheckConstraint("available <= capacity", name="ck_sector_available_le_capacity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    capacity: Mapped[int] = mapped_column(Integer)
    available: Mapped[int] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    event: Mapped[Event] = relationship(back_populates="sectors")


class Reservation(Base):
    """Cupos apartados por una orden. Permite reservar/liberar de forma idempotente."""

    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    sector_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sectors.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default=ReservationStatus.RESERVADA)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
