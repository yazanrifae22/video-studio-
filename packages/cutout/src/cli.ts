/**
 * Karto cutout CLI (not part of the studio CLI). Docs: docs/brands/karto/build.md.
 *   npx tsx packages/cutout/src/cli.ts build <id> [--draft] [--resume] [--chapters c03,c07] [--workers N] [--reason "..."] [--page <dir>] [--keep-work]
 *   npx tsx packages/cutout/src/cli.ts preview <id> --chapter c03 | --from S --to S [--width 960] [--version N|draft]
 *   npx tsx packages/cutout/src/cli.ts snap <id> --times a,b | --lines l010,l020 [--width 640] [--layout wide|tall] [--version N|draft]
 *   npx tsx packages/cutout/src/cli.ts shorts <id> [--only s1,s3] [--draft] [--workers N]
 *   npx tsx packages/cutout/src/cli.ts sheets <id> [--version N] [--every 1] [--short s1]
 *   npx tsx packages/cutout/src/cli.ts make-film-json <slug> [--storyboard <file>] [--create]
 *   npx tsx packages/cutout/src/cli.ts new --brand karto-en|karto-ar --title "..." [--dry-run]
 *   npx tsx packages/cutout/src/cli.ts sfx-table            (rewrites packages/cutout/sfx.json)
 *   npx tsx packages/cutout/src/cli.ts brands               (adds the karto-en / karto-ar brand rows + docs/brands/karto/brand-<lang>.json when missing)
 */
import fs from 'node:fs';
import { buildFilm, previewFilm, snapFilm } from './build.ts';
import { buildSfxTable, SFX_JSON } from './audio.ts';

const argv = process.argv.slice(2);
const [cmd, id] = argv;
const has = (k: string) => argv.includes(`--${k}`);
const flag = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined; };
const list = (k: string) => (flag(k) ?? '').split(',').map(s => s.trim()).filter(Boolean);
const nums = (k: string) => list(k).map(Number).filter(Number.isFinite);
const num = (k: string) => (flag(k) != null ? Number(flag(k)) : undefined);
const out = (x: unknown) => console.log(JSON.stringify(x, null, 1));
const usage = 'usage: cli.ts build|preview|snap|shorts|sheets <id> ... | make-film-json <slug> | new --brand karto-en|karto-ar --title "..." | sfx-table   (docs/brands/karto/build.md)';

async function main() {
  if (cmd === 'sfx-table') { const t = buildSfxTable(); fs.writeFileSync(SFX_JSON, JSON.stringify(t, null, 1) + '\n', 'utf8'); return out({ file: SFX_JSON, sounds: Object.keys(t.sfx) }); }
  if (cmd === 'brands') { const { ensureBrands } = await import('./new.ts'); return out({ created: ensureBrands() }); }
  if (cmd === 'new') { const { newProduction } = await import('./new.ts'); return out(newProduction(flag('brand') ?? '', flag('title') ?? '', { dryRun: has('dry-run') })); }
  if (!id || id.startsWith('--')) throw new Error(usage);
  if (cmd === 'build') return out(await buildFilm(id, { draft: has('draft'), resume: has('resume'), chapters: list('chapters'), workers: num('workers'), reason: flag('reason') ?? null, page: flag('page'), agent: flag('agent'), keepWork: has('keep-work') }));
  if (cmd === 'preview') return out(await previewFilm(id, { chapter: flag('chapter'), from: num('from'), to: num('to'), width: num('width'), version: flag('version'), page: flag('page'), workers: num('workers'), agent: flag('agent') }));
  if (cmd === 'snap') return out(await snapFilm(id, { times: nums('times'), lines: list('lines'), width: num('width'), layout: flag('layout') === 'tall' ? 'tall' : 'wide', version: flag('version'), page: flag('page'), agent: flag('agent') }));
  if (cmd === 'shorts') { const { buildShorts } = await import('./shorts.ts'); return out(await buildShorts(id, { only: list('only'), draft: has('draft'), version: flag('version'), page: flag('page'), workers: num('workers'), agent: flag('agent'), keepWork: has('keep-work') })); }
  if (cmd === 'sheets') { const { makeSheets } = await import('./sheets.ts'); return out(await makeSheets(id, { version: flag('version'), every: num('every'), short: flag('short') })); }
  if (cmd === 'make-film-json') { const { makeFilmJson } = await import('./make-film-json.ts'); return out(makeFilmJson(id, { storyboard: flag('storyboard'), create: has('create') })); }
  throw new Error(usage);
}
main().then(() => process.exit(0), e => { console.error(`[cutout] ERROR: ${e?.stack ?? e?.message ?? e}`); process.exit(1); });
