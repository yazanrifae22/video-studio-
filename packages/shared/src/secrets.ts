import fs from 'node:fs';
import path from 'node:path';
import { P } from './paths.ts';

/**
 * Centralised credential service. Keys come from secrets/ (git-ignored) or env vars,
 * are never logged and never sent to the browser. Anything that might be printed goes through redact().
 */

const known = new Set<string>();

function readLines(file: string) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}

function remember<T extends string | null>(v: T): T {
  if (v && v.length > 8) known.add(v);
  return v;
}

export function geminiKeys(): string[] {
  const fromEnv = (process.env.GEMINI_API_KEYS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const keys = fromEnv.length ? fromEnv : readLines(path.join(P.secrets, 'gemini-keys.txt'));
  keys.forEach(remember);
  return keys;
}

/**
 * Named single-value secrets: env var first, then secrets/<name>.txt.
 * e.g. secret('PEXELS_API_KEY') reads $PEXELS_API_KEY or secrets/PEXELS_API_KEY.txt.
 */
export function secret(name: string): string | null {
  const env = process.env[name]?.trim();
  if (env) return remember(env);
  const [first] = readLines(path.join(P.secrets, `${name}.txt`));
  return remember(first ?? null);
}

/** Which named secrets exist, without revealing values (for the dashboard / audit). */
export function secretPresence(names: string[]): Record<string, boolean> {
  return Object.fromEntries(names.map(n => [n, !!secret(n)]));
}

export function redact(s: string): string {
  if (!s) return s;
  let out = s;
  for (const k of known) out = out.split(k).join(`${k.slice(0, 4)}…[redacted]`);
  return out
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, 'AIza…[redacted]')
    .replace(/\bAQ\.[0-9A-Za-z_-]{20,}/g, 'AQ.…[redacted]')
    .replace(/ya29\.[0-9A-Za-z_.-]{20,}/g, 'ya29.…[redacted]')
    .replace(/(Bearer\s+)[0-9A-Za-z._-]{16,}/gi, '$1…[redacted]');
}

export interface Policy {
  /** Use additional keys only when each belongs to an independently-quota'd project. Off: our keys share one project. */
  geminiMultiKeyFailover: boolean;
  /** Daily TTS request budget we impose on ourselves (the sibling studio shares the same quota). */
  ttsDailyBudget: number | null;
  allowPaidApis: boolean;
  /** Publishing always needs a human approval until the owner flips this per brand. */
  unattendedPublishing: Record<string, boolean>;
  /** YouTube CC-BY downloads via yt-dlp: license permits reuse, but YouTube ToS restricts third-party downloading. */
  allowYoutubeCcDownload: boolean;
  /** Per-brand QA score bar that may replace the 'pass' verdict for approval (no blockers required). Owner decision only. */
  approvalMinQa?: Record<string, number>;
}

export function policy(): Policy {
  const f = path.join(P.config, 'policy.json');
  const def: Policy = { geminiMultiKeyFailover: false, ttsDailyBudget: 4, allowPaidApis: false, unattendedPublishing: {}, allowYoutubeCcDownload: false };
  if (!fs.existsSync(f)) return def;
  return { ...def, ...JSON.parse(fs.readFileSync(f, 'utf8')) };
}
