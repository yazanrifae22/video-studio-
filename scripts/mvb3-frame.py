"""mv-B3: face-tracked framing for a cut list. Detects the speaker's face in every piece (Haar, 4 fps), then sets zoom / pan_x / pan_y so the
face is centred, the eyes sit at ~33 % of the frame height and the face width alternates between two sizes (>= 20 % size change on every cut).

usage: python scripts/mvb3-frame.py <production_id> <config.json>
config: {"src": path, "W": 1920, "H": 1080, "sizes": [0.50, 0.66],   # face width as a fraction of the 1080-px canvas width (a, b)
         "wide": [[t0, t1, hint_fx], ...],                          # optional source-time ranges that are wide shots (hint = expected face x fraction)
         "wide_sizes": [0.30, 0.40], "eye_y": 0.33, "zmax": 2.2, "zmin": 1.0, "dx": {"t": px_shift}, "overrides": {"<seg index>": [zoom, pan_x, pan_y]}}
Writes the cut list in place (previous copy kept as cutlist.pre-frame.json).
"""
import json, subprocess, sys, shutil
import numpy as np
import cv2

pid, cfgp = sys.argv[1], sys.argv[2]
cfg = json.load(open(cfgp, encoding="utf-8"))
base = f"E:/clips-viral/productions/{pid}"
cl = json.load(open(base + "/cutlist.json", encoding="utf-8"))
W, H = cfg["W"], cfg["H"]
S = 1920 / H
EYE = cfg.get("eye_y", 0.33)
cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
cas2 = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")


def frame(t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", cfg["src"], "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-vf", f"scale={W}:{H}", "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(H, W) if len(raw) == W * H else None


def wide_hint(t):
    for a, b, fx in cfg.get("wide", []):
        if a <= t <= b:
            return fx
    return None


def face(t):
    g = frame(t)
    if g is None:
        return None
    hint = wide_hint(t)
    mn = max(30, int(H * (0.05 if hint is not None else 0.12)))
    fs = list(cas.detectMultiScale(g, 1.1, 5, minSize=(mn, mn)))
    if not fs:
        fs = list(cas2.detectMultiScale(g, 1.1, 5, minSize=(mn, mn)))
    if not fs:
        fs = list(cas2.detectMultiScale(cv2.flip(g, 1), 1.1, 5, minSize=(mn, mn)))
        fs = [(W - x - w, y, w, h) for x, y, w, h in fs]
    if not fs:
        return None
    if hint is not None:
        x, y, w, h = min(fs, key=lambda f: abs((f[0] + f[2] / 2) / W - hint))
        if abs((x + w / 2) / W - hint) > 0.12:
            return None
    else:
        x, y, w, h = max(fs, key=lambda f: f[2])
    return ((x + w / 2) / W, (y + 0.40 * h) / H, w / W)


cache = {}
out_segs = []
prev_key = None
alt = 0
for i, s in enumerate(cl["segments"]):
    a, b = s["src_in"], s["src_out"]
    mid = (a + b) / 2
    ts = np.arange(a + 0.15, b - 0.1, 0.25) if b - a > 0.5 else [mid]
    obs = []
    for t in ts:
        k = round(float(t), 2)
        if k not in cache:
            cache[k] = face(k)
        if cache[k]:
            obs.append(cache[k])
    if not obs:
        print("  seg", i, "no face found", a, b)
        out_segs.append(None)
        continue
    fx, ey, fw = (float(np.median([o[j] for o in obs])) for j in range(3))
    wide = wide_hint(mid) is not None
    sizes = cfg["wide_sizes"] if wide and "wide_sizes" in cfg else cfg["sizes"]
    key = "wide" if wide else "close"
    # alternate the size on every piece (reset order when the camera changes)
    if key != prev_key:
        alt = 0
    prev_key = key
    tgt = sizes[alt % 2]
    alt += 1
    z = tgt * 1080 / (fw * W * S)
    if ("wide_zs" in cfg and wide) or ("zs" in cfg and not wide):
        z = (cfg["wide_zs"] if wide else cfg["zs"])[(alt - 1) % 2]
    z = max(cfg.get("zmin", 1.0), min(cfg.get("zmax", 2.2), z))
    eyes_y = EYE * 1920
    pan_y = (eyes_y - 960 - (ey - 0.5) * 1920 * z) / 19.2
    pan_x = -((fx - 0.5) * W * S * z) / 10.8 + cfg.get("dx", {}).get(str(i), 0)
    maxx = min(100, (W * S * z / 1080 - 1) * 50)
    maxy = (z - 1) * 50
    pan_x = max(-maxx, min(maxx, pan_x))
    pan_y = max(-maxy, min(maxy, pan_y))
    ov = cfg.get("overrides", {}).get(str(i))
    if ov:
        z, pan_x, pan_y = ov
    s["zoom"], s["pan_x"], s["pan_y"] = round(z, 3), round(pan_x, 1), round(pan_y, 1)
    s["fill"] = "cover"
    print(f"  seg {i:2d} {a:8.2f}-{b:8.2f} {key:5s} face fx={fx:.2f} ey={ey:.2f} fw={fw:.3f} n={len(obs)} -> zoom {z:.2f} pan {pan_x:.1f},{pan_y:.1f}")
# fill segments without a face from the previous framed piece
last = None
for s, o in zip(cl["segments"], out_segs):
    pass
shutil.copy(base + "/cutlist.json", base + "/cutlist.pre-frame.json")
json.dump(cl, open(base + "/cutlist.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("written", base + "/cutlist.json")
