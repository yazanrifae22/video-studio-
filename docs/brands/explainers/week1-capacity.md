# Week-1 capacity, cost and rollout (2026-10-20)

Target from the brief: 2 videos per day per channel → **42 videos in 7 days**. These are the numbers measured today, not estimates from documentation.

## Measured unit costs
| Stage | Measured | Per 35 s Short | Per 6 min long-form |
|---|---|---|---|
| TTS (Gemini 3.8 Flash / Lite) | ~26 audio tokens per second of speech, 4–9 s latency | 1 request, ~900 tokens | 1–2 requests, ~9.5k tokens |
| Alignment (faster-whisper small.en, CUDA) | ~7–10 s | ~10 s | ~60 s |
| Render (HyperFrames, 1080×1920, local GPU) | ~4.1 s of render per second of video + ~17 s setup (31 s video → 119 s) | **~2.5 min** | **~25 min** |
| Mix + mux + QA | ~10–20 s | ~20 s | ~60 s |
| Creative authoring (director/writer/motion agent) | ~90–130k Claude tokens per spec (pilots) | ~100k tokens | ~250k tokens (est.) |
| Independent review (agent) | ~100k tokens, ~5 min | ~100k tokens | ~150k tokens (est.) |
| Revision loop | Pilot 1 needed 2 engine passes + 1 spec revision to approach the bar | +50–100k tokens | |

## Weekly totals for 42 videos (36 Shorts + 6 long)
- **Render time:** 36 × 2.5 min + 6 × 25 min ≈ **4 h of machine time.** Fine; the single-GPU queue runs one render at a time, overnight if needed.
- **TTS requests:** ~42–60 (with narration revisions). **The free tier is the hard limit:** 10 requests/day per model. With the 3 TTS models (each has its own quota) that's ≤ 30/day *if* lower-tier voices are acceptable. **Paid tier** for the same week: about 60 requests × ~2k tokens × $9/1M ≈ **$1–2 for the whole week** (doubles after 1 Jan 2027). → Owner decision: enable billing on the Gemini project (recommended; tiny cost, removes the bottleneck and keeps every video on the best voice model).
- **Claude agent tokens:** 42 × (~100k authoring + ~100k review + ~60k revision) ≈ **~11M tokens/week.** This is the real cost and throughput constraint, not rendering.
- **Owner approvals:** 42 approve/revise decisions in the studio, about 2–3 min each.

## Quality reality
Today's pilots: tech v2 scored **69/100** from the independent reviewer. The engine issues it found are fixed, and v3 is in production. The 85 bar has **not yet been reached by any video.** Publishing 42 videos before the format clears 85 would mean shipping weak content, which the brief rules out.

## Recommended achievable rollout
| Days | Per channel per day | Total | Gate |
|---|---|---|---|
| Oct 21–22 | 1 Short (the pilots, then one more) | 6 | Each channel needs one ≥ 85 video before scaling |
| Oct 23–25 | 1 Short + long-form on the planned days | ~12 | ≤ 1 revision per video on average |
| Oct 26–27 | 2/day (core + stretch) if the gate holds | ~12 | TTS billing enabled, review pass rate ≥ 70% |
| **Week 1** | | **~27–30 (core plan)**, up to 42 if gates pass early | |

The calendar (`npm run -s cli -- plan:week`, Schedule page) marks **core** slots (1 Short/day + 2 long/week per channel = 27) and **stretch** slots (15). Time-sensitive items are pinned before their deadlines: the Ballon d'Or explainer before Oct 26, and the Halloween kids episodes before Oct 31.

## Hard blockers before anything goes live
1. YouTube channels must be created by the owner, plus a Google Cloud OAuth client (Desktop) saved to `config/youtube-oauth-client.json` and `youtube:auth <channel>` run per channel.
2. Gemini billing decision (above).
3. Remotion is not used, so no licence question remains for rendering.
4. Celebrity channel: legal review of the rights policy recommended before monetisation (research recommendation).
