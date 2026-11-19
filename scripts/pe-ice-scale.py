"""rank-261028-g3s4: ORIGINAL size-to-scale graphics for #3 A-24 and #2 A-20 vs Jamaica (no third-party imagery).
Areas: BYU SCP table (A-24 6,863 km2, A-20 7,284 km2), Jamaica 10,991 km2 (World Bank). Square areas are exactly proportional
(side ~ sqrt(area)).

v12 (2026-10-28): text font = Cairo (Black/Bold) from data/brand/quiz-ar/fonts, SIL Open Font License 1.1 (OFL.txt beside it;
Copyright 2009 The Cairo Project Authors) - replaces the proprietary Segoe UI system font. Both graphics share ONE nested layout
(berg square inside Jamaica's dashed square, bottom-left anchored) filling the frame below the rank badge; the berg label shows only
the final area (no count-up). Usage: python scripts/pe-ice-scale.py <outdir>"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1080, 1920, 30
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'brand', 'quiz-ar', 'fonts')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')  # OFL 1.1
JAM = 10991
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]


def ease(t): t = min(max(t, 0), 1); return 1 - (1 - t) ** 3


def ocean(d, t, top, bot, line):
    for y in range(H):  # vertical gradient
        k = y / H; d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3)))
    for r in range(30):  # drifting swell lines (motion keeps freezedetect quiet, reads as "ocean")
        y0 = 120 + r * 60 + 18 * math.sin(t * 1.3 + r)
        pts = [(x, y0 + 7 * math.sin(x / 70 + t * 2.2 + r * 0.7)) for x in range(0, W + 20, 20)]
        d.line(pts, fill=line, width=2)


def dashed_rect(d, x0, y0, x1, y1, col, w=8, dash=30, gap=16):
    for (a, b, fixed, horiz) in [(x0, x1, y0, True), (x0, x1, y1, True), (y0, y1, x0, False), (y0, y1, x1, False)]:
        p = a
        while p < b:
            q = min(p + dash, b)
            d.line([(p, fixed), (q, fixed)] if horiz else [(fixed, p), (fixed, q)], fill=col, width=w)
            p = q + gap


def ctext(d, xy, s, f, fill, anchor='mm', stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(5, 15, 30))


def frame(kind, t, dur):
    if kind == 'a24':
        top, bot, line, berg, ink, name, area = (8, 30, 58), (4, 18, 38), (24, 60, 96), (103, 232, 249), (8, 30, 58), 'A-24', 6863
    else:
        top, bot, line, berg, ink, name, area = (6, 38, 46), (3, 20, 26), (20, 74, 84), (240, 249, 255), (6, 38, 46), 'A-20', 7284
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    ocean(d, t, top, bot, line)
    amber = (251, 191, 36)
    g = ease(t / 0.6)  # square grows in; labels only ever show the final value
    # one nested layout for both: Jamaica's square (dashed) 1000 px, berg square bottom-left inside it, exact area ratio
    S = 1000; x0, y0 = (W - S) / 2, 560; y1 = y0 + S
    sb = S * math.sqrt(area / JAM); s = sb * g
    d.rectangle([x0, y1 - s, x0 + s, y1], fill=berg)
    dashed_rect(d, x0, y0, x0 + S, y1, amber)
    strip = S - sb  # band above the berg inside Jamaica's square
    ctext(d, (W / 2, y0 + strip / 2), f'JAMAICA · {JAM:,} KM²', font(FB, 64), amber)
    if g >= 0.999:
        cx = x0 + sb / 2
        d.text((cx, y1 - 190), name, font=font(FB, 150), fill=ink, anchor='mm')
        d.text((cx, y1 - 80), f'{area:,} KM²', font=font(FB, 84), fill=ink, anchor='mm')
    ctext(d, (W / 2, y1 + 66), 'SIZE TO SCALE: SQUARE AREA = TRUE AREA', font(FS, 44), (226, 232, 240))
    ctext(d, (W / 2, y1 + 128), 'AREAS: BYU SCP · WORLD BANK', font(FS, 42), (148, 163, 184))
    # slow 3 % push over the clip (picture always moving)
    z = 1 + 0.03 * (t / dur); cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))


if __name__ == '__main__':
    only = sys.argv[2:]  # optional: 'still' -> write PNG previews only
    for kind, dur in [('a24', 5.5), ('a20', 5.5)]:
        if 'still' in only:
            for tt in (0.3, 2.0):
                frame(kind, tt, dur).save(os.path.join(OUT, f'scale_{kind}_{tt:.1f}.png'))
            continue
        out = os.path.join(OUT, f'scale_{kind}.mp4'); n = int(dur * FPS)
        p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                              '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
        for i in range(n):
            p.stdin.write(frame(kind, i / FPS, dur).tobytes())
        p.stdin.close(); p.wait(); print(out)
