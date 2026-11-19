# quiz-ar: naming and packaging (draft, 2026-10-22)

Status: draft for orchestrator and owner review. No account was created, no login was made, nothing was posted. `brand:upsert` has not been run. Machine-readable twin: `brand.json`.

## 1. Recommendation

| | |
|---|---|
| Name | **شو شايف؟** (Latin: *Shu Shayef*, "What do you see?") |
| Handle | **@shoshayef** (no dots, same string on every platform) |
| Backup handle | **@shushayef** (same name, other transliteration) |
| Tagline | ألغاز بصرية سريعة وعادلة، وكل جواب مشروح |

Why this name:
- It is the question the viewer asks in every round, so the name is also the hook. It is short (2 words, 7 letters) and easy to say in the narration.
- It matches the Levantine-leaning voice. The weakness is that "شو" is Levantine. Gulf and Egyptian viewers will understand it but would say "وش" or "إيه". The tagline, descriptions and hashtags use plain Arabic ("ألغاز بصرية", "اختبر نفسك") to cover search for the whole region.
- It makes no claim about intuition, the sixth sense or psychology. The reference reels sell "intuition tests" while their rounds are mostly chance; our format is deduction, and the name does not promise otherwise.
- Collision search found **no channel with the same or a confusingly similar name** (YouTube channel search for "شو شايف" returned only unrelated channels such as "محمد شايف" and "علا شو شايف حالك"). See section 3.
- No exact-name conflict on YouTube or TikTok for @shoshayef or @shushayef (section 2).

Why not the owner's candidates (details in section 3):
- **اختبار حدسك / اختبر حدسك**: ties us to the "intuition" claim we are deliberately not making. An exact "اختبر حدسك" channel exists (tiny). The obvious handle `@hadsak` is taken on YouTube and TikTok.
- **اختبر ذكاءك**: the most crowded phrase found (at least 8 channels with "اختبر ذكائك/ذكاءك"; the largest, @Ekhtab3rZakaak, has 51.2K subscribers). It also implies IQ claims.
- **تحدي الحاسة السادسة**: pseudo-science framing; "6 th Sense Perfumes / الحاسة السادسة للعطور" (86.6K) is an established brand using the phrase, which is a possible trademark conflict.
- **تحدي عقلك**: an exact-name channel "تحدِّي عقلك | Challenge Your Mind" (@_ChallengeYourMind, 15K) exists.
- **دقيقة تحدّي**: our videos run 25-40 s, not a minute; "تحدي" returns food, fitness and gaming challenge content, so search intent is mixed. Little collision (a 3-subscriber "دقيقة تحدى"), but weak fit.
- Own ideas rejected: **خمّن صح** (exact-name channel with 35.2K, and @khamen-sah is taken), **لغز ثواني** (near-identical "لغز في ثواني", 4.71K), **عين الصقر** (@aynalsaqr taken on YouTube and TikTok, several small channels with the exact name), **لمحة** (@lamha.quiz taken on TikTok, many tiny "لمحة" channels).

Not done and needed before the owner commits: a trademark registry search (WIPO Global Brand Database, TMview, and the national registries of the target markets). Only web and YouTube searches were run, so "no trademark conflict found" means "none surfaced in those searches", not "cleared".

## 2. Availability evidence

Method (2026-10-22, logged out, `curl` with a desktop Chrome user agent from this PC, plus WebFetch):
- **YouTube** `https://www.youtube.com/@<handle>`: reliable. Positive controls `@mrbeast` and `@Tahadi.X` (dotted handles are valid) returned 200 with the channel title; a nonsense handle returned 404 "404 Not Found".
- **TikTok** profile pages return the same 1,462-byte bot-wall page for every handle (real and fake), so they say nothing. The public oEmbed endpoint `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@<handle>` does discriminate: `@tiktok` and `@mrbeast` returned 200 JSON ("... Creator Profile"), nonsense `@zzqxjv81kd` returned 400 `{"message":"Something went wrong"}`. It is an undocumented use of the endpoint, so "400" is read as **likely free**, not confirmed (a banned or private account could look the same).
- **Instagram, Facebook, Threads**: **inconclusive for every handle.** Instagram returns HTTP 200, title "Instagram", about 583.7 KB, for real (`instagram`, `mrbeast`, `tiktok`) and nonsense handles alike; its API returned 429. Facebook returns HTTP 400 "Error" even for `facebook.com/facebook`. Threads (`threads.net` redirects to `threads.com`) returns 200, title "Threads", about 230 KB, identical for real and nonsense handles; WebFetch showed a "Threads • Log in" page. The owner must check these three while logged in (the signup form tells you instantly).

### Final and backup handle

| Handle | YouTube | TikTok | Instagram | Facebook | Threads |
|---|---|---|---|---|---|
| @shoshayef | 404 -> likely free | oembed 400 -> likely free | inconclusive | inconclusive | inconclusive |
| @shushayef | 404 -> likely free | oembed 400 -> likely free | inconclusive | inconclusive | inconclusive |
| other spellings: shoshayef.quiz, shoshayef.ar, shu.shayef, shoo.shayef | 404 (all) | oembed 400 (all) | inconclusive | inconclusive | inconclusive |

### All candidate handles (YouTube / TikTok; IG, FB, Threads inconclusive for all)

| Candidate name | Handle tested | YouTube | TikTok |
|---|---|---|---|
| اختبار حدسك | ikhtibar.hadsak, hadsak.quiz, quiz.hadsak, ikhtibarhadsak, hadsakquiz | 404, likely free | oembed 400 (first three tested), likely free |
| اختبار حدسك | hadsak | **taken** (200) | **taken** (oembed 200, "user9851934681488") |
| اختبر ذكاءك | ikhtabir.thakaak, ikhtabir.zakaak | 404, likely free; near-collision with @Ekhtab3rZakaak | 400, likely free |
| تحدي الحاسة السادسة | ta7adi.6th | 404, likely free | 400, likely free |
| تحدي عقلك | ta7adi.aqlak, taa7adi.aqlak, tahaddi.aqlak | 404, likely free (but the exact-name channel exists under another handle) | 400, likely free |
| دقيقة تحدّي | da2i2a.ta7adi, daqiqa.tahaddi, daqiqa.ta7adi | 404, likely free | 400, likely free |
| لغز ثواني (own) | lughz.thawani | 404, likely free | 400, likely free |
| خمّن صح (own) | khamen.sah | 404 (note @khamen-sah with a hyphen is a 35.2K channel) | 400, likely free |
| عين الصقر (own) | aynalsaqr | **taken** (200, title "الصراحه راحه") | **taken** (oembed 200, "Ayn Alsaqr") |
| عين الصقر (own) | ayn.alsaqr, alsaqr.quiz | 404, likely free | 400, likely free |
| لمحة (own) | lamha.quiz | 404, likely free | **taken** (oembed 200, "لمحة") |
| لمحة (own) | lamhaquiz | 404, likely free | 400, likely free |
| شو شايف؟ (own) | shoshayef, shushayef, shoshayef.quiz, shoshayef.ar, shu.shayef, shoo.shayef | 404, likely free | 400, likely free |

Dotted handles (e.g. `ta7adi.6th`) show a free result on YouTube and TikTok but a consistent no-dot handle is easier for viewers to type and for the owner to claim everywhere; hence `@shoshayef`.

## 3. Name collisions found (YouTube search, channel filter, 2026-10-22; subscriber counts as displayed)

| Query | Closest existing channels |
|---|---|
| اختبار حدسك / اختبر حدسك | "اختبر حدسك" (@BacharDib-o6o, no count shown); "Intuition" (64); "اختبار العقل" (272); videos: "لغز: اختبر حدسك" by another channel, "اختبار الحاسة السادسة" (Hisham) |
| اختبر ذكاءك | "اختبر ذكائك" @Ekhtab3rZakaak (51.2K); "اختبر ذكائك" @information-i3 (744); "اختبر ذكاءك" @redzone0344 (2.14K); "اختبر-ذكاءك" (26); "اختبر ذكاءك الآن" (23); "اختبر ذكاءك 🧠" @Quiz0Arabic (19) |
| تحدي الحاسة السادسة | no exact channel; "6 th Sense Perfumes الحاسة السادسة للعطور" (86.6K); "الحاسة السادسة || sixth sense" (303) |
| تحدي عقلك | "تحدِّي عقلك | Challenge Your Mind" @_ChallengeYourMind (15K); "تحدي العقل" @Tahadi.X (25.2K); "اختبر عقلك" (9.19K) |
| دقيقة تحدي | "دقيقة تحدى" (3); "تحدي الدقيقة" (no count) |
| لغز ثواني | "لغز في ثواني | Puzzle in Seconds" @LaghzFiThawani (4.71K); "لغز في 10 ثواني" (26 and 23); "لغز في ثواني" (3 and 572) |
| شو شايف | none similar ("محمد شايف" 641K is a person's name; "علا شو شايف حالك", "شايف البحر شو شايف البحر شو" are unrelated and tiny/uncounted) |
| خمن صح | @khamen-sah (35.2K), @Guess.correctly (3.09K), others |
| عين الصقر ألغاز | five channels named "عين الصقر" (1-23 subs), "eagle عين الصقر" (150) |
| لمحة تحدي | many "لمحة" channels (4-115 subs), "لوني / Lone iq" (22.5K, an IQ-test channel) |

Plain web searches (WebSearch) for the five owner names returned no channel pages, only unrelated articles and app listings; the YouTube search above is the evidence. TikTok, Instagram and Facebook account search was not possible logged out. An owner check of in-app search for "شو شايف" on all five platforms is still advisable.

## 4. Packaging

### Channel description, short (71 chars)
ألغاز بصرية سريعة وعادلة: 5 جولات في 30 ثانية، وكل جواب مشروح. شو شايف؟

### Channel description, long (608 chars; YouTube limit 1000)
```
شو شايف؟ قناة ألغاز بصرية سريعة بالعربي. كل فيديو من 25 إلى 40 ثانية و4 إلى 5 جولات تصعب شوي شوي، وعندك 3 ثواني تفكر قبل ما ينكشف الجواب.

ألغازنا عادلة: كل جواب له دليل تقدر تشوفه بعينك (فرق إضاءة، ظل، انعكاس، ترتيب، تفصيلة صغيرة)، وبنشرح لك الدليل بجملة وحدة بعد كل جولة. ما في تخمين أعمى ولا ادعاءات عن الحدس أو قراءة الشخصية، هي مجرد ملاحظة وتركيز وتسلية.

شو تلاقي هون: ألغاز ألوان وظلال، أشياء مخفية، فروقات بين صورتين، تسلسلات منطقية، وجولة أخيرة صعبة.
كم جبت صح؟ اكتب نتيجتك بالتعليقات وقول لنا أي جولة كانت الأصعب.

فيديو جديد بنشرح فيه كل جواب. تابعنا وجرّب عينك.

#شو_شايف #ألغاز_بصرية #اختبر_نفسك
```
Note: the description promises a "new video" in general terms but no schedule; do not add a posting-frequency promise until the growth-director has data.

### Per-platform bios (character counts verified with Python `len`)

| Platform | Limit used | Chars | Text |
|---|---|---|---|
| YouTube (channel description, first lines) | 1000 | 110 (short bio) / 608 (long) | ألغاز بصرية سريعة وعادلة بالعربي. 5 جولات، 3 ثواني للتفكير، وكل جواب مشروح. كم جبت صح؟ اكتب نتيجتك بالتعليقات. |
| TikTok | 80 | 52 | ألغاز بصرية سريعة وعادلة، وكل جواب مشروح. كم جبت صح؟ |
| Instagram | 150 | 93 | ألغاز بصرية سريعة بالعربي. 5 جولات، 3 ثواني لكل سؤال، وكل جواب مشروح. كم جبت صح؟ اكتب نتيجتك. |
| Facebook (Page intro) | 101 | 41 | ألغاز بصرية سريعة وعادلة، وكل جواب مشروح. |
| Threads | 150 | 60 | ألغاز بصرية سريعة وعادلة بالعربي، وكل جواب مشروح. كم جبت صح؟ |

Limits: TikTok 80 and Instagram 150 are as given in the brief. YouTube 1000, Facebook Page intro 101 and Threads 150 are from memory and were not re-verified against platform help pages; all texts are well under them. The Facebook "About" section allows longer text, so the long description can be used there.

### Hashtags (15)
Arabic: `#شو_شايف` `#ألغاز` `#ألغاز_بصرية` `#اختبر_نفسك` `#تحدي` `#اختبار_ملاحظة` `#لغز` `#ذكاء` `#تحدي_العقل`
English: `#shoshayef` `#brainteaser` `#puzzle` `#quiz` `#riddles` `#shorts`
Use 3-5 per post (brand tag + 2-4 topical), not all 15. These are Arabic search phrases seen in YouTube results (اختبر نفسك، ألغاز، تحدي العقل، اختبر ذكاءك); no hashtag-volume data was measured. Avoid `#psychology` / `#intuition` / `#sixthsense`: the format is not that, and the studio's study flagged those claims as pseudo-science.

### Title formula (owner decision 2026-11-02: escalating difficulty is the DEFAULT)
```
{N} جولات وكل وحدة أصعب … {الشيء الواحد}   (+ #shorts)
```
Data (2026-11-02 API pull): escalating-difficulty titles median ~6.0K views (n=4, best 28.9K) vs ~2.3K for «وين…» / «كم جبت» and 815/30 for «٤ جولات ذاكرة وتركيز مع X» (RETIRED).
Rules: name ONE concrete object/theme of that video (cherry, cat, chair); N = actual round count (check `quiz.json` progress ٤/٤); vary the wording between videos («وكل وحدة أصعب», «بتصعب وحدة ورا وحدة», «أصعب وأصعب», «بتصعب لحد الأخيرة»); <= ~60 chars; no unproven "1% can solve" claims. Old formula «{سؤال} | {N} جولات، كم جبت؟» is no longer the default.
Retitle a not-yet-public video: `npx tsx scripts/youtube.ts retitle quiz-ar <videoId> "<title>"` (keeps description/tags; syncs script.json titles.youtube).

### Pinned-comment template
```
كم جبت صح من {N}؟ اكتب نتيجتك هون 👇
وإذا جولة ما انحلت معك، اكتب رقمها وبنشرح الدليل. أي جولة كانت الأصعب؟
```
No giveaways, no "like/follow to see the answer", no fake or paid comments (growth-director quality bar: no engagement manipulation). Pinning is done by the owner in the logged-in browser as part of the post.

### Posting rules
1. One approved video at a time, in the owner's logged-in Chrome, explicit owner OK before each post (CLAUDE.md production loop step 6).
2. Only productions with the latest QA review passing (>= 85, no blockers) and every source/asset rights-cleared (our own graphics, narration and puzzle designs; no third-party footage unless countersigned).
3. Title, description and credits are taken from `productions/<id>/script.json` and are posted **unchanged**; the title formula above is applied when the script is written, not at upload time.
4. Per-platform metadata checked before upload: title, description with attribution (if any), 3-5 hashtags, disclosure flags. The narration is synthetic (Gemini TTS); the owner should decide how each platform's AI/synthetic-content label applies and tick it if required. Not verified here.
5. Never report a post as public unless the platform confirms it (unaudited TikTok API apps post privately only).
6. Record a prediction before publishing (`production:predict`), then snapshots at 24h/48h/7d/30d with real platform metrics only.
7. Account creation, app review, paid tools and the decision to publish publicly are owner decisions.

## 5. Safe zones for 1080x1920

**Caveat: none of these numbers comes from a first-party platform page I could open.** All were reported by third-party guides via search; the guides disagree. Treat them as working margins and confirm with an in-app preview (TikTok ad preview, Instagram/Meta preview, a phone with the description expanded) on the first test upload (private/draft).

| Platform | Reported margins (px on 1080x1920) | Source (third-party) |
|---|---|---|
| TikTok | top 240 / bottom 660 / sides 120, 180 px button column on the right from y=840 | socialync.io/tools/safe-zones/tiktok |
| TikTok | top 254 / bottom 707 / right 242 (measured from ad previews, March 2026) | adkit.so/tools/safe-zones/tiktok |
| TikTok | top 150 / bottom 350-400 / right >=120 | trymypost.com/blog/tiktok-ad-specs-2026-safe-zones |
| Instagram Reels | 14% top (~270) / 35% bottom (~670) / 6% sides (~65); revid.ai widens the right to 120; First Pier lists 108 / 320 / 60 left / 120 right | revid.ai/instagram-reels-safe-zone, socialync.io/tools/safe-zones/instagram-reels, firstpier.com/resources/instagram-ad-safe-zones |
| YouTube Shorts | top 288 / bottom 672 / left 48 / right 192 (clear area 840x960), attributed to Google's vertical-ad guidance; others say bottom 288-300, about 400 with the description expanded | socialync.io/tools/safe-zones/youtube-shorts, revid.ai/youtube-shorts-safe-zone, postplanify.com/tools/youtube-shorts-safe-zone-checker |
| Facebook Reels / Threads | not researched | none |

**Unified conservative box for our builds** (the union of the largest reported margins): keep all text, captions, the countdown ring, the score counter and answer labels inside **x 120-838, y 288-1213** (718 x 925 px). That is top 288, bottom 707, left 120, right 242. Backgrounds, gradients and motion graphics may bleed to the full frame. Arabic RTL captions: anchor the right edge at x=838 at most, and place the answer caption in the upper half of the box so the description overlay never covers it.

## 6. Open items for the owner or orchestrator
- Logged-in check of @shoshayef on Instagram, Facebook and Threads (all inconclusive), and in-app search for "شو شايف" on all platforms.
- Trademark registry search (WIPO / TMview / target-country registries) before committing; none was run.
- Decide whether "شو شايف؟" (Levantine) is acceptable or a MSA-leaning name is preferred; if so the next-best option from the search is a new name, not a candidate from the brief, since each brief candidate had a collision, a pseudo-science tie, or both.
- Verify the safe-zone numbers with a private test upload.
- Confirm profile-field limits for YouTube, Facebook and Threads in the live signup forms.
