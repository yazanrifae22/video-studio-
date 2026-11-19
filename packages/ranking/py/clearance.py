"""Overlay clearance (2026-11-08, owner: rating boxes and captions cover the action).

Heuristic subject evidence for viral-rankings: every picture item of a timeline is sampled exactly as it lands on the canvas
(window file with the follow crop baked in, contain-fit + transform), and motion (primary) + edges (secondary) give a per-frame
saliency map on a 108x192 grid. A candidate overlay rect costs the share of that evidence it would hide; the cheapest candidate
wins, ties go to the earlier (= default-side) candidate. Evidence, not detection: no person/face model; the camera shift is estimated by phase correlation.

Used by the builder (CLI: clearance.py spec.json out.json, called from packages/ranking/src/layers.ts) and by scripts/framing-check.py.
"""
import json
import math
import subprocess
import sys

import numpy as np

W, H, GW, GH = 1080, 1920, 108, 192
SAMPLE_FPS = 6
PAYOFF_S, PAYOFF_WEIGHT = 0.6, 2.5
TIE_RATIO, TIE_ABS = 1.15, 1.5   # a candidate within min*1.15 + 1.5 points counts as tied: earlier candidates (default first) win, so overlays do not move for nothing

_sizes = {}


def probe(file):
    if file not in _sizes:
        out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], capture_output=True, text=True, check=True).stdout
        w, h = out.strip().split('\n')[0].split(',')[:2]
        _sizes[file] = (int(w), int(h))
    return _sizes[file]


def item_rect(it, sw, sh):
    """Canvas rect of a video item: contain-fit, then scale about the centre and x/y in % of the canvas (packages/render/src/timeline.ts)."""
    tr = it.get('transform') or {}
    k = min(W / sw, H / sh) * (tr.get('scale') if tr.get('scale') is not None else 1)
    w, h = sw * k, sh * k
    cx, cy = W / 2 + (tr.get('x') or 0) / 100 * W, H / 2 + (tr.get('y') or 0) / 100 * H
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def _box3(a):
    p = np.pad(a, 1, mode='edge')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)), mode='constant')
    return (c[3:, 3:] - c[:-3, 3:] - c[3:, :-3] + c[:-3, :-3]) / 9.0


def item_frames(it, fps):
    """[(timeline t, canvas gray float array, picture mask)] sampled at SAMPLE_FPS; empty when the file cannot be read."""
    src = it['src']
    sw, sh = probe(src)
    x0, y0, x1, y1 = item_rect(it, sw, sh)
    gw, gh = max(2, int(round((x1 - x0) / W * GW))), max(2, int(round((y1 - y0) / H * GH)))
    start, dur = (it.get('srcStartFrame') or 0) / fps, it['durationInFrames'] / fps
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-i', src, '-t', f'{dur:.3f}', '-an', '-vf', f'fps={SAMPLE_FPS},scale={gw}:{gh}:flags=area,format=gray', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    raw = subprocess.run(cmd, capture_output=True).stdout
    n = len(raw) // (gw * gh)
    ox, oy = int(round(x0 / W * GW)), int(round(y0 / H * GH))
    out = []
    t0 = it['fromFrame'] / fps
    for i in range(n):
        f = np.frombuffer(raw, np.uint8, gw * gh, i * gw * gh).reshape(gh, gw).astype(np.float32)
        canvas, pic = np.zeros((GH, GW), np.float32), np.zeros((GH, GW), bool)
        cx0, cy0, cx1, cy1 = max(0, ox), max(0, oy), min(GW, ox + gw), min(GH, oy + gh)
        if cx1 > cx0 and cy1 > cy0:
            canvas[cy0:cy1, cx0:cx1] = f[cy0 - oy:cy1 - oy, cx0 - ox:cx1 - ox]
            pic[cy0:cy1, cx0:cx1] = True
        out.append((t0 + i / SAMPLE_FPS, canvas, pic))
    return out


def _global_shift(a, b):
    """Integer camera shift (dy, dx) from a to b by phase correlation on the low-res frames."""
    F = np.fft.fft2(a - a.mean()) * np.conj(np.fft.fft2(b - b.mean()))
    F /= np.abs(F) + 1e-6
    r = np.fft.ifft2(F).real
    dy, dx = np.unravel_index(int(np.argmax(r)), r.shape)
    h, w = r.shape
    return (dy - h if dy > h // 2 else dy, dx - w if dx > w // 2 else dx)


def saliency(frames):
    """[(t, S)] for one item. Foreground (difference from the item's camera-aligned median frame, so a rider counts even when nearly still) is the main
    evidence, plus motion residual and a little edge; each normalised per frame with weak residue dropped; 0 outside the picture."""
    if not frames:
        return []
    fs = [f for _, f, _ in frames]
    shifts = [(0, 0)]
    for k in range(1, len(fs)):
        dy, dx = _global_shift(fs[k], fs[k - 1])
        py, px = shifts[-1]
        shifts.append((py + dy, px + dx))
    aligned = [np.roll(f, (-dy, -dx), (0, 1)) for f, (dy, dx) in zip(fs, shifts)]
    med = np.median(np.stack(aligned), axis=0)
    out = []
    prev = None
    for k, (t, f, pic) in enumerate(frames):
        if not pic.any():
            prev = f
            continue
        fg = _box3(np.abs(aligned[k] - med))
        fg = np.roll(fg, shifts[k], (0, 1)) * pic
        fgn = np.clip(fg / max(float(np.percentile(fg[pic], 99)), 14.0), 0, 1)
        fgn[fgn < 0.35] = 0
        sm = _box3(f)
        gy, gx = np.gradient(sm)
        g = np.hypot(gx, gy)
        e = np.clip(g / max(float(np.percentile(g[pic], 98)), 8.0), 0, 1)
        m = np.zeros_like(f)
        if prev is not None:
            dy, dx = _global_shift(f, prev)
            d = np.abs(f - np.roll(prev, (dy, dx), (0, 1)))   # camera follow removed: what still moves is the subject
            med_d = float(np.median(d[pic]))
            if med_d < 25:    # a flash or a cut changes everything: no motion evidence for that frame
                d2 = _box3(np.clip(d - med_d - 4, 0, None))
                m = np.clip(d2 / max(float(np.percentile(d2[pic], 99)), 12.0), 0, 1)
                m[m < 0.3] = 0
        s = (fgn + 0.5 * m + 0.1 * e) * pic
        out.append((t, s))
        prev = f
    return out


def picture_items(tl):
    for tr in tl.get('tracks', []):
        if tr.get('name') == 'Picture':
            return [i for i in tr.get('items', []) if i.get('type') == 'video']
    return []


def timeline_saliency(tl):
    fps = tl.get('fps', 30)
    out = []
    for it in picture_items(tl):
        try:
            out += saliency(item_frames(it, fps))
        except (subprocess.CalledProcessError, ValueError):
            continue
    return out


def _slice(rect):
    x0, y0, x1, y1 = rect
    return (max(0, math.floor(y0 / H * GH)), min(GH, math.ceil(y1 / H * GH)), max(0, math.floor(x0 / W * GW)), min(GW, math.ceil(x1 / W * GW)))


def _in_spans(t, spans):
    return any(a <= t < b for a, b in spans)


def covered_pct(sal, rect, spans, payoffs=()):
    """Weighted share (%) of the subject evidence inside `rect` over the frames in `spans`, payoff frames count 2.5x; the worst moments count too (mean + 90th percentile). None when no frame is in the spans."""
    r0, r1, c0, c1 = _slice(rect)
    if r1 <= r0 or c1 <= c0:
        return 0.0
    tot, wsum, per = 0.0, 0.0, []
    for t, s in sal:
        if not _in_spans(t, spans):
            continue
        m = float(s.sum())
        if m <= 1e-6:
            continue
        w = PAYOFF_WEIGHT if any(abs(t - p) <= PAYOFF_S for p in payoffs) else 1.0
        v = float(s[r0:r1, c0:c1].sum()) / m
        tot += w * v
        wsum += w
        per.append(v)
    return None if wsum == 0 else (0.5 * tot / wsum + 0.5 * float(np.percentile(per, 90))) * 100


def concentration(sal, spans):
    """Mean share of the evidence held by the top 5 % of cells (uniform noise = 0.05 .. about 0.3 on textured footage); low = the subject could not be isolated."""
    vals = []
    for t, s in sal:
        if not _in_spans(t, spans):
            continue
        m = float(s.sum())
        if m <= 1e-6:
            continue
        v = np.sort(s, axis=None)
        vals.append(float(v[-max(1, int(v.size * 0.05)):].sum()) / m)
    return None if not vals else round(float(np.mean(vals)), 3)


def _hit(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def _time_hit(sa, sb):
    return any(a < d and c < b for a, b in sa for c, d in sb)


def solve(sal, queries, payoffs):
    """Queries in order (captions, plates, badges); each must stay clear of the rects already chosen at the same time and of its blockers."""
    placed, results = [], []
    for q in queries:
        spans, cands = q['spans'], q['candidates']
        costs = [covered_pct(sal, c, spans, payoffs) for c in cands]
        allowed = [not any(_hit(c, r) and _time_hit(spans, s) for r, s in placed) and not any(_hit(c, b[:4]) and _time_hit(spans, [b[4:]]) for b in q.get('blockers', [])) for c in cands]
        i = 0
        note = None
        if not q.get('pin'):
            ok = [k for k in range(len(cands)) if allowed[k] and costs[k] is not None]
            if ok:
                best = min(costs[k] for k in ok)
                i = next(k for k in ok if costs[k] <= best * TIE_RATIO + TIE_ABS)
            else:
                note = 'no clear candidate: kept the default position'
        placed.append((cands[i], spans))
        results.append({'id': q['id'], 'kind': q.get('kind'), 'pin': bool(q.get('pin')), 'index': i, 'moved': i != 0, 'evidence_concentration': concentration(sal, spans), 'rect': cands[i], 'covered_pct': None if costs[i] is None else round(costs[i], 1), 'default_covered_pct': None if costs[0] is None else round(costs[0], 1), 'blocked_candidates': int(sum(1 for a in allowed if not a)), 'note': note})
    return results


def main():
    spec_file, out_file = sys.argv[1], sys.argv[2]
    spec = json.load(open(spec_file, encoding='utf8'))
    tl = json.load(open(spec['timeline'], encoding='utf8'))
    sal = timeline_saliency(tl)
    res = {'heuristic': True, 'method': 'motion + edges on a 108x192 grid; evidence, not subject detection', 'frames': len(sal), 'results': solve(sal, spec['queries'], spec.get('payoffs', []))}
    with open(out_file, 'w', encoding='utf8') as f:
        json.dump(res, f, indent=1)
    print(json.dumps({'ok': True, 'frames': len(sal), 'moved': sum(1 for r in res['results'] if r['moved'])}))


if __name__ == '__main__':
    main()
