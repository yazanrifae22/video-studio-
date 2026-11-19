# Tiko & Pip: channel setup kit (copy-paste)

Prepared 2026-10-21 by Atlas (growth). Every value below is ready to paste into YouTube Studio. Brand files are in this folder.
Sources for the YouTube rules quoted here are at the bottom (accessed 2026-10-21).

## 1. Identity

| Field | Value |
|---|---|
| Channel name | `Tiko & Pip` |
| Handle (first choice) | `@TikoAndPip` (studio DB `channels.handle`) |
| Fallback handle 1 | `@TikoAndPipKids` |
| Fallback handle 2 | `@TikoPip.Learn` |

YouTube handle rules: 3–30 characters; letters, numbers, underscores, hyphens and periods; no separator at the start or end; case-insensitive.
If you end up with a different handle, tell the orchestrator so `channels.handle` gets updated.

## 2. Description (About), about 650 characters (limit used: ≤ 1000). Owner rule 2026-10-28: no AI-generation wording in any public text (About, descriptions).

```
Tiko the fox cub and Pip the little bird help children aged 2 to 5 learn through short, gentle animated stories: counting, colours, shapes, opposites, feelings and everyday habits like brushing teeth and washing hands.

Made for preschoolers to watch together with a parent or carer. Each episode has one learning goal and ends with a simple activity to try at home.

Our series, Sunny Hill with Tiko & Pip, is original animation made in our own studio. Every episode is checked to be calm: no flashing, nothing scary, soft sounds and a slow pace. Watch them in order in the playlist "Sunny Hill: All Episodes (in order)".

This channel is made for kids.
```

## 3. Channel keywords

```
preschool learning, toddler learning, learning videos for kids, counting for kids, learn colors, learn shapes, opposites for kids, feelings for kids, healthy habits for kids, ABC for kids, cartoons for toddlers, Tiko and Pip
```
(YouTube Studio → Settings → Channel → Basic info → Keywords; the menu path may change.)

## 4. Basic settings

| Setting | Value |
|---|---|
| Country of residence | The owner's real country of residence (presumably **Jordan**, since the studio runs on Asia/Amman time; confirm). This must be accurate. |
| Channel audience | **Yes, set this channel as made for kids.** YouTube says creators everywhere must state whether content is made for kids (COPPA/FTC). This is a preschool channel, so the answer is yes. |
| Default video language | English |

What "made for kids" changes (expected, not a problem). YouTube turns off personalised ads, comments, the notification bell, cards and end screens, save to playlist, miniplayer and the **channel watermark** on made-for-kids content, and on a made-for-kids channel it also turns off posts and memberships.

## 5. Upload defaults (Settings → Upload defaults)

| Setting | Value |
|---|---|
| Visibility | Private (the studio schedules each video individually) |
| Category | Education |
| Video language / title & description language | English |
| License | Standard YouTube License |
| Tags | leave empty (each video has its own tags in its kit `metadata.txt`) |
| Description template | leave empty. Each episode's description comes from `productions/<id>/script.json` (series template: `packages/kids3d/src/series.ts` `seriesDescription`): what the child learns, 2-3 try-at-home ideas, the playlist name, "Made for kids". Never AI-generation wording, never links. |

**Per video:**
- **Audience → "Yes, it's made for kids"** (also forced by the channel setting; the API checks it against `channels.made_for_kids=1`).
- **Altered or synthetic content → Yes**, for the AI narration voice. This matches the API flag `containsSyntheticMedia=true`. YouTube says animated, non-realistic content usually doesn't need a label, but we disclose the synthetic voice to parents anyway.
- Studio policy: no engagement prompts aimed at children (no "like", "comment", bell, link or click asks). One exception (series bible section 5): the fixed, gentle, grown-up-addressed Sunny Hill ask in every episode's ending, after 90 s. `prelint` enforces both.

## 6. Playlists (video ids are studio ids, in publish order)

| Playlist | Videos |
|---|---|
| **Count with Tiko** | `kids-count-10-pumpkins-with-tiko-learn-number-0ba3` · `kids-brush-your-teeth-song-count-1-to-10-brus-c2ea` |
| **Learn Colours** | `kids-pip-s-halloween-costume-colors-not-scary-2fbb` · `kids-learn-colors-with-rainbow-fruit-uh-oh-do-0974` |
| **Shapes & Opposites** | `kids-fast-or-slow-tiko-the-snail-race-opposit-f0b4` · `kids-shapes-hide-and-seek-in-the-park-learn-s-6c03` · `kids-which-one-is-big-elephant-or-mouse-oppos-a69d` |
| **Little Discoveries** | `kids-guess-the-animal-sound-farm-friends-with-5b32` · `kids-sink-or-float-tiko-s-bathtub-science-for-b38e` · `kids-a-is-for-alligator-abc-animals-learn-the-dbfe` |
| **Healthy Habits & Feelings** | `kids-bundle-up-hat-scarf-mittens-boots-clothe-28a7` · `kids-brush-your-teeth-song-count-1-to-10-brus-c2ea` · `kids-happy-sad-surprised-how-does-pip-feel-fe-d83f` · `kids-bedtime-routine-with-tiko-grandma-owl-go-dbe5` · `kids-the-sugar-bugs-run-away-wash-your-hands--1a6c` |
| **Autumn & Halloween (friendly)** | `kids-count-10-pumpkins-with-tiko-learn-number-0ba3` · `kids-pip-s-halloween-costume-colors-not-scary-2fbb` |

Playlist descriptions (parent-facing):
- Count with Tiko: `Count along from 1 to 10 with Tiko and Pip.`
- Learn Colours: `Name the colours with gentle stories.`
- Shapes & Opposites: `Big and small, fast and slow, circles and squares.`
- Little Discoveries: `Animal sounds, sink or float, and the ABC, for curious little ones.`
- Healthy Habits & Feelings: `Brushing, handwashing, getting dressed, bedtime, and naming feelings.`
- Autumn & Halloween: `Cosy, never-scary autumn fun.`

## 7. Links

None. Leave the Links section blank. Studio policy is to keep external links off the kids channel, because the audience is preschoolers.

## 8. Brand files (YouTube Studio → Customization → Profile)

| Slot | File | Spec check |
|---|---|---|
| Picture | `channels/kids/brand/avatar.png` | 800×800 PNG, 105 KB. Tiko, centred. |
| Banner image | `channels/kids/brand/banner.png` | 2560×1440 PNG, 270 KB. Tiko, the title, the tagline and Pip all sit inside the 1546×423 safe area, with ≥ 75 px margin (measured: left 139, right 122, top 105, bottom 75). |
| Video watermark | `channels/kids/brand/watermark.png` | 150×150 PNG. **Optional, don't bother:** YouTube doesn't show watermarks on made-for-kids videos. The file exists only for completeness. |

## Sources (accessed 2026-10-21)
- Branding specs, including "Video watermarks aren't available on videos set as made for kids": https://support.google.com/youtube/answer/2897336
- Audience setting / COPPA requirement: https://support.google.com/youtube/answer/9610285
- Features turned off on made-for-kids content: https://support.google.com/youtube/answer/9632097
- Handle rules: https://support.google.com/youtube/answer/11585688
- Altered/synthetic content disclosure: https://support.google.com/youtube/answer/14328491
- Channel name, description and links: https://support.google.com/youtube/answer/2972003
