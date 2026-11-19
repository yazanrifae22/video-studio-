# «شو شايف؟» hook intros: categories and test plan (owner, 2026-10-26)

> **Result 2026-11-03 (Studio stayed-to-watch, 37 videos; `data/learning/quiz-ar.json`):** curiosity_tease 61.1% · timer_pressure 60.3% · no hook 59.7% · friend_challenge 57.6% · trick_warning 52.9% · streak_survival 50.2% · score_tracker 49.6% · difficulty_ladder 49.0% · ego_challenge 39.9%.
> Allowed: `curiosity_tease`, `timer_pressure` and `friend_challenge` (57.6% stayed, avg 7.4K views = 2nd best; the 29K video and planes 70.4% use it), all worded about the object on screen. Banned as spoken openers: rule, round-count, score and ego lines (the ego_challenge, difficulty_ladder, score_tracker and streak_survival categories, the channel's worst openings). The ego-toned friend line «جرّب صاحبك.. مين أشطر؟» (40.0%) stays out. Whether to drop the intro scene entirely is an open test that needs owner OK (idea X3).

Every video opens with a ~2 s **spoken motion hook scene** (round type `hook_intro`), before round 1, never as a banner over the puzzle.
Each hook belongs to exactly one **category**, so that views and retention can be compared per category once the week has published.
Within a category every video must look different. Be creative: new motion concept, new art and new wording each time; only the psychological lever stays the same.

## Categories (`hook.category`)
| key | Arabic label | lever | example line (Syrian) |
|---|---|---|---|
| `ego_challenge` | تحدي الذات | ego / pride | «صعب تجيب ٤ من ٤!» |
| `score_tracker` | عداد النقاط | game mechanic, comments | «احسب نقاطك من ٤!» |
| `difficulty_ladder` | تصاعد الصعوبة | progression, stay to the end | «جولة ١ سهلة.. ٤ للأذكيا بس!» |
| `timer_pressure` | ضغط الوقت | urgency | «عندك ٣ ثواني بس!» |
| `curiosity_tease` | فضول ولمحة | open loop, a blurred or partial peek | «في شي مخبّى هون.. شفته؟» |
| `friend_challenge` | تحدّي صاحبك | social, shares | «ابعتها لصاحبك.. مين أسرع؟» |
| `trick_warning` | انتبه فخ | loss aversion; only when a round really has a trap | «انتبه.. في جولة فيها فخ!» |
| `streak_survival` | ولا غلطة | tension, all-or-nothing | «غلطة وحدة.. وخسرت!» |

Rules:
- No fake stats such as «٩٥٪ من الناس».
- No «حدس» claims.
- Never reveal an answer.
- The line must be true for that video.
- Text on screen must be ≥90 px.
- Same Zephyr levantine voice as the main narration.
- The hook line is voiced on its own; the main narration take stays untouched.

## Week assignment (YouTube slots, 2026-10-27 → 11-02), balanced across days and slots
| day | slot 1 | slot 2 | slot 3 | slot 4 |
|---|---|---|---|---|
| 10-27 | x5iz ego_challenge | hrxp score_tracker | li3p difficulty_ladder | 30r2 timer_pressure |
| 10-28 | pywe curiosity_tease | 9lfp friend_challenge | xhao trick_warning | 71z4 streak_survival |
| 10-29 | tp3f friend_challenge | 8vj1 trick_warning | 10qg streak_survival | 5qn3 curiosity_tease |
| 10-30 | e7du ego_challenge | eqw1 curiosity_tease | h10t timer_pressure | kxhi friend_challenge |
| 10-31 | rq64 trick_warning | kyxs streak_survival | zo3f score_tracker | 6go7 difficulty_ladder |
| 11-01 | okt7 timer_pressure | x01z friend_challenge | 8xtx ego_challenge | 5g91 trick_warning |
| 11-02 | 4lys difficulty_ladder | vgbk streak_survival | ice0 curiosity_tease | 86jc score_tracker |

Totals: 4 each for the new four categories and 3 each for the original four. All production ids are `quiz-26102x-<id>` (see data/hooks/quiz-ar.json).
If a category's line would be untrue for a video (for example `trick_warning` with no trap round), the showrunner swaps to the closest true wording inside the same category and notes it.

## Data
`data/hooks/quiz-ar.json` holds one row per video: production, slot, category, variant, line, YouTube id, and views/retention, filled in after publish by `npx tsx scripts/youtube.ts stats quiz-ar`.
The studio dashboard has a "Hooks" panel on the quiz-ar channel that shows views per category.

## Owner 2026-11-08: big hook line (overrides the learned opener ban for bank lines only)
- A big, bold stop-scrolling line from `hook-lines.md` (25 lines, HL01-HL25) is allowed as the hook_intro line: spoken + huge type (`quiz.json` `hook_line`), about the TEST waking the brain, never an insult, never round-count/score/«بس الأذكياء»/«٩٩٪» words. No repeat within 10 videos. Category stays an allowed key (normally `curiosity_tease`).
- **Owner 2026-11-08 (hook source + override of the opening rules):** new quiz-ar videos ALWAYS use a hook line from `docs/brands/quiz-ar/hook-bank-owner.md` (SV Savage / SM Smart / FN Funny / SC Scientific; `quiz.json` `hook_line.id` = that id, onscreen_ar = the bank text; rotate personas, never repeat inside a batch; no promise-the-solution lines on open-ending videos). Owner override of SR1 / persona opening bans (ego, challenge, hurry) for these lines only; banned openers still apply to non-bank lines. Bank lines run ~2.5-4 s (hook_intro cap 4.0 s). HL01-HL32 in hook-lines.md are history / old productions.
- QA2 is unchanged: the hook art is moving by 1.0 s and round 1 starts by ~2.0-2.5 s.
- Measured: growth-director logs `hook_line_id` per video in `hook-log.json`; after 10 videos compare stayed-to-watch with the previous object-command openers (baseline 61.7%, «انتبه.. لا ترمش!» 70.8%) and report to the owner.

## Learned hook rules (data/learning/quiz-ar.json hooks + quiz-ar SR1/SR5, QA1/QA2, 2026-11-03)
- Best openers (stayed %): «انتبه.. لا ترمش!» 70.8 · «يلا! ٣ جولات!» 71.6 (single video, rules-free hook wins) · round 1 live (no hook) 71.4 cherry, 68.1 chocolate.
- Worst: «بتوصل للقمة؟» 37.6 · «٤ جولات.. وصّل للآخر!» 37.6 · «جرّب صاحبك.. مين أشطر؟» 40.0 · «انتبه بندورة دخيلة» 40.3 · «ذاكرتك؟ جرّبها!» 42.2.
- Allowed spoken hooks: a command/question about the object on screen (curiosity_tease, timer_pressure, friend_challenge, visual command). Banned: rule, round-count, score and ego lines (QA1 word list, 0 hits: ٤ جولات، صعب تجيب، كم نقطة، من أربعة، غلطة وحدة). Object moving by 1.0 s (QA2). No pause after reveal 1 (0-6 s window, H5).
- Shuffle never static at frame 0 (quiz-ar SR5). Owner item X3 (drop hook_intro vs visual-command intro; no hook 59.7 vs best intro 61.1) is pending owner OK: keep the 2 s intro until the owner decides.
- Per-category tallies above are confounded with the 40 s 4-round length (n = 2-11 per category).

## Make next (data/learning/quiz-ar.json ideas, 2026-11-03)
- Adopt: X1 hard-but-fair last round every video; C3.16 loop to frame 0; C3.9 replies within 1 h (owner action, never posted by agents).
- SR4 (rule, every video): one debatable-but-fair round per video. Learning X2 tests it on 4 of the next 8; the inconsistency in the record is flagged for the owner.
- Test, 2 of the next 8 unless noted: C3.2 «أي جولة خسرتك؟ اكتب الرقم» replaces the score line; C3.5 owner pins a harder bonus puzzle on 4 videos (owner action); C3.10 hidden 5th thing in the last frame, line «شفت الشي المخبّى؟» (metric APV, comments/1K); C3.12 small corner score tick, no spoken score talk; C3.13 «بدك أصعب؟ اكتب أصعب» alternating with the score line.
- G5/V5: remake the 29K-style 3-round escalation with new art and varied mechanics, never re-upload the same file. V5 template adopted for the next test batch (B&W colour isolation, 3 escalating rounds, round 1 live at 0 s with a ticking bar and «وين الحبة المختلفة؟», score ask over the last reveal, seamless loop) except its 22-24 s length (excluded: SR2/QA3 25-28 s is a must check) and the wording «معك ثانيتين!» (hurry wording aimed at the viewer, persona Never).
- Rejected in the record: C3.3, C3.7, C3.11, C3.15, C3.19, C3.20, C3.23, C3.24.
- QA3 community variant: <= 35 s / 4 rounds, labelled, max 1 in 4 videos.
