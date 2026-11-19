"""rank-261028-xgph (largest earthquakes): turn PD stills into 1080x1920 slow-push clips (full-frame cover, no blur fill).
Adapted from scripts/pe-still2clip.py. Black slide borders are trimmed automatically; 'wb' = partial grey-world white balance
(0..1) for faded orange slides (colour restoration only, no content change). Usage: python scripts/pe-eq-still2clip.py <outdir>"""
import subprocess, sys, os
import numpy as np
from PIL import Image, ImageFilter

RAW = r'E:\clips-viral\data\pe-eq\raw'
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FPS = 30
SPECS = {
    # hook: push in from the exact crop that the last segment ends on (loop)
    'chile_hook': dict(f='noaa_25_512.jpg', cx=(.36, .36), cy=.52, z=(1.0, 1.18), dur=6, wb=.25, sat=.7),
    'chile_end': dict(f='noaa_25_512.jpg', cx=(.36, .36), cy=.52, z=(1.18, 1.0), dur=6, wb=.25, sat=.7),
    'chile_hook2': dict(f='noaa_25_512.jpg', cx=(.66, .62), cy=.5, z=(1.0, 1.12), dur=6, wb=.25, sat=.7),
    # v4: USGS-credited Hilo debris street (NGDC image 920) replaces the withheld image 512
    'hilo920_hook': dict(f='noaa_45_920.jpg', cx=(.27, .27), cy=.66, z=(1.45, 1.7), dur=6),
    'hilo920_end': dict(f='noaa_45_920.jpg', cx=(.27, .27), cy=.66, z=(1.7, 1.45), dur=6),
    'hilo920_hook2': dict(f='noaa_45_920.jpg', cx=(.55, .6), cy=.64, z=(1.45, 1.6), dur=6),
    'hilo_1960': dict(f='noaa_25_513.jpg', cx=(.30, .42), cy=.55, z=(1.0, 1.12), dur=6),
    'midway_1952': dict(f='noaa_25_507.jpg', cx=(.42, .55), cy=.55, z=(1.0, 1.15), dur=6),
    'ak_4thave': dict(f='usgs_ak1964_4thave.jpg', cx=(.62, .55), cy=.55, z=(1.0, 1.15), dur=6),
    'ak_turnagain': dict(f='usgs_turnagain_color.jpg', cx=(.22, .32), cy=.5, z=(1.0, 1.12), dur=6),
    'ak_school': dict(f='noaa_5_111.jpg', cx=(.45, .58), cy=.5, z=(1.0, 1.12), dur=6),
    'sumatra_a': dict(f='navy_040.jpg', cx=(.50, .58), cy=.55, z=(1.0, 1.18), dur=6),
    'sumatra_b': dict(f='navy_031.jpg', cx=(.45, .38), cy=.5, z=(1.0, 1.15), dur=6),
}


def autobox(im, thr=40):
    """Fractional box inside dark slide borders."""
    a = np.asarray(im.convert('L'), dtype=np.float32)
    rows = np.where(a.mean(axis=1) > thr)[0]
    cols = np.where(a.mean(axis=0) > thr)[0]
    H, W = a.shape
    pad = 4
    return ((cols[0] + pad) / W, (rows[0] + pad) / H, (cols[-1] - pad) / W, (rows[-1] - pad) / H)


def whitebal(im, k):
    a = np.asarray(im, dtype=np.float32)
    m = a.reshape(-1, 3).mean(axis=0)
    g = m.mean() / m
    g = 1 + (g - 1) * k
    return Image.fromarray(np.clip(a * g, 0, 255).astype(np.uint8))


only = set(sys.argv[2:])
for name, s in SPECS.items():
    if only and name not in only:
        continue
    im = Image.open(os.path.join(RAW, s['f'])).convert('RGB')
    if s.get('wb'):
        im = whitebal(im, s['wb'])
    if s.get('sat'):
        from PIL import ImageEnhance
        im = ImageEnhance.Color(im).enhance(s['sat'])
    W, H = im.size
    x0, y0, x1, y1 = autobox(im)
    bx0, by0, bx1, by1 = x0 * W, y0 * H, x1 * W, y1 * H
    bw, bh = bx1 - bx0, by1 - by0
    out = os.path.join(OUT, name + '.mp4')
    n = int(s['dur'] * FPS)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / (n - 1)
        t = t * t * (3 - 2 * t)  # ease
        z = s['z'][0] + (s['z'][1] - s['z'][0]) * t
        vh = bh / z
        vw = vh * 9 / 16
        if vw > bw:
            vw = bw; vh = vw * 16 / 9
        cx = bx0 + bw * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t)
        cy = by0 + bh * s['cy']
        l = min(max(cx - vw / 2, bx0), bx1 - vw)
        tp = min(max(cy - vh / 2, by0), by1 - vh)
        fr = im.resize((1080, 1920), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))
        if vw < 700:
            fr = fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    print(name, out, 'box', tuple(round(v, 3) for v in (x0, y0, x1, y1)))
