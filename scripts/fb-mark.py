"""Mark Facebook reels as scheduled in the studio after they are scheduled in Meta Business Suite.

usage: python scripts/fb-mark.py <production_id> [<production_id> ...]
       python scripts/fb-mark.py --next quiz-ar   # print the next unscheduled plan entry as JSON (fb_file, caption, date, time)
"""
import datetime as dt, json, os, sqlite3, sys

sys.stdout.reconfigure(encoding="utf-8")
R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
plan = {p["production_id"]: p for p in json.load(open(os.path.join(R, "data", "fb-plan.json"), encoding="utf-8"))}
done = {r[0] for r in db.execute("SELECT production_id FROM publishing WHERE platform='facebook' AND publication_status IN ('scheduled','published')")}

if sys.argv[1] == "--next":
    for p in plan.values():
        fb = os.path.join(R, "data", "cache", "fb", f"{p['production_id']}.mp4")
        if p["brand"] == sys.argv[2] and p["production_id"] not in done and os.path.exists(fb) and os.path.getsize(fb) < 10 * 1024 * 1024:
            p["fb_file"] = fb
            p["mdy"] = dt.date.fromisoformat(p["date"]).strftime("%m/%d/%Y")
            d = dt.date.fromisoformat(p["date"])
            print(json.dumps({k: p[k] for k in ("production_id", "date", "time", "fb_file", "mdy")} | {"cap": p["caption"][:60].split(chr(10))[0]}, ensure_ascii=False))
            # caption -> Windows clipboard (pasted with Ctrl+V into the reel description box)
            cap = os.path.join(R, "data", "cache", "fb", "caption.txt")
            open(cap, "w", encoding="utf-8").write(p["caption"])
            import subprocess
            subprocess.run(["powershell", "-NoProfile", "-Command", f"Set-Clipboard -Value (Get-Content -Raw -Encoding UTF8 '{cap}')"], check=True)
            h, m = (p["time"].split(":") + ["00"])[:2] if p["time"] != "NOW" else ("NOW", "")
            if h != "NOW":
                hh = int(h)
                d = dt.date.fromisoformat(p["date"])
                # typed values + what Business Suite reports back (ccSched args) for the browser step
                print(json.dumps({"type": [p["mdy"], f"{(hh % 12) or 12:02d}", m, "A" if hh < 12 else "P"],
                                  "check": [f"{d:%b} {d.day}, {d.year}", str((hh % 12) or 12), str(int(m)), "AM" if hh < 12 else "PM"]}))
            break
    sys.exit()

for pid in sys.argv[1:]:
    p = plan[pid]
    now = p["time"] == "NOW"  # shared immediately
    local = dt.datetime.now() if now else dt.datetime.fromisoformat(f"{p['date']}T{p['time']}")
    off = 3 if local < dt.datetime(2026, 10, 30) else 2  # Africa/Cairo: summer time (UTC+3) ends midnight Thu 29 Oct 2026
    utc = (local - dt.timedelta(hours=off)).strftime("%Y-%m-%dT%H:%M:00Z")
    db.execute("""UPDATE publishing SET publication_status=?, scheduled_time=?, approved_by='owner', approved_at=datetime('now'),
                  updated_at=datetime('now') WHERE idempotency_key=?""", ("published" if now else "scheduled", utc, f"facebook:{pid}"))
    print(pid, "scheduled", p["date"], p["time"])
db.commit()
