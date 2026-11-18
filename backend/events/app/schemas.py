import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field


# ---------- Categorías ----------

class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    description: str = Field(default="", max_length=160)
    icon: str = Field(default="sparkles", max_length=40, pattern="^[a-z0-9-]+$")
    is_active: bool = True
    sort_order: int = 0


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    description: str
    icon: str
    is_active: bool
    sort_order: int
    events_count: int = 0


# ---------- Eventos ----------

class SectorIn(BaseModel):
    id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=60)
    price: float = Field(ge=0)
    capacity: int = Field(ge=1, le=200_000)


class EventIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    subtitle: str = Field(default="", max_length=200)
    category: str = Field(min_length=2, max_length=40)
    description: str = ""
    venue: str = Field(min_length=2, max_length=160)
    city: str = Field(min_length=2, max_length=80)
    starts_at: datetime
    image_url: str = ""
    sectors: list[SectorIn] = Field(min_length=1, max_length=12)


class StatusIn(BaseModel):
    status: str = Field(pattern="^(borrador|publicado|cancelado)$")


class SectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    price: float
    capacity: int
    available: int

    @computed_field
    @property
    def sold(self) -> int:
        return self.capacity - self.available


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organizer_id: uuid.UUID
    organizer_name: str
    title: str
    subtitle: str
    category: str
    description: str
    venue: str
    city: str
    starts_at: datetime
    image_url: str
    status: str
    created_at: datetime
    sectors: list[SectorOut]

    @computed_field
    @property
    def min_price(self) -> float:
        return min((s.price for s in self.sectors), default=0)

    @computed_field
    @property
    def capacity(self) -> int:
        return sum(s.capacity for s in self.sectors)

    @computed_field
    @property
    def available(self) -> int:
        return sum(s.available for s in self.sectors)


class EventPage(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    size: int
    counts: dict[str, int]


# ---------- Contrato interno con orders ----------

class ReservationIn(BaseModel):
    order_id: uuid.UUID
    event_id: uuid.UUID
    sector_id: uuid.UUID
    quantity: int = Field(ge=1, le=6)


class ReservationOut(BaseModel):
    order_id: uuid.UUID
    status: str
    quantity: int
    event_id: uuid.UUID
    event_title: str
    event_image_url: str
    starts_at: datetime
    venue: str
    city: str
    organizer_id: uuid.UUID
    sector_id: uuid.UUID
    sector_name: str
    unit_price: float
