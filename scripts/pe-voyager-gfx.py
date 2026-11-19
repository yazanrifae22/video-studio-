"""rank-261028-k1wy (Voyager 1 is about to reach 1 light-day): NASA still pushes + ORIGINAL distance-ladder graphics.
Data: JPL Horizons API (geocentric range, 2026-10-28 00:00 TDB), see data/pe-voy/values.json. Pioneer positions are Horizons projections (no signal since 2003 / 1995).
Stills: NASA/JPL, NASA/KSC, NASA/Ames, NASA/JHUAPL/SwRI (raw in data/pe-voy/raw). Fonts: Cairo Black (SIL OFL 1.1).
Usage: python scripts/pe-voyager-gfx.py <outdir> [name ...] [still]"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
Image.MAX_IMAGE_PIXELS = None
args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
W, H, FPS = 1080, 1920, 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FB = os.path.join(ROOT, 'data', 'brand', 'quiz-ar', 'fonts', 'Cairo-Black.ttf')
RAW = os.path.join(ROOT, 'data', 'pe-voy', 'raw')
_fc = {}
def font(s):
    if s not in _fc: _fc[s] = ImageFont.truetype(FB, s)
    return _fc[s]
WHITE = (255, 255, 255)
# rank: (name, value bn km, light-hours, estimated?)  -- JPL Horizons geocentric range 2026-10-28
E = {1: ('VOYAGER 1', 25.8, 23.9, False), 2: ('VOYAGER 2', 21.6, 20.0, False), 3: ('PIONEER 10', 21.2, 19.6, True),
     4: ('PIONEER 11', 17.7, 16.4, True), 5: ('NEW HORIZONS', 9.9, 9.2, False)}
LD = 25.9                    # 1 light-day in billion km (NASA)
SCALE_MAX = 30.0
ACC = (255, 170, 60); ACC1 = (255, 84, 60); DIM = (84, 98, 124); LDC = (90, 220, 255)

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

X0, X1 = 40, 1040
def vx(v): return X0 + v / SCALE_MAX * (X1 - X0)
NOTE = {5: '9.2 LIGHT-HOURS AWAY', 4: 'EST. POSITION · SILENT SINCE 1995', 3: 'EST. POSITION · SILENT SINCE 2003',
        2: '20.0 LIGHT-HOURS AWAY', 1: '23.9 LIGHT-HOURS AWAY'}
def ladder(active, tw, all_on=False, hook=False, ldtxt='1 LIGHT-DAY'):
    """five horizontal bars on ONE linear scale (billion km from Earth) + the 1 light-day line; labels >= 48 px.
    Rows sit between the rank chip (y<570) and the caption band (y>~1085)."""
    im = Image.new('RGB', (W, H)); bg(im, tw); d = ImageDraw.Draw(im)
    top = 705; bh = 70; gap = 6
    k = min(1.0, tw / 0.55); k = 1 - (1 - k) ** 3
    note = '5 FARTHEST SPACECRAFT' if hook else NOTE[active]
    ctext(d, (X0, 604), note, font(50), WHITE, 'lm', 5)
    ctext(d, (X1, 674), ldtxt, font(50), LDC, 'rm', 5)
    lx = vx(LD)
    for y in range(700, 705 + 5 * bh + 4 * gap + 6, 16):      # dashed light-day line
        d.line([(lx, y), (lx, y + 9)], fill=LDC, width=5)
    for i, n in enumerate([1, 2, 3, 4, 5]):
        nm, v, lh, est = E[n]; y = top + i * (bh + gap)
        L = max(12, (vx(v) - X0) * k)
        on = all_on or n == active
        col = (ACC1 if n == 1 else ACC) if on else DIM
        d.rounded_rectangle([X0, y, X0 + L, y + bh], radius=10, fill=col, outline=WHITE if on else (60, 70, 90), width=4 if on else 2)
        if est and on:       # estimated position: hatch the bar
            for hx in range(int(X0) + 8, int(X0 + L) - 8, 26):
                d.line([(hx, y + bh - 6), (min(hx + 26, X0 + L - 6), y + 6)], fill=(255, 235, 200), width=3)
        if on and L > 40:    # shimmer
            sx = X0 + ((tw * 0.9) % 1.0) * (L + 80) - 40
            if sx < X0 + L and sx + 36 > X0:
                ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
                od.rounded_rectangle([max(X0, sx), y + 5, min(X0 + L, sx + 36), y + bh - 5], radius=6, fill=(255, 255, 255, 110))
                im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB'); d = ImageDraw.Draw(im)
        tc = WHITE if on else (170, 180, 200)
        ctext(d, (X0 + 14, y + bh / 2 + 2), '#%d %s' % (n, nm), font(56), tc, 'lm', 5 if on else 3)
        vs = ('EST. %.1f' if est else '%.1f') % v
        ctext(d, (X1 - 4, y + bh / 2 + 2), vs, font(56), tc, 'rm', 5 if on else 3)
    return zoom(im, 1.0 + 0.04 * tw / 2.0)

def load(name, mode='RGB'): return Image.open(os.path.join(RAW, name)).convert(mode)

def window(im, cx, cy, wwin):
    """crop box of aspect 9:16 centred (cx, cy) fractions of the image, width wwin px (clamped inside the image)."""
    w, h = im.size; hwin = wwin * H / W
    x0 = min(max(cx * w - wwin / 2, 0), w - wwin); y0 = min(max(cy * h - hwin / 2, 0), h - hwin)
    return im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + wwin, y0 + hwin))

_im = {}
def img(name, crop=None):
    k = (name, crop)
    if k not in _im:
        im = load(name)
        if crop: im = im.crop(crop)
        _im[k] = im
    return _im[k]

def v1_launch(t, dur):
    im = img('PIA21747.jpg'); z = 1.0 + 0.0667 * t + (0.12 * (t - 3.0) ** 2 + 0.0 if t > 3.0 else 0.0)             # continuous push over the whole 4 s (hook = t 3..4, loop tail = t 0..3)
    return window(im, 0.5, 0.42, im.size[1] * W / H / z)

def p11_launch(t, dur):
    im = img('9139575.jpg'); w, h = im.size; hw = h * W / H      # 9:16 window = full height
    z = 1.0 + 0.10 * t / dur
    return window(im, 0.50, 0.46, hw / z)

def lift(im):
    """exposure lift for the dark 1973 composite: gamma 0.78 + brightness/contrast."""
    lut = [min(255, int(255 * (i / 255) ** 0.78)) for i in range(256)]
    im = im.point(lut * 3)
    return ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.18)).enhance(1.2)

def p10_jup(t, dur):
    im = lift(img('ARC-1973-AC73-9341.jpg', (444, 184, 2627, 1868))); w, h = im.size   # strip of Jupiter images, small -> large; pan left to right
    PH = 1300                                         # picture zone 0..1300; below it a dark band for the credit (nothing of the image under the credit)
    ww = h * W / PH; k = t / dur; k = k * k * (3 - 2 * k)
    cx = (ww / 2 + k * (w - ww)) / w
    x0 = min(max(cx * w - ww / 2, 0), w - ww)
    top = im.resize((W, PH), Image.LANCZOS, box=(x0, 0, x0 + ww, h))
    out = Image.new('RGB', (W, H), (6, 8, 20)); out.paste(top, (0, 0))
    ov = Image.new('L', (W, 90)); od = ImageDraw.Draw(ov)
    for y in range(90): od.line([(0, y), (W, y)], fill=int(255 * y / 89))
    out.paste(Image.new('RGB', (W, 90), (6, 8, 20)), (0, PH - 90), ov)   # feather picture into the band
    return out

def panel(name, crop, t, dur, z0=1.0, z1=1.1, dy=0, feather=0):
    """picture as a full-width panel (no heavy upscaling) over a blurred, darkened copy of itself."""
    src = img(name, crop); sw, sh = src.size
    back = window(src, 0.5, 0.5, min(sw, sh * W / H)).filter(ImageFilter.GaussianBlur(28))
    back = Image.blend(back, Image.new('RGB', (W, H), (4, 8, 20)), 0.55)
    z = z0 + (z1 - z0) * t / dur
    pw = W * z; ph = pw * sh / sw
    p = src.resize((int(pw), int(ph)), Image.LANCZOS)
    cx = (W - p.size[0]) // 2; cy = (H - p.size[1]) // 2 + dy
    if feather:
        m = Image.new('L', p.size, 255); md = ImageDraw.Draw(m)
        for i in range(feather - 1, -1, -1):
            md.rectangle([i, i, p.size[0] - 1 - i, p.size[1] - 1 - i], outline=int(255 * i / feather))
        back.paste(p, (cx, cy), m)
    else: back.paste(p, (cx, cy))
    return back

def nep(t, dur): return panel('PIA00049.jpg', (310, 130, 940, 900), t, dur, 1.0, 1.10, -40, feather=60)
def plu(t, dur): return panel('PIA20202.jpg', (0, 110, 612, 720), t, dur, 1.0, 1.12, -40)

def tl(f, o):
    return lambda t, du: f(t + o, du)
SPEC = {   # name: (fn, dur)
    'v1_launch': (v1_launch, 4.0), 'p11_launch': (p11_launch, 2.0), 'p10_jup': (p10_jup, 2.0), 'nep': (nep, 2.0), 'plu': (plu, 2.0),
}
LAD = [('hook', 2.3, dict(all_on=True, hook=True)), ('b5', 2.0, dict(active=5)), ('b4', 2.0, dict(active=4)), ('b3', 2.0, dict(active=3)),
       ('b2', 2.5, dict(active=2)), ('b1', 2.0, dict(active=1, ldtxt='1 LIGHT-DAY: NOV 18'))]
def ladder_all(t, du):
    a = 0.0
    for nm, d, kw in LAD:
        if t < a + d - 1e-6 or nm == 'b1':
            kw = dict(kw); act = kw.pop('active', 0)
            return ladder(act, t - a, **kw)
        a += d
SPEC['ladder'] = (ladder_all, sum(d for _, d, _ in LAD))

for name, (fn, dur) in SPEC.items():
    if only and name not in only: continue
    n = int(round(dur * FPS))
    if STILL:
        fn(0.0, dur).save(os.path.join(OUT, name + '_0.png')); fn((n - 1) / FPS, dur).save(os.path.join(OUT, name + '_1.png'))
        if name == 'ladder':
            a = 0.0
            for nm, d, kw in LAD: fn(a + 1.9 if d >= 2.0 else a + 1.0, dur).save(os.path.join(OUT, 'lad_' + nm + '.png')); a += d
        continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(fn(i / FPS, dur).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
