# Clips Viral Studio

A multi-brand short-form video studio run by Claude agents. Videos are planned and written by
agents, built as plain timelines (`timeline.json`) and rendered with ffmpeg.

This repository holds the **how-to only**: the code, the agent definitions and the playbooks.
It contains no videos, images, audio, production data, databases or keys.

## Where to start

| What | Where |
| --- | --- |
| How the studio works, layout, production loop | `CLAUDE.md` |
| Rules every agent follows | `AGENTS.md` |
| The agents (showrunners, QA, rights, hook, story, …) | `.claude/agents/` |
| Playbooks, rubrics and gates | `docs/` (`hook-playbook.md`, `story-playbook.md`, `review-rubric.md`, `gates.md`, `showrunner-base.md`) |
| Per-brand guides | `docs/brands/<brand>/` |
| Dashboard (site) and API | `apps/studio`, `apps/api` |
| Timeline renderer (ffmpeg compositor) | `packages/render` |
| Builders | `packages/occ` (rankings, clips, compilations), `packages/quiz`, `packages/quizlong`, `packages/quizlab`, `packages/tech`, `packages/kids3d`, `packages/cutout` |
| Queue, CLI, shared DB and schemas | `packages/orchestrator`, `packages/shared` |
| Helper scripts (QA, uploads, checks) | `scripts/` |
| Gates and policy | `config/` |

## How a video is built

1. A showrunner agent drafts the brief; `hook-architect` and `story-architect` design the first 3 seconds and the beat sheet.
2. The script goes through a script round (`script-doctor`, `fresh-eyes`, `audience-panel`) until it passes the gate, then `script:approve`.
3. A builder records the edit into `productions/<id>/vN/timeline.json`.
4. `packages/render` renders the timeline with ffmpeg, the result is loudness-mastered and checked by techqa.
5. Independent reviewers (`qa-director`, `rights-scout`, `frame-text-inspector`) score the render; fixes are batched into one rebuild.

## Running it

```
npm install
npm run api          # dashboard + API on http://127.0.0.1:4320
npm run -s cli -- status
```

Keys are read from a local `secrets/` folder or environment variables (see `packages/shared/src/secrets.ts`).
`secrets/`, token files, media and `data/` are git-ignored and must be supplied locally.
