#!/usr/bin/env python
"""framing-check.py productions/<id>/v<N>  -> v<N>/qa/framing.json (viral-rankings, 2026-11-08).

HEURISTIC EVIDENCE, not detection: motion + edges on a 108x192 grid (packages/ranking/py/clearance.py), measured on the picture as framed in
timeline.json. Per entry: follow zoom used, whether the subject evidence touches the picture edge around the payoff, and the share of the
subject evidence hidden by the caption pill, the rail plate and the subscribe badge. Productions without rank layers are skipped (exit 0).
"""
import json
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'packages', 'ranking', 'py'))
import clearance as C  # noqa: E402

ZOOM_GUARD = 0.75
COVER_FLAG = 25.0
EDGE_STRIP = 0.04      # outer 4 % of the picture on each side
EDGE_SHARE = 0.06      # subject evidence share in a strip that counts as touching
HOLD_S = 0.4
DIFFUSE = 0.20        # top-5 % cells hold under this share of the evidence: the heuristic cannot see the subject here (moving camera, textured ground)


def rj(p):
    try:
        with open(p, encoding='utf8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def done(out, doc, msg):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf8') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
    print(msg)
    sys.exit(0)


def track(tl, name):
    for t in tl.get('tracks', []):
        if t.get('name') == name:
            return t.get('items', [])
    return []


def text_rect(it):
    tr = it.get('transform') or {}
    p = it.get('props') or {}
    font = (p.get('fontSize') or 114) * 0.5625
    lines = str(it.get('text', '')).split('\n')
    w, h = max(len(x) for x in lines) * font * 0.62 + 70, len(lines) * font * 1.08 + 36
    cx, cy = C.W / 2 + (tr.get('x') or 0) / 100 * C.W, C.H / 2 + (tr.get('y') or 0) / 100 * C.H
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]


def offset(it):
    tr = it.get('transform') or {}
    return (tr.get('x') or 0) / 100 * C.W, (tr.get('y') or 0) / 100 * C.H


def alpha_box(src, cache={}):
    if src not in cache:
        from PIL import Image
        cache[src] = Image.open(src).convert('RGBA').getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
    return cache[src]


def touch_edges(sal, rect, t, half=HOLD_S):
    """Sides of the picture rect where thresholded evidence reaches the outer strip around time t."""
    maps = [s for tt, s in sal if abs(tt - t) <= half]
    if not maps:
        return None
    m = np.mean(maps, axis=0)
    peak = float(m.max())
    if peak <= 1e-6:
        return None
    mask = m >= max(0.5 * peak, 0.15)
    x0, y0, x1, y1 = [max(0, min(n, v)) for v, n in zip((rect[0] / C.W * C.GW, rect[1] / C.H * C.GH, rect[2] / C.W * C.GW, rect[3] / C.H * C.GH), (C.GW, C.GH, C.GW, C.GH))]
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    box = mask[y0:y1, x0:x1]
    total = int(box.sum())
    if total == 0:
        return None
    gh, gw = box.shape
    st, sx = max(1, int(round(gh * EDGE_STRIP))), max(1, int(round(gw * EDGE_STRIP)))
    sides = {'top': box[:st, :], 'bottom': box[-st:, :], 'left': box[:, :sx], 'right': box[:, -sx:]}
    return [k for k, v in sides.items() if int(v.sum()) / total >= EDGE_SHARE and int(v.sum()) >= 2]


def main():
    if len(sys.argv) != 2:
        print('usage: framing-check.py productions/<id>/v<N>')
        sys.exit(2)
    vdir = sys.argv[1].rstrip('/\\')
    out = os.path.join(vdir, 'qa', 'framing.json')
    pdir = os.path.dirname(vdir)
    tl = rj(os.path.join(vdir, 'timeline.json'))
    if not tl:
        done(out, {'skipped': True, 'reason': 'no timeline.json (not a rank-layer production)'}, 'framing-check: skipped (no timeline.json)')
    if not track(tl, 'VR Rail Plate') and not track(tl, 'VR Rail'):
        done(out, {'skipped': True, 'reason': 'timeline has no rank layers'}, 'framing-check: skipped (no rank layers)')
    fps = tl.get('fps', 30)
    pics = C.picture_items(tl)
    if not pics:
        done(out, {'skipped': True, 'reason': 'no picture items'}, 'framing-check: skipped (no picture items)')
    cl = rj(os.path.join(pdir, 'cutlist.json')) or {}
    plan = rj(os.path.join(pdir, 'ranking-plan.json')) or {}
    segs = cl.get('segments') or []
    if len(segs) != len(pics):
        segs = []
    groups = []
    for i, it in enumerate(pics):
        rank = segs[i].get('item') if segs else None
        if groups and rank is not None and groups[-1]['rank'] == rank:
            groups[-1]['items'].append(i)
        else:
            groups.append({'rank': rank, 'items': [i]})
    plan_by_rank = {e.get('rank_position'): e for e in plan.get('entries', [])}
    sal = C.timeline_saliency(tl)
    caps, plates, badges = track(tl, 'Captions'), track(tl, 'VR Rail Plate'), track(tl, 'VR Badge')
    spec = rj(os.path.join(vdir, 'overlays', 'vr_layers.spec.json')) or {}
    sb = spec.get('sub_badge') or {}
    entries = []
    for g in groups:
        idx = g['items']
        t0, t1 = pics[idx[0]]['fromFrame'] / fps, (pics[idx[-1]]['fromFrame'] + pics[idx[-1]]['durationInFrames']) / fps
        main = pics[idx[0]]
        e = plan_by_rank.get(g['rank'])
        rec = next((x for x in (cl.get('ranking') or {}).get('entries', []) if x.get('rank_position') == g['rank']), None)
        pm = (e or {}).get('payoff_ms')
        if pm is None:
            pm = (rec or {}).get('payoff_ms')
        pay = None
        if pm is not None and segs:   # the segment that shows the payoff (hand-edited cut lists may add teasers before the main shot)
            for i in idx:
                if segs[i]['src_in'] <= pm / 1000 <= segs[i]['src_out']:
                    main, pay = pics[i], pics[i]['fromFrame'] / fps + (pm / 1000 - segs[i]['src_in']) / (segs[i].get('speed') or 1)
                    break
        if pay is None or not t0 <= pay < t1:
            pay = (t0 + t1) / 2
            paysrc = 'window midpoint (no payoff data)'
        else:
            paysrc = 'plan/cutlist payoff'
        zooms = [(segs[i].get('follow') or {}).get('zoom') for i in idx] if segs else []
        zooms = [z for z in zooms if z is not None]
        pays = [pay]
        cap_vals = []
        for c in caps:
            a, b = c['fromFrame'] / fps, (c['fromFrame'] + c['durationInFrames']) / fps
            if a < t1 and t0 < b:
                v = C.covered_pct(sal, text_rect(c), [[max(a, t0), min(b, t1)]], pays)
                if v is not None:
                    cap_vals.append(v)
        plate_vals = []
        for p in plates:
            a, b = p['fromFrame'] / fps, (p['fromFrame'] + p['durationInFrames']) / fps
            if a < t1 and t0 < b and os.path.exists(p['src']):
                bb = alpha_box(p['src'])
                if bb:
                    dx, dy = offset(p)
                    v = C.covered_pct(sal, [bb[0] + dx, bb[1] + dy, bb[2] + dx, bb[3] + dy], [[max(a, t0), min(b, t1)]], pays)
                    if v is not None:
                        plate_vals.append(v)
        badge_vals = []
        if sb:
            for p in badges:
                a, b = p['fromFrame'] / fps, (p['fromFrame'] + p['durationInFrames']) / fps
                if a < t1 and t0 < b:
                    dx, dy = offset(p)
                    v = C.covered_pct(sal, [sb['x1'] - 332 + dx, sb['y0'] + dy, sb['x1'] + dx, sb['y0'] + 76 + dy], [[max(a, t0), min(b, t1)]], pays)
                    if v is not None:
                        badge_vals.append(v)
        sw, sh = C.probe(main['src'])
        sides = touch_edges(sal, C.item_rect(main, sw, sh), pay)
        def agg(v):
            return None if not v else round(max(v), 1)
        flags = []
        if zooms and min(zooms) < ZOOM_GUARD:
            flags.append(f'zoom_below_{ZOOM_GUARD}')
        if sides:
            flags.append('subject_touches_edge:' + ','.join(sides))
        for name, v in (('caption', cap_vals), ('plate', plate_vals), ('badge', badge_vals)):
            if v and max(v) > COVER_FLAG:
                flags.append(f'{name}_covers_subject')
        conc = C.concentration(sal, [[t0, t1]])
        if conc is not None and conc < DIFFUSE:
            flags.append('subject_evidence_diffuse')
        entries.append({'rank': g['rank'], 'evidence_concentration': conc, 't0': round(t0, 2), 't1': round(t1, 2), 'zoom': zooms or None, 'payoff_t': round(pay, 2), 'payoff_source': paysrc, 'subject_touches_box_edge': sides, 'caption_subject_overlap_pct': agg(cap_vals), 'plate_subject_overlap_pct': agg(plate_vals), 'badge_subject_overlap_pct': agg(badge_vals), 'flags': flags})
    doc = {'heuristic': True, 'label': 'HEURISTIC EVIDENCE (motion + edges on a 108x192 grid, no person detection). Overlap = share of the subject evidence the overlay hides, worst page per entry; edge touch = evidence reaching the outer 4 % of the picture around the payoff.', 'thresholds': {'zoom_guard': ZOOM_GUARD, 'cover_flag_pct': COVER_FLAG}, 'entries': entries, 'flagged': sum(1 for e in entries if e['flags'])}
    done(out, doc, f"framing-check: {len(entries)} entries, {doc['flagged']} flagged -> {out}")


if __name__ == '__main__':
    main()
