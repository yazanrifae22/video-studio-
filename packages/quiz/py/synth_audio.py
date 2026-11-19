"""Original, sample-free sound design for the quiz brand (numpy synthesis, deterministic seeds).

usage:
  synth_audio.py sfx <outdir>                     -> tick, tick_last, whoosh, pop, ding, shimmer, sting, flip, swap (.wav)
  synth_audio.py bed <out.wav> <seconds> [--hits t1,t2,...] [--bpm 112]
      light playful bed: plucked I-V-vi-IV ukulele-like chords (Karplus-Strong), soft marimba bass, shaker;
      optional 'hits' = times where the bed drops to a short break (reveals) so SFX/voice land clean.
All files: 48 kHz, 16-bit stereo, peak-normalised (levels are set in the mix, not here).
"""
import sys, os, wave
import numpy as np

SR = 48000


def write(path, x, peak=0.89):
    x = np.asarray(x, dtype=np.float64)
    if not np.isfinite(x).all() or np.abs(x).max() > 1e3:
        raise SystemExit(f'synth_audio: non-finite or exploding samples in {path} (max {np.nanmax(np.abs(x)):.3g}) — refusing to normalise')
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    m = np.abs(x).max() or 1.0
    x = x / m * peak
    x = x - x.mean(0, keepdims=True)  # no DC
    # 4 ms fades so nothing clicks
    f = min(len(x) // 4, int(0.004 * SR))
    ramp = np.linspace(0, 1, f)[:, None]
    x[:f] *= ramp; x[-f:] *= ramp[::-1]
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def t_(d):
    return np.arange(int(d * SR)) / SR


def svf_bandpass(x, f_hz, q=1.2):
    """Chamberlin state-variable band-pass with a per-sample cutoff (for sweeps)."""
    f_hz = np.broadcast_to(f_hz, x.shape)
    low = band = 0.0
    y = np.empty_like(x)
    damp = 1.0 / q
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(f_hz[i], SR / 6) / SR)
        high = x[i] - low - damp * band
        band += f * high
        low += f * band
        y[i] = band
    return y


def bell(freq, d, partials=((1, 1, 1.0), (2.0, .35, .6), (2.76, .25, .45), (5.4, .12, .25)), decay=2.2):
    t = t_(d)
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * decay / dk) for r, a, dk in partials)


def sfx(outdir):
    os.makedirs(outdir, exist_ok=True)
    rng = np.random.default_rng(7)
    # tick: woodblock-ish click, phone-audible (1.8 / 3.6 kHz) + 2 ms noise transient
    for name, f0 in (('tick', 1800), ('tick_last', 2500)):
        t = t_(0.09)
        x = (np.sin(2 * np.pi * f0 * t) + 0.45 * np.sin(2 * np.pi * f0 * 2.01 * t) + 0.3 * np.sin(2 * np.pi * f0 * 0.5 * t)) * np.exp(-t / 0.014)
        n = rng.standard_normal(len(t)) * np.exp(-t / 0.002) * 0.6
        write(os.path.join(outdir, f'{name}.wav'), x + n)
    # whoosh: noise through a band-pass sweeping 350 -> 3200 Hz, swelling to 60 % then out; slight stereo drift
    d = 0.55; t = t_(d)
    noise = rng.standard_normal(len(t))
    fc = 350 * (3200 / 350) ** (t / d)
    y = svf_bandpass(noise, fc, q=1.6)
    env = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.75) ** 2
    y *= env
    pan = 0.5 + 0.4 * (t / d - 0.5)
    write(os.path.join(outdir, 'whoosh.wav'), np.stack([y * (1 - pan), y * pan], 1) * 1.4)
    # swap: shorter, softer whoosh for cup moves
    d = 0.32; t = t_(d)
    y = svf_bandpass(rng.standard_normal(len(t)), 600 * (2400 / 600) ** (t / d), q=1.3) * np.sin(np.pi * t / d) ** 2
    write(os.path.join(outdir, 'swap.wav'), y)
    # pop: bubble pop, pitch 950 -> 320 Hz
    d = 0.14; t = t_(d)
    f = 320 + 630 * np.exp(-t / 0.025)
    ph = 2 * np.pi * np.cumsum(f) / SR
    write(os.path.join(outdir, 'pop.wav'), np.sin(ph) * np.exp(-t / 0.035) + 0.3 * np.sin(2 * ph) * np.exp(-t / 0.02))
    # ding: two-note rising "correct" chime (C6 then G6), bell partials
    d = 1.3; x = np.zeros(int(d * SR))
    a = bell(1046.5, 1.2); x[:len(a)] += a
    b = bell(1568.0, 1.2); o = int(0.09 * SR); x[o:o + len(b)] += 1.1 * b[:len(x) - o]
    write(os.path.join(outdir, 'ding.wav'), x)
    # shimmer: seeded cluster of high partials with tremolo, swell + fade (end-card / sparkle)
    d = 1.1; t = t_(d); x = np.zeros_like(t)
    for k in range(18):
        f = rng.uniform(2200, 7000); st = rng.uniform(0, 0.45)
        e = np.clip((t - st) / 0.03, 0, 1) * np.exp(-np.clip(t - st, 0, None) / rng.uniform(0.15, 0.4))
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * e * rng.uniform(0.4, 1)
    x *= 0.7 + 0.3 * np.sin(2 * np.pi * 11 * t)
    write(os.path.join(outdir, 'shimmer.wav'), x)
    # sting: "hardest question" — low boom + rising minor swell
    d = 1.0; t = t_(d)
    boom = np.sin(2 * np.pi * (55 + 40 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.25)
    rise = sum(np.sin(2 * np.pi * f * (1 + 0.06 * t) * t) for f in (440, 523.25, 659.25)) * (t / d) ** 2 * np.exp(-np.clip(t - 0.8, 0, None) / 0.05) * 0.25
    tick = np.sin(2 * np.pi * 2500 * t) * np.exp(-t / 0.01) * 0.3
    write(os.path.join(outdir, 'sting.wav'), boom + rise + tick)
    # flip: card flip, short bright swish + paper tap
    d = 0.18; t = t_(d)
    y = svf_bandpass(rng.standard_normal(len(t)), 1500 + 3000 * t / d, q=1.0) * np.sin(np.pi * t / d) ** 1.5
    tap = np.sin(2 * np.pi * 900 * t) * np.exp(-np.clip(t - 0.13, 0, None) / 0.01) * (t > 0.13) * 0.6
    write(os.path.join(outdir, 'flip.wav'), y + tap)


def ks_pluck(freq, d, rng, bright=0.5, decay=0.996):
    """Karplus-Strong plucked string, vectorised one period at a time."""
    n = int(d * SR); N = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, N)
    # soften the excitation (less harsh = ukulele/nylon)
    buf = np.convolve(buf, [bright, 1 - bright], 'same')
    out = np.zeros(n + N)
    out[:N] = buf
    i = N
    while i < n + N:
        # each output sample averages two samples one period back; with k <= N-1 both are already computed
        # (k = N read out[i], which was still unset — np.empty garbage blew the bed up to 1e252 and normalisation
        # then scaled the real music to near silence: gu0d v2)
        k = min(N - 1, n + N - i)
        prev = out[i - N:i - N + k + 1]
        out[i:i + k] = decay * 0.5 * (prev[:k] + prev[1:k + 1])
        i += k
    return out[:n]


def bed(out, seconds, hits=(), bpm=112):
    rng = np.random.default_rng(11)
    n = int(seconds * SR)
    L = np.zeros(n); R = np.zeros(n)
    beat = 60 / bpm
    # C - G - Am - F, one chord per bar (4 beats)
    chords = [(261.63, 329.63, 392.0), (246.94, 293.66, 392.0), (261.63, 329.63, 440.0), (261.63, 349.23, 440.0)]
    roots = [130.81, 98.0, 110.0, 87.31]
    strum = [0, 1.5, 2, 3, 3.5]  # beats within the bar where the uke strums (syncopated)
    bar = 4 * beat
    nb = int(np.ceil(seconds / bar)) + 1
    for b in range(nb):
        ch = chords[b % 4]; t0 = b * bar
        for s_i, sb in enumerate(strum):
            ts = t0 + sb * beat
            if ts >= seconds: break
            down = s_i % 2 == 0
            notes = ch if down else ch[::-1]
            vel = 0.55 if sb in (0, 2) else 0.38
            for j, f in enumerate(notes):
                st = int((ts + j * 0.012) * SR)
                if st >= n: continue
                p = ks_pluck(f, min(1.2, seconds - ts + 0.1), rng, bright=0.6, decay=0.993) * vel
                e = min(n, st + len(p))
                pan = 0.35 + 0.15 * j
                L[st:e] += p[:e - st] * (1 - pan); R[st:e] += p[:e - st] * pan
        # marimba-ish bass on beats 1 and 3 (sine + 4th harmonic, fast decay)
        for sb, mul in ((0, 1.0), (2, 1.5 if b % 2 else 1.0)):
            ts = t0 + sb * beat
            if ts >= seconds: continue
            d = min(0.6, seconds - ts); tt = t_(d)
            f = roots[b % 4] * (1 if mul == 1.0 else 1.5)
            m = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt / 0.03)) * np.exp(-tt / 0.22) * 0.45
            st = int(ts * SR); e = min(n, st + len(m))
            L[st:e] += m[:e - st]; R[st:e] += m[:e - st]
    # shaker on 8ths (band-limited noise), accent on off-beats
    k = 0; t8 = 0.0
    while t8 < seconds:
        d = 0.06; tt = t_(d)
        s = rng.standard_normal(len(tt)) * np.exp(-tt / 0.018) * (0.10 if k % 2 else 0.06)
        s = np.diff(np.append(0, s))  # crude high-pass
        st = int(t8 * SR); e = min(n, st + len(s))
        L[st:e] += s[:e - st] * 0.8; R[st:e] += s[:e - st]
        k += 1; t8 = k * beat / 2
    # sustained soft pad (chord tones, slow attack per bar) so the bed never drops to silence between plucks
    tt = np.arange(n) / SR
    pad = np.zeros(n)
    for b in range(nb):
        t0 = b * bar
        if t0 >= seconds: break
        s0, s1 = int(t0 * SR), min(n, int((t0 + bar + 0.3) * SR))
        seg = tt[s0:s1] - t0
        env = np.minimum(1, seg / 0.35) * np.minimum(1, np.maximum(0, (bar + 0.3 - seg) / 0.3))
        for f in chords[b % 4]:
            pad[s0:s1] += 0.05 * env * (np.sin(2 * np.pi * f * tt[s0:s1]) + 0.5 * np.sin(2 * np.pi * f * 1.004 * tt[s0:s1]) + 0.2 * np.sin(2 * np.pi * 2 * f * tt[s0:s1]))
    L += pad; R += pad
    x = np.stack([L, R], 1)
    # breaks: dip the bed around each reveal (-9 dB, 0.6 s) so the ding and the answer land clean
    g = np.ones(n)
    tt = np.arange(n) / SR
    for h in hits:
        g *= 1 - 0.65 * np.exp(-((tt - (h + 0.25)) / 0.35) ** 2)
    x *= g[:, None]
    # gentle 1.5 s fade-in, 0.6 s fade-out
    fi = int(min(0.6, seconds / 4) * SR); fo = int(0.6 * SR)
    x[:fi] *= np.linspace(0.6, 1, fi)[:, None]; x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    write(out, x, peak=0.7)


if __name__ == '__main__':
    if sys.argv[1] == 'sfx':
        sfx(sys.argv[2])
    elif sys.argv[1] == 'bed':
        hits = []; bpm = 112
        a = sys.argv[4:]
        for i, v in enumerate(a):
            if v == '--hits' and i + 1 < len(a) and a[i + 1]: hits = [float(x) for x in a[i + 1].split(',')]
            if v == '--bpm': bpm = float(a[i + 1])
        bed(sys.argv[2], float(sys.argv[3]), hits, bpm)
    else:
        raise SystemExit(__doc__)
