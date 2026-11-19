// Draft score for testing the Fair Game model without TTS: storyboard -> score.json (same shape as packages/test3d/src/build.ts Score).
// 2.6 words/s, 0.45 s between lines, 1.2 s between chapters, + each line's pause_after; 1920x1080, 30 fps, per-word times.
// node draft-score.mjs [storyboard.json] [out.json]   (defaults: docs/brands/test-3d/fair-game/storyboard.json -> .../fair-game/draft-score.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), DOCS = path.resolve(HERE, '../../../../docs/brands/test-3d/fair-game');
export function draftScore(sb, { wps = 2.6, lineGap = 0.45, chapterGap = 1.2, fps = 30, width = 1920, height = 1080, lead = 0.6, tail = 1.4 } = {}) {
  const per = 1 / wps, lines = []; let t = lead;
  sb.chapters.forEach((c, ci) => c.lines.forEach((l, li) => {
    if (ci && !li) t += chapterGap - lineGap;
    const words = l.text.trim().split(/\s+/).map((w) => { const r = { w, t0: +t.toFixed(3), t1: +(t + per * 0.86).toFixed(3) }; t += per; return r; });
    lines.push({ id: l.id, text: l.text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
    t = words[words.length - 1].t1 + lineGap + (l.pause_after ?? 0);
  }));
  const last = lines[lines.length - 1], lastPause = sb.chapters.at(-1).lines.at(-1).pause_after ?? 0;
  return { fps, width, height, duration: Math.ceil((last.t1 + lastPause + tail) * fps) / fps, lines };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = process.argv[2] ?? path.join(DOCS, 'storyboard.json'), out = process.argv[3] ?? path.join(DOCS, 'draft-score.json');
  const score = draftScore(JSON.parse(fs.readFileSync(src, 'utf8')));
  fs.writeFileSync(out, JSON.stringify(score, null, 1), 'utf8');
  console.log(`${out}: ${score.lines.length} lines, ${score.lines.reduce((a, l) => a + l.words.length, 0)} words, ${score.duration.toFixed(1)} s`);
}
