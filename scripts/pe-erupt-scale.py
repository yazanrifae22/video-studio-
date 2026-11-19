"""rank-261028-dhcd (largest eruptions, USGS volumes): ORIGINAL size-to-scale volume-cube graphics (no third-party imagery).
Cube EDGE ~ cube-root of erupted volume, so cube VOLUME is exactly proportional to erupted volume, one constant scale for every graphic
(K px per km). Volumes (USGS-published): Wah Wah Springs 5,900; Toba 5,300; La Garita (Fish Canyon Tuff) 5,000; Grey's Landing >2,800 (drawn at 2,800);
Huckleberry Ridge 2,450; Pinatubo 1991 "more than 5" (drawn at 5, USGS FS 113-97). Font: Cairo Black/Bold (SIL OFL 1.1, data/brand/quiz-ar/fonts).
Clips: hook_a (0-1.0 s, #1 cube vs Pinatubo; frame 0), hook_b (2.0 s, all five to scale), c5 c4 c3 c2 (entry cube vs Pinatubo), lead (#1 vs #2/#3 outlines),
end (push-out ends on the exact frame-0 crop).
Usage: python scripts/pe-erupt-scale.py <outdir> [name ...] [still]"""
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
VOL = {'wahwah': 5900, 'toba': 5300, 'lagarita': 5000, 'greys': 2800, 'huck': 2450, 'pinatubo': 5}
K = 380 / 5900 ** (1 / 3)           # px of cube edge per (km)^(1/3)
edge = lambda v, k=K: k * v ** (1 / 3)
C30, S30 = math.cos(math.radians(30)), 0.5
LAVA = [(255, 168, 72), (214, 86, 36), (140, 44, 22)]       # top, left, right
ICE = [(222, 240, 255), (128, 178, 220), (72, 116, 160)]
AMBER = (251, 191, 36)


def cube(d, cx, by, e, cols, outline=None, fill=True, w=3):
    """iso cube, centre x = cx, bottom vertex y = by, edge e (px)."""
    a = e * C30; h = e * S30
    bot = (cx, by); r = (cx + a, by - h); l = (cx - a, by - h)
    mid = (cx, by - 2 * h); tr = (cx + a, by - h - e); tl = (cx - a, by - h - e); top = (cx, by - 2 * h - e)
    faces = [([tl, top, tr, (cx, by - e)], cols[0] if cols else None), ([tl, (cx, by - e), bot, l], cols[1] if cols else None),
             ([(cx, by - e), tr, r, bot], cols[2] if cols else None)]
    if fill:
        for poly, c in faces: d.polygon(poly, fill=c)
    ol = outline or (255, 255, 255)
    for poly, _ in faces: d.line(poly + [poly[0]], fill=ol, width=w)


def bg(d, t):
    for y in range(H):
        k = y / H; d.line([(0, y), (W, y)], fill=(int(22 + 20 * k), int(10 + 6 * k), int(12 + 4 * k)))
    # slow drifting heat lines (keeps the frame moving; purely decorative)
    for r in range(22):
        y0 = 230 + r * 62 + 10 * math.sin(t * 1.1 + r)
        pts = [(x, y0 + 6 * math.sin(x / 90 + t * 1.7 + r * .6)) for x in range(0, W + 20, 20)]
        d.line(pts, fill=(52, 24, 22), width=2)


def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(20, 8, 8))


GROUND = 1010   # layout: chips sit at y~390-670, captions y~1040-1220 (see jdml v7); cube art stays above, footers below


def footer(d, crit=False):
    ctext(d, (W / 2, 1296), 'SIZE TO SCALE: CUBE VOLUME = ERUPTED VOLUME', font(FS, 40), (236, 226, 222))
    ctext(d, (W / 2, 1346), 'RANKED BY ERUPTED VOLUME · USGS' if crit else 'VOLUMES: USGS · ESTIMATES VARY', font(FS, 40), (170, 150, 150))


def pin(d, x, by):
    e = edge(VOL['pinatubo']); cube(d, x, by, e, ICE, outline=(255, 255, 255), w=2)
    ctext(d, (W - 40, by - 190), 'PINATUBO 1991', font(FB, 46), (222, 240, 255), anchor='rm')
    ctext(d, (W - 40, by - 135), '5 KM³', font(FB, 54), (222, 240, 255), anchor='rm')
    d.line([(x, by - 100), (x, by - e * 2 - 6)], fill=(222, 240, 255), width=2)


def single(key, t, dur, crit=False):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    e = edge(VOL[key]); cx = 70 + e * C30
    d.line([(40, GROUND), (W - 40, GROUND)], fill=(120, 80, 70), width=3)
    cube(d, cx, GROUND - 6, e, LAVA)
    pin(d, W - 90, GROUND - 6)
    footer(d, crit)
    return im


def lead(t, dur):
    """#1 solid cube with #2 (white) and #3 (cyan) outlines: how close the top three are. Legend sits right of the cube."""
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    d.line([(40, GROUND), (W - 40, GROUND)], fill=(120, 80, 70), width=3)
    e1 = edge(VOL['wahwah']); cx = 40 + e1 * C30
    cube(d, cx, GROUND - 6, e1, LAVA)
    for k, col in (('toba', (255, 255, 255)), ('lagarita', (110, 240, 255))):
        cube(d, cx, GROUND - 6, edge(VOL[k]), None, outline=col, fill=False, w=6)
    ctext(d, (W - 40, 700), '#1 · 5,900', font(FB, 56), AMBER, anchor='rm')
    ctext(d, (W - 40, 770), '#2 · 5,300', font(FB, 56), (255, 255, 255), anchor='rm')
    ctext(d, (W - 40, 840), '#3 · 5,000', font(FB, 56), (110, 240, 255), anchor='rm')
    footer(d)
    return im


def five(t, dur):
    """all five (+ Pinatubo) at ONE scale, two rows: back row #3 #2 #1, front row #5 #4 Pinatubo."""
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    kk = 175 / 5900 ** (1 / 3)
    rows = [(560, [('lagarita', '#3', 190), ('toba', '#2', 540), ('wahwah', '#1', 890)]),
            (930, [('huck', '#5', 190), ('greys', '#4', 540), ('pinatubo', 'PINATUBO', 890)])]
    for by, items in rows:
        d.line([(30, by + 6), (W - 30, by + 6)], fill=(120, 80, 70), width=3)
        for k, n, cx in items:
            e = edge(VOL[k], kk)
            if k == 'pinatubo':
                cube(d, cx, by, e, ICE, outline=(255, 255, 255), w=2)
                ctext(d, (cx, by - 90), 'PINATUBO', font(FB, 44), (222, 240, 255)); ctext(d, (cx, by - 40), '5 KM³', font(FB, 44), (222, 240, 255))
            else:
                cube(d, cx, by, e, LAVA)
                ctext(d, (cx, by + 46), f'{n} · {VOL[k]:,}' + ('+' if k == 'greys' else ''), font(FB, 46), AMBER)
    ctext(d, (W / 2, 1296), 'ALL FIVE TO SCALE VS PINATUBO', font(FB, 48), (255, 255, 255))
    ctext(d, (W / 2, 1346), 'RANKED BY ERUPTED VOLUME · USGS', font(FS, 40), (170, 150, 150))
    return im


def zoom(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2 + 0, (W + cw) / 2, (H + ch) / 2 + 0))


# name -> (builder, duration, zoom start, zoom end)
SPEC = {
    'hook_a': (lambda t, d: single('wahwah', t, d, True), 1.0, 1.0, 1.02),
    'hook_b': (five, 2.0, 1.0, 1.03),
    'c5': (lambda t, d: single('huck', t, d), 2.1, 1.0, 1.03),
    'c4': (lambda t, d: single('greys', t, d), 2.1, 1.0, 1.03),
    'c3': (lambda t, d: single('lagarita', t, d), 2.1, 1.0, 1.03),
    'c2': (lambda t, d: single('toba', t, d), 2.2, 1.0, 1.03),
    'lead': (lead, 2.5, 1.0, 1.03),
    'end': (lambda t, d: single('wahwah', t, d, True), 2.5, 1.02, 1.0),   # ends on the exact frame-0 image
}
for name, (fn, dur, z0, z1) in SPEC.items():
    if only and name not in only: continue
    n = max(2, int(round(dur * FPS)))
    def fr(i):
        k = i / (n - 1); k = k * k * (3 - 2 * k)
        tt = (n - 1 - i) / FPS if name == 'end' else i / FPS   # end clip runs its background backwards so the last frame is exactly frame 0
        return zoom(fn(tt, dur), z0 + (z1 - z0) * k)
    if STILL:
        fr(0).save(os.path.join(OUT, name + '_0.png')); fr(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(fr(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
