"""rank-261028-xkgv: programmatic plots of REAL GOES-12 X-ray flux (NOAA NCEI GOES XRS 1-min averages, long channel 0.1-0.8 nm).
Data (US gov, NOAA/NESDIS/NCEI):
  https://www.ncei.noaa.gov/data/goes-space-environment-monitor/access/avg/2003/11/goes12/csv/g12_xrs_1m_20031101_20031130.csv
  https://www.ncei.noaa.gov/data/goes-space-environment-monitor/access/avg/2003/10/goes12/csv/g12_xrs_1m_20031001_20031031.csv
Linear axis in X-class units (1 X = 1e-4 W/m^2). Font Cairo (SIL OFL 1.1).
Usage: python scripts/pe-flare-goes.py <outdir> [goes_hook goes_oct28 goes_end] [still]"""
import math, os, subprocess, sys, datetime as dt
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
W, H, FPS = 1080, 1920, 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONTS = os.path.join(ROOT, 'data', 'brand', 'quiz-ar', 'fonts')
GD = os.path.join(ROOT, 'data', 'pe-flare', 'goes')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
WHITE = (255, 255, 255)


def load(fn, day, t0, t1):
    rows = []
    with open(os.path.join(GD, fn), encoding='utf8') as f:
        on = False
        for ln in f:
            if ln.startswith('time_tag,'): on = True; continue
            if not on or not ln.startswith(day): continue
            p = ln.strip().split(',')
            t = dt.datetime.strptime(p[0][:16], '%Y-%m-%d %H:%M')
            rows.append((t, float(p[2]) / 1e-4))   # long channel in X units
    base = dt.datetime.strptime(day, '%Y-%m-%d')
    a = base + dt.timedelta(hours=t0); b = base + dt.timedelta(hours=t1)
    return [((t - a).total_seconds() / 60.0, v) for t, v in rows if a <= t <= b], (b - a).total_seconds() / 60.0


NOV = load('g12_xrs_1m.csv', '2003-11-04', 19.25, 20.5)
OCT = load('g12_xrs_1m_oct.csv', '2003-10-28', 9.5, 12.0)
PX0, PX1, PY0, PY1, YMAX = 170, 950, 712, 1180, 30.0   # v6: plot box 490 px tall (was 270); chips/captions stay clear of axis labels


def bg(d, t):
    for y in range(H):
        k = y / H; d.line([(0, y), (W, y)], fill=(int(14 + 14 * k), int(8 + 8 * k), int(22 + 14 * k)))


def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(10, 6, 20))


def plot(series, span, hours, title, sub, progress=1.0, pulse=0.0, mode='nov', mk=1.0):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im); bg(d, 0)
    xs = lambda m: PX0 + m / span * (PX1 - PX0)
    ys = lambda v: PY1 - min(v, YMAX) / YMAX * (PY1 - PY0)
    ctext(d, (W / 2, 250), title, font(FB, 58), WHITE)
    ctext(d, (W / 2, 312), sub, font(FS, 38), (200, 205, 230))
    ctext(d, (W / 2, 362), 'Data: NOAA NCEI · 1-min averages · UT', font(FS, 34), (170, 176, 205), stroke=3)
    for v in (10, 20, 30):
        y = ys(v); d.line([(PX0, y), (PX1, y)], fill=(86, 92, 124), width=2)
        ctext(d, (PX0 - 14, y), f'X{v}', font(FS, 38), (190, 196, 225), anchor='rm', stroke=3)
    ctext(d, (PX0 - 14, ys(0)), '0', font(FS, 38), (190, 196, 225), anchor='rm', stroke=3)
    d.line([(PX0, PY1), (PX1, PY1)], fill=(190, 190, 210), width=3)
    pts = []
    for h, lab in hours:
        x = xs(h); d.line([(x, PY1), (x, PY1 + 12)], fill=(190, 190, 210), width=3)
        ctext(d, (x, PY1 + 34), lab, font(FS, 34), (190, 196, 225), stroke=3)
    pts = [(xs(m), ys(v)) for m, v in series if m <= span * progress]
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    if len(pts) > 1:
        od.polygon(pts + [(pts[-1][0], PY1), (pts[0][0], PY1)], fill=(255, 130, 50, 70))
    im = Image.alpha_composite(im.convert('RGBA'), ov); d = ImageDraw.Draw(im)
    if len(pts) > 1:
        d.line(pts, fill=(255, 170, 70), width=9, joint='curve')
    if mode == 'nov':
        flat = [(xs(m), ys(v)) for m, v in series if 28.0 <= m <= 41.0 and abs(v - 17.4) < 0.01 and m <= span * progress]
        if len(flat) > 1:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            a = int(60 + 90 * pulse)
            od.rounded_rectangle([flat[0][0] - 14, flat[0][1] - 26, flat[-1][0] + 14, flat[0][1] + 26], radius=20, fill=(255, 60, 50, a))
            im = Image.alpha_composite(im, ov); d = ImageDraw.Draw(im)
            d.line(flat, fill=(255, 70, 60), width=14)
            mx = xs(35.0); my = ys(28.0)
            if progress >= 0.999 and mk > 0:
                ytop = ys(17.4) - 10 + (my + 18 - (ys(17.4) - 10)) * mk   # estimate line rises from the flat top to X28
                d.line([(mx, ys(17.4) - 10), (mx, ytop)], fill=WHITE, width=4)
            if progress >= 0.999 and mk >= 0.999:
                d.polygon([(mx, my - 18), (mx + 18, my), (mx, my + 18), (mx - 18, my)], outline=WHITE, width=5)
                ctext(d, (mx + 34, my), 'X28 · NOAA ESTIMATE', font(FB, 38), (255, 235, 200), anchor='lm')
                ctext(d, (336, ys(25.5)), 'FLAT TOP', font(FB, 50), WHITE)
                ctext(d, (336, ys(20.5)), 'X17.4 · SATURATED', font(FB, 31), (255, 150, 140), stroke=3)
    else:
        pk = [(m, v) for m, v in series if m <= span * progress]
        if progress >= 0.999:
            m, v = max(series, key=lambda r: r[1])
            y17 = ys(17.4)
            for xx in range(PX0, PX1, 26): d.line([(xx, y17), (xx + 12, y17)], fill=(255, 120, 110), width=4)
            ctext(d, (PX0 + 10, y17 - 26), 'X17.4 = 4 NOV FLAT TOP', font(FS, 32), (255, 175, 165), anchor='lm', stroke=3)
            x, y = xs(m), ys(v)
            rr = 22 + 16 * pulse; d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 160, 80), width=4)
            d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=WHITE, outline=(255, 120, 40), width=5)
            ctext(d, (x - 55, y + 60), 'PEAK X17.2 · 11:10 UT', font(FB, 38), WHITE, anchor='rm')
    return im.convert('RGB')


def zoom(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))


NH = [(0, '19:15'), (15, '19:30'), (45, '20:00'), (75, '20:30')]
OH = [(30, '10:00'), (90, '11:00'), (150, '12:00')]
T_NOV = 'X-RAY FLUX · 4 NOV 2003'; S_NOV = 'GOES-12 · 0.1-0.8 nm · X-class units'
T_OCT = 'X-RAY FLUX · 28 OCT 2003'


def hook(t, dur, n):   # full plot at frame 0 (flat top + X28 marker); pushes in so frame 1.0 s differs from frame 0
    return plot(NOV[0], NOV[1], NH, T_NOV, S_NOV, 1.0, 0.5 + 0.5 * math.cos(2 * math.pi * t / 0.8))


def x28(t, dur, n):    # #1 card: flat top, then the X28 estimate line rises; last frame == hook frame 0 (loop)
    tl = (n - 1) / FPS
    mk = min(1.0, max(0.0, (t - 0.25) / 1.0)); mk = 1 - (1 - mk) ** 2
    return plot(NOV[0], NOV[1], NH, T_NOV, S_NOV, 1.0, 0.5 + 0.5 * math.cos(2 * math.pi * (t - tl) / 0.8), mk=mk)


def oct28(t, dur, n):  # pre-drawn: whole curve + X17.2 peak visible from frame 0
    return plot(OCT[0], OCT[1], OH, T_OCT, S_NOV, 1.0, 0.5 + 0.5 * math.cos(2 * math.pi * t / 0.9), mode='oct')


# name: (fn, dur, zoom0, zoom1)
GFX = {'goes_hook': (hook, 1.0, 1.0, 1.12), 'goes_oct28': (oct28, 2.1, 1.0, 1.05), 'goes_x28': (x28, 5.0, 1.10, 1.0)}


def writer(out):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)


for name, (fn, dur, z0, z1) in GFX.items():
    if only and name not in only: continue
    n = max(2, int(round(dur * FPS)))
    def fr(i):
        k = i / (n - 1); k = k * k * (3 - 2 * k)
        return zoom(fn(i / FPS, dur, n), z0 + (z1 - z0) * k)
    if STILL:
        fr(0).save(os.path.join(OUT, name + '_0.png')); fr(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4'); p = writer(out)
    for i in range(n): p.stdin.write(fr(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
