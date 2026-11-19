"""rank-261028-xkgv (top-5 solar flares): ORIGINAL X-class bar graphics + SOHO/EIT still & time-lapse clips (NASA SVS 2959).
Bar LENGTH is proportional to the peak GOES soft X-ray class on NOAA's ORIGINAL (operational) scale, one constant scale (K px per X unit).
Values: NOAA NCEI GOES XRS event reports (goes-xrs-report_YYYY.txt): 2003-11-04 X28 (detector saturated at ~X17.4, so ESTIMATED),
1989-08-16 X20.0, 2001-04-02 X20.0, 2003-10-28 X17.2, 2005-09-07 X17.0. Font: Cairo Black/Bold (SIL OFL 1.1, data/brand/quiz-ar/fonts).
Usage: python scripts/pe-flare-gfx.py <outdir> [name ...] [still]"""
import math, os, subprocess, sys
from PIL import Image, ImageChops, ImageDraw, ImageFont

args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
W, H, FPS = 1080, 1920, 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONTS = os.path.join(ROOT, 'data', 'brand', 'quiz-ar', 'fonts')
RAW = os.path.join(ROOT, 'data', 'pe-flare', 'raw')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
# key: (value, label, colour)
FL = {'f1': (28.0, 'NOV 2003', (255, 120, 40)), 'f2': (20.0, 'APR 2001', (250, 190, 60)), 'f3': (20.0, 'AUG 1989', (250, 190, 60)),
      'f4': (17.2, 'OCT 2003', (240, 150, 90)), 'f5': (17.0, 'SEP 2005', (230, 130, 90))}
LBL = {'f1': 'X28 (EST.)', 'f2': 'X20.0', 'f3': 'X20.0', 'f4': 'X17.2', 'f5': 'X17.0'}
RANK = {'f1': '#1', 'f2': '#2', 'f3': '#3', 'f4': '#4', 'f5': '#5'}
K = 32.0; X0 = 60            # px per X unit (X28 -> 896 px)
WHITE = (255, 255, 255); DIM = (70, 76, 100)
rng = [(37 * i % 1080, 29 * i % 1920, 1 + i % 3) for i in range(1, 160)]


def bg(d, t):
    for y in range(H):
        k = y / H; d.line([(0, y), (W, y)], fill=(int(14 + 14 * k), int(8 + 8 * k), int(22 + 14 * k)))
    for i, (x, y, r) in enumerate(rng):
        a = 70 + int(60 * (0.5 + 0.5 * math.sin(t * 1.3 + i)))
        d.ellipse([x, y, x + r, y + r], fill=(a, a, a + 30))


def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(10, 6, 20))


def bar(d, key, y, h, fs, grow=1.0, dim=False, name=True):
    v, lab, col = FL[key]
    c = DIM if dim else col
    L = v * K * grow
    if key == 'f1' and not dim:      # whole bar hatched = ESTIMATED (GOES detector saturated)
        d.rectangle([X0, y, X0 + L, y + h], fill=(70, 38, 22), outline=WHITE, width=3)
        sx = int(X0) + 6
        while sx < X0 + L:
            d.line([(sx, y + h - 3), (min(sx + h * 0.6, X0 + L - 2), y + 3)], fill=c, width=5); sx += 22
    else:
        d.rounded_rectangle([X0, y, X0 + L, y + h], radius=10, fill=c, outline=(150, 156, 180) if dim else WHITE, width=3)
    txt = f'{RANK[key]} · {lab} · {LBL[key]}' if name else LBL[key]
    f = font(FB, fs); tw = d.textlength(txt, font=f)
    fill = (190, 196, 220) if dim else WHITE
    if tw + 40 < (0 if key == 'f1' and not dim else L): ctext(d, (X0 + 22, y + h / 2), txt, f, fill, anchor='lm')
    else: ctext(d, (X0 + L + 16, y + h / 2), txt, f, fill, anchor='lm') if X0 + L + 16 + tw < W - 10 else ctext(d, (X0 + 20, y + h / 2), txt, f, fill, anchor='lm')


def axis(d, y0, y1):
    d.line([(X0 - 8, y0), (X0 - 8, y1)], fill=(190, 190, 210), width=3)
    for v in (10, 20):
        x = X0 + v * K
        d.line([(x, y0 - 6), (x, y1)], fill=(120, 126, 156), width=2)
        ctext(d, (x, y0 - 30), f'X{v}', font(FS, 34), (170, 176, 205), stroke=3)


def single(key, t, dur):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    g = min(1.0, 0.55 + t / 0.5 * 0.45) if t < 0.5 else 1.0
    axis(d, 800, 1110)   # v6: chart moved down 100 px so date chips do not cover the X10/X20 labels
    bar(d, 'f1', 830, 84, 46, 1.0, dim=True) if key != 'f1' else None
    bar(d, key, 940, 140, 66, g)
    return im


def ladder(hi, t, dur, title=None):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, t)
    axis(d, 790, 1200)
    for i, k in enumerate(['f1', 'f2', 'f3', 'f4', 'f5']):
        bar(d, k, 822 + i * 76, 64, 42, 1.0, dim=(hi is not None and k != hi))
    return im


def zoom(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))


def still_frame(im, cxf, cyf, z):
    """full-height 9:16 window on a 4:3 still; z=1 shows full height. (cxf,cyf)=focal point as fractions of the still."""
    IW, IH = im.size
    vh = IH / z; vw = vh * 9 / 16
    cx, cy = cxf * IW, cyf * IH
    l = min(max(cx - vw / 2, 0), IW - vw); tp = min(max(cy - vh / 2, 0), IH - vh)
    return im.resize((W, H), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))


STILL_SPEC = {   # name: (file, focal x, focal y, z0, z1, dur)  ; hook_a z0 == end z1 -> seamless loop
    'hook_a': ('eit195hr.1300.jpg', 0.73, 0.66, 1.35, 1.55, 1.0),
    'end': ('eit195hr.1300.jpg', 0.73, 0.66, 1.9, 1.35, 2.5),
    'e4_b': ('eit195hr.0417.jpg', 0.48, 0.55, 1.6, 1.9, 2.1),
}
GFX = {
    'hook_b': (lambda t, d: ladder(None, t, d), 2.0, 1.0, 1.02),
    'c5a': (lambda t, d: single('f5', t, d), 2.1, 1.0, 1.03),
    'c5b': (lambda t, d: ladder('f5', t, d), 2.1, 1.0, 1.03),
    'c3a': (lambda t, d: single('f3', t, d), 2.1, 1.0, 1.03),
    'c3b': (lambda t, d: ladder('f3', t, d), 2.1, 1.0, 1.03),
    'c2a': (lambda t, d: single('f2', t, d), 2.2, 1.0, 1.03),
    'c2b': (lambda t, d: ladder('f2', t, d), 2.2, 1.0, 1.03),
}


def writer(out):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)


for name, (fn, dur, z0, z1) in GFX.items():
    if only and name not in only: continue
    n = max(2, int(round(dur * FPS)))
    def fr(i):
        k = i / (n - 1); k = k * k * (3 - 2 * k)
        return zoom(fn(i / FPS, dur), z0 + (z1 - z0) * k)
    if STILL:
        fr(0).save(os.path.join(OUT, name + '_0.png')); fr(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4'); p = writer(out)
    for i in range(n): p.stdin.write(fr(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)

for name, (f, fx, fy, z0, z1, dur) in STILL_SPEC.items():
    if only and name not in only: continue
    im = Image.open(os.path.join(RAW, f)).convert('RGB'); n = int(round(dur * FPS))
    im = ImageChops.lighter(im, Image.new('RGB', im.size, (4, 22, 4)))   # dark-green floor: no pure-black edge for the builder's border auto-crop
    def fr(i):
        k = i / (n - 1); k = k * k * (3 - 2 * k)
        return still_frame(im, fx, fy, z0 + (z1 - z0) * k)
    if STILL:
        fr(0).save(os.path.join(OUT, name + '_0.png')); fr(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4'); p = writer(out)
    for i in range(n): p.stdin.write(fr(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)

# SOHO/EIT time-lapse crops (NASA SVS 2959 movie, 1 s of movie = ~6 h of Sun time); stamp strip masked
MOV = os.path.join(RAW, 'eit195_fall2003_NTSC.webmhd.webm')
TL = {'e1_a': (42.2, 2.5, 445), 'e4_a': (13.2, 2.1, 215)}
for name, (ss, dur, cx) in TL.items():
    if only and name not in only: continue
    out = os.path.join(OUT, name + '.mp4')
    if STILL: continue
    vf = f"crop=230:410:{cx}:0,scale=1080:1920:flags=lanczos,fps=30"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(dur), '-i', MOV, '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '14',
                    '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], check=True); print(name, out)
