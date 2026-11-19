# Viral Rankings: analytics and experiments

2026-10-31, `pipeline-engineer` (dashboard task). Companion to master prompt section N, the dashboard views in `apps/studio/public/vr.js` (`#vr/learning`, `#vr/categories`, `#vr/lineage`) and the benchmark `RANKING-REFERENCE-BENCHMARK.md` (platform rules in its section 8, hypotheses in its section 9).
Principle: **unknown is `null`, shown as "unknown", never 0.** Nothing here claims a scheduler exists; every pull is owner-invoked.

## 1. Metrics and where each one comes from

| Metric (column in `category_metrics_snapshots`) | Source today | Notes / limits |
|---|---|---|
| Views (`total_views`, `median_views`) | `scripts/youtube.ts stats <brand>` (Data API `videos.statistics`) and `docs/youtube-intelligence/tools/yt-intel-pull.ts` (Analytics API `views`) | Since 2026-08-24 a view counts when playback starts (benchmark section 8). A raw view is **not** an engaged view. |
| Engaged views (`engaged_views`) | `yt-intel-pull.ts` requests `engagedViews` per period and per video (null + `errors` entry when the API refuses it) | Definition: viewers who stayed past the initial seconds, loops excluded. Earnings use "engaged Shorts views"; YPP uses "qualified Shorts views" (undefined on the help page). Prefer this over views whenever present. |
| Stayed to watch (`stayed_to_watch`) | Studio page only (viewed vs swiped away). Not in the API. | Record as a cited manual snapshot (`source: "studio-page-read"`, provenance = Studio URL + date), never as API coverage. |
| Average view duration / % viewed (`avg_view_duration`, `avg_pct_viewed`) | `youtube.ts stats` and `yt-intel-pull.ts` (`averageViewDuration`, `averageViewPercentage`) | Per video; the category value is the mean over its videos at the same age bucket. |
| Likes, comments, subs per 1k views | `yt-intel-pull.ts` lifetime totals (`likes`, `comments`, `shares`, `subscribersGained`) | Normalised per 1,000 views so videos of different reach compare. |
| Subscriber change | `subscribersGained` (Analytics API) | Channel-level and per-video; attribute only per video, not per category (section 4). |
| Retention curve, first-3-s swipe-away | Studio page only | Needed for H1, H2, H3, H7, H8. Until read manually these hypotheses stay "not measurable". |
| Traffic source, geography | Analytics API dimensions (`country` already used by `youtube.ts analytics` for slot choice) | Only for channels connected through the OAuth tokens in `data/tokens/`. |
| TikTok / Facebook | **Unconnected for viral-rankings.** Facebook page ids exist for the other brands (memory: facebook-pages) but no insights pull is wired. | Label "unconnected"; do not estimate. |
| Ask Studio | Browser read of the owner's logged-in Studio (laptop device only) | **Lowest priority source**: the intelligence audit found mixed windows (first-24h vs lifetime), invented facts and numbers that disagree with the Studio page (`docs/youtube-intelligence/README.md`, executive summary item e). Use only when the Studio page shows the same number, otherwise store as `Ask Studio (unverified)` with `confidence: "low"`. |

Collection rule: `youtube.ts` and `yt-intel-pull.ts` are read-only. The loader that rolls per-video rows into category snapshots does **not exist yet** (gap #30 in `IMPLEMENTATION-GAP-AUDIT.md`: `analytics_snapshots` has 0 rows). Until it is built, real category snapshots are written by hand through `npm run -s cli -- category:snapshot <file.json>` with honest `source`/`provenance`. The dashboard reads `category_metrics_snapshots` only.

## 2. Engaged views versus views

- Rank experiments by engaged-view rate (engaged views / views), average % viewed and retention at fixed points, not by raw views. Raw views are inflated by the start-of-playback rule and cannot separate a strong hook from a weak one.
- Loops are excluded from engaged views, so a loop-friendly ending (H11) shows up as a **higher views-to-engaged-views ratio**, not as more engaged views. Read the pair, never one side.
- A Short over one minute with an active copyright claim is blocked worldwide (benchmark section 8): keep TOP 3/5 under 60 s and record the duration in the snapshot so a drop can be explained.
- Reused/inauthentic content policy applies even with permission: a fixed template with swapped clips is the exposure. Track narration originality and structural variety per video; a retention win from a pure template is not a win to scale.

## 3. Age cohorts

Snapshots carry `age_bucket` (`24h`, `72h`, `7d`, `28d`, `lifetime`), meaning "hours since publish when observed", approximated to the nearest owner-invoked pull.
1. Compare like with like: 24h with 24h, 7d with 7d. The dashboard recommendation uses one chosen bucket and never mixes.
2. Report the sample that reached each bucket. A video 3 days old has no 7d row; the 7d cohort is smaller and is shown with its own n.
3. A 24h value is an early read (views still arriving, retention stabilises later). Flag it; do not act on it alone.
4. Flag a snapshot stale after 14 days; flag n below 6 as directional (benchmark section 9: n=6 per arm only detects large effects).
5. Fixtures (`is_fixture=1`) are invented test data for acceptance test 12. They are labelled TEST FIXTURE everywhere and excluded from real totals and real recommendations.

## 4. Attribution rules

- Performance belongs to the **creative package** (idea, title, rail, narration, order, length), not to a third-party clip. A moment is credited or blamed only when segment-level retention supports it (a visible drop or rise inside that moment's window).
- Category rows aggregate the packages inside the category. One strong video in a category of three is a single observation, shown with n=1 and low confidence.
- Always cite the experiment: put `experiment_id` and the hypothesis id in the production's cut list and in `lessons`/`experiments` tables so each video maps to at most one variable.
- Reuse: a moment's own usage history (`moment_usage`) is shown beside its performance; repeated use of one clip across videos confounds comparisons and triggers the 30-day cooldown in `config/policy.json`.
- Channel baseline = the channel's own comparable videos at the same age. No universal "viral" threshold is used anywhere.

## 5. Revised-recommendation rule (what the Learning view computes)

```
perf        = normalized_perf                      (1.0 = channel baseline at the same age)
              else median_views / peer-category median at that age (needs >= 2 categories)
              else unknown -> no recommendation
damping     = confidence_weight x min(1, sample_size / 6)      confidence_weight: none 0, low 0.25, medium 0.6, high 1.0
new_weight  = 1 + clamp(perf - 1, -0.5, +0.5) x damping        (start weight 1.00; hold if |change| < 0.03)
```
It is a transparent prior update, not a forecast. Low confidence or n below 6 shrinks the move toward zero; unknown stays unknown. Inputs and warnings are printed on each card.

## 6. First eight hypotheses (from benchmark section 9)

Common setup: one variable per pair, same clip pool and brand, at least 6 videos per arm before reading anything, TOP 3 and TOP 5 both, posts spread over time slots. Measure engaged-view rate, average % viewed, Studio retention and swipe-away at 3 s. Record the arm in the cut list (`experiment_id`).

| # | Hypothesis | Primary measure | Invalidated if |
|---|---|---|---|
| H1 | Non-sequential reveal (for example 2, 3, 1) holds viewers to the last rank better than a plain countdown | Share reaching the final rank (retention at last-moment start); avg % viewed | Last-rank retention within noise of the countdown arm, or lower (viewers confused by rank) |
| H2 | Rail label shown only at or after the payoff beats pre-filled labels that spoil it | Retention at moment start vs end; 3 s swipe-away | No difference, or label-first helps (labels used as a promise) |
| H3 | Title plus real action at frame 0 beats a title delayed by 1 s | Engaged-view rate; 3 s retention | No difference at equal clip order |
| H4 | 6 to 10 s moments beat 12 to 25 s moments at equal total length | Avg % viewed; retention slope inside a moment | Longer moments hold equally or better (setup needed for the joke) |
| H5 | One original spoken quip per moment (TTS) lifts avg % viewed over source audio only | Avg % viewed; comment mentions; QA check that quips never mask source sounds | No lift, or the lift disappears when quips are generic or cover source audio |
| H6 | Two-accent title colouring beats a single colour | Engaged-view rate (small effect expected) | No difference (then choose on brand fit) |
| H7 | A cue of at most 0.8 s mid-video to subscribe beats no cue (default stays off) | Retention dip at the cue second; subs per 1k views against a no-CTA control | Dip larger than the subscribe gain, or no subscribe lift |
| H8 | A teaser hold line ("wait for number one") beats none | Share reaching the last rank; comments about the last clip | No lift, or "clickbait" complaints and dislikes |

Not yet scheduled: H9 (TOP 3 vs TOP 5), H10 (fill mode), H11 (designed loop), H12 (title phrasing), H13 (sub-niche specificity). H1, H5, H2 are first in the benchmark's priority order.

Measurability today: H4 and H5 need only average % viewed and duration (API). H1, H2, H3, H7 and H8 need retention curves or the 3 s swipe-away, which are Studio-page reads, so they are blocked until someone records those numbers as cited manual snapshots. H6 needs only engaged-view rate.

## 7. Repeating loop (owner-invoked)

1. Pull: `npx tsx docs/youtube-intelligence/tools/yt-intel-pull.ts <brand>` and, for hook/duration rows, `npx tsx scripts/youtube.ts stats <brand>`; read the Studio page for stayed-to-watch and retention; Ask Studio only as unverified.
2. Write one snapshot row per category and age bucket (`category:snapshot`), with `sample_size`, `confidence`, `source`, `provenance`. Do not overwrite earlier rows: the table is append-only.
3. Open `#vr/learning`, read the revised weights with their warnings, compare the last 4 published videos of each series with their earlier baseline at the same age.
4. Record the lesson and the next experiment (what would invalidate it) in the studio intelligence docs; never rewrite old evidence with a new opinion.
