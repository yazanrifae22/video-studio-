/**
 * Render-time text safety (owner 2026-11-08: "check all the texts in the frame are viewable: not overflowing the video or cut").
 * Measures every text the viewer will see with its REAL laid-out box (Chrome, after fonts load) and writes vN/qa/text-safety.json:
 *  - timeline text items: the same Chrome page that paints the text cards (text.ts window.card metrics: glyph/pill box after the
 *    fit loop, word spill, cap height, RTL order probe); boxes are static per item, visibility from opacity/fades per frame
 *  - HyperFrames layers baked into video items (quiz-ar rounds + Arabic captions, tech/celebrity scenes): the project's
 *    index.html is loaded, its GSAP timelines are seeked every html_sample_step_s, and every visible text block is measured
 *    (ancestor overflow clipping, canvas edges, cap height incl. CSS transforms, RTL order) and grouped over time
 *  - text-bearing image / alpha-video overlays (title band, rail, badge, kids wall): painted alpha box over all frames (coarse,
 *    warnings only)
 * Roles (owner 2026-11-08): every text is `main` (min_cap_height_pct, 2.2 %) unless the builder marks it `label` (role_min_cap_height_pct.label,
 * 1.4 %: round counters, rank rail sublabels, badges, chips): timeline text item `role: 'label'`, HyperFrames element (or ancestor)
 * `data-ts-role="label"`, or a brand `roles` rule in config/text-safety.json for layers that cannot carry metadata (image overlays).
 * Issues: clipped, offcanvas, unsafe_margin, ui_zone, too_small, overlap, rtl (config/text-safety.json: zones per aspect + brand,
 * explicit brand exemptions, thresholds, which issues block). Wired into build (render.ts), prelint, stage qa; CLI `text-safety`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RTL_PROBE, renderCards, withChrome } from './text.ts';
import { opacityAt, propAt, type ImageItem, type TextItem, type Timeline, type VideoItem } from './timeline.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
export const RENDER_TMP = process.env.STUDIO_RENDER_TMP ?? 'E:\\clips-viral-render-tmp';

export interface Zone { id: string; x0: number; x1: number; y0: number; y1: number; why?: string }
export interface Exempt { match: { source?: string; layer?: string; text?: string; id?: string; y_max_pct?: number; y_min_pct?: number }; allow: string[]; reason: string }
export interface RoleRule { match: Exempt['match']; role: string; reason?: string }
export interface TsConfig {
  margin_pct_of_short_side: number; min_cap_height_pct: number; role_min_cap_height_pct?: Record<string, number>; min_issue_seconds: number; overlap_min_area_frac: number; html_sample_step_s: number;
  blocking: string[]; warning_only: string[]; warning_only_sources: string[]; layer_tracks: string; layer_tracks_skip: string;
  zones: Record<string, Zone[]>; brands: Record<string, { zones?: Zone[]; exempt?: Exempt[]; roles?: RoleRule[] }>;
}
export function loadTextSafetyConfig(file = path.join(ROOT, 'config', 'text-safety.json')): TsConfig {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export interface Box { x: number; y: number; w: number; h: number }
/** one measured text before evaluation (canvas px, seconds) */
export interface RawText {
  id: string; source: 'timeline' | 'html' | 'layer'; layer: string; text: string;
  t_start: number; t_end: number; intervals: [number, number][];
  box: Box; cap?: number; fit?: number; shift?: number; lines?: number; spill?: boolean;
  /** builder metadata: 'main' (default) | 'label' (smaller minimum cap height) */
  role?: string;
  /** html: seconds the block was cut by an ancestor's overflow / by the canvas */
  cut_s?: number; off_s?: number; cut_by?: string;
  rtl?: { dir: string; problems: string[] } | null;
}
export interface TsItem {
  id: string; source: RawText['source']; layer: string; t_start: number; t_end: number; text: string; role: string;
  box: Box & { pct: Box }; cap_px?: number; cap_pct?: number; fit?: number; shift?: number; lines?: number;
  issues: string[]; details: string[]; exempt?: { issue: string; reason: string }[]; blocking: boolean;
}
export interface TsReport {
  version: 1; production_id?: string; render_version?: number; brand: string | null; width: number; height: number; aspect: string;
  config: string; thresholds: { margin_px: number; min_cap_px: number; min_cap_px_by_role?: Record<string, number>; min_issue_seconds: number }; zones: Zone[];
  sources: { timeline: number; html: number; layer: number }; html_layers: string[]; unmeasured: string[];
  items: TsItem[]; counts: Record<string, number>; blocking: number; warnings: number; pass: boolean; at: string; error?: string;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h);
function inter(a: Box, b: Box): Box { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y); return { x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y }; }
function timeOverlap(a: [number, number][], b: [number, number][]) {
  let s = 0;
  for (const [a0, a1] of a) for (const [b0, b1] of b) s += Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  return s;
}
export const aspectOf = (W: number, H: number) => (H > W ? '9:16' : '16:9');
export function zonesFor(W: number, H: number, brand: string | null, cfg: TsConfig): Zone[] {
  const base = cfg.zones[aspectOf(W, H)] ?? [];
  const over = aspectOf(W, H) === '9:16' || brand === 'kids' ? cfg.brands[brand ?? '']?.zones ?? [] : [];
  return [...base.filter(z => !over.some(o => o.id === z.id)), ...over];
}

/** min cap height (% of H) for a role: role_min_cap_height_pct[role], else min_cap_height_pct (main). */
export const minCapPctFor = (role: string, cfg: TsConfig) => cfg.role_min_cap_height_pct?.[role] ?? cfg.min_cap_height_pct;
function matches(m: Exempt['match'], it: { source: string; layer: string; text: string; id: string; pct?: Box }) {
  if (m.source && m.source !== it.source) return false;
  if (m.layer && !new RegExp(m.layer, 'i').test(it.layer)) return false;
  if (m.text && !new RegExp(m.text, 'i').test(it.text)) return false;
  if (m.id && !new RegExp(m.id, 'i').test(it.id)) return false;
  if (it.pct && m.y_max_pct != null && it.pct.y + it.pct.h > m.y_max_pct) return false;
  if (it.pct && m.y_min_pct != null && it.pct.y < m.y_min_pct) return false;
  return true;
}
/** builder metadata wins; else the first brand roles rule that matches; else main. Unknown roles fall back to main's minimum. */
export function roleOf(r: RawText, brand: string | null, cfg: TsConfig, W = 1, H = 1): string {
  if (r.role) return String(r.role);
  const pct = { x: (r.box.x / W) * 100, y: (r.box.y / H) * 100, w: (r.box.w / W) * 100, h: (r.box.h / H) * 100 };
  for (const rule of cfg.brands[brand ?? '']?.roles ?? []) if (matches(rule.match ?? {}, { ...r, pct })) return rule.role;
  return 'main';
}

/* ---------------------------------------------------------------- evaluation (pure; scripts/test-text-safety.ts) */
export function evaluateTextSafety(raws: RawText[], W: number, H: number, brand: string | null, cfg: TsConfig = loadTextSafetyConfig()): Omit<TsReport, 'production_id' | 'render_version' | 'html_layers' | 'unmeasured' | 'at'> {
  const M = (Math.min(W, H) * cfg.margin_pct_of_short_side) / 100, minCap = (H * cfg.min_cap_height_pct) / 100, minS = cfg.min_issue_seconds;
  const zones = zonesFor(W, H, brand, cfg);
  const exempts = cfg.brands[brand ?? '']?.exempt ?? [];
  const items: (TsItem & { _tok: Set<string>; _det: { tok: string; text: string }[]; _raw: RawText })[] = raws.map(r => {
    const tok = new Set<string>(), det: { tok: string; text: string }[] = [];
    const add = (t: string, text: string) => { tok.add(t); det.push({ tok: t, text }); };
    const b = r.box, x1 = b.x + b.w, y1 = b.y + b.h, tol = 0.5;
    const off = b.x < -tol || b.y < -tol || x1 > W + tol || y1 > H + tol || (r.off_s ?? 0) >= minS;
    if (off) { tok.add('clipped'); add('offcanvas', `offcanvas: box ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)} leaves the ${W}x${H} frame${r.off_s ? ` (${r1(r.off_s)} s)` : ''}`); }
    if (r.spill) add('clipped', 'clipped: a word is wider than its text box (overflows / is cut)');
    if ((r.cut_s ?? 0) >= minS) { add('clipped', `clipped: cut by ${r.cut_by ?? 'a parent box'} for ${r1(r.cut_s!)} s`); }
    if (!off && (b.x < M - tol || b.y < M - tol || x1 > W - M + tol || y1 > H - M + tol)) { add('unsafe_margin', `unsafe_margin: inside the ${Math.round(M)} px edge margin (${cfg.margin_pct_of_short_side}% of the short side)`); }
    for (const z of zones) {
      const zb = { x: (z.x0 * W) / 100, y: (z.y0 * H) / 100, w: ((z.x1 - z.x0) * W) / 100, h: ((z.y1 - z.y0) * H) / 100 };
      const i = inter(b, zb);
      if (i.w > W * 0.005 && i.h > H * 0.005) { add(`ui_zone:${z.id}`, `ui_zone:${z.id}: ${Math.round(i.w)}x${Math.round(i.h)} px inside ${z.id} (${z.why ?? ''})`.trim()); }
    }
    const role = roleOf(r, brand, cfg, W, H), minPct = minCapPctFor(role, cfg), minCapR = (H * minPct) / 100;
    if (r.cap != null && r.cap > 0 && r.cap < minCapR - 0.05) { add('too_small', `too_small: cap height ${r1(r.cap)} px = ${r1((r.cap / H) * 100)}% < ${minPct}% of ${H} for role ${role} (unreadable at 360 px)`); }
    for (const p of r.rtl?.problems ?? []) add('rtl', `rtl: ${p}`);
    const pct = { x: r3((b.x / W) * 100), y: r3((b.y / H) * 100), w: r3((b.w / W) * 100), h: r3((b.h / H) * 100) };
    return { id: r.id, source: r.source, layer: r.layer, t_start: r3(r.t_start), t_end: r3(r.t_end), text: r.text, role, box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), pct },
      ...(r.cap != null ? { cap_px: r1(r.cap), cap_pct: r3((r.cap / H) * 100) } : {}), ...(r.fit != null && r.fit < 1 ? { fit: r.fit } : {}), ...(r.shift ? { shift: r.shift } : {}), ...(r.lines ? { lines: r.lines } : {}),
      issues: [], details: [] as string[], blocking: false, _tok: tok, _det: det, _raw: r };
  });
  // overlap: two texts visible together >= min_issue_seconds whose boxes share >= overlap_min_area_frac of the smaller one
  const solid = items.filter(i => i.source !== 'layer');
  for (let a = 0; a < solid.length; a++) for (let c = a + 1; c < solid.length; c++) {
    const A = solid[a], C = solid[c];
    const ia = area(inter(A._raw.box, C._raw.box)), small = Math.min(area(A._raw.box), area(C._raw.box));
    if (!(small > 0 && ia / small >= cfg.overlap_min_area_frac)) continue;
    const iou = ia / (area(A._raw.box) + area(C._raw.box) - ia);
    if (A.text === C.text && iou > 0.8) continue;   // the same text layered twice (glow / outline copy)
    const s = timeOverlap(A._raw.intervals, C._raw.intervals);
    if (s < minS) continue;
    A._tok.add('overlap'); C._tok.add('overlap');
    A._det.push({ tok: 'overlap', text: `overlap: with "${C.text.slice(0, 40)}" (${C.id}) for ${r1(s)} s, ${Math.round((ia / small) * 100)}% of the smaller box` });
    C._det.push({ tok: 'overlap', text: `overlap: with "${A.text.slice(0, 40)}" (${A.id}) for ${r1(s)} s, ${Math.round((ia / small) * 100)}% of the smaller box` });
  }
  // explicit brand exemptions (config/text-safety.json brands.<brand>.exempt)
  for (const it of items) {
    for (const e of exempts) {
      if (!matches(e.match ?? {}, { ...it, pct: it.box.pct })) continue;
      for (const t of [...it._tok]) if (e.allow.some(a => a === t || (a === 'ui_zone' && t.startsWith('ui_zone:')))) {
        it._tok.delete(t); (it.exempt ??= []).push({ issue: t, reason: e.reason });
      }
    }
    it.issues = [...new Set([...it._tok].map(t => t.split(':')[0]))];
    // 'clipped' that only came from the canvas edge goes with an exempted 'offcanvas'
    if (it._tok.has('clipped') && !it._det.some(d => d.tok === 'clipped') && !it._tok.has('offcanvas')) it._tok.delete('clipped');
    it.details = it._det.filter(d => it._tok.has(d.tok)).map(d => d.text);
    it.blocking = it.issues.some(i => cfg.blocking.includes(i) && !cfg.warning_only.includes(i)) && !cfg.warning_only_sources.includes(it.source);
  }
  const counts: Record<string, number> = {};
  for (const it of items) for (const i of it.issues) counts[i] = (counts[i] ?? 0) + 1;
  const out = items.map(({ _tok, _det, _raw, ...rest }) => rest);
  const blocking = out.filter(i => i.blocking).length;
  return { version: 1, brand, width: W, height: H, aspect: aspectOf(W, H), config: 'config/text-safety.json',
    thresholds: { margin_px: Math.round(M), min_cap_px: r1(minCap), min_cap_px_by_role: Object.fromEntries(Object.entries(cfg.role_min_cap_height_pct ?? {}).map(([k, v]) => [k, r1((H * v) / 100)])), min_issue_seconds: minS }, zones,
    sources: { timeline: out.filter(i => i.source === 'timeline').length, html: out.filter(i => i.source === 'html').length, layer: out.filter(i => i.source === 'layer').length },
    items: out.sort((a, b) => a.t_start - b.t_start), counts, blocking, warnings: out.filter(i => !i.blocking && i.issues.length).length, pass: blocking === 0 };
}

/* ---------------------------------------------------------------- measurement */
function intervalsOf(it: { fromFrame: number; durationInFrames: number } & any, fps: number, N: number): [number, number][] {
  const out: [number, number][] = [];
  let s = -1;
  const end = Math.min(it.fromFrame + it.durationInFrames, N);
  for (let f = it.fromFrame; f <= end; f++) {
    const vis = f < end && opacityAt(it, f - it.fromFrame) > 0.2;
    if (vis && s < 0) s = f;
    if (!vis && s >= 0) { out.push([s / fps, f / fps]); s = -1; }
  }
  return out;
}

async function measureTimelineTexts(tl: Timeline, cardDir: string): Promise<RawText[]> {
  const N = tl.durationInFrames, fps = tl.fps;
  const texts: { it: TextItem; track: string; idx: number }[] = [];
  tl.tracks.forEach(t => t.items.forEach((it, idx) => { if (it.type === 'text' && it.fromFrame < N) texts.push({ it: it as TextItem, track: t.name, idx }); }));
  if (!texts.length) return [];
  const cards = await renderCards(texts.map(x => x.it), tl.width, tl.height, cardDir);
  return texts.map(({ it, track, idx }, i) => {
    const c = cards[i], m = c.m;
    const box = m ? (m.box ?? m.glyph) : { x: c.x, y: c.y, w: c.w, h: c.h };
    const iv = intervalsOf(it, fps, N);
    return { id: String(it.id ?? `${track}#${idx}`), source: 'timeline' as const, layer: track, text: it.text,
      t_start: it.fromFrame / fps, t_end: Math.min(N, it.fromFrame + it.durationInFrames) / fps, intervals: iv.length ? iv : [[it.fromFrame / fps, (it.fromFrame + it.durationInFrames) / fps]],
      box, cap: m?.cap, fit: c.fit, shift: c.shift, lines: m?.lines, spill: m?.spill ?? false, rtl: m?.rtl ?? null, ...(it.role ? { role: it.role } : {}) };
  });
}

async function measureLayers(tl: Timeline, cfg: TsConfig, skipSrc: Set<string>): Promise<{ raws: RawText[]; unmeasured: string[] }> {
  const { paintedBox } = await import('./render.ts');
  const W = tl.width, H = tl.height, fps = tl.fps, N = tl.durationInFrames;
  const want = new RegExp(cfg.layer_tracks, 'i'), skip = new RegExp(cfg.layer_tracks_skip, 'i');
  const raws: RawText[] = [], unmeasured: string[] = [];
  for (const [ti, t] of tl.tracks.entries()) {
    if (t.kind !== 'video' || ti === 0 || !want.test(t.name) || skip.test(t.name)) continue;
    for (const [idx, it] of t.items.entries()) {
      if (it.type !== 'image' && it.type !== 'video') continue;
      const src = (it as ImageItem | VideoItem).src;
      if (skipSrc.has(path.resolve(src)) || it.fromFrame >= N) continue;
      let pb: Awaited<ReturnType<typeof paintedBox>> = null;
      try { pb = fs.existsSync(src) ? await paintedBox(src) : null; } catch { pb = null; }
      if (!pb) { unmeasured.push(`${t.name}: ${path.basename(src)} (opaque or unreadable)`); continue; }
      if (pb.box[2] <= pb.box[0] || pb.box[3] <= pb.box[1]) continue;   // nothing painted
      const k = Math.min(W / pb.w, H / pb.h), rw = pb.w * k, rh = pb.h * k, rx = (W - rw) / 2, ry = (H - rh) / 2;
      const s = propAt(it, 'scale', 0), tx = (propAt(it, 'x', 0) * W) / 100, ty = (propAt(it, 'y', 0) * H) / 100;
      const mapX = (bx: number) => (rx + (bx / pb!.w) * rw - W / 2) * s + W / 2 + tx, mapY = (by: number) => (ry + (by / pb!.h) * rh - H / 2) * s + H / 2 + ty;
      const box = { x: mapX(pb.box[0]), y: mapY(pb.box[1]), w: mapX(pb.box[2]) - mapX(pb.box[0]), h: mapY(pb.box[3]) - mapY(pb.box[1]) };
      const t0 = it.fromFrame / fps, t1 = Math.min(N, it.fromFrame + it.durationInFrames) / fps;
      raws.push({ id: String(it.id ?? `${t.name}#${idx}`), source: 'layer', layer: t.name, text: `[${t.name}] ${path.basename(src)}`, t_start: t0, t_end: t1, intervals: [[t0, t1]], box });
    }
  }
  return { raws, unmeasured };
}

/** A HyperFrames project baked into a timeline video item: sampled from `srcStart` for `dur` s, shown from `from` s. */
export interface HtmlLayer { name: string; dir: string; from: number; dur: number; srcStart: number; src?: string }

/* in-page HyperFrames text scan: seek every registered GSAP timeline, honour data-start/data-duration windows, measure text blocks */
const SCAN = String.raw`
window.__tsCap = {};
window.__tsScan = function (t) {
  const absStart = (el) => { let s = 0; for (let e = el; e && e.dataset; e = e.parentElement) if (e.dataset.start != null) s += parseFloat(e.dataset.start) || 0; return s; };
  const tls = window.__timelines || {};
  for (const id in tls) { try { const host = document.querySelector('[data-composition-id="' + id + '"]'); tls[id].seek(Math.max(0, t - (host ? absStart(host.parentElement) + (parseFloat(host.dataset.start) || 0) : 0)), false); } catch (e) {} }
  const W = window.innerWidth, H = window.innerHeight;
  const hiddenByWindow = (el) => { for (let e = el; e && e.dataset; e = e.parentElement) { if (e.dataset.start == null || e.dataset.compositionId != null && !e.parentElement.closest('[data-composition-id]')) continue; const s = absStart(e), d = parseFloat(e.dataset.duration); if (t < s - 1e-6 || (d > 0 && t >= s + d)) return true; } return false; };
  const groups = new Map();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.data.trim()) continue;
    const pe = n.parentElement; if (!pe || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(pe.tagName)) continue;
    let b = pe; while (b.parentElement && /^(inline|contents)$/.test(getComputedStyle(b).display)) b = b.parentElement;
    if (!groups.has(b)) groups.set(b, []); groups.get(b).push(n);
  }
  const out = [];
  for (const [b, nodes] of groups) {
    const bs = getComputedStyle(b);
    if (bs.visibility === 'hidden' || hiddenByWindow(b)) continue;
    let op = 1, disp = true;
    for (let e = b; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none') { disp = false; break; } op *= parseFloat(c.opacity); }
    if (!disp || op < 0.2) continue;
    const ib = window.__inkBox(nodes);
    if (!ib) continue;
    const x0 = ib.x, y0 = ib.y, x1 = ib.x + ib.w, y1 = ib.y + ib.h;
    let cut = null;
    for (let e = b; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
      const c = getComputedStyle(e);
      if (c.overflowX === 'visible' && c.overflowY === 'visible' && c.clipPath === 'none') continue;
      const r = e.getBoundingClientRect();
      if (r.width >= W - 1 && r.height >= H - 1 && r.left <= 1 && r.top <= 1) continue;   // the full-canvas root: that is the canvas check
      if (x0 < r.left - 1.5 || y0 < r.top - 1.5 || x1 > r.right + 1.5 || y1 > r.bottom + 1.5) { cut = (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/)[0] : '')); break; }
    }
    const off = x0 < -0.5 || y0 < -0.5 || x1 > W + 0.5 || y1 > H + 0.5;
    const fe = nodes[0].parentElement, fc = getComputedStyle(fe), fpx = parseFloat(fc.fontSize) || 0;
    const fr = fe.getBoundingClientRect(), sc = fe.offsetHeight > 0 ? fr.height / fe.offsetHeight : 1;
    const txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
    const ar = /[\u0600-\u06FF]/.test(txt) && !/[A-Za-z]/.test(txt);
    const fk = fc.fontStyle + ' ' + fc.fontWeight + ' ' + fc.fontSize + ' ' + fc.fontFamily + (ar ? ' ar' : '');
    if (window.__tsCap[fk] == null) { const cx = document.createElement('canvas').getContext('2d'); cx.font = fc.fontStyle + ' ' + fc.fontWeight + ' ' + fc.fontSize + ' ' + fc.fontFamily; window.__tsCap[fk] = (cx.measureText(ar ? '\u0627' : 'H').actualBoundingBoxAscent || fpx * 0.7) / (fpx || 1); }
    if (!b.dataset.tsid) b.dataset.tsid = String(Object.keys(window.__tsIds = window.__tsIds || {}).length + 1), window.__tsIds[b.dataset.tsid] = 1;
    const rl = b.closest('[data-ts-role]');
    out.push({ id: (b.id || b.tagName.toLowerCase()) + '#' + b.dataset.tsid, text: txt, r: [x0, y0, x1 - x0, y1 - y0], cut, off, cap: window.__tsCap[fk] * fpx * sc, rtl: window.__rtlProbe ? window.__rtlProbe(b) : null, role: rl ? rl.getAttribute('data-ts-role') : null });
  }
  return out;
};
window.__tsRun = async function (times) {
  // the HyperFrames runtime sizes every composition host from data-width/data-height (the bare page leaves a height:100% root at 0 px)
  for (const el of document.querySelectorAll('[data-composition-id][data-width][data-height]')) { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) { el.style.width = el.dataset.width + 'px'; el.style.height = el.dataset.height + 'px'; } }
  await document.fonts.ready; const res = []; for (const t of times) res.push(window.__tsScan(t)); return res; };`;

async function measureHtmlLayers(layers: HtmlLayer[], W: number, H: number, step: number): Promise<RawText[]> {
  if (!layers.length) return [];
  return withChrome(W, H, async cdp => {
    await cdp.send('Page.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__timelines = window.__timelines || {}; ${RTL_PROBE}; ${SCAN}` });
    const raws: RawText[] = [];
    for (const L of layers) {
      const html = path.join(L.dir, 'index.html');
      await cdp.send('Page.navigate', { url: 'file:///' + html.replace(/\\/g, '/') });
      for (let i = 0; i < 400 && !(await cdp.eval('document.readyState === "complete" && typeof window.__tsRun === "function"').catch(() => false)); i++) await new Promise(r => setTimeout(r, 25));
      await new Promise(r => setTimeout(r, 150));
      const times: number[] = [];
      for (let t = L.srcStart; t < L.srcStart + L.dur - 1e-6; t += step) times.push(+t.toFixed(4));
      const res: any[][] = await cdp.eval(`window.__tsRun(${JSON.stringify(times)})`);
      const groups = new Map<string, { id: string; text: string; ts: number[]; rects: Map<string, { r: number[]; n: number }>; caps: number[]; cut: number; off: number; cutBy?: string; rtl: any; role?: string }>();
      res.forEach((list, k) => {
        const t = L.from + (times[k] - L.srcStart);
        for (const b of list ?? []) {
          const key = `${b.id}|${b.text}`;
          let g = groups.get(key);
          if (!g) groups.set(key, g = { id: `${L.name}:${b.id}`, text: b.text, ts: [], rects: new Map(), caps: [], cut: 0, off: 0, rtl: b.rtl, ...(b.role ? { role: b.role } : {}) });
          g.ts.push(t);
          const rk = b.r.map((v: number) => Math.round(v / 8)).join(',');
          const e = g.rects.get(rk); if (e) e.n++; else g.rects.set(rk, { r: b.r, n: 1 });
          if (b.cap > 0) g.caps.push(b.cap);
          if (b.cut) { g.cut++; g.cutBy = b.cut; }
          if (b.off) g.off++;
          if (b.rtl?.problems?.length) g.rtl = b.rtl;
        }
      });
      for (const g of groups.values()) {
        const iv: [number, number][] = [];
        for (const t of g.ts) { const last = iv[iv.length - 1]; if (last && t - last[1] <= step * 1.5) last[1] = t + step; else iv.push([t, t + step]); }
        const mode = [...g.rects.values()].sort((a, b) => b.n - a.n)[0].r;
        const caps = g.caps.sort((a, b) => a - b);
        raws.push({ id: g.id, source: 'html', layer: L.name, text: g.text, t_start: iv[0][0], t_end: iv[iv.length - 1][1], intervals: iv,
          box: { x: mode[0], y: mode[1], w: mode[2], h: mode[3] }, cap: caps.length ? caps[Math.floor(caps.length / 2)] : undefined,
          cut_s: g.cut * step, off_s: g.off * step, cut_by: g.cutBy, rtl: g.rtl, ...(g.role ? { role: g.role } : {}) });
      }
    }
    return raws;
  });
}

/** HyperFrames projects behind a production's video items (quiz rounds + captions, tech/celebrity scenes), from the render tmp. */
export function inferHtmlLayers(tl: Timeline, productionId: string, n: number): HtmlLayer[] {
  const out: HtmlLayer[] = [];
  const quiz = path.join(RENDER_TMP, 'quiz', productionId, `v${n}`), tech = path.join(RENDER_TMP, 'tech', `${productionId}-v${n}`);
  for (const t of tl.tracks) for (const it of t.items) {
    if (it.type !== 'video') continue;
    const bn = path.basename((it as VideoItem).src);
    let dir: string | null = null, name = '';
    const mr = /^\d+_(.+?)(?:\.[0-9a-f]{6,})?\.(?:mp4|webm|mov)$/i.exec(bn);
    if (mr && fs.existsSync(path.join(quiz, mr[1], 'index.html'))) { dir = path.join(quiz, mr[1]); name = mr[1]; }
    else if (/^captions(?:\.[0-9a-f]{6,})?\.webm$/i.test(bn) && fs.existsSync(path.join(quiz, 'captions', 'index.html'))) { dir = path.join(quiz, 'captions'); name = 'captions'; }
    else if (/^scenes(?:\.[0-9a-f]{6,})?\.mp4$/i.test(bn) && fs.existsSync(path.join(tech, 'index.html'))) { dir = tech; name = 'scenes'; }
    if (!dir) continue;
    out.push({ name, dir, from: it.fromFrame / tl.fps, dur: Math.min(it.durationInFrames, tl.durationInFrames - it.fromFrame) / tl.fps, srcStart: ((it as VideoItem).srcStartFrame ?? 0) / tl.fps, src: (it as VideoItem).src });
  }
  return out;
}

async function brandOf(productionId?: string): Promise<string | null> {
  if (!productionId) return null;
  try { const { db } = await import('../../shared/src/db.ts'); return ((db().prepare(`SELECT brand_id FROM productions WHERE production_id=?`).get(productionId) as any)?.brand_id) ?? null; }
  catch { return null; }
}

export interface TextSafetyOpts { brand?: string | null; productionId?: string; version?: number; out?: string; workDir?: string; layers?: HtmlLayer[]; cfg?: TsConfig }
/** Measure + evaluate every text of a timeline; writes `out` when given. Never throws: a failure becomes {pass:false, error}. */
export async function textSafety(tl: Timeline, opts: TextSafetyOpts = {}): Promise<TsReport> {
  const cfg = opts.cfg ?? loadTextSafetyConfig();
  const brand = opts.brand !== undefined ? opts.brand : (tl.meta?.brand as string | undefined) ?? await brandOf(opts.productionId);
  const tmp = opts.workDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'studio-ts-'));
  let rep: TsReport;
  try {
    const layers = opts.layers ?? (opts.productionId && opts.version ? inferHtmlLayers(tl, opts.productionId, opts.version) : []);
    const timeline = await measureTimelineTexts(tl, path.join(tmp, 'text'));
    const html = await measureHtmlLayers(layers, tl.width, tl.height, cfg.html_sample_step_s);
    const lay = await measureLayers(tl, cfg, new Set(layers.map(l => path.resolve(l.src ?? ''))));
    const ev = evaluateTextSafety([...timeline, ...html, ...lay.raws], tl.width, tl.height, brand ?? null, cfg);
    const unmeasured = [...lay.unmeasured];
    if (!timeline.length && !html.length) unmeasured.push('no timeline text items and no HyperFrames layers found: on-screen text (if any) is baked into the picture; frame-text-inspector checks it on frames');
    rep = { ...ev, production_id: opts.productionId, render_version: opts.version, html_layers: layers.map(l => `${l.name} @${l.from.toFixed(2)}s (${path.relative(RENDER_TMP, l.dir)})`), unmeasured, at: new Date().toISOString() };
  } catch (e: any) {
    rep = { version: 1, production_id: opts.productionId, render_version: opts.version, brand: brand ?? null, width: tl.width, height: tl.height, aspect: aspectOf(tl.width, tl.height), config: 'config/text-safety.json',
      thresholds: { margin_px: 0, min_cap_px: 0, min_issue_seconds: cfg.min_issue_seconds }, zones: [], sources: { timeline: 0, html: 0, layer: 0 }, html_layers: [], unmeasured: [], items: [], counts: {},
      blocking: 0, warnings: 0, pass: false, at: new Date().toISOString(), error: `text-safety measurement failed: ${String(e?.message ?? e).slice(0, 400)} (re-run: npm run -s cli -- text-safety <id>)` };
  } finally {
    if (!opts.workDir) try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* temp */ }
  }
  if (opts.out) { fs.mkdirSync(path.dirname(opts.out), { recursive: true }); fs.writeFileSync(opts.out, JSON.stringify(rep, null, 1), 'utf8'); }
  return rep;
}

/** vN/qa/text-safety.json for a render whose work dir is productions/<id>/vN/render-work (every builder): auto mode of renderTimeline. */
export function autoTarget(workDir: string): { productionId: string; version: number; out: string } | null {
  const vdir = path.dirname(path.resolve(workDir));
  if (path.basename(path.resolve(workDir)) !== 'render-work' || !/^v\d+$/.test(path.basename(vdir))) return null;
  return { productionId: path.basename(path.dirname(vdir)), version: Number(path.basename(vdir).slice(1)), out: path.join(vdir, 'qa', 'text-safety.json') };
}

/** One-line summary for logs / CLI. */
export function textSafetySummary(r: TsReport): string {
  if (r.error) return `text-safety ERROR: ${r.error}`;
  const c = Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(', ');
  return `text-safety ${r.pass ? 'PASS' : 'FAIL'}: ${r.items.length} text(s) (timeline ${r.sources.timeline}, html ${r.sources.html}, layers ${r.sources.layer}); ${r.blocking} blocking, ${r.warnings} warning(s)${c ? ` [${c}]` : ''}`;
}
