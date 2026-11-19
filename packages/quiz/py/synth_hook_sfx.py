"""Original SFX for the hook_intro round (numpy synthesis, deterministic, no samples).

usage: synth_hook_sfx.py <outdir>  ->  hook_slam, hook_riser, hook_blink, hook_lock, hook_alarm, hook_roll (.wav, 48 kHz stereo)
Same conventions as synth_audio.py (peak-normalised; the mix sets levels).
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from synth_audio import SR, t_, svf_bandpass, write  # noqa: E402


def main(outdir):
    os.makedirs(outdir, exist_ok=True)
    rng = np.random.default_rng(23)
    # slam: text hits the screen. Sub thump (pitch drop 120 -> 42 Hz) + short noise crack + low-mid body
    d = 0.5; t = t_(d)
    thump = np.sin(2 * np.pi * np.cumsum(42 + 80 * np.exp(-t / 0.045)) / SR) * np.exp(-t / 0.17)
    crack = svf_bandpass(rng.standard_normal(len(t)), 2200, q=0.9) * np.exp(-t / 0.018) * 0.8
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.05) * 0.4
    write(os.path.join(outdir, 'hook_slam.wav'), thump + crack + body)
    # riser: 0.9 s filtered-noise swell that sweeps up and cuts (leads into a slam)
    d = 0.9; t = t_(d)
    y = svf_bandpass(rng.standard_normal(len(t)), 300 * (5000 / 300) ** (t / d) ** 1.4, q=2.2) * (t / d) ** 2.2
    y += np.sin(2 * np.pi * np.cumsum(220 * (3 ** (t / d))) / SR) * (t / d) ** 3 * 0.25
    write(os.path.join(outdir, 'hook_riser.wav'), y * np.where(t < d - 0.02, 1, 0))
    # blink: eyelid snapping open: soft air snap + bright click, quick
    d = 0.28; t = t_(d)
    air = svf_bandpass(rng.standard_normal(len(t)), 900 + 5200 * (t / d), q=1.1) * np.sin(np.pi * np.clip(t / 0.2, 0, 1)) ** 2
    click = np.sin(2 * np.pi * 3100 * t) * np.exp(-t / 0.006) * 0.7 + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.05) * 0.5
    write(os.path.join(outdir, 'hook_blink.wav'), air * 0.8 + click)
    # lock: hawk-eye lock-on: two metallic clicks + short high ping
    d = 0.35; t = t_(d); x = np.zeros_like(t)
    for st, f in ((0.0, 2100), (0.07, 2800)):
        tt = np.clip(t - st, 0, None)
        x += (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.012) * (t >= st)
    tt = np.clip(t - 0.14, 0, None)
    x += 0.5 * np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt / 0.09) * (t >= 0.14)
    write(os.path.join(outdir, 'hook_lock.wav'), x)
    # alarm: urgent double beep (880 / 740 Hz squares through a soft clip), 0.3 s
    d = 0.3; t = t_(d); x = np.zeros_like(t)
    for st, f in ((0.0, 880), (0.14, 740)):
        m = (t >= st) & (t < st + 0.11)
        tt = np.clip(t - st, 0, None)
        sq = np.tanh(3 * np.sin(2 * np.pi * f * tt))
        x += sq * m * np.minimum(1, tt / 0.004) * np.exp(-tt / 0.2)
    write(os.path.join(outdir, 'hook_alarm.wav'), x * 0.8)
    # roll: digits spinning (slot-style): 5 fast soft ticks rising in pitch over 0.5 s
    d = 0.55; t = t_(d); x = np.zeros_like(t)
    for k in range(6):
        st = k * 0.085; tt = np.clip(t - st, 0, None); f = 1300 + 260 * k
        x += (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.012)) * (t >= st) * (0.6 + 0.08 * k)
    write(os.path.join(outdir, 'hook_roll.wav'), x)


if __name__ == '__main__':
    main(sys.argv[1])
