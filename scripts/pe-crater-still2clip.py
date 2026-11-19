"""rank-261028-jdml (largest impact craters): NASA Earth Observatory PD stills -> 1080x1920 slow-push clips (full-frame cover).
Usage: python scripts/pe-crater-still2clip.py <outdir> [name ...] [still]  ('still' writes first/last PNG previews only)
Specs: file, box (fractions of the usable image), cx (x0,x1 focal fraction of the box), cy, z (zoom start,end), dur."""
import subprocess, sys, os
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
RAW = r'E:\clips-viral\data\pe-crater\raw'
args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
FPS = 30
V = 'vredefort_oli_2018178_lrg.jpg'; A = 'acraman_tmo_2010049_lrg.jpg'; P = 'popigai_ast_2021_lrg.jpg'
SR = 'sudbury_srtm_2000_lrg.jpg'; SO = 'sudbury_oli_2020255_lrg.jpg'; C = 'PIA03379_lrg.jpg'
FULL = (0, 0, 1, 1)
SPECS = {
    'v_hook1': dict(f=V, box=FULL, cx=(.17, .18), cy=.80, z=(1.30, 1.40), dur=1.0),
    'v_hook2': dict(f=V, box=FULL, cx=(.36, .40), cy=.5, z=(1.0, 1.1), dur=1.4),
    'a1': dict(f=A, box=FULL, cx=(.62, .60), cy=.42, z=(1.0, 1.1), dur=2.0),
    'a2': dict(f=A, box=FULL, cx=(.57, .57), cy=.50, z=(2.0, 2.4), dur=2.0),
    'p1': dict(f=P, box=(.12, .14, .85, .80), cx=(.5, .56), cy=.45, z=(1.35, 1.5), dur=2.0),
    'p2': dict(f=P, box=(.12, .14, .85, .80), cx=(.45, .40), cy=.40, z=(1.7, 1.9), dur=2.0),
    's1': dict(f=SR, box=FULL, cx=(.34, .34), cy=.44, z=(1.6, 1.8), dur=2.0),
    's2': dict(f=SO, box=FULL, cx=(.38, .38), cy=.38, z=(1.8, 2.1), dur=2.0),
    'c1': dict(f=C, box=FULL, cx=(.50, .50), cy=.65, z=(1.25, 1.4), dur=2.4),
    'v1': dict(f=V, box=FULL, cx=(.62, .55), cy=.5, z=(1.15, 1.0), dur=2.5),
    'v_end': dict(f=V, box=FULL, cx=(.17, .17), cy=.80, z=(1.45, 1.30), dur=2.5),
}
def crop(im, s, t):
    W, H = im.size; x0, y0, x1, y1 = s['box']
    bx0, by0, bx1, by1 = x0 * W, y0 * H, x1 * W, y1 * H; bw, bh = bx1 - bx0, by1 - by0
    t = t * t * (3 - 2 * t)
    z = s['z'][0] + (s['z'][1] - s['z'][0]) * t
    vh = bh / z; vw = vh * 9 / 16
    if vw > bw: vw = bw; vh = vw * 16 / 9
    cx = bx0 + bw * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t); cy = by0 + bh * s['cy']
    l = min(max(cx - vw / 2, bx0), bx1 - vw); tp = min(max(cy - vh / 2, by0), by1 - vh)
    fr = im.resize((1080, 1920), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))
    return fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)) if vw < 1500 else fr
for name, s in SPECS.items():
    if only and name not in only: continue
    im = Image.open(os.path.join(RAW, s['f'])).convert('RGB')
    if im.width * im.height > 30e6: im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    if STILL:
        crop(im, s, 0).save(os.path.join(OUT, name + '_0.png')); crop(im, s, 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4'); n = max(2, int(round(s['dur'] * FPS)))
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(crop(im, s, i / (n - 1)).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
