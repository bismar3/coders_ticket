"""Logs en consola con fecha, nivel y mensaje (requerimiento técnico 8.6)."""
import logging
import sys

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: str) -> None:
    logging.basicConfig(level=level, format=LOG_FORMAT, datefmt=DATE_FORMAT, stream=sys.stdout, force=True)


def uvicorn_log_config(level: str) -> dict:
    """Hace que uvicorn use el mismo formato que el resto del servicio."""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {"default": {"format": LOG_FORMAT, "datefmt": DATE_FORMAT}},
        "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "default", "stream": "ext://sys.stdout"}},
        "loggers": {
            "uvicorn": {"handlers": ["console"], "level": level, "propagate": False},
            "uvicorn.error": {"handlers": ["console"], "level": level, "propagate": False},
            "uvicorn.access": {"handlers": ["console"], "level": level, "propagate": False},
        },
        "root": {"handlers": ["console"], "level": level},
    }
