/**
 * Karto Shorts (9:16) cut from the film: film.json.shorts[] = {id, from, to, hook_text, cta:{who, text}}.
 * A Short = the film's own narration clips and picture for lines from..to (picture re-captured at 1080x1920, layout "tall",
 * `window` = the Short's film-time range, `__seek` gets FILM time) + ONE extra spoken CTA line in that speaker's voice
 * (single-voice TTS, cached, aligned + gated) placed 0.5 s after the last line; the page draws the Short's hook and the
 * "full video" card (show.short). Own music bed, SFX from the page's cues inside the window, master, techqa.
 * -> productions/<id>/shorts/<sid>/render.mp4 + short.json (+ captions.srt). Target 25-58 s (warned outside).
 * --draft: no TTS (estimated CTA), show.json + 3 page stills, no render.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { P } from '../../shared/src/paths.ts';
import { capturePicture } from '../../quizlong/src/capture.ts';
import { mixClips, rmsDb } from '../../test3d/src/audio.ts';
import { finishAudio, finishVideo, noter, pageInfo, sha } from './build.ts';
import { buildSrt } from './captions.ts';
import { allowFor, fileId, loadFilm, makeShow, maxWer, resolvePage, snap, versionDir, WPS_EST, type CutShort, type Score, type ScoreLine } from './film.ts';
import { alignCached, fuzzyWer, gateWer, takeCheck, type Placed } from './narrate.ts';

const run = promisify(execFile);
const FPS = 30, W = 1080, H = 1920, LEAD = 0.35, CTA_GAP = 0.5, END_HOLD = 0.9;
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

export async function buildShorts(id: string, o: { only?: string[]; draft?: boolean; version?: string; page?: string; workers?: number; agent?: string; keepWork?: boolean } = {}) {
  const agent = o.agent ?? 'render', { film, dir } = loadFilm(id), pageDir = resolvePage(o.page);
  const list = (film.shorts ?? []).filter(s => !o.only?.length || o.only.includes(s.id));
  if (!list.length) throw new Error(`film.json has no shorts${o.only?.length ? ` matching ${o.only.join(',')}` : ''}`);
  const vdir = o.draft ? path.join(dir, 'draft') : versionDir(dir, o.version), scoreFile = path.join(vdir, 'score.json');
  if (!fs.existsSync(scoreFile)) throw new Error(`${scoreFile} missing: build the film first${o.draft ? ' (build --draft)' : ''}`);
  if (!o.draft && vdir.endsWith('draft')) throw new Error('no voiced version of the film yet: run build first (or shorts --draft)');
  const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8')) as Score;
  const placed: Placed[] = o.draft ? [] : JSON.parse(fs.readFileSync(path.join(vdir, 'narration', 'placed.json'), 'utf8'));
  const { note } = noter(id, agent, 'cutout-shorts');
  const out: any[] = [];
  for (const s of list) out.push(await buildOne(s));
  return out;

  async function buildOne(s: CutShort) {
    const t00 = Date.now(), sdir = path.join(dir, 'shorts', s.id), work = o.draft ? path.join(sdir, 'draft') : sdir;
    fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
    const i0 = score.lines.findIndex(l => l.id === s.from), i1 = score.lines.findIndex(l => l.id === s.to);
    const lines = score.lines.slice(i0, i1 + 1), last = lines[lines.length - 1];
    const t0 = Math.max(0, snap(lines[0].t0 - LEAD, FPS));
    /* CTA line: estimated (draft) or TTS -> align -> gate -> clip */
    const cast = film.cast[s.cta.who], ctaId = 'cta';
    let ctaWords: { w: string; s: number; e: number }[], clip: string | null = null, s0 = 0, ctaReport: any;
    if (o.draft) {
      let t = 0; ctaWords = s.cta.text.trim().split(/\s+/).map(w => { const r = { w, s: t, e: t + 0.86 / WPS_EST(film.lang) }; t += 1 / WPS_EST(film.lang); return r; });
      ctaReport = { estimated: true };
    } else {
      const tts = await synthesize(s.cta.text.trim(), cast.voice, cast.style, { productionId: id, retake: (s as any).retake });
      const raw = path.join(dir, 'voice', path.basename(tts.file)); if (!fs.existsSync(raw)) fs.copyFileSync(tts.file, raw);
      const { al } = await alignCached(raw, [{ id: ctaId, text: s.cta.text.trim() }], film.lang, path.join(dir, 'voice'), work, `cta-${fileId(s.id)}`, agent);
      const chk = takeCheck(String(al.asr_text), [{ text: s.cta.text }], film, al.lines[0]?.start ?? 0), wer = gateWer(film, al.wer, fuzzyWer(String(al.asr_text), s.cta.text, film.lang));
      ctaReport = { text: s.cta.text, who: s.cta.who, cached: tts.cached, model: tts.model, wer, wer_raw: al.wer, check: chk, asr_text: al.asr_text };
      note(`Short ${s.id} CTA (${s.cta.who}): ${tts.cached ? 'cached' : `generated (${tts.model})`}, WER ${(wer * 100).toFixed(1)} %${chk.ok ? '' : `; CHECK: ${chk.problems.join('; ')}`}`);
      /* a CTA is one short line: Arabic near-spelling WER on 9 words swings by 11 points per word, so its bar is 35 %; and a take that
         reads the style note first is still usable when the aligned line, cut out and listened to alone, is clean (2026-11-19) */
      const ctaMax = film.lang === 'ar' ? Math.max(maxWer(film), 0.35) : maxWer(film);
      let src = raw, alU: any = al;
      if (wer > ctaMax || !chk.ok) {
        const a0 = al.lines[0], pre = path.join(work, 'cta-pre.wav');
        await run('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, a0.start - 0.15).toFixed(3), '-to', Math.min(al.duration, a0.end + 0.25).toFixed(3), '-i', raw, pre]);
        const r2 = await alignCached(pre, [{ id: ctaId, text: s.cta.text.trim() }], film.lang, path.join(dir, 'voice'), work, `cta2-${fileId(s.id)}`, agent);
        const chk2 = takeCheck(String(r2.al.asr_text), [{ text: s.cta.text }], film, r2.al.lines[0]?.start ?? 0), wer2 = gateWer(film, r2.al.wer, fuzzyWer(String(r2.al.asr_text), s.cta.text, film.lang));
        note(`Short ${s.id} CTA: the line cut out of the take and checked alone: WER ${(wer2 * 100).toFixed(1)} %${chk2.ok ? '' : `; CHECK: ${chk2.problems.join('; ')}`}`);
        if (wer2 > ctaMax || !chk2.ok) throw new Error(`Short ${s.id}: CTA take failed the gate (WER ${(wer * 100).toFixed(1)} %; ${chk.problems.join('; ')}; cut-out line WER ${(wer2 * 100).toFixed(1)} %; ${chk2.problems.join('; ')}); add "retake" to that short in the storyboard`);
        src = pre; alU = r2.al; ctaReport = { ...ctaReport, recheck: { wer: wer2, check: chk2, asr_text: r2.al.asr_text } };
      }
      const a = alU.lines[0]; ctaWords = a.words; s0 = Math.max(0, a.start - 0.04);
      clip = path.join(work, 'cta.wav');
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', Math.min(alU.duration, a.end + 0.12).toFixed(3), '-i', src, '-af', 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse', '-ar', '48000', '-ac', '2', clip]);
    }
    const ctaAt = last.t1 + CTA_GAP, off = ctaAt - ctaWords[0].s;   // take time -> film time
    const cta: ScoreLine & { cta: true } = { id: ctaId, chapter: last.chapter, who: s.cta.who, text: s.cta.text, t0: +(ctaWords[0].s + off).toFixed(3), t1: +(ctaWords[ctaWords.length - 1].e + off).toFixed(3), words: ctaWords.map(w => ({ w: w.w, t0: +(w.s + off).toFixed(3), t1: +(w.e + off).toFixed(3) })), cta: true };
    const N = Math.ceil((cta.t1 + END_HOLD - t0) * FPS - 1e-6), D = N / FPS, t1 = +(t0 + D).toFixed(4);
    const warn: string[] = [];
    if (D < 25 || D > 58) { warn.push(`duration ${D.toFixed(1)} s is outside the 25-58 s target`); note(`Short ${s.id}: duration ${D.toFixed(1)} s is outside the 25-58 s target`, 'warn'); }
    /* The page runs the WHOLE film script, so it needs every line and chapter of the film: a line it cannot find resolves to t = 0 and
       its props then sit on the board for the whole Short (first Shorts, 2026-11-19: a pile of props from all chapters). Lines and
       chapters before the window keep their film times; everything after the window moves far out of range. */
    const SH = 1e5;
    const farL = (l: ScoreLine): ScoreLine => ({ ...l, t0: l.t0 + SH, t1: l.t1 + SH, words: l.words.map(w => ({ ...w, t0: w.t0 + SH, t1: w.t1 + SH })) });
    const showChapters = score.chapters.map(c => (c.t0 >= last.t1 ? { ...c, t0: c.t0 + SH, t1: c.t1 + SH } : c.t1 > last.t1 ? { ...c, t1 } : c));
    const showLines = [...score.lines.slice(0, i0), ...lines, cta, ...score.lines.slice(i1 + 1).map(farL)];
    /* the Short's own lines + chapter pieces (audio sections, speech ducking, captions) */
    const chapters = score.chapters.filter(c => c.t1 > t0 && c.t0 < t1).map(c => ({ ...c, t0: Math.max(c.t0, t0), t1: Math.min(c.t1, t1) }));
    const sl = [...lines, cta];
    const show = makeShow(film, score, { layout: 'tall', window: { t0, t1 }, short: { id: s.id, hook_text: s.hook_text, cta_text: s.cta.text, t0, t1 }, lines: showLines, chapters: showChapters, duration: t1, end_text: '' });
    const showFile = path.join(work, 'show.json'); fs.writeFileSync(showFile, JSON.stringify(show, null, 1), 'utf8');
    const info = { id: s.id, from: s.from, to: s.to, film_version: path.basename(vdir), t0, t1, duration: +D.toFixed(3), frames: N, lines: lines.map(l => l.id), hook_text: s.hook_text, cta: { ...s.cta, t0: cta.t0, t1: cta.t1, ...ctaReport }, warn };
    if (o.draft) {
      const times = [t0 + 1, (t0 + last.t1) / 2, cta.t0 + 0.3].map(t => +t.toFixed(2));
      const pi = await withLock('render', agent, () => pageInfo(pageDir, dir, show, note, { times, out: path.join(work, 'stills'), width: 360 }));
      fs.writeFileSync(path.join(work, 'short.json'), JSON.stringify({ ...info, draft: true, cues: pi.cues.length }, null, 1), 'utf8');
      note(`Short ${s.id} draft: ${D.toFixed(1)} s, ${pi.stills.length} stills -> ${path.join(work, 'stills')}`);
      return { ...info, draft: true, stills: pi.stills };
    }
    /* picture */
    const pi = await withLock('render', agent, () => pageInfo(pageDir, dir, show, note));
    const cues = pi.cues.filter(c => c.t >= t0 && c.t < t1);
    fs.writeFileSync(path.join(work, 'cues.json'), JSON.stringify(cues, null, 1), 'utf8');
    const pic = path.join(work, 'picture.mp4');
    const cap = await withLock('render', agent, () => capturePicture({ templateDir: pageDir, showFile, out: pic, fps: FPS, width: W, height: H, frames: N, timeOf: f => t0 + f / FPS, workers: o.workers, allow: allowFor(dir) }));
    fs.rmSync(path.join(work, 'capture-work'), { recursive: true, force: true });
    note(`Short ${s.id}: ${N} frames captured in ${cap.seconds} s (${cap.capture_fps} frames/s)`);
    /* audio: the film's line clips at their film times - t0, the CTA matched to its speaker's median line level */
    const mine = placed.filter(p => lines.some(l => l.id === p.id));
    const spk = placed.filter(p => p.who === s.cta.who).map(p => (rmsDb(p.clip) ?? -60) + p.gainDb), ctaRms = rmsDb(clip!) ?? -60;
    const ctaGain = spk.length ? +Math.max(-6, Math.min(6, med(spk) - ctaRms)).toFixed(2) : 0;
    const narration = mixClips(path.join(work, 'narration.wav'), [...mine.map(p => ({ file: p.clip, at: p.at - t0, gainDb: p.gainDb })), { file: clip!, at: ctaAt - (ctaWords[0].s - s0) - t0, gainDb: ctaGain }], D);
    const sections = chapters.map(c => ({ id: c.id, t0: c.t0 - t0, t1: c.t1 - t0, mood: c.mood }));
    const seed = (film.music_seed ?? 7) * 31 + parseInt(sha(s.id).slice(0, 4), 16);
    const au = await finishAudio({ vdir: work, D, narration, cues, cueOffset: t0, sections, speech: sl.map(l => ({ t0: l.t0 - t0, t1: l.t1 - t0 })), seed });
    fs.writeFileSync(path.join(work, 'captions.srt'), buildSrt({ lines: sl, duration: D }, t0), 'utf8');
    const fin = await withLock('render', agent, () => finishVideo({ vdir: work, pic, mixFile: au.mixFile, D, W, H, stills: [1.0, +(D / 2).toFixed(2), +(cta.t0 - t0 + 0.3).toFixed(2), +(D - 0.5).toFixed(2)], keepWork: o.keepWork, agent, extraWork: au.stems }));
    const tq = fin.tq, rep = { ...info, cues: cues.length, cta_gain_db: ctaGain, mix: au.mix, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs }, render: path.relative(P.root, fin.final), seconds: Math.round((Date.now() - t00) / 1000) };
    fs.writeFileSync(path.join(work, 'short.json'), JSON.stringify(rep, null, 1), 'utf8');
    note(`Short ${s.id}: ${D.toFixed(1)} s, technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}; ${tq.integrated_lufs} LUFS`, tq.pass ? 'success' : 'warn');
    return { ...rep, stills: fin.stills };
  }
}
