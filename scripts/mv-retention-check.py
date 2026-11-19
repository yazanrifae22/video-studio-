"""Automatic retention checks for a Mission Voices clip (rules R1-R8, docs/brands/clipping/goal-28.md "Retention rules v1").

Measures what can be measured on the cut list and the latest render; the retention reviewer judges the rest (R3 cold open,
R7 loop quality) by watching. Writes productions/<id>/<vN>/qa/retention-auto.json and prints a short summary.
Usage: python scripts/mv-retention-check.py <production_id>
"""
import json
import re
import subprocess
import sys

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding="utf-8", errors="replace")
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(p: Path):
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def latest_version(prod: Path):
    vs = sorted((d for d in prod.glob('v*') if d.is_dir() and d.name[1:].isdigit() and (d / 'render.mp4').exists()), key=lambda d: int(d.name[1:]))
    return vs[-1] if vs else None


def duration(mp4: Path) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp4)], capture_output=True, text=True)
    return float(out.stdout.strip())


def silences(mp4: Path, db=-35, min_s=0.25):
    """Speech gaps longer than min_s (silencedetect on the rendered mix)."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(mp4), '-vn', '-af', f'silencedetect=n={db}dB:d={min_s}', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    starts = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', r.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    if len(starts) > len(ends):  # silence running to the end of the file has no silence_end
        ends.append(duration(mp4))
    return [(round(s, 2), round(e, 2)) for s, e in zip(starts, ends)]


def other_cta_texts(skip: str):
    texts = {}
    for sj in (ROOT / 'productions').glob('clip-*/script.json'):
        if sj.parent.name == skip:
            continue
        t = ((load(sj) or {}).get('cta') or {}).get('text')
        if t:
            texts[t.strip().lower()] = sj.parent.name
    return texts


def main(pid: str):
    prod = ROOT / 'productions' / pid
    cl, sj, enh = load(prod / 'cutlist.json') or {}, load(prod / 'script.json') or {}, load(prod / 'enhancements.json')
    v = latest_version(prod)
    if v is None:
        sys.exit(f'{pid}: no render found')
    mp4 = v / 'render.mp4'
    dur = duration(mp4)
    segs = [s['src_out'] - s['src_in'] for s in cl.get('segments', [])]
    texts = cl.get('texts', [])
    hook = next((t for t in texts if t.get('role') == 'hook'), None)
    cta = next((t for t in texts if t.get('role') == 'cta'), None)
    sil = silences(mp4)
    hold = float(cl.get('end_hold') or 0)  # intended frozen frame + room tone after the last word: not dead air
    gaps = [g for g in sil if g[0] > 0.05 and g[1] < dur - 0.35 and not (hold and g[0] >= dur - hold - 0.45)]
    lead = next((g[1] for g in sil if g[0] <= 0.05), 0.0)
    dupes = other_cta_texts(pid)
    cta_text = ((sj.get('cta') or {}).get('text') or (cta or {}).get('text') or '').strip()
    desc_first = (sj.get('description') or '').strip().splitlines()[0] if sj.get('description') else ''

    checks = {
        'R1_length': {'value': round(dur, 1), 'pass': 20 <= dur <= 50, 'target': '25-35 s single beat or 40-50 s full arc (Studio learning 2026-11-03), hard max 50', 'ideal': 25 <= dur <= 35 or 40 <= dur <= 50},
        'R2_dead_air': {'gaps_over_0.25s': gaps, 'pass': len(gaps) <= 1 and all(e - s <= 0.45 for s, e in gaps)},
        'R3_speech_starts': {'first_speech_s': round(lead, 2), 'pass': lead <= 0.3, 'note': 'reviewer also judges: is the first line the emotional core?'},
        'R4_hook_at_0': {'hook': hook, 'pass': bool(hook) and hook['at'] <= 0.1 and len(hook['text'].split()) <= 6 and hook['dur'] >= 2.0},
        'R5_shot_change': {'shots': len(segs), 'max_shot_s': round(max(segs), 2) if segs else None,
                           'over_4s': [round(d, 2) for d in segs if d > 4.0], 'pass': bool(segs) and max(segs) <= 4.05},
        'R6_emphasis': {'words': cl.get('emphasis') or [], 'pass': 1 <= len(cl.get('emphasis') or []) <= 4},
        'R7_loop_tail': {'tail_silence_s': next((round(dur - s, 2) for s, e in sil if e >= dur - 0.35), 0.0), 'end_hold_s': hold, 'pass': None, 'note': 'reviewer judges: does the last line flow back into the opening?'},
        'R8_cta': {'cta': cta, 'text': cta_text, 'in_last_3_5s': bool(cta) and cta['at'] >= dur - 3.6,
                   'unique': cta_text.lower() not in dupes, 'duplicate_of': dupes.get(cta_text.lower()),
                   'desc_first_line': desc_first, 'pass': bool(cta) and cta['at'] >= dur - 3.6 and cta_text.lower() not in dupes and bool(cta_text) and cta_text.split('?')[0].lower()[:12] in desc_first.lower()},
        'log': {'enhancements_json': enh is not None, 'ruleset': (enh or {}).get('ruleset'), 'pass': enh is not None},
    }
    auto = [k for k, c in checks.items() if c['pass'] is not None]
    passed = [k for k in auto if checks[k]['pass']]
    out = {'production_id': pid, 'version': v.name, 'render': str(mp4), 'checks': checks, 'auto_passed': f'{len(passed)}/{len(auto)}',
           'failed': [k for k in auto if not checks[k]['pass']]}
    (v / 'qa').mkdir(exist_ok=True)
    (v / 'qa' / 'retention-auto.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"{pid} {v.name}: {out['auto_passed']} auto checks passed; failed: {', '.join(out['failed']) or 'none'}")
    for k in out['failed']:
        c = {kk: vv for kk, vv in checks[k].items() if kk != 'pass'}
        print(f'  {k}: {json.dumps(c, ensure_ascii=False)[:300]}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
