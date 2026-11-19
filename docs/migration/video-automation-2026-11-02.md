# Migration: old explainer studio (`Desktop/video automation`) → Clips Viral Studio

Date: 2026-11-02 · Owner request: one studio; the old folder gets deleted after review. Nothing was deleted or written in the old folder
(read-only, plus a `git bundle` read of its repo). No commits, no uploads, read-only API calls only.

## 1. Inventory of the old project
| Area | What it was | Size |
|---|---|---|
| Purpose | Animated YouTube explainer studio, built 2026-10-20: spec-driven HyperFrames 0.8.181 engine, Gemini TTS, faster-whisper alignment, procedural SFX/music, QA + independent review, YouTube Data API scheduler. Studio UI (React) + Fastify API on :4310, worker queue. | — |
| Channels | tech "Tech Made Simple", celebrity "Moments That Made Them" (ex "The Moment"), kids "Tiko & Pip" (Made for Kids) | — |
| Output | 212 videos; 161 on YouTube (published or scheduled through Nov 20); 51 celebrity approved but never uploaded (daily upload cap) | — |
| git | branch master, 2 commits (7238055, 0389a13) + ~197 uncommitted changes | — |
| `productions/` | 212 folders: spec, audio, images, v<N> renders, QA frames | 32 GB |
| `research/` | tools, channels/market, trends, analytics, reference, bakeoff (HyperFrames vs Remotion) | 739 MB (736 MB bakeoff media) |
| `exports/` | manual-upload kits (tech mp4 + metadata), regenerable | 353 MB |
| `assets/` | fonts, original procedural sfx/music, gsap vendor, provenance.json | 33 MB |
| `memory/` | decisions, production, channels, 10 agent notes | 282 KB |
| `docs/` | STATUS, review rubric, spec authoring, run240 protocol/review, YouTube setup/connect, privacy page | 80 KB |
| `channels/` | per-channel bible + brand art (avatar, banner, watermark, channel kit) | 1.4 MB |
| code | packages (shared, orchestrator, audio-engine, caption-engine, video-engine, review-engine, youtube), apps (api, studio), scripts | ~1.5 MB |
| `.claude/` | 11 agents (directors, scriptwriter, motion, voice, engineer, quality/engagement reviewers, growth, trend); no skills; no settings | 49 KB |
| `data/` | studio.db (22 MB: channels, ideas 407, videos 212, slots, metrics 11.6k, lessons 54), tokens/{tech,celebrity,kids}.json, logs | 23 MB |
| secrets | `secrets/gemini-keys.txt` (21 keys), `config/youtube-oauth-client.json` | — |
| venv | `.venv-align` (Python 3.12, faster-whisper) | — |
| Claude memory | `~/.claude/projects/C--Users-yazan-alrifae-Desktop-video-automation/memory/` (MEMORY.md + 3 files) | 22 KB |

## 2. Channels and APIs
| Brand id | Channel | Handle | Channel ID | Studio state |
|---|---|---|---|---|
| tech | Tech Made Simple | @TechMadeSimpleAnimated | UCp8RqP31XtjU8snoTMrUKrA | `paused` |
| celebrity | Moments That Made Them | @MomentsThatMadeThemTV | UCNSxwqFWxYG2CU0c6S7xkTw | `paused` |
| kids | Tiko & Pip | @TikoAndPipLearn | UC94OOegtu_4mngD49Qhm2Ew | `retired` (owner 2026-11-01) |

Registered in: DB `brands` (via `cli brand:upsert docs/brands/<b>/brand.json --no-accounts`, format `explainer`) + `accounts` (`<b>:youtube`
connected; kids can_publish 0), `config/publish-times.json` (paused, previous UTC slots kept), `docs/accounts.md`, `scripts/youtube.ts`
CHANNEL_IDS (uploads for brand `kids` now set `selfDeclaredMadeForKids: true`). No TikTok/Instagram/Facebook accounts existed for them.

The OAuth client was already the same one (`video-studio-youtube-512300`, same client id) in `secrets/youtube-oauth-client.json`.

**Verification (2026-11-02, read-only):** token refresh + `channels.list?part=snippet,statistics&mine=true` per channel, all OK with the expected id:
tech 5 subs / 24 public videos / 5,325 views · celebrity 13 / 24 / 12,092 · kids 2 / 25 / 1,074. `scripts/youtube.ts status` shows all 8 brands authorized.
Gemini key index 20: `models.list` OK (lists the 5 TTS models). Dashboard `/api/overview` lists the 3 new brands.

### Secrets moved (names only; values never printed)
- `data/tokens/tech.json`, `data/tokens/celebrity.json`, `data/tokens/kids.json` (refresh tokens; git-ignored by `data/tokens/`)
- `secrets/gemini-keys.txt`: appended the 1 key the studio lacked (old index 20, the owner's newest project); studio now has 21 (git-ignored by `secrets/`)
- OAuth client: identical, nothing to copy.

## 3. What moved where
| From (old) | To (studio) |
|---|---|
| `channels/<b>/brand/*` | `data/brand/<b>/` (avatar, banner, watermark, channel-kit.md) |
| `channels/<b>/bible.md`, channel kit, `research/channels/<b>.md` | `docs/brands/<b>/{bible,channel-kit,market-research}.md` + `brand.json` |
| `research/channels/new-ideas/*`, `research/trends/*` | `docs/brands/<b>/ideas/` (tech, celebrity, kids); `ideas.json`, `summary.md`, run240-owner → `docs/brands/explainers/ideas/` |
| `docs/run240-protocol.md`, `run240-review.md`, `review-rubric.md`, `spec-authoring.md`, `youtube-setup.md`, `youtube-connect.md`, `week1-capacity.md`, `STATUS.md` | `docs/brands/explainers/` (rubric → `explainer-review-rubric.md`, STATUS → `legacy-STATUS.md`) |
| `docs/legal/privacy.html` (source of the OAuth app privacy page) | `docs/legal/privacy.html` |
| `research/{tools,analytics,reference}`, bakeoff REPORT + sheets | `research/legacy-video-automation/` |
| `memory/` (verbatim) | `memory/legacy-video-automation/` |
| Distilled transferable lessons | `memory/video-automation-lessons.md`; 3 lines in `CLAUDE.md` (layout pointer, shared YouTube quota, TTS preamble + owner email) |
| Claude memory (3 files) | `E--clips-viral/memory/`: `explainer-channels-merged.md`, `gemini-key-history.md`, `youtube-shared-upload-quota.md`, `no-owner-email-to-apis.md` (+ MEMORY.md lines); `clips-viral-studio.md`, `quiz-ar-channel.md` updated |
| `data/studio.db`, `plan-week1.json` | `data/legacy/video-automation/db/` |
| DB exports | `data/legacy/video-automation/{published-registry.json (212 videos + channels + latest metrics), ideas.json (407), lessons.json (54), slots.json}` |
| 51 never-uploaded celebrity videos | `data/legacy/video-automation/pending-uploads/<id>/{final.mp4, upload.json, thumbnail.png, captions}` + `manifest.json` (planned slots Nov 7–20) |
| Per-production light files (spec, upload.json, sources, rights, script, storyboard, thumbnail, latest review + captions + timeline) | `data/legacy/video-automation/productions-meta/<id>/` (212) |
| Source code (packages, apps without dist, scripts, auto, `.claude/agents`, CLAUDE/AGENTS, package*.json, tsconfig, config/policy+deadlines) | `data/legacy/video-automation/code/` |
| `assets/` (fonts, original sfx/music, gsap, provenance) | `data/legacy/video-automation/assets/` |
| `video ideas/tech explain.mp4` (third-party reference, analysis only) | `data/legacy/video-automation/reference-video/` |
| Full git history (`git bundle --all`) | `data/legacy/video-automation/video-automation.git.bundle` (1.29 GB; restore with `git clone <bundle>`) |

`data/legacy/` was added to `.gitignore` (local archive). **Total copied: 2.84 GB** (1.56 GB files + 1.29 GB bundle).

References fixed (no path to the old folder left outside the archive): `CLAUDE.md`, `AGENTS.md`, `docs/STATUS.md`, `scripts/youtube.ts`,
`packages/voice/src/gemini-tts.ts` (comments), `research/tools/external-tools-and-platforms.md`, `productions/quiz-261021-m52q/script.json` +
its `data/_archive` copy (provider_note), `.gitignore` comment, and the Claude memory files. `npm run -s typecheck` passes.

## 4. Code
Already in the studio before today (ported earlier, better here): Gemini TTS with model fallback (`packages/voice`), YouTube uploader/scheduler and
stats (`scripts/youtube.ts`), GPU faster-whisper (`packages/intelligence/py`, `.venv-asr`), QA/review loop, dashboard.
Ported today: the three channels into `scripts/youtube.ts` (+ madeForKids for kids). Nothing else was wired in:
- **HyperFrames explainer engine** (video-engine, compose, scenes, characters, ctas, safezone, stills, imagegen): a renderer; `packages/render` is
  being replaced by another engineer and must not be touched. Archived in `data/legacy/video-automation/code` (needs `npm i` there; hyperframes 0.8.181).
  Consequence: **the studio cannot render new tech/celebrity/kids videos today.**
- audio-engine synth (procedural SFX/music), caption-engine align.py/wordcheck.py, review-engine novelty gate, worker/queue, studio UI: archived;
  the studio has its own equivalents or they are engine-specific.
- 11 old agents: archived only (they drive the archived engine's CLI; would mislead if loaded as studio agents).

## 5. Intentionally dropped (not copied)
- `productions/**` renders, audio wavs, generated images, QA frames, `comp/` (~30 GB): every non-pending video is on YouTube; images are in the git bundle.
- `exports/` (353 MB): manual-upload kits, regenerable; all tech videos are on YouTube.
- `research/bakeoff` media + Remotion node_modules (736 MB): conclusions are in REPORT.md (copied).
- `node_modules/`, `.venv-align/`, `__pycache__`, `apps/studio/dist`, `scratchpad/` (agent queue tsv files of a stopped run), `data/logs`, `data/*.log`.
- `config/youtube-oauth-client.json` (identical to the studio's copy).

## 6. Contradictions between the two studios (studio rule wins; noted for the owner)
- **Gemini keys:** old studio = one owner-chosen key, multi-key failover OFF (ToS), rotation declined repeatedly; studio = owner decision 2026-10-22
  "use all keys, failover". Keys #15–#17 were 403 "project denied" in the old studio — a real account-risk signal (same Google account owns the channels).
- **AI disclosure:** old studio wrote "the narration is a synthetic voice" in descriptions; studio rule (owner 2026-10-28) forbids AI-generation text.
  50 of the 51 pending celebrity `upload.json` descriptions contain it — strip (`scripts/ai_strip.py` style) before any upload.
- **Credits:** old studio credited sources and Fluent Emoji (MIT) in descriptions; studio keeps credits except Podium Pop (no credits, views first).
- **Footage rights:** old studio = original art only, no downloaded clips; studio (owner 2026-10-28) allows TikTok/YouTube clips for compilations and
  Planet Extremes on owner approval. Different brands — the old rule stays for celebrity (no likeness, ≥ 2 sources per fact).
- **Release bar:** both 85, no blockers (old studio also required a separate engagement-reviewer pass for run240).

## 7. Open items for the owner / orchestrator
1. 51 approved celebrity videos (planned Nov 7–20) were never uploaded. Uploading = publishing → needs the owner's OK, a description AI-text strip,
   and new slots (the planned ones overlap Podium Pop's cross-brand upload budget; all 8 channels share one Cloud project quota).
2. Tech/celebrity production: paused. Restarting needs a decision on the engine (archived HyperFrames code vs. the new `packages/render`).
3. A sibling folder `Desktop/video automation-ui-review` (old UI redesign review board) exists separately; it was not part of this migration.

## 8. Checks done
- Secret scan of every copied text file (AIza / AQ. / ya29 / GOCSPX / refresh-token / client_secret patterns, @gmail.com): none outside the old redact() regexes.
- `git check-ignore`: `data/tokens/*`, `secrets/*`, `data/legacy/*` ignored.
- Read-only API: 3× `channels.list` OK, 1× Gemini `models.list` OK.
- No running process, scheduled task or retry loop of the old studio (checked `Win32_Process`, scheduled tasks); its old Claude scheduled-task lock is stale.
- Grep of the studio (outside `data/legacy`, `OpenChatCut`, media) for "video automation": 0 hits. `npm run -s typecheck`: pass.
