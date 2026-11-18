import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import DateTime, Integer, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TicketStatus(StrEnum):
    VALIDA = "valida"
    ANULADA = "anulada"


class Ticket(Base):
    """Una entrada por asiento comprado, con un código único que va dentro del QR."""

    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    order_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    holder_name: Mapped[str] = mapped_column(String(120))
    holder_email: Mapped[str] = mapped_column(String(160))
    event_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    event_title: Mapped[str] = mapped_column(String(160))
    event_image_url: Mapped[str] = mapped_column(String(500), default="")
    venue: Mapped[str] = mapped_column(String(160))
    city: Mapped[str] = mapped_column(String(80))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sector_name: Mapped[str] = mapped_column(String(60))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    seat_number: Mapped[int] = mapped_column(Integer)
    seats_in_order: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default=TicketStatus.VALIDA)
    pdf_path: Mapped[str] = mapped_column(String(300))
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
