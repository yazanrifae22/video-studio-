import { CAPTION_MIN_PAGE_SHORT } from '../../shared/src/caption-gate.ts';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { assertPublishable } from '../../rights/src/rights.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { TimelineRecorder } from '../../render/src/recorder.ts';
import { renderTimeline } from '../../render/src/render.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const PYDIR = path.join(P.root, 'packages', 'intelligence', 'py');

/* ------------------------------------------------------------------ cut list types */
interface Segment { asset_id: string; src_in: number; src_out: number; trim?: { top?: number; bottom?: number; left?: number; right?: number }; fill?: 'blur' | 'cover' | 'contain'; zoom?: number; pan_x?: number; pan_y?: number; motion?: 'push' | 'pull' | null; mute_source?: boolean; volume?: number; item?: number | string; /** opt-in: a 0.3-0.8 s hook teaser / loop echo segment (viral-rankings F7/F8) */ short_ok?: boolean; why?: string;
  /** opt-in: audio-only fade-in (seconds) at this segment's head, e.g. 0.067 to remove the tail of a trimmed word; picture untouched */
  audio_fade_in?: number;
  /** opt-in: length (s) of the audio fade-out at a non-contiguous join, default 0.18; e.g. 0.02 keeps a word ending right at the cut */
  audio_fade_out?: number;
  /** opt-in (mv-B4): replace single-frame source flashes (press cameras) by the previous frame when the window is cut (luma spike vs both neighbours) */
  deflash?: boolean;
  /** opt-in (2026-10-31, ranking entry flash_soften): 2-frame blend (tmix) on the cut window so a natural one-frame lightning spike stays visible but is not a single-frame outlier */
  flash_soften?: boolean;
  /** opt-in (2026-10-31): timelapse playback rate 1-3; src_in/src_out stay source seconds, on-screen length = (out-in)/speed (builder derives a sped-up mezzanine of the same source) */
  speed?: number;
  /** opt-in (mv-B4): gentle speech compressor before levelling, for bursty archive audio whose peaks stop the master reaching the loudness target */
  compress?: boolean;
  /** opt-in (2026-10-25, showrunner-way-it-was-made): lift a too-dark shot, ffmpeg eq on the cut window. gamma 1.0-2.0 (e.g. 1.35), optional brightness -0.2..0.3 */
  lift?: { gamma?: number; brightness?: number; contrast?: number };
  /** opt-in (2026-10-28, showrunner-mission-voices): B-roll still over the picture of this segment's whole used range; the speech audio keeps playing.
   *  `image` = local file (rights-registered source, cite it in credits). A tall 9:16 plate is cut around (focus_x, focus_y) (0-1 of the photo) and
   *  Ken Burns pushed from 1.0 to `zoom_to` (default 1.3) onto (plate_fy) of the plate. Use zoom 1.05-1.1 on the segment itself. */
  insert?: { image: string; focus_x?: number; plate_fy?: number; zoom_to?: number };
  /** opt-in (2026-10-31, viral-rankings): contain the picture inside this canvas rect [x0,y0,x1,y1] px (blur fill around it); overrides zoom/pan */
  fit_box?: [number, number, number, number];
  /** opt-in (2026-10-31, viral-rankings pilot), fit_box segments only: slow punch-in. `from_s`/`to_s` = seconds from the segment start, `scale_to` = ratio vs the fitted size
   *  (1.15 = 115 %). The picture grows upward only (its bottom edge stays on the fit_box bottom, so captions below are never covered). */
  punch?: { from_s: number; to_s: number; scale_to: number; clip?: boolean };
  /** opt-in (2026-10-31, viral-rankings build defaults: opening punch, #1 hit): extra clipped punch stages, seconds from the segment start; each `scale`
   *  multiplies the zoom reached so far. fit_box segments: baked into the window (clipped, bottom-anchored, like `punch`); cover segments: timeline scale keyframes. */
  punch_stages?: { from_s: number; to_s: number; scale: number }[];
  /** opt-in (2026-10-31, viral-rankings follow-crop): animated crop window with the fit_box aspect, baked into the cached window. `zoom` = window width / frame width (default 1), `aspect` = window w/h (default the fit_box aspect; 0.8 = 4:5 shows more height, the output is then narrower than the box),
   *  `keys` = [seconds from the segment start, cx, cy] (centre as a frame fraction), linear between keys, clamped inside the frame. Output = window scaled to the fit_box. */
  follow?: { zoom?: number; aspect?: number; keys: [number, number, number][] } }
interface TextOverlay { text: string; at: number; dur: number; role?: string; y?: number; x?: number; /** optional font size in output (1080-wide canvas) px; overrides the role default */ font_px?: number; /** opt-in wrap width (chars) */ max_chars?: number }
/** `say` (opt-in, 2026-10-28 showrunner-planet-extremes): phonetic respelling sent to TTS + aligner instead of `text` (same word count); captions still show `text` */
interface Line { id: string; text: string; at: number; say?: string }
interface CutList {
  production_id: string; width?: number; height?: number; fps?: number;
  segments: Segment[]; texts?: TextOverlay[];
  /** `max_pause` (opt-in, 2026-10-28 showrunner-planet-extremes): squeeze every silence inside a narration line down to this many seconds (cut from the middle of the pause, 5 ms fades); word times are remapped so captions stay in sync */
  /** `snap_onsets` (opt-in, 2026-10-31 showrunner-viral-rankings): re-time every narration word against the energy of its own line clip (speech runs), because ASR word starts stretch over pauses (captions 0.5 s early/late) */
  narration?: { voice?: string; style?: string; lines: Line[]; max_pause?: number; snap_onsets?: boolean } | null;
  captions?: 'narration' | 'source' | 'none'; music?: { asset_id: string; volume?: number } | null;
  credits?: string[]; target_duration?: number; caption_clean?: boolean; emphasis?: string[]; bed?: 'tone' | null;
  /** captions only: correct a mis-heard transcript word, matched by asset + source time (±0.3 s) + exact word; audio untouched */
  /** `s` (optional): measured source start time for that word (e.g. ASR absorbed the pause before it) */
  caption_fixes?: { asset_id: string; at: number; from: string; to: string; s?: number }[];
  /** captions only: move the start of each word that follows a pause to the measured speech onset (ASR word starts absorb the silence before them) */
  caption_onset_snap?: boolean;
  /** opt-in, captions only: merge narration caption pages shorter than this many seconds into a neighbour (added 2026-10-25, showrunner-way-it-was-made) */
  caption_min_page?: number; caption_no_cross?: boolean;
  /** opt-in, narration captions only: page each narration line separately (no merging across lines) */
  caption_per_line?: boolean;
  /** opt-in (2026-10-28 showrunner-planet-extremes), captions only: phrases that must never be split across caption pages (e.g. "fifty-nine hundred"); matched case/punctuation-insensitively on consecutive words */
  caption_keep?: string[];
  /** opt-in, captions only: release a page early — for the page that starts within 0.3 s of `at`, end it `max` s after its start (added 2026-10-25, showrunner-way-it-was-made; for long spoken numbers) */
  caption_clip?: { at: number; max?: number; t0?: number; t1?: number; text?: string }[];
  /** opt-in, captions only: override the caption y (% of canvas from centre) for pages starting inside [from,to) s (added 2026-10-25, showrunner-way-it-was-made) */
  caption_y_ranges?: { from: number; to: number; y: number }[];
  /** viral-rankings (ranking:cutlist, style v2): move the caption band / rail plate / subscribe badge off the subject (packages/ranking/py/clearance.py). caption_pin = reveal indexes whose caption y is fixed by the plan; plate_xy = reveal index -> plate top-left. */
  overlay_clearance?: { caption_pin?: number[]; plate_xy?: Record<string, [number, number]> };
  /** opt-in (2026-10-25, showrunner-way-it-was-made): dark translucent pill behind caption pages so white text survives bright shots. Default off. */
  caption_bg?: boolean;
  /** opt-in (2026-10-28, showrunner-planet-extremes): plate opacity 0.3-0.95 for caption_bg pills AND credit plates (default 0.55); use ~0.8 on snow/ice. */
  caption_bg_alpha?: number;
  /** opt-in, captions only: retime one transcript word (matched by asset + exact word + ASR start ±0.3 s) to measured source times; applied after onset snap */
  caption_timing?: { asset_id: string; at: number; word: string; start?: number; end?: number }[];
  /** opt-in (seconds, 0–3.5): hold the last frame after the last segment's src_out, speech faded out and room tone under it (CTA room) */
  end_hold?: number;
  /** end CTA overlay over the LIVE last picture (owner 2026-11-08, O-B1; Mission Voices goal-28): role cta text, `dur` 1.5–2.0 s, `at` = timeline s
   *  (end of the last spoken word) or "end" (the last `dur` s). Clamped to end with the video; any role title card ends when it starts. Use with `end_hold` 0. */
  cta?: { text: string; at: number | 'end'; dur: number; y?: number; x?: number; font_px?: number; max_chars?: number };
  /** opt-in (2026-10-28, showrunner-mission-voices): B-roll picture inserts laid over the speaker's picture on their own track; muted, speech continues underneath.
   *  `at` = timeline seconds, `dur` seconds, `src_in` source seconds. Rights gate + mezzanine required for asset_id; cover-filled (16:9 centre crop), zoom/pan_x/pan_y as for segments. */
  /** opt-in (2026-10-28, showrunner-mission-voices): explicit caption words in TIMELINE seconds (measured by ASR on the assembled cut) replacing the source-transcript lookup when captions are "source"; for sources whose transcript timing is off by 0.2-1 s */
  caption_words?: { w: string; t0: number; t1: number }[];
  inserts?: { asset_id: string; src_in: number; at: number; dur: number; zoom?: number; pan_x?: number; pan_y?: number; why?: string }[];
  /** opt-in (2026-10-31, viral-rankings): caption x (% of canvas from centre), font size (output px), max chars per line/page */
  caption_x?: number; caption_font_px?: number; caption_max_chars?: number;
  /** viral-rankings style v2 (2026-11-04, written by ranking:cutlist): glass caption pill (CAPTION_PILL_V2) instead of the flat ink plate */
  caption_style?: 'v2';
  /** viral-rankings only (written by ranking:cutlist): title / rank rail / brand mark / flash / CTA layers (packages/ranking/src/layers.ts) */
  rank_layers?: any;
  /** opt-in (2026-10-31, viral-rankings pilot): caption pages containing a WORD get that colour (+ the emphasis size bump); WORD -> #RRGGBB */
  emphasis_map?: Record<string, string>;
  /** opt-in: dip the tone bed by `db` (negative) for `dur` s from `at` s (volume keyframes on the bed item, 0.12 s ramps) */
  bed_dips?: { at: number; dur: number; db: number }[];
  /** opt-in: persistent small credit line for the whole timeline (role credit plate), y = % of canvas from centre */
  credit_line?: { text: string; font_px?: number; y?: number; max_chars?: number };
  /** viral-rankings only: segment <-> rank <-> moment map; rights re-checked per moment and moment_usage written on every build */
  ranking?: { entries: any[]; [k: string]: unknown };
  /* viral-rankings build defaults (2026-10-31, written by ranking:cutlist; docs/brands/viral-rankings/RANKING-ENGINE.md §6) */
  /** one credit plate per clip while it plays (role credit), pinned to the built frame grid; bottom edge kept inside y 1420 */
  clip_credits?: { font_px: number; center_y_px: number; max_chars: number; lines: { seg: number; text: string }[] };
  /** #1 payoff hit: `rel` s into segment `seg` — white flash over the footage box (rank layer), sting SFX (SFX track); the punch is a punch_stage, the dip a bed_dip */
  one_hit?: { seg: number; rel: number; at?: number; flash?: boolean; flash_s?: number; sting?: string | null; sting_volume?: number };
  /** F9 end CTA text for the last `dur` s (role cta) */
  end_cta?: { text: string; dur: number };
  /** role cta texts go in the caption band (bottom anchored above the credit plate), end CTAs re-anchored to the real end; overlapping captions lift above */
  cta_band?: boolean;
  /** first caption page snapped to 0.00 s (frame-0 text) when it starts within 1 s */
  caption_start_zero?: boolean;
  /** last spoken word to the end <= tail_max s: the last segment is trimmed/extended (never cutting the word; measured on the audio) */
  tail_max?: number;
}
interface Word { w: string; t0: number; t1: number }

/* ------------------------------------------------------------------ style (brand-aware later) */
// Text items render inside a 1920x1080 design box scaled to the 1080-wide canvas (×0.5625), so sizes are in design px.
// y = vertical offset in % of canvas from centre. Platform UI covers roughly the top 14 % and the bottom 35 % of a
// 9:16 frame on Shorts/Reels/TikTok, so every text lives between y ≈ −34 and +13.
const STYLE: Record<string, { fontSize: number; fontWeight: number; y: number; bg?: boolean; color?: string; maxChars: number }> = {
  caption: { fontSize: 150, fontWeight: 900, y: 9, maxChars: 16 },
  rank: { fontSize: 140, fontWeight: 900, y: -27, bg: true, maxChars: 22 },
  title: { fontSize: 130, fontWeight: 900, y: -27, bg: true, maxChars: 22 },
  hook: { fontSize: 118, fontWeight: 900, y: -27, bg: true, maxChars: 24 },
  fact: { fontSize: 100, fontWeight: 800, y: -17, bg: true, maxChars: 26 },
  quote: { fontSize: 100, fontWeight: 800, y: -17, color: '#fde68a', maxChars: 26 },
  context: { fontSize: 92, fontWeight: 700, y: -17, maxChars: 28 },
  label: { fontSize: 96, fontWeight: 800, y: -17, maxChars: 24 },
  lower_third: { fontSize: 88, fontWeight: 800, y: -6, bg: true, maxChars: 30 },
  credit: { fontSize: 66, fontWeight: 700, y: -31, color: '#e5e7eb', maxChars: 44, bg: true },
  cta: { fontSize: 112, fontWeight: 900, y: -32, bg: true, maxChars: 22 },  // end-of-video call to action / debate prompt (red card, above the face; end the title card when it starts). 112 = 63 px: cap 2.28 % >= owner min 2.2 % (2026-11-08; was 92 = 1.9 %)
};
const OUTLINE = '0 0 8px #000, 0 0 4px #000, 0 0 2px #000, 0 6px 18px rgba(0,0,0,0.85)';
/** viral-rankings style v2 caption pill (2026-11-04): ink glass (62 % + backdrop blur), rounder, thin light rim, soft drop shadow, lighter text shadow */
const CAPTION_PILL_V2 = { bgEnabled: true, bgColor: 'rgba(11,15,28,0.62)', bgBlur: 26, bgRadius: 36, bgPaddingX: 40, bgPaddingY: 12, bgBorder: '2px solid rgba(255,255,255,0.22)', bgShadow: '0 16px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)', textShadow: '0 2px 0 rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.6)' };

/* ------------------------------------------------------------------ helpers */
const F = (s: number, fps: number) => Math.round(s * fps);
/** Balanced wrap: the fewest lines that fit maxChars, with line lengths as even as possible (no lone orphan words). */
function wrap(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/);
  const len = (i: number, j: number) => words.slice(i, j).join(' ').length;
  for (let k = 1; k <= words.length; k++) {
    // DP over break points minimising the longest line, for exactly k lines
    const best: number[][] = Array.from({ length: k + 1 }, () => Array(words.length + 1).fill(Infinity));
    const prev: number[][] = Array.from({ length: k + 1 }, () => Array(words.length + 1).fill(-1));
    best[0][0] = 0;
    for (let l = 1; l <= k; l++) for (let j = 1; j <= words.length; j++) for (let i = l - 1; i < j; i++) {
      const v = Math.max(best[l - 1][i], len(i, j));
      if (v < best[l][j]) { best[l][j] = v; prev[l][j] = i; }
    }
    if (best[k][words.length] <= maxChars || k === words.length) {
      const lines: string[] = []; let j = words.length;
      for (let l = k; l > 0; l--) { const i = prev[l][j]; lines.unshift(words.slice(i, j).join(' ')); j = i; }
      return lines.join('\n');
    }
  }
  return text;
}

const FILLERS = new Set(['um', 'uh', 'erm', 'er', 'ah', 'hmm', 'mm', 'uhm']);
const PRONOUNS = new Set(['i', 'we', 'it', 'he', 'she', 'they', 'you']);
const HEDGES = new Set(['just', 'mean', 'like', 'really', 'actually', 'kind', 'sort', 'so', 'well', 'yeah', 'think']);
const SHORT = new Set(['he', 'she', 'they', 'you','the', 'a', 'an', 'his', 'her', 'my', 'our', 'their', 'in', 'on', 'at', 'to', 'of', 'and', 'i', 'we', 'it', 'that']);
/** Caption-only clean-up (the audio is untouched): drop fillers, collapse stutters ("to to", "on the on the"). */
export function cleanWords(words: Word[]): Word[] {
  const key = (w: Word) => w.w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
  let out = words.filter(w => !FILLERS.has(key(w)));
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      if (i + 1 < out.length && key(out[i]) && key(out[i]) === key(out[i + 1])) { out[i + 1] = { ...out[i + 1], t0: out[i].t0 }; out.splice(i, 1); changed = true; break; }
      // restarts: "X Y X Y" and "X y X" for 2–3 word phrases ("I am not a I am not really" → "I am not really")
      for (const n of [3, 2]) for (const gap of [0, 1]) {
        if (changed || i + 2 * n + gap > out.length) continue;
        // a gap word must be a short function word ("I'm not a I'm not"), never content: "it was otherworldly it was amazing" is not a restart
        if (gap && (!SHORT.has(key(out[i + n])) || /[.!?]$/.test(out[i + n].w))) continue;
        const same = Array.from({ length: n }, (_, k) => key(out[i + k]) === key(out[i + n + gap + k])).every(Boolean);
        if (same) { out[i + n + gap] = { ...out[i + n + gap], t0: out[i].t0 }; out.splice(i, n + gap); changed = true; }
      }
      if (changed) break;
      // single-word false start before a restart: "the on the ship" → "on the ship", "his on his face" → "on his face"
      // Pronouns start clauses, so they need care (found by showrunner-mission-voices):
      //   "I just I broke" → drop the SECOND "I" (the middle word is a filler-ish adverb) → "I just broke";
      //   "I said I don't" → keep everything (the middle word is a verb taking a clause).
      if (i + 2 < out.length && key(out[i]) === key(out[i + 2]) && SHORT.has(key(out[i]))) {
        if (PRONOUNS.has(key(out[i]))) {
          if (HEDGES.has(key(out[i + 1]))) { out.splice(i + 2, 1); changed = true; break; }
        } else { out.splice(i, 1); changed = true; break; }
      }
    }
  }
  return out;
}

/** Phrase pages: ≤3 words / ≤16 chars, break on punctuation or pauses; shown until the next page starts. */
/**
 * ASR word starts after a pause often include part of the silence, so captions appear early. For every word that
 * follows a gap of >= 0.12 s (or opens the segment), find the first two 10 ms windows whose level rises 12 dB above
 * the gap's floor (and above -50 dBFS), searching up to 0.5 s past the word's end, and start the word there. Words are
 * only ever moved later. Audio is untouched.
 */
async function snapOnsets(mezz: string, ws: { s: number; e: number }[], a: number, b: number) {
  const SR = 16000, t0 = Math.max(0, a - 1);
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', t0.toFixed(3), '-i', mezz, '-t', (b - t0 + 0.5).toFixed(3), '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }) as any;
  const pcm = new Int16Array((stdout as Buffer).buffer, (stdout as Buffer).byteOffset, Math.floor((stdout as Buffer).length / 2));
  const lvl = (t: number) => { const i0 = Math.max(0, Math.round((t - t0) * SR)), n = SR / 100; let acc = 0; for (let i = i0; i < Math.min(pcm.length, i0 + n); i++) acc += pcm[i] * pcm[i]; return 10 * Math.log10(acc / n / 32768 / 32768 + 1e-12); };
  for (let k = 0; k < ws.length; k++) {
    const w = ws[k], prevEnd = k ? ws[k - 1].e : a - 1;
    if (w.s - prevEnd < 0.12 && k) continue;
    let floor = Infinity; for (let t = Math.max(prevEnd, w.s - 0.4); t < w.s + 0.05; t += 0.01) floor = Math.min(floor, lvl(t));
    // ASR often stretches the first word after a pause over the whole silence, so search past its end (up to the next word's end)
    const thr = Math.max(floor + 12, -50), lim = Math.min(w.e + 0.5, k + 1 < ws.length ? ws[k + 1].e : w.e + 0.5);
    for (let t = w.s; t < lim; t += 0.01) if (lvl(t) > thr && lvl(t + 0.01) > thr) {
      w.s = Math.max(w.s, t - 0.02);
      if (w.s > w.e - 0.1) { w.e = w.s + 0.15; if (k + 1 < ws.length && ws[k + 1].s < w.e) ws[k + 1].s = w.e; }
      break;
    }
  }
}

/**
 * Opt-in (cutlist narration.snap_onsets, viral-rankings 2026-10-31): fix the word times of ONE narration line clip with the clip's own audio.
 * faster-whisper stretches a word start back over the preceding silence and can smear a pause across neighbouring words, so captions after a
 * pause came out 0.5 s early or late. Here the clip's speech runs (10 ms levels, gaps < 0.18 s merged, blips < 60 ms dropped) are the truth:
 * the words are split into one consecutive group per run (boundaries prefer punctuation, then agreement with ASR), and each group's ASR word
 * times are mapped linearly onto its run. Groups whose ASR span already agrees within 80 ms are left alone. Words are edited in place (clip seconds).
 */
async function refineNarrationWords(file: string, ws: { w: string; s: number; e: number }[]) {
  const SR = 16000, FR = SR / 100;
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }) as any;
  const b = stdout as Buffer, n = Math.floor(b.length / 2), lv: number[] = [];
  for (let f = 0; (f + 1) * FR <= n; f++) { let acc = 0; for (let i = f * FR; i < (f + 1) * FR; i++) { const v = b.readInt16LE(i * 2) / 32768; acc += v * v; } lv.push(10 * Math.log10(acc / FR + 1e-12)); }
  if (!lv.length || !ws.length) return { runs: 0, moved: 0 };
  const thr = Math.max(-50, Math.max(...lv) - 35);
  const raw: [number, number][] = [];
  for (let f = 0; f < lv.length; f++) { if (lv[f] < thr) continue; let g = f; while (g < lv.length && lv[g] >= thr) g++; if ((g - f) / 100 >= 0.06) raw.push([f / 100, g / 100]); f = g; }
  const R: [number, number][] = [];
  for (const r of raw) { const l = R[R.length - 1]; if (l && r[0] - l[1] < 0.18) l[1] = r[1]; else R.push([r[0], r[1]]); }
  const m = R.length, nW = ws.length;
  if (!m || m > nW) return { runs: m, moved: 0 };
  const punct: number[] = []; ws.forEach((w, i) => { if (i < nW - 1 && /[.,:;!?]["')]*$/.test(w.w)) punct.push(i); });   // a boundary falls after word i
  const cand = punct.length >= m - 1 ? punct : ws.slice(0, -1).map((_, i) => i);
  const cost = (cuts: number[]) => { let c = 0, a = 0; [...cuts, nW - 1].forEach((bEnd, r) => { c += Math.abs(ws[a].s - R[r][0]) + Math.abs(ws[bEnd].e - R[r][1]); a = bEnd + 1; }); return c; };
  let best: number[] = [], bc = Infinity;
  const pick = (from: number, left: number, acc: number[]) => {
    if (!left) { const c = cost(acc); if (c < bc) { bc = c; best = [...acc]; } return; }
    for (let k = from; k <= cand.length - left; k++) pick(k + 1, left - 1, [...acc, cand[k]]);
  };
  if (cand.length < m - 1) return { runs: m, moved: 0 };
  if (cand.length > 24) return { runs: m, moved: 0 };
  pick(0, m - 1, []);
  let moved = 0, a = 0;
  [...best, nW - 1].forEach((bEnd, r) => {
    const s0 = ws[a].s, e0 = ws[bEnd].e, [rs, re] = R[r], span = e0 - s0;
    if (!(Math.abs(s0 - rs) < 0.08 && Math.abs(e0 - re) < 0.08)) {
      for (let i = a; i <= bEnd; i++) {
        const ts = ws[i].s, te = ws[i].e;
        if (span > 0.01) { ws[i].s = rs + (ts - s0) / span * (re - rs); ws[i].e = rs + (te - s0) / span * (re - rs); }
        else { ws[i].s = rs + (i - a) * (re - rs) / (bEnd - a + 1); ws[i].e = rs + (i - a + 1) * (re - rs) / (bEnd - a + 1); }
      }
      moved += bEnd - a + 1;
    }
    a = bEnd + 1;
  });
  return { runs: m, moved };
}

/**
 * Opt-in (cutlist narration.max_pause): rewrite a narration line wav so no internal silence is longer than `maxPause` s.
 * Silence = 10 ms windows below max(-50 dBFS, peak - 40 dB); each longer run keeps maxPause/2 at both ends, the middle is cut
 * (5 ms fades at the joins). Leading/trailing silence of the clip is left alone. Returns the new duration and a clip-time map.
 */
async function squeezePauses(file: string, maxPause: number) {
  const SR = 48000, WIN = SR / 100;
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }) as any;
  const b = stdout as Buffer, n = Math.floor(b.length / 8);
  const pcm = new Float32Array(n * 2); for (let i = 0; i < n * 2; i++) pcm[i] = b.readFloatLE(i * 4);
  const frames = Math.floor(n / WIN), lv: number[] = [];
  for (let f = 0; f < frames; f++) { let acc = 0; for (let i = f * WIN * 2; i < (f + 1) * WIN * 2; i++) acc += pcm[i] * pcm[i]; lv.push(10 * Math.log10(acc / (WIN * 2) + 1e-12)); }
  const thr = Math.max(-50, Math.max(...lv) - 40);
  const cuts: [number, number][] = [];  // sample ranges removed
  const firstLoud = lv.findIndex(v => v >= thr), lastLoud = lv.length - 1 - [...lv].reverse().findIndex(v => v >= thr);
  for (let f = firstLoud; f <= lastLoud; f++) {
    if (lv[f] >= thr) continue;
    let g = f; while (g <= lastLoud && lv[g] < thr) g++;
    const len = (g - f) / 100;
    if (len > maxPause) cuts.push([Math.round((f / 100 + maxPause / 2) * SR), Math.round((g / 100 - maxPause / 2) * SR)]);
    f = g;
  }
  if (!cuts.length) return { dur: n / SR, map: (t: number) => t, cuts: 0 };
  const keep: [number, number][] = []; let p = 0;
  for (const [a, c] of cuts) { keep.push([p, a]); p = c; }
  keep.push([p, n]);
  const FADE = Math.round(0.005 * SR), outLen = keep.reduce((s, [a, c]) => s + c - a, 0);
  const pcm16 = Buffer.alloc(outLen * 4); let o = 0;
  for (const [ki, [a, c]] of keep.entries()) {
    for (let i = a; i < c; i++, o++) {
      let gn = 1;
      if (ki > 0 && i - a < FADE) gn = (i - a) / FADE;
      if (ki < keep.length - 1 && c - 1 - i < FADE) gn = Math.min(gn, (c - 1 - i) / FADE);
      for (let ch = 0; ch < 2; ch++) pcm16.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm[i * 2 + ch] * gn * 32767))), o * 4 + ch * 2);
    }
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm16.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(pcm16.length, 40);
  fs.writeFileSync(file, Buffer.concat([hdr, pcm16]));
  const cs = cuts.map(([a, c]) => [a / SR, c / SR] as const);
  return { dur: outLen / SR, cuts: cuts.length, map: (t: number) => t - cs.reduce((s, [a, c]) => s + Math.min(Math.max(t - a, 0), c - a), 0) };
}

/** Owner 2026-11-08: main on-screen text >= 2.2 % cap height (config/text-safety.json); the CTA card's bold sans has cap ~0.70 em
 *  -> >= 61 px on 1920. A cut-list font_px below the floor is raised; max_chars is capped so the card never needs the text-card
 *  shrink-to-fit (which would undercut the floor): (1080 - 2 x 43 margin - 80 padding) / (0.62 em x px). */
export const CTA_MIN_FONT_PX = 62;
export const ctaFontPx = (fontPx?: number) => Math.max(CTA_MIN_FONT_PX, fontPx ?? STYLE.cta.fontSize * 0.5625);
export const ctaMaxChars = (fontPx: number, want?: number) => Math.min(want ?? STYLE.cta.maxChars, Math.floor(914 / (0.62 * fontPx)));

/** End CTA overlay (cut-list `cta`, O-B1 2026-11-08): validates and places it on the built timeline (frame grid), trims any title card
 *  that would still be up when it starts, and returns the text item + notes. Pure (unit-tested in scripts/test-build-helpers.ts). */
export function placeEndCta(cta: NonNullable<CutList['cta']>, total: number, fps: number, texts: TextOverlay[]) {
  const notes: string[] = [];
  if (!cta.text?.trim()) throw new Error('cta.text is empty');
  if (!(cta.dur >= 1.5 && cta.dur <= 2.0)) throw new Error(`cta.dur ${cta.dur} out of range 1.5–2.0 s (owner O-B1)`);
  const durF = Math.round(cta.dur * fps), totF = Math.round(total * fps);
  let atF = cta.at === 'end' ? totF - durF : Math.round(Number(cta.at) * fps);
  if (!Number.isFinite(atF) || atF < 0) throw new Error(`cta.at ${cta.at} is not a timeline time or "end"`);
  if (atF + durF > totF) { const a = Math.max(0, totF - durF); notes.push(`CTA at ${(atF / fps).toFixed(2)} s would run past the end (${total.toFixed(2)} s): moved to ${(a / fps).toFixed(2)} s`); atF = a; }
  const at = +(atF / fps).toFixed(3), dur = +((Math.min(totF, atF + durF) - atF) / fps).toFixed(3);
  if (totF - (atF + Math.min(durF, totF - atF)) > 1) notes.push(`CTA ends ${((totF - atF - durF) / fps).toFixed(2)} s before the video end (goal-28: it should run to the end)`);
  for (const tx of texts) if (tx.role === 'title' && tx.at < at && tx.at + tx.dur > at) { notes.push(`title card "${tx.text}" ends at ${at.toFixed(2)} s (CTA starts)`); tx.dur = +(at - tx.at).toFixed(3); }
  if (cta.font_px && cta.font_px < CTA_MIN_FONT_PX) notes.push(`CTA font_px ${cta.font_px} raised to ${CTA_MIN_FONT_PX} (owner min text size 2.2 % cap height)`);
  const fpx = ctaFontPx(cta.font_px), mc = ctaMaxChars(fpx, cta.max_chars);
  if (cta.max_chars && mc < cta.max_chars) notes.push(`CTA max_chars ${cta.max_chars} capped to ${mc} (fits ${fpx} px without shrinking)`);
  const item: TextOverlay = { text: cta.text, at, dur, role: 'cta', ...(cta.y != null ? { y: cta.y } : {}), ...(cta.x != null ? { x: cta.x } : {}), ...(cta.font_px ? { font_px: fpx } : {}), ...(cta.max_chars ? { max_chars: mc } : {}) };
  return { item, notes };
}

export function pageCaptions(words: Word[], maxWords = 3, maxChars = 16, minPage = 0, keep: string[] = [], noCross = false) {
  const pages: { text: string; t0: number; t1: number; r?: number; e?: boolean; c?: boolean }[] = [];
  // opt-in: fuse each keep-phrase (e.g. "fifty-nine hundred") into one token so no page break can fall inside it
  if (keep.length) {
    const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
    const ks = keep.map(k => k.split(/\s+/).map(norm).filter(Boolean)).filter(k => k.length > 1);
    const fused: Word[] = [];
    for (let i = 0; i < words.length; i++) {
      const k = ks.find(k => k.every((t, j) => i + j < words.length && norm(words[i + j].w) === t));
      if (k) { const g = words.slice(i, i + k.length); fused.push({ ...g[0], w: g.map(x => x.w).join(' '), t1: g[g.length - 1].t1 }); i += k.length - 1; }
      else fused.push(words[i]);
    }
    words = fused;
  }
  let cur: Word[] = [];
  const flush = () => { if (cur.length) pages.push({ text: cur.map(w => w.w).join(' '), t0: cur[0].t0, t1: cur[cur.length - 1].t1, e: /[.!?]$/.test(cur[cur.length - 1].w), c: /:$/.test(cur[cur.length - 1].w) }); cur = []; };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const len = [...cur, w].map(x => x.w).join(' ').length;
    if (cur.length && (cur.length >= maxWords || len > maxChars || w.t0 - cur[cur.length - 1].t1 > 0.35)) flush();
    cur.push(w);
    if (/[.!?,;:—]$/.test(w.w)) flush();
  }
  flush();
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].r = pages[i].t1;  // raw end of the last word (for the opt-in minPage gap check)
    pages[i].t1 = next ? Math.min(next.t0, Math.max(pages[i].t1 + 0.15, pages[i].t0 + 0.4)) : pages[i].t1 + 0.3;
    pages[i].text = pages[i].text.replace(/(?<!\d)[.,;:"](?!\d)/g, '').replace(/[.,;:"](?=\s|$)/g, '').toUpperCase();
  }
  // noCross (viral-rankings): a page may not join words of two sentences, and a join across the script's colon keeps the colon ("FOUR: MORE AIR", not "FOUR MORE AIR")
  const glue = (a: typeof pages[0]) => noCross && a.c ? `${a.text}:` : a.text;
  // Pages shorter than 0.3 s can't be read: merge them into the next page (or the previous one at the end).
  const merged: typeof pages = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p.t1 - p.t0 < 0.3 && i + 1 < pages.length) {
      const nx = pages[i + 1];
      // merging would wrap to two lines: keep both pages, give the short one 0.3 s from the next if the next stays readable
      if (`${p.text} ${nx.text}`.length > maxChars && nx.t1 - (p.t0 + 0.3) >= 0.3) { p.t1 = p.t0 + 0.3; pages[i + 1] = { ...nx, t0: p.t1 }; merged.push(p); continue; }
      if (!(noCross && p.e)) { pages[i + 1] = { text: `${glue(p)} ${nx.text}`, t0: p.t0, t1: nx.t1, ...(noCross ? { r: nx.r, e: nx.e, c: nx.c } : {}) }; continue; }
    }
    if (p.t1 - p.t0 < 0.3 && merged.length && !(noCross && merged[merged.length - 1].e)) { const q = merged[merged.length - 1]; merged[merged.length - 1] = { text: `${glue(q)} ${p.text}`, t0: q.t0, t1: p.t1, ...(noCross ? { r: p.r, e: p.e, c: p.c } : {}) }; continue; }
    merged.push(p);
  }
  // opt-in (cutlist caption_min_page): merge pages shorter than minPage into the next page (else the previous); never across a >0.4 s speech gap, max 2 lines
  if (minPage > 0) {
    // a single-word page under minPage may bridge a pause up to 0.6 s (a comma/line break) inside a sentence; only a longer pause leaves it isolated; a sentence end keeps the 0.4 s rule so a last word joins its own sentence, not the next one
    const ok = (a: typeof pages[0], b: typeof pages[0]) => !(noCross && a.e) && (b.t0 - (a.r ?? a.t1)) <= (!a.e && !(a.text.includes(' ') && b.text.includes(' ')) ? 0.6 : 0.4) && `${a.text} ${b.text}`.length <= maxChars * 2 && `${a.text} ${b.text}`.split(" ").length <= 6 && wrap(`${a.text} ${b.text}`, maxChars).split('\n').length <= 2;
    const join = (a: typeof pages[0], b: typeof pages[0]) => ({ text: `${glue(a)} ${b.text}`, t0: a.t0, t1: b.t1, r: b.r, e: b.e, c: b.c });
    const stuck = new Set<object>();
    for (let guard = 0; guard < 1000; guard++) {
      const i = merged.findIndex(p => p.t1 - p.t0 < minPage - 1e-6 && !stuck.has(p));
      if (i < 0 || merged.length < 2) break;
      const nxt = i + 1 < merged.length && ok(merged[i], merged[i + 1]), prv = i > 0 && ok(merged[i - 1], merged[i]);
      // a page that ends a sentence prefers its own sentence (previous page) over the start of the next one
      if (merged[i].e && prv) merged.splice(i - 1, 2, join(merged[i - 1], merged[i]));
      else if (nxt) merged.splice(i, 2, join(merged[i], merged[i + 1]));
      else if (prv) merged.splice(i - 1, 2, join(merged[i - 1], merged[i]));
      else stuck.add(merged[i]);
    }
  }
  // minPage > 0 (viral-rankings default): prelint caption_short by construction - a page still short after merging holds on into the gap before the next page (never overlaps it)
  if (minPage > 0) for (let i = 0; i < merged.length; i++) {
    const p = merged[i], need = p.text.split(/\s+/).filter(Boolean).length <= 2 ? Math.min(minPage, CAPTION_MIN_PAGE_SHORT) : minPage;
    if (p.t1 - p.t0 < need) p.t1 = merged[i + 1] ? Math.min(p.t0 + need, Math.max(p.t1, merged[i + 1].t0)) : p.t0 + need;
  }
  for (const p of merged) { delete p.r; delete p.e; delete p.c; }
  return merged;
}

function sourceRow(assetId: string) {
  const s = db().prepare(`SELECT * FROM sources WHERE asset_id=?`).get(assetId) as any;
  if (!s) throw new Error(`unknown asset ${assetId}`);
  const a = J.parse<any>(s.analysis, {});
  if (!a.mezzanine || !fs.existsSync(a.mezzanine)) throw new Error(`${assetId} not analysed (run source:analyze ${assetId})`);
  return { ...s, a };
}


const LARGE_BYTES = 300e6;
interface Crop { w: number; h: number; x: number; y: number }
interface SegMedia { file: string; offset: number; end: number; width: number; height: number; cropped: boolean; leveled: boolean; roomTone?: string; punched?: boolean }

/** Active picture area inside baked-in black borders (ffmpeg cropdetect over the used window). null = no meaningful bars. */
export async function detectCrop(mezz: string, a: number, b: number, w: number, h: number): Promise<Crop | null> {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-ss', a.toFixed(3), '-i', mezz, '-t', Math.max(0.5, b - a).toFixed(3), '-vf', 'cropdetect=limit=24:round=2:reset=0', '-an', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const all = [...stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!all.length) return null;
  const [cw, ch, cx, cy] = all[all.length - 1].slice(1).map(Number);
  if (cw >= w * 0.97 && ch >= h * 0.97) return null;
  // Baked-in pillar/letterbox borders are symmetric; dark picture content (e.g. black space in ISS footage) usually is not.
  const symX = Math.abs(cx - (w - cw - cx)) <= w * 0.04, symY = Math.abs(cy - (h - ch - cy)) <= h * 0.04;
  if (!symX || !symY) return null;
  return { w: cw, h: ch, x: cx, y: cy };
}

/** Measured integrated loudness (LUFS) of a source window. */
async function windowLufs(mezz: string, a: number, b: number) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-ss', a.toFixed(3), '-i', mezz, '-t', (b - a).toFixed(3), '-vn', '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(stderr.slice(stderr.lastIndexOf('Summary:')));
  return m ? Number(m[1]) : null;
}

/**
 * The file to import for a segment. A cached, re-encoded window (2 s handles, frame-accurate) is made when the source is
 * large (slow to decode and seek), has baked-in black borders or a manual edge trim (cropped to the real picture), or
 * keeps its own audio (levelled to -16 LUFS so it sits with narration). Otherwise the whole mezzanine is imported.
 */
async function windowFor(row: any, seg: Segment, fade: { in: boolean; out: boolean; tail?: boolean } = { in: false, out: false }): Promise<SegMedia> {
  const mezz = row.a.mezzanine as string;
  const W0 = row.a.width ?? 1920, H0 = row.a.height ?? 1080;
  let crop = await detectCrop(mezz, seg.src_in, seg.src_out, W0, H0);
  if (seg.trim) {
    const c = crop ?? { w: W0, h: H0, x: 0, y: 0 };
    const t = { top: 0, bottom: 0, left: 0, right: 0, ...seg.trim };
    crop = { x: c.x + t.left, y: c.y + t.top, w: c.w - t.left - t.right, h: c.h - t.top - t.bottom };
    crop.w -= crop.w % 2; crop.h -= crop.h % 2;
  }
  const lufs = !seg.mute_source ? await windowLufs(mezz, seg.src_in, seg.src_out) : null;
  const level = lufs != null && Math.abs(lufs + 16) > 1.5;
  const head = !seg.mute_source && !fade.in && seg.audio_fade_in && seg.audio_fade_in > 0 ? Math.min(1, seg.audio_fade_in) : 0;
  // tail: the timeline's last segment gets a short audio-only fade so the video never ends on a hard cut at speech level (QA 2026-10-25)
  const tail = !seg.mute_source && !fade.out && !!fade.tail;
  const fi = seg.audio_fade_in && seg.audio_fade_in > 0 ? Math.min(0.12, seg.audio_fade_in) : 0.12; // at a non-contiguous join audio_fade_in may only shorten the default 0.12 s
  const fo = seg.audio_fade_out && seg.audio_fade_out > 0 ? Math.min(0.18, seg.audio_fade_out) : 0.18;
  const fades = !seg.mute_source && (fade.in || fade.out || head > 0 || tail);
  const lf = seg.lift, lifted = !!lf && (lf.gamma != null || lf.brightness != null || lf.contrast != null);
  const fsoft = !!seg.flash_soften, dfl = !!seg.deflash, comp = !seg.mute_source && !!seg.compress;
  const ins = seg.insert;
  // clipped punch-in (2026-10-31 fix, 8knt v6): baked into the window so the picture never leaves its fit_box (the old OCC scale keyframes
  // grew the item upward into the title band). Output = the picture's contained size in the box; zoom anchored at the bottom centre.
  // Opt out (legacy grow-upward keyframes) with punch.clip = false.
  const stg = punchStagesOf(seg);
  const stFol = seg.src_in - Math.max(0, Math.floor((seg.src_in - 2) * 10) / 10);
  const fol = seg.follow && seg.fit_box && seg.fill !== 'cover' && !ins ? followFilter(seg.follow, crop?.w ?? W0, crop?.h ?? H0, seg.fit_box, stFol) : null;
  const pz = stg.length && seg.fit_box && seg.fill !== 'cover' && !ins ? (() => {
    const cw = crop?.w ?? W0, ch = crop?.h ?? H0, [x0, y0, x1, y1] = seg.fit_box!, k = Math.min((x1 - x0) / cw, (y1 - y0) / ch);
    const ow = fol ? fol.ow : Math.max(2, Math.round(cw * k / 2) * 2), oh = fol ? fol.oh : Math.max(2, Math.round(ch * k / 2) * 2);
    const st = seg.src_in - Math.max(0, Math.floor((seg.src_in - 2) * 10) / 10);
    const keys = punchKeysOf(stg, st);   // one stage = the old single punch (same filter, same cache tag)
    return { ow, oh, keys, t0: keys[0][0], t1: keys[1][0], s: keys[1][1] };
  })() : null;
  if (!ins && !pz && !fol && fs.statSync(mezz).size < LARGE_BYTES && !crop && !level && !fades && !dfl && !comp && !lifted && !fsoft) return { file: mezz, offset: 0, end: seg.src_out, width: W0, height: H0, cropped: false, leveled: false };
  const a = Math.max(0, Math.floor((seg.src_in - 2) * 10) / 10), b = Math.min(row.a.duration ?? seg.src_out + 2, Math.ceil((seg.src_out + 2) * 10) / 10);
  const tag = `${fol ? `_fol${crypto.createHash('sha1').update(JSON.stringify([seg.follow, seg.fit_box])).digest('hex').slice(0, 10)}` : ''}${crop ? `_c${crop.w}x${crop.h}+${crop.x}+${crop.y}` : ''}${level ? `_l${Math.round(lufs!)}` : ''}${dfl ? '_ff1' : ''}${fsoft ? '_fs2' : ''}${comp ? '_cmp' : ''}${lifted ? `_lift${lf!.gamma ?? 1}_${lf!.brightness ?? 0}_${lf!.contrast ?? 1}` : ''}${pz ? (pz.keys.length > 2 ? `_pzk${crypto.createHash('sha1').update(JSON.stringify(pz.keys.map(([a, b]) => [+a.toFixed(3), +b.toFixed(4)]))).digest('hex').slice(0, 10)}_${pz.ow}x${pz.oh}` : `_pz${pz.s}_${pz.t0.toFixed(2)}-${pz.t1.toFixed(2)}_${pz.ow}x${pz.oh}`) : ''}${ins ? `_ins${path.basename(ins.image).replace(/\W/g, '').slice(0, 12)}${ins.focus_x ?? 0.5}_${ins.plate_fy ?? 0.4}_${ins.zoom_to ?? 1.3}_${seg.src_in.toFixed(2)}-${seg.src_out.toFixed(2)}` : ''}${fades ? `_f${fade.in ? (fi !== 0.12 ? `i${fi}` : 'i') : ''}${head ? `h${head.toFixed(3)}` : ''}${fade.out ? (fo !== 0.18 ? `o${fo}` : 'o') : ''}${tail ? 't' : ''}${seg.src_in.toFixed(2)}-${seg.src_out.toFixed(2)}` : ''}`;
  const file = path.join(P.media, 'windows', `${String(row.fingerprint).slice(0, 16)}_${a.toFixed(1)}-${b.toFixed(1)}${tag}.mp4`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file.replace(/\.mp4$/, '.part.mp4');
    const flashFilters = dfl ? await flashFrames(mezz, a, b) : [];
    const eqF = lifted ? `eq=gamma=${lf!.gamma ?? 1}:brightness=${lf!.brightness ?? 0}:contrast=${lf!.contrast ?? 1}` : '';
    const punchF = pz ? punchFilter(pz) : '';
    const cropF = [crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}` : '', fol ? fol.vf : '', fsoft ? 'tmix=frames=2:weights=1 1' : '', eqF, punchF].filter(Boolean).join(',');
    let vf: string[] = cropF ? ['-vf', cropF] : [];
    if (flashFilters.length) {
      // freezeframes takes (video, replacement video): feed it the same stream twice per flash
      let g = '', prev = '[0:v]';
      flashFilters.forEach((f, k) => { g += `${prev}split=2[sa${k}][sb${k}];[sa${k}][sb${k}]${f}[fz${k}];`; prev = `[fz${k}]`; });
      g += `${prev}${cropF || 'null'}[vout]`;
      vf = ['-filter_complex', g, '-map', '[vout]', '-map', '0:a?'];
    }
    if (ins) {
      // B-roll still: tall plate around the focus point, Ken Burns push, overlaid on the centre 9:16 strip for the used range only
      const bh = crop?.h ?? H0, sw = Math.round((bh * 9 / 16) / 2) * 2;
      const plate = path.join(P.media, 'windows', `plate_${path.basename(ins.image).replace(/\W/g, '')}_${ins.focus_x ?? 0.5}.jpg`);
      if (!fs.existsSync(plate)) {
        const cx = String.raw`max(0\,min(iw-ih*9/16\,${ins.focus_x ?? 0.5}*iw-ih*9/16/2))`;
        await run('ffmpeg', ['-v', 'error', '-y', '-i', ins.image, '-vf', `crop=floor(ih*9/16/2)*2:ih:${cx}:0,scale=${sw * 3}:${bh * 3}:flags=lanczos`, '-q:v', '2', plate]);
      }
      const st = seg.src_in - a, dur = seg.src_out - seg.src_in, N = Math.max(2, Math.round(dur * 30)), zt = ins.zoom_to ?? 1.3, fy = ins.plate_fy ?? 0.4;
      const g = `[1:v]zoompan=z='1+${zt - 1}*on/${N}':x='iw/2-iw/zoom/2':y='ih*${fy}-ih/zoom/2':d=1:s=${sw}x${bh}:fps=30,setpts=PTS+${st.toFixed(3)}/TB,format=yuv420p[pl];[0:v]${cropF || 'null'}[bs];[bs][pl]overlay=x=(W-w)/2:y=0:enable='between(t,${st.toFixed(3)},${(st + dur).toFixed(3)})':eof_action=pass:format=yuv420[vout]`;
      vf = ['-filter_complex', g, '-map', '[vout]', '-map', '0:a?'];
    }
    // Audio-only fades at the exact used in/out points (relative to the window start); picture is never faded.
    const afx = [
      ...(comp ? ['acompressor=threshold=0.063:ratio=3:attack=5:release=80:makeup=1.6'] : []),
      ...(level ? [`volume=${(-16 - lufs!).toFixed(2)}dB`, 'alimiter=limit=0.89'] : []),
      ...(fades && fade.in ? [`afade=t=in:st=${(seg.src_in - a).toFixed(3)}:d=${fi}`] : []),
      ...(head ? [`afade=t=in:st=${(seg.src_in - a).toFixed(3)}:d=${head.toFixed(3)}`] : []),
      ...(fades && fade.out ? [`afade=t=out:st=${Math.max(0, seg.src_out - a - fo).toFixed(3)}:d=${fo}`] : []),
      ...(tail ? [`afade=t=out:st=${Math.max(0, seg.src_out - a - 0.08).toFixed(3)}:d=0.08`] : []),
    ];
    const af = afx.length ? ['-af', afx.join(',')] : [];
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', a.toFixed(3), '-i', mezz, ...(ins ? ['-loop', '1', '-framerate', '30', '-t', (b - a).toFixed(3), '-i', path.join(P.media, 'windows', `plate_${path.basename(ins.image).replace(/\W/g, '')}_${ins.focus_x ?? 0.5}.jpg`)] : []), '-t', (b - a).toFixed(3), ...vf, ...af, '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '18',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp], { maxBuffer: 1 << 26 });
    fs.renameSync(tmp, file);
  }
  return { file, offset: a, end: b, width: pz?.ow ?? fol?.ow ?? crop?.w ?? W0, height: pz?.oh ?? fol?.oh ?? crop?.h ?? H0, cropped: !!crop, leveled: level, ...(pz ? { punched: true } : {}) };
}


/** Follow-crop geometry + ffmpeg filter (2026-10-31). Window = zoom x frame width at the fit_box aspect (shrunk to fit the frame height); x/y are per-frame linear
 *  interpolations of the key centres (window seconds = key time + `st`). Returns the filter string and the output size (window scaled into the box). */
export function followFilter(f: NonNullable<Segment['follow']>, cw: number, ch: number, box: [number, number, number, number], st: number) {
  const bw = box[2] - box[0], bh = box[3] - box[1];
  let w = cw * Math.min(1, f.zoom ?? 1), h = w / (f.aspect ?? bw / bh);
  if (h > ch) { h = ch; w = h * (f.aspect ?? bw / bh); }
  if (w > cw) { w = cw; h = w / (f.aspect ?? bw / bh); }
  w = Math.max(2, Math.floor(w / 2) * 2); h = Math.max(2, Math.floor(h / 2) * 2);
  const k = Math.min(bw / w, bh / h), ow = Math.max(2, Math.round(w * k / 2) * 2), oh = Math.max(2, Math.round(h * k / 2) * 2);
  const keys = [...f.keys].sort((a, b) => a[0] - b[0]);
  const lerp = (idx: 1 | 2, span: number) => {
    const fx = (v: number) => v.toFixed(4), T = (v: number) => (v + st).toFixed(3);
    let e = fx(keys[keys.length - 1][idx] * span);
    for (let i = keys.length - 2; i >= 0; i--) {
      const [ta, , ] = keys[i], a = keys[i][idx] * span, b = keys[i + 1][idx] * span, tb = keys[i + 1][0];
      e = `if(lt(t,${T(tb)}),${tb - ta < 1e-3 ? fx(a) : `${fx(a)}+${fx(b - a)}*(t-${T(ta)})/${(tb - ta).toFixed(3)}`},${e})`;
    }
    return `if(lt(t,${T(keys[0][0])}),${fx(keys[0][idx] * span)},${e})`;
  };
  const X = `max(0,min(${cw - w},${lerp(1, cw)}-${w / 2}))`, Y = `max(0,min(${ch - h},${lerp(2, ch)}-${h / 2}))`;
  return { vf: `crop=${w}:${h}:'${X}':'${Y}':exact=1,scale=${ow}:${oh}:flags=lanczos,setsar=1`, ow, oh };
}

/** Punch stages of a segment (2026-10-31): legacy `punch` (unless clip:false) + `punch_stages`, sorted by start; a stage that overlaps the previous one is dropped. */
export function punchStagesOf(seg: { punch?: Segment['punch']; punch_stages?: Segment['punch_stages'] }) {
  const all = [...(seg.punch && seg.punch.clip !== false ? [{ from_s: seg.punch.from_s, to_s: seg.punch.to_s, scale: seg.punch.scale_to }] : []), ...(seg.punch_stages ?? [])]
    .filter(st => st.scale > 0).sort((a, b) => a.from_s - b.from_s);
  const out: { from_s: number; to_s: number; scale: number }[] = [];
  for (const st of all) if (!out.length || st.from_s >= out[out.length - 1].to_s - 1e-6) out.push(st);
  return out;
}
/** [time, zoom] keys for punch stages, times shifted by `offset` (window seconds); zoom is cumulative (stage scales multiply). */
export function punchKeysOf(stages: { from_s: number; to_s: number; scale: number }[], offset = 0): [number, number][] {
  const k: [number, number][] = []; let cur = 1;
  for (const st of stages) { k.push([offset + st.from_s, cur]); cur *= st.scale; k.push([offset + Math.max(st.from_s + 1 / 30, st.to_s), cur]); }
  return k;
}

/** ffmpeg chain for a clipped punch-in: 2x lanczos supersample, then zoompan (one output frame per input frame) with an eased zoom
 *  1 → s between window seconds t0..t1, anchored bottom-centre, output fixed at ow x oh (so the frame size, and the fit_box, never change).
 *  `keys` (2026-10-31, several stages): [window s, zoom] pairs, eased between neighbours with different zoom, held otherwise. */
export function punchFilter(p: { ow: number; oh: number; t0?: number; t1?: number; s?: number; keys?: [number, number][] }) {
  if (p.keys && p.keys.length > 2) {
    const K = p.keys, f = (x: number) => x.toFixed(4), T = (x: number) => x.toFixed(3);
    let zk = f(K[K.length - 1][1]);
    for (let i = K.length - 2; i >= 0; i--) {
      const [ta, sa] = K[i], [tb, sb] = K[i + 1];
      const mid = Math.abs(sb - sa) < 1e-6 || tb - ta < 1e-3 ? f(sa) : `${f(sa)}+${f(sb - sa)}*(0.5-0.5*cos(PI*(it-${T(ta)})/${T(tb - ta)}))`;
      zk = `if(lt(it,${T(tb)}),${mid},${zk})`;
    }
    zk = `if(lt(it,${T(K[0][0])}),${f(K[0][1])},${zk})`;
    return `scale=${p.ow * 2}:${p.oh * 2}:flags=lanczos,zoompan=z='${zk}':x='(iw-iw/zoom)/2':y='ih-ih/zoom':d=1:s=${p.ow}x${p.oh}:fps=30,setsar=1`;
  }
  const t0 = p.keys ? p.keys[0][0] : p.t0!, t1 = p.keys ? p.keys[1][0] : p.t1!, s = p.keys ? p.keys[1][1] : p.s!;
  const T0 = t0.toFixed(3), T1 = t1.toFixed(3), D = (t1 - t0).toFixed(3), S1 = (s - 1).toFixed(4);
  const z = `if(lt(it,${T0}),1,if(gt(it,${T1}),${s},1+${S1}*(0.5-0.5*cos(PI*(it-${T0})/${D}))))`;
  return `scale=${p.ow * 2}:${p.oh * 2}:flags=lanczos,zoompan=z='${z}':x='(iw-iw/zoom)/2':y='ih-ih/zoom':d=1:s=${p.ow}x${p.oh}:fps=30,setsar=1`;
}

/** Time (s) of the last 10 ms window above max(-50 dBFS, peak - 35 dB) in an audio file = where the speech really ends (viral-rankings tail_max). */
async function lastSpeech(file: string) {
  const SR = 16000, FR = SR / 100;
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }) as any;
  const b = stdout as Buffer, n = Math.floor(b.length / 2), lv: number[] = [];
  for (let f = 0; (f + 1) * FR <= n; f++) { let acc = 0; for (let i = f * FR; i < (f + 1) * FR; i++) { const v = b.readInt16LE(i * 2) / 32768; acc += v * v; } lv.push(10 * Math.log10(acc / FR + 1e-12)); }
  if (!lv.length) return 0;
  const thr = Math.max(-50, Math.max(...lv) - 35);
  for (let f = lv.length - 1; f >= 0; f--) if (lv[f] >= thr) return (f + 1) / 100;
  return 0;
}

/**
 * end_hold: a copy of the last segment's window that stops at the segment's out frame and then holds that frame for
 * `holdF` frames (tpad clone). Audio: the window's own audio (incl. its tail fade) up to the out point, then room tone —
 * the quietest 0.4 s of the source within ±6 s of the out point (10 ms RMS), ping-pong looped so the joins don't click,
 * capped at −50 dBFS; true near-silence (−60 dB noise) when the source has no quiet stretch below −40 dBFS.
 */
async function holdWindow(row: any, seg: Segment & { durF: number }, m: SegMedia, holdF: number, fps: number): Promise<SegMedia> {
  const mezz = row.a.mezzanine as string;
  const startF = Math.round((seg.src_in - m.offset) * fps), endF = startF + seg.durF, hold = holdF / fps;
  const SR = 16000, L = 0.4, lo = Math.max(0, seg.src_out - 6), hi = Math.min(row.a.duration ?? seg.src_out + 6, seg.src_out + 6);
  // a source without an audio stream (stock timelapse) has no room tone to read: ffmpeg exits 1, so fall back to an empty buffer (near-silence path below)
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', lo.toFixed(3), '-i', mezz, '-t', (hi - lo).toFixed(3), '-vn', '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }).catch(() => ({ stdout: Buffer.alloc(0) })) as any;
  const pcm = new Int16Array((stdout as Buffer).buffer, (stdout as Buffer).byteOffset, Math.floor((stdout as Buffer).length / 2));
  const db10 = Array.from({ length: Math.floor(pcm.length / 160) }, (_, k) => { let acc = 0; for (let i = k * 160; i < k * 160 + 160; i++) acc += pcm[i] * pcm[i]; return 10 * Math.log10(acc / 160 / 32768 / 32768 + 1e-12); });
  const n = Math.round(L * 100);
  let best = { k: -1, max: Infinity, rms: 0 };
  for (let k = 0; k + n <= db10.length; k++) {
    const w = db10.slice(k, k + n), mx = Math.max(...w);
    if (mx < best.max) best = { k, max: mx, rms: 10 * Math.log10(w.reduce((a, d) => a + 10 ** (d / 10), 0) / n) };
  }
  const tone = best.k >= 0 && best.max < -40 ? { at: lo + best.k / 100, rms: best.rms } : null;
  // same level change as the window (levelled sources), but never louder than −50 dBFS RMS
  const lvl = m.leveled ? (await windowLufs(mezz, seg.src_in, seg.src_out) ?? -16) : -16;
  const gain = tone ? Math.min(-16 - lvl, -50 - tone.rms) : 0;
  const file = m.file.replace(/\.mp4$/, `_holdx${endF}+${holdF}${tone ? `_rt${tone.at.toFixed(2)}` : '_n60'}.mp4`);
  if (!fs.existsSync(file)) {
    const tmp = file.replace(/\.mp4$/, '.part.mp4');
    const hasA = !!(await run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', m.file]).then((r: any) => String(r.stdout).trim()).catch(() => ''));
    const rt = tone
      ? `[1:a]aresample=48000,asplit[r1][r2];[r2]areverse[r2r];[r1][r2r]concat=v=0:a=1,aloop=loop=${Math.ceil(hold / (2 * L)) + 1}:size=${Math.round(2 * L * 48000)},atrim=end_sample=${Math.round((hold + 0.04) * 48000)},volume=${gain.toFixed(2)}dB,aformat=channel_layouts=stereo[rt]`
      : `anoisesrc=color=pink:amplitude=0.001:sample_rate=48000:duration=${(hold + 0.04).toFixed(3)},aformat=channel_layouts=stereo[rt]`;
    await run('ffmpeg', ['-v', 'error', '-y', '-i', m.file, ...(tone ? ['-ss', tone.at.toFixed(3), '-t', L.toFixed(3), '-i', mezz] : []), '-filter_complex',
      `[0:v]trim=end_frame=${endF},tpad=stop_mode=clone:stop=${holdF}[v];` +
      `${hasA ? `[0:a]aresample=48000,atrim=end_sample=${Math.round(endF / fps * 48000)},aformat=channel_layouts=stereo[sp]` : `anullsrc=r=48000:cl=stereo,atrim=end_sample=${Math.round(endF / fps * 48000)}[sp]`};${rt};` +
      // room tone starts 40 ms under the faded tail (no zero-sample hole at the splice; the tail is already at 0 there)
      `[rt]adelay=${Math.round(Math.max(0, endF / fps - 0.04) * 1000)}:all=1[rtd];[sp][rtd]amix=inputs=2:duration=longest:normalize=0,atrim=end_sample=${Math.round((endF / fps + hold) * 48000)}[a]`,
      '-map', '[v]', '-map', '[a]', '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp], { maxBuffer: 1 << 26 });
    fs.renameSync(tmp, file);
  }
  return { ...m, file, end: m.offset + (endF + holdF) / fps, roomTone: tone ? `room tone looped from source ${tone.at.toFixed(2)} s (${(tone.rms + gain).toFixed(0)} dBFS)` : 'no quiet source stretch — −60 dB noise' };
}

/** mv-B4: find single/double-frame luma spikes (press-camera flashes) in a window and return `freezeframes` filters that replace them by the previous frame. */
async function flashFrames(mezz: string, a: number, b: number): Promise<string[]> {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', mezz, '-an', '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const y = [...String(stdout).matchAll(/YAVG=([\d.]+)/g)].map(m => parseFloat(m[1]));
  const out: string[] = [];
  for (let i = 1; i < y.length - 2; i++) {
    for (const len of [1, 2]) {
      const before = y[i - 1], after = y[i + len];
      if (i + len >= y.length) continue;
      let spike = true;
      for (let k = 0; k < len; k++) if (!(y[i + k] > before * 1.25 && y[i + k] > after * 1.25 && y[i + k] - before > 12)) spike = false;
      if (spike) { out.push(`freezeframes=first=${i}:last=${i + len - 1}:replace=${i - 1}`); i += len; break; }
    }
  }
  return out;
}

/**
 * Original, rights-free score bed (generated, no samples): a slow pad alternating Am / F in the mid range (audible on phone
 * speakers, unlike a sub drone), soft brown-noise air, and an accent (low hit + bell) at each `accents` time — rank badges,
 * chapter labels, the payoff. About -36 LUFS before mastering.
 */
export async function toneBed(seconds: number, out: string, accents: number[] = []) {
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const d = seconds.toFixed(2);
  const S = (f: number) => `sin(2*PI*${f}*t)+0.5*sin(2*PI*${(f * 1.003).toFixed(3)}*t)`; // slightly detuned pair = chorus
  const w = '(0.5+0.5*cos(2*PI*t/16))'; // 16 s crossfade between the two chords
  const pad = `0.05*(${w}*(${S(220)}+${S(261.63)}+${S(329.63)})+(1-${w})*(${S(174.61)}+${S(220)}+${S(261.63)}))*(0.85+0.15*sin(2*PI*0.2*t))`;
  const hits = accents.filter(t => t > 0.3 && t < seconds - 0.5).slice(0, 12)
    .map(T => `between(t,${T.toFixed(2)},${(T + 2.5).toFixed(2)})*exp(-5*max(0,t-${T.toFixed(2)}))*(0.5*sin(2*PI*110*t)+0.25*sin(2*PI*220*t)+0.12*sin(2*PI*880*t)*exp(-3*max(0,t-${T.toFixed(2)}))+0.08*sin(2*PI*2500*t)*exp(-25*max(0,t-${T.toFixed(2)})))`);  // max(0,…): exp(25*(T-t)) overflows to inf before late accents (T>28 s) and 0*inf=NaN became a DC offset  // + a 2.5 kHz tick phones can hear
  // Upper layer so the bed is not just a hum: soft alternating E5/A5 plucks every 2 s, and a swell into the last accent (payoff).
  const plucks = `0.045*((sin(2*PI*659.25*t)+0.4*sin(2*PI*1318.5*t)+0.2*sin(2*PI*2637*t))*exp(-4*mod(t,4))+(sin(2*PI*880*t)+0.4*sin(2*PI*1760*t)+0.2*sin(2*PI*3520*t))*exp(-4*mod(t+2,4)))`; // with harmonics so phones (1-4 kHz) hear it
  const ac = accents.filter(t => t > 0.3 && t < seconds - 0.5);
  const [A, B] = ac.length >= 2 ? ac.slice(-2) : [Math.max(0, seconds - 12), seconds - 1];
  const swell = `between(t,${A.toFixed(2)},${B.toFixed(2)})*pow((t-${A.toFixed(2)})/${Math.max(0.5, B - A).toFixed(2)},2)*0.04*(sin(2*PI*523.25*t)+sin(2*PI*659.25*t))`;
  const expr = [pad, plucks, swell, ...hits].join('+');
  // "Air" (2-6 kHz band of pink noise) so phone speakers carry the bed: a low constant level, swelling over the hook
  // (first 3 s) and into the payoff, plus a short burst on every accent.
  const air = ['0.55', 'if(lt(t,3),0.9*(1-t/3),0)', `between(t,${A.toFixed(2)},${B.toFixed(2)})*0.9*pow((t-${A.toFixed(2)})/${Math.max(0.5, B - A).toFixed(2)},2)`,
    `if(gte(t,${B.toFixed(2)}),0.9,0)`,  // hold the crest through the payoff to the end fade
    ...ac.slice(0, 12).map(T => `if(gte(t,${T.toFixed(2)}),1.2*exp(-6*max(0,t-${T.toFixed(2)})),0)`)].join('+');
  await run('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=48000:d=${d}`,
    '-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.05:duration=${d}`,
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.3:duration=${d}`,
    '-filter_complex', `[0]lowpass=f=5000,aecho=0.8:0.6:120|240:0.25|0.15[p];[1]lowpass=f=600,volume=0.35[n];[2]highpass=f=2000,lowpass=f=6000,volume='${air}':eval=frame[h];[p][n][h]amix=inputs=3:normalize=0,highpass=f=20,afade=t=in:d=0.1,afade=t=out:st=${Math.max(0, seconds - 0.5).toFixed(2)}:d=0.5,loudnorm=I=-36:TP=-8[o]`,
    // -t: aecho adds a ~0.24 s tail; a bed longer than the picture would extend the timeline (blank end frames).
    '-map', '[o]', '-t', d, '-ar', '48000', '-ac', '2', out], { maxBuffer: 1 << 26 });
  return out;
}

/** edit_item is atomic and reports problems in its body, not as a tool error: fail loudly instead of silently losing edits. */
function checked(r: any, what: string) {
  const bad = (r?.results ?? []).map((x: any, i: number) => ({ i, x })).filter(({ x }: any) => x?.ok === false);
  if (r?.ok === false || bad.length) throw new Error(`timeline rejected ${what}: ${JSON.stringify(bad.length ? bad.slice(0, 3) : r).slice(0, 600)}`);
  return r;
}

/* ------------------------------------------------------------------ main */
/* ------------------------------------------------------------------ content addressing: media are keyed by sha256 (timeline asset id = absolute path) */
const shaMemo = new Map<string, string>();
export function shaOfFileSync(file: string) {
  const st = fs.statSync(file);
  const key = `${path.resolve(file)}|${st.size}|${st.mtimeMs}`;
  const hit = shaMemo.get(key);
  if (hit) return hit;
  const h = crypto.createHash('sha256'), fd = fs.openSync(file, 'r'), buf = Buffer.allocUnsafe(1 << 22);
  try { for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0;) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  const d = h.digest('hex');
  shaMemo.set(key, d);
  return d;
}
/** <dir>/<base>.<sha:12><ext> as a hard link (copy across volumes). Exported for tests. */
export function stageByContent(file: string, sha: string, dir: string) {
  const ext = path.extname(file), base = path.basename(file, ext).replace(/\.[0-9a-f]{12}$/, '');
  const dst = path.join(dir, `${base}.${sha.slice(0, 12)}${ext}`);
  if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(file).size) return dst;
  fs.rmSync(dst, { force: true });
  try { fs.linkSync(file, dst); } catch { fs.copyFileSync(file, dst); }
  return dst;
}
/** The edit is recorded as timeline.json and rendered by packages/render (ffmpeg); OpenChatCut retired 2026-11-02. */
export interface BuildOptions { agent?: string; renderOnly?: boolean; skipRender?: boolean;
  /** scratch dry build (2026-11-11, layout proofs): cut list from `<scratch>/cutlist.json`, version files written into `<scratch>` itself, narration from the
   *  TTS cache only (a cache miss throws, no quota), no DB writes, no events, no render (use render:timeline on <scratch>/timeline.json). */
  scratch?: string }

/** viral-rankings punch-in keyframes (scale + y so the fitted picture grows upward only; bottom edge fixed). Frames are segment-local. */
function punchKeys(p: { from_s: number; to_s: number; scale_to: number }, fb: { scale: number; x: number; y: number }, m: { width: number; height: number }, fps: number, W: number, H: number, durF: number) {
  const k = Math.min(W / m.width, H / m.height), h0 = m.height * k * fb.scale, s1 = fb.scale * p.scale_to;
  const y1 = fb.y - (h0 * p.scale_to - h0) / 2 / H * 100;
  const f0 = Math.min(durF - 2, Math.round(p.from_s * fps)), f1 = Math.min(durF - 1, Math.max(f0 + 1, Math.round(p.to_s * fps)));
  const ks = (a: number, b: number) => [{ frame: 0, value: +a.toFixed(4), easing: 'linear' }, { frame: f0, value: +a.toFixed(4), easing: 'easeInOut' }, { frame: f1, value: +b.toFixed(4) }];
  return { scale: ks(fb.scale, s1), y: ks(fb.y, y1) };
}

export async function buildProduction(productionId: string, opts: BuildOptions = {}) {
  const agent = opts.agent ?? 'render';
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(productionId) as any;
  if (!prod) throw new Error(`production ${productionId} not found`);
  const dir = path.join(P.productions, productionId);
  const scratch = opts.scratch ? path.resolve(opts.scratch) : null;
  if (scratch && path.resolve(scratch).toLowerCase().startsWith(path.resolve(P.productions).toLowerCase())) throw new Error('scratch build: the scratch dir must be outside productions/');
  const cl: CutList = JSON.parse(fs.readFileSync(path.join(scratch ?? dir, 'cutlist.json'), 'utf8'));
  // mojibake guard: UTF-8 text re-read as cp1252 (Python open() without encoding on this box) burns "Â·"/"â€”" into the
  // picture (published og7k name card, 4pgk v8 chips). Refuse to render on-screen text that carries it.
  const moji = /Â[\u0080-¿]|â€|Ã[\u0080-¿]/;
  const bad = (cl.texts ?? []).map((t: any) => t.text).filter((s: unknown) => typeof s === 'string' && moji.test(s));
  if (bad.length) throw new Error(`cutlist texts carry mojibake (re-save as UTF-8, open(..., encoding="utf8")): ${bad.slice(0, 3).join(' | ')}`);
  const W = cl.width ?? 1080, H = cl.height ?? 1920, fps = cl.fps ?? 30;
  const n = (prod.version ?? 0) + 1;
  const vdir = scratch ?? path.join(dir, `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  const log: string[] = [];
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); if (!scratch) emit({ kind: 'build.step', agent, productionId, level, message: m }); };
  // hook card guard (rank-261102-91sf v1, 2026-11-02): script.json's on-screen hook only reaches the picture as a cutlist.texts entry
  // (ranking:cutlist emits texts: []); a missing one used to pass silently
  try {
    const sj = JSON.parse(fs.readFileSync(path.join(dir, 'script.json'), 'utf8'));
    const hooks = [sj.hook_text, ...(sj.on_screen ?? []).filter((o: any) => o?.role === 'hook').map((o: any) => o.text)].filter((s: unknown): s is string => typeof s === 'string' && !!s.trim());
    const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim();
    const missing = [...new Set(hooks.map(norm))].filter(h => !(cl.texts ?? []).some((t: any) => norm(String(t.text ?? '')) === h));
    if (missing.length) note(`script.json hook "${missing.join('" / "')}" is not in cutlist.texts - it will NOT be on screen (add {text, at: 0, dur, role: "hook"}; keep the first caption clear of it)`, 'warn');
  } catch { /* no script.json */ }

  /* 1. validate + rights gate */
  const assets = [...new Set([...cl.segments.map(s => s.asset_id), ...(cl.inserts ?? []).map(x => x.asset_id), ...(cl.music ? [cl.music.asset_id] : [])])];
  assertPublishable(assets);
  // viral-rankings (2026-10-31): rank layers are brand-gated; ranking cut lists re-check rights per MOMENT (not only per source)
  if ((cl.rank_layers || cl.ranking) && prod.brand_id !== 'viral-rankings') throw new Error(`rank_layers/ranking blocks are for brand viral-rankings only (production brand ${prod.brand_id})`);
  const rk = cl.ranking ? await import('../../ranking/src/layers.ts') : null;
  if (rk && cl.ranking) rk.rankingRightsRecheck(cl.ranking.entries);
  const src = Object.fromEntries(assets.map(id => [id, sourceRow(id)]));
  // speed (2026-10-31, oerp): derived sped-up mezzanine of the SAME source (no audio); segment times are converted to derived time in memory only
  for (const s of cl.segments) if (s.speed && s.speed !== 1) {
    const r0 = src[s.asset_id], sp = s.speed, dm = r0.a.mezzanine.replace(/\.mp4$/, `_x${sp}.mp4`);
    if (!fs.existsSync(dm)) await run('ffmpeg', ['-v', 'error', '-y', '-i', r0.a.mezzanine, '-an', '-vf', sp < 1 ? `setpts=PTS/${sp},minterpolate=fps=30:mi_mode=blend` : `setpts=PTS/${sp},fps=30`, '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dm], { maxBuffer: 1 << 26 });
    const alias = `${s.asset_id}__x${sp}`; src[alias] = { ...r0, a: { ...r0.a, mezzanine: dm, duration: (r0.a.duration ?? 0) / sp, srcmezz: r0.a.mezzanine } }; s.asset_id = alias;   // alias per speed: normal shots of the same asset keep the original mezzanine (2026-11-02 fix)
    s.src_in = s.src_in / sp; s.src_out = s.src_out / sp; s.mute_source = true; delete s.speed;
    note(`segment ${s.item}: timelapse speed x${sp} (derived mezzanine ${path.basename(dm)})`);
  }
  const unmutedExceptions: string[] = [];
  for (const [i, s] of cl.segments.entries()) {
    if (s.src_out - s.src_in < 0.8 && !(s.short_ok && s.src_out - s.src_in >= 0.3)) throw new Error(`segment ${i}: shorter than 0.8 s`);
    for (const k of ['pan_x', 'pan_y'] as const) if (s[k] != null && Math.abs(s[k]!) > 100) throw new Error(`segment ${i}: ${k}=${s[k]} — pan is in % of the canvas (−100…100)`);
    if (s.zoom != null && (s.zoom < 0.5 || s.zoom > 4)) throw new Error(`segment ${i}: zoom ${s.zoom} out of range 0.5–4`);
    if (s.src_out > (src[s.asset_id].a.duration ?? Infinity) + 0.05) throw new Error(`segment ${i}: src_out ${s.src_out} beyond source duration ${src[s.asset_id].a.duration}`);
    const conds = J.parse<string[]>(src[s.asset_id].usage_restrictions, []).map(c => c.toLowerCase()).filter(c => c.includes('strip source audio'));
    if (conds.length && !s.mute_source) {
      if (!conds.every(c => c.includes('except'))) throw new Error(`segment ${i}: rights conditions for ${s.asset_id} require mute_source: true`);
      unmutedExceptions.push(`segment ${i} (${s.asset_id} ${s.src_in}-${s.src_out}s) keeps source audio under condition "${conds[0]}" — QA must verify`);
    }
  }
  if (cl.end_hold != null && !(cl.end_hold >= 0 && cl.end_hold <= 3.5)) throw new Error(`end_hold ${cl.end_hold} out of range 0–3.5 s`);
  if (cl.cta && (cl.end_hold ?? 0) > 0) note(`cta overlay with end_hold ${cl.end_hold} s: the hold is a frozen frame (O-B1 wants the CTA over live picture; set end_hold 0 and extend the last segment instead)`, 'warn');
  if (!scratch) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, productionId);
  for (const u of unmutedExceptions) note(u, 'warn');
  note(`Build v${n} started — ${cl.segments.length} segments, rights gate passed for ${assets.length} source(s)`);

  /* 2. timeline layout */
  let t = 0;
  const segs = cl.segments.map(s => { const start = t; t += s.src_out - s.src_in; return { ...s, start, startF: 0, durF: 0 }; });
  let total = t;

  /* 3. narration: one TTS request → align → per-line clips */
  const narr: { id: string; file: string; at: number; dur: number; words: Word[] }[] = [];
  let wer: number | null = null;
  if (cl.narration?.lines?.length) {
    const lines = cl.narration.lines;
    const tts = await synthesize(lines.map(l => (l.say ?? l.text).trim()).join('\n\n'), cl.narration.voice ?? 'Charon', cl.narration.style, { productionId, cacheOnly: !!scratch });
    note(tts.cached ? 'Narration reused from cache (no quota used)' : `Narration generated (${tts.model})`);
    const alignOut = path.join(vdir, 'narration.align.json');
    fs.writeFileSync(path.join(vdir, 'narration.lines.json'), JSON.stringify(lines.map(l => ({ id: l.id, text: l.say ?? l.text }))));
    await withLock('gpu', agent, () => run(PY, ['-I', path.join(PYDIR, 'align.py'), tts.file, path.join(vdir, 'narration.lines.json'), alignOut], { maxBuffer: 1 << 26, timeout: 1800_000 }));
    const al = JSON.parse(fs.readFileSync(alignOut, 'utf8'));
    wer = al.wer;
    if (wer! > 0.12) note(`Narration WER ${(wer! * 100).toFixed(0)}% — TTS may have misspoken; QA must listen`, 'warn');
    let cursor = 0;
    for (const [i, l] of lines.entries()) {
      const a = al.lines[i];
      const s0 = Math.max(0, a.start - 0.06), s1 = Math.min(al.duration, a.end + 0.18);
      const file = path.join(vdir, `narr_${String(i).padStart(2, '0')}_${l.id.replace(/[^\w-]/g, '')}.wav`);
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', tts.file, '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', '-ar', '48000', '-ac', '2', file]);
      const cw: { w: string; s: number; e: number }[] = a.words.map((w: any) => ({ w: w.w, s: w.s - s0, e: w.e - s0 }));
      if (cl.narration.snap_onsets) { const rf = await refineNarrationWords(file, cw); note(`Line "${l.id}": ${rf.runs} speech run(s), ${rf.moved} word time(s) re-timed to the audio`); }
      let at = Math.max(l.at, cursor);
      if (at > l.at + 0.05) note(`Line "${l.id}" pushed ${(at - l.at).toFixed(2)} s later to avoid overlapping the previous line`, 'warn');
      let dur = s1 - s0, map = (t: number) => t;
      if (cl.narration.max_pause != null) {
        const sq = await squeezePauses(file, cl.narration.max_pause);
        map = sq.map; dur = sq.dur;
        note(`Line "${l.id}": ${sq.cuts} pause(s) squeezed to <= ${cl.narration.max_pause} s (-${(s1 - s0 - sq.dur).toFixed(2)} s), at ${at.toFixed(2)}, dur ${dur.toFixed(2)}, ends ${(at + dur).toFixed(2)}`);
      }
      cursor = at + dur + 0.1;
      narr.push({ id: l.id, file, at, dur, words: cw.map((w, wi: number) => ({ w: (l.say && l.text.split(/\s+/).length === l.say.split(/\s+/).length ? l.text.split(/\s+/)[wi] : null) ?? w.w, t0: at + map(w.s), t1: at + map(w.e) })) });
    }
    const end = Math.max(...narr.map(x => x.at + x.dur)) + 0.4;
    if (end > total) {
      const last = segs[segs.length - 1];
      const room = (src[last.asset_id].a.duration ?? last.src_out) - last.src_out;
      const need = end - total;
      if (need > room + 0.01) throw new Error(`narration ends at ${end.toFixed(1)} s but video is ${total.toFixed(1)} s and the last source has only ${room.toFixed(1)} s to spare — shorten lines or add footage`);
      last.src_out += need; total = end;
      note(`Extended the final shot by ${need.toFixed(2)} s so narration finishes on picture`);
    }
  }

  /* viral-rankings default (2026-10-31, F8): last spoken word to the end <= tail_max (target tail_max - 0.05, at least 0.2 s). The last segment is
     trimmed (or extended inside its source) to the measured speech end of the narration clips, so the final word is never cut. */
  if (cl.tail_max != null && narr.length && !cl.end_hold) {
    let spoken = 0;
    for (const x of narr) spoken = Math.max(spoken, x.at + await lastSpeech(x.file));
    const want = spoken + Math.max(0.2, cl.tail_max - 0.05), last = segs[segs.length - 1], lastStart = total - (last.src_out - last.src_in);
    const newOut = last.src_in + (want - lastStart), srcDur = src[last.asset_id].a.duration ?? last.src_out;
    if (Math.abs(want - total) > 0.02) {
      if (newOut - last.src_in < 0.8) note(`Tail: last word ends ${spoken.toFixed(2)} s but trimming to ${want.toFixed(2)} s would leave the last segment < 0.8 s - tail kept at ${(total - spoken).toFixed(2)} s`, 'warn');
      else if (newOut > srcDur + 0.01) note(`Tail: last word ends ${spoken.toFixed(2)} s, the last source has no room to reach ${want.toFixed(2)} s`, 'warn');
      else { note(`Tail: last word ends ${spoken.toFixed(2)} s; video ${total.toFixed(2)} -> ${want.toFixed(2)} s (tail ${(want - spoken).toFixed(2)} s <= ${cl.tail_max} s)`); last.src_out = newOut; total = want; }
    }
  }

  /* frame grid: every segment occupies a whole number of frames, back to back (a fractional frame leaves a
     1-frame transparent gap + an audio hole at the join). Captions and overlays use these exact starts. */
  {
    let f = 0;
    for (const s of segs) {
      s.durF = Math.max(1, Math.round((s.src_out - s.src_in) * fps));
      s.startF = f; s.start = f / fps; s.src_out = s.src_in + s.durF / fps;
      f += s.durF;
    }
    total = f / fps;
  }
  // end_hold: the timeline runs past the last word (frozen last frame + room tone); captions stop at the original end
  const holdF = Math.round((cl.end_hold ?? 0) * fps);
  const speechEnd = total;
  total += holdF / fps;
  if (cl.rank_layers) { cl.credit_line = undefined; cl.clip_credits = undefined; cl.texts = (cl.texts ?? []).filter(t => t.role !== 'credit'); }   // Podium Pop (viral-rankings, rank_layers): owner rule - NO credit/source plates on screen, ever
  if (cl.credit_line?.text) (cl.texts ??= []).push({ text: cl.credit_line.text, at: 0, dur: total, role: 'credit', font_px: cl.credit_line.font_px ?? 30, y: cl.credit_line.y, max_chars: cl.credit_line.max_chars });
  // viral-rankings defaults (2026-10-31): per-clip credit plates on the built frame grid; end CTA in the caption band (never over the subject)
  const pxY = (px: number) => +((px - H / 2) / H * 100).toFixed(2);
  const creditBoxes: { a: number; b: number; top: number }[] = [], ctaBoxes: { a: number; b: number; top: number }[] = [];
  if (cl.clip_credits?.lines?.length) {
    const cc = cl.clip_credits;
    for (const ln of cc.lines) {
      const sg = segs[ln.seg]; if (!sg || !ln.text?.trim()) continue;
      if (/owner-supplied/i.test(ln.text)) continue;   // owner 2026-11-01: no "Clip: owner-supplied" plate on screen (credit stays in the description)
      const h = wrap(ln.text, cc.max_chars).split('\n').length * cc.font_px * 1.08 + 10, cy = Math.min(cc.center_y_px, 1420 - h / 2);
      const a = sg.startF / fps, b = ln.seg === segs.length - 1 ? total : (sg.startF + sg.durF) / fps;
      (cl.texts ??= []).push({ text: ln.text, at: a, dur: b - a, role: 'credit', font_px: cc.font_px, y: pxY(cy), max_chars: cc.max_chars });
      creditBoxes.push({ a, b, top: cy - h / 2 });
    }
    note(`Per-clip credits: ${creditBoxes.length} plate(s), ${cc.font_px} px, centre y <= ${cc.center_y_px} px`);
  }
  if (cl.cta) { const r = placeEndCta(cl.cta, total, fps, (cl.texts ??= [])); cl.texts.push(r.item); for (const m of r.notes) note(m, 'warn'); note(`End CTA overlay "${r.item.text}" ${r.item.at.toFixed(2)}-${(r.item.at + r.item.dur).toFixed(2)} s over the live picture`); }
  if (cl.end_cta?.text) { const d = Math.min(cl.end_cta.dur, Math.max(0.5, total - 1)); (cl.texts ??= []).push({ text: cl.end_cta.text, at: +(total - d).toFixed(3), dur: d, role: 'cta' }); }
  if (cl.cta_band) for (const tx of (cl.texts ?? []).filter(x => x.role === 'cta')) {
    const end0 = Math.min(cl.target_duration ?? total, total);
    if (tx.at + tx.dur >= end0 - 0.5 || tx.at + tx.dur > total) { const d = Math.min(tx.dur, Math.max(0.5, total - 0.5)); tx.at = +(total - d).toFixed(3); tx.dur = d; }   // end CTA follows the real (tail-trimmed) end
    const fpx = ctaFontPx(tx.font_px), mc = ctaMaxChars(fpx, tx.max_chars);
    const h = wrap(tx.text, mc).split('\n').length * fpx * 1.08 + 26;
    const credTop = Math.min(1420, ...creditBoxes.filter(c => c.a < tx.at + tx.dur && tx.at < c.b).map(c => c.top));
    const bottom = Math.min(1400, credTop - 8);                     // caption band ends at y 1400 (packages/ranking/src/layout.ts VR.caption)
    tx.y = pxY(bottom - h / 2); tx.x = cl.caption_x ?? 0;
    ctaBoxes.push({ a: tx.at, b: tx.at + tx.dur, top: bottom - h });
    note(`CTA "${tx.text}" in the caption band: y ${Math.round(bottom - h)}-${Math.round(bottom)} px, ${tx.at.toFixed(2)}-${(tx.at + tx.dur).toFixed(2)} s`);
  }

  /* 3b. viral-rankings layers (title, rank rail, brand mark, flash, CTA) as full-canvas RGBA files + burned-in text zone check */
  let rankItems: import('../../ranking/src/layers.ts').LayerItem[] = [];
  let rankInfo: any = null;
  let oneHitAt: number | null = null;
  if (cl.rank_layers) {
    const L = await import('../../ranking/src/layers.ts');
    // empty rail at frame 0 (2026-10-31 default): the first revealed rank lights when the narration says "Number <N>" (else first_light_at / 0.3 s)
    let firstLightF: number | null = null;
    if (cl.rank_layers.empty_open && narr.length) {
      const R = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'], r0 = Number(cl.rank_layers.reveal_order[0]);
      const ws = narr.flatMap(x => x.words), nn = (w?: string) => String(w ?? '').toLowerCase().replace(/[^a-z0-9#]/g, '');
      const end0 = segs.find((s, k) => k > 0 && s.item !== segs[0].item)?.start ?? (segs.length > 1 ? segs[1].start : total);   // first reveal may span several segments (hook teaser)
      const i = ws.findIndex((w, k) => w.t0 < end0 && ((nn(w.w) === 'number' && [R[r0], String(r0)].includes(nn(ws[k + 1]?.w))) || nn(w.w) === `#${r0}`));
      if (i >= 0) firstLightF = Math.round(ws[i].t0 * fps);
    }
    const hs = cl.one_hit ? segs[cl.one_hit.seg] : null;
    oneHitAt = hs ? Math.max(hs.start, Math.min(hs.start + cl.one_hit!.rel, hs.start + hs.durF / fps - 0.3)) : null;
    const hit = hs && oneHitAt != null && cl.one_hit!.flash !== false ? { f: Math.round(oneHitAt * fps), rect: (hs.fit_box ?? [0, 0, W, H]) as [number, number, number, number], durF: Math.round((cl.one_hit!.flash_s ?? 0.4) * fps) } : null;
    const r = await L.renderRankLayers(cl.rank_layers, segs, Math.round(total * fps), fps, path.join(vdir, 'overlays'), W, H, { firstLightF, hit });
    rankItems = r.items; rankInfo = r.info;
    note(`Rank layers rendered: title "${r.info.title.lines.join(' / ')}" (${r.info.title.size}px), rail ${cl.rank_layers.n} slots × ${r.info.rail.length} states (reveals at ${r.starts.map(f => (f / fps).toFixed(2)).join(', ')} s), logo ${r.info.logo.kind}${cl.rank_layers.flash ? ', rank flashes' : ''}${cl.rank_layers.cta ? `, CTA at ${cl.rank_layers.cta.at}s` : ''}`);
    if (cl.rank_layers.empty_open) note(`Rail: ${cl.rank_layers.n} empty slots from 0.00 s, #${cl.rank_layers.reveal_order[0]} lights at ${(r.light0 / fps).toFixed(2)} s${firstLightF != null ? ' (spoken "Number")' : ' (default)'}`);
    if (hit) note(`#1 hit at ${oneHitAt!.toFixed(2)} s: punch + white flash ${(hit.durF / fps).toFixed(2)} s${cl.one_hit!.sting ? ' + sting' : ''}`);
    const z = await L.zoneCheck(segs, src, path.join(vdir, 'qa', 'zone_check.json'), cl.rank_layers.title_box ?? null, cl.rank_layers.style === 'v2' ? (await import('../../ranking/src/layout.ts')).vrRailRect(cl.rank_layers.title_layout) : null);
    if (z.pass) note('Zone check: no burned-in text detected under the rail / caption / title zones');
    else for (const w of z.warnings) note(`Zone check: ${w}`, 'warn');
  }

  /* 4. captions */
  // opt-in (2026-10-28 showrunner-planet-extremes): caption_fixes with asset_id "narration:<lineId>" edit/delete narration caption words (to: "" deletes; first remaining match of `from`, case/punctuation-insensitive; `at` ignored). Audio untouched.
  for (const f of (cl.caption_fixes ?? []).filter(f => f.asset_id.startsWith('narration:'))) {
    const nl = narr.find(x => x.id === f.asset_id.slice('narration:'.length));
    const nn = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
    const wi = nl ? nl.words.findIndex(w => nn(w.w) === nn(f.from)) : -1;
    if (wi < 0) { note(`caption_fixes: "${f.from}" not found in narration line ${f.asset_id}`, 'warn'); continue; }
    nl!.words[wi] = { ...nl!.words[wi], w: f.to };
  }
  for (const x of narr) x.words = x.words.filter(w => w.w.trim() !== '');
  let words: Word[] = [];
  if (cl.captions === 'narration') words = narr.flatMap(x => x.words);
  if (cl.captions === 'source' && cl.caption_words?.length) { words = cl.caption_words.map(x => ({ w: x.w, t0: x.t0, t1: x.t1 })); note(`Captions: ${words.length} explicit caption_words from the cutlist (transcript lookup skipped)`); }
  else if (cl.captions === 'source') {
    for (const s of segs) {
      const tp = src[s.asset_id].transcript_path;
      if (!tp || !fs.existsSync(tp)) throw new Error(`captions: "source" needs a transcript for ${s.asset_id} (source:analyze --transcribe)`);
      const tr = JSON.parse(fs.readFileSync(tp, 'utf8'));
      const segWords: any[] = [];
      for (const seg of tr.segments) for (const w of seg.words ?? []) {
        // a caption_timing override decides inclusion by its retimed midpoint (ASR words stretched over a pause sit outside the cut they belong to; mv-B2 2026-10-25)
        const ov = (cl.caption_timing ?? []).find(o => o.asset_id === s.asset_id && o.word === w.w && Math.abs(o.at - w.s) <= 0.3);
        const mid = ov ? ((ov.start ?? w.s) + (ov.end ?? w.e)) / 2 : (w.s + w.e) / 2;
        if (mid >= s.src_in && mid <= s.src_out) segWords.push({ ...w, s0: w.s });
      }
      if (cl.caption_onset_snap && segWords.length) await snapOnsets(src[s.asset_id].a.mezzanine as string, segWords, s.src_in, s.src_out);
      for (const o of cl.caption_timing ?? []) {
        if (o.asset_id !== s.asset_id) continue;
        const w = segWords.find(x => x.w === o.word && Math.abs(o.at - x.s0) <= 0.3);
        if (!w) continue;
        if (o.start != null) w.s = o.start;
        if (o.end != null) w.e = o.end;
        note(`Caption timing override: "${o.word}" @${o.at} -> ${w.s.toFixed(3)}-${w.e.toFixed(3)}`);
      }
      for (const w of segWords) {
        const fx = (cl.caption_fixes ?? []).find(f => f.asset_id === s.asset_id && f.from === w.w && Math.abs(f.at - (w.s0 ?? w.s)) <= 0.3);
        if (fx?.s != null) w.s = Math.min(fx.s, w.e - 0.05);
        if (fx) w.w = fx.to;
      }
      for (const w of segWords) words.push({ w: w.w, t0: s.start + Math.max(0, w.s - s.src_in), t1: s.start + Math.min(s.src_out - s.src_in, w.e - s.src_in) });
    }
  }
  // caption_fixes with to: "" delete a word from the captions (e.g. an ASR echo); the page then starts at the next real word
  words = words.filter(w => w.w.trim() !== '');
  if (cl.caption_clean) { const before = words.length; words = cleanWords(words); note(`Caption clean-up removed ${before - words.length} filler/repeated words (audio untouched)`); }
  // opt-in (cutlist caption_per_line, 2026-10-28 showrunner-planet-extremes): page each narration line on its own so min-page merges never cross a ranking entry ("METERS THREE")
  const capChars = cl.caption_max_chars ?? 16;
  const pages = cl.captions && cl.captions !== 'none' ? (cl.caption_per_line && cl.captions === 'narration' ? narr.flatMap(x => pageCaptions(x.words, 3, capChars, cl.caption_min_page ?? 0, cl.caption_keep ?? [], !!cl.caption_no_cross)) : pageCaptions(words, 3, capChars, cl.caption_min_page ?? 0, cl.caption_keep ?? [], !!cl.caption_no_cross)) : [];
  for (const c of cl.caption_clip ?? []) { const pg = pages.find(p => Math.abs(p.t0 - c.at) <= 0.3); if (!pg) continue; if (c.text != null) pg.text = c.text.toUpperCase(); if (c.t0 != null) pg.t0 = c.t0; if (c.t1 != null) pg.t1 = c.t1; if (c.max != null && pg.t1 - pg.t0 > c.max) pg.t1 = pg.t0 + c.max; }
  for (let i = pages.length - 1; i >= 0; i--) if (!pages[i].text.trim()) pages.splice(i, 1);   // caption_clip text:"" deletes a page (e.g. one that duplicates the hook overlay)
  // the last page gets +0.3 s after its word; never let it run past the picture (it extended the timeline onto the transparent canvas)
  // with end_hold the last page stops at the original end (+0.15 s), never over the hold
  if (pages.length) pages[pages.length - 1].t1 = Math.min(pages[pages.length - 1].t1, holdF ? speechEnd + 0.15 : total);
  // 2026-10-31 (showrunner-viral-rankings): per-line narration pages from adjacent lines may overlap by tens of ms (clip tail pad); clamp each page end to the next page start
  if (cl.caption_per_line && cl.captions === 'narration') pages.sort((x, y) => x.t0 - y.t0).forEach((pg, i, arr) => { if (arr[i + 1] && arr[i + 1].t0 < pg.t1 && arr[i + 1].t0 > pg.t0 + 0.05) pg.t1 = arr[i + 1].t0; });
  // viral-rankings default (2026-10-31, F7): frame-0 text - the first caption page starts at 0.00 s when it starts within 1 s
  if (cl.caption_start_zero && pages.length) {
    const p0 = pages.reduce((a, b) => (a.t0 <= b.t0 ? a : b));
    if (p0.t0 > 0 && p0.t0 <= 1.0) { note(`First caption "${p0.text}" moved ${p0.t0.toFixed(2)} -> 0.00 s (frame-0 text)`); p0.t0 = 0; }
    else if (p0.t0 > 1.0) note(`First caption starts at ${p0.t0.toFixed(2)} s - too late for frame-0 text; start the hook line at <= 0.2 s`, 'warn');
  }
  fs.writeFileSync(path.join(vdir, 'captions.json'), JSON.stringify(pages, null, 1));
  fs.writeFileSync(path.join(vdir, 'captions.srt'), pages.map((p, i) => { const ts = (x: number) => new Date(x * 1000).toISOString().slice(11, 23).replace('.', ','); return `${i + 1}\n${ts(p.t0)} --> ${ts(p.t1)}\n${p.text}\n`; }).join('\n'));

  /* 5. timeline: the builder's edit calls (same shape as the old OpenChatCut MCP calls) are recorded into timeline.json */
  const ed = new TimelineRecorder(W, H, fps);
  const rec = ed;
  try {
    note('Engine: ffmpeg compositor (edit recorded to timeline.json)');
    const session = async (label: string, fn: (id: string) => Promise<void>) => {
      const s = await ed.call('begin_edit_session', {});
      await fn(s.editSessionId);
      await ed.call('review_edit_session', { editSessionId: s.editSessionId, summary: label });
      note(`Timeline: ${label} ✓`);
    };

    // Step A: tracks, media. Large working copies (long recordings) are cut to the windows we use (plus 2 s handles), cached by source + window.
    const segMedia: SegMedia[] = [];
    const contiguous = (a?: Segment, b?: Segment) => !!a && !!b && a.asset_id === b.asset_id && !a.mute_source && !b.mute_source && Math.abs(a.src_out - b.src_in) < 0.05;
    for (const [i, s] of segs.entries()) segMedia.push(await windowFor(src[s.asset_id], s, { in: i > 0 && !contiguous(segs[i - 1], s), out: i < segs.length - 1 && !contiguous(s, segs[i + 1]), tail: i === segs.length - 1 }));
    if (holdF) {
      const k = segs.length - 1;
      segMedia[k] = await holdWindow(src[segs[k].asset_id], segs[k], segMedia[k], holdF, fps);
      note(`End hold: last frame held ${(holdF / fps).toFixed(2)} s after the last word, ${segMedia[k].roomTone}`);
    }
    segMedia.forEach((m, i) => {
      if (m.cropped) note(`Segment ${i}: cropped to the real picture (${m.width}x${m.height}), removing baked-in borders`);
      if (m.leveled) note(`Segment ${i}: source audio levelled to -16 LUFS to sit with the narration`);
    });
    const accents = (cl as any).bed_accents as number[] | undefined
      ?? (cl.texts ?? []).filter(tx => ['rank', 'label', 'title'].includes(tx.role ?? '')).map(tx => tx.at);
    const bedFile = cl.bed === 'tone' ? await toneBed(total, path.join(vdir, 'bed_tone.wav'), accents) : null;
    // #1 sting (viral-rankings default): own synthesized SFX (packages/quiz/py/synth_hook_sfx.py, seeded numpy, no samples), regenerated when missing
    let stingFile: string | null = null, stingF = 0;
    if (oneHitAt != null && cl.one_hit?.sting) {
      stingFile = path.resolve(P.root, cl.one_hit.sting);
      if (!fs.existsSync(stingFile) && /^hook_\w+\.wav$/.test(path.basename(stingFile))) await run(PY, ['-I', path.join(P.root, 'packages', 'quiz', 'py', 'synth_hook_sfx.py'), path.dirname(stingFile)]);
      if (!fs.existsSync(stingFile)) throw new Error(`one_hit sting missing: ${stingFile}`);
      const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', stingFile]);
      stingF = Math.max(1, Math.min(Math.round(parseFloat(String(stdout)) * fps), Math.round(total * fps) - F(oneHitAt, fps)));   // never past the picture (blank tail)
    }
    const insMedia: SegMedia[] = [];
    for (const x of cl.inserts ?? []) insMedia.push(await windowFor(src[x.asset_id], { asset_id: x.asset_id, src_in: x.src_in, src_out: x.src_in + x.dur, mute_source: true }));
    const media = [...new Set([...segMedia, ...insMedia].map(m => m.file)), ...narr.map(x => x.file), ...(cl.music ? [src[cl.music.asset_id].a.mezzanine] : []), ...(bedFile ? [bedFile] : []), ...(stingFile ? [stingFile] : []), ...rankItems.map(x => x.file)];
    // Items on one track can't overlap, so overlapping overlays get their own lanes.
    const overlayLanes: number[][] = [];
    const laneOf: number[] = [];
    (cl.texts ?? []).map((tx, i) => ({ i, a: tx.at, b: tx.at + tx.dur })).sort((x, y) => x.a - y.a).forEach(({ i, a, b }) => {
      let k = overlayLanes.findIndex(l => l.every(j => { const o = cl.texts![j]; return o.at + o.dur <= a + 1e-3 || o.at >= b - 1e-3; }));
      if (k < 0) { overlayLanes.push([]); k = overlayLanes.length - 1; }
      overlayLanes[k].push(i); laneOf[i] = k;
    });
    const tracks: Record<string, string> = {};
    // media are addressed by content (sha256 -> absolute file path)
    const poolBySha: Record<string, string> = {};
    const rankTracks = rankItems.length ? [...new Set(rankItems.map(x => x.track))] : [];
    await session('Prepare tracks and import media', async id => {
      const tl0 = await ed.call('read_timeline', { editSessionId: id });
      if (!Array.isArray(tl0?.items)) throw new Error('could not read the current timeline (unexpected read_timeline shape)');
      if (tl0.items.length) { await ed.call('clear_timeline', { editSessionId: id }); note(`Cleared ${tl0.items.length} items from the previous version`); }
      // read_timeline omits track names; edit_track list has them ({result:[...]}). Aliases renumber when tracks are
      // inserted, so tracks are always addressed by name/id: "Picture" (the original V1), "Background" under it, overlays above.
      const list = async () => { const l = await ed.call('edit_track', { editSessionId: id, action: 'list' }); return (l?.result ?? l?.tracks ?? []) as any[]; };
      let allTracks = await list();
      const byName = (n: string) => allTracks.find(tr => tr.name === n)?.id as string | undefined;
      if (!byName('Picture')) {
        const v1 = allTracks.find(tr => tr.alias === 'V1' && tr.trackType === 'video') ?? allTracks.find(tr => tr.id === 'track_v1');
        if (!v1) throw new Error('no V1 video track to use as the picture track');
        await ed.call('edit_track', { editSessionId: id, action: 'update', trackId: v1.id, json: JSON.stringify({ name: 'Picture' }) });
      }
      // backgroundFill (blurred 9:16 fill) only works on the bottom video track, so nothing may sit under Picture.
      if (byName('Background')) await ed.call('edit_track', { editSessionId: id, action: 'delete', trackId: byName('Background') });
      allTracks = await list();
      tracks.V1 = byName('Picture')!;
      const want: [string, 'video' | 'audio'][] = [...((cl.inserts?.length ? [['Inserts', 'video']] : []) as [string, 'video'][]), ...rankTracks.map(n => [n, 'video'] as [string, 'video']), ...overlayLanes.map((_, k) => [`Overlays ${k + 1}`, 'video'] as [string, 'video']), ['Captions', 'video'], ['Narration', 'audio'], ['Music', 'audio'], ...((stingFile ? [['SFX', 'audio']] : []) as [string, 'audio'][])];
      // inserts must sit BELOW overlays/captions: when the Inserts track is (or may be) older than the text tracks, drop the empty text tracks so they are recreated above it
      // same for viral-rankings layer tracks: when one is missing, recreate the text/audio tracks above them (rank layers sit under overlays/captions)
      if ((cl.inserts?.length && byName('Inserts')) || rankTracks.some(nm => !byName(nm))) {
        for (const tr of allTracks.filter(x => /^(Overlays \d+|Captions|Narration|Music)$/.test(x.name ?? ''))) await ed.call('edit_track', { editSessionId: id, action: 'delete', trackId: tr.id });
        allTracks = await list();
      }
      for (const [name, type] of want) {
        const have = byName(name);
        if (have) { tracks[name] = have; continue; }
        const r = await ed.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: type, name }) });
        tracks[name] = r.created?.[0]?.id;
      }
      if (!tracks.V1) throw new Error('track setup failed (Picture track missing)');
      // the asset id IS the file
      Object.assign(poolBySha, Object.fromEntries(media.map(f => [shaOfFileSync(f), path.resolve(f)])));
    });
    const pid = (file: string) => { const id = poolBySha[shaOfFileSync(file)]; if (!id) throw new Error(`imported media not found in pool: ${path.basename(file)}`); return id; };

    // Step B: picture
    await session('Lay down the picture edit', async id => {
      const r = await ed.call('edit_item', { editSessionId: id, adds: segs.map((s, i) => ({ type: 'video', assetId: pid(segMedia[i].file), trackId: tracks.V1, fromFrame: s.startF,
        sourceStartFrame: Math.round((s.src_in - segMedia[i].offset) * fps), sourceDurationInFrames: s.durF + (i === segs.length - 1 ? holdF : 0) })) });
      checked(r, 'picture adds');
      const ids: string[] = r.results.map((x: any) => x.placed?.itemId);
      const base = (i: number) => { const s = segs[i]; const sw = segMedia[i].width, sh = segMedia[i].height;
        const fill = s.fill === 'contain' ? 'blur' : s.fill ?? (sw > sh ? 'blur' : 'cover');  // 'contain' would expose transparent canvas
        return (fill === 'cover' ? Math.max(W / sw, H / sh) / Math.min(W / sw, H / sh) : 1) * (s.zoom ?? 1); };
      const updates = segs.map((s, i) => {
        const sw = src[s.asset_id].a.width ?? 1920, sh = src[s.asset_id].a.height ?? 1080;
        const cover = Math.max(W / sw, H / sh) / Math.min(W / sw, H / sh);
        const fill = s.fill === 'contain' ? 'blur' : s.fill ?? (sw > sh ? 'blur' : 'cover');  // 'contain' would expose transparent canvas
        // fit_box (viral-rankings): contain the (cropped) picture in a canvas rect; scale 1 = contain-fit to the canvas, x/y = % of canvas
        const fb = s.fit_box && fill === 'blur' ? (() => { const [x0, y0, x1, y1] = s.fit_box!; const mw = segMedia[i].width, mh = segMedia[i].height;
          const k = Math.min(W / mw, H / mh); return { scale: Math.min((x1 - x0) / (mw * k), (y1 - y0) / (mh * k)), x: ((x0 + x1) / 2 - W / 2) / W * 100, y: ((y0 + y1) / 2 - H / 2) / H * 100 }; })() : null;
        return { type: 'video', itemId: ids[i], volume: s.mute_source ? 0 : (s.volume ?? 1),
          ...(fill === 'blur' ? { backgroundFill: true, backgroundFillStrength: 70 } : {}),
          transform: fb ?? { scale: base(i), ...(s.pan_x != null ? { x: s.pan_x } : {}), ...(s.pan_y != null ? { y: s.pan_y } : {}) },
          ...(s.punch && fb && !segMedia[i].punched ? { keyframes: punchKeys(s.punch, fb, segMedia[i], fps, W, H, F(s.src_out - s.src_in, fps)) } : {}),
          // punch stages on a full-bleed cover segment (2026-10-31): scale keyframes; the picture already fills the canvas, so nothing can bleed
          ...(fill === 'cover' && !fb && punchStagesOf(s).length ? { keyframes: { scale: (() => {
            const d = F(s.src_out - s.src_in, fps), b0 = base(i), out: { frame: number; value: number; easing?: string }[] = [{ frame: 0, value: +b0.toFixed(4), easing: 'linear' }];
            const K = punchKeysOf(punchStagesOf(s));
            K.forEach(([t, z], k) => { const fr = Math.min(d - 1, Math.max(out[out.length - 1].frame + 1, Math.round(t * fps)));
              if (fr > out[out.length - 1].frame) out.push({ frame: fr, value: +(b0 * z).toFixed(4), easing: k + 1 < K.length && Math.abs(K[k + 1][1] - z) > 1e-6 ? 'easeInOut' : 'linear' }); });
            return out; })() } } : {}),
          ...(s.motion ? { keyframes: { scale: [{ frame: 0, value: s.motion === 'push' ? (fb?.scale ?? base(i)) : (fb?.scale ?? base(i)) * 1.08, easing: 'easeInOut' },
            { frame: Math.max(1, F(s.src_out - s.src_in, fps) - 1), value: s.motion === 'push' ? (fb?.scale ?? base(i)) * 1.08 : (fb?.scale ?? base(i)) }] } } : {}) };
      });
      checked(await ed.call('edit_item', { editSessionId: id, updates }), 'picture framing updates');
    });

    // Step B2: B-roll inserts (muted picture over the speaker; speech continues on the Picture track)
    if (cl.inserts?.length) await session('Lay B-roll inserts', async id => {
      const r = await ed.call('edit_item', { editSessionId: id, adds: cl.inserts!.map((x, i) => ({ type: 'video', assetId: pid(insMedia[i].file), trackId: tracks.Inserts, fromFrame: F(x.at, fps),
        sourceStartFrame: Math.round((x.src_in - insMedia[i].offset) * fps), sourceDurationInFrames: F(x.dur, fps) })) });
      checked(r, 'insert adds');
      const ids: string[] = r.results.map((y: any) => y.placed?.itemId);
      const updates = cl.inserts!.map((x, i) => {
        const sw = insMedia[i].width, sh = insMedia[i].height;
        const cover = Math.max(W / sw, H / sh) / Math.min(W / sw, H / sh);
        return { type: 'video', itemId: ids[i], volume: 0, transform: { scale: cover * (x.zoom ?? 1), ...(x.pan_x != null ? { x: x.pan_x } : {}), ...(x.pan_y != null ? { y: x.pan_y } : {}) } };
      });
      checked(await ed.call('edit_item', { editSessionId: id, updates }), 'insert framing updates');
    });

    // Step B3 (viral-rankings): title / rank rail / brand mark / flash / CTA — full-canvas RGBA layers placed 1:1 (no transform)
    // overlay clearance (owner 2026-11-08): caption band, rail plate and subscribe badge go where they hide the least of the subject (measured on the picture as framed)
    if (cl.rank_layers && cl.overlay_clearance && rankInfo) {
      const L = await import('../../ranking/src/layers.ts');
      const c = await L.overlayClearance({ timeline: await ed.toTimeline(), outDir: path.join(vdir, 'qa'), fps, rl: cl.rank_layers, cfg: cl.overlay_clearance, items: rankItems, railInfo: rankInfo.rail, ranges: cl.caption_y_ranges ?? [], pages, fontPx: cl.caption_font_px ?? STYLE.caption.fontSize * 0.5625, maxChars: cl.caption_max_chars ?? STYLE.caption.maxChars, captionX: cl.caption_x ?? 0, wrap, texts: cl.texts ?? [], payoffs: (cl.ranking?.entries ?? []).flatMap((e: any) => { const pm = e.payoff_ms; if (pm == null) return []; const s = segs.find(x => Number(x.item) === e.rank_position && pm / 1000 >= x.src_in && pm / 1000 <= x.src_out); return s ? [s.start + (pm / 1000 - s.src_in) / (s.speed ?? 1)] : []; }) });
      cl.caption_y_ranges = c.ranges;
      for (const n of c.notes) note(n);
    }

    if (rankItems.length) await session(`Lay ${rankItems.length} rank layers (title, rail, brand)`, async id => {
      const r = await ed.call('edit_item', { editSessionId: id, adds: rankItems.map(x => ({ type: x.kind, assetId: pid(x.file), trackId: tracks[x.track], fromFrame: x.fromF, durationInFrames: x.durF })) });
      checked(r, 'rank layer adds');
      const vids = rankItems.map((x, k) => ({ x, id: r.results[k]?.placed?.itemId })).filter(v => v.x.kind === 'video' && v.id);
      if (vids.length) checked(await ed.call('edit_item', { editSessionId: id, updates: vids.map(v => ({ type: 'video', itemId: v.id, volume: 0 })) }), 'rank layer mute');
      // style v2 (2026-11-04): rail reveal slide-ins carry item-local x keyframes
      const kfs = rankItems.map((x, k) => ({ x, id: r.results[k]?.placed?.itemId })).filter(v => v.x.keyframes && v.id);
      if (kfs.length) checked(await ed.call('edit_item', { editSessionId: id, updates: kfs.map(v => ({ type: v.x.kind, itemId: v.id, keyframes: v.x.keyframes })) }), 'rank layer motion');
      const moved = rankItems.map((x, k) => ({ x, id: r.results[k]?.placed?.itemId })).filter(v => v.x.transform && v.id);   // overlay clearance: plate / badge moved off the subject
      if (moved.length) checked(await ed.call('edit_item', { editSessionId: id, updates: moved.map(v => ({ type: v.x.kind, itemId: v.id, transform: v.x.transform })) }), 'rank layer clearance');
    });

    // Step C0 (2026-11-02, QA: credits on hair/faces): a credit without an explicit y goes to the quietest free band of the top safe area,
    // measured on the picture under it and never on another text shown at the same time (packages/occ/src/safezone.ts)
    for (const tx of (cl.texts ?? []).filter(t => t.role === 'credit' && t.y == null)) {
      const fpx = tx.font_px ?? STYLE.credit.fontSize * 0.5625, hPx = wrap(tx.text, tx.max_chars ?? STYLE.credit.maxChars).split('\n').length * fpx * 1.08 + 12;
      const a = tx.at, b = Math.min(total, tx.at + tx.dur);
      const times = Array.from({ length: 4 }, (_, k) => a + (b - a) * (k + 0.5) / 4);
      const frames = times.flatMap(t => {
        const i = segs.findIndex(s => t >= s.start && t < s.start + s.durF / fps);
        if (i < 0) return [];
        const s = segs[i], sw = segMedia[i].width, sh = segMedia[i].height;
        const fill: 'cover' | 'blur' = (s.fill === 'contain' ? 'blur' : s.fill ?? (sw > sh ? 'blur' : 'cover')) === 'cover' ? 'cover' : 'blur';
        return [{ file: segMedia[i].file, t: s.src_in - segMedia[i].offset + (t - s.start), fill }];
      });
      const blocked = (cl.texts ?? []).filter(o => o !== tx && o.at < b && a < o.at + o.dur).map(o => {
        const st = STYLE[o.role ?? 'label'] ?? STYLE.label, fs0 = o.font_px ?? st.fontSize * 0.5625;
        const h = wrap(o.text, o.max_chars ?? st.maxChars).split('\n').length * fs0 * 1.08 + (st.bg ? 16 : 0), cy = H / 2 + (o.y ?? st.y) / 100 * H;
        return { y0: cy - h / 2, y1: cy + h / 2 };
      });
      if (cl.rank_layers) blocked.push({ y0: 0, y1: (cl.rank_layers.title_box?.[3] ?? 585) + 8 });   // viral-rankings title band (layout.ts VR.title)
      for (const r of cl.caption_y_ranges ?? [{ from: 0, to: 1e9, y: STYLE.caption.y }]) if (r.from < b && a < r.to) { const cy = H / 2 + r.y / 100 * H, h = 2 * (cl.caption_font_px ?? STYLE.caption.fontSize * 0.5625) * 1.05; blocked.push({ y0: cy - h / 2, y1: cy + h / 2 }); }
      const { placeCredit } = await import('./safezone.ts');
      const pc = await placeCredit({ heightPx: hPx, frames, blocked, W, H });
      if (pc.y != null) { tx.y = pc.y; note(`Credit "${tx.text.slice(0, 40)}" placed in the free band y ${pc.y} % (edge energy per band ${pc.energy.join('/')})`); }
      else note(`Credit "${tx.text.slice(0, 40)}": every top band is taken by other text, default y kept`, 'warn');
    }

    // Step C: overlays + captions (text items, editable in timeline.json)
    const textAdds: { spec: any; props: any; trackId: string }[] = [];
    const cutFrames = segs.map(s => s.startF).concat(Math.round(total * fps));
    // Overlay handovers: an overlay ending ≤3 frames before another overlay starts is extended to meet it (no blink between cards).
    const ovStarts = (cl.texts ?? []).map(t => snapToCutF(F(t.at, fps)));
    function snapToCutF(f: number) { const c = cutFrames.find(x => Math.abs(x - f) <= 2); return c ?? f; }
    const snapToCut = (f: number, overlay = false) => {
      const g = snapToCutF(f);
      if (!overlay) return g;
      const next = ovStarts.filter(s => s > g && s - g <= 3).sort((p, q) => p - q)[0];
      // never carry a card across a picture cut: a card ending on (or just before) a cut belongs to that shot
      if (next == null || cutFrames.some(c => c >= g && c <= next)) return g;
      return next;
    };
    const plateA = Math.min(0.95, Math.max(0.3, cl.caption_bg_alpha ?? 0.55));
    for (const [ti, tx] of (cl.texts ?? []).entries()) {
      const st0 = STYLE[tx.role ?? 'label'] ?? STYLE.label;
      const st = { ...st0, ...(tx.font_px ? { fontSize: Math.round(tx.font_px / 0.5625) } : {}), ...(tx.max_chars ? { maxChars: tx.max_chars } : {}) };
      textAdds.push({ trackId: tracks[`Overlays ${laneOf[ti] + 1}`], spec: { text: wrap(tx.text, st.maxChars), at: tx.at, dur: tx.dur, y: tx.y ?? st.y, x: tx.x, st, overlay: true },
        props: { textShadow: OUTLINE, lineHeight: 1.08, ...(st.bg ? (tx.role === 'credit'
          ? { bgEnabled: true, bgColor: `rgba(0,0,0,${plateA})`, bgRadius: 12, bgPaddingX: 24, bgPaddingY: 8, bgBorder: 'none', textShadow: 'none' }  // distinct from captions
          : tx.role === 'cta'
          ? { bgEnabled: true, bgColor: 'rgba(220,38,38,0.95)', bgRadius: 22, bgPaddingX: 40, bgPaddingY: 14, bgBorder: 'none' }
          : { bgEnabled: true, bgColor: 'rgba(124,92,255,0.92)', bgRadius: 22, bgPaddingX: 40, bgPaddingY: 14, bgBorder: 'none' }) : {}) } });
    }
    const emph = (cl.emphasis ?? []).map(e => e.toUpperCase());
    // caption_font_px / caption_max_chars / caption_x: opt-in (viral-rankings), defaults unchanged for other brands
    const capSt = { ...STYLE.caption, ...(cl.caption_font_px ? { fontSize: Math.round(cl.caption_font_px / 0.5625) } : {}), ...(cl.caption_max_chars ? { maxChars: cl.caption_max_chars } : {}) };
    for (const p of pages) {
      const hot = emph.some(e => p.text.includes(e));
      const wordsOf = p.text.toUpperCase().split(/\s+/).map((w: string) => w.replace(/[^A-Z0-9']/g, ''));
      const mapHit = Object.entries(cl.emphasis_map ?? {}).find(([w]) => wordsOf.includes(w.replace(/[^A-Z0-9']/g, '')));
      // per-word accents (<= 2 keywords) when the page has other words too; a one-word page is coloured whole
      const accents = mapHit && wordsOf.length > 1 ? Object.fromEntries(Object.entries(cl.emphasis_map ?? {}).filter(([w]) => wordsOf.includes(w.replace(/[^A-Z0-9']/g, ''))).slice(0, 2).map(([w, c]) => [w.replace(/[^A-Z0-9']/g, ''), c])) : null;
      const capAt = cl.overlay_clearance ? p.t1 - 0.01 : p.t0;   // overlay clearance: a page running across a cut belongs to the entry it ends in (35p5: the pill sat on the rider after the cut)
      let capY = (cl.caption_y_ranges ?? []).find(r => capAt >= r.from && capAt < r.to)?.y ?? STYLE.caption.y;
      const ctaHit = ctaBoxes.find(c => c.a < p.t1 && p.t0 < c.b);   // viral-rankings: a caption page under the end CTA sits right above it
      if (ctaHit) { const ch = wrap(p.text, capSt.maxChars).split('\n').length * capSt.fontSize * 0.5625 + 18; capY = Math.min(capY, pxY(ctaHit.top - 40 - ch / 2)); }
      textAdds.push({ trackId: tracks.Captions, spec: { text: wrap(p.text, capSt.maxChars), at: p.t0, dur: p.t1 - p.t0, y: capY, x: cl.caption_x, st: mapHit ? { ...capSt, ...(accents ? {} : { color: mapHit[1] }), fontSize: Math.round(capSt.fontSize * 164 / 150) } : hot ? { ...capSt, color: '#fde047', fontSize: Math.round(capSt.fontSize * 164 / 150) } : capSt }, props: { textShadow: OUTLINE, lineHeight: 1.0, ...(accents ? { accent: accents } : {}), ...(cl.caption_bg ? (cl.caption_style === 'v2' ? { ...CAPTION_PILL_V2, ...(((cl as any).caption_solid ?? []) as { from: number; to: number }[]).some(r => p.t0 < r.to && p.t1 > r.from) ? { bgColor: 'rgba(11,15,28,0.97)' } : {} } : { bgEnabled: true, bgColor: `rgba(0,0,0,${plateA})`, bgRadius: 18, bgPaddingX: 28, bgPaddingY: 8, bgBorder: 'none' }) : {}) } });
    }
    if (textAdds.length) await session(`Add ${cl.texts?.length ?? 0} overlays and ${pages.length} caption pages`, async id => {
      for (let i = 0; i < textAdds.length; i += 40) {
        const batch = textAdds.slice(i, i + 40);
        const r = await ed.call('edit_item', { editSessionId: id, adds: batch.map(({ spec, trackId }) => {
          // Overlays that start/end within 2 frames of a picture cut snap to it (no 1-frame text lead/lag at cuts).
          const a = snapToCut(F(spec.at, fps)), b = snapToCut(F(spec.at + spec.dur, fps), !!spec.overlay);
          return { type: 'text', text: spec.text, name: spec.text.slice(0, 24), trackId, fromFrame: a,
            durationInFrames: Math.max(4, b - a), fontSize: spec.st.fontSize, fontWeight: spec.st.fontWeight, color: spec.st.color ?? '#ffffff', align: 'center' };
        }) });
        const ids: string[] = r.results.map((x: any) => x.placed?.itemId);
        await ed.call('edit_item', { editSessionId: id, updates: batch.map(({ spec }, k) => ({ type: 'text', itemId: ids[k], transform: { y: spec.y, ...(spec.x != null ? { x: spec.x } : {}) } })) });
        for (const [k, b] of batch.entries()) {
          try { await ed.call('update_item_props', { editSessionId: id, itemId: ids[k], props: b.props }); }
          catch (e: any) { if (i === 0 && k === 0) note(`Text style props not accepted (${String(e.message).slice(0, 120)}) — using defaults`, 'warn'); }
        }
      }
    });

    // Step D: sound
    if (narr.length || cl.music || bedFile || stingFile) await session('Add narration, music and ambience', async id => {
      const adds: any[] = narr.map(x => ({ type: 'audio', assetId: pid(x.file), trackId: tracks.Narration, fromFrame: F(x.at, fps) }));
      if (bedFile) adds.push({ type: 'audio', assetId: pid(bedFile), trackId: tracks.Music, fromFrame: 0 });
      const bedIdx = bedFile ? adds.length - 1 : -1;
      const stingIdx = stingFile ? adds.push({ type: 'audio', assetId: pid(stingFile), trackId: tracks.SFX, fromFrame: Math.max(0, F(oneHitAt! - 0.02, fps)), durationInFrames: stingF }) - 1 : -1;
      if (cl.music) adds.push({ type: 'audio', assetId: pid(src[cl.music.asset_id].a.mezzanine), trackId: tracks.Music, fromFrame: 0, durationInFrames: F(total, fps) });
      const r = await ed.call('edit_item', { editSessionId: id, adds });
      if (bedIdx >= 0 && cl.bed_dips?.length) {
        const bid = r.results[bedIdx]?.placed?.itemId;
        const ramp = Math.round(0.12 * fps), keys: { frame: number; value: number }[] = [{ frame: 0, value: 1 }];
        for (const d of [...cl.bed_dips].sort((a, b) => a.at - b.at)) {
          const f0 = F(d.at, fps), f1 = F(d.at + d.dur, fps), g = +(10 ** (d.db / 20)).toFixed(4);
          keys.push({ frame: Math.max(keys.at(-1)!.frame + 1, f0 - ramp), value: 1 }, { frame: Math.max(keys.at(-1)!.frame + 2, f0), value: g }, { frame: f1, value: g }, { frame: f1 + ramp, value: 1 });
        }
        checked(await ed.call('edit_item', { editSessionId: id, updates: [{ type: 'audio', itemId: bid, keyframes: { volume: keys } }] }), 'bed dips');
        note(`Bed dips: ${cl.bed_dips.map(d => `${d.db} dB @ ${d.at}s`).join(', ')}`);
      }
      if (stingIdx >= 0) {
        checked(await ed.call('edit_item', { editSessionId: id, updates: [{ type: 'audio', itemId: r.results[stingIdx]?.placed?.itemId, volume: cl.one_hit?.sting_volume ?? 0.8 }] }), 'sting volume');
        note(`#1 sting at ${oneHitAt!.toFixed(2)} s (${path.basename(stingFile!)}, volume ${cl.one_hit?.sting_volume ?? 0.8})`);
      }
      if (cl.music) {
        const mid = r.results[r.results.length - 1]?.placed?.itemId;
        await ed.call('edit_item', { editSessionId: id, updates: [{ type: 'audio', itemId: mid, volume: cl.music.volume ?? 0.12, fadeInSeconds: 0.5, fadeOutSeconds: 1.2 }] });
      }
    });
  } finally {
    await ed.close();
  }
  // the recorded edit = a plain, editable timeline; this version re-renders from it alone (npm run -s cli -- render:timeline <file> <out>)
  const timeline = await rec.toTimeline({ production_id: productionId, version: n, builder: 'packages/occ/src/build.ts', agent });
  for (const m of ((timeline.meta?.overlay_tidy ?? []) as string[]).slice(0, 12)) note(`Overlay tidy: ${m}`);
  { fs.writeFileSync(path.join(vdir, 'timeline.json'), JSON.stringify(timeline, null, 1)); note(`timeline.json written (${timeline.tracks.reduce((a, t) => a + t.items.length, 0)} items on ${timeline.tracks.length} tracks, ${timeline.durationInFrames} frames)`); }

  const report: any = { version: n, engine: 'ffmpeg', duration: total, segments: segs.length, narration_lines: narr.length, narration_wer: wer, caption_pages: pages.length, log };
  if (scratch) return { ...report, version: null, scratch, timeline: path.join(vdir, 'timeline.json') };   // dry build: nothing recorded, nothing rendered
  db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET captions_path=excluded.captions_path`)
    .run(productionId, n, path.join(vdir, 'captions.srt'), J.str(report));
  db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, productionId);
  if (rk && cl.ranking) {
    const ids = rk.recordBuildUsage(productionId, n, cl.ranking.entries, segs, fps);
    note(`Moment usage: ${ids.length} row(s) recorded for v${n} (in_draft); moments marked used_in_draft`);
    report.moment_usage_ids = ids;
  }
  if (opts.skipRender) return report;

  /* 6. render (packages/render ffmpeg compositor) → loudness master → technical QA */
  const raw = path.join(vdir, 'render.raw.mp4');
  // One render at a time: renders saturate the machine (NVENC), and parallel renders just slow each other down.
  {
    const rr = await withLock('render', agent, () => renderTimeline(timeline, raw, { workDir: path.join(vdir, 'render-work'), onProgress: f => emit({ kind: 'render.progress', agent, productionId, message: `Rendering ${Math.round(f * 100)}%` }) }));
    note(`Rendered with ffmpeg in ${rr.seconds.toFixed(1)} s (${rr.frames} frames, ${rr.inputs} inputs, ${rr.cards} text cards)`);
    for (const f of rr.fitted ?? []) note(`Text "${f.text.replace(/\s+/g, ' ').slice(0, 40)}" ${f.clipped ? 'STILL CLIPS the canvas margin at 50 % size - shorten it' : `${f.fit < 1 ? `shrunk to ${Math.round(f.fit * 100)} %` : ''}${f.fit < 1 && f.shift ? ' and ' : ''}${f.shift ? `moved ${f.shift} px inward` : ''} to fit the canvas margins`}`, f.clipped ? 'warn' : 'info');
    report.text_fit = rr.fitted ?? [];
    if (rr.textSafety) note(`${rr.textSafety.summary} -> v${n}/qa/text-safety.json`, rr.textSafety.pass ? 'info' : 'warn');
    report.render_seconds = +rr.seconds.toFixed(1);
  }
  const final = path.join(vdir, 'render.mp4');
  await master(raw, final);
  note('Mastered audio to −14 LUFS / −1.5 dBTP (picture untouched)');
  await run(PY, ['-I', path.join(PYDIR, 'techqa.py'), final, path.join(vdir, 'qa'), '--expect-duration', total.toFixed(2), ...(holdF ? ['--end-hold', (holdF / fps).toFixed(3)] : [])], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), productionId, n);
  // a fresh render is 'editing' until the showrunner stages qa through the prelint gate (production:stage <id> qa, 2026-11-02)
  db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now') WHERE production_id=? AND current_state NOT IN ('approved','scheduled','published')`).run(productionId);
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) — technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}`, tq.pass ? 'success' : 'warn');
  return { ...report, render: final, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs }, contact_sheet: tq.contact_sheet };
}

/** Two-pass EBU R128 loudness normalisation to the short-form standard; video stream copied untouched. */
export async function master(input: string, output: string) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', input, '-af', 'loudnorm=I=-14:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const m = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
  // Audio must end exactly with the picture: pad/trim to the video stream's duration (-shortest with a copied video
  // stream cuts the audio ~0.1 s early). Fall back to the container duration when the stream has none.
  const probe = async (entry: string) => parseFloat(String((await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', entry, '-of', 'csv=p=0', input])).stdout).trim());
  let vdur = await probe('stream=duration');
  if (!(vdur > 0)) vdur = parseFloat(String((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input])).stdout).trim());
  // The limiter works on sample peaks; AAC + intersample peaks can still land above it, so measure the encoded result
  // and tighten the ceiling until the true peak is <= -1.6 dBTP (techqa fails above -1.5).
  let limit = 0.79;
  for (let pass = 0; pass < 4; pass++) {
    await run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-c:v', 'copy', '-af',
      `loudnorm=I=-14:TP=-2:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` +
        // loudnorm drops its last partial block (~0.09 s) and its output pts confuse apad: resample + re-stamp first
        `,aresample=48000,asetpts=N/SR/TB,alimiter=limit=${limit.toFixed(3)}:attack=1:release=50:level=false` +
        (vdur > 0 ? `,apad=whole_dur=${vdur.toFixed(3)},atrim=end=${vdur.toFixed(3)}` : ''),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', output], { maxBuffer: 1 << 26 });
    const r = await run('ffmpeg', ['-hide_banner', '-i', output, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
    const err = String(r.stderr); const tp = parseFloat(/Peak:\s+(-?[\d.]+) dBFS/.exec(err.slice(err.lastIndexOf('Summary:')))?.[1] ?? 'NaN');
    const il = parseFloat(/I:\s+(-?[\d.]+) LUFS/.exec(err.slice(err.lastIndexOf('Summary:')))?.[1] ?? 'NaN');
    if (!(tp > -1.6)) {
      // loudnorm falls back to dynamic mode when the linear gain would break its TP target and can land far below -14 LUFS (r94q v4: -17.6): apply plain gain + limiter instead
      if (Number.isFinite(il) && il < -15) {
        let lim = 0.74;
        for (let k = 0; k < 4; k++) {
          await run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-c:v', 'copy', '-af',
            `aresample=48000,asetpts=N/SR/TB,volume=${(-14 - parseFloat(String(m.input_i))).toFixed(2)}dB,alimiter=limit=${lim.toFixed(3)}:attack=1:release=50:level=false` +
              (vdur > 0 ? `,apad=whole_dur=${vdur.toFixed(3)},atrim=end=${vdur.toFixed(3)}` : ''),
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', output], { maxBuffer: 1 << 26 });
          const r2 = String((await run('ffmpeg', ['-hide_banner', '-i', output, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 26 })).stderr);
          const s2 = r2.slice(r2.lastIndexOf('Summary:'));
          const i2 = parseFloat(/I:\s+(-?[\d.]+) LUFS/.exec(s2)?.[1] ?? 'NaN'), t2 = parseFloat(/Peak:\s+(-?[\d.]+) dBFS/.exec(s2)?.[1] ?? 'NaN');
          if (t2 <= -1.6 && Math.abs(i2 + 14) <= 1) return;
          lim *= Math.pow(10, (-1.8 - t2) / 20);
        }
      }
      return;
    }
    limit *= Math.pow(10, (-1.8 - tp) / 20);
  }
  throw new Error(`master: true peak still above -1.6 dBTP after 4 passes (${output})`);
}
