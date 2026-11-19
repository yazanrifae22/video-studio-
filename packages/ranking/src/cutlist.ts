/**
 * RankingPlan → builder cut list (viral-rankings build step, 2026-10-31, pipeline-engineer).
 *
 * - Re-runs the full plan validator incl. the RIGHTS GATE per moment at conversion time (assertPublishablePlan):
 *   a non-publishable plan is refused, nothing is written.
 * - Segments are emitted in REVEAL order (reveal_index 0..N-1); `item` = rank_position; the segment↔rank↔moment mapping is
 *   recorded in `cutlist.ranking.entries` (the builder writes moment_usage rows from it on every build).
 * - Visual layers (title, rank rail, brand mark, optional rank flash / mid CTA) are described in `cutlist.rank_layers`;
 *   the builder renders them as full-canvas RGBA PNG / alpha WebM files (packages/ranking/py/layers.py) and lays them on
 *   their own OpenChatCut tracks (see docs/brands/viral-rankings/ARCHITECTURE.md §6).
 * Pure function of the plan + DB; writing the file is the CLI's job.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CAPTION_MIN_PAGE } from '../../shared/src/caption-gate.ts';
import { db, J } from '../../shared/src/db.ts';
import { P } from '../../shared/src/paths.ts';
import { RANKING_FORMATS } from '../../shared/src/schemas.ts';
import { getMoment } from './library.ts';
import { assertPublishablePlan } from './plan.ts';
import { blockedAccentWords, colourOf, fillBoxTrim, fullFootageBox, zoomGuard, placedRect, titleLayout, VR, VR_CAPTIONS, VR_DEFAULTS, vrStyle, type Rect } from './layout.ts';

const BRAND = 'viral-rankings';
const CTA_MAX = 0.8;

export interface ConvertOptions { planPath?: string; /** script.json override (default productions/<id>/script.json) */ script?: any }

/** script.json on-screen hook (hook_text, or an on_screen entry with role "hook") -> {text, dur}; null when none. */
export function scriptHook(sj: any): { text: string; dur: number } | null {
  if (!sj || typeof sj !== 'object') return null;
  const os = (Array.isArray(sj.on_screen) ? sj.on_screen : []).find((o: any) => o?.role === 'hook' && typeof o.text === 'string' && o.text.trim());
  const text = String(os?.text ?? sj.hook_text ?? '').trim();
  if (!text) return null;
  const d = Number(os?.dur);
  return { text, dur: Number.isFinite(d) && d >= 0.5 && d <= 3 ? d : 0.9 };
}
/** Hook card at 0 s in the caption band (2026-11-02, was added by hand; rank-261102-91sf shipped without it). Narration lines that would
 *  start under it move to just after it, and the frame-0 caption snap is turned off (the hook IS the frame-0 text). Mutates `lines`. */
export function hookText(hook: { text: string; dur: number }, lines: { id: string; at: number }[], y: number) {
  const moved: string[] = [];
  const clear = +(hook.dur + 0.05).toFixed(3);
  for (const l of lines) if (l.at < clear) { moved.push(`${l.id} ${l.at}->${clear}`); l.at = clear; }
  return { text: { text: hook.text.toUpperCase(), at: 0, dur: hook.dur, role: 'hook', y, font_px: 96, max_chars: 14 }, moved };
}

const PLATFORM: Record<string, string> = { pixabay: 'Pixabay', pexels: 'Pexels', wikimedia: 'Wikimedia Commons', internet_archive: 'Internet Archive', vimeo: 'Vimeo', nasa: 'NASA', noaa: 'NOAA' };
const ON_SCREEN_CREDIT_MAX = 46;
const TAG_SOUP = /,.*,.*\bby\b/;   // Pixabay-style "cat, kitten, ... by X (licence) - url" titles are not credit lines
/** One-line on-screen credit for a source (2026-10-31 default): a short attribution, else "<creator> via <platform> (<licence>)", shortened to fit one line. */
export function shortCredit(s: { attribution?: string | null; creator?: string | null; license?: string | null; source_platform?: string | null; title?: string | null }) {
  const plat = PLATFORM[String(s.source_platform ?? '')] ?? null;
  const att = s.attribution && !/https?:\/\//.test(s.attribution) && !TAG_SOUP.test(s.attribution) ? s.attribution.trim() : null;
  const via = s.creator ? `${s.creator}${plat && plat !== s.creator ? ` via ${plat}` : ''}` : null;
  // licence on screen only where its text is part of the attribution (Creative Commons); otherwise it lives in the description (keeps all plates one form)
  const cc = !!s.license && /^(cc|creative commons)/i.test(s.license);
  const cands = [att, via && cc ? `${via} (${s.license})` : null, via].filter(Boolean) as string[];
  if (!cands.length) { const fb = [s.title, s.license].filter(Boolean).join(' - '); if (fb) cands.push(fb); }   // last resort: title + licence
  return cands.find(c => c.length <= ON_SCREEN_CREDIT_MAX) ?? [...cands].sort((a, b) => a.length - b.length)[0] ?? '';
}
/** Full description credit for a source: its attribution (when it is a real credit line) or creator/platform/licence, plus the source URL. */
export function fullCredit(s: { attribution?: string | null; creator?: string | null; license?: string | null; source_platform?: string | null; original_url?: string | null }) {
  const plat = PLATFORM[String(s.source_platform ?? '')] ?? null;
  const att = s.attribution && !TAG_SOUP.test(s.attribution) ? s.attribution.replace(/\s*[\u2014-]\s*https?:\/\/\S+\s*$/, '').trim() : null;
  const base = att || [s.creator ? `${s.creator}${plat && plat !== s.creator ? ` via ${plat}` : ''}` : plat, s.license ? `(${s.license})` : null].filter(Boolean).join(' ');
  return `${base}${s.original_url && !base.includes(s.original_url) ? ` ${s.original_url}` : ''}`.trim();
}

/** Split title spans into coloured words (a span may hold several words). */
export function titleWords(plan: any): { text: string; color: string }[] {
  const styles = { primary: 'yellow', secondary: 'red', connector: 'white', ...(plan.title_styles ?? {}) };
  const title = String(plan.title ?? '').trim();
  if (!title && !plan.title_styles?.spans?.length) throw new Error('plan.title is required for the viral-rankings title band');
  let spans: { text: string; color: string }[] = plan.title_styles?.spans ?? [];
  if (!spans.length) {
    // fallback: longest non-connector word = primary, last word = secondary, the rest white
    const ws = title.split(/\s+/);
    const stop = /^(top|the|a|an|of|in|on|at|to|and|or|for|with|most|that|this|my|\d+)$/i;
    let pi = -1;
    ws.forEach((w, i) => { if (!stop.test(w) && i !== ws.length - 1 && (pi < 0 || w.length > ws[pi].length)) pi = i; });
    spans = ws.map((w, i) => ({ text: w, color: i === ws.length - 1 && ws.length > 1 ? 'secondary' : i === pi ? 'primary' : 'connector' }));
  } else if (title && spans.map(s => s.text).join(' ').replace(/\s+/g, ' ').toUpperCase() !== title.replace(/\s+/g, ' ').toUpperCase()) {
    throw new Error(`title_styles.spans "${spans.map(s => s.text).join(' ')}" do not spell the title "${title}"`);
  }
  const out = spans.flatMap(s => s.text.trim().split(/\s+/).map(w => ({ text: w.toUpperCase(), color: colourOf(s.color, styles) })));
  const accents = new Set(out.filter(w => w.color !== colourOf('connector', styles)).map(w => w.color));
  if (accents.size < 2) throw new Error('title needs two accent colours (primary + secondary) on chosen words, white connectors');
  const bad = blockedAccentWords(out.filter(w => w.color !== colourOf('connector', styles)).map(w => w.text));
  if (bad.length) throw new Error(`title accent colours must sit on topic keywords, not hype/generic words: ${bad.join(', ')} (blocklist: funny, funniest, hottest, craziest, best, top, most, insane, epic, wild)`);
  return out;
}

export function planToCutlist(input: unknown, opts: ConvertOptions = {}) {
  const report = assertPublishablePlan(input);             // structure + library + per-moment rights gate (throws)
  const plan: any = report.plan!;
  if (plan.brand_id !== BRAND) throw new Error(`ranking:cutlist renders brand ${BRAND} only (plan brand ${plan.brand_id})`);
  if (!plan.production_id) throw new Error('plan.production_id is required');
  const prod = db().prepare(`SELECT brand_id FROM productions WHERE production_id=?`).get(plan.production_id) as any;
  if (!prod) throw new Error(`production ${plan.production_id} not found`);
  if (prod.brand_id !== BRAND) throw new Error(`production ${plan.production_id} is brand ${prod.brand_id}, not ${BRAND}`);
  if (plan.format !== 'top5') throw new Error(`owner rule (2026-10-31): every ranking is TOP 5, plan format is ${plan.format}`);
  const n = RANKING_FORMATS[plan.format as 'top3' | 'top5'];
  const words = titleWords(plan);
  const style = vrStyle(plan);                              // v2 (default since 2026-11-04: two-line title, compact rail, glass captions) | v1
  const layout = titleLayout(plan.title_layout, style);    // standard (default) | compact | tall (v1: one-line title, footage y 380-1600; v2: two-line title, footage y 470-1600)
  const compact = plan.title_layout === 'compact' || plan.title_layout === 'tall';   // a non-standard band: bounded fit_box + title_box for the layer renderer
  const full = plan.title_layout === 'full';   // 2026-11-11 opt-in (style v2): footage owns the whole canvas, title over it 0-1.6 s then a one-line chip (layout.ts VR_FULL)
  /** v2: a plan fit_box written for the v1 one-line band (top above the two-line band) is moved down to the v2 footage top */
  const v2box = (b: Rect, what: string): Rect => {
    if (style !== 'v2' || !compact || b[1] >= layout.footage_max[1]) return b;
    report.warnings.push(`${what}: fit_box top y ${b[1]} is under the style-v2 two-line title (ends y ${layout.title[3]}), moved to y ${layout.footage[1]}`);
    return [b[0], layout.footage[1], b[2], b[3]];
  };

  const byReveal = [...plan.entries].sort((a: any, b: any) => a.reveal_index - b.reveal_index);
  const segments: any[] = [], mapEntries: any[] = [], credits: string[] = [], screenCredits: string[] = [];
  let t = 0;
  for (const [i, e] of byReveal.entries()) {
    const m = getMoment(e.moment_id)!;
    const s = db().prepare(`SELECT asset_id, title, attribution, creator, license, usage_restrictions, analysis, original_url, source_platform FROM sources WHERE asset_id=?`).get(e.source_id) as any;
    const a = J.parse<any>(s.analysis, {});
    const conds = J.parse<string[]>(s.usage_restrictions, []).concat(m.license_conditions ?? []);
    const mustMute = conds.some(c => /strip source audio|mute/i.test(c));
    const mute = mustMute ? true : e.mute_source ?? !plan.source_audio;
    const sw = a.width ?? 1920, sh = a.height ?? 1080;
    const fill = e.fill ?? (full ? 'blur' : sw > sh * 1.05 ? 'blur' : 'cover');   // full: always contain-fit (never a cover crop by default, F13)
    const spd = e.speed && e.speed !== 1 ? e.speed : 1;
    const dur = (e.out_ms - e.in_ms) / 1000 / spd;   // on-screen seconds (source window / speed)
    const fr = e.framing ?? {};
    if (fr.punch && fr.punch.to_s > dur + 1e-6) throw new Error(`entry #${e.rank_position}: framing.punch.to_s ${fr.punch.to_s} is beyond the ${dur.toFixed(2)} s window`);
    const box: Rect = fr.fit_box ? v2box(fr.fit_box, `entry #${e.rank_position}`)
      : full ? fullFootageBox(sw - (fr.trim?.left ?? 0) - (fr.trim?.right ?? 0), sh - (fr.trim?.top ?? 0) - (fr.trim?.bottom ?? 0)) : layout.footage;
    if ((compact || full) && fill === 'blur') {
      const mx = layout.footage_max;
      if (box[1] < mx[1] || box[3] > mx[3] || box[0] < mx[0] || box[2] > mx[2]) throw new Error(`entry #${e.rank_position}: fit_box [${box}] leaves the ${plan.title_layout} footage area [${mx}] (title band ends at y ${layout.title[3]})`);
    }
    if (fr.follow && fill !== 'blur') throw new Error(`entry #${e.rank_position}: framing.follow needs fill "blur" (a fit_box segment)`);
    if (fr.follow && fr.fill_box) throw new Error(`entry #${e.rank_position}: framing.follow and fill_box are exclusive`);
    if (fr.follow && fr.follow.keys.some((k: number[]) => k[0] > dur + 1e-6)) throw new Error(`entry #${e.rank_position}: framing.follow key beyond the ${dur.toFixed(2)} s window`);
    if (fr.fill_box && fill !== 'blur') throw new Error(`entry #${e.rank_position}: framing.fill_box needs fill "blur" (a fit_box segment)`);
    { const zw = zoomGuard(`entry #${e.rank_position}`, fr.follow, fr.zoom_ok_reason); if (zw) report.warnings.push(zw); }
    const trim = fr.fill_box ? fillBoxTrim(sw, sh, box, fr.trim ?? {}) : fr.trim;
    segments.push({ asset_id: e.source_id, src_in: e.in_ms / 1000, src_out: e.out_ms / 1000, item: e.rank_position, fill,
      ...(fill === 'blur' ? { fit_box: box } : {}), ...(trim ? { trim } : {}), ...(fr.punch ? { punch: { ...fr.punch } } : {}), ...(fr.follow ? { follow: { ...fr.follow } } : {}), mute_source: mute,
      ...(e.flash_soften ? { flash_soften: true } : {}), ...(e.deflash ? { deflash: true } : {}),
      ...(spd !== 1 ? { speed: spd } : {}),
      ...(e.grade && (e.grade.gamma != null || e.grade.brightness != null || e.grade.contrast != null) ? { lift: { ...e.grade } } : {}),   // per-clip exposure lift (ffmpeg eq in the builder)
      why: `#${e.rank_position} (reveal ${e.reveal_index}) ${e.left_label} - moment ${e.moment_id}` });   // ASCII only: readers that decode UTF-8 as cp1252 (PowerShell 5.1 Get-Content, Python open() without encoding) showed the em dash as mojibake (fzcu v9 QA)
    const pms = e.payoff_ms ?? m.payoff_ms;   // the plan entry's payoff wins (2026-11-08)
    const payoff = pms != null && pms >= e.in_ms && pms <= e.out_ms ? t + (pms - e.in_ms) / 1000 / spd : null;
    const mainIdx = segments.length - 1;
    mapEntries.push({ segment: mainIdx, rank_position: e.rank_position, reveal_index: e.reveal_index, moment_id: e.moment_id, source_id: e.source_id,
      in_ms: e.in_ms, out_ms: e.out_ms, est_start: +t.toFixed(3), payoff_est: payoff == null ? null : +payoff.toFixed(3), ...(payoff == null ? {} : { payoff_ms: pms }), left_label: e.left_label,
      ...(plan.title_layout || fr.fill_box ? { footage_height_pct: (() => {   // picture height on the canvas (blur: placed in the box after trim; cover: 100)
        if (fill !== 'blur') return 100;
        if (fr.follow) return +((box[3] - box[1]) / VR.H * 100).toFixed(1);   // follow-crop window has the box aspect
        const tt = trim ?? {}, cw = sw - (tt.left ?? 0) - (tt.right ?? 0), ch = sh - (tt.top ?? 0) - (tt.bottom ?? 0);
        const r = placedRect(cw, ch, { fit_box: box }); return +((r[3] - r[1]) / VR.H * 100).toFixed(1);
      })() } : {}) });
    const credit = s.attribution || [s.title, s.creator, s.license].filter(Boolean).join(' — ');
    if (credit && !credits.includes(credit)) credits.push(`${credit}${s.original_url ? ` — ${s.original_url}` : ''}`);
    screenCredits.push(e.credit ?? shortCredit(s));
    t += dur;
    // extra shots (2026-11-02 PACING): same rank, same source window (rights), e.g. slow-mo replay of the key beat; segment index of the entry stays the main shot
    for (const x of e.extra_shots ?? []) {
      if (x.in_ms < m.start_ms || x.out_ms > m.end_ms) throw new Error(`entry #${e.rank_position}: extra shot ${x.in_ms}-${x.out_ms} leaves the moment bounds ${m.start_ms}-${m.end_ms}`);
      const xs = x.speed && x.speed !== 1 ? x.speed : 1, xd = (x.out_ms - x.in_ms) / 1000 / xs;
      if (xd > 3.6) throw new Error(`entry #${e.rank_position}: extra shot is ${xd.toFixed(2)} s on screen (max 3.5)`);
      { const zw = zoomGuard(`entry #${e.rank_position} extra shot ${x.in_ms}-${x.out_ms}`, (x.framing ?? fr).follow, (x.framing ?? fr).zoom_ok_reason ?? fr.zoom_ok_reason); if (zw) report.warnings.push(zw); }
      const xt = (x.framing ?? fr).trim ?? fr.trim;
      const xf = x.framing ?? fr, xbox: Rect = xf.fit_box ? v2box(xf.fit_box, `entry #${e.rank_position} extra shot`)
        : full && x.framing ? fullFootageBox(sw - (xt?.left ?? 0) - (xt?.right ?? 0), sh - (xt?.top ?? 0) - (xt?.bottom ?? 0)) : box;
      segments.push({ asset_id: e.source_id, src_in: x.in_ms / 1000, src_out: x.out_ms / 1000, item: e.rank_position, fill,
        ...(fill === 'blur' ? { fit_box: xbox } : {}), ...((xf.trim ?? fr.trim) ? { trim: { ...(xf.trim ?? fr.trim) } } : {}), ...(xf.follow ? { follow: { ...xf.follow } } : {}), ...(xf.punch ? { punch: { ...xf.punch } } : {}), mute_source: mute,
        ...(xs !== 1 ? { speed: xs } : {}), why: `#${e.rank_position} extra shot (${xs !== 1 ? 'x' + xs : 'replay'}) - moment ${e.moment_id}` });
      screenCredits.push(e.credit ?? shortCredit(s));
      t += xd;
    }
  }
  const total = t;

  // build defaults (2026-10-31, wave-1 QA): opening punch, #1 hit, per-clip credits, caption at 0, empty rail at 0, tail <= 0.3 s, CTA in the caption band
  const bd = { caption_zero: true, rail_empty: true, open_punch: true, one_hit: true, clip_credits: true, cta_band: true, overlay_clearance: true, ...(plan.build_defaults ?? {}) };
  const tailMaxMs = plan.build_defaults && plan.build_defaults.tail_max_ms !== undefined ? plan.build_defaults.tail_max_ms : VR_DEFAULTS.tail_max_ms;
  const defaultsLog: string[] = [];
  /** Add a default punch stage to a segment. A plan punch that overlaps it wins when it is fast (<= 1.5 s ramp); a slow one is moved to start after the stage. */
  const addStage = (seg: any, st: { from_s: number; to_s: number; scale: number }, what: string) => {
    const p = seg.punch;
    if (p && p.clip !== false && p.from_s < st.to_s + 0.1 && st.from_s < p.to_s + 0.1) {
      if (p.to_s - p.from_s <= 1.5) { defaultsLog.push(`${what}: kept the plan's own punch ${p.from_s}-${p.to_s} s`); return false; }
      p.from_s = +Math.max(p.from_s, st.to_s).toFixed(3);
      if (p.to_s - p.from_s < 0.3) delete seg.punch;
    }
    seg.punch_stages = [...(seg.punch_stages ?? []), { from_s: +st.from_s.toFixed(3), to_s: +st.to_s.toFixed(3), scale: st.scale }].sort((a: any, b: any) => a.from_s - b.from_s);
    defaultsLog.push(`${what}: punch ${st.from_s.toFixed(2)}-${st.to_s.toFixed(2)} s x${st.scale} on segment ${segments.indexOf(seg)}`);
    return true;
  };
  if (bd.open_punch && segments.length) { const op = VR_DEFAULTS.open_punch; addStage(segments[0], { from_s: op.from_s, to_s: Math.min(op.to_s, (byReveal[0].out_ms - byReveal[0].in_ms) / 1000 - 0.1), scale: op.scale }, 'open punch'); }
  let oneHit: any = null;
  const bedDips: { at: number; dur: number; db: number }[] = (plan.bed_dips ?? []).map((d: any) => ({ at: +(d.at_ms / 1000).toFixed(3), dur: +(d.dur_ms / 1000).toFixed(3), db: d.db }));
  if (bd.one_hit) {
    const k = byReveal.findIndex((e: any) => e.rank_position === 1), e1 = byReveal[k], me1 = mapEntries[k], d1 = (e1.out_ms - e1.in_ms) / 1000, oh = VR_DEFAULTS.one_hit;
    const pm = e1.payoff_ms ?? getMoment(e1.moment_id)?.payoff_ms ?? null, la = plan.rail_label_at_ms?.[e1.reveal_index];
    let rel: number, from: string;
    if (pm != null && pm >= e1.in_ms && pm <= e1.out_ms) { rel = (pm - e1.in_ms) / 1000; from = e1.payoff_ms != null ? 'entry payoff_ms' : 'moment payoff_ms'; }
    else if (la != null && la / 1000 > me1.est_start && la / 1000 < me1.est_start + d1) { rel = la / 1000 - me1.est_start; from = 'rail label time'; }
    else { rel = Math.min(1.2, d1 * 0.4); from = 'default (no payoff_ms)'; }
    rel = Math.max(oh.lead_s + 0.05, Math.min(d1 - 0.5, rel));
    const at = me1.est_start + rel;
    addStage(segments[me1.segment], { from_s: rel - oh.lead_s, to_s: rel - oh.lead_s + oh.punch_s, scale: oh.scale }, '#1 hit');
    oneHit = { seg: me1.segment, rel: +rel.toFixed(3), at: +at.toFixed(3), from, flash: true, flash_s: oh.flash_s, sting: VR_DEFAULTS.sting, sting_volume: 0.8 };
    if (plan.bed !== 'none' && !bedDips.some(d => d.at < at + oh.dip_s && at - 0.1 < d.at + d.dur)) bedDips.push({ at: +(at - oh.lead_s).toFixed(3), dur: oh.dip_s, db: oh.dip_db });
    defaultsLog.push(`#1 hit at ${at.toFixed(2)} s (${from}): flash + sting + bed dip`);
  }
  const creditStyle = (() => {
    const font = Math.max(VR_DEFAULTS.credit.min_font_px, plan.credit_style?.font_px ?? VR_DEFAULTS.credit.font_px);
    const cap = Math.floor(872 / (0.56 * font));                                         // chars that fit one line of the 872 px safe width
    const cy = plan.credit_center_y_px ?? VR_DEFAULTS.credit.center_y_px;
    if (cy > 1400 && bd.clip_credits) defaultsLog.push(`clip credits: credit_center_y_px ${cy} clamped to 1400 (safe box ends at y 1420)`);
    return { font_px: font, center_y_px: Math.min(1400, cy), max_chars: Math.min(cap, plan.credit_style?.max_chars ?? cap) };
  })();

  // narration: optional hook at 0 + one line per entry at its reveal (lines the builder can't fit are pushed / warned)
  const lines: any[] = [];
  if (plan.narration?.lines?.length) for (const l of plan.narration.lines) lines.push({ id: l.id, text: l.text, at: +(l.at_ms / 1000).toFixed(3) });
  else if (plan.narration?.hook) lines.push({ id: 'hook', text: plan.narration.hook, at: 0 });
  if (!plan.narration?.lines?.length) for (const me of mapEntries) {
    const e = byReveal[me.reveal_index];
    if (e.narration_text) lines.push({ id: `r${me.reveal_index}_n${e.rank_position}`, text: e.narration_text, at: +(me.est_start + (me.segment === 0 && plan.narration?.hook ? 0 : 0.15)).toFixed(3) });
  }

  // CTA (experiment, off by default): ≤ 0.8 s, never over a payoff, never in the first 1.5 s or across a reveal
  let cta: any = null;
  if (plan.cta_variant && plan.cta_variant !== 'none') {
    if (plan.cta_variant !== 'mid_sub') throw new Error(`cta_variant "${plan.cta_variant}" unknown (none | mid_sub)`);
    const busy = (a: number, b: number) => a < 1.5 || mapEntries.some(me => {
      const p = me.payoff_est ?? (me.est_start + ((me.out_ms - me.in_ms) / 1000) * 0.6);   // unknown payoff: protect the last 40 % of the window
      const pEnd = me.payoff_est != null ? p + 0.8 : me.est_start + (me.out_ms - me.in_ms) / 1000;
      return (a < pEnd && b > p - 0.6) || (a < me.est_start + 0.3 && b > me.est_start - 0.1);
    });
    let at: number | null = plan.cta_at_ms != null ? plan.cta_at_ms / 1000 : null;
    if (at != null) { if (busy(at, at + CTA_MAX)) throw new Error(`cta_at_ms ${plan.cta_at_ms} overlaps a payoff / reveal / the first 1.5 s`); }
    else for (let x = 1.5; x + CTA_MAX < total - 1; x += 0.25) if (!busy(x, x + CTA_MAX)) { at = x; break; }
    if (at == null) throw new Error('mid_sub CTA: no 0.8 s slot clear of payoffs and reveals');
    cta = { variant: 'mid_sub', at: +at.toFixed(3), dur: CTA_MAX, text: (plan.cta_text ?? 'SUBSCRIBE').toUpperCase() };
  }

  // script.json hook -> cutlist.texts at 0 s (the build warns when it is missing)
  let sj: any = opts.script;
  if (sj === undefined) { const f = path.join(P.productions, plan.production_id, 'script.json'); try { sj = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; } catch { sj = null; } }
  const hk = scriptHook(sj);
  const hookY = plan.caption_center_y_px != null ? +((plan.caption_center_y_px - VR.H / 2) / VR.H * 100).toFixed(2) : VR_CAPTIONS.y;
  const hookCard = hk ? hookText(hk, lines, hookY) : null;
  if (hookCard) defaultsLog.push(`hook "${hookCard.text.text}" 0-${hk!.dur} s in the caption band${hookCard.moved.length ? `; narration moved clear of it: ${hookCard.moved.join(', ')}` : ''}`);
  else report.warnings.push('no script.json hook (hook_text / on_screen role "hook"): frame 0 relies on the first caption');

  const logo = plan.branding?.logo_asset ?? VR.logoFile;
  const brandName = (db().prepare(`SELECT name FROM brands WHERE id=?`).get(BRAND) as any)?.name ?? BRAND;
  // subscribe/like badge (owner 2026-11-01, default ON; build_defaults.sub_badge=false or plan.sub_badge=false turns it off):
  // mid-video at the narrator's spoken ask (plan.spoken_cta_at_ms, or plan.spoken_cta.at_s copied from script.json) + during the end CTA (last 2.5 s)
  let subBadge: { at: number[]; x1?: number; y0?: number } | null = null;
  if (bd.sub_badge !== false && plan.sub_badge !== false) {
    const SB = 2.5, mid = plan.spoken_cta_at_ms != null ? plan.spoken_cta_at_ms / 1000 : plan.spoken_cta?.at_s != null ? Number(plan.spoken_cta.at_s) : null;
    const at: number[] = [];
    if (mid != null && mid >= 0 && mid + SB <= total - SB) at.push(+mid.toFixed(3));
    else report.warnings.push(mid == null ? 'sub_badge: no spoken_cta time (plan.spoken_cta_at_ms / spoken_cta.at_s), mid-video badge skipped' : `sub_badge: spoken ask at ${mid}s too close to the end badge, mid badge skipped`);
    at.push(+Math.max(0, total - SB).toFixed(3));
    subBadge = { at, ...(plan.sub_badge && typeof plan.sub_badge === 'object' ? { ...(plan.sub_badge.x1 != null ? { x1: plan.sub_badge.x1 } : {}), ...(plan.sub_badge.y0 != null ? { y0: plan.sub_badge.y0 } : {}), ...(plan.sub_badge.pin ? { pin: true } : {}) } : {}) };
  }
  const cutlist = {
    production_id: plan.production_id, width: VR.W, height: VR.H, fps: 30,
    segments,
    texts: [...(hookCard ? [hookCard.text] : []), ...(Array.isArray(plan.extra_texts) ? plan.extra_texts : [])],
    narration: lines.length ? { voice: plan.narration?.voice ?? 'Puck', style: plan.narration?.style ?? 'Playful, quick, warm comedic narrator; punchy one-liners, clear diction.', ...(plan.narration?.max_pause ? { max_pause: plan.narration.max_pause } : {}), snap_onsets: true, lines } : null,
    captions: lines.length ? 'narration' : 'none',
    caption_per_line: true, caption_bg: true, caption_bg_alpha: 0.8, ...(style === 'v2' ? { caption_style: 'v2', caption_no_cross: true } : {}),
    // overlay clearance (2026-11-08): new v2 cut lists only, so already approved productions rebuild unchanged. Entry caption_center_y_px and plate_xy pin; plan.caption_center_y_px is the preferred position; sub_badge.pin pins the badge
    ...(style === 'v2' && bd.overlay_clearance !== false ? { overlay_clearance: { caption_pin: byReveal.flatMap((e: any, k: number) => e.caption_center_y_px != null ? [k] : []), plate_xy: Object.fromEntries(byReveal.flatMap((e: any, k: number) => e.plate_xy ? [[String(k), e.plate_xy]] : [])) } } : {}),
    caption_y_ranges: (() => {
      const yOf = (px: number | null | undefined) => px != null ? +((px - VR.H / 2) / VR.H * 100).toFixed(2) : VR_CAPTIONS.y;
      const base = yOf(plan.caption_center_y_px);
      return mapEntries.map((me, i) => ({ from: i === 0 ? 0 : me.est_start, to: i === mapEntries.length - 1 ? 1e6 : mapEntries[i + 1].est_start, y: byReveal[me.reveal_index].caption_center_y_px != null ? yOf(byReveal[me.reveal_index].caption_center_y_px) : base }));
    })(), caption_x: VR_CAPTIONS.x, caption_font_px: plan.caption_font_px ?? VR_CAPTIONS.font_px, caption_max_chars: plan.caption_max_chars ?? VR_CAPTIONS.max_chars, caption_min_page: Math.max(plan.caption_min_page ?? 0, CAPTION_MIN_PAGE), ...(plan.caption_clip?.length ? { caption_clip: plan.caption_clip } : {}),
    bed: plan.bed === 'none' ? null : 'tone',
    bed_accents: mapEntries.map(me => me.est_start).filter(x => x > 0.05).concat(oneHit ? [oneHit.at] : mapEntries.at(-1)?.payoff_est ?? []),
    credits: plan.credits?.length ? plan.credits : credits,
    ...(plan.caption_emphasis ? { emphasis_map: Object.fromEntries(Object.entries(plan.caption_emphasis).map(([w, c]) => [String(w).toUpperCase(), String(c).toUpperCase()])) } : {}),
    ...(bedDips.length ? { bed_dips: bedDips.sort((a, b) => a.at - b.at) } : {}),
    // per-clip credit plates (default since 2026-10-31): one line per clip while it plays; the single persistent credit_line only with build_defaults.clip_credits = false
    // owner 2026-11-01: "Clip: owner-supplied" plates are dropped by the builder (build.ts); credit stays in the description
    // owner rule: Podium Pop shows NO credit/source plates on screen (clip_credits / credit_line never emitted; description credits unaffected)
    ...(oneHit ? { one_hit: oneHit } : {}),
    ...(plan.end_cta ? { end_cta: { text: plan.end_cta.text, dur: +((plan.end_cta.dur_ms ?? VR_DEFAULTS.cta_dur_ms) / 1000).toFixed(3) } } : {}),
    ...(bd.cta_band ? { cta_band: true } : {}),
    ...(bd.caption_zero && !hookCard ? { caption_start_zero: true } : {}),
    ...(tailMaxMs != null && plan.end_hold_ms == null ? { tail_max: +(tailMaxMs / 1000).toFixed(3) } : {}),
    ...(plan.end_hold_ms != null ? { end_hold: +(plan.end_hold_ms / 1000).toFixed(3) } : {}),
    target_duration: +total.toFixed(2),
    rank_layers: {
      n, reveal_order: plan.reveal_order,
      labels: Object.fromEntries(plan.entries.map((e: any) => [String(e.rank_position), e.left_label])),
      title: { words },
      logo: logo && fs.existsSync(path.resolve(P.root, logo)) ? path.resolve(P.root, logo) : null,
      brand_text: plan.branding?.brand_text ?? (/working name/i.test(brandName) ? 'TOP RANK' : brandName),
      flash: !!plan.rank_flash,
      ...(bd.rail_empty ? { empty_open: true } : {}),
      ...(compact || full ? { title_layout: plan.title_layout, title_box: layout.title } : {}),
      ...(style === 'v2' ? { style: 'v2' } : {}),
      ...(plan.rail_off_at_ms != null ? { rail_off_at: +(plan.rail_off_at_ms / 1000).toFixed(3) } : {}),
      ...(plan.rail_label_at_ms?.length ? { label_at: plan.rail_label_at_ms.map((x: number | null) => x == null ? null : +(x / 1000).toFixed(3)) } : {}),
      cta,
      ...(subBadge ? { sub_badge: subBadge } : {}),
    },
    ranking: { plan: opts.planPath ? path.relative(P.root, path.resolve(opts.planPath)).replace(/\\/g, '/') : null, format: plan.format, reveal_order: plan.reveal_order,
      criterion: plan.ranking_criterion, entries: mapEntries, warnings: report.warnings, defaults: defaultsLog },   // no description_credits (owner 2026-11-01: viral-rankings descriptions carry no credits block)
  };
  return { cutlist, warnings: report.warnings };
}

export type { Rect };
