"""Clientes HTTP hacia los otros servicios. Toda llamada tiene un tiempo máximo de espera."""
import logging
import uuid

import httpx

from app.config import settings

log = logging.getLogger("orders.clients")


class ServiceError(Exception):
    """El otro servicio respondió con error (status_code) o no respondió (status_code=None)."""

    def __init__(self, service: str, detail: str, status_code: int | None = None):
        super().__init__(f"{service}: {detail}")
        self.service = service
        self.detail = detail
        self.status_code = status_code


def _call(service: str, method: str, url: str, timeout: float, json: dict | None = None) -> dict | list:
    try:
        response = httpx.request(method, url, json=json, timeout=timeout, headers={"X-Internal-Key": settings.internal_api_key})
    except httpx.TimeoutException:
        raise ServiceError(service, "no respondió a tiempo")
    except httpx.HTTPError as exc:
        raise ServiceError(service, f"no disponible ({exc.__class__.__name__})")
    if response.is_error:
        try:
            detail = response.json().get("detail", response.text)
        except ValueError:
            detail = response.text
        raise ServiceError(service, str(detail), response.status_code)
    return response.json()


# ---------- events ----------

def reserve_seats(order_id: uuid.UUID, event_id: uuid.UUID, sector_id: uuid.UUID, quantity: int) -> dict:
    payload = {"order_id": str(order_id), "event_id": str(event_id), "sector_id": str(sector_id), "quantity": quantity}
    return _call("events", "POST", f"{settings.events_url}/internal/reservations", settings.http_timeout_seconds, payload)


def release_seats(order_id: uuid.UUID) -> None:
    _call("events", "POST", f"{settings.events_url}/internal/reservations/{order_id}/release", settings.http_timeout_seconds)


def confirm_seats(order_id: uuid.UUID) -> None:
    _call("events", "POST", f"{settings.events_url}/internal/reservations/{order_id}/confirm", settings.http_timeout_seconds)


# ---------- payments ----------

def charge(payload: dict) -> dict:
    return _call("payments", "POST", f"{settings.payments_url}/payments", settings.payments_timeout_seconds, payload)


def verify_payment(order_id: uuid.UUID) -> dict:
    return _call("payments", "POST", f"{settings.payments_url}/payments/{order_id}/verify", settings.payments_timeout_seconds)


def cancel_payment(order_id: uuid.UUID) -> dict:
    return _call("payments", "POST", f"{settings.payments_url}/payments/{order_id}/cancel", settings.http_timeout_seconds)


# ---------- tickets ----------

def issue_tickets(payload: dict) -> list:
    return _call("tickets", "POST", f"{settings.tickets_url}/internal/tickets/issue", settings.tickets_timeout_seconds, payload)


# ---------- notifications ----------

def send_purchase_email(payload: dict) -> dict:
    return _call("notifications", "POST", f"{settings.notifications_url}/notifications/purchase", settings.http_timeout_seconds, payload)
