"""TWIWM best-of video 4 (Apollo 13 mail box): NASA stills -> 8 s mp4. Usage: python scripts/twiwm-b4-clips.py"""
import subprocess, os
from PIL import Image
RAW = r'E:\clips-viral\data\twiwm-b4\raw'
OUT = r'E:\clips-viral\data\twiwm-b4'
SPECS = {  # name: (file, rotate_cw_deg, crop box)
    'm8929': ('as13-62-8929.jpg', 0, None),
    'm8484': ('as13-59-8484.jpg', -90, None),
    'm8501': ('as13-59-8501.jpg', 0, (400, 1500, 3904, 3500)),  # v3: gamma 0.55 + autocontrast applied by hand (see rebuild note)
    'm8562': ('AS13-59-8562.jpg', 0, None),
    'm35368': ('s70-35368.jpg', 0, None),
    'm35013': ('S70-35013.jpg', 0, None),
    'm35644': ('s70-35644.jpg', 0, None),
}
for name, (f, rot, box) in SPECS.items():
    im = Image.open(os.path.join(RAW, f)).convert('RGB')
    if rot: im = im.rotate(rot, expand=True)
    if box: im = im.crop(box)
    im.thumbnail((3600, 3600), Image.LANCZOS)
    w, h = im.size; w -= w % 2; h -= h % 2
    im = im.crop((0, 0, w, h))
    png = os.path.join(OUT, name + '.png'); im.save(png)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', png, '-t', '8', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', os.path.join(OUT, name + '.mp4')], check=True)
    print(name, w, h)
