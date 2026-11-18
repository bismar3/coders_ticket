import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import DateTime, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Provider(StrEnum):
    LIBELULA = "libelula"
    SIMULADO = "simulado"


class PaymentStatus(StrEnum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"


class Transaction(Base):
    """Una transacción por orden: la restricción UNIQUE en order_id impide cobrar dos veces."""

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(20))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="BOB")
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PENDIENTE, index=True)
    message: Mapped[str] = mapped_column(String(300), default="")
    customer_email: Mapped[str] = mapped_column(String(160))
    card_last4: Mapped[str | None] = mapped_column(String(4))
    provider_transaction_id: Mapped[str | None] = mapped_column(String(80))
    provider_reference: Mapped[str | None] = mapped_column(String(80))
    payment_url: Mapped[str | None] = mapped_column(String(500))
    qr_url: Mapped[str | None] = mapped_column(String(500))
    payment_method: Mapped[str | None] = mapped_column(String(80))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
