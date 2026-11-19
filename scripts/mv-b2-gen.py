"""Cut list generator for Mission Voices retention-v1 clips (mv-B2).

usage: python scripts/mv-b2-gen.py <spec.json>
spec: {production_id, asset_id, ranges:[[in,out],...] (non-contiguous joins at pauses), max_shot (3.9), zooms:[[zoom,pan_x,pan_y],...] alternating,
       hook, context, name, cta, extra: {cutlist keys merged in}, credit_text, hook_dur, ctx_dur, name_dur}
Each range is split into equal chunks <= max_shot; zoom alternates on EVERY cut (size change >= 20 %).
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = json.load(open(sys.argv[1], encoding='utf-8'))
mx = spec.get('max_shot', 3.9)
zooms = spec['zooms']
segs = []
k = 0
for a, b in spec['ranges']:
    n = max(1, math.ceil((b - a) / mx - 1e-9))
    step = (b - a) / n
    for i in range(n):
        s_in = round(a + i * step, 3)
        s_out = round(a + (i + 1) * step, 3) if i < n - 1 else round(b, 3)
        z, px, py = zooms[k % len(zooms)]
        if spec.get('fx'):
            k_ = 316 if spec.get('fill', 'cover') == 'cover' else 100  # % of canvas per unit of source width at zoom 1 (cover: 9:16 crop of 16:9; blur: fg fits width)
            px = round(-(spec['fx'][k] - 0.5) * k_ * z, 1)
        seg = {'asset_id': spec['asset_id'], 'src_in': s_in, 'src_out': s_out, 'fill': spec.get('fill', 'cover'), 'zoom': z, 'pan_x': px, 'pan_y': py,
               'mute_source': False, 'volume': 1.0,
               'why': 'retention-v1: single take, pause cuts at silences, zoom alternates on every cut'}
        if segs and i == 0:
            pass
        if spec.get('trim'):
            seg['trim'] = spec['trim']
        segs.append(seg)
        k += 1
segs[0]['audio_fade_in'] = 0.05
total = round(sum(s['src_out'] - s['src_in'] for s in segs), 2)
cta_at = round(total - 3.0, 2)
hd, cd, nd = spec.get('hook_dur', 2.6), spec.get('ctx_dur', 3.4), spec.get('name_dur', 3.4)
texts = [
    {'text': spec['hook'], 'at': 0.0, 'dur': hd, 'role': 'hook', 'y': -31},
    {'text': spec['context'], 'at': hd, 'dur': cd, 'role': 'lower_third', 'y': -32},
    {'text': spec['name'], 'at': round(hd + cd, 2), 'dur': nd, 'role': 'lower_third', 'y': -32},
    {'text': 'Footage: NASA', 'at': round(hd + cd + nd, 2), 'dur': round(cta_at - (hd + cd + nd), 2), 'role': 'credit', 'x': 30},
    {'text': spec['cta'], 'at': cta_at, 'dur': 3.0, 'role': 'cta'},
]
cl = {'production_id': spec['production_id'], 'width': 1080, 'height': 1920, 'fps': 30, 'segments': segs, 'texts': texts, 'narration': None,
      'captions': 'source', 'music': None, 'credits': [spec['attribution']], 'target_duration': total,
      'caption_clean': True, 'caption_onset_snap': True}
cl.update(spec.get('extra', {}))
out = ROOT / 'productions' / spec['production_id'] / 'cutlist.json'
out.parent.mkdir(parents=True, exist_ok=True)
json.dump(cl, open(out, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print(out, 'segments', len(segs), 'total', total, 'max', max(s['src_out'] - s['src_in'] for s in segs))
