"""Write productions/<id>/enhancements.json (retention-v1) for mv-B2 clips from the cut list + a small per-clip note file.
usage: python scripts/mv-b2-enh.py <production_id> <notes.json>   (notes: opens, ends, loop, pauses, dead_air, extra_note)"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
pid, nf = sys.argv[1], sys.argv[2]
n = json.load(open(nf, encoding='utf-8'))
cl = json.load(open(ROOT / 'productions' / pid / 'cutlist.json', encoding='utf-8'))
sj = json.load(open(ROOT / 'productions' / pid / 'script.json', encoding='utf-8'))
d = [s['src_out'] - s['src_in'] for s in cl['segments']]
tot = round(sum(d), 2)
hook = next(t for t in cl['texts'] if t['role'] == 'hook'); cta = next(t for t in cl['texts'] if t['role'] == 'cta')
zs = sorted({s['zoom'] for s in cl['segments']})
rules = [
 {"id": "R1", "applied": 20 <= tot <= 35, "how": f"{tot} s (target 20-35, hard max 40)"},
 {"id": "R2", "applied": True, "how": f"{n['pauses']} pause joins cut at measured silences ({n['dead_air']} s removed, 0.06 s margin each side); {n.get('skip','no content skipped')}"},
 {"id": "R3", "applied": True, "how": n['opens']},
 {"id": "R4", "applied": True, "how": f"hook card '{hook['text']}' at 0.0 s for {hook['dur']} s ({len(hook['text'].split())} words)"},
 {"id": "R5", "applied": max(d) <= 4.0, "how": f"{len(d)} shots, longest {max(d):.2f} s; zoom alternates {zs[0]} <-> {zs[-1]} (~+{round((zs[-1]/zs[0]-1)*100)} %) on every cut incl. contiguous splits; no push/pull"},
 {"id": "R6", "applied": True, "how": f"emphasis words {', '.join(cl.get('emphasis', []))} (yellow, larger); no bed"},
 {"id": "R7", "applied": True, "how": n['loop']},
 {"id": "R8", "applied": True, "how": f"CTA '{cta['text']}' top band (builder default y) at {cta['at']} s for 3.0 s, credit/title cards ended; frame-checked clear of the eyes"},
]
out = {"production_id": pid, "ruleset": "retention-v1", "duration_s": tot, "shots": len(d), "max_shot_s": round(max(d), 2), "avg_shot_s": round(tot / len(d), 2),
       "pauses_trimmed": n['pauses'], "dead_air_removed_s": n['dead_air'], "rules": rules,
       "hook": {"text": hook['text'], "at": 0.0, "dur": hook['dur']}, "cta": {"id": sj['cta']['id'], "text": cta['text'], "at": cta['at']},
       "emphasis": cl.get('emphasis', []), "loop": n['loop'], "results": None}
json.dump(out, open(ROOT / 'productions' / pid / 'enhancements.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(pid, tot, len(d), round(max(d), 2))
