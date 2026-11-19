"""Regression guard for quiz builds: measure the QA-checked points of each version and diff them.

usage: python -I regress.py <production_dir> <vA> <vB> [<vC> ...]   -> prints a table, writes <production_dir>/regress_<last>.json

Measured per version (same methods QA uses):
- caption pages: text, start vs the nearest speech-activity onset (-45 dBFS after >= 80 ms of silence, 10 ms frames, on
  the narration-only track rebuilt from narration/ + timeline.json), end vs nearest offset
- countdown: ring entry (round T0 + cd - 0.15) minus the question's last caption word end; tick cues present at cd+0/1/2
- ding margins: answer-line RMS (first 0.5 s of speech) minus ding RMS at its mixed gain (build.json sfx gains)
- end-card: first end-card frame vs the outro's card-fade start
"""
import json, os, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles default to cp1252

pdir = sys.argv[1]
vers = sys.argv[2:]
SR = 16000


def pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def rms_db(x):
    w = x[: len(x) // 160 * 160].reshape(-1, 160)
    e = (w ** 2).mean(1)
    e = e[e > 1e-6]
    return 10 * np.log10(e.mean()) if len(e) else -99.0


def measure(v):
    d = os.path.join(pdir, v)
    t = json.load(open(os.path.join(d, "timeline.json"), encoding="utf-8"))
    caps = json.load(open(os.path.join(d, "captions.json"), encoding="utf-8"))
    b = json.load(open(os.path.join(d, "build.json"), encoding="utf-8"))
    nd = os.path.join(d, "narration")
    files = sorted(os.listdir(nd))
    hd = os.path.join(nd, "hook")  # hook_intro takes live in narration/hook/<id>*.wav
    if os.path.isdir(hd):
        files += [os.path.join("hook", x) for x in sorted(os.listdir(hd))]
    tot = np.zeros(int((t["total"] + 2) * SR), np.float32)
    line_audio = {}
    for ln in t["lines"]:
        base = lambda x: os.path.basename(x)
        f = next(x for x in files if f"_{ln['id']}." in base(x) or base(x).endswith(f"_{ln['id']}.wav")
                 or (x.startswith("hook") and base(x).startswith(ln["id"])))
        a = pcm(os.path.join(nd, f)); line_audio[ln["id"]] = (ln["at"], a)
        s = int(ln["at"] * SR); tot[s:s + len(a)] += a[: len(tot) - s]
    n = len(tot) // 160
    env = 20 * np.log10(np.sqrt((tot[: n * 160].reshape(n, 160) ** 2).mean(1)) + 1e-9)
    act = env > -45
    on = [i / 100 for i in range(1, n) if act[i] and not act[max(0, i - 8):i].any()]
    off = [i / 100 for i in range(1, n) if not act[i] and act[i - 1] and not act[i:i + 8].any()]
    pages = []
    for c in caps:
        no = min(on, key=lambda x: abs(x - c["t0"])); nf = min(off, key=lambda x: abs(x - c["t1"]))
        pages.append({"text": c["text"], "t0": round(c["t0"], 3), "onset": no, "lead_s": round(no - c["t0"], 3), "t1": round(c["t1"], 3), "offset": nf, "hang_s": round(c["t1"] - nf, 3)})
    cds = []
    for r in t["rounds"]:
        p = r["plan"]
        if p.get("cd") is None:
            continue
        T, cd = r["T0"], r["T0"] + p["cd"]
        qid = next((l["id"] for l in p["lines"] if l["id"].endswith("-q")), None)
        qend = max((c["t1"] for c in caps if qid and abs(c["t0"] - (T + next(l["at"] for l in p["lines"] if l["id"] == qid))) < 3 and c["t0"] < cd), default=None)
        ticks = sorted(round(s["at"] - cd, 2) for s in t["sfx"] if s["name"] in ("tick", "tick_last") and cd - 0.05 <= s["at"] <= cd + 2.1)
        # speech end of the question = last activity offset before the ring entry
        sp_end = max((o for o in off if o <= cd + 0.2), default=None)
        cds.append({"round": r["id"], "ring_entry": round(cd - 0.15, 3), "question_speech_end": sp_end, "gap_s": round(cd - 0.15 - sp_end, 3) if sp_end else None, "ticks_rel": ticks})
    dings = []
    sfxd = os.path.join(pdir, "..", "..", "data", "brand", "quiz-ar", "sfx")
    ding_rms = rms_db(pcm(os.path.join(sfxd, "ding.wav"))[: int(0.5 * SR)])
    for s in b.get("sfx", []):
        if s["name"] != "ding" or not s.get("under") or s["under"] not in line_audio:
            continue
        at, a = line_audio[s["under"]]
        a = a[int(0.06 * SR): int(0.56 * SR)]
        dings.append({"at": s["at"], "line": s["under"], "answer_minus_ding_db": round(rms_db(a) - (ding_rms + s["gain_db"]), 1), "ding_gain_db": s["gain_db"]})
    out = t["rounds"][-1]
    ec = b.get("endcard_frame")
    return {"version": v, "duration": t["total"], "caption_pages": pages, "countdowns": cds, "dings": dings,
            "endcard_frame": ec, "outro_card_fade_start_frame": round((out["T0"] + out["plan"]["marks"].get("endcard", 0) - 0.15) * 30) if out["plan"]["marks"].get("endcard") is not None else None}


res = [measure(v) for v in vers]
last = res[-1]
FR = 1 / 30
print("== caption pages (lead = onset - page start; + = page early, - = page late; 1 frame = 0.033 s)")
for r in res:
    bad = [p for p in r["caption_pages"] if abs(p["lead_s"]) > FR + 0.005 and abs(p["lead_s"]) < 0.6]
    print(f'{r["version"]}: {len(r["caption_pages"])} pages, max |lead| {max(abs(p["lead_s"]) for p in r["caption_pages"] if abs(p["lead_s"]) < 0.6):.3f} s, outside +-1 frame: {[(p["t0"], p["lead_s"], p["text"]) for p in bad]}')
print("== caption groups")
for r in res:
    print(r["version"], " | ".join(p["text"] for p in r["caption_pages"]))
print("== countdowns (gap = ring entry - question speech end)")
for r in res:
    print(r["version"], [(c["round"], c["gap_s"], c["ticks_rel"]) for c in r["countdowns"]])
print("== dings (answer RMS - ding RMS, dB)")
for r in res:
    print(r["version"], [(d["line"], d["answer_minus_ding_db"]) for d in r["dings"]])
print("== end-card: first end-card frame vs score-card fade start frame")
for r in res:
    print(r["version"], r["endcard_frame"], r["outro_card_fade_start_frame"], "duration", round(r["duration"], 3))
json.dump(res, open(os.path.join(pdir, f"regress_{vers[-1]}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=float)
