"""Verifica los criterios de aceptación de la v1 contra los servicios en ejecución. Solo librería estándar.

    python scripts/e2e_check.py

Flujo: registro -> compra -> pago -> PDF con QR -> correo en Mailpit -> ingreso -> segundo escaneo rechazado,
más los casos de error: agotado, pago rechazado que libera cupos y pago pendiente en Libélula.
"""
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

URL = {
    "auth": os.getenv("AUTH_URL", "http://127.0.0.1:8001"),
    "events": os.getenv("EVENTS_URL", "http://127.0.0.1:8002"),
    "orders": os.getenv("ORDERS_URL", "http://127.0.0.1:8003"),
    "tickets": os.getenv("TICKETS_URL", "http://127.0.0.1:8005"),
    "checkin": os.getenv("CHECKIN_URL", "http://127.0.0.1:8007"),
    "mailpit": os.getenv("MAILPIT_URL", "http://127.0.0.1:8025"),
}
OK_CARD, REJECT_CARD = "4111 1111 1111 1111", "4111 1111 1111 0000"
results: list[tuple[bool, str]] = []


def call(method: str, url: str, body=None, token=None, raw=False):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = resp.read()
            return resp.status, (data if raw else json.loads(data or b"null"))
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read() or b"null")


def check(ok: bool, label: str) -> bool:
    results.append((ok, label))
    print(f"  {'✔' if ok else '✘'} {label}")
    return ok


def sector(event_id: str, name: str) -> dict:
    _, event = call("GET", f"{URL['events']}/events/{event_id}")
    return next(s for s in event["sectors"] if s["name"] == name)


def buy(token, event, sector_name, qty, method="simulado", card=OK_CARD):
    s = sector(event["id"], sector_name)
    body = {"event_id": event["id"], "sector_id": s["id"], "quantity": qty, "payment_method": method}
    if method == "simulado":
        body["card_number"] = card
    return call("POST", f"{URL['orders']}/orders", body, token)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    print("\n1) Salud de los servicios")
    for name in ("auth", "events", "orders", "tickets", "checkin"):
        code, body = call("GET", f"{URL[name]}/health")
        check(code == 200, f"{name} /health -> {body.get('status') if body else code}")

    print("\n2) Registro e inicio de sesión")
    email = f"e2e-{uuid.uuid4().hex[:8]}@coderstick.bo"
    code, reg = call("POST", f"{URL['auth']}/auth/register", {"name": "Prueba E2E", "email": email, "password": "secreto123"})
    check(code == 201 and reg["user"]["role"] == "cliente", f"registro de {email} como cliente")
    token = reg["access_token"]
    _, portero = call("POST", f"{URL['auth']}/auth/login", {"email": "portero@coderstick.bo", "password": "coders123"})
    porter_token = portero["access_token"]

    _, events = call("GET", f"{URL['events']}/events")
    by_title = {e["title"]: e for e in events}
    concert, workshop, final = by_title["Pulso Urbano Tour"], by_title["Taller: Kubernetes desde cero"], by_title["Gran Final Copa Oriente"]
    check(all(e["status"] == "publicado" for e in events) and "Orquesta Sinfónica: Bandas Sonoras" not in by_title,
          f"cartelera muestra solo publicados ({len(events)})")

    print("\n3) Compra aprobada -> entradas -> correo")
    before = sector(concert["id"], "General")["available"]
    code, order = buy(token, concert, "General", 2)
    check(code == 201 and order["status"] == "pagada", f"orden pagada ({order.get('status')}, total Bs {order.get('total')})")
    check(order["tickets_issued"] and len(order["ticket_codes"]) == 2, f"2 entradas emitidas {order['ticket_codes']}")
    check(sector(concert["id"], "General")["available"] == before - 2, "cupo descontado en events")
    check(order["notification_sent"], "correo de confirmación enviado")
    _, mails = call("GET", f"{URL['mailpit']}/api/v1/search?query=to:{email}")
    check(bool(mails and mails.get("messages_count")), "correo visible en Mailpit")
    code_1 = order["ticket_codes"][0]
    status, pdf = call("GET", f"{URL['tickets']}/tickets/{code_1}/pdf", token=token, raw=True)
    check(status == 200 and pdf[:4] == b"%PDF", f"PDF descargable ({len(pdf) // 1024} KB)")
    _, mine = call("GET", f"{URL['orders']}/orders/mine", token=token)
    check(any(o["id"] == order["id"] for o in mine), "historial de compras del cliente")

    print("\n4) Ingreso al evento")
    scan = lambda c, ev: call("POST", f"{URL['checkin']}/checkin", {"code": c, "event_id": ev["id"]}, porter_token)[1]
    first = scan(code_1, concert)
    check(first["allowed"], f"primer escaneo: {first['message']}")
    second = scan(code_1, concert)
    check(not second["allowed"] and second["reason"] == "already_used", f"segundo escaneo: {second['message']}")
    other = scan(order["ticket_codes"][1], final)
    check(not other["allowed"] and other["reason"] == "other_event", f"entrada de otro evento: {other['message']}")
    invalid = scan("CT-NOPE-NOPE-NOPE", concert)
    check(not invalid["allowed"] and invalid["reason"] == "invalid", f"código inexistente: {invalid['message']}")

    print("\n5) Pago rechazado libera los cupos")
    before = sector(concert["id"], "Preferencia")["available"]
    code, rejected = buy(token, concert, "Preferencia", 3, card=REJECT_CARD)
    check(rejected["status"] == "rechazada", f"orden rechazada ({rejected.get('failure_reason')})")
    check(sector(concert["id"], "Preferencia")["available"] == before, "cupos liberados")

    print("\n6) Evento agotado")
    left = sector(workshop["id"], "Único")["available"]
    if left:
        buy(token, workshop, "Único", left)
    code, sold_out = buy(token, workshop, "Único", 1)
    check(code == 409 and sold_out.get("detail") == "Agotado", f"compra bloqueada: {code} {sold_out.get('detail')}")

    print("\n7) Libélula (sandbox): pago pendiente y cancelación")
    before = sector(final["id"], "Butaca")["available"]
    code, pending = buy(token, final, "Butaca", 1, method="libelula")
    ok = check(code == 201 and pending["status"] == "pendiente" and bool(pending["payment_url"]),
               f"orden pendiente con pasarela {pending.get('payment_url')}")
    if ok:
        check(bool(pending["payment_qr_url"]), "QR simple de Libélula disponible")
        _, synced = call("POST", f"{URL['orders']}/orders/{pending['id']}/sync", token=token)
        check(synced["status"] == "pendiente", "verificación con Libélula: aún sin pagar")
        _, cancelled = call("POST", f"{URL['orders']}/orders/{pending['id']}/cancel", token=token)
        check(cancelled["status"] == "cancelada" and sector(final["id"], "Butaca")["available"] == before,
              "cancelada y cupo devuelto")

    print("\n8) Panel del organizador")
    _, organizer = call("POST", f"{URL['auth']}/auth/login", {"email": "organizador@coderstick.bo", "password": "coders123"})
    _, stats = call("GET", f"{URL['orders']}/orders/stats/organizer", token=organizer["access_token"])
    check(stats["total_tickets"] >= 2 and stats["total_revenue"] > 0, f"ventas: {stats['total_tickets']} entradas, Bs {stats['total_revenue']}")
    _, door = call("GET", f"{URL['checkin']}/checkin/events/{concert['id']}/stats", token=porter_token)
    check(door["entered"] >= 1, f"ingresos al concierto: {door['entered']}")

    failed = [label for ok, label in results if not ok]
    print(f"\n{'✔ TODO OK' if not failed else '✘ FALLARON ' + str(len(failed))}: {len(results) - len(failed)}/{len(results)} verificaciones\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
