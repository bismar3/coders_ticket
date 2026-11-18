import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import JSON, Boolean, DateTime, Integer, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class OrderStatus(StrEnum):
    PENDIENTE = "pendiente"
    PAGADA = "pagada"
    RECHAZADA = "rechazada"
    CANCELADA = "cancelada"


class Order(Base):
    """Una compra. Guarda una copia de los datos del evento para no depender de events al listar."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.PENDIENTE, index=True)

    # Cliente
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(160))

    # Lo que pidió
    event_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    sector_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    quantity: Mapped[int] = mapped_column(Integer)

    # Copia de los datos del evento (se llena al reservar)
    organizer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    event_title: Mapped[str] = mapped_column(String(160), default="")
    event_image_url: Mapped[str] = mapped_column(String(500), default="")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    venue: Mapped[str] = mapped_column(String(160), default="")
    city: Mapped[str] = mapped_column(String(80), default="")
    sector_name: Mapped[str] = mapped_column(String(60), default="")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="BOB")

    # Pago
    payment_method: Mapped[str] = mapped_column(String(20))
    payment_url: Mapped[str | None] = mapped_column(String(500))
    payment_qr_url: Mapped[str | None] = mapped_column(String(500))
    payment_reference: Mapped[str | None] = mapped_column(String(80))
    failure_reason: Mapped[str | None] = mapped_column(String(300))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Pasos posteriores al pago
    tickets_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    ticket_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
