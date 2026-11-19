import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { geminiKeys, policy, redact } from '../../shared/src/secrets.ts';
import { QuotaExhaustedError } from '../../orchestrator/src/queue.ts';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Models in preference order. Each has its own free daily quota on the same Google project.
 * Verified by the old explainer studio 2026-10-20 (live calls + ASR check); gemini-2.5-pro-preview-tts has no free tier.
 * Since the 2026-11-02 merge that studio is gone; these keys serve only this studio.
 */
export const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview', 'gemini-3.8-flash-lite-tts'] as const;

function cooldownUntil(model: string, keyIndex: number): Date | null {
  const row = db().prepare(`SELECT note FROM api_usage WHERE provider='gemini' AND model=? AND key_index=? AND http_status IN (429, 403) ORDER BY id DESC LIMIT 1`).get(model, keyIndex) as any;
  if (!row?.note) return null;
  const d = new Date(row.note);
  return d > new Date() ? d : null;
}

function logUsage(model: string, keyIndex: number, status: number, ms: number, units = 0, note: string | null = null) {
  // Shadow cost at paid list price ($9 / 1M audio tokens for flash TTS); we stay on the free tier.
  db().prepare(`INSERT INTO api_usage(provider, model, key_index, ok, http_status, units, cost_usd, latency_ms, note) VALUES ('gemini',?,?,?,?,?,?,?,?)`)
    .run(model, keyIndex, status === 200 ? 1 : 0, status, units, units * 9 / 1e6, ms, note);
}

function parseRetry(msg: string): number {
  const m = /retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i.exec(msg);
  return m ? ((+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + parseFloat(m[3])) * 1000 : 60_000;
}

/** Wraps raw 24 kHz s16le mono PCM in a WAV header (TTS returns headerless PCM). */
function ensureWav(buf: Buffer): Buffer {
  if (buf.subarray(0, 4).toString() === 'RIFF') return buf;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + buf.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24);
  h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(buf.length, 40);
  return Buffer.concat([h, buf]);
}

/** Style goes in a DIRECTOR'S NOTES block (free-text style instructions get spoken aloud otherwise — sibling finding). */
const buildPrompt = (text: string, style?: string) => style ? `# AUDIO PROFILE: Narrator\n## DIRECTOR'S NOTES\n${style}\n## TRANSCRIPT\n${text}` : text;

export function ttsToday() {
  return (db().prepare(`SELECT COUNT(*) n FROM api_usage WHERE provider='gemini' AND ok=1 AND date(ts)=date('now')`).get() as any).n as number;
}

/**
 * Synthesize (or return the cached) narration. Cache key = text + voice + style, so re-builds cost no quota.
 * Honours our self-imposed daily budget (policy.ttsDailyBudget) because the quota is shared with the sibling studio.
 */
export async function synthesize(text: string, voice: string, style: string | undefined, ctx: { productionId?: string; /** throw on a cache miss (scratch builds: never spend TTS quota) */ cacheOnly?: boolean; /** salt in the cache key = a fresh TTS sample of the same text (re-roll); omitted = key unchanged */ retake?: string | number } = {}) {
  const key = crypto.createHash('sha256').update(JSON.stringify({ text, voice, style, ...(ctx.retake != null && ctx.retake !== '' ? { retake: String(ctx.retake) } : {}) })).digest('hex').slice(0, 24);
  return request(key, buildPrompt(text, style), { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }, voice, ctx);
}

/** One speaker of a dialogue take: `name` is the transcript label ("Karto"), `voice` a Gemini prebuilt voice, `style` an optional director's note. */
export interface DialogueSpeaker { name: string; voice: string; style?: string }
/** Thrown when every TTS model tried rejects the multi-speaker request (HTTP 400): callers fall back to one take per speaker turn. */
export class DialogueUnsupportedError extends Error {}

/**
 * Multi-speaker take (Gemini `multiSpeakerVoiceConfig`, exactly 2 speakers): `turns` become transcript lines `Name: text`, the
 * speakers' styles go into one DIRECTOR'S NOTES block. Same cache dir, key failover, budget and usage logging as `synthesize`; the
 * cache key includes the speakers (name + voice + style) and the turns. An HTTP 400 on a model (no multi-speaker support there)
 * moves on to the next model; 400 on every model tried = DialogueUnsupportedError.
 */
export async function synthesizeDialogue(turns: { speaker: string; text: string }[], speakers: DialogueSpeaker[], ctx: { productionId?: string; cacheOnly?: boolean; retake?: string | number } = {}) {
  if (speakers.length !== 2) throw new Error(`synthesizeDialogue needs exactly 2 speakers (got ${speakers.length})`);
  for (const t of turns) if (!speakers.some(s => s.name === t.speaker)) throw new Error(`synthesizeDialogue: turn speaker "${t.speaker}" is not one of ${speakers.map(s => s.name).join(', ')}`);
  const key = crypto.createHash('sha256').update(JSON.stringify({ dialogue: 1, turns, speakers: speakers.map(s => ({ name: s.name, voice: s.voice, style: s.style ?? null })), ...(ctx.retake != null && ctx.retake !== '' ? { retake: String(ctx.retake) } : {}) })).digest('hex').slice(0, 24);
  const notes = speakers.filter(s => s.style).map(s => `${s.name}: ${s.style}`).join('\n');
  const transcript = turns.map(t => `${t.speaker}: ${t.text}`).join('\n');
  const prompt = `# AUDIO PROFILE: ${speakers.map(s => s.name).join(' and ')}\n${notes ? `## DIRECTOR'S NOTES\n${notes}\n` : ''}## TRANSCRIPT\n${transcript}`;
  const speechConfig = { multiSpeakerVoiceConfig: { speakerVoiceConfigs: speakers.map(s => ({ speaker: s.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } } })) } };
  return request(key, prompt, speechConfig, speakers.map(s => `${s.name}=${s.voice}`).join('+'), ctx, true);
}

async function request(key: string, prompt: string, speechConfig: unknown, label: string, ctx: { productionId?: string; cacheOnly?: boolean }, dialogue = false) {
  const file = path.join(P.cache, 'tts', `${key}.wav`);
  if (fs.existsSync(file)) return { file, cached: true, model: null as string | null };
  if (ctx.cacheOnly) throw new Error(`TTS cache miss (${key}) in a cache-only build: narration text/voice/style differ from the cached take`);
  const budget = policy().ttsDailyBudget;
  if (budget != null && ttsToday() >= budget) {
    const tomorrow = new Date(); tomorrow.setUTCHours(24, 5, 0, 0);
    throw new QuotaExhaustedError(`studio TTS budget (${budget}/day)`, tomorrow);
  }
  const keys = geminiKeys();
  if (!keys.length) throw new Error('No Gemini keys configured (secrets/gemini-keys.txt)');
  const keyIdx = policy().geminiMultiKeyFailover ? keys.map((_, i) => i) : [0];
  let earliest = null as Date | null;
  const rejected: string[] = [];
  for (const model of TTS_MODELS) {
    let modelRejects = false;
    for (const ki of keyIdx) {
      if (modelRejects) break;
      const cd = cooldownUntil(model, ki);
      if (cd) { earliest = !earliest || cd < earliest ? cd : earliest; continue; }
      for (let attempt = 0; attempt < 4; attempt++) {
        const t0 = Date.now();
        let res: Response;
        try {
          res = await fetch(`${BASE}/models/${model}:generateContent`, {
            method: 'POST', signal: AbortSignal.timeout(180_000),
            headers: { 'x-goog-api-key': keys[ki], 'content-type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ['AUDIO'], speechConfig } }),
          });
        } catch {
          logUsage(model, ki, 0, Date.now() - t0, 0, 'network');
          await new Promise(s => setTimeout(s, 2 ** attempt * 2000));
          continue;
        }
        const body: any = await res.json().catch(() => ({}));
        const ms = Date.now() - t0;
        if (res.ok) {
          const part = body.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
          if (!part) { logUsage(model, ki, 200, ms, 0, 'no-audio'); throw new Error(`TTS returned no audio (${body.candidates?.[0]?.finishReason})`); }
          const units = body.usageMetadata?.candidatesTokenCount ?? 0;
          logUsage(model, ki, 200, ms, units, dialogue ? 'dialogue' : null);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, ensureWav(Buffer.from(part.inlineData.data, 'base64')));
          emit({ kind: 'api.tts', agent: 'worker', productionId: ctx.productionId, message: `Narration generated · ${model} · ${label} · ${(ms / 1000).toFixed(1)}s`, data: { model, units } });
          return { file, cached: false, model };
        }
        const msg = redact(body.error?.message ?? res.statusText);
        if (res.status === 429) {
          const wait = parseRetry(msg);
          if (/free_tier_requests|per day|PerDay/i.test(msg) || wait > 120_000) {
            const until = new Date(Date.now() + wait);
            logUsage(model, ki, 429, ms, 0, until.toISOString());
            emit({ kind: 'api.quota', agent: 'worker', productionId: ctx.productionId, level: 'warn', message: `${model} daily quota used up until ${until.toLocaleString()}` });
            earliest = !earliest || until < earliest ? until : earliest;
            break;
          }
          logUsage(model, ki, 429, ms);
          await new Promise(s => setTimeout(s, Math.min(wait, 2 ** attempt * 5000)));
          continue;
        }
        if (res.status === 403 && keyIdx.length > 1) {
          // A key whose project is denied access: bench it for 24 h and try the next key (owner decision 2026-10-22).
          const until = new Date(Date.now() + 24 * 3600_000);
          logUsage(model, ki, 403, ms, 0, until.toISOString());
          emit({ kind: 'api.quota', agent: 'worker', productionId: ctx.productionId, level: 'warn', message: `${model} key #${ki} denied (403) — skipped until ${until.toLocaleString()}` });
          earliest = !earliest || until < earliest ? until : earliest;
          break;
        }
        logUsage(model, ki, res.status, ms, 0, msg.slice(0, 200));
        if (res.status >= 500) { await new Promise(s => setTimeout(s, 2 ** attempt * 3000)); continue; }
        // dialogue: a model without multi-speaker support answers 400 -> try the next model (not the next key)
        if (dialogue && res.status === 400) { rejected.push(`${model}: ${msg.slice(0, 160)}`); modelRejects = true; break; }
        throw new Error(`TTS ${model} HTTP ${res.status}: ${msg.slice(0, 300)}`);
      }
    }
  }
  if (dialogue && rejected.length && !earliest) throw new DialogueUnsupportedError(`multi-speaker TTS rejected by every model tried: ${rejected.join(' | ')}`);
  throw new QuotaExhaustedError(TTS_MODELS.join(','), earliest ?? new Date(Date.now() + 3600_000));
}
