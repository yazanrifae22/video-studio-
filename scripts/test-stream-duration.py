"""analyze.py must report the video stream duration, not the (longer) container duration."""
import json, os, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
with tempfile.TemporaryDirectory() as t:
    m = os.path.join(t, "m.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=d=2:s=320x240:r=25", "-f", "lavfi", "-i", "sine=d=6",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", m], check=True)
    out = os.path.join(t, "o")
    subprocess.run([sys.executable, "-I", os.path.join(R, "packages", "intelligence", "py", "analyze.py"), m, out], check=True, capture_output=True)
    d = json.load(open(os.path.join(out, "analysis.json"), encoding="utf-8"))["duration"]
    assert abs(d - 2.0) < 0.2, d
    print("ok duration", d)
