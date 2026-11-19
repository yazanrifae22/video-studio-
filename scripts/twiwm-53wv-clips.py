"""comp-261102-53wv: acquired NASA stills (saved as jpg bytes under .mp4 name) -> 6 s mp4 each, then source:attach-file. Usage: python scripts/twiwm-53wv-clips.py"""
import subprocess, os, shutil
from PIL import Image
SRC = r'E:\clips-viral\data\media\nasa'
OUT = r'E:\clips-viral\data\twiwm-53wv'
os.makedirs(OUT, exist_ok=True)
IDS = ['fvw2', 'p3rp', 'cw8t', '47oa', 'yj90', 'qht6', 'esmq', 'ligv']
for k in IDS:
    a = f'src-261102-{k}'
    raw = os.path.join(OUT, a + '.jpg')
    if not os.path.exists(raw):
        shutil.copy(os.path.join(SRC, a + '.mp4'), raw)
    im = Image.open(raw).convert('RGB')
    im.thumbnail((3600, 3600), Image.LANCZOS)
    w, h = im.size; w -= w % 2; h -= h % 2
    im = im.crop((0, 0, w, h))
    png = os.path.join(OUT, a + '.png'); im.save(png)
    mp4 = os.path.join(OUT, a + '.mp4')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', png, '-t', '6', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', mp4], check=True)
    subprocess.run(['npm', 'run', '-s', 'cli', '--', 'source:attach-file', a, mp4], cwd=r'E:\clips-viral', shell=True, check=True)
    print(a, w, h)
