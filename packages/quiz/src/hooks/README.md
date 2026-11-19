# hook_intro variants (one file each)

A variant is the visual concept of the ~2 s spoken hook scene that opens a «شو شايف؟» video (docs/brands/quiz-ar/hooks.md).
To add one, **create `packages/quiz/src/hooks/<name>.ts`**. That is the only file you touch. `index.ts` loads every `*.ts` in
this folder at startup, so you do not edit the registry, `templates-hook.ts`, `registry.ts` or `spec.ts`. Four showrunners can each add
a variant on the same day without conflicts. Rules: the file name must be snake_case, it must equal `name`, and names and aliases must be
unique. Files starting with `_` are ignored, so use that prefix for drafts.

```ts
import { defineHook, r2 } from './types.ts';
export default defineHook({
  name: 'radar_sweep', aliases: [], about: 'a radar sweeps the blurred round-1 card and pings the hidden spot',
  beats: { ping: 0.8 },                    // default beat times (s); quiz.json params.beats overrides any of them
  tint: 'rgba(29,21,72,.6)',               // colour over the blurred teaser on the card
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -8), cue('hook_lock', B.ping, -6)],   // closing whoosh is added for you
  render: ({ P, B, D, onscreen, teaser, pal, esc }) => ({
    top:  `<div class="hk-t" id="t1" style="top:52px;font-size:130px;color:#fff">${esc(P.t1 ?? onscreen)}</div>`,
    body: `<div class="abs" id="radar" style="left:150px;top:130px;width:600px;height:600px">…svg…</div>`,
    css:  `#radar svg{display:block}`,
    js:   `slam('#t1',0,1.4,.25); tl.to('#radar',{rotation:360,duration:${r2(D)},ease:'none'},0); shake('#hk-in',${B.ping},12,.3,1);`,
  }),
});
```

## Inputs (`HookCtx`, see types.ts)
| field | what |
|---|---|
| `onscreen` / `spoken` | the hook line's `onscreen_ar` / `narration_ar` (script line `params.line`, normally `h0`) |
| `P` | round params: free-form sub-lines and options (`t1` top line, `t2` punch line, `foot`, `words[]`, `max`, …) |
| `teaser` | the round-1 teaser crop: a 900×860 jpg of round 1's card, made by the build. The shared layer shows it heavily blurred (`#hk-img`, 44→24 px) |
| `D`, `B` | the scene duration in s (≥2.0, max 2.5, stretched to fit the voice) and the merged beats |
| `pal` | brand palette: `ink #1D1548`, `gold #FFC83D`, `goldDeep`, `white`, `teal`, `blue`, `violet`, `red`, `pink`, `green`, `orange`, `lilac` |
| `esc`, `cue(name, at, gain_db)` | HTML escape; an SFX cue that is auto-ducked under the hook voice |

## Output (`HookScene`)
- `top`: the 1080×252 text band above the card (rtl). The `hk-t` class gives a big centred line, and `hk-o` adds a navy outline.
- `body`: absolute layers on the 900 px card (`abs` class). The card sits at canvas 90,470.
- `js`: GSAP code, run after the shared prelude. In scope: `tl`, `Q`, `X` (exit = D−0.3), `shake(sel,at,amp,dur,rot)`, `slam(sel,at,fromScale,dur)`.
  A full-bleed `#bgfx` layer behind the card starts at opacity 0. The card slides out in the last 0.3 s, so let the tint fade before X.
- `css`, `root` (optional): extra CSS, and the root-level html (the default is `<div id="bgfx"></div>`).

## SFX names
`tick tick_last whoosh swap pop ding shimmer sting flip hook_slam hook_riser hook_blink hook_lock hook_alarm hook_roll`.
To use a new sound, drop `hooks/sfx/<name>.wav` (48 kHz, original or synthesized, not a downloaded sample) and cue it by name.

## Pipeline rules every hook inherits (QA round 1, 2026-10-27)
1. **SFX sit under the hook voice.** Any hook cue that lands from 0.15 s before the hook line to its end is lowered a further 5 dB in the
   build and held >= 6 dB under the voice's first 0.5 s (the closing whoosh is tied to the line too). The slam stays punchy but never
   masks a word (ASR heard «مي» for «في شي» before this). Cue as usual with `cue(name, at, gain_db)`; do not add your own ducking.
2. **Frame 0 shows the settled title.** The shared layer finds every tween that starts in the first 0.06 s, runs <= 0.5 s and targets an
   element inside the text band (`#hk-top`, i.e. your `top`), and replaces it with "settled state at t=0" plus a x1.05 in-place punch at 0.05 s,
   so the slam/pop-in can stay in your code but the first frame is never blank or scaled to the screen edge. This does NOT cover layers in
   `body` (card art, tapes, avatars, sub-lines): make sure the hero element of your concept is already visible and settled at t=0 (start from
   scale 1 / opacity 1, then move), and keep >= 72 px of margin at any scale. Sub-lines may land on beats later than 0.06 s.
3. **Round 1's spoken pre-lines are dropped.** `dev-hook apply` removes `pre_lines` from the first real round (hook-style teasers such as
   «٩ فناجين…»), recording them in `dropped_pre_lines`, so round 1's question starts about 0.12 s after the intro ends. The script lines
   stay, so the main take's text and TTS cache key are unchanged (`take` still reports `main_take.cached: true`) and the lines are simply never
   placed (no voice, no head, no caption). Set `keep_r1_pre_lines: true` in hook.json to keep them.
4. **Teaser must not leak.** The teaser is the blurred first frame of round 1's card. If that card shows the answer (one odd-sized object, a
   brighter cell...), give the hook round (or round 1) `params.teaser_src` = a production-relative 900x860 image (the same card with the clue neutralised, e.g. nine
   identical cups); the build uses it instead of the crop. Verify it in the 0 / 0.9 / 1.5 s frames.
5. **The line must be true and ASR-clean.** After voicing (`take`), run ASR on the stem and on the render (large-v3); if the key word is misheard,
   re-voice only the hook line with tashkeel or another wording. Only the hook take is re-synthesized; the main take stays cached.

## Adding a hook to a production (showrunner)
1. Write `hook.json`: `{ category, variant, line_ar, onscreen_ar, narration_ar, caption_ar?, params?: {t1,t2,beats…}, timings? }`.
   `category` must be one of the 8 keys in hooks.md, and it is validated.
2. Run `npx tsx packages/quiz/src/dev-hook.ts take <id> hook.json`. This voices the hook line on its own into a scratch directory.
   `main_take.cached` must be `true`, which means the narration is untouched. Listen to the hook wav, and check that `fits_2_5s` is `true`.
3. Run `npx tsx packages/quiz/src/dev-hook.ts preview <id>` for snapshots without TTS or OCC. Iterate on the variant file.
4. Run `npx tsx packages/quiz/src/dev-hook.ts apply <id> hook.json`. It writes round `hook`, line `h0` and the `hook` block into both
   quiz.json and script.json (and drops round 1's pre-lines, see the rules above).
5. Build: `npm run -s cli -- quiz:build <id>`. The main take comes from the cache, and the hook line is synthesized as a separate standalone
   request with the same voice, style and tempo (`voice/hook_*.wav`). No pins or `take_text` are needed.

Regression: `npx tsx scripts/dump-hook-html.ts <outDir>` writes the hook HTML and plan for diffing, and
`npx tsx scripts/check-hook-tts.ts <id>…` checks the cache state of the main take and the hook take without making a TTS request.
