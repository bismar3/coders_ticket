"""Carga eventos de demostración usando las APIs reales (auth -> token -> events). Solo librería estándar.

    python scripts/seed_demo.py

Requiere que auth y events estén corriendo y que exista el organizador semilla (python -m app.seed en auth).
Es idempotente: si un evento con el mismo título ya existe, no lo vuelve a crear.
"""
import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone

AUTH = os.getenv("AUTH_URL", "http://127.0.0.1:8001")
EVENTS = os.getenv("EVENTS_URL", "http://127.0.0.1:8002")
ORGANIZER = {"email": "organizador@coderstick.bo", "password": "coders123"}
BO = timezone(timedelta(hours=-4))


def img(photo_id: str) -> str:
    return f"https://images.unsplash.com/{photo_id}?w=1600&q=80&auto=format&fit=crop"


def at(days: int, hour: int, minute: int = 0) -> str:
    base = datetime.now(BO).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return (base + timedelta(days=days)).isoformat()


DEMO_EVENTS = [
    {
        "title": "Neón Fest 2026", "subtitle": "12 horas de música electrónica bajo las luces de la ciudad",
        "category": "festival", "venue": "Estadio Ramón Tahuichi Aguilera", "city": "Santa Cruz",
        "starts_at": at(10, 18), "image_url": img("photo-1470229722913-7c0e2dbbafd3"),
        "description": "El festival electrónico más grande del oriente boliviano vuelve con tres escenarios, "
                       "show de drones y artistas internacionales. Trae tu mejor energía.",
        "sectors": [{"name": "General", "price": 180, "capacity": 4000}, {"name": "Preferencia", "price": 320, "capacity": 1200},
                    {"name": "VIP Backstage", "price": 650, "capacity": 200}],
        "publish": True,
    },
    {
        "title": "Pulso Urbano Tour", "subtitle": "Rock, trap y fusión andina en una sola noche",
        "category": "concierto", "venue": "Coliseo Julio Borelli", "city": "La Paz",
        "starts_at": at(6, 20, 30), "image_url": img("photo-1501386761578-eac5c94b800a"),
        "description": "Las bandas que están marcando la nueva escena nacional, juntas en un concierto con "
                       "producción de nivel internacional.",
        "sectors": [{"name": "General", "price": 120, "capacity": 2500}, {"name": "Preferencia", "price": 220, "capacity": 800},
                    {"name": "VIP", "price": 400, "capacity": 150}],
        "publish": True,
    },
    {
        "title": "Gran Final Copa Oriente", "subtitle": "Se define el campeón de la temporada",
        "category": "deporte", "venue": "Estadio Hernando Siles", "city": "La Paz",
        "starts_at": at(3, 16), "image_url": img("photo-1574629810360-7efbbe195018"),
        "description": "Noventa minutos que deciden todo. Vive la final desde la tribuna con la mejor vista del estadio.",
        "sectors": [{"name": "Curva", "price": 50, "capacity": 9000}, {"name": "General", "price": 90, "capacity": 6000},
                    {"name": "Preferencia", "price": 160, "capacity": 3000}, {"name": "Butaca", "price": 300, "capacity": 600}],
        "publish": True,
    },
    {
        "title": "DevOps Bolivia Summit", "subtitle": "Contenedores, Kubernetes y la nube en producción",
        "category": "conferencia", "venue": "Centro de Convenciones Fexpocruz", "city": "Santa Cruz",
        "starts_at": at(14, 9), "image_url": img("photo-1531058020387-3be344556be6"),
        "description": "Charlas y casos reales de equipos que despliegan a diario: Docker, Kubernetes, CI/CD, "
                       "observabilidad y seguridad. Incluye networking y certificado digital.",
        "sectors": [{"name": "Estudiante", "price": 60, "capacity": 300}, {"name": "Profesional", "price": 150, "capacity": 400},
                    {"name": "Full Access", "price": 280, "capacity": 80}],
        "publish": True,
    },
    {
        "title": "Taller: Kubernetes desde cero", "subtitle": "Cupos ultra limitados · edición CODERS",
        "category": "conferencia", "venue": "Hub de Innovación UPSA", "city": "Santa Cruz",
        "starts_at": at(2, 19), "image_url": img("photo-1504384308090-c894fdcc538d"),
        "description": "Un taller práctico e intensivo. Solo hay dos lugares: ideal para probar el mensaje de \"Agotado\".",
        "sectors": [{"name": "Único", "price": 1, "capacity": 2}],
        "publish": True,
    },
    {
        "title": "Romeo y Julieta Reimaginado", "subtitle": "El clásico de Shakespeare con estética neón",
        "category": "teatro", "venue": "Teatro Municipal Alberto Saavedra Pérez", "city": "La Paz",
        "starts_at": at(8, 19, 30), "image_url": img("photo-1503095396549-807759245b35"),
        "description": "Una puesta en escena contemporánea con música en vivo y diseño de luces inmersivo.",
        "sectors": [{"name": "Galería", "price": 70, "capacity": 300}, {"name": "Platea", "price": 150, "capacity": 400},
                    {"name": "Palco", "price": 250, "capacity": 60}],
        "publish": True,
    },
    {
        "title": "Noche de Stand-Up: Risas sin Filtro", "subtitle": "Cinco comediantes, cero guion",
        "category": "otro", "venue": "Teatro Gran Mariscal", "city": "Cochabamba",
        "starts_at": at(5, 21), "image_url": img("photo-1585699324551-f6c309eedeca"),
        "description": "La comedia más irreverente del país en una noche que no vas a olvidar.",
        "sectors": [{"name": "General", "price": 80, "capacity": 350}, {"name": "Primera fila", "price": 150, "capacity": 40}],
        "publish": True,
    },
    {
        "title": "Sabores de Bolivia", "subtitle": "Feria gastronómica de los nueve departamentos",
        "category": "feria", "venue": "Campo Ferial Chuquiago Marka", "city": "La Paz",
        "starts_at": at(12, 11), "image_url": img("photo-1555939594-58d7cb561ad1"),
        "description": "Más de 80 puestos, chefs invitados, catas y música en vivo durante todo el día.",
        "sectors": [{"name": "Entrada", "price": 25, "capacity": 5000}, {"name": "Pase degustación", "price": 90, "capacity": 600}],
        "publish": True,
    },
    {
        "title": "Orquesta Sinfónica: Bandas Sonoras", "subtitle": "Fecha por confirmar",
        "category": "concierto", "venue": "Por confirmar", "city": "Sucre",
        "starts_at": at(40, 20), "image_url": img("photo-1459749411175-04bf5292ceea"),
        "description": "Evento en borrador: se publicará cuando se confirme la fecha.",
        "sectors": [{"name": "General", "price": 100, "capacity": 500}],
        "publish": False,
    },
]


def request(method: str, url: str, body: dict | None = None, token: str | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main() -> None:
    token = request("POST", f"{AUTH}/auth/login", ORGANIZER)["access_token"]
    existing = {e["title"]: e for e in request("GET", f"{EVENTS}/events/mine/all", token=token)}
    for item in DEMO_EVENTS:
        if item["title"] in existing:
            event = existing[item["title"]]
            if item["publish"] and event["status"] == "borrador":
                request("PATCH", f"{EVENTS}/events/{event['id']}/status", {"status": "publicado"}, token)
            print(f"= ya existe: {item['title']}")
            continue
        payload = {k: v for k, v in item.items() if k != "publish"}
        event = request("POST", f"{EVENTS}/events", payload, token)
        if item["publish"]:
            request("PATCH", f"{EVENTS}/events/{event['id']}/status", {"status": "publicado"}, token)
        print(f"+ creado: {item['title']} ({'publicado' if item['publish'] else 'borrador'})")


if __name__ == "__main__":
    main()
