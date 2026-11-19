// Fair Game, Macro look: camera-facing tags and the counter, laid out on the PICTURE every sub-frame (after the camera is set).
// Rules: readable on a phone (cap height >= 4.6 % of the frame for m), inside title safe (5 %), never in the caption band (74-88 %),
// out of the hook / end text band (BANDS) while the state carries a title, never overlapping each other or the counter, never on
// the piece it labels or on what the line is about (screen.focus), never on the caller's avoid rectangles (puppet faces).
// Crowded tags spread out and get a short leader line to their anchor.
import * as THREE from 'three';

const HEX = { null: '#ffffff', scholar: '#7fb0ff', worker: '#ffad55', heir: '#ffd166', fool: '#6fe39b', skeptic: '#d4d8e2', gold: '#FFC94A', red: '#ff6b5e', good: '#7dff9a', bad: '#ff6b5e' };
const SIZE = { l: 0.064, m: 0.048, s: 0.032 };   // cap height / frame height
const SAFE = { x0: 0.05, x1: 0.95, y0: 0.055, y1: 0.725 };
// screen text bands (film.json): the hook sits low (hook_text_y 25: about 63-87 %), the end text "WHICH ONE ARE YOU?" at the TOP
// (end_text_y -37.5: about 2-23 %). Tags stay out of the band of the title that is up.
export const BANDS = { hook: [0.6, 0.9], end: [0.0, 0.25] };
/** the band of the screen text this state carries, or null: [y0, y1] (fractions of the frame height) */
export function titleBand(state) {
  if (!state?.title || !(state.title.opacity > 0.01)) return null;
  return state.chapter === 'c01' ? BANDS.hook : BANDS.end;
}
// candidate offsets from "just above the anchor", in tag widths / heights: above first, then beside, then further out (leader line)
/** a tally row: the shot shows >= 3 chip columns side by side (l36-l40; not l60's two vote columns) */
export const isRow = (state) => state?.shot?.kind === 'tally' && (state.shot.subject?.chips ?? []).length >= 3;
/**
 * Host only (c01 line-up, l04 / l05, frame check 2026-11-16): names right at their own pawns. tp = each pawn's hop-peak top on screen
 * [x, y] sorted by x, ws = plate widths, th = plate height, cols = each pawn's body on screen [x0, y0, x1, y1] (same order), extra = more
 * pawn bodies to keep off, keep = more rects for the plates only (the flipping coin's path). A staircase: the outer names sit just above their own tops (sliding outward when that clears the way, at most
 * 0.05 past the pawn: a short line); the inner names go up only as far as needed to clear what is in their way. A name whose spot
 * above would lie on a face (avoid rects) or above the title-safe top (y0) sits beside its pawn's top instead. No plate touches another
 * plate, another pawn's body or another name's line. Returns [x0, y0, x1, y1, ax, ay] per name (input order); out.bad = a name's own
 * line runs through another name. Pure: view-host replays it to pick the camera. Never used by the Macro look.
 */
export function namesAboveRows(tp, ws, th, { x0 = 0.05, x1 = 0.95, y0 = 0.055, cols = [], extra = [], keep = [], avoid = [] } = {}) {
  const n = tp.length, out = new Array(n), done = [], G = 0.012, ov = (a, b, g) => a[0] < b[2] + g && b[0] < a[2] + g && a[1] < b[3] + g && b[1] < a[3] + g;
  const seg = (r, ax, ay) => [Math.min(r[2], Math.max(r[0], ax)), r[3], ax, ay];   // a name's line: from its plate to its pawn's top
  const segHit = (g, r, p) => { for (let k = 1; k < 16; k++) { const x = g[0] + (g[2] - g[0]) * k / 16, y = g[1] + (g[3] - g[1]) * k / 16; if (x > r[0] - p && x < r[2] + p && y > r[1] - p && y < r[3] + p) return true; } return false; };
  const c = tp.reduce((a, q) => a + q[0], 0) / n, dist = (i) => Math.abs(tp[i][0] - c);
  const order = tp.map((q, i) => i).sort((a, b) => dist(b) - dist(a) || a - b);
  let bad = false;
  for (const i of order) {
    const [ax, ay] = tp[i], w = ws[i], others = cols.filter((q, j) => j !== i).concat(extra), offs = others.concat(keep);   // keep: plates only (a line may pass behind the coin's path)
    const inner = tp.filter((q, j) => j !== i && dist(j) <= dist(i) + 1e-9).map((q) => q[0]);   // pawns nearer the middle: their names come later and must not have to climb over this one
    let best = null;
    for (let k = -14; k <= 14; k++) {
      const x = Math.min(x1 - w / 2, Math.max(x0 + w / 2, ax + k * (w / 2 + 0.05) / 14));
      if (Math.abs(x - ax) > w / 2 + 0.05 + 1e-6) continue;
      let y = ay - 0.016 - th / 2, r = [x - w / 2, y - th / 2, x + w / 2, y + th / 2];
      for (let m = 0; m < 8; m++) {
        const q = done.find((o) => ov(r, o, G) || segHit(seg(o, o[4], o[5]), r, 0.006)) ?? offs.find((o) => ov(r, o, 0.006));
        if (!q) break; y = q[1] - G - th / 2; r = [x - w / 2, y - th / 2, x + w / 2, y + th / 2];
      }
      const span = inner.some((q) => q > r[0] - 0.008 && q < r[2] + 0.008), g = seg(r, ax, ay), cross = done.some((o) => segHit(g, o, 0.006)) || others.some((o) => segHit(g, o, 0));
      const cost = (ay - 0.016 - th / 2 - y) + 0.4 * Math.abs(x - ax) + 0.3 * Math.max(0, Math.abs(x - ax) - (w / 2 - 0.03)) + (span ? 0.5 : 0) + (cross ? 1 : 0);
      if (!best || cost < best.cost - 1e-9) best = { cost, cross, r: [...r, ax, ay] };
    }
    const high = best.r[1] < y0;   // above the title-safe top (a tower as tall as the frame)
    if (avoid.length || high) for (const sd of [-1, 1]) {   // beside its own top (a tall tower whose top sits under a face or near the frame top): plate just under the top, beside the column, no line
      const x = ax + sd * (w / 2 + 0.018), y = ay + th / 2 + 0.004, r = [x - w / 2, y - th / 2, x + w / 2, y + th / 2];
      if (r[0] < x0 || r[2] > x1 || done.some((o) => ov(r, o, G) || segHit(seg(o, o[4], o[5]), r, 0.006)) || offs.some((o) => ov(r, o, 0.006))) continue;
      const cost = 0.12 + (inner.some((q) => q > r[0] - 0.008 && q < r[2] + 0.008) ? 0.5 : 0);
      if (best.cross || high || avoid.some((f) => ov(best.r, f, 0.015)) ? !avoid.some((f) => ov(r, f, 0.015)) && r[1] >= y0 : cost < best.cost - 1e-9) best = { cost, cross: false, r: [...r, ax, ay] };
    }
    if (best.cross) bad = true;
    out[i] = best.r; done.push(best.r);
  }
  out.bad = bad;
  return out;
}
const CANDS = [[0, 0], [0, -1.1], [-0.62, -0.45], [0.62, -0.45], [-0.62, 0.55], [0.62, 0.55], [0, -2.2], [-1.15, -1.1], [1.15, -1.1], [-1.2, 0.6], [1.2, 0.6],
  [0, -3.3], [-1.7, -2.2], [1.7, -2.2], [-2.0, 0.2], [2.0, 0.2], [-1.2, 2.0], [1.2, 2.0], [0, -4.4], [-2.4, -1.2], [2.4, -1.2], [0, 3.0]];

/**
 * makeTags(K, { worldOf(anchor, state) -> Vector3|null, coinRadius(anchor, state) -> metres, screen?, hook? }) -> { set(state), layout(t, cam, lens) }
 * set(state) stores what to show; layout runs per sub-frame (camera known): in K.onFrame unless hook === false (then the caller runs it,
 * before any other numberTag hook). screen = { rects: Map(actor key -> {x0,y0,x1,y1}), focus: rect[], avoid: rect[] } from the object layer.
 */
export function makeTags(K, { worldOf, coinRadius, screen = null, hook = true }) {
  const pools = new Map(), used = new Map();
  let want = [], counter = null, total = null, band = null, kingOn = null;
  let prevAt = null;   // last frame's tag centres by text (Host hysteresis)
  const stackSide = new Map();   // Macro: the side each stacked count group sits on (line -> +1 right / -1 left), kept unless the other side is clearly freer
  const PX = 160, H0 = 0.01;
  const get = (key) => {
    if (!pools.has(key)) pools.set(key, []);
    const pool = pools.get(key), n = used.get(key) ?? 0; used.set(key, n + 1);
    if (n < pool.length) return pool[n];
    const tg = K.kit.numberTag(' ', { height: H0, color: HEX[key] ?? '#ffffff', overlay: true, outline: 0.08, plate: 0.62, px: PX, gain: 1.35, shadow: 0.9 });
    tg.opacity = 0; K.scene.add(tg); pool.push(tg); return tg;
  };
  // leader lines: thin camera-facing bars on the sharp layer
  const leaders = [];
  const leaderMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const getLeader = (i) => { while (leaders.length <= i) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leaderMat()); m.layers.set(1); m.renderOrder = 95; m.frustumCulled = false; m.visible = false; K.scene.add(m); leaders.push(m); } return leaders[i]; };
  const cx = new THREE.Vector3(), cy = new THREE.Vector3(), cz = new THREE.Vector3(), v = new THREE.Vector3();
  const project = (p, cam) => { v.copy(p).project(cam); if (v.z > 1 || v.z < -1) return null; return [0.5 + 0.5 * v.x, 0.5 - 0.5 * v.y]; };
  const at = (out, sx, sy, d, cam, th) => out.copy(cam.position).addScaledVector(cz, -d).addScaledVector(cx, (sx - 0.5) * 2 * d * th * K.W / K.H).addScaledVector(cy, (0.5 - sy) * 2 * d * th);
  const place = (tg, sx, sy, frac, cam, fov, pop, op) => {
    cam.matrixWorld.extractBasis(cx, cy, cz);
    const th = Math.tan(fov * Math.PI / 360), d = H0 / (2 * frac * th) * 0.98;
    at(tg.position, sx, sy, d, cam, th);
    tg.pop = 1 + 0.22 * pop; tg.opacity = op;
  };
  const line = (i, x0, y0, x1, y1, op, cam, fov, thick = 1) => {
    const m = getLeader(i), th = Math.tan(fov * Math.PI / 360), d = 0.05, a = new THREE.Vector3(), b = new THREE.Vector3();
    cam.matrixWorld.extractBasis(cx, cy, cz); at(a, x0, y0, d, cam, th); at(b, x1, y1, d, cam, th);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.copy(cam.quaternion);
    const dx = (x1 - x0) * K.W / K.H, dy = y0 - y1;   // screen units of frame height
    m.rotateZ(Math.atan2(dy, dx)); m.scale.set(a.distanceTo(b), 2 * d * th * 0.0042 * thick, 1);
    m.material.opacity = op * 0.85; m.visible = op > 0.01;
  };
  /** plate size on screen (fractions of width / height) */
  const sizeOf = (tg, frac) => { const img = tg.material.map.image, k = frac / (0.72 * PX); return [(img.width - 0.4 * PX) * k * K.H / K.W, 1.22 * PX * k]; };
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const area = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const keyOf = (an) => an.player != null ? 'p' + an.player : an.extra != null ? 'x' + an.extra : an.skeptic ? 'sk' : an.king && kingOn != null ? 'p' + kingOn : null;
  const R = (r, pad = 0) => [r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad];
  const ccw = (ax, ay, bx, by, cx, cy) => (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  const cross = (x0, y0, x1, y1, g) => ccw(x0, y0, g[0], g[1], g[2], g[3]) !== ccw(x1, y1, g[0], g[1], g[2], g[3]) && ccw(x0, y0, x1, y1, g[0], g[1]) !== ccw(x0, y0, x1, y1, g[2], g[3]);

  /** a tag's centre y moved out of the title band: above or below it, whichever side is free and nearer */
  const outOfBand = (y, th) => {
    if (!band || y + th / 2 <= band[0] || y - th / 2 >= band[1]) return y;
    const up = band[0] - th / 2 - 0.006, dn = band[1] + th / 2 + 0.006, upOk = up - th / 2 >= SAFE.y0, dnOk = dn + th / 2 <= SAFE.y1;
    return upOk && (!dnOk || y - up < dn - y) ? up : dn;
  };
  function layout(t, cam, lens) {
    for (const k of used.keys()) used.set(k, 0);
    for (const pool of pools.values()) for (const tg of pool) tg.opacity = 0;
    for (const m of leaders) m.visible = false;
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const named = [...(screen?.rects.values() ?? [])].filter((r) => r.named).map((r) => [...R(r), r]);
    const nextAt = new Map();
    const placed = [], avoid = (screen?.avoid ?? []).map((r) => R(r)), focus = (screen?.focus ?? []).map((r) => R(r, 0.004)), segs = [], order = [];   // order: [tag x, anchor x] of placed piece tags (l65: names keep the left-to-right order of their pawns)
    const content = [...(screen?.rects.values() ?? [])].filter((r) => r.y1 > 0 && r.y0 < 1 && r.x1 > 0 && r.x0 < 1).map((r) => R(r));   // every piece on screen
    const towers = [...(screen?.rects.values() ?? [])].filter((r) => r.y1 - r.y0 > 0.2 && r.x1 - r.x0 < 0.25 && r.y1 > 0 && r.y0 < 1).map((r) => [...R(r, 0.004), r]);   // tall pieces that stand out (a tower in a demo shot): no other piece's tag lies across them
    let cy0 = 0.075, nL = 0;
    for (const c of [counter, total]) if (c && c.opacity > 0.003) {   // fixed corner: top left, FLIPS EACH / WORLDS above TOTAL; one value per output frame, sharp
      const tg = get(c === total ? 'gold' : 'null'); tg.setText(c.text); const frac = 0.034, [w, h] = sizeOf(tg, frac), x = SAFE.x0 + w / 2, y = cy0 + h / 2 - 0.035;
      place(tg, x, y, frac, cam, lens.fov, 0, c.opacity); placed.push([x - w / 2, y - h / 2, x + w / 2, y + h / 2 + 0.01]); cy0 += h + 0.012;
    }
    // big ones first, then by anchor height on screen (the highest anchor takes the room above it first)
    const items = [];
    for (const w of want) {
      let ax, ay, side = 0;
      if (w.anchor.screen) { ax = w.anchor.screen[0]; ay = w.anchor.screen[1]; }
      else {
        const p = worldOf(w.anchor, w.state); if (!p) continue;
        const s = project(p, cam); if (!s) continue; [ax, ay] = s;
        if (w.anchor.coin) {   // the two coin sides: heads on the left of the coin, tails on the right
          const r = coinRadius(w.anchor, w.state), e = project(p.clone().addScaledVector(cx.setFromMatrixColumn(cam.matrixWorld, 0), r * 1.8), cam);
          side = w.anchor.side === 'tails' ? 1 : -1; ax += side * (e ? Math.abs(e[0] - ax) : 0.04);
        }
      }
      // Macro only (frame check r3, l36-l40): in a tally row (>= 3 chip columns side by side) every column's number sits UNDER the foot of
      // its own column, centred, no leader line: one row of labels that can only belong to the column above it
      const plinth = !screen?.avoid?.host && isRow(w.state) && w.anchor.chips != null && !w.anchor.screen;
      if (plinth) { const b = worldOf(w.anchor, w.state, 'base'), q = b ? project(b, cam) : null; if (q) { ax = q[0]; ay = q[1]; } }
      const off = !plinth && !w.anchor.screen && (ay < SAFE.y0 || ax < 0 || ax > 1);   // the piece's top is out of frame (a tower taller than the shot)
      if (off) { ax = Math.min(0.97, Math.max(0.03, ax)); ay = Math.max(ay, SAFE.y0 + 0.02); }
      items.push({ w, ax, ay, side, off, plinth });
    }
    items.sort((a, b) => (a.w.size === 'l' ? 0 : 1) - (b.w.size === 'l' ? 0 : 1) || a.ay - b.ay || a.ax - b.ax);
    // a row of named pawns (l65 line-up): their names keep the pawns' left-to-right order, spread evenly, staggered in two rows above them
    const names = items.filter((it) => it.w.kind === 'name' && it.w.anchor.player != null && !it.off);
    // Host closing (screen.avoid.namesBelow, set by view-host for the l65 line-up with the captions off): every name UNDER its own pawn's
    // feet, on the table, centred on the pawn, one row when they fit else two staggered rows; no leader line. Macro never sets it.
    const advL = screen?.avoid?.host && screen.avoid.namesAbove && items.length ? screen.avoid.advTags : null;
    if (screen?.avoid?.host && screen.avoid.namesAbove && (names.length || advL?.length)) {   // Host c01 line-up (l04 / l05): every name right above its own pawn (namesAboveRows)
      names.sort((a, b) => a.ax - b.ax);
      // Host l04 (frame check 2026-11-16): the advantages ('55 in 100', '2x', '1,000 coins', 'nothing') of the four, ALL of them (view-host
      // lists the whole shot's), as one fixed block right above their own pawns (namesAboveRows): a tag never moves when the next one comes,
      // a short line or none. The names (one at a time in l04) then sit above that block, off its plates.
      let advR = [], advFull = [];
      if (advL?.length) {
        const k1 = new Map(used), asz = advL.map((a) => { const tg = get('null'); tg.setText(a.text); return sizeOf(tg, SIZE.m); });
        used.clear(); for (const [k, v] of k1) used.set(k, v);
        const sA = items[0].w.state, pidA = new Set(advL.map((a) => a.player)), hopA = (h) => ({ ...sA, players: (sA.players ?? []).map((p) => (pidA.has(p.id) ? { ...p, hop: h } : p)) });
        const pkA = hopA(1), rsA0 = hopA(0), scrA = (an, s2) => { const p = worldOf(an, s2); return p ? project(p, cam) : null; };
        const tpA = advL.map((a) => (a.top ? project(a.top, cam) : null) ?? scrA({ player: a.player }, pkA)), trA = advL.map((a) => scrA({ player: a.player }, rsA0));
        if (tpA.every(Boolean)) {
          const colsA = advL.map((a, i) => { const q = screen.rects.get('p' + a.player); return [tpA[i][0] - 0.03, tpA[i][1], tpA[i][0] + 0.03, q ? q.y1 : tpA[i][1] + 0.2]; });
          advR = namesAboveRows(tpA, asz.map((q) => q[0]), Math.max(...asz.map((q) => q[1])), { x0: SAFE.x0, x1: SAFE.x1, cols: colsA, keep: screen.avoid.keepOut ?? [] });
          for (const it of items) {
            if (it.w.kind === 'name' || it.w.anchor.screen || it.w.anchor.player == null) continue;
            const j = advL.findIndex((a) => a.text === it.w.text && a.player === it.w.anchor.player); if (j < 0) continue;
            const r = advR[j]; it.bx = (r[0] + r[2]) / 2; it.by = (r[1] + r[3]) / 2; if (trA[j]) { it.ax = trA[j][0]; it.ay = trA[j][1]; }
          }
          // the names keep off the plates that show now and off their own pawn's slot (a slot still empty may hold a name for a moment:
          // the Heir's name while his tower grows past it)
          const showing = new Set(items.filter((it) => it.w.kind !== 'name' && !it.w.anchor.screen && it.w.anchor.player != null).map((it) => it.w.text + '|' + it.w.anchor.player));
          const nameP = new Set(names.map((n) => n.w.anchor.player));
          advFull = advR.map((r) => [r[0], r[1], r[2], r[3]]);
          advR = advFull.filter((r, j) => showing.has(advL[j].text + '|' + advL[j].player) || nameP.has(advL[j].player));
        } else advR = [];
      }
      if (!names.length) { items.sort((a, b) => (a.bx != null ? 0 : 1) - (b.bx != null ? 0 : 1)); }
      else {
      const keep = new Map(used), sz = names.map((n) => { const tg = get(n.w.color ?? 'null'); tg.setText(n.w.text); return sizeOf(tg, SIZE[n.w.size] ?? SIZE.m); });
      used.clear(); for (const [k, v] of keep) used.set(k, v);
      const th = Math.max(...sz.map((q) => q[1])), st0 = names[0].w.state, ids = new Set(names.map((n) => n.w.anchor.player));
      const hopTo = (h) => ({ ...st0, players: (st0.players ?? []).map((p) => (ids.has(p.id) ? { ...p, hop: h } : p)) });
      const pk = hopTo(1), rest = hopTo(0), scr = (an, s2) => { const p = worldOf(an, s2); return p ? project(p, cam) : null; };
      const tp = names.map((n) => scr(n.w.anchor, pk) ?? [n.ax, n.ay]), tr = names.map((n) => scr(n.w.anchor, rest) ?? [n.ax, n.ay]);   // hop-peak top (the name never moves when a pawn hops) / rest top (its line)
      const keys = names.map((n) => keyOf(n.w.anchor));
      const cols = names.map((n, i) => { const q = screen.rects.get(keys[i]); return [tp[i][0] - 0.03, tp[i][1], tp[i][0] + 0.03, q ? q.y1 : tp[i][1] + 0.2]; });   // a thin column under its top (as view-host replays it)
      // 3+ names together (l05): only their own columns (time-invariant, as view-host replays them), so the block never shifts mid-shot
      const extra = names.length >= 3 ? [] : named.filter((q) => !keys.includes(q[4].key)).map((q) => { const m = (q[0] + q[2]) / 2; return [m - 0.03, q[1], m + 0.03, q[3]]; });
      const rs = namesAboveRows(tp, sz.map((q) => q[0]), th, { x0: SAFE.x0, x1: SAFE.x1, cols, extra, keep: (screen.avoid.keepOut ?? []).concat(advR) });   // keepOut: the flipping coin's path (view-host); advR: the l04 advantage block
      names.forEach((it, i) => { const r = rs[i]; it.bx = (r[0] + r[2]) / 2; it.by = (r[1] + r[3]) / 2; it.ax = tr[i][0]; it.ay = tr[i][1]; });
      if (advFull.length) names.forEach((it) => {   // l04: a name stacked right on its own (shown) advantage needs no line through it
        const j = advL.findIndex((a) => a.player === it.w.anchor.player), q = j >= 0 ? advFull[j] : null, h = th / 2;
        if (q && items.some((o) => o !== it && o.w.anchor.player === it.w.anchor.player && o.w.kind !== 'name' && !o.w.anchor.screen) && it.bx > q[0] - 0.02 && it.bx < q[2] + 0.02 && it.by + h <= q[1] + 0.002 && it.by + h > q[1] - 0.04) it.noLine = true;
      });
      // a big free-standing line tag ('PICK ONE') takes a fixed free corner (view-host keeps one of these free of faces and names)
      for (const it of items) if (it.w.anchor.screen && it.bx == null && it.w.size === 'l') {
        const k0 = new Map(used), tg = get(it.w.color ?? 'null'); tg.setText(it.w.text); const [tw, tq] = sizeOf(tg, SIZE.l); used.clear(); for (const [k, v] of k0) used.set(k, v);
        for (const [px, py] of [[0.5, 0.125], [0.195, 0.185], [0.805, 0.125], [0.195, 0.65], [0.805, 0.65]]) {   // view-host PICK_SPOTS centres
          const x = Math.min(SAFE.x1 - tw / 2, Math.max(SAFE.x0 + tw / 2, px)), r = [x - tw / 2, py - tq / 2, x + tw / 2, py + tq / 2];
          if (rs.some((q) => hit(r, [q[0] - 0.015, q[1] - 0.015, q[2] + 0.015, q[3] + 0.015])) || placed.some((q) => hit(r, q)) || avoid.some((q) => area(r, q) > 0.3 * tw * tq) || cols.some((q) => hit(r, [q[0] - 0.04, q[1] - 0.01, q[2] + 0.04, q[3] + 0.01])) || (screen.avoid.keepOut ?? []).some((q) => hit(r, q))) continue;
          it.bx = x; it.by = py; it.noLine = true; break;
        }
      }
      items.sort((a, b) => (a.bx != null ? 0 : 1) - (b.bx != null ? 0 : 1));   // the fixed names first: the other tags keep off them
      }
    } else if (screen?.avoid?.namesBelow && names.length) {
      names.sort((a, b) => a.ax - b.ax);
      const keep = new Map(used), sz = names.map((n) => { const tg = get(n.w.color ?? 'null'); tg.setText(n.w.text); return sizeOf(tg, SIZE[n.w.size] ?? SIZE.m); });
      used.clear(); for (const [k, v] of keep) used.set(k, v);
      const maxW = Math.max(...sz.map((q) => q[0])), th = Math.max(...sz.map((q) => q[1])), gap = 0.02;
      const footOf = (it) => { const p = worldOf(it.w.anchor, it.w.state), f = p ? project(new THREE.Vector3(p.x, 0, p.z), cam) : null; return f ?? [it.ax, it.ay + 0.1]; };   // the pawn's foot on the table, this camera
      const fts = names.map(footOf);
      if (!screen.avoid.host) names.forEach((it, i) => { const q = screen.rects.get(keyOf(it.w.anchor)); if (q) fts[i] = [fts[i][0], Math.max(fts[i][1], q.y1)]; });   // Macro: the line-up stands on the table below the board edge: its real foot is the bottom of the pawn's screen rect
      const feet = Math.max(...fts.map((f) => f[1])), xs = fts.map((f) => f[0]);
      const sp = names.length > 1 ? Math.min(...xs.slice(1).map((x, i) => x - xs[i])) : 1, rows = sp >= maxW + gap ? 1 : 2;
      const y0 = Math.min(feet + 0.016, 0.95 - (rows === 2 ? 2 * th + 0.014 : th));   // the rows move as one block: never one onto the other
      names.forEach((it, i) => { it.bx = Math.min(SAFE.x1 - sz[i][0] / 2, Math.max(SAFE.x0 + sz[i][0] / 2, xs[i])); it.by = y0 + th / 2 + (rows === 2 && i % 2 === 1 ? th + 0.014 : 0); it.noLine = true; });
    } else if (!screen?.avoid?.host && names.length >= 3 && Math.max(...names.map((n) => n.ay)) - Math.min(...names.map((n) => n.ay)) < 0.12) {
      names.sort((a, b) => a.ax - b.ax);
      const keep = new Map(used), sz = names.map((n) => { const tg = get(n.w.color ?? 'null'); tg.setText(n.w.text); return sizeOf(tg, SIZE[n.w.size] ?? SIZE.m); });
      used.clear(); for (const [k, v] of keep) used.set(k, v);
      const n = names.length, maxW = Math.max(...sz.map((q) => q[0])), th = Math.max(...sz.map((q) => q[1])), gap = 0.02;
      const rows = (maxW + gap) * n > 0.88 ? 2 : 1, step = rows === 2 ? (maxW + gap) / 2 : maxW + gap;
      let x0 = names.reduce((a, b) => a + b.ax, 0) / n - step * (n - 1) / 2;
      x0 = Math.min(SAFE.x1 - maxW / 2 - step * (n - 1), Math.max(SAFE.x0 + maxW / 2, x0));
      const top = Math.min(...names.map((q) => q.ay));
      const sp = Math.min(...names.slice(1).map((q, i) => q.ax - names[i].ax)), aligned = rows === 2 && 2 * sp >= maxW + gap + 0.01;   // pawns far enough apart: each name straight above its own pawn, alternate rows
      names.forEach((it, i) => { it.bx = aligned ? it.ax : x0 + i * step; it.by = top - 0.016 - th / 2 - (rows === 2 && i % 2 === 0 ? th + 0.014 : 0); });
      // the name rows move as ONE block (never one row onto the other): out of the title band, inside title safe
      const hiY = Math.min(...names.map((q) => q.by)) - th / 2, loY = Math.max(...names.map((q) => q.by)) + th / 2;
      let dy = Math.max(0, SAFE.y0 - hiY);
      if (band && hiY + dy < band[1] && loY + dy > band[0]) dy = band[0] <= SAFE.y0 ? band[1] + 0.006 - hiY : Math.min(dy, band[0] - 0.006 - loY);
      if (loY + dy > SAFE.y1) dy = SAFE.y1 - loY;
      for (const q of names) q.by += dy;
    }
    // Macro only (frame check r3, l38): the long tags of the pawns in a tally row ('under 10 coins: 70 in 100') share ONE row just above the
    // hat line, side by side in the pawns' left-to-right order, each as near its own pawn as the row allows (short vertical leader lines)
    const longs = screen?.avoid?.host ? [] : items.filter((it) => isRow(it.w.state) && it.w.anchor.player != null && !it.off && (it.w.text ?? '').length >= 14);
    if (longs.length) {
      longs.sort((a, b) => a.ax - b.ax);
      const keep = new Map(used), sz = longs.map((n) => { const tg = get(n.w.color ?? 'null'); tg.setText(n.w.text); return sizeOf(tg, SIZE[n.w.size] ?? SIZE.m); });
      used.clear(); for (const [k, v] of keep) used.set(k, v);
      const th = Math.max(...sz.map((q) => q[1])), top = Math.min(...longs.map((q) => q.ay), ...named.map((q) => q[1]));
      const y = Math.max(SAFE.y0 + th / 2, top - 0.03 - th / 2), xs = longs.map((q) => q.ax), n = longs.length;
      for (let i = 1; i < n; i++) xs[i] = Math.max(xs[i], xs[i - 1] + (sz[i - 1][0] + sz[i][0]) / 2 + 0.02);
      const one = xs[n - 1] + sz[n - 1][0] / 2 <= SAFE.x1 + 1e-6 || n === 1;
      if (one) {
        const under = SAFE.x0 - (xs[0] - sz[0][0] / 2); if (under > 0) for (let i = 0; i < n; i++) xs[i] += under;
        longs.forEach((it, i) => { it.bx = Math.min(SAFE.x1 - sz[i][0] / 2, xs[i]); it.by = y; });
      } else {
        // too wide side by side (two 'under 10 coins' tags are ~0.45 of the width each): staggered rows, the leftmost pawn's tag on top;
        // every tag spans its own pawn (a straight drop line), and each lower tag starts right of the drop lines of the tags above it
        longs.forEach((it, i) => {
          const w = sz[i][0], L = i ? Math.max(longs[i - 1].ax + 0.035, Math.min(it.ax - w / 2, SAFE.x1 - w)) : Math.min(SAFE.x1 - w, Math.max(SAFE.x0, it.ax - w / 2));
          it.bx = Math.min(SAFE.x1 - w / 2, L + w / 2); it.by = y - (n - 1 - i) * (th + 0.016);
        });
        const lift = SAFE.y0 + th / 2 - longs[0].by; if (lift > 0) for (const it of longs) it.by += lift;
      }
    }
    // Macro only (frame check r2, 2026-11-15; the Host sets avoid.host and keeps its rules): the head + hat of every named pawn
    // (top of its rect, centred), and the heads under the other tags' anchors; leader lines never cross a hat or another tag
    const mac = !screen?.avoid?.host;
    const hats = mac ? named.map((q) => { const c = (q[0] + q[2]) / 2, hw = Math.min((q[2] - q[0]) / 2, 0.03); return [c - hw, q[1], c + hw, q[4].pawnY != null ? Math.max(q[1] + 0.03, Math.min(q[3], q[4].pawnY)) : q[1] + Math.min(0.1, 0.4 * (q[3] - q[1])), q[4]]; }) : [];
    const heads = mac ? items.filter((it) => !it.w.anchor.screen && !it.off && it.w.anchor.coin == null).map((it) => [it.ax - 0.03, it.ay - 0.01, it.ax + 0.03, it.ay + 0.09, it]) : [];
    // Macro (frame check r3, l45a): a piece that carries its own tag is never covered by a neighbour's tag (the 1 % label lay across the 90 % tower)
    const tagged = new Set(mac ? items.filter((it) => !it.w.anchor.screen).map((it) => keyOf(it.w.anchor)).filter(Boolean) : []);
    const taggedR = mac ? [...(screen?.rects.values() ?? [])].filter((q) => tagged.has(q.key) && q.y1 > 0 && q.y0 < 1).map((q) => [...R(q, 0.006), q]) : [];
    // Macro only (frame check r6, l51): big count tags of one line set side by side on screen ('9 above' | '55 below', + '36 under one coin')
    // stack in ONE column at the freer side of the frame, top down from title safe, size m, no leader lines, in the order they were said:
    // never across the tall subject (the giant tower), never near the captions, never on each other. Only a line with an off-centre screen tag.
    if (mac) {
      const cnt = (it) => it.bx == null && it.w.size === 'l' && (it.w.color === 'good' || it.w.color === 'bad') && it.w.kind !== 'name';
      const lines = new Set(items.filter((it) => cnt(it) && it.w.anchor.screen && Math.abs(it.w.anchor.screen[0] - 0.5) > 0.1).map((it) => it.w.line));
      for (const ln of lines) {
        const grp = items.filter((it) => cnt(it) && it.w.line === ln).sort((a, b) => want.indexOf(a.w) - want.indexOf(b.w));
        const keep = new Map(used), sz = grp.map((n) => { const tg = get(n.w.color ?? 'null'); tg.setText(n.w.text); return sizeOf(tg, SIZE.m); });
        used.clear(); for (const [k, v] of keep) used.set(k, v);
        const th = Math.max(...sz.map((q) => q[1])), cw = Math.max(0.3, ...sz.map((q) => q[0])), gp = 0.018, H3 = 3 * th + 2 * gp;
        const sideCost = (s) => { const r = s > 0 ? [SAFE.x1 - cw, SAFE.y0, SAFE.x1, SAFE.y0 + H3] : [SAFE.x0, SAFE.y0, SAFE.x0 + cw, SAFE.y0 + H3]; let c = 0;
          for (const q of towers) c += 4 * area(r, q); for (const q of named) c += 2 * area(r, q); for (const q of focus) c += 3 * area(r, q); for (const q of content) c += area(r, q); return c; };
        const cR = sideCost(1), cL = sideCost(-1), prev = stackSide.get(ln);
        const s = prev != null && (prev > 0 ? cR : cL) <= 1.3 * (prev > 0 ? cL : cR) + 0.002 ? prev : cR <= cL ? 1 : -1; stackSide.set(ln, s);
        let y = SAFE.y0;
        for (const q of placed) if ((s > 0 ? q[2] > SAFE.x1 - cw : q[0] < SAFE.x0 + cw) && q[1] < SAFE.y0 + H3) y = Math.max(y, q[3] + 0.012);   // under the corner counter
        grp.forEach((it, i) => { it.bx = s > 0 ? SAFE.x1 - sz[i][0] / 2 : SAFE.x0 + sz[i][0] / 2; it.by = y + th / 2 + i * (th + gp); it.noLine = true; it.frac = SIZE.m; });
      }
      if (lines.size) items.sort((a, b) => (a.bx != null ? 0 : 1) - (b.bx != null ? 0 : 1));   // the stacked tags first: the other tags ('71%') keep off them
    }
    const segHits = (x0, y0, x1, y1, q) => { for (let k = 0; k <= 16; k++) { const sx = x0 + (x1 - x0) * k / 16, sy = y0 + (y1 - y0) * k / 16; if (sx > q[0] && sx < q[2] && sy > q[1] && sy < q[3]) return true; } return false; };
    for (const it of items) {
      const { w, ax, ay, side, off, plinth } = it; let { bx, by, noLine } = it;
      const tg = get(w.color ?? 'null'); tg.setText(w.text);
      const frac = it.frac ?? SIZE[w.size] ?? SIZE.m, [tw, th] = sizeOf(tg, frac), gap = w.anchor.screen ? 0.014 : 0.02;   // a clear gap over a hat (l47 the Scholar's cap)
      if (plinth) { bx = Math.min(SAFE.x1 - tw / 2, Math.max(SAFE.x0 + tw / 2, ax)); by = Math.min(SAFE.y1 - th / 2, ay + 0.012 + th / 2); noLine = true; }   // under its column's foot
      const own = !w.anchor.screen ? screen?.rects.get(keyOf(w.anchor)) : null, ownR = own ? R(own, 0.003) : null, ownF = own ? focus[(screen?.focus ?? []).indexOf(own)] : null;
      if (mac && bx == null && w.anchor.skeptic && w.kind === 'name' && w.state?.shot?.kind === 'skeptic') {   // frame check r3 (l31): the Skeptic's name sits right on its head, no line, when that spot is free
        const sy = ay - gap - th / 2, sx = Math.min(SAFE.x1 - tw / 2, Math.max(SAFE.x0 + tw / 2, ax)), q0 = [sx - tw / 2, sy - th / 2, sx + tw / 2, sy + th / 2];
        if (q0[1] >= SAFE.y0 && !(band && q0[3] > band[0] && q0[1] < band[1]) && !hats.some((q) => q[4] !== own && hit(q0, q)) && !focus.some((q) => q !== ownF && hit(q0, q)) && !placed.some((q) => hit(q0, q))) { bx = sx; by = sy; noLine = true; }
      }
      const base = bx != null ? [bx, by] : w.anchor.screen ? [ax, ay + th / 2 + gap] : side ? [ax + side * (tw / 2 + gap), ay] : [ax, ay - th / 2 - gap];
      let cands = bx != null ? [[0, 0]] : side ? [[0, 0], [0, -1.1], [0, 1.1], [side * 0.5, -2.2], [side * 0.5, 2.2]] : CANDS;
      if (bx == null && !side && !w.anchor.screen && screen?.avoid?.host && (w.text ?? '').length >= 14) {   // Host (l38): a long tag may also take a free spot low in the frame (the near board / table), not only the offsets around its piece
        const ex = []; for (const gy of [0.38, 0.44, 0.5, 0.56, 0.62, 0.68]) for (const gx of [0.22, 0.36, 0.5, 0.64, 0.78]) ex.push([(gx - base[0]) / (tw + gap), (gy - base[1]) / (th + gap)]);
        cands = CANDS.concat(ex);
      }
      let best = null, bestCost = Infinity;
      for (let i = 0; i < cands.length; i++) {
        let x = base[0] + cands[i][0] * (tw + gap), y = base[1] + cands[i][1] * (th + gap);
        x = Math.min(SAFE.x1 - tw / 2, Math.max(SAFE.x0 + tw / 2, x));
        if (bx == null) y = Math.min(SAFE.y1 - th / 2, Math.max(SAFE.y0 + th / 2, y));
        if (band && bx == null) y = outOfBand(y, th);
        const r = [x - tw / 2, y - th / 2, x + tw / 2, y + th / 2], A = tw * th;
        let cost = i * 0.004 + Math.hypot(x - base[0], (y - base[1]) * 0.8);
        for (const q of placed) if (hit(r, [q[0] - 0.014, q[1] - 0.012, q[2] + 0.014, q[3] + 0.012])) cost += screen?.avoid?.host ? 40 : 10;   // Host: the face / body rects (listed several times) outweighed 10, so names stacked on each other (l05)   // never touching another tag
        if (w.anchor.screen || off || (screen?.avoid?.host && (w.text ?? '').length >= 14)) { let c = 0; for (const q of content) c += area(r, q); cost += 3 * Math.min(1.5, c / A); }   // Host (2026-11-15, l38): a long piece tag ('under 10 coins: 70 in 100') also takes free space, never the pawn row   // a free-standing tag sits in free space (beside the board, not on the towers)
        if (!w.anchor.screen && !off) for (const [ox, oa, ok] of order) if (Math.abs(oa - ax) > 0.01 && (oa - ax) * (ox - x) < 0 && !(mac && ok != null && ok === keyOf(w.anchor))) cost += 4;   // Macro: two tags of the SAME piece have no order (l15 '27' / '#56')
        if (!(w.anchor.screen || off) && segs.length) {   // its leader line must not cross another one (l11d)
          const ex = Math.min(r[2], Math.max(r[0], ax)), ey = Math.min(r[3], Math.max(r[1], ay));
          for (const g of segs) if (cross(ex, ey, ax, ay, g)) cost += 3;
          for (const g of segs) if (hit(r, [Math.min(g[0], g[2]), Math.min(g[1], g[3]), Math.max(g[0], g[2]), Math.max(g[1], g[3])]) && cross(r[0], r[1], r[2], r[3], g) ) cost += 1;
        }
        for (const q of avoid) cost += 8 * area(r, q) / A + (hit(r, q) ? 2 : 0);
        if (avoid.length && !w.anchor.screen && !off) {   // frame check 2026-11-15 (Host): its leader line stays off the avoid rects too (faces are listed three times by view-host)
          const ex = Math.min(r[2], Math.max(r[0], ax)), ey = Math.min(r[3], Math.max(r[1], ay));
          if (Math.hypot((ex - ax) * K.W / K.H, ey - ay) > 0.05) for (const q of avoid) { if (ax > q[0] && ax < q[2] && ay > q[1] && ay < q[3]) continue; for (let k = 1; k < 16; k++) { const sx = ex + (ax - ex) * k / 16, sy = ey + (ay - ey) * k / 16; if (sx > q[0] && sx < q[2] && sy > q[1] && sy < q[3]) { cost += 5; break; } } }
        }
        if (ownR) cost += 6 * Math.max(0, area(r, ownR) / A - 0.12);
        if (ownR && !side && hit(r, [ownR[0], ay + 0.012, ownR[2], ownR[3]])) cost += 0.5 + 4 * area(r, [ownR[0], ay + 0.012, ownR[2], ownR[3]]) / A;   // never across the body of the piece it labels (l08: '1/5 of the smaller stack' on the 100 pawn)
        // Macro (l15): a tag right at its own pawn (no leader line) may lie on the body of a piece standing BEHIND that pawn (the Fool in front of the
        // Scholar's tower), never on that piece's head / hat
        const near = mac && own && !w.anchor.screen && !off && bx == null && Math.hypot((Math.min(r[2], Math.max(r[0], ax)) - ax) * K.W / K.H, Math.min(r[3], Math.max(r[1], ay)) - ay) <= 0.05;
        const behind = (o) => !!(near && o && o.d > own.d + 0.02);
        if (mac && !w.anchor.screen) for (const q of hats) if (q[4] !== own && hit(r, [q[0] - 0.012, q[1] - 0.012, q[2] + 0.012, q[3] + 0.012])) cost += 6 + 3 * area(r, q) / A;   // never on another named pawn (head to foot): l15 '27' on the Scholar standing behind the Fool
        focus.forEach((q, j) => { if (q !== ownF && !behind(screen.focus[j])) cost += 3 * area(r, q) / A + (hit(r, q) ? 0.25 : 0); });   // never across another piece the line is about (l45a: the 1 % label lay across the 90 % tower)
        for (const q of named) if (q[4] !== own && !behind(q[4])) cost += 2 * area(r, q) / A;
        if (!w.anchor.screen) for (const q of towers) if (q[4] !== own && !behind(q[4]) && !(mac && !q[4].named && !tagged.has(q[4].key) && !(screen?.focus ?? []).includes(q[4])) && hit(r, q)) cost += 0.35 + 3 * area(r, q) / A;   // never on another named / lit piece (l15: '27' read as the Scholar's)
        if (!w.anchor.screen && !side && !ownR && hit(r, [ax - tw * 0.18, ay - 0.004, ax + tw * 0.18, ay + 0.2])) cost += 4;   // never on the subject under the anchor
        if (mac) {
          if (!w.anchor.screen) for (const q of taggedR) if (q[4] !== own && !behind(q[4]) && hit(r, q)) cost += 1.5 + 4 * area(r, q) / A;          for (const q of placed) if (hit(r, [q[0] - 0.02, q[1] - 0.02, q[2] + 0.02, q[3] + 0.02])) cost += 4;   // l38: two long tags stacked with no air between them
          for (const g of segs) if (segHits(g[0], g[1], g[2], g[3], r)) cost += 6;   // l38 / l49: no tag on another tag's leader line
          for (const q of heads) if (q[4] !== it && keyOf(q[4].w.anchor) !== keyOf(w.anchor) && hit(r, q)) cost += 3;   // l08: never on the head of another tagged piece
          if (w.anchor.screen) for (const q of named) if (hit(r, [q[0] - 0.01, q[1] - 0.025, q[2] + 0.01, q[3]])) cost += 1 + 3 * area(r, q) / A;   // l51 / l47: a free-standing tag stays off the lit / named pieces
          if (!w.anchor.screen && !off && bx == null) {
            const ex = Math.min(r[2], Math.max(r[0], ax)), ey = Math.min(r[3], Math.max(r[1], ay));
            if (Math.hypot((ex - ax) * K.W / K.H, ey - ay) > 0.05) {   // its leader line: through no other tag (l38 '<1', l49 '150') and over no other hat (l15: '#56' ended on the Scholar's cap)
              for (const q of placed) if (segHits(ex, ey, ax, ay, [q[0] - 0.006, q[1] - 0.006, q[2] + 0.006, q[3] + 0.006])) cost += 6;
              for (const q of hats) if (q[4] !== own && !(ax > q[0] && ax < q[2] && ay > q[1] && ay < q[3]) && segHits(ex, ey, ax, ay, [q[0] - 0.01, q[1] - 0.01, q[2] + 0.01, q[3]])) cost += 6;
            }
          }
        }
        if (prevAt && screen?.avoid?.host) { const pv = prevAt.get(w.text); if (pv) cost += 0.6 * Math.min(1, Math.hypot(x - pv[0], y - pv[1]) / 0.08); }   // Host: a tag keeps its place from the last frame unless it must move (ghost names l05, jumping '53 no' l60)
        if (cost < bestCost) { bestCost = cost; best = [x, y, r]; }
        if (cost < 0.02) break;
      }
      place(tg, best[0], best[1], frac, cam, lens.fov, w.pop ?? 0, w.opacity); placed.push(best[2]); nextAt.set(w.text, [best[0], best[1]]); if (!w.anchor.screen && !side) order.push([best[0], ax, keyOf(w.anchor)]);
      // a tag moved away from its piece points back at it
      if (!w.anchor.screen && !off && !noLine) {
        const r = best[2], ex = Math.min(r[2], Math.max(r[0], ax)), ey = Math.min(r[3], Math.max(r[1], ay)), dist = Math.hypot((ex - ax) * K.W / K.H, ey - ay);
        if (dist > 0.05) { segs.push([ex, ey, ax, ay]); const k = 0.006 / dist; line(nL++, ex, ey, ax + (ex - ax) * k, ay + (ey - ay) * k, w.opacity, cam, lens.fov); line(nL++, ax - 0.005 * K.H / K.W, ay, ax + 0.005 * K.H / K.W, ay, w.opacity, cam, lens.fov, 2.6); }
      }
    }
    prevAt = nextAt;
  }
  /** more than three tags with the same text on players (l01: five '100'): keep three, as far apart on the board as possible */
  function thin(list, state) {
    const groups = new Map(); for (const g of list) if (g.anchor?.player != null) { const k = g.text; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(g); }
    const drop = new Set();
    for (const gs of groups.values()) if (gs.length > 3) {
      const pos = (g) => state.players?.[g.anchor.player]?.at ?? { f: 0, r: 0 }, keep = [gs[0]];
      while (keep.length < 3) { let best = null, bd = -1; for (const g of gs) { if (keep.includes(g)) continue; const p = pos(g), d = Math.min(...keep.map((q) => { const o = pos(q); return Math.hypot(o.f - p.f, (o.r - p.r) * 1.6); })); if (d > bd) { bd = d; best = g; } } keep.push(best); }
      for (const g of gs) if (!keep.includes(g)) drop.add(g);
    }
    return drop.size ? list.filter((g) => !drop.has(g)) : list;
  }
  if (hook) K.onFrame.push((t, cam, lens) => layout(t, cam, lens));
  return {
    /** what to show for this state: tags and counter (and whether the title band must stay clear) */
    set(state, on = true) {
      want = on ? thin((state.tags ?? []).filter((x) => x.opacity > 0.003), state).map((x) => ({ ...x, state })) : [];
      counter = on ? state.counter : null; total = on ? state.total ?? null : null;
      band = titleBand(state);
      kingOn = state.king?.on ?? null;
    },
    layout,
  };
}
