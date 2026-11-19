# Tiko & Pip 3D episode recipe (showrunner-tiko-pip)

Use this for each new long-form episode: 16:9 1920x1080, 2:00-3:00, Made for Kids. The pilot `productions/epis-261102-5p3a/` ("Guess the Animal Sound!") is the worked example. Copy its `episode.json` and `choreo.js` and change them; do not start from scratch.
Read first: `docs/showrunner-base.md` (loop, prelint, caps), `docs/brands/kids/bible.md` (characters, safety), `docs/brands/kids/3d-pipeline.md` (how the engine works).

## 0. Pick the topic (one learning goal + one tiny story beat)
- Choose from `docs/brands/kids/ideas/` and `docs/brands/kids/market-research.md`. Proven demand: counting 1-10, colours, shapes, opposites (big/small, fast/slow), animal sounds and homes, habits (brush teeth, wash hands, bedtime), feelings.
- One concept, repeated at least 3 times. A "guess, pause, reveal" rhythm with 5-7 rounds fits 2:30 well. End with a recap ("let's say them all together") and praise.
- Two episodes in a batch must not share a structure. Change the game: counting things that pop in, a colour hunt, matching shadows, sorting into homes.
- `npm run -s cli -- production:create --brand kids --format episode --title "..."`, then `task:start showrunner-tiko-pip ...`.

## 1. Write `productions/<id>/episode.json`
Copy the pilot's file. Fields:
- `title` and `title_card` (1-2 short lines on the opening title card). `voices.narrator` is Leda with a warm preschool-teacher style; `voices.tiko` is Puck as the cub. Keep both style texts as they are, so the voices stay consistent across episodes.
- `scenes[]`, each `{id, lead, tail, lines[]}`. A line is `{id, who: narrator|tiko, text, after?}`.
  - `after` is the silence after a line. Guessing pauses use 2.0 and "can you say it?" pauses use 1.2-1.6. The default gap is 0.3.
  - `lead` is the time before the first line. Use 1.4-1.6 when the characters travel to a new spot.
- **Words:** no digits ("three", not "3"). 110-130 wpm. The narrator carries the lesson; Tiko gets 6-10 short lines (lip-synced). Pip doesn't speak (chirps are SFX).
- Never: like/comment/bell/link/click asks or your own subscribe line (the kit ending carries the only ask), scary or sad cliffhangers, brands, real people, third-party characters. No own goodbye line either: the series ending says "See you on the hill!".
- **Target length:** about 260-300 words of narration, plus 6-8 pauses, comes to roughly 2:30-2:50.
- Script claims go into `script.json` as `{title, description, tags, claims:[{claim, evidence}]}`, with description and tags parent-facing. Do not write any AI-generation wording. `prelint` checks this.

## 2. Draft timing for free (no TTS quota)
`npm run -s cli -- kids:build <id> --no-tts --snap 1,10,20` estimates timing at 2.3 w/s and writes `draft/score.json` and stills.
Then get the real voice once: `npm run -s cli -- kids:build <id> --no-render`. This makes one TTS request per voice (cached by text, voice and style; re-runs are free) and aligns the takes. Read `draft/narration/asr.json`: WER should be ≤ 0.1, and the ASR text must match. `names` checks that every "Tiko" is heard as TEE-ko (ASR writes Tiko/Tico; Taiko/Tyco = wrong, the build warns). Fix text or spelling and re-run only if needed.

## 3. Write `productions/<id>/choreo.js` (copy the pilot's and change it)
`export default function (K) { ... }` runs once and only schedules: nothing is animated by hand per frame.
- **World:** `const set = K.farm()`. It provides `set.spots`, `set.barnDoors.open/rattle`, and the props `set.hay`, `set.reeds`, `set.bushes` and `set.coop` (each with `.wiggle/.bounce/.pulse`). New sets go into `web/kit/sets.js` as a new function (engineer task, one per batch).
- **Actors:** `K.actor('tiko','tiko',{pos,yaw})`, `K.actor('pip','pip',...)`, and animals `cow pig sheep horse duck hen` (`{visible:false}` to pop in later).
  - Movement: `moveTo(t, dur, [x,0,z], {faceBack})`, `place(t, pos, yaw)`, `turn(t, dur, yaw)`, `show(t)` / `hide(t)`, `fly(t, dur, h)` (Pip).
  - **Answer animals:** create them with `{visible:false}` (or `park(t)`), call `K.answer(animal, t)` with the reveal time, and bring them in with `unpark(t, pos, yaw, {pop})` at the reveal: behind the prop, then walk out. Never leave the answer standing in the set before its round (kids:lint fails with `spoiler`). The pilot's `round()` does all of this.
  - Keep travel under 5 m/s (`too fast` lint). Long trips: start early or use a cut (`travel:'cut'` in `round()`): never glide the friends past the lens.
  - Gestures: `jump hop hops wave cheer look tilt nod wiggle spin squash flap clap say`, `mood(t,'happy'|'wow'|'think')`, `lookEyes(t, dur, [x,y])`.
- **Timing:** always derive times from the voice: `K.word('c3','cow!')`, `K.wordEnd(...)`, `K.line('c2').t0/.t1/.at/.dur`, `K.span('cow').t0/.t1`. A missing word throws an error that lists the line's words.
- **Camera:** `K.cam.cut(t,{pos,look,fov})`, `K.cam.move(t, dur, shot, ease)`, `K.cam.orbit(...)`. Make shots with `K.frame(points, {az, el, pad, near, avoid})`, where points are the world positions that must be seen (feet and top of each character, the bubble top, the hiding spot).
  - `az` is the side the camera stands on (0 = from +z). Characters stand **beside** the action relative to the camera, never between the camera and the hiding spot.
  - `K.frame` swings `az` by up to ±0.3 rad when the barn (or any `K.crowders` box that is not the subject) would cover more than 25 % of a frame edge strip; pass `crowd:false` to keep the exact angle.
- **Hiding spots:** `set.bushes` = three short round bushes with a gap right of the middle one (`set.bushes.hideAt`); the animal steps out through the gap. `K.solids` holds every footprint (bushes, hay, pond, barn walls, coop, trees); nobody may stand inside one (only the duck may swim, the cow may be in the barn, the hen in the coop).
- **Butterflies** fade out near the camera and around every `K.answer()` reveal (`K.quiet(t0,t1)` adds more quiet windows).
- **Thumbnail:** `K.thumbnail({t, pos, look, fov, qx, qy, text?})`: kids:build writes `productions/<id>/thumbnail.png` (1280x720, Tiko + Pip + the episode's animals, big "?" badge at qx,qy). Preview: `npx tsx packages/kids3d/src/dev-thumb.ts productions/<id> productions/<id>/draft/score.json out.png`.
- **FX:** `K.bubble('Moo! Moo!', [x,y,z], {height})`, then `.show(t)`, `.wiggle(t)` and `.hide(t)`. `K.sparkles(at, t)`. Sound effects use `K.sfx(name, t, dB)` with the names `pop ding sparkle whoosh tap chirp clop boing splash rustle door yay`. Keep SFX at -19 to -27 dB, under the voice.
- **Lint marks:** `K.keep(t0, t1, thing...)` marks what must be visible. `K.offscreen(t0, t1, 'tiko')` marks a deliberate exit, for example an over-the-shoulder push-in.
- **Pacing rules (bible):**
  - Something moves in every sentence.
  - A camera move or cut comes every 3-6 s.
  - Every pause gets a visual (a "?" bob, a push-in).
  - Nothing flashes (sparkles are soft).
  - No dark interiors (the barn interior is lit).
  - Animals only ever smile; the voice and SFX stay gentle.

## 4. Check frames before the full render (cheap)
1. `npm run -s cli -- kids:lint <id> --version draft` must be **clean** (about 15 s; to lint real voice timing copy `vN/score.json` into `draft/`). It writes `draft/qa/framing.json`. Checks every 0.25 s:
   - `out of frame` / `blocked`: Tiko, Pip and every `K.keep()` mark (head point, raycast);
   - `cropped >15%`: Tiko, Pip or a kept actor has more than 15 % of its body box outside the frame; `giant`: taller than 95 % of the frame; under `K.offscreen()` only a big half-cut body fails;
   - `spoiler`: a `K.answer()` animal is in frame and not occluded before its reveal (one sample fails);
   - `inside <solid>`: a visible actor stands inside a bush, hay, pond, barn wall, coop or tree (one sample fails);
   - `too fast`: an in-frame actor moves faster than 5 m/s (smears under motion blur).
   Other spans shorter than 0.5 s (camera moves) are ignored.
2. `npm run -s cli -- kids:snap <id> --version draft --times a,b,c,...` grabs 480 px stills. Tile them with `python packages/kids3d/py/grid.py out.jpg 4 draft/stills/*.jpg` and look at the grid.
3. Check at least 12 frames: hook (t≈0.4, 4), every clue, ask and reveal, the recap and the goodbye. Fix anything that is:
   - a cut-off bubble or face;
   - a character standing inside a prop or the pond;
   - a giant foreground head;
   - a wrong mood face;
   - an animal visible before its reveal (the `spoiler` lint catches it; `park`/`unpark` + `K.answer`).

## 5. Build, check, stage
- `npm run -s cli -- kids:build <id> --agent showrunner-tiko-pip` takes about 12-15 min for 2:40 (TTS cached). It writes `vN/`:
  - `score.json`, `narration/`, `3d.mp4`, `title.png`, `music.wav`, `cues.json`, `timeline.json`;
  - `render.mp4` (mastered to -14 LUFS), `thumbnail.png` (also copied to `productions/<id>/thumbnail.png`);
  - `qa/techqa.json`, `qa/framing.json`, `build.json`.
- Audio- or mix-only fixes (music level, SFX, title) don't need a new picture: `kids:build <id> --reuse-3d N` reuses `vN/3d.mp4` when the score is unchanged (about 6 min instead of 15).
- techqa must pass (`--size 1920x1080` is passed automatically). Then run `npm run -s cli -- prelint <id>` and fix every finding.
- Own frame check at ≤480 px: `ffmpeg -ss T -i vN/render.mp4 -frames:v 1 -vf scale=480:-1 f.jpg` at 12 or more times. Listen to the start, one guessing pause and the end.
- Write `productions/<id>/assets.json`: everything is original (procedural 3D, procedural audio, Gemini narration, Baloo 2 OFL font), so there are no third-party sources. Ask rights-scout to countersign the voice and art once per episode.
- `npm run -s cli -- production:stage <id> qa`, then hand off: strengths, weaknesses and risks in 5 lines.

## 6. Sunny Hill series wrapper (automatic, every episode)
Spec: `series-bible.md` sections 4-5. Registry: `docs/brands/kids/episodes.json` (ep number = upload order, topic, production id, `search` phrase, `hero` token, `recap` words with one token each; thumbnails are read from `productions/<id>/thumbnail.png`). Kit: `packages/kids3d/src/series.ts` + `web/series/sunny-hill.js` + `web/kit/hill.js`.
- `kids:build` looks the production up in the registry (or `episode.json` `series: {name, ep, topic}`; `series: false` = no wrapper) and renders two extra 3D segments around the episode picture:
  - **Cold open (owner 2026-11-08, O5/O-C3):** the episode picture opens with <= 3 s of the first payoff action before the opening below. `episode.json` `"cold_open": {"from": <episode s of the payoff action>, "dur": 0.5-3.0}` (kit since 2026-11-08): that slice of the episode's own 3D picture plays at 0:00 with its SFX cues (narration only if a whole line fits), then the opening, then the body. `series.json` gets `cold_open` and `body_start_s` (= cold + opening; QA frame-0/hook tests use it), all line times stay absolute. Without `cold_open` kids:build warns and keeps the old order. Works with `--reuse-3d N` (no new 3D render). Verified 2026-11-08 through the real timeline + ffmpeg compositor on Ep 5's v9 files (scratch, 14 s): the cold-open frames equal the episode picture at `from`, then the opening, then the body. Pick `from` = the second the first payoff action starts (read it in `vN/score.json` / choreo), keep `dur` 1.5-3.0; Ep 5 shipped without one, so every new episode should set it.
  - **Opening (~8.5 s):** jingle (procedural `jingle` SFX), the hill rises with the hero object, Pip flies in, the 3D "Sunny Hill" sign pops on the sung "Sunny Hill, Sunny Hill, come and play!", the "Ep N · Topic" ribbon slides in, Tiko: "Up the hill, up the hill... Ready, friend? Boing!" and both jump. The episode's own title-card overlay is dropped.
  - **Ending (~26 s):** "Let's sing what we learned!" + the recap words, each popping its object and label; "Next time on Sunny Hill: <next>!" with the next hero rising from behind the hill; the fixed grown-up ask led by Pip (+ chirp); the playlist line over a non-clickable wall of tiles (previous 2 + one rotating classic, "Coming next: Ep 2" on Ep 1); "See you on the hill!" + hill clap.
- Series lines are TTS'd in their own takes (`take`): constant takes (jingle, ask, catchphrase, bye) are synthesized once and reused by every episode; only the recap and next/playlist lines are new per episode (2 TTS requests). `squeeze`/`tempo` on a line tighten slow TTS pauses.
- Output: `vN/series.json` (title, timings, ask time), `vN/series/` (opening/ending scores, mp4s, cues, wall.png, qa/framing-*.json). The thumbnail gets a small "SUNNY HILL · EP N" chip bottom-left and the registry's topic mark (`thumb_mark`: "?" only for guessing games, "123" counting, "@colours", "@shapes", or none) placed where it does not cover Tiko or Pip; `thumbnail_clean.png` (no overlays) feeds the wall tiles of later episodes.
- In the episode: no goodbye line (mark an old one `"omit": true` to keep the TTS cache), end on praise/the do-it-together beat. Episode 2:00-2:30, wrapped 2:35-3:15.
- **Custom title (2026-11-08):** the default title cannot carry a child action. Supply one either as `episode.json` `"series": {"title": "Brush Your Teeth Song for Toddlers | Sunny Hill Ep 6 with Tiko & Pip"}` or as `packaging.json` `chosen_title` (used automatically when valid). Rules: <= 70 chars, contains `Sunny Hill Ep N` (N = this episode) and `Tiko & Pip`; an invalid `series.title` stops the build, an invalid `chosen_title` is ignored with a warning (prelint then fails the mismatch). Absent = the old `Sunny Hill Ep N: <Topic> with Tiko & Pip | <search>` title. `series.json` carries the final title; script.json and packaging.json must equal it (prelint).
- `script.json`: `title` = `vN/series.json` title (`Sunny Hill Ep N: <Topic> with Tiko & Pip | <search phrase>`, ≤ 70 chars), description = what the child learns, 2-3 "try at home" ideas, the playlist name "Sunny Hill: All Episodes (in order)", "Made for kids"; no links, no AI-generation wording, no "subscribe". `made_for_kids: true`.
- `prelint` (brand kids): fails on any CTA word in spoken lines or public text except the exact series ask (once, after 90 s), on links, a missing `made_for_kids`, or a title that is not the series title.
- Preview the wrapper without a full render: `kids:build <id> --no-render` (real voice) then `npx tsx packages/kids3d/src/dev-series.ts productions/<id>/draft [opening|ending] [t1,t2]` (lint + stills + wall.png).
- Existing renders: re-run `kids:build <id> --reuse-3d N` (keeps the episode picture when its score is unchanged; renders only the wrapper, ~4-5 min).

## Kit notes (2026-11-08)
- Moods: `happy`, `wow`, `think`, `sleepy`, and `sad` (gentle: droopy lids, inner brows raised, small frown, eyes glance down, no tears; reads as sad, not sleepy). Use `actor.mood(t, 'sad')` then `'happy'` again.
- SFX (procedural, `packages/kids3d/src/audio.ts`): `ting` (soft sparkle glint), `yawn` (gentle breathy yawn), `hug` (cloth rustle + warm swell), next to `squeak`/`thump`.
- Narration clips are de-plosived automatically on every build (90 Hz highpass + adeclick on each per-line clip; TTS cache and loudness mastering untouched). No manual b14a-style fix needed.
- Registry hero token `{shape:'heart'}` renders in the series opening (orange by default; add `color` for another colour). The ending's episode tile wall sits 40 px higher (clear of the player-controls band).

## Time per episode
- Script and episode.json: 20-30 min.
- Choreography from the pilot template: 45-75 min.
- Lint and stills loop: 15-30 min.
- Full build: about 15 min, unattended.
- Prelint and own check: 10 min.

That totals **about 2-2.5 h of showrunner time per episode** on sonnet. QA and rights rounds run separately (studio loop).

## Upload rules (later, owner OK only)
Made for Kids is required (`scripts/youtube.ts` sets `selfDeclaredMadeForKids` for brand `kids`). Never upload without the owner's explicit OK, and never add AI-generation text to descriptions.
