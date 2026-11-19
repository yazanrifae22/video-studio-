/**
 * quiz-ar LAB builder ("cut paper on a desk" Shorts, 1080x1920 30 fps): `npx tsx packages/quizlab/src/build.ts <id> [--no-tts] [--snap t1,t2] [--reason "..."] [--workers N] [--page <dir>]`
 * lab.json -> per-line TTS (cached, trimmed, tempo) -> per-line ASR check -> page `__plan(durs)` -> show.json -> frames via
 * quizlong capturePicture -> mix (narration + sfx + ducked bed) -> render.raw.mp4 -> master (-14 LUFS) -> techqa + contact sheet.
 * Page contract and file layout: docs/brands/quiz-ar/lab-paper/CONTRACT.md sections 2 and 4.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { chromePath } from '../../render/src/text.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { capturePicture } from '../../quizlong/src/capture.ts';
import { applyEnvelope, decode, lufs, mixInto, peak, SR, writeWav } from '../../quizlong/src/mix.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const SRC = import.meta.dirname;
const TECHQA = path.join(P.root, 'packages', 'intelligence', 'py', 'techqa.py');
const SFX_DIR = path.join(P.data, 'brand', 'shu-lab', 'sfx');
const FPS = 30, W = 1080, H = 1920;
const dbGain = (d: number) => Math.pow(10, d / 20);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

interface LabLine { id: string; text: string; onscreen?: string; voice?: string; style?: string; tempo?: number; gain?: number; /** cache-key salt = a fresh TTS take of the same text (set by warm.ts --retake) */ retake?: string | number; /** [from,to] seconds inside the trimmed take to remove (10 ms crossfade), e.g. a long natural pause */ cuts?: [number, number][] }
interface Lab { production_id: string; title: string; fps: number; voice: { name: string; style?: string; tempo?: number }; lines: LabLine[] }
interface Plan { duration: number; cues: { id: string; at: number }[]; sfx?: { name: string; at: number; gain?: number }[]; bed?: { name: string; from?: number; to?: number; gain?: number }; marks?: unknown }

/** Static server over the page folder + data/brand + node_modules (same allow-list as the quizlong capture server). */
async function serve(pageDir: string) {
  const allow = [pageDir, path.join(P.data, 'brand'), path.join(P.root, 'node_modules')].map(a => path.resolve(a).toLowerCase());
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent((q.url ?? '/').split('?')[0]);
    const f = path.join(P.root, u);
    if (!allow.some(a => path.resolve(f).toLowerCase().startsWith(a)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(s);
  }).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const rel = path.relative(P.root, pageDir).split(path.sep).map(encodeURIComponent).join('/');
  return { srv, url: `http://127.0.0.1:${(srv.address() as any).port}/${rel}/frame.html` };
}

const estimate = (text: string) => Math.max(0.9, text.trim().split(/\s+/).filter(Boolean).length / 2.6);

/** Trim leading/trailing near-silence (10 ms windows below -46 dBFS), keep 40 ms each side. */
function trim(x: Float32Array) {
  const win = 480, thr = Math.pow(10, -46 / 10);
  const loud = (i: number) => { let e = 0; for (let k = 0; k < win && i + k < x.length; k++) e += x[i + k] ** 2; return e / win > thr; };
  let a = 0; while (a + win < x.length && !loud(a)) a += win;
  let b = x.length; while (b - win > a && !loud(b - win)) b -= win;
  const pad = Math.round(0.04 * SR);
  const s = Math.max(0, a - pad), e = Math.min(x.length, b + pad);
  const out = new Float32Array(e - s + Math.max(0, pad - a) + Math.max(0, pad - (x.length - b)));
  out.set(x.subarray(s, e), Math.max(0, pad - a));
  return out;
}

/** Remove [from,to] second spans from a take (sorted, non-overlapping), joining with a 10 ms linear crossfade. */
function cutSpans(x: Float32Array, cuts: [number, number][]) {
  const xf = Math.round(0.01 * SR), parts: Float32Array[] = [];
  let pos = 0;
  for (const [a, b] of [...cuts].sort((p, q) => p[0] - q[0])) {
    const sa = Math.round(a * SR), sb = Math.round(b * SR);
    parts.push(x.subarray(pos, sa)); pos = sb;
  }
  parts.push(x.subarray(pos));
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const n = Math.min(xf, out.length, parts[i].length), r = new Float32Array(out.length + parts[i].length - n);
    r.set(out); 
    for (let k = 0; k < n; k++) { const w = (k + 1) / (n + 1); r[out.length - n + k] = out[out.length - n + k] * (1 - w) + parts[i][k] * w; }
    r.set(parts[i].subarray(n), out.length);
    out = r;
  }
  return out;
}

interface Narr { durs: Record<string, number>; files: Record<string, string>; tts: { line: string; model: string | null; cached: boolean; voice: string; tempo: number; seconds: number }[]; real: boolean }

async function narrate(lab: Lab, outDir: string, o: { noTts: boolean; cacheOnly?: boolean; productionId: string; note: (m: string) => void }): Promise<Narr> {
  fs.mkdirSync(outDir, { recursive: true });
  const n: Narr = { durs: {}, files: {}, tts: [], real: !o.noTts };
  for (const l of lab.lines) {
    const dst = path.join(outDir, `${l.id}.wav`);
    n.files[l.id] = dst;
    if (o.noTts) { const d = estimate(l.text); n.durs[l.id] = d; writeWav(dst, new Float32Array(Math.round(d * SR))); continue; }
    const voice = l.voice ?? lab.voice.name, style = l.style ?? lab.voice.style, tempo = l.tempo ?? lab.voice.tempo ?? 1;
    const r = await synthesize(l.text, voice, style, { productionId: o.productionId, cacheOnly: o.cacheOnly, retake: l.retake });
    let src = r.file;
    if (Math.abs(tempo - 1) > 1e-3) {
      src = path.join(outDir, `_tempo_${l.id}.wav`);
      await run('ffmpeg', ['-v', 'error', '-y', '-i', r.file, '-af', `atempo=${tempo}`, '-ar', String(SR), '-ac', '1', src]);
    }
    let x: Float32Array = trim(await decode(src));
    if (l.cuts?.length) x = cutSpans(x, l.cuts);
    writeWav(dst, x);
    if (src !== r.file) fs.rmSync(src, { force: true });
    n.durs[l.id] = +(x.length / SR).toFixed(3);
    n.tts.push({ line: l.id, model: r.model, cached: r.cached, voice, tempo, seconds: n.durs[l.id] });
    o.note(`narration ${l.id}: ${n.durs[l.id].toFixed(2)} s (${r.cached ? 'cached' : 'new take ' + r.model})`);
  }
  return n;
}

async function withPage<T>(pageDir: string, dpr: number, fn: (page: import('playwright-core').Page, url: string) => Promise<T>): Promise<T> {
  const { srv, url } = await serve(pageDir);
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
    const errs: string[] = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(url);
    try { await page.waitForFunction('typeof window.__plan === "function" && typeof window.__load === "function" && typeof window.__seek === "function"', null, { timeout: 30_000 }); }
    catch { throw new Error(`page has no __plan/__load/__seek: ${errs.join(' | ').slice(0, 600)}`); }
    return await fn(page, url);
  } finally { await browser.close().catch(() => {}); srv.close(); }
}

function validatePlan(plan: Plan, lab: Lab, durs: Record<string, number>): string[] {
  const errs: string[] = [];
  if (!plan || typeof plan.duration !== 'number') return ['plan.duration missing'];
  if (plan.duration < 12 || plan.duration > 45) errs.push(`duration ${plan.duration} s outside 12-45 s`);
  const snapped = Math.round(plan.duration * FPS) / FPS;
  if (Math.abs(snapped - plan.duration) > 1e-6) errs.push(`duration ${plan.duration} is not a multiple of 1/30 (nearest ${snapped.toFixed(4)})`);
  const cues = [...(plan.cues ?? [])].sort((a, b) => a.at - b.at);
  for (const l of lab.lines) if (!cues.some(c => c.id === l.id)) errs.push(`line ${l.id} has no cue`);
  for (const c of cues) {
    if (durs[c.id] == null) { errs.push(`cue for unknown line ${c.id}`); continue; }
    if (c.at < 0 || c.at + durs[c.id] > plan.duration + 1e-3) errs.push(`cue ${c.id} (${c.at}-${(c.at + durs[c.id]).toFixed(2)} s) outside the duration`);
  }
  for (let i = 1; i < cues.length; i++) {
    const p = cues[i - 1];
    if (p.at + (durs[p.id] ?? 0) > cues[i].at + 1e-3) errs.push(`narration overlap: ${p.id} (ends ${(p.at + durs[p.id]).toFixed(2)}) and ${cues[i].id} (starts ${cues[i].at})`);
  }
  const have = new Set(fs.readdirSync(SFX_DIR).filter(f => f.endsWith('.wav')).map(f => f.slice(0, -4)));
  const bad = [...new Set([...(plan.sfx ?? []).map(s => s.name), ...(plan.bed ? [plan.bed.name] : [])].filter(n => !have.has(n)))];
  if (bad.length) errs.push(`unknown sfx/bed name(s): ${bad.join(', ')}. Available: ${[...have].sort().join(', ')}`);
  for (const s of plan.sfx ?? []) if (!(s.at >= 0 && s.at < plan.duration)) errs.push(`sfx ${s.name} at ${s.at} outside the duration`);
  return errs;
}

/** Lookahead limiter (2 ms sliding-min gain, 2 ms smoothing, ~80 ms release): lets short loud SFX hits stay under the voice so master() can lift the whole mix to -14 LUFS. */
function limit(x: Float32Array, thrDb: number) {
  const thr = dbGain(thrDb), n = x.length, W = Math.round(0.002 * SR), rel = Math.exp(-1 / (0.08 * SR));
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); g[i] = a > thr ? thr / a : 1; }
  const gm = new Float32Array(n);
  for (let i = 0; i < n; i++) { let m = 1; const e = Math.min(n, i + W); for (let k = Math.max(0, i - W); k < e; k++) if (g[k] < m) m = g[k]; gm[i] = m; }
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + gm[i];
  let prev = 1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - W), b = Math.min(n, i + W + 1);
    const sm = (cs[b] - cs[a]) / (b - a);
    const t = Math.min(sm, gm[i]);
    prev = t < prev ? t : t + (prev - t) * rel;
    if (prev > 1) prev = 1;
    x[i] *= Math.min(prev, gm[i] <= prev ? gm[i] : prev);
  }
}

async function mix(plan: Plan, lab: Lab, n: Narr, outFile: string) {
  const len = Math.round(plan.duration * SR);
  const narr = new Float32Array(len), sfx = new Float32Array(len), bed = new Float32Array(len);
  const spans: [number, number][] = [];
  for (const c of [...plan.cues].sort((a, b) => a.at - b.at)) {
    const l = lab.lines.find(x => x.id === c.id)!;
    mixInto(narr, await decode(n.files[c.id]), c.at, dbGain(l.gain ?? 0));
    const a = c.at, b = c.at + n.durs[c.id];
    if (spans.length && a <= spans[spans.length - 1][1] + 0.05) spans[spans.length - 1][1] = Math.max(spans[spans.length - 1][1], b); else spans.push([a, b]);
  }
  for (const s of plan.sfx ?? []) mixInto(sfx, await decode(path.join(SFX_DIR, `${s.name}.wav`)), s.at, dbGain(s.gain ?? 0));
  if (plan.bed) {
    const src = await decode(path.join(SFX_DIR, `${plan.bed.name}.wav`));
    const from = plan.bed.from ?? 0, to = Math.min(plan.bed.to ?? plan.duration, plan.duration);
    const a = Math.round(from * SR), b = Math.min(len, Math.round(to * SR)), g = dbGain(plan.bed.gain ?? 0);
    for (let i = a; i < b; i++) bed[i] = src[(i - a) % src.length] * g;
    const fi = Math.round(0.3 * SR);
    for (let i = 0; i < fi && a + i < b; i++) { bed[a + i] *= i / fi; if (b - 1 - i >= a) bed[b - 1 - i] *= i / fi; }
    const keys: { t: number; g: number }[] = [{ t: 0, g: 1 }];
    const duck = dbGain(-8);
    for (const [s0, s1] of spans) keys.push({ t: Math.max(0.001, s0 - 0.08), g: 1 }, { t: s0, g: duck }, { t: s1, g: duck }, { t: s1 + 0.08, g: 1 });
    keys.sort((p, q) => p.t - q.t);
    applyEnvelope(bed, keys);
  }
  const sum = new Float32Array(len);
  for (let i = 0; i < len; i++) sum[i] = narr[i] + sfx[i] + bed[i];
  limit(sum, -12);
  const pk = peak(sum), lim = dbGain(-0.5), sc = pk > lim ? lim / pk : 1;
  if (sc < 1) for (let i = 0; i < len; i++) sum[i] *= sc;
  writeWav(outFile, sum);
  return { peak_dbfs: +(20 * Math.log10(Math.max(1e-9, pk * sc))).toFixed(1), scaled_db: +(20 * Math.log10(sc)).toFixed(1), voice_spans: spans.length };
}

export async function buildLab(id: string, o: { noTts?: boolean; snap?: number[]; reason?: string; workers?: number; page?: string; agent?: string } = {}) {
  const agent = o.agent ?? 'render';
  const dir = path.join(P.productions, id);
  const labFile = path.join(dir, 'lab.json');
  if (!fs.existsSync(labFile)) throw new Error(`${labFile} not found`);
  const lab: Lab = JSON.parse(fs.readFileSync(labFile, 'utf8'));
  const pageDir = path.resolve(P.root, o.page ?? path.join('productions', id, 'page'));
  if (!fs.existsSync(path.join(pageDir, 'frame.html'))) throw new Error(`${pageDir}\\frame.html not found`);
  if (lab.fps && lab.fps !== FPS) throw new Error(`lab.json fps must be ${FPS}`);
  const ids = lab.lines.map(l => l.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate line ids in lab.json');
  const prod = (() => { try { return db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any; } catch { return null; } })();
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { console.error(`[quizlab] ${m}`); if (prod) try { emit({ kind: 'build.step', agent, productionId: id, level, message: m }); } catch { /* events busy */ } };

  /* ---- --snap: stills only, no version, no TTS spend ---- */
  if (o.snap?.length) {
    const draft = path.join(dir, 'draft');
    fs.mkdirSync(draft, { recursive: true });
    let n: Narr;
    try { n = await narrate(lab, path.join(draft, '_narr'), { noTts: false, cacheOnly: true, productionId: id, note: () => {} }); note('snap: cached narration durations'); }
    catch { n = await narrate(lab, path.join(draft, '_narr'), { noTts: true, productionId: id, note: () => {} }); note('snap: some lines not cached, estimated durations', 'warn'); }
    const files: string[] = [];
    await withPage(pageDir, 0.5, async page => {
      const plan: Plan = await page.evaluate((d: any) => (window as any).__plan(d), n.durs);
      fs.writeFileSync(path.join(draft, 'plan.json'), JSON.stringify({ estimated: !n.real, durs: n.durs, plan }, null, 1), 'utf8');
      const errs = validatePlan(plan, lab, n.durs);
      for (const e of errs) note(`plan: ${e}`, 'warn');
      await page.evaluate(async (s: any) => { const w = window as any; await w.__load(s, { warm: true }); }, { lines: lab.lines, durs: n.durs, plan });
      await page.waitForFunction('window.__ready === true', null, { timeout: 60_000 });
      for (const t of o.snap!) {
        await page.evaluate((x: number) => (window as any).__seek(x), Math.min(t, plan.duration - 1 / FPS));
        const f = path.join(draft, `t${t}.png`);
        await page.screenshot({ path: f });
        files.push(f);
      }
    });
    note(`snap: ${files.length} stills in ${path.relative(P.root, draft)}`, 'success');
    return { stills: files };
  }

  /* ---- full build ---- */
  const t00 = Date.now();
  const stages: Record<string, number> = {};
  const stage = async <X>(name: string, fn: () => Promise<X>): Promise<X> => { const t = Date.now(); try { return await fn(); } finally { stages[name] = +((Date.now() - t) / 1000).toFixed(1); } };
  const existing = fs.readdirSync(dir).map(f => /^v(\d+)$/.exec(f)).filter(Boolean).map(m => +m![1]);
  const nv = Math.max(prod?.version ?? 0, ...existing, 0) + 1;
  const vdir = path.join(dir, `v${nv}`);
  const qa = path.join(vdir, 'qa');
  fs.mkdirSync(qa, { recursive: true });
  note(`lab build v${nv} started${o.noTts ? ' (silent, no TTS)' : ''}${o.reason ? ` - ${o.reason}` : ''}`);
  if (prod) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, id);

  const narr = await stage('narration', () => narrate(lab, path.join(vdir, 'narration'), { noTts: !!o.noTts, productionId: id, note }));

  if (!o.noTts) {
    await stage('asr', async () => {
      const inp = path.join(qa, '_asr-in.json');
      fs.writeFileSync(inp, JSON.stringify(lab.lines.map(l => ({ id: l.id, text: l.text, file: narr.files[l.id] })), null, 1), 'utf8');
      await run(PY, ['-I', path.join(SRC, 'asr.py'), inp, path.join(qa, 'asr.json')], { maxBuffer: 1 << 26, timeout: 1800_000 });
      fs.rmSync(inp, { force: true });
    });
    const asr: any[] = JSON.parse(fs.readFileSync(path.join(qa, 'asr.json'), 'utf8'));
    for (const a of asr.filter(x => x.flag)) note(`ASR flag ${a.line}: WER ${a.wer} (${a.reason}) heard "${a.heard}"`, 'warn');
  } else fs.writeFileSync(path.join(qa, 'asr.json'), JSON.stringify({ skipped: 'no-tts' }), 'utf8');

  const plan: Plan = await stage('plan', () => withPage(pageDir, 1, page => page.evaluate((d: any) => (window as any).__plan(d), narr.durs)));
  fs.writeFileSync(path.join(vdir, 'plan.json'), JSON.stringify(plan, null, 1), 'utf8');
  const perr = validatePlan(plan, lab, narr.durs);
  if (perr.length) throw new Error(`plan invalid:\n - ${perr.join('\n - ')}`);
  const showFile = path.join(vdir, 'show.json');
  fs.writeFileSync(showFile, JSON.stringify({ lines: lab.lines, durs: narr.durs, plan }, null, 1), 'utf8');
  const N = Math.round(plan.duration * FPS);
  note(`plan: ${plan.duration.toFixed(2)} s (${N} frames), ${plan.cues.length} cues, ${(plan.sfx ?? []).length} sfx${plan.bed ? `, bed ${plan.bed.name}` : ''}`);

  const audioFile = path.join(vdir, 'mix.wav');
  const mixInfo = await stage('mix', () => mix(plan, lab, narr, audioFile));
  const picture = path.join(vdir, 'picture.mp4'), raw = path.join(vdir, 'render.raw.mp4'), final = path.join(vdir, 'render.mp4');
  const report: any = { version: nv, format: 'quiz-lab', title: lab.title, reason: o.reason ?? null, silent: !!o.noTts, duration: plan.duration, frames: N, durs: narr.durs, tts: narr.tts, mix: mixInfo, page: path.relative(P.root, pageDir), stages };
  if (prod) {
    db().prepare(`INSERT INTO versions(production_id, n, notes) VALUES (?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET notes=excluded.notes`).run(id, nv, J.str(report));
    db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(nv, id);
  }
  await withLock('render', agent, async () => {
    note(`capturing ${N} frames`);
    report.capture = await stage('capture', () => capturePicture({ templateDir: pageDir, showFile, out: picture, fps: FPS, width: W, height: H, frames: N, workers: o.workers }));
    note(`picture: ${N} frames in ${report.capture.seconds} s (${report.capture.capture_fps} frames/s, ${report.capture.workers} workers)`);
    for (const l of report.capture.template_lint ?? []) note(`page: ${l}`, 'warn');
    await run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', picture, '-i', audioFile, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', plan.duration.toFixed(4), raw]);
  });
  await stage('master', () => master(raw, final));
  await stage('techqa', () => run(PY, ['-I', TECHQA, final, qa, '--size', `${W}x${H}`, '--expect-duration', plan.duration.toFixed(2), '--sheet-step', '1.5'], { maxBuffer: 1 << 26, timeout: 1800_000 }));
  await stage('sheet', () => run(PY, ['-I', path.join(SRC, 'sheet.py'), final, path.join(qa, 'sheet.jpg')]));
  const tq = JSON.parse(fs.readFileSync(path.join(qa, 'techqa.json'), 'utf8'));
  report.result = { lufs: +(await lufs(final)).toFixed(1), true_peak_dbfs: tq.true_peak_dbfs, techqa_pass: tq.pass, techqa_failed: tq.failed, duration: tq.duration };
  report.render = final;
  report.build_seconds = Math.round((Date.now() - t00) / 1000);
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify(report, null, 1), 'utf8');
  if (prod) db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=?, notes=? WHERE production_id=? AND n=?`).run(final, path.join(qa, 'sheet.jpg'), J.str(tq), J.str(report), id, nv);
  note(`v${nv} rendered (${tq.duration.toFixed(1)} s, ${report.result.lufs} LUFS) - technical QA ${tq.pass ? 'passed' : 'FAILED: ' + (tq.failed ?? []).join(', ')}`, tq.pass ? 'success' : 'warn');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const a = process.argv.slice(2);
  const id = a.find(x => !x.startsWith('--'));
  const opt = (k: string) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  if (!id) { console.error('usage: build.ts <productionId> [--no-tts] [--snap t1,t2] [--reason "..."] [--workers N] [--page dir]'); process.exit(2); }
  buildLab(id, { noTts: a.includes('--no-tts'), snap: opt('--snap')?.split(',').map(Number).filter(x => !isNaN(x)), reason: opt('--reason'), workers: opt('--workers') ? +opt('--workers')! : undefined, page: opt('--page') })
    .then(r => { console.log(JSON.stringify((r as any).stills ?? { version: (r as any).version, duration: (r as any).duration, result: (r as any).result }, null, 1)); process.exit(0); })
    .catch(e => { console.error(e instanceof Error ? e.stack ?? e.message : e); process.exit(1); });
}
