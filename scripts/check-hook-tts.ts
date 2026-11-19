// Cache-level check of the standalone hook TTS (no TTS request, no build): for each production, is the main take the
// build will request (hook lines excluded) already in the TTS cache, and is the standalone hook line cached?
//   npx tsx scripts/check-hook-tts.ts <productionId> [...]
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../packages/shared/src/paths.ts';
import { loadSpec } from '../packages/quiz/src/spec.ts';
import { standaloneHookLines, takeLines, takeStyle, takeText, ttsKey } from '../packages/quiz/src/narration.ts';

for (const id of process.argv.slice(2)) {
  const { spec, script } = loadSpec(id);
  const style = takeStyle(spec, script), hk = standaloneHookLines(spec), o = spec.narration.take_text;
  const k = (only?: string[]) => ttsKey(takeText(takeLines(script, { textOverride: o, ...(only ? { only } : { exclude: hk }) })), spec.narration.voice, style);
  const has = (key: string) => fs.existsSync(path.join(P.cache, 'tts', `${key}.wav`));
  const main = k(), hook = hk.length ? k(hk) : null;
  console.log(JSON.stringify({ id, hook_lines: hk, main_take: { key: main, cached: has(main) }, hook_take: hook && { key: hook, cached: has(hook) } }));
}
