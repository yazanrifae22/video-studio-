"""Print a JSON batch for the YouTube Studio automation: [[row_name, title, description, "Oct 25, 2026", "2:00 PM", production_id, date, time], ...]

usage: python scripts/publish-batch.py <brand> <first_index> <last_index>   (1-based, inclusive, positions in data/publish-plan.json for that brand)
"""
import datetime as dt, json, os, sys

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
brand, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
plan = [x for x in json.load(open(os.path.join(R, "data", "publish-plan.json"), encoding="utf-8")) if x["brand"] == brand]
out = []
for x in plan[a - 1:b]:
    d = dt.date.fromisoformat(x["date"])
    h, m = map(int, x["time"].split(":"))
    out.append([os.path.basename(x["queue_file"])[:-4], x["title"], x["description"], f"{d:%b} {d.day}, {d.year}",
                f"{(h - 1) % 12 + 1}:{m:02d} {'PM' if h >= 12 else 'AM'}", x["production_id"], x["date"], x["time"]])
sys.stdout.reconfigure(encoding="utf-8")
print(json.dumps(out, ensure_ascii=False))
