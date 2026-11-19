"""Plan n=4 trenches (copy of pe-still2clip.py with its own RAW/SPECS). Turn PD stills into 1080x1920 slow-push clips (full-frame cover, no blur fill). Usage: python scripts/pe-still2clip.py <outdir>
Each spec: file, crop box (fractions) of usable image, cx0,cx1 (focal x fractions of the box), cy, z0,z1 (zoom), dur."""
import subprocess, sys, os
from PIL import Image, ImageFilter

RAW = r'E:\clips-viral\data\pe-trench\raw'
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FPS = 30
SPECS = {
    # NASA EO 'New View of the Deepest Trench' (Jesse Allen; data UNH CCOM / NOAA Joint Hydrographic Center): sonar relief of the Mariana Trench
    'nasa_bathy_wide': dict(f='marianatrench_bathmetry_lrg.jpg', box=(0.30, 0.475, 0.42, 0.905), cx=(.50, .46), cy=.66, z=(1.0, 1.2), dur=3),
    'nasa_bathy_close': dict(f='marianatrench_bathmetry_lrg.jpg', box=(0.30, 0.475, 0.42, 0.905), cx=(.40, .58), cy=.78, z=(1.3, 1.5), dur=3),
}
for name, s in SPECS.items():
    im = Image.open(os.path.join(RAW, s['f'])).convert('RGB')
    W, H = im.size
    x0, y0, x1, y1 = s['box']
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
        if vw > bw:  # image too narrow for full height: fit by width
            vw = bw; vh = vw * 16 / 9
        cx = bx0 + bw * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t)
        cy = by0 + bh * s['cy']
        l = min(max(cx - vw / 2, bx0), bx1 - vw)
        tp = min(max(cy - vh / 2, by0), by1 - vh)
        fr = im.resize((1080, 1920), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))
        if (vw < 700):
            fr = fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    print(name, out)
