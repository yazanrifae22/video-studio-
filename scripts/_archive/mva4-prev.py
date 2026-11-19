"""mv-A4: offline preview of the cover framing (no build). usage: python scripts/mva4-prev.py <asset> <t> <zoom> <pan_x> <pan_y> <out.png> [sign=1]
Canvas 1080x1920 from a 1280x720 source, fill cover; region centre = source centre shifted by pan (% of canvas). sign flips the pan direction."""
import subprocess, sys
asset, t, z, px, py, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
sg = float(sys.argv[7]) if len(sys.argv) > 7 else 1
S = 1920 / 720
w, h = 405 / z, 720 / z
cx = 640 - sg * px * 10.8 / (S * z)
cy = 360 - sg * py * 19.2 / (S * z)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", f"E:/clips-viral/data/media/nasa/{asset}.mp4", "-frames:v", "1",
                "-vf", f"crop={w:.2f}:{h:.2f}:{cx - w / 2:.2f}:{cy - h / 2:.2f},scale=270:480", out])
