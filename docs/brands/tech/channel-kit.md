# Tech Made Simple: channel setup kit (copy-paste)

Prepared 2026-10-21 by Atlas (growth). Every value below is ready to paste into YouTube Studio. Brand files are in this folder.
Sources for the YouTube rules quoted here are at the bottom (accessed 2026-10-21).

## 1. Identity

| Field | Value |
|---|---|
| Channel name | `Tech Made Simple` |
| Handle (first choice) | `@TechMadeSimpleAnimated` (current value in the studio DB `channels.handle`) |
| Fallback handle 1 | `@TechMadeSimpleHQ` (the original seed value) |
| Fallback handle 2 | `@TechMadeSimple.Explained` |
| Fallback handle 3 | `@TMS_Explainers` |

YouTube handle rules: 3–30 characters; letters, numbers, underscores, hyphens and periods; no separator at the start or end; case-insensitive.
**If you end up with a different handle, update the DB:** the studio prints it in kit metadata (`channels.handle`).

## 2. Description (About), 701 characters (limit used: ≤ 1000)

```
Short animated explainers about how software and AI actually work. APIs, webhooks, auth, caching, rate limits, system design and the inside of AI models, each told with one clear picture in under a minute (plus the occasional longer deep dive).

Made for self-taught developers, product managers and career-switchers who never studied computer science and want the mechanism, not the buzzwords.

How we make these videos: the narration is an AI-generated voice reading a script we research and fact-check. The visuals are original animation made in our own studio. Sources for every factual claim are listed in each video's description. Spotted a mistake? Tell us in the comments and we'll correct it.
```

## 3. Channel keywords

```
software explained, programming concepts, how APIs work, webhooks, system design, AI explained, LLM explained, backend development, web development, computer science basics, tech explainers, animated explainers
```
(YouTube Studio → Settings → Channel → Basic info → Keywords; the menu path may change.)

## 4. Basic settings

| Setting | Value |
|---|---|
| Country of residence | The owner's real country of residence (the studio runs on Asia/Amman time, so presumably **Jordan**; confirm). This must be accurate. |
| Channel audience | **No, set this channel as not made for kids** |
| Default video language | English |

## 5. Upload defaults (Settings → Upload defaults)

| Setting | Value |
|---|---|
| Visibility | Private (the studio schedules each video individually; never default to Public) |
| Category | Science & Technology |
| Video language / title & description language | English |
| License | Standard YouTube License |
| Allow embedding | On |
| Tags | leave empty (each video has its own tags in its kit `metadata.txt`) |
| Description template | leave empty. The studio adds the disclosure line to every description: `Narration is AI-generated (synthetic voice). Visuals are original animation.` |
| Comments | On, "Hold potentially inappropriate comments for review" |

**Per video (not a channel default):**
- **Altered or synthetic content → Yes.** YouTube requires disclosure for realistic AI content and says fully animated, non-realistic content usually doesn't need it. Our narration is a realistic synthetic human voice, so the studio deliberately discloses on every upload. The API sets `containsSyntheticMedia=true` and the kit `metadata.txt` says "Yes". YouTube states that disclosure alone doesn't limit a video's audience.
- **Audience → "No, it's not made for kids".**

## 6. Playlists (create these; video ids are studio ids)

| Playlist | Videos in publish order |
|---|---|
| **AI, Explained Simply** | `tech-why-ai-can-t-count-the-r-s-in-strawberry-716a` · `tech-how-ai-answers-from-your-pdf-rag-explain-b0a4` · `tech-what-is-an-ai-agent-really-it-s-just-a-l-605f` · `tech-why-ai-forgets-the-start-of-long-chats-c-9f24` · `tech-how-chatgpt-writes-one-word-at-a-time-ll-a9a2` |
| **APIs & Backend in 60 Seconds** | `tech-webhooks-in-45-seconds-stop-asking-get-t-e56a` · `tech-rest-vs-graphql-vs-grpc-finally-explaine-9767` · `tech-rate-limiting-the-token-bucket-in-45-sec-6307` · `tech-why-the-second-load-is-instant-caching-i-7143` · `tech-why-double-clicking-pay-doesn-t-charge-y-7311` · `tech-api-gateway-vs-load-balancer-vs-reverse--3c6c` · `tech-your-jwt-is-not-encrypted-anyone-can-rea-dcd6` |
| **When Software Breaks** | `tech-the-hour-that-happens-twice-why-clock-ch-d84a` · `tech-one-empty-dns-record-took-down-thousands-7d35` |
| **Deep Dives (long-form)** | `tech-rest-vs-graphql-vs-grpc-finally-explaine-9767` · `tech-how-chatgpt-writes-one-word-at-a-time-ll-a9a2` |

Playlist descriptions (one line each, honest):
- AI, Explained Simply: `What actually happens inside AI tools, one mechanism per video.`
- APIs & Backend in 60 Seconds: `The building blocks behind every app: APIs, caching, rate limits, auth.`
- When Software Breaks: `Real bugs and outages, and the engineering lesson in each.`
- Deep Dives: `Longer explainers that go one level deeper.`

Add each video to its playlist after it's uploaded. A playlist with no public videos stays empty for viewers.

## 7. Links

None yet. Leave the Links section blank. Don't add placeholder links.

## 8. Brand files (YouTube Studio → Customization → Profile)

| Slot | File | Spec check |
|---|---|---|
| Picture | `channels/tech/brand/avatar.png` | 800×800 PNG, 130 KB. YouTube allows up to 15 MB and renders it at 98×98, shown as a circle. The mark sits inside the centre 62%. |
| Banner image | `channels/tech/brand/banner.png` | 2560×1440 PNG, 318 KB (6 MB max). All text and the icon sit inside the all-device safe area (centre 1546×423), with ≥ 103 px margin. Measured on the render with `npx tsx packages/video-engine/src/stills.ts check`. |
| Video watermark | `channels/tech/brand/watermark.png` | 150×150 PNG with transparent corners, 14 KB (YouTube needs ≥ 150×150 and < 1 MB). Display time: **End of video**. YouTube shows watermarks in landscape view only, so in practice this affects the long-form videos. |

## Sources (accessed 2026-10-21)
- Branding specs (picture 98×98, ≤ 15 MB; banner min 2048×1152 with a 1235×338 safe area, which at 2560×1440 scales to ~1544×423; ≤ 6 MB; watermark ≥ 150×150, < 1 MB, landscape only, not on made-for-kids videos): https://support.google.com/youtube/answer/2897336
- Handle rules: https://support.google.com/youtube/answer/11585688
- Altered/synthetic content disclosure (what needs it, what doesn't, label placement): https://support.google.com/youtube/answer/14328491
- Channel name, description and links (Customization → Profile; up to 14 links): https://support.google.com/youtube/answer/2972003
