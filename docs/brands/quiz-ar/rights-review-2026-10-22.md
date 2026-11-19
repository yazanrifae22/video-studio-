# Rights review: quiz-ar («شو شايف؟»), 2026-10-22

Reviewer: rights-scout. Scope: productions quiz-261021-m52q, -z5hx, -gu0d, -ocxp, -j5qw and `data/brand/quiz-ar/`.
These are not `sources` rows, so verdicts live here and in each production's `assets.json` (`rights` field; m52q: `rights-review.json`, it has no assets.json yet).
I viewed every generated image (finals, originals, green/blue-key edits and unused candidates), the logo, end card and SVG art.

## Summary

| Production | Verdict | Why |
|---|---|---|
| quiz-261021-z5hx (donuts) | approved_with_conditions | Clean generic AI donuts, own SVG puzzles. AI disclosure + records. |
| quiz-261021-ocxp (ice cream) | approved_with_conditions | Same. |
| quiz-261021-j5qw (gems) | approved_with_conditions | Same. |
| quiz-261021-m52q (pilot) | approved_with_conditions (partial) | Images and Gemini voice reviewed; no assets.json; render, music and captions not yet reviewable. |
| quiz-261021-gu0d (sneakers) | **rejected as-is** (sneaker art only) | Sneaker reproduces Converse Chuck Taylor midsole trade dress. SVG rounds R2/R4 fine. R1/R3 blocked until the shoe is regenerated. |
| data/brand/quiz-ar | approved_with_conditions | Original logo/SFX/signature; Cairo OFL compliant; trademark search for the name not done. |

## 1. OpenAI terms on image outputs

Source read: OpenAI Terms of Use, "Published: January 1, 2026", archive snapshot 2026-10-21
(https://web.archive.org/web/20261021174838/https://openai.com/policies/terms-of-use/; openai.com itself returned 403 to the fetch tool, curl got the live Service Terms page only).
- Ownership: "you ... own the Output. We hereby assign to you all our right, title, and interest, if any, in and to Output." Commercial use is therefore not restricted by OpenAI; no attribution to OpenAI is required by the Terms.
- Limits: assignment is "to the extent permitted by applicable law" and "if any". Output "may not be unique and other users may receive similar output". It does not cover "Third Party Output". Practical result: do not claim exclusivity or register these images as marks. (Whether purely AI-generated images are copyrightable at all is a legal question I did not re-verify; treat as possibly unprotected.)
- Prohibited: "Represent that Output was human-generated when it was not"; infringing anyone's rights; "Automatically or programmatically extract data or Output". The studio drives the official Codex CLI under the owner's subscription at low volume (1 to 4 generations per production). That is the intended client; keep it that way, no scraping or bulk harvesting.
- Labelling expectation: Terms point to the Sharing & Publication Policy (updated 2022, aimed at sharing prompts/completions): attribute content to your name/company and "Indicate that the content is AI-generated in a way no user could reasonably miss or misunderstand." Honour it with the disclosure lines in section 5.
- Usage Policies (effective 2025-10-29) forbid "use of someone's likeness, including their photorealistic image or voice, without their consent in ways that could confuse authenticity". Not triggered: no people.
- Provenance evidence: every `*_orig.png` / `cand/*.png` carries an embedded C2PA manifest (issuer "OpenAI OpCo, LLC", software agent "OpenAI Media Service API", timestamps 2026-10-21 21:28 to 21:45 UTC). The derived cut-outs (`_c`, `_g`, keyed files) have no manifest because processing re-encoded them. Condition: keep the originals as the provenance record.

## 2. Visual review of every generated image

Checked for logos, brand marks, text, watermarks, recognisable people, recognisable products or trade dress.

| Items | Finding |
|---|---|
| Cherries (red, burgundy, yellow), rose | Nothing on them. No text, no marks. Photoreal but generic produce. |
| Donuts (pink, chocolate, vanilla, and the unused `__1` candidates) | Plain glazed ring donuts, no sprinkles, no box, no logo. Generic. (Pink glaze with drips is a common look, not a specific character or brand.) |
| Ice-cream cones (4) and scoop + empty cone | Generic waffle cones and scoops on flat blue. No wrapper, no brand. |
| Gems (6, brilliant cut) | Generic faceted gems on white. |
| Sneakers (red/sky/white, green-key edits, `sneaker_top` candidates) | **No logo, text, star patch, heel label or stripe, so the prompts worked, but the silhouette is a Chuck Taylor Ox lookalike**: separate white rubber toe cap, diamond-textured toe bumper, two parallel midsole lines, canvas upper with metal eyelets. See below. |
| Watermarks / visible AI marks | None found in any image. |
| Real people / faces | None. |

### Sneakers: trade-dress finding (rejected as-is)
- Converse's US Reg. No. 4,398,753 covers the midsole design: "the design of the two stripes on the midsole, the design of the toe cap, the design of the multi-layered toe bumper featuring diamonds and line patterns, and the relative position of these elements to each other" (per the Federal Circuit opinion, https://www.leagle.com/decision/infco20181030134, Converse v. ITC, 30 Oct 2018).
- Our shoe shows exactly that combination. Missing logos do not cure trade dress, which is the point of the mark.
- Status of the mark is unsettled: ITC 2016 held it invalid for lack of secondary meaning; the Federal Circuit vacated and remanded (2018). I could not find the remand outcome, so I treat it as live ("if in doubt, it is not approved").
- Mitigating facts (not enough for me to approve): a quiz graphic is not footwear sold in commerce and confusion as to source is unlikely. Whether that holds is a legal judgement, so escalate if the owner wants to keep these shoes anyway.
- Fix, cheap and keeps the puzzle intact: regenerate with a different silhouette. Prompt changes: "slip-on or minimalist flat-sole trainer", "one-piece smooth rubber sole, no separate toe cap, no diamond or waffle texture on the toe, no double midsole stripe, no metal eyelets". Keep the same canvas colours and luminance targets (red 0.206 etc.), then re-submit. The R2 shape puzzle (star on a sole outline, own SVG) and R4 boxes are fine as they are.

## 3. Reference-creator check (Suyog Mahat, research/market/suyog-mahat-intuition-reels.md)

- Layout/graphics: ours = blue-violet gradient, yellow accent, eye-in-question-mark logo, countdown ring, Cairo type, SVG puzzles. Theirs = cream parchment card, ornamental corners, sepia brain, serif text. No parchment, no brain, no card layout, no copied frame found. Pass.
- Source material: `data/refs/*.json` hold metadata only (5 KB); no reel media was downloaded; image prompts have no reference image attached (Codex logs show text-only prompts). The 10 `fb-*` sources remain `research_only`, none is referenced as an asset.
- Naming/leak: `script.json` in gu0d, j5qw, ocxp, z5hx has a `"reference"` field naming the fb reel and title. It is internal. Condition: it must never be copied into a description, caption or credit (publishing uses `script.json` description unchanged, so keep that field out of any published text).
- Topic overlap (advisory, not a rights block): objects match their titles (cherry, rose, donut, shoes, choco ice cream; earring became gems). Ideas and subjects are not protected, and our round mechanics and look are different. Still, near-identical topics raise "copycat" and platform "unoriginal/repetitive" risk; YouTube's inauthentic-content policy (updated 2025-07-15, https://support.google.com/youtube/answer/1311392) excludes "AI-generated content built on generic templates... minimal variation across videos" from monetisation. Keep each video's concept distinct and lead with the explanation line, which is the channel's real differentiator.

## 4. Cairo font (SIL OFL 1.1)

- Files: `Cairo[slnt,wght].ttf` (verbatim variable font), `Cairo-Bold.ttf`, `Cairo-Black.ttf` (static instances cut from the variable font), `OFL.txt`, `METADATA.pb`. Copyright line: "Copyright 2009 The Cairo Project Authors (https://github.com/Gue3bara/Cairo)".
- Reserved Font Name: the copyright notice declares none (OFL.txt contains only the licence's own definition of the term, no "with Reserved Font Name" statement). Name tables of the static files confirm family "Cairo", name 13/14 carry the OFL text and URL. So modified/instanced files may keep the name "Cairo"; no renaming required. If a future subset is made and a RFN ever appears upstream, rename it.
- Obligations met/needed: keep the copyright + licence text with any redistributed font copy (it is present); do not sell the font on its own. Rendering text into video frames is not redistribution. The `captions.ts` / `compose.ts` copy the TTF into per-project folders: fine for internal build dirs; if a project folder is ever shared, include `OFL.txt`.
- Verdict: approved. Upstream reference: https://github.com/google/fonts/tree/main/ofl/cairo (folder lists OFL.txt, METADATA.pb; I could not read RFN text there, the conclusion rests on the local OFL.txt/name tables).

## 5. Platform AI disclosure (synthetic voice and AI images)

What the content is: photoreal and stylised AI-generated still images of generic objects (no people, no real events) and a synthetic Arabic voice (Gemini prebuilt voice, not a clone of a real person). Google states audio from its models carries an inaudible SynthID watermark (secondary reports for Gemini 2.5/3.1 TTS; I did not find the official ai.google.dev page). Do not try to remove it.

Rule for the studio: **disclose everywhere**, even where the policy strictly exempts this content. Disclosure alone does not reduce reach on YouTube (per page) and prevents "undisclosed AI" strikes if a platform's detector fires on the C2PA/watermark.

| Platform | What the current policy says | Required action |
|---|---|---|
| YouTube | https://support.google.com/youtube/answer/14328491 : disclosure required for realistic content that makes a real person say/do something, alters real events/places, shows realistic scenes that did not happen, or AI-generated music as main focus. Non-realistic/animated content and AI used for scripts, thumbnails, captions is exempt. Labels may be added automatically (GenAI tools, C2PA metadata, detection); disclosure does not limit audience or monetisation; repeated non-disclosure can lead to labels, removal or YPP suspension. | Strictly not required for our generic objects, but set "Altered or synthetic content = Yes" in Studio and add the description line. A sticker label may appear in the expanded description. Our final MP4 probably has no C2PA, so automatic labelling is not guaranteed either way. |
| TikTok | Community Guidelines (https://www.tiktok.com/community-guidelines/en/integrity-authenticity): creators must label AI-generated or significantly edited content that "shows realistic-looking scenes or people"; unlabeled content "may be removed, restricted, or labeled". TikTok reads C2PA Content Credentials to auto-label (newsroom 2024-05-09). The how-to support page did not load for me. | Turn on the "AI-generated content" label in the post settings (confirm exact toggle name in the app at publish time) and add the caption line. |
| Instagram / Facebook / Threads | Meta applies "AI info" labels from detected industry-standard signals or self-disclosure, on Facebook, Instagram and Threads (https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/, April 2024; no current help-centre page could be fetched, two help URLs 404/empty). Earlier Meta statement (Feb 2024) required the disclosure tool for photorealistic video or realistic-sounding audio, with possible penalties. | Use the in-app "AI label"/"AI info" disclosure on each Reel/post when the option appears (verify in the app) and keep the caption line. For Threads, include the line in the post text. |
| Voice-specific | None of the three pages sets a rule for a generic synthetic narrator beyond "realistic audio" in Meta's 2024 statement. | The narration is synthetic, say so in the line below. |
| OpenAI / Google terms | OpenAI Terms: do not represent Output as human-generated; Sharing & Publication Policy: indicate AI-generated "in a way no user could reasonably miss". Gemini API Terms (effective 2026-03-23): Google "won't claim ownership"; law may require attribution to users; Unpaid Services data may be used to improve Google products ("Do not submit sensitive... information"). | Caption line; no personal data in prompts. |

### Required wording (put in every description/caption; keep it first or second line)
- Arabic: «الصور في هذا الفيديو مولّدة بالذكاء الاصطناعي، والتعليق الصوتي صوت اصطناعي.»
- Arabic short (TikTok/Instagram/Threads caption): «صور وصوت مولّدان بالذكاء الاصطناعي»
- English (secondary, bilingual descriptions): "Images and narration in this video are AI-generated (synthetic voice)."
- Attribution string for credits: «الخط: Cairo (SIL OFL 1.1). المؤثرات والموسيقى: إنتاج القناة.» No credit to OpenAI/Google is required by their terms.
- Platform toggle: ON for AI/synthetic content on YouTube, TikTok, Instagram, Facebook; Threads: caption line.

## 6. Per-production tables

Verdict key: A = approved, AWC = approved_with_conditions, R = rejected. "Common conditions" = C1 to C5 below.

- C1 Disclose per section 5 (caption line plus platform toggle).
- C2 Keep the OpenAI-C2PA originals as the provenance record; no editing of provenance metadata.
- C3 Never describe the images as real product photos or as human-made.
- C4 Never publish the `script.json` "reference" field or the reference creator's name; fb-* sources stay research_only and unused.
- C5 No exclusivity claim on the images; do not register them as logos/marks.

Evidence for AI images in all tables: OpenAI Terms of Use https://openai.com/policies/terms-of-use/ (archive https://web.archive.org/web/20261021174838/https://openai.com/policies/terms-of-use/), plus the embedded C2PA manifest in the named file.

### quiz-261021-z5hx (donuts): AWC
| Asset | Origin | Verdict | Conditions | Evidence |
|---|---|---|---|---|
| donut_pink (orig, cutout, _c, _g, cand/__1/__2) | Codex imagegen 2026-10-22 (prompt logged) | AWC | C1-C5 | OpenAI Terms; C2PA in `art/donut_pink_orig.png` |
| donut_choc (same set) | Codex imagegen | AWC | C1-C5 | same; `art/donut_choc_orig.png` |
| donut_vanilla (same set) | Codex imagegen | AWC | C1-C5 | same; `art/donut_vanilla_orig.png` |
| r2_odd, r3_count, r4_size (+ ring, targets), .svg/.png | own SVG via make_art.py; Cairo digits | A | Ship OFL.txt with fonts | local code; OFL |
| art_meta.json, raster_jobs.json, cutout.py, make_art.py | own tooling | A (internal) | none | n/a |

### quiz-261021-ocxp (ice cream): AWC
| Asset | Origin | Verdict | Conditions | Evidence |
|---|---|---|---|---|
| cones (`cand/cones__1.png`, cone_chocolate/strawberry/vanilla/pistachio) | Codex imagegen, session 01a1606b | AWC | C1-C5 | OpenAI Terms; C2PA in `cones__1.png` |
| scoopcone (`cand/scoopcone__1.png`, scoop_chocolate, cone_empty) | Codex imagegen, session 01a1606c | AWC | C1-C5 | same |
| r2-paths.json (+preview) | own geometry | A | none | n/a |
Note: the `assets.json` still says `rights_status: pending rights-scout countersign` inside each generated entry; the new top-level `rights` field supersedes it.

### quiz-261021-j5qw (gems): AWC
| Asset | Origin | Verdict | Conditions | Evidence |
|---|---|---|---|---|
| gems (`cand/gems__1.png`, gem_red/blue/yellow/green/purple/orange) | Codex imagegen, session 01a1606d | AWC | C1-C5 | OpenAI Terms; C2PA in `gems__1.png` |
| gem_silver (luma of gem_blue) | derived | AWC | same as parent | n/a |
| tray.svg, tray_noclasp.svg, r3-spot-preview.png | own SVG | A | none | n/a |
Gems are named by colour only ("ruby", "emerald" in prompts). Do not claim they are real stones in captions.

### quiz-261021-gu0d (sneakers): R for sneaker art
| Asset | Origin | Verdict | Conditions | Evidence |
|---|---|---|---|---|
| sneaker_red, sneaker_sky, sneaker_white (orig, green edit, cutout, _c, _g) | Codex imagegen + edit | **R** | Chuck Taylor midsole trade dress (toe cap + diamond toe bumper + two midsole stripes). Regenerate per section 2 and re-submit. | https://www.leagle.com/decision/infco20181030134 (Reg. 4,398,753); images viewed |
| sneaker_sky_light (derived) | derived from sky | **R** | follows parent | same |
| sneaker_top (`cand/sneaker_top__1/__2`) | Codex imagegen | **R** (unused) | same silhouette; do not use | same |
| r2_shape (star on stripe-filled sole outline) | own SVG | A | none; outline is a generic sole, not a brand shape | local |
| r3_shade (15 shoes grid) | own SVG embedding sneaker_sky_c.png | **R** until the shoe is replaced | swap the embedded PNG, rebuild | same |
| r4_boxes | own SVG | A | none | local |
Recommendation: replace the shoe, keep the rest. If the owner prefers to keep the Chuck-style shoe, that is a legal risk decision for the owner/counsel, not something I can approve.

### quiz-261021-m52q (pilot): AWC, partial
| Asset | Origin | Verdict | Conditions | Evidence |
|---|---|---|---|---|
| images/cherry_red*, cherry_burgundy*, cherry_yellow*, rose* (orig, cutout, _c, _g) | AI images, C2PA shows OpenAI issuer, 2026-10-21 21:28 UTC | AWC | C1-C5, plus: write assets.json (origin, prompt, sha256) since none exists | OpenAI Terms; C2PA in `images/cherry_red_orig.png` and `rose_orig.png` |
| voice/take_Zephyr_levantine.wav and v1/narration/*.wav | Gemini TTS, voice Zephyr, cached | AWC | C1; keep watermark intact; no personal data in prompts; one request per video | https://ai.google.dev/gemini-api/terms (effective 2026-03-23) |
| voice/ab_*.wav | Gemini TTS A/B tests | AWC (tests only) | not for publication | same |
| _probe/* | test renders | not for publication | delete or exclude from archives | n/a |
| quiz.json, script.json, script-notes.md | own text | A | script-notes line "Synthetic voice disclosure" must be implemented (C1) | local |
| Final render, music bed, SFX mix, captions | not built yet | **pending** | Re-submit the MP4 and file list. Bed/SFX must come only from `packages/quiz/py/synth_audio.py`. | n/a |

### data/brand/quiz-ar: AWC
| Asset | Origin | Verdict | Conditions | Evidence |
|---|---|---|---|---|
| fonts/ (Cairo variable, Bold, Black, OFL.txt, METADATA.pb) | google/fonts ofl/cairo | A | keep OFL.txt with any redistributed copy; no RFN, so no rename needed | https://github.com/google/fonts/tree/main/ofl/cairo ; local OFL.txt, name tables |
| logo/ (mark, horizontal, stacked, SVG/PNG) | own SVG (eye inside a question mark in a countdown ring) | AWC | No trademark/registry search has been done for the name «شو شايف؟» / Shu Shayef / @shoshayef. A quick web search found no quiz channel by that name (only the unrelated "SHA-SHOF شاشوف"). Do a search of YouTube/TikTok/Instagram handles and the WIPO/GCC registries before launch or paid promotion. | n/a |
| signature/ (corner-bug, end card, intro sting) | own HTML/SVG; Cairo | A | the sting/end card audio is silent in the files; audio is added from our SFX | local |
| social/ (profile, covers, banner) | own | A | same as logo | local |
| sfx/ (tick, tick_last, whoosh, pop, ding, shimmer, sting, flip, swap) | `synth_audio.py`: "Original, sample-free sound design (numpy synthesis)" | A | none | `packages/quiz/py/synth_audio.py` header and code (no sample file is read) |
| bed (generated per video by `synth_audio.py bed`) | numpy synthesis (Karplus-Strong chords, shaker) | A | none | same |
| templates/, src/, tools/ | own | A | none | local |
| `packages/quiz/vendor/gsap.min.js` (GSAP 3.14.2) | GreenSock/Webflow | A as tooling | Used to animate in headless Chrome only; not redistributed in the output. Header: "Subject to the terms at https://gsap.com/standard-license"; I could not read the licence text itself (gsap.com says GSAP is "now free for everyone"). Do not publish or resell the studio tooling with GSAP in it without reading that licence. | https://gsap.com/standard-license (text not retrieved) |

## 7. Open items

1. Owner decision on the sneakers: regenerate (recommended) or accept legal risk. Escalated to the orchestrator.
2. m52q: assets.json missing; re-submit when the render exists.
3. Trademark/handle search for the brand name (not done, not a rights block for private builds).
4. App-level confirmation of the exact AI-label toggle names on TikTok/Instagram/Facebook at publish time (support pages did not load).
5. If the owner ever upgrades to paid Gemini or OpenAI API tiers, re-check the terms; this review assumes the free Gemini tier and the ChatGPT-subscription Codex CLI.

## Addendum A (2026-10-22, later): gu0d v2 trainer re-countersign and assets.json restore check

### A1. gu0d v2 trainer art: approved_with_conditions
Viewed: `trainer_red_orig`, `trainer_sky_orig`, `trainer_white_orig`, all seven `cand/trainer_*__1..3` candidates, and `r3_shade_puzzle.png` / `r3_shade_reveal.png`.
- Silhouette: one continuous fabric upper over a rounded almond toe, thin one-piece smooth white cupsole, plain sidewall, tonal laces through stitched holes. No separate toe cap, no toe bumper, no diamond or waffle texture, no midsole lines, no metal eyelets. None of the three elements of Reg. 4,398,753 (toe cap, diamond/line toe bumper, two midsole stripes) is present, so the v1 trade-dress finding no longer applies. The shape is a generic minimalist trainer; I see no other brand's distinctive feature (no stripes, panels, swoosh-like curve, heel tab or logo).
- Other checks: no text, logo, watermark or person in any image. The three colours are edits of one generated base, so they are consistent by construction. OpenAI C2PA manifests are present in the originals and candidates I checked (2026-10-21 22:09 to 22:10 UTC), so provenance is intact.
- R3 grid: 15 identical trainers on white, one lightened; the reveal is a plain outline box. Nothing to flag.
- Verdict: **approved_with_conditions**. Conditions C1 to C5 from section 6, plus: keep the shoe as is (any further regeneration or edit gets re-viewed first); v1 `sneaker_*` and `sneaker_top` stay rejected and must not be reused in any video. R1 and R3 are unblocked. Residual risk: low; no trademark search of footwear marks was run beyond the Converse registration, since the v2 shape shares none of its elements.

### A2. assets.json `rights` blocks restored by the showrunner
- z5hx: **confirmed** correct against section 6. Re-added the lost per-asset notes (unused candidates `cand/*__1,__2` approved_with_conditions, not used; derived donut files follow parent). Added a `confirmed` entry.
- gu0d: **corrected**. The restored block said "pending"; it now reads approved_with_conditions with the v2 trainer entries, the retained v1 rejections, the R3 note, the new conditions above and the evidence URLs. Added a `confirmed` entry.
- The `restored_note` field was removed from both after verification. ocxp, j5qw and m52q blocks were not touched; a regenerating asset script can drop them again, so the `rights` block should be written by a step that merges rather than rewrites.

## Addendum B (2026-10-22, later): m52q pilot v2 final countersign

Scope: `productions/quiz-261021-m52q/v2/render.mp4` (1080x1920, 30 fps, 45.37 s, h264/aac; Remotion-encoded by OpenChatCut, no C2PA in the file), music bed, SFX mix, caption overlays, corner bug and end card. Verdict now lives in that production's `assets.json` (`rights`); `rights-review.json` was removed.

**Verdict: approved_with_conditions. One blocking condition: the published text must disclose the AI images.**

### B1. Asset reconciliation (timeline.json, build.json, files vs assets.json)
- All 71 files listed in `assets.json` exist and their sha256 values match disk (renders, overlays, narration clips, SFX copies and bed included).
- Timeline SFX cues (40) use only `ding, flip, pop, shimmer, sting, swap, tick, tick_last, whoosh`, all listed and all from `synth_audio.py` (sample-free).
- Narration is the cached Gemini take `take_Zephyr_levantine.t1.12_p0.2.wav` (tempo/pitch-tightened copy of the same TTS output, listed). No new TTS quota used (build log).
- Not listed but on disk: `images/rose_g.png` (grayscale twin of the rose, not referenced by `quiz.json` or the timeline, not in the render) and `images/generation.json` (internal generation log). Neither is rendered; add or delete.
- `_probe/` is excluded and was not imported. No OpenChatCut import outside the listed files was visible in `build.json` (I cannot read the OCC project database itself; the check rests on the build log, timeline and the frames).
- Brand layers as used: `v2/overlays/corner_bug_canvas.png`, `endcard.mp4`, `captions.webm` are built from own logo and Cairo text; approved.

### B2. Rendered frames
Viewed the 31-frame QA contact sheet and full-resolution frames at 0.5, 7.5, 23, 38.2 and 44.5 s. Content: three cherries, cups, four memory tiles (own SVG star, ball, leaf plus the generated cherry), the rose, a drawn "7", score boxes, captions, corner-bug pill, end card. No logo of another brand, watermark, person, text from another source. Nothing from the reference creator: no parchment card, brain, serif type, photo backdrop or layout. Pass. (QA's own techqa also passes: -14.2 LUFS, -1.3 dBTP, no flash/freeze/black.)

### B3. Disclosure gap found
`script.json` (published unchanged per the production loop): `description_ar` ends with «التعليق الصوتي مولّد بالذكاء الاصطناعي.» and `attribution_block` says "Narration: AI-generated voice (Gemini TTS)". **Neither says the images are AI-generated.** Required fix before publishing: add «الصور في هذا الفيديو مولّدة بالذكاء الاصطناعي، والتعليق الصوتي صوت اصطناعي.» to `description_ar` and "Images and narration are AI-generated" to credits, then set the platform label toggle (section 5). Also recommended: drop "Format inspired by intuition-test reels;" from credits and attribution_block (names no creator, but is unnecessary and implies derivation).

### B4. Other notes
- Remotion: the MP4 comment shows "Made with Remotion 4.0.509" (OpenChatCut's renderer). Its licence terms for commercial use were not reviewed here; it is the owner's editor choice, flagged only for awareness.
- Gemini TTS audio carries Google's watermark; the loudness mastering in the build did not and must not be used to remove it.
- Brand-name trademark/handle search is still open (section 6).

## Addendum C (2026-10-22, later): m52q pilot v5 re-countersign

Scope: `productions/quiz-261021-m52q/v5/render.mp4` (40.33 s, 1080x1920, h264/aac; techqa pass, -14.1 LUFS, -1.9 dBTP). Verdict updated in that production's `assets.json` (`rights`, earlier v2 verdict kept under `history`).

**Verdict: approved_with_conditions (C1 now met for the description; short captions still need the line).**

### C1. Imports vs assets.json
- 74 files listed; all exist and all sha256 values match disk. No file in `images/`, `voice/*.wav` or `v5/` is unlisted (`rose_g.png` and `generation.json` are now listed as internal, not rendered).
- All 33 v5 media files are listed (5 round clips, 3 overlays, 13 narration lines, bed, 9 SFX, 2 renders). The 31 files named with a content-hash tag were checked: each tag equals the first 10 hex characters of that file's sha256, so the hash naming is trustworthy.
- New Gemini take `take_Zephyr_levantine_e868f78435acb7c0a248b3af.wav` (and its `.t1.1_p0.2` tightened copy, which the build used) is listed with sha256 and "synthetic voice, disclose". Build log: narration reused from cache, no extra quota.
- R4 bloom-only rose is not a new file: it is `cover_clip: ellipse(49% 35% at 50% 39%)` applied to the already cleared `images/rose_c.png` inside the R4 clip, so it inherits the rose verdict (generated image, OpenAI C2PA on `rose_orig.png`).
- Timeline SFX unchanged: only the 9 synthesized names, all listed. The OpenChatCut project database cannot be read by me; the import check rests on the files, `build.json`, `timeline.json` and the frames.

### C2. Frames
Viewed the v5 QA contact sheet and full frames at 0.5, 30 and 40 s. Only our own graphics, cherries, cups, tiles, the cropped rose with the drawn Arabic 7, captions, corner bug and end card. Nothing from the reference creator (no parchment, brain, serif text, photo backdrop or layout) and no third-party media.

### C3. Publish copy (script.json) against C1 and C3
- C1: `description_ar` line 1 reads «الصور في هذا الفيديو مولّدة بالذكاء الاصطناعي، والتعليق الصوتي صوت اصطناعي.» Credits: "Original puzzles by شو شايف؟; images AI-generated; synthetic narration." Attribution block adds the tools. This satisfies the description-level disclosure (YouTube description, Facebook post body, Instagram caption if the description is used). **Gap:** the short captions in `titles` for TikTok, Instagram, Facebook and Threads carry no disclosure, so add «صور وصوت مولّدان بالذكاء الاصطناعي» to those posts, and set the platform AI-label toggle on YouTube, TikTok, Instagram and Facebook.
- C3: nothing in the copy calls the images photographs or human-made; no reference-creator name or id anywhere in `script.json` (0 matches); the earlier "Format inspired by intuition-test reels" wording is gone.
- Stale item: `open_items` still lists a channel-name placeholder; the copy already uses «شو شايف؟», so it can be cleaned up. Not a rights issue.


## Addendum D (2026-10-22, later): z5hx donuts v3 countersign

Scope: `productions/quiz-261021-z5hx/v3/render.mp4` (40.47 s, 1080x1920; techqa pass, -14.1 LUFS, -1.1 dBTP), plus the art it uses. Verdict recorded in that production's `assets.json` (`rights`; the earlier verdict is kept under `history`).

**Verdict: approved_with_conditions, with two blocking fixes (one record, one copy line).**

### D1. Imports vs assets.json
- **Gap:** z5hx `assets.json` is still in the pre-render shape. It lists the art only: all 20 art files (donut originals, cutouts, `_c`, `_g`, SVG rounds, ring and targets layers) exist and match their `sha256_16`. **None of the 30 v3 files (nor the 2 new voice-take files) is listed**: 5 round clips, 3 overlays, 11 narration lines, bed, 8 SFX, 2 renders; the new Gemini take is the 2 voice files (`take_Zephyr_levantine_4390b94d97f4ae951b297a22*.wav`).
- To keep the countersign verifiable I computed the sha256 of every v3 file and stored the inventory in `rights.inventory_v3_sha256`. The engineer must write these entries into `assets.json` in the m52q shape (origin, sha256, kind) before the approval counts as final.
- Content-hash names are trustworthy: all 28 hash-tagged v3 media files carry a 10-hex tag equal to the first 10 hex of their own sha256.
- Timeline SFX: 8 cues, all from the synthesized set (`synth_audio.py`, no samples). Bed likewise own synthesis. Narration is one new Gemini TTS take (Zephyr), a single request.
- The OpenChatCut database is not readable by me; the import check rests on the files, `build.json`, `timeline.json` and the frames.

### D2. Frames
Viewed the 27-frame contact sheet and full frames at 0.5, 14 and 39.5 s. Only our donut images (AI-generated, OpenAI C2PA present in `art/cand`), SVG grids and rings, drawn tiles, captions, corner bug and end card. No reference-creator material (no parchment, brain, serif text, photo backdrop or their layout) and no third-party media.

### D3. Publish copy (script.json)
- C1 met: `description_ar` line 2 states AI images and synthetic voice; credits repeat it; the TikTok, Instagram, Facebook and Threads captions each end with «صور وصوت مولّدان بالذكاء الاصطناعي». The YouTube title carries none, which is fine because its description does. The platform AI-label toggle must still be set at publish time.
- C3: **fix needed.** `attribution_block` says "Donut photographs: AI-generated". Replace "photographs" with "images". The rest of the copy never calls the art photographs.
- "Format inspired by visual-quiz reels": **acceptable, not required to go.** It is generic, true, names no creator, and does not make any disclosure or rights claim false. I still recommend deleting it, as for the pilot: it is unnecessary, implies derivation, and four of our five productions share a subject with the reference creator's titles, so the line adds copycat optics for no benefit. If it stays, keep it generic.
- `script.json` has `internal_reference_DO_NOT_PUBLISH` naming `fb-947038524754472`. It is not in any publishable field, but delete it before publishing so it cannot leak.
- Pinned comment and titles: no issues.

## Addendum E (2026-10-22, later): m52q v9 and z5hx re-keyed cut-out

### E1. m52q v9: approved_with_conditions
- `assets.json` (auto-merged per build): 213 entries, all files exist, all sha256 match. All 33 v9 media files are listed; the 31 hash-tagged ones match their own sha256. All 16 voice wavs, including the 3 new Gemini takes (`_005fcb08...`, `_450dd49f...`, plus the older `_e868f784...`), are listed and match. SFX are the same 9 synthesized names.
- Frames: 27-frame v9 contact sheet viewed, including the alpha end-card over the background and the R4 rose cover with drawn 7. Only own graphics and cleared generated images; nothing from the reference creator, no third-party media.
- Copy: description line 1 and the TikTok/Instagram/Facebook/Threads captions carry the AI disclosure; no reference name or ids in `script.json`. Platform AI-label toggle still to be set at publish. Verdict in `assets.json` `rights` updated, v5 kept in `history`.

### E2. z5hx: re-keyed vanilla cut-out and v3 blockers
- New `donut_vanilla_c.png` / `_g.png` (640x548, hash matches assets.json; v1 kept as `*.v1.png` and logged under `revisions`). Viewed: same generated image, edge repaired only, clean white-glaze edge, no marks, no text. **Approved_with_conditions** (same conditions as the other donuts). The rebuild may go straight to QA.
- v3 blockers resolved: all 32 `inventory_v3_sha256` entries are in `assets.json` and match disk; the copy says "images" and "photograph" appears nowhere in `script.json`; the reference note moved to `internal-notes.json` (not published). Remaining only: platform AI-label toggle at publish, and the "Format inspired by" line is still recommended for removal.

## Addendum F (2026-10-22, later): m52q v13

`v13/render.mp4` (39.13 s, techqa pass, -14 LUFS, -1.8 dBTP): **approved_with_conditions**, no new rights issues.
- `assets.json`: 345 entries, all files exist, sha256 match; all 33 v13 media files listed; the 31 hash-tagged files match their own sha256. Voice is the same cached take as v9 (`take_Zephyr_levantine_005fcb08...t1.1_p0.2.wav`, listed). SFX are the same 9 synthesized names.
- Frames: 27-frame contact sheet viewed (tile pops, end-card cross-fade, range chip, eased flash). Own graphics and cleared generated images only; nothing from the reference creator, no third-party media.
- Copy unchanged and compliant (disclosure in description line 1 and in the TikTok/Instagram/Facebook/Threads captions; no reference name, no "photograph" wording). Platform AI-label toggle still to be set at publish.
- Non-rights observation for QA: at about 30 s the new range chip («بين ١ و ٩») sits right above the countdown ring and touches it in the 30.0 s frame.

## Addendum G (2026-10-22, later): z5hx v5 and ocxp v3

Both **approved_with_conditions**, no new rights issues.
- **z5hx v5** (41 s, -14.2 LUFS, -1.6 dBTP): 133 entries, all files exist, sha256 match (15 repo-level brand files re-checked 15/15); every v5 media file and voice wav listed; 28 hash-tagged names match. New Gemini take (`..._6a0ed1329d48b1109dd7045f`) is listed. Frames: 27-frame sheet, own graphics, cleared donuts, re-keyed R3 vanilla donut with clean edge.
- **ocxp v3** (38.47 s, -14.1 LUFS, -1.6 dBTP): 110 entries, all match; 29 hash-tagged names match. Frames: cones, memory tiles, braid paths, cups, stacked-scoop towers built from cleared cut-outs; no marks or third-party content. Take `..._cf2c09efef54d66e441ad49e` is listed.
- Copy (both): AI disclosure in description and the four short captions (YouTube title none, fine); "images", no "photograph", no "inspired by"; no reference name in `script.json` (kept in `internal-notes.json`). Platform AI-label toggle still to be set at publish.
- Non-rights note: ocxp's end-card text «شو شايف» in the final frame lacks the «؟» and the sheet shows it mid-fade; QA may want to check.

## Addendum H (2026-10-22, later): j5qw gems v2

`v2/render.mp4` (40.1 s, -14.1 LUFS, -1.8 dBTP): **approved_with_conditions**, no new rights issues.
- `assets.json`: 80 entries, all files exist, sha256 match (brand-file paths re-checked earlier, 15/15); every v2 media file and voice wav listed; 28 hash-tagged names match. Take `..._61cbc865b7713f45806cd318` listed.
- Frames: 27-frame sheet; own graphics, generated gems (cleared), own SVG tray; no reference-creator material, no third-party media. Gems are not claimed as real stones in the copy.
- Copy: AI disclosure in description and the four short captions; "images", no "photograph", no "inspired by"; no reference in `script.json` (only `internal-notes.json`). Platform AI-label toggle still to be set at publish.
- Non-rights note for QA: the last contact-sheet frame shows the end-card wordmark mid-fade and truncated («شو ثا»); confirm the final frame is complete.

## Addendum I (2026-10-22, later): gu0d v4 and z5hx new take

### I1. gu0d v4: approved_with_conditions
- `assets.json`: 111 entries; all v4 media files listed (27 hash-tagged names match); take `..._5066fbda252c83e1f65c3a98` listed. **Two stale hashes:** `art/r2_shape_puzzle.png` and `art/r2_shape_reveal.png` were regenerated after `assets.json` recorded them (own SVG art, no rights impact); the engineer must re-merge those hashes.
- Trainers re-viewed as rendered (frames at 8 s and 21 s plus the full contact sheet): one-piece fabric upper, smooth one-piece sole, no separate toe cap, no diamond or waffle bumper, no midsole lines, no eyelets, no logos. Nothing resembling the Converse midsole mark. R2 star-on-sole and R4 box art are own graphics. No reference-creator material or third-party media.
- Copy: AI disclosure in the description and the four short captions; "images"; no "inspired by"; reference only in `internal-notes.json`. Platform AI-label toggle still at publish.

### I2. z5hx new Gemini take
Registered `voice/take_Zephyr_levantine_9880b832b2fe894e357ed57a.wav` and `.t1.12_p0.2.wav` (R2 answer reworded; sha256 in `rights.registered_takes`): approved_with_conditions as synthetic voice, same conditions as earlier takes. **v6 is not staged yet** (no `v6/` folder); I will countersign it when it exists.

## Addendum J (2026-10-22, later): l6ar v4, hrxp v4, 30r2 v2, 9lfp v1, 71z4 v3

All five **approved_with_conditions** (C1 to C5), no rejections. `rights` blocks merged into each assets.json. Viewed each generated original/candidate once at 512 px; every candidate carries an OpenAI C2PA manifest.
- **l6ar** padlocks (4 colours + open brass derived): generic smooth one-piece body, plain round shackle, plain keyhole. No laminated plates (Master Lock), no disc/granite form (Abus), no Yale-style plate, no logo. Cosmetic (QA, not rights): open-padlock cut-out has a faint seam at the body top and a stray edge at the shackle foot.
- **hrxp** cheese: plain wedges, no labels or wax marks. The red-wax edit is unused; re-view if it is ever used (Babybel/Edam look).
- **30r2** citrus: whole lemon, orange, lime; nothing on them.
- **9lfp** umbrellas: plain-colour generic canopies; cups, saucers and Ponzo are own SVG.
- **71z4** hoodies: plain, no logo, tag, drawstring or print.
- No person, text or watermark; nothing from the reference reels. `quiz:assets` ran for all five (renders l6ar 120, hrxp 117, 30r2 58, 9lfp 29, 71z4 88).
- Copy lint, all five: disclosure in description line 1 and the TikTok/Instagram/Facebook/Threads captions; "images", no "photograph", no "inspired by"; no reference name or id in `script.json` (its publish_conditions only mention "the reference creator" generically); the reference stays in `internal-notes.json`. Platform AI-label toggle still at publish.

## Addendum K (2026-10-22, later): 60tv v4, ux4u v3, 3uyp v3, aecz v4, 7wti v3

All five **approved_with_conditions** (C1 to C5), no rejections. `rights` blocks merged into each assets.json (with the render sha256); `quiz:assets` ran for all five (renders 60tv 128, ux4u 96, 3uyp 93, aecz 93, 7wti 90).
- Viewed once at 512 px: kitten_basket__1/__2, pig_apple_chick__1/__2, garden__1/__2, plus the derived chick, ladybird, basket+kitten composite and the green/red/navy frog cut-outs. All six originals carry the OpenAI C2PA manifest. No logo, text, watermark or person anywhere.
- **60tv** kitten + wicker basket: plain photoreal ginger tabby, no bow, collar or tag; not Hello Kitty. Basket is plain willow, no label.
- **3uyp** pig, apple, chick: photoreal piglet with no clothes or cartoon form (not Peppa or Porky), plain apple, plain chick. **aecz** reuses the chick (derived; C2PA original is in 3uyp).
- **ux4u** six garden creatures: generic monarch-type butterfly, ladybird, bee, snail, caterpillar, tree frog; nothing branded. **7wti** frog, ladybird and the red/navy recolours of the green frog: photoreal, no collar or cartoon features, so not Kermit; the recolours must not be described as real colour morphs.
- No reference-reel material: prompts are text-only, no reel media. Copy lint on all five: AI disclosure in description line 1 and in the TikTok, Instagram, Facebook and Threads captions (YouTube title none, fine); no "photograph", no "inspired by"; reference only in `internal-notes.json`. Platform AI-label toggle still at publish.
- Non-blocking tidy-ups: 3uyp attribution lists "Pig and apple" but the chick image is also generated there; the `internal_reference_DO_NOT_PUBLISH` key in `internal-notes.json` is fine; `script.json` `rights_conditions` mentions C4 generically only.

## Addendum L (2026-10-22, later): batch 3 perception and memory lanes

All ten **approved_with_conditions** (C1 to C5); `rights` blocks merged into each assets.json (with render sha256); `quiz:assets` ran for all ten. Viewed every original/candidate once at <=512 px; all carry the OpenAI C2PA manifest. No logo, text, watermark or person; prompts text-only, nothing from the reference reels.
- Perception: x5iz hats (v2), li3p plush bears (v1; no Steiff button/ear tag, no named cartoon bear), pywe landmarks (v2), xhao resin chairs (v2, brown/navy edits), tp3f bats (v1).
- Memory: 8vj1 cloches (v2), 10qg planets (v2), 5qn3 doors (v1), e7du gift boxes (v1), eqw1 bulbs (v2).
- **Copy fix (blocking before publish, x5iz, li3p, xhao, tp3f):** `attribution_block` says "Hat/Bear/Chair/Bat photos"; replace with "images" (C3). Other six clean.
- **10qg:** the unused blue ocean planet (o_3) looks like Earth with recognisable continents. Confirmed unused in quiz.json, art_used and renders. Not a rights problem; keep unused, and never label any planet as a real or NASA photo.
- Copy lint otherwise passes for all ten: disclosure in description line 1 and the four short captions, no "inspired by", no reference name or id in script.json. Platform AI-label toggle at publish.

## Addendum M (2026-10-23): batch 4, memory lane (h10t, kxhi, kyxs, 6go7, x01z) and perception lane (rq64, zo3f, okt7, 8xtx, 5g91)

All ten **approved_with_conditions** (C1 to C5); `rights` blocks merged into each assets.json (previous block kept under `history`, render sha256 recorded); `quiz:assets` ran for all ten. Viewed every original/candidate once at <=512 px (33 images); prompts text-only, nothing from the reference reels. No logo, text, watermark or person.
- **h10t** generic houses and lit windows. **kxhi** plain white twin-jet with plain red tail, no livery, no text; generic A320/737-type shape, so condition: never name an airline or aircraft model. **kyxs** photoreal animals (no mascot look), plain rimmed crockery, plain gold disc. **6go7** plain red canvas tote, generic tableware. **x01z** generic sofa, rug, lamp, shelf, armchair, plain green backpack, no iconic design.
- **Batch 4 perception** (rq64 trays, zo3f walls, okt7 daisies, 8xtx stairs, 5g91 spheres): the 4-colour images (trays6, walls5, daisies4, stairs4, spheres4) are the only ones referenced by quiz.json; the superseded 3-colour `*__1` files and the unused intermediate 4-colour variants (trays4/5, walls4) are not used. Toy stairs are smooth blocks with no studs (not Lego/Duplo). The RGB scalings (pink tray x0.93, ochre wall x1.11) are derivations of the same generated image. okt7 campfires and 5g91 strawberries are own SVG, not generated.
- Copy lint, all ten: disclosure in description line 1-2 and the four short captions (YouTube title none, fine); no "photo", no "inspired by"; no reference name in public fields. Platform AI-label toggle at publish.

## Addendum N (2026-10-23): shu-shayef new quizzes 3yfb (crayons), 4lys (cactus), 46o4 (seashells), vgbk (kites)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. No AI images in any of the four.
- **Art:** all own vector. 3yfb and 46o4 are drawn by `art/gen5.py` + `art/b4lib.py` (SVG, rasterised with the brand's raster.mjs); 4lys and vgbk by `art/heroart.py` + `make.py`/`shu5.py`. No http, download or request calls in any generator (the only `http` string is the SVG xmlns). Viewed 2 images per production at <=360 px.
  - **3yfb** crayons: plain navy wrapper with two white bands and three label dashes, no text, no Crayola green/yellow wrapper or chevron; pencil-like crayons are generic. Condition: never name a crayon brand.
  - **4lys** cactus pots: flat round/columnar cacti in plain pots, nothing branded. **46o4** seashells: flat fan shells and spirals, generic. **vgbk** kites: plain diamond kites with bow tails, no mark, no brand pattern.
- **Reference reel:** FB reference is research_only and sits only in `internal-notes.json` (4lys checked; the others carry none in public fields). `script.json` of all four: no reel name or id, no "Suyog", no "photo/photograph", no "inspired by"; format re-designed, no footage, frames or text used.
- **Audio:** voice is Gemini TTS (Zephyr take + `.t1.12_p0.2` variant in `voice/`), disclosed in description line 1 and `attribution_block` ("synthetic narration" / "AI-generated"). The 9 brand SFX in each assets.json (ding, flip, pop, shimmer, sting, swap, tick, tick_last, whoosh) all match their recorded sha256 on disk and are own numpy synthesis. Font Cairo (OFL), already countersigned.
- Non-blocking: the 4lys/vgbk assets.json have no `assets[]` entry for the art (art provenance is in the generator scripts and `art_meta`); acceptable, but add an own_svg entry if re-merging. Platform AI-label toggle at publish.

## Addendum O (2026-10-23): quiz-261023 5a6q (buttons), a6q2 (mugs), d11d (ducks), mig1 (candles), 46o4 (seashells R2/R3), 3yfb (crayons R1/R2)

All six **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; assets.json lists the current art.
- **Art provenance:** all self-generated, no generated images, no downloads. Buttons and candles: `5a6q/art/b7gen.py` (own SVG, rasterised with brand raster.mjs; the only external call is that local node script). Mugs and ducks: `d11d/b7art.py` (own PIL drawing; no network calls). Seashells and crayons: `art/gen5.py` + `b4lib.py` in each production (SVG, headless Chrome raster). The `http` string appears only as the SVG xmlns.
- **Trade dress (2 images per production at <=360 px):**
  - **5a6q buttons:** plain four-hole sew-through buttons, generic. **mig1 candles:** plain pillar candles, no label, text or brand mark. **a6q2 mugs:** plain and striped mugs with no logo, siren or cafe mark (the red/white stripe has no stars, so no flag or chain look). **d11d ducks:** generic yellow rubber duck with orange beak, no trademark character (not Donald, not a brand duck).
  - **46o4 seashells (changed R2/R3):** pink, sand, teal, purple scallop fans, not the red/yellow Shell oil mark. Condition: never use red+yellow for the shell. **3yfb crayons (changed R1/R2):** navy wrapper with white bands, no Crayola green/yellow and no text. Condition: never name a crayon brand.
- **Reference reels:** FB refs are research_only and sit only in `internal-notes.json`/`quiz.json` reference fields (noted as "research pointers only, never rendered or published"). `script.json` of all six: no "photo/photograph", no "Suyog", no "inspired by", no reel id. The only "facebook" string is the platform description key.
- **Audio:** Gemini TTS disclosed in each script ("synthetic narration" 2 to 3 times; "AI-generated" in a6q2, d11d, 46o4, 3yfb; "Gemini TTS" in all). 5a6q and mig1 carry the "synthetic narration" disclosure and the Gemini TTS line but no literal "AI-generated"; acceptable, add it at the next rebuild if wanted. Platform AI-label toggle at publish.
- Non-blocking: a6q2 assets.json `own_art.generator` points to `d11d/b7art.py` (shared mug/duck generator) and lists duck file names, not mug names; fix the metadata if re-merging. The mug generator and the mig1 candle generator are not copied into their own production folders (shared in d11d and 5a6q).

## Addendum P (2026-10-23): quiz-261023 541y (snowmen), ihnk (watermelon), n9ey (feathers), all v1

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; no generated images and no downloads.
- **Art provenance:** 541y snowmen are own PIL drawing (`d11d/b7art.py`, `snowman()`; no network calls; 7 colours + cover). ihnk melon slices and n9ey feathers are own SVG from `5a6q/art/b7gen.py` (`melon()`, `feather()`), rasterised with headless Chrome via `raster_jobs.json`; the only `http` string is the SVG xmlns, the only `url()` is the local Cairo font file. Non-blocking: the shared generators are not copied into 541y/ihnk/n9ey and the ihnk/n9ey assets.json has no explicit `generator` field (it is in `art_meta.json`/`note`); add it if re-merging.
- **Trade dress (1 to 2 images per production at <=360 px):** 541y plain top-hat snowmen with carrot nose and scarf, no Olaf, no brand mascot. ihnk plain red/green watermelon slices, plain red triangle and blue diamonds. n9ey plain purple feathers, orange discs, grey/colour candidates; nothing branded.
- **Reference reel:** only 541y carries `internal-notes.json` (research_only, not rendered or published). `script.json` of all three: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in each script ("synthetic narration" 3x, Arabic line "التعليق الصوتي صوت اصطناعي", "Gemini TTS" line; "AI-generated" only in 541y, acceptable for ihnk/n9ey). Platform AI-label toggle at publish.
- QA note (not rights): n9ey needs a caption/length rebuild; the rebuild changes no art, so per-render sha/copy lint is enough.

## Addendum Q (2026-10-23): quiz-261023 mauj (rockets, v1), n1ru (wall clocks, v1); re-check 3yfb v4 (crayons), 4lys v3 (cactus)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; no generated images and no downloads.
- **Art provenance (new):** mauj rockets are own PIL drawing (`d11d/b7art.py`, no network calls; assets.json `generated: []`, `own_art`). n1ru clocks, hidden heart, triangles are own SVG from `5a6q/art/b7gen.py`, rasterised with headless Chrome via `raster_jobs.json` (the only external call is the local node raster script). Non-blocking: the shared generators are not copied into mauj/n1ru, and mauj's `own_art.files` lists 13 names against 14 art files (cover.png omitted); fix when re-merging.
- **Trade dress (frames at <=360 px):** mauj plain round-nosed rockets (red, yellow, green, pink, teal, orange, purple dots, blue/white stripes) with a round porthole and orange flame; no NASA/SpaceX/agency marks, no checkered Tintin rocket, no text. n1ru plain gold-rimmed round wall clocks, orange heart, blue triangles; no brand face, no logo. Conditions: never name a space agency or rocket model; never name a clock brand.
- **Reference reel:** mauj only; FB reel sits in `internal-notes.json` (research_only, format study, not rendered or published). n1ru has none. `script.json` of both: no "photo/photograph", no "Suyog", no "inspired by", no reel id in public fields.
- **Audio:** TTS disclosed in both ("synthetic narration" 3x, Arabic line "التعليق الصوتي صوت اصطناعي", "Gemini TTS" line; "AI-generated" in mauj only, acceptable for n1ru). 9 SFX sha256 match on disk for all four. Platform AI-label toggle at publish.
- **3yfb v4, 4lys v3 (sha/copy lint only):** art unchanged from Addenda N and O; SFX sha match; copy lint clean (no photo/Suyog/inspired-by/reel id), TTS disclosure present in both ("AI-generated", "Gemini TTS", "synthetic narration").

## Addendum R (2026-10-23): quiz-261023 86jc (teapots, v1), er6n (paper boats, v1), ice0 (cupcakes, v1); re-check 46o4 v2 (seashells)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; no generated images and no downloads.
- **Art provenance (new, first countersign):** 86jc, er6n and ice0 art is own drawing from `art/heroart.py` in each production (PIL + numpy, imports are math/numpy/PIL only; no http, urllib, requests or model calls found; `grep` for URLs hits nothing). The only `http` strings in 46o4 are SVG namespaces in `art/b4lib.py`. Non-blocking: assets.json of the three has no `own_art`/`generator` field (provenance is the heroart.py in the art folder); add one if re-merging.
- **Trade dress (frames viewed at <=360 px, one contact view per production):** 86jc teapots are plain round, tall and squat teapots in flat colours, no Twinings, Bodum or Alessi shape, no spout mark or text. er6n paper boats are plain origami boats with wave lines, no logo or flag. ice0 cupcakes are plain frosted cupcakes with star, cherry and berry toppers and flat wrappers, no Hostess, Wilton, Magnolia or other bakery mark and no text. Conditions: never name a brand of teapot, cupcake or paper; never add a logo to a wrapper.
- **Reference reel:** none rendered or published; `script.json` of all four: no "photo/photograph", no "Suyog", no "inspired by", no reel id. The only "facebook" string is the platform description key.
- **Audio:** Gemini TTS disclosed in all four ("synthetic narration" 2 to 4x, "AI-generated" 1 to 2x, Arabic line "التعليق الصوتي صوت اصطناعي", "Gemini TTS" line). 9 SFX sha256 match on disk for all four. Platform AI-label toggle at publish.
- **46o4 v2 (sha/copy lint only):** art unchanged since Addendum O except the R2/R3 puzzle (same generator, same shell set, pink/sand/teal/purple, no red+yellow); copy lint clean, TTS disclosure present, SFX sha match.
- QA note (not rights): 86jc has two caption lines showing ASR words instead of the script ("على الأبريء", "لا"); the fix changes no art, so per-render sha/copy lint is enough on rebuild.

## Addendum S (2026-10-23): quiz-261023 pfv1 (lanterns, v1), wbxi (party balloons, v1), etfk (pineapples, v1), hpda (fish, v1)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; `generated: 0` / no downloads.
- **Art provenance:** pfv1 and etfk are own SVG (pfv1 `art/b6gen.py`, rasterised via `raster_jobs.json`; imports are json/math/random/re/os/subprocess, the only `http` string is the SVG namespace). wbxi and hpda are own PIL drawing (`wbxi/b6art.py`, imports PIL/math/os, no network strings; hpda `own_art.generator` points at wbxi's file). Non-blocking: etfk has no generator copied into its art folder (same b6gen family, provenance is the SVG sources); hpda's generator lives in wbxi.
- **Trade dress (frames and art at <=360 px):** pfv1 plain amber paper lanterns with a round window and tassel, no crescent/star, brand or text; etfk plain yellow pineapples with green crowns, orange stars/hearts as decoys, no logo; wbxi plain glossy balloons (solid, dotted, striped), no licensed character or brand print; hpda plain flat fish (orange, teal, purple, striped, dotted), no Nemo/Dory-like clownfish or blue tang silhouette. Conditions: never name a lantern, balloon or fish franchise or brand.
- **Object check (extra):** titles, tiktok/instagram/facebook/youtube, description_ar and pinned comment name the right object in all four (pfv1 فوانيس, wbxi البالونات, etfk أناناس, hpda السمك/سمكة); no mushroom or balloon in pfv1/etfk after the title correction.
- **Reference reel:** none in any `script.json`; no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي" and "synthetic narration" in credits; wbxi/hpda also "AI-generated" and "Gemini TTS" lines; pfv1/etfk carry "Gemini" in the `tts` field and no "AI-generated" wording, acceptable). Platform AI-label toggle at publish. 9 SFX synthesized per production.
- **QA note (not rights):** pfv1 83 (revise, 41.5 s over cap), wbxi 83 (revise, three captions show ASR words), etfk 87 pass, hpda 88 pass. The pfv1 trim and wbxi caption fixes change no art, so per-render sha/copy lint is enough on rebuild.

## Addendum U (2026-10-23): quiz-261023 fgtj (owls, v1), o9v1 (socks, v1), 5911 (autumn leaves, v2), ozmy (pebbles, v1)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; `generated: 0` / no downloads.
- **Art provenance:** fgtj owls and 5911/ozmy leaves and pebbles are own SVG (fgtj `b6gen.py` via `raster_jobs.json`; 5911/ozmy `art/gen5.py` + `b4lib.py`), rasterised with headless Chrome; no http/urllib/requests or model calls in the art folders (grep clean). o9v1 socks are own PIL drawing (`wbxi/b6art.py`, assets.json `own_art`, `generated: []`). Non-blocking: fgtj has no generator copied into its art folder (provenance is the SVG sources and art_meta.json); o9v1's generator lives in wbxi.
- **Trade dress (frames at <=360 px):** fgtj plain brown owls, green/lime/navy colour variants, red stars and a brown diamond, no Hedwig/Duolingo/brand owl; o9v1 plain solid, dotted and striped socks, no brand mark; 5911 plain autumn leaves and acorns; ozmy plain grey pebbles with white bands, flat blue gems, no logo. Conditions: never name an owl, sock or stone franchise or brand.
- **Reference reel:** o9v1, 5911 and ozmy carry `internal-notes.json` (research_only, format study, not rendered or published); fgtj has none. `script.json` of all four: no "photo/photograph", no "Suyog", no "inspired by", no reel id in public fields.
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي", "synthetic narration" in credits, "Gemini TTS" in tts/attribution; "AI-generated" in o9v1, 5911, ozmy; fgtj carries no literal "AI-generated", acceptable). Platform AI-label toggle at publish. 9 SFX synthesized per production.
- **QA note (not rights):** fgtj 87 pass, 5911 88 pass, ozmy 83 revise (R1 headline wraps to two lines), o9v1 74 reject (R2 says "الزهرية" / vase in a socks video and never names the sock). The fixes change no art, so per-render sha/copy lint is enough on rebuild; o9v1's corrected line must keep "sock" wording and no brand.

## Addendum W (2026-10-23): quiz-261023 kxur (toy cars, v1), w8t1 (bicycles, v1), 003e (birdhouses, v1)

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; `generated: 0`, 9 SFX synthesized, no downloads.
- **Art provenance:** own PIL vector drawing (kxur `b7art.py`; w8t1/003e `b8art.py`/`b8spec.py`); `attribution_block` states no AI image generation and no third-party art. Non-blocking: kxur and 003e carry no generator copy in their own folder.
- **Trade dress (one contact strip each at 270 px):** kxur plain flat side-view toy cars (red, striped, dotted, teal, orange), no Hot Wheels, Matchbox, Lightning McQueen or brand badge; w8t1 plain flat bicycles, no logo or branded frame; 003e plain gabled birdhouses with round hole, no brand. Conditions: never name a toy-car, bicycle or birdhouse brand or franchise.
- **Reference reel:** `internal-notes.json` is research_only (not rendered or published); `script.json` public fields have no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي", "synthetic narration", "AI-generated", "Gemini TTS").
- **Object check:** titles, description_ar and pinned comment name السيارات / الدراجات / بيوت الطيور correctly.
- **QA note (not rights):** kxur 88 pass, w8t1 87 pass, 003e 88 pass (minor notes only); no art change needed.

## Addendum V (2026-10-23): quiz-261023 5z4c (gemstones, v1), 66fo (mushrooms, v1), wma9 (keys, v1)

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; 66fo and wma9 `generated: 0`, 5z4c has no `generated` field (assets.json states "no generated images"); no downloads.
- **Art provenance:** 5z4c gems, rings and triangles are own SVG (`b6gen.py`, rasterised via `raster_jobs.json`; no http/urllib/requests in the art folder; generator not copied into the art folder, provenance is the SVG sources and art_meta.json). 66fo mushrooms and wma9 keys are own PIL drawing (`wbxi/b6art.py`, assets.json `own_art`, no network strings). Non-blocking: both generators live in wbxi.
- **Trade dress (frames at <=360 px):** 5z4c plain blue faceted gems, orange triangles, greyscale gems, no jeweller or brand mark; 66fo plain flat mushroom caps (purple, red/pink/blue dots, teal, orange, yellow) on cream stalks, no Mario or other game mushroom; wma9 plain round, square and trefoil-head keys in flat colours, no lock-brand or Zelda-style key. Conditions: never name a game, jeweller or lock brand.
- **Reference reel:** 66fo and wma9 carry `internal-notes.json` (research_only, format study, not rendered or published); 5z4c has none. `script.json` of all three: no "photo/photograph", no "Suyog", no "inspired by", no reel id in public fields.
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي", "synthetic narration" in credits; 66fo and wma9 also "AI-generated" and "Gemini TTS"; 5z4c carries "Gemini TTS" in the tts field, acceptable). Platform AI-label toggle at publish. 9 SFX synthesized per production.
- **Object check:** titles, description_ar and pinned comment name the right object in all three (جواهر, الفطر, المفاتيح); no cross-object question lines.
- **QA note (not rights):** 5z4c 86 pass, 66fo 88 pass, wma9 88 pass. Minor only (5z4c 38.4 s over the 35 s perception plan cap, R1 ring too easy, R2 detail tiny).

## Addendum X (2026-10-23): quiz-261023 1vro (robots, v1), kyvw (sandcastles, v1), x8zt (piggy banks, v1), dibl (pencils, v1)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each; `generated: 0`, 9 SFX synthesized, no downloads.
- **Art provenance:** 1vro, kyvw and x8zt are own PIL drawing (`assets.json` `own_art.generator` = d11d/b8art.py, `generated: []`); dibl is own SVG (`art/b8gen.py`, rasterised via Chrome, no network or model calls in the generator, assets.json "no generated images, no brand designs"). Non-blocking: the generator path named for the first three (productions/quiz-261023-d11d/b8art.py) does not exist, a copy lives in quiz-261023-w8t1/b8art.py (no network strings); dibl has no internal-notes.json.
- **Trade dress (one contact sheet each at 270 px):** 1vro plain flat boxy robots (orange, teal-striped, red, blue, green, purple, dotted), antenna and chest panel only, no WALL-E, R2-D2, Bumblebee, Android or brand robot; kyvw plain flat crenellated castles with a red flag, no Disney or other castle logo; x8zt plain flat piggy banks with coin slot, no Hello Kitty, bank or brand mark; dibl plain blue pencils with pink eraser, no brand text, plain stars/polygons. Conditions: never name a robot, toy, bank or stationery franchise or brand.
- **Reference reel:** 1vro, kyvw and x8zt carry `internal-notes.json` (research_only, not rendered or published); `script.json` public fields of all four: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي", "synthetic narration"; 1vro, kyvw and x8zt also "AI-generated" and "Gemini TTS"; dibl carries "Gemini" in the tts field and no literal "AI-generated", acceptable). Platform AI-label toggle at publish.
- **Object check:** titles, description_ar and pinned comment name الروبوتات / قلاع الرمل / الحصّالات / أقلام رصاص correctly; no cross-object lines (dibl R1 asks about a star inside a pencil/shape grid, non-blocking).
- **QA note (not rights):** 1vro 88, kyvw 88, x8zt 87, dibl 86, all pass, minor notes only (dibl 36.2 s over the 35 s cap); no art change needed.

## Addendum Y (2026-10-23): quiz-261023 49ss (traffic cones, v1), 4u4k (flower vases, v1), ervi (lollipops, v1), ryt7 (sea stars, v1)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`assets: 4`, `synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** all four are own SVG by showrunner-shu-shayef, rasterised via headless Chrome; `assets.json` states "no generated images, no brand designs". No generator scripts in the art folders (only SVG sources and art_meta.json), so no network or model-call strings to find. Non-blocking: no generator copy is archived per production.
- **Trade dress (one contact strip each at 270 px):** 49ss plain flat orange cones with white bands (no brand or road-authority mark); 4u4k plain flat terracotta vases with white daisies, no mark; ervi plain flat red/white swirl lollipops on a stick, no daisy logo or round-label design, not Chupa Chups; ryt7 plain flat orange sea stars with dots. Conditions: never name a candy, road-equipment or ceramics brand.
- **Reference reel:** no `internal-notes.json` in any of the four. `script.json` public fields: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي", "synthetic narration" in credits, "Gemini" in tts field; no literal "AI-generated", acceptable as in fgtj/dibl). Platform AI-label toggle at publish.
- **Object check:** description_ar names مخاريط مرور / مزهريات / مصاصات / نجوم البحر correctly; no cross-object question lines.
- **QA note (not rights):** 49ss 87, 4u4k 88, ervi 85, ryt7 87, all pass, minor notes only (cream item faint on white card in 4u4k/ervi/ryt7; ervi 39.3 s, 4.3 s over the 35 s plan cap; easy odd-one-out in 49ss/ervi/ryt7). No art change needed.

## Addendum Z (2026-10-23): quiz-261023 mys7 (acorns, v2), i75w (glass marbles, v1)

Both **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`assets: 4` / `assets: 1`, `synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** mys7 own SVG (b6gen.py, rasterised via headless Chrome; assets.json "no generated images, no brand designs"; no generator copy in the art folder, only SVG sources and art_meta.json). i75w own SVG (art/gen5.py + b4lib.py, rasterised via raster.mjs; no network or model-call strings in the generators; assets.json "no generated images, no brand marks"). The only http strings in the SVGs are xmlns.
- **Trade dress (frames at <=300 px):** mys7 plain flat brown acorns with cream dots, blue discs, triangle, no brand mark; i75w plain green swirl glass marbles, blue-toned marbles and flat 4-hole buttons, no toy or game brand (no Marble Run or Candy Crush lookalike). Conditions: never name a toy, game or confectionery brand.
- **Reference reel:** i75w carries `internal-notes.json` (research_only, metadata only, not rendered or published; never publish the file or the creator name); mys7 has none. Public fields of both `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in both (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits; i75w also "AI-generated (Gemini TTS)" and the disclosure line in titles; mys7 carries the disclosure in the tts field). Platform AI-label toggle at publish.
- **Object check:** titles, description_ar and pinned comment name بلوط (mys7) and الكريات الزجاجية (i75w) correctly; every question is about an object in the same video, no cross-object lines.
- **QA note (not rights):** mys7 82 and i75w 83, both revise (R2/R3 headline wraps to two lines; mys7 stray caption word). Rights verdict stands for the rebuilt versions provided the art is unchanged (re-check sha only).

## Addendum AA (2026-10-23): quiz-261023 65rp (tulips, v1); re-QA o9v1 v2 and ozmy v2

**65rp approved_with_conditions** (C1 to C5 as before), no rejection. `quiz:assets` run (`assets: 4`, `synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** own SVG by showrunner-shu-shayef (b7gen.py), rasterised via Chrome; `assets.json` states "no generated images, no brand designs".
- **Trade dress (frames at 270 px):** plain flat red tulips with green leaves, hexagon/star/triangle/ring shapes, no brand mark. Conditions: never name a flower or garden brand.
- **Reference reel:** no `internal-notes.json`. `script.json` public fields: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits, "Gemini" in tts field; no literal "AI-generated", acceptable as before). Platform AI-label toggle at publish.
- **Object check:** titles and description name توليب correctly; no cross-object lines.
- **QA note (not rights):** 65rp 86 pass (R1 ring too easy, R3 cream always lightest, R1 bottom tulip touches card edge). o9v1 v2 88 and ozmy v2 88, both pass; rights verdicts from Addendum U stand (art unchanged, text-only fixes).

## Addendum AB (2026-10-23): quiz-261023 636p (bow ties, v1), r5vr (trains, v1), 4tkg (turtles, v1), m9wu (lighthouses, v1)

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** 636p own SVG (b7gen.py), rasterised via Chrome, assets.json "no generated images, no brand designs". r5vr, 4tkg, m9wu own code-drawn vector art (PIL, b9art.py in the r5vr folder, shared); `generated: []`; no http/model-call strings in the art folders.
- **Trade dress (one 270 px strip each):** 636p plain flat blue dotted bow ties and plain shapes; r5vr plain flat steam locomotives without faces, no Thomas the Tank Engine or other branded character; 4tkg plain flat turtles, no mark; m9wu plain flat lighthouses, no mark. Conditions: never name a toy, rail or character brand.
- **Reference reel:** r5vr, 4tkg, m9wu carry `internal-notes.json` (research_only, metadata only, never publish the file or the creator id). Public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي" in the description, "synthetic narration" in credits; r5vr/4tkg/m9wu also "AI-generated (synthetic voice)" and the disclosure line in titles). Platform AI-label toggle at publish.
- **Object check:** titles and description name فيونكات / القطارات / السلاحف / المنارات correctly; no cross-object lines.
- **QA note (not rights):** 636p 88, r5vr 88, 4tkg 86, m9wu 88, all pass, minor notes only (636p 0.5 s over cap and easy odd bow; 4tkg ASR hears "انت" for قدّيش in the outro; m9wu shell-game show time at the 0.5 s floor). No art change needed.

## Addendum AC (2026-10-23): quiz-261023 tblh (drums), hhxj (hot-air balloons), 9ont (penguins), snsl (fire trucks), nzl5 (treasure chests), all v1

All five **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`generated: 0`, `synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** own code-drawn PIL vector art (tblh and hhxj via b9art.py in the r5vr folder; 9ont, snsl and nzl5 via b10art.py in the 9ont folder, which has no http, requests or model-call strings). `assets.json` lists `generated: []` with rights "own/original code-drawn vector art". Generator scripts are archived (shared, not per production).
- **Trade dress (one 270 px strip each, 8 frames):** tblh plain flat snare-style drums with zigzag lacing, no brand mark; hhxj plain flat balloons with brown baskets and plain stripes/dots, no balloon-festival or brand mark; 9ont plain flat penguins (flat colours, orange feet and beak, no scarf, hat or face detail), not Pingu, Tux or Happy Feet, patterned variants are plain stripes/dots; snsl plain generic flat trucks with a small ladder, no department name, shield, star-of-life, lettering or number, no real livery (colours are arbitrary: teal, purple, orange); nzl5 plain flat chests with gold straps and a keyhole lock, no game or franchise mark. Conditions: never name a drum, balloon, toy, vehicle-maker or game brand, and never call the trucks a named fire department.
- **Reference reel:** every production carries `internal-notes.json` (key `internal_reference_DO_NOT_PUBLISH`, metadata only, no footage used). Never publish the file or the creator id. `script.json` public fields of all five: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all five (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits, "AI-generated voice (Gemini TTS)" in the attribution block, and "تعليق صوتي اصطناعي" in the platform titles). Platform AI-label toggle at publish.
- **Object check:** titles and description_ar name الطبول / المناطيد / البطاريق / سيارات الإطفاء / صناديق الكنز correctly; every question is about an object shown in the same video, no cross-object lines.
- **QA note (not rights):** tblh 85, hhxj 86, 9ont 86, snsl 85, nzl5 86, all pass with minor notes only (shell-game show time at the 0.5 s floor in tblh/hhxj; repeated target in hhxj R2/R3 and nzl5 R1/R3; tblh shows heard words in two question captions; small trucks in the snsl row). No art change needed.

## Addendum AD (2026-10-23): quiz-261023 01sm (watering cans), bpyo (alarm clocks), 3xyw (kiwis), 8t6f (mittens), all v1

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`generated: 0`, `synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** 01sm and bpyo own code-drawn PIL vector art (b10art.py in the 9ont folder, `generated: []`). 3xyw and 8t6f own SVG by showrunner-shu-shayef rasterised via Chrome (assets.json "no generated images, no brand designs"; 3xyw also has b10gen.py, no network strings).
- **Trade dress (frames at <=360 px):** 01sm plain flat watering cans (solid, striped, dotted), no brand mark; bpyo plain flat twin-bell alarm clocks, no brand or character; 3xyw plain flat kiwi slices with plain star/heart/diamond shapes; 8t6f plain flat red mittens with heart/star, no brand or character. Conditions: never name a garden, clock, fruit or clothing brand.
- **Reference reel:** 01sm and bpyo carry `internal-notes.json` (metadata only, never publish the file or the creator id); 3xyw and 8t6f have none. Public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits; 01sm and bpyo also "AI-generated voice (Gemini TTS)" and the disclosure line in platform titles; 3xyw and 8t6f carry it in the tts field and publish_conditions). Platform AI-label toggle at publish.
- **Object check:** titles and description name المرشّات / المنبّهات / كيوي / قفازات correctly; every question concerns an object in the same video.
- **QA note (not rights):** 01sm 87, bpyo 86, 3xyw 86, 8t6f 87, all pass, minor notes only (bpyo question at 2.03 s; 3xyw 37 s over cap; 8t6f R3 note "four sharp corners" is ambiguous with 4-point stars). No art change needed.

## Addendum AE (2026-10-23): quiz-261023 u95v (honey jars), z2ny (hourglasses), leqg (sunflowers), all v1

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`synthesized: 9`, `assets: 4`, no downloads, `sources: []`).
- **Art provenance:** own SVG by showrunner-shu-shayef (b7gen.py), rasterised via Chrome; assets.json "no generated images, no brand designs". The only URL string in the art folders is the SVG xmlns; no network or model-call strings.
- **Trade dress (frames at <=360 px, 8 per video):** u95v plain flat honey jars with a hexagon label, no brand mark or bear; z2ny plain flat hourglasses, no mark; leqg plain flat sunflowers with a plain ladybug, no mark or character. Conditions: never name a honey, food or toy brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. No `internal-notes.json`.
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Object check:** descriptions name مرتبانات عسل / ساعات رملية / عباد الشمس correctly; every question concerns an object in the same video.
- **mys7 v3** (acorns): rights unchanged, countersigned in Z; no new assets.
- **QA note (not rights):** u95v 88 pass, z2ny 86 pass (2.4 s over cap), leqg 83 FAIL on caption (shows heard 'دا سوءة' for دعسوقة in R1). Caption fix only; no art change. mys7 v3 re-QA 88 pass.

## Addendum AF (2026-10-23): quiz-261023 g98y (pumpkins, v2), le7u (paint brushes, v2), i75w (glass marbles, v2)

g98y and le7u **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for both (`generated: 0`, `synthesized: 9`, no downloads, `sources: []`). i75w was countersigned in Z; its v2 changes only the R2 headline text («وين الأصفر؟»), no new assets, rights unchanged.
- **Art provenance:** own SVG by showrunner-shu-shayef (b7gen.py), rasterised via Chrome; assets.json "no generated images, no brand designs". The only URL string in the art folders is the SVG xmlns; no network or model-call strings.
- **Trade dress (frames at <=360 px, 8 per video):** g98y plain flat orange pumpkins with a generic carved face, no brand, character or mark; le7u plain flat paint brushes (grey ferrule, cream bristles), no brand mark. Conditions: never name a paint, craft or Halloween brand or franchise.
- **Copy:** public fields of both `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. No `internal-notes.json`.
- **Audio:** TTS disclosed in both (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Object check:** titles and description name يقطين / فرش دهان correctly; every question concerns an object in the same video.
- **QA note (not rights):** g98y 86 pass, le7u 86 pass, i75w 88 pass (R2 headline now one line); minor notes only (caption shows an extra word not narrated in g98y R1 and le7u R4; le7u R3 5- vs 6-point star is hard; g98y R2 odd pumpkin easy). No art change needed.

## Addendum AG (2026-10-23): quiz-261023 27ju (frogs), lgt7 (buses), 3sz4 (mailboxes), jw3h (crowns), all v1

All four **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`generated: 0`, `synthesized: 9`, no downloads, `sources: []`).
- **Art provenance:** own code-drawn PIL vector art (b11art.py in the 27ju folder, shared by all four; assets.json `generated: []`, "own/original code-drawn vector art"). No URL, network or model-call strings in b11art.py.
- **Trade dress (frames at <=360 px):** 27ju plain flat frogs, no character or mark; lgt7 plain flat side-view buses, no transit-company livery, logo or route mark; 3sz4 plain flat pole mailboxes with red flag, no postal logo or eagle; jw3h plain flat crowns, no brand. Conditions: never name a transit, postal, toy or game brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. 27ju carries `internal-notes.json` (metadata only, never publish the file or the creator id).
- **Audio:** TTS disclosed in all four (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" and "AI-generated voice (Gemini TTS)" in credits, line in platform titles). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name الضفادع / الباصات / صناديق البريد / التيجان correctly; every question concerns an object in the same video.
- **QA note (not rights):** 27ju 87, lgt7 85, 3sz4 87, jw3h 87, all pass; lgt7 r3-q caption shows garbled heard 'لم نقط' for المنقّط. No art change needed.

## Addendum AH (2026-10-23): quiz-261023 6xqa (windmills), 8139 (paper fans), m5rr (carrots), all v1

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (6xqa `generated: 0`, `synthesized: 9`; 8139 and m5rr `assets: 4`, `synthesized: 9`; no downloads, `sources: []`).
- **Art provenance:** 6xqa own code-drawn PIL vector art (b11art.py of 27ju; assets.json `generated: []`); 8139 and m5rr own SVG by showrunner-shu-shayef (b7gen.py), rasterised via Chrome, "no generated images, no brand designs". The only URL string in the SVG art is the xmlns; no network or model-call strings.
- **Trade dress (frames at <=360 px):** 6xqa plain flat windmills (grey cover windmills for the shell game), no mark; 8139 plain flat folding paper fans with a heart, no mark; m5rr plain flat carrots, hearts and geometric shapes, no mark or character. Conditions: never name a food, toy or game brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. 6xqa carries `internal-notes.json` (reference id, research_only; never publish the file or the creator id).
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits; 6xqa also in platform titles and "AI-generated voice (Gemini TTS)"). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name طواحين الهواء / مراوح ورق / جزر correctly; every question concerns an object in the same video.
- **QA note (not rights):** all three 86 pass. 6xqa: shell-game target (blue) is named only after the swaps. 8139: R2 6-point star decoy close to the 5-point answer; R4 star small. m5rr: R4 explanation "4 sharp corners" also fits 4-point stars (reword to "المعيّن"). No art change needed.

## Addendum AI (2026-10-23): quiz-261023 gxiv (guitars, v1), udo8 (octopuses, v1)

Both **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`generated: 0`, `synthesized: 9`, no downloads, `sources: []`). 8t6f v2 and leqg v2 change only text (R3 explanation, R1 caption), no new assets; rights unchanged (AD, AE).
- **Art provenance:** own code-drawn PIL vector art (b12art.py in the 27ju folder; assets.json `generated: []`, "own/original code-drawn vector art"). No URL strings in the art folders.
- **Trade dress (frames at <=360 px):** gxiv plain flat guitars with plain rectangular headstocks, no brand headstock, logo or inlay, no iconic body copy; udo8 plain flat octopuses, no character or mark. Conditions: never name a guitar, instrument, toy or game brand.
- **Copy:** public fields of both `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. Both carry `internal-notes.json` (metadata only; never publish the file or the creator id).
- **Audio:** TTS disclosed in both (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name غيتارات / أخطبوطات correctly; every question concerns an object in the same video.
- **QA note (not rights):** gxiv 87 pass, udo8 86 pass (R1 hook question at ~2.6 s). 8t6f v2 88 pass (R3 explanation fixed), leqg v2 87 pass (R1 caption shows دعسوقة). No art change needed.

## Addendum AJ (2026-10-23): quiz-261023 ftbb (tents), o11q (grapes), s8ex (globes), um8p (rugby/American footballs), wj6h (candy canes), all v1

ftbb, o11q, s8ex, wj6h **approved_with_conditions** (C1 to C5 as before). um8p **approved_with_conditions only after a text fix** (see label note). No rejections. `quiz:assets` run for each (ftbb `generated: 0`, `synthesized: 9`; others `assets: 4`, `synthesized: 9`; no downloads, `sources: []`).
- **Art provenance:** ftbb own code-drawn PIL vector art (b12art.py; no generated images). o11q, s8ex, um8p, wj6h own SVG (b7gen.py/b12gen.py), rasterised via Chrome; assets.json "no generated images, no brand designs". The only URL string in the SVG art is the xmlns.
- **Trade dress (frames at <=360 px):** ftbb plain flat tents, no brand; o11q plain flat grapes, stars, triangles; s8ex plain blue grid globes on wooden stands, no continents, no real map, no brand; um8p plain flat laced ovals, no league or brand mark; wj6h plain flat candy canes, no brand. Conditions: never name a camping, food, sports-league or toy brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. ftbb carries `internal-notes.json` (metadata only; never publish the file or the creator id).
- **Audio:** TTS disclosed in all five (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name الخيم / عنب / كرات أرضية / عصي الحلوى correctly. **um8p label mismatch:** the art shows pointed ovals with laces (American footballs), but copy says كرات رغبي. Retitle titles/description/hashtags to كرات القدم الأمريكية (or redraw as round panelled rugby balls) before publishing; this is a copy fix, no rights issue.
- **QA note (not rights):** ftbb 87 pass, o11q 86 pass, s8ex 85 pass (R1 gold ring trivial, R3 5-point star hard), wj6h 86 pass, um8p 83 fail (label mismatch). Recurring minor: 5-point vs 6-point star is marginal at 360 px in hidden-star rounds.

## Addendum AK (2026-10-23): quiz-261023 10rt (ladybugs), pdxk (bells), qa7o (ice-cream trucks), all v1

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (10rt and qa7o `generated: 0`, `synthesized: 9`; pdxk `assets: 4`, `synthesized: 9`; no downloads, `sources: []`).
- **Art provenance:** 10rt and qa7o own code-drawn PIL vector art (b13art.py; assets.json "own/original code-drawn vector art", no generated images). pdxk own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". The only URL string in the pdxk SVG art is the xmlns.
- **Trade dress (frames at <=360 px):** 10rt plain flat ladybugs, no mark or character; pdxk plain flat golden bells, hearts, stars, no brand; qa7o plain flat ice-cream vans with a roof lamp, no logo, lettering or real-brand livery. Conditions: never name a food, ice-cream, toy or game brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. 10rt and qa7o carry `internal-notes.json` (metadata only; never publish the file or the creator id).
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي" in the description, "synthetic narration" in credits; 10rt and qa7o also in platform titles). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name الدعسوقات / أجراس / عربات البوظة correctly; every question concerns an object in the same video.
- **QA note (not rights):** 10rt 87 pass, pdxk 85 pass (R4 5-point vs 6-point star marginal at 360 px), qa7o 87 pass. No art change needed.

## Addendum AL (2026-10-23): quiz-261023 1ttp (peppers), f7ak (bowling pins), fjx7 (pears), all v1

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (`assets: 4`, `synthesized: 9`, `stage_px: 2`; no downloads, no sources).
- **Art provenance:** own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". Only URL string in the SVG art is the xmlns.
- **Trade dress (frames at <=360 px):** 1ttp plain flat green peppers, orange hearts, stars; f7ak plain flat blue pins with a plain red stripe, no brand mark, logo, lane or lettering; fjx7 plain flat pears, triangles, stars. Conditions: never name a bowling, food or sports brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Object check:** descriptions name فلفل / دبابيس بولينغ / كمثرى correctly; every question concerns an object in the same video.
- **QA note (not rights):** 1ttp 86 pass, f7ak 85 pass (R2 red stripe is a trivial pop-out), fjx7 85 pass (r1-q caption_ar text source says الكمثرى الزرقا, narration says الأزرق; fix text). All 36 s, about 1 s over the 35 s perception cap.

## Addendum AM (2026-10-23): quiz-261023 e56o (igloos), fn22 (sunglasses), m6p9 (pine cones), all v1

All three **approved_with_conditions** (C1 to C5 as before), no rejections. `quiz:assets` run for each (e56o `generated: 0`, `synthesized: 9`; fn22 and m6p9 `assets: 4`, `synthesized: 9`; no downloads, `sources: []`).
- **Art provenance:** e56o own code-drawn PIL vector art (b13art.py; assets.json "own/original code-drawn vector art", no generated images). fn22 and m6p9 own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". The only URL string in the SVG art is the xmlns.
- **Trade dress (frames at <=360 px):** e56o plain flat domes with a dark door, no mark; fn22 plain flat hexagonal sunglasses, no Wayfarer or other brand silhouette, no logo; m6p9 plain flat brown cones, stars, no mark. Conditions: never name an eyewear, outdoor or toy brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. e56o carries `internal-notes.json` (metadata only; never publish the file or the creator id).
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي" in the description, "synthetic narration" in credits; e56o also in platform titles). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name الإيغلوات / نظارات شمسية / كوزات صنوبر correctly; every question concerns an object in the same video. e56o: the art could read as helmets at 360 px (see QA); a copy-safe fix is to redraw with an arched entrance, no rights impact.
- **QA note (not rights):** e56o 85 pass (igloo art ambiguity, R1 question at 3.9 s), fn22 87 pass, m6p9 86 pass (R3 leaves near-trivial).

## Addendum AN (2026-10-23): quiz-261023 koxb (scarves), v1

**approved_with_conditions** (C1 to C5 as before). `quiz:assets` run (`assets: 4`, `synthesized: 9`, `stage_px: 2`; no downloads, `sources: []`).
- **Art provenance:** own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". Plain flat red/coloured scarves, circles, stars, polygons; no mark, tartan or brand pattern (frames at <=360 px).
- **Copy:** public fields of `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. Credits state original vector art and synthetic narration; never publish internal notes or the reference creator name.
- **Audio:** TTS disclosed (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" in credits). Platform AI-label toggle at publish. Conditions: never name a fashion brand.
- **QA note (not rights):** koxb 86 pass; R4 explanation true but "بين النجوم" is loose. Re-QA same session: 636p v2 88 pass; mig1 v2 rejected (R2 explanation names stars that are not in the grid; fix to «بين الشموع»), no rights impact.

## Addendum AO (2026-10-23): quiz-261023 p8zx (snails), v1

**approved_with_conditions** (C1 to C5 as before). `quiz:assets` run (`generated: 0`, `synthesized: 9`, `narration: 2`, `art_used: 12`; no downloads, `sources: []`).
- **Art provenance:** own code-drawn PIL vector snails (b12art.py); assets.json "own/original code-drawn vector art", no generated or third-party images. Frames checked at <=360 px: plain flat snails (spiral shell, stripes, dots), no mark, no character or brand likeness. Conditions: never name a toy, game or brand.
- **Copy:** public fields of `script.json` and `quiz.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id.
- **Audio:** TTS disclosed (Arabic line "التعليق الصوتي صوت اصطناعي" first in the description, "synthetic narration" and "AI-generated voice" in credits). Platform AI-label toggle at publish.
- **Object check:** description names الحلزونات correctly; every question concerns an object in the same video.
- **QA note (not rights):** p8zx 88 pass. Re-QA 49ss v2 87 pass (R3 «المعيّن الوحيد» verified true: the only rhombus in the grid); rights covered in Addendum Y.

## Addendum AP (2026-10-23): quiz-261023 xqop (dice, v2), nxmb (submarines, v1), m5rr (carrots, v2)

All three **approved_with_conditions** (C1 to C5 as before). `quiz:assets` run for each (xqop and m5rr `assets: 4`, `synthesized: 9`, `stage_px: 2`; nxmb `generated: 0`, `synthesized: 9`; no downloads, `sources: []`).
- **Art provenance:** xqop and m5rr own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". nxmb own code-drawn PIL vector submarines (b13art.py); assets.json "own/original code-drawn vector art". No third-party or generated images.
- **Trade dress (frames at <=360 px):** xqop plain flat red dice with white pips, flat shapes, no casino or game mark. nxmb plain flat submarines with portholes, no Beatles or Yellow Submarine character, no brand. m5rr plain flat orange carrots, no mascot. Conditions: never name a game, casino, cartoon or food brand.
- **Copy:** public fields of every `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. Credits state original vector art and synthetic narration; never publish internal notes or the reference creator name.
- **Audio:** TTS disclosed in all three (Arabic line "التعليق الصوتي صوت اصطناعي" in the description, "synthetic narration" in credits; nxmb also in platform titles and "AI-generated voice"). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name نرد / الغوّاصات / جزر correctly; every question concerns an object in the same video. m5rr R4 «المعيّن الوحيد» verified true from the SVG (only 4-vertex polygon, equal sides).
- **QA note (not rights):** nxmb 88 pass. xqop 83 revise (R1 target is the extreme grey, 36.9 s), m5rr 84 revise (techqa freeze 31.7 to 32.9 s); fixes are art/timing only, no rights impact, no re-countersign needed unless assets change.

## Addendum AQ (2026-10-23): quiz-261023 4c8b (beach balls, v2), vhlw (tractors, v1)

Both **approved_with_conditions** (C1 to C5 as before). `quiz:assets` run (4c8b `assets: 4`, `synthesized: 9`, `stage_px: 2`; vhlw `generated: 0`, `synthesized: 9`, `art_used: 12`; no downloads, `sources: []`).
- **Art provenance:** 4c8b own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". vhlw own code-drawn PIL vector tractors (b12art.py); assets.json "own/original code-drawn vector art". No third-party or generated images.
- **Trade dress (frames and art strip at <=360 px):** 4c8b plain flat blue/white beach balls, circles and stars, no mark. vhlw plain flat single-colour tractors with grey wheels (blue, green, red, orange, yellow, pink, purple, teal, plus stripe and dot variants), no logo, badge or marque colour scheme. Conditions: never name a tractor or toy brand.
- **Copy:** public fields of both `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. Credits state original vector art and synthetic narration; never publish internal notes (vhlw internal-notes.json) or the reference creator name.
- **Audio:** TTS disclosed in both (Arabic line "التعليق الصوتي صوت اصطناعي" in the description, "synthetic narration" in credits; vhlw also in platform titles and "AI-generated voice"). Platform AI-label toggle at publish.
- **Object check:** titles and descriptions name كرات شاطئ / الجرّارات correctly; every question concerns an object in the same video.
- **QA note (not rights):** 4c8b 87 pass (R2 odd ball near-trivial), vhlw 87 pass.

## Addendum AR (2026-10-23): quiz-261023 um8p (American footballs, v2), xqop (dice, v3)

Both **approved_with_conditions** (C1 to C5 as before). um8p: only the copy changed from v1 (label fix); art, narration and sources unchanged. xqop: rights as in Addendum AP; v3 reorders R1 items and the copy only, no asset change.
- **Copy:** public fields of both `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. um8p has no remaining "رغبي" (captions, timeline, quiz.json, script.json); titles and description say كرات قدم أمريكية, matching the art.
- **Audio:** TTS disclosed in both (Arabic line "التعليق الصوتي صوت اصطناعي" in the description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Trade dress:** um8p plain flat brown footballs with white laces, no league or team mark; never name a league or brand. xqop unchanged from AP.
- **QA note (not rights):** um8p v2 87 pass; xqop v3 86 pass (37.4 s, minor).

## Addendum AS (2026-10-23): quiz-261023 957q (scooters, v2)

**approved_with_conditions** (C1 to C5 as before). `quiz:assets` run: `generated: 0`, `synthesized: 9`, `art_used: 11`, `narration: 2`; no downloads, `sources: []`.
- **Art provenance:** own code-drawn PIL vector scooters (b13art.py); script.json "no AI image generation, no third-party art". No generated or third-party images.
- **Trade dress (frames at <=360 px):** plain flat kick scooters (T-bar, two wheels, single-colour deck, plus stripe and dot variants), no Vespa-style or motorbike silhouette, no logo, badge or marque colours. Condition: never name a scooter or vehicle brand.
- **Copy:** public fields of `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. Reference only in internal-notes.json (never publish).
- **Audio:** TTS disclosed (Arabic line "التعليق الصوتي صوت اصطناعي" in description, "synthetic narration" in credits, short disclosure in platform titles). Platform AI-label toggle at publish.
- **Object check:** titles and description name السكوترات correctly; every question concerns an object in the same video.
- **QA note (not rights):** 957q v2 88 pass.

## Addendum AT (2026-10-23): quiz-261023 q7cn (rolling pins, v2)

**approved_with_conditions** (C1 to C5 as before). `quiz:assets` run: `assets: 4`, `synthesized: 9`, `stage_px: 2`, `narration: 2`, `art_used: 14`; no downloads, `sources: []`.
- **Art provenance:** own SVG (b7gen.py) rasterised via Chrome; assets.json "no generated images, no brand designs". No third-party or generated images.
- **Trade dress (frames at <=360 px):** plain flat tan rolling pins, stars, green diamonds, grey and colour variants, no logo, brand or marque. Condition: never name a kitchenware brand.
- **Copy:** public fields of `script.json`: no "photo/photograph", no "Suyog", no "inspired by", no reel id. Never publish internal notes or the reference creator name.
- **Audio:** TTS disclosed (Arabic line "التعليق الصوتي صوت اصطناعي" in description, "synthetic narration" in credits). Platform AI-label toggle at publish.
- **Object check:** titles and description name شوابك correctly; every question concerns a rolling pin or shape in the same video.
- **QA note (not rights):** q7cn v2 88 pass.
