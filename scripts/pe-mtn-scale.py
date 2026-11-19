"""rank-261028-kb5h (tallest mountains in the solar system): ORIGINAL height-bar graphics (no third-party imagery).
Bar LENGTH is proportional to the published peak height, one constant scale for every graphic (K px per km), with Everest (8.85 km above
sea level, NOAA) as the comparator. Heights as published: Olympus Mons 21.3 (NASA MOLA highest point above datum), Rheasilvia central
complex 20 (NASA/JPL PIA15322, relief from base), Boosaule Montes 17.5 (Schenk et al., NTRS 20030012598), Iapetus equatorial ridge 13
(Giese et al. 2008 Icarus 193, stereo topography), Maxwell Montes 11 (NASA/JPL PIA00149, above mean planetary radius). Baselines differ
by world and estimates vary; the graphics say so. Font: Cairo Black/Bold (SIL OFL 1.1, data/brand/quiz-ar/fonts).
Clips: hook_b (lineup, 2.0 s), c5 c4 c3 c2 (entry bar vs Everest), lead (#1 vs #2 vs Everest, 2.5 s).
Usage: python scripts/pe-mtn-scale.py <outdir> [name ...] [still]"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
W, H, FPS = 1080, 1920, 30
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'brand', 'quiz-ar', 'fonts')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
HT = {'olympus': 21.3, 'vesta': 20.0, 'io': 17.5, 'iapetus': 13.0, 'venus': 11.0, 'everest': 8.85}
LBL = {'olympus': '21.3 KM', 'vesta': '20 KM', 'io': '17.5 KM', 'iapetus': '13 KM', 'venus': '11 KM', 'everest': '8.85 KM'}
K = 44.0                      # px per km (21.3 km -> 937 px)
X0 = 50
ROCK = (222, 120, 52); ICE = (150, 205, 245); AMBER = (251, 191, 36); WHITE = (255, 255, 255)
RANKCOL = {'olympus': (240, 96, 60), 'vesta': (196, 170, 130), 'io': (236, 200, 70), 'iapetus': (170, 170, 190), 'venus': (230, 150, 90)}
rng = [(37 * i % 1080, 29 * i % 1920, 1 + i % 3) for i in range(1, 160)]


def bg(d, t):
    for y in range(H):
        k = y / H; d.line([(0, y), (W, y)], fill=(int(8 + 10 * k), int(10 + 12 * k), int(26 + 18 * k)))
    for i, (x, y, r) in enumerate(rng):      # faint stars, slow twinkle
        a = 70 + int(60 * (0.5 + 0.5 * math.sin(t * 1.3 + i)))
        d.ellipse([x, y, x + r, y + r], fill=(a, a, a + 30))


def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(6, 8, 20))


def bar(d, key, y, h, fs, col, grow=1.0, name=None):
    L = HT[key] * K * grow
    d.rounded_rectangle([X0, y, X0 + L, y + h], radius=10, fill=col, outline=WHITE, width=3)
    txt = (name + ' ' if name else '') + LBL[key]
    f = font(FB, fs)
    tw = d.textlength(txt, font=f)
    if tw + 40 < L: ctext(d, (X0 + 22, y + h / 2), txt, f, WHITE, anchor='lm')
    else: ctext(d, (X0 + L + 16, y + h / 2), txt, f, WHITE, anchor='lm')


def footer(d, crit=False):
    ctext(d, (W / 2, 1296), 'BAR LENGTH = PUBLISHED PEAK HEIGHT · ONE SCALE', font(FS, 40), (236, 232, 226))
    ctext(d, (W / 2, 1346), 'TALLEST PER WORLD · ESTIMATES VARY', font(FS, 40), (160, 170, 195))


def single(key, t, dur):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    g = min(1.0, 0.55 + t / 0.5 * 0.45) if t < 0.5 else 1.0     # bars grow in over the first 0.5 s
    d.line([(X0 - 8, 700), (X0 - 8, 1010)], fill=(190, 190, 210), width=3)
    bar(d, key, 735, 120, 62, RANKCOL[key], g)
    bar(d, 'everest', 885, 110, 54, ICE, g, 'EVEREST')
    footer(d)
    return im


def lead(t, dur):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    d.line([(X0 - 8, 690), (X0 - 8, 985)], fill=(190, 190, 210), width=3)
    bar(d, 'olympus', 700, 90, 52, RANKCOL['olympus'], 1.0, '#1')
    bar(d, 'vesta', 802, 80, 46, RANKCOL['vesta'], 1.0, '#2')
    bar(d, 'everest', 894, 80, 42, ICE, 1.0, 'EVEREST')
    footer(d, True)
    return im


def lineup(t, dur):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    d.line([(X0 - 8, 692), (X0 - 8, 1040)], fill=(190, 190, 210), width=3)
    order = [('olympus', '#1'), ('vesta', '#2'), ('io', '#3'), ('iapetus', '#4'), ('venus', '#5')]
    for i, (k, n) in enumerate(order):
        bar(d, k, 700 + i * 56, 48, 40, RANKCOL[k], 1.0, n)
    bar(d, 'everest', 700 + 5 * 56, 48, 40, ICE, 1.0, 'EVEREST')
    ctext(d, (W / 2, 1296), 'EVEREST VS THE TALLEST ON 5 WORLDS', font(FB, 46), WHITE)
    ctext(d, (W / 2, 1346), 'TALLEST PER WORLD · ESTIMATES VARY', font(FS, 40), (160, 170, 195))
    return im


def zoom(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))


SPEC = {
    'hook_b': (lineup, 2.0, 1.0, 1.02),
    'c5': (lambda t, d: single('venus', t, d), 2.1, 1.0, 1.03),
    'c4': (lambda t, d: single('iapetus', t, d), 2.1, 1.0, 1.03),
    'c3': (lambda t, d: single('io', t, d), 2.1, 1.0, 1.03),
    'c2': (lambda t, d: single('vesta', t, d), 2.2, 1.0, 1.03),
    'lead': (lead, 2.5, 1.0, 1.03),
}
for name, (fn, dur, z0, z1) in SPEC.items():
    if only and name not in only: continue
    n = max(2, int(round(dur * FPS)))
    def fr(i):
        k = i / (n - 1); k = k * k * (3 - 2 * k)
        return zoom(fn(i / FPS, dur), z0 + (z1 - z0) * k)
    if STILL:
        fr(0).save(os.path.join(OUT, name + '_0.png')); fr(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(fr(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
