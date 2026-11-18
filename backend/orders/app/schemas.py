import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CreateOrderIn(BaseModel):
    event_id: uuid.UUID
    sector_id: uuid.UUID
    quantity: int = Field(ge=1, le=6, description="Máximo 6 entradas por compra")
    payment_method: str = Field(default="libelula", pattern="^(libelula|simulado)$")
    card_number: str | None = Field(default=None, max_length=25)

    @model_validator(mode="after")
    def card_required_for_simulator(self):
        if self.payment_method == "simulado" and not self.card_number:
            raise ValueError("El simulador necesita un número de tarjeta")
        return self


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    customer_name: str
    customer_email: str
    event_id: uuid.UUID
    event_title: str
    event_image_url: str
    starts_at: datetime | None
    venue: str
    city: str
    sector_id: uuid.UUID
    sector_name: str
    quantity: int
    unit_price: float
    total: float
    currency: str
    payment_method: str
    payment_url: str | None
    payment_qr_url: str | None
    payment_reference: str | None
    failure_reason: str | None
    paid_at: datetime | None
    tickets_issued: bool
    ticket_codes: list[str]
    notification_sent: bool
    created_at: datetime


class EventSalesOut(BaseModel):
    event_id: uuid.UUID
    event_title: str
    starts_at: datetime | None
    tickets_sold: int
    revenue: float
    orders_paid: int
    orders_rejected: int
    orders_pending: int
    last_sale_at: datetime | None


class DailyPoint(BaseModel):
    day: str
    revenue: float
    tickets: int


class OrganizerStatsOut(BaseModel):
    currency: str
    total_revenue: float
    total_tickets: int
    total_orders: int
    orders_rejected: int
    orders_pending: int
    unique_customers: int
    daily: list[DailyPoint]
    events: list[EventSalesOut]


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    event_id: uuid.UUID
    event_title: str
    customer_name: str
    customer_email: str
    failure_reason: str | None
    sector_name: str
    quantity: int
    total: float
    payment_method: str
    created_at: datetime
    paid_at: datetime | None


class SalesPage(BaseModel):
    items: list[SaleOut]
    total: int
    page: int
    size: int
    revenue: float
