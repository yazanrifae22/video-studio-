# The Moment: channel setup kit (copy-paste)

Prepared 2026-10-21 by Atlas (growth). Every value below is ready to paste into YouTube Studio. Brand files are in this folder.
Sources for the YouTube rules quoted here are at the bottom (accessed 2026-10-21).

## 1. Identity

| Field | Value |
|---|---|
| Channel name | `The Moment` |
| Handle (first choice) | `@TheMomentStories` (studio DB `channels.handle`) |
| Fallback handle 1 | `@TheMomentTold` |
| Fallback handle 2 | `@TheMoment.Stories` |

YouTube handle rules: 3–30 characters; letters, numbers, underscores, hyphens and periods; no separator at the start or end; case-insensitive.
If you end up with a different handle, tell the orchestrator so `channels.handle` gets updated.

## 2. Description (About), 732 characters (limit used: ≤ 1000)

```
The turning points behind famous careers in sport, business and entertainment: the match, the decision or the night that changed everything, told in about a minute (plus longer stories now and then).

How we make these videos: every story is researched from at least two independent sources, and the sources are listed in each video's description. The narration is an AI-generated voice. The visuals are original illustration and animation made in our own studio. We don't use clips, broadcast footage or anyone's likeness or voice.

The Moment is an independent channel. It isn't affiliated with or endorsed by the people, teams or organisations in its videos. Spotted a factual error? Tell us in the comments and we'll correct it.
```

## 3. Channel keywords

```
career turning points, sports stories, football history, Ballon d'Or, NBA history, Formula 1, boxing history, business stories, celebrity biography, pop culture history, animated stories, true stories
```
(YouTube Studio → Settings → Channel → Basic info → Keywords; the menu path may change.)

## 4. Basic settings

| Setting | Value |
|---|---|
| Country of residence | The owner's real country of residence (presumably **Jordan**, since the studio runs on Asia/Amman time; confirm). This must be accurate. |
| Channel audience | **No, set this channel as not made for kids** |
| Default video language | English |

## 5. Upload defaults (Settings → Upload defaults)

| Setting | Value |
|---|---|
| Visibility | Private (the studio schedules each video individually) |
| Category | Entertainment (the studio's API uploads use category 24 Entertainment for this channel) |
| Video language / title & description language | English |
| License | Standard YouTube License |
| Allow embedding | On |
| Tags | leave empty (each video has its own tags in its kit `metadata.txt`) |
| Description template | leave empty. Each video's description already includes the sources, the line `Narration is AI-generated (synthetic voice). Visuals are original animation.`, and (where relevant) the independence note. |
| Comments | On, "Hold potentially inappropriate comments for review" (fan debates about real people can get heated) |

**Per video:**
- **Altered or synthetic content → Yes.** YouTube requires disclosure for realistic AI content, including content that makes a real person appear to say something they didn't. Our narrator is a synthetic voice, not any real person's, and it narrates about real people. Disclosing on every upload removes any doubt. This matches the API flag `containsSyntheticMedia=true`.
- **Audience → "No, it's not made for kids".**
- Never imply endorsement, and never use a celebrity's face as the thumbnail. The studio's thumbnails are typographic.

## 6. Playlists (video ids are studio ids, in publish order)

| Playlist | Videos |
|---|---|
| **Football Moments** | `celebrity-how-the-ballon-d-or-is-actually-decided-9bcf` · `celebrity-messi-vs-ronaldo-20-years-of-rivalry-in--e975` · `celebrity-only-5-players-have-won-3-ballon-d-ors-w-f2b8` · `celebrity-lamine-yamal-fastest-rise-in-football-hi-e208` |
| **Sports Turning Points** | `celebrity-year-24-team-4-lebron-s-career-in-50-sec-d26d` · `celebrity-rays-vs-brewers-baseball-gets-a-brand-ne-e80a` · `celebrity-20-years-old-how-mike-tyson-became-the-y-72fc` · `celebrity-lewis-hamilton-s-ferrari-gamble-explaine-b416` · `celebrity-the-match-that-made-ben-shelton-us-open--b48a` |
| **Screen & Stage** | `celebrity-nathan-fielder-the-strangest-career-in-c-8eac` · `celebrity-the-night-lady-gaga-became-lady-gaga-b28f` · `celebrity-italian-piano-ping-pong-what-timoth-e-ch-c941` |
| **Business Stories (long-form)** | `celebrity-how-elizabeth-holmes-fooled-silicon-vall-c3e8` · `celebrity-the-business-genius-of-dolly-parton-4400` |

Playlist descriptions:
- Football Moments: `The awards, rivalries and breakthroughs that shape modern football.`
- Sports Turning Points: `One match, one decision, one season that changed a career.`
- Screen & Stage: `How performers became who they are.`
- Business Stories: `Longer stories about the business decisions behind famous names.`

## 7. Links

None yet. Leave the Links section blank.

## 8. Brand files (YouTube Studio → Customization → Profile)

| Slot | File | Spec check |
|---|---|---|
| Picture | `channels/celebrity/brand/avatar.png` | 800×800 PNG, 135 KB. Gold "M" in a ring, centred, survives the circle crop. |
| Banner image | `channels/celebrity/brand/banner.png` | 2560×1440 PNG, 282 KB. All text sits inside the 1546×423 safe area, with ≥ 40 px margin (measured: left 130, right 129, top 52, bottom 40). |
| Video watermark | `channels/celebrity/brand/watermark.png` | 150×150 PNG, gold-ringed "M" disc with transparent corners, 14 KB. Display time: **End of video**. YouTube shows watermarks in landscape view only, so in practice this affects the long-form videos. |

## Sources (accessed 2026-10-21)
- Branding specs (picture, banner safe area, watermark ≥ 150×150 < 1 MB, landscape only): https://support.google.com/youtube/answer/2897336
- Handle rules: https://support.google.com/youtube/answer/11585688
- Altered/synthetic content disclosure: https://support.google.com/youtube/answer/14328491
- Channel name, description and links: https://support.google.com/youtube/answer/2972003
