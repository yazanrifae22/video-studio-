"""Fix-round clips for rank-261028-8f9e (v6): replacement stills -> 1080x1920 slow-push clips.
Modes: cover (full-frame crop) or band (low-res landscape: width-fit foreground over a dark blurred copy).
Usage: python scripts/pe-still2clip2.py <outdir>"""
import subprocess, sys, os
from PIL import Image, ImageFilter, ImageEnhance

RAW2 = r'E:\clips-viral\data\pe-tsu\raw2'
RAW = r'E:\clips-viral\data\pe-tsu\raw'
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FPS = 30
SPECS = {
    # SWOT: right-hand heat map only (no burned-in map labels in this window)
    'dickson_swot2': dict(f=RAW + r'\PIA26420.jpg', mode='cover', box=(1060 / 1440, 250 / 1090, 1, 960 / 1090), cx=(.62, .38), cy=.5, z=(1.0, 1.35), dur=6),
    'vajont_scar': dict(f=RAW2 + r'\Frana_Monte_Toc_Vajont_1.jpg', mode='band', cx=(.5, .5), z=(1.0, 1.14), dur=6),
    'vajont_dam': dict(f=RAW2 + r'\Vista_Diga_del_Vajont.jpg', mode='band', cx=(.5, .62), z=(1.0, 1.14), dur=6),
    'sth_before2': dict(f=RAW2 + r'\sth_before_eros.png', mode='cover', box=(0, 0, 1, 1), cx=(.44, .50), cy=.5, z=(1.0, 1.15), dur=6),
    'sth_after2': dict(f=RAW2 + r'\sth_after_topinka.jpg', mode='cover', box=(0, 0, 1, 1), cx=(.48, .56), cy=.5, z=(1.0, 1.2), dur=6),
}


def frame_cover(im, s, t):
    W, H = im.size
    x0, y0, x1, y1 = s['box']
    bx0, by0, bx1, by1 = x0 * W, y0 * H, x1 * W, y1 * H
    bw, bh = bx1 - bx0, by1 - by0
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
    return fr


def make_bg(im):
    W, H = im.size
    vw = H * 9 / 16
    if vw > W:
        vw = W
    vh = vw * 16 / 9
    l = (W - vw) / 2; tp = (H - vh) / 2
    bg = im.resize((270, 480), Image.LANCZOS, box=(l, tp, l + vw, tp + vh)).filter(ImageFilter.GaussianBlur(10)).resize((1080, 1920), Image.BILINEAR)
    return ImageEnhance.Brightness(bg).enhance(0.45)


def frame_band(im, bg, s, t):
    W, H = im.size
    z = s['z'][0] + (s['z'][1] - s['z'][0]) * t
    cw, ch = W / z, H / z
    cx = W * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t)
    l = min(max(cx - cw / 2, 0), W - cw); tp = (H - ch) / 2
    fh = int(round(1080 * ch / cw))
    fg = im.resize((1080, fh), Image.LANCZOS, box=(l, tp, l + cw, tp + ch)).filter(ImageFilter.UnsharpMask(radius=1.5, percent=50, threshold=2))
    out = bg.copy()
    out.paste(fg, (0, (1920 - fh) // 2))
    return out


ONLY = sys.argv[2:] or list(SPECS)
for name, s in SPECS.items():
    if name not in ONLY: continue
    im = Image.open(s['f']).convert('RGB')
    bg = make_bg(im) if s['mode'] == 'band' else None
    out = os.path.join(OUT, name + '.mp4')
    n = int(s['dur'] * FPS)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / (n - 1)
        t = t * t * (3 - 2 * t)
        fr = frame_band(im, bg, s, t) if s['mode'] == 'band' else frame_cover(im, s, t)
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    print(name, out)
