# test-3d: three-channel visual test (owner request 2026-11-14)

Question: with the same story, which picture style holds viewers best?

## The three arms
| Channel | Handle | Visual | Voice | Production | Render | Length |
|---|---|---|---|---|---|---|
| Salt Parable | @SaltParable | **Macro**: photoreal objects in close-up, no people | Algenib | expl-261114-quwk | `productions/expl-261114-quwk/v9/render.mp4` | 59.4 s |
| Copper Parable | @CopperParable | **Host**: a puppet-style storyteller talks to the camera and handles the board | Achird | expl-261114-jyov | `productions/expl-261114-jyov/v2/render.mp4` | 59.6 s |
| Brass Parable | @BrassParable | **Neon**: glowing line-art on black | Iapetus | expl-261114-6j59 | `productions/expl-261114-6j59/v2/render.mp4` | 61.6 s |

- Same in all three: script (film.json lines), captions style, hook text, end text, music bed, sound-cue vocabulary, mastering (-14 LUFS).
- Different: the picture AND the voice (owner 2026-11-14: one voice per channel). So a difference between channels is the picture + voice package, not the picture alone. To separate them later, rotate the voices across channels on the next scripts.
- Style-to-name assignment was drawn at random. **Channels created 2026-11-15** in the owner's Chrome (owner request), as brand channels on the same Google account as the other studio channels: Salt Parable `@SaltParable`, Copper Parable `@CopperParable`, Brass Parable `@BrassParable`. Channel ids: Salt `UC6Axmks3MUxVg5nQhBwQH1A`, Copper `UCwBRx8KM-9TxJscnSx0z2-Q`, Brass `UCGLESXKMrbRXzMVzJZ7t-Iw`. Picture, banner and description published on all three 2026-11-15 (art in `data/brand/test-3d/channel-art/`, rendered with the test3d kit: the same pawn in salt, copper and brass; description identical on all three). No uploads and no upload token yet. Names and backups: `channel-names.md`.

## Published (owner OK 2026-11-15: "share the three video on the channel on same time i think now its good")
All three uploaded through `scripts/youtube.ts upload <brand>` and scheduled for the same minute: **2026-11-15 01:10 Cairo = 2026-11-14 23:10 UTC**.
| Channel | Brand id | Video | Version | QA (qa-director) |
|---|---|---|---|---|
| Salt Parable (Macro) | parable-salt | https://youtu.be/ToPMdfhP04k | quwk v9 | 84, no blockers |
| Copper Parable (Host) | parable-copper | https://youtu.be/-iPkhqd5Tu8 | jyov v2 | 79, no blockers |
| Brass Parable (Neon) | parable-brass | https://youtu.be/Y6-2LMhVKHo | 6j59 v3 (v2 reviewed; v3 only eases the white-out before the cut to black) | 84, no blockers |
- Approval: owner-set bar in `config/policy.json` approvalMinQa (parable-salt 80, parable-brass 80, parable-copper 75), then the normal decision call with a logged force note (no story / packaging / insights / panel files for this test brand).
- Read the numbers on 2026-11-17 (48 h), 2026-11-22 (7 days) and 2026-12-13 (28 days): `npx tsx scripts/youtube.ts stats <brand>` / `analytics <brand>`.
- Not fixed before publishing (from the QA reviews): soft first 2.5 s and small hook text at 17-23 % height on all three; Macro: king falls with no visible cause, 24 % / 10 % never shown as numbers, music about 20 LU under the voice; Host: hands cut-in 8-12 s without his face, static finger 25-33 s, weak mouth; Neon: rice storm 26-31 s noisy, unreadable 20-digit counters, 16 s finance block with little new picture.

## Video #2: the dollar auction (2026-11-15), first test video through the full workflow v3
One script, three pictures again; this time with brief, hook, story, packaging (86), script round (script-doctor 88 at round 5, fresh-eyes S weak 71, panel S not blocked, fix-ledger) and `script:approve` on all three productions (same script hash; `scripts/parable-sync.py <master> <copper> <brass> [--check]` keeps the three in step, the Salt production owns the script).
Scheduled (owner 2026-11-15: "schedule the approved all the same time") for the same minute: **2026-11-16 17:00 Cairo = 15:00 UTC**.
| Channel | Production | Video | Version | QA r1 -> r2 | Insights | Fresh-eyes V | Panel V |
|---|---|---|---|---|---|---|---|
| Salt Parable (Macro) | expl-261115-5lmc | https://youtu.be/aIhAWg4wkjE | v4, 48.6 s | 84 -> 88 | 86 | weak 72 (no swipe) | not blocked, 1 early swipe |
| Copper Parable (Host) | expl-261115-kqvd | https://youtu.be/dzlhTPqNGOE | v3, 50.1 s | 78 -> 83 | 87 | weak 72 (no swipe) | not blocked, 2 early swipes |
| Brass Parable (Neon) | expl-261115-b9l7 | https://youtu.be/3oEnirZkISE | v4, 49.3 s | 82 -> 85 | 84 | weak 74 (no swipe) | not blocked, 2 early swipes |
- Publish kit (identical on all three, from `packaging.json`): title `A king sold a one dollar coin for over two dollars`; description line 1 `The sunk cost trap in one auction: the loser pays too, so the bids climb past the coin's worth.`; source line `Dollar auction, Martin Shubik, 1971`; `#shorts #sunkcost #psychology #gametheory`. Pinned comment draft (Studio, not set): `What did you keep paying for because you had already paid? Tell us below.`
- Approval: Salt and Copper passed the gate as is; Brass needed a logged force note (insights 84 vs the studio 85; test-brand bar is QA >= 80).
- Round-1 batch applied to all three: two pawn colours with bid tags in the pawn's colour (every reviewer lost track of who was stuck), hook text at 18-38 % of the height and near full size from frame 0 (builder, hook-playbook H3), music bed +4 dB (builder), `$1` on the coin from the first word of l03, bids on the spoken word above their own stack, `$2.05` off the king's cross / the host's face, own picture for "sunk cost", clearer rule shot at l02b.
- Not fixed (accepted): every stranger test stayed "weak" on wording, not picture (rule line fast at 3 s, "sunk cost" only named, the moral said twice at l10-l12, no economist named in the voice, 3.0 words/s against the 2.8 target). Changing words meant three new voice takes; the same items were weighed and rejected in the script round. Picture: end text touches the king's cross for about 1 s (Salt 45.6 s, Brass 46.3 s); Host opening crops his face for the first 2 s to show the coin drop and its bidding-run stacks are still small; Salt l02a shows a dark table edge at 4 s; Brass `$1` flag reads as a column under the left bid tag.
- Voice: three takes (Brass re-rolled once with `film.json` `retake`), each word-checked by Whisper and by a second listener (`packages/test3d/src/ear.ts`). Nobody has watched the three in motion or listened to them.
- Read with video #1: 48 h on 2026-11-18, 7 days on 2026-11-23. Demand note for the comparison: "sunk cost" Shorts reach 120K-1.8M, Shorts labelled "dollar auction" 71-2.1K (search pages, 2026-11-15), so this video is packaged as a story + sunk cost.

## Publish kit of video #1 (identical on all three)
- Title: `One grain of rice vs a king`
- Description:
  `An old chess legend: one grain on the first square, double it on every square after. By the last square the king owes more rice than the world grows in hundreds of years. Your money sits on the same board.`
  `Which square are you on?`
  `#shorts #money #compounding #chess`
- No wording anywhere about how the video was made (studio rule). Not Made for Kids. English.
- Same minute on all three channels, same day. Pick the hour from the audience-time rule once the channels exist (new channels have no audience data: default 15:00 UTC, weekday).

## What to compare (after 48 h, 7 days, 28 days)
Read retention first, because raw views on a brand-new channel are mostly luck:
1. Viewed vs swiped away (%)
2. Average percentage viewed and the retention curve: where each version loses people (expected weak points: Macro 25-26 s pour; Host 8-12 s hands cut-in; Neon 26-31 s rice storm)
3. Likes, comments, shares per 1,000 views
4. Views and subscribers gained (noisy, read last)
One video per channel can be decided by chance. Repeat the same three-way split on 3-5 scripts before changing strategy.

## Needs the owner
- Done 2026-11-15: upload authorisation for the three channels (tokens `data/tokens/parable-*.json`) and the OK to publish.
- Watch and listen to all three once: nobody has seen them in motion or heard the voices; they were checked on frames and numbers only.

## Video #3: first long-form, "A Fair Coin Game Ends With One Winner. Every Time." (16:9, about 10.9 min)
Scheduled (owner 2026-11-16: "schedule them on the three channels") for the same minute: **2026-11-17 17:00 PC local = 15:00 UTC**.

| Channel | Look | Voice | Production | Video |
|---|---|---|---|---|
| Salt Parable | Macro | Algenib | `expl-261115-c2fy` v11 | https://youtu.be/Rk7Z3piDZXg |
| Copper Parable | Host | Achird | `expl-261115-u1h6` v8 | https://youtu.be/hd0_z4Odp74 |
| Brass Parable | Neon | Iapetus | `expl-261115-1yab` v10 | https://youtu.be/W6PzBsI5zrA |

- Same script (round 4, 1,567 words), same title, description, chapters and sources; only picture and voice differ. QA 87 / 87 / 89, insights 86 / 87 / 86.
- Not equal between the arms: custom thumbnails could not be set through the API on any of the three (channels not phone-verified), so YouTube shows an automatic frame until the owner sets `docs/brands/test-3d/fair-game/thumbs/{macro,host,neon}.jpg`. If only some channels get the custom thumbnail, click-through rate is not comparable between looks.
- Read at 48 h (2026-11-19) and 7 days (2026-11-24): click-through rate, share still watching at 0:30 ("Intro"), average view duration, where each look loses people (expected weak spot in all three: the rules, 0:50-1:35), comments per 1,000 views.

