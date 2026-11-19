// Parable HOST look: the cast at the table and their performance, all as functions of t (pure), planned once from the score words and show.beats.
//   THE STORYTELLER: seated behind the board (far side, rank 8), faces the lens, speaks every line, acts the game with his hands.
//   THE SKEPTIC: a second seated puppet at the right side of the table (screen right in the front shots), listens and objects; never speaks.
// makeCast(K, show, objects) -> { teller, skeptic, update(state, t, cam), eyes(t), faceSkeptic(), tellerHead(t) }
import * as THREE from 'three';
import { makePuppet, LOOKS, hash } from './puppet.js';
import { tower, CAST } from './game.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k, smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const norm = (w) => String(w).toLowerCase().normalize('NFD').replace(/[^a-z0-9']/g, '');
const NUMW = /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|percent|half)/;
const SADW = /^(nothing|broke|gone|out|ugly|never|less|lost|lose|down|fall|fallen|nobody)$/;

export const SEATS = {
  teller: V(0, -0.25, -0.47),   // fix round 1: 3 cm lower (was -0.22) so the low two-shot holds his head AND a large board
  skeptic: { pos: V(0.5, 0, 0.03), face: V(-1, 0, 0.6) },   // fix round 1: closer to the board (was x 0.6) so a two-shot can hold her AND a large board   // root position and the direction she faces
};

export async function makeCast(K, show, objects) {
  const { scene } = K, TY = -0.029, E = K.ease;
  const teller = makePuppet(K, LOOKS.teller, { seat: SEATS.teller });
  const skeptic = makePuppet(K, LOOKS.skeptic, { seat: V(0, -0.22, 0), talk: false });
  skeptic.root.position.copy(SEATS.skeptic.pos); skeptic.root.rotation.y = Math.atan2(SEATS.skeptic.face.x, SEATS.skeptic.face.z);
  scene.add(teller.root, skeptic.root); skeptic.root.updateMatrixWorld(true);

  /* ------------------------------------------------------------------ the script: words, sentences, lines */
  const words = [];
  for (const l of K.score.lines ?? []) for (const w of l.words ?? []) words.push({ ...w, n: norm(w.w), line: l.id, end: /[.?!]$/.test(w.w), q: /\?$/.test(w.w) });
  const lineOf = Object.fromEntries((K.score.lines ?? []).map((l) => [l.id, l]));
  const W = (lineId, w, n = 0) => { const l = lineOf[lineId]; if (!l) return null; const m = (l.words ?? []).filter((x) => norm(x.w) === norm(w)); const x = n < 0 ? m[m.length + n] : m[n]; return x ? x.t0 : null; };
  const sentences = []; { let s = null; for (const w of words) { if (!s || s.line !== w.line) { if (s) sentences.push(s); s = { t0: w.t0, t1: w.t1, line: w.line, q: false, words: [] }; } s.words.push(w); s.t1 = w.t1; if (w.end) { s.q = w.q; sentences.push(s); s = null; } } if (s) sentences.push(s); }
  const D = K.duration;
  const calm = (K.score.chapters ?? []).filter((c) => c.mood === 'calm').map((c) => [c.t0, c.t1]);
  const inCalm = (t) => calm.some(([a, b]) => t >= a && t < b);
  const HARD = new Set(['l22', 'l38', 'l62', 'l63']);
  const beats = (show.beats ?? []).slice().sort((a, b) => a.t0 - b.t0);
  const S = (t) => show.state(clamp(t, 0, D));
  const AN = (anchor, st) => objects.anchor(anchor, st) ?? V(0, 0.03, 0);
  const A = (anchor, t) => AN(anchor, S(t));
  const playerTop = (i, st) => AN({ player: i }, st);
  // object shots (the camera is on the pieces): talking gestures stay at the table edge there, never across the picture
  const OBJK = new Set(['player', 'pair', 'tower', 'tally', 'demo', 'row', 'top', 'block', 'coin']), shotList = (show.shots ?? []).slice().sort((a, b) => a.t0 - b.t0);
  const shotAt = (t) => { let lo = 0, hi = shotList.length - 1, j = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (shotList[m].t0 <= t) { j = m; lo = m + 1; } else hi = m - 1; } return j >= 0 ? shotList[j] : (shotList.length ? null : S(t).shot); };
  const objShotAt = (t) => { const s = shotAt(t); return !!s && OBJK.has(s.kind); };
  /** how long an objection is acted: at least 3.6 s, and while the Skeptic's own shot holds (max 9 s) */
  const objEnd = (b) => { const s0 = shotAt(b.t0 + 0.4); let e = Math.max(b.t1 ?? b.t0 + 1.5, b.t0 + 3.6); if (s0 && s0.kind === 'skeptic') e = Math.max(e, Math.min(s0.t1 - 0.4, b.t0 + 9)); return e; };

  /* ------------------------------------------------------------------ teller: hand plans */
  const sh = { R: teller.shoulder('R'), L: teller.shoulder('L') };
  const sx = { R: -1, L: 1 };   // his right hand is on world -x
  const busy = { R: [], L: [] };
  const free = (h, a, b) => busy[h].every(([x, y]) => b <= x || a >= y);
  const take = (h, a, b) => busy[h].push([a, b]);
  const ev = { R: [], L: [] };   // {t, move, spec, opts}
  /* fix round 2 (QA: "the host's hand covers the board"): a hand never enters the volume above the 64 squares below the tallest piece
     on the board (+ 4 cm), so it can never cover a pawn, a stake, the coin or a tag there. Any key that would lands at the far edge
     instead (the wooden frame on his side), same height, same gesture. Keys marked {free: true} are exempt (l25 coin hold, l46 push). */
  const SQH = 0.236, EDGE = -0.258;
  const tallCache = new Map();
  const tallest = (st) => { const k = Math.round(st.t * 10); let v = tallCache.get(k); if (v != null) return v; v = 0.07; for (const c of (objects.columns ? objects.columns(st) : [])) if (Math.abs(c.x) < SQH + c.r && Math.abs(c.z) < SQH + c.r) v = Math.max(v, c.top); if (st.king?.on != null && (st.king.drop ?? 0) > 0) v = Math.max(v, AN({ king: true }, st).y); if (tallCache.size > 4000) tallCache.clear(); tallCache.set(k, v); return v; };
  const guardSpec = (sp, st) => {
    const at = toV3(sp.at), over = Math.abs(at.x) < SQH + 0.02 && at.z > -SQH - 0.02;
    if (!over || at.y > tallest(st) + 0.04) return sp;
    const fwd = sp.point === 'tip' || sp.point === 'thumb' ? 0 : 0.016;   // a palm or a pinch: the fingers reach ~5 cm past the point
    at.z = Math.min(at.z, EDGE - fwd); at.x = clamp(at.x, -0.2, 0.2); at.y = Math.max(at.y, 0.012);
    return { ...sp, at };
  };
  const put = (h, t, move, spec, opts = {}) => {
    if (opts.free) { ev[h].push({ t, move, spec, opts }); return; }
    const g = (tt, c) => guardSpec(typeof spec === 'function' ? spec(tt, c) : spec, c?.state ?? S(tt));
    ev[h].push({ t, move, spec: g, opts });
  };
  const REST = {
    R: (t) => ({ at: [-0.12 + 0.008 * Math.sin(t * 0.9 + 1), TY + 0.004, -0.335 + 0.008 * Math.sin(t * 0.63)], point: 'palm', dir: [1, 0, 0.18 + 0.08 * Math.sin(t * 0.5)], grip: ['rest', 'relax', 0.5 + 0.5 * Math.sin(t * 1.3)] }),
    L: (t) => ({ at: [0.12 + 0.008 * Math.sin(t * 0.8 + 2), TY + 0.004, -0.335 + 0.008 * Math.sin(t * 0.71 + 1)], point: 'palm', dir: [-1, 0, 0.18 + 0.08 * Math.sin(t * 0.55 + 1)], grip: ['rest', 'relax', 0.5 + 0.5 * Math.sin(t * 1.1 + 2)] }),
  };
  const FOLD = {
    R: (t) => ({ at: [-0.03, TY + 0.024 + 0.002 * Math.sin(t * 1.7), -0.318], point: 'palm', dir: [1, -0.05, -0.12], grip: 'relax' }),
    L: (t) => ({ at: [0.028, TY + 0.006, -0.328], point: 'palm', dir: [-1, 0, -0.1], grip: 'relax' }),
  };
  const reachable = (h, p, lim = 0.53) => p.distanceTo(sh[h]) < lim;
  const toward = (h, p, dist, minY = 0.1) => { const d = p.clone().sub(sh[h]); const q = sh[h].clone().addScaledVector(d.normalize(), dist); q.y = Math.max(q.y, minY); return q; };
  const handFor = (p) => (p.x < 0 ? 'R' : 'L');
  const toV3 = (a) => (a.isVector3 ? a.clone() : V(a[0], a[1], a[2]));
  /** highest tower top within r of the segment a-b (xz), at time t */
  const clearance = (a, b, t, r = 0.07, st0 = null) => {
    const st = st0 ?? S(t); let top = 0; const ab = b.clone().sub(a).setY(0);
    const cols = objects.columns ? objects.columns(st) : st.players.filter((p) => p.present > 0.5).map((p) => { const q = playerTop(p.id, st); return { x: q.x, z: q.z, r: p.rings >= 2 ? 0.07 : 0.035, top: q.y }; });
    for (const c of cols) { const u = clamp(((c.x - a.x) * ab.x + (c.z - a.z) * ab.z) / Math.max(1e-6, ab.lengthSq())); const px = a.x + ab.x * u, pz = a.z + ab.z * u; if (Math.hypot(c.x - px, c.z - pz) < r + c.r) top = Math.max(top, c.top); }
    return top;
  };
  /** a pointing hand: the index tip a little above and in front of (toward him) the target, the finger aimed at it */
  // fix round 2: pointing and presenting are done from the FAR EDGE of the board (his side), aimed at the piece, never over the squares
  const pointSpec = (h, target, t, st = null) => {
    const tip = V(clamp(target.x * 0.85, -0.19, 0.19), clamp(target.y + 0.03, 0.05, 0.16), EDGE + 0.012);
    const dir = target.clone().sub(tip); if (dir.length() < 0.02) dir.set(0, -0.4, 1); dir.normalize();
    return { at: tip, point: 'tip', dir: dir.toArray(), palm: [0, -1, 0], grip: 'point' };
  };
  const presentSpec = (h, target, t, st = null) => {   // open palm up at the far edge, fingers toward the piece
    const p = V(clamp(target.x * 0.85 + sx[h] * 0.02, -0.2, 0.2), clamp(target.y * 0.5 + 0.03, 0.04, 0.09), EDGE - 0.018);
    const dir = target.clone().sub(p).setY(0); if (dir.length() < 0.01) dir.set(0, 0, 1); dir.normalize();
    return { at: p, point: 'palm', dir: [dir.x, 0.15, dir.z], palm: [0, 1, 0.15], grip: 'open' };
  };
  const plans = [];   // for the report / gaze
  /** an open palm (up) under a hovering flip coin: "here it is" */
  const underCoin = (h, cid) => (tt, c) => {
    const st = c?.state ?? S(tt), fc = (st.flipCoins ?? []).find((x) => x.id === cid), o = fc && objects.flipPose ? objects.flipPose(st, fc) : null;
    const b = objects.bounds({ coins: [cid] }, st).box, r = Math.max(0.01, (b.max.x - b.min.x) / 2);
    let p = (o?.pos ?? b.getCenter(V())).clone().add(V(0, -r - 0.035, -0.02));
    if (!reachable(h, p, 0.6)) p = toward(h, p, 0.58, 0.05);
    return { at: p, point: 'palm', dir: [-sx[h] * 0.5, 0.05, 1], palm: [0, 1, 0.1], grip: 'open' };
  };
  /** an open hand at the far edge of the board, palm up toward the pieces: "watch" (k = 1: a little lower, after the landing) */
  const watch = (h, k = 0) => ({ at: [sx[h] * (0.13 - 0.02 * k), 0.07 - 0.02 * k, -0.3], point: 'palm', dir: [-sx[h] * 0.45, 0.2, 1], palm: [sx[h] * 0.3, 1, 0.2], grip: 'open' });

  // slow flips: one hand flicks the coin with the thumb, the other points at the two players first; the landing is met by the flat hand
  const flips = beats.filter((b) => b.type === 'flip');
  for (let i = 0; i < flips.length; i++) {
    const b = flips[i], tL = b.tLand ?? b.t1, near = (j) => j >= 0 && j < flips.length && Math.abs(flips[j].t0 - b.t0) < 0.4, slow = tL - b.t0 >= 0.7 && (i === 0 || near(i - 1) || b.t0 - (flips[i - 1].tLand ?? flips[i - 1].t1) > 0.25) && (i + 1 >= flips.length || near(i + 1) || flips[i + 1].t0 - tL > 0.25);
    if (!slow) continue;
    const st0 = S(b.t0 - 0.05), fc = (st0.flipCoins ?? []).find((c) => c.id === b.coin) ?? (st0.flipCoins ?? [])[0]; if (!fc) continue;
    const C = objects.metres(fc.at); C.y = 0.004;
    const a0 = b.t0 - 0.75, hold0 = tL + 1.1; let h = handFor(C);
    if (!free(h, a0, hold0)) h = h === 'R' ? 'L' : 'R';
    if (!free(h, a0, hold0)) continue;
    const o = h === 'R' ? 'L' : 'R';
    // the coin may hover after its landing (round 4, l09): his open hand comes under it while it hangs there
    const hover = []; for (let t = tL + 0.05; t < tL + 6; t += 0.1) { const c = (S(t).flipCoins ?? []).find((x) => x.id === b.coin); if (c && c.phase === 'hover' && (c.present ?? 1) > 0.5) { if (!hover.length) hover.push(t, t); hover[1] = t; } else if (hover.length) break; }
    if (hover.length && hover[1] - hover[0] < 0.8) hover.length = 0;
    const hold = hover.length ? Math.max(hold0, hover[1] + 0.3) : hold0;
    if (hover.length && !free(h, a0, hold)) hover.length = 0;
    take(h, a0, hover.length ? hold : hold0); plans.push({ kind: 'flip', t: b.t0, hand: h });
    // fix round 2: the flick is made at the FAR EDGE of the board (his side), thumb toward the coin; the hand then withdraws to the
    // table edge and waits there, palm up ("watch it"), also while the coin hovers: it never reaches into the pawns
    const Ex = clamp(C.x * 0.8, -0.17, 0.17), aim = C.clone().sub(V(Ex, 0.03, EDGE)).normalize().toArray();
    put(h, b.t0 - 0.1, 0.55, { at: V(Ex, 0.028, EDGE), point: 'thumb', dir: aim, palm: [0, -1, -0.3], grip: 'cock' }, { lift: 0.04 });
    put(h, b.t0 + 0.06, 0.12, { at: V(Ex, 0.07, EDGE - 0.004), point: 'thumb', dir: [aim[0], 0.35, aim[2]], palm: [0, -1, 0.1], grip: 'flick' }, { ease: E.out });
    const back = (k) => ({ at: [Ex * 0.7 + sx[h] * 0.05, 0.03 - 0.01 * k, -0.3], point: 'palm', dir: [-sx[h] * 0.45, 0.2, 1], palm: [sx[h] * 0.3, 1, 0.2], grip: 'open' });
    put(h, b.t0 + 0.5, 0.38, back(0), { ease: E.out });
    put(h, tL + 0.25, 0.4, back(1));
    // the other hand: who plays (a then b), finishing before the coin goes up
    const stake = beats.find((x) => x.type === 'stake' && x.a === b.a && x.b === b.b && x.t0 < b.t0 && b.t0 - x.t0 < 6);
    const p0 = stake ? stake.t0 - 0.1 : b.t0 - 1.3, p1 = Math.min(stake ? stake.t0 + 0.75 : b.t0 - 0.55, b.t0 - 0.3);
    if (p1 - p0 > 0.5 && free(o, p0 - 0.45, b.t0 + 0.2)) {
      take(o, p0 - 0.45, b.t0 + 0.2);
      put(o, p0, 0.42, (tt, c) => pointSpec(o, AN({ player: b.a }, c?.state ?? S(tt)), tt, c?.state), { lift: 0.03 });
      put(o, p1, 0.32, (tt, c) => pointSpec(o, AN({ player: b.b }, c?.state ?? S(tt)), tt, c?.state), { lift: 0.02 });
    }
  }
  // stakes without a slow flip: point at the two players
  for (const b of beats.filter((x) => x.type === 'stake')) {
    if (flips.some((f) => f.a === b.a && f.b === b.b && f.t0 > b.t0 && f.t0 - b.t0 < 6)) continue;
    const pa = A({ player: b.a }, b.t0), h = handFor(pa); if (!free(h, b.t0 - 0.5, b.t0 + 1.2)) continue;
    take(h, b.t0 - 0.5, b.t0 + 1.2);
    put(h, b.t0 - 0.1, 0.4, (tt, c) => pointSpec(h, AN({ player: b.a }, c?.state ?? S(tt)), tt, c?.state), { lift: 0.03 });
    put(h, b.t0 + 0.45, 0.3, (tt, c) => pointSpec(h, AN({ player: b.b }, c?.state ?? S(tt)), tt, c?.state), { lift: 0.02 });
  }
  // the hats: an open hand presents each one as it is named
  for (const b of beats.filter((x) => x.type === 'intro')) {
    const p = A({ player: b.player }, b.t0 + 0.5), h = handFor(p), t1 = Math.min(b.t1 ?? b.t0 + 1.4, b.t0 + 1.6);
    if (!free(h, b.t0 - 0.45, t1)) continue;
    // fix round 2: presented from the far edge, palm up (presentSpec); in a close object shot (the l11 block) the hands stay down: a hand
    // at the top of a close shot read as "the hand blocks the Heir"
    if (objShotAt(b.t0) || objShotAt(t1)) continue;
    const farPresent = (tt, c) => { const st = c?.state ?? S(tt); return presentSpec(h, AN({ player: b.player }, st), tt, st); };
    take(h, b.t0 - 0.45, t1); put(h, b.t0, 0.45, farPresent, { lift: 0.03 });
  }
  // time-lapses: a hand sweeps over the board (left to right forward, right to left for a rewind)
  for (const b of beats.filter((x) => x.type === 'timelapse')) {
    const back = b.x1 < b.x0, h = back ? 'L' : 'R', t1 = Math.min(b.t1, b.t0 + 1.5);
    if (!free(h, b.t0 - 0.4, t1 + 0.2)) continue;
    let top = 0; for (let k = 0; k <= 4; k++) { const st = S(lerp(b.t0, b.t1, k / 4)); for (const p of st.players) if (p.present > 0.5) top = Math.max(top, tower(p.coins, { rings: p.rings }).height + 0.05); }
    // the sweep passes along the FAR edge (behind the board from every front camera): it reads as "time runs" without covering a piece
    const y = clamp(top + 0.03, 0.09, 0.16), z = -0.305;
    const xa = back ? 0.2 : -0.2, xb = back ? -0.06 : 0.06;
    take(h, b.t0 - 0.4, t1 + 0.2); plans.push({ kind: 'sweep', t: b.t0, hand: h });
    const sweep = (x) => ({ at: [x, y, z], point: 'palm', dir: [sx[h] * -0.35, -0.1, 1], palm: [0, -1, 0.1], grip: 'open' });
    put(h, b.t0, 0.4, sweep(xa), { lift: 0.04 });
    put(h, t1, t1 - b.t0, sweep(xb), { ease: E.inOutQuad });
  }
  // objections: he turns to the Skeptic and offers her the floor with the left hand (she sits on his left, +x)
  for (const b of beats.filter((x) => x.type === 'objection')) {
    const oe = Math.max(b.t0 + 2.2, objEnd(b) - 0.3);
    if (!free('L', b.t0 - 0.2, oe)) continue;
    take('L', b.t0 - 0.2, oe);
    put('L', b.t0 + 0.3, 0.45, { at: [0.285, 0.075, -0.2], point: 'palm', dir: [0.8, 0.15, 0.6], palm: [0.1, 1, 0.1], grip: 'open' }, { lift: 0.02 });   // beside the board (x > its edge), toward her
  }
  // the king lands: both hands come off the table, open (a small "there it is")
  for (const b of beats.filter((x) => x.type === 'king')) {
    for (const h of ['R', 'L']) {
      if (!free(h, b.t1 - 0.3, b.t1 + 1.3)) continue;
      take(h, b.t1 - 0.3, b.t1 + 1.3);
      put(h, b.t1 + 0.1, 0.32, { at: [sx[h] * 0.17, 0.07, -0.27], point: 'palm', dir: [-sx[h] * 0.4, 0.3, 1], palm: [-sx[h] * 0.3, 0.2, 1], grip: 'open' }, { ease: E.out });
    }
  }
  // l46: he pushes the Heir's tower in (follows the tower while it moves and is within reach)
  { const l = lineOf.l46; if (l) {
    let m0 = null, m1 = null, prev = null;
    for (let t = l.t0 - 1; t <= l.t1 + 1; t += 0.1) { const st = S(t), e = (st.extras ?? []).find((x) => /heir/i.test(x.id) && x.kind === 'tower'); if (!e) continue; const p = objects.metres(e.at); if (prev && p.distanceTo(prev) > 0.002) { if (m0 == null) m0 = t - 0.1; m1 = t; } prev = p; }
    if (m0 != null) {
      const eid = S(m1).extras.find((x) => /heir/i.test(x.id) && x.kind === 'tower').id, end = AN({ extra: eid }, S(m1)), h = handFor(AN({ extra: eid }, S(m0 + 0.15)));   // the hand on the side the tower comes FROM (it pushes from behind)
      const pushSpec = (tt, c) => { const st = c?.state ?? S(tt), p = AN({ extra: eid }, st), p0 = AN({ extra: eid }, S(tt - 0.1)), d = p.clone().sub(p0).setY(0); if (d.length() < 1e-4) d.copy(end).sub(AN({ extra: eid }, S(m0))).setY(0); d.normalize(); let at = V(p.x, 0.035, p.z).addScaledVector(d, -0.045); if (!reachable(h, at, 0.55)) at = toward(h, at, 0.5, 0.05); return { at, point: 'palm', dir: [d.z * sx[h], 0.2, -d.x * sx[h] + 0.3], palm: d.toArray(), grip: 'open' }; };
      // he reaches (the torso leans in by itself when the hand is past arm's length); the other hand when this one is busy
      for (const hh of [h, h === 'R' ? 'L' : 'R']) {
        if (!free(hh, m0 - 0.5, m1 + 0.6)) continue;
        const ps = (tt, c) => { const st = c?.state ?? S(tt), p = AN({ extra: eid }, st), p0 = AN({ extra: eid }, S(tt - 0.1)), d = p.clone().sub(p0).setY(0); if (d.length() < 1e-4) d.copy(end).sub(AN({ extra: eid }, S(m0))).setY(0); d.normalize(); let at = V(p.x, 0.035, p.z).addScaledVector(d, -0.045); if (!reachable(hh, at, 0.62)) at = toward(hh, at, 0.6, 0.05); return { at, point: 'palm', dir: [d.z * sx[hh], 0.2, -d.x * sx[hh] + 0.3], palm: d.toArray(), grip: 'open' }; };
        take(hh, m0 - 0.5, m1 + 0.6); put(hh, m0, 0.45, ps, { lift: 0.04, free: true }); put(hh, m1 + 0.3, m1 - m0 + 0.3, ps, { free: true }); plans.push({ kind: 'push', t: m0, hand: hh }); break;
      }
    }
  } }
  // l25: he holds the large coin up to the lens between two fingers (the coin is drawn from the state; the hand goes under it)
  { const l = lineOf.l25; if (l) {
    let c0 = null, c1 = null, cid = null;
    for (let t = l.t0 - 0.5; t <= l.t1 + 1.5; t += 0.1) { const fc = (S(t).flipCoins ?? []).find((c) => (c.present ?? 1) > 0.5 && c.phase === 'hover'); if (fc) { if (c0 == null) { c0 = t; cid = fc.id; } c1 = t; } }
    if (c0 != null && c1 - c0 > 1) {
      const hand = (tt, c) => {
        const st = c?.state ?? S(tt), fc = (st.flipCoins ?? []).find((x) => x.id === cid), o = fc && objects.flipPose ? objects.flipPose(st, fc) : null;
        const b = objects.bounds({ coins: [cid] }, st).box, r = Math.max(0.01, (b.max.x - b.min.x) / 2) * (o?.scale ?? 1);
        // the fingers pinch the lower rim from BEHIND the coin (his side): the coin stays clear and sharp, the hand reads under it
        const p = (o?.pos ?? b.getCenter(V())).clone().add(V(-0.006, -r * 0.9, -0.012));
        return { at: reachable('R', p, 0.62) ? p : toward('R', p, 0.6, 0.05), point: 'pinch', dir: [0.1, 1, 0.25], palm: [0.25, 0, -1], grip: 'pinch' };
      };
      const a = Math.max(c0, l.t0 - 0.2), z = Math.min(c1, l.t1 + 0.8);
      if (free('R', a - 0.5, z + 0.5)) { take('R', a - 0.5, z + 0.5); put('R', a + 0.1, 0.55, hand, { lift: 0.03, free: true }); put('R', z, z - a - 0.1, hand, { free: true }); plans.push({ kind: 'coinhold', t: a, hand: 'R' }); }
    }
  } }
  // words: counting on the fingers (smarter / harder / start with more), tapping the table on "Keep flipping", open hands at questions
  { const t1 = W('l31', 'smarter'), t2 = W('l31', 'harder'), t3 = W('l31', 'more');
    if (t1 != null && t2 != null && t3 != null && free('L', t1 - 0.5, t3 + 1.2)) {
      take('L', t1 - 0.5, t3 + 1.2); plans.push({ kind: 'count', t: t1, hand: 'L' });
      const c = (g, k) => ({ at: [0.12 - 0.01 * k, 0.21 + 0.01 * k, -0.25], point: 'palm', dir: [-0.15, 1, 0.15], palm: [-0.2, 0.05, 1], grip: g });
      put('L', t1 + 0.02, 0.4, c('point', 0), { lift: 0.02 }); put('L', t2 + 0.02, 0.18, c('two', 1)); put('L', t3 + 0.02, 0.18, c('three', 2));
    } }
  for (const w of words) {
    if (w.n !== 'keep') continue; const nx = words[words.indexOf(w) + 1]; if (!nx || nx.n !== 'flipping') continue;
    const h = 'R', a = w.t0 - 0.5; if (!free(h, a, nx.t1 + 0.7)) continue;
    take(h, a, nx.t1 + 0.7); plans.push({ kind: 'tap', t: w.t0, hand: h });
    const up = { at: [-0.06, 0.045, -0.235], point: 'tip', dir: [0.15, -0.8, 0.5], palm: [0, -0.5, -0.8], grip: 'point' }, dn = { at: [-0.06, TY + 0.002, -0.235], point: 'tip', dir: [0.15, -0.8, 0.5], palm: [0, -0.5, -0.8], grip: 'point' };
    put(h, w.t0 - 0.08, 0.38, up); put(h, w.t0 + 0.02, 0.1, dn, { ease: E.in }); put(h, w.t0 + 0.2, 0.15, up); put(h, nx.t0 + 0.02, 0.1, dn, { ease: E.in }); put(h, nx.t0 + 0.25, 0.2, up);
  }
  for (const s of sentences) {
    if (!s.q) continue; const a = s.t1 - 0.45, b = s.t1 + 0.75;
    if (objShotAt(a) || objShotAt(b)) continue;
    if (!free('R', a, b) || !free('L', a, b)) continue;
    take('R', a, b); take('L', a, b); plans.push({ kind: 'ask', t: s.t1 });
    for (const h of ['R', 'L']) put(h, s.t1 - 0.05, 0.38, { at: [sx[h] * 0.15, 0.06, -0.255], point: 'palm', dir: [-sx[h] * 0.45, 0.25, 1], palm: [sx[h] * 0.35, 1, 0.2], grip: 'open' }, { lift: 0.02 });
  }
  // talking gestures on stressed words in the gaps (alternating hands, never a frozen pose for long)
  const GEST = [
    (h) => ({ at: [sx[h] * 0.14, 0.085, -0.265], point: 'palm', dir: [-sx[h] * 0.35, 0.3, 1], palm: [sx[h] * 0.25, 1, 0.25], grip: 'open' }),
    (h) => ({ at: [sx[h] * 0.115, 0.06, -0.25], point: 'palm', dir: [-sx[h] * 0.45, 0.05, 1], palm: [-sx[h] * 1, 0.1, 0], grip: 'relax' }),
    (h) => ({ at: [sx[h] * 0.12, 0.16, -0.255], point: 'tip', dir: [-sx[h] * 0.1, 1, 0.25], palm: [0, 0, 1], grip: 'point' }),
    (h) => ({ at: [sx[h] * 0.09, 0.1, -0.24], point: 'pinch', dir: [-sx[h] * 0.5, 0.5, 0.7], palm: [0, 0.6, 0.8], grip: 'pinch' }),
  ];
  { let side = 0, last = -9;
    for (const ts of teller.stress) {
      if (ts - last < 1.1) continue; const r = hash(Math.round(ts * 100), 17); if (r > 0.62) continue;
      if (objShotAt(ts - 0.4) || objShotAt(ts + 1.0)) continue;
      const h = (side++ + (r < 0.12 ? 1 : 0)) % 2 ? 'L' : 'R', a = ts - 0.4, b = ts + 1.0;
      if (!free(h, a - 0.3, b + 0.5)) continue;
      take(h, a, b); last = ts;
      put(h, ts, 0.32, GEST[Math.floor(hash(Math.round(ts * 37), 5) * GEST.length)](h), { lift: 0.01 });
      put(h, ts + 0.55, 0.4, GEST[(Math.floor(hash(Math.round(ts * 37), 5) * GEST.length) + 1) % 2](h));
    }
  }
  // fill: every busy window ends with a return to the table (rest, or folded hands in the calm chapter / long silences)
  for (const h of ['R', 'L']) {
    const iv = busy[h].slice().sort((a, b) => a[0] - b[0]);
    put(h, 0, 0.01, REST[h]);
    for (const [a, b] of iv) { const nxt = iv.find(([x]) => x > b); const gap = (nxt ? nxt[0] : D) - b; if (gap > 0.5) put(h, b + 0.45, 0.45, inCalm(b + 1) && gap > 3 ? FOLD[h] : REST[h], { lift: 0.015 }); }
    for (const [c0, c1] of calm) put(h, c0 + 0.6, 0.6, FOLD[h]);
  }
  const trk = { R: teller.track('R'), L: teller.track('L') };
  for (const h of ['R', 'L']) { for (const e of ev[h]) trk[h].key(e.t, e.move, e.spec, e.opts ?? {}); trk[h].sort(); }

  /* ------------------------------------------------------------------ teller: body and face channels */
  const lean = teller.chan(0.12), brow = teller.chan(0), browT = teller.chan(0), smile = teller.chan(0.12), yawC = teller.chan(0);
  for (const s of sentences) {
    if (HARD.has(s.line)) { lean.key(s.t0 + 0.2, 0.6, 0.3); browT.key(s.t0 + 0.2, 0.4, -0.25); lean.key(s.t1 + 0.6, 0.8, 0.12); browT.key(s.t1 + 0.5, 0.5, 0); }
    if (s.q) { brow.key(s.t1 - 0.35, 0.25, 0.75); brow.key(s.t1 + 0.6, 0.35, 0); }
  }
  for (const w of words) {
    if (NUMW.test(w.n)) { brow.key(w.t0, 0.15, 0.45); brow.key(w.t1 + 0.25, 0.25, 0); }
    if (SADW.test(w.n)) { browT.key(w.t0, 0.2, 0.45); browT.key(w.t1 + 0.4, 0.4, 0); }
    if (w.n === 'promise' || w.n === 'fool' || w.n === 'luck' || w.n === 'lucky') { smile.key(w.t0, 0.25, 0.65); smile.key(w.t1 + 0.6, 0.4, 0.12); }
  }
  for (const [c0, c1] of calm) { lean.key(c0 + 0.8, 1.0, -0.04); lean.key(c1 + 0.5, 1.0, 0.12); }
  for (const b of beats) {
    if (b.type === 'king') { lean.key(b.t1 + 0.05, 0.25, -0.06); brow.key(b.t1, 0.12, 0.9); lean.key(b.t1 + 1.6, 0.8, 0.12); brow.key(b.t1 + 1.2, 0.4, 0); }
    if (b.type === 'objection') { const e = objEnd(b); yawC.key(b.t0 + 0.2, 0.4, 0.5); yawC.key(e - 0.2, 0.5, 0); }   // fix round 2: he stays turned to her while she objects
    if (b.type === 'fall' && (b.who === CAST.worker || b.who === CAST.scholar)) { browT.key(b.t1 ?? b.t0 + 0.4, 0.2, 0.6); browT.key((b.t1 ?? b.t0) + 1.2, 0.4, 0); }
  }
  for (const c of [lean, brow, browT, smile, yawC]) c.sort();

  /* ------------------------------------------------------------------ gaze plans (both puppets) */
  // target: 'cam' | 'sk' (the Skeptic's eyes) | 'teller' | {anchor} | {subject} | Vector3
  const gz = [], look = (t, target, dur = 0.2, follow = 0.55) => gz.push({ t, target, dur, follow });
  for (const s of sentences) {
    const st = S(s.t0), obj = !['wide', 'high', 'low', 'skeptic'].includes(st.shot.kind), len = s.t1 - s.t0;
    const lit = (st.players ?? []).filter((p) => p.lit > 0.5 && p.present > 0.5).map((p) => p.id);
    // the model's focus (what the line is about) wins; then the lit pawns; then the shot subject
    const fo = st.focus && ((st.focus.players?.length ?? 0) + (st.focus.extras?.length ?? 0) + (st.focus.chips?.length ?? 0) + (st.focus.coins?.length ?? 0) > 0 || st.focus.king || st.focus.skeptic) ? { players: st.focus.players, extras: st.focus.extras, chips: st.focus.chips, coins: st.focus.coins, king: st.focus.king, skeptic: st.focus.skeptic } : null;
    const sub = fo ?? (lit.length && lit.length <= 6 ? { players: lit } : st.shot.subject);
    if (len > 1.2 && hash(Math.round(s.t0 * 10), 3) < (obj ? 0.85 : 0.6)) { look(s.t0 - 0.1, { subject: sub, at: s.t0 }, 0.22, 0.45); look(s.t0 + Math.min(1.4, 0.4 * len), 'cam', 0.2, 0.6); }
    else look(s.t0 - 0.1, 'cam', 0.2, 0.6);
    if (/skeptic/.test(s.words.map((w) => w.n).join(' '))) { const w = s.words.find((x) => x.n.startsWith('skeptic')); look(w.t0 - 0.1, 'sk', 0.2, 0.7); look(w.t1 + 0.9, 'cam', 0.25, 0.6); }
  }
  for (const b of beats) {
    if (b.type === 'flip' && plans.some((p) => p.kind === 'flip' && p.t === b.t0)) { look(b.t0 - 0.7, { anchor: { coin: b.coin } }, 0.18, 0.5); look((b.tLand ?? b.t1) + 0.7, 'cam', 0.22, 0.6); }
    if (b.type === 'intro') { look(b.t0 - 0.25, { anchor: { player: b.player } }, 0.18, 0.5); look(b.t0 + 1.0, 'cam', 0.22, 0.6); }
    if (b.type === 'objection') { look(b.t0, 'sk', 0.22, 0.75); look(Math.max(b.t0 + 1.8, objEnd(b) - 0.3), 'cam', 0.25, 0.6); }
    if (b.type === 'king') { look(b.t0, { anchor: { king: true } }, 0.2, 0.5); look(b.t1 + 1.0, 'cam', 0.25, 0.6); }
    if (b.type === 'timelapse') { look(b.t0, { f: 4.5, r: 4.5 }, 0.3, 0.4); look(b.t0 + 1.8, 'cam', 0.25, 0.6); }
    if (b.type === 'fall' && (b.who === CAST.worker || b.who === CAST.scholar)) { look(b.t0, { anchor: { player: b.who } }, 0.15, 0.5); look((b.t1 ?? b.t0) + 1.0, 'cam', 0.25, 0.6); }
    if ((b.type === 'jump' || b.type === 'hop') && b.who === 'skeptic') { look(b.t0 - 0.1, { anchor: { skeptic: true } }, 0.18, 0.5); look(b.t1 + 0.8, 'cam', 0.25, 0.6); }
  }
  for (const p of plans) if (p.kind === 'tap') { look(p.t - 0.3, { f: 4.5, r: 7.6 }, 0.15, 0.35); look(p.t + 0.7, 'cam', 0.2, 0.6); }
  gz.sort((a, b) => a.t - b.t);
  const gzT = gz.map((g) => g.t);

  // the Skeptic: mostly watches him, the board when something happens there, never the lens
  const sgz = [], slook = (t, target, dur = 0.25, follow = 0.6) => sgz.push({ t, target, dur, follow });
  slook(0, 'teller');
  for (const s of sentences) { const r = hash(Math.round(s.t0 * 10), 41); if (r < 0.35) { const st = S(s.t0); slook(s.t0 + 0.3, { subject: st.shot.subject, at: s.t0 }, 0.3, 0.5); slook(s.t0 + 0.3 + 1.1 + r * 2, 'teller', 0.3, 0.6); } }
  for (const b of beats) {
    if (b.type === 'flip' && plans.some((p) => p.kind === 'flip' && p.t === b.t0)) { slook(b.t0 - 0.2, { anchor: { coin: b.coin } }, 0.2, 0.55); slook((b.tLand ?? b.t1) + 0.9, 'teller', 0.3, 0.6); }
    if (b.type === 'king') { slook(b.t0 + 0.1, { anchor: { king: true } }, 0.2, 0.55); slook(b.t1 + 1.4, 'teller', 0.3, 0.6); }
    if (b.type === 'objection') { slook(b.t0 - 0.1, 'teller', 0.2, 0.7); }
    if ((b.type === 'jump' || b.type === 'hop') && b.who === 'skeptic') { slook(b.t0 - 0.3, { anchor: { skeptic: true } }, 0.2, 0.6); slook(b.t1 + 0.4, 'teller', 0.3, 0.6); }
  }
  sgz.sort((a, b) => a.t - b.t); const sgzT = sgz.map((g) => g.t);

  /* ------------------------------------------------------------------ the Skeptic: arms, reactions */
  const objs = beats.filter((b) => b.type === 'objection'), firstObj = objs.length ? objs[0].t0 : D;
  const jumpSk = beats.find((b) => (b.type === 'jump' || b.type === 'hop') && b.who === 'skeptic'), tWin = jumpSk ? jumpSk.t0 : (W('l64a', 'everybody') ?? D + 10);
  const kRest = { R: (t) => ({ at: [-0.12 + 0.006 * Math.sin(t * 0.7), TY + 0.004, 0.165 + 0.006 * Math.sin(t * 0.5 + 1)], point: 'palm', dir: [0.95, 0, 0.25], grip: ['rest', 'relax', 0.5 + 0.5 * Math.sin(t * 0.9)] }),
    L: (t) => ({ at: [0.12 + 0.006 * Math.sin(t * 0.6 + 2), TY + 0.004, 0.165 + 0.006 * Math.sin(t * 0.55)], point: 'palm', dir: [-0.95, 0, 0.25], grip: ['rest', 'relax', 0.5 + 0.5 * Math.sin(t * 1.0 + 1)] }) };
  const kCross = { R: (t) => ({ at: [0.085, 0.035 + 0.003 * Math.sin(t * 1.3), 0.115], point: 'palm', dir: [1, 0.15, -0.35], palm: [0, -0.3, -1], grip: 'relax' }),
    L: (t) => ({ at: [-0.08, 0.055 + 0.003 * Math.sin(t * 1.3), 0.125], point: 'palm', dir: [-1, 0.1, -0.3], palm: [0, -0.3, -1], grip: 'relax' }) };
  const kChin = (t) => ({ at: [0.01, 0.2, 0.112 + 0.004 * Math.sin(t)], point: 'knuckle', dir: [-0.3, 0.75, 0.4], palm: [0.9, 0, -0.3], grip: 'fist' });
  // the objection finger: raised high beside her face on the lens side (her left = toward the camera), clear of her body
  const kFinger = (t) => ({ at: [0.14, 0.36 + 0.01 * Math.sin(t * 9), 0.16], point: 'tip', dir: [-0.2 + 0.14 * Math.sin(t * 7), 1, 0.2], palm: [-0.4, 0, 1], grip: 'point' });
  const sk = { R: skeptic.track('R'), L: skeptic.track('L') };
  sk.R.key(0, 0.01, kCross.R); sk.L.key(0, 0.01, kCross.L);
  sk.R.key(Math.max(0.1, firstObj - 0.6), 0.5, kRest.R); sk.L.key(Math.max(0.1, firstObj - 0.6), 0.5, kRest.L);
  const skB = { R: [], L: [] }, objW = [], fingW = [];
  for (const b of objs) {
    const a = b.t0 - 0.15, e = objEnd(b);   // the finger stays up long enough to be seen (QA r1: no visible objection)
    sk.L.key(b.t0 + 0.2, 0.35, kFinger, { lift: 0.02 }); sk.L.key(e + 0.4, 0.45, kRest.L); skB.L.push([a, e + 0.4]);
    // the other hand comes onto the table edge, palm down: she is leaning in on it
    sk.R.key(b.t0 + 0.25, 0.4, (t) => ({ at: [-0.09, TY + 0.006, 0.2], point: 'palm', dir: [0.5, 0, 1], grip: 'relax' })); sk.R.key(e + 0.5, 0.5, kRest.R); skB.R.push([a, e + 0.5]);
    objW.push([b.t0 - 0.25, e + 0.6]); fingW.push([b.t0 + 0.12, e + 0.15]);
  }
  { const l = lineOf.l64a; if (l) objW.push([l.t0 - 0.1, l.t1 + 0.4]); }
  const objWin = (t) => objW.some(([a, b]) => t >= a && t <= b);
  const skFinger = (t) => (fingW.some(([a, b]) => t >= a && t <= b) ? skeptic.toWorld(V(...kFinger(t).at)) : null);
  // chin on the hand now and then, in the middle part (after the first objection, before her win)
  { let n = 0; for (const s of sentences) { if (s.t0 < firstObj + 3 || s.t0 > tWin - 4) continue; if (hash(Math.round(s.t0 * 10), 77) > 0.18 || s.t1 - s.t0 < 2.5) continue; if (skB.R.some(([x, y]) => s.t0 < y && s.t1 + 1 > x)) continue; sk.R.key(s.t0 + 0.4, 0.6, kChin, { lift: 0.02 }); sk.R.key(s.t1 + 0.5, 0.6, kRest.R); skB.R.push([s.t0, s.t1 + 1]); n++; } }
  for (const h of ['R', 'L']) sk[h].sort();
  const sLean = skeptic.chan(-0.1), sBrow = skeptic.chan(0), sBT = skeptic.chan(-0.15), sSmile = skeptic.chan(0), sTilt = skeptic.chan(0), sNod = skeptic.chan(0), sShake = skeptic.chan(0), sSquint = skeptic.chan(0.1), sO = skeptic.chan(0);
  sLean.key(firstObj - 0.3, 0.6, 0.02);
  for (const b of objs) { const e = objEnd(b); sLean.key(b.t0 + 0.3, 0.4, 0.24); sBrow.key(b.t0 + 0.2, 0.3, 0.75); sBT.key(b.t0 + 0.2, 0.3, -0.4); sTilt.key(b.t0 + 0.4, 0.4, 0.1); sLean.key(e + 0.6, 0.6, 0.02); sBrow.key(e + 0.4, 0.4, 0); sBT.key(e + 0.4, 0.4, -0.1); sTilt.key(e + 0.4, 0.5, 0); }
  // reactions at the end of claims: a frown, a head tilt, a slow head shake, a raised brow; later (and at her win) nods and smiles
  for (const s of sentences) {
    const r = hash(Math.round(s.t1 * 10), 91); if (r > 0.55 || s.t1 - s.t0 < 1) continue;
    if (objs.some((b) => Math.abs(b.t0 - s.t1) < 2.5)) continue;
    const t = s.t1 - 0.2, d = 1.1 + r;
    const kind = s.t1 > tWin ? 'nod' : s.t1 < firstObj ? ['frown', 'tilt', 'shake', 'brow'][Math.floor(r * 7.3) % 4] : ['tilt', 'brow', 'nod', 'frown', 'squint'][Math.floor(r * 9.1) % 5];
    if (kind === 'frown') { sBT.key(t, 0.25, -0.5); sBrow.key(t, 0.25, -0.3); sBT.key(t + d, 0.4, -0.12); sBrow.key(t + d, 0.4, 0); }
    if (kind === 'tilt') { sTilt.key(t, 0.35, r < 0.25 ? 0.16 : -0.16); sTilt.key(t + d, 0.5, 0); sSquint.key(t, 0.3, 0.35); sSquint.key(t + d, 0.4, 0.1); }
    if (kind === 'shake') { sShake.key(t, 0.01, 0); sShake.key(t + 1.1, 1.1, 1, E.linear); sShake.key(t + 1.12, 0.01, 0); }
    if (kind === 'brow') { sBrow.key(t, 0.2, 0.8); sBrow.key(t + d, 0.4, 0); }
    if (kind === 'nod') { sNod.key(t, 0.01, 0); sNod.key(t + 0.9, 0.9, 1, E.linear); sNod.key(t + 0.92, 0.01, 0); }
    if (kind === 'squint') { sSquint.key(t, 0.3, 0.45); sSquint.key(t + d, 0.4, 0.1); }
  }
  for (const b of beats) {
    if (b.type === 'king') { sLean.key(b.t1 + 0.05, 0.2, -0.14); sBrow.key(b.t1, 0.12, 1); sO.key(b.t1 + 0.05, 0.15, 0.3); sO.key(b.t1 + 1.0, 0.4, 0); sLean.key(b.t1 + 1.8, 0.7, 0.02); sBrow.key(b.t1 + 1.3, 0.4, 0); }
    if (b.type === 'fall' && b.who === CAST.worker) { sBT.key(b.t1 ?? b.t0 + 0.4, 0.2, 0.55); sBT.key((b.t1 ?? b.t0) + 1.3, 0.4, -0.1); }
  }
  // her win (l64a): she smiles, nods twice, leans in, arms open on the table
  { const tw0 = W('l64a', 'waiting'); if (tw0 != null && tw0 < tWin) { sSmile.key(tw0 + 0.3, 0.5, 0.6); sNod.key(tw0 + 0.3, 0.01, 0); sNod.key(tw0 + 1.0, 0.7, 1, E.linear); sNod.key(tw0 + 1.02, 0.01, 0); } }   // fix round 2: she smiles and nods as her tower completes
  sSmile.key(tWin + 0.1, 0.4, 0.9); sNod.key(tWin + 0.2, 0.01, 0); sNod.key(tWin + 1.6, 1.4, 2, E.linear); sNod.key(tWin + 1.62, 0.01, 0); sBT.key(tWin, 0.3, 0.1); sLean.key(tWin + 0.3, 0.5, 0.12); sBrow.key(tWin, 0.3, 0.4);
  // the closing (l65 from "which", frame check 2026-11-15): she sits back in her chair, content, so the close camera on the line-up can hold
  // her whole head at the frame side (leaning in, her head filled the upper right and was cut by the edge)
  { const tw = W('l65', 'which'); if (tw != null) { sLean.key(tw - 0.6, 1.4, -0.32); sSmile.key(tw, 0.6, 0.5); } }
  for (const c of [sLean, sBrow, sBT, sSmile, sTilt, sNod, sShake, sSquint, sO]) c.sort();

  /* ------------------------------------------------------------------ per frame */
  const subjectPoint = (sub, st) => { const b = objects.bounds(sub, st); return b.center.clone().setY(Math.min(b.center.y, b.top - 0.02)); };
  const resolve = (target, ctx, who) => {
    if (target === 'cam') return ctx.cam.clone();
    if (target === 'sk') return ctx.skEyes.clone();
    if (target === 'teller') return ctx.tellerEyes.clone();
    if (target.subject) return subjectPoint(target.subject, ctx.state);
    if (target.anchor) return AN(target.anchor, ctx.state);
    if (target.f != null) return objects.metres(target).setY(0.03);
    return target.clone();
  };
  const gazeAt = (list, T, t, ctx) => {
    let lo = 0, hi = T.length - 1, j = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (T[m] <= t) { j = m; lo = m + 1; } else hi = m - 1; }
    if (j < 0) return { look: resolve(list[0].target, ctx), follow: list[0].follow };
    const cur = list[j], u = smooth((t - cur.t) / cur.dur), p = resolve(cur.target, ctx);
    if (u >= 1 || j === 0) return { look: p, follow: cur.follow };
    const prev = list[j - 1]; return { look: resolve(prev.target, ctx).lerp(p, u), follow: lerp(prev.follow, cur.follow, u) };
  };
  // where the eyes are from the lean alone (cameras aim at this so the head's own motion stays visible)
  const tellerHead = (t) => { const a = lean.at(t), b = -0.55 * a, ey = 0.428 + 0.115 * Math.cos(b) - 0.11 * Math.sin(b), ez = 0.008 + 0.115 * Math.sin(b) + 0.11 * Math.cos(b), s = SEATS.teller; return V(0, s.y + ey * Math.cos(a) - ez * Math.sin(a), s.z + ey * Math.sin(a) + ez * Math.cos(a)); };
  const skHead = (t) => { const a = sLean.at(t); return skeptic.toWorld(V(0, -0.22 + 0.543 * Math.cos(a) - 0.12 * Math.sin(a), 0.543 * Math.sin(a) + 0.12 * Math.cos(a))); };
  const skEyesW = V(), tellerEyesW = V();
  // seen from above (high / top / object shots) her arms read long and thin across the frame: she folds them on the table there (not while objecting)
  const skArms = (state, t, ctx) => {
    let R = sk.R.at(t, ctx), L = sk.L.at(t, ctx); const s = state.shot ?? {};
    let w = (s.kind === 'high' || OBJK.has(s.kind)) && !skFinger(t) ? 1 : 0;   // also in object shots: her arms stay off the board
    if (w && s.continuous) w = smooth((t - s.t0) / 0.6);
    if (w > 0) { R = skeptic.mix(R, skeptic.hand('R', kCross.R(t)), w); L = skeptic.mix(L, skeptic.hand('L', kCross.L(t)), w); }
    return { R, L };
  };
  const update = (state, t, cam) => {
    // the Skeptic first (his eyes need hers)
    const ctxS = { state, t, cam, tellerEyes: tellerHead(t), skEyes: skHead(t) };
    const g = gazeAt(sgz, sgzT, t, ctxS), fw = state.skeptic?.forward ?? 0;
    const nod = sNod.at(t), shake = sShake.at(t);
    skeptic.pose({ t, lean: sLean.at(t) + 0.08 * fw, brow: sBrow.at(t), browTilt: sBT.at(t), squint: sSquint.at(t), smile: sSmile.at(t), tilt: sTilt.at(t),
      pitch: 0.09 * Math.sin(nod * Math.PI * 2) * (nod > 0 && nod < 2 ? 1 : 0), yaw: 0.13 * Math.sin(shake * Math.PI * 4) * (shake > 0 && shake < 1 ? Math.sin(shake * Math.PI) : 0),
      look: skeptic.toLocal(g.look), follow: g.follow, mouth: { open: sO.at(t), wide: 0.75 }, ...skArms(state, t, ctxS) });
    skEyesW.copy(skeptic.toWorld(skeptic.marks.eyes));
    const ctx = { state, t, cam, skEyes: skEyesW, tellerEyes: tellerHead(t) };
    const gt = gazeAt(gz, gzT, t, ctx);
    teller.pose({ t, lean: lean.at(t), brow: brow.at(t), browTilt: browT.at(t), smile: teller.mouthAt(t).talking ? 0.4 * smile.at(t) : smile.at(t), yaw: yawC.at(t), look: gt.look, follow: gt.follow, R: trk.R.at(t, ctx), L: trk.L.at(t, ctx) });
    tellerEyesW.copy(teller.marks.eyes);
  };
  /** the hand that pushes something across the table inside [a, b] (cameras stand on the other side so the arm does not cross the lens) */
  const pushHand = (a, b) => { const p = plans.find((q) => q.kind === 'push' && q.t > a - 1 && q.t < b); return p ? p.hand : null; };
  return { teller, skeptic, update, tellerHead, skHead, objWin, skFinger, pushHand, plans, beatsUsed: plans.length, handsAt: (t, ctx) => [trk.R.at(t, ctx).pos, trk.L.at(t, ctx).pos] };
}
