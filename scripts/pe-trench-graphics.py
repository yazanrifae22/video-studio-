"""Plan n=4 (deepest ocean trenches): ORIGINAL data graphics (no third-party imagery). Usage:
  python scripts/pe-trench-graphics.py <outdir> [still]
1) hook.mp4 / hook_end.mp4 - cross-section, HEIGHTS TO SCALE: Mount Everest (8,849 m) standing on the floor of the Challenger Deep
   (10,935 m, NOAA Ocean Exploration) -> 2,086 m of water above the summit. Trench walls/mountain outline are schematic (widths not to scale).
   hook_end renders time t in [-D, 0], so its last frame is pixel-identical to hook.mp4 frame 0 (seamless loop).
2) map_<site>.mp4 - shaded relief of NOAA NCEI ETOPO 2022 15 arc-second data around each trench (public domain), deepest area marked,
   plus a 0-11,000 m depth gauge filled to the cited depth with Everest's height as reference. The gauge value is the final cited value only
   (no count-up). One layout for all entries.
Fonts: Cairo Black/Bold, SIL Open Font License 1.1 (data/brand/quiz-ar/fonts/OFL.txt)."""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONTS = os.path.join(ROOT, 'data', 'brand', 'quiz-ar', 'fonts')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')
GRIDS = os.path.join(ROOT, 'data', 'pe-trench', 'etopo15')
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1080, 1920, 30
AMBER = (251, 191, 36); INK = (5, 12, 28); WHITE = (241, 245, 249); GREY = (176, 190, 210)
_fc = {}


def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]


def text(d, xy, s, f, fill, anchor='mm', stroke=5):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=INK)


def ease(t): t = min(max(t, 0.0), 1.0); return 1 - (1 - t) ** 3


def encode(path, frames_iter, n):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', path],
                         stdin=subprocess.PIPE)
    for im in frames_iter:
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait(); print(path, n)


# ---------------------------------------------------------------- 1) hook: Everest in the Challenger Deep (heights to scale)
DEEP, EVEREST = 10935, 8849
SURF_Y, FLOOR_Y = 690, 1520  # sky band above holds the top chips; floor labels stay above the bottom UI band
PXM = (FLOOR_Y - SURF_Y) / DEEP  # px per metre (vertical only)
SUMMIT_Y = FLOOR_Y - EVEREST * PXM
rng = np.random.default_rng(7)
SNOW = rng.random((140, 3))  # x, y phase, size


def Y(y_old):  # outline was drawn on a 1800 px floor / 683 px summit grid; map it onto the current to-scale grid
    return FLOOR_Y - (1800 - y_old) / (1800 - 683.3) * (FLOOR_Y - SUMMIT_Y)


def everest_poly():
    # schematic massif outline (not a survey profile): base on the trench floor, summit at exactly 8,849 m
    pts = [(300, 1800), (345, 1560), (372, 1585), (410, 1330), (440, 1360), (470, 1090), (505, 1120)]
    pts += [(540, 683.3), (568, 753), (590, 980), (620, 1040), (650, 1180), (690, 1150), (725, 1390), (760, 1430), (785, 1800)]
    return [(x, Y(y)) for x, y in pts]


def hook_frame(t):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for y in range(H):  # sky above the surface, water below (darker with depth)
        if y < SURF_Y:
            k = y / SURF_Y; c = (int(14 + 40 * k), int(40 + 70 * k), int(80 + 70 * k))
        else:
            k = (y - SURF_Y) / (H - SURF_Y); c = (int(20 * (1 - k) + 2), int(90 * (1 - k) ** 1.6 + 6), int(150 * (1 - k) ** 1.2 + 22))
        d.line([(0, y), (W, y)], fill=c)
    # surface shimmer
    pts = [(x, SURF_Y + 5 * math.sin(x / 55 + t * 2.4)) for x in range(0, W + 12, 12)]
    d.line(pts, fill=(160, 220, 245), width=5)
    # trench walls (schematic) - rock
    rock = (38, 30, 36)
    d.polygon([(0, SURF_Y + 80), (120, SURF_Y + 140), (210, Y(900)), (250, Y(1500)), (285, FLOOR_Y), (0, FLOOR_Y)], fill=rock)
    d.polygon([(W, SURF_Y + 110), (960, SURF_Y + 180), (880, Y(950)), (830, Y(1520)), (800, FLOOR_Y), (W, FLOOR_Y)], fill=rock)
    d.rectangle([0, FLOOR_Y, W, H], fill=(28, 22, 28))
    # marine snow (deterministic in t, also valid for negative t)
    for (sx, sy, ss) in SNOW:
        y = SURF_Y + 30 + ((sy * (FLOOR_Y - SURF_Y) + t * 22 * (0.5 + ss)) % (FLOOR_Y - SURF_Y - 40))
        r = 1.5 + 2.5 * ss
        d.ellipse([sx * W - r, y - r, sx * W + r, y + r], fill=(120, 160, 190))
    # Everest
    poly = everest_poly()
    d.polygon(poly, fill=(92, 98, 112))
    snow = [(x, Y(y)) for x, y in [(470, 1090), (505, 1120), (540, 683.3), (568, 753), (590, 980), (620, 1040), (585, 1060), (560, 1000), (535, 1050), (500, 1150)]]
    d.polygon(snow, fill=(226, 234, 242))
    d.line(poly, fill=(200, 210, 225), width=3)
    # summit + surface markers, the 2,086 m bracket
    for x in range(120, 980, 34):
        d.line([(x, SUMMIT_Y), (x + 18, SUMMIT_Y)], fill=AMBER, width=5)
    bx = 905
    d.line([(bx, SURF_Y + 8), (bx, SUMMIT_Y - 4)], fill=AMBER, width=7)
    d.line([(bx - 22, SURF_Y + 8), (bx + 22, SURF_Y + 8)], fill=AMBER, width=7)
    d.line([(bx - 22, SUMMIT_Y - 4), (bx + 22, SUMMIT_Y - 4)], fill=AMBER, width=7)
    text(d, (bx - 40, (SURF_Y + SUMMIT_Y) / 2 - 30), '2,086 M', font(FB, 72), AMBER, anchor='rm')
    text(d, (bx - 40, (SURF_Y + SUMMIT_Y) / 2 + 30), 'OF WATER ABOVE', font(FB, 54), WHITE, anchor='rm')
    text(d, (60, SURF_Y - 30), 'SEA SURFACE', font(FB, 48), (200, 230, 245), anchor='lm', stroke=4)
    text(d, (545, Y(1290)), 'EVEREST', font(FB, 72), WHITE, stroke=6)
    text(d, (545, Y(1290) + 66), '8,849 M', font(FB, 60), WHITE, stroke=6)
    text(d, (540, FLOOR_Y + 48), 'CHALLENGER DEEP FLOOR · 10,935 M', font(FB, 54), WHITE)
    text(d, (540, FLOOR_Y + 100), 'HEIGHTS TO SCALE · SHAPES SCHEMATIC', font(FS, 42), GREY, stroke=3)
    return im


def push(im, z):
    cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))


def hook(dur, end=False):
    n = int(round(dur * FPS))
    for i in range(n):
        if end:  # t runs -D .. 0, zoom 1.04 .. 1.0 -> last frame == hook frame 0
            t = -(n - 1 - i) / FPS; z = 1 + 0.04 * ((n - 1 - i) / (n - 1))
        else:
            t = i / FPS; z = 1 + 0.04 * (i / (n - 1))
        yield push(hook_frame(t), z)


# ---------------------------------------------------------------- 2) relief maps + depth gauge
SITES = {  # name: (cited depth m, map label)
    'izu': (9801, 'IZU-OGASAWARA TRENCH'),
    'philippine': (10045, 'PHILIPPINE TRENCH'),
    'kermadec': (10047, 'KERMADEC TRENCH'),
    'tonga': (10816, 'TONGA TRENCH'),
    'mariana': (10935, 'MARIANA TRENCH'),
}
STOPS = [(0, (150, 215, 230)), (1500, (90, 170, 215)), (3500, (45, 115, 190)), (5500, (28, 70, 150)), (7000, (24, 40, 112)),
         (8500, (30, 22, 84)), (9500, (24, 10, 58)), (10500, (14, 4, 34)), (11500, (8, 2, 20))]


def colour(depth):
    out = np.zeros(depth.shape + (3,), np.float32)
    ds = np.array([s[0] for s in STOPS], np.float32); cs = np.array([s[1] for s in STOPS], np.float32)
    for c in range(3): out[..., c] = np.interp(depth, ds, cs[:, c])
    return out


def relief(name, scale):
    z = np.load(os.path.join(GRIDS, f'{name}.npy')).astype(np.float32)
    # resample to the output canvas (box is 9:16 in ground distance)
    tw, th = int(W * scale), int(H * scale)
    zi = np.asarray(Image.fromarray(z, mode='F').resize((tw, th), Image.BICUBIC))
    cell = (4.0 * 111320 * math.cos(math.radians(0))) / tw  # approx metres per pixel (x); hillshade only
    gy, gx = np.gradient(zi, cell)
    az, alt = math.radians(315), math.radians(40)
    slope = np.arctan(3.0 * np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    shade = np.clip(shade, 0, 1)
    rgb = colour(np.clip(-zi, 0, None))
    land = zi > 0
    rgb[land] = np.stack([110 + 0 * zi[land], 120 + 0.02 * zi[land], 92 + 0 * zi[land]], -1)
    rgb = rgb * (0.45 + 0.75 * shade[..., None])
    deep = np.unravel_index(np.argmin(zi), zi.shape)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)), (deep[1], deep[0])


GX0, GX1, GY0, GY1 = 64, 120, 400, 1480  # depth gauge 0..11,000 m, left side (right rail = platform buttons)


def gauge(d, depth, g):
    k = (GY1 - GY0) / 11000
    d.rounded_rectangle([GX0 - 8, GY0 - 8, GX1 + 8, GY1 + 8], 14, fill=(5, 12, 28))
    fill_to = GY0 + depth * k * g
    for y in range(GY0, int(fill_to)):
        f = (y - GY0) / (GY1 - GY0); d.line([(GX0, y), (GX1, y)], fill=(int(90 - 70 * f), int(190 - 170 * f), int(235 - 150 * f)))
    for m in range(0, 11001, 1000):
        y = GY0 + m * k; d.line([(GX1 + 4, y), (GX1 + 18, y)], fill=GREY, width=3)
    text(d, (GX1 + 26, GY0), '0 M', font(FS, 40), GREY, anchor='lm', stroke=3)
    ey = GY0 + EVEREST * k  # Everest's height as a depth reference
    for x in range(GX0 - 6, 520, 30): d.line([(x, ey), (x + 16, ey)], fill=AMBER, width=5)
    text(d, (GX1 + 26, ey + 38), 'EVEREST 8,849 M', font(FB, 54), AMBER, anchor='lm')  # below the line: captions sit just above it
    if g >= 0.999:
        y = GY0 + depth * k
        d.line([(GX0 - 8, y), (GX1 + 30, y)], fill=WHITE, width=6)
        text(d, (GX1 + 40, y + 40), f'{depth:,} M', font(FB, 74), WHITE, anchor='lm')


def map_frames(name, dur, still_t=None):
    depth, label = SITES[name]
    S = 1.12
    base, (mx, my) = relief(name, S)
    bw, bh = base.size
    n = int(round(dur * FPS)); ts = [still_t] if still_t is not None else [i / FPS for i in range(n)]
    for t in ts:
        p = min(t / dur, 1.0); z = 1.0 + 0.10 * (p * p * (3 - 2 * p))
        cw, ch = W / z, H / z
        # keep the deepest cell at ~40 % height, ~45 % width as we push in
        cx = bw / 2 + (mx - bw / 2) * 0.6 * p; cy = bh / 2 + (my - bh / 2) * 0.6 * p
        l = min(max(cx - cw / 2, 0), bw - cw); tp = min(max(cy - ch / 2, 0), bh - ch)
        fr = base.resize((W, H), Image.LANCZOS, box=(l, tp, l + cw, tp + ch))
        d = ImageDraw.Draw(fr)
        sx = (mx - l) * W / cw; sy = (my - tp) * H / ch
        ph = (t * 1.6) % 1.0  # pulsing ring on the deepest area
        r = 26 + 60 * ph
        d.ellipse([sx - r, sy - r, sx + r, sy + r], outline=AMBER + (0,), width=max(2, int(8 * (1 - ph))))
        d.ellipse([sx - 15, sy - 15, sx + 15, sy + 15], fill=AMBER, outline=INK, width=4)
        text(d, (sx, sy + 120), 'DEEPEST AREA', font(FB, 54), AMBER)  # below the ring: the top band holds the chips
        gauge(d, depth, ease(t / 0.7))
        text(d, (540, 1612), 'RELIEF: NOAA ETOPO 2022 DATA', font(FB, 54), WHITE)
        yield fr


if __name__ == '__main__':
    still = 'still' in sys.argv[2:]
    if still:
        hook_frame(0).save(os.path.join(OUT, 'still_hook.png'))
        for nm in SITES:
            next(map_frames(nm, 5.0, still_t=3.0)).save(os.path.join(OUT, f'still_{nm}.png'))
        sys.exit()
    encode(os.path.join(OUT, 'hook.mp4'), hook(3.0), 90)
    encode(os.path.join(OUT, 'hook_end.mp4'), hook(2.5, end=True), 75)
    for nm in ['izu', 'philippine', 'kermadec', 'tonga']:  # #1 uses the NASA sonar map, not ETOPO
        encode(os.path.join(OUT, f'map_{nm}.mp4'), map_frames(nm, 5.5), int(5.5 * FPS))
