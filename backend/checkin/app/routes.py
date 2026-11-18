import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import database_ok, get_db
from app.models import Checkin, ScanAttempt
from app.schemas import AttemptOut, AttemptPage, EventReport, PorterStats, ReportOut, ScanIn, ScanOut, StatsOut
from app.security import CurrentUser, require_roles

log = logging.getLogger("checkin")
router = APIRouter()
door_staff = require_roles("portero", "organizador")  # ver estadísticas
porter_only = require_roles("portero")  # escanear y validar: solo el personal de puerta
organizer_only = require_roles("organizador")  # reportes


@router.get("/health", tags=["health"])
def health():
    db = database_ok()
    body = {"service": settings.service_name, "status": "ok" if db else "degraded", "checks": {"database": "ok" if db else "down"}}
    return JSONResponse(body, status_code=200 if db else 503)


def _validate_with_tickets(code: str) -> dict | None:
    """Pregunta a tickets si el código existe, a qué evento pertenece y si es válido."""
    try:
        response = httpx.get(
            f"{settings.tickets_url}/internal/tickets/validate/{code}",
            headers={"X-Internal-Key": settings.internal_api_key},
            timeout=settings.http_timeout_seconds,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        log.error("tickets no respondió al validar %s: %s", code, exc)
        return None


def _record(db: Session, data: ScanIn, user: CurrentUser, result: ScanOut) -> ScanOut:
    db.add(ScanAttempt(
        ticket_code=result.code, event_id=data.event_id, porter_id=uuid.UUID(user.id), porter_name=user.name,
        allowed=result.allowed, reason=result.reason, message=result.message, holder_name=result.holder_name or "",
    ))
    db.commit()
    log.info("Escaneo %s en evento %s por %s: %s", result.code, data.event_id, user.name, result.reason)
    return result


@router.post("/checkin", response_model=ScanOut, tags=["puerta"])
def scan(data: ScanIn, user: CurrentUser = Depends(porter_only), db: Session = Depends(get_db)):
    code = data.code.strip().upper()
    info = _validate_with_tickets(code)
    if info is None:
        # No se registra intento: el fallo es del sistema, no de la entrada.
        return ScanOut(allowed=False, reason="unavailable", message="No se pudo validar: intenta de nuevo", code=code)

    base = {"code": code, "event_title": info.get("event_title"), "holder_name": info.get("holder_name"),
            "sector_name": info.get("sector_name"), "seat_number": info.get("seat_number")}

    if not info["exists"]:
        return _record(db, data, user, ScanOut(allowed=False, reason="invalid", message="Código inválido", code=code))
    if info["event_id"] != str(data.event_id):
        return _record(db, data, user, ScanOut(allowed=False, reason="other_event", message=f"Entrada de otro evento: {info['event_title']}", **base))
    if not info["valid"]:
        return _record(db, data, user, ScanOut(allowed=False, reason="annulled", message="Entrada anulada", **base))

    entry = Checkin(
        ticket_code=code, event_id=data.event_id, porter_id=uuid.UUID(user.id), porter_name=user.name,
        holder_name=info.get("holder_name") or "", sector_name=info.get("sector_name") or "", seat_number=info.get("seat_number"),
    )
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        first = db.scalar(select(Checkin).where(Checkin.ticket_code == code))
        when = first.checked_in_at.astimezone().strftime("%H:%M:%S") if first else "?"
        return _record(db, data, user, ScanOut(
            allowed=False, reason="already_used", message=f"Entrada ya utilizada (primer ingreso a las {when})",
            first_checkin_at=first.checked_in_at if first else None, first_checkin_by=first.porter_name if first else None, **base,
        ))
    db.refresh(entry)
    return _record(db, data, user, ScanOut(allowed=True, reason="ok", message="Ingreso permitido", checked_in_at=entry.checked_in_at, **base))


@router.get("/checkin/events/{event_id}/stats", response_model=StatsOut, tags=["puerta"])
def event_stats(event_id: uuid.UUID, limit: int = Query(default=8, le=50), user: CurrentUser = Depends(door_staff),
                db: Session = Depends(get_db)):
    of_event = ScanAttempt.event_id == event_id
    entered = db.scalar(select(func.count()).select_from(Checkin).where(Checkin.event_id == event_id)) or 0
    rejected = db.scalar(select(func.count()).select_from(ScanAttempt).where(of_event, ScanAttempt.allowed.is_(False))) or 0
    by_sector = dict(db.execute(
        select(Checkin.sector_name, func.count()).where(Checkin.event_id == event_id).group_by(Checkin.sector_name)
    ).all())
    by_reason = dict(db.execute(select(ScanAttempt.reason, func.count()).where(of_event).group_by(ScanAttempt.reason)).all())
    by_porter = [
        PorterStats(porter_id=pid, porter_name=name, allowed=ok or 0, rejected=bad or 0)
        for pid, name, ok, bad in db.execute(
            select(
                ScanAttempt.porter_id, func.max(ScanAttempt.porter_name),
                func.sum(case((ScanAttempt.allowed.is_(True), 1), else_=0)),
                func.sum(case((ScanAttempt.allowed.is_(False), 1), else_=0)),
            ).where(of_event).group_by(ScanAttempt.porter_id)
        )
    ]
    mine_rows = dict(db.execute(
        select(ScanAttempt.allowed, func.count())
        .where(of_event, ScanAttempt.porter_id == uuid.UUID(user.id)).group_by(ScanAttempt.allowed)
    ).all())
    recent = db.scalars(select(ScanAttempt).where(of_event).order_by(ScanAttempt.created_at.desc()).limit(limit)).all()
    return StatsOut(
        event_id=event_id, entered=entered, rejected=rejected, by_sector=by_sector, by_reason=by_reason,
        by_porter=sorted(by_porter, key=lambda p: -(p.allowed + p.rejected)),
        mine={"allowed": mine_rows.get(True, 0), "rejected": mine_rows.get(False, 0)},
        recent=[AttemptOut.model_validate(a) for a in recent],
    )


@router.get("/checkin/events/{event_id}/attempts", response_model=AttemptPage, tags=["puerta"])
def event_attempts(
    event_id: uuid.UUID,
    result: str | None = Query(default=None, pattern="^(allowed|rejected)$"),
    reason: str | None = Query(default=None, pattern="^(ok|invalid|other_event|already_used|annulled)$"),
    porter_id: uuid.UUID | None = None,
    q: str | None = Query(default=None, max_length=64),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    user: CurrentUser = Depends(door_staff),
    db: Session = Depends(get_db),
):
    """Historial de escaneos de un evento, filtrable por resultado, motivo, portero o texto."""
    stmt = select(ScanAttempt).where(ScanAttempt.event_id == event_id)
    if result:
        stmt = stmt.where(ScanAttempt.allowed.is_(result == "allowed"))
    if reason:
        stmt = stmt.where(ScanAttempt.reason == reason)
    if porter_id:
        stmt = stmt.where(ScanAttempt.porter_id == porter_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(ScanAttempt.ticket_code.ilike(like), ScanAttempt.holder_name.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(stmt.order_by(ScanAttempt.created_at.desc()).offset((page - 1) * size).limit(size)).all()
    return AttemptPage(items=items, total=total, page=page, size=size)


@router.get("/checkin/stats", response_model=dict[str, int], tags=["puerta"])
def entries_per_event(user: CurrentUser = Depends(door_staff), db: Session = Depends(get_db)):
    """Cuántas personas ingresaron a cada evento (event_id -> ingresos)."""
    rows = db.execute(select(Checkin.event_id, func.count()).group_by(Checkin.event_id)).all()
    return {str(event_id): count for event_id, count in rows}



@router.get("/checkin/report", response_model=ReportOut, tags=["reportes"])
def report(user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    """Resumen de puerta por evento: ingresos, rechazos por motivo, sectores, porteros y horas pico.

    La web agrupa y filtra (por categoría, fecha o evento) sobre estos datos.
    """
    rows: dict[uuid.UUID, dict] = {}

    def row(event_id):
        return rows.setdefault(event_id, {
            "event_id": event_id, "entered": 0, "attempts": 0, "rejected": 0, "by_reason": {}, "by_sector": {},
            "by_porter": [], "by_hour": {}, "first_at": None, "last_at": None,
        })

    for event_id, n in db.execute(select(Checkin.event_id, func.count()).group_by(Checkin.event_id)):
        row(event_id)["entered"] = n
    for event_id, sector, n in db.execute(
        select(Checkin.event_id, Checkin.sector_name, func.count()).group_by(Checkin.event_id, Checkin.sector_name)
    ):
        row(event_id)["by_sector"][sector or "Sin sector"] = n
    hour = func.extract("hour", func.timezone(settings.timezone, Checkin.checked_in_at))
    for event_id, h, n in db.execute(select(Checkin.event_id, hour, func.count()).group_by(Checkin.event_id, hour)):
        row(event_id)["by_hour"][int(h)] = n
    for event_id, reason, n in db.execute(
        select(ScanAttempt.event_id, ScanAttempt.reason, func.count()).group_by(ScanAttempt.event_id, ScanAttempt.reason)
    ):
        r = row(event_id)
        r["by_reason"][reason] = n
        r["attempts"] += n
        if reason != "ok":
            r["rejected"] += n
    for event_id, first, last in db.execute(
        select(ScanAttempt.event_id, func.min(ScanAttempt.created_at), func.max(ScanAttempt.created_at)).group_by(ScanAttempt.event_id)
    ):
        row(event_id).update(first_at=first, last_at=last)
    for event_id, pid, name, ok, bad in db.execute(
        select(
            ScanAttempt.event_id, ScanAttempt.porter_id, func.max(ScanAttempt.porter_name),
            func.sum(case((ScanAttempt.allowed.is_(True), 1), else_=0)),
            func.sum(case((ScanAttempt.allowed.is_(False), 1), else_=0)),
        ).group_by(ScanAttempt.event_id, ScanAttempt.porter_id)
    ):
        row(event_id)["by_porter"].append(PorterStats(porter_id=pid, porter_name=name, allowed=ok or 0, rejected=bad or 0))
    return ReportOut(events=[EventReport(**r) for r in rows.values()])
