"""rank-261028-urfr (space rocks that exploded over Earth): ORIGINAL data graphics + one NASA still push.
Data: NASA/JPL CNEOS fireball API (impact-e, kt TNT, 1988-present), checked 2026-10-28.
Map base: NASA Earth Observatory Blue Marble Next Generation (world.topo.bathy 5400x2700) with an original marker/graticule.
Fonts: Cairo Black/Bold (SIL OFL 1.1, data/brand/quiz-ar/fonts).
Usage: python scripts/pe-fireball-gfx.py <outdir> [name ...] [still]"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None
args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
W, H, FPS = 1080, 1920, 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONTS = os.path.join(ROOT, 'data', 'brand', 'quiz-ar', 'fonts')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')
RAW = os.path.join(ROOT, 'data', 'pe-fireball', 'raw')
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
WHITE = (255, 255, 255)
# rank: (short name, kt, lat, lon)  -- CNEOS fireball.api impact-e
E = {1: ('CHELYABINSK', 441, 54.8, 61.1), 2: ('BERING SEA', 49, 56.9, 172.4), 3: ('INDONESIA', 33, -4.2, 120.6),
     4: ('PACIFIC', 30, 2.7, 164.1), 5: ('S. AFRICA', 20, -22.0, 29.2)}
ACC = (255, 150, 50); ACC1 = (255, 84, 60); DIM = (92, 104, 128)

def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(6, 8, 20))

rng = [(37 * i % 1080, 29 * i % 1900, 1 + i % 3) for i in range(1, 160)]
def bg(im, tw=0.0):
    d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        k = y / H; d.rectangle([0, y, W, y + 3], fill=(int(6 + 8 * k), int(8 + 10 * k), int(22 + 16 * k)))
    for i, (x, y, r) in enumerate(rng):
        a = 70 + int(70 * (0.5 + 0.5 * math.sin(tw * 2.1 + i)))
        x = (x - 70 * tw) % W
        d.ellipse([x, y, x + r, y + r], fill=(a, a, a + 30))

def zoom(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))

def bars(active, tw, grow=True, all_on=False):
    """five horizontal bars on ONE linear scale (kt TNT); active rank highlighted. Rows sit between the chip band (y<720) and the caption band (y~1170)."""
    im = Image.new('RGB', (W, H)); bg(im, tw); d = ImageDraw.Draw(im)
    X0 = 150; MAXL = 720; top = 735; bh = 58; gap = 15
    k = min(1.0, tw / 0.55) if grow else 1.0
    k = 1 - (1 - k) ** 3
    for i, n in enumerate([1, 2, 3, 4, 5]):
        nm, kt, _, _ = E[n]; y = top + i * (bh + gap)
        L = max(10, kt / 441 * MAXL * k)
        on = all_on or n == active
        col = (ACC1 if n == 1 else ACC) if on else DIM
        d.rounded_rectangle([X0, y, X0 + L, y + bh], radius=10, fill=col, outline=WHITE if on else (60, 70, 90), width=3 if on else 2)
        if on and L > 30:      # shimmer sweeping along the highlighted bar
            sx = X0 + ((tw * 0.9) % 1.0) * (L + 80) - 40
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            od.rounded_rectangle([max(X0, sx), y + 4, min(X0 + L, sx + 36), y + bh - 4], radius=6, fill=(255, 255, 255, 120)) if sx < X0 + L and sx + 36 > X0 else None
            im.paste(Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')); d = ImageDraw.Draw(im)
        ctext(d, (X0 - 18, y + bh / 2), '#%d' % n, font(FB, 46), WHITE if on else (150, 160, 180), 'rm', 3 if on else 0)
        lab = '%s %d KT' % (nm, kt)
        if L > 520: ctext(d, (X0 + 20, y + bh / 2), lab, font(FB, 40), WHITE if on else (230, 235, 245), 'lm', 0)
        else: ctext(d, (X0 + L + 14, y + bh / 2), lab, font(FB, 40), WHITE if on else (150, 160, 180), 'lm', 4 if on else 0)
    return zoom(im, 1.0 + 0.05 * tw / 2.0)

_bm = {}
PADX, PADY = 1500, 2000
def basemap():
    if 'im' in _bm: return _bm['im']
    src = Image.open(os.path.join(RAW, 'bluemarble.jpg')).convert('RGB')
    w, h = src.size
    big = Image.new('RGB', (w + 2 * PADX, h + 2 * PADY), (6, 10, 22))
    big.paste(src, (PADX, PADY)); big.paste(src.crop((w - PADX, 0, w, h)), (0, PADY)); big.paste(src.crop((0, 0, PADX, h)), (PADX + w, PADY))
    _bm['im'] = big; return big

def locator(n, t, dur):
    nm, kt, lat, lon = E[n]
    big = basemap(); PPD = 15.0
    k = t / dur; k = 1 - (1 - k) ** 2
    wdeg = 84 - 44 * k
    cw = wdeg * PPD; ch = cw * H / W
    mx = (lon + 180) * PPD + PADX; my = (90 - lat) * PPD + PADY
    x0 = mx - 0.5 * cw; y0 = my - (900 / H) * ch
    im = big.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch))
    # darken + graticule
    im = Image.blend(im, Image.new('RGB', (W, H), (4, 8, 20)), 0.32)
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    opx = W / wdeg
    for g in range(-180, 541, 10):
        x = 540 + (g - lon) * opx
        if -5 < x < W + 5: d.line([(x, 0), (x, H)], fill=(255, 255, 255, 36), width=2)
    for g in range(-90, 91, 10):
        y = 900 + (lat - g) * opx
        if -5 < y < H + 5: d.line([(0, y), (W, y)], fill=(255, 255, 255, 36), width=2)
    for y in range(0, 760):          # top shade for the text band
        a = int(150 * (1 - y / 760) ** 1.4); d.line([(0, y), (W, y)], fill=(2, 4, 12, a))
    col = ACC1 if n == 1 else ACC
    for r in range(3):               # pulse rings
        ph = (t * 0.9 + r / 3.0) % 1.0
        rr = 24 + 150 * ph; a = int(220 * (1 - ph))
        d.ellipse([540 - rr, 900 - rr, 540 + rr, 900 + rr], outline=col + (a,), width=6)
    for g in range(6, 0, -1):
        d.ellipse([540 - 16 - g * 8, 900 - 16 - g * 8, 540 + 16 + g * 8, 900 + 16 + g * 8], fill=col + (int(26 * (7 - g)),))
    d.ellipse([540 - 15, 900 - 15, 540 + 15, 900 + 15], fill=(255, 255, 255, 255), outline=col + (255,), width=5)
    return Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')

def misr(t, dur):
    src = Image.open(os.path.join(RAW, 'PIA22825.jpg')).convert('RGB')    # 1830x1830, NASA MISR
    k = t / dur; k = k * k * (3 - 2 * k)
    z = 1.15 + 0.35 * k                       # push in
    cw = 1030 / z; ch = cw * H / W
    cx = 880 + 120 * k; cy = 420 + 630 * k    # trail shadow (top) -> orange cloud (lower right)
    cy = min(max(cy, ch / 2), 1830 - ch / 2); cx = min(max(cx, cw / 2), 1830 - cw / 2)
    return src.resize((W, H), Image.LANCZOS, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))

SPEC = {
    'hook_bars': (lambda t, du: bars(1, t, True, True), 2.6),
    'loc5': (lambda t, du: locator(5, t, du), 2.0), 'bar5': (lambda t, du: bars(5, t), 2.0),
    'loc4': (lambda t, du: locator(4, t, du), 2.0), 'bar4': (lambda t, du: bars(4, t), 2.0),
    'loc3': (lambda t, du: locator(3, t, du), 2.0), 'bar3': (lambda t, du: bars(3, t), 2.0),
    'loc2': (lambda t, du: locator(2, t, du), 1.5), 'misr': (lambda t, du: misr(t, du), 3.0),
}
for name, (fn, dur) in SPEC.items():
    if only and name not in only: continue
    n = int(round(dur * FPS))
    if STILL:
        fn(0.0, dur).save(os.path.join(OUT, name + '_0.png')); fn((n - 1) / FPS, dur).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(fn(i / FPS, dur).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
