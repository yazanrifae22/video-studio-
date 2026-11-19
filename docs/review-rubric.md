# Independent QA rubric (brief §17)

The reviewer judges the **rendered MP4** (`productions/<id>/v<N>/render.mp4`) through evidence: `qa/techqa.json`,
`qa/contact_sheet.jpg`, `qa/frames/f*.jpg` (1 fps — Read the frames around every cut and caption), `captions.srt`,
`narration.align.json` (WER), the cut list, and the rights records of every source. Never the plan alone.
The builder of a video may not review it (`review:add` enforces this).

## Score (100)
| Key | Criterion | Max |
|---|---|---:|
| hook | Opening hook (first 2 s) | 15 |
| pacing | Pacing and retention potential | 15 |
| story | Story structure and payoff | 15 |
| editing | Editing and visual quality | 15 |
| audio | Audio quality (clarity, balance, no clipping, loudness) | 10 |
| captions | Caption readability, accuracy, timing, safe zones | 10 |
| originality | Original editorial value beyond the footage | 10 |
| format | Format-specific execution (checklists below) | 10 |

**Pass = ≥ 85 and no blockers, AND the YouTube-insights score (`docs/insights-rubric.md`) ≥ 85.** Approval also needs the viral check (`docs/viral-check.md`, `qa/viral.json`) ≥ 75, except Sunny Hill (record only). Blockers regardless of score: unapproved/condition-violating footage, missing attribution,
misleading edit or changed meaning, factual error, broken/clipped audio, technical QA failure that is visible/audible.

## Footage-led scorecard (owner 2026-11-08: videos built from other people's clips)
Applies when `qa/pack.json` says `"scorecard": "footage"` (`config/gates.json` `footage_scorecard`; Podium Pop today). Same 8 keys, same maxima, same 85 bar; scores before 2026-11-08 are not comparable. A clip's being third-party never costs points: judge what we chose and what we did with it.

| Key | What it means here | Max |
|---|---|---:|
| hook | Frame 0 is the action in motion and the first 2 s make you want the #1 | 15 |
| pacing | No dead beat; silent beat after each reveal; the replay earns its time | 15 |
| story | Clear criterion, every rank defensible, escalation, #1 visibly the strongest | 15 |
| editing | OUR edit only: cut points, **whole action inside the box**, zoom, replay, transitions | 15 |
| audio | Mix, voice vs source sound, nothing talking over the key impact | 10 |
| captions | Readable, and every page reads as a phrase on its own | 10 |
| originality | **Selection and commentary:** are these the most impressive clips of the topic, does the narration say something specific to this footage, does a joke land | 10 |
| format | Rating boxes, labels, title and CTA: tidy, readable at 360 px, **clear of the subject** | 10 |

Rules:
- **Whole beats big.** Seeing what happens comes first: heads, feet, bike, board, ball and landing inside the box at the payoff. A subject that is whole but smallish is at most a minor. A subject cut by the box edge at the payoff, or a zoom so tight the viewer can't tell what happened, is a major in `editing`; if the payoff itself can't be seen it is a blocker. Never ask for more zoom unless the action stays whole at the new zoom (name the zoom value and check it against `bursts.jpg`).
- **Overlay on the action.** A caption or rail label covering the subject at the payoff is a blocker; covering it elsewhere is a major. Captions and labels are `format`/`captions`, not `editing`.
- **Source quality is judged once, by cut-judge.** If the entry passed `cut-review.json`, softness, grain or compression that comes from the source costs nothing here. Report it only as a minor note, or as a major if it makes the action unreadable at 360 px (say why the cut-judge pass was wrong).
- **Fragments.** A caption page that doesn't read as a phrase ("NUMBER ONE TWO RISES") is a major in `captions`.
- **No habit ceilings.** Don't hold `originality` at 6-7 by habit: 9-10 is available for a great selection with specific, funny narration.

## Format checklists
- **Ranking:** criteria declared and every rank defensible; each item genuinely strong; no duplicates; engaging order; intro ≤ 3 s; narration adds value; would cutting any section improve it?
- **Clipping:** opening works standalone; meaning preserved; no missing critical context; cuts on word boundaries; beginning–middle–end with payoff; speaker framing correct; translated captions accurate; substantive added context; rights sufficient.
- **Compilation:** coherent theme; each clip adds something new; authentic footage; no repetition; engaging story; original useful narration; consistent levels; smooth transitions; permissions.

## Output (`review:add <file.json>`)
```json
{ "production_id": "…", "version": 1, "reviewer": "qa-director",
  "breakdown": { "hook": 12, "pacing": 13, "story": 12, "editing": 13, "audio": 9, "captions": 8, "originality": 8, "format": 8 },
  "issues": [ { "t": "00:09", "severity": "major", "issue": "Caption covers the rocket", "fix": "move captions to y=22", "owner": "showrunner-planet-extremes" } ],
  "blockers": [], "summary": "One paragraph verdict." }
```
Every issue: timestamp, severity (blocker/major/minor), concrete fix, owner. Never pass a video because a retry limit was reached — escalate.

### Council hook checks (2026-11-03)
Recorded as issues / `blockers` in the same JSON; points, the 85 bar and the output shape are unchanged. Blockers: frame 0 not readable or intriguing at 360 px on mute; `payoff_ts` in `hook.json` not paid in the render; watermark or border on the picture; banned persona pressure line. Majors: no loop flow (last frame/sound into frame 0), no send reason, a missing new question in any 8 s window, a failed yes/no hook test, no sound at 0.0 s. Detail: `.claude/agents/qa-director.md`.

### Story checks (2026-11-08)
Recorded as `story S<n>` issues (major) in the same JSON from the render + `productions/<id>/story.json`; points, the 85 bar and the output shape are unchanged. S1-S10 and anti-patterns: `docs/story-playbook.md`; detail: `.claude/agents/qa-director.md` "Story checks".
