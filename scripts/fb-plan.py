"""Build the Facebook Reels schedule for every approved production whose brand has a Facebook Page.

usage: python scripts/fb-plan.py [--start 2026-10-26]
Writes data/fb-plan.json (one entry per reel: page, file, caption, local date/time) and records each one in
data/studio.db publishing (platform 'facebook', status 'planned' until it is scheduled in Meta Business Suite).
Caption = title (without #shorts) + description: packaging.json first, script.json fallback, credits from script.json (scripts/packaging_meta.py).
Cadence: 4/day per page (owner 2026-10-25). Times are the owner's local time.
"""
import datetime as dt, glob, json, os, sqlite3, sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from packaging_meta import published_meta  # noqa: E402

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
start = dt.date.fromisoformat(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else dt.date.today() + dt.timedelta(days=1)
PAGES = {"rankings": ("Planet Extremes", "61595705258385", ["11:00", "15:00", "19:00", "23:00"]),
         "quiz-ar": ("شو شايف؟", "61595600383297", ["11:00", "14:00", "17:00", "20:00"])}

db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
done = {r[0] for r in db.execute("SELECT production_id FROM publishing WHERE platform='facebook' AND publication_status IN ('scheduled','published')")}
rows = db.execute("SELECT production_id, brand_id, title FROM productions WHERE approval_status='approved' ORDER BY created_at, production_id").fetchall()

plan, n = [], {}
for pid, brand, dbtitle in rows:
    if pid in done or brand not in PAGES:
        continue
    pdir = os.path.join(R, "productions", pid)
    vers = sorted(glob.glob(os.path.join(pdir, "v*", "render.mp4")), key=lambda p: int(os.path.basename(os.path.dirname(p))[1:]))
    if not vers:
        continue
    s = json.load(open(os.path.join(pdir, "script.json"), encoding="utf-8")) if os.path.exists(os.path.join(pdir, "script.json")) else {}
    m = published_meta(pdir, brand, dbtitle, s)  # packaging.json first, script.json fallback (audit 2026-11-08 I1)
    if m.get("ai_text"):  # owner 2026-11-08: no AI-generation text anywhere in the published info -> refuse this entry
        sys.stderr.buffer.write(("REFUSED %s: AI-generation text %s\n" % (pid, "; ".join('%s: "%s"' % (h["key"], h["phrase"]) for h in m["ai_text"][:4]))).encode("utf8"))
        continue
    # m["limits"] are YouTube limits: not applied to Facebook captions (no verified Reels caption limit; config/platform-limits.json facebook)
    title, desc = m["title"], m["description"]
    # owner 2026-11-08: packaging.json altered_content decides (default false) when present; legacy entries keep the old rule
    altered = m["altered"] if m.get("altered") is not None else (True if brand == "quiz-ar" else "AI-generated" in (s.get("description") or ""))
    title = title.replace("#shorts", "").replace("#Shorts", "").strip()
    page, page_id, times = PAGES[brand]
    i = n.get(brand, 0)
    n[brand] = i + 1
    day, t = start + dt.timedelta(days=i // len(times)), times[i % len(times)]
    plan.append(dict(production_id=pid, brand=brand, page=page, page_id=page_id, file=vers[-1], caption=f"{title}\n\n{desc}".strip(),
                     date=day.isoformat(), time=t, altered=altered))

json.dump(plan, open(os.path.join(R, "data", "fb-plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for p in plan:
    meta = json.dumps({"page": p["page"], "page_id": p["page_id"], "local_time": f"{p['date']} {p['time']} PC local",
                       "method": "browser (Meta Business Suite, owner's Chrome)", "ai_label": p["altered"]}, ensure_ascii=False)
    db.execute("""INSERT INTO publishing (production_id, platform, account_id, metadata, publication_status, idempotency_key)
                  VALUES (?, 'facebook', ?, ?, 'planned', ?)
                  ON CONFLICT(idempotency_key) DO UPDATE SET metadata=excluded.metadata, updated_at=datetime('now')
                  WHERE publication_status='planned'""", (p["production_id"], p["brand"], meta, f"facebook:{p['production_id']}"))
db.commit()
last = {}
for p in plan:
    last[p["page"]] = (last.get(p["page"], (0,))[0] + 1, p["date"])
for page, (c, d) in last.items():
    print(f"{page}: {c} reels, {start} -> {d}")
