"""Contact sheet: one frame per second, 270 px wide tiles, time label on each.
usage: python sheet.py <video.mp4> <out.jpg> [cols=8]
"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

video, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
with tempfile.TemporaryDirectory() as td:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", r"select=not(mod(n\,30)),scale=270:-2", "-fps_mode", "vfr", os.path.join(td, "f%03d.png")], check=True)
    files = sorted(f for f in os.listdir(td) if f.endswith(".png"))
    ims = [Image.open(os.path.join(td, f)).convert("RGB") for f in files]
    if not ims:
        raise SystemExit("no frames")
    tw, th = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
    try:
        font = ImageFont.truetype("arialbd.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for i, im in enumerate(ims):
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.paste(im, (x, y))
        d = ImageDraw.Draw(sheet)
        label = f"{i}s"
        d.rectangle([x, y, x + 12 + 13 * len(label), y + 28], fill=(0, 0, 0))
        d.text((x + 6, y + 2), label, fill=(255, 255, 255), font=font)
        d.rectangle([x, y, x + tw - 1, y + th - 1], outline=(60, 60, 60))
    sheet.save(out, quality=88)
