"""Genera el PDF de una entrada (formato vertical, cómodo para mostrar en el celular)."""
from datetime import datetime
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

import qrcode
from qrcode.constants import ERROR_CORRECT_M
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfgen.canvas import Canvas

from app.config import SERVICE_DIR, settings
from app.models import Ticket

PAGE_W, PAGE_H = 105 * mm, 200 * mm
NAVY = HexColor("#070B1A")
PANEL = HexColor("#0E1530")
CYAN = HexColor("#22D3EE")
BLUE = HexColor("#3B82F6")
MUTED = HexColor("#8B95B7")
MASCOT = SERVICE_DIR / "assets" / "mascot.png"

MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def _local(dt: datetime) -> datetime:
    return dt.astimezone(ZoneInfo(settings.timezone))


def _qr_image(data: str) -> ImageReader:
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=12, border=1)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#070B1A", back_color="white").convert("RGB")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return ImageReader(buffer)


def _label_value(c: Canvas, x: float, y: float, label: str, value: str, width: float, max_lines: int = 1) -> int:
    """Dibuja etiqueta + valor; devuelve cuántas líneas ocupó el valor."""
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(x, y, label.upper())
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    lines = simpleSplit(value or "-", "Helvetica-Bold", 10, width)[:max_lines]
    for i, line in enumerate(lines):
        c.drawString(x, y - 12 - i * 12, line)
    return len(lines)


def render_ticket(ticket: Ticket, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    c = Canvas(str(destination), pagesize=(PAGE_W, PAGE_H))
    c.setTitle(f"Entrada {ticket.code} · {ticket.event_title}")
    c.setAuthor(settings.brand_name)
    margin = 8 * mm
    inner_w = PAGE_W - 2 * margin

    # Fondo y franja superior
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(CYAN)
    c.rect(0, PAGE_H - 3, PAGE_W, 3, stroke=0, fill=1)

    # Marca
    y = PAGE_H - 14 * mm
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, y, "coders")
    c.setFillColor(CYAN)
    c.drawString(margin + c.stringWidth("coders", "Helvetica-Bold", 13), y, "_tick")
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawRightString(PAGE_W - margin, y + 1, "ENTRADA DIGITAL")

    # Título del evento
    y -= 13 * mm
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 17)
    for line in simpleSplit(ticket.event_title, "Helvetica-Bold", 17, inner_w)[:3]:
        c.drawString(margin, y, line)
        y -= 7 * mm

    # Datos del evento en dos columnas
    when = _local(ticket.starts_at)
    col_w = inner_w / 2 - 2 * mm
    y -= 3 * mm
    date = f"{DAYS[when.weekday()][:3].capitalize()} {when.day} {MONTHS[when.month - 1][:3]} {when.year}"
    _label_value(c, margin, y, "Fecha", date, col_w)
    _label_value(c, margin + inner_w / 2, y, "Hora", when.strftime("%H:%M"), col_w)
    y -= 11 * mm
    used = _label_value(c, margin, y, "Lugar", f"{ticket.venue}, {ticket.city}", inner_w, max_lines=2)
    y -= 11 * mm + (used - 1) * 12
    _label_value(c, margin, y, "Sector", ticket.sector_name, col_w)
    _label_value(c, margin + inner_w / 2, y, "Entrada", f"{ticket.seat_number} de {ticket.seats_in_order}", col_w)
    y -= 11 * mm
    _label_value(c, margin, y, "Titular", ticket.holder_name, col_w)
    _label_value(c, margin + inner_w / 2, y, "Precio", f"Bs {ticket.unit_price:,.2f}", col_w)

    # Línea de corte con muescas
    y -= 9 * mm
    c.setFillColor(white)
    c.circle(0, y, 4 * mm, stroke=0, fill=1)
    c.circle(PAGE_W, y, 4 * mm, stroke=0, fill=1)
    c.setStrokeColor(HexColor("#26304F"))
    c.setDash(3, 3)
    c.line(6 * mm, y, PAGE_W - 6 * mm, y)
    c.setDash()

    # QR
    qr_size = 58 * mm
    y -= 6 * mm + qr_size
    qr_x = (PAGE_W - qr_size) / 2
    c.setFillColor(white)
    c.roundRect(qr_x - 3 * mm, y - 3 * mm, qr_size + 6 * mm, qr_size + 6 * mm, 4 * mm, stroke=0, fill=1)
    c.drawImage(_qr_image(ticket.code), qr_x, y, qr_size, qr_size)

    # Código legible
    y -= 10 * mm
    c.setFillColor(CYAN)
    c.setFont("Courier-Bold", 13)
    c.drawCentredString(PAGE_W / 2, y, ticket.code)
    y -= 5 * mm
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(PAGE_W / 2, y, "Entrada de un solo uso · Presenta este QR en la puerta")

    # Pie con el sello del equipo
    c.setFillColor(PANEL)
    c.rect(0, 0, PAGE_W, 14 * mm, stroke=0, fill=1)
    if MASCOT.exists():
        c.drawImage(str(MASCOT), margin, 2 * mm, 10 * mm, 10 * mm, mask="auto", preserveAspectRatio=True)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin + 12 * mm, 7.5 * mm, "Hecho por CODERS")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6)
    c.drawString(margin + 12 * mm, 4 * mm, f"Orden {str(ticket.order_id)[:8].upper()}")
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(PAGE_W - margin, 6 * mm, "</>")

    c.showPage()
    c.save()
