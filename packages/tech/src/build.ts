/**
 * tech:build — Tech Made Simple animated explainer Shorts (brand tech, 1080x1920, 30-45 s).
 *   productions/<id>/spec.json (voice, hook, scenes[] with narration lines) + productions/<id>/scenes/<scene>.html (HyperFrames
 *   fragments: markup + scoped CSS + TECH_SCENES.<id> = function (tl, S) {...} GSAP motion keyed to spoken words)
 *   → narration (ONE Gemini TTS take via packages/voice, cached) → align (faster-whisper) → per-line clips laid end to end
 *   → one HyperFrames composition (packages/tech/runtime + kit fonts, `npx hyperframes render`) = scenes.mp4
 *   → timeline.json (picture + hook pill at 0 + word-timed captions + narration + SFX + ducked tech-focus bed)
 *   → packages/render (ffmpeg) → master (-14 LUFS) → techqa → 360 px stills in vN/qa/stills.
 * --no-tts: estimated timing (2.6 words/s, no quota) → productions/<id>/draft/ (picture + stills only, never a version).
 * Spec format and limits: docs/brands/tech/build.md.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P, production } from '../../shared/src/paths.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master, pageCaptions } from '../../occ/src/build.ts';
import { renderTimeline } from '../../render/src/render.ts';
import type { Item, Timeline, Track } from '../../render/src/timeline.ts';
import { renderHF } from '../../quiz/src/compose.ts';
import { duckWav } from '../../kids3d/src/audio.ts';
import { brandProfile, lintCelebrityScenes, type BrandProfile } from './brands.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const PYDIR = path.join(P.root, 'packages', 'intelligence', 'py');
const RUNTIME = path.join(P.root, 'packages', 'tech', 'runtime');
const GSAP = path.join(P.root, 'packages', 'quiz', 'vendor', 'gsap.min.js');
export const KIT = path.join(P.data, 'brand', 'tech', 'kit');
const WORK = path.join(process.env.STUDIO_RENDER_TMP ?? 'E:\\clips-viral-render-tmp', 'tech');

export interface TechLine { id: string; text: string; /** pause after this line, s (default 0.12; scene ends use scene.pad) */ gap?: number }
export interface TechScene { id: string; html?: string; lines: TechLine[]; /** minimum scene length, s */ min?: number; /** pause after the scene's last line (default 0.15) */ pad?: number; /** false = no slow camera push */ drift?: boolean }
export interface TechSpec {
  width?: number; height?: number; fps?: number;
  voice?: { name?: string; style?: string };
  /** frame-0 hook pill (timeline text, max 6 words); dur default 2.2 s */
  hook: { text: string; dur?: number; y?: number };
  scenes: TechScene[];
  /** seconds after the last spoken word (H8 dead tail <= 0.4) */
  tail?: number;
  bed?: { gainDb?: number; duckDb?: number } | false;
  /** at: seconds | "lineId" | "word" | "lineId:word" (+ optional offset) */
  sfx?: { name: string; at: number | string; offset?: number; db?: number }[];
  captions?: { maxChars?: number; accent?: Record<string, string>; y?: number } | false;
}
interface Word { w: string; s: number; e: number }
interface LineT { id: string; scene: string; text: string; t0: number; t1: number; at: number; dur: number; clip: string | null; words: Word[] }

const norm = (w: string) => String(w).toLowerCase().replace(/[^a-z0-9%$+.-]/g, '').replace(/^[.-]+|[.-]+$/g, '');
const dbLin = (d: number) => Math.pow(10, d / 20);

export function loadSpec(id: string) {
  const dir = production(id), f = path.join(dir, 'spec.json');
  if (!fs.existsSync(f)) throw new Error(`${f} missing (tech spec: docs/brands/tech/build.md)`);
  const spec = JSON.parse(fs.readFileSync(f, 'utf8')) as TechSpec;
  if (!spec.hook?.text) throw new Error('spec.hook.text is required (frame-0 hook, <= 6 words)');
  if (spec.hook.text.trim().split(/\s+/).length > 6) throw new Error(`hook "${spec.hook.text}" is over 6 words`);
  if (!spec.scenes?.length) throw new Error('spec.scenes is empty');
  const ids = new Set<string>();
  for (const s of spec.scenes) {
    if (!/^[a-z][a-z0-9_]*$/i.test(s.id)) throw new Error(`scene id "${s.id}" must be [a-z][a-z0-9_]*`);
    for (const l of s.lines) { if (ids.has(l.id)) throw new Error(`duplicate line id ${l.id}`); ids.add(l.id); if (/\d/.test(l.text)) throw new Error(`line ${l.id}: write numbers as words for TTS ("${l.text}")`); }
    const h = path.join(dir, s.html ?? `scenes/${s.id}.html`);
    if (!fs.existsSync(h)) throw new Error(`scene ${s.id}: ${h} missing`);
  }
  return { spec, dir };
}

/** ONE TTS take for all lines (cached by text+voice+style), aligned and cut per line. */
async function narrate(spec: TechSpec, dir: string, vdir: string, id: string, agent: string, note: (m: string, l?: any) => void, bp: BrandProfile) {
  const lines = spec.scenes.flatMap(s => s.lines);
  const voice = spec.voice?.name ?? bp.voice, style = spec.voice?.style ?? bp.style;
  const tts = await synthesize(lines.map(l => l.text.trim()).join('\n\n'), voice, style, { productionId: id });
  note(tts.cached ? `Narration reused from cache (${voice})` : `Narration generated (${tts.model}, ${voice})`);
  const nd = path.join(vdir, 'narration'); fs.mkdirSync(nd, { recursive: true }); fs.mkdirSync(path.join(dir, 'voice'), { recursive: true });
  const raw = path.join(dir, 'voice', path.basename(tts.file)); if (!fs.existsSync(raw)) fs.copyFileSync(tts.file, raw);
  const lj = path.join(nd, 'lines.json'), aj = path.join(nd, 'align.json');
  fs.writeFileSync(lj, JSON.stringify(lines.map(l => ({ id: l.id, text: l.text }))), 'utf8');
  await withLock('gpu', agent, () => run(PY, ['-I', path.join(PYDIR, 'align.py'), raw, lj, aj], { maxBuffer: 1 << 26, timeout: 1800_000 }));
  const al = JSON.parse(fs.readFileSync(aj, 'utf8'));
  if (al.wer > 0.12) note(`Narration WER ${(al.wer * 100).toFixed(0)}% (ASR "${String(al.asr_text).slice(0, 120)}") — listen for misread words / a spoken style preamble`, 'warn');
  const out: Record<string, { clip: string; dur: number; lead: number; words: Word[] }> = {};
  for (const [i, l] of lines.entries()) {
    const a = al.lines[i], s0 = Math.max(0, a.start - 0.04), s1 = Math.min(al.duration, a.end + 0.12);
    const clip = path.join(nd, `${l.id}.wav`);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', raw, '-af', 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse', '-ar', '48000', '-ac', '2', clip]);
    out[l.id] = { clip, dur: s1 - s0, lead: a.start - s0, words: a.words.map((w: any) => ({ w: w.w, s: w.s - s0, e: w.e - s0 })) };
  }
  return { out, wer: al.wer as number, asr: String(al.asr_text) };
}

function estimate(spec: TechSpec) {
  const out: Record<string, { clip: null; dur: number; lead: number; words: Word[] }> = {};
  for (const l of spec.scenes.flatMap(s => s.lines)) {
    const ws = l.text.trim().split(/\s+/); let t = 0.04;
    const words = ws.map(w => { const d = 0.16 + 0.045 * w.length; const r = { w, s: t, e: t + d }; t += d + 0.05; return r; });
    out[l.id] = { clip: null, dur: t + 0.1, lead: 0.04, words };
  }
  return out;
}

/** Lay lines end to end: scene t0 = its first clip start; total = last word + tail. All times absolute, frame-snapped. */
function layout(spec: TechSpec, nar: Record<string, { clip: string | null; dur: number; lead: number; words: Word[] }>) {
  const fps = spec.fps ?? 30, snap = (t: number) => Math.round(t * fps) / fps;
  let cur = 0; const lines: LineT[] = []; const scenes: { id: string; t0: number; t1: number; lines: string[]; drift?: boolean }[] = [];
  for (const [si, s] of spec.scenes.entries()) {
    const t0 = snap(cur);
    for (const [li, l] of s.lines.entries()) {
      const n = nar[l.id], at = snap(cur);
      const words = n.words.map(w => ({ w: w.w, s: +(at + w.s).toFixed(3), e: +(at + w.e).toFixed(3) }));
      lines.push({ id: l.id, scene: s.id, text: l.text, at, dur: n.dur, clip: n.clip, t0: words[0]?.s ?? at, t1: words[words.length - 1]?.e ?? at + n.dur, words });
      cur = at + n.dur + (li === s.lines.length - 1 ? 0 : l.gap ?? 0.12);
    }
    if (s.min && cur - t0 < s.min) cur = t0 + s.min;
    if (si < spec.scenes.length - 1) cur += s.pad ?? 0.15;
    scenes.push({ id: s.id, t0, t1: 0, lines: s.lines.map(l => l.id), drift: s.drift });
  }
  const last = lines[lines.length - 1];
  const D = snap(Math.max(cur, last.t1 + (spec.tail ?? 0.3)));
  scenes.forEach((s, i) => { s.t1 = i < scenes.length - 1 ? scenes[i + 1].t0 : D; });
  return { D, lines, scenes, fps };
}

/** S.at('...') references in a scene file must resolve to a spoken word / line of that scene (the page would silently fall back to t0). */
function checkRefs(html: string, sceneId: string, lines: LineT[]) {
  const bad: string[] = [];
  const mine = lines.filter(l => l.scene === sceneId), all = new Set(lines.map(l => l.id));
  for (const m of html.matchAll(/S\.at\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\d+))?/g)) {
    const ref = m[1], n = Number(m[2] ?? 0);
    if (all.has(ref)) continue;
    const [lid, w] = ref.includes(':') ? [ref.split(':')[0], ref.split(':').slice(1).join(':')] : [null, ref];
    const hits = mine.filter(l => !lid || l.id === lid).flatMap(l => l.words).filter(x => norm(x.w) === norm(w));
    if (hits.length <= n) bad.push(`S.at("${ref}"${n ? `, ${n}` : ''})`);
  }
  if (bad.length) throw new Error(`scene ${sceneId}: ${bad.join(', ')} not spoken in this scene's lines`);
}

/** Write the one HyperFrames project (index.html + runtime + fonts + gsap + production assets/). */
function writeProject(id: string, spec: TechSpec, dir: string, lay: ReturnType<typeof layout>, proj: string, bp: BrandProfile = brandProfile('tech')) {
  fs.rmSync(proj, { recursive: true, force: true }); fs.mkdirSync(path.join(proj, 'fonts'), { recursive: true });
  for (const f of fs.readdirSync(path.join(KIT, 'fonts'))) fs.copyFileSync(path.join(KIT, 'fonts', f), path.join(proj, 'fonts', f));
  fs.copyFileSync(GSAP, path.join(proj, 'gsap.min.js'));
  if (fs.existsSync(path.join(dir, 'assets'))) fs.cpSync(path.join(dir, 'assets'), path.join(proj, 'assets'), { recursive: true });
  const W = spec.width ?? 1080, H = spec.height ?? 1920;
  const scenes = spec.scenes.map((s, i) => {
    const html = fs.readFileSync(path.join(dir, s.html ?? `scenes/${s.id}.html`), 'utf8');
    checkRefs(html, s.id, lay.lines);
    return `<div class="scene" id="scene-${s.id}"${i === 0 ? ' style="visibility:visible"' : ''}><div class="cam" style="position:absolute;inset:0;transform-origin:50% 45%">\n${html}\n</div></div>`;
  }).join('\n');
  const TECH = { id: 'tech', D: lay.D, fps: lay.fps, W, H, scenes: lay.scenes, lines: Object.fromEntries(lay.lines.map(l => [l.id, { id: l.id, t0: l.t0, t1: l.t1, text: l.text, words: l.words }])) };
  fs.writeFileSync(path.join(proj, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=${W}, height=${H}" />
<script src="gsap.min.js"></script>
<style>${fs.readFileSync(path.join(RUNTIME, 'tech.css'), 'utf8')}${bp.css ? `
${bp.css}` : ''}</style>
</head><body>
<div id="root" data-composition-id="tech" data-start="0" data-width="${W}" data-height="${H}" data-duration="${lay.D}">
<div id="bg"></div><div id="glow"></div>
<script>window.TECH = ${JSON.stringify(TECH)}; window.TECH_SCENES = {}; window.__timelines = window.__timelines || {};</script>
${scenes}
</div>
<script>${fs.readFileSync(path.join(RUNTIME, 'tech.js'), 'utf8')}</script>
</body></html>`, 'utf8');
  return proj;
}

function resolveAt(at: number | string, lay: ReturnType<typeof layout>) {
  if (typeof at === 'number') return at;
  const l = lay.lines.find(x => x.id === at); if (l) return l.t0;
  const [lid, w] = at.includes(':') ? [at.split(':')[0], at.split(':').slice(1).join(':')] : [null, at];
  const hit = lay.lines.filter(x => !lid || x.id === lid).flatMap(x => x.words).find(x => norm(x.w) === norm(w));
  if (!hit) throw new Error(`sfx at "${at}": word not spoken`);
  return hit.s;
}

async function stillsAt(video: string, times: number[], outDir: string, width = 360) {
  fs.mkdirSync(outDir, { recursive: true });
  const files: string[] = [];
  for (const t of times) {
    const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '3', f]);
    files.push(f);
  }
  return files;
}

export interface TechBuildOptions { agent?: string; noTts?: boolean; snap?: number[]; /** brand profile for scratch builds (DB brand wins) */ brand?: string; /** validate + lay out + write the HyperFrames project only (no TTS, no render) */ plan?: boolean }

export async function buildTech(id: string, opts: TechBuildOptions = {}) {
  const agent = opts.agent ?? 'render', t00 = Date.now(), log: string[] = [];
  const { spec, dir } = loadSpec(id);
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any;   // null = scratch build (STUDIO_PRODUCTIONS), no DB writes
  if (prod && opts.brand && prod.brand_id !== opts.brand) throw new Error(`${id} is brand ${prod.brand_id}, not ${opts.brand}`);
  const bp = brandProfile(prod?.brand_id ?? opts.brand ?? 'tech');
  if (bp.brand === 'celebrity') {
    const htmls = spec.scenes.map(s => ({ scene: s.id, html: fs.readFileSync(path.join(dir, s.html ?? `scenes/${s.id}.html`), 'utf8') }));
    const prov = fs.existsSync(path.join(dir, 'assets', 'provenance.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'assets', 'provenance.json'), 'utf8')) : null;
    const bad = lintCelebrityScenes(htmls, prov);
    if (bad.length) throw new Error(`celebrity rules (original typography/illustration only): ${bad.join('; ')}`);
  }
  if (opts.plan) {   // dry run: no TTS, no render, no DB writes
    const lay = layout(spec, estimate(spec));
    const proj = writeProject(id, spec, dir, lay, path.join(WORK, `${id}-plan`), bp);
    return { production_id: id, plan: true, brand: bp.brand, voice: spec.voice?.name ?? bp.voice, music: bp.music, music_exists: fs.existsSync(bp.music), estimated_duration: lay.D,
      band: bp.band, scenes: lay.scenes.map(s => ({ id: s.id, t0: s.t0, t1: s.t1 })), lines: lay.lines.length, hyperframes_project: proj };
  }
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); console.error(`[tech] ${m}`); if (prod) emit({ kind: 'build.step', agent, productionId: id, level, message: m }); };
  const draft = !!opts.noTts;
  const prevN = prod ? Number(prod.version ?? 0) : Math.max(0, ...fs.readdirSync(dir).map(f => /^v(\d+)$/.exec(f)?.[1]).filter(Boolean).map(Number));
  const n = draft ? 0 : prevN + 1;
  const vdir = path.join(dir, draft ? 'draft' : `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  note(`${bp.brand} ${draft ? 'draft (estimated timing, no TTS)' : `build v${n}`} started (${spec.scenes.length} scenes)${prod ? '' : ' — scratch (no DB row)'}`);
  if (prod && !draft) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, id);

  const nr = draft ? { out: estimate(spec), wer: null, asr: null } : await narrate(spec, dir, vdir, id, agent, note, bp);
  const lay = layout(spec, nr.out);
  const { D, fps } = lay, W = spec.width ?? 1080, H = spec.height ?? 1920, F = (t: number) => Math.max(0, Math.round(t * fps)), N = Math.round(D * fps);
  fs.writeFileSync(path.join(vdir, 'score.json'), JSON.stringify({ D, fps, scenes: lay.scenes, lines: lay.lines.map(l => ({ ...l, words: l.words })) }, null, 1), 'utf8');
  note(`Score: ${D.toFixed(2)} s, ${lay.lines.length} lines; first word at ${lay.lines[0].t0.toFixed(2)} s; scenes ${lay.scenes.map(s => `${s.id}@${s.t0.toFixed(2)}`).join(' ')}`);
  if (lay.lines[0].t0 > 0.3) note(`First spoken word at ${lay.lines[0].t0.toFixed(2)} s (> 0.3 s, playbook H4)`, 'warn');
  if (!draft && (D < bp.band[0] || D > bp.band[1])) note(`Duration ${D.toFixed(1)} s is outside the ${bp.band[0]}-${bp.band[1]} s band (${bp.brand})`, 'warn');
  const words3 = lay.lines.flatMap(l => l.words).filter(w => w.s < 3).length;
  if (words3 > 7) note(`${words3} words in the first 3 s (playbook H4: <= 7)`, 'warn');

  /* picture: one HyperFrames composition */
  const proj = writeProject(id, spec, dir, lay, path.join(WORK, `${id}-${draft ? 'draft' : `v${n}`}`), bp);
  const pic = path.join(vdir, 'scenes.mp4');
  const tR = Date.now();
  await withLock('render', agent, () => renderHF(proj, pic, { quality: 'high', timeoutS: Math.max(300, D * 20) }));
  note(`HyperFrames picture rendered in ${((Date.now() - tR) / 1000).toFixed(0)} s`);
  const snapT = opts.snap?.length ? opts.snap : [0, 1.5, 3.0, +(D * 0.5).toFixed(2), +(D * 0.7).toFixed(2), +(D - 0.1).toFixed(2)];
  if (draft) {
    const st = await stillsAt(pic, snapT, path.join(vdir, 'stills'));
    note(`Draft: ${pic} + ${st.length} stills (360 px) in ${path.join(vdir, 'stills')}`);
    return { production_id: id, draft: true, duration: D, picture: pic, stills: st, log };
  }

  /* captions (pages from the aligned words) */
  const capOpt = spec.captions === false ? null : spec.captions ?? {};
  const pages = capOpt ? pageCaptions(lay.lines.flatMap(l => l.words.map(w => ({ w: w.w, t0: w.s, t1: w.e }))) as any, 3, capOpt.maxChars ?? 16, (capOpt as { minPage?: number }).minPage ?? 0.7) : [];  // minPage: prelint caption_short gate (0.7 s); merges respect sentence ends
  if (pages.length) pages[pages.length - 1].t1 = Math.min(pages[pages.length - 1].t1, D);
  fs.writeFileSync(path.join(vdir, 'captions.json'), JSON.stringify(pages, null, 1), 'utf8');

  /* timeline */
  const tracks: Track[] = [];
  tracks.push({ name: 'scenes', kind: 'video', items: [{ type: 'video', name: 'hyperframes', src: pic, fromFrame: 0, durationInFrames: N, volume: 0 }] });
  const hd = F(spec.hook.dur ?? 2.2);
  tracks.push({ name: 'hook', kind: 'video', items: [{ type: 'text', name: 'hook', text: spec.hook.text, fromFrame: 0, durationInFrames: hd, fadeOutFrames: 5, transform: { y: spec.hook.y ?? -20 },
    props: { fontSize: 112, fontWeight: 900, color: bp.hook.color, lineHeight: 1.08, bgEnabled: true, bgColor: bp.hook.bg, bgRadius: 36, bgPaddingX: 44, bgPaddingY: 18, bgBorder: bp.hook.border, textShadow: '0 4px 18px rgba(0,0,0,0.7)' } }] });
  const accent = Object.fromEntries(Object.entries(capOpt?.accent ?? {}).map(([k, v]) => [k.toUpperCase().replace(/[^A-Z0-9']/g, ''), v]));
  if (pages.length) tracks.push({ name: 'captions', kind: 'video', items: pages.map((p, i) => ({ type: 'text', name: `cap${i}`, text: p.text, fromFrame: F(p.t0), durationInFrames: Math.max(1, F(p.t1) - F(p.t0)), transform: { y: capOpt?.y ?? 22 },
    props: { fontSize: 104, fontWeight: 900, color: bp.caption.color, lineHeight: 1.05, textShadow: bp.caption.shadow, ...(Object.keys(accent).length ? { accent } : {}) } }) as Item) });
  tracks.push({ name: 'narration', kind: 'audio', items: lay.lines.map(l => ({ type: 'audio', name: l.id, src: l.clip!, fromFrame: F(l.at), durationInFrames: Math.max(1, Math.min(Math.round(l.dur * fps), N - F(l.at))), volume: 1 }) as Item) });
  const lanes: Item[][] = [];
  for (const c of (spec.sfx ?? []).map(c => ({ ...c, t: resolveAt(c.at, lay) + (c.offset ?? 0) })).sort((a, b) => a.t - b.t)) {
    const f = path.join(KIT, 'sfx', `${c.name}.wav`);
    if (!fs.existsSync(f)) throw new Error(`sfx "${c.name}" unknown (have: ${fs.readdirSync(path.join(KIT, 'sfx')).map(x => x.replace('.wav', '')).join(', ')})`);
    const d = Math.max(1, Math.ceil((fs.statSync(f).size - 44) / (48000 * 4) * fps));
    const it: Item = { type: 'audio', name: c.name, src: f, fromFrame: F(c.t), durationInFrames: Math.min(d, N - F(c.t)), volume: +dbLin(c.db ?? -8).toFixed(4) };
    if (it.durationInFrames < 1) continue;
    let k = lanes.findIndex(l => l.every(o => o.fromFrame + o.durationInFrames <= it.fromFrame));
    if (k < 0) { lanes.push([]); k = lanes.length - 1; } lanes[k].push(it);
  }
  lanes.forEach((l, i) => tracks.push({ name: `sfx${i}`, kind: 'audio', items: l }));
  if (spec.bed !== false) {
    const bed = path.join(vdir, 'bed.wav'), b = spec.bed ?? {};
    await run('ffmpeg', ['-v', 'error', '-y', '-stream_loop', '-1', '-i', bp.music, '-t', D.toFixed(3), '-af', `afade=t=out:st=${Math.max(0, D - 0.25).toFixed(3)}:d=0.25`, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', bed]);
    const spans: [number, number][] = [];
    for (const l of lay.lines) { const a = l.t0 - 0.1, e = l.t1 + 0.15; if (spans.length && a <= spans[spans.length - 1][1] + 0.5) spans[spans.length - 1][1] = e; else spans.push([a, e]); }
    duckWav(bed, spans, b.gainDb ?? -19, (b.gainDb ?? -19) - (b.duckDb ?? 6));
    tracks.push({ name: 'bed', kind: 'audio', items: [{ type: 'audio', name: path.basename(bp.music, '.wav'), src: bed, fromFrame: 0, durationInFrames: N, volume: 1 }] });
  }
  const tl: Timeline = { version: 1, width: W, height: H, fps, durationInFrames: N, background: bp.background, tracks, meta: { builder: 'tech', brand: bp.brand, production: id, version: n } };
  fs.writeFileSync(path.join(vdir, 'timeline.json'), JSON.stringify(tl, null, 1), 'utf8');
  const report: any = { production_id: id, version: n, duration: D, scenes: lay.scenes.length, lines: lay.lines.length, first_word: lay.lines[0].t0, wer: nr.wer };
  if (prod) {
    db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET notes=excluded.notes`).run(id, n, path.join(vdir, 'captions.json'), J.str(report));
    db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, id);
  }
  const raw = path.join(vdir, 'render.raw.mp4');
  const rr = await withLock('render', agent, () => renderTimeline(tl, raw, { workDir: path.join(vdir, 'render-work') }));
  note(`Composited with ffmpeg in ${rr.seconds.toFixed(1)} s`);
  const final = path.join(vdir, 'render.mp4');
  await master(raw, final);
  await run(PY, ['-I', path.join(PYDIR, 'techqa.py'), final, path.join(vdir, 'qa'), '--expect-duration', D.toFixed(2), '--size', `${W}x${H}`], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  const st = await stillsAt(final, snapT, path.join(vdir, 'qa', 'stills'));
  if (prod) {
    db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), id, n);
    db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now') WHERE production_id=? AND current_state NOT IN ('approved','scheduled','published')`).run(id);
  }
  report.minutes = +((Date.now() - t00) / 60000).toFixed(1);
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) in ${report.minutes} min — technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}`, tq.pass ? 'success' : 'warn');
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify({ ...report, techqa: tq, log }, null, 1), 'utf8');
  return { ...report, render: final, stills: st, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs } };
}
