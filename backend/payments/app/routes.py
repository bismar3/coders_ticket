import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import libelula
from app.config import settings
from app.db import database_ok, get_db
from app.models import PaymentStatus, Provider, Transaction
from app.schemas import ChargeIn, TransactionOut
from app.security import require_internal

log = logging.getLogger("payments")
router = APIRouter()
internal = APIRouter(prefix="/payments", tags=["pagos"], dependencies=[Depends(require_internal)])


@router.get("/health", tags=["health"])
def health():
    db = database_ok()
    body = {
        "service": settings.service_name,
        "status": "ok" if db else "degraded",
        "checks": {"database": "ok" if db else "down", "libelula": "configured" if settings.libelula_appkey else "missing-appkey"},
    }
    return JSONResponse(body, status_code=200 if db else 503)


def _by_order(db: Session, order_id: uuid.UUID) -> Transaction | None:
    return db.scalar(select(Transaction).where(Transaction.order_id == order_id))


def _simulate(data: ChargeIn) -> Transaction:
    digits = "".join(ch for ch in (data.card_number or "") if ch.isdigit())
    if len(digits) < 12:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Número de tarjeta inválido")
    rejected = digits.endswith(settings.simulated_reject_suffix)
    return Transaction(
        order_id=data.order_id,
        provider=Provider.SIMULADO,
        amount=Decimal(str(data.amount)),
        currency=data.currency,
        customer_email=data.customer_email,
        card_last4=digits[-4:],
        status=PaymentStatus.RECHAZADO if rejected else PaymentStatus.APROBADO,
        message="Fondos insuficientes (tarjeta de prueba rechazada)" if rejected else "Pago aprobado",
        payment_method="Tarjeta (simulador)",
        paid_at=None if rejected else datetime.now(UTC),
    )


def _register_libelula(data: ChargeIn) -> Transaction:
    if not settings.libelula_appkey:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Libélula no está configurada")
    try:
        result = libelula.register_debt(
            order_id=data.order_id,
            email=data.customer_email,
            customer_name=data.customer_name,
            description=data.description,
            concept=data.concept,
            quantity=data.quantity,
            unit_price=data.unit_price,
            currency=data.currency,
            callback_url=data.callback_url,
            return_url=data.return_url,
        )
    except libelula.LibelulaError as exc:
        log.error("Libélula falló para la orden %s: %s", data.order_id, exc)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    return Transaction(
        order_id=data.order_id,
        provider=Provider.LIBELULA,
        amount=Decimal(str(data.amount)),
        currency=data.currency,
        customer_email=data.customer_email,
        status=PaymentStatus.PENDIENTE,
        message="Esperando el pago en Libélula",
        provider_transaction_id=result.get("id_transaccion"),
        provider_reference=result.get("codigo_recaudacion"),
        payment_url=result.get("url_pasarela_pagos"),
        qr_url=result.get("qr_simple_url"),
    )


@internal.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def charge(data: ChargeIn, db: Session = Depends(get_db)):
    """Inicia el cobro de una orden. Si la orden ya tiene transacción, la devuelve sin cobrar de nuevo."""
    existing = _by_order(db, data.order_id)
    if existing:
        log.info("Solicitud repetida para la orden %s: se devuelve la transacción existente", data.order_id)
        return existing

    tx = _simulate(data) if data.method == Provider.SIMULADO else _register_libelula(data)
    db.add(tx)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return _by_order(db, data.order_id)
    log.info("Transacción %s: orden %s, %s %s, %s, estado %s", tx.id, tx.order_id, tx.amount, tx.currency, tx.provider, tx.status)
    return tx


@internal.post("/{order_id}/verify", response_model=TransactionOut)
def verify(order_id: uuid.UUID, db: Session = Depends(get_db)):
    """Consulta a Libélula si la deuda de la orden ya fue pagada."""
    tx = _by_order(db, order_id)
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La orden no tiene transacción")
    if tx.provider != Provider.LIBELULA or tx.status != PaymentStatus.PENDIENTE:
        return tx
    try:
        debt = libelula.query_debt(order_id)
    except libelula.LibelulaError as exc:
        log.warning("No se pudo verificar la orden %s: %s", order_id, exc)
        return tx

    if debt.get("pagado") and not debt.get("pago_anulado"):
        tx.status = PaymentStatus.APROBADO
        tx.message = "Pago confirmado por Libélula"
        tx.payment_method = debt.get("metodo_pago") or debt.get("forma_pago")
        tx.paid_at = datetime.now(UTC)
        log.info("Orden %s pagada en Libélula (%s)", order_id, tx.payment_method)
    elif debt.get("deuda_expirada") or debt.get("pago_anulado"):
        tx.status = PaymentStatus.RECHAZADO
        tx.message = "La deuda expiró o el pago fue anulado"
        log.info("Orden %s: deuda expirada/anulada en Libélula", order_id)
    db.commit()
    return tx


@internal.post("/{order_id}/cancel", response_model=TransactionOut)
def cancel(order_id: uuid.UUID, db: Session = Depends(get_db)):
    """Marca como rechazada una transacción que sigue pendiente (el cliente abandonó el pago)."""
    tx = _by_order(db, order_id)
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La orden no tiene transacción")
    if tx.status == PaymentStatus.PENDIENTE:
        tx.status = PaymentStatus.RECHAZADO
        tx.message = "Pago cancelado por el cliente"
        db.commit()
    return tx


@internal.get("/{order_id}", response_model=TransactionOut)
def get_by_order(order_id: uuid.UUID, db: Session = Depends(get_db)):
    tx = _by_order(db, order_id)
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La orden no tiene transacción")
    return tx
