"""Copy the approved narration from script.json into the files the build reads.

The builder takes narration from cutlist.json (made from the ranking plan), not from script.json,
so a rewrite that only touched script.json never reached the video (found 2026-11-08, Podium Pop).
Usage: python scripts/sync-narration.py <production_id> [...]   --check = report only, exit 1 on drift
"""
import glob, json, os, sys

def load(p):
    with open(p, encoding="utf8") as f:
        return json.load(f)

def save(p, d):
    with open(p, "w", encoding="utf8", newline="\n") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")

def sync_lines(lines, script_lines):
    old = {l["id"]: l for l in lines}
    uses_ms = "at_ms" in lines[0]   # ranking plans use at_ms, cut lists use at (seconds)
    out = []
    for s in script_lines:
        n = dict(old.get(s["id"], {}))
        n.update({"id": s["id"], "text": s["text"]})
        n.pop("at", None)
        n.pop("at_ms", None)
        if uses_ms:
            n["at_ms"] = s["at_ms"]
        else:
            n["at"] = round(s["at_ms"] / 1000, 3)
        if s.get("say"):
            n["say"] = s["say"]
        else:
            n.pop("say", None)
        out.append(n)
    return out

def main(argv):
    check = "--check" in argv
    drift = 0
    for pid in [a for a in argv if not a.startswith("--")]:
        d = os.path.join("productions", pid)
        script = load(os.path.join(d, "script.json"))["narration"]
        files = [os.path.join(d, "cutlist.json")] + [p for p in glob.glob(os.path.join(d, "*plan*.json")) if "publish" not in p]
        for p in files:
            if not os.path.exists(p):
                continue
            data = load(p)
            nar = data.get("narration")
            if not isinstance(nar, dict) or not nar.get("lines"):
                continue
            new = sync_lines(nar["lines"], script)
            same = [(l["id"], l["text"]) for l in nar["lines"]] == [(l["id"], l["text"]) for l in new]
            words = lambda ls: sum(len(l["text"].split()) for l in ls)
            print(f"{pid} {os.path.basename(p)}: {words(nar['lines'])} -> {words(new)} words, {'in sync' if same else 'DRIFT'}")
            if not same:
                drift += 1
                if not check:
                    nar["lines"] = new
                    save(p, data)
    return 1 if check and drift else 0

sys.exit(main(sys.argv[1:]))
