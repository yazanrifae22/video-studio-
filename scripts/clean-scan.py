"""
clean-scan.py - rank owner clip folders (data/media/owner-supplied/micro/MC-*) by number of CLEAN clips.
OCR-free heuristic (no OCR engine on this box), same family as packages/ranking/py/zone_check.py:
  sample N frames per clip (8 %..92 %), compute strong-edge maps, keep edges that PERSIST at the same pixel across
  >= PERSIST of the frames (burned text, handles, score bugs, logos do; moving footage does not), count them per
  grid cell. Extra signal: bright "caption pixels" (near white/yellow with a dark neighbour) persisting in a cell.
Verdicts: clean | overlay (reason + region top/mid/bottom/corner) | too-short (<4 s) | unreadable.
Cache: data/cache/clean-scan.json (resume-safe, per clip key relative path + size + mtime).

usage: python -I scripts/clean-scan.py [--only MC-130,MC-208] [--skip MC-130,...] [--workers 6] [--debug] [--report]
"""
import json, os, re, subprocess, sys, time, glob, argparse
from concurrent.futures import ThreadPoolExecutor
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MICRO = os.path.join(ROOT, 'data', 'media', 'owner-supplied', 'micro')
CACHE = os.path.join(ROOT, 'data', 'cache', 'clean-scan.json')
N = 7
W = 270
EDGE = 60
PERSIST = 0.72        # edge pixel must appear in this share of frames
MIN_DUR = 4.0
ROWS, COLS = 12, 3
# calibrated thresholds (see docs/brands/viral-rankings/ideas/clean-ranking.md)
PERS_T, CAPF_T, TF_T, SOFT_T = 0.04, 0.25, 0.25, 0.05   # calibrated on MC-130/208/233 (clean clips max: .010/.14/.14/.040)


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', path],
                       capture_output=True, text=True)
    try:
        j = json.loads(r.stdout)
        st = [s for s in j['streams'] if 'width' in s][0]
        return float(j['format']['duration']), int(st['width']), int(st['height'])
    except Exception:
        return None


def frames(path, dur, w, h):
    H = int(round(W * h / w / 2)) * 2
    out = []
    for k in range(N):
        t = dur * (0.08 + 0.84 * k / (N - 1))
        r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', path, '-frames:v', '1',
                            '-vf', f'scale={W}:{H}', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True)
        if len(r.stdout) >= W * H * 3:
            out.append(np.frombuffer(r.stdout[:W * H * 3], dtype=np.uint8).reshape(H, W, 3))
    return out, H


def dil(b):
    d = b.copy()
    d[1:] |= b[:-1]; d[:-1] |= b[1:]
    e = d.copy()
    e[:, 1:] |= d[:, :-1]; e[:, :-1] |= d[:, 1:]
    return e


def analyse(path):
    p = probe(path)
    if not p:
        return {'verdict': 'unreadable'}
    dur, w, h = p
    if dur < MIN_DUR:
        return {'verdict': 'too-short', 'dur': round(dur, 1)}
    fr, H = frames(path, dur, w, h)
    if len(fr) < 4:
        return {'verdict': 'unreadable', 'dur': round(dur, 1)}
    edges, caps, soft, hard = [], [], [], []
    for f in fr:
        g = f.astype(np.int16).mean(axis=2)
        e = np.zeros(g.shape, bool)
        e[:, 1:] |= np.abs(np.diff(g, axis=1)) > EDGE
        e[1:, :] |= np.abs(np.diff(g, axis=0)) > EDGE
        edges.append(e)
        for thr, lst in ((28, soft), (95, hard)):
            q = np.zeros(g.shape, bool)
            q[:, 1:] |= np.abs(np.diff(g, axis=1)) > thr
            q[1:, :] |= np.abs(np.diff(g, axis=0)) > thr
            lst.append(q)
        # caption-coloured pixels (white / yellow) next to dark pixels
        mx, mn = f.max(axis=2).astype(np.int16), f.min(axis=2).astype(np.int16)
        bright = (mn > 205)
        yellow = (f[:, :, 0] > 220) & (f[:, :, 1] > 190) & (f[:, :, 2] < 110)
        c = bright | yellow
        dark = g < 55
        near_dark = dil(dil(dark))
        caps.append(c & near_dark)
    E = np.stack([dil(e) for e in edges])        # tolerance 1px
    pers = E.mean(axis=0) >= PERSIST
    pers &= np.stack(edges).mean(axis=0) >= 0.4   # real edge in most frames
    C = np.stack(caps)
    cpers = dil(C.mean(axis=0) >= PERSIST) & (C.mean(axis=0) >= 0.5)
    ch, cw = H / ROWS, W / COLS
    SP = np.stack([dil(x) for x in soft]).mean(axis=0) >= 0.85
    SP &= np.stack(soft).mean(axis=0) >= 0.6
    hd = np.stack([x.astype(np.float32) for x in hard])
    capd = np.stack([c.astype(np.float32) for c in caps])   # per-frame caption-pixel maps
    cells = []
    for r in range(ROWS):
        for c in range(COLS):
            sl = (slice(int(r * ch), int((r + 1) * ch)), slice(int(c * cw), int((c + 1) * cw)))
            # share of frames where this cell holds a dense caption-coloured/outlined blob (changing captions too)
            capf = float((capd[:, sl[0], sl[1]].mean(axis=(1, 2)) >= 0.035).mean())
            dens = hd[:, sl[0], sl[1]].mean(axis=(1, 2))
            fm = hd.mean(axis=(1, 2))
            tf = float(((dens >= 0.07) & (dens >= 2.2 * fm)).mean())   # text-band-like in this cell, per frame
            cells.append((r, c, float(pers[sl].mean()), float(cpers[sl].mean()), capf, tf, float(SP[sl].mean())))
    return {'verdict': 'pending', 'dur': round(dur, 1), 'cells': [(r, c, round(a, 4), round(b, 4), round(d, 2), round(t, 2), round(sp, 3)) for r, c, a, b, d, t, sp in cells], 'wh': [w, h]}


def classify(res):
    if res['verdict'] != 'pending':
        return res
    hits = [(x[0], x[1], x[2], x[3]) for x in res['cells']
            if x[2] >= PERS_T or x[4] >= CAPF_T or x[5] >= TF_T or x[6] >= SOFT_T]
    del res['cells']
    if not hits:
        res['verdict'] = 'clean'
        return res
    rows = [r for r, *_ in hits]
    zones = set()
    for r, c, a, b in hits:
        edge_col = c in (0, COLS - 1)
        if r <= 1:
            zones.add('top-corner' if edge_col and r == 0 else 'top')
        elif r >= ROWS - 2:
            zones.add('bottom-corner' if edge_col else 'bottom')
        elif ROWS - 4 <= r < ROWS - 2:
            zones.add('lower')
        else:
            zones.add('mid')
    res['verdict'] = 'overlay'
    res['zones'] = sorted(zones)
    res['cells_hit'] = len(hits)
    res['reason'] = 'persistent text/logo-like edges in ' + ','.join(sorted(zones))
    res['croppable'] = bool(zones) and zones <= {'top', 'bottom', 'top-corner', 'bottom-corner'}
    return res


def key(path):
    st = os.stat(path)
    return os.path.relpath(path, MICRO).replace('\\', '/') + f'|{st.st_size}|{int(st.st_mtime)}'


def load():
    try:
        return json.load(open(CACHE, encoding='utf8'))
    except Exception:
        return {'version': 1, 'params': {}, 'clips': {}}


def save(c):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    tmp = CACHE + '.tmp'
    json.dump(c, open(tmp, 'w', encoding='utf8'))
    os.replace(tmp, CACHE)


HOT = ['messi', 'ronaldo', 'neymar', 'mbappe', 'haaland', 'football', 'soccer', 'goal', 'curry', 'lebron', 'nba', 'basket', 'dunk',
       'cat', 'kitten', 'dog', 'puppy', 'fail', 'prank', 'celeb', 'viral', 'trick', 'baby', 'funny', 'bean', 'tiktok']


def report():
    import collections
    cache = load()['clips']
    folders = collections.OrderedDict()
    for d in sorted(glob.glob(os.path.join(MICRO, 'MC-*'))):
        folders[os.path.basename(d)] = []
    for k, r in cache.items():
        d = k.split('/')[0]
        if d in folders:
            c = classify(dict(r))
            folders[d].append((k, c))
    rows = []
    for d, items in folders.items():
        if not items:
            continue
        cnt = collections.Counter(c['verdict'] for _, c in items)
        clean = [k for k, c in items if c['verdict'] == 'clean']
        crop = [k for k, c in items if c['verdict'] == 'overlay' and c.get('croppable')]
        m = re.match(r'(MC-\d+)-(.*)', d)
        name = m.group(2) if m else d
        hot = sum(1 for h in HOT if h in name)
        rows.append(dict(id=d[:6], name=name, total=len(items), clean=len(clean), crop=len(crop), short=cnt['too-short'],
                         unread=cnt['unreadable'], hot=hot, clips=[os.path.basename(k) for k in clean]))
    json.dump(rows, open(os.path.join(ROOT, 'data', 'cache', 'clean-scan-folders.json'), 'w', encoding='utf8'), indent=1)
    rows.sort(key=lambda r: (-r['clean'], -r['crop'], r['id']))
    ok = [r for r in rows if r['clean'] >= 5]
    L = ['# Clean-clip ranking of owner folders (data/media/owner-supplied/micro/MC-*)', '',
         'Generated by `python -I scripts/clean-scan.py --report` from data/cache/clean-scan.json. OCR-free heuristic: persistent / recurring',
         'text-like edges and caption-coloured blobs per grid cell across 7 frames per clip. **clean = no detected overlay**; it can still miss',
         'small or low-contrast marks and cannot judge off-topic clips, so a showrunner should eyeball the chosen 5. "croppable" = extra clips whose',
         'overlay sits only in a top/bottom band.', '',
         f'Folders scanned: {len(rows)}; with >= 5 clean: {len(ok)}.', '']
    rec = sorted(ok, key=lambda r: (-(r['hot'] > 0), -min(r['clean'], 12), -r['hot'], r['id']))[:20]
    L += ['## Top 20 recommended next categories (>= 5 clean, high-view topics first)', '', '| # | id | category | clean/total | croppable extra |', '|---|---|---|---|---|']
    for i, r in enumerate(rec, 1):
        L.append(f"| {i} | {r['id']} | {r['name']} | {r['clean']}/{r['total']} | {r['crop'] or ''} |")
    L += ['', '## All folders by clean count', '', '| id | category | clean/total | note |', '|---|---|---|---|']
    for r in rows:
        note = []
        if r['crop']:
            note.append(f"croppable +{r['crop']}")
        if r['clean'] + r['crop'] >= 5 > r['clean']:
            note.append('>=5 only with crops')
        if r['short']:
            note.append(f"{r['short']} too short")
        if r['unread']:
            note.append(f"{r['unread']} unreadable")
        L.append(f"| {r['id']} | {r['name']} | {r['clean']}/{r['total']} | {'; '.join(note)} |")
    out = os.path.join(ROOT, 'docs', 'brands', 'viral-rankings', 'ideas', 'clean-ranking.md')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf8').write(chr(10).join(L) + chr(10))
    print(json.dumps({'folders': len(rows), 'ge5': len(ok), 'top': [(r['id'], r['name'], r['clean']) for r in rec[:10]]}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only'); ap.add_argument('--skip', default='MC-130,MC-208,MC-233')
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--report', action='store_true', help='classify cached features, write docs/brands/viral-rankings/ideas/clean-ranking.md')
    a = ap.parse_args()
    if a.report:
        return report()
    only = set(a.only.split(',')) if a.only else None
    skip = set(a.skip.split(',')) if a.skip and not only else set()
    cache = load()
    todo = []
    for d in sorted(glob.glob(os.path.join(MICRO, 'MC-*'))):
        mid = os.path.basename(d)[:6]
        if (only and mid not in only) or mid in skip:
            continue
        for f in sorted(glob.glob(os.path.join(d, '*.mp4'))):
            k = key(f)
            if k not in cache['clips']:
                todo.append((k, f))
    print(f'{len(todo)} clips to scan', flush=True)
    t0 = time.time()
    done = 0

    def work(t):
        k, f = t
        try:
            return k, analyse(f)
        except Exception as ex:
            return k, {'verdict': 'unreadable', 'error': str(ex)[:80]}
    with ThreadPoolExecutor(a.workers) as ex:
        for k, r in ex.map(work, todo):
            cache['clips'][k] = r
            done += 1
            if done % 25 == 0:
                save(cache)
                print(f'{done}/{len(todo)} {time.time() - t0:.0f}s', flush=True)
    save(cache)
    print('done', done, f'{time.time() - t0:.0f}s')


if __name__ == '__main__':
    main()
