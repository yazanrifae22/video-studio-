# Viral Radar: "what is viral NOW → script idea" (Agent Council 2026-11-08)

Serves `docs/north-star.md`. The radar finds **signals** (something rising, with dated proof), not scripts. A signal becomes an idea only through trend-hunter's gate (lane, rights, footage). We borrow **mechanisms**, never footage, words, voices, characters or sounds.

## 1. Owner and cadence
| When | What | Who |
|---|---|---|
| Daily, before showrunners start (~08:00 local; uploader runs ~10:20) | **Light pass** per active brand: ≤ 8 web calls (WebSearch/WebFetch), ≤ 8 signals, ≤ 3 script ideas, write the day file | trend-hunter (fresh sonnet agent per run) |
| Daily, after the light pass | Top 1-2 ideas per brand → `idea:add` with the radar reference | trend-hunter |
| Monday | **Deep pass**: browser reads that need a login or a visual feed (TikTok Creative Center, YouTube search sorted "this week", Shorts feed sampling, Studio Research/Trends tab), retire stale signals, update `killed.json` and `calendar.json` | browser agent in the **owner's laptop Chrome only** (memory rule; any other browser = stop), owner item O-C1 APPROVED 2026-11-08 (weekly, read-only, laptop Chrome device f5db23ad only, any other browser = stop); read-only, no posting, no downloads |
| Event day (launch, splashdown, big match, viral incident) | **Event pass** within 24-48 h → `fast_lane[]` | trend-hunter, on orchestrator call |
| 24 h and 7 d after publish | Result back into the signal (`status`, `video_id`, `vs_median`) | growth-director |
| Monthly | `research/radar/scorecard.csv` (month, brand, source, signals, ideas, videos, wins ≥ 1.5x median) | growth-director |

- **Active brands:** viral-rankings (Podium Pop), clipping (Mission Voices), compilations (The Way It Was Made), quiz-ar (شو شايف؟), tech, kids. Planet Extremes (rankings) and celebrity are ACTIVE again from 2026-11-08: radar rows allowed; tech is active; none paused.
- **Skip rule:** a brand with runway > 21 days whose last 3 signals went unused drops to the Monday pass only.
- **Token budget:** one search per claim, short excerpts, no page dumps, no re-fetch of known evidence. If a source fails, say so in `sources_failed` and move on.

## 2. Free sources and starter queries (trend-hunter refines from results)
All free. No paid tools. YouTube/TikTok pages are **discovery only**: note title, URL, visible views and date; never download.
- **Everyone:** Google Trends (7 d / 30 d, by country), YouTube search autocomplete, Reddit top-of-day/week, Tubefilter weekly Top 50, news search (last 7 days), our own `data/learning/<brand>.json` and `hook-log.json`. YouTube has no Trending page since July 2025: autocomplete + "sort by this week" replaces it.
- **Podium Pop (football stars + stunts):** YouTube search `messi`, `ronaldo`, `mbappe`, `yamal`, `haaland`, `goal ranked`, `top 5 saves`, `jackie chan stunt`, `stunt shorts` sorted this week (Shorts filter); Reddit r/soccer (video flair), r/Damnthatsinteresting, r/interestingasfuck; Google Trends `<player> goal` 7 d; Premier League / FIFA awards pages (Goal/Player of the Month shortlists = ready debate lists); fixtures and transfer calendar. Real per-video search terms only (learning A3).
- **Mission Voices (human astronaut moments):** NASA newsroom and media advisories; Google News `astronaut interview`, `astronaut says`, `"Artemis II" interview 2026`, `NASA press conference highlights`; Google Trends `Artemis`, `ISS`, `Starship`, `Suni Williams`; Reddit r/space, r/nasa, r/interestingasfuck (the wording people quote); NASA Instagram/X read-only (which moments the crew itself posted). A signal must be a human moment.
- **The Way It Was Made (named hardware):** this channel is search-led. Autocomplete `<machine> how it works`, `how was <machine> built`, `<machine> first test`, `<machine> weight tons`; Google Trends for machine names; anniversaries of launches, first flights, record tests (calendar); our own search-share terms (`space shuttle` 14%).
- **شو شايف؟ (quiz-ar):** browser pass: YouTube Shorts and TikTok search sorted this week for «لغز», «اختبار ذكاء», «اختبار نظر», «الفرق بين الصورتين», «وين الغلط», «خمن», «تحدي», hashtags #اختبار_ذكاء #لغز, Egypt/KSA/Algeria first (our audience: Egypt 48.9%); note first-frame object, time limit, answer position, top-liked comment, what the creator pins. Google Trends «لغز» vs «اختبار» by country. Our own comments (requests, «سهل» share). Internal hit rate per mechanic is the strongest signal (colour-find B&W best).
- **Tech Made Simple (AI/software "Why…"):** Reddit r/ChatGPT, r/LocalLLaMA, r/technology top of day; Hacker News front page; Google Trends `ChatGPT`, `Gemini`, `Claude`, `iPhone battery` rising queries; TechCrunch/Verge headlines; "People also ask" for `why does …`; YouTube search `why does ai` this week. Prefer quirks a viewer can reproduce in 10 s; verify the mechanism on a primary source.
- **Planet Extremes (rankings, revived 2026-11-08):** event feeds first: NHC active storms + best-track reports, USGS "significant earthquakes" feed, Smithsonian GVP weekly volcano report, NOAA SWPC alerts (G4+ storms, aurora), NASA Earth Observatory image of the day; Google Trends `<storm name>`, `earthquake today`, `aurora tonight`, `record heat`; Reddit r/weather, r/Damnthatsinteresting, r/natureismetal. A signal = a named event + a measured number from an agency page (viral_case gate). Fast lane within 24-48 h. Strategy: `docs/brands/rankings/revival-2026-11-08.md`.
- **Moments That Made Them (celebrity, revived 2026-11-08):** Google Trends `<star> record`, `<star> comeback`, award-show and sports calendars (World Cup aftermath, Ballon d'Or, Oscars/Grammys season), Wikipedia "current events" + most-viewed pages of the week, news search "first ever"/"youngest ever" last 7 days, Reddit r/soccer, r/nba, r/popculturechat (wording people quote). Original typography only: borrow the story mechanism, never clips or likeness; every fact ≥ 2 sources. Strategy: `docs/brands/celebrity/revival-2026-11-08.md`.
- **Sunny Hill (kids, Made for Kids):** **search terms only**: autocomplete `… for toddlers`, `… for 2 year olds`, Google Trends parenting/learning terms, Netflix kids top-10 (character trends, patterns only), YouTube Help/Creator Insider Made-for-Kids policy posts, season calendar (back to school, holidays, bedtime). Never hashtags, viral sounds or competitor characters/songs.

## 3. Record: `research/radar/<YYYY-MM-DD>/<brand>.json`
```json
{
  "date": "2026-11-09", "brand": "clipping", "run_by": "trend-hunter", "pass": "light|deep|event",
  "sources_checked": ["gnews", "reddit", "gtrends"], "sources_failed": [{"source": "tiktok_cc", "why": "login"}],
  "signals": [{
    "signal_id": "r-2026-11-09-clipping-01",
    "source": "reddit r/space", "url": "https://...", "title": "what the page calls it",
    "observed_metric": {"metric": "views|upvotes|likes", "value": 123456, "age_days": 6, "per_day": 20576} ,
    "mechanism": "everyday act in zero-g | named-star debate | pop-culture bridge | ...",
    "why_now": "event / release / news date that makes it rise now",
    "expires": "2026-11-23",
    "opening_pattern": "how the first 3 s look and sound (pattern only)",
    "copy_risk_note": "what must differ in our version",
    "status": "new|idea_added|used|killed|expired", "idea_id": null, "video_id": null, "vs_median": null
  }],
  "script_ideas": [{
    "idea": "one line, our title direction", "signal_ids": ["r-2026-11-09-clipping-01"],
    "mechanism_borrowed": "the pattern we take", "our_angle": "different subject/words/footage we use",
    "lane_ok": true, "rights_path": "NASA-produced press-event video on images.nasa.gov (verify)",
    "hook_seed": "frame 0 + first line idea", "story_structure": "brand template from docs/story-playbook.md",
    "est_viral_forecast": 72
  }],
  "fast_lane": [{"idea": "...", "event": "...", "event_date": "...", "must_ship_by": "...", "rights_path": "..."}]
}
```
- Required: everything shown except `opening_pattern`, `copy_risk_note`, `status`, `idea_id`, `video_id`, `vs_median` (recommended).
- `observed_metric` is `null` unless the number was **seen on a page**; write the page URL. Unseen numbers are never estimated, and never go into public copy.
- `est_viral_forecast` is a rough 0-100 guess on `docs/viral-check.md` weights; it never gates anything.
- `expires` defaults to +14 days (+21 for quiz-ar objects, +3 for fast-lane events). Expired signals are re-checked before a showrunner starts their idea.
- Side files: `research/radar/calendar.json` (14-day lookahead: launches, matches, anniversaries, releases, holidays), `research/radar/killed.json` (premise families with 2 misses < 0.7x median, never re-proposed without a new angle), `research/radar/scorecard.csv`.

## 4. How ideas flow
1. **Radar → idea:** trend-hunter runs `idea:add` with `trend_evidence[]` from the signal and writes the sidecar `research/ideas/<idea_id>.json` `{signal_ids | "evergreen: <query> -> <source>", radar_file, mechanism_borrowed, our_angle, copy_risk_note}` (until `idea:add` carries `signal_id`: engineering ask). An idea with neither a signal nor an evergreen demand line is parked.
2. **Showrunner:** reads the latest radar file for its brand before the draft brief; picks a radar idea, a fast-lane item, or a sibling of a winner before a backlog filler. Cites `signal_id` (or `evergreen`) in `brief.json`.
3. **hook-architect:** at least one of the 3 options adapts the signal's `opening_pattern` (`from_radar: <signal_id>`); `title_variants[3]` match real search terms.
4. **story-architect:** names `mechanism_borrowed`, sets `series_tag` and `native_cut`.
5. **script-doctor:** `demand_fit` note (signal ≤ 14 days old or a real evergreen line, script about the same thing); none = forecast ≤ 74.
6. **qa-director:** PKG line (search term in title, cover = frame 0, line 1 ≤ 90 chars) and reads `copy_risk_note`.
7. **growth-director:** logs `signal_id` in the `hook-log.json` row, writes the result back into the signal at 24 h and 7 d.
- **Fast lane (24-48 h events):** keep rights-scout (same-session event lane for NASA-produced media; Podium Pop fast lane), hook-architect, script-doctor and QA; skip persona-keeper. Publishing still needs the owner's OK per post (Podium Pop auto-schedule rule unchanged).

## 5. Anti-copy rules
1. A signal records the **pattern** only (format, opening, structure, packaging). Our idea names a different subject, different words, our own footage and our own voice.
2. If our video, set next to the source, would look like the same video with another narrator, the idea is rejected (`copy_risk_note` is mandatory; rights-scout and qa-director read it).
3. Never import a trending sound: TikTok trending audio is licensed for TikTok business use only. We use our TTS, tone bed and sound mark.
4. No real person's face or voice as a hook without a rights-approved source; astronaut speech stays the speaker's own words.
5. AI-made viral content (e.g. AI star skits) is a mechanism note at most: never copy likenesses.
6. Date honesty: an old clip is never presented as new (the 2021 Suni Williams clip that went viral as "recent" is the warning case).
7. Made for Kids: search terms only; no virality pressure in any kids idea.
8. Podium Pop claim risk is owner-accepted (2026-11-04), but every clip origin goes into `claim_log` so the cost is measured.

## 6. How growth-director closes the loop
- Per video: `vs_median` = views at 7 d / median of the last 8 same-length videos on that channel; also viewed-vs-swiped, comments/1K, shares/1K, impressions at 1 h / 24 h.
- Win ≥ 1.5x → 3 sibling ideas next week (new subject, same mechanism; never a re-upload). Miss < 0.7x twice for one premise family → `killed.json`. (Thresholds are council defaults; owner D-O4 approved 2026-11-08: scale 1.5x, kill 0.7x twice, pause review if the median of the last 10 < 0.5x the previous 10; the pause itself needs owner OK.)
- Monthly scorecard: hit rate per source and per brand; a source with 0 wins after 8 weeks is dropped from the starter list; a source with wins gets more of the daily budget.
- The question the scorecard answers: do radar ideas beat backlog ideas? If not after 2 months (≥ 20 videos per brand), the council revisits this loop.

## 7. First-run acceptance test
Run once for Mission Voices and quiz-ar: pass = ≥ 4 signals each with a dated URL (and `per_day` where a number was seen), ≥ 1 calendar event, ≥ 2 ideas added with a radar reference. Fewer than 2 sources loaded = fix sources before scheduling the daily run.

## v3.1 (2026-11-08) [v3.1]
- `idea:add --radar <signal_id>` stores `radar_signal_id` on the idea; the showrunner copies it into `brief.json`; growth-director closes the loop per signal from the 24 h/72 h/7 d snapshots.
