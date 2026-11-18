import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import cast, func, or_, select
from sqlalchemy.types import Date
from sqlalchemy.orm import Session

from app import workflow
from app.config import settings
from app.db import database_ok, get_db
from app.models import Order, OrderStatus
from app.schemas import CreateOrderIn, DailyPoint, EventSalesOut, OrderOut, OrganizerStatsOut, SaleOut, SalesPage
from app.security import CurrentUser, require_roles

log = logging.getLogger("orders")
router = APIRouter()
client_only = require_roles("cliente")
organizer_only = require_roles("organizador")


@router.get("/health", tags=["health"])
def health():
    db = database_ok()
    body = {"service": settings.service_name, "status": "ok" if db else "degraded", "checks": {"database": "ok" if db else "down"}}
    return JSONResponse(body, status_code=200 if db else 503)


def _own_order(db: Session, order_id: uuid.UUID, user: CurrentUser) -> Order:
    order = db.get(Order, order_id)
    if not order or str(order.user_id) != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Orden no encontrada")
    return order


# ---------- Cliente ----------

@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED, tags=["compras"])
def create_order(data: CreateOrderIn, user: CurrentUser = Depends(client_only), db: Session = Depends(get_db)):
    if data.quantity > settings.max_tickets_per_order:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Máximo {settings.max_tickets_per_order} entradas por compra")
    return workflow.place_order(db, user, data)


@router.get("/orders/mine", response_model=list[OrderOut], tags=["compras"])
def my_orders(user: CurrentUser = Depends(client_only), db: Session = Depends(get_db)):
    stmt = select(Order).where(Order.user_id == uuid.UUID(user.id)).order_by(Order.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/orders/{order_id}", response_model=OrderOut, tags=["compras"])
def get_order(order_id: uuid.UUID, user: CurrentUser = Depends(client_only), db: Session = Depends(get_db)):
    return _own_order(db, order_id, user)


@router.post("/orders/{order_id}/sync", response_model=OrderOut, tags=["compras"])
def sync_order(order_id: uuid.UUID, user: CurrentUser = Depends(client_only), db: Session = Depends(get_db)):
    """La web lo consulta mientras el cliente paga en Libélula."""
    return workflow.sync(db, _own_order(db, order_id, user))


@router.post("/orders/{order_id}/cancel", response_model=OrderOut, tags=["compras"])
def cancel_order(order_id: uuid.UUID, user: CurrentUser = Depends(client_only), db: Session = Depends(get_db)):
    return workflow.cancel(db, _own_order(db, order_id, user))


@router.api_route("/orders/{order_id}/payment-callback", methods=["GET", "POST"], include_in_schema=False)
def payment_callback(order_id: uuid.UUID, db: Session = Depends(get_db)):
    """Libélula redirige aquí al cliente. No confiamos en los parámetros: se verifica el pago con payments."""
    order = db.get(Order, order_id)
    if order:
        log.info("Callback de pago recibido para la orden %s", order_id)
        workflow.sync(db, order)
    return RedirectResponse(f"{settings.frontend_url}/compra/{order_id}", status_code=status.HTTP_303_SEE_OTHER)


# ---------- Organizador ----------

@router.get("/orders/stats/organizer", response_model=OrganizerStatsOut, tags=["organizador"])
def organizer_stats(user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    paid = Order.status == OrderStatus.PAGADA
    stmt = (
        select(
            Order.event_id,
            func.max(Order.event_title),
            func.max(Order.starts_at),
            func.coalesce(func.sum(Order.quantity).filter(paid), 0),
            func.coalesce(func.sum(Order.total).filter(paid), 0),
            func.count().filter(paid),
            func.count().filter(Order.status == OrderStatus.RECHAZADA),
            func.count().filter(Order.status == OrderStatus.PENDIENTE),
            func.max(Order.paid_at),
        )
        .where(Order.organizer_id == uuid.UUID(user.id))
        .group_by(Order.event_id)
    )
    events = [
        EventSalesOut(
            event_id=row[0], event_title=row[1], starts_at=row[2], tickets_sold=row[3], revenue=float(row[4]),
            orders_paid=row[5], orders_rejected=row[6], orders_pending=row[7], last_sale_at=row[8],
        )
        for row in db.execute(stmt)
    ]
    events.sort(key=lambda e: e.revenue, reverse=True)

    # Serie de los últimos 14 días (hora de Bolivia) para el gráfico de ingresos
    mine = Order.organizer_id == uuid.UUID(user.id)
    since = datetime.now(UTC) - timedelta(days=14)
    day = cast(func.timezone("America/La_Paz", Order.paid_at), Date)
    rows = {
        str(d): (float(r or 0), int(t or 0))
        for d, r, t in db.execute(
            select(day, func.sum(Order.total), func.sum(Order.quantity)).where(mine, paid, Order.paid_at >= since).group_by(day)
        )
    }
    today = (datetime.now(UTC) - timedelta(hours=4)).date()
    daily = []
    for i in range(13, -1, -1):
        key = (today - timedelta(days=i)).isoformat()
        revenue, tickets = rows.get(key, (0.0, 0))
        daily.append(DailyPoint(day=key, revenue=revenue, tickets=tickets))

    customers = db.scalar(select(func.count(func.distinct(Order.user_id))).where(mine, paid)) or 0
    return OrganizerStatsOut(
        currency=settings.currency,
        total_revenue=sum(e.revenue for e in events),
        total_tickets=sum(e.tickets_sold for e in events),
        total_orders=sum(e.orders_paid for e in events),
        orders_rejected=sum(e.orders_rejected for e in events),
        orders_pending=sum(e.orders_pending for e in events),
        unique_customers=customers,
        daily=daily,
        events=events,
    )


@router.get("/orders/stats/sales", response_model=SalesPage, tags=["organizador"])
def organizer_sales(
    event_id: uuid.UUID | None = None,
    status_: str | None = Query(default=None, alias="status", pattern="^(pendiente|pagada|rechazada|cancelada)$"),
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=15, ge=1, le=100),
    user: CurrentUser = Depends(organizer_only),
    db: Session = Depends(get_db),
):
    """Todas las ventas del organizador con filtros y paginación."""
    stmt = select(Order).where(Order.organizer_id == uuid.UUID(user.id))
    if event_id:
        stmt = stmt.where(Order.event_id == event_id)
    if status_:
        stmt = stmt.where(Order.status == status_)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Order.customer_name.ilike(like), Order.customer_email.ilike(like), Order.event_title.ilike(like)))
    sub = stmt.subquery()
    total = db.scalar(select(func.count()).select_from(sub)) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(sub.c.total), 0)).where(sub.c.status == OrderStatus.PAGADA)) or 0
    items = db.scalars(stmt.order_by(Order.created_at.desc()).offset((page - 1) * size).limit(size)).all()
    return SalesPage(items=items, total=total, page=page, size=size, revenue=float(revenue))


@router.get("/orders/stats/events/{event_id}/sales", response_model=list[SaleOut], tags=["organizador"])
def event_sales(event_id: uuid.UUID, user: CurrentUser = Depends(organizer_only), db: Session = Depends(get_db)):
    stmt = (
        select(Order)
        .where(Order.event_id == event_id, Order.organizer_id == uuid.UUID(user.id))
        .order_by(Order.created_at.desc())
        .limit(100)
    )
    return db.scalars(stmt).all()
