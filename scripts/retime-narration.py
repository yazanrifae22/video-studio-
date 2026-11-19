"""Even out narration gaps using the real line lengths of the latest build.

Moves only the lines next to a long gap (never the wording), aiming for gaps up to --max (default 0.9 s), starting from the approved script times.
Each line moves at most --limit seconds (default 0.8). Writes cutlist.json and the ranking plan.
Usage: python scripts/retime-narration.py <production_id> [--max 0.9] [--limit 1.2] [--dry]
"""
import glob, json, os, sys

def load(p):
    with open(p, encoding="utf8") as f:
        return json.load(f)

def save(p, d):
    with open(p, "w", encoding="utf8", newline="\n") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")

def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default

def balance(start, dur, max_gap, limit):
    """Move only the lines next to a long gap, by the smallest amount that fixes it."""
    s, n = list(start), len(start)
    for i in range(1, n):
        before = s[i] - s[i - 1] - dur[i - 1]
        if before <= max_gap:
            continue
        shift = min(before - max_gap, limit)
        if i + 1 < n:
            after = s[i + 1] - s[i] - dur[i]
            if after + shift > max_gap:   # pulling this line earlier would open the next gap: split the difference
                shift = max(0, min(shift, (before - after) / 2))
        s[i] -= shift
    return [round(x, 3) for x in s]

def main():
    pid = sys.argv[1]
    max_gap, limit = opt("--max", 0.9), opt("--limit", 0.8)
    d = os.path.join("productions", pid)
    versions = [p for p in glob.glob(os.path.join(d, "v[0-9]*")) if os.path.isdir(p)]
    latest = max(versions, key=lambda p: int(os.path.basename(p)[1:]))
    durs = {l["id"]: l["end"] - l["start"] for l in load(os.path.join(latest, "narration.align.json"))["lines"]}
    cut_path = os.path.join(d, "cutlist.json")
    cut = load(cut_path)
    lines = sorted(cut["narration"]["lines"], key=lambda l: l["at"])
    approved = {l["id"]: l["at_ms"] / 1000 for l in load(os.path.join(d, "script.json"))["narration"]}
    lines.sort(key=lambda l: approved[l["id"]])
    old = [approved[l["id"]] for l in lines]
    if lines[0]["at"] > old[0] and "--keep-first" in sys.argv:
        old[0] = lines[0]["at"]
    new = balance(old, [durs[l["id"]] for l in lines], max_gap, limit)
    gaps = [round(new[i + 1] - new[i] - durs[lines[i]["id"]], 2) for i in range(len(new) - 1)]
    moved = {l["id"]: (a, b) for l, a, b in zip(lines, old, new) if a != b}
    left = [g for g in gaps if g > 1.0]
    print(json.dumps({"production": pid, "from": os.path.basename(latest), "moved": moved, "gaps": gaps, "still_over_1s": left}))
    if "--dry" in sys.argv:
        return
    at = dict(zip([l["id"] for l in lines], new))
    for l in cut["narration"]["lines"]:
        l["at"] = at[l["id"]]
    save(cut_path, cut)
    for p in glob.glob(os.path.join(d, "*plan*.json")):
        if "publish" in p:
            continue
        data = load(p)
        nar = data.get("narration")
        if isinstance(nar, dict) and nar.get("lines") and "at_ms" in nar["lines"][0]:
            for l in nar["lines"]:
                if l["id"] in at:
                    l["at_ms"] = round(at[l["id"]] * 1000)
            save(p, data)

main()
