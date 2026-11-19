"""Parable three-channel test: one script, three pictures (docs/brands/test-3d/experiment.md).

Usage:  python scripts/parable-sync.py <master_id> <copper_id> <brass_id> [--check]

The master production (Salt Parable, Macro) owns every script file. This copies the script and its
review files to the Copper (Host) and Brass (Neon) productions and writes film.json (what
packages/test3d builds from) in all three: same lines, hook, end text, key words, music marks and
pace; only voice, channel, visual and the engine look differ.
--check: write nothing, exit 1 when a film.json is missing or its lines differ from the master script.
"""
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COPY = ["script.json", "hook.json", "story.json", "packaging.json", "script-doctor.json", "fresh-eyes.script.json",
        "panel.script.json", "fact-check.json", "fix-ledger.json", "storyboard.md", "viewer-text.txt", "brief.md"]
STYLE = ("Dry, quick storyteller telling one friend an old story. Brisk pace, about 3 words per second, no long pauses inside a "
         "sentence. Short sentences land with a very small beat after them. Numbers are said clearly. The two questions at the "
         "end are asked plainly, to one person, not preached. No announcer or trailer voice.")
ARMS = [  # (brand, channel, visual, voice, engine)
    ("parable-salt", "Salt Parable", "Macro", "Algenib", None),
    ("parable-copper", "Copper Parable", "Host", "Achird", None),
    ("parable-brass", "Brass Parable", "Neon", "Iapetus",
     {"bloom": 1.3, "bloomthr": 0.7, "dof": 0, "grain": 0.012, "vig": 0.2, "contrast": 1.1, "sat": 1.2}),
]


def load(p):
    with open(p, encoding="utf8") as f:
        return json.load(f)


def film_for(script, pid, arm, old):
    brand, channel, visual, voice, engine = arm
    film = {
        "id": pid, "brand": brand, "title": script["title"],
        "format": {"width": 1080, "height": 1920, "fps": 30},
        "voice": voice, "style": STYLE, "pace": script.get("pace") or {"max_pause": 0.45, "tempo": 1.0, "target_wps": 2.8},
        "hook_text": script["hook_text"], "end_text": script["end_text"],
        "key_words": script.get("key_words"), "music": script.get("music"),
        "lines": [{"id": l["id"], "text": l["text"]} for l in script["narration"]["lines"]],
        "claims": script.get("claims", []),
        "channel": channel, "visual": visual,
    }
    eng = (old or {}).get("engine") or engine   # a film author may tune the look: keep it
    if eng:
        film["engine"] = eng
    if (old or {}).get("retake") is not None:   # a re-rolled voice take stays re-rolled
        film["retake"] = old["retake"]
    return {k: v for k, v in film.items() if v is not None}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv
    if len(args) != 3:
        sys.exit(__doc__)
    dirs = [os.path.join(ROOT, "productions", a) for a in args]
    script = load(os.path.join(dirs[0], "script.json"))
    want = [(l["id"], l["text"]) for l in script["narration"]["lines"]]
    bad = 0
    for pid, d, arm in zip(args, dirs, ARMS):
        fp = os.path.join(d, "film.json")
        old = load(fp) if os.path.exists(fp) else None
        if check:
            have = [(l["id"], l["text"]) for l in (old or {}).get("lines", [])]
            same = have == want and (old or {}).get("hook_text") == script["hook_text"] and (old or {}).get("end_text") == script["end_text"]
            print(f"{pid} {arm[2]:5} {'ok' if same else 'DIFFERS from the master script'}")
            bad += 0 if same else 1
            continue
        os.makedirs(d, exist_ok=True)
        if d != dirs[0]:
            for name in COPY:
                src = os.path.join(dirs[0], name)
                if os.path.exists(src):
                    shutil.copyfile(src, os.path.join(d, name))
        with open(fp, "w", encoding="utf8") as f:
            json.dump(film_for(script, pid, arm, old), f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"{pid} {arm[2]:5} film.json written ({len(want)} lines, voice {arm[3]})")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
