/* v1.4 dev fixture: animals-fixture-episode.json -> validateEpisode -> buildShow (silent, estimated timings) -> animals-fixture-show.json
 *   npx tsx packages/quizlong/template/dev/make-animal-fixture.ts
 * The show goes through the real builder code (packages/quizlong/src/show.ts), so the template sees exactly what quizlong:build emits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEpisode, type Episode } from '../../src/episode.ts';
import { buildShow } from '../../src/show.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ep = JSON.parse(fs.readFileSync(path.join(HERE, 'animals-fixture-episode.json'), 'utf8')) as Episode;
const v = validateEpisode(ep);
if (v.errors.length) { console.error('errors:\n' + v.errors.join('\n')); process.exit(1); }
const b = buildShow(ep, {}, { estimate: true });
fs.writeFileSync(path.join(HERE, 'animals-fixture-show.json'), JSON.stringify(b.show, null, 1), 'utf8');
console.log(JSON.stringify({ ok: true, duration: b.total, segments: b.show.segments.length, theme: b.show.theme, warnings: [...v.warnings, ...b.warnings] }, null, 1));
