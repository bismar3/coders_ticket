"""Rutas internas que usa orders para reservar, liberar y confirmar cupos.

La reserva descuenta el cupo con un UPDATE condicional (available >= cantidad), así
nunca se vende más que el cupo disponible aunque lleguen compras simultáneas.
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Event, EventStatus, Reservation, ReservationStatus, Sector
from app.schemas import ReservationIn, ReservationOut
from app.security import require_internal

log = logging.getLogger("events.reservations")
router = APIRouter(prefix="/internal/reservations", tags=["interno"], dependencies=[Depends(require_internal)])


def _to_out(db: Session, r: Reservation) -> ReservationOut:
    sector = db.get(Sector, r.sector_id)
    event = db.get(Event, r.event_id)
    return ReservationOut(
        order_id=r.order_id,
        status=r.status,
        quantity=r.quantity,
        event_id=event.id,
        event_title=event.title,
        event_image_url=event.image_url,
        starts_at=event.starts_at,
        venue=event.venue,
        city=event.city,
        organizer_id=event.organizer_id,
        sector_id=sector.id,
        sector_name=sector.name,
        unit_price=float(sector.price),
    )


def _get_by_order(db: Session, order_id: uuid.UUID, lock: bool = False) -> Reservation | None:
    stmt = select(Reservation).where(Reservation.order_id == order_id)
    if lock:
        stmt = stmt.with_for_update()
    return db.scalar(stmt)


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
def reserve(data: ReservationIn, db: Session = Depends(get_db)):
    existing = _get_by_order(db, data.order_id)
    if existing:  # reintento de la misma orden: no se descuenta dos veces
        return _to_out(db, existing)

    event = db.get(Event, data.event_id)
    if not event or event.status != EventStatus.PUBLICADO:
        raise HTTPException(status.HTTP_409_CONFLICT, "El evento no está disponible para la venta")

    result = db.execute(
        update(Sector)
        .where(Sector.id == data.sector_id, Sector.event_id == data.event_id, Sector.available >= data.quantity)
        .values(available=Sector.available - data.quantity)
        .returning(Sector.id)
    )
    if result.first() is None:
        db.rollback()
        if db.get(Sector, data.sector_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Sector no encontrado")
        log.info("Agotado: orden %s pidió %s en sector %s", data.order_id, data.quantity, data.sector_id)
        raise HTTPException(status.HTTP_409_CONFLICT, "Agotado")

    reservation = Reservation(order_id=data.order_id, event_id=data.event_id, sector_id=data.sector_id, quantity=data.quantity)
    db.add(reservation)
    try:
        db.commit()
    except IntegrityError:  # otra petición de la misma orden ganó la carrera
        db.rollback()
        return _to_out(db, _get_by_order(db, data.order_id))
    log.info("Reservados %s cupos para la orden %s", data.quantity, data.order_id)
    return _to_out(db, reservation)


@router.post("/{order_id}/release", response_model=ReservationOut)
def release(order_id: uuid.UUID, db: Session = Depends(get_db)):
    reservation = _get_by_order(db, order_id, lock=True)
    if not reservation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reserva no encontrada")
    if reservation.status == ReservationStatus.RESERVADA:
        db.execute(update(Sector).where(Sector.id == reservation.sector_id).values(available=Sector.available + reservation.quantity))
        reservation.status = ReservationStatus.LIBERADA
        db.commit()
        log.info("Liberados %s cupos de la orden %s", reservation.quantity, order_id)
    return _to_out(db, reservation)


@router.post("/{order_id}/confirm", response_model=ReservationOut)
def confirm(order_id: uuid.UUID, db: Session = Depends(get_db)):
    reservation = _get_by_order(db, order_id, lock=True)
    if not reservation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reserva no encontrada")
    if reservation.status == ReservationStatus.LIBERADA:
        raise HTTPException(status.HTTP_409_CONFLICT, "La reserva ya fue liberada")
    if reservation.status != ReservationStatus.CONFIRMADA:
        reservation.status = ReservationStatus.CONFIRMADA
        db.commit()
        log.info("Reserva confirmada para la orden %s", order_id)
    return _to_out(db, reservation)
