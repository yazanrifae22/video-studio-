import fs from 'node:fs';
import { validateEpisode, type Episode } from '../../src/episode.ts';
import { buildShow } from '../../src/show.ts';
// npx tsx make-silent-show.ts <episode.json> <show.json> [q01,q04,...]  (ids to print frame times for; default: a fixed sample, missing ids skipped)
const [epFile, outFile, idList] = process.argv.slice(2);
const ep = JSON.parse(fs.readFileSync(epFile, 'utf8')) as Episode;
const v = validateEpisode(ep);
const b = buildShow(ep, {}, { estimate: true });
fs.writeFileSync(outFile, JSON.stringify(b.show), 'utf8');
const S = (id: string) => b.show.segments.find((s: any) => s.id === id) as any;
const t: Record<string, number> = {};
for (const id of idList ? idList.split(',') : ['q01', 'q06', 'q12', 'q21', 'q37', 'q40', 'q31', 'q11']) { const s = S(id); if (!s?.t) continue; t[id + '.start'] = +(s.t.timer_start + 0.3).toFixed(2); t[id + '.mid'] = +((s.t.timer_start + s.t.timer_end) / 2).toFixed(2); t[id + '.rv'] = +(s.t.reveal + 1.2).toFixed(2); }
const cards = b.show.segments.filter((s: any) => s.type !== 'question').map((s: any) => [s.type, s.level ?? '', +(s.start + 2).toFixed(2)]);
console.log(JSON.stringify({ errors: v.errors, warnings: v.warnings, total: b.total, t, cards }));
