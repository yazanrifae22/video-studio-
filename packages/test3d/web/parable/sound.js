// Fair Game: sound cues from show.beats, shared by the Macro, Neon and Host films so the three sound the same.
// Only SFX names that exist in packages/test3d/src/audio.ts (tick pour thud whoosh riser hit ding coin tap chime swell).
// Levels are peaks in dBFS; the narration must stay on top, so everything sits well under it and dense events are thinned.

/** sounds(K, show): call once in build(); turns show.beats into K.sfx(name, t, db, dur?) cues */
export function sounds(K, show) {
  const beats = [...(show.beats ?? [])].sort((a, b) => a.t0 - b.t0);
  const last = new Map();   // name -> last cue time (thinning)
  const cue = (name, t, db, dur, minGap = 0) => {
    if (!Number.isFinite(t)) return;
    const p = last.get(name); if (minGap && p != null && t - p < minGap) return;
    last.set(name, t); dur != null ? K.sfx(name, t, db, dur) : K.sfx(name, t, db);
  };
  const end = (b) => (Number.isFinite(b.t1) ? b.t1 : b.t0);
  // dense chips / rain: the cue gets softer as they bunch up
  const density = (type) => { const ts = beats.filter((b) => b.type === type).map(end); return (t) => ts.filter((x) => Math.abs(x - t) < 0.5).length; };
  const chipDen = density('chip'), rainDen = density('rain');

  for (const b of beats) {
    switch (b.type) {
      case 'flip': {
        const land = Number.isFinite(b.tLand) ? b.tLand : end(b), air = Math.max(0.15, land - b.t0);
        cue('whoosh', b.t0, air < 0.45 ? -27 : -22, undefined, 0.12);
        cue('coin', land, air < 0.45 ? -21 : -15, undefined, 0.08);
        break;
      }
      case 'stake': cue('coin', end(b), -20, undefined, 0.06); break;
      case 'payout': cue('coin', end(b), -17, undefined, 0.06); cue('coin', end(b) + 0.07, -24, undefined, 0); break;
      case 'fall': cue('tap', end(b), -16, undefined, 0.05); break;
      case 'king': cue('thud', end(b), -9); cue('hit', end(b), -14); break;
      case 'chip': { const n = chipDen(end(b)); cue('tap', end(b), n > 6 ? -28 : n > 3 ? -24 : -19, undefined, n > 6 ? 0.09 : 0.045); break; }
      case 'rain': { const n = rainDen(end(b)), gold = b.kind !== 'red'; cue(gold ? 'coin' : 'tap', end(b), (gold ? -21 : -20) - (n > 4 ? 6 : 0), undefined, 0.11); break; }
      case 'timelapse': {
        const d = Math.max(0.3, end(b) - b.t0);
        cue('riser', b.t0, -24, d);
        // soft ticks under the run, at most ~12 a second, thinning toward the end
        const n = Math.min(Math.floor(d * 12), 400);
        for (let i = 0; i < n; i++) { const t = b.t0 + (i + 0.5) * d / n; if (i % 3 === 2 && i > n * 0.6) continue; K.sfx('tick', t, -33 + 3 * Math.sin(i * 1.7)); }
        break;
      }
      case 'reset': cue('whoosh', b.t0, -21, undefined, 0.3); break;
      case 'hop': cue('tap', end(b), -23, undefined, 0.08); break;
      case 'jump': cue('whoosh', b.t0, -25, undefined, 0.2); cue('tap', end(b), -17, undefined, 0.05); break;
      case 'intro': cue('tap', end(b), -19, undefined, 0.1); cue('ding', end(b) + 0.02, -27, undefined, 0.8); break;
      case 'objection': cue('tap', end(b), -18, undefined, 0.2); break;
      case 'appear': cue('whoosh', b.t0, -26, undefined, 0.25); break;
      case 'sort': cue('whoosh', b.t0, -22, undefined, 0.3); cue('swell', b.t0, -26, Math.max(0.5, end(b) - b.t0)); break;
      case 'tax': cue('whoosh', b.t0, -24, undefined, 0.3); cue('coin', end(b), -22, undefined, 0.1); break;
      case 'title': cue('ding', b.t0, -24, undefined, 2); break;
      default: break;   // cut, tag: silent (tags would clutter the voice)
    }
  }
}
