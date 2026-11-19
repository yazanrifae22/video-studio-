# Packaging playbook (Mila Sato, 2026-11-08)
Goal: title + first frame + description line 1 win the feed test; every video is packaged for 1M, honestly. Precedence: owner rules > brand rules > this playbook. Owner: `.claude/agents/packaging-director.md`. Wording/translation stays with script-localization; packaging-director owns title, description, hashtags, cover, pinned comment.
Tags: [evidence: URL] / [data: videos.csv, n] / [opinion]. Web sources are third-party SEO blogs; YouTube Help was not reachable, so each is marked "verify".

## 1. Study (short)
- Shorts feed is picture-first; the title sits under the video with the channel name and is cut after about 1-2 lines [opinion, common in the sources]. Title still matters for search, suggested, channel grid, and Shorts shelves [opinion].
- **Platform limits (enforced, owner 2026-11-08; `config/platform-limits.json`, `packages/shared/src/platform-limits.ts` + `scripts/platform_limits.py`):** YouTube title ≤ 100 characters; description ≤ 5,000 **bytes** UTF-8 (Arabic ≈ 2 bytes per letter, so ≈ 2,500 Arabic letters; credits + hashtag line count); no `<` or `>` in title/description/tags; tags ≤ 500 characters (commas and quotes around tags with spaces count); ≤ 15 hashtags in title + description (over 15 → YouTube ignores all). Over a limit = refused (validate-review packaging, prelint, publish-plan.py, youtube.ts upload) with field/length/limit; nothing is truncated. Put the keyword and the claim in the first 40-50 chars [opinion].
- Hashtags: the first 3 description hashtags show as links above the title; use 3-5 at the end of the description incl. #Shorts; avoid hashtags in the title (sources disagree); more than 15 reportedly voids all [evidence: https://hashtagtools.io/blog/youtube-shorts-hashtags-title-vs-description-2026, https://touhfa.art/blog/seo/youtube-hashtags-guide/, verify].
- Description: line 1 = one sentence with the keyword and the value; do not repeat the title; chapters are irrelevant to Shorts [evidence: https://www.clipspeed.ai/blog/how-to-write-viral-titles-descriptions-shorts.html, verify].
- Test & compare: works for long-form (title, thumbnail, or both, up to 3 options, desktop, advanced features); most sources say Shorts are NOT supported [evidence: https://vidiq.com/blog/post/youtube-launches-new-title-testing-tool, https://thumbnailtest.com/guides/ab-test-youtube-shorts/]. So we test across videos (one variable, growth-director logs it), never inside one.
- Shorts cover: custom thumbnails for Shorts exist from 2025-26 [evidence: https://vidiq.com/pt/blog/post/youtube-shorts-custom-thumbnails, verify]; the cover shows in the channel grid/search, not the swipe feed. Pick the payoff frame, <= 4 words, readable at 360 px [opinion].
- Pinned comment: a spoken-line question or the bet; never bait [opinion].
- Arabic titles: Levantine wording works for quiz-ar (best 29,488) [data]; keep MSA keywords for search, Levantine for tone [opinion]. Emoji: 1 max, end of title; one top quiz-ar title carried 👀 (10,455, n=1) [data].

## 2. Our data (views; median unless noted; n = videos)
- quiz-ar (47, median 2,272): question title + round count wins. Top: "٣ جولات وكل وحدة أصعب.. بتنجح؟" 29,488; "وين الوردية بلا ألوان؟ ٣ جولات بتصعب!" 19,321. Titles with ? : 36 videos median 2,432 vs 1,954 without (11). Object-specific ones vary 197 to 14,929, so the object matters more than the template. [data]
- viral-rankings (17, median 1,308): `TOP 5 <subject> <word> MOMENTS` wins on subject: stunt/Messi/cat 1,588-2,838; weak subjects (Bruce Lee 56, Ronaldo celebration 47). [data]
- clipping (24, median 828): "Speaker: quote or claim" 22 videos median 863 vs 467 (2). Best 6,367 = named role + concrete counterfactual. A digit helps: 9 videos 1,193 vs 557 (15). Titles > 60 chars: 648 (10) vs 1,072 (14). [data]
- compilations (24, median 1,315): machine + superlative ("The 6-Million-Pound-Plus Crawler..." 2,286). Digits no effect (1,323 vs 1,276). Generic "How Do You Build X? NASA's Answer" has 1,768 and 83, so the named famous machine decides. [data]
- tech (32, median 55): "Why <everyday AI/device surprise>" 1,084-2,105; "X Explained"/jargon flops (TECH-R1). Question titles median 13 (5) vs 57 (27): "Why ..." claims beat open questions. [data]
- celebrity (35, median 202): sports star + one number/oddity (Yamal 1,668, Tyson 1,266); niche names without a peg 2-3 views. [data, revival doc]
- rankings (15, median 102): single named Earth event + number, <= 50 chars (quake 1,359); database titles ("5 Fastest Winds in the Solar System") 1,170 once but median of abstract titles 27. [data]
- kids (13, median 8): parent-search format "<Topic>! Tiko & Pip's <Activity> | <Skill> for Kids" 430-447 (n=2). [data]
- Small n everywhere: these are leads, not laws. growth-director re-computes weekly.

## 3. Rules P1-P10 (yes/no)
- P1 Subject first: a searchable named subject (person, machine, event, object) appears in the first 40 chars. Y/N
- P2 Claim paid: every title promise is paid on screen at or before `payoff_ts`; no word the video does not show. Y/N
- P3 One concrete number or superlative that is true and in evidence (count of rounds, weight, year). Y/N (not for kids)
- P4 Frame-0 match: title words are visible or audible in frame 0-3 s; title is not the on-screen hook repeated. Y/N
- P5 Length: title <= 60 chars (<= 50 for rankings); one line fits the feed without a dangling cut. Y/N
- P6 No bait: none of "you won't believe", fake urgency, invented near-miss, all-caps shouting, clickbait emoji strings. Y/N
- P7 Description line 1 (<= 100 chars) adds a new fact or search term, never repeats the title; then 3-5 hashtags, #Shorts last-but-one; no AI-generation text. Y/N
- P8 Search evidence: chosen title contains >= 1 term with source (radar, autocomplete, pageviews, hook-log winner). Y/N
- P9 Cover frame: payoff or most kinetic frame, <= 4 words, readable at 360 px, safe zones respected (BRAND-GUIDE section 8); channel-grid crop checked. Y/N
- P10 Brand rules satisfied (section 4) and credits per rights record unchanged. Y/N

- Platform limits: YouTube title ≤ 100 characters, description ≤ 5000 BYTES UTF-8 (Arabic letters are 2 bytes each), no `<` or `>` in title/description, tags ≤ 500 chars total, ≤ 15 hashtags; checked by `packages/shared/src/platform-limits.ts` / `scripts/platform_limits.py` (`config/platform-limits.json`) in prelint, validate-review.py, publish-plan.py and youtube.ts upload.
- `altered_content` (boolean, required in packaging.json, decided per video by packaging-director): `true` ONLY for realistic depictions of real people or real events that did not happen (e.g. a realistic likeness/voice of a real person saying or doing something they did not, a realistic fake of a real event); `false` (default) for animation, kids 3D, typography, real archival footage, a generic narrator, quizzes; add `altered_content_reason` (one short line) when true. It maps to YouTube's altered-content setting on upload (`status.containsSyntheticMedia`); a platform setting, never text: never mention it in title/description/tags.

## 4. Templates per brand
- viral-rankings (Podium Pop): title exactly `TOP 5 <W1> <W2> MOMENTS` (keywords only as W1/W2; hyphen = one word). Description: line 1 = viewer question or bet about the #1 (no credit/source block, owner 2026-11-01), then `#shorts #<subject> #<category>`.
- clipping (Mission Voices): `<Role/Name>: <their line or claim>` (<= 60 chars, QA4 speaker words, quote only words actually said). Description: line 1 = context in one sentence; credit block copied from the rights record; hashtags #shorts #nasa #astronaut.
- compilations (Way It Was Made): `<Famous named machine> + <one measured number or superlative>` (SR3). Description: line 1 = the "no way" number in a sentence; source credit from rights; #shorts #nasa.
- quiz-ar: Arabic question + round count, e.g. `وين <الغرض>؟ ٤ جولات بتصعب` (no intuition/IQ claims; Arabic-Indic digits as in winners). Description: line 1 = challenge + "كم جبت؟" invite; #shorts #ألغاز #اختبار. 1 emoji max.
- tech: `Why <everyday AI/device surprise> ...` (TECH-R1); never "Explained", "vs", "in N Seconds". Description: line 1 = the plain answer in one sentence; #shorts #ai #tech.
- kids (Made for Kids): `<Topic>! Tiko & Pip's <Activity> | <Skill> for Kids`; parent-search words; no urgency, no cliffhanger, no "watch till the end". Description: what the child learns + a parent line; MFK hashtags; no pinned bait.
- rankings (Planet Extremes): `<Named Earth event> + number`, <= 50 chars. Description: line 1 = the measurement and its source; source credit from rights; #shorts #earth #space.
- celebrity: `<Star> + one number/oddity` tied to a live peg; no allegation, no health/trial, names as text. Description: dated fact in line 1; sources per revival doc; no AI-generation text.

## 5. Banned patterns
"Explained", "A vs B", "in N Seconds" (tech); "How Do You Build X?" without a named machine; abstract/solar-system-wide subjects without a household hook; hype adjectives as accents (funniest, insane, epic); hashtags in title; more than 5 hashtags; title restated in line 1; any "AI-generated/synthetic voice/Gemini TTS" text; invented quotes; numbers not in evidence; urgency in kids.

## 6. Packaging score (100), gate 85
Subject searchable 20 | claim paid and true 20 | number/superlative or curiosity gap in first 40 chars 15 | frame-0/title match 10 | description line 1 value + hashtags 10 | search evidence 10 | cover frame 10 | brand rules and credits 5. P6 fail or any owner-rule fail = score capped at 60. Each shortfall becomes a `gap_to_gate` item `{item, now, needed, fix, points, owner, t|null}`; now + sum(points) must reach 85 or say "ceiling: <why>". The three candidate titles are scored; the best is `chosen_title`.
