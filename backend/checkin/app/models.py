import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Checkin(Base):
    """Ingreso registrado. UNIQUE(ticket_code) garantiza que una entrada se use una sola vez."""

    __tablename__ = "checkins"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    ticket_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    porter_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    porter_name: Mapped[str] = mapped_column(String(120))
    holder_name: Mapped[str] = mapped_column(String(120), default="")
    sector_name: Mapped[str] = mapped_column(String(60), default="")
    seat_number: Mapped[int | None] = mapped_column(Integer)
    checked_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScanAttempt(Base):
    """Bitácora de cada escaneo (permitido o rechazado) para auditoría en puerta."""

    __tablename__ = "scan_attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    ticket_code: Mapped[str] = mapped_column(String(64), index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    porter_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    porter_name: Mapped[str] = mapped_column(String(120))
    allowed: Mapped[bool]
    reason: Mapped[str] = mapped_column(String(30))
    message: Mapped[str] = mapped_column(String(200))
    holder_name: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
