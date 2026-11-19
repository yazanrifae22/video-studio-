# Karto cutout kit: scene-author manual

The page `packages/cutout/web/frame.html` draws a cardboard cutout theatre and plays a film script. It runs inside headless
Chrome (`packages/quizlong/src/capture.ts`): every frame is `__seek(t)`, a pure function of t. Contract: `CONTRACT.md`.

Files: `packages/cutout/web/kit/` (`core.js` timeline + eases, `tex.js` cardboard bake + backdrops, `art.js` pose plates,
`stage.js` layouts/slots/camera/box, `cast.js` actors, `props.js` props, `captions.js`, `main.js` page contract, `sheet.js`
pose sheet). Fonts in `packages/cutout/web/fonts/` (Lilita One + Patrick Hand, OFL, licences next to them); Arabic uses
Lalezar + IBM Plex Sans Arabic from `data/brand/shu-lab/fonts/` (OFL).

## A film script

`packages/cutout/films/<slug>/film.js`, shared by English and Arabic, wide and tall:

```js
export default function build(K) {
  const { cast: { karto, skip }, props: P, cam, scene } = K;
  scene.backdrop('sky');
  P.hook();                                                    // show.hook_text over the first 2.8 s
  karto.pose('point', { at: 'l003' });
  const ph = P.photo('assets/crew.jpg', { slot: 'left', at: 'l003', caption: 'cap_crew', credit: 'cr_nasa' });
  cam.focus(ph, { zoom: 1.2, at: 'l003:0.2' });
  scene.change({ at: 'c02', style: 'flap', backdrop: 'night' }); // clears the board
  P.title('c02', { at: 'c02+0.15' });
  P.endScreen();                                               // wide only; Shorts get the CTA card automatically
}
```

One script line is usually 1-4 calls. Talking is automatic: whenever `show.lines` says `karto` or `skip` is speaking, that
cutout bobs on its stick and swaps between its pose plate and the same plate with the mouth open (syllable rate from the
word times). Never script talking.

### Time refs (every `at` / `out`)
`12.4` (seconds) · `'l014'` (line start) · `'l014:0.5'` (half way through the line) · `'l014:end'` · `'c02'` (chapter
start) · `'c02:end'` · any of these `+0.3` / `-0.2`. Unknown ids are reported in `lint`, never thrown.
Line ids are the same in both languages; anchor to lines and fractions, not to words (Arabic word order differs).

### K
| member | what | example |
|---|---|---|
| `K.show` `K.layout` `K.lang` `K.dir` `K.duration` | the show and its shape | `if (K.layout === 'tall') ...` |
| `K.line(id)` | `{t0, t1, text, words}` | `K.line('l007').t1` |
| `K.at(id, frac)` | time at a fraction of a line | `K.at('l007', 0.5)` |
| `K.T(ref)` | resolve any time ref | `K.T('c03+0.2')` |
| `K.chapter(id)` | `{t0, t1, title}` | |
| `K.s(key)` | on-screen string from `show.strings` (missing key -> lint) | `K.s('unit_km')` |
| `K.num(v, dec)` | number in this language's digits (`٤٠٠٬٠٠٠` in Arabic) | `K.num(1250)` |
| `K.sfx(name, t, {db, dur})` | extra sound cue | `K.sfx('sting', K.T('l040'))` |
| `K.slot(name)` | slot rect in stage px | |
| `K.opt({chapterTag:false})` | switch off the top-left chapter tag (wide) | |

### Cast: `karto`, `skip`
| call | what |
|---|---|
| `.pose(name, {at, mirror})` | instant plate swap with a pop. `'pointL'` = mirrored point |
| `.enter({from:'left'/'right'/'bottom', at})` | hidden before `at`; walks in on the stick (or rises from behind the lip) |
| `.exit({to, at})` | leaves the same ways |
| `.hop({at, h})` | jump with squash on landing |
| `.tilt({deg, at})` | lean (stays); `tilt({deg:0})` straightens |
| `.lookAt('left'/'right'/actor, {at})` | turns the cutout (paper flip through edge-on). Mirrors the plate: don't combine with `pointL` |
| `.moveTo(standSlot, {at, dur})` | carried across in little steps |
| `.nod({at})` `.shake({at})` `.pulse({at})` | yes / no / emphasis |
Characters are on stage from t = 0 at their home stand unless `enter` is called.

**Karto poses:** `neutral` calm · `talk` mouth open · `point` points screen-right · `shocked` arms up, tiny pupils ·
`thinking` hand on chin, looks up · `laughing` eyes shut, huge mouth · `deadpan` half lids, arms crossed · `whisper` hand
beside mouth (lean-in: add `tilt`) · `facepalm` hand over one eye · `present` both arms open · `cheer` fist up.
**Skip poses:** `neutral` phone in hand · `talk` · `point` · `shocked` phone flung up · `thinking` finger on chin ·
`laughing` · `deadpan` annoyed side-eye · `whisper` · `skip` phone raised, thumb over the skip button · `mindblown` hands on
head + burst · `typing` typing a comment (bubble with dots).
Aliases: `talk-open`, `pointL`/`point-left`, `annoyed`, `lean-in`, `mind-blown`, `about-to-skip`, `comment`.
Sheet: `docs/brands/karto/pose-sheet.jpg`.

### Props (all return a handle; all take `slot`, `pos:[fx,fy]` inside the slot, `at`, `out`, `enter`, `exit`, `tilt`, `sfx:false`)
Enter styles: `drop` `pop` `slide` (`from:'left'`) `rise` `flap` `slam` `slap` `grow` `none`. Exit styles: `fly` `drop` `pop`
`slide` `fade` `cut`. Without `out` a prop stays until the next `scene.change`.
Handles: `.to({x,y,rot,sc},{at,dur})` `.pulse({at})` `.wiggle({at})` `.exit({at, style})` `.point(fx,fy)` (stage point on it).

| prop | what | example |
|---|---|---|
| `photo(src, {caption, credit, tape, push})` | printed photo taped on cardboard; `push` = slow zoom inside the frame (default 1.1, 1 = off); `tape:4` four corners | `P.photo('assets/a.jpg', {slot:'left', at:'l010', caption:'cap_a', credit:'cr_a'})` |
| `clip(dir, {fps, t0, loop, count, pattern})` | frame sequence on a cardboard TV. Frames `dir/0001.jpg...` (+ optional `index.json {count, fps}`); frame = (t - t0) x fps | `P.clip('assets/launch', {at:'l020', t0:'l020', fps:15, out:'l022'})` |
| `cutout(src, {h, w, stick, rim})` | any SVG/PNG as a cardboard piece on a stick (white sticker rim 6 px) | `P.cutout('assets/rocket.svg', {slot:'right', at:'l005'})` |
| `bigNumber(v, {unit, countFrom, dur, decimals, prefix, suffix, stock})` | counting numerals on a sign | `P.bigNumber(400000, {unit:'unit_km', at:'l006'})` |
| `label(key, {size s/m/l/xl, stock, tape, rim})` | paper label, auto-sized | `P.label('lab_tape', {slot:'right', pos:[.5,.8], at:'l003'})` |
| `arrow(from, to, {color, width, bow})` | marker arrow drawing on. Points: `[fx,fy]` in `slot` (default board), a prop handle, `[handle, fx, fy]`, or `{x,y}` | `P.arrow([lab,.2,.1], [photo,.8,.5], {at:'l003:0.7'})` |
| `stamp(key, {big, color})` | rubber stamp slam (+ camera thud) | `P.stamp('stamp_safe', {at:'l013', big:true})` |
| `speech(key, who, {at, out})` | bubble at the speaker's head; with a line ref, `out` defaults to that line's end | `P.speech('sp_what', 'skip', {at:'l004'})` |
| `title(keyOrChapterId, {dur, num})` | chapter card flap (1.2-2 s, default 1.8); chapter id -> its title and number | `P.title('c02', {at:'c02+0.15'})` |
| `map(src, pins, {route, routeAt, routeDur})` | printed map, push pins with paper flags, marker route; pins `{x, y, key, at}` in map fractions | see demo |
| `bars(items, {max, unit, decimals, stagger})` | cardboard bar chart on a backing card; items `{key, value, stock}` | `P.bars([{key:'b_a', value:34}], {max:40, unit:'unit_pct', at:'l009'})` |
| `timeline(items)` | paper strip, ticks, moving pointer; items `{key, top, at}` (pointer arrives at `at`); RTL runs right to left | see demo |
| `versus(lKey, rKey, {leftImg, rightImg})` | two cards slam together with a bolt | `P.versus('vs_a', 'vs_b', {at:'l012'})` |
| `counterBoard(key, {from, steps:[{at, value}]})` | flip-digit tally board | `P.counterBoard('cb_x', {from:10, steps:[{at:'l2', value:6}]})` |
| `confetti({at, dur, count, from:'burst'})` | paper bits (rain or burst) | `P.confetti({at:'l013:0.5'})` |
| `hook(keyOrText, {at, dur})` | cut-letter headline chips; no arg = `show.hook_text` | `P.hook()` |
| `endScreen({at, tail})` | two empty video holes + subscribe ring + `end_text`, last `tail` (`show.tail`, default 12) s. Wide only | `P.endScreen()` |
| `shortCta({at})` | "full video" card from `show.short.cta_text` | automatic on Shorts |

### Camera and scenes
| call | what |
|---|---|
| `cam.to({x, y, zoom, rot}, {at, dur, ease})` | x/y = world offset (px) from stage centre; planes move with parallax (backdrop 0.42, board 0.82, cast 0.92, front 1.0, box 1.1) |
| `cam.focus(slotOrHandle, {zoom, at, dur, cut})` | centre a slot, prop or actor |
| `cam.cut({...}, {at})` | hard cut, snapped to the frame grid |
| `cam.reset({at, dur})` `cam.shake(at, {amp, dur})` | back to wide / thud |
| hand-held drift | on by default (`__load(show, {drift:false})` to switch off) |
| `scene.backdrop(kind, {at})` | `sky` `sunset` `night` `room` `map` `stage` `plain` or any CSS colour |
| `scene.change({at, style:'flap'/'slide'/'drop', backdrop})` | full-screen cardboard transition; everything still on the board is cleared at `at` |
Keep zoom <= 1.35: DOM text is rastered per camera plane.

## Slots
Prop slots (stage px). Character stands: `left` (Karto home), `right` (Skip home), `center`, `boardL`, `boardR`, `offL`, `offR`.

| slot | wide 1920x1080 | tall 1080x1920 |
|---|---|---|
| `board` | x600 y70 940x720 (centre/right) | x54 y160 872x840 (top) |
| `left` / `right` | board halves side by side | upper part (872x520) / lower part (872x320) |
| `sideL` / `sideR` | board halves | board halves side by side |
| `center` | x760 y140 620x580 | x130 y250 712x660 |
| `top` / `bottom` | board upper / lower 340 px | board upper / lower |
| `full` | x80 y60 1760x760 (covers the cast) | x54 y160 872x1330 |
| captions | x580 y836 980x124 | x60 y1016 860x132 |
| `{in:'board', x, y, w, h}` | fractions of a slot | same |

Safe zones: wide keeps the bottom 8 % for the box lip only. Tall (Shorts) keeps all text and faces out of the bottom 20 %
(y > 1536), the right 14 % (x > 929) and the top 8 %: the board ends at x 926, faces sit above y 1536, Skip stands on a crate.

## Captions
Drawn by the page when `show.captions`: 2-6 word groups (Arabic max 5) from `lines[].words`, on a torn paper strip with a
speaker tab (Karto vermilion, Skip yellow). Numbers and `show.key_words` are highlighted. Arabic keeps RTL order and digits
follow `strings._digits` (`arab` default for Arabic).

## SFX
Cues returned by `__load` use the keys of `packages/cutout/sfx.json` (unknown names are linted). The kit emits:
`pop` (pose swap, pop entrances), `whoosh` (enter/exit, fly), `thud` (drop, title, end screen), `stamp` (slam, hook),
`slide` (slide, moveTo, bars, timeline), `tape` (labels, chapter tag), `flip` (flap/scene flap, lookAt), `tap` (hop, pins),
`scratch` (arrows, map route), `riser` (bigNumber count, with dur), `ding` (count done), `tick` (counterBoard),
`rewind` (TV on), `rustle` (confetti). Kit aliases (`flap`, `boing`, `marker`, `count`, `pin`, `tv-on`, `confetti`) map to
these. Film scripts may add any other table name with `K.sfx`.

## Do / don't
- Do take every on-screen word from `show.strings` (`K.s`, or a key argument). Never type words in `film.js`.
- Do give every line a picture change: pose, prop or camera. Clear the board with `scene.change` between topics.
- Do keep one main prop on the board at a time; a label or arrow may join it.
- Don't anchor to word indexes; use line fractions.
- Don't put text or faces in the Shorts unsafe zones; use slots, not raw px, so the same film works tall.
- Don't use CSS animations, timers, video elements or `Math.random` in a film. Everything comes from `t`.
- Don't combine `lookAt('left')` with `pointL` (double mirror = points right).

## Topic art
- Photo: drop a JPG/PNG into `films/<slug>/assets/` and `P.photo('assets/x.jpg', ...)`; credit wording comes from the rights
  record into a string key. Any aspect works; it is fitted to the slot.
- Drawn object: an SVG (flat colours, thick dark outline reads best) in `assets/`, then `P.cutout('assets/x.svg')`. The kit
  adds the corrugated edge, fibres, sticker rim, stick and shadow.
- Clip: the builder extracts frames (`ffmpeg -i src -t 4 -vf fps=15,scale=640:-2 -q:v 5 -start_number 1 dir/%04d.jpg`)
  and writes `dir/index.json {"count", "fps"}`; frames are preloaded in `__load`, keep clips short (<= 10 s at 15 fps).
- Map: any SVG/PNG map (public-domain base maps), pins in fractions of the image.

## Preview and checks
- Scrubber: serve the repo root and open `/packages/cutout/web/frame.html?dev=1&show=/packages/cutout/films/_demo/show.en.json`
  (arrows = frame step, shift = 1 s, space = play).
- Stills: `node packages/cutout/web/snap.mjs <show.json> --times 3,8.5,20 --out DIR [--width 640] [--no-gpu]`; prints lint and cue count.
- Determinism: add `--check-seek` (fresh seek vs end -> half -> t must be identical).
- Capture speed: `--perf 300` (one worker, full size, CDP JPEG like the builder).
- Pose sheet / hero stills: `--pose-sheet docs/brands/karto/pose-sheet.jpg`, `--hero docs/brands/karto`.
- Demo: `packages/cutout/films/_demo/` (film.js, `make-shows.mjs` writes the four show files, stills in `stills/`). The demo
  numbers (bars, distance) are layout placeholders, not checked facts.
