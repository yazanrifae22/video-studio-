# شو شايف؟ (Shu Shayef, @shoshayef) — brand guide v1 (quiz-ar, 2026-10-22)

Visual identity for the Arabic visual-puzzle brand. Layout, motion and audio contracts live in
`visual-system.md` (tokens are copied below; change them there first). Naming and copy: `naming-and-packaging.md`.
Source files: `data/brand/quiz-ar/` — everything is generated from `brand.config.json` (see "Rebuild").

## 1. The mark
**Eye-dot ؟ in a countdown ring.** An Arabic question mark (mirrored hook, ؟) whose dot is an open eye, set inside an
accent countdown ring that is ~7/8 full (time running out). It says the name — "What do you see?" — and the format
(look, think, 3-second countdown). Original, hand-authored SVG (`tools/build.py`); no brain imagery, no parchment,
nothing taken from other quiz creators.

| File | Use |
|---|---|
| `logo/mark.svg` (+ `mark-1024/256/64.png`) | Default: gradient badge. Avatars, bugs, favicons, watermarks. |
| `logo/mark-on-gradient.svg` (+ `-1024.png`) | No badge, for placing directly on the brand gradient (profile picture). |
| `logo/logo-horizontal-white.svg/.png` | Mark + wordmark, for gradient/dark/photo backgrounds. |
| `logo/logo-horizontal-ink.svg/.png` | Same on white/light backgrounds (wordmark in ink #1D1548). |
| `logo/logo-stacked-white.svg/.png`, `logo-stacked-ink.svg/.png` | Square-ish spaces (end-card, stories, merch). |

**Lockups are RTL:** the mark sits on the right (where Arabic reading starts), the wordmark to its left.
Wordmark: Cairo Black (900), outlined to paths (renders identically everywhere, no font needed). The ؟ in the wordmark
is **always accent #FFC83D**, the rest white (on colour) or ink (on light) — the question mark is the brand's signature.

### Clear space and minimum size
- Clear space around any lockup = **½ of the mark's diameter** on every side. Nothing (text, UI, edges) inside it.
- Minimum size: mark **24 px** on screen (eye and ring still read at 24; tested at 24/32/64); horizontal lockup
  **40 px tall**; stacked lockup **80 px tall**. Below that, use the mark alone.
- Mark-only is preferred under 120 px wide, in circles and in video corners.

### Logo don'ts
- Don't recolour the mark, swap ring/eye colours, or put the ؟ of the wordmark in any colour but accent.
- Don't flip the ؟ to the Latin ? direction, rotate, stretch, outline or add effects (bevel, glow) beyond the soft drop shadow used in the templates.
- Don't place the white lockup on light backgrounds or the ink lockup on the gradient.
- Don't set the wordmark in another font, or re-type it as live text in a different weight.
- Don't place the logo or bug over another creator's footage, artwork or reel, or in a way that implies we made or own
  something we did not. The signature identifies **our** channel only; third-party material keeps its own credit.

## 2. Colour tokens (copy of visual-system.md)
| Token | Hex | Use |
|---|---|---|
| bg-1 | #6A3BFF | gradient stop (violet) |
| bg-2 | #2F8CFF | gradient stop (azure) |
| bg-3 | #19D3C5 | gradient stop (teal) |
| card | #FFFFFF | puzzle card, radius 48 px, soft shadow 0 24px 60px rgba(29,21,72,.25) |
| ink | #1D1548 | text on card / light areas, pupil of the eye, bug pill (55%) |
| text-on-bg | #FFFFFF | text on gradient (with 0 4px 18px rgba(0,0,0,.25) shadow) |
| accent | #FFC83D | countdown ring, the ؟, highlights, active caption word, score chips |
| correct | #22D489 | correct-answer glow/tick |
| alert | #FF5C7A | last second of countdown, "wrong" |

Brand gradient: 135°, bg-1 0% → bg-2 55% → bg-3 100%. Soft shapes (circles, rounded squares, 4-point sparkles) at
10–15% white. Accent is a highlight colour: at most ~10% of any frame.

## 3. Type
- **Cairo** (SIL OFL 1.1), self-hosted in `data/brand/quiz-ar/fonts/`: `Cairo[slnt,wght].ttf` (variable, verbatim from
  github.com/google/fonts `ofl/cairo`), `Cairo-Bold.ttf` (700) and `Cairo-Black.ttf` (900) — static instances cut from
  that variable font with fontTools (slnt 0) — plus `OFL.txt` (licence) and `METADATA.pb`. No Reserved Font Name is
  declared, so the instances keep the "Cairo" family name. Ship `OFL.txt` with any font copy.
- Black 900: questions, numbers, wordmark. Bold 700: captions, body, pills.
- Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩) for countdowns, scores, round counters and option labels.
  Options are numbered **right to left** (١ on the right).
- Latin only for the handle/transliteration in small print: "@shoshayef", "Shu Shayef".

## 4. Captions (burned-in, OpenChatCut text items from our word timestamps)
| Property | Rule |
|---|---|
| Font | Cairo Bold 700 (active word may go Black 900) |
| Size | 64–72 px on 1080×1920 |
| Colour | white |
| Legibility | 6 px ink (#1D1548) stroke **or** ink pill at 70% opacity, radius 24 px, padding 12/28 px — pick one per video |
| Lines | max **2**, right-aligned to the caption box (RTL), never hyphenate or split a word |
| Word groups | 2–3 Arabic words per group (≤ 22 characters per line); break at clause boundaries |
| Active word | accent #FFC83D (with the same stroke/pill); no colour-per-word rainbow |
| Position | caption band per visual-system.md (y 1360–1500); see §9 open item on platform safe zones |
| Timing | group appears on its first word's onset, leaves ≤ 0.1 s after the last word; never cover the puzzle card |

## 5. Intro / outro rules
- **Hook first.** Frame 1 is the round-1 question + puzzle. No logo-first opening.
- Intro sting (optional): `signature/intro-sting.mp4` / `-alpha.webm` / `-alpha.mov`, **0.6 s**, ends empty — overlay
  it on the first 0.6 s of the hook or use it between rounds; never longer than 0.6 s, never before the question is on screen.
- Corner bug during rounds: `signature/corner-bug.png` (233×84, transparent; mark + wordmark on an ink pill). Place
  top-left at x 60, y 120 on 1080-wide video, **≤ 70% opacity**. Hide it during the end-card.
- End-card: `signature/endcard.mp4` (on gradient) or `endcard-alpha.webm` / `endcard-alpha.mov` (transparent),
  **1.4 s, 1080×1920, 30 fps** (≤ 1.5 s rule). Mark pops in (back.out 1.6), ring draws, eye opens, wordmark slides in
  from the right, "تابعنا لتحديات أكثر" pill, then @shoshayef. Last frame holds — fine as a loop point.
  Use it after the "كم جبت صح؟" score line, never instead of it.
- Audio for sting/end-card: original synthesized "pop" + soft "shimmer" from the studio SFX set (none bundled; files are silent).

## 6. Thumbnails / covers
Templates: `templates/thumb-1080x1920.html` (Reels/Shorts/TikTok cover) and `templates/thumb-1280x720.html`
(YouTube 16:9). Edit the `DATA` block (question, image path, countdown digit, round chip) or pass `?q=&img=&n=&round=`;
render with `tools/raster.mjs` (see the jobs in `tools/make-jobs.mjs`). Samples: `templates/sample-cover-1080x1920.png`, `sample-thumb-1280x720.png`.
- One question, **≤ 2 lines** (9:16) / ≤ 3 short lines (16:9), Cairo Black, white with shadow; it must be the real
  round-1 question (no clickbait the video doesn't deliver; no "only 1% can solve").
- Puzzle image fills the white card; it must be **our** art or a rights-cleared asset, exactly as in the video.
- Accent countdown badge (ink disc, accent ring ~¾, Eastern digit) overlapping the card edge.
- Small bug (mark + wordmark) top-left (9:16) / top-right (16:9). Keep YouTube's bottom-right timestamp corner clear.
- No faces of real people, no arrows/red circles over others' content, no emoji walls; max 3 colours beyond the gradient.

## 7. Social profile assets
| Platform | Asset | Size / notes |
|---|---|---|
| All (avatar) | `social/profile-1080.png` | 1080×1080; mark on gradient, survives circular crop (checked at 110 px and 40 px) |
| YouTube banner | `social/youtube-banner-2560x1440.png` | 2560×1440; logo + tagline + handle inside the 1546×423 safe area (centre) |
| Facebook Page cover | `social/facebook-cover-1640x624.png` | 1640×624; content in the central 1100×400, away from the bottom-left profile overlap |
| TikTok / Instagram / Threads | profile only (`profile-1080.png`) | they show a circular avatar; no banner |
| YouTube watermark (optional) | `logo/mark-256.png` | 150×150 minimum upload; transparent PNG |

Banner/cover tagline comes from `brand.config.json` ("ألغاز بصرية سريعة وعادلة، وكل جواب مشروح"). Before upload,
preview in the platform's crop tool (desktop + phone) — banner crops differ by device.

## 8. Do / Don't
**Do:** lead with the puzzle; keep the gradient calm behind the card; use the accent only for the ؟, timer and the thing
the viewer should look at; explain every answer in one line; credit any third-party asset as its licence requires.
**Don't:** use "intuition / sixth sense / psychology / IQ" claims; copy the parchment-card + brain look of reference
creators; reuse their puzzles, images or wording; put our logo on their reels or imply partnership; use body/gender
close-up rounds; add an intro longer than 0.6 s or an end-card longer than 1.5 s.

## 9. Rebuild (name or copy change)
1. Edit `data/brand/quiz-ar/brand.config.json` (`wordmark`, `endcardSubtitle`, `tagline`, `handle`, `latin`).
2. Git Bash: `bash data/brand/quiz-ar/tools/build-all.sh` (≈1 min). Needs Chrome, Node ≥ 22, ffmpeg, Python ≥ 3.10 with
   `fonttools` + `uharfbuzz` (`tools/requirements.txt`; default `PYLIB=E:/quiz-ar-brand-tmp/pylib`). Frame
   sequences go to `BRAND_TMP` (default `E:/quiz-ar-brand-tmp`, off C:).
3. It regenerates every SVG/PNG/MP4/WebM/MOV listed above. Look at the outputs before using them.

**Open items for the orchestrator:** (a) `naming-and-packaging.md` §5's conservative platform box (x 120–838,
y 288–1213) disagrees with visual-system.md's caption band (y 1360–1500) and bug position (y 120–220); confirm with a
private test upload and update visual-system.md — the bug and captions here follow visual-system.md. (b) Trademark
search for "شو شايف" is still pending (naming doc §6); do not print merch before it.
