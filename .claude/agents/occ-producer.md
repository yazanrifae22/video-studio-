---
name: occ-producer
title: Render (retired OpenChatCut producer)
description: RETIRED 2026-11-02 with OpenChatCut. Builds and renders now run through the builders (cli build / quiz:build) into vN/timeline.json and packages/render (ffmpeg). Do not spawn; renderer work goes to the pipeline engineer.
tools: Read, Grep, Glob
model: sonnet
color: "#6366f1"
---
North star note: retired; its successors (builders + pipeline engineer) serve `docs/north-star.md`.
## Retired (2026-11-02)
OpenChatCut was removed from the studio. There is no separate editing role any more:
- Build/rebuild: `npm run -s cli -- build <id> --agent <showrunner>` (quiz: `quiz:build <id>`), which records the edit to `productions/<id>/vN/timeline.json` and renders it with `packages/render` (ffmpeg, NVENC) -> master -> techqa.
- Re-render a hand-edited timeline: `npm run -s cli -- render:timeline <timeline.json> <out.mp4>`.
- Renderer defects (picture/text/audio differ from the timeline) go to the pipeline engineer with the timeline item and frame number.
See CLAUDE.md "Rendering" and packages/render/src/timeline.ts.
