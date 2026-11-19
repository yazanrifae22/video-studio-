/**
 * Pre-QA lint (2026-11-02, from the audit of 747 QA reviews, 54 % non-pass): the automatic findings QA kept raising, checked on the
 * latest version BEFORE a showrunner stages `qa`. `npm run -s cli -- prelint <id> [--no-asr]`; `production:stage <id> qa` refuses
 * a failing (or stale) prelint unless `--force --note "..."`.
 * Checks (fail): caption fillers / repeated words, caption pages < 0.7 s, frame 0 without on-screen text or on black / letterbox
 * bars, caption text vs ASR of the render (generalised captions_audit, all brands -> vN/qa/captions_audit.json), title/label claims
 * without a claim -> evidence line, credit wording vs the rights record, AI-generation text in titles/descriptions, mojibake,
 * clicks at audio joins (timeline.json renders). Result: vN/qa/prelint.json.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { P } from '../../shared/src/paths.ts';
import { aiTextFields, aiTextHit, stringsWithKeys } from '../../shared/src/ai-text.ts';
import { publishedMeta, youtubeLimitIssues } from '../../shared/src/platform-limits.ts';
import { CAPTION_MIN_PAGE, CAPTION_MIN_PAGE_SHORT } from '../../shared/src/caption-gate.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { detectClicks } from '../../render/src/clicks.ts';
import { seamlessJoins } from '../../render/src/render.ts';
import type { AudioItem, Timeline, VideoItem } from '../../render/src/timeline.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');

export interface Finding { check: string; detail: string }
export interface PrelintResult { production_id: string; version: number; brand: string; pass: boolean; failures: Finding[]; warnings: Finding[]; checked: string[]; render: string | null; at: string }

/* ---------------------------------------------------------------- pure checks (unit-tested in scripts/test-prelint.ts) */
export const FILLERS = new Set(['um', 'uh', 'erm', 'er', 'ah', 'hmm', 'mm', 'uhm', 'umm', 'uhh', 'ممم', 'اممم', 'امم']);
export const norm = (w: string) => w.normalize('NFKD').replace(/[̀-ًͯ-ٰٟـ]/g, '').toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}#']/gu, '');
export const words = (s: string) => s.split(/\s+/).map(norm).filter(Boolean);

export interface Page { text: string; t0: number; t1: number }
export function captionDisfluencies(pages: Page[]): Finding[] {
  const out: Finding[] = [];
  let prevLast: string | null = null, prevEnd = -1;
  for (const p of pages) {
    const ws = words(p.text);
    const fil = ws.filter(w => FILLERS.has(w));
    if (fil.length) out.push({ check: 'caption_fillers', detail: `"${p.text}" @${p.t0.toFixed(2)} s: filler ${fil.join(', ')}` });
    for (let i = 1; i < ws.length; i++) if (ws[i] === ws[i - 1] && !/^\d+$/.test(ws[i])) out.push({ check: 'caption_fillers', detail: `"${p.text}" @${p.t0.toFixed(2)} s: repeated "${ws[i]}"` });
    if (prevLast && ws[0] === prevLast && p.t0 - prevEnd < 0.6 && !/^\d+$/.test(prevLast)) out.push({ check: 'caption_fillers', detail: `"${prevLast}" repeated across pages @${p.t0.toFixed(2)} s` });
    prevLast = ws.at(-1) ?? null; prevEnd = p.t1;
  }
  return out;
}
/** Narration pace (owner 2026-11-02, Podium Pop): speech at >= minWps across the spoken span, and no gap between caption
 *  pages longer than maxGap s (a 0.6-1.0 s beat after a reveal is fine; 1.2-1.6 words/s with 3-4 s holes failed QA as dead air).
 *  `beats` (viral-rankings, owner pacing 2026-11-02: SILENT BEAT after each reveal + slow-mo replay): a gap up to beats.max s is a
 *  planned silent beat when it starts within beats.within s after a beat anchor (rank reveal / label plate / replay start or end). */
export interface SilentBeats { at: number[]; max: number; within: number }
export function narrationPace(pages: Page[], minWps = 2.0, maxGap = 1.0, beats?: SilentBeats | null): Finding[] {
  const ps = [...pages].sort((a, b) => a.t0 - b.t0);
  if (ps.length < 3) return [];
  const out: Finding[] = [];
  const words = ps.reduce((n, p) => n + p.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const span = ps[ps.length - 1].t1 - ps[0].t0;
  const wps = words / Math.max(span, 0.001);
  if (wps < minWps - 0.005) out.push({ check: 'narration_pace', detail: `${words} words over ${span.toFixed(1)} s = ${wps.toFixed(2)} words/s (< ${minWps}; target 2.2-2.5)` });
  for (let i = 1; i < ps.length; i++) {
    const g0 = ps[i - 1].t1, gap = ps[i].t0 - g0;
    if (gap <= maxGap + 0.005) continue;
    const anchor = beats && gap <= beats.max + 0.005 ? beats.at.find(a => g0 >= a - 0.3 && g0 <= a + beats.within + 0.005) : undefined;
    if (anchor != null) continue;   // planned silent beat after a reveal / replay
    out.push({ check: 'narration_gap', detail: `${gap.toFixed(2)} s with no speech ${g0.toFixed(2)}-${ps[i].t0.toFixed(2)} s (> ${maxGap} s${beats ? `; silent beats <= ${beats.max} s are allowed only within ${beats.within} s after a reveal/replay` : ''})` });
  }
  return out;
}
/** Beat anchors (s) from the built timeline: rank card slide-ins + label plates (keyframed VR Rail Card / VR Rail Plate items) and
 *  slow-mo replay segments (cut-list segment with speed < 1 or why ~ replay/slow-mo; Picture item matched by index): start + end. */
export function beatAnchors(tl: Timeline | null, cl: any): number[] {
  if (!tl) return [];
  const fps = (tl as any).fps || 30, at: number[] = [];
  const track = (n: string) => ((tl as any).tracks ?? []).find((t: any) => t.name === n)?.items ?? [];
  for (const n of ['VR Rail Card', 'VR Rail Plate']) for (const it of track(n)) if (it.keyframes) at.push(it.fromFrame / fps);
  const segs: any[] = Array.isArray(cl?.segments) ? cl.segments : [], pic: any[] = track('Picture');
  segs.forEach((s, i) => {
    if (!((s.speed != null && s.speed < 1) || /replay|slow[- ]?mo|slow motion/i.test(String(s.why ?? '')))) return;
    const it = pic.length === segs.length ? pic[i] : null;
    if (it) at.push(it.fromFrame / fps, (it.fromFrame + it.durationInFrames) / fps);
  });
  return [...new Set(at.map(x => +x.toFixed(3)))].sort((a, b) => a - b);
}
/** Caption pages must stay readable: >= 0.7 s, or >= 0.5 s for a 1-2 word page (orchestrator 2026-11-08: «جرّب!» / «وين الأزرق؟»
 *  cut by the next page or a countdown at 0.59-0.68 s are readable; quiz captions.ts already holds pages to 0.7 s when nothing cuts them). */
export function shortPages(pages: Page[], min = CAPTION_MIN_PAGE, minShort = CAPTION_MIN_PAGE_SHORT): Finding[] {
  const need = (p: Page) => (words(p.text).length <= 2 ? Math.min(min, minShort) : min);
  return pages.filter(p => p.t1 - p.t0 < need(p) - 0.005).map(p => ({ check: 'caption_short', detail: `"${p.text}" ${p.t0.toFixed(2)}-${p.t1.toFixed(2)} s (${(p.t1 - p.t0).toFixed(2)} s < ${need(p)} s)` }));
}
/** Caption pages vs ASR words of the render: a page (2+ words) whose words are mostly not heard within ±0.35 s fails. */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** ASR writes numbers as digits, captions often spell them (Podium Pop 2026-11-08: "NUMBER FIVE" heard as "5" failed the check): "75" -> ["seventy", "five"]. */
export function spellNumber(w: string): string[] {
  if (!/^\d{1,2}$/.test(w)) return [w];
  const n = Number(w);
  if (n < 20) return [ONES[n]];
  return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
}
export function captionsVsAsr(pages: Page[], asr: { w: string; s: number; e: number }[], minRatio = 0.5) {
  const audit = pages.map(p => {
    const heard = asr.filter(w => (w.s + w.e) / 2 >= p.t0 - 0.35 && (w.s + w.e) / 2 <= p.t1 + 0.35).flatMap(w => spellNumber(norm(w.w))).filter(Boolean);
    const ws = words(p.text).filter(w => !FILLERS.has(w));
    const hit = ws.filter(w => heard.some(h => h === w || (w.length >= 4 && (h.startsWith(w.slice(0, 4)) || w.startsWith(h.slice(0, 4))))));
    return { text: p.text, t0: p.t0, t1: p.t1, heard: heard.join(' '), ratio: ws.length ? +(hit.length / ws.length).toFixed(2) : 1, words: ws.length };
  });
  const bad = audit.filter(a => a.words >= 2 && a.ratio < minRatio);
  return { audit, failures: bad.map(a => ({ check: 'caption_vs_asr', detail: `"${a.text}" @${a.t0.toFixed(2)} s not heard (ASR: "${a.heard || '-'}", ${Math.round(a.ratio * 100)} %)` })) };
}
const GENERIC = new Set(['top', 'best', 'most', 'moments', 'moment', 'number', 'video', 'videos', 'the', 'and', 'for', 'with', 'this', 'that', 'what', 'who', 'how', 'why', 'stay', 'wait', 'watch', 'your', 'you', 'ever', 'all', 'time', 'times', 'ranked', 'ranking', 'from', 'into', 'out', 'its', 'are', 'was', 'were', 'they', 'them', 'his', 'her', 'one', 'two', 'three', 'four', 'five']);
/** Every title / label claim needs a claim -> evidence line (script.json claims[]). */
export function claimCoverage(sj: any, labels: string[] = []): Finding[] {
  const out: Finding[] = [];
  const claims: { claim: string; evidence: string; target?: string }[] = (Array.isArray(sj?.claims) ? sj.claims : []).map((c: any) => ({ claim: String(c?.claim ?? ''), evidence: String(c?.evidence ?? '').trim(), target: c?.target ?? c?.of ?? c?.field }));
  for (const c of claims) if (!c.evidence) out.push({ check: 'claims', detail: `claim "${c.claim}" has no evidence` });
  const items: { kind: string; text: string }[] = [];
  for (const k of ['title', 'title_proposed', 'title_en', 'title_ar']) if (typeof sj?.[k] === 'string' && sj[k].trim()) items.push({ kind: k, text: sj[k] });
  for (const o of Array.isArray(sj?.on_screen) ? sj.on_screen : []) if (typeof o?.text === 'string' && !['hook', 'cta', 'credit', 'caption', 'subscribe'].includes(o.role ?? '')) items.push({ kind: `on_screen${o.role ? ' ' + o.role : ''}`, text: o.text });
  for (const l of labels) items.push({ kind: 'label', text: l });
  const seen = new Set<string>();
  for (const it of items) {
    const key = words(it.text).join(' ');
    if (seen.has(key)) continue; seen.add(key);
    const content = words(it.text).filter(w => w.length >= 3 && !GENERIC.has(w) && !/^\d+$/.test(w));
    if (!content.length) continue;
    const ok = claims.some(c => c.evidence && ((c.target && words(String(c.target)).join(' ') === key) || content.some(w => words(c.claim).some(x => x === w || (w.length >= 5 && x.startsWith(w.slice(0, 5)))))));
    if (!ok) out.push({ check: 'claims', detail: `${it.kind} "${it.text}" has no claim -> evidence line in script.json claims[]` });
  }
  return out;
}
/** AI-generation text (owner 2026-10-28 / 2026-11-08): the shared guard packages/shared/src/ai-text.ts (patterns config/ai-text-patterns.json). */
export const AI_TEXT = { test: (s: string, brand?: string) => aiTextHit(s, { brand }) !== null };
export const MOJIBAKE = /Â[\u0080-¿]|â€|Ã[\u0080-¿]|Ø[\u0080-¿]|Ù[\u0080-¿]/;
/** every string under the keys a viewer reads (titles, descriptions, tags, pinned comment) */
export function publicStrings(o: any, key = '', out: { key: string; text: string }[] = []) {
  if (typeof o === 'string') { if (/title|desc|hashtag|tags|pinned|comment|caption/i.test(key)) out.push({ key, text: o }); }
  else if (Array.isArray(o)) o.forEach((x, i) => publicStrings(x, key, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) publicStrings(v, key ? `${key}.${k}` : k, out);
  return out;
}
export function allStrings(o: any, out: string[] = []) {
  if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(x => allStrings(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach(v => allStrings(v, out));
  return out;
}
const PD_CLAIM = /public[- ]domain|ملكية عامة|domaine public/i;
const PD_RECORD = /public[- ]domain|\bcc0\b|\bpd\b|not subject to (copyright|domestic copyright)|us(a)? government work|17 u\.?s\.?c/i;
/** Credit wording vs the rights record: no "public domain" unless a used source's record says so; exact credit wordings required by
 *  rights conditions must appear verbatim (brands without a credit block skip that part). */
export function creditWording(texts: string[], sources: { asset_id: string; record: string; restrictions: string[] }[], creditBlock = true): Finding[] {
  const out: Finding[] = [];
  const all = texts.join('\n');
  if (PD_CLAIM.test(all) && !sources.some(s => PD_RECORD.test(s.record))) {
    const line = texts.flatMap(t => t.split('\n')).find(l => PD_CLAIM.test(l)) ?? '';
    out.push({ check: 'credit_wording', detail: `credits say "public domain" but no used source's rights record does: "${line.trim().slice(0, 120)}"` });
  }
  if (creditBlock) for (const s of sources) for (const r of s.restrictions) {
    if (!/credit|attribut/i.test(r)) continue;
    for (const m of r.matchAll(/["“']([^"”']{6,})["”']/g)) {
      if (/\b(never|not|no|don't|do not)(\s+\w+){0,2}\s*$/i.test(r.slice(0, m.index ?? 0))) continue; // "never 'public domain'" / "do not state 'public domain'" is a prohibition, not a required credit
      const want = m[1].replace(/\s+/g, ' ').trim().toLowerCase();
      if (!all.replace(/\s+/g, ' ').toLowerCase().includes(want)) out.push({ check: 'credit_wording', detail: `${s.asset_id}: rights condition requires the credit "${m[1]}" (not found in the description/credits)` });
    }
  }
  return out;
}

/**
 * packaging.json lint (audit 2026-11-08 I1: packaging is what gets published, scripts/packaging_meta.py). Runs the owner's
 * AI-generation-text rule, the mojibake check and the credit rules on the PUBLISHED surface: packaging description (or
 * script.json's when packaging says KEEP / is empty) + script.json attribution block. Credits are required (rights conditions)
 * for every brand except Podium Pop (viral-rankings), where a credit/source block is forbidden (owner GOAL-15 "views first").
 */
export const PACKAGING_KEEP = /^\s*(keep|same as|unchanged|use script)\b/i;
export const CREDIT_BLOCK = /\b(credits?|courtesy( of)?|footage (from|by|courtesy)|sources?:|video by|clip by|via @)|©/i;
export function packagingChecks(pk: any, sj: any, sources: { asset_id: string; record: string; restrictions: string[] }[], brand: string): Finding[] {
  if (!pk || typeof pk !== 'object') return [];
  const out: Finding[] = [];
  const pub = [...publicStrings(pk, 'packaging'), ...(typeof pk.cover_text === 'string' ? [{ key: 'packaging.cover_text', text: pk.cover_text }] : []), ]
    .filter(x => !/evidence|notes|gap_to_gate/.test(x.key) && !(x.key === 'packaging.description' && PACKAGING_KEEP.test(x.text)));
  for (const x of pub) { const h = aiTextHit(x.text, { brand }); if (h) out.push({ check: 'ai_text', detail: `${x.key}: "${h}" (owner rule: never mention AI creation in titles/descriptions/tags)` }); }
  for (const s of [...new Set(allStrings(pk))]) if (MOJIBAKE.test(s)) out.push({ check: 'mojibake', detail: `packaging.json: "${s.slice(0, 60)}" (re-save as UTF-8, open(..., encoding="utf8"))` });
  if (typeof pk.chosen_title === 'string' && pk.chosen_title.length > 100) out.push({ check: 'packaging', detail: `chosen_title is ${pk.chosen_title.length} chars (YouTube max 100)` });
  const pdesc = typeof pk.description === 'string' && pk.description.trim() && !PACKAGING_KEEP.test(pk.description) ? pk.description : null;
  if (brand === 'viral-rankings') {
    for (const x of [{ key: 'packaging.description', text: pdesc ?? '' }, ...(Array.isArray(pk.hashtags) ? pk.hashtags : []).map((h: any) => ({ key: 'packaging.hashtags', text: String(h) }))])
      if (CREDIT_BLOCK.test(x.text)) out.push({ check: 'credit_wording', detail: `${x.key}: "${x.text.match(CREDIT_BLOCK)![0]}" (Podium Pop: no credit/source block in descriptions, owner GOAL-15)` });
  } else if (pdesc) {
    const att = Array.isArray(sj?.attribution_block) ? sj.attribution_block.join('\n') : typeof sj?.attribution_block === 'string' ? sj.attribution_block : '';
    out.push(...creditWording([pdesc, att, ...allStrings(sj?.credits ?? [])].filter(Boolean), sources, true).map(f => ({ ...f, detail: `packaging: ${f.detail}` })));
  }
  return out;
}

/** Kids calls to action (bible: never ask children to act on the platform). Only the fixed Sunny Hill ask (series ending, line sx_ask) is allowed. */
/** YouTube metadata limits (owner 2026-11-08, packages/shared/src/platform-limits.ts) on the published surface (packaging.json,
 *  script.json fallback, credits + hashtag line = scripts/packaging_meta.py) and on this production's publish-plan entries. */
export function youtubeLimitChecks(pk: any, sj: any, brand: string, dbtitle = '', planEntries: any[] = []): Finding[] {
  const out: Finding[] = [];
  for (const i of youtubeLimitIssues(publishedMeta(pk, sj, brand, dbtitle))) out.push({ check: 'youtube_limits', detail: `published ${i.field} (${pk ? 'packaging.json' : 'script.json'}): ${i.message}` });
  for (const e of planEntries) for (const i of youtubeLimitIssues({ title: e.title, description: e.description, tags: e.tags })) out.push({ check: 'youtube_limits', detail: `publish-plan entry ${i.field}: ${i.message}` });
  return out;
}
export const KIDS_CTA = /\bsubscrib\w*|\bcomments?\b|\bcommenting\b|\bbell\b|\bnotifications?\b|\blinks?\b|\bclick\w*|\btap (the|on|here)\b|\bvisit\b|\bgo to (our|my)\b|\bgo to the (channel|website|site|link|description|playlist|page|app)\b|\bdescription (below|box)\b|\b(hit|press|smash|give( us)?( a)?) (the )?like\b|\blike (this|our|the) (video|channel|episode)\b|\bshare (this|our)\b/i;
const LINK = /https?:\/\/|\bwww\.|\.com\b/i;
export function kidsChecks(vdir: string, sj: any): { failures: Finding[]; warnings: Finding[] } {
  const failures: Finding[] = [], warnings: Finding[] = [];
  const reg = readJ(path.join(P.root, 'docs', 'brands', 'kids', 'episodes.json'));
  const ask = String(reg?.series?.lines?.ask ?? '').trim();
  const score = readJ(path.join(vdir, 'score.json')), series = readJ(path.join(vdir, 'series.json'));
  const off = Number(series?.episode?.offset ?? 0);
  const spoken: { id: string; text: string; t0: number }[] = [
    ...(series?.opening?.lines ?? []), ...(score?.lines ?? []).map((l: any) => ({ id: l.id, text: l.text, t0: l.t0 + off })), ...(series?.ending?.lines ?? [])];
  let asks = 0;
  for (const l of spoken) {
    if (!KIDS_CTA.test(l.text)) continue;
    if (l.id === 'sx_ask' && l.text.trim() === ask) {
      asks++;
      if (l.t0 < 90) failures.push({ check: 'kids_cta', detail: `series ask at ${l.t0.toFixed(1)} s (never in the first 90 s)` });
      continue;
    }
    failures.push({ check: 'kids_cta', detail: `${l.id} @${l.t0.toFixed(1)} s "${l.text}": "${l.text.match(KIDS_CTA)![0]}" is a call to action (Made for Kids; only the fixed Sunny Hill ask is allowed)` });
  }
  if (asks > 1) failures.push({ check: 'kids_cta', detail: `the series ask appears ${asks} times (once only)` });
  for (const x of publicStrings(sj)) {
    if (KIDS_CTA.test(x.text)) failures.push({ check: 'kids_cta', detail: `${x.key}: "${x.text.match(KIDS_CTA)![0]}" (no calls to action in kids titles/descriptions)` });
    if (LINK.test(x.text)) failures.push({ check: 'kids_cta', detail: `${x.key}: contains a link (kids descriptions: no links; name the playlist instead)` });
  }
  if (sj?.made_for_kids !== true) failures.push({ check: 'kids_series', detail: 'script.json made_for_kids must be true' });
  if (series) {
    if (sj?.title !== series.title) failures.push({ check: 'kids_series', detail: `script.json title must be the series title "${series.title}" (now "${sj?.title ?? ''}")` });
    if (String(series.title).length > 70) failures.push({ check: 'kids_series', detail: `series title is ${String(series.title).length} chars (max 70)` });
    if (!new RegExp(`Sunny Hill Ep ${series.ep}(?![0-9])`).test(String(series.title)) || !String(series.title).includes('Tiko & Pip')) failures.push({ check: 'kids_series', detail: `series title "${series.title}" must contain "Sunny Hill Ep ${series.ep}" and "Tiko & Pip"` });
    if (typeof sj?.description === 'string' && !sj.description.includes(String(series.playlist))) warnings.push({ check: 'kids_series', detail: `description does not name the playlist "${series.playlist}"` });
  } else warnings.push({ check: 'kids_series', detail: 'built without the Sunny Hill opening/ending (no series.json in this version)' });
  return { failures, warnings };
}

/* ---------------------------------------------------------------- media checks */
async function frameZero(render: string, W: number, H: number): Promise<Finding[]> {
  const out: Finding[] = [];
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-t', '1', '-i', render, '-vf', 'cropdetect=limit=24:round=2:reset=0', '-an', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const c = [...String(stderr).matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].at(-1);
  if (c) {
    const [cw, ch, cx, cy] = c.slice(1).map(Number);
    const symY = Math.abs(cy - (H - ch - cy)) <= H * 0.05, symX = Math.abs(cx - (W - cw - cx)) <= W * 0.05;
    if ((ch < H * 0.9 && symY) || (cw < W * 0.9 && symX)) out.push({ check: 'frame0', detail: `opens on black bars in the first 1 s (active picture ${cw}x${ch} of ${W}x${H})` });
  }
  const { stderr: s2 } = await run('ffmpeg', ['-hide_banner', '-i', render, '-frames:v', '1', '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const y = parseFloat(/YAVG=([\d.]+)/.exec(String(s2))?.[1] ?? 'NaN');
  if (y < 20) out.push({ check: 'frame0', detail: `frame 0 is near-black (mean luma ${y.toFixed(1)})` });
  return out;
}

function latestVersion(id: string) {
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any;
  if (!prod) throw new Error(`production ${id} not found`);
  const n = Number(prod.version ?? 0);
  if (!n) throw new Error(`${id} has no built version yet`);
  const v = db().prepare(`SELECT render_path FROM versions WHERE production_id=? AND n=?`).get(id, n) as any;
  const dir = path.join(P.productions, id), vdir = path.join(dir, `v${n}`);
  const render = [v?.render_path, path.join(vdir, 'render.mp4')].find(f => f && fs.existsSync(f)) ?? null;
  return { prod, n, dir, vdir, render };
}
const readJ = (f: string) => { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : null; } catch { return null; } };

export async function prelint(id: string, opts: { asr?: boolean; agent?: string } = {}): Promise<PrelintResult> {
  const { prod, n, dir, vdir, render } = latestVersion(id);
  const brand = String(prod.brand_id);
  const failures: Finding[] = [], warnings: Finding[] = [], checked: string[] = [];
  const sj = readJ(path.join(dir, 'script.json')) ?? {};
  const cl = readJ(path.join(dir, 'cutlist.json')) ?? {};
  const plan = readJ(path.join(dir, 'ranking-plan.json'));
  // quiz builds keep their round plan in timeline.json and the render timeline in render.timeline.json: use whichever has tracks
  const tlCands = [readJ(path.join(vdir, 'render.timeline.json')), readJ(path.join(vdir, 'timeline.json'))];
  const tl: Timeline | null = tlCands.find((t: any) => Array.isArray(t?.tracks)) ?? null;
  const pages: Page[] = (readJ(path.join(vdir, 'captions.json')) ?? []).filter((p: any) => typeof p?.text === 'string' && p.t1 > p.t0);
  fs.mkdirSync(path.join(vdir, 'qa'), { recursive: true });

  // quiz-ar LONG-FORM (packages/quizlong, 16:9, 8-12 min): captions.json = the spoken lines (captions.srt), NOT burned-in pages, so the
  // on-screen page-length rule does not apply; fillers and caption-vs-ASR still do. A partial (--only) build is never shippable.
  const quizLong = fs.existsSync(path.join(vdir, 'show.json')) || (tl as any)?.meta?.format === 'quiz-long';
  if (quizLong) {
    checked.push('quiz_long');
    if ((tl as any)?.meta?.partial) failures.push({ check: 'quiz_long', detail: `v${n} is a partial build (--only): rebuild the full episode before QA` });
    const d = (tl?.durationInFrames ?? 0) / (tl?.fps || 30);
    if (!(tl as any)?.meta?.partial && (d < 480 || d > 720)) failures.push({ check: 'quiz_long', detail: `runtime ${d.toFixed(1)} s outside 8:00-12:00 (longform-rules G1)` });
    if (fs.existsSync(path.join(vdir, 'UNAPPROVED-DRAFT.json'))) failures.push({ check: 'quiz_long', detail: `v${n} is an unapproved draft (silent / before script:approve)` });
  }
  /* captions */
  checked.push('caption_fillers', ...(quizLong ? [] : ['caption_short']));
  failures.push(...captionDisfluencies(pages), ...(quizLong ? [] : shortPages(pages)));
  // pace/gap checks apply to TTS-narrated rankings (viral-rankings, rankings); kids/quiz/clipping have deliberate pauses or source speech
  if (brand === 'viral-rankings' || brand === 'rankings') {
    checked.push('narration_pace', 'narration_gap');
    // viral-rankings (owner pacing 2026-11-02): slower voice (floor 1.6 words/s) + planned silent beats <= 2.0 s right after a reveal / replay
    const vr = brand === 'viral-rankings';
    failures.push(...narrationPace(pages, vr ? 1.6 : 2.0, 1.0, vr ? { at: beatAnchors(tl, cl), max: 2.0, within: 1.0 } : null));
  }
  if (!pages.length) warnings.push({ check: 'captions', detail: `no captions.json pages in v${n}` });

  /* frame 0 */
  checked.push('frame0');
  const W = tl?.width ?? cl.width ?? 1080, H = tl?.height ?? cl.height ?? 1920;
  const kidsSeries = brand === 'kids' && fs.existsSync(path.join(vdir, 'series.json'));   // Sunny Hill opening: the 3D "Sunny Hill" sign is in the picture from 0.00 s (no overlay needed)
  if (brand !== 'quiz-ar' && !kidsSeries) {   // quiz-ar: the hook scene's text is baked into the round picture (hook_intro)
    const textAt0 = (tl?.tracks ?? []).some((t, ti) => t.kind === 'video' && t.items.some(i => i.fromFrame === 0 && (i.type === 'text' || (ti > 0 && (i.type === 'image' || /title|caption|overlay/i.test(t.name))))))
      || (cl.texts ?? []).some((t: any) => Number(t.at) === 0) || !!cl.rank_layers || pages.some(p => p.t0 <= 0.034);
    if (!textAt0) failures.push({ check: 'frame0', detail: 'no on-screen text on frame 0 (hook / title / first caption at 0.00 s)' });
  }
  if (render) failures.push(...await frameZero(render, W, H)); else warnings.push({ check: 'frame0', detail: 'no render yet: bars/black not checked' });

  /* captions vs ASR (generalised captions_audit, all brands) */
  if (opts.asr !== false && render && pages.length) {
    checked.push('caption_vs_asr');
    const asrFile = path.join(vdir, 'qa', 'asr.json');
    if (!fs.existsSync(asrFile) || fs.statSync(asrFile).mtimeMs < fs.statSync(render).mtimeMs) {
      await withLock('gpu', opts.agent ?? 'prelint', () => run(PY, ['-I', path.join(P.root, 'packages', 'intelligence', 'py', 'transcribe.py'), render, asrFile, '--lang', brand === 'quiz-ar' ? 'ar' : 'auto', '--model', 'small'], { maxBuffer: 1 << 26, timeout: 1800_000 }));
    }
    const asr = (readJ(asrFile)?.segments ?? []).flatMap((s: any) => s.words ?? []);
    const r = captionsVsAsr(pages, asr);
    fs.writeFileSync(path.join(vdir, 'qa', 'captions_audit.json'), JSON.stringify({ source: 'prelint (ASR small on the render)', pages: r.audit }, null, 1), 'utf8');
    // Mixed-audio ASR mishears voice under crowd noise (Podium Pop 2026-11-08). A page the clean narration take confirms is a warning, not a failure; QA still listens.
    const alignFile = path.join(vdir, 'narration.align.json');
    const clean = fs.existsSync(alignFile) ? readJ(alignFile) : null;
    const cleanWords = clean && typeof clean.wer === 'number' && clean.wer <= 0.12 ? String(clean.asr_text ?? '').split(/\s+/).flatMap(w => spellNumber(norm(w))).filter(Boolean) : [];
    const confirmed = (detail: string) => { const m = detail.match(/^"(.+?)" @/); if (!m || !cleanWords.length) return false; const ws = words(m[1]).filter(w => !FILLERS.has(w)); const hit = ws.filter(w => cleanWords.some(h => h === w || (w.length >= 4 && (h.startsWith(w.slice(0, 4)) || w.startsWith(h.slice(0, 4)))))); return ws.length > 0 && hit.length / ws.length >= 0.5; };
    for (const f of r.failures) { if (confirmed(f.detail)) warnings.push({ check: 'caption_vs_asr', detail: `${f.detail}: clean narration take confirms the words; check the voice is audible over the source` }); else failures.push(f); }
  } else if (opts.asr === false) warnings.push({ check: 'caption_vs_asr', detail: 'skipped (--no-asr)' });

  /* Podium Pop: the build must speak the reviewed script (2026-11-08: rewrites stayed in script.json while cutlist.json kept old lines; fix with scripts/sync-narration.py) */
  if (brand === 'viral-rankings' && cl.narration?.lines?.length) {
    const sn = readJ(path.join(dir, 'script.json'))?.narration;
    if (Array.isArray(sn) && sn.every((l: any) => l?.id && typeof l.text === 'string')) {
      checked.push('script_vs_build');
      const built = new Map<string, string>(cl.narration.lines.map((l: any) => [l.id, l.text]));
      const off = sn.filter((l: any) => built.get(l.id) !== l.text).map((l: any) => l.id);
      if (off.length || built.size !== sn.length) failures.push({ check: 'script_vs_build', detail: `narration differs from script.json (${off.join(', ') || 'line count'}): run scripts/sync-narration.py` });
    }
  }

  /* claims */
  checked.push('claims');
  const labels = [...(plan?.entries ?? []).map((e: any) => e.left_label), ...(cl.texts ?? []).filter((t: any) => ['label', 'rank', 'fact', 'lower_third', 'title'].includes(t.role)).map((t: any) => t.text)].filter((x: unknown): x is string => typeof x === 'string');
  failures.push(...claimCoverage(sj, labels));

  /* credits vs rights record */
  checked.push('credit_wording');
  const assets = [...new Set<string>([...(cl.segments ?? []).map((s: any) => s.asset_id), ...(cl.inserts ?? []).map((s: any) => s.asset_id), ...(cl.music ? [cl.music.asset_id] : [])].filter(Boolean))];
  const sources = assets.map(a => {
    const s = db().prepare(`SELECT asset_id, license, attribution, usage_restrictions, permission_evidence, permission_status FROM sources WHERE asset_id=?`).get(a) as any;
    const logs = db().prepare(`SELECT reason, evidence FROM rights_log WHERE asset_id=? ORDER BY id DESC LIMIT 5`).all(a) as any[];
    return { asset_id: a, record: [s?.license, s?.attribution, s?.usage_restrictions, s?.permission_evidence, ...logs.flatMap(l => [l.reason, l.evidence])].filter(Boolean).join(' | '), restrictions: J.parse<string[]>(s?.usage_restrictions, []) };
  });
  const creditTexts = [...publicStrings(sj).filter(x => /desc/i.test(x.key)).map(x => x.text), ...allStrings(sj.credits ?? []), ...allStrings(cl.credits ?? []),
    ...(cl.texts ?? []).filter((t: any) => t.role === 'credit').map((t: any) => t.text), ...(cl.clip_credits?.lines ?? []).map((l: any) => l.text), ...(cl.credit_line?.text ? [cl.credit_line.text] : [])];
  failures.push(...creditWording(creditTexts, sources, brand !== 'viral-rankings'));

  /* packaging.json = the published title/description/hashtags (audit 2026-11-08 I1): AI text, mojibake, credit rules */
  const pk = readJ(path.join(dir, 'packaging.json'));
  if (pk) {
    checked.push('packaging');
    failures.push(...packagingChecks(pk, sj, sources, brand));
    if (brand === 'kids') {
      const series = readJ(path.join(vdir, 'series.json'));
      if (series?.title && typeof pk.chosen_title === 'string' && pk.chosen_title.trim() !== series.title) failures.push({ check: 'kids_series', detail: `packaging.json chosen_title must be the series title "${series.title}" (now "${pk.chosen_title}")` });
      for (const x of publicStrings(pk, 'packaging')) if (!(x.key === 'packaging.description' && PACKAGING_KEEP.test(x.text)) && KIDS_CTA.test(x.text)) failures.push({ check: 'kids_cta', detail: `${x.key}: "${x.text.match(KIDS_CTA)![0]}" (no calls to action in kids titles/descriptions)` });
    }
  }

  /* AI-generation text (owner rule 2026-10-28) */
  checked.push('ai_text');
  const pp = readJ(path.join(P.data, 'publish-plan.json'));
  const ppEntries = (Array.isArray(pp) ? pp : pp?.entries ?? pp?.items ?? []).filter((e: any) => e?.production_id === id);
  /* YouTube metadata limits (owner 2026-11-08): the published surface (packaging.json, script.json fallback, credits + hashtag line,
     exactly as scripts/packaging_meta.py builds it) and this production's publish-plan entry: title <= 100 chars, description
     <= 5000 bytes, no < >, tags <= 500, <= 15 hashtags */
  checked.push('youtube_limits');
  failures.push(...youtubeLimitChecks(pk, sj, brand, String(prod.title ?? ''), ppEntries));
  const fp = readJ(path.join(P.data, 'fb-plan.json'));
  const fpEntries = (Array.isArray(fp) ? fp : fp?.entries ?? []).filter((e: any) => e?.production_id === id);
  const cd = readJ(path.join(dir, 'comments-draft.json'));
  const pubFields = [...publicStrings(sj), ...publicStrings(ppEntries, 'publish-plan'), ...stringsWithKeys(fpEntries, 'fb-plan').filter(x => /caption|title|desc/i.test(x.key)),
    ...(cd ? stringsWithKeys({ pinned: cd.pinned, first_hour_replies: cd.first_hour_replies }, 'comments-draft') : [])];
  for (const h of aiTextFields(pubFields, brand)) failures.push({ check: 'ai_text', detail: `${h.key}: "${h.phrase}" (owner rule: never mention AI creation in titles/descriptions/tags/comments)` });
  // on-screen text + captions: caption pages are fragments (no topic context), so a tech video ABOUT AI only warns there
  const onScreen = [...(cl.texts ?? []).map((t: any, i: number) => ({ key: `cutlist.texts[${i}]`, text: String(t.text ?? '') })), ...pages.map(p => ({ key: `caption@${p.t0.toFixed(2)}s`, text: p.text })),
    ...(tl?.tracks ?? []).flatMap(t => t.items).filter(i => i.type === 'text').map((i: any) => ({ key: `timeline text@${(i.fromFrame / (tl!.fps || 30)).toFixed(2)}s`, text: String(i.text) }))];
  for (const h of aiTextFields(onScreen, brand)) (brand === 'tech' ? warnings : failures).push({ check: 'ai_text', detail: `on-screen ${h.key}: "${h.phrase}" (owner rule: never mention AI creation)` });

  /* kids (Made for Kids): no calls to action except the one Sunny Hill ask; series title/description rules */
  if (brand === 'kids') { checked.push('kids_cta', 'kids_series'); const k = kidsChecks(vdir, sj); failures.push(...k.failures); warnings.push(...k.warnings); }

  /* mojibake */
  checked.push('mojibake');
  const screen = [...allStrings(sj), ...(cl.texts ?? []).map((t: any) => String(t.text ?? '')), ...pages.map(p => p.text), ...(tl?.tracks ?? []).flatMap(t => t.items).filter(i => i.type === 'text').map((i: any) => i.text)];
  for (const s of [...new Set(screen)]) if (MOJIBAKE.test(s)) failures.push({ check: 'mojibake', detail: `"${s.slice(0, 60)}" (re-save as UTF-8, open(..., encoding="utf8"))` });

  /* text safety (owner 2026-11-08): every text measured in Chrome - clipped / offcanvas / overlap / too_small always fail; ui_zone /
     unsafe_margin fail unless config/text-safety.json exempts them for the brand; rtl and painted-layer findings warn */
  checked.push('text_safety');
  const tsFile = path.join(vdir, 'qa', 'text-safety.json');
  let ts = readJ(tsFile);
  const tlFile = [path.join(vdir, 'render.timeline.json'), path.join(vdir, 'timeline.json')].find(f => fs.existsSync(f));
  const stale = !ts || ts.render_version != null && ts.render_version !== n || [render, tlFile].some(f => f && fs.existsSync(f) && fs.statSync(f).mtimeMs > fs.statSync(tsFile).mtimeMs);
  if (stale && tl && (tl as any).width > 0) {
    const { textSafety } = await import('../../render/src/text-safety.ts');
    ts = await textSafety(tl, { productionId: id, version: n, brand, out: tsFile });
  }
  if (quizLong) warnings.push({ check: 'text_safety', detail: 'quiz-long: every on-screen text is drawn by the template page (packages/quizlong/template) inside picture.mp4; not measurable from the timeline, frame-text-inspector checks it on frames' });
  if (!ts) warnings.push({ check: 'text_safety', detail: `no measurable render timeline for v${n}: text safety not checked (frame-text-inspector covers it on frames)` });
  else if (ts.error) failures.push({ check: 'text_safety', detail: `${ts.error}` });
  else for (const it of ts.items ?? []) {
    if (!it.issues?.length) continue;
    const line = `${Number(it.t_start).toFixed(2)}-${Number(it.t_end).toFixed(2)} s [${it.layer}] "${String(it.text).slice(0, 40)}": ${(it.details ?? it.issues).join(' | ')}`;
    (it.blocking ? failures : warnings).push({ check: 'text_safety', detail: line });
  }

  /* clicks at audio joins (exact join times need timeline.json) */
  if (tl && render) {
    checked.push('audio_clicks');
    const fps = tl.fps, seam = seamlessJoins(tl), joins = new Set<number>();
    for (const t of tl.tracks) for (const i of t.items) {
      if (i.type !== 'audio' && i.type !== 'video') continue;
      const it = i as AudioItem | VideoItem, sm = seam.get(it);
      if (t.kind === 'video' && t !== tl.tracks.find(x => x.kind === 'video')) continue;
      if (i.fromFrame > 0 && !sm?.head) joins.add(i.fromFrame);
      const e = i.fromFrame + i.durationInFrames;
      if (e < tl.durationInFrames && !sm?.tail) joins.add(e);
    }
    const res = await detectClicks(render, [...joins].sort((a, b) => a - b).map(f => f / fps));
    for (const c of res.filter(c => c.click)) failures.push({ check: 'audio_clicks', detail: `click at ${c.t.toFixed(2)} s (2nd-difference ${c.ratio}x the surrounding level)` });
  } else warnings.push({ check: 'audio_clicks', detail: 'no timeline.json for this version: joins not checked' });

  const r: PrelintResult = { production_id: id, version: n, brand, pass: !failures.length, failures, warnings, checked, render, at: new Date().toISOString() };
  fs.writeFileSync(path.join(vdir, 'qa', 'prelint.json'), JSON.stringify(r, null, 1), 'utf8');
  return r;
}

/** A recorded prelint that is newer than the render, script.json and cutlist.json of the latest version (else null). */
export function freshPrelint(id: string): PrelintResult | null {
  const { n, dir, vdir, render } = latestVersion(id);
  const f = path.join(vdir, 'qa', 'prelint.json');
  const r = readJ(f) as PrelintResult | null;
  if (!r || r.version !== n) return null;
  const t = fs.statSync(f).mtimeMs;
  for (const g of [render, path.join(dir, 'script.json'), path.join(dir, 'cutlist.json')]) if (g && fs.existsSync(g) && fs.statSync(g).mtimeMs > t) return null;
  return r;
}
