# Ranking-format reference benchmark (viral-rankings)

Date: 2026-10-31. Author: trend-hunter (task 183). Status: research evidence for design hypotheses, **not proof of what works**.
Raw material: `data/cache/research/benchmark/` (`research_only`, never the media library): `tt/` (6 TikTok files), `sheets/` (1 fps-style contact sheets, 12 frames/video, 220 px wide), `asr.json` (faster-whisper on the 6 files), `yt_meta.json`, `thumbs/yt_top.jpg`.

## 1. Sample and limits (read first)

| Item | Count |
|---|---|
| Ranking Shorts/TikToks with a real URL and metadata actually read | **40** (34 YouTube Shorts + 6 TikTok) |
| **Watched** (downloaded, 12-frame sheet + ASR, per studio rule: TikTok only) | **6** (5 real-footage + 1 animated). Target was 8-10: **missed** |
| YouTube Shorts: page metadata only (views/likes/date/length/description). 12 also had their thumbnail viewed. **None watched** (YouTube media is never downloaded) | 34 |
| Instagram Reels verified | **0** (search index returned no reel URLs) |
| Subgenres covered | comedy sports (football), animals (dogs/cats/mixed), satisfying, unbelievable/skill, surprising reactions (food, Cam2r), fails, kids |

Limits, honestly:
- **Selection bias.** Candidates come from web search with a title phrase ("Ranking Funniest ... Moments"). That favours exact-title copycats and videos the index surfaces. It says nothing about the format's true distribution.
- **TikTok discovery was the bottleneck.** TikTok discover/tag pages render videos client-side; yt-dlp cannot list hashtag/user pages (`Unable to extract secondary user ID`). Only 6 `/video/` URLs surfaced via search. Several leads (handles seen in search snippets, e.g. @goldentierrankings, @rankbober, @wildrankings, @ranking7332) could **not** be resolved to a video URL and are **unverified**: no data used from them.
- View counts: YouTube = yt-dlp page metadata read 2026-10-31. Since 2026-08-24 YouTube counts a Short view when playback starts (section 8), so counts are not comparable with older numbers or with TikTok. TikTok = yt-dlp metadata (`view_count`), read 2026-10-31. Search-snippet counts were **not** used.
- n=6 watched is too small for any frequency claim. Percentages below are "x of 6".
- Views are not evidence an edit choice caused success. Several top-view Shorts here look like re-uploaded third-party clips (reuse risk, section 5), and two duplicated titles show up under many channels.
- Three search-returned YouTube IDs were `no longer available ... account ... terminated` when checked (BtOrgN_MFTw, bMSi4O1pz-o, eoZiJi41JEA). Reason unknown; recorded only as an enforcement-risk signal for the format, not a cause.

## 2. Watched references (TikTok, downloaded to `tt/`, source = yt-dlp metadata 2026-10-31)

| ID | URL | Creator (page) | Posted | Views / likes / comments | Len | Subgenre | Format |
|---|---|---|---|---|---|---|---|
| T1 | [tiktok.com/@top.ranking000/video/7593780349109456158](https://www.tiktok.com/@top.ranking000/video/7593780349109456158) | top.ranking000 (yt-dlp uploader field: aifruitstories664) | 2026-01-10 | 3.7M / 327.4K / 2,369 | 64.7 s | surprising/funny moments | Top 5 |
| T2 | [tiktok.com/@lolbrith2/video/7558469524421463327](https://www.tiktok.com/@lolbrith2/video/7558469524421463327) | lolbrith2 | 2025-10-07 | 14.3M / 1.2M / 4,293 | 61.4 s | reactions (food) | Top 7 |
| T3 | [tiktok.com/@hyperlol0/video/7526346679973465374](https://www.tiktok.com/@hyperlol0/video/7526346679973465374) | hyperlol0 | 2025-07-12 | 238.4K / 39.5K / 94 | 48.6 s | animals | Top 5 |
| T4 | [tiktok.com/@toppinoymoments/video/7469001498341412114](https://www.tiktok.com/@toppinoymoments/video/7469001498341412114) | toppinoymoments | 2025-02-08 | 15.6M / 1.0M / 15.6K | 126.3 s | kids (Philippines), "part 2" | Top 5 |
| T5 | [tiktok.com/@babiesoftiktok2/video/7506950656859573526](https://www.tiktok.com/@babiesoftiktok2/video/7506950656859573526) | yt-dlp uploader: me_tessa (handle in URL differs) | 2025-05-21 | 1.6M / 218.4K / 698 | 73.9 s | kids/surprising | Top 5 |
| T6 | [tiktok.com/@top5rankingvideos/video/7662902466165476626](https://www.tiktok.com/@top5rankingvideos/video/7662902466165476626) | top5rankingvideos | 2026-07-15 | 22.2K / 507 / 23 | 21.2 s | animated "animal hospital" (Roblox-style), not real footage | **Top 3** |

### 2.1 Per-video capture (what the 12 frames and the ASR show)

Moment length is approximate (a 12-frame sample cannot give cut-exact times). "Narrator" = a voice added by the creator; ASR segments that match the clip audio are counted as source audio.

| | T1 | T2 | T3 | T4 | T5 | T6 |
|---|---|---|---|---|---|---|
| **Hook 0-2 s** | Real action (dancer on a dark street) + title already on; rail numerals shown, no labels yet; label of #5 pops in at ~1 s | Two men biting food, title + rail with first label ("The clapp") already on at frame 0 | Person in reindeer headband and mask, title + sub-line "(Last one is my favorite)" on; label of #5 already there | Zoomed blurry face at 0 s with **no** title/rail; title + rail appear at ~1 s | Toddler clip, quoted joke title + rail on at frame 0; label "Leaving" for #5 already shows | Cartoon rabbit; title + rail on at frame 0, #2 label at ~1 s |
| **Title text / colours** | "RANKING THE FUNNIEST / MOMENTS EVER": white + yellow, black top bar, static all video | "RANKING BEST FOOD REACTION": white, single colour, no bar, thin shadow | "Ranking the Funniest / Animal cut off moments": white + green, black top bar, small white sub-line | "RANKING / PINOY KIDS / FUNNY MOMENTS / part 2": white + green + red "part 2", on translucent grey plate | "Kid 3 broke the simulation. I swear": white on **red** boxes (a joke line, not the word "ranking") | "Funniest Animated Animal Hospital": white / green / blue / red words |
| **Rank rail** | Left, below title; numerals 1-5 present from the start (1 yellow, 3 orange, others white), labels fill in; earlier labels persist | Left; 7 numerals pre-shown, labels fill in italics with emoji | Left; numerals 1-5 in yellow/grey/orange/white, labels fill in | Left, ~1/3 down; labels fill in (Taglish) | Left, big numerals, yellow bold labels; rail occupies upper ~third | Left, upper third, 1-3 pre-shown |
| **Reveal order** | **Sequential countdown 5-4-3-2-1** | Countdown 7 to 1 | Countdown 5 to 1 | **Non-sequential: 3-2-5-4-1** (labels appear in that order) | Countdown 5 to 1 | **Non-sequential: 2-3-1** |
| **Moment length (approx.)** | ~13 s (5 moments / 64 s) | ~8-9 s (7 / 61 s) | ~10 s (5 / 49 s) | ~25 s (5 / 126 s) | ~15 s (5 / 74 s) | ~7 s (3 / 21 s) |
| **Narrator** | None. ASR = news-anchor audio of the source clip | None. ASR = source speech ("I'm vegan and I'm trying steak") | None. ASR = source (squeaky-toy talk) | None. Source speech (Tagalog/other; ASR unreliable) | None. ASR = source dialogue; "Leaving." is the clip's punchline | None audible; ASR returned a Spanish "subscribe" line at 0-9.6 s that is likely a hallucination over music: **not counted** |
| **Punchline placement** | Inside each source clip; creator label is a 1-2 word tag ("SKETCH", "BARK") | Inside each clip; labels are short quips | Inside each clip; labels ("Poor dog", "AWAWA", "Say less") | Inside each clip; captions burned into source ("Kulit mu yumie...") | Source clip's last line; **the rail label for #5 ("Leaving") is the punchline word and is visible from frame 0 (spoiler)** | Inside each animation, ends in a sudden gag |
| **CTA timing** | **Baked "SUBSCRIBED" sticker/cursor overlay at ~19 s and ~45 s** (mid-video, twice); no end CTA seen | None seen | None seen ("last one is my favorite" is a hold line) | None seen | None seen | None seen (possible audio outro unverified) |
| **Caption design** | No creator captions; source TikTok captions/UI kept; letterboxed | None by creator; source captions kept; sticker collage added at #2 | None by creator | Creator title plate + labels; source captions kept; **source TikTok watermark visible** and creator handle burned bottom-left | Source captions kept ("So you just finished your first day..."); credit handle watermark of the original poster visible | Rail labels only |
| **Source coverage** | Letterboxed in black; some square/16:9 sources scaled small; one full-bleed white-background clip | Mostly full-bleed 9:16; some tan fill; sticker art around face | Black-bar letterbox under the title bar | Full-bleed under the title/rail (crops tall) | **Small centred inset over blurred colour-tinted copy of itself** (blur fill) | Full-bleed |
| **Loop ending** | Ends on final #1 clip, no designed loop | Same | Same | Same | Same | Same |
| **Reuse / originality risk** | High: third-party clips unaltered; one clip is news broadcast footage | High: creator food-reaction clips, likely third-party; sticker art added | High | **Highest**: visible source watermark, 126 s, no transformation beyond ranking rail | High: third-party watermark/credit visible | Likely original/animated source of unknown ownership: unverified |

### 2.2 What the watched sample shows

- 6 of 6 use a **left rank rail with persistent short labels** and a **top title block** that stays for the whole video.
- 5 of 6 have **real action or a title at frame 0**; T4 starts with a blurred crop and no title.
- 4 of 6 count down sequentially; **2 of 6 (T4, T6) use a non-sequential order**. T6 is a Top 3 revealed 2-3-1, so the studio's `reveal_index != rank_position` idea exists in the wild but at tiny n.
- 0 of 6 use an added narrator. Humour comes from source audio plus a 1-3 word label. This is the clearest gap for a narrated comedy format (and a rights/originality advantage), but whether viewers prefer narration is **untested**.
- Moment length ranges ~7-25 s. Videos in the 61-126 s range (T2, T4) have the highest views in this sample, but T4 is 126 s with a visible source watermark, so it is also the most exposed (section 8).
- Only 1 of 6 (T1) has a mid-video subscribe sticker, baked twice, over the source footage. Its effect cannot be read from views.
- The rail label can spoil (T5), and can be unsafe (see thumbnail of [dmtPOXwnNK0](https://www.youtube.com/shorts/dmtPOXwnNK0) in section 3: label words "Fat / Suicide / Ded / Pregnant" on the thumbnail, not watched).

## 3. YouTube Shorts: metadata-only references (not watched)

\*Views as read 2026-10-31 from the YouTube page via yt-dlp (`view_count`), "n/a" = the page did not expose likes. Sorted by views. Link text is the (truncated) page title.

| # | Short | Creator | Posted | Views* | Likes | Len | Subgenre | Status |
|--|--|--|--|--|--|--|--|--|
| Y1 | [Ranking The Funniest Kids Moments Ever (Fu](https://www.youtube.com/shorts/2zTytT1tAYE) | Ranking Friend | 2026-05-22 | 43.6M | 556.3K | 43s | kids/cute | not watched; page metadata (yt-dlp) |
| Y2 | [Ranking Satisfying Chiropractor Moments](https://www.youtube.com/shorts/H5rFQMrSftY) | Polar Ranks | 2026-08-11 | 27.5M | 244.1K | 23s | satisfying | not watched; page metadata (yt-dlp) |
| Y3 | [Ranking Satisfying Biker Moments ...](https://www.youtube.com/shorts/gq7-IKGABMw) | Rankie America | 2026-09-09 | 14.9M | 320.5K | 76s | satisfying | not watched; page metadata (yt-dlp) |
| Y4 | [Ranking Unbelievable Indian Actors Fart Mo](https://www.youtube.com/shorts/2EDrYF_ndR8) | RankMonk | 2026-09-09 | 13.6M | 131.0K | 78s | unbelievable | not watched; page metadata (yt-dlp) |
| Y5 | [Ranking the Funniest Kids Falling Asleep M](https://www.youtube.com/shorts/arf-TQUqHlU) | Topnado | 2026-09-27 | 13.3M | n/a | 32s | kids/cute | not watched; page metadata (yt-dlp) |
| Y6 | [Ranking Unbelievable Calculated Moments](https://www.youtube.com/shorts/wsOYohh101c) | Beeton | 2026-06-07 | 12.5M | 409.2K | 55s | unbelievable | not watched; page metadata (yt-dlp) |
| Y7 | [Ranking Funniest Animal Moments](https://www.youtube.com/shorts/ghJhKtnAa3s) | Rankfloy | 2026-04-08 | 11.7M | 73.3K | 34s | animals | not watched; page metadata (yt-dlp) |
| Y8 | [Ranking Funniest Cat Moments (Part-3) #ran](https://www.youtube.com/shorts/Dv-zv3D3lSA) | Rank Angel | 2026-04-17 | 11.0M | n/a | 33s | animals | not watched; page metadata (yt-dlp) |
| Y9 | [Ranking Funniest Cat Moments](https://www.youtube.com/shorts/dmtPOXwnNK0) | MemeCatLord | 2026-06-17 | 9.6M | 276.5K | 30s | animals | not watched; page metadata (yt-dlp) |
| Y10 | [Ranking Funny Kid Moments](https://www.youtube.com/shorts/jTBogiKvmsI) | The Reddit Rizzler | 2026-08-21 | 8.3M | 42.3K | 21s | kids/cute | not watched; page metadata (yt-dlp) |
| Y11 | [Ranking Funniest Cat Moments (Pt. 4)](https://www.youtube.com/shorts/37q1_yMOBgI) | Your Ranking Dude | 2026-03-22 | 8.2M | 147.5K | 36s | animals | not watched; page metadata (yt-dlp) |
| Y12 | [Ranking Funniest Fails](https://www.youtube.com/shorts/7yX5Mq-wfQU) | Define Ranked | 2025-10-05 | 3.8M | 69.3K | 60s | fails | not watched; page metadata (yt-dlp) |
| Y13 | [Ranking FUNNIEST Animal Moments   (You Won](https://www.youtube.com/shorts/9HUucpn8c2k) | Rankmon | 2026-01-03 | 3.4M | 115.9K | 46s | animals | not watched; page metadata (yt-dlp) |
| Y14 | [Ranking Funniest Kids Moments Ever](https://www.youtube.com/shorts/kv137KEfChk) | Rankify | 2026-07-25 | 3.1M | 21.0K | 30s | kids/cute | not watched; page metadata (yt-dlp) |
| Y15 | [Ranking funniest Cat Moments #hilariousfai](https://www.youtube.com/shorts/Xo2hENdnnrw) | Gnuga24 | 2026-10-23 | 2.7M | 65.2K | 48s | animals | not watched; page metadata (yt-dlp) |
| Y16 | [Ranking UNBELIEVABLE Cam2r Reactions](https://www.youtube.com/shorts/cEvFjqtNggw) | Theo Love Action | 2026-06-05 | 2.1M | 39.2K | 42s | unbelievable | not watched; page metadata (yt-dlp) |
| Y17 | [Ranking Satisfying Construction Moments](https://www.youtube.com/shorts/jZmsMr-WVI8) | Tee Ranks | 2026-10-06 | 859.3K | 8.3K | 25s | satisfying | not watched; page metadata (yt-dlp) |
| Y18 | [Ranking the Worst Fail Moments Ever  #shor](https://www.youtube.com/shorts/MJSa5NzI2fk) | ModernSpaceLab | 2026-09-24 | 67.1K | 199 | 17s | fails | not watched; page metadata (yt-dlp) |
| Y19 | [Ranking Funniest Dog Moments](https://www.youtube.com/shorts/NzF319miTTQ) | RURanking | 2026-09-20 | 33.0K | 1.1K | 24s | animals | not watched; page metadata (yt-dlp) |
| Y20 | [Ranking unbelievable Deep Sea hunting   #r](https://www.youtube.com/shorts/QkUXQ3-hw7w) | Internet Treasure | 2026-07-26 | 30.0K | n/a | 26s | unbelievable | not watched; page metadata (yt-dlp) |
| Y21 | [Ranking Funniest Cat Moments Ever PT14](https://www.youtube.com/shorts/DXVdlTnwSys) | DAILY TOP 5 | 2026-10-14 | 29.5K | 589 | 13s | animals | not watched; page metadata (yt-dlp) |
| Y22 | [Ranking Funniest Football Moments](https://www.youtube.com/shorts/qKOKkPMiLqM) | BluRanking | 2026-08-27 | 28.7K | n/a | 22s | comedy sports | not watched; page metadata (yt-dlp) |
| Y23 | [Ranking The Fastest Reflex Moments](https://www.youtube.com/shorts/LLlJlHAEDOk) | Ani Ranks | 2026-09-15 | 28.1K | n/a | 38s | unbelievable | not watched; page metadata (yt-dlp) |
| Y24 | [Ranking the Funniest Animal Moments  (Wait](https://www.youtube.com/shorts/wYHYXKESC7A) | LeeyonRanks | 2026-10-23 | 27.6K | 472 | 21s | animals | not watched; page metadata (yt-dlp) |
| Y25 | [Ranking Funniest Fail Moments  #funny #hil](https://www.youtube.com/shorts/IIkzoSPIjcU) | Anton_BC | 2026-08-30 | 26.6K | n/a | 36s | fails | not watched; page metadata (yt-dlp) |
| Y26 | [Ranking funniest fail moments](https://www.youtube.com/shorts/1xGheYs4aW8) | Rankinghub | 2026-08-21 | 25.9K | n/a | 23s | fails | not watched; page metadata (yt-dlp) |
| Y27 | [Ranking Funniest Cat Moments](https://www.youtube.com/shorts/ifXkz5rnS-A) | Real Rank | 2026-09-19 | 21.4K | n/a | 49s | animals | not watched; page metadata (yt-dlp) |
| Y28 | [Ranking Funniest Dog Moments  #shorts #fun](https://www.youtube.com/shorts/saJ0ic5S9Kk) | Pique | 2026-10-15 | 17.4K | 301 | 28s | animals | not watched; page metadata (yt-dlp) |
| Y29 | [Ranking Funniest Dog Moments!  | Dogs Doin](https://www.youtube.com/shorts/NFk7JeZ9GzM) | DailyPawzz | 2026-10-11 | 14.0K | 184 | 26s | animals | not watched; page metadata (yt-dlp) |
| Y30 | [Soccer Has Never Been This Funny!  | Ranki](https://www.youtube.com/shorts/LhEIk23QqIo) | Failing Ranks | 2026-08-14 | 5.5K | 67 | 36s | comedy sports | not watched; page metadata (yt-dlp) |
| Y31 | [Ranking Funniest Fails Ever](https://www.youtube.com/shorts/b3gVo6tsbvY) | The Final Five | 2025-12-27 | 4.2K | 42 | 43s | fails | not watched; page metadata (yt-dlp) |
| Y32 | [Ranking Funniest Animals Moments](https://www.youtube.com/shorts/yesXfmdriG4) | TopVerse | 2026-10-24 | 2.6K | 26 | 28s | animals | not watched; page metadata (yt-dlp) |
| Y33 | [Ranking Funniest Fails Ever  #fails #failm](https://www.youtube.com/shorts/4sYH4yivzio) | Caught In Frame | 2026-08-06 | 2.4K | 8 | 21s | fails | not watched; page metadata (yt-dlp) |
| Y34 | [Ranking Funniest Football Moments](https://www.youtube.com/shorts/-CrsAckIWVw) | Trash Tier | 2026-10-27 | 1.8K | n/a | 34s | comedy sports | not watched; page metadata (yt-dlp) |

Aggregate (34 Shorts, metadata only): views min 1.8K, median ~463K, max 43.6M; 16 have >=1M, 16 have <50K. Length min 13 s, median ~32 s, max 78 s. Of the 16 with >=1M views, durations range 21-78 s, of the 16 with <50K views 13-49 s: **length alone does not separate the groups**. Thumbnail inspection (12 of them, montage `thumbs/yt_top.jpg`): the same layout recurs (title at top, 1-8 numeral rail down the left, centred source on blurred fill), some with a teaser such as "(Wait for Last One)". Same-title saturation: "Ranking Funniest Cat Moments" appears from at least 6 channels, "Ranking Funniest Kids Moments" from at least 8.
The owner's reference Short (`-CrsAckIWVw`, Trash Tier, "Ranking Funniest Football Moments", posted 2026-10-27, 34 s) had **1,789 views / 3 comments at read time** (4 days old): it is a layout reference, not evidence of audience success.

## 4. Relation to the earlier football experiment (`docs/RANKING VIDEO.md`)
That build is 2:32 with 20 ranks and ~5-10 s per moment, sourced from TikTok clips (rights: not cleared). The benchmark median is ~32 s and 3-7 ranks. At 20 ranks the rail alone is a different design problem; at >60 s a Content ID claim would block the Short (section 8). It did copy rail, blur fill and label style, consistent with the references.

## 5. Patterns to test (observations, not rules)
1. Persistent left rail with 1-3 word labels, filling as ranks are revealed (6/6).
2. Two-or-more accent colours in the title (5/6 of watched; T2 single colour and still 14.3M views).
3. Title block visible from frame 0 (5/6) while real motion plays.
4. Moment lengths 7-15 s in sequential rankings; 25 s in one non-sequential long video.
5. Countdown is the default (4/6); non-sequential order is rare (2/6).
6. Source audio kept and no narrator (6/6).
7. Blur fill / inset for non-9:16 sources (T5) and black letterbox (T1, T3) coexist.

## 6. Counterexamples and cautions
- T2 has the **plainest title design** (single colour, no bar) and the second-highest views of the watched six (14.3M): design polish is not what explains views here.
- T4 (126 s) and T2/T5 (>60 s) show long ranking videos can get views on TikTok; on YouTube Shorts over 60 s with any active claim are blocked.
- The owner's football reference has 1.8K views, while kids/animals/satisfying Shorts have 10-40M: **subject matter (kids, animals, satisfying) is a stronger candidate explanation than layout**, and the third-party-clip pool is unknowable.
- T5's quoted-joke title ("Kid 3 broke the simulation") breaks the "Ranking funniest X" convention and still got 1.6M.
- Three of the YouTube IDs returned by search were terminated accounts: this format has enforcement risk.
- Labels such as "Fat / Suicide / Ded / Pregnant" (thumbnail only) show the unsafe-label failure mode the studio should refuse.

## 7. Differentiators for viral-rankings (from the gaps above, not copying)
- Original narration/punchline voice per moment (0/6 watched have it).
- Rights-cleared sources only (all watched refs use third-party clips as-is).
- Rail labels never spoil the payoff before it plays (T5 does).
- Non-sequential reveal with consistent rank rail (rare in sample).
- Own title wording, own rail style; not the exact "Ranking Funniest X Moments" template used by dozens of channels.

## 8. Platform rules (retrieved 2026-10-31)

Text below is what the WebFetch extraction of each official page returned; it is quoted from that extraction. Re-read the live page before relying on exact wording for policy decisions.

**YouTube channel monetization policies, reused/inauthentic content** (https://support.google.com/youtube/answer/1311392, retrieved 2026-10-31)
- The page notes a rename on July 15, 2025: "renaming this policy from 'repetitious content' to 'inauthentic content'", with "no change to our reused content policy".
- Not eligible: "Content downloaded or copied from another online source without any substantive modifications" and "Similar or repetitive content with low educational value, commentary, narratives, or minimal variation across videos".
- Avoid content that is "Not be mass-produced, generic, repetitive, or manipulative"; "Generic or repetitive content includes content that looks like it's made with a template".
- "This policy applies even if you have permission from the original creator." A recurring intro/outro is fine when "the bulk of your content is different"; "the substance of each video should be materially varied".
- Implication for us: a fixed ranking template with only the clips swapped is exactly the exposure; narration, original commentary and varied structure are the mitigation.

**Shorts over one minute with copyright claims** (https://support.google.com/youtube/answer/15424877, retrieved 2026-10-31)
- "Any Short that is over one minute in duration with an active copyright claim of any type" (including manual) is blocked worldwide, not playable or recommendable, and can't be monetized; the channel incurs no penalty. Shorts under one minute "face no new restrictions".
- Standard channels: square or vertical videos up to three minutes uploaded on or after October 15, 2024 count as Shorts. Once the claim is resolved the Short becomes viewable again.

**Shorts views vs engaged views** (https://support.google.com/youtube/answer/12220281, retrieved 2026-10-31)
- "views are counted the moment a video starts to play across all formats, including Shorts" (update starting August 24, 2026).
- Engaged views: "How many times viewers stayed to watch past the initial seconds, not including any loops." Shorts version: the percentage that stayed past the initial seconds.
- Earnings are still based on "engaged Shorts views" and "engaged watch hours"; YPP eligibility uses "qualified Shorts views", which the page does not define.
- Implication: compare experiments by engaged-view rate and retention, not raw views; loops do not count as engaged.

## 9. Design hypotheses (each with a measure and what would invalidate it)

Common setup: same clip pool and brand, one variable per pair, Top 3 and Top 5 formats, >= 6 videos per arm before reading anything, posts spread across time slots; use YouTube Studio retention + engaged-view rate + average % viewed (and swipe-away at 3 s) from the Studio analytics pull. Record `experiment_id` in the cut list. n=6 per arm only detects large effects; treat results as directional.

| # | Hypothesis | How to measure | Invalidated if |
|---|---|---|---|
| H1 | Non-sequential reveal (e.g. 2-3-1) holds viewers to the last rank better than a plain countdown | % of viewers reaching the final rank (retention at last-moment start); avg % viewed | Retention to last rank within noise of countdown arm, or drops (viewers confused about rank) |
| H2 | Rail label shown only at/after the payoff beats pre-populated labels that spoil it (T5 shows the punchline word at frame 0) | Retention at the moment start vs end; swipe-away in first 3 s | No difference, or label-first helps (viewers use the labels as a promise) |
| H3 | Title + real action at frame 0 beats a 1 s delayed title (T4 style) | Engaged-view rate, 3 s retention | No difference at equal clip order |
| H4 | 6-10 s moments beat 12-25 s moments for equal total length-in-ranks | Avg % viewed, retention slope within moment | Longer moments hold equally or better (setup needed for the joke) |
| H5 | An original 1-line spoken quip per moment (TTS) increases avg % viewed vs source audio only | Avg % viewed; comment mentions; QA checks that quips never cover source sounds | No lift, or lift disappears when the quip is generic or masks source audio |
| H6 | Two-accent title colouring vs a single colour (T2) | Engaged-view rate; low expected effect | No difference (expected; then pick on brand fit) |
| H7 | A <= 0.8 s mid-video subscribe cue vs no cue | Retention dip at the cue second; subs per 1K views; with no-CTA control | Dip larger than the subscribe gain, or no subscribe lift (default stays off) |
| H8 | Teaser hold line ("Last one is my favorite", "Wait for #1") vs none | % reaching last rank; comments about the last clip | No lift, or "clickbait" complaints/dislikes |
| H9 | Top 3 at 15-25 s vs Top 5 at 30-45 s | Avg % viewed and engaged-view rate per 1K impressions | Top 5 wins on retention-weighted watch time |
| H10 | Blur-fill inset (T5) vs full-bleed crop vs black bars for mixed-ratio sources | Avg % viewed; QA caption-collision count; joke cropped (manual check) | No retention difference (then choose by QA safe-zone results) |
| H11 | Closing on a visual that matches frame 0 (designed loop) raises replays | Views-per-viewer/loops (note engaged views exclude loops, so use total views vs engaged views ratio) | No change in the ratio, or cuts mid-action |
| H12 | A quoted joke title (T5: "Kid 3 broke the simulation. I swear") vs "Ranking Funniest X Moments" | Impressions-to-view ratio and avg % viewed | No difference; or title mismatches content and retention drops |
| H13 | Sub-niche specificity ("Funniest goalkeeper reactions") vs generic ("Funniest football moments") for saturation | Reach per video, comments | Generic wins across at least two pools |

## 10. Shortlist

**ADOPT (supported by 6/6 or by platform rules; low regret)**
- Left rank rail with persistent 1-3 word labels, active rank highlighted; title block at top for the whole video.
- Real action visible at frame 0 with the title over it.
- Source audio preserved, loudness balanced; letterbox or blur fill that never crops the joke.
- Short original labels; credit sources where licence requires; honest titles.
- Keep ranking videos under 60 s by default (Content ID rule applies only above 1 minute).

**REJECT**
- Re-using third-party clips as-is with visible source watermarks or handles (T4, T5), or baking another creator's TikTok UI.
- Labels that spoil the punchline before it plays (as default; H2 will test relaxed versions only on a cleared pool).
- Unsafe or demeaning label text (self-harm, disability, injury jokes).
- A baked subscribe sticker on every video (T1 style).
- Cloning "Ranking Funniest X Moments" template wording and layout 1:1; a template with only clips swapped (inauthentic-content exposure).
- Videos over 60 s with any third-party audio/music until claims are known.

**A/B TEST** (in this order, one variable at a time)
H1 reveal order, H5 narration, H2 label timing, H4 moment length, H7 mid CTA (default off), H8 teaser line, H9 Top 3 vs Top 5, H10 fill mode, H11 loop ending, H12 title phrasing, H3, H6, H13.

## 11. Blockers and next steps
- Need >= 4 more watchable TikTok/Instagram URLs to reach the 8-10 watched target; blocked by TikTok discovery (client-rendered pages, yt-dlp cannot list tags/users, no Instagram URLs found). Owner option: paste 6-10 reel/TikTok links, or connect the laptop Chrome so a scroll of TikTok search can be sampled.
- All YouTube items are metadata-only by rule. If the owner wants watched YouTube references, they would need to approve an exception or supply local files.
- Rights: none of the watched files may enter the media library or a cut list; they stay in `data/cache/research/benchmark/` as `research_only`.
