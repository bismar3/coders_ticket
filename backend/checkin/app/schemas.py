import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScanIn(BaseModel):
    code: str = Field(min_length=3, max_length=64)
    event_id: uuid.UUID


class ScanOut(BaseModel):
    allowed: bool
    reason: str  # ok | invalid | other_event | already_used | annulled | unavailable
    message: str
    code: str
    event_title: str | None = None
    holder_name: str | None = None
    sector_name: str | None = None
    seat_number: int | None = None
    checked_in_at: datetime | None = None
    first_checkin_at: datetime | None = None
    first_checkin_by: str | None = None


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_code: str
    allowed: bool
    reason: str
    message: str
    holder_name: str
    porter_name: str
    created_at: datetime


class PorterStats(BaseModel):
    porter_id: uuid.UUID
    porter_name: str
    allowed: int
    rejected: int


class StatsOut(BaseModel):
    event_id: uuid.UUID
    entered: int
    rejected: int
    by_sector: dict[str, int]
    by_reason: dict[str, int]
    by_porter: list[PorterStats]
    mine: dict[str, int]
    recent: list[AttemptOut]


class AttemptPage(BaseModel):
    items: list[AttemptOut]
    total: int
    page: int
    size: int


class EventReport(BaseModel):
    """Resumen de puerta de un evento (para los reportes del organizador)."""

    event_id: uuid.UUID
    entered: int
    attempts: int
    rejected: int
    by_reason: dict[str, int]
    by_sector: dict[str, int]
    by_porter: list[PorterStats]
    by_hour: dict[int, int]  # hora local (0-23) -> ingresos
    first_at: datetime | None = None
    last_at: datetime | None = None


class ReportOut(BaseModel):
    events: list[EventReport]
