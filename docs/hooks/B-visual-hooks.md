# B. Visual hooks, frames 0-3 s (round 3 research, 2026-11-03)

Scope: frame-0 image, withheld contact, honest near-miss, pattern interrupt, glimpse/blur tease, punch-in/freeze, text placement, first cut, sound at 0.0 s. Spoken/text questions = section A. Loops/endings = section C.
Tags: `[can]` = renderer supports it today. `[needs-eng: x]` = needs pipeline work. All frame numbers assume 30 fps (`frame = s x 30`). Keyframe frames are item-local; easing sits on the LEFT keyframe. Transforms act around canvas centre: `x`,`y` are % of canvas W/H from centre, `scale` 1 = contain-fit.

## 0. Evidence quality (read first)
Almost all public hook data is vendor/creator blog material with unsourced numbers. Nothing below is peer-reviewed. Treat numbers as priors, then check them in our own Studio data (docs/youtube-intelligence). Do not cite any single stat as fact in a brief.
- S1 dev.to/bulkdl "Hook Engineering 2026": scroll decision about 1.4 s (Reels) to 2.3 s (Shorts); first frame must differ from the feed and stop the scroll on mute; zoom plus an audio cue by 0.8 s. One creator's 120-video test (r=0.84 between first-3 s retention and views), so weak. https://dev.to/bulkdl/hook-engineering-the-science-of-the-first-3-seconds-in-short-form-video-2026-2jp9
- S2 virlo.ai "Why the first few seconds matter": cut right after the reveal, not later; re-engage with a visual interrupt every 3-5 s. https://virlo.ai/blog/why-the-first-few-seconds-matter
- S3 virlo.ai "Science behind What happens next": open-loop framing tied to Loewenstein's information gap; the gap works only if resolvable. https://virlo.ai/blog/the-science-behind-what-happens-next
- S4 percee-digital "Video hooks that convert": cites Socialinsider 2024 completion 92% under 15 s vs 68% at 31-60 s, so shorter is safer. https://percee-digital.pages.dev/insights/video-hooks-that-convert
- S5 revid.ai Reels safe-zone checker: hook text roughly 330-700 px from top on 1080x1920, right edge clear of buttons. https://www.revid.ai/instagram-reels-safe-zone
- S6 upload-post.com safe-zone checker: avoid top 20%, bottom 25%, right 15% (differs from S5 and S7, so we use the intersection). https://www.upload-post.com/tools/safe-zone-checker/
- S7 mediacheatsheet "Design for Instagram Reels": a first frame that looks like a loading screen or blur-transition gets scrolled; Meta ads guide quoted: keep top 14%, bottom 35%, sides 6% free. https://mediacheatsheet-com.pages.dev/blog/how-to-design-for-instagram-reels-a-practical-guide-for-creators-and-marketers/
- S8 submagic.co (Arabic) "أفضل hooks لتيكتوك وانستغرام": hook = what is seen, heard or read in the first 2-3 s; write 3 openings and keep the best (matches hook-architect's 3 options). https://www.submagic.co/ar/blog/الافضل-hooks-لتيكتوك-وانستغرام
- S9 nestscale.com "Increase hook rate on TikTok & Reels": hook rate = share watching the first 3 s; combine visual + text + audio. https://nestscale.com/blog/viral-hooks-for-tiktok-and-reels.html
- S10 opus.pro "TikTok hook formulas": formulas for 3-second holds (bold claim, mid-action open). https://www.opus.pro/blog/tiktok-hook-formulas
- S11 motionapp.com "Create ads that stick": ad-creative testing: an unresolved visual beats a resolved one for holding attention. https://motionapp.com/blog/create-ads-that-stick
- S12 autonolab "Loop ladder": curiosity that compounds; each beat opens a smaller question. https://blog.autonolab.com/blog/2025-10-02-the-loop-ladder-building-curiosity-that-compounds/
- Conflict: sound-on share. S1 says 54-68% start muted; another secondary source says most Reels are sound-on. Design for both: picture carries the hook, sound sells it.

## 1. Global rules for every mechanism
1. Frame 0 is never black, a logo, a title card or a fade-in. No `fadeInFrames` on the first item (sets opacity below 1 on frame 0). `[can]`
2. Mid-action open: start the source on the frame where the subject is already moving or about to be hit. Use `srcStartFrame` to trim the run-up. `[can]`
3. First cut or first visible change at or before 1.5 s (45 f). Second change by 3.0 s. Then a change every 3-5 s (S2). `[can]`
4. Hook text: max 6 words (EN) or 5 words (AR), centre-x, `y` between -22 and -12 (about 28-38% from top = 540-730 px on 1080x1920). Clears top 14-20% and bottom 25-35%. fontSize 120-140 in the 1920 design box (about 68-79 px real), fontWeight 900, `textShadow` heavy, pill `bgEnabled` for busy footage. `[can]`
5. 360 px test: render frame 0, 15, 45, 89 at 360 px wide. If the hook is not readable and the image is not understood in 1 s with the sound off, fail.
6. Sound at 0.0 s: a video audio item or a hit at item frame 0 with no fade. Never silence at frame 0 unless the silence is the mechanism (see M3). `[can]`
7. Payoff clock: every hook records `promise_paid_at` (hook-architect). Withheld contact must pay by 3.0 s for a one-beat hook, or at the stated reveal for a countdown. Never later than the video's end.
8. Right 15% of frame holds no text. Max 2 lines.

## 2. Mechanisms

### M1. Withheld Contact (moving toward it, cut one beat before impact)
- What: the open shows a body/object closing on a target (ball to net, boot to ball, capsule to water, tool to part); we cut 3-6 frames before contact, and the next shot is the reaction/result.
- Why: unresolved motion creates a gap viewers want closed (S3, S11); cutting just after the key beat is S2's rule inverted, so withhold only the first 0.1-0.2 s, never the outcome.
- Recipe (30 fps), clip C is trimmed to end 4 frames before contact:
  - 0-1 f: frame 0 already in motion (srcStartFrame so approach starts here). Subject large, target visible.
  - Item A (clip, 0-48 f = 1.6 s). Keyframes `scale`: f0 1.00 easeIn -> f40 1.14 linear -> f48 1.14. Slight push implies pull toward the target. `[can]`
  - `volume` keyframes on A: f0 0.9, f36 0.9 easeIn -> f44 0.15 (air drops; the beat is felt, not heard). `[can]`
  - Hit sound (audio item) placed at the START of item B, not before. Gap between A end and B start = 0 f.
  - Item B (result, from 48 f): starts on the result frame; cut with a `scale` 1.10 -> 1.00 easeOut over 6 f (settle). `[can]`
  - Text: 2 words max at 6 f (e.g. "NO WAY"), opacity 0 -> 1 in 3 f easeOut; remove at the cut. `[can]`
- Failure: cut so early that viewers never see what the target was; or the contact never comes (bait). Also slow approach = boring.
- Honesty test: the video must show the contact (full, un-cropped, un-slowed) within 3 s of the cut, and the thumbnail/frame 0 must come from real footage of that event. If the result is not what the frame implied, rewrite.
- Podium Pop: free-kick, open on boot swinging; cut 4 f before contact; payoff = the ball hits the bar. Rank #5 entry only; #1 payoff full.
- Mission Voices: open on a gloved hand reaching for the hatch/tool the astronaut then talks about; cut before the grab, then the spoken line. Source footage only, no re-staging.
- Way It Was Made: open on a crane lowering a stage toward the pad; cut at 4 f before docking; payoff = clamp seat sound.
- quiz-ar: the highlighted object slides toward the answer slot; cut before the answer lights; answer shows after the count (not leaked: guard 8 in CLAUDE.md).
- Tiko & Pip: gentle only: Pip reaches for a flower, cut before it is picked; payoff is a smile in the next shot within 2 s. No fear, no falling.

### M2. Honest Near-Miss
- What: frame 0 shows the "almost": the ball a hair from the post, a rocket a metre from the tower, a stunt that nearly fails. Picture is the claim, the outcome is true.
- Why: tension plus prediction error (S11, S10 mid-action opens); needs a real near-miss so the gap closes honestly.
- Recipe: pick the source frame with the smallest gap between subject and hazard as frame 0 (srcStartFrame). Hold 0-12 f static composition, then:
  - `scale` 1.00 -> 1.18 easeOut over f0-12 (punch toward the gap), `y` 0 -> -2 easeOut over f0-12 (subject stays above bottom 35%). `[can]`
  - f12-45: normal speed to the true outcome. Text at f3: "TOO CLOSE" opacity 0 -> 1 over 3 f. `[can]`
  - Audio: source audio at 1.0 on frame 0 plus a short low hit at f0 (0.5 gain). Do not duck. `[can]`
- Failure: staged or tightly cropped "near miss" that was a clear miss/hit; frame 0 from a different attempt than the one shown.
- Honesty test: frame 0 and the outcome must be the same take; run a "is this the same play?" check on 3 frames. Disclose clearly if shown as a different angle.
- Podium Pop: keeper fingertip save, frame 0 = ball 10 cm from the line. MV: tether drifting close to a strut (real footage). TWIWM: wing tip clearing a hangar door. quiz-ar: two options nearly identical in size, hook "الفرق بسيط" at 3 f. Tiko & Pip: Pip's block tower leaning but it holds.

### M3. Silence Snap (sound sells the visual)
- What: the video opens on a visual and a deliberate 0.2-0.3 s duck before the beat, then the sound returns louder at the cut. Variant: hit at 0.0 s.
- Why: S1 pairs a jarring cue within 0.8 s with the visual break; sound-on viewers get the jolt, mute viewers still get the cut.
- Recipe: A audio keyframes `volume` f0 1.0 -> f30 1.0 easeIn -> f36 0.0 linear (hold 0 to f42) then B hit audio item at f42 gain 1.2 (max 2). `[can]` Tone bed or music must not exceed -14 LUFS master; check master().
- Failure: duck masks speech; clipping when gain 1.2 stacks with source peaks.
- Honesty test: the loud event must match a real event on screen. No fake bangs under quiet footage.
- Per brand: PP stadium crowd cut to 0 then roar at the goal; MV the radio crackle drops, then the first word; TWIWM engine rumble drops, then ignition; quiz-ar a short tick that stops before the reveal card; Tiko & Pip: soft chime only, no jump sounds, volume max 0.7.

### M4. Glimpse Tease (the #1 shown through a cover)
- What: in the first 1.5 s, flash the final-rank clip (or the answer object) obscured or tiny, then countdown from #5. Payoff is the #1 at the end (for countdowns) or by 3 s (single clip).
- Why: gap size is controllable (S3): the viewer sees enough to want the rest.
- Recipes:
  - (a) Dark veil `[can]`: image item (solid dark PNG, 1080x1920) above the clip. Keyframes `opacity` f0 0.92 -> f12 0.92 easeOut -> f30 0.0. Clip under it at full speed. Result: silhouette/glow then reveal.
  - (b) Blur cover `[can]` (hack): text item with a single space, `bgEnabled true`, `bgBlur` 20 (fixed 20 px renderer blur), `bgColor rgba(0,0,0,0.25)`, big bgPadding to cover the subject area; `opacity` f0 1 -> f18 1 easeIn -> f24 0. Verify the backdrop blur actually blurs the clip, not only the text box, on a test render before shipping.
  - (c) Real blur ramp or pixelate `[needs-eng: blur filter keyframes]`.
  - (d) Mini window: the clip scaled to 0.35 in the upper area, `scale` f0 0.35 -> f30 0.35, then back; the rest of the frame is the #5 clip. `[can]`
- Failure: the tease clip is not in the video (bait), or the tease is a different clip from the #1.
- Honesty test: the teased frame must be a literal frame of the final #1 shot (file hash or timestamp logged in hooks.json). Pay it at the #1 reveal and state "back to this" at the end.
- PP: the #1 stunt veiled, text "#1 IS INSANE" only if true and if a QA reviewer agrees. MV: the quote's speaker as a silhouette. TWIWM: a mystery part shown 35% scale. quiz-ar: the correct image appears small and blurred in the corner; guard against answer leak, so only show it after the question phase or when it is the intentional hook.

### M5. Punch-In (zoom on the one detail)
- What: the first frame is wide, then a fast zoom to the detail that matters (the face, the gap, the number) at 0.2-0.4 s.
- Why: a sudden zoom is the visual break in S1; also makes the detail readable at 360 px.
- Recipe: clip `scale` f0 1.00 easeOut -> f8 1.35 easeInOut -> f45 1.40 (slow drift); `x` and `y` offset to centre the detail: for a detail at (px,py) in % of canvas, set x = -(px-50) x 1.35 and y = -(py-50) x 1.35 on the same frames, easing matches scale. `[can]`
- Text overlay: not on the zoom target; place at y -18.
- Failure: constant zoom on every video (blindness); upscaling soft footage; edges of blurred background fill showing.
- Honesty test: the zoom must emphasise something that is actually in the clip, not crop out a disclaimer or context. Keep the wide frame once before the first caption if context matters (MV, TWIWM).
- PP: face of the keeper on the near miss. MV: the helmet reflection. TWIWM: the part number plate. quiz-ar: the detail asked about. T&P: slow 1.00 -> 1.12 over 24 f easeInOut only.

### M6. Freeze-Hit (freeze frame)
- What: the video freezes on the key frame for 0.3-0.5 s (text lands), then plays on.
- Recipe: pre-extract that frame as a PNG with ffmpeg in the builder; image item at the first 9-15 f (0.3-0.5 s), identical transform to the clip; clip item starts right after with `srcStartFrame` at the frame after the freeze. Image `scale` 1.00 -> 1.04 easeOut over 9 f (live-feeling hold). `[can]` (needs a builder helper that writes the PNG; it is a still-extraction step, no new renderer feature).
- Failure: the freeze looks like a stall (no sound change). Pair with M3 duck: volume 1.0 -> 0.2 over 3 f at the freeze and back to 1.0 at the release.
- Honesty test: the freeze must land on a moment that is truthful (not a contact moment faked by freezing a pre-impact frame to imply an impact).
- Slow-mo replay of the beat: `[needs-eng: speed ramp / setpts]`. Workaround: repeat the 12 f clip twice with `scale` 1.00 -> 1.08. `[can]`

### M7. Pattern Interrupt (planned visual shock at 1.5-3 s)
- What: a change the viewer does not predict: colour flip, scale jump to a hard crop, an unexpected cutaway, text snap.
- Why: S2 (interrupts every 3-5 s), S1 (rapid visual changes for faceless content).
- Recipe: at f45: cut to a new shot or hard `scale` 1.0 -> 1.30 (`linear`, 3 f); text change at the same frame; hit sound item at f45. At f90 repeat with a different type (do not repeat the same type twice in a row). `[can]` Rotation, whip, glitch, mask wipes `[needs-eng: rotation, masks]`.
- Failure: shock with no content change (flash only); more than 3 interrupts in 3 s becomes noise and hurts caption readability.
- Honesty test: the interrupt must introduce real new information (new shot or number), not just noise.
- All brands: PP crowd reaction cutaway; MV an Earth shot from the window; TWIWM an archive photo of the builder; quiz-ar the timer snap; T&P a soft colour wash only (opacity 0 -> 0.3 -> 0 over 12 f, no flashes, never strobe).

### M8. Mute-Proof Overlay (hook text)
- What: one line that states the premise in the safe zone, landing in the first 6 f.
- Recipe: text item f0-f75 (2.5 s). `y` keyframes: f0 -10 -> f6 -16 easeOut (settle up 6% = small drop-in, no bounce); `scale` f0 0.92 -> f6 1.00 easeOut; `opacity` f0 0 -> f3 1 linear. Props: fontSize 130, fontWeight 900, textShadow `0 4px 0 #000, 0 0 24px rgba(0,0,0,.8)`, pill bgColor `rgba(0,0,0,.55)` radius 24, paddingX 36 paddingY 18, width <= 80% of box. Fade out: `fadeOutFrames` 6. `[can]`
- Arabic: RTL, fontWeight 800, max 5 words, no letterSpacing, no diacritics that clip, check connected letters at 360 px. Per-word karaoke highlight `[needs-eng: per-word highlight]`.
- Failure: text over the face, in the bottom third, or the same on all videos.
- Honesty test: the text must be a claim the video pays (the claim table in script.json lists text -> evidence timestamp).

### M9. Hard Open (first 3 s as one structure)
Use as the default 3-s skeleton, one of M1-M7 as the engine:
- 0.00 s: mid-action frame 0 + audio at f0 + text at f3-6.
- 0.50-1.00 s: the one move (punch-in or the withheld cut).
- 1.00-1.50 s: first cut or result.
- 1.50-3.00 s: the promise line appears or the premise question is asked (A), pattern interrupt at 1.5-3.0 s (M7).
- 3.0 s: payoff of the micro-loop; open the next one (S12 "loop ladder").

## 3. Per-brand defaults
| Brand | Default engine | Avoid |
|---|---|---|
| Podium Pop | M2 or M1 plus M8; M4 for TOP 5 intros | fake #1 teasers; over-zoom on faces |
| Mission Voices | M5 on face/hand plus M3 radio-drop; true-time cut | staging; hiding the context card |
| The Way It Was Made | M1 (docking/lift) plus M7 archive cut | generic "How they built" text hooks |
| quiz-ar | M4(d) mini-window plus M8 AR text; timer M7 | leaking the answer colour in frames 0-3 s |
| Tiko & Pip | M5 slow + M1 gentle; chime only | startle, flash, jump sounds, scary near-miss |

## 4. Honesty gate (qa-director adds to Retention section)
Fail a hook if any:
1. Frame 0 or the thumbnail shows an event not in the video (or from another take).
2. The promise is not paid by `promise_paid_at`.
3. Contact/outcome is cropped, slowed or relabelled to look different.
4. Text claim exceeds footage ("INSANE", "NEVER SEEN") with no evidence line.
5. The teaser clip is not the clip in the video.
6. Sound effect has no on-screen event.
7. Kids: any startle (flash, sudden loud, falling, fear). Quiz: answer visible before the question phase ends.
Prevent: hook-architect logs `{frame0_source, cut_frame, promise_paid_at, tease_source_ts}` in hooks.json; QA checks the 4 frames at 360 px with sound off, then once with sound.

## 5. Engineering asks (not in the renderer today)
- `[needs-eng: blur/pixelate filter with keyframes]` for a true glimpse blur.
- `[needs-eng: speed ramp/setpts]` for slow-mo replays.
- `[needs-eng: rotation, masks]` for whip transitions, wipes, spotlight reveals.
- `[needs-eng: per-word highlight]` for karaoke hook text.
- `[needs-eng: audio EQ/low-pass]` for the muffled-then-open sound trick.
- Builder helper (no renderer change): `freezeFrame(src, frame) -> png` for M6.
