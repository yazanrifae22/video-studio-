# test-3d builder (TEST brand)

A 9:16 Short built around one 3D film (or, with `"long": true`, a 16:9 9-12 min long-form video: section "Long-form"). Builder: `packages/test3d/src/build.ts` (narration, score, captions, audio, timeline, render),
`packages/test3d/src/audio.ts` (procedural SFX + music bed), `packages/test3d/src/cli.ts` (entry point). The 3D picture
(`packages/test3d/web/**`, `packages/test3d/src/capture.ts`) belongs to the 3D engineer. Not wired into the studio CLI.

## Commands
```
npx tsx packages/test3d/src/cli.ts build <id> [--draft] [--no-3d] [--sub N] [--snap t1,t2,...] [--reason "..."] [--agent A]
npx tsx packages/test3d/src/cli.ts snap  <id> --times a,b,c [--version N|draft] [--width 540] [--sub N]
```
- `--draft`: no TTS. Words timed at 2.7 words/s, +0.25 s after each sentence end -> `productions/<id>/draft/score.json`; when
  `capture.ts` and `productions/<id>/film.js` exist, 3D stills (default 12 evenly spaced, or `--snap`) -> `draft/stills/`. No version folder.
- `--no-3d`: dark slowly moving placeholder picture (ffmpeg `gradients` + light grain so techqa no_freeze passes) and a small built-in SFX cue list (every SFX once or more) in
  place of `info.cues`. Everything else is real (TTS, alignment, captions, music, master, techqa).
- `--sub N`: sub-samples per frame passed to `capture.open` (motion blur / AA; the capture default when omitted).
- `--reason`: written to `vN/build-reason.json` and `versions.notes.reason`.
- `snap`: stills of the 3D picture from a version's (default: latest) or the draft's `score.json`. Without `capture.ts` it falls back to
  frames of `vN/picture.mp4`.

## Input: `productions/<id>/film.json`
`{title, format:{width,height,fps}, voice, style, hook_text, lines:[{id,text}], claims}`. Rules: unique line ids, numbers spelled out
(digits are refused), no AI-generation wording (shared `aiTextHits` guard). Music marks use line ids `l08` (rise starts), `l11` (resolve;
calm second half after it ends) and `l15`..`l16` (swell); missing ids fall back to proportions of the length.
Optional fields: `key_words: string[]` replaces the built-in gold-accent noun list (grain, king, rice, ...) for captions and hook (numbers, spelled numbers, percent, half stay automatic; case-insensitive); `music: {rise, resolve, swell_from, swell_to}` (line ids) replaces `l08`/`l11`/`l15`/`l16` for the music marks and the `--no-3d` riser/hit cues (unknown id = build error). Absent = old behaviour.

Optional `retake` (number or string): salt in the TTS cache key = a fresh take of the same text. Raise it when a take fails the WER / opening gate.

## Pipeline (one build = `productions/<id>/vN/`)
1. **Narration**: ONE Gemini TTS take of all lines (voice + style from film.json, cached by text+voice+style), copied to `productions/<id>/voice/`.
   `align.py` (faster-whisper large-v3, GPU lock) maps ASR timings onto the SCRIPT words. **Gate**: WER > 8 % fails the build; the take
   must open with the script's first words, have no style/preamble words in its first ~9 ASR words, and start the first script word
   within 1.5 s (`narration/asr.json`). Per-line clips are laid end to end; the pause between lines is the take's own pause clamped to 0.3-0.75 s.
2. **score.json** (contract with the 3D film): `{fps, width, height, duration, lines:[{id, text, t0, t1, words:[{w, t0, t1}]}]}`;
   `duration` = last word end + 1.4 s (frame-snapped).
3. **Picture**: `capture.open(epDir, score.json, {width, height, sub})` + `renderVideo` -> `picture.mp4` under the studio `render` lock.
   `info.cues` -> `cues.json` (`--no-3d`: the test cues).
4. **Captions** (`captions.json`): 1-3 word groups following the spoken words (break after punctuation, on a > 0.35 s pause, or past
   8.6 em of Arial Black advance width = 67 % of the frame; page shown until the next starts, >= 0.4 s when the gap allows). Arial Black 900, 150 design px (84 px on the
   1080 canvas), white with an 8-direction black outline + drop shadow, centred at 66 % height (inside 62-71 %, clear of the bottom
   20 %, right 14 % and top 8 % zones). Key words in gold `#FFC94A`: numbers (digits and spelled numbers, `percent`, `half`) and
   grain(s), king(s), board, doubling/doubles, rich, square(s). A group without a key word stays white.
5. **End text**: `end_text` shows from the START of the last line to the end of the video (20 % height = 14-26 % band, stepped scale-in); a last line of up to 8 words gets no caption (the page before it ends where the line starts); a longer last line keeps its captions (2026-11-17: QA saw 6-8 s of speech with no caption).
   **Hook**: `hook_text` from 0 to 2.2 s centred at 28 % height (two lines cover 18-38 %; hook-playbook H3, moved from 20 % on 2026-11-15: films keep heads and bright detail below 39 % until it is gone), 176 design px (2026-11-17: short hooks are set larger, up to 250, so the widest line reaches about 70 % of the width at the scale-in peak; long hooks stay at 176), two balanced lines, gold key words. Scale-in = 7 one-frame cards
   (0.9 -> 1.07 -> 1.0, frame 0 already near full size; not smaller, text-safety flags too_small even on one frame) and a 2-frame fade out, because the renderer paints each text item as one static card (text scale/opacity
   keyframes are not animated by packages/render). No caption shows the hook's words while the hook is up (such a page waits for the
   hook, or ends the hook early when it starts after 1.6 s).
6. **Audio**: narration lane (per-line clips); ONE pre-mixed SFX lane `sfx.wav` (cue `db` = peak level of the sound; ticks closer than
   12 ms merge; ticks rotate 4 variants and pan slightly); music bed `music.wav` (original, procedural, D minor: low drone, sparse soft
   pulse; from l08 the pulse interval halves stage by stage while a dissonant cluster glides up and the filter opens; at l11 a low boom
   + D minor chord; after l11 a warm F-C-Dm-Bb pad with sparse soft bells; one swell under l15-l16). The bed is normalised to -20 dBFS
   RMS then ducked with `duckWav`: -24 dBFS between lines, -30 dBFS under speech (2026-11-15; was -25 / -34, QA on two videos could barely hear the bed).
7. **timeline.json** -> `renderTimeline` (+ `qa/text-safety.json`) -> `render.raw.mp4` -> `master()` (-14 LUFS, <= -1.6 dBTP) ->
   `render.mp4` -> `techqa.py` -> 360 px stills `qa/stills/` (hook + 3 caption pages with a gold word unless `--snap`).
   `build.json` has the timing, WER, preamble check, mix numbers (voice vs music RMS under speech, LUFS of each lane) and techqa.

## Long-form (16:9, 9-12 min; `packages/test3d/src/long.ts`, 2026-11-15)
A film.json with `"long": true` is built by the long-form path; without it the Short path above runs unchanged.
```json
{ "long": true, "title": "...", "format": {"width": 1920, "height": 1080, "fps": 30}, "voice": "Algenib", "style": "...",
  "hook_text": "THREE SHORT CHAPTERS", "end_text": "See you in the next one", "key_words": ["king", "rice"],
  "chapter_gap": 1.2, "tail": 2.0, "captions": true, "hook_dur": 3.0, "music_seed": 7, "pace": {...optional, as the Short},
  "chapters": [ {"id": "c01", "title": "The board", "mood": "curious", "retake": 1, "lines": [{"id": "l01", "text": "..."}, {"id": "l01a", "text": "...", "pause_after": 2.5}]} ] }
```
- `chapters[]` replaces top-level `lines` (refused together). Chapter ids are `[a-z][a-z0-9_]*`; line ids are free-form strings (`l11a`, `l45a`, `intro-2`; no leading/trailing spaces) and unique across the whole film; every chapter needs a `title` (chapters.txt). Same text rules as the Short (no digits, no AI wording; chapter titles and end_text are checked too).
- `pause_after` per line (seconds, 0-10, e.g. 0.5-4): extra silence after that line ON TOP of the normal pause / chapter gap, for a time-lapse or a drop. Every later line, word and chapter time in score.json shifts by it (real builds and `--draft`); it works inside a chapter, across sub-takes and on a chapter's last line (that silence belongs to the ending chapter: the chapter bound stays at the middle of the normal gap after it; on the film's last line it lengthens the tail). During the silence the music sits at the "between lines" level (-24 dBFS). Short films refuse the field.
- Optional: `mood` per chapter (`calm | curious | tension | rise | drop | warm`; default: first `curious`, last `warm`, middle alternating `calm`/`curious`), `retake` per chapter (TTS cache salt for that chapter only; falls back to the film's `retake`), `chapter_gap` (0.6-3 s, default 1.2), `tail` (s after the last word, default 2.0; use 10-20 for a YouTube end screen), `captions: false` (no burned lower-third; captions.srt is still written), `hook_dur` (default 3.0), `music_seed`.
- `format` defaults to 1920x1080 for long films.

**Commands** (same CLI):
```
npx tsx packages/test3d/src/cli.ts build <id> --draft [--snap t1,t2] [--sub N]       # estimated timing, no TTS -> draft/score.json, draft/chapters.txt, 2 stills per chapter (640 px)
npx tsx packages/test3d/src/cli.ts build <id> [--sub 16] [--reason "..."]             # full build, every segment rendered
npx tsx packages/test3d/src/cli.ts build <id> --chapters c03,c07 --reason "..."       # re-render those chapters' picture, reuse the rest from the previous version
npx tsx packages/test3d/src/cli.ts build <id> --resume                                # after a crash: reuse every still-valid segment, render the missing ones
npx tsx packages/test3d/src/cli.ts preview <id> --chapter c03 | --from 120 --to 150 [--version N|draft] [--sub 4] [--width 960]
npx tsx packages/test3d/src/cli.ts snap <id> --times 61.5,200 | --chapter c03 [--version N|draft] [--width 640] [--sub N]
```
- `preview`: the 3D picture of a window at low sub-samples (default sub 4, 960x540) -> `<vN|draft>/preview/<label>.mp4`, with the version's sound (render.mp4 or narration.wav) muxed in when there is one.

**Pipeline** (`productions/<id>/vN/`):
1. **Narration**: one Gemini TTS take per chapter; a chapter over 165 words (~61 s at 2.7 words/s) is split at line boundaries into balanced sub-takes (`c03_1`, `c03_2`). Same voice + style; cached per take (text + voice + style + retake), so editing one chapter re-voices only that chapter. Alignment is cached per take too (`voice/align-<hash>.json`). Gates per take (WER <= 8 %, opening words, no style preamble, first word within 1.5 s); every failing take is listed in ONE error -> raise those chapters' `retake`. `film.pace` applies per take.
   **Level match**: integrated loudness of every take; each take is gained to the median (max +-6 dB). Flags (build log + `build.json.take_flags`): loudness > 2 dB from the median, speaking rate > 12 % from the median. `build.json.takes[]` has per take: words, spoken_s, wps, lufs, gain_db, WER, preamble, model, cached.
   Layout: lines end to end; pause inside a take = its own pause clamped 0.3-0.75 s; between sub-takes of a chapter 0.55 s; between chapters `chapter_gap`. All clips are pre-mixed into `narration/narration.wav` (one timeline item).
2. **score.json**: the Short shape + `chapters: [{id, title, t0, t1, mood}]`. Chapter bounds are frame-snapped at the middle of the gap (first chapter 0, last ends at `duration` = last word + `tail`). Films use `K.line`, `K.word` as before and `K.score.chapters` for shot plans.
3. **Picture in segments**: one session (full score, so `info.cues` covers the whole film), one segment per chapter `vN/segments/<chapter>.mp4` (frames [round(t0*fps), round(t1*fps))), `vN/segments.json` written after every segment (key, film.js sha, ms/frame, rendered|reused). Joined with the ffmpeg concat demuxer (stream copy, no re-encode); the joined frame count is checked against the score. Reuse (`--chapters`, `--resume`): a segment is reused (hard link) only when its key matches = same frame range, same render settings (size, fps, sub, engine params) and the same words + times of that chapter. A chapter whose narration moved (a re-voiced earlier chapter shifts every later chapter) is re-rendered with a warning, even when not listed. Progress per segment with ms/frame and minutes left.
   Limit: the key does not include film.js (that is what `--chapters` is for), so a segment whose picture depends on ANOTHER chapter's timing must be listed too.
4. **Captions**: lower third, 2-6 word groups (break after a sentence end, after a comma at 3+ words, on a > 0.35 s pause, at 6 words or past two lines of 20 em (mixed-case Arial Black widths); a size break never ends on a function word; lone words merged), sentence case, Arial Black 64 px (cap ~4.2 % of the height), white with a 3 px black outline + soft shadow, gold key words as the Short (`key_words` supported), centred at 81 % height: two lines span 74-88 %, clear of the bottom 8 % and YouTube's player controls (90-100 %, text-safety zone), lines <= 1280 px wide (67 %). `"captions": false` turns them off.
   `captions.srt`: one cue per sentence (longer sentences split near a comma into balanced cues), max 2 lines of 42 characters, word-timed, no overlaps. `chapters.txt`: `0:00 Title` per chapter (h:mm:ss over an hour); the build warns when YouTube would ignore it (< 3 chapters or one < 10 s).
   **Hook**: 120 px, centred at 32 % height (two lines 22-42 %), 0 to `hook_dur`, same scale-in cards and caption-clash rule as the Short. **End text**: 104 px at 32 % height from the start of the last line (that line gets no caption) to the end, original case, gold key words.
5. **Music**: `musicBedLong` (audio.ts), original and procedural like the Short bed. One section per chapter from its mood: drone on the tonic (D, or F for warm) with a breathing brightness, a chord progression picked per chapter from the mood's bank with jittered chord lengths (no fixed loop), sparse bells, plucked arpeggios (curious/warm/rise), soft pulse (tension every ~2 s; rise halves 2-1-0.5-0.25 s with a crescendo and a gliding string cluster; drop = slow heartbeat), noise air (tension/rise/drop); a boom + D minor ring opens every `drop` chapter and the chapter after a `rise`. Sections cross-fade over 5 s (equal power) at chapter bounds, an airy swell leads into a mood change. Each section is set to its mood level (-22..-20 dB RMS) before the whole bed is normalised to -20 dBFS RMS; ducking: -24 dBFS between lines, -32 under speech (the Short uses -30). A 10-minute bed takes about 40 s to synthesise.
6. **Master + techqa**: as the Short (-14 LUFS, <= -1.6 dBTP), techqa with `--size 1920x1080` and `--sheet-step 10` (videos > 2 min). techqa checks: no_flash_frames, no_blank_tail, av_length_match, no_audio_dropouts, h264, aac, size, fps, duration, no_black, no_freeze (1.2 s), no_long_silence (2 s), loudness (-16.5..-11.5), true peak. 360 px stills: hook, 3 gold-word captions, 1 s into each later chapter (max 6), the end text.
8. **Speed** (measured 2026-11-15, RTX 4070 laptop, fixture `productions/_fixture-long`): 1920x1080 sub 16 with encode 22-28 ms/frame on simple scenes (look-dev stills 33 ms/frame without encode while another GPU job ran); a 10 min film = 18,000 frames = about 7-9 min of 3D render for light scenes, 2-3x that for heavy rice floods or a shared GPU. Rest of a build for 1 min: ~1.3 min (TTS/align cached); the 10 min bed itself takes ~40 s. Preview: 960x540 sub 4 about 10 ms/frame.
7. **build.json**: the Short fields + chapters, takes, loudness/rate medians, take_flags, voice RMS per chapter, picture segments (rendered/reused, ms/frame), captions_on, chapters_warn.

## DB
When `productions` has the id: `versions` row (captions path, notes = report, render path, techqa), `productions.version`, state
`editing`, `build.step` events. The studio CLI gates (`script:approve` check, build-churn stop) are NOT applied: this CLI is outside the studio CLI.

## SFX names
`tick` (one rice grain on marble), `pour` (rice pouring, uses `dur`), `thud` (heavy metal chess piece falls on stone and rolls),
`whoosh`, `riser` (uses `dur`), `hit` (low cinematic impact), `ding`, `coin` (one coin set down on marble or a stack: bright clink with a short ring, 4 variants rotated and panned like `tick`, cues closer than 12 ms merge), `tap` (small chess piece set down on marble: short dull knock, no ring), `chime` (soft two-note chime A5-D6, long decay: a chapter mark), `swell` (airy filtered-noise swell, uses `dur`, stops softly: leads into a chapter or reveal). All synthesised in `audio.ts`; unknown names fail the build.
**Adding a sound**: write a generator `function name(dur?) -> Float32Array` (48 kHz mono, any level: the mixer peak-normalises, cue `db` = peak) in `audio.ts`, add one entry to the `SFX` table there, list it here and in engine.md. Nothing else changes.
