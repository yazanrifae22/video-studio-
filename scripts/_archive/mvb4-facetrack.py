"""usage: python scripts/mvb4-facetrack.py <src> <from> <to> [step=0.5] [W=720] [H=486]  -> face centre x fraction / eye y / width per sample (Haar)"""
import subprocess, sys
import numpy as np, cv2
src, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
step = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
W = int(sys.argv[5]) if len(sys.argv) > 5 else 720
H = int(sys.argv[6]) if len(sys.argv) > 6 else 486
cas = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
cas2 = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
t = a
while t <= b:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-vf", f"scale={W}:{H}", "-"], capture_output=True).stdout
    g = np.frombuffer(raw, dtype=np.uint8).reshape(H, W)
    fs = list(cas.detectMultiScale(g, 1.1, 5, minSize=(60, 60)))
    kind = "front"
    if not fs:
        fs = list(cas2.detectMultiScale(g, 1.1, 5, minSize=(60, 60))); kind = "prof"
    if not fs:
        fs = [(W - x - w, y, w, h) for x, y, w, h in cas2.detectMultiScale(cv2.flip(g, 1), 1.1, 5, minSize=(60, 60))]; kind = "profL"
    if fs:
        x, y, w, h = max(fs, key=lambda f: f[2])
        print(f"{t:8.2f} fx={(x + w / 2) / W:.2f} ey={(y + .4 * h) / H:.2f} fw={w / W:.3f} {kind}")
    else:
        print(f"{t:8.2f} none")
    t += step
