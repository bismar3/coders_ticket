"""Crea las cuentas iniciales de personal (organizador y portero) si no existen.

Uso: python -m app.seed
"""
import logging

from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.logging_conf import setup_logging
from app.models import Role, User
from app.security import hash_password

# (nombre, correo, clave, rol, teléfono, documento, cargo)
SEED_USERS = [
    ("Organizador CODERS", "organizador@coderstick.bo", "coders123", Role.ORGANIZADOR, "70000001", "9876543 SC", "Administrador"),
    ("Portero CODERS", "portero@coderstick.bo", "coders123", Role.PORTERO, "70000002", "1234567 LP", "Puerta principal"),
    ("Portero Norte", "portero2@coderstick.bo", "coders123", Role.PORTERO, "70000003", "7654321 CB", "Puerta norte"),
    ("Cliente Demo", "cliente@coderstick.bo", "coders123", Role.CLIENTE, None, None, None),
]


def main() -> None:
    setup_logging(settings.log_level)
    log = logging.getLogger("auth.seed")
    with SessionLocal() as db:
        for name, email, password, role, phone, document_id, position in SEED_USERS:
            if db.scalar(select(User).where(User.email == email)):
                log.info("Ya existe %s", email)
                continue
            db.add(User(name=name, email=email, password_hash=hash_password(password), role=role,
                        phone=phone, document_id=document_id, position=position))
            log.info("Creado %s (%s)", email, role)
        db.commit()


if __name__ == "__main__":
    main()
