"""Sync the studio dashboard with the publishing state (safe to re-run any time).

- Social Account Manager: the four YouTube channels (handle, channel URL, integration, whether the API can publish).
- Production board: productions with a scheduled YouTube post move to stage 'scheduled' (published ones to 'published').
- Calendar: every plan entry not yet uploaded gets a 'planned' slot, so the calendar shows the whole schedule.
"""
import json, os, sqlite3
from datetime import datetime, timezone

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
YT = {
    "rankings": ("@PlanetXtremes", "UCPjsW0-Bhy883CD0ZORachw"),
    "clipping": ("@MissionVoices", "UCzTC21umXnyV1Tj6d5lx9ug"),
    "compilations": ("@TheWayItWasMade", "UC_CijmeZdzAY4EBl66xnfXA"),
    "quiz-ar": ("@shoshayef", "UC-ZF7rS8mQ9o6e9g0E-vhhg"),
}
for brand, (handle, cid) in YT.items():
    api = os.path.exists(os.path.join(R, "data", "tokens", f"{brand}.json"))
    data = {"url": f"https://www.youtube.com/{handle}", "channel_id": cid, "studio": f"https://studio.youtube.com/channel/{cid}",
            "upload_route": "YouTube Data API (scripts/youtube.ts)" if api else "YouTube Studio in the owner's Chrome (API sign-in pending)",
            "branding": "name, handle, description, picture and banner published 2026-10-23"}
    db.execute("""INSERT INTO accounts (id, brand_id, platform, handle, status, can_publish, integration, data, updated_at)
                  VALUES (?,?,?,?,?,?,?,?,datetime('now'))
                  ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, status=excluded.status, can_publish=excluded.can_publish,
                  integration=excluded.integration, data=excluded.data, updated_at=datetime('now')""",
               (f"{brand}:youtube", brand, "youtube", handle, "connected", 1 if api else 0,
                "youtube-data-api" if api else "browser", json.dumps(data)))

# Facebook Pages (owner created 2026-10-25 under his profile; portfolio "Clips Viral Studio", UK payouts)
FB = {
    "rankings": ("Planet Extremes", "61595705258385"),
    "quiz-ar": ("شو شايف؟", "61595600383297"),
}
for brand, (name, pid) in FB.items():
    data = {"url": f"https://www.facebook.com/profile.php?id={pid}", "page_id": pid, "portfolio": "Clips Viral Studio",
            "upload_route": "Meta Business Suite in the owner's Chrome (scripts/fb-plan.py schedule)",
            "branding": "name, category, bio, picture and cover set 2026-10-25"}
    db.execute("""INSERT INTO accounts (id, brand_id, platform, handle, status, can_publish, integration, data, updated_at)
                  VALUES (?,?,?,?,?,?,?,?,datetime('now'))
                  ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, status=excluded.status, can_publish=excluded.can_publish,
                  integration=excluded.integration, data=excluded.data, updated_at=datetime('now')""",
               (f"{brand}:facebook", brand, "facebook", name, "connected", 0, "browser", json.dumps(data, ensure_ascii=False)))

# board stages follow the publishing state
db.execute("""UPDATE productions SET current_state='scheduled', updated_at=datetime('now')
              WHERE production_id IN (SELECT production_id FROM publishing WHERE publication_status='scheduled') AND current_state IN ('approved','scheduled')""")
db.execute("""UPDATE productions SET current_state='published', updated_at=datetime('now')
              WHERE production_id IN (SELECT production_id FROM publishing WHERE publication_status='published')""")

# planned calendar slots for everything in the plan that isn't uploaded yet
plan = json.load(open(os.path.join(R, "data", "publish-plan.json"), encoding="utf-8"))
done = {r[0] for r in db.execute("SELECT production_id FROM publishing WHERE publication_status IN ('scheduled','published')")}
planned = 0
# the plan is the source of truth for not-yet-uploaded slots: drop stale ones (e.g. after a cadence change)
for b in {p["brand"] for p in plan}:
    db.execute("DELETE FROM slots WHERE brand_id=? AND status='planned'", (b,))
for p in plan:
    if p["production_id"] in done:
        continue
    utc = datetime.fromisoformat(f"{p['date']}T{p['time']}").astimezone().astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    db.execute("""INSERT INTO slots (brand_id, slot_at, production_id, platforms, status, note) VALUES (?,?,?,?, 'planned', 'waiting for upload')
                  ON CONFLICT(brand_id, slot_at) DO UPDATE SET production_id=excluded.production_id,
                  status=CASE WHEN slots.status IN ('scheduled','published') THEN slots.status ELSE 'planned' END""",
               (p["brand"], utc, p["production_id"], json.dumps(["youtube"])))
    planned += 1
db.commit()
print({"accounts": len(YT), "planned_slots": planned,
       "stages": dict(db.execute("SELECT current_state, COUNT(*) FROM productions GROUP BY 1").fetchall()),
       "slots": dict(db.execute("SELECT status, COUNT(*) FROM slots GROUP BY 1").fetchall())})
