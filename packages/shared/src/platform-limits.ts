/**
 * Platform metadata limits (owner 2026-11-08: "max description is 5000 characters"). Limits live in config/platform-limits.json,
 * shared with the Python twin scripts/platform_limits.py (packaging_meta.py, publish-plan.py, validate-review.py).
 * YouTube Data API: title <= 100 characters, description <= 5000 BYTES (UTF-8), no < or > in title/description/tags, tags <= 500
 * characters (commas between tags count, a tag with a space counts its 2 quote marks), <= 15 hashtags in title + description
 * (over 15 -> YouTube ignores all). Callers REFUSE with the precise message (field, length, limit); nothing is truncated here.
 * Used by prelint (packaging.json + script.json fallback + publish-plan entry) and the scripts/youtube.ts upload payload.
 * Tests: scripts/test-platform-limits.ts (also runs the Python twin on the same cases).
 */
import fs from 'node:fs';
import path from 'node:path';

const CONFIG = path.resolve(import.meta.dirname, '..', '..', '..', 'config', 'platform-limits.json');
export interface YoutubeLimits { title_max_chars: number; description_max_bytes: number; tags_max_chars: number; hashtags_max: number; forbidden_chars: string }
const DEFAULTS: YoutubeLimits = { title_max_chars: 100, description_max_bytes: 5000, tags_max_chars: 500, hashtags_max: 15, forbidden_chars: '<>' };
export function youtubeLimits(): YoutubeLimits {
  try { const j = JSON.parse(fs.readFileSync(CONFIG, 'utf8').replace(/^﻿/, '')).youtube ?? {}; return { ...DEFAULTS, ...Object.fromEntries(Object.entries(j).filter(([k]) => k in DEFAULTS)) } as YoutubeLimits; }
  catch { return DEFAULTS; }
}

export interface LimitIssue { field: string; length: number; limit: number; unit: 'chars' | 'bytes' | 'hashtags' | 'char'; message: string }

export const utf8Bytes = (s: string) => Buffer.byteLength(s ?? '', 'utf8');
/** Characters as YouTube (and Python len) count them: code points, not UTF-16 units. */
export const charLen = (s: string) => [...(s ?? '')].length;
/** YouTube tags length: sum of tag lengths + 2 quotes for a tag with a space + the commas between tags. */
export function tagsLength(tags: string[]): number {
  const t = (tags ?? []).map(String).filter(x => x.length);
  return t.reduce((n, x) => n + charLen(x) + (/\s/.test(x) ? 2 : 0), 0) + Math.max(0, t.length - 1);
}
/** Distinct hashtags (lower-case) in a text: # + letters/digits/_ with at least one letter, not inside a word or URL. */
export function hashtagsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text ?? '').matchAll(/(?<![\p{L}\p{N}_&/#])#([\p{L}\p{M}\p{N}_]+)/gu)) if (/\p{L}/u.test(m[1])) out.add(m[1].toLowerCase());
  return [...out];
}

/** Every YouTube limit the payload breaks (empty = ok). Title/description are the exact strings that would be sent. */
export function youtubeLimitIssues(m: { title?: string | null; description?: string | null; tags?: string[] | null }, L: YoutubeLimits = youtubeLimits()): LimitIssue[] {
  const out: LimitIssue[] = [];
  const title = String(m.title ?? ''), desc = String(m.description ?? ''), tags = (m.tags ?? []).map(String);
  const tl = charLen(title);
  if (!title.trim()) out.push({ field: 'title', length: 0, limit: L.title_max_chars, unit: 'chars', message: 'title is empty (YouTube requires a title)' });
  if (tl > L.title_max_chars) out.push({ field: 'title', length: tl, limit: L.title_max_chars, unit: 'chars', message: `title is ${tl} characters (YouTube max ${L.title_max_chars}): shorten it by ${tl - L.title_max_chars}` });
  const db = utf8Bytes(desc);
  if (db > L.description_max_bytes) out.push({ field: 'description', length: db, limit: L.description_max_bytes, unit: 'bytes', message: `description is ${db} bytes UTF-8 (${charLen(desc)} characters; YouTube max ${L.description_max_bytes} bytes, Arabic ~2 bytes per letter): cut ${db - L.description_max_bytes} bytes` });
  for (const [field, s] of [['title', title], ['description', desc], ...tags.map((t, i) => [`tags[${i}]`, t])] as [string, string][]) {
    const bad = [...new Set([...s].filter(c => L.forbidden_chars.includes(c)))];
    if (bad.length) out.push({ field, length: [...s].filter(c => L.forbidden_chars.includes(c)).length, limit: 0, unit: 'char', message: `${field} contains ${bad.map(c => `"${c}"`).join(' and ')} (YouTube rejects < and > in titles/descriptions/tags): remove or reword` });
  }
  const tg = tagsLength(tags);
  if (tg > L.tags_max_chars) out.push({ field: 'tags', length: tg, limit: L.tags_max_chars, unit: 'chars', message: `tags total ${tg} characters (YouTube max ${L.tags_max_chars}, commas + quotes around tags with spaces count): drop tags` });
  const hs = hashtagsIn(`${title}\n${desc}`);
  if (hs.length > L.hashtags_max) out.push({ field: 'hashtags', length: hs.length, limit: L.hashtags_max, unit: 'hashtags', message: `${hs.length} hashtags in title + description (YouTube max ${L.hashtags_max}; over ${L.hashtags_max} it ignores ALL): keep the best ${L.hashtags_max}` });
  return out;
}
/** One-line refusal text. */
export const limitText = (issues: LimitIssue[]) => issues.map(i => i.message).join('; ');

const KEEP = /^\s*(keep|same as|unchanged|use script)\b/i;
const tagList = (v: any): string[] => (typeof v === 'string' ? v.split(/\s+/) : Array.isArray(v) ? v : []).map((t: any) => String(t).trim()).filter(Boolean);
/**
 * TS twin of scripts/packaging_meta.py published_meta (title, description, hashtags as publish-plan.py will send them):
 * packaging.json first, script.json fallback field by field; credits (attribution_block) and the hashtag line appended once.
 */
export function publishedMeta(pk: any, s: any, brand: string, dbtitle = ''): { title: string; description: string; hashtags: string[]; tags: string[] } {
  pk = pk ?? {}; s = s ?? {};
  const ptitle = String(pk.chosen_title ?? '').trim();
  let pdesc = typeof pk.description === 'string' ? pk.description : '';
  pdesc = !pdesc.trim() || KEEP.test(pdesc) ? '' : pdesc.trim();
  const ptags = tagList(pk.hashtags);
  let title: string, desc: string, tags: string[];
  if (brand === 'quiz-ar') { title = ptitle || s.titles?.youtube || dbtitle; desc = pdesc || s.description_ar || ''; tags = ptags; }
  else {
    title = ptitle || s.title || dbtitle; desc = pdesc || s.description || '';
    let att = s.attribution_block; if (Array.isArray(att)) att = att.join('\n');
    if (att && !desc.includes(String(att).slice(0, 60))) desc += '\n\n' + att;
    tags = ptags.length ? ptags : tagList(s.hashtags);
  }
  const line = tags.join(' ');
  if (line && !desc.includes(line)) desc += '\n\n' + line;
  return { title: title ?? '', description: desc, hashtags: tags, tags: tags.map(t => t.replace(/^#+/, '')) };
}
