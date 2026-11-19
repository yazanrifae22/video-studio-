"""rank-261028-942s (hottest planets, NASA Planetary Fact Sheet): NASA/JPL PD stills -> 1080x1920 slow-push clips (full-frame cover, no overlays).
Usage: python scripts/pe-solar-still2clip.py <outdir> [name ...] [still]  ('still' writes first/last PNG previews only)
Specs: f=file in data/pe-solar/raw, cx (x0,x1 focal fraction of image), cy (y0,y1), z (zoom start,end), dur, rev=True runs the move backwards
(the 'end' clip ends on the exact frame-0 crop of 'hook_a' for a seamless loop)."""
import subprocess, sys, os
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
RAW = r'E:/clips-viral/data/pe-solar/raw'
args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
FPS = 30
V1 = 'PIA00254.jpg'; V2 = 'PIA00106.jpg'; J = 'PIA04866.jpg'; M = 'PIA24173.jpg'; E = 'as17-148-22727.jpg'; ME = 'PIA03103.jpg'; ME2 = 'PIA03104.jpg'
HOOK = dict(f=V1, cx=(.47, .47), cy=(.5, .5), z=(1.0, 1.08))
SPECS = {
    'mer1': dict(f=ME, cx=(.45, .50), cy=(.50, .52), z=(1.0, 1.15), dur=1.85),
    'mer2': dict(f=ME2, cx=(.58, .52), cy=(.56, .54), z=(1.35, 1.5), dur=1.85),
    'v1b': dict(f=V2, cx=(.52, .45), cy=(.72, .72), z=(1.0, 1.0), dur=4.3),
    'endb': dict(HOOK, dur=3.4, rev=True),
}
_c = {}
def crop(s, t):
    if s['f'] not in _c: _c[s['f']] = Image.open(os.path.join(RAW, s['f'])).convert('RGB')
    im = _c[s['f']]; W, H = im.size
    t = t * t * (3 - 2 * t)
    z = s['z'][0] + (s['z'][1] - s['z'][0]) * t
    vh = H / z; vw = vh * 9 / 16
    if vw > W: vw = W; vh = vw * 16 / 9
    cx = W * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t); cy = H * (s['cy'][0] + (s['cy'][1] - s['cy'][0]) * t)
    l = min(max(cx - vw / 2, 0), W - vw); tp = min(max(cy - vh / 2, 0), H - vh)
    fr = im.resize((1080, 1920), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))
    return fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)) if vw < 1500 else fr
for name, s in SPECS.items():
    if only and name not in only: continue
    n = max(2, int(round(s['dur'] * FPS)))
    f = lambda i: crop(s, (1 - i / (n - 1)) if s.get('rev') else i / (n - 1))
    if STILL:
        f(0).save(os.path.join(OUT, name + '_0.png')); f(n - 1).save(os.path.join(OUT, name + '_1.png')); continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(f(i).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
