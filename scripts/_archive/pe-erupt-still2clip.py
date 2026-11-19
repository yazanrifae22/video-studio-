"""rank-261028-dhcd (largest eruptions): NASA Earth Observatory PD stills -> 1080x1920 slow-push clips (full-frame cover, no overlays).
Usage: python scripts/pe-erupt-still2clip.py <outdir> [name ...] [still]  ('still' writes first/last PNG previews only)
Specs: file, box (fractions of the usable image), cx (x0,x1 focal fraction of the box), cy, z (zoom start,end), dur."""
import subprocess, sys, os
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
RAW = r'E:/clips-viral/data/pe-erupt/raw'
args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
FPS = 30
T = 'toba_AST_2006028_lrg.jpg'; Y = 'yellowstone_oli_2013160_lrg.jpg'; S = 'SnakeRiver_AMO_2008242_lrg.jpg'; C = 'wheeler_ast_2007307_lrg.jpg'
FULL = (0, 0, 1, 1)
SPECS = {
    'toba': dict(f=T, box=(.27, .05, .83, .93), cx=(.5, .5), cy=.5, z=(1.0, 1.05), dur=2.2),
    'yell': dict(f=Y, box=(.40, .06, .80, .975), cx=(.5, .5), cy=.5, z=(1.0, 1.1), dur=2.1),
    'snake': dict(f=S, box=FULL, cx=(.37, .49), cy=.5, z=(1.0, 1.0), dur=2.1),
    'creede': dict(f=C, box=FULL, cx=(.36, .36), cy=.62, z=(1.2, 1.35), dur=2.1),
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
