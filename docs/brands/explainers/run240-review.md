# Run240 — independent review brief (Verity)

Read: `CLAUDE.md`, `docs/review-rubric.md`, the last 20 lines of `memory/agents/reviewer.md`,
`research/analytics/2026-10-24-run240-brief.md` (build + CTA rules). Log work with task:start/task:finish.

Review ONLY the real render named by the orchestrator (`productions/<id>/v<N>/`: final.mp4, qa/, words.json,
safezone.json; plus sources.md). Extract your own frames with ffmpeg; Read them. Run `npm run -s cli -- novelty <id>`.

Run240-specific checks (in addition to the rubric):
- **Hook:** full hook text + subject visible on frame 0; first word ≤ 0.3 s; twist by ~2.5 s (a little later is a minor, not a blocker).
- **CTAs:** 2 spoken CTAs placed as the brief says; each on-screen pill is actually in the render, readable, on an empty band,
  never covering the hook/key text/captions, inside x ≤ 940 and above the bottom 20 %. A pill hiding key content = major.
  Missing pills (render without `cta0` in `v<N>/comp/index.html`) = major. A CTA as the final line = major (loop must be last).
- **Loop:** last line hands back to the opening.
- **Length:** 30–40 s target, > 45 s = major.
- **Narration:** if QA WER > 4 %, diff `audio/align.json` `asr_text` against the script word by word. A key term heard
  as a different word (e.g. "peaks" → "peeps") = major (needs a re-voice); numerals/spelling variants are fine.
- **Facts:** every claim matches sources.md (celebrity: ≥ 2 sources per fact; no likeness).

Submit: `npm run -s cli -- review:submit <id> <review.json>` (bar ≥ 85, no blockers). The JSON **must include `"version": <N>`** (the version you reviewed) or it is recorded against v1.
Final message ≤ 80 words: score, verdict, blockers/majors (timestamp + one line each).

**Enhancements v2 (videos whose spec has `"enhancements": "v2"`):** check the comment prompt is a real dilemma/side,
the last line is an open question that loops to the hook, `upload.json` has a `pinnedComment` (≤ 120 chars, either/or
question), and the hook is a contradiction/mid-action. A v2 video missing any of these = major.

**Two independent reviewers per render (owner, 2026-10-25):** every run240 render gets a fresh Verity (this brief, rubric
score → `review:submit`) AND a fresh `engagement-reviewer` (writes `v<N>/engagement-review.json`). The orchestrator approves
only when Verity ≥ 85 with no blockers AND the engagement reviewer says pass.

**Revision cap (orchestrator, 2026-10-25):** at most 3 fix rounds per video. When the two reviewers pull in opposite
directions (e.g. accuracy hedge vs contradiction hook), the orchestrator decides; accuracy always wins over engagement,
and the fix should find a hook that is both true and a contradiction.
