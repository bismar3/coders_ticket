"""Levanta todo coders_tick en local con un solo comando (solo usa la librería estándar).

    python scripts/dev.py            # Mailpit + 7 servicios + web
    python scripts/dev.py --no-web   # sin el frontend
    python scripts/dev.py auth events  # solo algunos servicios

Ctrl+C detiene todo.
"""
import argparse
import os
import platform
import signal
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
IS_WINDOWS = platform.system() == "Windows"
VENV_PY = Path(".venv") / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")
MAILPIT = ROOT / "tools" / "mailpit" / ("mailpit.exe" if IS_WINDOWS else "mailpit")

COLORS = {
    "mailpit": "90", "auth": "94", "events": "95", "orders": "93", "payments": "92",
    "tickets": "96", "notifications": "91", "checkin": "97", "web": "36",
}
SERVICES = ["auth", "events", "orders", "payments", "tickets", "notifications", "checkin"]


def commands(selected: list[str], with_web: bool) -> list[tuple[str, list[str], Path]]:
    procs = []
    if MAILPIT.exists():
        procs.append(("mailpit", [str(MAILPIT), "--listen", "127.0.0.1:8025", "--smtp", "127.0.0.1:1025"], MAILPIT.parent))
    else:
        print("⚠  Mailpit no encontrado en tools/mailpit (ver README). Los correos fallarán sin afectar las compras.")
    for name in selected:
        cwd = BACKEND / name
        python = cwd / VENV_PY
        if not python.exists():
            sys.exit(f"Falta el entorno virtual de {name}. Ejecuta primero: python scripts/setup.py")
        procs.append((name, [str(python), "-m", "app"], cwd))
    if with_web:
        procs.append(("web", ["npm.cmd" if IS_WINDOWS else "npm", "run", "dev"], ROOT / "frontend"))
    return procs


def pump(name: str, proc: subprocess.Popen) -> None:
    color = COLORS.get(name, "0")
    label = f"\033[{color}m{name:>13}\033[0m │ "
    for line in iter(proc.stdout.readline, ""):
        try:
            sys.stdout.write(label + line)
            sys.stdout.flush()
        except (OSError, ValueError):
            pass  # nunca dejar de leer: si el pipe se llena, el servicio se bloquea
    proc.stdout.close()


def stop(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True)
    else:
        proc.send_signal(signal.SIGTERM)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("services", nargs="*", default=[], help="servicios a levantar (por defecto, todos)")
    parser.add_argument("--no-web", action="store_true", help="no levantar el frontend")
    args = parser.parse_args()
    unknown = set(args.services) - set(SERVICES)
    if unknown:
        sys.exit(f"Servicio desconocido: {', '.join(sorted(unknown))}")

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if IS_WINDOWS:
        os.system("")  # habilita colores ANSI en la consola de Windows
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8", "FORCE_COLOR": "1"}
    running: list[subprocess.Popen] = []
    for name, cmd, cwd in commands(args.services or SERVICES, not args.no_web):
        proc = subprocess.Popen(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace")
        running.append(proc)
        threading.Thread(target=pump, args=(name, proc), daemon=True).start()

    print("\n  coders_tick en marcha · web http://localhost:5173 · correos http://localhost:8025 · Ctrl+C para salir\n")
    try:
        while any(p.poll() is None for p in running):
            threading.Event().wait(0.5)
    except KeyboardInterrupt:
        print("\nDeteniendo servicios…")
    finally:
        for proc in running:
            stop(proc)


if __name__ == "__main__":
    main()
