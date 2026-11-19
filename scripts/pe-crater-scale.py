"""rank-261028-jdml: ORIGINAL size-to-scale graphic, Chicxulub (150 km) nested in Vredefort (160 km). Numbers only: Earth Impact Database
(rim-to-rim diameters). Font Cairo Black/Bold (SIL OFL 1.1, data/brand/quiz-ar/fonts/OFL.txt). Layout = pe-ice-scale.py. Usage: python scripts/pe-crater-scale.py <outdir> [still]"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1080, 1920, 30
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'brand', 'quiz-ar', 'fonts')
FB = os.path.join(FONTS, 'Cairo-Black.ttf'); FS = os.path.join(FONTS, 'Cairo-Bold.ttf')
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
def ease(t): t = min(max(t, 0), 1); return 1 - (1 - t) ** 3
def ctext(d, xy, s, f, fill, stroke=4): d.text(xy, s, font=f, fill=fill, anchor='mm', stroke_width=stroke, stroke_fill=(30, 12, 6))
def frame(t, dur):
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    top, bot = (46, 18, 10), (22, 8, 6)
    for y in range(H):
        k = y / H; d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3)))
    for r in range(30):
        y0 = 120 + r * 60 + 18 * math.sin(t * 1.3 + r)
        d.line([(x, y0 + 7 * math.sin(x / 70 + t * 2.2 + r * 0.7)) for x in range(0, W + 20, 20)], fill=(70, 30, 18), width=2)
    amber = (251, 191, 36); g = ease(t / 0.6)
    D = 1000; cx = W / 2; y0 = 560; y1 = y0 + D
    dc = D * 150 / 160 * g
    d.ellipse([cx - dc / 2, y1 - dc, cx + dc / 2, y1], fill=(255, 237, 213))
    # dashed circle (Vredefort)
    n = 90
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = a0 + 2 * math.pi / n * 0.58
        pts = [(cx + D / 2 * math.cos(a), y0 + D / 2 + D / 2 * math.sin(a)) for a in [a0 + (a1 - a0) * k / 4 for k in range(5)]]
        d.line(pts, fill=amber, width=8)
    ctext(d, (cx, y1 + 62), 'DASHED: VREDEFORT · 160 KM', font(FB, 58), amber)
    if g >= 0.999:
        ink = (46, 18, 10)
        d.text((cx, y1 - 190), 'CHICXULUB', font=font(FB, 110), fill=ink, anchor='mm')
        d.text((cx, y1 - 90), '150 KM', font=font(FB, 84), fill=ink, anchor='mm')
    ctext(d, (W / 2, y1 + 128), 'SIZE TO SCALE: CIRCLE DIAMETER = TRUE DIAMETER', font(FS, 40), (226, 232, 240))
    ctext(d, (W / 2, y1 + 186), 'DIAMETERS: EARTH IMPACT DATABASE (EID)', font(FS, 42), (148, 163, 184))
    z = 1 + 0.03 * (t / dur); cw, ch = W / z, H / z
    return im.resize((W, H), Image.LANCZOS, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))
if 'still' in sys.argv[2:]:
    frame(0.3, 2.1).save(os.path.join(OUT, 'scale_chix_0.3.png')); frame(1.9, 2.1).save(os.path.join(OUT, 'scale_chix_2.0.png')); sys.exit()
dur = 2.1; out = os.path.join(OUT, 'scale_chix.mp4'); n = int(round(dur * FPS))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
for i in range(n): p.stdin.write(frame(i / FPS, dur).tobytes())
p.stdin.close(); p.wait(); print(out)
