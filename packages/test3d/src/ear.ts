/**
 * Second listener for a test-3d narration take (free Gemini audio understanding):
 *   npx tsx packages/test3d/src/ear.ts <id> [--version N]
 * Sends the paced take of the latest (or given) version and asks what is really spoken, then lists every word that
 * differs from film.json. Use it when the Whisper gate passes but its text shows a doubtful word.
 * -> productions/<id>/vN/narration/ear-check.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';
import { geminiKeys } from '../../shared/src/secrets.ts';

const argv = process.argv.slice(2), id = argv[0];
const vi = argv.indexOf('--version');
const dir = path.join(P.root, 'productions', id);
const versions = fs.readdirSync(dir).filter(n => /^v\d+$/.test(n) && fs.existsSync(path.join(dir, n, 'narration', 'asr.json'))).map(n => +n.slice(1)).sort((a, b) => a - b);
const n = vi >= 0 ? +argv[vi + 1] : versions[versions.length - 1];
const nd = path.join(dir, `v${n}`, 'narration');
const asr = JSON.parse(fs.readFileSync(path.join(nd, 'asr.json'), 'utf8'));
const film = JSON.parse(fs.readFileSync(path.join(dir, 'film.json'), 'utf8'));
const script = film.lines.map((l: any) => l.text).join(' ');
const prompt = `Listen to this narration for a short video. Write down EXACTLY the words that are spoken, word for word, numbers as words, nothing added, nothing corrected. If a word is unclear write your best guess of what was actually said, not what would make sense.
Then compare with the intended script below and list every place where the spoken words differ (a wrong, missing or extra word; a homophone such as too/two is NOT a difference).
Intended script: "${script}"
Answer as compact JSON: {"heard":"...","differences":[{"script":"...","spoken":"..."}],"extra_speech_before_or_after":true|false,"clear":1-5,"problem":"empty or one short sentence"}`;
let out = '';
for (const k of geminiKeys()) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': k }, signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'audio/wav', data: fs.readFileSync(asr.file).toString('base64') } }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
  }).catch(() => null);
  if (!r || !r.ok) continue;
  const j: any = await r.json();
  out = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (out) break;
}
let o: any = {};
try { o = JSON.parse(out); } catch { o = { raw: out.slice(0, 400) }; }
fs.writeFileSync(path.join(nd, 'ear-check.json'), JSON.stringify({ version: n, file: asr.file, ...o }, null, 1), 'utf8');
console.log(`${id} v${n} clear ${o.clear} extra ${o.extra_speech_before_or_after} differences ${JSON.stringify(o.differences ?? o.raw)} | ${o.problem ?? ''}`);
console.log(`  heard: ${o.heard}`);
