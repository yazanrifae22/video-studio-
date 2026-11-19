# Review rubric (100 points) — used by Verity (Independent Quality Reviewer)

Judge the **actual final render** (`productions/<id>/v<N>/final.mp4`), never the script or storyboard.
Evidence to inspect: `v<N>/qa/contact.jpg` (1 frame/s), `v<N>/qa/f_*.jpg` (scene midpoints + flagged moments),
`v<N>/qa/qa.json` (automated findings), `v<N>/timeline.json` (scene + SFX timing), `audio/words.json` (word timings, ASR text, WER).
Extract any extra frames you need: `ffmpeg -ss <t> -i final.mp4 -frames:v 1 out.jpg`.

| Category | Pts | What earns full marks |
|---|---|---|
| Hook & audience appeal | 15 | First 2s create curiosity/visual interest; promise is clear; right for the channel's audience |
| Storytelling & clarity | 15 | One idea per beat, clean progression, satisfying payoff, accurate |
| Motion design quality | 20 | Movement carries meaning; easing/anticipation/sequencing; no random filler motion; no template feel |
| Visual composition | 15 | Hierarchy, readable type (≥ ~40px at 1080w for key text), nothing clipped/overlapping, safe zones respected |
| Audio & narration | 10 | Natural voice, no clipping, music under voice, SFX on meaningful actions only |
| Pacing & engagement | 10 | No dead air, no static stretches, scenes change ≤ every ~6–8s in Shorts |
| Caption accuracy & timing | 5 | Words match speech, appear on time, readable, not covering key visuals |
| Technical correctness | 5 | From automated QA (resolution, loudness −14±2 LUFS, TP < −1, duration) |
| Originality & policy | 5 | **New vs every earlier video on the channel** (topic, script, hook, structure: see `qa.json → novelty` or `npm run -s cli -- novelty <id>`); original assets, rights logged, kids-safety and synthetic-media rules met |

**Originality is a gate.** A duplicate topic or ≥ 35% reused script is a blocker. A hook or scene structure nearly identical to an earlier video must be raised as an issue even when the video is otherwise good.

**Release bar: ≥ 85/100 AND no blocker.** (Owner briefly set 80 for week 2 on 2026-10-21, then restored 85 the same day; `config/policy.json` → releaseBar.) A high score never overrides a serious defect, factual error, or rights concern.

## Issue format (review.json)
```json
{
  "version": 1, "reviewer": "reviewer",
  "breakdown": {"hook": 13, "story": 13, "motion": 17, "composition": 13, "audio": 8, "pacing": 9, "captions": 5, "technical": 5, "policy": 5},
  "issues": [
    {"t": "00:03", "severity": "major", "category": "motion", "owner": "motion", "msg": "transition feels abrupt — stage cuts before packet lands", "fix": "move scene boundary +0.4s or holdAfter 0.3"}
  ],
  "summary": "one paragraph"
}
```
Severity: **blocker** (cannot ship: wrong facts, rights problem, broken render, unreadable), **major** (clearly hurts retention/clarity), **minor** (polish).
Owners: `writer`, `motion`, `voice`, `engineer`, or a channel director.
Submit: `npm run cli -- review:submit <videoId> review.json`.

## Kids-specific hard rules (blockers)
No flashing/strobing (> 3 changes/s of high contrast), no scary imagery or sounds, no unsafe behaviour shown approvingly,
gentle volume, pacing a 3-year-old can follow, Made-for-Kids must be set at upload.
