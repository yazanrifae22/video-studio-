"""mv-A4: print 10 ms-hop RMS (dB) profile. usage: .venv-asr/Scripts/python.exe scripts/mva4-rms.py <asset> <a> <b> [step_ms=20]"""
import subprocess, sys
import numpy as np
asset, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); st = int(sys.argv[4]) if len(sys.argv) > 4 else 20
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", f"E:/clips-viral/data/media/nasa/{asset}.mp4", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
hop = 16 * st
print(" ".join(f"{a + i / 16000:.2f}:{20 * np.log10(np.sqrt(np.mean(x[i:i + 320] ** 2)) + 1e-9):.0f}" for i in range(0, len(x) - 320, hop)))
