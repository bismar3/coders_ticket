"""Plantillas HTML de los correos (estilos en línea para que se vean bien en cualquier cliente)."""
from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

from app.config import settings

MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def _when(dt: datetime) -> str:
    local = dt.astimezone(ZoneInfo(settings.timezone))
    return f"{local.day} de {MONTHS[local.month - 1]} de {local.year}, {local:%H:%M}"


def _layout(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="es"><body style="margin:0;background:#05070F;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#E6EAF5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070F;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0B1024;border:1px solid #1C2547;border-radius:20px;overflow:hidden">
<tr><td style="height:4px;background:linear-gradient(90deg,#3B82F6,#22D3EE,#8B5CF6)"></td></tr>
<tr><td style="padding:28px 32px 8px">
  <div style="font-size:20px;font-weight:800;letter-spacing:-.3px">coders<span style="color:#22D3EE">_tick</span></div>
</td></tr>
<tr><td style="padding:8px 32px 8px"><h1 style="margin:0;font-size:24px;line-height:1.25;color:#fff">{escape(title)}</h1></td></tr>
<tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;color:#C3CAE0">{body}</td></tr>
<tr><td style="padding:16px 32px;background:#080C1C;border-top:1px solid #1C2547;font-size:12px;color:#6B7699">
  Hecho con <span style="color:#22D3EE">&lt;/&gt;</span> por <b style="color:#E6EAF5">CODERS</b> · Este correo fue generado automáticamente.
</td></tr>
</table></td></tr></table></body></html>"""


def purchase(name: str, event_title: str, starts_at: datetime, venue: str, city: str, sector: str,
             quantity: int, total: float, currency: str, codes: list[str], tickets_url: str) -> tuple[str, str, str]:
    subject = f"Tus entradas para {event_title} 🎟️"
    # Una tarjeta por entrada con su QR incrustado (cid:qr-N)
    rows = "".join(
        f'<tr><td style="padding:14px;border-bottom:1px solid #1C2547" width="132">'
        f'<img src="cid:qr-{i}" width="120" height="120" alt="QR {escape(c)}" style="display:block;border-radius:10px;background:#fff" /></td>'
        f'<td style="padding:14px;border-bottom:1px solid #1C2547;vertical-align:middle">'
        f'<div style="font-size:12px;color:#8B95B7;text-transform:uppercase;letter-spacing:1px">Entrada {i} de {len(codes)}</div>'
        f'<div style="font-family:Consolas,monospace;font-size:16px;font-weight:700;color:#22D3EE;margin-top:4px">{escape(c)}</div>'
        f'<div style="font-size:12px;color:#8B95B7;margin-top:6px">Muestra este QR en la puerta. Es de un solo uso.</div></td></tr>'
        for i, c in enumerate(codes, start=1)
    )
    body = f"""
<p style="margin:0 0 16px">¡Hola {escape(name)}! Tu compra está confirmada. Estos son los datos de tu evento:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E1530;border-radius:14px;margin:0 0 18px">
<tr><td style="padding:18px 20px">
  <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">{escape(event_title)}</div>
  <div>📅 {_when(starts_at)}</div>
  <div>📍 {escape(venue)}, {escape(city)}</div>
  <div>🎫 Sector {escape(sector)} · {quantity} entrada(s)</div>
  <div style="margin-top:8px;font-weight:700;color:#fff">Total pagado: {currency} {total:,.2f}</div>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1C2547;border-radius:12px;margin:0 0 22px">{rows}</table>
<p style="margin:0 0 22px">Cada entrada tiene su propio código QR y <b>solo puede usarse una vez</b>. Descarga tus PDF desde la web:</p>
<p style="margin:0"><a href="{escape(tickets_url)}" style="display:inline-block;background:linear-gradient(90deg,#3B82F6,#22D3EE);color:#05070F;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:999px">Ver mis entradas</a></p>
"""
    text = (
        f"Hola {name}, tu compra para {event_title} está confirmada.\n"
        f"Fecha: {_when(starts_at)}\nLugar: {venue}, {city}\nSector: {sector} ({quantity} entradas)\n"
        f"Total: {currency} {total:,.2f}\nCódigos: {', '.join(codes)}\nDescarga tus entradas: {tickets_url}\n"
    )
    return subject, _layout("¡Tu compra está confirmada!", body), text


def welcome(name: str) -> tuple[str, str, str]:
    url = settings.frontend_url
    body = f"""
<p style="margin:0 0 16px">¡Hola {escape(name)}! Tu cuenta en coders_tick ya está lista.</p>
<p style="margin:0 0 22px">Explora la cartelera y asegura tu lugar en los próximos conciertos, partidos, ferias y charlas.</p>
<p style="margin:0"><a href="{escape(url)}" style="display:inline-block;background:linear-gradient(90deg,#3B82F6,#22D3EE);color:#05070F;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:999px">Ir a la cartelera</a></p>
"""
    return "Bienvenido a coders_tick ⚡", _layout("Bienvenido a bordo", body), f"Hola {name}, tu cuenta en coders_tick está lista: {url}"
