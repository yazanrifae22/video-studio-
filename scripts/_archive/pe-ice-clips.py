"""Iceberg Top-5 (n=2): PD stills -> 1080x1920 slow-push clips. Usage: python scripts/pe-ice-clips.py <outdir>
Specs: f, cx(x0,x1), cy(y0,y1), z(z0,z1), dur. Crop box = full image; zoom z>=1 on a 9:16 window."""
import subprocess, sys, os
from PIL import Image, ImageFilter
RAW = r'E:\clips-viral\data\pe-ice\raw'
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
FPS = 30
SPECS = {
 # hook: frame 0 (z=1.0) and the closing push-out end on the IDENTICAL crop -> seamless loop
 'b15a_hook': dict(f='b15a_oct27.jpg', cx=(.66, .66), cy=(.40, .40), z=(1.5, 1.65), dur=3.0),
 'b15a_end': dict(f='b15a_oct27.jpg', cx=(.66, .66), cy=(.40, .40), z=(1.65, 1.5), dur=2.2),
 'b15_nurs': dict(f='b15_nursery.jpg', cx=(.40, .46), cy=(.80, .74), z=(1.5, 1.7), dur=2.8),
 'nurs_hook': dict(f='b15_nursery.jpg', cx=(.52, .52), cy=(.52, .52), z=(1.0, 1.1), dur=2.0),
 'a23a_main': dict(f='a23a_2023.jpg', cx=(.55, .52), cy=(.47, .47), z=(1.0, 1.25), dur=2.2),
 'a23a_track': dict(f='a23a_2023b.jpg', cx=(.62, .52), cy=(.5, .5), z=(1.0, 1.2), dur=2.2),
 'c19_a': dict(f='c19_nov2002.jpg', cx=(.62, .60), cy=(.58, .55), z=(1.0, 1.45), dur=2.3),
 'c19_b': dict(f='c19_lrg.jpg', cx=(.52, .45), cy=(.45, .50), z=(1.0, 1.3), dur=2.3),
 'tir_a': dict(f='larsen_tir.png', cx=(.30, .42), cy=(.5, .5), z=(1.0, 1.15), dur=2.3),
 'tir_b': dict(f='larsen_tir.png', cx=(.42, .55), cy=(.8, .8), z=(1.25, 1.4), dur=2.3),
 'lar_mar08': dict(f='lar_mar08.png', cx=(.5, .5), cy=(.35, .55), z=(1.12, 1.0), dur=2.6),
 'lar_sep29': dict(f='lar_sep29.png', cx=(.5, .5), cy=(.60, .42), z=(1.0, 1.12), dur=2.6),
}
for name, s in SPECS.items():
    im = Image.open(os.path.join(RAW, s['f'])).convert('RGB'); W, H = im.size
    n = int(s['dur'] * FPS); out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r',str(FPS),'-i','-',
        '-c:v','libx264','-crf','14','-preset','slow','-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart',out], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / (n - 1); t = t*t*(3-2*t)
        z = s['z'][0] + (s['z'][1]-s['z'][0])*t
        vh = H / z; vw = vh*9/16
        if vw > W: vw = W; vh = vw*16/9
        cx = W*(s['cx'][0]+(s['cx'][1]-s['cx'][0])*t); cy = H*(s['cy'][0]+(s['cy'][1]-s['cy'][0])*t)
        l = min(max(cx-vw/2, 0), W-vw); tp = min(max(cy-vh/2, 0), H-vh)
        fr = im.resize((1080,1920), Image.LANCZOS, box=(l,tp,l+vw,tp+vh))
        if vw < 700: fr = fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait(); print(name)
