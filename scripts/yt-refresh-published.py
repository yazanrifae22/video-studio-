"""Mark scheduled YouTube posts that have gone public as 'published' in data/studio.db, then re-sync the dashboard.

usage: python scripts/yt-refresh-published.py
Reads each channel's live list via `npx tsx scripts/youtube.ts list <brand>` (privacy == public), updates publishing + slots,
and runs scripts/sync-publishing.py so the board stage and calendar show 'published'.
"""
import json, os, sqlite3, subprocess, sys

sys.stdout.reconfigure(encoding="utf-8")
R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRANDS = ["rankings", "clipping", "compilations", "quiz-ar"]

public = []
for b in BRANDS:
    out = subprocess.run("npx tsx scripts/youtube.ts list " + b, cwd=R, shell=True, capture_output=True, text=True, encoding="utf-8", timeout=300).stdout
    try:
        vids = json.loads(out[out.index("["):])
    except ValueError:
        print(b, "list failed:", out[:200])
        continue
    public += [v["id"] for v in vids if v.get("privacy") == "public"]

db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
n = 0
for vid in public:
    for (pid,) in db.execute("SELECT production_id FROM publishing WHERE platform='youtube' AND publication_status='scheduled' AND external_post_id LIKE ?",
                             (f"%{vid}%",)).fetchall():
        db.execute("UPDATE publishing SET publication_status='published', updated_at=datetime('now') WHERE production_id=? AND platform='youtube'", (pid,))
        db.execute("UPDATE slots SET status='published' WHERE production_id=?", (pid,))
        print("published:", pid, vid)
        n += 1
db.commit()
print(n, "newly published;", len(public), "public in total")
subprocess.run([sys.executable, os.path.join(R, "scripts", "sync-publishing.py")], cwd=R)
