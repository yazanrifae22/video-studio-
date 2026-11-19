/**
 * Second listener for lab narration takes (free Gemini audio understanding): `npx tsx packages/quizlab/src/ear.ts <id> [lineId,...]`
 * Reads productions/<id>/draft/_lines.json (written by warm.ts) and asks, per take, what is really spoken.
 * -> productions/<id>/draft/ear-check.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';
import { geminiKeys } from '../../shared/src/secrets.ts';

// --blind: the listener is NOT told the intended words (plain transcription) -> draft/ear-blind.json
const blind = process.argv.includes('--blind');
const argv = process.argv.filter(a => a !== '--blind');
const id = argv[2], only = argv[3]?.split(',');
const dir = path.join(P.root, 'productions', id, 'draft');
const lines: any[] = JSON.parse(fs.readFileSync(path.join(dir, '_lines.json'), 'utf8'));
const keys = geminiKeys();
const res: any[] = [];
for (const l of lines) {
  if (only && !only.includes(l.id)) continue;
  const prompt = blind ? `Listen to this short voice clip of spoken Arabic. Write down exactly the words you hear, as spoken (keep the dialect, do not correct it to standard Arabic).
Answer as compact JSON: {"heard":"exact words in Arabic script","dialect":"which Arabic dialect it sounds like, one or two words","clear":1-5,"problem":"empty, or one short English sentence about a garbled word, robotic sound, cut-off start or end, or extra speech"}`
  : `Listen to this short voice clip. It should be one line of Syrian (Damascus) colloquial Arabic for a short video.
Intended line: «${l.text}»
Syrian pronunciation is expected and correct (qaf as a glottal stop, th as t/s, "هلّق", "بوظة", etc.).
Answer as compact JSON: {"heard":"exact words you hear, in Arabic script","same_words":true|false,"extra_speech":true|false,"clear":1-5,"natural_syrian":1-5,"problem":"empty or one short English sentence: a wrong/missing/garbled word, robotic or foreign accent, MSA instead of dialect, cut-off start or end"}`;
  let out = '';
  for (const k of keys) {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': k }, signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'audio/wav', data: fs.readFileSync(l.file).toString('base64') } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
    }).catch(() => null);
    if (!r || !r.ok) continue;
    const j: any = await r.json();
    out = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (out) break;
  }
  let o: any = {};
  try { o = JSON.parse(out); } catch { o = { raw: out.slice(0, 200) }; }
  res.push({ line: l.id, voice: l.voice, text: l.text, ...o });
  if (blind) { console.log(`${l.id} clear ${o.clear} ${o.dialect} | want: ${l.text} | heard: ${o.heard} | ${o.problem ?? ''}`); continue; }
  console.log(`${l.id} ${o.same_words === false || o.extra_speech || (o.clear ?? 5) < 4 ? 'CHECK' : 'ok   '} clear ${o.clear} syr ${o.natural_syrian} | ${o.heard} | ${o.problem ?? ''}`);
}
fs.writeFileSync(path.join(dir, blind ? 'ear-blind.json' : 'ear-check.json'), JSON.stringify(res, null, 1), 'utf8');
