import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IssueIn(BaseModel):
    order_id: uuid.UUID
    user_id: uuid.UUID
    holder_name: str
    holder_email: str
    event_id: uuid.UUID
    event_title: str
    event_image_url: str = ""
    venue: str
    city: str
    starts_at: datetime
    sector_name: str
    unit_price: float
    quantity: int = Field(ge=1, le=6)


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    order_id: uuid.UUID
    holder_name: str
    event_id: uuid.UUID
    event_title: str
    event_image_url: str
    venue: str
    city: str
    starts_at: datetime
    sector_name: str
    unit_price: float
    seat_number: int
    seats_in_order: int
    status: str
    issued_at: datetime


class ValidationOut(BaseModel):
    """Respuesta para checkin: ¿existe el código?, ¿a qué evento pertenece?, ¿es válido?"""

    code: str
    exists: bool
    valid: bool
    status: str | None = None
    event_id: uuid.UUID | None = None
    event_title: str | None = None
    sector_name: str | None = None
    holder_name: str | None = None
    seat_number: int | None = None
