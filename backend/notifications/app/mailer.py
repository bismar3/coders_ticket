import logging
import smtplib
import socket
from email.message import EmailMessage
from email.utils import make_msgid
from io import BytesIO

import qrcode
from qrcode.constants import ERROR_CORRECT_M

from app.config import settings

log = logging.getLogger("notifications.mailer")


def qr_png(data: str) -> bytes:
    """QR en PNG para incrustarlo en el correo (se genera aquí, sin pedirlo a otro servicio)."""
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    buffer = BytesIO()
    qr.make_image(fill_color="#070a16", back_color="white").save(buffer, format="PNG")
    return buffer.getvalue()


def send(to: str, subject: str, html: str, text: str, inline_images: dict[str, bytes] | None = None) -> str:
    """Envía un correo HTML + texto. `inline_images` = {cid: png} para mostrar imágenes dentro del HTML."""
    msg = EmailMessage()
    msg["From"] = settings.mail_from
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain="coderstick.bo")
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    if inline_images:
        html_part = msg.get_payload()[1]
        for cid, data in inline_images.items():
            html_part.add_related(data, maintype="image", subtype="png", cid=f"<{cid}>", filename=f"{cid}.png")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds) as smtp:
        if settings.smtp_starttls:
            smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)
    log.info("Correo enviado a %s: %s", to, subject)
    return msg["Message-ID"]


def smtp_reachable() -> bool:
    try:
        with socket.create_connection((settings.smtp_host, settings.smtp_port), timeout=2):
            return True
    except OSError:
        return False
