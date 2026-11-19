# Frame-check fixes: rules for every view engineer (2026-11-15)

## How to work
- Views own camera, framing and tag layout; the model (`packages/test3d/web/parable/show.js`) says what is on screen. Read `docs/brands/test-3d/fair-game/STATE.md` first (contract, helpers, tools). Do NOT edit show.js, long.ts or another look's view file. If an item can only be fixed in the model, leave it and report it.
- Check without a build: the real voice timing is in `productions/<id>/draft/score.json`.
  `python docs/brands/test-3d/fair-game/motion-strip.py <id> draft <line id | t0,t1> --n 12 --out <name>` prints the path of a sheet of stills; `npx tsx packages/test3d/src/cli.ts snap <id> --times a,b,c --version draft --width 960 --agent orchestrator` gives single stills. Times in your list are from the final render and equal the draft times.
  Look at sheets with the Read tool, at most 14 image reads in total: one sheet per item (or per neighbouring group) AFTER your fix; before the fix only when the cause is unclear.
- Rules every frame must meet: no tag or leader line on a face, a hat or the main subject; no two texts touching; no head, hat, tower top or text cut by the frame edge unless the script says the tower leaves the frame; texts readable on a phone; captions (lower third, 74-88 % of the height) stay free.
- Prefer general rules in the layout / camera code over one-off numbers for a single line; a fix must not break the same shot type elsewhere. After your changes look at the sheets of two unrelated lines of your choice as a regression check.
- Use `python`, never `python3`; open files with encoding="utf8". Run from E:/clips-viral. No build, no render, no commit.

## Shared changes already made (verify they look right in your look)
1. The closing text "WHICH ONE ARE YOU?" now sits at the TOP of the frame in every look (film.json `end_text_y: -37.5`, about 2-23 % of the height, from the word "which" in l65 to the end, including 3 s after the last word). The line-up of the four hats (+ Skeptic) and its four name tags must stay fully clear of it and of each other for the whole hold; all four names readable, no name on another name, no pawn or head cropped. Before the camera reaches the line-up, the text must not sit on a face or on the hat pawns.
2. l04: each name tag ("THE SCHOLAR" ...) now stays until the next name is spoken, so for about 1.5 s a pawn carries its name and its advantage tag: both must be readable and tidy.
3. l11a-l11d name tags now end 0.3 s into l12 (before the pull-back).
4. Two model engineers changed the picture of l23, l24, l45, l49, l53 and l56 (see the last entries of STATE.md). Check those lines in your look and frame them well.

## Report
Reply in at most 20 lines: per item fixed / not real (why) / left (why); files changed; chapters whose picture changed (c01..c10); anything for the model.
