/**
 * AI-generation text guard (owner 2026-10-28, widened 2026-11-08: "the description must never mention that it is created by
 * AI - in the full info, never mention"). ONE pattern list, config/ai-text-patterns.json, shared with the Python twin
 * scripts/ai_text.py (publish-plan.py, fb-plan.py, packaging_meta.py, comments-draft.py, the live audit). Fixtures:
 * config/ai-text-fixtures.json (scripts/test-ai-text.ts + `python scripts/ai_text.py test`).
 *
 * Only creation / disclosure phrasing is refused ("AI-generated", "made with AI", "AI voice", "synthetic voice", TTS,
 * voice clones, voice vendors in a voice/credit sense, «صوت مولّد», «تم إنشاؤه بالذكاء الاصطناعي» ...). A line that reads as a
 * TOPIC (question / explainer phrasing, a video ABOUT AI such as tech "Why AI Kept Drawing Six Fingers") and carries no SELF
 * marker (this video, narration, our, voiced by ...) is allowed. YouTube's altered/synthetic-content platform flag is not text
 * and is untouched by this module.
 */
import fs from 'node:fs';
import path from 'node:path';

interface Rule { id: string; re: RegExp; always: boolean; brandsExempt: string[] }
export interface AiHit { rule: string; phrase: string; line: string }
export interface AiFieldHit extends AiHit { key: string }

const CONFIG = path.resolve(import.meta.dirname, '..', '..', '..', 'config', 'ai-text-patterns.json');
let cache: { rules: Rule[]; topic: RegExp; self: RegExp } | null = null;
function load() {
  if (cache) return cache;
  const j = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  cache = {
    rules: (j.rules as any[]).map(r => ({ id: String(r.id), re: new RegExp(r.re, 'i'), always: !!r.always, brandsExempt: (r.brands_exempt ?? []).map(String) })),
    topic: new RegExp(j.topic, 'i'), self: new RegExp(j.self, 'i'),
  };
  return cache;
}

/** Every creation/disclosure hit in `text` (checked line by line). */
export function aiTextHits(text: unknown, opts: { brand?: string | null } = {}): AiHit[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  const { rules, topic, self } = load();
  const brand = String(opts.brand ?? '');
  const out: AiHit[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const topical = topic.test(line) && !self.test(line);
    for (const r of rules) {
      if (r.brandsExempt.includes(brand)) continue;
      if (topical && !r.always) continue;
      const m = r.re.exec(line);
      if (m) out.push({ rule: r.id, phrase: m[0], line: line.trim().slice(0, 160) });
    }
  }
  return out;
}
/** First hit's phrase, or null. */
export function aiTextHit(text: unknown, opts: { brand?: string | null } = {}): string | null {
  return aiTextHits(text, opts)[0]?.phrase ?? null;
}
/** Hits over named fields: [{key, text}] -> [{key, rule, phrase, line}]. Arrays/objects: pass flattened strings. */
export function aiTextFields(fields: { key: string; text: unknown }[], brand?: string | null): AiFieldHit[] {
  return fields.flatMap(f => aiTextHits(f.text, { brand }).map(h => ({ key: f.key, ...h })));
}
/** Every string in an object tree with its key path (for packaging.json / comments-draft.json / plan entries). */
export function stringsWithKeys(o: any, key = '', out: { key: string; text: string }[] = []) {
  if (typeof o === 'string') out.push({ key, text: o });
  else if (Array.isArray(o)) o.forEach((x, i) => stringsWithKeys(x, `${key}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) stringsWithKeys(v, key ? `${key}.${k}` : k, out);
  return out;
}
/** One-line refusal text for a list of hits. */
export const aiHitText = (hits: AiFieldHit[]) => hits.slice(0, 6).map(h => `${h.key}: "${h.phrase}"`).join('; ');
