/**
 * viral-rankings 9:16 layout (1080x1920), from docs/brands/viral-rankings/BRAND-GUIDE.md §5-8.
 * One place for the geometry used by the plan→cutlist converter, the builder's rank layers (packages/ranking/py/layers.py)
 * and the zone collision check (packages/ranking/py/zone_check.py). Canvas pixels, origin top-left.
 */
export type Rect = [number, number, number, number]; // x0, y0, x1, y1

export const VR = {
  W: 1080, H: 1920,
  /** union text-safe box (Shorts/TikTok/Reels UI): nothing textual outside it except the logo strip */
  safe: [64, 270, 936, 1420] as Rect,
  /** two-colour title band (top) — persistent from frame 0 */
  title: [64, 270, 1016, 585] as Rect,
  /** footage box for landscape sources: fit, blurred fill around it (letterbox below the title band) */
  footage: [0, 590, 1080, 1210] as Rect,
  /** left rank rail: cards at x 36, stacked in y 600-1205 (TOP 3: <=178 px pitch centred; TOP 5: 121 px pitch), right edge < 290 so the subject stays visible (the active card's sublabel plate extends right of it) */
  rail: [36, 600, 290, 1205] as Rect,
  /** caption band (ink pill 80 %), ends by y 1400 */
  caption: [64, 1215, 936, 1400] as Rect,
  /** watermark top-left in the top-UI strip */
  logo: [40, 150, 340, 230] as Rect,
  /** mid-video subscribe pill (≤ 0.8 s), lower right of the footage box, clear of rail + captions + right UI */
  cta: [420, 1090, 900, 1190] as Rect,
  /** rank flash centre (footage box centre) */
  flashCentre: [560, 900] as [number, number],
  colours: { ink: '#0B0F1C', white: '#FFFFFF', yellow: '#FFD60A', red: '#FF3B47', mint: '#2EE6A6', orange: '#FF8A1F', cyan: '#19D3FF', magenta: '#FF3DB8', lilac: '#B388FF' } as Record<string, string>,
  fonts: { display: 'data/brand/viral-rankings/fonts/Anton-Regular.ttf', text: 'data/brand/viral-rankings/fonts/Montserrat[wght].ttf' },
  logoFile: 'data/brand/viral-rankings/logo/watermark.png',
};

/**
 * Title band layouts (2026-10-31). `standard` = the brand-guide band above (up to 3 lines, footage y 590-1210).
 * `compact` = a one-line band (the layer renderer shrinks the font until it fits; 2 lines only for very long titles)
 * so 4:3 / near-square sources can fill y 410-1370 = 960 px = 50 % of the frame. The caption band (y 1215-1400) and
 * the rail (y 600-1205) then sit OVER the lower/left footage (ink pill / cards), which is the genre norm.
 * `footage` = default fit_box for blur-fill entries; `footage_max` = the tallest box the layout allows (validator bound).
 */
/* `tall` (2026-10-31, QA F13 "fill the screen"): a slimmer one-line band (y 262-372) and footage y 380-1600 = 1220 px = 64 % of the frame.
 * The footage runs under the caption band, credit plate and CTA pill (all unchanged, inside the union text-safe box y <= 1420) and on
 * into the YouTube Shorts bottom-UI strip (y 1540-1600), where only picture sits, never text. Right-side Shorts buttons (x > 960)
 * also sit over picture only. Max box [0,372,1080,1620]. Use with framing.follow (window = box aspect, 0.885) or fill_box. */
export type TitleLayoutName = 'standard' | 'compact' | 'tall' | 'full';
export const VR_TITLE_LAYOUTS: Record<Exclude<TitleLayoutName, 'full'>, { title: Rect; footage: Rect; footage_max: Rect }> = {
  standard: { title: VR.title, footage: VR.footage, footage_max: [0, 590, 1080, 1420] },
  compact: { title: [64, 262, 1016, 402], footage: [0, 410, 1080, 1370], footage_max: [0, 410, 1080, 1420] },
  tall: { title: [64, 262, 1016, 372], footage: [0, 380, 1080, 1600], footage_max: [0, 372, 1080, 1620] },
};
/**
 * Style v2 (owner 2026-11-04, default for NEW viral-rankings cut lists; `plan.style: "v1"` keeps the old look, and cut lists without
 * `rank_layers.style` render v1 so approved productions rebuild unchanged).
 *  - Title ALWAYS two centred lines, the accent words are the break: "TOP 5 <W1>" / "<W2> MOMENTS" (Anton 116 px, never below 84 px),
 *    band y 228-462 under the logo strip (compact + tall); `standard` keeps its 3-line band (y 270-585).
 *  - Compact rank rail (~68 % of v1): cards at x 28, 5 slots in y 540-950 (82 px pitch), inactive 88x68, active 116x88 + sublabel plate
 *    (52-58 px Montserrat ExtraBold = >= 37 px cap = >= 12 px at 360 wide, 2026-11-04; <= 2 lines of <= 440 px, right edge <= x 624;
 *    longer labels fail the build); the active card + plate slide in from the left with overshoot over the slot's dim card (never a blank slot).
 *  - Captions: glass pill (ink 62 % + backdrop blur, radius 30, thin light rim, soft shadow), see build.ts `caption_style: "v2"`.
 */
export type VrStyle = 'v1' | 'v2';
export const VR_V2 = {
  title: [40, 228, 1040, 462] as Rect,
  title_font: { start: 116, min: 84, line_gap: 0.1 },
  rail: [28, 540, 430, 950] as Rect,
  rail_card: { inactive: [88, 68], active: [116, 88], num: [46, 62], label_start: 58, label_min: 52, plate_max_w: 500, radius: 16 },
  /** reveal motion (frames at 30 fps): card slides in from x -30 % of W with a back-out overshoot, the plate slides out from under it (never left of the card) */
  reveal: { card_frames: 12, card_from_x: -30, plate_frames: 9, plate_delay: 3, plate_from_x: 4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
};
/**
 * `full` (style v2 only, opt-in 2026-11-11, owner: "a picture that grabs attention, nothing cut off"): the footage owns the whole canvas.
 *  - a source with aspect <= vertical_max_aspect (9:16-ish, after manual trim) is contain-fit into [0,0,1080,1920] = full-bleed for 9:16, zero crop;
 *    other aspects are contain-fit into `footage` (tall box, centre a bit above the middle) over the blur fill. Never a crop by default (F13).
 *  - the full two-line title shows 0 - title_until s over the footage (inside the safe box, dark top scrim), then turns in `trans_s` into a
 *    one-line chip "TOP 5 W1 W2 MOMENTS" at the top of the safe box (two short lines when one line cannot keep chip_font.min).
 *  - the rail (same cards) starts under the chip and appears with it; captions / hook / badge keep their systems inside the safe box.
 */
export const VR_FULL = {
  canvas: [0, 0, 1080, 1920] as Rect,
  vertical_max_aspect: 0.62,
  footage: [0, 220, 1080, 1620] as Rect,
  title: [64, 270, 936, 560] as Rect,
  chip: [64, 270, 936, 396] as Rect,
  /** Anton px: start..min; min 50 = cap 44 px >= 2.2 % of 1920 (config/text-safety.json min_cap_height_pct) */
  chip_font: { start: 60, min: 50 },
  rail: [28, 410, 430, 820] as Rect,
  title_until: 1.6,
  trans_s: 0.25,
  /** subscribe badge top edge: under the rail, above the caption band (y 1215+) */
  badge_y0: 1110,
  /** gradient scrims (alpha 0-255): top behind the full title / behind the chip, bottom under the caption band */
  scrim: { title: [0, 660, 170], chip: [0, 470, 120], bottom: [1120, 1920, 120] } as Record<string, [number, number, number]>,
};
export const VR_TITLE_LAYOUTS_V2: Record<TitleLayoutName, { title: Rect; footage: Rect; footage_max: Rect }> = {
  standard: VR_TITLE_LAYOUTS.standard,
  compact: { title: VR_V2.title, footage: [0, 470, 1080, 1370], footage_max: [0, 462, 1080, 1420] },
  tall: { title: VR_V2.title, footage: [0, 470, 1080, 1600], footage_max: [0, 462, 1080, 1620] },
  full: { title: VR_FULL.title, footage: VR_FULL.footage, footage_max: VR_FULL.canvas },
};
export function titleLayout(name: string | null | undefined, style: VrStyle = 'v1') {
  const k = (name ?? 'standard') as TitleLayoutName;
  if (!VR_TITLE_LAYOUTS_V2[k]) throw new Error(`title_layout "${name}" unknown (standard | compact | tall | full)`);
  if (k === 'full' && style !== 'v2') throw new Error('title_layout "full" needs style v2');
  return style === 'v2' ? VR_TITLE_LAYOUTS_V2[k] : VR_TITLE_LAYOUTS[k as Exclude<TitleLayoutName, 'full'>];
}
/** full layout default footage box for a (trimmed) cw x ch picture: whole canvas for 9:16-ish sources, else the tall centred box */
export function fullFootageBox(cw: number, ch: number): Rect {
  const a = cw / ch, [, by0, , by1] = VR_FULL.footage, boxA = VR.W / (by1 - by0);
  if (a <= VR_FULL.vertical_max_aspect + 1e-6) return VR_FULL.canvas;
  if (a >= boxA) return VR_FULL.footage;
  // between 9:16-ish and the box aspect (e.g. a 9:16 clip with a top trim): full width, height 1080/a around the box centre, kept on the canvas
  const h = VR.W / a, c = Math.min(VR.H - h / 2, Math.max(h / 2, (by0 + by1) / 2));
  return [0, Math.round(c - h / 2), VR.W, Math.round(c + h / 2)];
}
/** style-v2 rail rect for a title layout (full: under the chip) */
export function vrRailRect(titleLayoutName: string | null | undefined): Rect {
  return titleLayoutName === 'full' ? VR_FULL.rail : VR_V2.rail;
}
/** plan.style -> render style (v2 default since 2026-11-04) */
export function vrStyle(plan: { style?: string | null }): VrStyle {
  const s = plan.style ?? 'v2';
  if (s !== 'v1' && s !== 'v2') throw new Error(`plan.style "${s}" unknown (v1 | v2)`);
  return s;
}
/** Style v2 title lines: [["TOP","5",W1], [W2,"MOMENTS"]] for the 5-word format title; null when the words are not that shape. */
export function titleLinesV2<T extends { text: string }>(words: T[]): [T[], T[]] | null {
  if (words.length !== 5 || words[0].text.toUpperCase() !== 'TOP' || words[4].text.toUpperCase() !== 'MOMENTS') return null;
  return [words.slice(0, 3), words.slice(3)];
}

/**
 * Centre-crop trim (source px) so a sw x sh picture (after an existing manual trim) gets the aspect of `box`.
 * Throws when more than `maxFrac` of the width or height would be cut.
 */
export function fillBoxTrim(sw: number, sh: number, box: Rect, base: { top?: number; bottom?: number; left?: number; right?: number } = {}, maxFrac = 0.25) {
  const t = { top: base.top ?? 0, bottom: base.bottom ?? 0, left: base.left ?? 0, right: base.right ?? 0 };
  const cw = sw - t.left - t.right, ch = sh - t.top - t.bottom;
  const target = (box[2] - box[0]) / (box[3] - box[1]);
  if (cw / ch > target + 1e-3) {           // too wide: cut the sides
    const cut = Math.round(cw - ch * target);
    if (cut / sw > maxFrac) throw new Error(`fill_box would cut ${(cut / sw * 100).toFixed(0)} % of the width (max ${maxFrac * 100} %) — use a wider fit_box`);
    t.left += Math.floor(cut / 2); t.right += cut - Math.floor(cut / 2);
  } else if (cw / ch < target - 1e-3) {    // too tall: cut top/bottom
    const cut = Math.round(ch - cw / target);
    if (cut / sh > maxFrac) throw new Error(`fill_box would cut ${(cut / sh * 100).toFixed(0)} % of the height (max ${maxFrac * 100} %) — use a taller fit_box`);
    t.top += Math.floor(cut / 2); t.bottom += cut - Math.floor(cut / 2);
  }
  return t;
}

/**
 * Build defaults (2026-10-31, wave-1 QA i1gu v2 / akn1 v3). Opt-out per plan via plan.build_defaults.
 *  - per-clip credit plate: >= 46 px font (>= 32 px cap height, owner QA 2026-10-31), one line (<= 33 chars) where possible, centre y 1384 (band 1376-1400), bottom edge never below the safe box (y 1420)
 *  - opening punch: 100 -> 112 % between 0.15 and 0.65 s of the first clip (clipped to its footage box)
 *  - #1 hit: punch 100 -> 112 % over 0.4 s from the payoff, white flash over the footage box (0.4 s), sting SFX, bed dip -8 dB for 1 s
 *  - tail: last spoken word to the end <= 0.3 s (target 0.25 s)
 * SFX: own synthesis (numpy, seeded, no samples) by packages/quiz/py/synth_hook_sfx.py, regenerated into data/brand/viral-rankings/sfx when missing.
 */
export const VR_DEFAULTS = {
  credit: { font_px: 46, center_y_px: 1384, max_chars: 33, min_font_px: 46 },
  open_punch: { from_s: 0.15, to_s: 0.65, scale: 1.12 },
  one_hit: { lead_s: 0.05, punch_s: 0.4, scale: 1.12, flash_s: 0.4, dip_db: -8, dip_s: 1.0 },
  tail_max_ms: 300,
  cta_dur_ms: 2200,
  sfx_dir: 'data/brand/viral-rankings/sfx',
  sting: 'data/brand/viral-rankings/sfx/hook_slam.wav',
};

/** Caption placement in the builder's units (y/x = % of canvas from centre; font in output px). */
export const VR_CAPTIONS = {
  y: +(((VR.caption[1] + VR.caption[3]) / 2 - VR.H / 2) / VR.H * 100).toFixed(2),
  x: +(((VR.caption[0] + VR.caption[2]) / 2 - VR.W / 2) / VR.W * 100).toFixed(2),
  font_px: 64,
  max_chars: 20,
};

export function colourOf(c: string | null | undefined, styles: { primary: string; secondary: string; connector: string }): string {
  const v = c === 'primary' ? styles.primary : c === 'secondary' ? styles.secondary : c === 'connector' || !c ? styles.connector : c;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase();
  const named = VR.colours[v.toLowerCase()];
  if (!named) throw new Error(`unknown colour "${v}" (use #RRGGBB or ${Object.keys(VR.colours).join('/')})`);
  return named;
}

/**
 * Where the picture of a segment lands on the canvas (for the collision check), given the source size and the
 * builder framing: `fit_box` (contain inside a canvas rect) or cover (fill the canvas, centre crop).
 */
export function placedRect(sw: number, sh: number, framing: { fit_box?: Rect | null; fill?: string | null }, W = VR.W, H = VR.H): Rect {
  if (framing.fit_box) {
    const [x0, y0, x1, y1] = framing.fit_box;
    const s = Math.min((x1 - x0) / sw, (y1 - y0) / sh);
    const w = sw * s, h = sh * s, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  }
  if (framing.fill === 'cover') {
    const s = Math.max(W / sw, H / sh), w = sw * s, h = sh * s;
    return [(W - w) / 2, (H - h) / 2, (W + w) / 2, (H + h) / 2];
  }
  const s = Math.min(W / sw, H / sh), w = sw * s, h = sh * s;   // blur/contain: fit the canvas
  return [(W - w) / 2, (H - h) / 2, (W + w) / 2, (H + h) / 2];
}

/** Canvas zone → source pixel rect (null when the zone does not overlap the picture). */
export function zoneInSource(zone: Rect, placed: Rect, sw: number, sh: number): Rect | null {
  const ix0 = Math.max(zone[0], placed[0]), iy0 = Math.max(zone[1], placed[1]), ix1 = Math.min(zone[2], placed[2]), iy1 = Math.min(zone[3], placed[3]);
  if (ix1 - ix0 < 8 || iy1 - iy0 < 8) return null;
  const sx = sw / (placed[2] - placed[0]), sy = sh / (placed[3] - placed[1]);
  return [Math.round((ix0 - placed[0]) * sx), Math.round((iy0 - placed[1]) * sy), Math.round((ix1 - placed[0]) * sx), Math.round((iy1 - placed[1]) * sy)];
}

/**
 * Zoom guard (owner 2026-11-08): `follow.zoom` is the crop window width / frame width. A subject whole in frame beats a subject large in frame:
 * below 0.75 the plan must say why (`framing.zoom_ok_reason`) and the build lists it as a warning; without a reason ranking:cutlist refuses.
 */
export const VR_ZOOM_GUARD = 0.75;
export function zoomGuard(what: string, follow: { zoom?: number } | null | undefined, reason: unknown): string | null {
  const z = follow?.zoom;
  if (z == null || z >= VR_ZOOM_GUARD) return null;
  if (typeof reason !== 'string' || !reason.trim()) throw new Error(`${what}: framing.follow.zoom ${z} is below ${VR_ZOOM_GUARD}: a subject whole in frame beats a subject large in frame. Widen the crop, or add framing.zoom_ok_reason saying why the whole action still fits`);
  return `${what}: zoom ${z} below ${VR_ZOOM_GUARD} (allowed: ${reason.trim()})`;
}

/** Title accent rule (owner 2026-10-31): the two accent colours go only on topic KEYWORDS (subject nouns), never on hype/generic words. */
export const ACCENT_BLOCKLIST = ['funny', 'funniest', 'hottest', 'craziest', 'best', 'top', 'most', 'insane', 'epic', 'wild'];
/** Returns the accent-coloured title words that are on the blocklist (empty = ok). `accentWords` = the words that carry an accent colour. */
export function blockedAccentWords(accentWords: string[]): string[] {
  return accentWords.filter(w => ACCENT_BLOCKLIST.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
}

/**
 * Title format (owner, final 2026-10-31): exactly "TOP <N> <WORD1> <WORD2> MOMENTS". N = the plan's format count; WORD1/WORD2 are the topic
 * keywords (hyphenated compounds = one word), WORD1 = primary accent, WORD2 = secondary accent (different colours); TOP / N / MOMENTS white.
 * Needs title_styles.spans to carry the colours. Returns error strings (empty = ok).
 */
export function titleFormatErrors(plan: { title?: string | null; title_styles?: any }, n: number): string[] {
  const title = String(plan.title ?? '').trim().replace(/\s+/g, ' ');
  const re = /^TOP (\d+) ([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*) ([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*) MOMENTS$/i;
  const m = re.exec(title);
  if (!m) return [`title "${title}" must be exactly "TOP <N> <WORD1> <WORD2> MOMENTS" (two topic keywords, hyphenated compounds count as one word)`];
  const errs: string[] = [];
  if (+m[1] !== n) errs.push(`title says TOP ${m[1]} but the plan format has ${n} entries`);
  const st = { primary: 'yellow', secondary: 'red', connector: 'white', ...(plan.title_styles ?? {}) };
  const spans: { text: string; color?: string }[] = plan.title_styles?.spans ?? [];
  if (!spans.length) return [...errs, 'title_styles.spans is required: TOP/N/MOMENTS white, WORD1 primary, WORD2 secondary'];
  const words = spans.flatMap(s => String(s.text).trim().split(/\s+/).map(w => ({ w: w.toUpperCase(), c: colourOf(s.color, st) })));
  if (words.map(x => x.w).join(' ') !== title.toUpperCase()) return [...errs, `title_styles.spans do not spell the title "${title}"`];
  const white = colourOf('connector', st), prim = colourOf('primary', st), sec = colourOf('secondary', st);
  if (prim === sec) errs.push('primary and secondary accent colours must differ');
  if (words.length !== 5) return errs;
  [0, 1, 4].forEach(i => { if (words[i].c !== white) errs.push(`"${words[i].w}" must be white`); });
  if (words[2].c !== prim) errs.push(`WORD1 "${words[2].w}" must carry the primary accent`);
  if (words[3].c !== sec) errs.push(`WORD2 "${words[3].w}" must carry the secondary accent`);
  if (words[2].c === words[3].c) errs.push('WORD1 and WORD2 must have different accent colours');
  return errs.map(e => /^title/.test(e) ? e : `title: ${e}`);
}
