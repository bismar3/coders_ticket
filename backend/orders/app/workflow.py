"""Orquestación de la compra (sección 5 del documento de requerimientos).

1. Se crea la orden en estado *pendiente*.
2. events reserva los cupos  -> si no hay: la orden termina como *cancelada* ("Agotado").
3. payments cobra             -> rechazado: se liberan cupos y la orden queda *rechazada*.
                                 aprobado:  la orden pasa a *pagada*.
                                 pendiente: (Libélula) el cliente paga en la pasarela y luego se verifica.
4. tickets genera las entradas (PDF + QR).
5. notifications envía el correo. Si falla, la compra sigue siendo válida.
"""
import logging
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app import clients
from app.clients import ServiceError
from app.config import settings
from app.models import Order, OrderStatus
from app.schemas import CreateOrderIn
from app.security import CurrentUser

log = logging.getLogger("orders.workflow")
FREE_EVENT_CARD = "4000000000000002"


def _fail(db: Session, order: Order, new_status: str, reason: str) -> None:
    order.status = new_status
    order.failure_reason = reason
    db.commit()
    log.info("Orden %s -> %s (%s)", order.id, new_status, reason)


def _release(order: Order) -> None:
    try:
        clients.release_seats(order.id)
    except ServiceError as exc:  # el cupo quedaría retenido: se registra para revisarlo
        log.error("No se pudieron liberar los cupos de la orden %s: %s", order.id, exc)


def place_order(db: Session, user: CurrentUser, data: CreateOrderIn) -> Order:
    # Paso 1: la orden nace pendiente
    order = Order(
        user_id=uuid.UUID(user.id),
        customer_name=user.name,
        customer_email=user.email,
        event_id=data.event_id,
        sector_id=data.sector_id,
        quantity=data.quantity,
        payment_method=data.payment_method,
        currency=settings.currency,
        status=OrderStatus.PENDIENTE,
    )
    db.add(order)
    db.commit()
    log.info("Orden %s creada: %s x%s por %s", order.id, data.sector_id, data.quantity, user.email)

    # Paso 2: reservar cupos en events
    try:
        seat = clients.reserve_seats(order.id, data.event_id, data.sector_id, data.quantity)
    except ServiceError as exc:
        if exc.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_409_CONFLICT):
            _fail(db, order, OrderStatus.CANCELADA, exc.detail)
            raise HTTPException(status.HTTP_409_CONFLICT, exc.detail)
        _fail(db, order, OrderStatus.CANCELADA, "El servicio de eventos no está disponible")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No pudimos reservar tus entradas, intenta de nuevo")

    order.organizer_id = uuid.UUID(seat["organizer_id"])
    order.event_title = seat["event_title"]
    order.event_image_url = seat["event_image_url"]
    order.starts_at = datetime.fromisoformat(seat["starts_at"])
    order.venue = seat["venue"]
    order.city = seat["city"]
    order.sector_name = seat["sector_name"]
    order.unit_price = Decimal(str(seat["unit_price"]))
    order.total = order.unit_price * order.quantity
    db.commit()

    # Paso 3: cobrar en payments
    method, card = data.payment_method, data.card_number
    if order.total == 0:  # evento gratuito: se registra igual la transacción
        method, card = "simulado", FREE_EVENT_CARD
    callback = f"{settings.public_base_url}/api/orders/{order.id}/payment-callback"
    try:
        tx = clients.charge({
            "order_id": str(order.id),
            "method": method,
            "amount": float(order.total),
            "currency": order.currency,
            "customer_email": order.customer_email,
            "customer_name": order.customer_name,
            "description": f"coders_tick · {order.event_title}"[:200],
            "concept": f"{order.event_title} - Sector {order.sector_name}"[:200],
            "quantity": order.quantity,
            "unit_price": float(order.unit_price),
            "card_number": card,
            "callback_url": callback,
            "return_url": f"{settings.frontend_url}/compra/{order.id}",
        })
    except ServiceError as exc:
        _release(order)
        reason = exc.detail if exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY else "La pasarela de pago no está disponible"
        _fail(db, order, OrderStatus.RECHAZADA, reason)
        return order

    return apply_payment(db, order, tx)


def apply_payment(db: Session, order: Order, tx: dict) -> Order:
    """Aplica a la orden el estado que devolvió payments."""
    order.payment_reference = tx.get("provider_reference") or tx.get("provider_transaction_id") or tx.get("id")
    order.payment_url = tx.get("payment_url")
    order.payment_qr_url = tx.get("qr_url")
    db.commit()

    if tx["status"] == "aprobado":
        finalize(db, order)
    elif tx["status"] == "rechazado" and order.status == OrderStatus.PENDIENTE:
        _release(order)
        _fail(db, order, OrderStatus.RECHAZADA, tx.get("message") or "Pago rechazado")
    return order


def finalize(db: Session, order: Order) -> None:
    """Pasa la orden a pagada (una sola vez, aunque lleguen dos confirmaciones) y emite entradas y correo."""
    result = db.execute(
        update(Order)
        .where(Order.id == order.id, Order.status == OrderStatus.PENDIENTE)
        .values(status=OrderStatus.PAGADA, paid_at=datetime.now(UTC), failure_reason=None)
    )
    db.commit()
    db.refresh(order)
    if result.rowcount:
        log.info("Orden %s pagada (%s %s)", order.id, order.currency, order.total)
        try:
            clients.confirm_seats(order.id)
        except ServiceError as exc:
            log.warning("No se pudo confirmar la reserva de la orden %s: %s", order.id, exc)
    complete_post_payment(db, order)


def complete_post_payment(db: Session, order: Order) -> None:
    """Pasos 4 y 5. Se pueden reintentar: tickets es idempotente por orden."""
    if order.status != OrderStatus.PAGADA:
        return

    if not order.tickets_issued:
        try:
            tickets = clients.issue_tickets({
                "order_id": str(order.id),
                "user_id": str(order.user_id),
                "holder_name": order.customer_name,
                "holder_email": order.customer_email,
                "event_id": str(order.event_id),
                "event_title": order.event_title,
                "event_image_url": order.event_image_url,
                "venue": order.venue,
                "city": order.city,
                "starts_at": order.starts_at.isoformat(),
                "sector_name": order.sector_name,
                "unit_price": float(order.unit_price),
                "quantity": order.quantity,
            })
            order.ticket_codes = [t["code"] for t in tickets]
            order.tickets_issued = True
            db.commit()
        except ServiceError as exc:
            log.error("No se pudieron emitir las entradas de la orden %s (se reintentará): %s", order.id, exc)
            return

    if not order.notification_sent:
        try:
            clients.send_purchase_email({
                "to": order.customer_email,
                "name": order.customer_name,
                "order_id": str(order.id),
                "event_title": order.event_title,
                "starts_at": order.starts_at.isoformat(),
                "venue": order.venue,
                "city": order.city,
                "sector_name": order.sector_name,
                "quantity": order.quantity,
                "total": float(order.total),
                "currency": order.currency,
                "ticket_codes": order.ticket_codes,
                "tickets_url": f"{settings.frontend_url}/mis-entradas",
            })
            order.notification_sent = True
            db.commit()
        except ServiceError as exc:
            # Requerimiento 4.4: si el correo falla, la compra sigue siendo válida.
            log.warning("No se envió el correo de la orden %s (la compra sigue siendo válida): %s", order.id, exc)


def sync(db: Session, order: Order) -> Order:
    """Actualiza una orden: verifica el pago pendiente, vence las abandonadas o reintenta entradas/correo."""
    if order.status == OrderStatus.PENDIENTE and order.payment_url:
        try:
            tx = clients.verify_payment(order.id)
        except ServiceError as exc:
            log.warning("No se pudo verificar el pago de la orden %s: %s", order.id, exc)
            return order
        apply_payment(db, order, tx)
        if order.status == OrderStatus.PENDIENTE and _expired(order):
            cancel(db, order, "El tiempo para pagar expiró")
    elif order.status == OrderStatus.PAGADA:
        complete_post_payment(db, order)
    return order


def cancel(db: Session, order: Order, reason: str = "Cancelada por el cliente") -> Order:
    if order.status != OrderStatus.PENDIENTE:
        raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede cancelar una orden pendiente")
    try:
        tx = clients.verify_payment(order.id)  # por si pagó justo antes de cancelar
        if tx["status"] == "aprobado":
            apply_payment(db, order, tx)
            return order
        clients.cancel_payment(order.id)
    except ServiceError as exc:
        log.warning("payments no respondió al cancelar la orden %s: %s", order.id, exc)
    _release(order)
    _fail(db, order, OrderStatus.CANCELADA, reason)
    return order


def _expired(order: Order) -> bool:
    return datetime.now(UTC) - order.created_at > timedelta(minutes=settings.pending_expiry_minutes)
