# Fair Game: the picture state `state(t)` (model -> views contract)

Model: `packages/test3d/web/parable/show.js` (pure JS, no Three.js, node + browser).
`makeShow(score, {storyboard?}) -> { duration, beats, lines, state(t), warnings }`.
Fixtures for view work before the model is done: `packages/test3d/web/parable/fixtures.js` (named hand-made states, same schema).
Text dump / invariant checker: `node packages/test3d/web/parable/dump.mjs <score.json> [--check]`.

The model says WHAT is on screen and how far each motion has progressed. Views own everything physical: metres, lenses,
camera paths, lights, materials, easing of the camera, hues. The only colours the model names are the semantic keys below.

## Conventions
- **Board units.** `{f, r}`: file 1..8 left to right, rank 1..8 from the camera (rank 1 nearest). The centre of square `n`
  (1 = a1, game.js `SEAT`) is `f = (n-1) % 8 + 1`, `r = floor((n-1) / 8) + 1`. The board covers `[0.5, 8.5]` in both. Fractional
  and off-board values are allowed (r < 0.5 = the table in front of the board, the Skeptic lives there). 1 unit = one square.
- **Heights** are never in metres: towers are given in **coins** (draw with game.js `tower(coins, {rings})`, 1 disc = 10 coins);
  free heights (`y` on an anchor) are in **squares** above the board top.
- **0..1 fields** are progress or amount; 0 = off / not started, 1 = fully on / finished. They are already eased by the model
  unless the field says "linear". Views may shape them further but must reach the same end values at the same times.
- **Continuity.** Every field is continuous in `t` EXCEPT at a cut, i.e. when `shot.id` changes. At a cut anything may change
  (board reset, world switch, objects appear). Two documented hand-overs are also allowed between cuts (they are visually
  continuous if drawn as specified): (1) a `moves` item appears with `u = 0` at the top of a tower whose `coins` dropped by the
  same amount in the same instant, or disappears with `u = 1` on a tower whose `coins` rose by its amount; (2) a `jump` ends
  (`u = 1`) and the jumping pawn becomes the pawn on the target tower.
- **Purity.** `state(t)` is a pure function of t, returns a fresh object (safe to keep), never throws for any finite t
  (t < 0 = first frame, t > duration = last frame). Cost about 0.05-0.2 ms (see the end of this file).
- `colorKey`: `null` (neutral; view picks) | `'scholar' | 'worker' | 'heir' | 'fool' | 'skeptic'` (game.js `COLORS`) | `'gold'` (coin
  gold) | `'red'` (red game chips) | `'good'` (ahead / lucky) | `'bad'` (behind / broke / unlucky). Views map the last four to hues.

## Top level
```
{
  t, chapter: 'c01'..'c10', line: 'l01'.., lineU,       // line = spoken line, or the last one during the silence after it; lineU 0..1 linear through the spoken words, 1 in the silence
  world: 'fair'|'again'|'hats'|'growth'|'leak'|'talent'|'demo'|'empty', flips: number|null,   // what the 64 seats show; flips = fractional flip index (rounds for growth)
  players: Player[64], extras: Extra[], skeptic: Skeptic, king: King,
  flipCoins: FlipCoin[], moves: Move[], chips: Chips[], rain: Drop[],
  level: Level|null, layout: Layout, tags: Tag[], counter: Counter|null, title: Title|null,
  shot: Shot
}
```

### Player (index = player id 0..63; seat = game.js `SEAT[id]`)
| field | meaning |
|---|---|
| `id` | player id |
| `at {f,r}` | where the pawn and its tower stand. The seat centre except in the row layout (c09) and the c10 line-up |
| `coins` | coins in the tower right now (>= 0). Coins in flight / resting on the table are in `moves`, never double counted |
| `rings` | `tower()` option: 1 normally, 2 in the growth world (giant towers), 0 in the row layout (one thin column) |
| `present` | 0..1: 0 = pawn AND tower not drawn (board cleared), 1 = drawn. Changes only at cuts except where a beat says `appear` |
| `down` | 0..1: 0 standing on its tower, 1 lying on its square (tower gone, coins < 1). Tip-over takes 0.5 s, eased; the view picks the fall direction (stable per id, e.g. hashed) |
| `lit` | 0..1 highlight (the voice is talking about this one). Wins over `dim` |
| `dim` | 0..1 de-emphasis: selection dimming (others while a pair plays) and, for fallen pawns, the "broke" dimming (= `down`) |
| `hop` | 0..1 current lift of a small jump: 0 on its tower, 1 = top of the hop (views choose the height, about 0.3 pawn heights) |
| `scale` | pawn size (talent, c07): 1 = normal, about 0.8..1.35. Towers do not scale |
| `role` | `null` or `'scholar'|'worker'|'heir'|'fool'` (fixed by id, game.js `CAST`) |
| `hat` | 0..1: role look applied. 0 = plain wooden pawn, no hat; 1 = role colour on the pawn and its hat seated. Between: the hat is dropping from above (1 = landed) and the colour sweeps in. Always 0 for plain players |
| `slot` | rank of the player in the row layout (0 = smallest .. 63), `null` outside the row |

### Extra (anything that is not one of the 64 seats)
`{ id, kind: 'pawn'|'tower'|'layer', at {f,r}, coins, rings, present, down, lit, dim, hop, scale, role, hat, ghost, jump, rect, gather }`
- `pawn` = a pawn on its own tower (same fields as Player). `tower` = a tower with no pawn. `layer` = coins spread thin over the
  rectangle `rect {f0, r0, f1, r1}` (thickness = coins / 10 discs spread evenly over the rectangle); `gather` 0..1 slides them
  together into one stack at `at` (1 = a normal tower of `coins` at `at`).
- `ghost` = coins of a faint outline tower drawn around the real one (the old height, c05 l27); 0 = none.
- `jump` = `null` or `{ to: Anchor, u }`: the pawn leaves its own spot (`at`, on a tower of `coins`) and lands on top of `to`
  along an arc, u 0..1. When u reaches 1 the model ends the jump and the pawn simply stands at the target (hand-over).
- Demo extras live on the board or the table; ids are stable for their whole life (`demo`, `short`, `tall`, `real1`, `real50`, `board90`, `heir`, `heirTower`, `scholar`, `builder0..`, `skTower`).

### Skeptic (black pawn, no hat; off the board at the near edge)
`{ present, at {f,r}, forward, lit, hop, coins, jump, tag }`: `forward` 0..1 (0 = back, 1 = stepped forward toward the board,
already folded into `at`; the Host view uses it to raise the puppet's finger), `coins` = its own tower (0 = stands on the table),
`jump` as for extras.

### King
`{ on: playerId|null, drop, swap, hat }`: the gold king for the tower of player `on`. `drop` 0..1 (0 = above the frame, 1 = landed
on the tower top: the thud is at the moment drop reaches 1, also a beat), `swap` 0..1 (0 = the player's own pawn is drawn, 1 = the
king is drawn instead of it; the model flips it in 0.12 s at the landing), `hat` 0..1 (the fool's cone hat popping onto the king).
While `on` is set, `players[on].hat` keeps its value for the colour but its hat is drawn on the king when `king.hat > 0`.

### FlipCoin (the large coin)
`{ id, at {f,r}, present, phase: 'air'|'hover'|'rest', lift, angle, yaw, face, glint, labels }`
- `at` = the point on the board under the coin (the middle of the pair, or beside a pawn).
- `lift` 0..1 = height: 0 lying on the board, 1 = top of a flip (views choose it above the towers in frame; hover is about 0.55).
- `angle` = rotation in TURNS about the coin's horizontal axis: integer = crown side (heads) up, +0.5 = plain side (tails) up,
  .25 = on edge facing the camera. Continuous; a flip adds several turns. `yaw` = turns about the vertical axis.
- `face` = the side up now (rest) or the landing side (air). `phase` is informational. `glint` 0..1 = "catches the light" accent.
- `labels` = `null` or `[headsText, tailsText]` (also given as tags anchored to the coin sides).

### Move (something in flight between two places, or resting on the table)
`{ id, kind: 'disc'|'chip', coins, count, from: Anchor, to: Anchor, u }`: a stack of `coins` (disc, coins / 10 discs) or `count`
chips travelling from `from` to `to` along a low arc; u 0..1 (1 = arrived, resting at `to`). A stake resting between two players
is a move with u = 1 and `to` = a board point. `coins` may be fractional (a slice of 1.6 discs, a 1 % sliver).

### Anchor
`{player: i}` (top of i's tower for moves; just above the pawn's head for tags) | `{extra: id}` (same for extras) | `{skeptic: true}` |
`{king: true}` | `{f, r}` (on the board surface) | `{coin: id, side: 'heads'|'tails'}` | `{chips: id}` (top of that chip column) |
`{screen: [sx, sy]}` (fractions of the frame, 0,0 = top left; tags only). Any board/player anchor may add `y` (squares higher).

### Chips (red game chips: tallies, markers)
`{ id, at: Anchor, count, color: colorKey, lit, label }`: a column of chips. `count` fractional: `floor(count)` chips resting,
plus one chip whose fall onto the column is `count % 1` complete (when count decreases, the top chip lifts away the same way).
`label` = who the column belongs to (`'heir'`, `'nobody'`, `'no'` ...), informational.

### Drop (c07 rain)
`{ id, kind: 'gold'|'red', to: {player: i}, u, used }`: one lucky gold coin or unlucky red chip falling onto i's tower; u 0..1
linear in time (0 = above the frame, 1 = touching the pawn). At u = 1 it disappears and i's coins ease to the new value in 0.3 s:
red halves, gold doubles if `used` (the talent used it), a gold with `used: false` just disappears (missed chance).

### Level (c08 l52)
`{ coins, sweep, opacity }`: a flat glowing plane over the whole board at the height of a tower of `coins` (draw at
`tower(coins, {rings: player rings}).height`), `sweep` 0..1 = how far it has swept in from the near edge to the far edge.

### Layout
`{ kind: 'board'|'row', u }`: `row` (c09 l59) = the 64 towers sorted into one rising row, `u` 0..1 progress of the sort. The model
moves `players[i].at` from the seat to the slot `{f: 0.6 + slot * 7.8 / 63, r: 4.5}` (u eased, staggered) and sets `rings: 0`.
Those slots are 0.124 squares apart, narrower than a coin: a view MAY place slots its own way (use `slot` and `u`) and thin the
columns, as long as the order and the relative heights are kept.

### Tag (camera-facing text)
`{ id, text, anchor: Anchor, opacity, pop, size: 's'|'m'|'l', color: colorKey, kind }`
- `size`: `l` = titles ('THE GAME', 'ONE NEW RULE') and big hero numbers; `m` = numbers and names on pieces (the default);
  `s` = sources, credits and small notes ('Pluchino, Biondo, Rapisarda 2018', 'California, November 2026').
- `kind`: `number` | `name` | `title` | `note` | `source`. `pop` 0..1 = the pop-in pulse (1 at the instant the word is spoken,
  decays to 0 in 0.35 s; scale up by pop). `opacity` fades in 0.12 s from the key word and out 0.25 s at its end.
- Every tag's `text` equals a storyboard tag of the current line verbatim; it appears at the start of the word the voice says.

### Counter / Title
- `counter` `{ label: 'FLIPS EACH'|'WORLDS'|'TOTAL', value, text, opacity }`: `text` = label + ' ' + value formatted with commas
  (`'FLIPS EACH 2,000'`), the exact string the storyboard lists. Views place it (one fixed screen spot is fine).
- `title` `{ text, opacity }`: the hook text (opening) and end text (closing), screen text, views place it.

### Shot (semantic camera)
`{ id, kind, subject: Subject, to: Subject|null, move, t0, t1, u }`
- `id` changes = a CUT. `u` = (t - t0) / (t1 - t0), linear 0..1. `to` = what the move ends on (pan / tilt / rack targets).
- `Subject` = `{ players?: [ids], extras?: [ids], coins?: [ids], chips?: [ids], king?: true, skeptic?: true, board?: true }`.
  Everything listed must be in frame (for `to`: by the end of the move).
- `kind` (each view has its own lens and path for each):
  `wide` whole board, normal angle · `high` whole board from high up · `top` straight down · `low` whole board from a low angle ·
  `player` one pawn and its tower · `pair` two pieces (or two stakes) together · `block` the four centre squares d4 e4 d5 e5 ·
  `tower` one tall tower bottom to top · `coin` the large coin close · `demo` the demo pieces of c05/c07/c08 · `tally` the chip
  columns with their owners · `row` the sorted row · `skeptic` the Skeptic in front, the board behind.
- `move`: `hold` · `push` (in) · `pull` (out) · `orbit` (around the subject) · `tilt` (up or down from subject to `to`) ·
  `pan` (across from subject to `to`) · `crane` (pull back and up) · `drop` (camera descends from subject to `to`).

### Beats (`show.beats`, sorted by t0, for look-ahead and sound)
`{ type, t0, t1, ... }`: `cut {shot}` · `flip {coin, a, b, winner, face, tLand}` (t0 = coin leaves the board) · `stake {a, b, coins}` ·
`payout {to, coins}` · `timelapse {world, x0, x1}` (x1 < x0 = rewind) · `reset` · `intro {role, player}` · `hop {who}` ·
`fall {who}` (t1 = head hits the board) · `objection` · `king` (t1 = landing) · `chip {stack}` · `rain {who, kind, used}` (t1 = hit) ·
`tag {id, text}` · `tax` (slices out, pile, shares back) · `sort` · `appear {who}` · `jump {who}` · `title`.

## Which fields each line uses
| lines | fields |
|---|---|
| l01-l02 | players (equal), flipCoins air, tags, title (hook), shot wide |
| l03-l04 | players end states (fair, again), down, tags, cuts |
| l05 | rewind time-lapse: players coins/down, counter FLIPS EACH |
| l06-l10 | moves (stakes), flipCoins, lit/dim, tags, pair/wide shots |
| l11-l12 | hat, tags (names), block shot, crane |
| l13a-l16 | time-lapse + counter, lit, tags anchored to players, flipCoins |
| l17a-l22 | time-lapses, down, lit, tags, tower shots |
| l23 | king |
| l24 | again worlds, reset, chips (64 markers), top shot |
| l25-l29 | flipCoins (hover, labels), extras (demo, ghost), moves |
| l30 | fair at 200 each, flipCoins hover, orbit |
| l31-l35 | skeptic, reset, lit, flipCoins (two for the Worker), Heir tower growth, hop, hats time-lapse, counter WORLDS |
| l36-l40 | chips (tally columns), moves kind chip, down (Worker), counter |
| l41-l43 | scale, rain, tags |
| l44-l47 | extras (tower, layer gather, board90, heir jump, scholar build, builders), present 0 for the board |
| l48-l53 | skeptic, counter TOTAL, moves, flipCoins labels, extras demo, growth time-lapse, level, king |
| l54-l58 | moves (1 % slices, shares), extras pile, leak time-lapse, live leak rounds |
| l59 | layout row, slot, chips on tower tops |
| l60 | chips (53 / 47) |
| l61-l65 | king, flipCoins glint, skeptic tower + jump, line-up (players `at`), hop, tags, title (end) |

## Performance
Worlds and every timeline item are built once in `makeShow`. `state(t)` binary-searches the board segment, evaluates only the
items active in a 1 s bucket, and keeps a small memo of the last world sample (same x -> same array; still pure).

## Changes
(append dated entries here; never edit the sections above silently)

### 2026-11-15 (model built; storyboard round 3)
- **`total`** (new top-level, `null` or `{ label: 'TOTAL', value, text, opacity }`): the TOTAL counter of c08 (l48 'TOTAL 6,400', l50a/l50
  'TOTAL 43,097') is separate from `counter`, because l50a shows FLIPS EACH and TOTAL at the same time. Draw both.
- **Shot `continuous`** (boolean): `true` = NOT a cut; the new shot starts exactly where the previous one is at that moment (a pan
  from the Scholar to the Worker, a crane back from the block, a pull back over the tally). Only shots with `continuous: false` are
  cuts. **Move `rack`**: the camera stays, the focus (and attention) moves from `subject` to `to` (l47, the fallen builders).
- **Subject `moves: [ids]`** (l08: frame the two resting stakes).
- **Anchors** `{move: id}` (a tag over a stake), `{total: true}` (unused for now; the total is screen text), and a board anchor
  with `level: true` = at the height of the `level` plane (l52 tag 'average 673').
- **Tag `line`**: the storyboard line the tag belongs to. Some tags stay up into later lines on purpose (the four name tags
  from l11a to early l12; the tally numbers 47 / 6 / 2 / <1 / 45 through l36-l40; they end when the column changes).
- **`world`** values also `'talent'` (c07 l41-l43) and `'empty'` (board cleared: l44-l47, l60). `flips` = rounds in the growth world.
- **`dim`** already includes the "broke" dimming (`max(selection, 0.85 x down)`). `skeptic.at` already includes `forward`.
- **Read-only**: `state(t)` objects may share small sub-objects (seat positions); do not mutate a returned state.
- **Extras ids** in use: `demo` (c05 l26-27, c08 l49), `short`, `tall` (l28-29), `real1`, `real50`, `board90` (l44-l45a), `heir`,
  `heirTower`, `scholar`, `builder0..6` (l46-47), `pot` (the middle of the board in the 1 % rounds, l55-l58), `skTower` (l64a).
  Flip coin ids: `main`, `second` (the Worker's two coins, l33 and l38).
- **Hook and end text** are the `title` field (`'64 PLAYERS. 1 FAIR COIN.'` until 'Each' in l01; `'WHICH ONE ARE YOU?'` from
  'which' in l65 to the end), not tags.
- **makeShow also returns** `shots` (the whole shot list with t0/t1), `tagDefs`, `lines` (`{id, t0, t1, next, chapter}`), `warnings`
  (missing words/lines: the model falls back and keeps going) and `cast` (`nobody` = the plain pawn of the l39 column, `giant` = the
  growth world's a7 player, `talentBest`, `talentRich`, `tall56`, `short56`).
- The row layout (l59) uses `rings: 0`; views decide the slot spacing (see Layout).

### 2026-11-15 (round 4: QA fix round 1, model side; all additive)
- **Tag timing** (replaces "appears at the start of the word" in Tag): a title tag (and every counter) comes up at the START of its line;
  any other tag 0.15 s BEFORE its word (or at its own shot's cut, if that is later). It stays up to the end of the line + the silence
  after it, and ends AT ONCE (no fade) at the next cut. `pop` still peaks on the word. Tags with `line` in an earlier line are held on
  purpose (names l11a-l12, tally numbers). The l13 / l17 / l51 count tags no longer replace each other: they stack on separate screen spots.
- **`focus`** (new top level): `null` (the whole board is the subject) or `{ players: [ids], extras: [ids], hard, chips?, moves?, coins?,
  king?, skeptic? }` = what the current line is ABOUT. `hard: true` = fade out whatever is not in focus and stands between the camera
  and the focus. Derived from the shot subject (minus the board; for a pan / rack: its `to`) unless a line sets it (l08, l18, tally, l63).
- **`counter.fast` / `total.fast`** (boolean): the value changes more than 8 times a second (skip motion blur on the digits). `text`
  is always the formatted `label + ' ' + value` and now comes from the time-lapse itself (no longer from the next world during fades).
- **`players[i].fallDir`** `{f, r}` unit vector: the direction the pawn falls (hashed per id, always pointing INTO the board on edge
  squares, l24). Extras: `{f: 0, r: 1}`. Views should use it instead of their own hash.
- **`show`** on every move and extra (coins to DRAW; = `coins` unless enlarged). The 1 % tax (l55-l58): slices draw at least one disc
  (`max(10, 3 x coins)`), every share draws the same size back, the `pot` tower draws the shown slices that arrived (`lit: 1`).
- **`rings: 0` on all comparison / demo extras** (one column, height proportional to coins): `demo`, `short`, `tall`, `real1`, `real50`,
  `board90`, `heir`, `heirTower`, `scholar`, `d100`, `d400`. New extras **`d100`, `d400`** (l08: 100 vs 400 on the table in front of the
  board, r = -0.35) with stake moves **`d100s`, `d400s`** (20 each, resting at r = -0.95); new l08 tags '100', '400', '20', '20'.
- **Skeptic `present`** is now 0 before l31, on the cleared board (l44-l47, l60), in demo close-ups (world `demo`) and in the tally
  (l36-l40); 1 on every other board shot from l31. It steps forward only in l31, l48, l53 (l64a: it jumps from its back spot).
- **Tally restaged (l36-l40)**: one `tally` shot, Subject = the 5 owners + the 5 columns. 59 plain players `present: 0`; Heir, Scholar,
  Worker, Fool, Nobody stand in one row (`at`: f = 1.5, 3, 4.5, 6, 7.5; r = 4.9) on equal 100-coin towers; columns `tally-*` at r = 3.95
  in front of each owner (all five columns exist from the cut, `count` 0 until they grow). Columns are complete as the number is spoken.
- **Flip coin `phase: 'hover'` after a landing** (l09: lands crown up on "Heads", lifts to 0.45 in front of the pair and stays).
- Timing moves (no schema change): hats seated by the end of the name; king lands on "made", cone hat seated 0.35 s later; l12 crane
  ends mid-line (new continuous `wide` hold); l09 payout on "takes"; l20 board settled at 37 before its tag; l27 ghost complete by "four";
  l60 columns from the line start, complete before "fifty-three"; l65 line-up 1.6 squares apart (f 1.6..6.4), Skeptic at f 8.1.
- l56 board: the leak board at 150 flips each with one plain player raised to 2,000 coins (others scaled, total 6,400), next to a
  ~100-coin player (`cast.tall56`, `cast.short56`). l24 tag '300 worlds' at screen y 0.07; l51 '36 under one coin' anchored over the
  fallen pawns (board point, y 0.6); l60 source tag at screen y 0.08.

### 2026-11-15 (round 5: QA fix round 2, model side; all additive)
- **Player `scale`** range widened to **0.7..1.6** (was about 0.8..1.35): a bell with most pawns within ~0.9..1.1, a few small ones
  down to 0.7 and one or two brilliant ones at 1.6. The l41 sizing wave is finished by "in the middle". Views: draw it as given.
- **A tag's `anchor` may change at a cut** (same tag id, still up): l51 '36 under one coin' sits over the fallen pawns on the board
  shot and moves to `{screen: [0.5, 0.88]}` from the cut to the giant tower. Views must read `anchor` every frame.
- **Tags may survive cuts inside their own line**: l51 '9 above', '55 below', '36 under one coin' stay up through the cut to the
  giant tower until the end of the line + silence (they end at the l52 cut).
- Timing moves (no schema change): l43 hold on the most talented pawn ('most talented' from "most") until "It"; a continuous `pan`
  shot from "It" to "average", then a continuous `hold` on the rich pawn ('richest' from "It"). l53 the Skeptic slides forward on
  "Second objection" and stays at forward 1 until the cut to the four hats on "No."; the coin leaves the board on "luck" and lands at
  the end of "decides"; the king shot starts on the last "So" and holds through the silence. l64a the Skeptic's tower rises from
  "There" (eased out, fast) and is at 100 before "waiting"; the hop starts on "Everybody" and lands before the line ends. l11d the
  Fool's hat drops in l11c's silence and is seated at the start of "Fool". l23 the king lands on "made" and its cone hat is seated
  by the end of "made" (before "king"). l60 the 'no' column starts 0.4 s before the 'yes' column; both end together (53 / 47), so
  the two columns are never equal.
- l65 verified, unchanged: name tags anchored on their own players; line-up left to right (file 1.6 / 3.2 / 4.8 / 6.4) = Scholar,
  Worker, Heir, Fool, all four settled before the first name tag.

### 2026-11-15 (c01 opening rewritten, storyboard round 4; model only, no schema change)
- c01 (l01-l05) re-staged in show.js, nothing new in the schema. l01 opens ON the king tower (the l23 end state, `king` {drop 1, swap 1, hat 1} from t=0, tag '90%', coin on "nobody cheated"); l02 rewinds the fair world and the king lifts off first (FLIPS EACH counter, '64 players', '100', coin, then 3 `again` worlds); l03 real board (`real1`/`real50` extras, '1%', 'bottom 50%', 'a third of all wealth') then the king again ('BETTER?'); l04/l05 the four hat pawns in a cleared line (others `present` 0, `hat` 1, Heir `coins` 100 -> 1,000), WORLDS counter to 10,000, king + sinking tower + '?' on "one rule", 'PICK ONE' and the coin over the four.
- Hook title flag `St.title` now runs 0 - 3.2 s (faded 3.0 - 3.2), no longer tied to a word. Every c01 addition (hats, line-up, king, extras) ends before l06; c02 is unchanged (equal board at l06, hats first at l11a).

### 2026-11-15 (frame-check model fixes, c08/c09; model only, no schema change)
- **l49**: board CLEARED (`present` 0, world `demo`, like c05). Coin close-up (`coin` shot, push; two turns, crown up on "Heads") -> cut on
  "Heads" to a `demo` shot {extras: demo, coins: main}: coin at f 3.7 / tower `demo` at f 5.3 (r 4.5, rings 0). 100 -> 150 on "grows",
  coin flips to the plain side on "Tails" (flip beat), 150 -> 90 on "shrinks"; continuous `orbit` from "Nobody"; the coin spins from
  "average" and glints on "money". New tags '100' -> '150' -> '90' on the demo tower (added to the l49 storyboard tags; replaced in turn).
- **l53**: in the four-hats shot the coin rises on "No." and spins over the four (lift 0.75), the four hop in turn on "ticket", the crowd
  dims 0.5 -> 0.9 on "Without", flip 1 on "luck" (lands "decides") -> the Fool wins 20 from the Scholar; flip 2 on "the coin does not
  check" -> the Fool wins 20 from the Worker and hops in the pause; Fool lit. Stakes are `moves` `l53win<id>` (hand-over rule, total kept).
- **l56**: board CLEARED (world `demo`): extras `tall` (800, f 5.7) and `short` (80, f 3.3), `pot` (rings 0) between them at the centre;
  `demo` shot {tall, short, pot}. Thick slice (true 8, `show` 50 = 5 discs) on "more", then a sliver (true 0.8, `show` 5) on "because";
  two equal shares (true 4.4, `show` 27.5) land on both on "Everybody". `cast.tall56/short56` are still exported but no longer used.

### 2026-11-15 (frame-check model fixes, c04/c07; model only, no schema change)
- l23: drop starts at the line start (milder ease-in `u(1+u)/2`), still landed + cone hat seated by the end of "made" (R4/R5 kept);
  new cut at the landing to a close `player` shot on `{king: true}` (push), then a continuous `tower` hold from ~1.2 s after the hat.
- l24: the 64 marker chips end at "But" (were up to l25). From "But" two more `again` worlds RUN (AGAIN_KINGS[0], [1]; l02 only showed
  their end states): `high` push with world A playing 0 -> end (winner lit), cut on "One" to `wide` hold with world B (winner lit from
  "pulls"), then on "keeps" a `tower` tilt on world B's winner through the silence. No new numbers or tags.
- l45: the `real50` gather now runs from "One" to just before "More" (~3 s, was the first 2 s); shots: `high` push (board + both extras)
  -> on "More" a `tower` tilt from `real50` up to `real1` -> on "thirty-two" a `demo` push on both; `real50` lit while gathering and on
  "thirty-two", `real1` pulses on "taller". (`g45` constant sits just before block l44.)
- Views: Neon frames a `player` shot whose subject is only `{king: true}` from the board up (pawnBox from y 0): wide, not the tower top.


### 2026-11-15/16 (frame check + QA, orchestrator; model only, no schema change)
- l03: one `demo` push on `{extras: [real1, real50]}` from the line start (was a `wide` board hold); `real50` is drawn already
  gathered (`gather: 1`): the bottom half as ONE small stack next to the 1 % stack that rises on "richest ... third". Reason: in the
  wide shot the 1 % stack read as a stub in all three looks (three checkers + qa-director).
- l04: each name tag stays until the next name is spoken (was until its own advantage word: "THE SCHOLAR" was up for 0.3 s).
- l11a-l11d: name tags end 0.3 s into l12 (were +1.6 s: the four names ran into each other during the crane back).
- l46: the source tag "UBS, year to April 2025" starts on "recent" (was on "record", under 1 s before the cut).
- film.json (make-film-json.py): `end_text_y: -37.5` for all three looks (closing text at the top), `end_text_word: 'which'`.
- Tried and reverted: ending "most talented" at the l43 pan / delaying "richest" (breaks R4/R5 contract checks).
- Whole-video frame check tool: `docs/brands/test-3d/fair-game/frame-check.py <id>` (every frame: black / freeze; one frame per second
  on sheets + per-part briefs), checker instructions `frame-check-brief.md`, fix lists `frame-check-fixes-*.md`.
