# «شو شايف؟» LAB "PAPER" — contract (orchestrator, 2026-11-14)

Owner order 2026-11-14: three new Shorts built from zero. **Nothing from the old quiz system**: no `packages/quiz`
templates, no old colours, no Cairo font, no Zephyr voice, no rounds / progress chip / countdown ring / tick badge /
score ask / hook bank / persona / old SFX / old music bed. Do not read or copy them. Only plumbing is reused
(headless-Chrome frame capture, Gemini TTS client, ffmpeg, `master()`, techqa).
Still binding (studio hard rules): all art is original and drawn in code (SVG / CSS / canvas), fonts OFL only, no
third-party media, no AI-generation wording anywhere, nothing is published, no paid tools, `python` never `python3`,
every Python `open()` with `encoding="utf8"`, never put personal data in outside requests.

Productions: `quiz-261114-csbw` (illusion, magician monologue) · `quiz-261114-vafk` (lying narrator story) ·
`quiz-261114-adqi` (fold-and-cut bet, two voices). Each has `productions/<id>/brief.md` (scene + exact words).

## 1. Identity: cut paper on a desk
Everything on screen is a piece of cut paper lying on (or lifted off) a desk, filmed from above with a slight tilt.
- **Depth is real**: every piece has a contact shadow + a soft ambient shadow; a lifted piece = bigger, softer, more
  offset shadow + slight scale-up; pieces flip / fold in CSS 3D (`perspective` on the stage). No flat stickers.
- **Material**: fine paper grain (SVG `feTurbulence`, fixed seed, static), slightly irregular cut edges on big sheets,
  a faint darker rim on edges. No gradients as backgrounds, no glass, glow, neon, blur-bokeh, emoji, rounded "app cards".
- **Colours — only these tokens** (banned hues: violet, blue, teal, yellow/amber, green, pink):
  `--paper #F3EADA` · `--paper-shade #E4D7BF` · `--kraft #B98F5F` · `--kraft-dark #8C6A44` · `--ink #16130E` ·
  `--vermilion #E8401C` · `--chalk #FFFDF7` · `--night #1E1B16` (dark stock) · shadows = ink at 12-45 % alpha.
  Stock per video: csbw = cream desk (kraft desk surface, cream pieces) · vafk = diorama that turns from day stock to
  night stock · adqi = night desk, cream sheet, vermilion marks.
- **Type** (two OFL families, self-hosted in `data/brand/shu-lab/fonts/`): display = **Lalezar**; text = **IBM Plex
  Sans Arabic** 600/700. Arabic RTL, Eastern Arabic digits (٠-٩) only. Words are *printed in ink on paper strips /
  label tape* (strip slightly rotated ±1-3°, torn or cut ends), never free-floating with strokes or pills.
  Sizes at 1080 wide: headline strips 96-150 px, spoken-line strips 60-76 px, nothing readable below 44 px.
- **Devices**: hand-drawn *marker circle* (vermilion SVG stroke that draws on) = "look here"; *rubber stamp*
  (vermilion ink, rough edge, rotated -6..-10°, slams in) = verdict; *ruler / pencil / scissors* paper props = proof.
- **Motion = paper physics, bold**: slide with overshoot and settle, 3D flip, drop with a thud (shadow squashes),
  stamp slam (scale 2.2 → 1 in 0.12 s + 4-frame shake), desk push-in. Nothing floats or fades lazily; a move is
  0.25-0.6 s. Something visibly moves at least every 1.5 s.
- **Safe zones (platform UI, 1080×1920)**: keep text and answer-critical art inside x 70-950, y 230-1460. Bottom
  1480-1920 and the right rail x 950-1080 (y 800-1700) hold only desk surface / non-critical paper.
- **Frame 0 rule**: the puzzle itself is fully on screen and readable at frame 0 (no intro, no logo, no fade from
  black). Last frame must cut back to frame 0 cleanly (same layout) so the video loops.
- Channel mark: a small paper tag «شو شايف؟» (ink on cream, ~150×56 px, rotated -3°) pinned top-left at x 70, y 236.

## 2. Page contract (`productions/<id>/page/frame.html`)
Fixed 1080×1920 stage, `body{margin:0;overflow:hidden}`. Loads `/data/brand/shu-lab/kit.css` and
`/data/brand/shu-lab/kit.js` (absolute URLs from the repo root; the capture server serves the page folder,
`data/brand/` and `node_modules/`). No network, no CDN.
- `window.__plan(durs)` — pure function. `durs` = `{ "<lineId>": seconds }` (real trimmed narration lengths).
  Returns `{ duration, cues: [{id, at}], sfx: [{name, at, gain?}], bed?: {name, from, to, gain?}, marks?: {...} }`
  (all seconds; `duration` is a multiple of 1/30). The page owns its timing; speech is never cut: a line's next
  event waits for `at + durs[id]`.
- `await window.__load(show)` — `show = { lines: [{id, text, onscreen?, voice?}], durs, plan }`. Builds the DOM and
  the timeline, waits for fonts (`document.fonts.ready`), then sets `window.__ready = true`.
- `window.__seek(t)` — paints the exact state at `t` seconds. Random-access and idempotent: no CSS transitions /
  animations, no `Date.now`, no unseeded `Math.random`, no video/audio elements.
- `frame.html?dev=1` — self-loads with estimated durations and plays in real time with a scrub bar (owner preview).
- Every spoken line has its words (or a tighter on-screen version) visible for at least its spoken time.

## 3. Kit (`data/brand/shu-lab/`) — see its `README.md` for the exact API
`fonts/`, `kit.css` (tokens, stage, paper / strip / tag / stamp / shadow classes), `kit.js` (`Lab` timeline engine
with deterministic seek, easings incl. overshoot, paper helpers: grain filter defs, marker-circle path, stamp,
strip maker, seeded random, dev player), `sfx/*.wav` + `sfx/index.json` (built by the pipeline engineer).

## 4. Build (`packages/quizlab`)
`npx tsx packages/quizlab/src/build.ts <id> [--no-tts] [--snap t1,t2,…] [--reason "…"]`
`productions/<id>/lab.json` = `{ production_id, title, fps: 30, voice: {name, style, tempo}, lines: [{id, text,
onscreen?, voice?, style?, tempo?, gain?}] }` (per-line `voice/style/tempo` override the default).
One TTS call per line (cached) → trim → measured `durs` → `__plan` → frames via `capturePicture` → narration + SFX +
bed mix → `render.raw.mp4` → `master()` → `vN/render.mp4` + `qa/` (techqa, contact sheet, per-line ASR check).
`--snap` writes stills to `productions/<id>/draft/` (no TTS spend, estimated durations) for frame checks.

## 5. Checks every scene builder does itself before reporting
Stills at 360 px wide for: frame 0, each question moment, each reveal, last frame. Nothing clipped or overlapping,
text inside the safe zone, every strip readable at 360 px, puzzle fair (the brief says how to prove it), `__seek` is
random-access (seek 12 s then 3 s = same picture as a fresh 3 s).
