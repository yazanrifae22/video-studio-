"""Turn PD stills into 1080x1920 slow-push clips (full-frame cover, no blur fill). Usage: python scripts/pe-still2clip.py <outdir>
Each spec: file, crop box (fractions) of usable image, cx0,cx1 (focal x fractions of the box), cy, z0,z1 (zoom), dur."""
import subprocess, sys, os
from PIL import Image, ImageFilter

RAW = r'E:\clips-viral\data\pe-tsu\raw'
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FPS = 30
SPECS = {
    'lituya_overview': dict(f='lituya-bay58.jpg', box=(0, 0, 1, 1), cx=(.50, .50), cy=.52, z=(1.0, 1.25), dur=6),
    'lituya_trimline': dict(f='lituya_trimline.jpg', box=(0, 0, 1, 1), cx=(.60, .42), cy=.5, z=(1.0, 1.2), dur=6),
    'lituya_damage': dict(f='lituya_damage.jpg', box=(0, 0, 1, 1), cx=(.60, .58), cy=.5, z=(1.0, 1.15), dur=6),
    'dickson_swot': dict(f='PIA26420.jpg', box=(0, 0, 1, .88), cx=(.50, .64), cy=.5, z=(1.0, 1.3), dur=6),
    'tracy_scar': dict(f='tracyarm_trimline.jpg', box=(0, 0, 1, 1), cx=(.80, .66), cy=.5, z=(1.0, 1.25), dur=6),
    'sth_before': dict(f='sth_before.jpg', box=(0, 0, 1, 1), cx=(.47, .47), cy=.5, z=(1.0, 1.18), dur=6),
    'sth_after': dict(f='spirit_80.jpg', box=(0, 0, 1, 1), cx=(.36, .30), cy=.5, z=(1.0, 1.15), dur=6),
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
