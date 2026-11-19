# Tech Made Simple: build pipeline (`tech:build`, 2026-11-03)

The old HyperFrames spec engine (data/legacy/video-automation/code) stays archived. Tech now builds through `packages/tech`,
which reuses what the studio already runs every day: the quiz-ar HyperFrames renderer (`npx hyperframes@0.8.185`, already in the npx cache),
packages/voice (Gemini TTS, cached), the faster-whisper aligner, packages/render (ffmpeg compositor), `master()` and techqa. Nothing new is installed.

## Goal first: viral, not tutorials
Studio goal = 1M views per reel. A tech Short wins with a **striking mechanism in motion at frame 0**, one open question about something the viewer
has already seen ("why does AI…", "what really happens when…", myth vs reality), paid at `payoff_ts`, and a seam back to frame 0. The builder exists to make that
cheap: word-timed kinetic diagrams, not slides. Channel data (docs/youtube-intelligence/channels/tech/analytics.json, 2026-11-03): the 3 "Why <AI/everyday surprise>"
Shorts made 3,737 of 5,158 views (28 d); "X Explained / A vs B / in N Seconds" titles got 27-117 each.

## Pipeline
```
productions/<id>/spec.json + scenes/<scene>.html (+ assets/ original art)
  → ONE TTS take of all lines (Charon, cached by text+voice+style) → align.py (word times, WER) → per-line clips laid end to end
  → ONE HyperFrames composition: packages/tech/runtime (tech.css stage + tech.js helpers) + kit fonts + scene fragments → vN/scenes.mp4
  → vN/timeline.json: picture + hook pill (frame 0) + word-timed captions (captions.json) + narration + SFX + ducked tech-focus bed
  → packages/render (ffmpeg) → render.raw.mp4 → master() −14 LUFS → render.mp4 → techqa → vN/qa/stills/*.jpg (360 px)
```
Commands (from E:\clips-viral):
- `npm run -s cli -- production:create --brand tech --format explainer --title "..."`
- `npm run -s cli -- tech:build <id> --no-tts` → draft picture + 6 stills in `productions/<id>/draft/` (estimated timing, no quota). Iterate motion here.
- `npm run -s cli -- tech:build <id> --agent showrunner-tech-made-simple [--snap 0,1.5,3,<payoff_ts>,<end>]` → `vN/` (version, DB row, techqa).
- `npm run -s cli -- prelint <id>` then `production:stage <id> qa`.
- Re-render a hand-edited timeline: `npm run -s cli -- render:timeline productions/<id>/vN/timeline.json out.mp4` (raw; master it).
Times: draft ≈ 1 min for 7 s; picture ≈ 30-90 s per 6 s of video (HyperFrames, 2 workers), composite ≈ 10 s. A 40 s Short ≈ 5-8 min. Smoke proof: 5.6 s, techqa pass, WER 0, −14.0 LUFS / −1.7 dBTP.

## spec.json
```json
{
  "voice": { "name": "Charon", "style": "optional TTS director's note" },
  "hook": { "text": "Why can't AI count this?", "dur": 2.2, "y": -20 },
  "scenes": [
    { "id": "s1", "lines": [ { "id": "l1", "text": "Ask ChatGPT how many r's are in strawberry.", "gap": 0.12 } ], "min": 0, "pad": 0.15, "drift": true },
    { "id": "s2", "html": "scenes/s2.html", "lines": [ { "id": "l2", "text": "..." } ] }
  ],
  "tail": 0.3,
  "sfx": [ { "name": "pop", "at": "l2:tokens", "offset": -0.05, "db": -8 } ],
  "bed": { "gainDb": -19, "duckDb": 6 },
  "captions": { "maxChars": 16, "y": 22, "accent": { "tokens": "#3DF2C2", "wrong": "#FF5C7A" } }
}
```
- `hook.text` ≤ 6 words (build refuses more); it is a pill at y −20 (≈ 30% from top) from frame 0 for `dur` s. This is the frame-0 text prelint looks for.
- Line text: no digits (build refuses them). Write numbers as words ("zero point one plus zero point two"). Show digits on screen in the scene instead.
- Scene `html` defaults to `scenes/<id>.html`. Scene starts at its first line; the last scene ends `tail` s after the last word (H8: ≤ 0.4).
- `sfx` names: whoosh pop click ding key tap buzz thud sparkle riser (`data/brand/tech/kit/sfx`, original procedural, provenance.json). Every SFX needs an on-screen event (H10).
- `bed: false` turns off the tech-focus bed. `captions: false` turns captions off (don't: prelint wants them).

## Scene fragment (`scenes/<id>.html`)
Plain HTML in canvas pixels (1080×1920), CSS scoped with `#scene-<id>`, and one function:
```html
<style>#scene-s2 .tok { left: 120px; top: 900px; font-size: 72px; }</style>
<div class="chip tok mono abs" id="s2-tok">straw</div>
<script>
TECH_SCENES.s2 = function (tl, S) {
  S.pop('#s2-tok', 0 + S.t0);              // absolute seconds
  S.travel('#s2-dot', '#s2-path', S.at('tokens'), 0.8);
  S.count('#s2-n', 0, 3, S.at('l2:three'), 0.6);
  S.stamp('#s2-no', S.at('wrong'));
};
</script>
```
- `S.at('word' | 'lineId' | 'lineId:word', n)` = the absolute time that word is spoken (n-th occurrence) in this scene. The build fails when a referenced word is not in the scene's lines, so motion stays locked to the voice after any re-take.
- Helpers (all GSAP on one paused timeline, deterministic): `pop`, `slide`, `draw` (SVG stroke), `travel` (element along an SVG path), `count` (number ticker), `type` (typewriter), `stamp`, `punch` (camera punch-in on the scene), `shake`, `pulse`; `S.q/qa` select inside the scene; `S.t0/t1/dur/el/cam`. Raw `tl.to/fromTo(...)` works too.
- Built-in motion: the background grid and glow drift on global time, and every scene slowly pushes in (scale 1 → 1.035; `drift: false` to stop it). Scenes hard-cut at their `t0`.
- Classes from `packages/tech/runtime/tech.css`: `.card .chip .mono .disp .abs .center .stamp`, colour classes `.good .warn .bad .acc .vio .gold .muted`, CSS vars `--bg --ink --muted --acc --good --warn --bad --panel --line --vio --gold` (bible palette). Fonts: Inter, Space Grotesk (`.disp`), JetBrains Mono (`.mono`, ligatures off).
- Images: put original art in `productions/<id>/assets/` and use `src="assets/x.png"`.

## Layout zones (1080×1920; found in the smoke render)
- **Hook band 540-730 px (28-38%)** is covered by the hook pill for `hook.dur`. The frame-0 hero motion must sit **below 760 px** (or above 520 px) during the hook, or T1 fails (smoke v1: the pill hid the moving password).
- Mechanism stage: 300-1300 px. Captions: centred at ≈ 1380 px (y +22). Keep 1620 px and below, and x > 930 px near the bottom, free (Shorts UI).
- Text in scenes ≥ 40 px (readable at 360 px wide). One hero object per scene; max 3 labels on screen.

## Motion rules (playbook H2-H6, enforced by you; the build warns on some)
- Frame 0: the hero is already moving (`travel`/`count`/`type` starting at 0). Never a title card, logo or empty stage.
- First word ≤ 0.3 s (build warns), ≤ 7 words in the first 3 s (build warns), first visible change by 1.5 s, second by 3.0 s, then one every 3-5 s.
- One open loop at a time; a re-hook (new question, stake or reveal) every 5-8 s; payoff at `payoff_ts` (60-80% of runtime).
- Seam: the last scene returns to the frame-0 composition (same positions/state) so the replay is free; concat-twice test before staging.
- No flashes; slow-drifting stripes only (photosensitivity, bible moiré rule).

## Limits
- Length 30-45 s (build warns outside 28-47 s). One TTS take per video (re-take = new text; the cache is keyed on text+voice+style).
- No WebGL/3D (HyperFrames screenshots DOM/SVG/canvas2D; for 3D use the kids3d pattern via the orchestrator). Canvas2D must draw from timeline time, never `Date`/`requestAnimationFrame`/`Math.random` (seed it).
- No `--reuse-picture`: every full build re-renders the HyperFrames picture. Iterate on `--no-tts` drafts first.
- Scratch builds: `STUDIO_PRODUCTIONS=<dir>` with no DB row = no DB writes (used for the smoke test).
- Engineering asks (queued): per-word caption highlight, a `--reuse-picture` flag, a seam (concat-twice) check in the build.
