# GOLD film: guide for scene authors (c02-c08)

Foundation by the film-foundation engineer, 2026-11-19. You own ONE chapter file; do not edit another chapter, `shared.js`, `film.js`, the kit or the builder.
If a helper in `shared.js` is wrong, tell the orchestrator (or copy it into your chapter file with a note).

## Files
- `film.js` wires `chapters/c00..c08.js` (`export default function (K, F)`); a chapter that throws is skipped and reported in lint.
- `shared.js` = film kit F (read its header: BASE helpers from the GTA 6 film + GOLD makers). `art.js` + `gold.art.js` = SVG art (`ART.name(o) -> [vbW, vbH, body]`).
- Chapter-only drawings go in `chapters/cNN.art.js` (pattern: `gta6/chapters/c04.art.js`), never in `art.js`.
- `c00.js` (cold open) and `c01.js` (piece one) are the reference: one block per line id with a `// lNNN: what happens` comment.
- Stubs c02-c08 only call `F.chapterOpen('cNN')` (flap, mood backdrop, title card, actors reset). Keep that first line.
- Real media: `assets/real/ASSETS.md` (every photo and clip folder, credit keys, lines they fit, wishlist key they replace).

## Helpers (all in F; every maker takes slot, pos, fit, at, out, enter, exit, tilt, idle)
```js
F.photo('ny_fed_building', {slot: F.Z.big, caption: 'cap_ny_fed', at: 'l017', out: 'l020'})   // credit cr_<name> automatic
const tv = F.tv('souk_clip', {slot: F.Z.tvL, at: 'l020', t0: 'l020', out: 'l022', loop: true}); // clip on cardboard TV + credit; tv.g = geometry in px
const path = F.pricePath({slot: F.Z.model}); path.build('l033'); path.cliff('l035'); path.label('jan','l034'); path.token(0, 7, 'l040', 3)
const ss = F.seesaw({slot: F.Z.model}); ss.tilt(-12, 'l044'); ss.coin(0, 'l045')           // gold lump left, bond right; + deg = right end down
F.cubeScale({slot: F.Z.model});  F.loanBar([{key:'gold_100', pct:1}, {key:'loan_75', pct:.75, col:'#E5401D'}], {W:460,H:700,bw:170,gap:60,x0:50,slot}).grow(0, 'l060')
F.priceBoard(['board_title','five_k']);  F.newspaper(key);  F.bear();  F.bull();  F.goldBar();  F.tick();  F.sign(key, {slot, at})
F.stamp(2, 'l032:0.4')   // score-card stamp n (card flies to centre, ~2 s). Stamp lines: c02 l032, c03 l043, c04 l056, c05 l069, c06 l080, c07 l093
F.s('l019', 1, 0.3)      // time inside sentence 2 of a line (EN and AR); prefer K.at(id, fraction) when the sentence count may change
```
`F.Z` = media zones for both layouts: `big top low left right tvL tvR model`. Wide zones are px rects (x 540-1480, y 40-810), tall zones are fractions of the board.
Text pieces: `P.label(key, {size:'s|m|l|xl', stock:'white|yellow|black', ink, tape:true})`, `P.stamp(key, {big:true})`, `P.arrow(fromPt, toPt, {bow: fraction e.g. 0.12})`.

## Look rules settled in c00/c01
- Photos are BIG: wide 560-940 px (`Z.big` 940x770, or `{x:520,y:80,w:560,h:700}` with a model beside it); tall 0.56-0.84 of the board height. Nothing sits on the caption band (wide y > 810, tall y > 1000).
- Real media on at least half of the lines; the same photo may stay 2-4 lines while Karto and Skip react (pose, hop, tilt, prop). New picture or clear change every 3-4 s.
- Models (seesaw, price path, cube, loan bar, counter board) go in `Z.model` / `Z.right` beside a photo or TV, or take the whole board when no media is needed.
- Credits: automatic small print on the photo edge, `cr_clip_<name>` label on the TV chin. Add a `cap_*` caption for what the picture really is (old photo, the BUILDING, a souk lane). Never label `trading_floor_bw` with a year.
- Characters (wide): Karto home x 292, Skip x 1700, heads at y 500-700. On Skip: question mark x 1600 y 330, party hat x 1650 y 520, bar on his phone x 1640 y 740. Karto's pointing hand reaches x ~ 560.
- Score card: wide top-right corner (x 1516-1872, y 74-226): keep media left of x 1500 above y 230. Hook chips only in c00.
- Camera: zoom 1.04-1.1, slow pushes (`cam.to({x,y,zoom},{at,dur})`), `cam.reset` on a new picture. Reset poses with `karto.pose('neutral', {at, sfx:false})` after a gag.
- Strings: only keys from the storyboard or `strings.d/*.json`. New captions/labels: add `docs/brands/karto/gold/strings.d/<chapter>.json {key:{en,ar}}` (digits only inside strings) and tell the orchestrator.

## Tall layout (Shorts; s1 = l013-l019 in c01; check every Short that touches your lines)
- Board 872x840 at the top, captions y 1016-1148, characters below. Use `F.B(x,y,w,h)` (fractions of the board) for media; keep text out of the right 14 % and the top 8 %.
- Photo + TV side by side on wide become photo on top (`B(0,0,1,0.56)`) and model below; a portrait TV takes `B(0,0,0.55,1)` with labels in a right column `B(0.5,..)`.
- Raw-px slots (Skip's hat, qmark, bar) differ per layout: `tall ? {...} : {...}`.

## Test your chapter
```
python packages/cutout/films/gold/dev-fixtures.py     # only if strings are missing in the real ids: makes productions/_fixture-gold-en|ar (strings.d merged); then use those ids
npx tsx packages/cutout/src/cli.ts build expl-261119-i2xn --draft --agent <you>                                      # lint list must be empty for your chapter
npx tsx packages/cutout/src/cli.ts snap expl-261119-i2xn --lines l033,l036 --width 640 --version draft              # wide stills at line middles
npx tsx packages/cutout/src/cli.ts snap expl-261119-i2xn --times 41.5 --layout tall --width 540 --version draft     # tall still
npx tsx packages/cutout/src/cli.ts preview expl-261119-i2xn --chapter c03 --width 960 --version draft               # short preview video
npx tsx packages/cutout/src/cli.ts build expl-261119-x0ki --draft --agent <you>                                      # Arabic: RTL text lengths (Arabic is longer)
```
Tile 4 stills with ffmpeg `hstack/vstack` and look at them together: text not cut, media large, credits visible, nothing on the captions band or over faces.

## Mistakes I hit (do not repeat)
- `P.arrow` `bow` is a FRACTION of the arrow length (default 0.18); `bow: 25` drew a line across the whole stage. Give arrows `{x,y}` px points from `K.slot(..)` / `tv.g`, not prop handles.
- Arrow geometry must not depend on `rtl`: the picture is shared by both languages; a "from the right" arrow crossed the Arabic label.
- `P.hook()` is a huge hud card; c00 builds its own small chips piece (`hookChips`) over the top of the photo at frame 0: copy that.
- A photo in a 0.42-high tall slot is tiny (print frame + caption + credit eat about 110 px): give tall photos 0.56-0.84 of the board.
- Frame 0 must already show the result (enter 'none' at t = 0); animate the story afterwards (c00: the bar rewinds and walks down the slide on sentence 2).
- Sentence counts change when wording is edited (`F.s: lNNN has 3 sentences` in lint); use `K.at(id, fraction)` unless tied to a sentence start.
- `textAt` (counting text in a piece layer) needs the widest string as the layer's initial key so the fit is right (c01 price board).
- Clips: portrait frames make a tall TV; on wide use `Z.tvL` (520x820). `loop: true` when the line is longer than the clip (6 s). Never use a window with burned-in text.
