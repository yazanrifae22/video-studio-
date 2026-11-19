"""Record a YouTube upload in the studio DB (publishing + slots + event) so the dashboard shows it.

usage: python scripts/publish-record.py <production_id> <video_id> <YYYY-MM-DD> <HH:MM> [scheduled|published|failed] [error]
Times are the owner's local time (PC local) as entered in YouTube Studio.
"""
import json, os, sqlite3, sys
from datetime import datetime

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
pid, vid, day, hm = sys.argv[1:5]
status = sys.argv[5] if len(sys.argv) > 5 else "scheduled"
err = sys.argv[6] if len(sys.argv) > 6 else None
from datetime import timezone
# naive time = this PC's local zone (the same clock YouTube Studio's scheduler uses)
utc = datetime.fromisoformat(f"{day}T{hm}").astimezone().astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
brand = db.execute("SELECT brand_id FROM productions WHERE production_id=?", (pid,)).fetchone()[0]
meta = {"url": f"https://youtu.be/{vid}" if vid != "-" else None, "local_time": f"{day} {hm} PC local", "method": "browser (YouTube Studio, owner's Chrome)"}
key = f"youtube:{pid}"
db.execute("""INSERT INTO publishing (production_id, platform, account_id, metadata, scheduled_time, publication_status, approved_by, approved_at,
              external_post_id, error_details, idempotency_key) VALUES (?,?,?,?,?,?,?,datetime('now'),?,?,?)
              ON CONFLICT(idempotency_key) DO UPDATE SET metadata=excluded.metadata, scheduled_time=excluded.scheduled_time,
              publication_status=excluded.publication_status, external_post_id=excluded.external_post_id, error_details=excluded.error_details,
              updated_at=datetime('now')""",
           (pid, "youtube", brand, json.dumps(meta, ensure_ascii=False), utc, status, "owner", vid if vid != "-" else None, err, key))
if status in ("scheduled", "published"):
    db.execute("UPDATE productions SET current_state=?, updated_at=datetime('now') WHERE production_id=? AND current_state IN ('approved','scheduled')", (status, pid))
if status != "failed":
    db.execute("""INSERT INTO slots (brand_id, slot_at, production_id, platforms, status, note) VALUES (?,?,?,?,?,?)
                  ON CONFLICT(brand_id, slot_at) DO UPDATE SET production_id=excluded.production_id, status=excluded.status, note=excluded.note""",
               (brand, utc, pid, json.dumps(["youtube"]), status, meta["url"]))
db.execute("INSERT INTO events (kind, agent, production_id, level, message, data) VALUES (?,?,?,?,?,?)",
           ("publish", "orchestrator", pid, "error" if status == "failed" else "info",
            f"YouTube {status}: {pid} → {meta['url'] or '-'} at {day} {hm} (Cairo)", json.dumps({"production_id": pid})))
db.commit()
print("recorded", pid, status, utc)
