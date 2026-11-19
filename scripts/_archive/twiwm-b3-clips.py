"""TWIWM best-of video 3 (Skylab parasol): NASA stills -> 8 s mp4 (full or cropped). Usage: python scripts/twiwm-b3-clips.py"""
import subprocess, os
from PIL import Image
RAW = r'E:\clips-viral\data\twiwm-b3\raw'
OUT = r'E:\clips-viral\data\twiwm-b3'
# name: (file, box as fractions or pixel tuple or None)
SPECS = {
    'p401a': ('s73-26401.jpg', (760, 913, 3450, 3603)),
    'p401b': ('s73-26401.jpg', None),
    'p248a': ('sl2-04-248.jpg', None),
    'p248b': ('sl2-04-248.jpg', (0, 1288, 2340, 3628)),
    'p265': ('sl2-04-265.jpg', None),
    'p773': ('S73-26773.jpg', None),
    'p403': ('S73-27403.jpg', None),
    'p799': ('sl2-100-799.jpg', None),
    'p380': ('S73-26380.jpg', None),
    'p667': ('sl2-07-667.jpg', (1400, 2420, 2100, 3120)),
}
for name, (f, box) in SPECS.items():
    im = Image.open(os.path.join(RAW, f)).convert('RGB')
    if box:
        im = im.crop(box)
    im.thumbnail((3600, 3600), Image.LANCZOS)
    w, h = im.size
    w -= w % 2; h -= h % 2
    im = im.crop((0, 0, w, h))
    png = os.path.join(OUT, name + '.png')
    im.save(png)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', png, '-t', '8', '-c:v', 'libx264', '-crf', '12',
                    '-pix_fmt', 'yuv420p', os.path.join(OUT, name + '.mp4')], check=True)
    print(name, w, h)
