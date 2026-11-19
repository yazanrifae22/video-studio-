# Cut list — `productions/<id>/cutlist.json`

The single hand-off from a showrunner to the builder (`npm run -s cli -- build <id>`), which records it as an editable
`vN/timeline.json` and renders it with ffmpeg (packages/render; OpenChatCut retired 2026-11-02). Times are seconds. Only rights-approved assets (acquired + analysed) may appear.

```jsonc
{
  "production_id": "rank-261021-cwik",
  "width": 1080, "height": 1920, "fps": 30,
  "segments": [                          // sequential on V1, in play order
    { "asset_id": "src-…", "src_in": 12.4, "src_out": 18.9,
      "fill": "blur",                    // blur (16:9 source on blurred 9:16 bg) | cover (crop to fill) | contain
      "zoom": 1.0,                       // optional extra scale (1.0–1.6) for cover/blur foreground
      "mute_source": true,               // strip original audio (required when rights conditions say so)
      "volume": 1.0,                     // source audio level when not muted
      "item": 5,                         // optional: ranking item / story beat this segment belongs to
      "why": "eye-wall lightning, clearest shot" }
  ],
  "texts": [                             // overlays (titles, rank badges, facts, credits) on their own track
    { "text": "#5 HURRICANE IAN · 155 MPH", "at": 2.0, "dur": 6.5, "role": "rank", "y": -30 },
    { "text": "Footage: NASA (public domain)", "at": 40.0, "dur": 3.0, "role": "credit", "y": 40 }
  ],
  "narration": {                         // optional; one Gemini TTS request per video (shared free quota)
    "voice": "Charon",                   // Gemini prebuilt voice
    "style": "Energetic documentary narrator, confident, quick but clear.",
    "lines": [ { "id": "hook", "text": "…", "at": 0.0 }, { "id": "i5", "text": "…", "at": 2.0 } ]
  },
  "captions": "narration",               // narration | source (speech in the footage; needs a transcript) | none
  "music": null,                         // or { "asset_id": "src-…", "volume": 0.12 } — licensed music only
  "credits": ["Hurricane Ian from the ISS — NASA (public domain) — https://…"],
  "target_duration": 45
}
```

Rules the builder enforces: rights gate on every `asset_id`; `src_out - src_in ≥ 0.8`; segments fit inside the source duration;
narration lines that run longer than their item extend that item's last segment when the source allows, otherwise the build fails
with a clear message (shorten the line). Captions are generated as timeline text items (phrase pages, safe zone, readable size).

## Fields added after the first QA round (2026-10-21)
- Segment: `zoom` (0.5–4), `pan_x` / `pan_y` (**% of canvas, −100…100**; negative y moves the image up), `motion` (`push` | `pull`: slow 8 % scale move),
  `trim` `{top,bottom,left,right}` px of edge artefacts to remove. Baked-in symmetric black borders are cropped automatically.
- Unmuted segments are levelled to −16 LUFS; short **audio-only** fades are baked in only where the audio changes source/time
  (contiguous splits of one take stay seamless). The picture is never faded.
- `"fill": "contain"` is treated as `blur` (contain would expose the transparent canvas).
- Cut list: `caption_clean` (captions only: fillers/stutters/restarts), `emphasis` (words rendered larger in yellow), `bed: "tone"` (original ambience).
- `bed: "tone"` is a generated score bed (mid-range Am/F pad + air) with accents on every `rank`/`label`/`title` text; override with `bed_accents: [seconds…]`.
  The **last accent is the payoff**: a swell builds from the second-to-last accent into it and the crest holds to a 0.5 s end fade. Accents carry a
  2.5 kHz tick + 2–6 kHz air burst (audible on phones). Bed is capped to the timeline, DC-blocked, starts at full level (0.1 s fade-in).

## Automatic builder behaviour (2026-10-21, end of day)
- Overlay (text) handovers: a card ending ≤3 frames before the next card starts is extended to meet it — **never across a picture cut**. Author cards cut-to-cut anyway.
- Overlays starting/ending within 2 frames of a cut snap to it.
- Mastering pads/trims audio to the exact video length; techqa `av_length_match` compares decoded samples, `no_blank_tail` catches empty end frames.
- Not supported yet: still images as segments; `production:attach` cannot detach (the build gate checks only the cut list).
- Texts accept `x` (% of canvas from centre, e.g. credit in a top corner: x 28). Segments are laid on an exact frame grid (no fractional-frame gaps).
- Text roles have safe-zone defaults (platform UI covers ~top 14 % / bottom 35 %): leave `y` unset unless you must avoid a face.
- `caption_fixes` `[{asset_id, at, from, to}]` (added 2026-10-21 by showrunner-mission-voices): captions only — replaces a mis-heard transcript word
  (exact `from` token, source time `at` ±0.3 s) with `to`. Audio is untouched; use only for verifiable ASR errors (e.g. "chart," → "short,").
- `caption_onset_snap: true` (opt-in, added 2026-10-21 by showrunner-mission-voices): words that follow a pause start at the measured
  speech onset (10 ms RMS, +12 dB over the gap floor) instead of the ASR start, which often absorbs 0.3–0.7 s of silence (early captions).
- `caption_min_page: 0.6` (opt-in seconds, added 2026-10-25 by showrunner-way-it-was-made): narration/source caption pages shorter than this are merged into
  the next page (else the previous); never across a >0.4 s speech gap (a single-word page may bridge a pause up to 0.6 s inside a sentence; after a sentence end the 0.4 s rule holds, so a last word joins its own sentence), max 2 wrapped lines / 6 words. Default off (0). 2026-10-25 fix: one-word 0.4 s pages used to survive because the 0.4 s gap guard (commas/line pauses are 0.5-0.8 s) and a 3-line wrap both blocked the merge.
- `caption_clip: [{ at, max?, t0?, t1? }]` (opt-in, 2026-10-25): retimes the caption page starting within 0.3 s of `at` — set `t0`/`t1`, or cap its length to `max` s.
- `caption_y_ranges: [{ from, to, y }]` (opt-in, 2026-10-25): caption pages starting in [from, to) use this `y` instead of the default caption band (e.g. move hook captions off faces).
- Texts accept `font_px` (output px on the 1080-wide canvas) to override the role's default size (added 2026-10-21, MV-A).
- Caption pages: a < 0.3 s page is no longer merged into its neighbour when the merge would exceed the page width (it would wrap to two lines);
  it is held for 0.3 s and the next page starts after it.
- `caption_timing` `[{asset_id, at, word, start?, end?}]` (opt-in, added 2026-10-21 by showrunner-mission-voices / MV-B): captions only — retimes one
  transcript word (exact `word` token as in the transcript, ASR start `at` ±0.3 s) to measured **source** times; applied after `caption_onset_snap`.
  Page edges follow their words (a page shows until the next page starts, min 0.4 s; last word end +0.15 s). Use when ASR timing is wrong next to a pause.
- Segment `audio_fade_in` (seconds, opt-in, added 2026-10-21 by MV-B): audio-only fade-in at the segment head (e.g. 0.067 = 2 frames) to
  remove the tail of a trimmed word at the clip start. Ignored where the builder already fades a non-contiguous join. Picture untouched.
- `caption_fixes` with `"to": ""` deletes that word from the captions (no leading space on the page); pair with `caption_timing` if the next word's start must move. (2026-10-21, MV-B)
- `caption_fixes[].s` (optional, source seconds): sets the caption start of that word (measured onset) when the ASR start is wrong.
  A trailing comma in `to` (e.g. "fire" → "fire,") forces a page break after the word; punctuation is not displayed.
- Text role `cta` (2026-10-25, Mission Voices goal-28): end-of-video call to action, red card high in the top band (y −32, 92 px font, wraps at 26 chars) so it sits above the face (QA 2026-10-25: y −22 covered eyes/forehead).
  End the `title` card when the CTA starts (same slot).
  Put it on the last ~3 s of speech (`at` = end − 3.0, `dur` 3.0), no other top-band card at the same time; text ≤ 40 chars, no emoji. (Pre-2026-11-08 clips; new clips use `cta` below.)
- **`cta` (2026-11-08, owner O-B1, Mission Voices goal-28 end standard):** `{ "text", "at": <timeline s = end of the last spoken word> | "end", "dur": 1.5–2.0, "y"?, "x"?, "font_px"?, "max_chars"? }` — a role `cta` text over the LIVE last picture (no frozen hold).
  Pair it with `end_hold: 0` (or leave `end_hold` out) and keep ≥ 0.25 s room tone after the last word in the segment itself; extend the last segment's `src_out` for real run-out picture.
  `"end"` = the last `dur` s; a numeric `at` that would run past the end is moved back (build warns). Any role `title` card still up when the CTA starts is cut at that moment. Same red top-band style as the text role (set `y` per clip so it misses the eyes).
  dur outside 1.5–2.0 refuses the build; `cta` together with `end_hold` > 0 warns. Old cut lists (`end_hold: 3` + a `texts[]` cta at total − 3.0) build exactly as before. Example: `"end_hold": 0, "cta": {"text": "Pick a side: would you go?", "at": "end", "dur": 1.8}`.
- Automatic (2026-10-25): the last segment gets an 80 ms audio-only fade-out at `src_out` (no hard speech-level cut at the end). Put the out-point at the end of the last word + ≥0.08 s.
- Ending rule (QA, 2026-10-25, recurring defect): the last segment must end in a pause — last word end + ≥0.25 s of room tone before the next word starts.
  If the speaker runs straight into the next word, end on an EARLIER sentence that is followed by a pause. The 80 ms auto fade is a safety net, not the fix. Check: last 0.3 s of the render below −30 dB.
- Segment `deflash` (opt-in, 2026-10-25, mv-B4): single/double-frame luma spikes (press-camera flashes in archive pressers) are replaced by the previous frame when the window is cut (ffmpeg `freezeframes`; do NOT use a temporal median, it ghosts moving faces). techqa `no_flash_frames` otherwise fails.
- Segment `compress` (opt-in, 2026-10-25, mv-B4): gentle speech compressor on the window audio before levelling, for bursty archive audio whose peaks keep the master under the −16.5 LUFS floor (techqa `loudness_ok`).
- `end_hold` (seconds 0–3.5, opt-in, 2026-10-25, Mission Voices): the timeline runs `end_hold` s past the last segment's `src_out`. Picture = that segment's
  last frame held (tpad clone, same zoom/pan); audio = the 80 ms tail fade at `src_out`, then room tone (quietest 0.4 s of the source within ±6 s, 10 ms RMS,
  ping-pong looped, ≤ −50 dBFS; −60 dB noise if the source has no quiet stretch). Captions stop at the original out (+0.15 s). `total` includes the hold;
  techqa gets `--end-hold` and exempts that tail from freeze/silence/blank-tail; `mv-retention-check.py` exempts it from R2. Typical 2.5 with the `cta` at total − 3.0 (dur 3.0).
- `caption_bg: true` (opt-in, 2026-10-25, showrunner-way-it-was-made): caption pages get a dark translucent pill (rgba 0,0,0,0.55, radius 18) so white text stays readable on bright shots. Default off.
- Segment `lift` `{gamma?, brightness?, contrast?}` (opt-in, 2026-10-25, showrunner-way-it-was-made): ffmpeg `eq` on the cut window for a too-dark/blown shot (e.g. `{"gamma":1.4,"brightness":0.04}`). Cached per setting; picture otherwise untouched.
- `caption_clip[].text` (opt-in, 2026-10-25, showrunner-way-it-was-made): also replaces the page text (re-balance a split line: clip page A to its first words, give page B the rest with `t0`; word times come from `narration.align.json`).

## fullview: watch a whole source before choosing moments
Use it on every new long source (archive films, talks, NASA reels) BEFORE picking moments; read `fullview.md` plus 1-2 grids instead of pulling many single frames.
- `npm run -s cli -- fullview <asset_id> [--transcribe] [--lang en|ar]` (or `source:analyze <asset> --fullview`). Reuses the cached analysis and any existing transcript; `--transcribe` runs GPU faster-whisper only if none exists.
- Output, next to analysis.json in `data/cache/<sha>/`: `fullview.md` (one line per shot: time range, shot id, words spoken, peak score P, flags T=on-screen text likely / M,A=motion,audio peak, grid + frame path), `fullview.json` (same, machine-readable, with all frame paths), `fullview_grid_NN.jpg` (<=360 px tiles stamped `#shot mm:ss`, 20 per sheet), `fullview_frames/`.
- Timestamps are on the mezzanine (same timebase as analysis.json and cut lists). Silent films just show "(no speech)"; T is a cheap edge heuristic, not OCR.
- Approved YouTube/TikTok/Instagram sources (owner decision 2026-10-28) can be fetched with `cli source:fetch-social <asset> [url]` (yt-dlp; refuses unless permission_status is approved/approved_with_conditions), then run fullview.
- `caption_per_line: true` (opt-in, narration captions only, 2026-10-28 showrunner-planet-extremes): pages each narration line separately, so `caption_min_page` merges never cross a ranking entry.
- `caption_bg_alpha` (opt-in 0.3-0.95, 2026-10-28 showrunner-planet-extremes): opacity of the `caption_bg` pills and of credit plates (default 0.55); ~0.8 keeps white captions readable on snow/ice at 360 px.

## Ranking plans (viral-rankings, 2026-10-31, pipeline-engineer)
Ranking productions of brand `viral-rankings` start from `productions/<id>/plan.json` (`RankingPlan`, schema `ranking-plan/1`, zod in `packages/shared/src/schemas.ts`), not from a hand-written cut list.
Full contract: `docs/brands/viral-rankings/RANKING-ENGINE.md`.
- `rank_position` (editorial rank, 1..N once) and `reveal_index` (screen order, 0..N-1 once) are separate fields; `reveal_order[reveal_index] = rank_position` (e.g. top3 `[2,3,1]`, top5 `[4,2,5,3,1]`).
- Each entry names a `moment_id` (moments table) and its `source_id`; `in_ms`/`out_ms` are integer source milliseconds inside the moment; window >= 0.8 s.
- Per source: max 2 entries, never adjacent reveals, no overlapping windows.
- Rights gate: every source AND moment must be `approved`/`approved_with_conditions` (moment `rights_status` null = inherits the source); otherwise the plan is non-publishable and must not be converted.
- Check: `npm run -s cli -- ranking:validate productions/<id>/plan.json` (exit 1 unless publishable). Reveal order: `ranking:reveal --n 3 --scores "1=5/9,2=8/6,3=6/4"`.
- Convert: `npm run -s cli -- ranking:cutlist productions/<id>/plan.json [--out productions/<id>/cutlist.json]` (re-runs the per-moment rights gate; refuses non-publishable plans, other brands, title spans that do not spell the title or carry < 2 accent colours, a CTA over a payoff).
- Layer mechanism + geometry: `docs/brands/viral-rankings/ARCHITECTURE.md` §6.

### Cut-list fields added by the viral-rankings build step (2026-10-31, pipeline-engineer)
Written by `ranking:cutlist`; the generic ones are opt-in for any brand, `rank_layers`/`ranking` are refused unless the production's brand is `viral-rankings`.
- Segment `fit_box: [x0,y0,x1,y1]` (canvas px, generic, blur fill only): contain the (border-cropped) picture inside that rect, blurred fill around it; overrides `zoom`/`pan_*` (a `motion` push/pull scales from the fitted size). viral-rankings landscape sources use `[0,590,1080,1210]` (letterbox under the title band); portrait sources use `fill: "cover"`.
- `caption_x` (% of canvas from centre), `caption_font_px` (output px), `caption_max_chars` (paging + wrap width; default 16) - generic, defaults unchanged. viral-rankings: x -3.7, 64 px, 20 chars, `caption_y_ranges` y 15.9 (band y 1215-1400), `caption_bg` 0.8, `caption_per_line`.
- `rank_layers` (viral-rankings): `{ n, reveal_order, labels{rank: left_label}, title{words:[{text,color #hex}]}, logo (abs path|null), brand_text, flash (bool), cta {variant:"mid_sub", at, dur <= 0.8, text}|null }`. Rendered at build time as full-canvas layers (title, rail state per reveal, brand mark, rank flash, CTA) on tracks `VR Title`, `VR Rail`, `VR Brand`, `VR Flash`, `VR CTA` under the overlay/caption tracks. Reveal k starts at the first segment whose `item` = `reveal_order[k]`, so segments must be in reveal order.
- `ranking` (viral-rankings): `{ plan, format, reveal_order, criterion, entries:[{segment, rank_position, reveal_index, moment_id, source_id, in_ms, out_ms, est_start, payoff_est, left_label}], warnings }`. The builder re-checks every moment's effective rights before building and, after the OCC project is built, writes one `moment_usage` row per entry (status `in_draft`, version, `timeline_start_ms`) and marks the moments `used_in_draft` (reservation kept).
- `bed_accents` from the converter = reveal starts + the last payoff (the tone bed's crest lands on #1).
- Build output for rank layers: `v<N>/overlays/vr_*.png|webm` (+ `vr_layers.spec.json`) and `v<N>/qa/zone_check.json` (burned-in text heuristic, warn-only; also `ranking:zones <production>`).

### Media by content (all brands)
The builder addresses media by sha256 content hash; in timeline.json an item's `src` is the absolute media path. (Retired 2026-11-02: the OpenChatCut import staging `data/cache/occ-import/` and `productions/<id>/occ-pool.json` are no longer read or written; they can be cleaned up.)

### Per-entry framing + build extras (viral-rankings pilot rank-261031-fzcu, 2026-10-31, showrunner-viral-rankings; all opt-in, defaults unchanged)
- Plan entry `framing: { trim:{top,bottom,left,right}, fit_box:[x0,y0,x1,y1], punch:{from_s,to_s,scale_to} }` -> segment `trim` (source px, crops away a baked-in bug), `fit_box` (default `[0,590,1080,1210]`; the pilot uses `[0,420,1080,1210]`, trim chosen so the crop has the box's aspect) and `punch` (slow punch-in, seconds from the segment start, `scale_to` ratio; the picture grows upward only, its bottom edge stays on the fit_box bottom). The zone check maps zones into the trimmed crop.
- **Compact title layout (2026-10-31, pipeline-engineer, opt-in):** plan `title_layout: "compact"` -> one-line title band y 262-402 (`rank_layers.title_box`; the layer renderer shrinks the font until it fits, 2 lines only for very long titles) and blur entries default to `fit_box [0,410,1080,1370]` (960 px = 50 % of the frame). Max box in compact = `[0,410,1080,1420]` (converter refuses a fit_box above y 410 / below 1420). The rail (y 600-1205) and the caption band (y 1215-1400) then sit over the footage. Entry `framing.fill_box: true` centre-crops the source to the box aspect (trim computed from the source size on top of any manual trim; refused above 25 % of width/height), so **4:3 sources reach 50 % height**: `{"fill":"blur","framing":{"fit_box":[0,410,1080,1370],"fill_box":true}}` (1440x1080 -> 112/113 px side trim; 320x240 -> 25 px). The converter then writes `ranking.entries[].footage_height_pct`. Builder border auto-crop runs on top of the trim, so a bordered source may fill by height with thin side bars. Default (no `title_layout`) output is unchanged.
- **viral-rankings style v2 (2026-11-04, default for new cut lists):** `rank_layers.style: "v2"` + `caption_style: "v2"` (written by `ranking:cutlist`; plan `style: "v1"` = old look). Under v2 `tall`/`compact` use the two-line title band y 228-462 and footage top y 470 (fit_box tops above y 462 are moved to 470); compact rail y 540-950 with slide-in reveals; glass caption pill. See BRAND-GUIDE.md 5b. The v1 lines below describe the old one-line band.
- **Tall title layout (2026-10-31, QA F13 "fill the screen", opt-in):** plan `title_layout: "tall"` -> one-line title band y 262-372 (Anton shrinks until one line fits; a very long title at the 60 px floor can spill 2 lines over the top of the footage) and blur entries default to `fit_box [0,380,1080,1600]` (1220 px = 64 % of the frame, aspect 0.885). Max box `[0,372,1080,1620]` (converter refuses above y 372 / below y 1620). Captions (y 1215-1400), the end/spoken-ask CTA pill, per-clip credit plates (<= y 1420) and the rail stay where they were, inside the union text-safe box, and now sit **over** the lower footage (ink pill / plate / red pill + outline keep them legible); y 1420-1600 is picture only (YouTube bottom UI y > 1540 and the right-side buttons x > 960 cover picture, never text). Pair it with `framing.follow` and **no `aspect`** (the window takes the box aspect, so portrait and 4:3 sources fill the full 1080 px width and the full height): `{"fill":"blur","framing":{"follow":{"keys":[[0,0.5,0.45],[5,0.5,0.45]]}}}`; `fill_box` works only for sources near 0.885 (it refuses cutting > 25 %). Zone check (`ranking:zones` and the build) uses the tall `title_box`. Default (no `title_layout`) output is unchanged.
- **Punch is clipped to the fit_box (2026-10-31 fix, 8knt v6):** a segment `punch` on a `fit_box` segment is now baked into the cached window (2x lanczos supersample + zoompan, eased zoom, bottom-centre anchor) at a fixed frame size = the picture's contained size in the box, so the zoom happens *inside* the box and never reaches the title band; the timeline gets no scale keyframes. Same `from_s`/`to_s`/`scale_to` semantics. `punch.clip: false` restores the old grow-upward OCC keyframes (only for reproducing a pre-fix render; fzcu/jcx9 were approved with the old behaviour, a rebuild of them would now render clipped).
- **Post-edit fields (2026-10-31, pipeline-engineer):** things showrunners hand-edited in `cutlist.json` after `ranking:cutlist` are plan fields now, so a re-run reproduces the build: `end_hold_ms` -> `end_hold` (s, 0-3.5); `caption_max_chars` (8-32, default 20) / `caption_font_px` (40-90, default 64); `credit_style {font_px 18-40 (default 28), max_chars 24-80 (default 48)}` -> `credit_line`; `credits[]` replaces the auto credits (source file names) with clean titles (must stay truthful); `credit_center_y_px` limit raised 1430 -> **1520**: <= 1460 is clear of Shorts/Reels/TikTok bottom UI (channel/description row starts ~1500), 1461-1520 is allowed (jcx9 was approved at 1515) but `ranking:validate` warns and QA must check the plate is not under the channel row. Checked: fzcu (+ `end_hold_ms: 250`), jcx9 (+ `caption_max_chars: 16`, `credit_style {34, 52}`, `credit_center_y_px: 1515`) and 8knt (+ `credit_style {26, 64}`, `credits`) regenerate their hand-edited cut lists (key order aside; jcx9 adds the y-1515 warning to `ranking.warnings`). `productions/rank-261031-8knt/post-cutlist.py` is kept and still works.
- Segment `why` strings are ASCII (" - " instead of an em dash) since 2026-10-31: readers that decode UTF-8 as cp1252 (PowerShell 5.1 `Get-Content` without `-Encoding UTF8`, Python `open()` without `encoding="utf8"`) showed the dash as "â€”" (fzcu v9 QA note; the file itself was valid UTF-8). `ranking:validate` now refuses mojibake in any plan string, and the CLI tolerates a UTF-8 BOM in plan files.
- Plan `narration.lines[{id,text,at_ms}]` (explicit locked script, replaces hook + `narration_text`), `narration.max_pause`; `caption_emphasis{WORD:#hex}` -> cut list `emphasis_map` (caption pages holding the word take that colour); `bed_dips[{at_ms,dur_ms,db}]` -> `bed_dips` (volume keyframes on the tone bed); `credit_text` (+ `caption_center_y_px`, `credit_center_y_px`) -> `credit_line` (persistent small credit plate); `rail_label_at_ms[k]` -> `rank_layers.label_at` (active rail card shows only `#N` until the beat, then the label).
- **Build defaults (2026-10-31, pipeline-engineer; contract: `docs/brands/viral-rankings/RANKING-ENGINE.md` §6).** New cut-list fields, all written by `ranking:cutlist` and only meaningful for viral-rankings: segment `punch_stages[{from_s,to_s,scale}]` (extra clipped punch stages, scales multiply; a single legacy `punch` renders exactly as before), `clip_credits{font_px,center_y_px,max_chars,lines[{seg,text}]}`, `one_hit{seg,rel,flash,flash_s,sting,sting_volume}`, `end_cta{text,dur}`, `cta_band`, `caption_start_zero`, `tail_max` (s). Plan entry `grade{brightness,contrast,gamma}` maps to segment `lift`.

### `rank_layers.sub_badge` (viral-rankings only, default ON since 2026-11-01)
`{ at: number[], x1?, y0? }` renders a small animated YouTube-style badge (red SUBSCRIBE pill with a white bell + a round thumbs-up button, 332x76 px) as a 2.5 s frame-accurate alpha WebM on track "VR Badge": pop-in with scale overshoot (0.25 s), a fake tap at 1.05 s (pill turns grey SUBSCRIBED, bell rings, thumb button turns yellow and bounces, ripple), hold, fade out. `ranking:cutlist` writes it for every plan: one badge at the narrator's spoken ask (plan `spoken_cta_at_ms`, or `spoken_cta: {at_s}` copied from script.json; without it only the end badge plays, with a warning) and one in the last 2.5 s (the end CTA). Default position = top-right of the footage, right edge x 936, top 20 px under the title band (clear of the rail x<290, captions/CTA y>=1215, right UI x>960); override with plan `sub_badge: {x1, y0}`; switch off with plan `sub_badge: false` or `build_defaults.sub_badge: false`. Renderer: `packages/ranking/py/layers.py` (`render_badge`).
