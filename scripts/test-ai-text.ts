/** AI-generation text guard (packages/shared/src/ai-text.ts) on the shared fixtures config/ai-text-fixtures.json (+ the Python twin). */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { aiTextFields, aiTextHit, aiTextHits, stringsWithKeys } from '../packages/shared/src/ai-text.ts';

const R = path.resolve(import.meta.dirname, '..');
const fx = JSON.parse(fs.readFileSync(path.join(R, 'config', 'ai-text-fixtures.json'), 'utf8'));
let fail = 0, n = 0;
const ok = (c: boolean, m: string) => { n++; if (!c) { fail++; console.error('FAIL', m); } };
for (const p of fx.positives) ok(aiTextHits(p.text, { brand: p.brand }).length > 0, `should hit: ${p.text}`);
for (const x of fx.negatives) { const h = aiTextHits(x.text, { brand: x.brand }); ok(h.length === 0, `false hit (${h[0]?.rule}): ${x.text}`); }
// brand exemption: #AI is topical on tech only
ok(aiTextHit('#AI #shorts', { brand: 'tech' }) === null && aiTextHit('#AI #shorts', { brand: 'rankings' }) !== null, '#AI exempt on tech only');
// SELF marker beats the topic allow-list
ok(aiTextHit('How AI voices work. Narration in this video: AI voice.', { brand: 'tech' }) !== null, 'self marker beats topic phrasing on the same line');
ok(aiTextHits('How rockets work\nNarration: AI voice (Gemini TTS)', { brand: 'tech' }).length > 0, 'disclosure line under a topic title still hits');
// field walker
const hits = aiTextFields(stringsWithKeys({ title: 'Moon walk', description: 'Real footage.\nVoiceover by ElevenLabs', tags: ['moon', 'ai voice'] }), 'clipping');
ok(hits.some(h => h.key === 'description') && hits.some(h => h.key === 'tags[1]'), `field keys: ${JSON.stringify(hits.map(h => h.key))}`);
// Python twin agrees on the same fixtures
try { execFileSync('python', [path.join(R, 'scripts', 'ai_text.py'), 'test'], { stdio: 'pipe' }); ok(true, 'python twin'); }
catch (e: any) { ok(false, `python twin: ${String(e.stdout ?? e.message).slice(0, 400)}`); }
console.log(`test-ai-text: ${n - fail}/${n} ok`);
if (fail) process.exit(1);
