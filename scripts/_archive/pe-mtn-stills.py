"""rank-261028-kb5h: NASA PD stills -> 1080x1920 slow-push clips (full-frame cover). Usage: python scripts/pe-mtn-stills.py <outdir> [name ...]
Raw files in data/pe-mtn/raw (downloaded from the NASA/JPL primary pages, see script.json credits).
hook_a = Viking 1 Olympus Mons crop (frame 0, 1.0 s); end = the same crop pushing OUT and ending on the exact frame-0 crop (loop)."""
import subprocess, sys, os
from PIL import Image, ImageFilter

RAW = r'E:\clips-viral\data\pe-mtn\raw'
OUT = sys.argv[1]; only = sys.argv[2:]
os.makedirs(OUT, exist_ok=True)
FPS = 30
V = dict(f='viking.jpg', box=(0, 0, 1, 1), cy=.5)
SPECS = {
    'hook_a': dict(V, cx=(.47, .47), z=(1.0, 1.05), dur=1.0),
    'end': dict(V, cx=(.47, .47), z=(1.06, 1.0), dur=2.5),
    'venus': dict(f='PIA00149.jpg', box=(.628, .064, 1, .795), cx=(.45, .55), cy=.5, z=(1.0, 1.18), dur=2.1),
    'iapetus': dict(f='PIA08372.jpg', box=(0, 0, 1, 1), cx=(.40, .55), cy=.5, z=(1.0, 1.25), dur=2.1),
    'io': dict(f='PIA03886.jpg', box=(0, 0, .62, .76), cx=(.35, .30), cy=.5, z=(1.0, 1.15), dur=2.1),
    'vesta': dict(f='PIA15124.jpg', box=(.5, 0, 1, .86), cx=(.42, .34), cy=.5, z=(1.0, 1.2), dur=2.2),
}
for name, s in SPECS.items():
    if only and name not in only: continue
    im = Image.open(os.path.join(RAW, s['f'])).convert('RGB')
    W, H = im.size
    x0, y0, x1, y1 = s['box']
    bx0, by0, bx1, by1 = x0 * W, y0 * H, x1 * W, y1 * H
    bw, bh = bx1 - bx0, by1 - by0
    out = os.path.join(OUT, name + '.mp4')
    n = int(round(s['dur'] * FPS))
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / (n - 1); t = t * t * (3 - 2 * t)
        z = s['z'][0] + (s['z'][1] - s['z'][0]) * t
        vh = bh / z; vw = vh * 9 / 16
        if vw > bw: vw = bw; vh = vw * 16 / 9
        cx = bx0 + bw * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t); cy = by0 + bh * s['cy']
        l = min(max(cx - vw / 2, bx0), bx1 - vw); tp = min(max(cy - vh / 2, by0), by1 - vh)
        fr = im.resize((1080, 1920), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))
        if vw < 700: fr = fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait(); print(name, out)
