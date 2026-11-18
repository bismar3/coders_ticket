"""Auditoría responsiva: abre cada pantalla en varios anchos, detecta elementos que se salen de la pantalla
y guarda capturas en scripts/audit/.

Requiere el sistema corriendo (python scripts/dev.py), datos demo y Chrome instalado:
    uv run --no-project --with playwright python scripts/responsive_audit.py              # 6 anchos por defecto
    uv run --no-project --with playwright python scripts/responsive_audit.py 320,393,1920 # anchos a elección
    uv run --no-project --with playwright python scripts/responsive_audit.py 360 adm      # solo pantallas "adm-*"
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "audit"
OUT.mkdir(exist_ok=True)
BASE = "http://localhost:5173"
API = "http://127.0.0.1:5173/api"
WIDTHS = [int(w) for w in (sys.argv[1].split(",") if len(sys.argv) > 1 and sys.argv[1] else ["360", "393", "768", "1024", "1280", "1536"])]
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

PAGES = [
    ("home", "/", None, None),
    ("cartelera", "/cartelera", None, None),
    ("evento", f"/eventos/{event_id}", "cliente", None),
    ("login", "/login", None, None),
    ("registro", "/registro", None, None),
    ("404", "/no-existe", None, None),
    ("compra", f"/compra/{paid}", "cliente", None),
    ("mis-entradas", "/mis-entradas", "cliente", None),
    ("mis-compras", "/mis-compras", "cliente", None),
    ("perfil", "/cartelera", "cliente", "profile"),
    ("adm-resumen", "/organizador", "organizador", None),
    ("adm-eventos", "/organizador/eventos", "organizador", None),
    ("adm-editor", "/organizador/eventos/nuevo", "organizador", None),
    ("adm-categorias", "/organizador/categorias", "organizador", None),
    ("adm-ventas", "/organizador/ventas", "organizador", None),
    ("adm-personal", "/organizador/personal", "organizador", None),
    ("adm-accesos", "/organizador/accesos", "organizador", None),
    ("puerta-inicio", "/puerta", "portero", None),
    ("puerta-escaner", "/puerta", "portero", "door-event"),
]

FIND_OVERFLOW = """(W) => {
  const vw = W;
  const exceeds = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.right > vw + 1 || r.left < -1); };
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflow !== 'visible') {
        const r = p.getBoundingClientRect();
        if (r.right <= vw + 1 && r.left >= -1) return true;
      }
    }
    return false;
  };
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (!exceeds(el) || clipped(el)) continue;
    // solo culpables "hoja": ningún hijo visible también se sale
    if ([...el.children].some((c) => exceeds(c) && !clipped(c))) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    const cls = (typeof el.className === 'string' ? el.className : (el.className.baseVal || '')).slice(0, 90);
    out.push({ tag: el.tagName.toLowerCase(), cls, text: (el.innerText || '').trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
  }
  return { vw, sw: document.documentElement.scrollWidth, n: out.length, items: out.slice(0, 8) };
}"""

report = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    for w in WIDTHS:
        for name, path, role, extra in PAGES:
            if ONLY and ONLY not in name:
                continue
            ctx = browser.new_context(viewport={"width": w, "height": 860}, is_mobile=w < 768, has_touch=w < 1024)
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
            time.sleep(1.8)
            if extra == "profile":
                if w < 768:
                    page.locator("[aria-label='Menú']").click()
                    time.sleep(0.7)
                    page.get_by_role("button", name="Mi perfil").click()
                else:
                    page.locator("[aria-label='Abrir mi perfil']").click()
                time.sleep(0.9)
            res = page.evaluate(FIND_OVERFLOW, w)
            page.screenshot(path=str(OUT / f"{name}_{w}.png"), full_page=False)
            status = "OK " if res["n"] == 0 else "MAL"
            sep = chr(10) + "      "
            detail = sep.join("{}.{}[{},{}] {!r}".format(i["tag"], i["cls"][:60], i["left"], i["right"], i["text"]) for i in res["items"][:8])
            err = ("ERR:" + errors[0]) if errors else ""
            print(f"{status} {w:>5} {name:<15} desbordes={res['n']:<3} {detail} {err}")
            ctx.close()
    browser.close()
