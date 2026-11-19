// Parable HOST view (Copper Parable): the shared photoreal object layer + two seated puppets (people.js) + this view's own camera.
// export async function makeView(K, show) -> { draw(state, t) }. draw is pure in (state, t).
// Camera: every STATE.md shot kind has its own plan built from objects.bounds; people shots (wide, high, low, skeptic, coin) keep the
// storyteller (and in some the Skeptic) in frame, object shots fill the frame with the subject and leave him soft behind it.
// Bands: faces and subjects stay above the caption band (74-88 % of the height); during the hook (first 3 s) and the last line the
// faces stay above 21 % (hook / end text sit at 22-42 %).
import * as THREE from 'three';
import { makeCast } from './people.js';
import { makeFit } from './host-frame.js';
import { namesAboveRows } from './macro-tags.js';   // pure helper (Host c01 line-up names); the Macro look never calls it

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k, smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

/** the object layer: the Macro engineer's view-macro.js when it exists, else the dev stand-in (same API) */
async function loadObjects() {
  try { const m = await import('./view-macro.js'); if (m.makeObjects) return { makeObjects: m.makeObjects, real: true }; } catch (e) { /* not on disk yet */ }
  const m = await import('./dev-host/objects-stub.js'); console.warn('view-host: using the dev stand-in object layer'); return { makeObjects: m.makeObjects, real: false };
}

export async function makeView(K, show, opts = {}) {
  const { THREE: T3 } = K;
  const lib = await loadObjects();
  const objects = await lib.makeObjects(K, { tags: true, view: 'host', show, ...opts.objects });
  const stage = objects.stage;
  const cast = await makeCast(K, show, objects);
  const lines = K.score.lines ?? [], lastLine = lines[lines.length - 1], hookDur = -1;   // 2026-11-15: the hook text sits in the lower third now: no text window at the start (was 3.2)
  const endT = lastLine ? lastLine.t0 - 0.25 : Infinity;
  const textWin = (t) => t < hookDur || t >= endT;

  /* ------------------------------------------------------------------ projection and framing */
  const { project, aimAt, dirOf, fit } = makeFit(K.W, K.H), up = V(0, 1, 0);
  const at = (fr, dist) => fr.c.clone().addScaledVector(fr.pos.clone().sub(fr.c).normalize(), dist);

  /* ------------------------------------------------------------------ subjects, cached per shot */
  const ptsOf = (b) => { const r = b.radius, c = b.center, top = b.top; return [V(c.x - r * 0.55, Math.max(0, c.y - r * 0.6), c.z), V(c.x + r * 0.55, Math.max(0, c.y - r * 0.6), c.z), V(c.x, top, c.z), V(c.x, Math.max(0, 2 * c.y - top), c.z)]; };
  /** the object layer returns the whole board when nothing of the subject exists at that moment: treat that as empty */
  const isEmpty = (b, sub) => !sub.board && b.box && b.box.max.y <= 0.0605 && b.box.max.x - b.box.min.x > 0.45;
  const boxPts = (b, sub = {}) => { if (isEmpty(b, sub)) return []; if (!b.box) return ptsOf(b); const { min, max } = b.box; const o = []; for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) o.push(V(x, y, z)); return o; };
  /** the stakes (moves) of a subject: their anchors plus the board under them */
  const movePts = (ids, st) => { const o = []; for (const id of ids ?? []) { const p = objects.anchor({ move: id }, st); if (p) o.push(p.clone().add(V(-0.02, 0.01, -0.02)), p.clone().add(V(0.02, 0, 0.02)), p.clone().setY(0)); } return o; };
  const cache = new Map();
  const shotInfo = (st) => {
    const sh = st.shot; let c = cache.get(sh.id); if (c) return c;
    const beg0 = show.state(clamp(sh.t0 + 0.02, 0, K.duration)), end = show.state(clamp(sh.t1 - 0.02, 0, K.duration)), sub = sh.subject ?? { board: true }, toPts = [];
    if (sh.to?.moves?.length) toPts.push(...movePts(sh.to.moves, end));
    if (sh.to) toPts.push(...boxPts(objects.bounds(sh.to, end), sh.to));
    const endPts = sub.coins?.length ? [] : boxPts(objects.bounds(sub, end), sub).concat(movePts(sub.moves, end));
    c = { sub, endPts, toPts, h: strHash(sh.id), boardTop: objects.bounds({ board: true }, end, { capBoard: 3 }).top };   // uncapped: the layer caps board bounds at 0.3 m by default
    // fix round 2 facts about the shot, from its start and end states
    const beg = show.state(clamp(sh.t0 + 0.02, 0, K.duration));
    // l65: the four hats lined up on the table in front of the board (subject players standing off the board at the end)
    c.lineup = (sub.players?.length ?? 0) >= 3 && sub.players.every((i) => end.players[i] && end.players[i].at.r < 0.6) ? boxPts(objects.bounds({ players: sub.players, skeptic: !!sub.skeptic }, end)) : null;
    // l64a: the Skeptic's own tower at the near edge (and her pawn hopping onto it): framed from the shot's start and end
    const skT = (s) => ((s.extras ?? []).some((e) => e.id === 'skTower' && (e.present ?? 1) > 0.5) || (s.skeptic?.coins ?? 0) > 0);
    c.skTower = sh.kind === 'skeptic' && (skT(end) || skT(show.state(clamp((sh.t0 + sh.t1) / 2, 0, K.duration)))) ? boxPts(objects.bounds({ extras: ['skTower'], skeptic: true }, end)).concat(boxPts(objects.bounds({ skeptic: true }, beg))) : null;
    // l42: a rain of gold coins and red chips during the shot
    c.rain = (() => { for (let t = sh.t0; t < sh.t1; t += 0.5) if ((show.state(t).rain ?? []).length) return true; return false; })();
    // l49: a coin shot that also holds a demo extra (the +50 % / -40 % demo tower)
    c.coinDemo = sh.kind === 'coin' && (sub.extras?.length ?? 0) > 0;
    c.nextLineup = (() => { const nx = (show.shots ?? []).find((q) => q.t0 >= sh.t1 - 1e-3 && q.id !== sh.id); if (!nx || !nx.continuous) return false; const e2 = show.state(clamp(nx.t1 - 0.02, 0, K.duration)), ps = nx.subject?.players ?? []; return ps.length >= 3 && ps.every((i) => e2.players[i] && e2.players[i].at.r < 0.6); })();
    c.longTag = (() => { for (let t = sh.t0 + 0.05; t < sh.t1; t += 0.4) if ((show.state(t).tags ?? []).some((g) => (g.text ?? '').length >= 14 && (g.opacity ?? 1) > 0.05)) return true; return false; })();
    c.tagged = (() => { for (let t = sh.t0 + 0.05; t < sh.t1; t += 0.4) if ((show.state(t).tags ?? []).some((g) => !g.anchor?.screen && (g.opacity ?? 1) > 0.05)) return true; return false; })();   // a piece tag shows during the shot
    // l43 (frame check 2026-11-15): a pan between two pawns on OPPOSITE outward sides (and the continuous hold after it) looks down steeply
    // from the front: each pawn's own side made the camera whip round through the storyteller's face while both tags were up
    const sideOf = (sb, s2) => (objects.bounds(sb, s2).center.x < -0.12 ? 1 : -1);
    c.steep = (() => {
      if (sh.kind === 'player' && sh.move === 'pan' && sh.to?.players?.length) return sideOf(sub, beg0) !== sideOf(sh.to, end);
      if (!sh.continuous) return false; const pv = (show.shots ?? []).find((q) => Math.abs(q.t1 - sh.t0) < 2e-3 && q.id !== sh.id);
      if (!pv || pv.kind !== sh.kind || pv.move !== 'pan' || !pv.to?.players?.length) return false; const ps = show.state(clamp(pv.t0 + 0.02, 0, K.duration)), pe = show.state(clamp(pv.t1 - 0.02, 0, K.duration)); if (sideOf(pv.subject, ps) === sideOf(pv.to, pe)) return false; return true;
    })();
    c.row = sh.kind === 'row' ? boxPts(objects.bounds({ players: end.players.map((p) => p.id) }, end)) : null;
    if (cache.size > 64) cache.clear();
    cache.set(sh.id, c); return c;
  };
  const BOARD = [V(-0.25, 0, -0.25), V(0.25, 0, -0.25), V(-0.25, 0, 0.25), V(0.25, 0, 0.25)];
  const headPts = (H, r = 0.13) => [H.clone().add(V(0, 0.11, 0)), H.clone().add(V(0, -0.13, 0)), H.clone().add(V(-r, -0.08, 0)), H.clone().add(V(r, -0.08, 0))];
  /** the Skeptic's head, plus her raised finger while she objects (both must be in frame then) */
  const inObjection = (t) => cast.objWin(t);
  const skPts = (t) => { const o = headPts(cast.skHead(t), 0.1); const f = cast.skFinger(t); if (f) o.push(f.clone().add(V(0, 0.03, 0)), f.clone().add(V(0, -0.02, 0))); return o; };

  /* ------------------------------------------------------------------ the shot plans */
  const FACE = [0.06, 0.05, 0.94, 0.7], FACE_LOW = [0.67, 0.05, 0.95, 0.7], FACE_TXT = [-3, -3, 4, -0.01], BOARD_TXT = [0.03, 0.12, 0.97, 0.86], SUBJ = [0.08, 0.1, 0.92, 0.72], BOARDB = [0.03, 0.08, 0.97, 0.8];   // text windows (FACE_TXT): the head just above the frame top
  const HEADCHK = new Set(['pair', 'block', 'tally', 'high', 'top', 'row', 'demo', 'tower', 'player']);
  const lastFit = {};   // dev: the groups and fit of the last planned frame (framing.ts --debug)
  /** how far the points of the groups fall outside their boxes with the camera fr (sum of distances, screen fractions) */
  const violation = (groups, fr, fov) => { let s = 0; for (const g of groups) for (const q of g.pts) { const [nx, ny] = project(fr.pos, fr.aim, fov, q), x = 0.5 + 0.5 * nx, y = 0.5 - 0.5 * ny; s += Math.max(0, g.box[0] - x) + Math.max(0, x - g.box[2]) + Math.max(0, g.box[1] - y) + Math.max(0, y - g.box[3]); } return s; };
  /** the camera angle (az, el) from a small grid that best puts every group in its box (fewest violations, then the largest first group).
   *  For framings where the people must sit at given SIDES of the picture (l65: the end text owns the top middle), which only the angle can do */
  const pickAngle = (groupsOf, subBoxes, azs, els, fov, fitOpt = {}) => {
    let best = null;
    for (const box of subBoxes) for (const az of azs) for (const el of els) {
      const groups = groupsOf(box), fr = fit(groups, dirOf(az, el), fov, fitOpt), v = violation(groups, fr, fov);
      let x0 = 9, x1 = -9; for (const q of groups[0].pts) { const x = project(fr.pos, fr.aim, fov, q)[0]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      const score = 20 * v - (x1 - x0) / 2;
      if (!best || score < best.score) best = { az, el, box, score, v };
    }
    return best;
  };
  // the end text ("WHICH ONE ARE YOU?", film.json end_text_y -37.5) covers about x 34-66 %, y 2-24 % of the picture. In the l65 staging
  // (line-up 1.6 squares apart straight in front of him, the Skeptic at the right) no camera puts his face BESIDE the text with the pawns
  // still large (brute-force search 2026-11-15): his face sits centred UNDER the text (crown >= 25.5 %), hers whole at the upper right
  // beside it, the line-up as wide as that allows, its feet above the captions (73.5 %), the names between his chin and the pawns
  const endFace = (H) => [H.clone().add(V(0, 0.115, 0)), H.clone().add(V(0, -0.09, 0)), H.clone().add(V(-0.1, 0, 0)), H.clone().add(V(0.1, 0, 0))];
  const END_T = [0.3, 0.25, 0.7, 0.415], END_S = [0.68, 0.03, 0.97, 0.5];
  const END_AZ = [-0.15, -0.08, 0, 0.08], END_EL = [-0.02, 0, 0.025, 0.05, 0.08];
  const END_LINE = [[0.04, 0.58, 0.96, 0.735], [0.04, 0.6, 0.96, 0.735]], END_BOARD = [[0.04, 0.46, 0.96, 0.9]];
  const endGroups = (subPts, Ht, Hs) => (box) => [{ pts: subPts, box }, { pts: endFace(Ht), box: END_T }, { pts: endFace(Hs), box: END_S }];
  /** l65 closing hold under the end text (frame check 2026-11-15, Neon-style redesign): the four names sit UNDER the pawns' feet (two
   *  staggered rows, macro-tags `namesBelow`), the captions are off from "which", so the camera can come close and LOW (table height,
   *  looking slightly up): the hats large in the middle band, his whole face above them and under the text band, hers whole at the upper
   *  right (or fully out). A direct search over camera poses (position AND aim). Hard rules: both faces whole and off the text (x 31-69 %,
   *  y < 25 %), no hat on a face, the named hats inside x 16-84 % (their names stay in title safe), the feet high enough for two name rows
   *  above 93 %. Best = the four hats furthest apart (owner bar: >= 0.13 of the width; searched 2026-11-15: ~0.137 at fov 75). */
  const NAME_H = 1.22 * 0.048 / 0.72, NAMES_BELOW_H = 0.016 + 2 * NAME_H + 0.014;   // macro-tags: plate height of a size-m tag; two rows + gaps
  const endPose = (sh) => {
    const tm = clamp(sh.t1 - 0.5, sh.t0, K.duration), st = show.state(tm), ids = sh.subject?.players ?? [];
    const hats = ids.map((i) => objects.anchor({ player: i }, st)).filter(Boolean); if (hats.length < 3) return null;
    const skP = objects.anchor({ skeptic: true }, st), all = hats.concat(skP ? [skP] : []), feet = all.map((q) => V(q.x, 0, q.z)), Ht = cast.tellerHead(tm), Hs = cast.skHead(tm), fov = 75;
    const headQ = (Q, r) => [Q.clone().add(V(0, 0.11, 0)), Q.clone().add(V(0, -0.13, 0)), Q.clone().add(V(-r, -0.04, 0)), Q.clone().add(V(r, -0.04, 0))];
    const qT = headQ(Ht, 0.13), cx = hats.reduce((a, q) => a + q.x, 0) / hats.length;
    // her WHOLE head (hair bun at the back included): the mesh box around skHead, measured with her closing sit-back (people.js, lean -0.32);
    // the old +-0.1 m box missed the back of her head, which the frame edge cut (h-close-v2)
    const qS = []; for (const x of [-0.08, 0.2]) for (const y of [-0.185, 0.105]) for (const z of [-0.195, 0.09]) qS.push(Hs.clone().add(V(x, y, z)));
    const inTxt = (b) => b[2] > 0.31 && b[0] < 0.69 && b[1] < 0.25;
    let best = null;
    const tryPose = (az, el, d, ax, ay, az0) => {
      const aim = V(ax, ay, az0), pos = aim.clone().addScaledVector(dirOf(az, el), d); if (pos.y < 0.03) return;
      const fwd = aim.clone().sub(pos).normalize();
      const P = (q) => { if (q.clone().sub(pos).dot(fwd) < 0.02) return null; const [nx, ny] = project(pos, aim, fov, q); return [0.5 + 0.5 * nx, 0.5 - 0.5 * ny]; };
      const bx = (qs) => { const a = qs.map(P); if (a.some((p) => !p)) return null; return [Math.min(...a.map((p) => p[0])), Math.min(...a.map((p) => p[1])), Math.max(...a.map((p) => p[0])), Math.max(...a.map((p) => p[1]))]; };
      const tb = bx(qT); if (!tb || inTxt(tb) || tb[0] < 0.03 || tb[1] < 0.03 || tb[2] > 0.97) return;
      const sb = bx(qS), skOut = !sb || sb[0] > 1.0 || sb[2] < 0; if (!skOut && (inTxt(sb) || sb[0] < 0.008 || sb[1] < 0.008 || sb[2] > 0.992)) return;
      const hp = all.map(P), fp = feet.map(P); if (hp.some((p) => !p) || fp.some((p) => !p)) return;
      if (Math.max(...fp.map((p) => p[1])) > 0.93 - NAMES_BELOW_H) return;
      if (hp.slice(0, hats.length).some((p) => p[0] < 0.16 || p[0] > 0.84) || fp.some((p) => p[0] < 0.04 || p[0] > 0.95)) return;
      let onFace = false; for (const p of hp) { if (p[0] > tb[0] - 0.03 && p[0] < tb[2] + 0.03 && p[1] < tb[3] + 0.01) onFace = true; if (!skOut && p[0] > sb[0] - 0.03 && p[0] < sb[2] + 0.03 && p[1] < sb[3] + 0.01) onFace = true; } if (onFace) return;
      const xs = hp.slice(0, hats.length).map((p) => p[0]).sort((a, b) => a - b); let sp = 9; for (let i = 1; i < xs.length; i++) sp = Math.min(sp, xs[i] - xs[i - 1]);
      if (skP && fp[fp.length - 1][0] - Math.max(...fp.slice(0, hats.length).map((p) => p[0])) < 0.08) return;   // her pawn clear of the Fool
      const mean = (xs[0] + xs[xs.length - 1]) / 2, score = sp + (skOut ? -0.01 : 0) - 0.05 * Math.abs(mean - 0.5);
      if (!best || score > best.score) best = { score, pos, aim, fov, sp, tb, sb, k: [az, el, d, ax, ay, az0] };
    };
    for (let az = -0.3; az <= 0.301; az += 0.05) for (let el = -0.3; el <= 0.101; el += 0.05) for (let d = 0.25; d <= 1.001; d += 0.05) for (let ax = cx - 0.2; ax <= cx + 0.201; ax += 0.05) for (let ay = 0; ay <= 0.401; ay += 0.025) for (const az0 of [-0.1, 0, 0.1, 0.2]) tryPose(az, el, d, ax, ay, az0);
    for (const h of [0.025, 0.0125]) if (best) { const [a0, e0, d0, x0, y0, z0] = best.k; for (const da of [-h, 0, h]) for (const de of [-h, 0, h]) for (const dd of [-h, 0, h]) for (const dx of [-h, 0, h]) for (const dy of [-h / 2, 0, h / 2]) for (const dz of [-2 * h, 0, 2 * h]) tryPose(a0 + da, e0 + de, d0 + dd, x0 + dx, y0 + dy, z0 + dz); }   // refine around the best
    return best;
  };
  /** c01 line-up (l04 / l05 "pick your winner", captions ON, frame check 2026-11-16): one fixed camera per shot. Every coin stack whole
   *  and above the captions (feet <= 72.5 %), no hat or tower top on a face, and room for the names macro-tags puts right at each pawn
   *  (`namesAbove`, macro-tags namesAboveRows, replayed here with plate widths estimated from the text): no name on a face, above the
   *  title-safe top, on another name's line or on the flipping coin's path, plus a free corner for "PICK ONE". l04 (names one at a time) no longer searches its own
   *  pose: it shares l05's (sharedPick below); once three or more are up together (l05) the four pawns get the room: each face is whole or fully out of the
   *  frame, never cut (searched 2026-11-16: with his face in, the Heir's 1,000-coin tower in front of him leaves the pawns ~0.07 of the
   *  width apart, too close for four names). Best = the pawns furthest apart (largest), names lifted least. A direct pose search. */
  const NAME_W = (s) => 0.024 * s.length + 0.008, PICK_SPOTS = [[0.35, 0.06, 0.65, 0.19], [0.05, 0.12, 0.34, 0.25], [0.66, 0.06, 0.95, 0.19], [0.05, 0.585, 0.34, 0.715], [0.66, 0.585, 0.95, 0.715]];   // macro-tags pins a big line tag ('PICK ONE') at one of these centres
  const pickPose = (sh, linePts) => {
    const ids = sh.subject?.players ?? [], tm = clamp(sh.t1 - 0.05, sh.t0, K.duration), st = show.state(tm);
    const peak = { ...st, players: st.players.map((p) => (ids.includes(p.id) ? { ...p, hop: 1 } : p)) };
    const tops = ids.map((i) => objects.anchor({ player: i }, peak)); if (tops.length < 3 || tops.some((q) => !q)) return null;
    let many = 0; for (let t = sh.t0 + 0.05; t < sh.t1; t += 0.25) many = Math.max(many, (show.state(t).tags ?? []).filter((g) => g.kind === 'name' && g.anchor?.player != null && (g.opacity ?? 1) > 0.05).length);
    const all = many >= 3;   // the names show together: lay them out together; else each alone
    const bodies = ids.map((i) => boxPts(objects.bounds({ players: [i] }, st)));
    const coinQ = []; for (const id of sh.subject?.coins ?? []) for (let t = sh.t0; t < sh.t1; t += 0.1) { const c = objects.anchor({ coin: id }, show.state(t)); if (c) coinQ.push(c.clone().add(V(-0.028, -0.028, 0)), c.clone().add(V(0.028, 0.028, 0))); }   // the flipping coin's path (l05): no name on it (macro-tags gets it as a keep-out, avoidRects.keepOut)
    const ws = ids.map((i) => NAME_W(`THE ${String(st.players[i]?.role ?? 'scholar').toUpperCase()}`)), th = NAME_H;
    const ts = [sh.t0 + 0.3, (sh.t0 + sh.t1) / 2, sh.t1 - 0.3].map((x) => clamp(x, sh.t0, sh.t1));
    const qTs = ts.map((x) => { const H = cast.tellerHead(x); return [H.clone().add(V(0, 0.115, 0)), H.clone().add(V(0, -0.135, 0)), H.clone().add(V(-0.13, -0.04, 0)), H.clone().add(V(0.13, -0.04, 0))]; });
    const qSs = ts.map((x) => { const Hs = cast.skHead(x), o = []; for (const a of [-0.1, 0.2]) for (const b of [-0.185, 0.105]) for (const c of [-0.195, 0.09]) o.push(Hs.clone().add(V(a, b, c))); return o; });
    const cx = tops.reduce((a, q) => a + q.x, 0) / tops.length, cz = tops.reduce((a, q) => a + q.z, 0) / tops.length;
    const hitR = (a, b, p = 0) => a[0] < b[2] + p && b[0] < a[2] + p && a[1] < b[3] + p && b[1] < a[3] + p;
    const isOut = (b) => !b || b[3] < 0 || b[0] > 1 || b[2] < 0;
    let best = null;
    const tryPose = (az, el, d, ax, ay, az0, fov) => {
      const aim = V(ax, ay, az0), pos = aim.clone().addScaledVector(dirOf(az, el), d); if (pos.y < 0.03) return;
      const fwd = aim.clone().sub(pos).normalize();
      const P = (q) => { if (q.clone().sub(pos).dot(fwd) < 0.02) return null; const [nx, ny] = project(pos, aim, fov, q); return [0.5 + 0.5 * nx, 0.5 - 0.5 * ny]; };
      const bx = (qs) => { const a = qs.map(P); if (a.some((p) => !p)) return null; return [Math.min(...a.map((p) => p[0])), Math.min(...a.map((p) => p[1])), Math.max(...a.map((p) => p[0])), Math.max(...a.map((p) => p[1]))]; };
      const tp = tops.map(P); if (tp.some((p) => !p)) return;
      const ord = tp.map((q, i) => i).sort((a, b) => tp[a][0] - tp[b][0]), xs = ord.map((i) => tp[i][0]);
      let sp = 9; for (let i = 1; i < xs.length; i++) sp = Math.min(sp, xs[i] - xs[i - 1]);
      const pre = sp - 0.05 * Math.abs((xs[0] + xs[xs.length - 1]) / 2 - 0.5);
      if (best && pre <= best.score) return;   // names are lifted >= 0: the score can only drop below pre
      for (const q of linePts) { const p = P(q); if (!p || p[0] < 0.04 || p[0] > 0.96 || p[1] < 0.06 || p[1] > 0.725) return; }
      const faces = [];
      for (const qT of qTs) { const tb = bx(qT); if (all && isOut(tb)) continue; if (!tb || tb[0] < 0.03 || tb[1] < 0.02 || tb[2] > 0.97 || tb[3] > 0.6) return; faces.push(tb); }
      for (const qS of qSs) { const sb = bx(qS); if (isOut(sb)) continue; if (sb[1] < 0.008 || sb[0] < 0.008 || (all && sb[2] > 0.992)) return; faces.push([sb[0], sb[1], Math.min(1, sb[2]), sb[3]]); }   // her head: whole or out (l04: it may leave at the right side)
      for (const p of tp) for (const f of faces) if (p[0] > f[0] - 0.03 && p[0] < f[2] + 0.03 && p[1] < f[3] + 0.015) return;   // no hat / tower top on or in front of a face
      const cols = ord.map((i) => { const b = bx(bodies[i]); return [tp[i][0] - 0.03, tp[i][1], tp[i][0] + 0.03, b ? b[3] : tp[i][1] + 0.2]; });   // the pawn and its tower: a thin column under its top (a wide coin base sits low)
      const coinR = coinQ.length ? bx(coinQ) : null, keep = coinR ? [coinR] : [];
      const lay = all ? [namesAboveRows(ord.map((i) => tp[i]), ord.map((i) => ws[i]), th, { cols, keep })]
        : ord.map((i, k) => namesAboveRows([tp[i]], [ws[i]], th, { cols: [cols[k]], extra: cols.filter((c, j) => j !== k), keep }));
      let lift = 0;
      for (const nm of lay) {
        if (nm.bad) return;
        for (const r of nm) { if (r[1] < 0.055) return; for (const f of faces) if (hitR(r, f, 0.015)) return; const ex = Math.min(r[2], Math.max(r[0], r[4])); lift = Math.max(lift, Math.hypot((ex - r[4]) * K.W / K.H, r[5] - r[3])); }
      }
      if (lift > 0.16) return;   // short lines only
      if (coinR) for (const nm of lay) for (const r of nm) if (hitR(r, coinR, 0.006)) return;
      if (all && !PICK_SPOTS.some((q) => !faces.some((f) => hitR(q, f, 0.01)) && !lay[0].some((r) => hitR(q, r, 0.015)) && !cols.some((c) => hitR(q, [c[0] - 0.03, c[1], c[2] + 0.03, c[3]], 0.01)) && !(coinR && hitR(q, coinR, 0.01)))) return;
      const score = pre - 0.25 * lift;
      if (!best || score > best.score) best = { score, pos, aim, fov, sp, lift, all, coinQ, k: [az, el, d, ax, ay, az0, fov] };
    };
    for (let az = -0.5; az <= 0.501; az += 0.1) for (let el = -0.2; el <= 0.601; el += 0.05) for (let d = 0.15; d <= 1.001; d += 0.05) for (let ax = cx - 0.15; ax <= cx + 0.151; ax += 0.05) for (let ay = 0; ay <= 0.451; ay += 0.05) for (const dz of [-0.2, 0, 0.2]) for (const fv of [50, 65]) tryPose(az, el, d, ax, ay, cz + dz, fv);
    for (const h of [0.025, 0.0125]) if (best) { const [a0, e0, d0, x0, y0, z0, f0] = best.k; for (const da of [-2 * h, 0, 2 * h]) for (const de of [-h, 0, h]) for (const dd of [-h, 0, h]) for (const dx of [-h, 0, h]) for (const dy of [-h / 2, 0, h / 2]) for (const dz of [-2 * h, 0, 2 * h]) tryPose(a0 + da, e0 + de, d0 + dd, x0 + dx, y0 + dy, z0 + dz, f0); }
    return best;
  };
  /** frame check 2026-11-16 (h-pick5): l04 (names one at a time, the advantages piling up) searched with his face whole put the camera
   *  far back (pawns ~0.07 of the width apart). l04 now takes the pose of the next line-up of the same four (l05 "pick your winner",
   *  three or more names together: faces whole or fully out, the pawns large), so both shots share one camera and there is no jump.
   *  The coin's keep-out stays with l05 (no coin flips in l04). */
  const sharedPick = (sh) => {
    const ids = [...(sh.subject?.players ?? [])].sort((a, b) => a - b).join(','); if (!ids || sh.subject?.coins?.length) return null;
    const nx = (show.shots ?? []).find((q) => q.t0 >= sh.t1 - 1e-3 && q.t0 < sh.t1 + 8 && q.kind === 'block' && q.t1 <= endT - 1.2 && [...(q.subject?.players ?? [])].sort((a, b) => a - b).join(',') === ids);
    if (!nx) return null;
    const I2 = shotInfo(show.state(clamp((nx.t0 + nx.t1) / 2, 0, K.duration))); if (!I2.lineup) return null;
    if (I2.pickPose === undefined) I2.pickPose = pickPose(nx, I2.lineup);
    return I2.pickPose?.all ? { ...I2.pickPose, coinQ: [] } : null;
  };
  /** the board fills the frame: its near corners may leave the frame sides a little (the near edge is the widest line of the picture) */
  const boardGroups = (pts) => { const near = pts.filter((q) => q.z > 0.1), rest = pts.filter((q) => q.z <= 0.1); return [{ pts: near, box: [-0.07, 0.3, 1.07, 0.86] }, { pts: rest, box: [0.03, 0.3, 0.97, 0.86] }].filter((g) => g.pts.length); };
  /** a head fully out (chin above the frame top) or fully in */
  const headGroup = (who, mode, Hm) => (mode === 'out' ? { pts: [Hm.clone().add(V(0, -0.16, 0))], box: [-3, -3, 4, -0.05] } : { pts: headPts(Hm, who === 's' ? 0.1 : 0.13), box: [0.02, 0.025, 0.98, 0.56] });
  const planRaw = (st, t, txtMode = null, noHead = false) => {
    const sh = st.shot, I0 = shotInfo(st), curB = objects.bounds(I0.sub, st), subPts0 = I0.sub.king && I0.endPts.length ? I0.endPts : boxPts(curB, I0.sub).concat(movePts(I0.sub.moves, st), I0.endPts), I = { ...I0, subB: curB, subPts: subPts0.length ? subPts0 : [V(-0.08, 0, -0.08), V(0.08, 0.08, 0.08)] }, u = clamp(sh.u ?? 0, 0, 1), e = smooth(u), v = I.h, txt = txtMode ?? textWin(t);
    const topTag = (st.tags ?? []).some((tg) => tg.anchor?.screen && tg.anchor.screen[1] < 0.32 && (tg.opacity ?? 1) > 0.05);
    const H = cast.tellerHead(t), SKH = cast.skHead(t), face = txt ? FACE_TXT : topTag ? FACE_LOW : FACE, hd = txt ? [H.clone().add(V(0, -0.07, 0))] : headPts(H);
    const tall = I.boardTop > 0.3;
    let fitOpt = {}, direct = null, fov = 30, fstop = 5.6, focus = null, people = true, groups, az = 0, el = 0.4, dmul = 1, sf = [V(0, 0.05, -0.1), 0.6];
    const sideAz = v < 0.5 ? -1 : 1;
    // object shots look OUTWARD across the board (from the side of the board away from the subject): behind the subject is the dark
    // room, not his chest and arms (QA r1: a big blurred arm at the top of object shots, his face a blur behind the king)
    const pushH = cast.pushHand ? cast.pushHand(sh.t0, sh.t1) : null;
    const outAz = pushH ? (pushH === 'R' ? 1 : -1) : (I.subB.center.x < -0.12 ? 1 : -1);   // a push: from the side opposite his arm (l46: the arm crossed the lens)   // centre subjects too from his left (-x): the Skeptic (+x) and he both fall outside the lens
    // people shots (fix round 1): the camera is LOW and CLOSE; the board fills the lower-middle (>= 55 % of the width), his head and
    // shoulders sit in the upper third above it, the Skeptic at the side. Board-led kinds (high) make the board the picture.
    const BOARDP = BOARD.concat(tall ? [] : [V(0, Math.min(I.boardTop, 0.12), 0)]);
    const objNow = inObjection(t) || sh.kind === 'skeptic';
    switch (sh.kind) {
      case 'wide': {
        const variant = topTag ? 0 : Math.floor(v * 3);
        if (txt && t >= endT && I0.nextLineup) {   // frame check 2026-11-15: before the l65 line-up the faces already sit BESIDE the end text (top middle), whole
          const tm = clamp(sh.t1 - 0.3, sh.t0, sh.t1);
          fov = 64; if (!I0.endAng) I0.endAng = pickAngle(endGroups(BOARD, cast.tellerHead(tm), cast.skHead(tm)), END_BOARD, END_AZ, END_EL.concat([0.22, 0.3]), fov);
          az = I0.endAng.az; el = I0.endAng.el; groups = endGroups(BOARD, H, SKH)(I0.endAng.box);
        } else if (txt) { az = 0.1 * sideAz; el = 0.5; groups = [{ pts: BOARD, box: BOARD_TXT }, { pts: [H.clone().add(V(0, -0.07, 0))], box: FACE_TXT }]; }
        else {
          az = objNow ? -0.2 : variant === 1 ? -0.15 : variant === 2 ? 0.17 : topTag ? -0.1 : 0.06 * sideAz; el = 0.12; fov = 54;   // a turned board grows tall, not wide: small az
          groups = [...boardGroups(BOARDP), { pts: headPts(H), box: topTag ? [0.5, 0.03, 0.97, 0.42] : [0.1, 0.03, 0.9, 0.42] }];
          if (objNow) groups.push({ pts: skPts(t), box: [0.45, 0.03, 0.99, 0.62] });
        }
        focus = H.clone().lerp(V(0, 0.03, 0), 0.45); fstop = 7;
        break;
      }
      case 'high': {   // the board is the picture: it fills the frame from a high angle; he is a partial figure (hands, chest) behind it
        if (I0.rain && !txt) {   // l42 (fix round 2): the rain reads only close: the middle 5 x 5 squares, the drops falling into the frame
          const R = BOARD.map((q) => q.clone().multiplyScalar(0.62)).concat([V(0, Math.min(I.boardTop, 0.12), 0)]);
          az = -0.18; el = 0.62; fov = 32; groups = [{ pts: R, box: [-0.02, 0.18, 1.02, 0.8] }]; focus = V(0, 0.04, 0); fstop = 6.3; people = false; sf = [V(0, 0.05, 0), 0.4]; break;
        }
        az = -0.22; el = tall && !txt ? 0.3 : 0.55;   /* from his left: from the right her arms crossed the frame */ fov = tall && !txt ? 50 : 34;   // giant towers: lower and wider, his face beside them
        groups = [{ pts: BOARD.concat([V(0, Math.min(I.boardTop, 0.3), 0)]), box: txt ? BOARD_TXT : [0.02, 0.06, 0.98, 0.84] }];
        if (txt) groups.push({ pts: hd, box: FACE_TXT });
        else if (tall) groups.push({ pts: headPts(H), box: [0.08, 0.03, 0.92, 0.5] });   // a giant tower is the picture: keep his whole face beside it, never half cut
        if (objNow) groups.push({ pts: skPts(t), box: [0.5, 0.03, 0.99, 0.7] });
        focus = V(0, 0.05, -0.03); fstop = 6.3; sf = [V(0, 0.05, -0.1), 0.6]; break;
      }
      case 'low': { az = 0.2 * sideAz; el = 0.14; fov = 54; groups = [...(txt ? [{ pts: BOARD.map((p) => p.clone()), box: BOARD_TXT }] : boardGroups(BOARD)), { pts: hd, box: txt ? FACE_TXT : [0.1, 0.03, 0.9, 0.42] }]; if (tall) groups.push({ pts: [V(-0.19, Math.min(I.boardTop, 0.45), -0.14)], box: [0.0, 0.02, 1.0, 0.85] });   /* the giant tower rises past his head: its own box */ if (objNow) groups.push({ pts: skPts(t), box: [0.45, 0.03, 0.99, 0.62] }); focus = V(0, 0.04, 0.05); fstop = 5.6; break; }
      case 'skeptic': {   // her (head + raised hand) with the board and her black pawn, him across the table: a three-way two-shot
        az = -0.55; el = 0.2; fov = 38; const pawn = objects.anchor({ skeptic: true }, st) ?? V(0, 0.05, 0.29);
        if (I0.skTower) {   // l64a (fix round 2): her own 100-coin tower and the pawn that hops on it are the subject at the near edge, her smile and him behind
          // the tower is ~3 cm tall: with both faces in frame it read as a speck (QA r2). Her face and her tower; he is wherever he falls
          az = -0.55; el = 0.03; fov = 58;   // wide and close: the near tower large, her face behind it (the camera moves along a line through the tower)
          fitOpt = { centre: I0.skTower.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.skTower.length), d0: 0.4 };
          groups = [{ pts: I0.skTower, box: [0.12, 0.44, 0.58, 0.74] }, { pts: skPts(t), box: [0.5, 0.03, 0.97, 0.52] }];   // no text-window variant: the end text comes later (l65 'which')
          focus = I0.skTower.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.skTower.length).lerp(SKH, 0.35); fstop = 8; break;
        }
        groups = [{ pts: [pawn.clone().add(V(-0.03, 0.03, 0)), pawn.clone().add(V(0.03, -0.03, 0))].concat(BOARD), box: [0.02, 0.3, 0.8, 0.85] }, { pts: skPts(t), box: txt ? FACE_TXT : [0.5, 0.04, 0.98, 0.6] }];
        if (!txt) groups.push({ pts: headPts(H), box: [0.02, 0.03, 0.55, 0.42] });
        focus = pawn.clone().lerp(SKH, 0.5); fstop = 5.6; break;
      }
      case 'coin': {
        if (I0.coinDemo) { az = -0.2; el = 0.9; fov = 30; groups = [{ pts: I.subPts, box: [0.16, 0.14, 0.84, 0.72] }]; focus = I.subB.center; fstop = 5.6; people = false; sf = [I.subB.center, 0.3]; break; }   // l49: the coin AND the demo tower, from above the crowd of pawns
        az = 0.3 * sideAz; el = 0.22; fov = 26; groups = [{ pts: I.subPts, box: [0.2, 0.14, 0.8, 0.68] }]; focus = I.subB.center; fstop = 3.2; people = false; sf = [I.subB.center, 0.3]; break;
      }
      case 'tower': { az = 0.9 * outAz; el = 0.07; fov = 30; groups = [{ pts: I.subPts, box: [0.25, I0.tagged ? 0.22 : 0.06, 0.75, 0.72] }];   /* frame check 2026-11-15: room above the top for its number tag (l22: '90%' went beside the top, its line across her glasses) */ focus = I.subB.center; fstop = 7; people = false; sf = [I.subB.center, 0.35]; break; }
      case 'top': { az = 0.02; el = 1.38; fov = 34; groups = [{ pts: I.subPts.concat(sh.subject?.board ? BOARD : []), box: [0.08, 0.06, 0.92, 0.74] }]; focus = I.subB.center; fstop = 6.3; people = false; break; }
      case 'tally': { az = 0.55 * outAz; el = 0.68; fov = 28; groups = [{ pts: I.subPts, box: I0.longTag ? [0.08, 0.06, 0.92, 0.56] : SUBJ }];   /* frame check 2026-11-15 (l38): long tags ('under 10 coins: 70 in 100') need a free band under the columns, not the pawn row */ focus = I.subB.center; fstop = 4.5; people = false; sf = [I.subB.center, 0.35]; break; }
      case 'row': {   // l59 (fix round 2): closer and lower, the sorted row across the full width, the two people behind it
        const rp = I0.row ?? I.subPts;
        az = 0.0; el = 0.16; fov = 40; groups = [{ pts: rp, box: [0.01, 0.4, 0.99, 0.72] }];   // the row fills the width; the people behind fall where they fall (heads checked below)
        focus = rp.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / rp.length); fstop = 6.3; fitOpt = { centre: focus.clone(), d0: 0.6 }; break;
      }
      case 'block': {
        if (I0.lineup) {   // l65 (fix round 2): the four hats in a line on the table, seen frontally (left to right unambiguous), large in the
          // lower middle (their name tags above them, under the end text band), both people behind it with their faces above 21 %
          az = 0.12; el = 0.15; fov = 50;   // wide and close: the line-up large in front, the faces small behind
          fitOpt = { centre: I0.lineup.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.lineup.length), d0: 0.5 };
          if (txt) {   // frame check 2026-11-15: the end text sits in the top middle: both faces whole and off it, the names off both faces (endPose)
            if (I0.endPose === undefined) I0.endPose = endPose(sh);
            if (I0.endPose) { direct = I0.endPose; fov = direct.fov; groups = []; focus = I0.lineup.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.lineup.length); fstop = 9; people = true; break; }
            const tm = clamp(sh.t1 - 0.5, sh.t0, sh.t1);
            fov = 70; if (!I0.endAng) I0.endAng = pickAngle(endGroups(I0.lineup, cast.tellerHead(tm), cast.skHead(tm)), END_LINE, END_AZ, END_EL, fov, fitOpt);
            az = I0.endAng.az; el = I0.endAng.el; groups = endGroups(I0.lineup, H, SKH)(I0.endAng.box);
            focus = I0.lineup.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.lineup.length); fstop = 9; people = true; break;
          }
          if (I0.pickPose === undefined) I0.pickPose = sh.t1 <= endT - 1.2 ? sharedPick(sh) ?? pickPose(sh, I0.lineup) : null;   // not the closing line-up (its end-text blend keeps its own plan)   // c01 (l04 / l05): one fixed camera, names right above the pawns
          if (I0.advTags === undefined) {   // l04: every piece tag of the four during the shot (its advantage: '55 in 100', '2x', ...), laid out by macro-tags as ONE fixed block
            const ids = new Set(sh.subject?.players ?? []), seen = new Map();
            for (let tq = sh.t0 + 0.05; tq < sh.t1; tq += 0.2) for (const g of show.state(tq).tags ?? []) if (g.kind !== 'name' && g.anchor?.player != null && ids.has(g.anchor.player) && (g.opacity ?? 1) > 0.05) seen.set(g.text, [g.anchor.player, tq]);
            // each slot from its pawn's top at the LAST moment its tag shows (hop peak): the Heir's tower is full height then, so its
            // '1,000 coins' slot sits above the finished tower from the start and no slot moves while the tower grows
            I0.advTags = seen.size ? [...seen].map(([text, [player, tq]]) => { const s2 = show.state(tq); return { text, player, top: objects.anchor({ player }, { ...s2, players: s2.players.map((p) => (p.id === player ? { ...p, hop: 1 } : p)) }) }; }) : null;
          }
          if (I0.pickPose) { direct = I0.pickPose; fov = direct.fov; groups = [{ pts: I0.lineup, box: [0.04, 0.06, 0.96, 0.725] }]; focus = I0.lineup.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.lineup.length); fstop = 9; people = true; break; }
          const eyesOf = (Q) => [Q.clone().add(V(0, 0.1, 0)), Q.clone().add(V(0, -0.02, 0))];   // crown to the eye line in the top band (chins may reach into the text band)
          groups = [{ pts: I0.lineup, box: txt ? [0.18, 0.55, 0.82, 0.735] : [0.16, 0.5, 0.84, 0.72] },   /* 2026-11-15: outside the end text (c01 line-up) the captions own 74-88 %: the hats sit higher */ { pts: eyesOf(H), box: [0.05, 0.0, 0.7, 0.2] }, { pts: eyesOf(SKH), box: [0.3, 0.0, 1.3, 0.2] }];   // her face may leave the frame at the right side, never through the top. 2026-11-15: the Host film puts its end text at the TOP (film.json end_text_y), so both faces stay visible under it
          focus = I0.lineup.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I0.lineup.length); fstop = 9; people = true; break;
        } az = sideAz < 0 ? -0.3 : 0.08; el = 0.82; fov = 28; groups = [{ pts: I.subPts, box: SUBJ }]; focus = I.subB.center; fstop = 4; people = false; sf = [I.subB.center, 0.3]; break; }
      case 'pair': if (I0.sub.extras?.includes('pot')) {   // l56 (fix round 2): closer and lower than the other pairs: the thick slice from the giant tower vs the thin sliver
        az = -0.42; el = 0.42; fov = 28; groups = [{ pts: I.subPts, box: [0.04, 0.12, 0.96, 0.72] }]; focus = I.subB.center; fstop = 5.6; people = false; sf = [I.subB.center, 0.35]; break;
      } else { az = sideAz < 0 ? -0.32 : 0.08; el = 0.62;   /* never from her side (+x): her arms came into the frame */ fov = 28; groups = [{ pts: I.subPts, box: [0.08, 0.2, 0.92, 0.72] }];   /* room above the far player for his pointing hand (l07) */ focus = I.subB.center; fstop = 5.6; people = false; sf = [I.subB.center, 0.35]; break; }
      case 'demo': { az = 0.9 * outAz; el = 0.5; fov = 28; groups = [{ pts: I.subPts, box: SUBJ }]; focus = I.subB.center; fstop = 6.3; people = false; sf = [I.subB.center, 0.35]; break; }
      case 'player': default: { az = I0.steep ? 0 : 0.9 * outAz; el = I0.steep ? 1.45 : 0.55; fov = 26; groups = [{ pts: I.subPts, box: [0.2, 0.12, 0.8, 0.72] }];   /* l43: a steep pan (no whip through his face); framing both pawns showed both heads at the frame edges, so it ends on the rich pawn */ focus = I.subB.center; fstop = 5.6;   /* QA r1: blur walls and blurred faces behind */ people = false; sf = [I.subB.center, 0.3]; break; }
    }
    // the move
    const mv = sh.move ?? 'hold';
    let fr, toFr = null;
    if (mv === 'orbit') az += (e - 0.5) * 0.7 * (v < 0.5 ? 1 : -1);
    if (mv === 'crane') el += 0.32 * e;
    if (mv === 'drop') el += 0.45 * (1 - e);
    // fix round 2: no head sliced by the frame top, his OR hers, in any kind (QA: heads cut through the eyes in l19 l22 l24 l28 l29 l56
    // l64). Decided ONCE per shot from the mid-shot plan (pure: does not depend on which frame is drawn first). When the frame would
    // slice a head, the camera angle is nudged (higher pushes a head behind the subject out of the top, lower or sideways brings it in or
    // moves it off the frame) until neither head is sliced at the move's near and far distance and the subject keeps >= 80 % of its size;
    // failing that, a people shot takes the head fully in. Heads that already have their own group are left alone.
    if (!txt && !noHead && !direct && sh.kind !== 'top') {   // a direct pose (c01 line-up) already keeps both faces whole and clear   /* straight down: heads are seen from above, never sliced through the face; pulling back shrank the board (l24) */
      if (I0.headFix === undefined) {
        const tm = (sh.t0 + sh.t1) / 2, stm = show.state(tm), pm = planRaw(stm, tm, false, true), base = pm.groups, subj = base[0].pts;
        const heads = { t: cast.tellerHead(tm), s: cast.skHead(tm) }, own = (Hm) => base.some((g) => g.pts.some((q) => q.distanceTo(Hm) < 0.06));
        const check = { t: !own(heads.t), s: !own(heads.s) };
        // frame check 2026-11-15: faces are keep-out zones for tags AND their leader lines. A leader line ends at its piece, so a tagged
        // piece that lands on a face on screen (l04 the Heir's tower top at his chin, l21 the richest tower top on his eye) needs another
        // camera: those anchors count as a cut head. Sampled through the shot, with both heads at that moment
        const tagS = [];
        if (I0.tagged) for (let k = 0; k < 6; k++) { const ts = sh.t0 + (sh.t1 - sh.t0) * (k + 0.5) / 6, s2 = show.state(ts), an = (s2.tags ?? []).filter((g) => !g.anchor?.screen && (g.opacity ?? 1) > 0.05).map((g) => objects.anchor(g.anchor, s2, 'tag')).filter(Boolean); if (an.length) tagS.push({ an, F: [[cast.tellerHead(ts), 0.13], [cast.skHead(ts), 0.12]] }); }
        const tagOnFace = (pos, aim) => {
          const fwd = aim.clone().sub(pos).normalize(), P = (q) => (q.clone().sub(pos).dot(fwd) < 0.02 ? null : project(pos, aim, pm.fov, q));
          for (const S of tagS) for (const [Q, r] of S.F) { const a = P(Q.clone().add(V(-r - 0.04, r, 0))), b = P(Q.clone().add(V(r + 0.04, -r - 0.04, 0)));   /* + room beside the face for the tag itself (l21: the anchor 3 % off his cheek, the line across his eyes) */   /* down to the beard: a tower top at his chin (l04) */ if (!a || !b) continue; for (const A of S.an) { const q = P(A); if (q && q[0] > Math.min(a[0], b[0]) && q[0] < Math.max(a[0], b[0]) && q[1] > Math.min(a[1], b[1]) && q[1] < Math.max(a[1], b[1])) return true; } }
          return false;
        };
        const meas = (g, dEl, dAz, kd = 1) => {
          const f = fit(g, dirOf(pm.az + dAz, pm.el + dEl), pm.fov, pm.fitOpt); let x0 = 9, x1 = -9, y0 = 9, y1 = -9, cut = false;
          for (const k of [0.95, 1, 1.12]) {
            const pos = f.c.clone().add(f.pos.clone().sub(f.c).multiplyScalar(k * kd)), aim = f.aim.clone().add(pos.clone().sub(f.pos)), P = (q) => project(pos, aim, pm.fov, q);
            if (k === 1) { for (const q of subj) { const [a, b] = P(q); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); } if (tagS.length && tagOnFace(pos, aim)) cut = true; }
            const hb = {};
            for (const w of ['t', 's']) {
              const Q = heads[w], r = w === 's' ? 0.1 : 0.13, top = 0.5 - 0.5 * P(Q.clone().add(V(0, 0.105, 0)))[1], chin = 0.5 - 0.5 * P(Q.clone().add(V(0, -0.125, 0)))[1], hx = 0.5 + 0.5 * P(Q)[0];
              const fwd = f.aim.clone().sub(f.pos).normalize(), front = Q.clone().sub(pos).dot(fwd) > 0.05;
              const xa = 0.5 + 0.5 * P(Q.clone().add(V(-r, 0, 0)))[0], xb = 0.5 + 0.5 * P(Q.clone().add(V(r, 0, 0)))[0], x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
              if (front) hb[w] = [x0, top, x1, chin];
              if (!check[w]) continue;
              if (top < 0.004 && chin > 0.006 && hx > -0.02 && hx < 1.02) cut = true;
              // frame check 2026-11-15 (l62): a head cut by the LEFT or RIGHT edge (vertically in frame) is a cut head too
              if (front && chin > 0.03 && top < 0.9 && ((x0 < -0.003 && x1 > 0.03) || (x1 > 1.003 && x0 < 0.97))) cut = true;
            }
            if (k === 1 && hb.t && hb.s) {   // l51: her head in front of his face (the two faces overlap by more than a third of his)
              const o = Math.max(0, Math.min(hb.t[2], hb.s[2]) - Math.max(hb.t[0], hb.s[0])) * Math.max(0, Math.min(hb.t[3], hb.s[3]) - Math.max(hb.t[1], hb.s[1])), A = (hb.t[2] - hb.t[0]) * (hb.t[3] - hb.t[1]);
              if (A > 0 && o / A > 0.35 && hb.t[2] > 0 && hb.t[0] < 1 && hb.t[3] > 0 && hb.t[1] < 1) cut = true;
            }
            if (k === 1 && !pm.people && x1 > x0) for (const w of ['t', 's']) {   // object shots (l51 her head across the tower, l62 the king tower across his face): no face overlapping the subject
              const B = hb[w]; if (!B || B[2] < 0 || B[0] > 1 || B[3] < 0 || B[1] > 1) continue;
              const S = [0.5 + 0.5 * x0, 0.5 - 0.5 * y1, 0.5 + 0.5 * x1, 0.5 - 0.5 * y0], o = Math.max(0, Math.min(B[2], S[2]) - Math.max(B[0], S[0])) * Math.max(0, Math.min(B[3], S[3]) - Math.max(B[1], S[1]));
              if (o / Math.max(1e-6, (B[2] - B[0]) * (B[3] - B[1])) > 0.2) cut = true;
            }
            if (k === 1 && hb.t && pm.people && objects.columns) for (const c of objects.columns(stm)) {   // l64: a tall tower standing in front of his face
              if (c.top < 0.15) continue; const a = P(V(c.x, c.top, c.z)), cx = 0.5 + 0.5 * a[0], cy = 0.5 - 0.5 * a[1], T = hb.t, w = T[2] - T[0];
              if (cx > T[0] + 0.25 * w && cx < T[2] - 0.25 * w && cy < T[1] + 0.6 * (T[3] - T[1])) cut = true;
            }
          }
          return { cut, size: x0 < -1.06 || x1 > 1.06 || y0 < -1.06 || y1 > 1.06 || f.d < 0.15 ? 0 : Math.max((x1 - x0) / 2, (y1 - y0) / 2) };
        };
        const m0 = meas(base, 0, 0);
        I0.headFix = { dEl: 0, dAz: 0, kd: 1, add: [] };
        if (m0.cut) {
          const need = (pm.people ? 0.88 : 0.72) * m0.size, tries = [];
          for (const dEl of [0, 0.12, -0.1, 0.24, -0.2, 0.36, 0.5, 0.7]) for (const dAz of [0, 0.28, -0.28, 0.5, -0.5, 0.8, -0.8]) for (const kd of [1, 0.85, 1.18, 0.72, 1.35]) if (dEl || dAz || kd !== 1) tries.push([dEl, dAz, kd, Math.abs(dEl) + 0.7 * Math.abs(dAz) + 0.8 * Math.abs(Math.log(kd))]);
          tries.sort((a, b) => a[3] - b[3]);
          let ok = null;
          for (const [dEl, dAz, kd, effort] of tries) { const m = meas(base, dEl, dAz, kd); if (m.cut || m.size < need) continue; ok = { dEl, dAz, kd, add: [] }; break; }
          if (!ok && pm.people) for (const w of ['t']) {   /* her head is not taken in at the cost of the board (it shrank wide boards to ~52 %) */ if (!check[w]) continue; const gg = base.concat([headGroup(w, 'in', heads[w])]), m = meas(gg, 0, 0); if (!m.cut && m.size >= 0.75 * m0.size) { ok = { dEl: 0, dAz: 0, kd: 1, add: [w] }; break; } }
          if (ok) I0.headFix = ok; else I0.headFix.failed = true;
        }
      }
      az += I0.headFix.dAz; el += I0.headFix.dEl;
      for (const w of I0.headFix.add) groups = groups.concat([headGroup(w, 'in', w === 't' ? H : SKH)]);
    }
    if (noHead) return { groups, az, el, fov, people, fitOpt };
    fr = direct ? { pos: direct.pos.clone(), aim: direct.aim.clone(), c: direct.aim.clone() } : fit(groups, dirOf(az, el), fov, fitOpt);
    if (DBG) DBG.g = groups.map((g) => [g.box, g.pts.map((q) => q.toArray().map((x) => +x.toFixed(2)))]);
    lastFit.groups = groups; lastFit.fr = fr;
    if ((mv === 'tilt' || mv === 'pan' || mv === 'drop' || mv === 'pull') && I.toPts.length) {   // l45a (2026-11-15): a pull with a `to` ends framing the whole `to` (the 90 % tower was cut and its tag floated)
      // a drop ends looking DOWN on what lies on the board (l63, fix round 2: the fallen Scholar and Worker large, not edge-on from the board top)
      toFr = mv === 'drop' ? fit([{ pts: I.toPts, box: [0.12, 0.16, 0.88, 0.72] }, { pts: [H.clone().add(V(0, -0.16, 0))], box: [-3, -3, 4, -0.05] }], dirOf(az * 0.6, Math.max(0.62, el - 0.45 * (1 - e))), fov)
        : fit([{ pts: I.toPts, box: groups[0].box }].concat(people ? groups.slice(1) : []), dirOf(az, el), fov);
    }
    let pos = fr.pos, aim = fr.aim;
    if (mv === 'push') { dmul = lerp(1.1, 0.96, e); }   // fix round 1: a push starts closer (it read small at its start)
    if (I0.lineup || I0.skTower) dmul = 1;
    else if (mv === 'pull') { dmul = toFr ? 1 : lerp(0.96, 1.15, e); }
    else if (mv === 'crane') { dmul = lerp(1.0, 1.3, e); }
    else if (mv === 'hold') { dmul = lerp(1.06, 1.0, e); }
    if (toFr) {
      if (mv === 'tilt') { pos = fr.pos.clone().lerp(toFr.pos, 0.5 + 0.0 * e); aim = fr.aim.clone().lerp(toFr.aim, e); }
      else { pos = fr.pos.clone().lerp(toFr.pos, e); aim = fr.aim.clone().lerp(toFr.aim, e); }
    }
    if (!txt && I0.headFix) dmul *= I0.headFix.kd ?? 1;
    if (dmul !== 1) { const off = pos.clone().sub(fr.c).multiplyScalar(dmul - 1); pos = pos.clone().add(off); aim = aim.clone().add(off); }
    if (mv === 'pan' && !toFr) { const side = V().crossVectors(up, pos.clone().sub(aim)).normalize().multiplyScalar((sh.kind === 'row' ? 0.03 : 0.12) * (e - 0.5) * (v < 0.5 ? 1 : -1)); pos = pos.clone().add(side); aim = aim.clone().add(side); }
    pos.y = Math.max(pos.y, 0.035);
    if (objects.columns) for (const c of objects.columns(st)) { const dxz = Math.hypot(pos.x - c.x, pos.z - c.z); if (dxz < c.r + 0.03 && pos.y < c.top + 0.04) { const lift = c.top + 0.04 - pos.y; pos = pos.clone(); pos.y += lift; aim = aim.clone(); aim.y += lift * 0.5; } }
    let fc = focus ?? fr.c;
    if (mv === 'rack' && I.toPts.length) { const tc = I.toPts.reduce((a, q) => a.add(q), V()).multiplyScalar(1 / I.toPts.length); fc = fc.clone().lerp(tc, smooth((u - 0.25) / 0.4)); fstop = Math.min(fstop, 3.5); }
    // fix round 2: the focus and the f-stop follow the subject (QA: l49 l63 l64 blurred). Focus at the harmonic middle of the subject's
    // nearest and farthest visible points, f-stop opened only as far as keeps both within ~3.5 px of blur at 1080 (people behind stay soft)
    if (!people || I0.lineup || I0.skTower || sh.kind === 'row') {
      const fwd = aim.clone().sub(pos).normalize(), th = Math.tan(fov * Math.PI / 360), sensor = K.lens?.sensor ?? 0.02025;
      const dofOf = (pts) => { let n = 1e9, x = 0; for (const q of pts) { const pr = project(pos, aim, fov, q); if (Math.abs(pr[0]) > 1.08 || Math.abs(pr[1]) > 1.08) continue; const d = q.clone().sub(pos).dot(fwd); if (d < 0.02) continue; n = Math.min(n, d); x = Math.max(x, d); } if (!(x > 0)) return null; return { focus: pos.clone().addScaledVector(fwd, 2 / (1 / n + 1 / x)), N: sensor * (1 / n - 1 / x) / 2 / (4 * th * th * 0.0026) }; };
      const own = (I0.lineup ?? I0.skTower ?? (I.subB.pts?.length ? I.subB.pts : I.subPts));
      const toward = (mv === 'pan' || mv === 'tilt' || mv === 'drop' || mv === 'pull') && I.toPts.length;
      if (mv === 'rack' && I.toPts.length) { const a = dofOf(own), b = dofOf(I.toPts), k = smooth((u - 0.25) / 0.4); if (a && b) { fc = a.focus.lerp(b.focus, k); fstop = clamp(Math.max(fstop, lerp(a.N, b.N, k)), fstop, 11); } }
      else if (toward) { const a = dofOf(own), b = dofOf(I.toPts); if (a && b) { fc = a.focus.lerp(b.focus, e); fstop = clamp(Math.max(fstop, lerp(a.N, b.N, e)), fstop, 16); } else if (a || b) { fc = (a ?? b).focus; fstop = clamp(Math.max(fstop, (a ?? b).N), fstop, 16); } }
      else { const a = dofOf(own); if (a) { fc = a.focus; fstop = clamp(Math.max(fstop, a.N), fstop, 16); } }
    }
    return { pos, aim, fov, fstop, focus: fc, people, sf, kind: sh.kind, namesBelow: !!(I0.lineup && txt && direct), namesAbove: !!(I0.lineup && !txt && direct), keepOut: I0.lineup && !txt && direct?.coinQ?.length ? direct.coinQ : null, advTags: I0.lineup && !txt && direct ? I0.advTags ?? null : null };   // l65: the names go under the pawns' feet (macro-tags reads avoid.namesBelow)
  };
  /** continuous shots (shot.continuous true) start where the previous shot is at that moment and ease into their own plan */
  const startCache = new Map();
  const mixPlan = (a, b, k) => (k <= 0 ? a : k >= 1 ? b : { ...b, pos: a.pos.clone().lerp(b.pos, k), aim: a.aim.clone().lerp(b.aim, k), fov: lerp(a.fov, b.fov, k), fstop: lerp(a.fstop, b.fstop, k), focus: a.focus.clone().lerp(b.focus, k) });
  const planTxt = (st, t) => {
    const sh = st.shot;
    // the hook ends at hookDur, the end text starts at endT: blend over 1.2 s (when that moment is inside this shot)
    if (t >= hookDur - 0.01 && t < hookDur + 1.2 && sh.t0 < hookDur) return mixPlan(planRaw(st, t, true), planRaw(st, t, false), smooth((t - hookDur) / 1.2));
    if (t >= endT - 1.2 && t < endT && sh.t1 > endT && sh.t0 < endT - 0.05) return mixPlan(planRaw(st, t, false), planRaw(st, t, true), smooth((t - endT + 1.2) / 1.2));
    return planRaw(st, t);
  };
  const plan = (st, t, depth = 0) => {
    const p = planTxt(st, t), sh = st.shot;
    if (!sh.continuous || depth > 2 || !(sh.t0 > 0)) return p;
    let s0 = startCache.get(sh.id);
    if (s0 === undefined) { const ps = show.state(sh.t0 - 1e-3); s0 = ps.shot.id === sh.id ? null : plan(ps, sh.t0 - 1e-3, depth + 1); startCache.set(sh.id, s0 || false); if (startCache.size > 64) startCache.clear(); }
    if (!s0) return p;
    const k = smooth(clamp((t - sh.t0) / Math.max(0.8, Math.min(2.5, (sh.t1 - sh.t0) * 0.7))));
    return { ...p, pos: s0.pos.clone().lerp(p.pos, k), aim: s0.aim.clone().lerp(p.aim, k), fov: lerp(s0.fov, p.fov, k), fstop: lerp(s0.fstop, p.fstop, k), focus: s0.focus.clone().lerp(p.focus, k) };
  };

  /* ------------------------------------------------------------------ avoid rectangles for the tag layout (object layer reads objects.avoidRects) */
  // faces, upper bodies and hands of both puppets in screen fractions {x0, y0, x1, y1} (y from the top), for THIS frame's camera
  const avoidRects = (p) => {
    const out = [], T = cast.teller, Sk = cast.skeptic;
    const rect = (pts, pad = 0.01) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
      for (const q of pts) { const d = q.clone().sub(p.pos), f = p.aim.clone().sub(p.pos).normalize(); if (d.dot(f) < 0.02) continue; const [nx, ny] = project(p.pos, p.aim, p.fov, q); const x = 0.5 + 0.5 * nx, y = 0.5 - 0.5 * ny; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); n++; }
      if (!n || x1 < 0 || x0 > 1 || y1 < 0 || y0 > 1) return;
      out.push({ x0: Math.max(0, x0 - pad), y0: Math.max(0, y0 - pad), x1: Math.min(1, x1 + pad), y1: Math.min(1, y1 + pad) });
    };
    const ball = (c, r) => [V(r, 0, 0), V(-r, 0, 0), V(0, r, 0), V(0, -r, 0), V(0, 0, r), V(0, 0, -r)].map((d) => d.add(c));
    const body = (pup, world) => { const w = (v) => (world ? pup.toWorld(v) : v.clone()); const c = w(pup.marks.chest); return ball(c, 0.12).concat([w(pup.marks.chin)]); };
    rect(ball(T.marks.eyes, 0.125)); rect(body(T, false), 0.0);
    rect(ball(Sk.toWorld(Sk.marks.eyes), 0.12)); rect(body(Sk, true), 0.0);
    // frame check 2026-11-15: faces are keep-out zones; macro-tags sums its cost per avoid rect, so the two faces go in twice more (same rects: a larger rect closed the gap between the faces above a tower, l22)
    for (let k = 0; k < 2; k++) { rect(ball(T.marks.eyes, 0.125)); rect(ball(Sk.toWorld(Sk.marks.eyes), 0.12)); }
    for (const s of ['R', 'L']) { rect(ball(T.point(s, 'palm'), 0.06), 0); rect(ball(Sk.toWorld(Sk.point(s, 'palm')), 0.06), 0); }
    return out;
  };

  /* ------------------------------------------------------------------ draw */
  const env0 = { key: stage.key.userData.dir.clone(), keyI: stage.key.intensity, rimI: stage.rim.intensity, fillI: stage.fill.intensity };
  const M = (K.marks = K.marks || {});
  const DBG = typeof location !== 'undefined' && /hostdbg/.test(location.search) ? { n: 0, g: null } : null;
  K.dbgHost = { plans: cast.plans, real: lib.real };
  if (typeof location !== 'undefined' && /hostdbg/.test(location.search)) console.warn('hostplans', JSON.stringify(cast.plans.slice(0, 40).map((p) => [p.kind, +p.t.toFixed(2), p.hand])));
  return {
    objects, cast, lastFit, shotDbg: (id) => cache.get(id),
    draw(state, t) {
      stage.key.userData.dir.copy(env0.key); stage.key.intensity = env0.keyI; stage.rim.intensity = env0.rimI; stage.fill.intensity = env0.fillI;
      stage.discGain = 0.6; stage.discSoft = true; stage.discMax = Infinity; K.shutter = 0.5;
      objects.update(state, t);
      const p = plan(state, t);
      if (DBG) console.warn('hostdbg', t.toFixed(2), state.shot.id, state.shot.kind, state.shot.move, JSON.stringify(state.shot.subject), 'pos', p.pos.toArray().map((x) => +x.toFixed(3)), 'aim', p.aim.toArray().map((x) => +x.toFixed(3)), 'n', DBG.n, JSON.stringify(DBG.g), 'plans', JSON.stringify(cast.plans.slice(0, 30).map((q) => [q.kind, +q.t.toFixed(2), q.hand])));
      K.look(p.pos, p.aim); K.lens.fov = p.fov; K.lens.fstop = p.fstop; K.lens.focus = K.focusDist(p.focus); K.exposure = 0.84;
      cast.update(state, t, p.pos);
      if (p.people) { stage.rim.intensity = env0.rimI * 0.6; }
      stage.shadowFocus(p.sf[0], p.sf[1]);
      objects.avoidRects = avoidRects(p); objects.avoidRects.namesBelow = !!p.namesBelow; objects.avoidRects.namesAbove = !!p.namesAbove; objects.avoidRects.keepOut = p.keepOut ? (() => { let x0 = 9, y0 = 9, x1 = -9, y1 = -9; for (const q of p.keepOut) { const [nx, ny] = project(p.pos, p.aim, p.fov, q), x = 0.5 + 0.5 * nx, y = 0.5 - 0.5 * ny; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [[x0, y0, x1, y1]]; })() : null; objects.avoidRects.advTags = p.advTags ?? null; objects.avoidRects.host = true;   // Host-only tag rules in macro-tags (Macro never sets it)
      M.eyes = cast.teller.marks.eyes; M.skEyes = cast.skeptic.toWorld(cast.skeptic.marks.eyes); M.handR = cast.teller.point('R', 'palm'); M.handL = cast.teller.point('L', 'palm');
    },
  };
}
