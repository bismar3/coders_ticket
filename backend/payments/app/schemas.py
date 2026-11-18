import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ChargeIn(BaseModel):
    order_id: uuid.UUID
    method: str = Field(pattern="^(libelula|simulado)$")
    amount: float = Field(ge=0)
    currency: str = Field(default="BOB", pattern="^(BOB|USD)$")
    customer_email: EmailStr
    customer_name: str
    description: str = Field(max_length=200)
    concept: str = Field(max_length=200)
    quantity: int = Field(ge=1, le=6)
    unit_price: float = Field(ge=0)
    # Solo simulador
    card_number: str | None = Field(default=None, max_length=25)
    # Solo Libélula: a dónde vuelve el cliente después de pagar
    callback_url: str | None = None
    return_url: str | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    provider: str
    amount: float
    currency: str
    status: str
    message: str
    card_last4: str | None
    provider_transaction_id: str | None
    provider_reference: str | None
    payment_url: str | None
    qr_url: str | None
    payment_method: str | None
    paid_at: datetime | None
    created_at: datetime
