# dev-macro: dev tools for the Macro look (view-macro.js)

- `framing.ts`: projects every shot's Subject (3 times per shot) with the real camera on the v2 score and lists violations of the
  framing rule (subject >= 60 % of the width or of the usable height 6-72 %; whole board >= 65 % of the width; inside the frame).
- `camdbg.ts t1,t2`: shot, subject, focus and camera numbers at given times. `tagdbg.ts t`: focus rects, anchor rects and tag anchors.
- `probe.ts ... --bench t1,t2 --sub 16`: ms per frame. `cpu.ts`, `cpu2.ts`, `gpu.ts`, `cues.ts`: older probes.

## Object layer notes (fix round 1, 2026-11-15) - for the Host look
All additive; `update`, `anchor`, `bounds`, `metres`, `stage`, `posed`, `opts.tags`, `{show}` keep their behaviour.
- `bounds(subject, state)` also returns `pts`: the real extreme points of each piece (and the board footprint, flagged `.foot`).
  `box` is unchanged.
- **Screen pass** (one `K.onFrame` hook registered first in `makeObjects`, runs every sub-frame after the camera is final, so it works
  with any camera, including the Host's): computes per-actor screen rects (`objects.screen.rects`, key `p<id>` / `x<id>` / `sk`), the
  focus rects (`objects.screen.focus`), and FADES every non-focus pawn / tower that is nearer the camera than the focus and overlaps it
  on screen, or is so close to the lens it would be a blur blob. Focus = `state.focus` (model) or, without it, the shot subject for
  kinds player / pair / block / tower / tally / demo / coin. The fade is a per-sub-frame screen-door dither (accumulates to a real
  see-through fade at sub 16; at sub 1-2 it looks grainy); at fade < 0.03 the piece is not drawn at all (no shadow).
  Discs and pawns now carry an `aFade` instance attribute; materials are wrapped by `MP.fadeable`.
- **`objects.avoidRects`**: set it per frame to screen rects `{x0, y0, x1, y1}` (0..1, top left = 0,0), e.g. puppet faces; tags avoid them.
- **Tags** (`macro-tags.js`): laid out in that same hook (not their own); they avoid each other, the counter, their own piece, the focus,
  named / lit pieces and `avoidRects`; spread tags get a leader line with a dot at the anchor; a tag whose piece top is off frame is
  pinned at the frame edge without a leader. Counter / total: one value per output frame (sharp, no motion blur).
- **Dim / lit**: while 1-40 players are lit, every other piece is dimmed by the view too (`a.dimE`); dimmed gold is desaturated.
  Lit squares get a bigger, brighter warm pool; lit pawns a stronger warm self-light.
- Uses the model's `players[i].fallDir`, `show` on moves and extras (1 % slices drawn larger and brighter), flip coin is scaled up on
  screen to >= ~7.5 % of the frame height (`flips[i].userData.s0` = model scale) and has a faint warm self-light.
- Whole-board shots draw tall columns with merged discs (2-3 per instance) to save time.

## Fix round 2 (2026-11-15) - additive, `makeObjects` API unchanged
- New on `objects`: `pairSeg(state)` (l10: a board shot about the flip coin while several pairs play -> the pair in turn, from the
  stake / flip beats; the Macro camera cuts pair to pair, the screen pass uses that pair as a hard focus) and `effKind(state)`.
- `bounds(subject)` on a board subject marks the named pieces' points `.must` (a giant tower, the coin): whole-board fits keep them in frame.
- Role pawns keep their colour when dimmed / broke (dim capped at 0.28 for pawns with a hat); with a hard focus on demo pieces only (l49)
  the 64 players are dimmed. Two flip coins at once: drawn at 0.66 scale and pushed beside (never in front of) a role pawn.
- Fade dither is stratified (per-pixel offset + golden-ratio step per sub-frame): smooth at sub 16, still grainy at sub 1-2.
- 1 % slices in a whole-board shot: brighter, a glow and a faint trail. Row markers (l59): wider than the column, bright, red glow.
- Tags: free-standing (screen) tags avoid every piece on screen; tags keep a wider gap; leader lines avoid crossing; piece tags keep the
  left-to-right order of their anchors; >= 3 name tags on one row of pawns are spread evenly in two staggered rows; more than three equal
  tags on players (l01 '100') are thinned to three, far apart.
- Camera: board shots aim at 84 % board width (`KIND.bw`), lower angles; a free top strip when screen tags / counters are up; pairs from
  above (el 0.62, f 4); cranes back to the board end at <= 0.55 el; pull / push with a `to` frame it by mid-move; drops land early;
  fallen subjects get f 5.6; the sorted row is seen along its length from the rich end and centred left-right.
- `framing.ts` now sets the camera fov from `K.lens.fov` before projecting.
