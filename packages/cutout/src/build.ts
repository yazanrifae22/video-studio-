/**
 * Karto cutout LONG-FORM builder (16:9, 9-12 min, English or Arabic, two speakers): productions/<id>/film.json ->
 *   narration (narrate.ts: one TTS call per take, multi-speaker) -> score.json -> show.json (contract cutout/1)
 *   -> page session (__load: sfx cues + lint) -> picture captured per chapter segment by quizlong capturePicture (N Chrome
 *   workers, reused across versions when the chapter's timing is unchanged; --chapters / --resume) -> joined (stream copy)
 *   -> narration premix + SFX lane + mood bed (musicBedLong, ducked) -> mux -> master (-14 LUFS, <= -1.6 dBTP) -> techqa
 *   -> captions.srt + chapters.txt (captions, hook and end text are drawn by the page).
 * --draft: estimated timing, no TTS: draft/score.json + show.json + chapters.txt + page stills (2 per chapter).
 * Docs: docs/brands/karto/build.md. Contract: docs/brands/karto/CONTRACT.md.
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { capturePicture } from '../../quizlong/src/capture.ts';
import { PY, PYDIR, gaps, lufs, stillsAt } from '../../test3d/src/build.ts';
import { duckWav, mixClips, musicBedLong, rmsDb } from '../../test3d/src/audio.ts';
import { mixSfx, sumStems, unknownCues } from './audio.ts';
import { buildChapters, buildSrt } from './captions.ts';
import { allowFor, brandOf, CUTOUT, estimateScore, fmt, loadFilm, makeShow, resolvePage, versionDir, versions, type CutFilm, type Score, type ScoreChapter } from './film.ts';
import { narrateFilm, type Placed } from './narrate.ts';
import { openPage, type Cue } from './page.ts';

const run = promisify(execFile);
export type Note = (m: string, l?: 'info' | 'warn' | 'success') => void;
export interface BuildOpts { agent?: string; draft?: boolean; resume?: boolean; chapters?: string[]; workers?: number; reason?: string | null; page?: string; keepWork?: boolean }

export const sha = (x: string | Buffer) => crypto.createHash('sha1').update(x).digest('hex').slice(0, 16);
/** hash of the page folder + the film's folder (recorded per segment; a reused segment rendered with another kit gets a warning) */
export function kitSha(pageDir: string, slug: string) {
  const h = crypto.createHash('sha1');
  for (const d of [pageDir, path.join(CUTOUT, 'films', slug)]) {
    if (!fs.existsSync(d)) continue;
    const walk = (x: string): string[] => fs.readdirSync(x, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(x, e.name)) : [path.join(x, e.name)]);
    for (const f of walk(d).sort()) h.update(path.relative(P.root, f)).update(fs.readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}
export function noter(id: string, agent: string, tag = 'cutout') {
  const prod = (() => { try { return db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any; } catch { return null; } })();
  const log: string[] = [];
  const note: Note = (m, level = 'info') => { log.push(m); console.error(`[${tag}] ${m}`); if (prod) try { emit({ kind: 'build.step', agent, productionId: id, level, message: m }); } catch { /* events busy */ } };
  return { prod, log, note };
}
/** page session: cues (checked against sfx.json) + lint; optional stills */
export async function pageInfo(pageDir: string, dir: string, show: any, note: Note, stills?: { times: number[]; out: string; width: number; prefix?: string }) {
  const s = await openPage(pageDir, allowFor(dir), show, { scale: stills ? stills.width / show.width : 0.25 });
  try {
    for (const l of s.info.lint) note(`page lint: ${l}`, 'warn');
    if (s.info.errors.length) note(`page errors: ${s.info.errors.slice(0, 3).join(' | ').slice(0, 400)}`, 'warn');
    const files: string[] = [];
    if (stills) for (const t of stills.times) files.push(await s.shot(t, path.join(stills.out, `${stills.prefix ?? ''}t${t.toFixed(2).padStart(7, '0')}.jpg`)));
    return { cues: s.info.cues as Cue[], lint: s.info.lint, marks: s.info.marks, errors: s.info.errors, stills: files };
  } finally { await s.close(); }
}

/* ------------------------------------------------------------------ picture segments */
interface SegEntry { id: string; f0: number; f1: number; key: string; file: string; status: 'rendered' | 'reused'; from_version: number; kit_sha: string; seconds?: number; capture_fps?: number; why?: string }
interface SegManifest { version: number; kit_sha: string; page: string; segments: SegEntry[] }
const linkOrCopy = (src: string, dst: string) => { fs.rmSync(dst, { force: true }); try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); } };
export async function countFrames(f: string) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f]);
  return parseInt(String(r.stdout).trim(), 10);   // csv can print "1295," (trailing field separator)
}
/** what a segment's frames depend on (besides the kit/film.js): frame range, size, page, the film-wide texts and the chapter's words + times */
function segKey(film: CutFilm, score: Score, c: ScoreChapter, f0: number, f1: number, page: string) {
  const ls = score.lines.filter(l => l.words[0].t0 >= c.t0 && l.words[0].t0 < c.t1);
  return sha(JSON.stringify({ f0, f1, W: score.width, H: score.height, fps: score.fps, page, film: { hook: film.hook_text, end: film.end_text, strings: film.strings ?? {}, captions: film.captions !== false, lang: film.lang, slug: film.slug }, lines: ls.map(l => ({ id: l.id, who: l.who, w: l.words.map(w => [w.w, w.t0, w.t1]) })) }));
}
function previousManifest(dir: string, n: number): { v: number; m: SegManifest } | null {
  for (const v of versions(dir).filter(v => v < n).reverse()) { const f = path.join(dir, `v${v}`, 'segments.json'); if (fs.existsSync(f)) return { v, m: JSON.parse(fs.readFileSync(f, 'utf8')) }; }
  return null;
}
async function captureSegments(film: CutFilm, score: Score, dir: string, vdir: string, n: number, showFile: string, pageDir: string, o: BuildOpts, note: Note) {
  const { fps } = score, NF = Math.round(score.duration * fps), page = path.relative(P.root, pageDir), kit = kitSha(pageDir, film.slug);
  const segs = score.chapters.map((c, i) => { const f0 = Math.round(c.t0 * fps), f1 = i === score.chapters.length - 1 ? NF : Math.round(c.t1 * fps); return { c, f0, f1, key: segKey(film, score, c, f0, f1, page) }; });
  const want = new Set(o.chapters ?? []);
  for (const c of want) if (!score.chapters.some(x => x.id === c)) throw new Error(`--chapters ${c}: no such chapter (have: ${score.chapters.map(x => x.id).join(', ')})`);
  const prev = want.size || o.resume ? previousManifest(dir, n) : null;
  if ((want.size || o.resume) && !prev) note('No earlier version with segments.json: every segment is captured', 'warn');
  const sdir = path.join(vdir, 'segments'); fs.mkdirSync(sdir, { recursive: true });
  const man: SegManifest = { version: n, kit_sha: kit, page, segments: [] };
  const save = () => fs.writeFileSync(path.join(vdir, 'segments.json'), JSON.stringify(man, null, 1), 'utf8');
  const todo: (typeof segs[number] & { why?: string })[] = [];
  for (const s of segs) {
    const file = path.join(sdir, `${s.c.id}.mp4`);
    if (prev && !want.has(s.c.id)) {
      const p = prev.m.segments.find(x => x.id === s.c.id), src = p ? path.join(dir, `v${prev.v}`, 'segments', `${s.c.id}.mp4`) : '';
      if (p && p.key === s.key && fs.existsSync(src)) {
        linkOrCopy(src, file);
        man.segments.push({ id: s.c.id, f0: s.f0, f1: s.f1, key: s.key, file, status: 'reused', from_version: p.status === 'reused' ? p.from_version : prev.v, kit_sha: p.kit_sha });
        note(`Segment ${s.c.id} reused from v${prev.v}${p.kit_sha !== kit ? ` (captured with an older kit/film ${p.kit_sha}; now ${kit}: list it in --chapters if its picture changed)` : ''}`, p.kit_sha !== kit ? 'warn' : 'info');
        continue;
      }
      const why = !p ? 'not in the previous version' : p.key !== s.key ? (p.f0 !== s.f0 || p.f1 !== s.f1 ? `frame range changed (${p.f0}-${p.f1} -> ${s.f0}-${s.f1}): narration timing moved` : 'its words/timing, texts or size changed') : 'previous file missing';
      if (want.size) note(`Segment ${s.c.id} not listed in --chapters but cannot be reused: ${why}; capturing it`, 'warn');
      todo.push({ ...s, why });
    } else todo.push(s);
  }
  save();
  const totalF = todo.reduce((k, s) => k + s.f1 - s.f0, 0), t0 = Date.now(); let done = 0;
  note(`Capturing ${todo.length}/${segs.length} segments, ${totalF} frames (page ${page})`);
  for (const [k, sg] of todo.entries()) {
    const file = path.join(sdir, `${sg.c.id}.mp4`);
    const r = await capturePicture({ templateDir: pageDir, showFile, out: file, fps, width: score.width, height: score.height, frames: sg.f1 - sg.f0, timeOf: f => (sg.f0 + f) / fps, workers: o.workers, allow: allowFor(dir) });
    done += sg.f1 - sg.f0;
    const el = (Date.now() - t0) / 1000, eta = done < totalF ? el / done * (totalF - done) : 0;
    note(`Segment ${sg.c.id} [${k + 1}/${todo.length}]: ${r.frames} frames in ${r.seconds} s (${r.capture_fps} frames/s, ${r.workers} workers)${eta ? `; about ${(eta / 60).toFixed(1)} min left` : ''}`);
    man.segments.push({ id: sg.c.id, f0: sg.f0, f1: sg.f1, key: sg.key, file, status: 'rendered', from_version: n, kit_sha: kit, seconds: r.seconds, capture_fps: r.capture_fps, ...(sg.why ? { why: sg.why } : {}) });
    save();   // after every segment: a crash keeps the finished ones (next build: --resume)
  }
  man.segments.sort((a, b) => a.f0 - b.f0); save();
  fs.rmSync(path.join(sdir, 'capture-work'), { recursive: true, force: true });
  const list = path.join(vdir, 'segments.txt'), pic = path.join(vdir, 'picture.mp4');
  fs.writeFileSync(list, man.segments.map(s => `file '${s.file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n', 'utf8');
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-color_range', 'pc', '-colorspace', 'bt470bg', '-movflags', '+faststart', pic]);
  const got = await countFrames(pic);
  if (got !== NF) throw new Error(`joined picture has ${got} frames, expected ${NF}`);
  fs.rmSync(list, { force: true });
  const rendered = man.segments.filter(s => s.status === 'rendered');
  note(`Picture joined: ${got} frames (${rendered.length} captured in ${(rendered.reduce((a, s) => a + (s.seconds ?? 0), 0) / 60).toFixed(1)} min; ${man.segments.length - rendered.length} reused)`);
  return { pic, segments: man.segments.map(({ file, ...s }) => s) };
}

/* ------------------------------------------------------------------ audio + finish (shared with shorts.ts) */
export async function finishAudio(o: { vdir: string; D: number; narration: string; cues: Cue[]; cueOffset?: number; sections: { id: string; t0: number; t1: number; mood: any }[]; speech: { t0: number; t1: number }[]; seed: number }) {
  const sfx = await mixSfx(path.join(o.vdir, 'sfx.wav'), o.cues, o.D, o.cueOffset ?? 0);
  const music = musicBedLong(path.join(o.vdir, 'music.wav'), o.D, o.sections, o.seed);
  const spans: [number, number][] = [];
  for (const l of o.speech) { const a = l.t0 - 0.12, e = l.t1 + 0.2; if (spans.length && a <= spans[spans.length - 1][1] + 0.5) spans[spans.length - 1][1] = e; else spans.push([a, e]); }
  duckWav(music, spans, -4, -12);   // -24 dBFS between lines, -32 under speech (test3d long-form levels)
  const mixFile = path.join(o.vdir, 'mix.wav'), sum = sumStems(mixFile, [o.narration, sfx.file, music]);
  const mix = { voice_rms_db: rmsDb(o.narration, spans), music_rms_under_speech_db: rmsDb(music, spans), music_rms_between_lines_db: rmsDb(music, gaps(spans, o.D)), sfx_cues: sfx.cues, sfx_lufs: sfx.cues ? (await lufs(sfx.file)).i : null, ...sum };
  return { mixFile, mix: { ...mix, voice_over_music_under_speech_db: mix.voice_rms_db != null && mix.music_rms_under_speech_db != null ? +(mix.voice_rms_db - mix.music_rms_under_speech_db).toFixed(1) : null }, stems: [sfx.file, music] };
}
/** picture + mix -> render.raw.mp4 -> master -> render.mp4 -> techqa (+ stills); removes raw/picture/mix/stems unless keepWork */
export async function finishVideo(o: { vdir: string; pic: string; mixFile: string; D: number; W: number; H: number; stills: number[]; keepWork?: boolean; agent: string; extraWork?: string[] }) {
  const raw = path.join(o.vdir, 'render.raw.mp4'), final = path.join(o.vdir, 'render.mp4');
  await run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', o.pic, '-i', o.mixFile, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-t', o.D.toFixed(4), raw]);
  await master(raw, final);
  await run(PY, ['-I', path.join(PYDIR, 'techqa.py'), final, path.join(o.vdir, 'qa'), '--expect-duration', o.D.toFixed(2), '--size', `${o.W}x${o.H}`, '--sheet-step', o.D > 120 ? '10' : '1.5'], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(o.vdir, 'qa', 'techqa.json'), 'utf8'));
  const st = await stillsAt(final, o.stills.filter(t => t >= 0 && t < o.D), path.join(o.vdir, 'qa', 'stills'));
  if (!o.keepWork) for (const f of [raw, o.pic, o.mixFile, ...(o.extraWork ?? [])]) fs.rmSync(f, { force: true });
  return { final, tq, stills: st };
}

/* ------------------------------------------------------------------ build */
export async function buildFilm(id: string, o: BuildOpts = {}) {
  const agent = o.agent ?? 'render', t00 = Date.now();
  const { film, dir } = loadFilm(id);
  const { W, H, fps } = fmt(film), pageDir = resolvePage(o.page);
  const { prod, log, note } = noter(id, agent);

  if (o.draft) {
    const vdir = path.join(dir, 'draft'); fs.mkdirSync(vdir, { recursive: true });
    const score = estimateScore(film), show = makeShow(film, score), showFile = path.join(vdir, 'show.json');
    fs.writeFileSync(path.join(vdir, 'score.json'), JSON.stringify(score, null, 1), 'utf8');
    fs.writeFileSync(showFile, JSON.stringify(show, null, 1), 'utf8');
    const chap = buildChapters(score); fs.writeFileSync(path.join(vdir, 'chapters.txt'), chap.text, 'utf8');
    for (const w of chap.warn) note(`chapters.txt: ${w}`, 'warn');
    note(`Draft score: ${score.duration.toFixed(1)} s (${(score.duration / 60).toFixed(2)} min), ${score.chapters.length} chapters, ${score.lines.length} lines (estimated ${film.lang === 'ar' ? 2.3 : 2.7} words/s)`);
    const times = score.chapters.flatMap(c => [0.3, 0.7].map(f => +(c.t0 + f * (c.t1 - c.t0)).toFixed(2)));
    fs.rmSync(path.join(vdir, 'stills'), { recursive: true, force: true });
    const pi = await withLock('render', agent, () => pageInfo(pageDir, dir, show, note, { times, out: path.join(vdir, 'stills'), width: 640 }));
    const bad = unknownCues(pi.cues);
    if (bad.length) note(`page cues with unknown sfx names (a real build fails on them): ${bad.join(', ')}`, 'warn');
    fs.writeFileSync(path.join(vdir, 'cues.json'), JSON.stringify(pi.cues, null, 1), 'utf8');
    note(`${pi.stills.length} page stills -> ${path.join(vdir, 'stills')} (page ${path.relative(P.root, pageDir)}, ${pi.cues.length} sfx cues)`);
    return { production_id: id, draft: true, lang: film.lang, duration: score.duration, chapters: score.chapters, show: showFile, stills: pi.stills, cues: pi.cues.length, lint: pi.lint };
  }

  const n = Math.max(0, ...versions(dir), Number(prod?.version ?? 0)) + 1, vdir = path.join(dir, `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  note(`cutout build v${n} started (${film.lang}, ${film.chapters.length} chapters, ${film.lines.length} lines, ${W}x${H}${o.chapters?.length ? `, re-capture ${o.chapters.join(',')}` : o.resume ? ', resume' : ''})${prod ? '' : ' (no DB row: files only)'}`);
  if (o.reason) fs.writeFileSync(path.join(vdir, 'build-reason.json'), JSON.stringify({ version: n, command: 'cutout build', reason: o.reason, rebuild: n >= 2, agent, at: new Date().toISOString() }, null, 2) + '\n', 'utf8');
  else if (n >= 2) note(`v${n} is a rebuild without --reason`, 'warn');
  if (prod) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, id);

  /* 1. narration + score + show */
  const nar = await narrateFilm(film, dir, vdir, id, agent, note);
  const score = nar.score, D = score.duration, NF = Math.round(D * fps);
  fs.writeFileSync(path.join(vdir, 'score.json'), JSON.stringify(score, null, 1), 'utf8');
  const show = makeShow(film, score), showFile = path.join(vdir, 'show.json');
  fs.writeFileSync(showFile, JSON.stringify(show, null, 1), 'utf8');
  const nWords = score.lines.reduce((k, l) => k + l.words.length, 0), spoken = score.lines[score.lines.length - 1].t1 - score.lines[0].t0;
  note(`Score: ${D.toFixed(1)} s (${(D / 60).toFixed(2)} min), ${nWords} words; chapters ${score.chapters.map(c => `${c.id} ${c.t0.toFixed(1)}`).join(', ')}`);
  fs.writeFileSync(path.join(vdir, 'captions.srt'), buildSrt(score), 'utf8');
  const chap = buildChapters(score); fs.writeFileSync(path.join(vdir, 'chapters.txt'), chap.text, 'utf8');
  for (const w of chap.warn) note(`chapters.txt: ${w}`, 'warn');

  /* 2. page: cues + lint, then picture */
  const pi = await withLock('render', agent, () => pageInfo(pageDir, dir, show, note));
  fs.writeFileSync(path.join(vdir, 'cues.json'), JSON.stringify(pi.cues, null, 1), 'utf8');
  const bad = unknownCues(pi.cues);
  if (bad.length) throw new Error(`page sfx cue(s) ${bad.join(', ')} unknown (packages/cutout/sfx.json lists the names)`);
  const picture = await withLock('render', agent, () => captureSegments(film, score, dir, vdir, n, showFile, pageDir, o, note));

  /* 3. audio */
  const narration = mixClips(path.join(vdir, 'narration', 'narration.wav'), nar.placed.map((p: Placed) => ({ file: p.clip, at: p.at, gainDb: p.gainDb })), D);
  const au = await finishAudio({ vdir, D, narration, cues: pi.cues, sections: score.chapters, speech: score.lines, seed: film.music_seed ?? 7 });
  note(`Mix: voice ${au.mix.voice_rms_db} dBFS RMS, music under speech ${au.mix.music_rms_under_speech_db} (${au.mix.voice_over_music_under_speech_db} dB below), between lines ${au.mix.music_rms_between_lines_db}; ${au.mix.sfx_cues} sfx`);

  const report: any = { production_id: id, version: n, lang: film.lang, brand: brandOf(film), duration: D, frames: NF, minutes_of_video: +(D / 60).toFixed(2), narration_s: +spoken.toFixed(2), words: nWords, words_per_s: +(nWords / spoken).toFixed(2),
    chapters: score.chapters, takes: nar.takes, tts_mode: nar.tts_mode, dialogue_fallback: nar.dialogue_fallback, speakers: nar.speakers, loudness_median_lufs: nar.loudness_median, wps_median: nar.wps_median,
    take_flags: nar.takes.flatMap(t => t.flags.map(f => `${t.key}: ${f}`)), wer_max: Math.max(...nar.takes.map(t => t.wer)), page: path.relative(P.root, pageDir), page_lint: pi.lint, cues: pi.cues.length,
    segments: picture.segments, chapters_warn: chap.warn, mix: au.mix, reason: o.reason ?? null };
  if (prod) {
    db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET notes=excluded.notes`).run(id, n, path.join(vdir, 'captions.srt'), J.str(report));
    db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, id);
  }

  /* 4. mux -> master -> techqa */
  const stillT = [1.0, ...score.chapters.slice(1, 7).map(c => +(c.t0 + 1.5).toFixed(2)), +(D - 1).toFixed(2)];
  const fin = await withLock('render', agent, () => finishVideo({ vdir, pic: picture.pic, mixFile: au.mixFile, D, W, H, stills: stillT, keepWork: o.keepWork, agent, extraWork: au.stems }));
  const tq = fin.tq;
  if (prod) {
    db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=? WHERE production_id=? AND n=?`).run(fin.final, tq.contact_sheet, J.str(tq), id, n);
    if (o.reason) try { db().prepare(`UPDATE versions SET notes=json_set(CASE WHEN json_valid(notes) THEN notes ELSE json_object('text', notes) END, '$.reason', ?) WHERE production_id=? AND n=?`).run(o.reason, id, n); } catch { /* no row */ }
    db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now') WHERE production_id=? AND current_state NOT IN ('approved','scheduled','published')`).run(id);
  }
  report.minutes = +((Date.now() - t00) / 60000).toFixed(1);
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) in ${report.minutes} min; technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}; ${tq.integrated_lufs} LUFS, ${tq.true_peak_dbfs} dBTP`, tq.pass ? 'success' : 'warn');
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify({ ...report, techqa: tq, log }, null, 1), 'utf8');
  return { production_id: id, version: n, lang: film.lang, duration: D, wer_max: report.wer_max, tts_mode: nar.tts_mode, render: fin.final, srt: path.join(vdir, 'captions.srt'), chapters_txt: path.join(vdir, 'chapters.txt'), stills: fin.stills, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs }, minutes: report.minutes };
}

/* ------------------------------------------------------------------ preview + snap */
/** a window (or one chapter) of the picture at full size, scaled to --width, with the version's sound -> <vN|draft>/preview/<label>.mp4 */
export async function previewFilm(id: string, o: { from?: number; to?: number; chapter?: string; version?: string; width?: number; page?: string; workers?: number; agent?: string }) {
  const { film, dir } = loadFilm(id), vdir = versionDir(dir, o.version), scoreFile = path.join(vdir, 'score.json');
  if (!fs.existsSync(scoreFile)) throw new Error(`${scoreFile} missing: run build ${id} --draft first`);
  const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8')) as Score, pageDir = resolvePage(o.page);
  let a = o.from, b = o.to, label = '';
  if (o.chapter) { const c = score.chapters.find(x => x.id === o.chapter); if (!c) throw new Error(`chapter ${o.chapter} not in ${scoreFile}`); a = c.t0; b = c.t1; label = c.id; }
  if (a == null || b == null || !(b > a)) throw new Error('preview needs --from S --to S or --chapter ID');
  a = Math.max(0, a); b = Math.min(score.duration, b); label ||= `${a.toFixed(1)}-${b.toFixed(1)}`;
  const pdir = path.join(vdir, 'preview'); fs.mkdirSync(pdir, { recursive: true });
  const show = makeShow(film, score, { window: { t0: a, t1: b } }), showFile = path.join(pdir, `show-${label}.json`);
  fs.writeFileSync(showFile, JSON.stringify(show, null, 1), 'utf8');
  const silent = path.join(pdir, `${label}.full.mp4`), out = path.join(pdir, `${label}.mp4`), fps = score.fps, a0 = a;
  const r = await withLock('render', o.agent ?? 'render', () => capturePicture({ templateDir: pageDir, showFile, out: silent, fps, width: score.width, height: score.height, frames: Math.round((b! - a0) * fps), timeOf: f => a0 + f / fps, workers: o.workers ?? 2, allow: allowFor(dir) }));
  const w = Math.round((o.width ?? 960) / 2) * 2;
  const sound = [path.join(vdir, 'render.mp4'), path.join(vdir, 'narration', 'narration.wav')].find(f => fs.existsSync(f));
  await run('ffmpeg', ['-v', 'error', '-y', '-i', silent, ...(sound ? ['-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', sound, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k', '-shortest'] : []), '-vf', `scale=${w}:-2`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', out]);
  fs.rmSync(silent, { force: true }); fs.rmSync(path.join(pdir, 'capture-work'), { recursive: true, force: true });
  return { file: out, from: a, to: b, frames: r.frames, seconds: r.seconds, capture_fps: r.capture_fps, sound: sound ?? null };
}

/** page stills of the latest version (or draft) at film times or line middles; --layout tall = the Shorts layout */
export async function snapFilm(id: string, o: { times?: number[]; lines?: string[]; width?: number; layout?: 'wide' | 'tall'; version?: string; page?: string; agent?: string }) {
  const { film, dir } = loadFilm(id), vdir = versionDir(dir, o.version), scoreFile = path.join(vdir, 'score.json');
  if (!fs.existsSync(scoreFile)) throw new Error(`${scoreFile} missing: run build ${id} --draft first`);
  const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8')) as Score;
  const times = [...(o.times ?? [])];
  for (const lid of o.lines ?? []) { const l = score.lines.find(x => x.id === lid); if (!l) throw new Error(`line ${lid} not in ${scoreFile}`); times.push(+((l.t0 + l.t1) / 2).toFixed(2)); }
  if (!times.length) times.push(...score.chapters.map(c => +((c.t0 + c.t1) / 2).toFixed(2)));
  const layout = o.layout ?? 'wide', show = makeShow(film, score, { layout });
  const { note } = noter(id, o.agent ?? 'render');
  const pi = await withLock('render', o.agent ?? 'render', () => pageInfo(resolvePage(o.page), dir, show, note, { times, out: path.join(vdir, 'stills'), width: o.width ?? (layout === 'tall' ? 360 : 640), prefix: `snap-${layout}-` }));
  return pi.stills;
}
