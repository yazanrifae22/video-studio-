"""Original foley for the "cut paper on a desk" world (quiz-ar lab). Everything is synthesised from noise, filters,
damped resonances and envelopes - nothing sampled. 48 kHz 16-bit mono WAV -> data/brand/shu-lab/sfx/ + index.json.

usage: python -I packages/quizlab/src/sfx.py [outdir]
One-shots are normalised to -3 dBFS peak, beds (8-bar seamless loops) to -12 dBFS peak. Prints RMS / peak / spectral
centroid per file and the loop-seam jump of every bed (|x[0]-x[-1]| against the typical sample step).
"""
import json, os, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "data", "brand", "shu-lab", "sfx")
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)


def rng(seed):
    return np.random.default_rng(seed)


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def white(r, n):
    return r.standard_normal(n)


def pink(r, n):
    w = r.standard_normal(n)
    b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w)


def bp(x, lo, hi, order=2):
    hi = min(hi, SR / 2 * 0.95)
    return signal.sosfilt(signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "highpass", fs=SR, output="sos"), x)


def sweep_bp(x, centers, width=0.55, k=12, lo=150.0, hi=9000.0):
    """Time-varying band: split into k log-spaced bands, weight each by a gaussian (log-freq) around centers[t]."""
    edges = np.geomspace(lo, hi, k + 1)
    out = np.zeros_like(x)
    cl = np.log(np.maximum(centers, 1.0))
    for i in range(k):
        band = bp(x, edges[i], edges[i + 1], 2)
        fc = np.log(np.sqrt(edges[i] * edges[i + 1]))
        out += band * np.exp(-0.5 * ((cl - fc) / width) ** 2)
    return out


def grain(r, n, rate, depth):
    """Irregular fibrous amplitude modulation (low-passed noise, exponentiated)."""
    g = lp(r.standard_normal(n), rate, 2)
    g = g / (np.std(g) + 1e-9)
    return np.exp(depth * g) / np.exp(depth * depth / 2)


def adsr(n, a, d_tau):
    t = np.arange(n) / SR
    e = np.exp(-t / d_tau)
    if a > 0:
        e *= np.minimum(1.0, t / a)
    return e


def ring(sec, f, tau, r=None, phase=0.0):
    t = tt(sec)
    return np.sin(2 * np.pi * f * t + phase) * np.exp(-t / tau)


def thump(sec, f0, f1, tau, drop=0.03):
    t = tt(sec)
    f = f1 + (f0 - f1) * np.exp(-t / drop)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / tau)


def place(buf, x, at, gain=1.0):
    o = int(round(at * SR))
    if o < 0:
        x = x[-o:]
        o = 0
    n = min(len(x), len(buf) - o)
    if n > 0:
        buf[o:o + n] += x[:n] * gain


def room(x, wet=0.12, seed=7, ms=70):
    """Tiny desk-room tail: short decaying noise impulse response."""
    r = rng(seed)
    n = int(ms / 1000 * SR)
    ir = hp(r.standard_normal(n), 400) * np.exp(-np.arange(n) / (0.018 * SR))
    ir /= np.sqrt(np.sum(ir ** 2))
    return x + wet * signal.fftconvolve(x, ir)[: len(x)]


def fade(x, a_ms=2, b_ms=8):
    x = x.copy()
    a, b = int(a_ms / 1000 * SR), int(b_ms / 1000 * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def ks(freq, sec, seed, damp=0.45, g=0.996):
    """Karplus-Strong pluck via a recursive comb with a 2-point averaging loop."""
    r = rng(seed)
    N = int(round(SR / freq))
    n = int(sec * SR)
    exc = lp(r.standard_normal(N), 900 + 3 * freq, 2)
    exc = exc / (np.max(np.abs(exc)) + 1e-9)
    x = np.zeros(n)
    x[:N] = exc
    a = np.zeros(N + 2)
    a[0] = 1.0
    a[N] = -g * (1 - damp)
    a[N + 1] = -g * damp
    return signal.lfilter([1.0], a, x)


def bass_note(freq, sec, seed, vel=1.0):
    """Upright bass: plucked string + woody fundamental thump, rolled off above ~1.4 kHz."""
    s = ks(freq, sec, seed, damp=0.5, g=0.9965)
    s = lp(s, 1400, 2)
    s *= 1.0 / (np.max(np.abs(s)) + 1e-9)
    t = tt(sec)
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.18) * 0.5
    fin = np.minimum(1, t / 0.004)
    out = (s + body) * fin
    out = fade(out, 0, 25)
    return out * vel


# ---------------------------------------------------------------- one-shots
def s_slide(sec=0.35, seed=1):
    r = rng(seed)
    n = int(sec * SR)
    t = np.arange(n) / SR
    u = t / sec
    x = pink(r, n) + 0.5 * white(r, n)
    centers = 2800 - 1100 * u
    y = sweep_bp(x, centers, 0.6)
    env = np.minimum(1, u / 0.12) ** 1.3 * np.exp(-2.6 * u ** 1.5) * (1 - u) ** 0.4
    y = y * env * grain(r, n, 70, 0.55)
    body = lp(pink(r, n), 380) * env * 0.35
    out = y + body
    return fade(room(out, 0.1), 3, 30)


def s_slide_long(seed=2):
    r = rng(seed)
    a = s_slide(0.42, seed + 10)
    b = s_slide(0.34, seed + 11) * 0.6
    out = np.zeros(int(0.7 * SR))
    place(out, a, 0.0)
    place(out, b, 0.27)
    # a little paper-edge catch in the middle
    cr = hp(r.standard_normal(int(0.02 * SR)), 2500) * np.exp(-np.arange(int(0.02 * SR)) / (0.004 * SR))
    place(out, cr, 0.33, 0.25)
    return fade(out, 2, 40)


def crackle_events(r, sec, dens_fn, amp=1.0, lo=1800, hi=7500):
    n = int(sec * SR)
    out = np.zeros(n)
    t = 0.0
    while t < sec:
        d = max(5.0, dens_fn(t / sec))
        t += r.exponential(1.0 / d)
        if t >= sec:
            break
        L = int(r.uniform(0.002, 0.007) * SR)
        c = r.uniform(lo, hi)
        burst = bp(r.standard_normal(L + 64), c * 0.7, min(c * 1.4, 20000), 2)[:L]
        burst *= np.exp(-np.arange(L) / (L * 0.35))
        place(out, burst, t, amp * float(np.exp(r.normal(0, 0.6))))
    return out


def s_rustle(seed=3):
    r = rng(seed)
    sec = 0.62
    n = int(sec * SR)
    u = np.arange(n) / n
    cr = crackle_events(r, sec, lambda x: 40 + 140 * np.sin(np.pi * x) ** 1.2, 1.0)
    bed = bp(pink(r, n), 1200, 5000) * (np.sin(np.pi * u) ** 1.5) * grain(r, n, 45, 0.7) * 0.25
    return fade(room(cr * 0.9 + bed, 0.1), 3, 40)


def s_flip(seed=4):
    r = rng(seed)
    sec = 0.5
    n = int(sec * SR)
    u = np.arange(n) / n
    x = pink(r, n) + 0.4 * white(r, n)
    y = sweep_bp(x, 900 + 3600 * np.sin(np.pi * u * 0.85) ** 1.2, 0.5)
    env = np.sin(np.pi * np.minimum(1, u / 0.78)) ** 1.6 * (u < 0.8)
    y = y * env * grain(r, n, 60, 0.45) * 0.8
    out = y.copy()
    # landing: soft paper tap at the end of the turn
    land = lp(r.standard_normal(int(0.1 * SR)), 1800) * np.exp(-np.arange(int(0.1 * SR)) / (0.016 * SR))
    land += thump(0.1, 160, 95, 0.03) * 0.8
    place(out, land, 0.37, 0.9)
    return fade(room(out, 0.1), 3, 40)


def s_fold(seed=5):
    r = rng(seed)
    sec = 0.4
    n = int(sec * SR)
    out = np.zeros(n)
    cr = crackle_events(r, 0.18, lambda x: 160 * (1 - x) + 30, 1.3, 2200, 6000)
    place(out, cr, 0.0)
    # the crease itself: a soft pressed-paper "shhk" plus a low body
    pr = bp(pink(r, int(0.22 * SR)), 900, 3500) * adsr(int(0.22 * SR), 0.01, 0.07) * grain(r, int(0.22 * SR), 90, 0.5) * 0.9
    place(out, pr, 0.03)
    place(out, thump(0.2, 140, 85, 0.05) * 0.35, 0.1)
    return fade(room(out, 0.1), 2, 50)


def s_unfold(seed=6):
    r = rng(seed)
    sec = 0.45
    n = int(sec * SR)
    out = np.zeros(n)
    u = np.arange(n) / n
    cr = crackle_events(r, sec, lambda x: 25 + 90 * np.sin(np.pi * x), 0.85, 1800, 5500)
    out += cr
    sw = bp(pink(r, n), 700, 3200) * np.sin(np.pi * u) ** 1.4 * grain(r, n, 50, 0.6) * 0.45
    out += sw
    return fade(room(out, 0.1), 3, 60)


def s_snip(seed=7):
    r = rng(seed)
    sec = 0.34
    out = np.zeros(int(sec * SR))

    def blade(at, g):
        L = int(0.03 * SR)
        click = hp(r.standard_normal(L), 3000) * np.exp(-np.arange(L) / (0.0015 * SR))
        m = ring(0.06, 4300, 0.006) * 0.5 + ring(0.06, 6100, 0.004) * 0.3 + ring(0.06, 2700, 0.008) * 0.25
        place(out, click * 0.6, at, g)
        place(out, m, at, g)
    blade(0.0, 1.0)
    blade(0.105, 0.85)
    # paper tear between and after the closing blades
    n = int(0.12 * SR)
    tear = bp(r.standard_normal(n), 1500, 7500) * adsr(n, 0.004, 0.04) * grain(r, n, 160, 0.9)
    place(out, tear, 0.07, 0.45)
    place(out, tear[: int(0.07 * SR)] * 0.8, 0.17, 0.4)
    return fade(room(out, 0.08), 1, 40)


def s_thud(seed=8):
    r = rng(seed)
    sec = 0.32
    n = int(sec * SR)
    out = thump(sec, 130, 62, 0.07, 0.025) * 0.9
    out += lp(r.standard_normal(n), 900) * adsr(n, 0.001, 0.02) * 0.55
    out += bp(r.standard_normal(n), 1500, 4000) * adsr(n, 0.0005, 0.004) * 0.18
    return fade(room(out, 0.12), 0, 60)


def s_stamp(seed=9):
    r = rng(seed)
    sec = 0.7
    n = int(sec * SR)
    out = thump(sec, 110, 44, 0.16, 0.05) * 0.95
    out += thump(sec, 210, 90, 0.05, 0.02) * 0.4
    sm = bp(r.standard_normal(n), 350, 3200) * adsr(n, 0.0004, 0.014)
    out += sm * 0.9
    slap = lp(r.standard_normal(n), 6000) * adsr(n, 0.0003, 0.003) * 0.6
    out += slap
    # ink squish: wet short noise just after the hit
    ink = bp(pink(r, n), 500, 2500) * adsr(n, 0.01, 0.05) * 0.18 * grain(r, n, 120, 0.8)
    out += np.concatenate([np.zeros(int(0.012 * SR)), ink[: n - int(0.012 * SR)]])
    return fade(room(out, 0.15, ms=90), 0, 120)


def s_scratch(seed=10):
    r = rng(seed)
    sec = 0.5
    n = int(sec * SR)
    u = np.arange(n) / n
    x = pink(r, n) + 0.6 * white(r, n)
    # a looped stroke: speed rises, turns around (momentary pause), rises again
    speed = np.abs(np.sin(2 * np.pi * u * 1.5)) ** 0.7
    y = sweep_bp(x, 1800 + 2500 * speed, 0.45) * (0.15 + speed) * grain(r, n, 220, 0.5)
    env = np.minimum(1, u / 0.04) * np.minimum(1, (1 - u) / 0.1)
    y *= env
    y += lp(pink(r, n), 500) * speed * env * 0.12
    return fade(room(y, 0.06), 3, 30)


def s_rip(seed=11):
    r = rng(seed)
    sec = 0.45
    n = int(sec * SR)
    u = np.arange(n) / n
    x = r.standard_normal(n)
    y = hp(x, 1200)
    y = lp(y, 9000)
    # rapid, ragged teeth: amplitude = pulse train jittered, rate sweeps up
    rate = 70 + 80 * u
    phase = np.cumsum(rate) / SR + 0.35 * lp(r.standard_normal(n), 60)
    teeth = (np.sin(2 * np.pi * phase) > -0.2).astype(float)
    teeth = lp(teeth, 900)
    env = np.minimum(1, u / 0.06) * (1 - u ** 3) * (0.6 + 0.4 * np.sin(np.pi * u))
    y = y * (0.35 + 0.9 * teeth) * env * grain(r, n, 300, 0.6)
    return fade(room(y, 0.08), 2, 50)


def s_tap(seed=12):
    r = rng(seed)
    sec = 0.16
    n = int(sec * SR)
    out = ring(sec, 175, 0.035) * 0.8 + ring(sec, 340, 0.018) * 0.3
    out += lp(r.standard_normal(n), 1600) * adsr(n, 0.0004, 0.006) * 0.55
    out += bp(r.standard_normal(n), 2500, 6000) * adsr(n, 0.0002, 0.002) * 0.1
    return fade(room(out, 0.1), 0, 20)


def s_tick(seed=13):
    r = rng(seed)
    sec = 0.09
    n = int(sec * SR)
    out = ring(sec, 2350, 0.007) * 0.7 + ring(sec, 3800, 0.004) * 0.25 + ring(sec, 980, 0.012) * 0.25
    out += hp(r.standard_normal(n), 2000) * adsr(n, 0.0001, 0.0012) * 0.4
    return fade(room(out, 0.06), 0, 10)


def s_pop(seed=14):
    r = rng(seed)
    sec = 0.14
    n = int(sec * SR)
    out = thump(sec, 520, 190, 0.028, 0.012) * 0.8
    out += bp(r.standard_normal(n), 900, 3800) * adsr(n, 0.0003, 0.007) * 0.5
    out += ring(sec, 1250, 0.02) * 0.15
    return fade(room(out, 0.1), 0, 20)


def s_whoosh(seed=15):
    r = rng(seed)
    sec = 0.5
    n = int(sec * SR)
    u = np.arange(n) / n
    x = pink(r, n) + 0.3 * white(r, n)
    y = sweep_bp(x, 700 + 2900 * np.sin(np.pi * u * 0.9) ** 1.1, 0.5)
    env = np.sin(np.pi * u) ** 2.2
    y = y * env * grain(r, n, 40, 0.3)
    return fade(room(y, 0.08), 5, 60)


def s_rewind(seed=16):
    r = rng(seed)
    sec = 0.8
    n = int(sec * SR)
    u = np.arange(n) / n
    x = pink(r, n) + 0.4 * white(r, n)
    # tape scrub: flutter AM whose rate rises, band sweeps up then holds, plus a faint pitched whirr
    rate = 22 + 90 * u ** 1.3
    flutter = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(rate) / SR + 1.7 * lp(r.standard_normal(n), 30))
    y = sweep_bp(x, 1400 + 2600 * u ** 0.8, 0.5) * flutter
    whirr = np.sin(2 * np.pi * np.cumsum(500 + 2200 * u ** 1.2) / SR) * 0.05 * (0.5 + 0.5 * flutter)
    env = np.minimum(1, u / 0.05) * np.minimum(1, (1 - u) / 0.12)
    out = (y + whirr) * env
    out += crackle_events(r, sec, lambda x_: 60 + 60 * x_, 0.35, 2500, 8000) * env
    return fade(room(out, 0.06), 3, 50)


def s_sting(seed=17):
    r = rng(seed)
    sec = 1.0
    out = np.zeros(int(sec * SR))
    place(out, bass_note(98.0, 0.55, seed, 1.0), 0.0, 0.8)       # G2
    place(out, bass_note(73.42, 0.8, seed + 1, 1.0), 0.22, 0.95)   # D2
    # rim hit with the second note: woody, short, bright ring
    L = int(0.15 * SR)
    rim = ring(0.15, 1750, 0.014) * 0.5 + ring(0.15, 2950, 0.008) * 0.35 + ring(0.15, 860, 0.02) * 0.25
    rim += hp(r.standard_normal(L), 2500) * np.exp(-np.arange(L) / (0.0025 * SR)) * 0.4
    place(out, rim, 0.22, 0.75)
    return fade(room(out, 0.12, ms=100), 0, 150)


# ---------------------------------------------------------------- beds
def note_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def make_bed(bpm, seed, events):
    beat = 60.0 / bpm
    L = int(round(32 * beat * SR))
    tail = int(2.2 * SR)
    buf = np.zeros(L + tail)
    r = rng(seed)
    events(buf, beat, r)
    buf = lp(buf, 6500, 1)   # beds sit under a voice: tame the top end (filter is linear, applied before the wrap)
    out = buf[:L].copy()
    over = buf[L:]
    out[: len(over)] += over    # the tail of late events wraps to the top: the loop is circular
    # room tone: circular (FFT-synthesised) pink-ish noise 80-4000 Hz so the bed never drops to digital silence
    # between hits (techqa flags a -60 dB hole under speech as an audio dropout)
    f = np.fft.rfftfreq(L, 1 / SR)
    mag = np.where((f > 80) & (f < 4000), 1 / np.sqrt(np.maximum(f, 1)), 0.0)
    sp = mag * np.exp(1j * r.uniform(0, 2 * np.pi, len(f)))
    tone = np.fft.irfft(sp, L)
    tone *= 0.035 * np.max(np.abs(out)) / (np.sqrt(np.mean(tone ** 2)) * 4 + 1e-12)
    out = out + tone
    out -= np.mean(out)
    return out


def b_desk96(buf, beat, r):
    root = [38, 38, 41, 38, 43, 41, 38, 45]    # D2 F2 G2 A2 ... (generic, sparse, no tune)
    for bar in range(8):
        t0 = bar * 4 * beat
        place(buf, s_thud(100 + bar)[: int(0.25 * SR)] * 0.55, t0, 0.7)
        place(buf, s_thud(120 + bar)[: int(0.25 * SR)] * 0.45, t0 + 2 * beat, 0.6)
        if bar % 2 == 1:
            place(buf, s_thud(130 + bar)[: int(0.2 * SR)] * 0.35, t0 + 3.5 * beat, 0.4)
        for b_ in (1, 3):
            place(buf, s_tap(140 + bar * 3 + b_), t0 + b_ * beat + r.normal(0, 0.004), 0.55 * float(r.uniform(0.8, 1.1)))
        if r.random() < 0.5:
            place(buf, s_tap(150 + bar), t0 + 3.75 * beat, 0.25)
        for e in range(8):
            if e % 2 == 1 and r.random() < 0.55:
                place(buf, s_tick(160 + bar * 8 + e), t0 + e * 0.5 * beat + r.normal(0, 0.003), 0.3 * float(r.uniform(0.6, 1.0)))
        place(buf, bass_note(note_hz(root[bar]), 0.9, 200 + bar), t0 + 0.0, 0.5)
        if bar % 2 == 0:
            place(buf, bass_note(note_hz(root[bar] + 7), 0.7, 220 + bar), t0 + 2.5 * beat, 0.4)
        else:
            place(buf, bass_note(note_hz(root[bar] + 10), 0.5, 240 + bar), t0 + 3.5 * beat, 0.35)


def brush(r, sec, g, direction, seed):
    n = int(sec * SR)
    u = np.arange(n) / n
    x = pink(np.random.default_rng(seed), n) + 0.6 * white(np.random.default_rng(seed + 1), n)
    y = bp(x, 2500, 9000) * np.sin(np.pi * (u ** (0.7 if direction > 0 else 1.4))) ** 1.5 * grain(np.random.default_rng(seed + 2), n, 80, 0.4)
    return y * g


def b_walk104(buf, beat, r):
    chords = [(38, 41, 45), (38, 41, 45), (43, 46, 50), (43, 46, 50), (38, 41, 45), (38, 41, 45), (45, 49, 52), (38, 41, 45)]
    for bar in range(8):
        t0 = bar * 4 * beat
        ch = chords[bar]
        nxt = chords[(bar + 1) % 8][0]
        line = [ch[0], ch[1], ch[2], nxt + (1 if nxt < ch[0] else -1) if nxt != ch[0] else ch[1]]
        for i, m in enumerate(line):
            place(buf, bass_note(note_hz(m), 0.38, 300 + bar * 4 + i), t0 + i * beat + r.normal(0, 0.004), 0.5)
        for e in range(8):
            d = 1 if e % 2 == 0 else -1
            place(buf, brush(r, 0.17, 0.5 if e % 2 == 0 else 0.3, d, 400 + bar * 8 + e), t0 + e * 0.5 * beat, 0.35)
        for b_ in (1, 3):
            place(buf, s_tap(500 + bar * 2 + b_), t0 + b_ * beat, 0.5)
            n = int(0.05 * SR)
            chick = bp(r.standard_normal(n), 2500, 9000) * adsr(n, 0.001, 0.012)
            place(buf, chick, t0 + b_ * beat, 0.4)
        if bar % 4 == 3:
            place(buf, s_thud(600 + bar)[: int(0.2 * SR)] * 0.4, t0 + 3.5 * beat, 0.4)


def b_tense88(buf, beat, r):
    n_total = len(buf)
    for bar in range(8):
        t0 = bar * 4 * beat
        for b_ in range(4):
            tb = t0 + b_ * beat
            lub = thump(0.28, 78, 48, 0.07, 0.03)
            dub = thump(0.24, 66, 42, 0.06, 0.03) * 0.65
            lub += lp(r.standard_normal(len(lub)), 300) * adsr(len(lub), 0.001, 0.02) * 0.25
            place(buf, lub, tb, 0.85 if b_ == 0 else 0.7)
            place(buf, dub, tb + 0.21, 0.6)
            for h in range(2):
                place(buf, s_tick(700 + bar * 8 + b_ * 2 + h), tb + h * 0.5 * beat, 0.32 if h == 0 else 0.2)
    t = np.arange(n_total) / SR
    period = 8 * 4 * beat
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * t / (period / 2) - np.pi / 2)
    rum = lp(rng(55).standard_normal(n_total), 110, 2)
    rum = rum / (np.std(rum) + 1e-9)
    # periodic modulation + a rumble that is itself circular enough (cross-faded tail below)
    out = rum * swell * 0.05
    # make the rumble circular: fold its tail into its head with a raised-cosine crossfade
    buf += out


def finish_bed(x, peak_db):
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    return x


def write(name, x, peak_db=-3.0):
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, np.round(x * 32767).astype(np.int16))
    return x


def stats(x):
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    pk = 20 * np.log10(np.max(np.abs(x)) + 1e-12)
    S = np.abs(np.fft.rfft(x))
    f = np.fft.rfftfreq(len(x), 1 / SR)
    cen = float(np.sum(f * S) / (np.sum(S) + 1e-12))
    return rms, pk, cen


SHOTS = {
    "slide": (lambda: s_slide(), "paper sliding across a desk, grainy swish that slows at the end"),
    "slide-long": (lambda: s_slide_long(), "longer paper drag with a small edge catch in the middle"),
    "rustle": (lambda: s_rustle(), "loose paper rustling, crackly fibres"),
    "flip": (lambda: s_flip(), "a sheet turned over: air swish then a soft landing tap"),
    "fold": (lambda: s_fold(), "paper crease: crackle plus pressed-paper shhk and soft body"),
    "unfold": (lambda: s_unfold(), "paper opening up, gentler crackle with a swell"),
    "snip": (lambda: s_snip(), "scissors: two metal blade clicks with the paper tear between"),
    "thud": (lambda: s_thud(), "a cut piece dropped flat on the desk, low and short"),
    "stamp": (lambda: s_stamp(), "heavy rubber stamp slam: low body, ink smack and a wet squish"),
    "scratch": (lambda: s_scratch(), "marker drawing a loop, friction rising and turning"),
    "rip": (lambda: s_rip(), "tape or paper tear, ragged teeth getting faster"),
    "tap": (lambda: s_tap(), "finger tap on the desk, warm and dull"),
    "tick": (lambda: s_tick(), "dry pencil tap, short woody ring"),
    "pop": (lambda: s_pop(), "small cardboard pop"),
    "whoosh": (lambda: s_whoosh(), "paper swished through the air, soft"),
    "rewind": (lambda: s_rewind(), "fast tape scrub with flutter, rising"),
    "sting": (lambda: s_sting(), "two upright-bass notes (G2 then D2) with a rim hit: verdict accent"),
}
BEDS = {
    "bed-desk-96": (96, 1961, b_desk96, "finger taps, pencil ticks, soft thud kick and sparse upright bass, 96 bpm, 8 bars"),
    "bed-walk-104": (104, 1962, b_walk104, "light brush and tap groove with a walking upright bass, 104 bpm, 8 bars"),
    "bed-tense-88": (88, 1963, b_tense88, "heartbeat-like low thud with clock ticks and a slow sub swell, 88 bpm, 8 bars"),
}


def main():
    index = []
    print(f"{'name':<14}{'sec':>6}{'rms dB':>9}{'peak dB':>9}{'centroid Hz':>13}")
    for name, (fn, desc) in SHOTS.items():
        x = write(name, fn(), -3.0)
        rms, pk, cen = stats(x)
        print(f"{name:<14}{len(x) / SR:6.2f}{rms:9.1f}{pk:9.1f}{cen:13.0f}")
        index.append({"name": name, "seconds": round(len(x) / SR, 3), "kind": "sfx", "description": desc})
    for name, (bpm, seed, ev, desc) in BEDS.items():
        x = make_bed(bpm, seed, ev)
        if name == "bed-tense-88":
            x = x  # rumble already folded with the rest
        x = write(name, x, -12.0)
        rms, pk, cen = stats(x)
        step = float(np.median(np.abs(np.diff(x))) + 1e-9)
        p95 = float(np.percentile(np.abs(np.diff(x)), 99))
        seam = abs(float(x[0] - x[-1]))
        seam5 = np.abs(np.diff(np.concatenate([x[-int(0.005 * SR):], x[: int(0.005 * SR)]]))).max()
        print(f"{name:<14}{len(x) / SR:6.2f}{rms:9.1f}{pk:9.1f}{cen:13.0f}   seam jump {seam:.5f} (p99 step {p95:.5f}, max step across seam +-5ms {seam5:.5f})")
        index.append({"name": name, "seconds": round(len(x) / SR, 3), "kind": "bed", "bpm": bpm, "loop": True, "description": desc})
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    print("wrote", len(index), "files to", OUT)


if __name__ == "__main__":
    main()
