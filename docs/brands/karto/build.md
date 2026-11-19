# Karto builder (`packages/cutout`) — 2026-11-18

Builds the Karto long-form video (16:9, 9-12 min, English or Arabic, two speakers) and the 9:16 Shorts cut from it, from
`productions/<id>/film.json`. The picture is captured from the cutout page (`packages/cutout/web/frame.html`, kit engineer);
until it exists the builder uses the stub `packages/cutout/web-stub/frame.html`. Contract: `CONTRACT.md` (this folder).
Builder code: `packages/cutout/src/**` (not wired into the studio CLI; same as test3d).

## Commands
```
npx tsx packages/cutout/src/cli.ts make-film-json <slug> [--storyboard <file>] [--create]   # storyboard -> the two film.json files
npx tsx packages/cutout/src/cli.ts build <id> --draft                                      # no TTS: draft/score.json, show.json, chapters.txt, 2 page stills per chapter
npx tsx packages/cutout/src/cli.ts build <id> [--reason "..."] [--workers 4]               # full build -> vN/render.mp4
npx tsx packages/cutout/src/cli.ts build <id> --chapters c03,c07 --reason "..."            # re-capture those chapters' picture, reuse the rest from the previous version
npx tsx packages/cutout/src/cli.ts build <id> --resume                                     # after a crash: reuse every still-valid segment
npx tsx packages/cutout/src/cli.ts preview <id> --chapter c03 | --from 120 --to 150 [--width 960] [--version N|draft]
npx tsx packages/cutout/src/cli.ts snap <id> --times 61.5,200 | --lines l010,l020 [--width 640] [--layout wide|tall] [--version N|draft]
npx tsx packages/cutout/src/cli.ts shorts <id> [--only s1,s3] [--draft] [--workers N]      # -> productions/<id>/shorts/<sid>/render.mp4 + short.json
npx tsx packages/cutout/src/cli.ts sheets <id> [--version N] [--every 1] [--short s1]       # QA sheets from a render
npx tsx packages/cutout/src/cli.ts new --brand karto-en|karto-ar --title "..." [--dry-run] # DB production expl-yyMMdd-xxxx (+ brand rows when missing)
npx tsx packages/cutout/src/cli.ts sfx-table                                               # rewrite packages/cutout/sfx.json
```
Common flags: `--page <dir>` (another frame.html folder; default `packages/cutout/web` when it has frame.html, else the stub),
`--keep-work` (keep picture.mp4 / render.raw.mp4 / mix stems), `--agent A`.

## Storyboard -> film.json
`docs/brands/karto/<slug>/storyboard.json` is the single source for both languages (shape in the header of
`packages/cutout/src/make-film-json.ts`): `productions {en, ar}`, `title/hook_text/end_text {en, ar}`, `cast` (voice shared or per
language, style per language), `chapters[{id, title{en,ar}, mood, lines[{id, who, en, ar, picture, motion, asset?, pause_after?}]}]`,
`strings {key: {en, ar}}`, `shorts[{id, from, to, hook_text{en,ar}, cta{who, text{en,ar}}, retake?}]`. Every line needs both
languages (1:1 ids); a line without `picture`/`motion` is warned. `--create` makes the two DB productions when `productions` is
missing and writes their ids back. Kept across runs from the old film.json: `chapters[].retake`, `retake`, `max_wer`.

film.json fields beyond the contract: `tts_mode` (`dialogue` default | `turns`), `max_wer` (default en 0.08, ar 0.25), `music_seed`,
`retake` (film-wide TTS cache salt), `shorts[].retake`. Defaults: `chapter_gap` 1.0 s (0.4-3), `tail` 2.0 s (0.5-30; use 10-20 for an
end screen), `captions` true.

**Text rules** (build refuses): digits only in `strings` (ASCII, Arabic-Indic and Persian digits are all refused in lines, titles,
hook/end text, Short hooks and CTA text: spell numbers out); no AI-generation wording anywhere (`aiTextHits`, strings included);
chapter ids `[a-z][a-z0-9_]*`, line ids free-form and unique, `who` = `karto | skip`, moods `calm curious tension rise drop warm`.

## Pipeline (`productions/<id>/vN/`)
1. **Narration** (`narrate.ts`): a take = consecutive lines of one chapter up to ~60 s (165 words en / 140 ar, balanced split at
   line boundaries). A take with both speakers = ONE Gemini multi-speaker call (`synthesizeDialogue` in
   `packages/voice/src/gemini-tts.ts`: `multiSpeakerVoiceConfig`, transcript lines `Karto:` / `Skip:` with Latin labels in both
   languages, both styles in one DIRECTOR'S NOTES block); a one-speaker take = plain `synthesize`. Cached by text + speakers + voices
   + styles + retake (`data/cache/tts`), copied to `productions/<id>/voice/`. If every model refuses multi-speaker (HTTP 400) the
   build falls back to `turns` (one single-voice take per run of same-speaker lines) and logs it (`build.json.dialogue_fallback`).
   Alignment: `align.py --lang en|ar` (cached per take in `voice/align-<hash>.json`). Arabic comparison is diacritics-insensitive
   (tashkeel/tatweel dropped, alef/ya/ta-marbuta/hamza seats unified). **Gates per take**: WER <= `max_wer`; the take opens with the
   script (first or second script word within the first 3-4 ASR words); no style/preamble words in the first ~9 ASR words; no spoken
   speaker label (ASR "karto/skip/كرتو/سكيب" beyond the script's own); ASR word count <= 1.25x the script; first word within 1.5 s.
   All failing takes are listed in one error -> raise those chapters' `retake`.
   **Levels**: every take gained to the median take loudness (+-6 dB), then each speaker's median line RMS to the overall median
   (+-4 dB). Layout: pause inside a take = its own pause clamped 0.3-0.75 s, 0.55 s between takes of a chapter, `chapter_gap` between
   chapters, plus `pause_after`. Per-line clips `narration/line-<id>.wav`, placements `narration/placed.json`, report `narration/takes.json`.
2. **score.json / show.json**: score = `{fps, width, height, duration, lang, lines[{id, chapter, who, text, t0, t1, words[{w,t0,t1}]}], chapters[{id, title, t0, t1, mood}]}`;
   duration = last word + `tail`; chapter bounds at the middle of the gap (frame-snapped). show.json = the contract shape exactly
   (no extra fields on the film; a Short's CTA line carries `cta: true`, see below).
3. **Picture**: one page session first (`__load` -> `cues` checked against sfx.json, `lint` logged), then one segment per chapter
   captured by `capturePicture` (quizlong, N Chrome workers, `timeOf` = film time) -> `segments/<chapter>.mp4`, `segments.json`
   after every segment, joined by stream copy, frame count checked. Reuse (`--chapters`, `--resume`): a segment is reused only when
   its key matches (frame range, size, page folder, hook/end text, strings, captions flag, lang and that chapter's words + times); the
   kit + film folder hash is recorded per segment and a reused segment captured with another kit is warned (list it in `--chapters`).
   Server allow-list: `packages/cutout`, `data/brand`, `node_modules`, the production folder (show at `/__show/show.json` too).
4. **Captions** are drawn by the page from the score words. The builder writes `captions.srt` (one cue per sentence or per line end,
   Latin + Arabic sentence marks, split near a clause mark when over 2 x 42 characters, no overlaps; Arabic as plain logical-order
   Unicode, no bidi control characters) and `chapters.txt` (`0:00 Title`; warns under 3 chapters or a chapter under 10 s). No timeline
   text cards, no hook/end cards: the page draws them.
5. **Audio**: narration premix (`narration/narration.wav`), SFX lane from the page cues (`sfx.wav`), `musicBedLong` (test3d) with the
   chapter moods (`music_seed`), ducked -24 dBFS between lines / -32 under speech; summed (peak kept <= -1 dBFS), muxed with the
   picture (stream copy) -> `master()` (-14 LUFS, <= -1.6 dBTP) -> `render.mp4` -> techqa (`--size`, `--sheet-step 10` over 2 min)
   -> 360 px stills (`qa/stills`). picture.mp4, render.raw.mp4 and the stems are removed after master unless `--keep-work`.
6. **DB**: when `productions` has the id: `versions` row (captions path, notes = report, render, techqa), `productions.version`,
   state `editing`, `build.step` events. Fixture ids (`_fixture-...`) have no row (files only). Studio CLI gates do not apply.

## SFX (`packages/cutout/sfx.json`)
One name -> one source. Paper foley files from `data/brand/shu-lab/sfx/` (slide, slide-long, rustle, flip, fold, unfold, snip,
thud, stamp, scratch, rip, tap, tick, pop, whoosh, rewind, sting) and the test3d procedural sounds (pour, riser, hit, ding, coin,
chime, swell; plus tick-synth, thud-synth, whoosh-synth, tap-synth where the paper sound took the name). Cue `db` = the sound's
peak in dBFS (default -12), `dur` only for `uses_dur` sounds (pour, riser, swell). Unknown names fail a real build (draft: warning).

## Shorts (`shorts.ts`)
`film.json.shorts[] = {id, from, to, hook_text, cta: {who, text}}`. Needs a voiced version of the film (latest, or `--version`).
- Window: film time `t0` = first line - 0.35 s; the film's own line clips (same gains) for from..to; ONE extra CTA line (single-voice
  TTS in that speaker's voice, cached, aligned, same gates) 0.5 s after the last line, level-matched to that speaker's median line;
  the Short ends 0.9 s after the CTA's last word (`t1`).
- show.json: `layout "tall"` (1080x1920), `window {t0, t1}`, `short {id, hook_text, cta_text, t0, t1}`, `lines` = only the Short's
  lines + the CTA line `{id: "cta", chapter, who, text, t0, t1, words, cta: true}` (film times), `chapters` clipped to the window,
  `duration` = `t1`, `end_text` "". The page draws the hook and the "full video" card.
- Own bed (chapter moods inside the window, seed from `music_seed` + short id), the page cues inside the window, master, techqa
  -> `productions/<id>/shorts/<sid>/{render.mp4, short.json, show.json, captions.srt, cues.json, qa/}`. Target 25-58 s (warned).
- `--draft`: estimated CTA (no TTS), show.json + 3 page stills in `shorts/<sid>/draft/`.

## QA sheets (`sheets`)
Per-line: one frame at the middle of every line (12 per sheet, 4 x 3, 480 px cells), `id · who · time` + the line text UNDER the
frame -> `vN/qa/line-sheets/sheet-NN.jpg`. `--every 1`: one frame per second, 30 per sheet (6 x 5) with the time code under each
-> `vN/qa/time-sheets/`. Labels are laid out by Chrome (Arabic shaped, right to left). `--short s1` = the Short's render.

## Measured (fixtures `productions/_fixture-cutout-en|ar`, stub page, 2026-11-18)
See the fixture results in the engineer's report; capture ~45-55 frames/s with 3-4 workers on the stub.

## Known limits
- Arabic WER is measured against Whisper large-v3's MSA-leaning spelling of dialect words; the default gate is 0.25 (tune per film
  with `max_wer`). Numbers Whisper writes as digits in an Arabic take are compared through English number words (align.py), so they
  count as misses: keep spoken numbers few, or raise `max_wer` slightly for number-heavy chapters.
- The segment key does not include the kit/film.js (hash recorded and warned); after a kit change re-capture with `--chapters`.
- A Short is re-captured whole (no segment reuse).
