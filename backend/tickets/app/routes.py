import logging
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import database_ok, get_db
from app.models import Ticket, TicketStatus
from app.pdf import render_ticket
from app.schemas import IssueIn, TicketOut, ValidationOut
from app.security import CurrentUser, get_current_user, require_internal

log = logging.getLogger("tickets")
router = APIRouter()
internal = APIRouter(prefix="/internal/tickets", tags=["interno"], dependencies=[Depends(require_internal)])

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0/O ni 1/I para que se pueda dictar


def _new_code(db: Session) -> str:
    while True:
        raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(12))
        code = f"CT-{raw[:4]}-{raw[4:8]}-{raw[8:]}"
        if not db.scalar(select(Ticket.id).where(Ticket.code == code)):
            return code


def _normalize(code: str) -> str:
    return code.strip().upper()


@router.get("/health", tags=["health"])
def health():
    db = database_ok()
    storage = settings.storage_dir.exists()
    ok = db and storage
    body = {
        "service": settings.service_name,
        "status": "ok" if ok else "degraded",
        "checks": {"database": "ok" if db else "down", "storage": "ok" if storage else "missing"},
    }
    return JSONResponse(body, status_code=200 if ok else 503)


# ---------- Interno (orders y checkin) ----------

@internal.post("/issue", response_model=list[TicketOut], status_code=status.HTTP_201_CREATED)
def issue(data: IssueIn, db: Session = Depends(get_db)):
    """Genera una entrada (con su PDF) por cada asiento. Es idempotente por orden."""
    existing = db.scalars(select(Ticket).where(Ticket.order_id == data.order_id).order_by(Ticket.seat_number)).all()
    if existing:
        return existing

    tickets = []
    for seat in range(1, data.quantity + 1):
        code = _new_code(db)
        ticket = Ticket(
            code=code,
            order_id=data.order_id,
            user_id=data.user_id,
            holder_name=data.holder_name,
            holder_email=data.holder_email,
            event_id=data.event_id,
            event_title=data.event_title,
            event_image_url=data.event_image_url,
            venue=data.venue,
            city=data.city,
            starts_at=data.starts_at,
            sector_name=data.sector_name,
            unit_price=data.unit_price,
            seat_number=seat,
            seats_in_order=data.quantity,
            pdf_path=f"{data.order_id}/{code}.pdf",
        )
        render_ticket(ticket, settings.storage_dir / ticket.pdf_path)
        db.add(ticket)
        tickets.append(ticket)
    db.commit()
    log.info("Emitidas %s entradas para la orden %s (%s)", len(tickets), data.order_id, data.event_title)
    return tickets


@internal.get("/validate/{code}", response_model=ValidationOut)
def validate(code: str, db: Session = Depends(get_db)):
    code = _normalize(code)
    ticket = db.scalar(select(Ticket).where(Ticket.code == code))
    if not ticket:
        return ValidationOut(code=code, exists=False, valid=False)
    return ValidationOut(
        code=code,
        exists=True,
        valid=ticket.status == TicketStatus.VALIDA,
        status=ticket.status,
        event_id=ticket.event_id,
        event_title=ticket.event_title,
        sector_name=ticket.sector_name,
        holder_name=ticket.holder_name,
        seat_number=ticket.seat_number,
    )


# ---------- Cliente ----------

def _owned(db: Session, code: str, user: CurrentUser) -> Ticket:
    ticket = db.scalar(select(Ticket).where(Ticket.code == _normalize(code)))
    if not ticket or str(ticket.user_id) != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entrada no encontrada")
    return ticket


@router.get("/tickets/mine", response_model=list[TicketOut], tags=["entradas"])
def my_tickets(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Ticket).where(Ticket.user_id == uuid.UUID(user.id)).order_by(Ticket.starts_at, Ticket.seat_number)
    return db.scalars(stmt).all()


@router.get("/tickets/order/{order_id}", response_model=list[TicketOut], tags=["entradas"])
def tickets_by_order(order_id: uuid.UUID, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Ticket).where(Ticket.order_id == order_id, Ticket.user_id == uuid.UUID(user.id)).order_by(Ticket.seat_number)
    return db.scalars(stmt).all()


@router.get("/tickets/{code}/pdf", tags=["entradas"])
def download_pdf(code: str, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ticket = _owned(db, code, user)
    path = settings.storage_dir / ticket.pdf_path
    if not path.exists():  # si alguien borró el archivo, se vuelve a generar
        render_ticket(ticket, path)
    return FileResponse(path, media_type="application/pdf", filename=f"entrada-{ticket.code}.pdf")
