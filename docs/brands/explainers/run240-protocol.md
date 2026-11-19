# Run240 — per-video director protocol (tech + celebrity, Nov 11 – Dec 10, 2026)

One fresh director agent builds ONE Short end to end, then stops. The orchestrator gives you: channel, idea (id + line from the
Scout file), slot id and slot time. An independent reviewer (Verity) judges the real render afterwards; you never review yourself.

## Read first (only these)
1. `CLAUDE.md`, `memory/INDEX.md`, the last ~20 lines of your `memory/agents/<tech|celebrity>.md`.
2. `research/analytics/2026-10-24-run240-brief.md` — build rules, hook rules, **CTA playbook**, title rules. Follow it.
3. `docs/spec-authoring.md` — spec format, incl. the `ctas` overlay field and "Calls to action".
4. Your idea's entry in `research/trends/2026-10-24-run240-<channel>-*.md`.
5. Optional: one recent passing spec on your channel as a model (week-3 videos scored 85–93).

## Build
1. `task:start <tech|celebrity> "Run240: <title>" --video <id>` once the video exists; `task:finish` at the end (real summary).
2. `video:create <channel> "<title>" --idea <ideaId> --format short` → video id.
3. Research + `sources.md` (celebrity: ≥ 2 independent sources per fact; tech: primary docs; URL + access date). If the
   idea turns out wrong, stale or unsafe, pick the next-best spare from the Scout file and say so in your final message.
4. Script: 30–40 s (hard cap 45 s), first word by 0.3 s, twist by ~2.5 s, **full hook visible on frame 0 — and the SUBJECT
   too** (the person/app/thing named, e.g. a "NEIL YOUNG" or "Shazam?" chip; reviewers flag a missing subject as a major).
   Fill the lower half of every scene (empty lower halves are the most common reviewer minor). For built-in scenes add `"layout": {"portraitBand": "center"}` to the spec (see spec-authoring.md "Portrait band layout") instead of hand-patching; use CTA `pos:"low"` with it.
   **Two spoken CTAs** per the brief (comment prompt at 35–55 % of words, never before 8 s; subscribe-with-a-reason / like /
   red heart / share at 75–88 %), each paired with one on-screen `ctas` pill on an **empty band** (`pos`) so it never hides
   key text. Rotate the CTA lines (check what your channel's other run240 specs already used that day). The **loop line is
   always last**. Spoken text says "red heart", never an emoji.
   **Accuracy:** never state our own inference as fact (hedge it — "most likely" — or source it); scope recap cards
   (platform, country, "by his own account"); any text added during a fix must be backed by sources.md.
5. Visuals: original/generated images only (`image:gen` / `image:pick`; celebrity = symbolic, no likeness), something
   changes every ≤ 2 s, key content between y 240 and 1320, nothing past x 940.
6. `spec:validate <id>` (includes novelty) and `safezone <id>` before rendering. Fix everything they flag.
7. `produce <id>` (one TTS request). Narration is cached: visual fixes = `produce <id> --from render` (0 TTS); tempo/pause
   changes = `--from audio` (cache hit). Re-voice only for a real script fix. Wait for the jobs (poll the `jobs` table by
   video id; columns: id, type, status, error). If TTS is out of quota the job waits for the reset — say so and stop.
8. **Post-render check on the real render** (`productions/<id>/v<N>/`): qa.json, contact sheet, `safezone.json`; extract
   frames with ffmpeg at 0 s, the twist, every cut and every CTA; Read them (confirm `v<N>/comp/index.html` contains
   `cta0`; if not, the worker ran stale code: tell the orchestrator instead of restarting anything). Measure, don't describe. Fix and re-render
   until clean (judge frames at phone size).
9. `thumbnail.png` = the frame-0 composition.
   **`productions/<id>/upload.json`** (required; the uploader reads it): `{title (≤ 60 chars, curiosity gap), description
   (hook line, 2–4 factual sentences, a soft CTA line — e.g. "Subscribe for one weird tech fact a day" / "Drop a ❤ in the
   comments if you knew this", hedges like "by his own account" where the sources are self-reported), tags (8–12),
   thumbText, sources: [urls]}`. Model: `productions/tech-why-ai-can-t-draw-a-left-handed-writer-ed5c/upload.json`.
10. Append 1–3 dated lines of real lessons to your `memory/agents/<id>.md`.

## Final message (≤ 120 words, the orchestrator reads only this)
video id · final version · duration · twist time · CTA times + kinds · TTS requests used · anything Verity should check ·
problems/blockers. No essays.

## Rules
No uploads, no publishing, no spending, never touch `secrets/`, never send the owner's personal data anywhere. Don't
`produce` any video other than your own. Use a unique scratchpad subfolder (other directors run in parallel).

## Engagement enhancements v2 (owner, 2026-10-25 — from YouTube Studio advice; REQUIRED on every new video)
Spec gets `"enhancements": "v2"` (top-level). Every v2 video has all of these:
1. **Hook = contradiction or mid-action** (no setup, no greeting): "Everyone told Ali he'd die in that ring." /
   "Your phone stops fast-charging at 80%. On purpose."
2. **Comment prompt = a dilemma or a side to pick**, never a quiz the viewer can't answer: "Plug in overnight, or unplug
   at 80%? Tell me." / "Who was actually right here?" (CTA-A, the `comment` pill).
3. **Debate loop ending:** the LAST line is an open question that ALSO loops back to the hook
   ("So… would you have taken that gamble?"). Still never a plain CTA as the last line.
4. **Subscribe micro-pitch with a promise** as CTA-B when the video is not a red-heart/share day:
   tech "Tech made simple, every day — subscribe." / celebrity "One moment that made a legend, every day — subscribe."
5. **Pinned comment:** `upload.json` gets `"pinnedComment"` — the channel's own first comment, a direct either/or
   question ≤ 120 chars (e.g. "Team Messi or team Ronaldo — and why? 👇"). The owner pins it after publish.
6. Celebrity favours **rivalries, debates and underdog turning points** on globally known icons (data: Messi vs Ronaldo
   1,407 views, 53 % stayed). Tech favours **viral everyday quirks** (data: Strawberry 1,289 views, 74 % viewed).
7. Use the `layout` field (`{"portraitBand":"center","scale":1.15}`) unless a scene is custom-laid-out.

**TTS preamble check (2026-10-25):** some fallback TTS models occasionally read the style/director notes aloud. In the
post-render check, if WER > 10 %, look at the first words of `audio/align.json` `asr_text`: stray instruction text
there = trim the cached raw take and re-align (no new TTS), or re-voice; never ship it.
