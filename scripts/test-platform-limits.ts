/** Unit test for packages/shared/src/platform-limits.ts + its Python twin scripts/platform_limits.py (same cases, same verdicts).
 *  `npx tsx scripts/test-platform-limits.ts` */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { charLen, hashtagsIn, publishedMeta, tagsLength, utf8Bytes, youtubeLimitIssues } from '../packages/shared/src/platform-limits.ts';

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const fill = (unit: string, bytes: number) => { let s = ''; while (utf8Bytes(s + unit) <= bytes) s += unit; while (utf8Bytes(s) < bytes) s += 'a'; return s; };

const en4999 = fill('word ', 4999), en5001 = fill('word ', 5001), ar4999 = fill('كلمة ', 4999), ar5001 = fill('كلمة ', 5001);
eq('fixture byte sizes', [utf8Bytes(en4999), utf8Bytes(en5001), utf8Bytes(ar4999), utf8Bytes(ar5001)], [4999, 5001, 4999, 5001]);
eq('Arabic 5001 bytes is under 3000 characters (5000 chars would be ~9000 bytes)', charLen(ar5001) < 3000, true);
const t100 = 'T'.repeat(100), t101 = 'T'.repeat(101), ar100 = 'ع'.repeat(100);
const tags16 = Array.from({ length: 16 }, (_, i) => `#tag${String.fromCharCode(97 + i)}`).join(' ');
const tags15 = Array.from({ length: 15 }, (_, i) => `#tag${String.fromCharCode(97 + i)}`).join(' ');

const cases: { name: string; m: { title: string; description: string; tags?: string[] }; want: string[] }[] = [
  { name: 'EN description 4999 bytes -> ok', m: { title: 'ok', description: en4999 }, want: [] },
  { name: 'EN description 5001 bytes -> description', m: { title: 'ok', description: en5001 }, want: ['description'] },
  { name: 'AR description 4999 bytes -> ok', m: { title: 'عنوان', description: ar4999 }, want: [] },
  { name: 'AR description 5001 bytes (~2780 chars) -> description', m: { title: 'عنوان', description: ar5001 }, want: ['description'] },
  { name: 'title 100 -> ok', m: { title: t100, description: 'd' }, want: [] },
  { name: 'Arabic title 100 chars (200 bytes) -> ok (title counts characters)', m: { title: ar100, description: 'd' }, want: [] },
  { name: 'title 101 -> title', m: { title: t101, description: 'd' }, want: ['title'] },
  { name: 'empty title -> title', m: { title: ' ', description: 'd' }, want: ['title'] },
  { name: '< > in title and description -> both', m: { title: 'Top 5 <wow>', description: 'a > b' }, want: ['title', 'description'] },
  { name: '> in a tag -> tags[1]', m: { title: 'x', description: 'd', tags: ['ok', 'a>b'] }, want: ['tags[1]'] },
  { name: '15 hashtags -> ok', m: { title: 'x #shorts', description: tags15.replace('#taga', '#Shorts') }, want: [] },
  { name: '16 hashtags -> hashtags', m: { title: 'x', description: tags16 }, want: ['hashtags'] },
  { name: '"#1" / URL anchors are not hashtags', m: { title: 'Stay for #1', description: `${tags15} https://x.com/#frag #2026` }, want: [] },
  { name: 'tags 500 chars -> ok', m: { title: 'x', description: 'd', tags: ['a'.repeat(249), 'b'.repeat(250)] }, want: [] },
  { name: 'tags with a space count quotes (501) -> tags', m: { title: 'x', description: 'd', tags: ['a b'.padEnd(248, 'c'), 'd'.repeat(250)] }, want: ['tags'] },
];
for (const c of cases) eq(`TS ${c.name}`, youtubeLimitIssues(c.m).map(i => i.field), c.want);
eq('tagsLength: commas + quotes', [tagsLength(['ab', 'c d']), tagsLength([])], [2 + 1 + 5, 0]);
eq('hashtagsIn distinct, case-insensitive, Arabic', hashtagsIn('#Shorts #shorts #لغز #1 a#b'), ['shorts', 'لغز']);
const msg = youtubeLimitIssues({ title: 'ok', description: ar5001 })[0];
eq('message names field, length, limit', [msg.field, msg.length, msg.limit, /5001 bytes/.test(msg.message) && /max 5000 bytes/.test(msg.message)], ['description', 5001, 5000, true]);

// Python twin on the same cases
const py = path.join(import.meta.dirname, 'platform_limits.py');
for (const c of cases) {
  const r = spawnSync('python', [py, 'check', '-'], { input: JSON.stringify(c.m), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  let got: any = r.stderr || r.error?.message;
  try { got = JSON.parse(r.stdout).map((i: any) => i.field); } catch {}
  eq(`PY ${c.name}`, got, c.want);
}

// publishedMeta = packaging_meta.py published_meta (title/description/hashtags as published)
const pm = publishedMeta({ chosen_title: 'Packaged', description: 'New desc', hashtags: ['#space', '#moon'] }, { title: 'Old', description: 'Old desc', attribution_block: 'Video: NASA', hashtags: ['#old'] }, 'clipping');
eq('publishedMeta packaging first + credits + hashtag line', [pm.title, pm.description, pm.tags], ['Packaged', 'New desc\n\nVideo: NASA\n\n#space #moon', ['space', 'moon']]);
const pk = publishedMeta({ chosen_title: 'P', description: 'KEEP script.json description unchanged', hashtags: [] }, { description: 'Old desc', hashtags: ['#old'] }, 'clipping');
eq('publishedMeta KEEP -> script description + script hashtags', pk.description, 'Old desc\n\n#old');
const pq = publishedMeta(null, { titles: { youtube: 'عنوان' }, description_ar: 'وصف' }, 'quiz-ar');
eq('publishedMeta quiz-ar fallback', [pq.title, pq.description], ['عنوان', 'وصف']);

if (fail) { console.error(`${fail} platform-limits test(s) failed`); process.exit(1); }
console.log('all platform-limits tests passed');
