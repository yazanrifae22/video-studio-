# Viral Rankings: Comedy Voice System (draft)

Status: draft v0 (2026-10-31, comedy-voice-writer, pilot pass 1). Voice rules live in `BRAND-GUIDE.md` section 2; this doc covers how narration is made, checked and handed to TTS.

## 1. Pipeline
1. **Moment report** (`productions/<id>/moment-report.json`, viral-analyst): exact footage facts, `setup_ms` / `payoff_ms` / `reaction_ms`, source-page facts (`footage_fact_for_writer`), crop and overlay notes.
2. **RankingPlan**: `rank_position` (the opinion) and `reveal_index` (screen order, e.g. 2 -> 3 -> 1). They are separate fields, always.
3. **Writer pass N** (`comedy-voice-writer`, `script/writer-pass-N.json`): >= 3 hooks, >= 3 lines per moment from different angles, <= 2 transition lines per join, a loop outro, silent beats, titles, rail labels, a proposed timeline and the writer's own `recommended_set`. The writer never scores its own lines.
4. **Critic pass N** (`punchline-critic`, `script/critic-pass-N.json`): looks at the frames at each `anchor_ms`, scores every line, selects the best per slot, sends notes with `line_id` + `evidence_ms`.
5. **Rewrite** (writer pass N+1): answers every critic note by id (`responds_to`). Stop when the critic sets `stabilised: true`, normally after <= 2 rewrite rounds.
6. **Lock**: the selected lines go into the cut list (`narration[]`) with their `target_start_ms` / `max_dur_ms`; TTS through `packages/voice` (Gemini, cached); captions are built from the TTS word timings.
7. **QA**: qa-director checks the render. Narration must not cover a payoff marked `silent_beat` or a key source sound, and captions must not collide with the rail/title.

## 2. Contracts

### 2.1 Writer line (`writer-pass-N.json` -> `lines[]`)
| Field | Type | Rule |
|---|---|---|
| `line_id` | string | stable across passes (`h-02`, `m3-02`, `t31-01`, `o-01`, `sb-1`) |
| `moment_id` | string | from the moment report |
| `rank_position` | int | opinion rank (#1 = top) |
| `reveal_index` | int | 1-based screen order |
| `kind` | enum | `hook`, `moment`, `transition`, `outro`, `silent_beat` |
| `spoken_text` | string | empty for `silent_beat`; <= ~2.5 s spoken (about 8 words) |
| `anchor_ms` | int | **source** timestamp the line is written against |
| `target_start_ms` | int | timeline ms in the proposed timeline |
| `max_dur_ms` | int | hard budget for TTS output; voice step re-times or flags overruns |
| `delivery_style` | string | TTS style prompt (short, concrete) |
| `emphasis_words` | string[] | words that get caption accent and TTS stress |
| `joke_rationale` | string | which frame it uses and why it is funny; any fact source |
| `angle` | string | observational, reversal, contrast, playful exaggeration, deadpan, callback, setup |
| `slot` | string | optional; groups alternatives for the same window (`S1`..`S7`) |
| `responds_to` | string[] | pass >= 2: critic note ids this line answers |

Pass-level extras: `ranking_plan`, `proposed_timeline` (segments with src in/out, setup/payoff -> out ms; slots), `recommended_set`, `titles[]` (<= 6 words, `accent_1`, `accent_2`), `rail_labels` (3 per rank, <= 12 chars), `safety_and_fact_checks[]`, `open_for_critic[]`.

### 2.2 Critic output (`critic-pass-N.json`)
As in `.claude/agents/punchline-critic.md`: `{line_id, scores{...}, total, verdict: keep|revise|reject, note, evidence_ms, suggestion}` + `selected{hook, per_moment, transitions}` + `stabilised`.

### 2.3 Hard rules for every line
- Write from what is on screen at `anchor_ms`. Never restate the action; set up, pay off, undercut or call back.
- Transitions must stay true under the actual reveal order. Say "number three", never "the next highest" unless it is. Callbacks to earlier moments are allowed only if that moment was revealed earlier, and are flagged as order-dependent.
- Opinion framing for rankings ("my number one").
- No fake quotes. Quoting the source page (e.g. NOAA wording) is allowed if exact and cited in the rationale. The narrator may read posture; it never puts invented words in the animal's or a person's mouth.
- No clickbait openers ("you won't believe", "get ready for"), no "bro really said", no filler.
- Never joke about injury, disability, illness, age, race, religion, gender, nationality or other protected traits; no humiliation of private people or children.
- No facts beyond footage + source page (no cost, speed, record or "first ever" claims).
- Leave the payoff silent when the picture is funnier (`silent_beat`, typically 0.9-1.2 s; rail label lands there).
- Hooks must work over frame 0 with sound off (title carries it) and with sound on (the line adds a joke, not the title read aloud).
- Outro loops back to frame 0 (benchmark H11).

## 3. Scorecard
The scorecard is owned by **`punchline-critic`** (`.claude/agents/punchline-critic.md`): 10 criteria x 0-10 (specificity_to_footage, comedy, memorability, authenticity, speakability, brevity, brand_fit, advertiser_safety, originality, timing), total /100; outright rejects for cliche, restating, pre-explaining, unverifiable claims, mean targets and reveal-order breaks; < 70 gets a note + direction. The writer does not self-score.

## 4. Example script 1 (deep-sea pilot)
Production `_viral-rankings-pilot`, file `productions/_viral-rankings-pilot/script/writer-pass-1.json` (pass 1, pre-critic; writer's recommended set). TOP 3 "Deep-sea animals, ranked by how unimpressed they are with our robot". Ranks #1 lpww-1 (Muusoctopus, back turned), #2 dc6u-1 (flapjack scoots at the lens), #3 vixe-2 (Graneledone jets off; buffer fg5q-1 sea cucumber lifts off). Reveal 2 -> 3 -> 1. Total ~24.7 s.

Title (pick): **Deep-Sea Animals RATE Our ROBOT** (RATE yellow, ROBOT red). Rail: #1 "Back turned", #2 "Came to talk", #3 "Rage quit".

| Out ms | Moment (src ms) | Kind | Line |
|---|---|---|---|
| 0-2300 | #2 dc6u (54300) | hook | "This little pancake? Only my number two." |
| 3200-5100 | #2 dc6u (57800) | moment | "Those aren't ears. That's attitude." |
| 7200-8200 | #2 dc6u (61500, fills lens) | silent_beat | rail #2 lands |
| 8250-10450 | #3 vixe (23600) | transition | "Some leave a review. Number three just leaves." |
| 11700-12700 | #3 vixe (27000, jets off) | silent_beat | rail #3 lands |
| 12900-15200 | #3 vixe (28200) | moment | "That's not swimming. That's a resignation letter." |
| 15800-17600 | #1 lpww (30100) | transition | "My number one didn't even bother leaving." |
| 19900-20800 | #1 lpww (34200, hunches, back turned) | silent_beat | rail #1 lands |
| 20900-22700 | #1 lpww (35200) | moment | "Leaving takes effort. Ignoring us is free." |
| 22900-24600 | #1 lpww (37200) | outro (loop) | "Fine. Robot, go try the pancake again." |

Why it works (hypothesis, not proof): the hook names frame 0 and promises a ruder #1; each join escalates by doing *less* (complain -> leave -> can't be bothered to leave); the three payoffs are silent; the outro sends the viewer back to the frame the video loops into. Order-dependent callbacks are marked in the JSON so a reveal change triggers a rewrite. Critic results and the locked set will be added here after the critic pass.

## 4b. Example script 1 (final)
Production `_viral-rankings-pilot`, file `productions/_viral-rankings-pilot/script/writer-pass-2.json` (`final_candidate`), after critic pass 1. Reveal 2 -> 3 -> 1, total ~24.5 s, 42 spoken words (~16 s), three bed-only silent payoffs.

Title: **Who's Most UNIMPRESSED By Our ROBOT?** (nature preset: UNIMPRESSED mint, ROBOT orange). Rail: #1 "Back turned", #2 "Came to talk", #3 "Rage quit".
Segments: A dc6u src 54.3-62.4 s (out 0-8.1, centre crop) · B vixe src 23.9-30.9 s (out 8.1-15.1, blur-fill) · C lpww src 30.0-39.4 s (out 15.1-24.5, centre-right crop).

| Out ms | Moment (src ms) | Kind | Line |
|---|---|---|---|
| 0-2800 | #2 dc6u (54300) | hook | "This little pancake? Only my number two." |
| 3100-5000 | #2 dc6u (57800) | moment | "Those aren't ears. That's attitude." |
| 7200-8100 | #2 dc6u (61500, fills lens) | silent_beat | rail #2 lands, bed -6 dB |
| 8250-9750 | #3 vixe (24300, lift-off) | transition | "Number three: no comment." |
| 9900-10900 | #3 vixe (25700, torpedo cruise) | silent_beat | rail #3 lands |
| 11050-13350 | #3 vixe (28200) | moment | "Eight arms. Not one waved goodbye." |
| 15250-17650 | #1 lpww (30150) | transition | "My number one didn't even bother leaving." |
| 17900-18900 | #1 lpww (32800, static back) | silent_beat | punch-in 100->115% on mantle, rail #1 slam |
| 19050-21650 | #1 lpww (35200) | moment | "A mile down, to see its back." |
| 21900-24300 | #1 lpww (36800) | outro (loop) | "Fine. Robot, try the pancake again." |

What changed from pass 1 and why: the "review" callback lost its set-up when the hook became h-02, and the vixe lift-off is at out ~8.2-8.6 s, not 11.7 s, so the join is now 4 words that land on the lift-off ("no comment": the ROV camera is the press it is ducking) and work in any order. Quote lines were dropped from the spoken set (only exact, attributed NOAA wording is allowed, e.g. "didn't seem too bothered or impressed", "making a quick getaway"). sb-1 sits on a near-static frame, so the edit supplies the motion (punch-in + card slam). Lines referring to the gripper were removed because the 9:16 centre crop drops it.
