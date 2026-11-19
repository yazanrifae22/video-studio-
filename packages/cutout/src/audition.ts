/**
 * Voice audition for a cutout film: the first chapter spoken by 2+ voice pairs, per language -> mp3 files + one local HTML page.
 *   npx tsx packages/cutout/src/audition.ts <slug> <chapterId> "Karto1+Skip1,Karto2+Skip2" [maxLines]
 * Reads productions' film.json through the storyboard's `productions`; network only (no ASR, no GPU). Takes are cached like builds.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { P, production } from '../../shared/src/paths.ts';
import { synthesizeDialogue } from '../../voice/src/gemini-tts.ts';

const [slug, chapterId, pairsArg, maxArg] = process.argv.slice(2);
const dir = path.join(P.root, 'docs', 'brands', 'karto', slug);
const sb = JSON.parse(fs.readFileSync(path.join(dir, 'storyboard.json'), 'utf8'));
const pairs = pairsArg.split(',').map(p => p.split('+'));
const out = path.join(dir, 'voices'); fs.mkdirSync(out, { recursive: true });
const rows: string[] = [];
for (const lang of ['en', 'ar'] as const) {
  const film = JSON.parse(fs.readFileSync(path.join(production(sb.productions[lang]), 'film.json'), 'utf8'));
  const ch = film.chapters.find((c: any) => c.id === chapterId);
  const lines = ch.lines.slice(0, Number(maxArg ?? 99));
  for (const [kv, sv] of pairs) {
    const speakers = [{ name: 'Karto', voice: kv, style: film.cast.karto.style }, { name: 'Skip', voice: sv, style: film.cast.skip.style }];
    const name = `${lang}-${kv}-${sv}.mp3`;
    try {
      const t = await synthesizeDialogue(lines.map((l: any) => ({ speaker: l.who === 'karto' ? 'Karto' : 'Skip', text: l.text.trim() })), speakers, { productionId: sb.productions[lang] });
      execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', t.file, '-b:a', '96k', path.join(out, name)]);
      console.log(`${name}: ${t.cached ? 'cached' : t.model}`);
      rows.push(`<tr><td>${lang === 'en' ? 'English' : 'العربية'}</td><td>Karto = ${kv}<br>Skip = ${sv}</td><td><audio controls preload="none" src="voices/${name}"></audio></td></tr>`);
    } catch (e: any) { console.log(`${name}: FAILED ${String(e?.message ?? e).slice(0, 200)}`); }
  }
}
fs.writeFileSync(path.join(dir, 'voices.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Karto voices</title><style>body{font:16px/1.5 Segoe UI,sans-serif;background:#e9dcc6;color:#231a12;max-width:860px;margin:24px auto;padding:0 16px}table{border-collapse:collapse;width:100%;background:#fbf8f1}td,th{padding:10px;border-bottom:1px solid #d6c4a6;text-align:left}audio{width:100%;min-width:260px}</style></head><body><h1>Karto & Skip: voice audition</h1><p>The opening chapter (${chapterId}) spoken by each voice pair. Tell me the pair you want per language, or "other voices".</p><table><tr><th>Language</th><th>Pair</th><th>Listen</th></tr>${rows.join('')}</table></body></html>`, 'utf8');
console.log(path.join(dir, 'voices.html'));
