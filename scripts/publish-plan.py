"""Build the YouTube upload/schedule plan for every approved, not-yet-scheduled production.

usage: python scripts/publish-plan.py [--start 2026-10-24] [--out path.json]
Writes data/publish-plan.json: one entry per video with channel, file, title, description, schedule date/time (owner's local
time, Cairo) and the altered/synthetic-content flag. Title/description/hashtags come from productions/<id>/packaging.json
(chosen_title, description, hashtags; audit 2026-11-08 I1) with script.json as fallback (scripts/packaging_meta.py); credits
(attribution block) stay from script.json unchanged (rights condition) and are appended once with the hashtags.
Slot times come from config/publish-times.json (scripts/audience-slots.py: each channel's viewers' time zone from YouTube
Analytics, owner 2026-10-26) and are converted to the owner's local time per date (DST-safe); without that file the old fixed
owner-local cadence below applies. Old cadence: Planet Extremes 21:00 1/day; The Way It Was Made 4/day (11:00, 15:00, 19:00, 23:00; owner 2026-10-25, goal-26); Mission Voices 4/day (10:00, 14:00, 18:00, 22:00; owner 2026-10-25, goal-28); شو شايف؟ 4/day (11:00, 14:00, 17:00, 20:00; owner 2026-10-24); slots already taken by scheduled videos are skipped.
"""
import datetime as dt, glob, json, os, sqlite3, sys
from zoneinfo import ZoneInfo

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from packaging_meta import published_meta  # noqa: E402

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(R, "data", "publish-plan.json")  # --out: scratch path for tests
start = dt.date.fromisoformat(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else dt.date.today() + dt.timedelta(days=1)
CH = {"rankings": ("Planet Extremes", ["21:00"]), "clipping": ("Mission Voices", ["10:00", "14:00", "18:00", "22:00"]),
      "compilations": ("The Way It Was Made", ["11:00", "15:00", "19:00", "23:00"]), "quiz-ar": ("شو شايف؟", ["11:00", "14:00", "17:00", "20:00"]),
      "viral-rankings": ("Podium Pop", ["12:00", "15:00", "18:00", "21:00"]),
      "kids": ("Tiko & Pip", ["16:00"]),
      "tech": ("Tech Made Simple", ["19:00"]),
      "celebrity": ("Moments That Made Them", ["11:00"])}  # revived 2026-11-08 (owner): NEW celebrity:build productions only; legacy queue stays with youtube.ts upload-legacy  # resumed 2026-11-03 (owner); real slot from config/publish-times.json (Africa/Cairo)  # Sunny Hill episodes, Made for Kids (owner OK to schedule 2026-11-03)

PT = os.path.join(R, "config", "publish-times.json")
AUD = json.load(open(PT, encoding="utf-8")) if os.path.exists(PT) else {}
PAUSED = {b for b, a in AUD.items() if a.get("paused")}  # a brand with "paused": true gets no new slots (rankings + celebrity unpaused 2026-11-08)


def slot(brand, i):
    """i-th slot from start for a brand → (owner-local date, 'HH:MM')."""
    if brand in AUD:
        a = AUD[brand]; times = a.get("new_times") or a["times"]; n = len(times)  # new_times: grid for new productions when "times" belongs to a legacy queue (celebrity)
        local = dt.datetime.combine(start + dt.timedelta(days=i // n), dt.time.fromisoformat(times[i % n]), ZoneInfo(a["audience_tz"]))
        o = local.astimezone().replace(tzinfo=None)
        return o.date(), o.strftime("%H:%M")
    times = CH[brand][1]
    return start + dt.timedelta(days=i // len(times)), times[i % len(times)]


db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
done = {r[0] for r in db.execute("SELECT production_id FROM publishing WHERE platform='youtube' AND publication_status IN ('scheduled','published')")}
taken = {(b, json.loads(m or "{}").get("local_time", "")[:16]) for b, m in db.execute(
    "SELECT p.brand_id, pu.metadata FROM publishing pu JOIN productions p USING(production_id) WHERE pu.platform='youtube' AND pu.publication_status IN ('scheduled','published')")}
# keep the cadence: new slots start after the brand's last already-scheduled video (never 8 a day by interleaving)
last = {b: dt.datetime.fromisoformat(t.replace("Z", "+00:00")) for b, t in db.execute(
    "SELECT p.brand_id, max(pu.scheduled_time) FROM publishing pu JOIN productions p USING(production_id) WHERE pu.platform='youtube' AND pu.publication_status='scheduled' GROUP BY 1")}
rows = db.execute("SELECT production_id, brand_id, title FROM productions WHERE approval_status='approved' ORDER BY created_at, production_id").fetchall()
# Long-form (quiz-long, productions with episode.json; first one 2026-11-13) is NEVER auto-planned: the daily uploader's slots,
# titles and front-insert are Shorts logic. The owner uploads/schedules a long-form video explicitly (thumbnail, chapters,
# playlist, end screen) through scripts/youtube-long.ts (private upload + thumbnail + playlist + captions) and Studio.
rows = [r for r in rows if not (r[1] == "quiz-ar" and os.path.exists(os.path.join(R, "productions", r[0], "episode.json")))]  # kids episodes also have episode.json: brand check is required


def _ep(row):
    """kids: publish Sunny Hill episodes in episode order (script.json title 'Sunny Hill Ep N: ...'), other brands keep created order."""
    if row[1] != "kids":
        return 0
    f = os.path.join(R, "productions", row[0], "script.json")
    import re
    m = re.search(r"Ep\s*(\d+)", json.load(open(f, encoding="utf-8")).get("title", "")) if os.path.exists(f) else None
    return int(m.group(1)) if m else 999


rows.sort(key=_ep)  # stable: non-kids order unchanged

plan, next_slot = [], {}
for pid, brand, dbtitle in rows:
    if pid in done or brand not in CH or brand in PAUSED:
        continue
    pdir = os.path.join(R, "productions", pid)
    vers = sorted(glob.glob(os.path.join(pdir, "v*", "render.mp4")), key=lambda p: int(os.path.basename(os.path.dirname(p))[1:]))
    if brand == "celebrity" and (not vers or pid.startswith(("celebrity-", "yt-"))):
        continue  # legacy celebrity videos (no vN render) belong to youtube.ts upload-legacy, never the plan
    s = json.load(open(os.path.join(pdir, "script.json"), encoding="utf-8")) if os.path.exists(os.path.join(pdir, "script.json")) else {}
    # title/description/hashtags: packaging.json first, script.json fallback; credits from script.json (scripts/packaging_meta.py, audit I1)
    m = published_meta(pdir, brand, dbtitle, s)
    if m.get("ai_text"):  # owner 2026-11-08: no AI-generation text anywhere in the published info -> refuse this entry
        sys.stderr.buffer.write(("REFUSED %s: AI-generation text %s\n" % (pid, "; ".join('%s: "%s"' % (h["key"], h["phrase"]) for h in m["ai_text"][:4]))).encode("utf8"))
        continue
    if m.get("limits"):  # owner 2026-11-08: YouTube metadata limits -> refuse this entry with field/length/limit (never truncate)
        sys.stderr.buffer.write(("REFUSED %s: YouTube limits: %s (%s)\n" % (pid, "; ".join(i["message"] for i in m["limits"]), m["source"])).encode("utf8"))
        continue
    title, desc = m["title"], m["description"]
    # altered/synthetic flag (owner 2026-11-08): packaging.json altered_content decides (default false); legacy productions without
    # packaging.json keep the old rule (quiz-ar: rights condition C1 platform toggle; others: real archive footage)
    altered = m["altered"] if m.get("altered") is not None else brand == "quiz-ar"
    i = next_slot.get(brand, 0)
    soon = dt.datetime.now() + dt.timedelta(minutes=30)
    floor = last[brand] + dt.timedelta(hours=2) if brand in last else None
    while ((brand, "%s %s" % slot(brand, i)) in taken or dt.datetime.fromisoformat("%sT%s" % slot(brand, i)) < soon
           or (floor and dt.datetime.fromisoformat("%sT%s" % slot(brand, i)).astimezone() < floor)):
        i += 1
    next_slot[brand] = i + 1
    day, t = slot(brand, i)
    plan.append(dict(production_id=pid, brand=brand, channel=CH[brand][0], file=vers[-1] if vers else None,
                     title=title, description=desc, date=day.isoformat(), time=t, altered=altered,  # limits checked above (no truncation)
                     tags=[x.lstrip("#") for x in m["hashtags"]], meta_source=m["source"],
                     pinned_comment=s.get("pinned_comment_ar")))

# Never drop what the current plan file already holds (legacy brands such as celebrity, or brands outside CH): keep every
# existing entry whose production_id is not regenerated above. DB publishing rows are only read (never modified) here.
CUR = os.path.join(R, "data", "publish-plan.json")
if os.path.exists(CUR):
    new_ids = {p["production_id"] for p in plan}
    seen = set(new_ids)
    for old in json.load(open(CUR, encoding="utf-8")):
        if old.get("production_id") not in seen:
            plan.append(old); seen.add(old.get("production_id"))
json.dump(plan, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
last = {}
for p in plan:
    last[p.get("channel") or p.get("brand")] = p.get("date")
print(len(plan), "videos;", {k: sum(1 for p in plan if (p.get("channel") or p.get("brand")) == k) for k in last}, "last dates:", last,
      "missing file:", [p["production_id"] for p in plan if not p.get("file")])
