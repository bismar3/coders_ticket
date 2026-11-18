"""Cliente de la pasarela Libélula (sandbox).

Flujo: se registra una "deuda" -> Libélula devuelve la URL de su pasarela y un QR ->
el cliente paga allí -> consultamos la deuda por su identificador para saber si está pagada.
Nunca confiamos solo en los parámetros del callback: siempre se verifica con la consulta.
"""
import logging
import uuid

import httpx

from app.config import settings

log = logging.getLogger("payments.libelula")


class LibelulaError(Exception):
    pass


def identifier_for(order_id: uuid.UUID) -> str:
    return f"{settings.libelula_identifier_prefix}{order_id}"


def _post(url: str, payload: dict) -> dict:
    try:
        response = httpx.post(url, json=payload, timeout=settings.libelula_timeout_seconds)
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise LibelulaError(f"No se pudo contactar a Libélula: {exc}") from exc
    if str(data.get("error")) != "0":
        raise LibelulaError(data.get("mensaje") or "Libélula rechazó la solicitud")
    return data


def register_debt(
    *,
    order_id: uuid.UUID,
    email: str,
    customer_name: str,
    description: str,
    concept: str,
    quantity: int,
    unit_price: float,
    currency: str,
    callback_url: str | None,
    return_url: str | None,
) -> dict:
    first, _, last = customer_name.strip().partition(" ")
    payload = {
        "appkey": settings.libelula_appkey,
        "email_cliente": email,
        "identificador": identifier_for(order_id),
        "descripcion": description,
        "nombre_cliente": first or customer_name,
        "apellido_cliente": last or "-",
        "emite_factura": False,
        "moneda": currency,
        "callback_url": callback_url,
        "url_retorno": return_url,
        "lineas_detalle_deuda": [
            {"concepto": concept, "cantidad": quantity, "costo_unitario": unit_price, "descuento_unitario": 0}
        ],
    }
    data = _post(settings.libelula_register_url, payload)
    log.info("Deuda registrada en Libélula para la orden %s (transacción %s)", order_id, data.get("id_transaccion"))
    return data


def query_debt(order_id: uuid.UUID) -> dict:
    data = _post(settings.libelula_query_url, {"appkey": settings.libelula_appkey, "identificador": identifier_for(order_id)})
    return data.get("datos") or {}
