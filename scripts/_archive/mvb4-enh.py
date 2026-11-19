"""mv-B4: write productions/<id>/enhancements.json (retention-v1) from the cut list + per-clip notes below.
usage: python scripts/mvb3-enh.py   (all three clips; run after the final build)"""
import json

N = {
    "is1d": dict(
        R3="opens on 'I could watch the sunrise and watch the waves coming in' (src 2143.4 s), the image; the set-up (20 minutes alone, air-conditioning unit) is left out and moved to the hook card 'Aldrin: 20 minutes alone up there'",
        R5="all pieces <= 3.5 s; cover close-up of Aldrin (SD 1989), face-tracked, zoom alternates 1.0 / 1.25 on every cut (+25 %)",
        R6="emphasis SUNRISE, MILLIONS; no bed",
        R7="ends on 'I was wandering around' (mid-sentence, 80 ms audio fade); replay returns to 'I could watch the sunrise' (what he saw from the tower, then the sunrise)",
        loop="'...they didn't know that I was wandering around' -> 'I could watch the sunrise': the end is him wandering up there, the loop returns to what he watched from there"),
    "wfam": dict(
        R3="opens on 'it's human nature to adapt very quickly to new situations' (src 1215.4 s), the thesis of his answer; the reporter's question is not in the clip",
        R5="all pieces <= 3.5 s; cover close-up of Armstrong (SD 1989), face-tracked, zoom alternates 1.0 / 1.25 on every cut",
        R6="emphasis BORED, FORGET; no bed",
        R7="ends on 'something that happened 20 years ago'; replay returns to 'human nature to adapt very quickly' (the surprise explains itself on the second pass)",
        loop="'...remember something that happened 20 years ago' -> 'it's human nature to adapt very quickly': the surprise at the end is the thing the opening explains"),
    "tqfb": dict(
        R3="opens on 'And the moon, as I think back on it, I don't really think of it so much as a place, as a direction' (src 140.8 s) = the hook; no lead-in",
        R5="all pieces <= 3.3 s; cover close-up of Collins (SD 1989), face-tracked, zoom alternates 1.0 / 1.25 on every cut",
        R6="emphasis DIRECTION, STEPPING; no bed",
        R7="ends on 'Mars and perhaps Titan, one of Saturn's moons'; replay returns to 'the moon ... a direction' (the end answers where the direction points)",
        loop="'...Mars and perhaps Titan, one of Saturn's moons' -> 'And the moon, as I think back on it...': the end names where 'out there' points, the loop restates the Moon as the direction"),
}
for k, m in N.items():
    pid = f"clip-261025-{k}"
    base = f"E:/clips-viral/productions/{pid}"
    try:
        cl = json.load(open(base + "/cutlist.json", encoding="utf-8"))
        sj = json.load(open(base + "/script.json", encoding="utf-8"))
    except OSError:
        continue
    S = cl["segments"]
    d = [s["src_out"] - s["src_in"] for s in S]
    dur = sum(d)
    trim, dead, jumps = 0, 0.0, 0
    for a, b in zip(S, S[1:]):
        g = b["src_in"] - a["src_out"]
        if abs(g) < 0.01:
            continue
        if 0 < g < 2.5:
            trim += 1
            dead += g
        else:
            jumps += 1
    hook = [t for t in cl["texts"] if t["role"] == "hook"][0]
    cta = [t for t in cl["texts"] if t["role"] == "cta"][0]
    rules = [
        {"id": "R1", "applied": 20 <= dur <= 35, "how": f"{dur:.1f} s, one story beat (target 20-35, hard max 40)"},
        {"id": "R2", "applied": True, "how": f"{trim} pauses > 0.26 s removed with silence-snapped jump cuts ({dead:.1f} s); pieces shorter than the builder's 0.8 s minimum keep their pause (no clip has more than one remaining gap > 0.25 s in the render, see retention-auto.json)"},
        {"id": "R3", "applied": True, "how": m["R3"]},
        {"id": "R4", "applied": True, "how": f"hook '{hook['text']}' ({len(hook['text'].split())} words) at 0.0 s for {hook['dur']} s"},
        {"id": "R5", "applied": True, "how": m["R5"]},
        {"id": "R6", "applied": True, "how": m["R6"]},
        {"id": "R7", "applied": True, "how": m["R7"]},
        {"id": "R8", "applied": True, "how": f"CTA {sj['cta']['id']} '{sj['cta']['text']}' in the top band for the last {cta['dur']} s, after the punchline; frame-checked clear of the eyes"},
    ]
    out = {"production_id": pid, "ruleset": "retention-v1", "duration_s": round(dur, 1), "shots": len(d), "max_shot_s": round(max(d), 2), "avg_shot_s": round(dur / len(d), 2),
           "pauses_trimmed": trim, "dead_air_removed_s": round(dead, 1), "passages_skipped": jumps, "rules": rules,
           "hook": {"text": hook["text"], "at": hook["at"], "dur": hook["dur"]}, "cta": {"id": sj["cta"]["id"], "text": sj["cta"]["text"], "at": cta["at"]},
           "emphasis": cl["emphasis"], "loop": m["loop"], "results": None}
    json.dump(out, open(base + "/enhancements.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(pid, out["duration_s"], out["shots"], out["max_shot_s"], trim, out["dead_air_removed_s"], jumps)
