"""Prepara todos los servicios: entorno virtual, dependencias y migraciones (solo librería estándar).

    python scripts/setup.py              # todos
    python scripts/setup.py orders       # uno solo
    python scripts/setup.py --no-migrate # sin tocar la base de datos

Requisitos: Python 3.12+ y PostgreSQL con las bases creadas (ver README).
Si `uv` está instalado se usa (mucho más rápido); si no, venv + pip.
"""
import argparse
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
IS_WINDOWS = platform.system() == "Windows"
BIN = "Scripts" if IS_WINDOWS else "bin"
SERVICES = ["auth", "events", "orders", "payments", "tickets", "notifications", "checkin"]
WITH_DB = {"auth", "events", "orders", "payments", "tickets", "checkin"}


def run(cmd: list[str], cwd: Path) -> None:
    print(f"  $ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=cwd, check=True)


def setup(name: str, migrate: bool) -> None:
    cwd = BACKEND / name
    print(f"\n▶ {name}")
    if not (cwd / ".env").exists():
        shutil.copy(cwd / ".env.example", cwd / ".env")
        print("  .env creado desde .env.example -> revisa sus valores")
    python = cwd / ".venv" / BIN / ("python.exe" if IS_WINDOWS else "python")
    if shutil.which("uv"):
        if not python.exists():
            run(["uv", "venv", ".venv"], cwd)
        run(["uv", "pip", "install", "--python", str(python), "-r", "requirements.txt"], cwd)
    else:
        if not python.exists():
            run([sys.executable, "-m", "venv", ".venv"], cwd)
        run([str(python), "-m", "pip", "install", "-r", "requirements.txt"], cwd)
    if migrate and name in WITH_DB:
        run([str(python), "-m", "alembic", "upgrade", "head"], cwd)
    if migrate and name == "auth":
        run([str(python), "-m", "app.seed"], cwd)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("services", nargs="*", default=[], help="servicios a preparar (por defecto, todos)")
    parser.add_argument("--no-migrate", action="store_true")
    args = parser.parse_args()
    for name in args.services or SERVICES:
        if name not in SERVICES:
            sys.exit(f"Servicio desconocido: {name}")
        setup(name, not args.no_migrate)
    print("\n✔ Listo. Levanta todo con: python scripts/dev.py")


if __name__ == "__main__":
    main()
