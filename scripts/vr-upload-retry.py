"""Retry Podium Pop uploads until YouTube's daily upload cap resets (orchestrator, 2026-11-01).

Every 30 min: any viral-rankings plan entry not yet uploaded whose slot is under 10 min away moves to the next
free 4-a-day slot (owner-local 19:00, 22:00, 01:00, 04:00), then `youtube.ts upload viral-rankings` runs.
Stops when nothing is left to upload, or after 20 h.
"""
import datetime as dt, json, sqlite3, subprocess, time

SLOTS = ["19:00", "22:00", "01:00", "04:00"]
PLAN = "data/publish-plan.json"


def pending():
    db = sqlite3.connect("data/studio.db")
    done = {r[0] for r in db.execute("SELECT production_id FROM publishing WHERE platform='youtube' AND account_id='viral-rankings' AND external_post_id IS NOT NULL AND coalesce(publication_status,'')!='deleted'")}
    d = json.load(open(PLAN, encoding="utf8"))
    L = d if isinstance(d, list) else d["videos"]
    return d, L, [e for e in L if e.get("brand") == "viral-rankings" and e["production_id"] not in done]


def reslot(d, L, todo):
    taken = {(e["date"], e["time"]) for e in L if e.get("brand") == "viral-rankings"}
    soon = dt.datetime.now() + dt.timedelta(minutes=10)
    for e in todo:
        if dt.datetime.fromisoformat(f"{e['date']}T{e['time']}") > soon:
            continue
        day = dt.date.today()
        while True:
            free = [t for t in SLOTS if dt.datetime.fromisoformat(f"{day}T{t}") > soon and (day.isoformat(), t) not in taken]
            if free:
                e["date"], e["time"] = day.isoformat(), sorted(free, key=lambda t: dt.datetime.fromisoformat(f"{day}T{t}"))[0]
                taken.add((e["date"], e["time"]))
                print("reslot", e["production_id"], e["date"], e["time"], flush=True)
                break
            day += dt.timedelta(days=1)
    json.dump(d, open(PLAN, "w", encoding="utf8"), ensure_ascii=False, indent=1)


end = time.time() + 20 * 3600
while time.time() < end:
    d, L, todo = pending()
    if not todo:
        print("all uploaded", flush=True)
        break
    reslot(d, L, todo)
    out = subprocess.run("npx tsx scripts/youtube.ts upload viral-rankings", shell=True, capture_output=True, text=True, encoding="utf8", errors="replace").stdout
    for line in out.splitlines():
        if line.startswith("scheduled"):
            print(dt.datetime.now().strftime("%H:%M"), line, flush=True)
    if "uploadLimitExceeded" in out:
        print(dt.datetime.now().strftime("%H:%M"), "cap still on", flush=True)
    time.sleep(1800)
