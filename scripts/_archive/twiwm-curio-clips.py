"""TWIWM Curiosity: NASA/JPL stills -> 8 s mp4. Usage: python scripts/_archive/twiwm-curio-clips.py"""
import subprocess, os, glob
from PIL import Image
RAW = r'E:\clips-viral\data\twiwm-curio\raw'
OUT = r'E:\clips-viral\data\twiwm-curio'
for f in sorted(glob.glob(os.path.join(RAW, '*.jpg'))):
    name = os.path.basename(f)[:-4]
    im = Image.open(f).convert('RGB')
    im.thumbnail((3600, 3600), Image.LANCZOS)
    w, h = im.size; w -= w % 2; h -= h % 2
    im = im.crop((0, 0, w, h))
    png = os.path.join(OUT, name + '.png'); im.save(png)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', png, '-t', '8', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', os.path.join(OUT, name + '.mp4')], check=True)
    print(name, w, h)
