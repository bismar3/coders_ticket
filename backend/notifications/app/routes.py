import logging
import secrets
import smtplib
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from app import mailer, templates
from app.config import settings

log = logging.getLogger("notifications")
router = APIRouter()


def require_internal(x_internal_key: str | None = Header(default=None)) -> None:
    """notifications es interno: solo otros servicios con la clave compartida pueden usarlo."""
    if not x_internal_key or not secrets.compare_digest(x_internal_key, settings.internal_api_key):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Servicio interno: acceso denegado")


internal = APIRouter(prefix="/notifications", tags=["correos"], dependencies=[Depends(require_internal)])


class PurchaseMailIn(BaseModel):
    to: EmailStr
    name: str
    order_id: uuid.UUID
    event_title: str
    starts_at: datetime
    venue: str
    city: str
    sector_name: str
    quantity: int = Field(ge=1)
    total: float
    currency: str = "BOB"
    ticket_codes: list[str]
    tickets_url: str | None = None


class WelcomeMailIn(BaseModel):
    to: EmailStr
    name: str


class SentOut(BaseModel):
    sent: bool
    message_id: str


def _deliver(to: str, subject: str, html: str, text: str, images: dict[str, bytes] | None = None) -> SentOut:
    try:
        return SentOut(sent=True, message_id=mailer.send(to, subject, html, text, images))
    except (smtplib.SMTPException, OSError) as exc:
        log.error("No se pudo enviar el correo a %s: %s", to, exc)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "El servidor de correo no está disponible")


@router.get("/health", tags=["health"])
def health():
    smtp = mailer.smtp_reachable()
    body = {"service": settings.service_name, "status": "ok" if smtp else "degraded", "checks": {"smtp": "ok" if smtp else "down"}}
    return JSONResponse(body, status_code=200 if smtp else 503)


@internal.post("/purchase", response_model=SentOut)
def purchase_confirmation(data: PurchaseMailIn):
    url = data.tickets_url or f"{settings.frontend_url}/mis-entradas"
    subject, html, text = templates.purchase(
        data.name, data.event_title, data.starts_at, data.venue, data.city, data.sector_name,
        data.quantity, data.total, data.currency, data.ticket_codes, url,
    )
    images = {f"qr-{i}": mailer.qr_png(code) for i, code in enumerate(data.ticket_codes, start=1)}
    log.info("Confirmación de compra de la orden %s para %s (%s QR)", data.order_id, data.to, len(images))
    return _deliver(data.to, subject, html, text, images)


@internal.post("/welcome", response_model=SentOut)
def welcome(data: WelcomeMailIn):
    subject, html, text = templates.welcome(data.name)
    return _deliver(data.to, subject, html, text)
