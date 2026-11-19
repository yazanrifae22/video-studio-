# quiz-ar — round template library (v1, 2026-10-22)

Owner: occ-producer (`packages/quiz`). Showrunners write `productions/<id>/quiz.json` against this file and **do not edit
`packages/quiz`**. Need a new template or a new parameter? Write it in `productions/<id>/template-requests.md`.

## Difficulty rules v2 (owner, 2026-10-22) — apply to every new video
Owner: "a little harder on the moving things; on memories don't tell him what to memorize; show it fast then ask where it was; hiding/moving things much faster".
- **shell_game:** `timings.swap` 0.35–0.45 s (target 0.4), 5–7 swaps, at least 2 decoy swaps not involving the hidden object. Keep adjacent swaps or `arc: "scaled"` so `quiz:plan`'s crowding check passes. The set line may say «تابع!» but nothing slower.
- **memory_flash / grids:** NEVER name the target before the flash. The set line is generic («ركّز منيح!» or none). `timings.flash` 0.7–0.9 s (2×2) / 1.0–1.2 s (3×3). The question after the flip names the object («وين كانت الكرزة؟»). At least 4 different objects in the grid so it can't be guessed.
- **what_changed:** `timings.look` 1.0–1.3 s, generic set line (don't say what to watch).
- **fade-mode shuffles:** `timings.show` ≤ 0.8 s.
- **colour_reveal (QA 2026-10-23, batch 5):** the question names ALL the candidate colours (no on-screen order), then asks for the target («فيه أحمر وأخضر وبرتقالي وأزرق — وين البرتقالي؟»), so the viewer reasons by lightness instead of guessing; the target's grey is never adjacent (Δluma < 0.10) to another candidate's, and not always the mid grey.
- **Length (2026-10-23):** plan ≤ 35 s for perception videos (their timing hints under-run the real TTS by 3–6 s: 5a6q 36→42, n9ey 37→42); memory videos plan ≤ 38 s. Hook question lands within 2 s.
- **odd-one-out / count details:** the difference must be obvious at 360 px wide (≥ ~12 px at 360 = ~36 px at 1080); a rib count 6 vs 8 is NOT visible. Headlines must fit on one line.
- Fairness still applies: every answer must be trackable/rememberable by an attentive viewer; QA judges "hard but fair" at phone size. If QA finds a round untrackable, slow it by 0.05 s steps, not back to the old defaults.

## How a quiz is built
```
npm run -s cli -- quiz:plan  <id> [--snapshots]        # validate quiz.json + print the timeline (no TTS, no render)
npm run -s cli -- quiz:build <id> [--no-tts] [--no-render] [--agent A]
```
`quiz:build`: script.json narration → **one** Gemini TTS take (cached by text+voice+style: a rebuild with unchanged
words costs no quota) → Arabic ASR alignment (faster-whisper large-v3, `packages/quiz/py/align_ar.py`, line edges from the
real pauses) → per-line clips → every round re-timed from the measured lines → one HyperFrames composition per round
(1080×1920, 30 fps, MP4) + one transparent WebM caption layer → a real OpenChatCut project (V1 Rounds, V2 Captions,
V3 Brand [corner bug PNG + end-card], A1 Narration, A2 SFX lanes, A3 Music with ducking keyframes) → OCC headless
render → −14 LUFS master → techqa. `--no-tts` builds a silent version from the script's start/end hints (no quota).
Outputs: `productions/<id>/v<n>/` (`render.mp4`, `clips/`, `overlays/`, `narration/`, `timeline.json`, `captions.json`,
`build.json`, `qa/`), `occ.json` (project id), `pipeline.json` (dashboard progress).

## quiz.json (schema v1)
```jsonc
{
  "production_id": "quiz-…", "brand": "quiz-ar", "width": 1080, "height": 1920, "fps": 30,
  "channel_name": "شو شايف؟",                 // replaces {CHANNEL} in on-screen text
  "script": "script.json",                     // words live here (script-localization); the spec only references line ids
  "narration": { "voice": "Zephyr", "dialect": "levantine", "style": null },   // style null = script.json tts.style_notes
  "music": { "kind": "synth_bed", "bpm": 112 },
  "sfx_dir": "data/brand/quiz-ar/sfx",
  "no_endcard": true,                          // no brand end-card: the last round is the last frame
  "timings": { "cd": 2.5 },                    // video-wide countdown length in s (default 3.0; a round's timings.cd wins)
  "loop": "zoom",                              // needs no_endcard: final 0.3 s whip-zoom into a still of frame 0
  "rounds": [ {
      "id": "r1", "type": "<template>",
      "progress": "١/٤",                       // round counter chip (omit on the outro)
      "pre_lines": ["h1"],                     // spoken before the question (hook, "and now the hardest!")
      "set_line": "r2-set",                    // spoken while the puzzle performs (shuffle, flash)
      "q_line": "r1-q", "a_line": "r1-a",      // question / answer lines: their onscreen_ar is the headline
      "post_lines": ["o1", "o2"],              // score_cta outro, or the LAST puzzle round (SR3 score ask, spoken after the answer; timings.post_gap)
      "explanation_ar": "…",                   // ONE short line (≤ 32 chars renders on one line) shown after the reveal
      "params": { … },                         // per template, below
      "timings": { … }                         // optional overrides, per template
  } ]
}
```
**Owner 2026-11-08 (optional, top level):** `"hook_line": {"id": "HL07", "line"?: "h0"}` = the big stop-scrolling line from
`hook-lines.md`: the hook_intro speaks the line (its `params.line`) and draws its onscreen_ar as huge type (1-3 lines, ≤ 150 px,
canvas y 150-462) instead of the variant's title band; the variant's card text is hidden, its art keeps moving. Refused: 0-1 or
> 7 words, round/score/«الأذكياء»/٪/«حدس»/insult words. `"end_question": {"id": "EQ05", "text_ar": "…", "line"?: id, "at"?: 0.6,
"min_s"?: 1.4}` = open question from `end-questions.md` shown big above the card (navy pill, gold border, ≤ 104 px) from the
last reveal + `at` to the loop zoom; the answer headline gives way, the answer stays on the card. The last round only grows
when the question would show < `min_s` (reported as `marks.endq_ext`). Files without these keys build exactly as before.

script.json lines need `id`, `narration_ar` (null for silent countdown lines; never sent to TTS), `onscreen_ar`,
`caption_ar`, `start_hint`, `end_hint`. Image paths are relative to the production folder; record every generated image
in `productions/<id>/assets.json` (prompt, tool, rights: own/original).

## Shared round grammar (every template)
question headline pops in (0.4 s) → puzzle builds (≤ 0.8 s) → **countdown ring** (`timings.cd`, default 3 s; ٣ ٢ ١, a tick SFX per beat,
accent → alert in the last second) → **reveal** (white flash, card pulse, correct glow + green tick badge, "ding") →
answer headline (green pill) + answer line → **explanation chip** (accent pill inside the card) → whoosh + card exit.
Round length = measured narration + fixed beats. Pilot (measured, Zephyr at tempo 1.12): colour_reveal with hook 11.9 s,
shell_game 9.4 s, memory_flash 8.6 s, peek_number 9.9 s, score_cta 5.6 s → 45.4 s total. Long answer lines are the main
cost (R1's 8-word explanation = 4.5 s); keep answer lines ≤ 5 words when the chip carries the "why".

**Countdown length + loop (insights 2026-10-28).** `timings.cd` (quiz.json top level, or per round in `timings`; 1.5–3 s,
default 3.0) sets the ring length for every template: ٣ ٢ ١ get L/3 s each, ticks follow, the reveal moves to cd + L. Default
for new videos: **2.5**. The ring is fully cleared (opacity 0) on the reveal frame for every video (bug fix: it used to fade
0.2 s into the reveal and leave a faint pink disc). `loop: "zoom"` (needs `no_endcard: true`): over the final round's last
0.3 s the scene whip-zooms (scale 1 → 2.2 about the card) while a still of the video's frame 0 (frame 0 of the first clip,
taken at build time; the last round renders after the hook) fades in and settles from 1.35 → 1.0, so the last frame ≈ frame 0
on replay. A whoosh peaks inside the zoom; SFX tails are trimmed at the last frame (no audio past the picture). Files without
these fields build exactly as before (`scripts/dev-quiz-compat.ts` re-resolves every quiz timeline to prove it).

**Options row** (any template, `params.options_ar: string[]`): ink pills inside the card bottom, from the build until the
reveal (then 50 %, hidden when the explanation chip arrives). With options the countdown ring moves to the card's
bottom-left corner. **Ring placement** defaults: card bottom-centre; `image_reveal` below the card (the caption band is
empty during countdowns: captions are clipped before every ring); `spot_difference` at the left edge between the panels.
Override with `params.cd_pos: [x, y]` (canvas px, ring centre) and `params.cd_scale`.

**Countdown cue (optional):** `params.cd_cue` (string, <= 18 chars incl. spaces, validated in `spec.ts`) shows a small dark pill with gold text («قارن الرمادي») centred just below the countdown ring, only while the ring is up (gone before the reveal; works on open rounds). No audio. Use it for thinking-time *method* cues that name no option (what to compare/count/track); never a hint toward a specific answer. Rounds without it render exactly as before.

**Round transitions:** the card slides out left with a whoosh in the last 0.3 s of a round; the next card slides in from
the right (no blank frame between rounds).

**Build facts (pilot, 2026-10-22):** 5 HyperFrames round renders (3 in parallel) + caption WebM ≈ 3 min; OpenChatCut
import/edit ≈ 30 s; OCC headless render of 45 s ≈ 160 s; total `quiz:build` ≈ 7 min with cached TTS. Work dirs on
`E:\clips-viral-render-tmp\quiz`. Silent `--no-tts` builds cost no quota.
Layout follows `visual-system.md`: question y 318–468, card x 90–990 / y 470–1330, captions y 1340–1460, corner bug
x 60–293 / y 225–309 (70 %), answer-critical elements left of x 950.

**Pipeline rules added after pilot QA round 1 (2026-10-22, apply to every quiz on rebuild):**
- Reveal mix: ding at −12 dB; the answer line starts 0.14 s after the ding's attack (it no longer masks the answer word).
- Captions: pages never end on a glue word (لـ من ورا على في عن مع بين و ب يا اللي…); no single-word or ≤ 6-char orphan
  pages; a page appears exactly on its first word's onset (word onsets are snapped to the real speech onset) and is
  hard-cut when the next appears (no cross-fade ghosts); never under the countdown ring; width guard: pages never exceed
  x 90–990 (long pages shrink to 56/48 px, then wrap to two lines).
- Outro: the brand end-card starts after the last spoken line and dissolves in over 7 frames; no spoken "follow us"
  (the end-card says it).
- Round changes: the next card slides in from the right on the whoosh (no blank/translucent frame).
- shell_game asks its question only after the last swap ends.
- Master: loudness-normalised audio is re-stamped and padded to the exact video length (fixes `av_length_match`
  failures of ~0.09 s on some renders).
- peek_number: run the fairness proof before building (below).

**Pipeline rules added after pilot QA round 2 + z5hx/gu0d QA (2026-10-22, v6):**
- Captions are **take-true**: caption words are aligned to what the narration take actually says (Whisper on the
  tightened take). Same word (spelling variants, Eastern digits, «لـ ٩» ~ «لتسعة») → the script's caption spelling with
  the take's timing; a different spoken word → the spoken word; words Whisper merged or missed are kept. Pages split at
  pauses ≥ 0.3 s and stay up until their last word has ended.
- The countdown ring starts entering only after the question's last word has ended.
- Ding: −12 dB, and automatically lowered so it stays ≥ 5 dB under the first 0.5 s of the answer line (measured RMS).
- Headlines hard-cut at every handover (no two headlines on screen).
- Later rounds: the card slides in with its puzzle already built (intro pops only animate in round 1, the hook).
- peek_number: the cover is hidden once it has slid off the card (no fragment on the card exit).
- Outro: the alpha end-card (`endcard-alpha.webm`) plays over the round background from its first frame while the score
  card fades out (no wordmark ghost / re-wipe).
- Music bed: Karplus-Strong bug fixed (an uninitialised read could blow a pluck up to 1e252, and normalisation then
  left the whole bed near-silent — gu0d v2). The synth now refuses non-finite/exploding audio and the build fails if the
  bed is not within −30…−12 LUFS.
- Master: true peak verified on the encoded file and the limiter tightened until ≤ −1.6 dBTP; techqa now fails above
  −1.5 dBTP.
- OpenChatCut import: media are stamped per build and named by content hash (OCC silently skips duplicate content).
- `assets.json` is MERGED on every build (renders, narration, synthesized, brand; existing art entries, `rights` and any
  other keys are kept; files gone from disk are flagged `missing`).
- peek-proof guards both ends: `visible_ink_pct` ≤ `--max-ink` (15) and `min_diff` ≥ `--min-diff` (0.12); aim for
  min_diff ≈ 0.15–0.25 (unique but not obvious). Pilot v6: 14.4 % ink, min_diff 0.25.

**Pipeline rules added after pilot QA round 3 (2026-10-22, v13):**
- Caption reconciliation (`packages/quiz/py/caption_match.py`, test: `python -I packages/quiz/py/test_caption_match.py`):
  the SCRIPT word is shown (with Whisper's timing) whenever the heard word is a near match (normalised ratio ≥ 0.5), a
  merge of script words, or an exact split; the HEARD word only when the take clearly says something else (then update
  the script). Every difference is logged in `v<n>/captions_audit.json` (script, heard, kind, shown) and summarised in
  the build log.
- Captions: digits → Eastern Arabic, `? , ;` → `؟ ، ؛` (opt out: quiz.json `"caption_digits": "keep"`).
- Caption onsets: a word that Whisper starts on the previous word's tail and runs across a pause starts after that
  pause (measured caption lead on the pilot: ≤ 0.04 s).
- Intro-pop SFX are dropped in later rounds (their puzzles arrive built); the score tiles always pop in, one pop each.
- End-card starts 2 frames earlier and the score card cross-fades under its growing logo (no near-empty frame).
- Reveal flash eased over 3 frames in / 9 out, peak scaled by the puzzle's mean luma (0.2–0.45; vector
  spot_difference panels 0.3; `params.flash_peak` overrides) — never trips techqa `no_flash_frames`.
- peek_number range chip sits on the white card under the cover (`range_top` 650, `range_px` 60).

**Pipeline state after the 2026-10-22 consolidated change (pilot v16; supersedes conflicting notes above):**
- Captions: per narration line; a page never holds a >= 0.3 s pause (a pause right after a particle splits before it);
  pages > 22 chars split at sentence punctuation (! ؟ . …) first, then commas, and only beyond 25 chars inside a phrase at
  the most balanced gap; no page ends on a particle/glue word or a <= 2-letter word; a page starts on its first word's
  onset and holds until its last word (line-final: the line's speech end); hard cuts; never under the countdown ring, into
  a round change or the end-card. Max 22 chars per page.
- Word onsets: speech-activity onsets (-45 dBFS after >= 80 ms silence, the QA metric) inside a Whisper word span move its
  start, except a < 0.2 s closure right after a <= 0.15 s word-initial syllable (geminate: ركّز، التانية); line edges move
  back up to 0.15 s to a soft first consonant (س).
- Regression guard: `python -I packages/quiz/py/regress.py productions/<id> v<a> v<b> ...` prints caption groups, caption
  lead vs speech onset (must be within +-1 frame), ring-entry vs question speech end, ding margins, end-card frames.
- Every round, round 1 included, shows its puzzle built and its headline in place from frame 0 (`Q.intro` collapses
  intro pops). Round change: the outgoing card slides to a left-edge sliver on the clip's last frame, the incoming one
  starts as a right-edge sliver — every frame has a card; techqa adds `card_on_every_round_change` (fails the build).
- Answer regions: `params.answer_boxes` (card px) + template-derived (spot_difference differences, image_reveal
  focus/stagger/slide, follow_path target end, peek_number peek). The explanation chip (`params.explain_slots`) and the
  countdown ring (`params.cd_pos` to force) pick the first free slot / corner, or the plan fails.
- image_reveal: dim layer darkens non-answers (45 % ink, `params.dim_color`); reveal rings/marks paint above the dim and
  the highlight box. spot_difference: the copy-panel tag moves left when a difference ring is in its corner.
- shell_game: row centred (`params.base_y`, default 560); moving cups arc 120 px up / 60 px down (180 px apart).
- sequence: `reveal_stack: true` builds the answer stack on the answer slot at the reveal (scaled to fit) or shows a big
  green answer digit; step labels are pills (`steps_px`, default 44).
- memory_flash: face-up from frame 0 (`timings.intro` delays the face-up start).
- score_cta: tiles are pre-built on the incoming card and pulse one by one with a pop each.
- Narration fixes without a new take: `narration.pins` (`{"<line>": {"file", "sha256", "from", "to"}}`, sha-checked) and
  `narration.line_tempo` (`{"<line>": 0.8}`); both re-aligned. The stem ASR check logs words that did not transcribe
  (different / not heard / weak near-miss) to the build log and `pipeline.json` voice.asr_flags.
- OCC import retries transient failures (up to 3 times).
- Caption onsets (batched polish, 2026-10-22): every page start snaps to the speech-activity onset it owns on the
  narration-only track (the regress.py metric: -45 dBFS after >= 80 ms silence; owned = nearest onset within 0.6 s whose
  nearest page start is this page; never before the previous page + 0.2 s or past the page's last word). techqa adds
  `caption_onsets_within_2_frames` (fails the build; misses listed in `caption_onset_misses`). Dev check without a
  render: `npx tsx packages/quiz/src/dev-onsets.ts <id> v<n>`.
- Short enumerations stay on one page (no pause split inside «زهري وأحمر وكحلي…»: a word + following و-items up to
  sentence punctuation, if <= 22 chars).
- Overlay clearance: `objectBoxes` = answer regions + `params.object_boxes` + measured content of full-card art
  (image_reveal puzzle/reveal/layers, 20 px cells). The explanation chip (estimated text width) avoids all of them;
  full-card art with no free slot makes room (the stage scales down from its top edge as the chip arrives, `room`
  >= 0.8; opt out `params.explain_room: false`), otherwise the plan fails. The countdown ring avoids object boxes and
  keeps >= 24 px from the peek range chip and the options pills (`chipBoxes`); a forced `cd_pos` that violates this fails.
- End-card: the full lockup (last frame of `endcard-alpha.webm`) dissolves in over 0.2 s and holds (built per build).
- `regress.py` and `test_caption_match.py` reconfigure stdout to UTF-8 (plain `python -I` works on Windows);
  peek-proof tolerates EPERM/EBUSY when clearing its temp folder on E:.
- `npm run -s cli -- quiz:assets <id>` re-hashes every file listed in assets.json (any section; `sha256` and
  `sha256_16`; previous values kept in `sha256_history`) and merges the latest build + quiz.json art (`art_used`);
  quiz:build does the same at the end of every build.
- **Answer-leak fix + guard (2026-10-22, occ-producer):** sequence's green answer digit / answer stack / green chip face
  were intro targets (`Q.intro` sets opacity 1 at t = 0), so the answer showed under «؟» for the whole question (aecz v4
  R1, 3uyp v3 R2). They are now hidden (visibility) until the reveal. Guard: `puzzle()` declares `leak` boxes (sequence:
  answer slot + missing chip; every round with options: the pills); after each round render the build samples 5 half-res
  frames from 0.35 s to the reveal and **fails** if >= 40 correct-green (#22D489 ±) pixels show in a box. Dev check on an
  existing version: `npx tsx packages/quiz/src/dev-leak.ts <id> v<n>`.
- shell_game crowding check (`quiz:plan` fails): every swap is simulated (power2.inOut slide, sine arc) and any two objects,
  moving or static, whose centres come closer than 0.75 x object width (> 25 % overlap) fail the plan. Default arcs (120 up
  / 60 down) pass only adjacent swaps; `params.arc: "scaled"` grows both arcs with the swap distance (and >= 0.8 x object
  width) so any swap passes (3 cups: the lifted cup may rise into the headline band — check the frame).
- follow_path: the countdown ring avoids every end image and start label (takes a free corner).
- spot_difference: the explanation chip never sits on a panel — the panels (in `#stage`) scale from their top edge as the
  chip arrives (room ≈ 0.87) and the chip takes the bottom slot.
- Headlines auto-shrink: one line from the kind's size down to 56 px (≈ 0.5 em/char), then two lines at <= 60 px (answer
  pill <= 54 px); longer fails the plan.
- what_changed (colour mode, multi-row grids): the old-item ghost sits on its own cell's top-left corner (single row: above).
- Caption onsets: a page owns the nearest onset among those whose nearest page start is that page (a page after a short
  word, «عشرة! | كل كومة…», no longer loses its onset to the previous word); aligner pause-stretch also catches a word
  whose Whisper end sits right on the real onset after a >= 0.25 s pause (3uyp «كل» led 0.49 s → 0).

**Batch-4 polish (2026-10-23, one change):**
- memory_flash 3×3: `cells` with 9 entries (228 px cards, 250 px pitch, grid ends at card y 736 above the ring/chip);
  default `timings.flash` 1.1 s (2×2 stays 1.5 s); flip wave 0.025 s stagger, question ≥ 0.5 s after the flip. Checked:
  4 or 9 cells, answer in range, the answer object in exactly one cell, 3×3 has ≥ 4 different objects. Still face-up from
  frame 0. All cards are object boxes and the answer card an answer box (ring/chip avoid them); leak guard samples the
  ring band around the answer card (outside the face, so green art never trips it).
- memory_flash reveal: the answer card flips flat (0.4 s), holds 3 frames, then ring + tick + pulse (eqw1).
- Small-object auto-scale (shell_game fade mode, what_changed, memory_flash): when any image shows < 135 px of visible
  (alpha) content at 1080 (≈ 45 px at 360), all images of the round share one content-fitted size targeting ≈ 150 px for
  the narrowest object, capped by the slot (shell_game: 0.92 × spacing, 320 px high; what_changed: 0.94 × pitch;
  memory_flash: 0.92 × card face). An auto-scaled shell_game row centres its content at card y 410 (unless `base_y`);
  crowding/arcs use the scaled width. `quiz:plan` lists each auto-scale in `notes` (and says when tall/narrow art is still
  < 135 px: crop tighter or use fewer cells); the build log repeats them. Opt out: `params.auto_scale: false`.
- what_changed: slot circles and the green ring are clamped inside the cell pitch; the colour-mode ghost (multi-row) is a
  white «it was this» badge inside its own cell (5qn3 r2: the ghost door overlapped the neighbour).
- image_reveal odd-one-out by tilt: declare `params.odd: {tilt, jitter}` (degrees, from the art script); the plan fails
  if the decoy jitter exceeds `params.jitter_max` (default 2.5°) or the odd tilt is < 3 × the jitter / ≤ jitter_max. Art
  scripts must draw decoy jitter within ±jitter_max.
- Captions: `caption_match` partitions a heard span word by word, so a compound Whisper splits keeps the script spelling
  (doubled letter at the join collapses: «لها القبعة» → «لهالقبعة», also next to a near-miss); a heard multi-digit number
  («17») vs a script number word is a near-miss (kind `number`). Aligner: a line-edge pause must lie between the previous
  line's last word start and the next line's first word end, and a heard word at a line's end equal to the next line's
  first caption word (`edge_spill`, «كم») is handed to the next line (x5iz take re-aligned: «17 كم» → «سبعطعش!», «كم»
  only in o1). Tests: `python -I packages/quiz/py/test_caption_match.py` (18 cases).

## Templates

### colour_reveal — "Which <object> is <colour>?" (grayscale → colour)
| param | type | meaning |
|---|---|---|
| `items[]` | `{color, gray, swatch, luma}` | 2–4 objects, cut-out PNGs (`*_c.png` colour, `*_g.png` grey from `prep_images.py`) |
| `answer` | int | index (viewer's left = 0) |
- `layout: "column"` stacks the items in rows (viewer's top = index 0), each up to `item_w` (640) px wide, with the
  swatch to the right — for wide objects (shoes, cars). Answer phrasing then is فوق / بالنص / تحت.
- Reveal: all objects fade to colour, the answer pulses; explanation time shows a grey swatch under (or beside) each object.
- **Verifiability:** fair only if the greys are clearly ordered. `prep_images.py` reports `body_luma_mean`; keep ≥ 0.10
  apart. Optional `QUIZ_GRAY_GAMMA` (e.g. 0.7) is a monotonic tone curve: it keeps the order and spreads the darks.
- Typical: 9–10.5 s (with a hook line). Frame 1 already shows the puzzle when it is the first round.

### shell_game — follow the object (cups, or identical-grey covers)
| param | type | meaning |
|---|---|---|
| `object` | path | cup mode: cut-out PNG placed under a cup |
| `cups` | 2–5 | cup mode: number of cups (default 3); slots spread evenly, outer slots stay left of x 950 |
| `object_h` | px | cup mode: object height (default 0.6 × cup width) |
| `start` | slot | cup mode: slot (viewer's left = 0) the object starts in |
| `items` | paths[] | **fade mode** (replaces cups): one image per slot, shown in colour for `timings.show` s, then all cross-fade to `cover` |
| `cover` | path | fade mode: ONE image used for every slot (pixel-identical covers) |
| `target` | slot | fade mode: the item to follow |
| `swaps` | `[[a,b],…]` | slot pairs exchanged in order (visible eased arcs, one up one down) |
| `answer` | slot | final slot — **the builder simulates the swaps and refuses a mismatch** |
| `arc` | `"scaled"` | optional: arcs grow with the swap distance (required for non-adjacent swaps; plan checks crowding) |
| `auto_scale` | bool | fade mode, default true: items/cover under 135 px of content scale up together; the row centres at y 410 |
| `timings.swap` / `timings.show` | s | seconds per swap (default 0.8; ≥ 0.6 stays trackable) / colour look time (fade mode, default 1.1) |
- Reveal: cup mode lifts the answer cup; fade mode cross-fades every cover back to its true item, target pulses + glow + tick.
- Typical: 9.4 s (3 cups, 3 swaps at 0.8 s, measured); about +0.9 s per extra swap.

### memory_flash — remember where it was
| param | type | meaning |
|---|---|---|
| `cells` | 4 or 9 × (path \| `icon:star\|ball\|leaf`) | 2×2 or 3×3 grid, row-major from the viewer's top-left |
| `answer` | 0–3 / 0–8 | cell index (its object must appear in no other cell) |
| `timings.flash` | s | face-up time before the flip (default 1.5 for 2×2, 1.1 for 3×3; rules v2: 0.7–0.9 / 1.0–1.2) |
- Reveal: the answer card flips back face-up, lies flat 3 frames, then ring + tick. Verifiable: the answer was shown.
- Typical: 9–9.5 s.

### peek_number — what is hidden behind the object?
| param | type | meaning |
|---|---|---|
| `glyph` | string | digit/letter drawn in Cairo Black (`digit_px`, `digit_top`) |
| `cover` | path | cut-out PNG hiding it (`cover_left/top/w`, card px) |
| `peek` | `[x, y, d]` | card px of the clue circle drawn after the reveal |
| `range_ar` | string | chip with the answer range, e.g. "بين ١ و ٩" |
| `answer_ar` | string | for the record (headline comes from `a_line`) |
- `cover_clip`: CSS clip-path for the cover (e.g. `ellipse(49% 35% at 50% 39%)` keeps only a flower's bloom).
- ONE digit system per round: Eastern glyph (٧) + Eastern range chip (بين ١ و ٩) + Eastern digits in the explanation.
- Reveal: the cover slides out of frame; the clue circle (`peek`) must sit on the part that was actually visible.
- **Fairness proof (required):** `npx tsx packages/quiz/src/peek-proof.ts <production> <roundId> [--max-ink=15] [--min-diff=0.12]`
  renders the round with every candidate glyph (١–٩ or 1–9) behind the same cover plus the answer uncovered, takes the
  visible ink at phone scale (card 360 px wide) and passes only if the answer shows ≤ max-ink % of its glyph (not obvious)
  and every other candidate differs by ≥ min-diff of the visible pixels (unique); it prints a suggested `peek` circle.
  Pilot v6: bottom tip only, 14.4 % of the ٧, nearest other digit (١) differs 25 %.
- **Verifiability:** the visible part must identify the glyph uniquely within `range_ar` (pilot: the 7's flat top bar +
  vertical right corner; no other digit 1–9 has a straight downstroke at the top-right). Check with `quiz:plan --snapshots`.
- Typical: 9.5–10 s.

### score_cta — outro
| param | type | meaning |
|---|---|---|
| `max` | int | number of rounds (tiles ٠…max, the top tile highlighted) |
| `cta_ar` | string | comment prompt under the tiles |
| `timings.endcard` | s | end-card length (brand end-card is 1.4 s; it is laid on V3 over our fallback slate) |
- Typical: 5–6 s.

### image_reveal — generic stage image → reveal (odd one out, count, size illusion, hidden shape, exploded view)
All art is 900×860 (the puzzle stage), transparent, drawn on the white card.
| param | type | meaning |
|---|---|---|
| `puzzle` / `reveal` | path | stage image / reveal overlay (or replacement) |
| `mode` | `overlay` \| `replace` | add `reveal` on top (0.25 s fade) / cross-fade puzzle → reveal (0.35 s) |
| `build` | `pop` \| `grid` | whole image pops / cell-by-cell pop with `grid: [rows, cols]` (0.04 s stagger) |
| `focus` | `{x,y,w,h}` | at the reveal: everything outside the box washes to 40 %, the box pulses, tick badge |
| `slide` | `{x,y,w,h,dx,dy}` | at reveal + 0.6 s: that region is cut out (white) and moved by (dx, dy) over 0.6 s |
| `layers` | `{surround, targets}` | split art: both at 100 % until the reveal, then the surround fades to 15 % (size illusions) |
| `fade_puzzle` | 0–1 | puzzle opacity after the reveal |
| `stagger_reveal` | `[{x,y,w,h}]` | reveal the overlay box by box, 0.2 s apart (numbered counting), pop SFX each |
| `sting` | bool | open with the "hardest" sting |
| `odd` / `jitter_max` | `{tilt, jitter}` deg / deg | odd-one-out by tilt: checked jitter ≤ jitter_max (2.5) and tilt ≥ 3 × jitter |
- **Fairness:** the grid build hands over to the untouched full puzzle image as soon as it settles — every cell is at
  exactly 100 %, no tint or vignette, until the reveal. Nothing dims before the reveal.
- Typical: 6.7–7.4 s + narration (the round extends itself so stagger/slide animations finish).

### follow_path — tangled lines
| param | type | meaning |
|---|---|---|
| `paths` | `{label: svgPathD}` | card coords; all lines drawn in ink #1D1548 (never coloured) |
| `labels` | `[{text, x, y?}]` | start discs (y default 70) |
| `ends` | `[{img, x}]` | end images (top `end_top` 690, height `end_h` 150) |
| `answer` / `target_end` | label / x | the line that reaches the target end |
| `stroke`, `min_gap` | px | line width (16) / minimum distance between lines away from crossings (40) |
- **Checked by the builder** (`checkPaths`): every path ends on a declared end; only `answer` ends on `target_end`; two
  lines come closer than `min_gap` only where they really cross (ocxp R2 paths pass). Dev check:
  `npx tsx packages/quiz/src/dev-paths.ts <paths.json>`.
- Reveal: the answer line is traced in `correct` green over 1.2 s, the others fade to 35 %, tick on the target end.
  The explanation chip sits under the start labels.
- Typical: 6.7 s + narration.

### sequence — what comes next?
| param | type | meaning |
|---|---|---|
| `items` | `[{count} \| {img} \| {count:null}]` | laid out **right to left** (item 0 at the viewer's right); `count:null` = the missing item |
| `unit` / `base` | path | stacked unit (e.g. scoop) on a base (cone); sizes `unit_w` 100, `base_w` 95, `base_h` 180, `step` 40, `row_bottom` 600 |
| `answer` | string | e.g. "١١" (Eastern digits accepted) |
| `rule` | `arithmetic` \| `diff_increasing` \| `geometric` | **checked**: the rule applied to the counts must give `answer` |
| `options_ar` | string[] | options row; the matching pill turns green at the reveal |
| `steps_ar` | string[] | step labels popping between consecutive chips after the reveal (the "why") |
- Typical: 6.7 s + narration.

### what_changed — before / after memory
| param | type | meaning |
|---|---|---|
| `grid` | `[cols, rows]` | e.g. `[4,1]`, `[3,2]` |
| `before` / `after` | paths[] | row-major from the viewer's top-left; equal length = cols × rows |
| `mode` | `colour` \| `swap` | one cell changes / two cells exchange |
| `answer` | int[] | the changed cell indices — **checked** against before/after; swap mode: same multiset, exactly 2 cells |
| `timings.look` | s | look time before the shutter blink (default 1.8) |
| `auto_scale` | bool | default true: small art (< 135 px content) is content-fitted up to 0.94 × the cell pitch |
- Shutter: brand-gradient bars sweep closed and open (0.35 s, whoosh); the images swap while it is closed.
- Reveal: colour mode floats a ghost of the old item above the changed cell; swap mode draws dashed ghosts + two accent
  arcs; glow + tick on every changed cell.
- Typical: 9.0–9.2 s with a set line.

### spot_difference — count the differences
| param | type | meaning |
|---|---|---|
| `top` / `bottom` | `{bg, items:[{img,x,y}]}` | panel art (panel 820×420 at `panel_scale` 0.98; top at y 5, bottom at y 435, x 40) |
| `item_w` | px | item size inside a panel (130) |
| `differences` | `[{x,y,r,label?}]` | bottom-panel coords; rings pop 0.35 s apart with pop SFX; labels beside the rings |
| `answer` | string | **checked**: must equal the number of `differences` |
| `top_label` / `bottom_label` | string | defaults "الأصل" / "النسخة" |
- The explanation chip sits under the panels (they scale up-wards to make room); the ring sits at the left edge between the panels.
- Typical: 8 s with a set line (aim for ≥ 5.5 s of look time before the reveal once narration is measured).

### Dev harness
`npx tsx packages/quiz/src/dev-tpl.ts <rounds.json> [roundId]` renders snapshot frames for test rounds without a
production record (`{"assetsDir": "<production dir>", "rounds": [ … ]}`, optional `set`/`q`/`a` headline texts).

## Open final round (owner 2026-11-08)
The video does NOT have to end on «كم جبت؟». The LAST puzzle round may be an OPEN round: a real puzzle whose answer is never revealed in the video; the answer is posted later by the owner as a pinned comment (`comments-draft.py` drafts it).
- **When:** the owner wants it on most videos; mix with the score-ask ending (SR3) so the channel keeps both.
- **Round types:** counting (image_reveal / spot_difference), shell_game, odd-one-out, follow_path, sequence, what_changed - any puzzle with exactly one right answer. Prefer ones where the viewer can answer with one number or word (OE counting lines: «اكتب الرقم»).
- **quiz.json shape (last round only):** `{"id":"r3","type":"follow_path","open":true,"q_line":"r3-q","post_lines":["oe"],"params":{...,"answer":4},"timings":{"cd":2.0}}` - NO `a_line`, NO `explanation_ar`, NO `end_question`. `params.answer` (or `answer_ar`) stays stored for the pinned comment and puzzle-judge, never rendered.
- **Rule (simplest):** question + countdown play as normal (ring ends on the last beat, ticks only; no ding / flash / glow / tick badge / explanation / answer headline); then the closing ask line from `open-endings.md` is spoken (0.25 s after the countdown) and its `onscreen_ar` replaces the question as the big on-screen text (the closing ask IS the end text, `end_question` is not allowed); `loop: "zoom"` + `no_endcard` return to frame 0. Round has no `reveal` SFX and adds no reveal marker to the music bed.
- **Script lines:** the closing ask is a normal script line (`narration_ar`, `onscreen_ar`, `caption_ar`) taken from the bank (log its id, e.g. OE04, in `notes`).
- **Fairness is unchanged:** exactly one right answer, no leak (the answer-leak guard still samples the question phase up to the countdown end), judged by puzzle-judge stage P. Difficulty 6-8 so the comments split between answers.
- **Checks:** techqa / text-safety / prelint need no reveal frame for an open round; the leak guard, text-safety and frame checks still cover the question phase and the closing ask.

## SFX library (`data/brand/quiz-ar/sfx/`, original, numpy-synthesized by `packages/quiz/py/synth_audio.py`)
tick, tick_last, whoosh, swap, pop, ding (two-note "correct"), shimmer, sting, flip. Music: `synth_audio.py bed` —
original plucked I–V–vi–IV bed, dips on every reveal, ducked ≈10 dB under narration in OCC (volume keyframes).

## Backlog
Shipped 2026-10-22 from the template requests: shell_game N cups + `object_h` + fade mode (colour_shuffle), follow_path,
sequence, what_changed, spot_difference, image_reveal, options row. End-card: always appended on V3 by the builder
(1.4 s brand end-card after the score line), no flag needed. Not yet: inline-SVG layer lift for exploded views
(gu0d R4 uses the `replace` cross-fade fallback); filling the missing stack on the sequence reveal.

## Next batched pipeline polish
Done 2026-10-22 (see "Pipeline state" above). Queue new items here.

## Polish queue (after the 2026-10-22 polish pass)
- card_on_every_round_change: saturation-based detector already counts dimmed/panel cards (orchestrator change); spot_difference panel_scale workaround no longer needed — verify on next build.
- Difficulty: next batches should ramp harder (aecz R1 +2 arithmetic and R3 5 distinct colours were easy) — showrunner guidance.
- Approved videos that now fail the shell_game crowding check (not rebuilt; content is the orchestrator's call): j5qw r2,
  m52q r2, ocxp r3, 7wti r2; in production: 3uyp r1, 60tv r4, ux4u r4.
- End-card default lowered to 1.3 s (1.4 s tripped techqa no_freeze) — done by orchestrator in templates.ts.
- Next batches: 4 rounds (~35–40 s) instead of 3 — QA says 3 rounds is thin on value.
- Done 2026-10-23 (batch-4 polish, see "Pipeline state"): memory_flash 3×3, flat-hold before the ring, small-object
  auto-scale + row centring, what_changed ghost/ring inside its cell, aligner «كم» spill + «لهالقبعة» compound, `jitter_max`.
- Approved art still under 135 px after auto-scale (notes from `quiz:plan`, not rebuilt): e7du r3 (99 px), eqw1 r1 (61 px) and r3 (88 px).
- (batch 4 QA) Colour rounds: naming colours in on-screen order leaks position; never list options in display order, and avoid hues whose grey rank is common sense (yellow=lightest, navy=darkest) as the only near neighbours.
- Shell games with IDENTICAL covers: adjacent swaps only at ≤0.45 s (non-adjacent [0,2] stacked 3 identical totes in one column at 6go7 3.0 s) — consider making quiz:plan enforce this when covers are identical.
- Sequence template prints stack numerals; for difficulty, add `hide_counts` (numerals appear at the reveal).
