"""Prueba responsiva en celulares, tablets y PC reales (emulados con Playwright).

Por cada dispositivo abre todas las pantallas, toma una captura y revisa:
  - DESBORDE: algo se sale del ancho de la pantalla (scroll horizontal o contenido cortado).
  - OCULTO:   filas con scroll horizontal que esconden contenido (pestañas o chips cortados).
  - LETRA:    textos con letra menor a 10 px (ilegibles en celular).

Requiere el sistema corriendo (python scripts/dev.py), datos demo y Chrome instalado:
    uv run --no-project --with playwright python scripts/device_check.py                 # todos los dispositivos
    uv run --no-project --with playwright python scripts/device_check.py "iPhone SE"     # uno o varios (separados por coma)
    uv run --no-project --with playwright python scripts/device_check.py "" adm          # solo pantallas "adm-*"
Las capturas quedan en scripts/audit/devices/<dispositivo>/.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
API = "http://127.0.0.1:5173/api"
OUT = Path(__file__).parent / "audit" / "devices"

ANDROID = "Mozilla/5.0 (Linux; Android 14; {model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"


def phone(w, h, model):
    return {"viewport": {"width": w, "height": h}, "is_mobile": True, "has_touch": True, "user_agent": ANDROID.format(model=model)}


# Marca / modelo → descriptor de Playwright (o uno propio con el tamaño real de pantalla en CSS px)
DEVICES = {
    "Samsung Galaxy S9+ (320)": "Galaxy S9+",
    "Samsung Galaxy S8 (360)": "Galaxy S8",
    "Motorola Moto G4 (360)": "Moto G4",
    "Huawei P30 (360)": phone(360, 780, "ELE-L29"),
    "iPhone SE 1.ª gen (320)": "iPhone SE",
    "iPhone SE 3.ª gen (375)": phone(375, 667, "iPhone SE"),
    "iPhone 13 (390)": "iPhone 13",
    "Xiaomi Redmi Note 13 (393)": phone(393, 873, "23124RA7EO"),
    "Google Pixel 7 (412)": "Pixel 7",
    "Samsung Galaxy A54 (412)": phone(412, 915, "SM-A546B"),
    "iPhone 14 Pro Max (430)": "iPhone 14 Pro Max",
    "Samsung Galaxy Tab S4 (712)": "Galaxy Tab S4",
    "iPad Mini (768)": "iPad Mini",
    "iPad Pro 11 (834)": "iPad Pro 11",
    "iPad Mini horizontal (1024)": "iPad Mini landscape",
    "Laptop 1366": {"viewport": {"width": 1366, "height": 768}},
    "Laptop 1440": {"viewport": {"width": 1440, "height": 900}},
    "PC Full HD 1920": {"viewport": {"width": 1920, "height": 1080}},
}

PICK = [d.strip() for d in (sys.argv[1].split(",") if len(sys.argv) > 1 and sys.argv[1] else []) if d.strip()]
ONLY = sys.argv[2] if len(sys.argv) > 2 else ""


def api(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", "Bearer " + token)
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


tokens = {r: api("POST", "/auth/login", {"email": f"{r}@coderstick.bo", "password": "coders123"})["access_token"]
          for r in ("cliente", "organizador", "portero")}
events = api("GET", "/events")
event_id = next(e["id"] for e in events if e["title"].startswith("Pulso"))
orders = api("GET", "/orders/mine", token=tokens["cliente"])
paid = next((o["id"] for o in orders if o["status"] == "pagada"), None)

# nombre, ruta, rol, acción extra
PAGES = [
    ("home", "/", None, None),
    ("home-menu", "/", None, "menu"),
    ("cartelera", "/cartelera", None, None),
    ("evento", f"/eventos/{event_id}", "cliente", None),
    ("evento-compra", f"/eventos/{event_id}", "cliente", "buy"),
    ("login", "/login", None, None),
    ("registro", "/registro", None, None),
    ("compra", f"/compra/{paid}", "cliente", None),
    ("mis-entradas", "/mis-entradas", "cliente", None),
    ("mis-compras", "/mis-compras", "cliente", None),
    ("cliente-menu", "/cartelera", "cliente", "menu"),
    ("perfil", "/cartelera", "cliente", "profile"),
    ("adm-resumen", "/organizador", "organizador", None),
    ("adm-menu", "/organizador", "organizador", "menu"),
    ("adm-eventos", "/organizador/eventos", "organizador", None),
    ("adm-editor", "/organizador/eventos/nuevo", "organizador", None),
    ("adm-categorias", "/organizador/categorias", "organizador", None),
    ("adm-ventas", "/organizador/ventas", "organizador", None),
    ("adm-personal", "/organizador/personal", "organizador", None),
    ("adm-accesos", "/organizador/accesos", "organizador", None),
    ("puerta-inicio", "/puerta", "portero", None),
    ("puerta-escaner", "/puerta", "portero", "door-event"),
]

CHECK = """() => {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]'); };
  const exceeds = (el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; };
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible') { const r = p.getBoundingClientRect(); if (r.right <= vw + 1 && r.left >= -1) return true; }
    }
    return false;
  };
  const label = (el) => { const c = typeof el.className === 'string' ? el.className : (el.className.baseVal || '');
    return el.tagName.toLowerCase() + ' ' + c.slice(0, 50) + ' "' + (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '"'; };
  const overflow = [], hidden = [], tiny = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    if (exceeds(el) && !clipped(el) && ![...el.children].some((c) => visible(c) && exceeds(c) && !clipped(c))) overflow.push(label(el));
    const cs = getComputedStyle(el);
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 4 && el.tagName !== 'HTML' && el.tagName !== 'BODY'
        && !el.closest('[data-allow-scroll]')) hidden.push(label(el));
    if (!el.closest('svg') && el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 10) tiny.push(label(el) + ' ' + cs.fontSize);
  }
  return { sw: document.documentElement.scrollWidth, vw, overflow: overflow.slice(0, 6), hidden: hidden.slice(0, 6), tiny: tiny.slice(0, 6) };
}"""


def slug(name):
    return "".join(ch if ch.isalnum() else "-" for ch in name).strip("-").lower()


problems = 0
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    for dev_name, spec in DEVICES.items():
        if PICK and not any(k.lower() in dev_name.lower() for k in PICK):
            continue
        desc = dict(p.devices[spec]) if isinstance(spec, str) else dict(spec)
        desc.pop("default_browser_type", None)
        desc["device_scale_factor"] = 1  # el diseño depende solo del ancho en CSS px; capturas livianas
        width = desc["viewport"]["width"]
        folder = OUT / slug(dev_name)
        folder.mkdir(parents=True, exist_ok=True)
        print(f"\n=== {dev_name}: {width}×{desc['viewport']['height']} ===")
        for name, path, role, extra in PAGES:
            if ONLY and ONLY not in name:
                continue
            if extra == "menu" and width >= 1024:
                continue
            ctx = browser.new_context(**desc)
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)[:120]))
            page.goto(BASE + "/")
            page.evaluate("sessionStorage.setItem('coderstick.booted','1')")
            if role:
                page.evaluate("t => localStorage.setItem('coderstick.token', t)", tokens[role])
            if extra == "door-event":
                page.evaluate("id => localStorage.setItem('coderstick.door.event', id)", event_id)
            page.goto(BASE + path)
            time.sleep(1.6)
            if extra == "menu":
                page.locator("[aria-label='Abrir menú']").click()
                time.sleep(0.8)
            elif extra == "profile":
                page.locator("[aria-label='Abrir mi perfil']:visible").first.click()
                time.sleep(0.9)
            elif extra == "buy":
                page.locator("#comprar").scroll_into_view_if_needed()
                time.sleep(0.9)
            res = page.evaluate(CHECK)
            page.screenshot(path=str(folder / f"{name}.png"), full_page=False)
            flags = []
            if res["sw"] > res["vw"] + 1 or res["overflow"]:
                flags.append(f"DESBORDE ancho={res['sw']} {res['overflow'][:3]}")
            if res["hidden"]:
                flags.append(f"OCULTO {res['hidden'][:3]}")
            if res["tiny"]:
                flags.append(f"LETRA {res['tiny'][:3]}")
            if errors:
                flags.append(f"ERROR {errors[0]}")
            problems += bool(flags)
            print(f"  {'OK ' if not flags else 'MAL'} {name:<15} {' | '.join(flags)}")
            ctx.close()
    browser.close()
print(f"\nPantallas con observaciones: {problems}")
