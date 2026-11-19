# Ranking Funniest Football Moments: how this video was made

**Output:** `football20/ranking_football_20.mp4`. Vertical 1080×1920, 30 fps, H.264 + AAC, **2:32**, ~139 MB, loudness −15.5 LUFS.
**Date:** 2026-10-28

---

## 1. The goal

You asked for:
1. A ranking video **in the style of** the reference Short: https://www.youtube.com/shorts/-CrsAckIWVw
2. **20 football moments taken from TikTok** that are **viral** (lots of likes and comments).
3. The **best part of each clip**, joined into **one video**, playing one after another.

---

## 2. Tools used (all free, local)

| Tool | What it did |
|---|---|
| **video-analyze skill** (installed to `~/.claude/skills/video-analyze/`) | Downloaded the reference video and pulled frames from it so I could "watch" it |
| **yt-dlp** | Downloaded videos and read each TikTok's **real like / comment / view counts** |
| **curl_cffi** (installed) | Lets yt-dlp present itself as a real Chrome browser. Without it, TikTok rejects the request |
| **ffmpeg** | Contact sheets, black-bar detection, cutting, compositing, audio levelling, final join |
| **Python + Pillow** | Drew the title bar, the 1–20 ranking list and the big "#N" flash as transparent PNG layers |
| **Web search** | Found TikTok video links (TikTok's own search couldn't be used, see §4) |

No paid APIs. Transcription (OpenAI Whisper) was **not** used. It needs a paid key, and these clips don't depend on speech.

---

## 3. Step 1: Studying the reference video

I ran the skill on the reference Short. It is 34 seconds, 1080×1920, 60 fps. The skill's default only takes a frame every 5 s, which is too sparse for a fast ranking edit. So I also built **1-frame-per-second contact sheets** and read them in order.

**What the format looks like:**
- **Black title bar** at the top: "Ranking **Funniest** / **Football** Moments", with "Funniest" in red/pink, "Football" in cyan and the rest in white, in a bold sans font.
- **The clip fills the area below** the bar.
- **A numbered list down the left edge** (1., 2., 3. …) with the numbers in rotating colours (yellow, red, cyan, white).
- When a clip plays, **its slot gets a short funny label** ("Bro had enough", "Grabbed", "Ouch", "Regretted"…). Earlier labels stay on screen, so the list **fills up** as the video goes on.
- Each clip lasts about **4–6 seconds** and cuts straight to the next. No transitions.
- The clips keep their original on-screen captions ("Bro immediately knew he messed up 😭", "Not once ❌").
- A mix of pro matches, Sunday-league games, fans in the stands and one American-football clip.

I copied all of these in my version.

---

## 4. Step 2: Finding viral TikToks (the hard part)

### What didn't work, and why
| Attempt | Result |
|---|---|
| yt-dlp on TikTok **hashtag pages** (`/tag/footballfunny`) | yt-dlp marks that feature as broken. Failed |
| yt-dlp with **Chrome cookies** | Couldn't copy Chrome's cookie database (Chrome locks it while open) |
| yt-dlp on TikTok **account pages** (@risingballers) | "Unable to extract secondary user ID". Failed |
| Fetching TikTok **discover pages** directly | The page loads, but the videos are filled in by JavaScript afterwards. TikTok also flagged it as a bot (`botType`), detected your region as **EG**, and returned 0 video links |
| **Claude in Chrome** (scroll TikTok in your real browser) | No Chrome browser was connected to this session |

### What worked
1. **Targeted web searches** (about 18, limited to `tiktok.com`) using the topics and accounts that post this kind of content: House of Highlights, Rising Ballers, Overtime/OvertimeFC, ESPN/ESPN FC, 433, Premier League, plus "goalkeeper fail", "penalty fail", "fans stadium", "referee", "kids celebration", "Sunday league". This produced about **45 real video links**.
2. **Real stats for each link from yt-dlp.** After installing `curl_cffi`, yt-dlp could read single TikTok videos. I pulled **likes | comments | views | length | title** for every candidate. I did **not** trust the like counts quoted in search results, because they are scraped and often wrong.
3. **37 candidates had readable stats.** **8** returned *"Your IP address is blocked from accessing this post"*, meaning those videos are geo-blocked in your region. Two of them were big hits (Overtime "Bro not trying to play soccer" ~1M, ESPN concrete-step ~590K) and couldn't be used.

### How the 20 were chosen
Rules, in order:
1. **Must be football** and **funny or unbelievable**. I dropped transfer news, skill tutorials and a fantasy-football punishment clip.
2. **Must be downloadable** from your region.
3. **Ranked by likes**, with comments and views as a sanity check that the clip is really viral and not boosted.
4. **Prefer single moments over compilations.** Where a compilation was big enough to make the cut (#5, #8, #14), I took **only its single best moment**.
5. Dropped near-dead posts (e.g. one with 227 likes) and duplicates of the same moment.

**Rank #1 = most-liked.** The video counts down from #20 to #1, so the biggest clip lands last.

---

## 5. The final 20 (with real stats)

| Rank | Label on screen | Account | Likes | Comments | Views | Source length | Part used |
|---|---|---|---|---|---|---|---|
| 1 | Oscar-worthy dive | @overtimefc | **5.2M** | 71.9K | 29.2M | 9.8s | 0.5–9.8s |
| 2 | Keeper scores from his box | @premierleague | 1.5M | 4.7K | 17.5M | 15.6s | 3.0–8.4s |
| 3 | Penalty on a leash | @risingballers | 1.3M | 6.1K | 44.7M | 59.5s | 0–5s |
| 4 | Wait... I scored? | @espn | 1.0M | 913 | 10.4M | 7.0s | 2–7s |
| 5 | Keeper took the goal | @sailoyoifutangola23 | 881K | 7.4K | 18.7M | 35.2s | 7–13s |
| 6 | What the hell | @espn | 649K | 1.5K | 6.3M | 10.2s | 3–10.2s |
| 7 | Mugged him twice | @risingballers | 647K | 2.3K | 8.3M | 8.2s | 0–8.2s |
| 8 | Shirt? What shirt | @funfootie | 477K | 10.7K | 28.0M | 60.5s | 23–29s |
| 9 | Coach said NO | @risingballers | 405K | 337 | 4.3M | 15.3s | 0–9s |
| 10 | Ball full of sand | @houseofhighlights | 283K | 955 | 4.1M | 29.3s | 19–28s |
| 11 | No PS5 for you | @houseofhighlights | 224K | 985 | 3.0M | 6.6s | 0–6.6s |
| 12 | Teachers no mercy | @risingballers | 217K | 346 | 2.0M | 34.5s | 3–11s |
| 13 | Dog in goal | @espnfc | 201K | 783 | 1.6M | 29.0s | 3–12s |
| 14 | Knee slide fail | @soccermusicatv | 192K | 827 | 4.4M | 60.1s | 7–15s |
| 15 | He's learning | @houseofhighlights | 181K | 604 | 3.4M | 16.8s | 10–16.8s |
| 16 | Palmer vs wrapping | @risingballers | 157K | 336 | 2.2M | 10.0s | 0–8.4s |
| 17 | Bro kept going | @houseofhighlights | 129K | 315 | 2.6M | 8.7s | 0–8.7s |
| 18 | Caught on camera | @espnfc | 113K | 289 | 2.5M | 11.5s | 1–9s |
| 19 | Cartoon fall | @houseofhighlights | 96K | 545 | 1.1M | 14.5s | 0–7s |
| 20 | Their reactions | @houseofhighlights | 92K | 454 | 3.9M | 21.1s | 2–13s |

Full links: `football20/list.txt`.

---

## 6. Step 3: Choosing the best moment in each clip

1. **Downloaded in the best quality available.** The first download picked 576p H.264. I checked the format list and found TikTok also serves **1080p HEVC**, so I downloaded again in the highest resolution. Result: 14 clips at 1080p, 5 at 720p, and 1 square 480×480 compilation (#8).
2. **Made a timestamped contact sheet for each clip:** 2 frames per second for clips under 16 s, 1 per second for longer ones, each stamped with its time (`sheets/NN.jpg`).
3. **Read all 20 sheets** and picked the start/end of the payoff:
   - **Short single-moment clips** (#4, #7, #11, #17…): kept almost all of it, trimming only dead air at the start.
   - **Clips that build up** (#1 dive → stretcher, #9 celebration → coach "Get over here!"): kept the build-up so the punchline makes sense.
   - **Compilations / multi-part clips:** took the single funniest beat:
     - #3: the first penalty attempt where the shooter is yanked back by the rope (0–5 s)
     - #5: the kid physically carrying the goal away from the shot (7–13 s)
     - #8: the defender pulling the shirt all the way off (23–29 s)
     - #10: the kick at the sand-filled ball and the fall (19–28 s)
     - #14: the knee slide that ends in a face-plant (7–15 s)
     - #20: the defender's dramatic fall plus the bench reactions (2–13 s)
4. Target length was **5–10 s per clip**, slightly longer than the reference's ~5 s, because these clips need a little setup to land.

---

## 7. Step 4: Building the video (`football20/build.py`)

Each clip is rendered as its own segment, and then all 20 are joined without re-encoding.

**Per segment:**
1. **Cut** the chosen start→end from the source.
2. **Remove baked-in black bars.** I ran ffmpeg `cropdetect` on all 20 sources. Two had real bars: #1 (`720:842` cropped from 720×1280) and #14 (`720:720`). Those are cropped. #11 also had a top bar, but **I kept it on purpose** because it contains the joke caption ("Told my little brother if he scored this play I'll give him my PS5").
3. **Layout on a 1080×1920 canvas:**
   - Top **250 px black title bar**.
   - Below it, the clip **scaled to fit without cropping**, centred, over a **blurred, darkened copy of itself** filling the edges. This lets square or odd-shaped clips (#8) still fill the frame without stretching.
4. **Overlay layer (Pillow PNG):** the title in Arial Black with the reference colours, and the **list 1–20** down the left. Numbers rotate yellow / red / cyan / white. Every rank already revealed shows its label in white with a black outline, and the **current** rank's label is **yellow**.
5. **Big "#N" flash:** a large Impact-font number in the centre for the first 0.8 s, fading out. This adds a clear, bold beat at each change.
6. **Audio:** original sound kept; converted to stereo 44.1 kHz, **loudness-normalised** (loudnorm, −16 LUFS target) so no clip is suddenly much louder than another, with tiny fades to avoid clicks at the cuts.
7. Encoded H.264 CRF 19 at 30 fps, AAC 192k.

**Join:** the 20 segments are concatenated in order 20 → 1 with `-c copy` and `+faststart`, so the file starts playing straight away on phones.

---

## 8. Step 5: How I checked it

- **Test render first** of 2 segments (#20, and #8 as the trickiest square source). I looked at frames to confirm the layout matched the reference before rendering all 20.
- **After the full render** I pulled a frame from **every one of the 20 segments**, put them on one sheet and looked at it. That's how I found the **black block under #1**, which led to the crop fix and a second render. On the re-check all 20 segments fill the frame properly.
- **Audio check:** whole video measured at **−15.5 LUFS integrated, 9.2 LU range**, which is normal for social media.
- File check: 1080×1920, H.264/AAC, 151.6 s.

---

## 9. Known limits and trade-offs

- **Not all 20 are mega-viral.** Without a browser on TikTok, the pool was limited to what search engines had indexed, and several 1M+ clips were **geo-blocked** in your region. Ranks #1–#9 are strong (405K–5.2M likes). **#15–#20 are 92K–181K.**
- **#6 is American football** (a kid's catching drill). The reference also had one, but it can be swapped.
- **2:32 is long for a Short.** The reference is 34 s. Easy options: top 10 only, or a 3–4 s cut per clip.
- **Source captions sometimes overlap the list** on the left (the reference does this too). I left them in because they're part of the joke.
- **Copyright:** these are other creators' clips. Reposting compilations can get claimed or muted. Credit the accounts in the caption.

---

## 10. How to change it

Everything is in the `CLIPS` table at the top of `football20/build.py`:

```python
#  rank: (source file, start sec, end sec, "label on screen")
1:  ("01", 0.5, 9.8, "Oscar-worthy dive"),
```

- **Re-cut / relabel / reorder:** edit that line, then run `python build.py` in `football20/` (about a minute).
- **Preview one segment:** `python build.py 7`, which writes `build/seg_07.mp4`.
- **Swap a clip:** download it as `src/NN.mp4` with
  `yt-dlp -f "bv*+ba/b" -S "res,br" -o "src/NN.%(ext)s" <tiktok-url>` and point a rank at it.
- **Bigger pool of viral clips:** connect Claude in Chrome (so I can scroll TikTok search sorted by likes) or paste TikTok links. Stats are checked automatically with yt-dlp.

---

## 11. Files

| Path | What |
|---|---|
| `football20/ranking_football_20.mp4` | **Final video** |
| `football20/build.py` | The whole edit as code (clips, cuts, labels, layout) |
| `football20/list.txt` | The 20 TikTok source links |
| `football20/src/` | Downloaded source clips (HD) |
| `football20/sheets/` | Contact sheets used to pick the best moments |
| `football20/build/` | Per-rank segments, overlay PNGs, check images |
