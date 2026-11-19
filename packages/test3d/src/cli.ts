/**
 * test-3d CLI (not part of the studio CLI):
 *   npx tsx packages/test3d/src/cli.ts build <id> [--draft] [--no-3d] [--sub N] [--snap t1,t2,...] [--reason "..."] [--agent A]
 *                                                [--chapters c03,c07] [--resume]          (long-form only)
 *   npx tsx packages/test3d/src/cli.ts snap <id> --times a,b,c [--version N|draft] [--width 540] [--sub N] [--chapter c03]
 *   npx tsx packages/test3d/src/cli.ts preview <id> (--from S --to S | --chapter c03) [--version N|draft] [--sub 4] [--width 960]   (long-form)
 * Docs: docs/brands/test-3d/build.md.
 */
import { buildTest3d, loadFilm, snapTest3d } from './build.ts';

const argv = process.argv.slice(2);
const [cmd, id] = argv;
const has = (k: string) => argv.includes(`--${k}`);
const flag = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined; };
const nums = (s?: string) => (s ?? '').split(',').map(x => x.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
const num = (k: string) => (flag(k) != null ? Number(flag(k)) : undefined);
const usage = 'usage: cli.ts build <id> [--draft] [--no-3d] [--sub N] [--snap t1,t2] [--reason "..."] [--chapters c03,c07] [--resume] | snap <id> --times a,b,c [--version N|draft] [--width 540] [--chapter c03] | preview <id> (--from S --to S | --chapter c03) [--version N|draft] [--sub 4] [--width 960]';

async function main() {
  if (!id || id.startsWith('--')) throw new Error(usage);
  if (cmd === 'build') {
    const chapters = (flag('chapters') ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const r = await buildTest3d(id, { draft: has('draft'), no3d: has('no-3d'), ...(has('voice-only') ? { voiceOnly: true } as any : {}), sub: num('sub'), snap: nums(flag('snap')), reason: flag('reason') ?? null, agent: flag('agent'), ...(chapters.length ? { chapters } : {}), ...(has('resume') ? { resume: true } : {}) });
    console.log(JSON.stringify(r, (k, v) => (k === 'log' ? undefined : v), 1));
  } else if (cmd === 'snap') {
    const files = await snapTest3d(id, nums(flag('times')), { version: flag('version'), width: num('width'), sub: num('sub'), agent: flag('agent'), chapter: flag('chapter') });
    console.log(JSON.stringify(files, null, 1));
  } else if (cmd === 'preview') {
    const { film, dir } = loadFilm(id);
    if (!film.long) throw new Error('preview is for long-form films ("long": true); use snap for Shorts');
    const { previewLong } = await import('./long.ts');
    console.log(JSON.stringify(await previewLong(id, film, dir, { from: num('from'), to: num('to'), chapter: flag('chapter'), version: flag('version'), sub: num('sub'), width: num('width'), agent: flag('agent') }), null, 1));
  } else throw new Error(usage);
}
main().then(() => process.exit(0), e => { console.error(`[test3d] ERROR: ${e?.message ?? e}`); process.exit(1); });
