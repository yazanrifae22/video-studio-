"""
Burned-in text collision check (OCR-free heuristic) for overlay zones (rank rail, captions, title).
For each segment, samples frames inside the used source window and measures strong-edge density in the source
region that ends up under each overlay zone. Burned-in text/logos = dense, high-contrast edges; a zone is flagged
when its density is high in absolute terms AND clearly above the frame's own density, in >= 2 samples.

usage: python -I zone_check.py spec.json out.json
spec: {"samples": 5, "segments": [{"i", "asset_id", "mezz", "src_in", "src_out", "sw", "sh", "zones": {"rail": [x0,y0,x1,y1] | null, ...}}]}
Warn-only: it never fails a build. Thresholds: zone density >= 0.09 and >= 1.6x frame density.
"""
import json
import subprocess
import sys

import numpy as np

ABS, REL, EDGE = 0.09, 1.6, 48


def frame(mezz, t, w, h):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', mezz, '-frames:v', '1', '-vf', f'scale={w}:{h},format=gray',
                          '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    if len(raw) < w * h:
        return None
    return np.frombuffer(raw[:w * h], dtype=np.uint8).reshape(h, w).astype(np.int16)


def strong_edges(g):
    e = np.zeros(g.shape, dtype=bool)
    e[:, 1:] |= np.abs(np.diff(g, axis=1)) > EDGE
    e[1:, :] |= np.abs(np.diff(g, axis=0)) > EDGE
    return e


def main():
    spec = json.load(open(sys.argv[1], encoding='utf8'))
    n = int(spec.get('samples', 5))
    out = {'thresholds': {'abs': ABS, 'rel': REL, 'edge': EDGE}, 'segments': [], 'warnings': []}
    for s in spec['segments']:
        w, h = int(s['sw']) // 2 * 2, int(s['sh']) // 2 * 2
        a, b = float(s['src_in']), float(s['src_out'])
        times = [a + (b - a) * (k + 0.5) / n for k in range(n)]
        zres = {z: {'max': 0.0, 'hits': 0, 'samples': []} for z, r in s['zones'].items() if r}
        for t in times:
            g = frame(s['mezz'], t, w, h)
            if g is None:
                continue
            e = strong_edges(g)
            fd = float(e.mean())
            for z, r in s['zones'].items():
                if not r:
                    continue
                x0, y0, x1, y1 = [int(v) for v in r]
                x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
                if x1 - x0 < 4 or y1 - y0 < 4:
                    continue
                d = float(e[y0:y1, x0:x1].mean())
                zr = zres[z]
                zr['samples'].append({'t': round(t, 2), 'zone': round(d, 4), 'frame': round(fd, 4)})
                zr['max'] = max(zr['max'], d)
                if d >= ABS and d >= REL * max(fd, 1e-3):
                    zr['hits'] += 1
        seg = {'i': s['i'], 'asset_id': s['asset_id'], 'zones': zres}
        for z, zr in zres.items():
            if zr['hits'] >= 2:
                out['warnings'].append(f"segment {s['i']} ({s['asset_id']} {a:.1f}-{b:.1f}s): likely burned-in text/graphics under the {z} zone "
                                       f"(edge density {zr['max']:.3f}, {zr['hits']}/{n} samples) - reframe, pick another window, or check by eye")
        out['segments'].append(seg)
    out['pass'] = not out['warnings']
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), indent=1)
    print(json.dumps({'pass': out['pass'], 'warnings': out['warnings']}))


if __name__ == '__main__':
    main()
