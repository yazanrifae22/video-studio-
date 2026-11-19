# The Way It Was Made — goal 26 (owner, 2026-10-25)

**Goal:** 26 new approved compilations, scheduled **4 per day** from the day they are approved (target window Oct 25 → Oct 31).
Already scheduled: hubble di5n (Oct 25 23:00), saturn V isrb (Oct 26 23:00) → Oct 25 and Oct 26 need 3 more each, Oct 27–31 need 4 each = 26.
Each video carries a **unique call to action** that varies in wording, ask type **and position** (start / middle / end) so we can learn
what moves viewers on this channel.

## Flow (same production loop as CLAUDE.md)
Showrunner `showrunner-way-it-was-made` (sonnet, fresh per batch of 4) → idea → sources + `rights:set` ("proposed by <tag>") → analyze → candidates
→ script + cut list (+ CTA from the matrix) → `build <id> --agent <tag>` → techqa → own frame check → stage `qa`
→ qa-director (rubric, lean) + rights-scout (countersign new sources) → fixes → approve at ≥ 85, no blockers, all sources countersigned.
One render at a time (DB render lock). Delete nothing. Stop if C: < 12 GB.

| Lane | Topic lane | Rights path |
|---|---|---|
| A — Space hardware | How NASA built it: rockets, capsules, rovers, suits, telescopes, launch pads, test stands (no repeat of Shuttle last launch / Hubble / Saturn V) | images.nasa.gov NASA-produced items only (no network TV, no contractor/co-produced reels, no CIRA) |
| B — 20th-century build | Dams, bridges, factories, cars, aircraft, everyday industry (seed ideas: Hoover Dam, Golden Gate, 1950 car, tires 1930s, 1960s computer room, jobs that vanished) | Prelinger items **with explicit PD/CC licence**, National Archives (federal works), NASA aeronautics. Strip archive audio. |

**Narration required** (batch-1 lesson: text-led renders cap at ~80 QA): `narration` voice Charon ≤ 2.6 words/s, `captions: "narration"`, no AI-generation text in the description (owner rule 2026-10-28; the uploader sets the platform altered-content flag). Chips ≤ 2 lines, ≤ ~4 s.
Rights lesson: 1930s corporate/sponsored films (Jam Handy, Six Companies co-productions) stay pending — use federal films (Reclamation, Interior, NARA federal, NASA). Attribution URLs = the source's real `original_url`.
Length 30–45 s (hard max 55 s). Retention habits from Mission Voices apply: frame-0 text hook (≤ 6 words), visual change every 3–4 s,
payoff by ~70 %, end that loops into the opening, no dead tail.

## CTA rule
- Cut list text `{ "role": "cta", "text": "…", "at": <s>, "dur": <s> }` (red card, top band; no other top-band card while it shows).
  - **S (start):** right after the hook card, `at` ≈ 2.5–4 s, `dur` 2.0 s. Never before the hook; never covers the main subject.
  - **M (middle):** at a chapter/scene break between 40–60 % of the runtime, `dur` 2.5 s, never on a payoff/reveal.
  - **E (end):** last 3 s after the final payoff line, `dur` 3.0 s.
  - **Owner 2026-11-08 (O-B2):** the CTA position is chosen AFTER the peak is marked, only when the council rule (unused position not within 1.5 s of the peak / `payoff_ts` ± 0.3 s) has no free position left; then the position may move off the family default to clear the peak.
- `script.json` gets `"cta": { "id": "C07", "family": "save", "placement": "S", "text": "…", "at": 3.0 }` and the description's **first line** repeats the ask.
- Text ≤ 40 chars, no emoji, never untrue (e.g. a "guess" question must be answered in the video). Topic tailoring allowed inside the family; each text stays unique.
- Log `productions/<id>/enhancements.json` (`ruleset: "twiwm-cta-v1"`, duration, shots, hook, cta, loop; `results: null` filled later from YouTube Studio).

Research basis (2026-10-25): the common advice is an end CTA after the payoff (a start CTA risks the swipe, a mid CTA can break flow); keep the card high and central
(the Shorts UI covers the bottom/right edge); ask questions that invite comments. Vendor uplift figures are unverified — that is why we test placement ourselves.

| id | family | place | text (default) |
|---|---|---|---|
| C01 | subscribe | E | Subscribe for more build stories |
| C02 | like | M | Like if you'd have worked here |
| C03 | comment-opinion | E | Hardest part to build? Comment |
| C04 | subscribe | S | New build story daily. Subscribe |
| C05 | share | M | Send this to an engineer you know |
| C06 | comment-request | E | What should we build next? Comment |
| C07 | save | S | Save this. You'll want it twice |
| C08 | follow-series | M | 4 build stories a day. Follow along |
| C09 | like | E | Like if this blew your mind |
| C10 | subscribe | M | Enjoying it? Tap subscribe |
| C11 | comment-guess | S | Guess how long it took. Comment |
| C12 | share | E | Share with someone who builds things |
| C13 | save | M | Save this for later |
| C14 | comment-request | S | Comment a machine you want next |
| C15 | follow-series | E | Next build drops in hours. Follow |
| C16 | like | S | Like if you love real NASA footage |
| C17 | subscribe | E | Subscribe. More from the archives |
| C18 | comment-yesno | M | Would you trust this? Yes or no |
| C19 | share | S | Send this to a history fan |
| C20 | save | E | Save it for your next trivia night |
| C21 | comment-request | M | Which build next? Tell us below |
| C22 | like | M | Don't forget to hit like |
| C23 | subscribe | S | Don't forget to subscribe |
| C24 | comment-opinion | E | Best shot in this one? Comment |
| C25 | follow-series | M | Follow. Another build tomorrow |
| C26 | share | S | Send this to someone curious |

| C37 | save | M | Save this for your next space quiz (comp-261104-3tdo, M at 13.3 s) |
| C39 | like | E | Like for more Saturn V film (comp-261104-ds7x, E at 22.0 s; was C37, moved 2026-11-04 because 3tdo already holds C37) |

Balance: S 8 · M 9 · E 9; subscribe 5, like 4, share 4, comment 7 (opinion/guess/yes-no/request), save 3, follow 3.

## Batches (ids assigned per lane; a rejected video's CTA moves to the next batch)
| Batch | Lane A | Lane B | Status |
|---|---|---|---|
| 1 | C01 C04 C07 C10 — 8dx7 ycyz zpls afhp **approved + scheduled** | C02 C05 C08 C11 — 80rn vspv hgca 6agd **approved + scheduled** | done |
| 2 | C13 C16 C19 C22 — a44q bmmo **scheduled**, 0lsr 0azn **approved** | C14 C17 C20 C23 — 5cwx 1z3o q2q6 jcd1 **approved** | done |
| 3 | C25 C03 C09 C15 C21 — 1rv2 03qh dtfr j1nd cmxx **approved** | C26 C06 C12 C18 C24 — jvpk q7zw 28st bugq z4pf **approved** | done |

**All 26 approved 2026-10-25.** 10 scheduled on YouTube; 16 wait on the channel's 24 h upload cap (hourly retry → data/logs/yt-retry.log); plan slots run to 2026-11-01.

## Scheduling
Cadence 4/day **11:00, 15:00, 19:00, 23:00** (owner's local time; `scripts/publish-plan.py`). Approve → `python scripts/publish-plan.py --start <today>`
→ `npx tsx scripts/youtube.ts upload compilations` (**owner standing OK 2026-10-25** for every goal-26 approval) → `python scripts/yt-refresh-published.py`. Slots that have passed are skipped,
so the window slides if approvals land late. YouTube: no Shorts publish cap; API upload quota is per Google project and shared with the other
channels — the uploader stops cleanly at the cap and resumes next day (schedule times are set by publishAt, so uploads only need to beat the slot).

## Measurement (7 days after each publish)
Views, stayed-vs-swiped, avg % viewed, subs gained, likes, comments, shares, saves → per 1k views; compare by placement (S/M/E) and by family.
