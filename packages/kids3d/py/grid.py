"""Tile stills into one labelled contact grid for frame checks.
usage: python grid.py <out.jpg> <cols> <img>... (label = file name)"""
import os, sys
from PIL import Image, ImageDraw

out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert("RGB") for f in files]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
g = Image.new("RGB", (cols * w + (cols - 1) * 4, rows * h + (rows - 1) * 4), "white")
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 4)
    g.paste(im.resize((w, h)), (x, y))
    d = ImageDraw.Draw(g)
    lab = os.path.splitext(os.path.basename(f))[0]
    d.rectangle([x, y, x + 8 * len(lab) + 8, y + 16], fill="black")
    d.text((x + 4, y + 2), lab, fill="white")
g.save(out, quality=88)
print(out)
