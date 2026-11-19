import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { HookVariant } from './types.ts';

/**
 * hook_intro variant registry. Every `<name>.ts` in this folder (except index.ts, types.ts and files starting with `_`)
 * is loaded at startup and registered under its `name` and `aliases`. Adding a variant = adding one file here; no shared
 * file changes (parallel-safe: four showrunners can each add their own on the same day).
 */
const DIR = path.dirname(fileURLToPath(import.meta.url));
// synchronous load (Node >= 22 require(esm) + tsx): no top-level await, so CJS-mode consumers can import the registry too
const req = createRequire(import.meta.url);
export const VARIANTS: Record<string, HookVariant> = {};
const files = fs.readdirSync(DIR).filter(f => /^[a-z0-9][a-z0-9_]*\.ts$/.test(f) && !['index.ts', 'types.ts'].includes(f)).sort();
for (const f of files) {
  const mod = req(path.join(DIR, f));
  const v: HookVariant | undefined = mod.default;
  if (!v?.name || typeof v.render !== 'function' || typeof v.sfx !== 'function') throw new Error(`hooks/${f}: default export must be defineHook({ name, beats, tint, sfx, render })`);
  if (v.name !== f.replace(/\.ts$/, '')) throw new Error(`hooks/${f}: name "${v.name}" must equal the file name`);
  for (const k of [v.name, ...(v.aliases ?? [])]) {
    if (VARIANTS[k]) throw new Error(`hooks/${f}: variant name "${k}" already used by hooks/${VARIANTS[k].name}.ts`);
    VARIANTS[k] = v;
  }
}

export function variantOf(name: string | undefined): HookVariant {
  const v = name ? VARIANTS[name] : undefined;
  if (!v) throw new Error(`hook_intro: unknown variant "${name}" (known: ${[...new Set(Object.values(VARIANTS).map(x => x.name))].join(' | ')})`);
  return v;
}
