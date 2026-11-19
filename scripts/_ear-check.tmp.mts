// Free Gemini audio "ear" check for letter-sound takes. Usage: npx tsx ear-check.ts <wav> [<wav>...]
import { readFileSync } from 'node:fs';
import { geminiKeys } from '../packages/shared/src/secrets.ts';

const prompt = `You are a phonics teacher checking a children's video voice track. Listen carefully.
For EACH separate sound or word spoken, in order, give: the text heard, IPA, and for any isolated letter sound say whether it is
(a) the letter SOUND (phonics, e.g. short a /æ/ as in "cat", /k/ "kuh", /b/ "buh") or (b) the letter NAME (e.g. "ay", "see", "bee", "kay").
For any "a"-type vowel, say explicitly whether it is /æ/ (cat, apple) or /ɑ/ (father) or /eɪ/ (letter name A).
Answer as compact JSON: {"tokens":[{"heard":"...","ipa":"...","kind":"sound|name|word"}],"verdict":"one line"}`;

const keys = geminiKeys();
for (const f of process.argv.slice(2)) {
  const b64 = readFileSync(f).toString('base64');
  let out = '';
  for (const k of keys) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'audio/wav', data: b64 } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
    });
    if (!r.ok) continue;
    const j: any = await r.json();
    out = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (out) break;
  }
  console.log(f.split(/[\\/]/).pop(), out.replace(/\s+/g, ' ').slice(0, 900));
}
