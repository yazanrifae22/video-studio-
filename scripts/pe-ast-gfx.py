"""rank-261028-hg6a (5 closest asteroid flybys): ORIGINAL to-scale altitude diagrams, no third-party imagery.
One constant scale for every diagram: K px per km. Earth is a true circle (radius 6,378 km x K); the dashed ring is the ISS altitude
(NASA: "about 250 miles" = ~400 km); each asteroid path is the straight tangent line at its nominal altitude
(JPL SBDB close-approach nominal distance from Earth's centre minus 6,378 km). Dot speed is constant, so the loop tail (last frame ==
frame 0 of hook_a, pixel for pixel) joins the hook without a speed jump.
Fonts: Cairo Black/Bold (SIL OFL 1.1, data/brand/quiz-ar/fonts).
Clips: hook_a (1.0 s, #1 diagram = frame 0), hook_b (2.0 s, five bars one scale + ISS line), c5 c4 c3 c2 (2.1-2.2 s), end (2.5 s, ends on hook_a frame 0).
Usage: python scripts/pe-ast-gfx.py <outdir> [name ...] [still]"""
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

R_E = 6378.0            # Earth equatorial radius used by the altitude conversion (km)
ISS_KM = 400.0          # NASA: ISS orbits about 250 miles (~400 km)
K = 0.19                # px per km (all diagrams)
YS = 950               # y of the Earth's surface at x = 540
CX = 540
R = R_E * K
# key: (label, nominal alt km from CAD, uncertainty km, rounded label, colour)
P = {
    'uc11': ('2025 UC11', 221.2, 1.1, '~220', (255, 96, 64)),
    'vt4': ('2020 VT4', 367.5, 10.2, '~370', (255, 170, 60)),
    'tf': ('2025 TF', 402.5, 13.1, '~400', (250, 214, 80)),
    'tp128': ('2026 TP128', 1111.8, 13.6, '~1,110', (120, 210, 255)),
    'xa': ('2024 XA', 1348.0, 2.7, '~1,350', (150, 160, 255)),
}
WHITE = (255, 255, 255); ISSC = (170, 235, 200)
rng = [(37 * i % 1080, 29 * i % 1900, 1 + i % 3) for i in range(1, 140)]


def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(6, 8, 20))


def bg(im, tw):
    d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        k = y / H; d.rectangle([0, y, W, y + 3], fill=(int(6 + 8 * k), int(8 + 10 * k), int(22 + 16 * k)))
    for i, (x, y, r) in enumerate(rng):
        a = 70 + int(70 * (0.5 + 0.5 * math.sin(tw * 1.3 + i)))
        x = (x - 60 * tw) % W
        d.ellipse([x, y, x + r, y + r], fill=(a, a, a + 30))


_earth = {}
def earth_layer():
    if 'L' in _earth: return _earth['L']
    S = 2
    L = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    cx, cy, r = CX * S, (YS + R) * S, R * S
    for k in range(40, 0, -1):          # atmosphere glow
        a = int(130 * (1 - k / 40) ** 2)
        d.ellipse([cx - r - k * S * 0.9, cy - r - k * S * 0.9, cx + r + k * S * 0.9, cy + r + k * S * 0.9], outline=(90, 170, 255, a), width=3 * S)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(14, 52, 104, 255), outline=(130, 200, 255, 255), width=5 * S)
    for k in range(1, 26):              # lit limb gradient inside
        a = int(150 * (1 - k / 26) ** 2)
        d.ellipse([cx - r + k * 3 * S, cy - r + k * 3 * S, cx + r - k * 3 * S, cy + r - k * 3 * S], outline=(60, 130, 210, a), width=3 * S)
    L = L.resize((W, H), Image.LANCZOS); _earth['L'] = L; return L


def ring_y(h, x):
    rr = R + h * K
    return YS + R - math.sqrt(max(0.0, rr * rr - (x - CX) ** 2))


def dashed_ring(d, h, col, off, width=4):
    pts = []
    for x in range(0, W + 1, 6): pts.append((x, ring_y(h, x)))
    seg = 0
    for i in range(len(pts) - 1):
        ph = ((i + off) % 8)
        if ph < 5: d.line([pts[i], pts[i + 1]], fill=col, width=width)


def dot(im, x, y, col):
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    for i in range(60):                 # trail, fading to the right (the dot moves left)
        a = int(230 * (1 - i / 60) ** 1.5)
        d.line([(x + i * 9, y), (x + i * 9 + 10, y)], fill=col + (a,), width=max(3, 16 - i // 4))
    for k in range(5, 0, -1):
        d.ellipse([x - 12 - k * 9, y - 12 - k * 9, x + 12 + k * 9, y + 12 + k * 9], fill=col + (int(30 * (6 - k)),))
    d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=(255, 255, 255, 255))
    im.paste(Image.alpha_composite(im.convert('RGBA'), L).convert('RGB'))


def iss_glyph(d, x, y):
    # original pictogram of a station (truss + four solar-array pairs), not a drawing of the real ISS
    d.line([(x - 70, y), (x + 70, y)], fill=(210, 215, 225), width=6)
    for dx in (-60, -36, 36, 60):
        d.rectangle([x + dx - 9, y - 30, x + dx + 9, y - 6], fill=(60, 120, 220), outline=(240, 200, 90), width=2)
        d.rectangle([x + dx - 9, y + 6, x + dx + 9, y + 30], fill=(60, 120, 220), outline=(240, 200, 90), width=2)
    d.rectangle([x - 14, y - 9, x + 14, y + 9], fill=(235, 235, 240), outline=(120, 125, 140), width=2)


def diagram(key, dotx, tw, emphasis=False):
    name, alt, unc, rnd, col = P[key]
    im = Image.new('RGB', (W, H)); bg(im, tw)
    im.paste(Image.alpha_composite(im.convert('RGBA'), earth_layer()).convert('RGB'))
    d = ImageDraw.Draw(im)
    dashed_ring(d, ISS_KM, ISSC, int(tw * 6))
    ly = YS - alt * K
    # uncertainty band (nominal +- 3-sigma min/max from CAD)
    d.rectangle([0, ly - unc * K, W, ly + unc * K], fill=tuple(int(c * 0.35 + 10) for c in col))
    for g in range(18, 0, -3):
        d.line([(0, ly), (W, ly)], fill=tuple(int(c * (0.12 + 0.02 * (18 - g) / 3) + 6) for c in col), width=g * 2)
    d.line([(0, ly), (W, ly)], fill=col, width=4)
    iss_glyph(d, 800, ring_y(ISS_KM, 800))
    # altitude bracket + value
    bx = 60; sy = ring_y(0, bx)
    d.line([(bx, ly), (bx, sy)], fill=WHITE, width=4)
    d.line([(bx - 16, ly), (bx + 16, ly)], fill=WHITE, width=4); d.line([(bx - 16, sy), (bx + 16, sy)], fill=WHITE, width=4)
    my = (ly + sy) / 2
    d.rounded_rectangle([bx + 18, my - 52, bx + 420, my + 56], radius=14, fill=(6, 10, 26))
    ctext(d, (bx + 30, my - 18), rnd + ' KM UP', font(FB, 62), col, 'lm')
    ctext(d, (bx + 30, my + 30), 'NOMINAL ±%s KM · TO SCALE' % (('%.0f' % unc) if unc >= 2 else '%.0f' % max(1, round(unc))), font(FS, 38), (225, 230, 240), 'lm')
    # ISS tag (right)
    ctext(d, (800, ring_y(ISS_KM, 800) - 52), 'ISS ~400 KM', font(FB, 44), ISSC, 'mm')
    dot(im, dotx, ly, col)
    return im


def bars(tw):
    im = Image.new('RGB', (W, H)); bg(im, tw); d = ImageDraw.Draw(im)
    KB = 0.58; X0 = 50
    order = [('uc11', '#1'), ('vt4', '#2'), ('tf', '#3'), ('tp128', '#4'), ('xa', '#5')]
    top = 716; bh = 50; gap = 10
    ix = X0 + ISS_KM * KB
    for i, (k, n) in enumerate(order):
        y = top + i * (bh + gap); alt = P[k][1]; L = alt * KB; col = P[k][4]
        d.rounded_rectangle([X0, y, X0 + L, y + bh], radius=8, fill=col, outline=WHITE, width=2)
        txt = n + ' ' + P[k][3]
        f = font(FB, 40); tw_ = d.textlength(txt, font=f)
        if tw_ + 30 < L: ctext(d, (X0 + 14, y + bh / 2), txt, f, (10, 12, 28), 'lm', 0)
        else: ctext(d, (X0 + L + 12, y + bh / 2), txt, f, WHITE, 'lm', 3)
    yb = top + 5 * (bh + gap)
    for yy in range(top - 8, yb, 14): d.line([(ix, yy), (ix, yy + 8)], fill=ISSC, width=4)
    ctext(d, (ix, yb + 22), 'ISS ~400 KM', font(FS, 40), ISSC)
    ctext(d, (X0, yb + 22), '0', font(FS, 36), (200, 210, 230), 'lm')
    return im


def zoom(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))
SPEC = {   # name: (frame function(t, dur), dur)
    'hook_a': (lambda t, du: zoom(diagram('uc11', 560 - 300 * t, t), 1 + 0.03 * t), 1.0),
    'hook_b': (lambda t, du: zoom(bars(t), 1.0 + 0.05 * t / du), 2.0),
    'c5': (lambda t, du: zoom(diagram('xa', 1000 - 300 * t, t), 1 + 0.03 * t), 2.1),
    'c4': (lambda t, du: zoom(diagram('tp128', 1000 - 300 * t, t), 1 + 0.03 * t), 2.1),
    'c3': (lambda t, du: zoom(diagram('tf', 1000 - 300 * t, t), 1 + 0.03 * t), 2.1),
    'c2': (lambda t, du: zoom(diagram('vt4', 1000 - 300 * t, t), 1 + 0.03 * t), 2.2),
    'end': (lambda t, du: diagram('uc11', 560 + 300 * (du - t), du - t), 2.5),
}
for name, (fn, dur) in SPEC.items():
    if only and name not in only: continue
    n = int(round(dur * FPS))
    def fr(i): return fn(i / FPS if name != 'end' else i / FPS, dur if name == 'end' else dur)
    if name == 'end':   # last frame time must be exactly 0 of hook_a: frame i shows t = (n-1-i)/FPS reversed
        def fr(i): t = i / FPS; r = (n - 1 - i) / FPS; return zoom(diagram('uc11', 560 + 300 * r, r), 1 + 0.03 * r)
    if STILL:
        fr(0).save(os.path.join(OUT, name + '_0.png')); fr(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(fr(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
