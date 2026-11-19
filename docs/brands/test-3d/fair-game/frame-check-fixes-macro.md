# Frame-check fixes: MACRO look
Production `expl-261115-c2fy`; files `packages/test3d/web/parable/view-macro.js`, `macro-tags.js`, `macro-props.js`.
Read `frame-check-fixes-common.md` (same folder) first. Raw checker list (unverified): `frame-check-defects.md`, section Macro.
The items below were confirmed by the orchestrator on the frames or are the checkers' majors; verify the ones marked (verify).

1. Closing frame, 10:42-10:53 (l65 + tail): name tags collide ("THE WORKER" printed over "THE SCHOLAR") once the camera pushes in; macro-tags.js pushes the upper name row under the text band. The text is now at the top: `BAND` in macro-tags.js (and the `B.band ? ... 0.43` rule in view-macro.js `solve`) must follow the new text position (text bottom about 23-25 %), and the names row must hold cleanly for the whole push-in and hold.
2. 5:45-6:01 (l38-l40): the Heir's 47-chip column sits at the far left, its top touches / leaves the top edge, the "47" tag is at the edge and the Heir pawn is hidden behind the column.
3. 2:59-3:00 (l22a) and 3:12-3:13 (l22): the Fool's tower top is cropped by the top edge; "90%" touches the tower.
4. 7:06-7:16 (l45a): the 90% tower top is cropped; the "real top 1%" tag lies across the tower.
5. 2:07-2:09 (l15): the Scholar's tower and cap are cut by the top edge.
6. 3:23-3:36 (l24): the top-down board fills about a third of the frame width with empty wood around it (the model engineers added motion to the second half; the top shot itself should use the frame height better).
7. 7:20-7:30 (l46) (verify): tags "UBS" and "year to April 2025" never appear and "91 heirs, $298 billion" shows for 1-2 s only.
8. 7:42-7:49 (l48) (verify): 8 s on the Skeptic alone against a blurred background while the line talks about the pile getting bigger.
9. Tags on subjects (verify, fix by rule): 0:44-0:47 l05 "PICK ONE" / "THE HEIR" on the Heir's crown; 1:12-1:17 l08 "1/5 of the smaller stack" covers the 100-coin pawn; 4:07 l28 "2%" touches the tall tower's hat; 7:32-7:39 l47 "196 self-made" touches the Scholar's cap; 8:16-8:21 l51 "36 under one coin" on the giant tower touching "55 below"; 2:22-2:26 l17 "56%" looks clipped in the corner.
10. After the model change (c08/c09): l49 the hovering coin reads edge-on and small in the demo shot, and the "150" and "-40%" tags sit close together around 7:55; l53 the block camera is high and steep so the four hats look packed together, keep the hovering coin clear of the hats; l56 (one tall tower, one short tower, the middle pile): frame the three as the subject.
11. After the model change (c04/c07): the first shot of l23 (tower hold) frames the whole board far away instead of the tower; l23 then has a new close cut on the king at the landing: check it. l24 now plays two more worlds as time-lapses from "But" and tilts up the winner tower; l45 has new shots (high push while the thin layer gathers, tilt from the small stack up the 1% tower, push on both towers): check the framing of each.
