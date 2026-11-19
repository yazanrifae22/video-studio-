// Fair Game, MACRO look (Salt Parable, expl-261115-c2fy): photoreal table-top, shallow depth of field.
// Draws any state(t) of docs/brands/test-3d/fair-game/STATE.md. Exports (fixed API, the Host view reuses the object layer):
//   makeObjects(K, opts) -> objects {update(state, t), anchor(anchor, state, mode?), bounds(subject, state), metres({f, r, y?}), stage, board, show}
//   makeCamera(K, objects) -> {apply(state, t)}      makeView(K, show) -> {draw(state, t)}
// Everything is a pure function of the state (and t only for a hat wobble): no memory between frames except caches keyed by value.
import * as THREE from 'three';
import { COLORS, COIN, DISC, tower } from './game.js';
import * as MP from './macro-props.js';
import { makeTags, titleBand, BANDS, isRow } from './macro-tags.js';

const SQ = 0.055, PAWN_H = MP.PAWN_H, CHIP_T = 0.0033, CHIP_R = 0.015;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const inOut = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const outBack = (k) => { k = clamp(k) - 1; return 1 + 2.2 * k * k * k + 1.2 * k * k; };
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const strHash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0), X = V(1, 0, 0);
const ROLE_COL = { scholar: COLORS.scholar, worker: COLORS.worker, heir: COLORS.heir, fool: COLORS.fool, skeptic: COLORS.skeptic };
const CHIP_TINT = { red: [1, 1, 1], gold: [2.2, 1.9, 0.6], good: [0.5, 1.8, 0.7], bad: [1.3, 0.6, 0.6], null: [1, 1, 1], scholar: [0.6, 1.0, 2.2], worker: [2, 1.2, 0.5], heir: [2, 1.7, 0.7], fool: [0.6, 1.9, 0.8], skeptic: [0.4, 0.4, 0.45] };

/* ================================================================== objects */
export async function makeObjects(K, opts = {}) {
  const { scene, kit } = K;
  const show = opts.show ?? null;
  // tags first: their layout hook must run before the kit's per-tag hooks (scale from pop)
  let objectsRef = null;
  const screen = { rects: new Map(), focus: [], avoid: [] };   // filled per sub-frame by the screen pass (camera known)
  const tags = opts.tags === false ? null : makeTags(K, { worldOf: (a, s, m = 'tag') => objectsRef.anchor(a, s, m), coinRadius: () => MP.FLIP.r, screen, hook: false });
  // one hook, registered before any tag exists (the kit's per-tag hooks must run after the layout): clear the stage, then lay out the tags
  K.onFrame.push((t, cam, lens) => { screenPass(cam, lens); if (tags) tags.layout(t, cam, lens); });

  const stage = kit.stage();
  stage.discGain = 0.55; stage.discSoft = true;
  const light0 = { key: stage.key.intensity, rim: stage.rim.intensity, fill: stage.fill.intensity, env: scene.environmentIntensity };
  stage.fill.castShadow = false;   // the cool fill is soft and wide: its shadow pass costs a full scene render per sub-frame for almost nothing
  const board = kit.board(); scene.add(board);
  const half = board.half, outer = board.outer, tableY = board.tableY;
  const ground = (x, z) => { const a = Math.max(Math.abs(x), Math.abs(z)); return a < half ? 0 : a < outer ? 0.0016 : tableY; };
  const metres = ({ f, r, y = 0 }) => { const x = (f - 4.5) * SQ, z = (4.5 - r) * SQ; return V(x, ground(x, z) + y * SQ, z); };

  /* ---------- meshes */
  const coinMat = kit.coinMaterial({ seed: 4 }); coinMat.roughness = 0.36; coinMat.metalness = 0.8; coinMat.envMapIntensity = 1.5;   // polished tops mirror the dark room and read as holes: a satin top catches the window
  const DISC_CAP = 22000;
  MP.fadeable(coinMat, 'disc');
  const discs = MP.instanced(MP.discGeometry(24, 15), coinMat, DISC_CAP, { aFade: 1 }); discs.castShadow = true; discs.receiveShadow = true;
  discs.setColorAt(0, new THREE.Color(1, 1, 1)); discs.instanceColor.setUsage(THREE.DynamicDrawUsage); scene.add(discs);
  // board-wide shots: the same instances drawn with a 16-sided, 10-point disc (a disc is a few pixels there)
  const farGeo = MP.discGeometry(16, 10); farGeo.setAttribute('aFade', discs.geometry.attributes.aFade);
  const discsFar = new THREE.InstancedMesh(farGeo, coinMat, DISC_CAP); discsFar.instanceMatrix = discs.instanceMatrix; discsFar.instanceColor = discs.instanceColor;
  discsFar.castShadow = true; discsFar.receiveShadow = true; discsFar.frustumCulled = false; discsFar.visible = false; scene.add(discsFar);
  const chipKit = kit.chips(1, { seed: 6 }), CHIP_CAP = 1200;
  const chips = MP.instanced(chipKit.children[0].geometry, chipKit.material, CHIP_CAP); chips.castShadow = true; chips.receiveShadow = true;
  chips.setColorAt(0, new THREE.Color(1, 1, 1)); chips.instanceColor.setUsage(THREE.DynamicDrawUsage); scene.add(chips);
  const woodPawn = kit.pawn(), pMat = MP.fadeable(MP.pawnMaterial(woodPawn.material), 'pawn'), profile = woodPawn.profile;
  const PAWN_CAP = 96, HI_CAP = 14;
  const pawnsLo = MP.instanced(MP.lathe(profile, 28, 56), pMat, PAWN_CAP, { aLook: 4, aTint: 3, aFade: 1 });
  const pawnsHi = MP.instanced(MP.lathe(profile, 64, 110), pMat, HI_CAP, { aLook: 4, aTint: 3, aFade: 1 });
  for (const m of [pawnsLo, pawnsHi]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  const glow = MP.glowMesh(160); scene.add(glow);
  const goldMat = kit.goldMaterial({ roughness: 0.17, seed: 8 });
  const king = kit.king(); scene.add(king); king.visible = false;
  const hats = { scholar: [], worker: [], heir: [], fool: [] };
  const hatOf = (role, n) => { const L = hats[role]; while (L.length <= n) { const h = MP.makeHat(role, goldMat); scene.add(h); L.push(h); } return L[n]; };
  for (const r in hats) hatOf(r, 0);
  const flipMat = kit.goldMaterial({ roughness: 0.24, seed: 12 }); flipMat.metalness = 0.82; flipMat.envMapIntensity = 1.8;
  flipMat.emissive.setRGB(1.0, 0.68, 0.26); flipMat.emissiveIntensity = 0.16;   // QA r1: the faces read dark from low angles; a faint warm self-light keeps the crown readable   // a pure mirror shows the dark room: the big coin read black
  const flips = [], stars = [];
  const flipOf = (n) => { while (flips.length <= n) { const c = MP.flipCoin(flipMat); c.visible = false; scene.add(c); flips.push(c); const s = MP.glintStar(); scene.add(s); stars.push(s); } return flips[n]; };
  flipOf(1);
  const ghosts = [];
  const ghostOf = (n) => { while (ghosts.length <= n) { const g = MP.ghostMesh(); scene.add(g); ghosts.push(g); } return ghosts[n]; };
  const level = MP.levelMesh(half * 2 + 0.02); scene.add(level);

  // local reflections for the gold king (one bake, mid height over the centre of the board)
  king.visible = true; king.position.set(0, 0.06, 0); scene.updateMatrixWorld(true);
  stage.probe(king, V(0, 0.12, 0.02)); king.visible = false;

  /* ---------- pose: everything physical, from the state (cached per state object) */
  const cache = new WeakMap();
  const fallDir = (key) => { const h = hash(strHash(key), 91); return (h < 0.5 ? 0 : Math.PI) + (h * 2 % 1 - 0.5) * 1.3 - 0.25; };   // stable per piece; mostly sideways, so a fallen pawn shows its whole length to the lens
  const [RE, HE] = (() => { let b = profile[1]; for (const p of profile) if (p[1] < 6 && p[0] > b[0]) b = p; return [b[0] * 0.001, b[1] * 0.001]; })();
  const TH_L = (() => { let th = Math.PI; for (const [r, h] of profile) { const rr = r * 0.001, hh = h * 0.001; if (hh > 0.012 && rr < RE) th = Math.min(th, Math.PI - Math.atan((hh - HE) / (RE - rr))); } return th; })();
  const lowest = (th) => { const c = Math.cos(th), s = Math.sin(Math.abs(th)); let m = 0; for (const [r, h] of profile) { const y = (h * c - r * s) * 0.001; if (y < m) m = y; } return m; };
  function actor(key, src, { player = false, pawn = true, tint = null, gloss = 0 }, P) {
    const present = src.present ?? 1; if (present <= 0.001) return null;
    const p = metres(src.at), g = p.y, rows = player ? P.sRow : 1;
    const coinsEff = Math.max(0, src.show ?? src.coins ?? 0) * smooth(Math.min(1, present * 1.15));   // `show` = the size to draw (1 % slices, the pot)
    const tw = tower(coinsEff, { rings: src.rings ?? 1 }), top = g + tw.height;
    let outerR = 0; for (const c of tw.columns) outerR = Math.max(outerR, Math.hypot(c.dx, c.dz)); outerR = (outerR + COIN.radius) * rows;
    const a = { key, src, x: p.x, z: p.z, g, coins: coinsEff, tw, top, rows, outerR: tw.columns.length ? outerR : 0, present, pawn, tint, gloss,
      down: clamp(src.down ?? 0), lit: clamp(src.lit ?? 0), dim: clamp(src.dim ?? 0), role: src.role ?? null, hat: clamp(src.hat ?? 0), ghost: src.ghost ?? 0 };
    if (pawn) {
      const sc = (src.scale ?? 1) * (player ? P.pRow : 1) * outBack(Math.min(1, present * 1.25));
      const hop = clamp(src.hop ?? 0) * 0.3 * PAWN_H * sc, dir = src.fallDir ? Math.atan2(-src.fallDir.r, src.fallDir.f) : fallDir(key), th = smooth(a.down) * TH_L;
      const o = { pos: V(), quat: new THREE.Quaternion() };
      const dx = Math.cos(dir), dz = Math.sin(dir), k = (RE - (HE * Math.sin(th) + RE * Math.cos(th))) * sc;
      o.pos.set(p.x + dx * k, top + hop - lowest(th) * sc, p.z + dz * k); o.quat.setFromAxisAngle(V(dz, 0, -dx), th);
      if (src.jump && src.jump.to) {   // arc from its own spot to the top of the target
        const u = clamp(src.jump.u), B = anchorOf(src.jump.to, P, 'top'), A = V(p.x, top, p.z), e = smooth(u);
        if (B) { const d = Math.hypot(B.x - A.x, B.z - A.z); o.pos.lerpVectors(A, B, e); o.pos.y += 4 * u * (1 - u) * (0.03 + 0.35 * d + Math.max(0, B.y - A.y) * 0.4); }
      }
      a.scale = sc; a.pose = o; a.dir = dir;
      a.head = V(0, PAWN_H * sc, 0).applyQuaternion(o.quat).add(o.pos);
    }
    return a;
  }

  function posed(state) {
    let P = cache.get(state); if (P) return P;
    const rowK = state.layout?.kind === 'row' ? smooth(state.layout.u) : 0;
    P = { state, sRow: lerp(1, 0.24, rowK), pRow: lerp(1, 0.36, rowK), actors: [], byKey: new Map(), chips: new Map() };
    cache.set(state, P);
    const king = state.king ?? {};
    // pass 1: everything without jumps (jumps aim at other actors)
    const list = [];
    for (const pl of state.players ?? []) list.push(['p' + pl.id, pl, { player: true, tint: pl.role ? ROLE_COL[pl.role] : null }]);
    for (const e of state.extras ?? []) if (e.kind === 'pawn' || e.kind === 'tower') list.push(['x' + e.id, e, { pawn: e.kind === 'pawn', tint: e.role ? ROLE_COL[e.role] : null }]);
    const sk = state.skeptic; if (sk && sk.present > 0.001) list.push(['sk', { ...sk, role: null, hat: 0, down: 0, dim: 0, scale: 1, rings: 1 }, { tint: COLORS.skeptic, gloss: 1 }]);
    for (const [key, src, o] of list) { const a = actor(key, { ...src, jump: null }, o, P); if (a) { P.byKey.set(key, a); } }
    for (const [key, src, o] of list) if (src.jump && src.jump.to) { const a = actor(key, src, o, P); if (a) P.byKey.set(key, a); }
    for (const a of P.byKey.values()) P.actors.push(a);
    // lit must be unmistakable: while a few players are lit (a flip pair, the 22 ahead), every other piece on the board recedes too
    let litN = 0, litMax = 0; for (const a of P.actors) if (a.key[0] === 'p' && a.lit > 0.3) { litN++; litMax = Math.max(litMax, a.lit); }
    const fo = state.focus, objFocus = !litN && fo?.hard && ((fo.extras ?? []).length > 0 || (fo.coins ?? []).length > 0) && !(fo.players ?? []).length;   // l49: the demo pieces, not the 64 around them
    const auto = litN > 0 && litN <= 40 ? 0.62 * litMax : 0;
    for (const a of P.actors) a.dimE = a.key === 'sk' ? a.dim : Math.max(a.dim, auto * (1 - a.lit), objFocus && a.key[0] === 'p' ? 0.8 : 0);
    if (objFocus) for (const id of fo.extras ?? []) { const a = P.byKey.get('x' + id); if (a) a.spot = 1; }   // l49: the demo tower gets the lit pool
    // the king and who it replaces
    P.king = null;
    if (king.on != null && (king.drop ?? 0) > 0.001) {
      const a = P.byKey.get('p' + king.on);
      if (a) { const drop = clamp(king.drop), y = a.top + (1 - drop) * 0.5; P.king = { pos: V(a.x, y, a.z), a, swap: clamp(king.swap ?? 0), hat: clamp(king.hat ?? 0) }; if (P.king.swap >= 0.5) a.hidden = true; }
    }
    // chip columns (base on a board point or on a tower top), pushed clear of any standing tower or fallen pawn
    for (const c of state.chips ?? []) {
      const at = c.at ?? {}; let base;
      if (at.player != null || at.extra != null) { base = anchorOf(at, P, 'top'); }
      else if (at.f != null) {
        base = metres(at);
        for (const a of P.actors) {
          if (a.outerR > 0 && a.coins >= 1) { const dx = base.x - a.x, dz = base.z - a.z, d = Math.hypot(dx, dz), need = a.outerR + CHIP_R + 0.002; if (d < need) { const ux = d > 1e-5 ? dx / d : 0, uz = d > 1e-5 ? dz / d : 1; base.x = a.x + ux * need; base.z = a.z + uz * need; } }
          else if (a.pawn && a.down > 0.5) { const dx = base.x - a.x, dz = base.z - a.z; if (Math.hypot(dx, dz) < SQ * 0.3) { base.x = a.x - Math.cos(a.dir) * SQ * 0.3; base.z = a.z - Math.sin(a.dir) * SQ * 0.3; } }
        }
      } else base = anchorOf(at, P, 'top') ?? V();
      const rows = at.player != null ? P.sRow : 1;
      P.chips.set(c.id, { c, base, rows, n: Math.floor(Math.max(0, c.count)), frac: Math.max(0, c.count) % 1 });
    }
    return P;
  }

  /** world point of an Anchor. mode 'tag' (default) = just above what it names (head, tower top, column top, coin centre); 'top' = where a stack lands (tower top, column top) */
  function anchorOf(an, P, mode = 'tag') {
    if (!an) return null;
    const y = (an.y ?? 0) * SQ, up = (p) => (p ? p.add(V(0, y, 0)) : null);
    const act = (a) => {
      if (!a) return null;
      if (mode === 'top' || !a.pawn || a.hidden) {
        if (a.hidden && mode !== 'top' && P.king) return up(V(a.x, P.king.pos.y + 0.098 + (P.king.hat > 0 ? 0.03 : 0) + 0.004, a.z));
        return up(V(a.x, a.top, a.z));
      }
      const hatTop = a.role && a.hat > 0 && !(P.king && P.king.a === a && P.king.hat > 0) ? (MP.HAT_TOP[a.role] - PAWN_H) * a.scale : 0;
      if (a.down > 0.5) return up(a.head.clone().lerp(a.pose.pos, 0.5).add(V(0, 0.016 * a.scale, 0)));
      return up(a.head.clone().add(V(0, hatTop + 0.003, 0)));
    };
    if (an.player != null) return act(P.byKey.get('p' + an.player));
    if (an.extra != null) {
      const a = P.byKey.get('x' + an.extra); if (a) return act(a);
      const e = (P.state.extras ?? []).find((x) => x.id === an.extra);
      if (e && e.kind === 'layer') { const p = metres(e.gather > 0.5 ? e.at : { f: (e.rect.f0 + e.rect.f1) / 2, r: (e.rect.r0 + e.rect.r1) / 2 }); return up(p.add(V(0, e.gather > 0.5 ? (e.coins / DISC) * COIN.thick : 0.002, 0))); }
      return e ? up(metres(e.at)) : null;
    }
    if (an.skeptic) return act(P.byKey.get('sk'));
    if (an.king) { if (!P.king) return null; return up(P.king.pos.clone().add(V(0, mode === 'top' ? 0.096 : 0.1 + (P.king.hat > 0 ? 0.03 : 0), 0))); }
    if (an.coin != null) { const c = flipPose(P, (P.state.flipCoins ?? []).find((x) => x.id === an.coin)); return c ? up(c.pos.clone()) : null; }
    if (an.chips != null) { const c = P.chips.get(an.chips); if (!c) return null; if (mode === 'base') return up(c.base.clone());   /* 'base': the foot of the column (macro-tags, Macro tally labels only) */ return up(c.base.clone().add(V(0, c.n * CHIP_T + (mode === 'tag' ? 0.004 : 0), 0))); }
    if (an.move != null) { const m = movePos(P, (P.state.moves ?? []).find((x) => x.id === an.move)); return m ? up(m.p.clone().add(V(0, m.h + (mode === 'tag' ? 0.004 : 0), 0))) : null; }
    if (an.f != null) { const p = metres(an); if (an.level && P.state.level) p.y = Math.max(p.y, tower(P.state.level.coins, { rings: P.state.players?.[0]?.rings ?? 1 }).height) + (an.y ?? 0) * SQ; return an.level ? p : up(p); }
    return null;
  }
  /** a move's stack right now: base point p and stack height h */
  function movePos(P, mv) {
    if (!mv) return null;
    const A = anchorOf(mv.from, P, 'top'), B = anchorOf(mv.to, P, 'top'); if (!A || !B) return null;
    const u = clamp(mv.u), d = Math.hypot(B.x - A.x, B.z - A.z), p = A.clone().lerp(B, smooth(u));
    p.y += 4 * u * (1 - u) * (0.008 + 0.28 * d + Math.max(0, A.y - B.y) * 0.2);
    return { p, h: mv.kind === 'chip' ? Math.max(1, Math.round(mv.count ?? 1)) * CHIP_T : Math.max(0, mv.show ?? mv.coins ?? 0) / DISC * COIN.thick, seed: strHash(mv.id) };
  }

  /** the large coin: centre position and orientation */
  function flipPose(P, fc) {
    if (!fc || (fc.present ?? 1) <= 0.001) return null;
    const p = metres(fc.at), th = (fc.angle ?? 0) * Math.PI * 2;
    if ((P.state.flipCoins ?? []).filter((c) => (c.present ?? 1) > 0.05).length > 1)   // l33: two coins beside the Worker: they land left and right of it, never on its front
      for (const a of P.actors) if (a.role && a.pawn && a.down < 0.5 && Math.abs(a.z - p.z) < SQ && Math.abs(a.x - p.x) < SQ * 0.8) { const sg = p.x >= a.x ? 1 : -1; p.x = a.x + sg * SQ * 0.8; }
    let hmax = p.y + 0.105;
    for (const a of P.actors) if (Math.hypot(a.x - p.x, a.z - p.z) < SQ * 1.7) hmax = Math.max(hmax, (a.pawn && !a.hidden ? a.head.y + 0.02 : a.top) + 0.07);
    const low = MP.FLIP.r * Math.abs(Math.sin(th)) + MP.FLIP.t / 2 * Math.abs(Math.cos(th));
    const pos = V(p.x, p.y + low + clamp(fc.lift ?? 0, 0, 1.2) * (hmax - p.y), p.z);
    const q = new THREE.Quaternion().setFromAxisAngle(Y, (fc.yaw ?? 0) * Math.PI * 2).multiply(new THREE.Quaternion().setFromAxisAngle(X, th));
    return { pos, quat: q, scale: Math.min(1, (fc.present ?? 1) * 1.2) };
  }

  /* ---------- writing the instanced meshes */
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = V(), P3 = V(), C3 = new THREE.Color();
  const YAW = Array.from({ length: 1024 }, (_, i) => [Math.cos(hash(i, 3) * 6.283), Math.sin(hash(i, 3) * 6.283), (hash(i, 5) - 0.5) * 0.0005, (hash(i, 7) - 0.5) * 0.0005]);
  let nD = 0, nC = 0;
  const DT = [1, 1, 1], dFade = discs.geometry.attributes.aFade.array, dArr = discs.instanceMatrix.array, dCol = discs.instanceColor.array, cArr = chips.instanceMatrix.array, cCol = chips.instanceColor.array;
  /** one disc: flat, yaw from the table, sx = xz scale, sy = thickness fraction */
  const disc = (x, y, z, sx, sy, seed, br) => {
    if (nD >= DISC_CAP) return; const j = YAW[seed & 1023], o = nD * 16, c = j[0] * sx, s = j[1] * sx;
    dArr[o] = c; dArr[o + 1] = 0; dArr[o + 2] = -s; dArr[o + 3] = 0; dArr[o + 4] = 0; dArr[o + 5] = sy; dArr[o + 6] = 0; dArr[o + 7] = 0;
    dArr[o + 8] = s; dArr[o + 9] = 0; dArr[o + 10] = c; dArr[o + 11] = 0; dArr[o + 12] = x + j[2] * sx; dArr[o + 13] = y; dArr[o + 14] = z + j[3] * sx; dArr[o + 15] = 1;
    dCol[nD * 3] = br * DT[0]; dCol[nD * 3 + 1] = br * DT[1]; dCol[nD * 3 + 2] = br * DT[2]; dFade[nD] = 1; nD++;
  };
  const discM = (m, br) => { if (nD >= DISC_CAP) return; m.toArray(dArr, nD * 16); dCol[nD * 3] = br; dCol[nD * 3 + 1] = br; dCol[nD * 3 + 2] = br; dFade[nD] = 1; nD++; };
  const chip = (x, y, z, seed, tint, br = 1, quat = null, sx = 1) => {
    if (nC >= CHIP_CAP) return; const j = YAW[(seed * 7 + 11) & 1023];
    if (quat) { M4.compose(P3.set(x, y, z), quat, S3.set(sx, 1, sx)); M4.toArray(cArr, nC * 16); }
    else { const o = nC * 16; cArr.set([j[0] * sx, 0, -j[1] * sx, 0, 0, 1, 0, 0, j[1] * sx, 0, j[0] * sx, 0, x + j[2] * 1.5 * sx, y, z + j[3] * 1.5 * sx, 1], o); }
    cCol[nC * 3] = tint[0] * br; cCol[nC * 3 + 1] = tint[1] * br; cCol[nC * 3 + 2] = tint[2] * br; nC++;
  };
  /** a stack of `count` discs (fractional top) with base at (x, y, z) */
  // whole-board shots: a disc is 1-2 px tall there, so tall columns are drawn with merged discs (2 or 3 per instance): fewer instances, same silhouette
  let MERGE = 1;
  const stack = (x, y, z, count, seed, sx = 1, br = 1) => {
    const n = Math.ceil(count - 1e-6), full = Math.floor(count + 1e-6), step = MERGE > 1 && full > 14 ? (full > 60 && MERGE > 2 ? 3 : 2) : 1;
    let k = 0;
    if (step > 1) for (; k + step <= full - 2; k += step) disc(x, y + k * COIN.thick, z, sx, step, seed + k * 13, br);   // the top two stay single (the rim reads)
    for (; k < n; k++) disc(x, y + k * COIN.thick, z, sx, k < full ? 1 : count - full, seed + k * 13, br);
  };

  // pawn instances: staged here, split into the high / low detail meshes per sub-frame in the camera hook
  const staged = [];
  // a role pawn keeps its colour when dimmed or broke (l63 l64: the fallen Scholar / Worker must read as blue / orange)
  const dimOf = (a) => { const dk = a.dimE * (1 - a.lit); return a.role && a.hat > 0.5 ? Math.min(dk, 0.28) : dk; };
  const look = (a) => {
    const sweep = a.tint ? (a.key === 'sk' ? 1 : a.hat) : 0;
    return [sweep, dimOf(a), a.lit, a.gloss];
  };
  /** l10 (a board shot about the flip coin while several pairs play in turn): the view frames each pair with its stakes and coin.
   *  -> null | {i, a, b, t0, t1, coin, key} (the pair whose stake beat is the latest one started) */
  const segMemo = new WeakMap();
  function pairSeg(state) {
    if (segMemo.has(state)) return segMemo.get(state);
    let r = null; const s = state.shot;
    if (show && s?.subject?.board && (s.subject.coins ?? []).length) {
      const stakes = (show.beats ?? []).filter((b) => b.type === 'stake' && typeof b.a === 'number' && b.t0 >= s.t0 - 1e-3 && b.t0 < s.t1);
      if (stakes.length >= 2) {
        const t = state.t ?? s.t0; let i = 0; for (let k = 0; k < stakes.length; k++) if (stakes[k].t0 - 0.3 <= t) i = k;
        const b = stakes[i], fl = (show.beats ?? []).find((x) => x.type === 'flip' && x.t0 >= b.t0 - 1e-3 && x.t0 < s.t1);
        r = { i, a: b.a, b: b.b, t0: Math.max(s.t0, b.t0 - 0.3), t1: Math.min(s.t1, (fl ? fl.tLand : b.t1) + 0.5), coin: s.subject.coins[0], key: s.id + '|pair' + i };
      }
    }
    segMemo.set(state, r); return r;
  }
  const effKind = (state) => (pairSeg(state) ? 'pair' : state.shot?.kind);
  let glowN = 0;
  const glowAt = (x, y, z, size, k, warm = [1.5, 0.95, 0.38]) => {
    if (glowN >= 160 || k < 0.01) return; M4.compose(P3.set(x, y, z), Q.identity(), S3.set(size, 1, size)); glow.setMatrixAt(glowN, M4);
    glow.setColorAt(glowN, C3.setRGB(warm[0] * k, warm[1] * k, warm[2] * k)); glowN++;
  };
  const wob = (role, t) => {   // the hat settles with a small wobble after it lands (from the intro beat, when the show is known)
    if (!show || t == null) return 0;
    const b = (show.beats ?? []).find((x) => x.type === 'intro' && x.role === role && x.t1 <= t + 1e-6 && t - x.t1 < 1.2);
    if (!b) return 0; const a = t - b.t1; return Math.exp(-a * 4.5) * Math.sin(a * 22) * (role === 'fool' ? 0.2 : 0.07);
  };

  function update(state, t) {
    const P = posed(state);
    nD = 0; nC = 0; glowN = 0; staged.length = 0;
    const kind = effKind(state);
    MERGE = ['wide', 'high', 'top', 'low'].includes(kind) ? 3 : kind === 'row' ? 2 : 1;
    const used = { scholar: 0, worker: 0, heir: 0, fool: 0 };
    for (const r in hats) for (const h of hats[r]) h.visible = false;
    // towers, pawns, hats, glow
    for (const a of P.actors) {
      const dk = a.dimE * (1 - a.lit), br = lerp(1, 0.2, dk) * (1 + 0.3 * a.lit), seed = strHash(a.key) * 97;
      DT[0] = lerp(1, 0.86, dk); DT[1] = lerp(1, 0.95, dk); DT[2] = lerp(1, 1.4, dk);   // dimmed gold also loses its saturation: it must read as background at phone size
      a.d0 = nD; a.hatObj = null;
      for (let ci = 0; ci < a.tw.columns.length; ci++) { const c = a.tw.columns[ci]; stack(a.x + c.dx * a.rows, a.g, a.z + c.dz * a.rows, c.discs, seed + ci * 1009, a.rows, br); }
      a.d1 = nD; DT[0] = DT[1] = DT[2] = 1;
      if (a.lit > 0.01 || a.spot) glowAt(a.x, a.g + 0.0006, a.z, Math.max(SQ * 1.15, a.outerR * 2.9), Math.max(a.lit, a.spot ?? 0) * 1.6 * (a.g < 0 ? 0.8 : 1));
      if (!a.pawn || a.hidden) continue;
      M4.compose(a.pose.pos, a.pose.quat, S3.setScalar(a.scale));
      const tint = a.tint ? new THREE.Color(a.tint) : null;
      staged.push({ m: M4.clone(), pos: a.pose.pos, look: look(a), tint: tint ? [tint.r, tint.g, tint.b] : [0, 0, 0], a });
      if (a.role && hats[a.role] && a.hat > 0.001 && !(P.king && P.king.a === a && P.king.hat > 0)) {
        const h = hatOf(a.role, used[a.role]++), e = a.hat, drop = (1 - e) * 0.06 + 0, w = wob(a.role, t);
        h.matrix.copy(M4).multiply(new THREE.Matrix4().makeTranslation(0, drop, 0)).multiply(new THREE.Matrix4().makeRotationZ(w)); h.matrixWorldNeedsUpdate = true; h.visible = true; a.hatObj = h;
        const k = lerp(1, 0.18, dimOf(a)); h.userData.mats.forEach((m, i) => m.color.copy(h.userData.base[i]).multiplyScalar(k));
      }
    }
    // the king
    king.visible = !!P.king;
    if (P.king) {
      king.position.copy(P.king.pos); king.rotation.set(0, 0.35, 0); king.scale.setScalar(1);
      if (P.king.hat > 0.001) {
        const role = P.king.a.role ?? 'fool', h = hatOf(role, used[role]++), s = 1.32, e = outBack(P.king.hat);
        const m = new THREE.Matrix4().compose(P.king.pos.clone().add(V(0, 0.0805 - 0.046 * s + (1 - e) * 0.05, 0)), new THREE.Quaternion().setFromAxisAngle(Y, 0.35), V(s, s, s));
        h.matrix.copy(m).multiply(new THREE.Matrix4().makeRotationZ(wob('king', t))); h.matrixWorldNeedsUpdate = true; h.visible = true; h.userData.mats.forEach((mm, i) => mm.color.copy(h.userData.base[i]));
      }
    }
    // ghosts (the old height of a tower)
    let gN = 0; for (const g of ghosts) g.visible = false;
    for (const a of P.actors) if (a.ghost > a.coins + 0.01) {
      const tw = tower(a.ghost, { rings: a.src.rings ?? 1 }); let r = 0; for (const c of tw.columns) r = Math.max(r, Math.hypot(c.dx, c.dz)); r = (r + COIN.radius) * 1.06;
      const g = ghostOf(gN++), h1 = Math.max(a.g + tw.height, a.top + 0.0035), h0 = a.g;   // QA r1: a 4-coin gap is under a millimetre: the outline wraps the whole old tower and its top ring sits at least 1.5 discs above the real top
      g.visible = true; g.position.set(a.x, h0, a.z); g.scale.set(r * 1.18, h1 - h0, r * 1.18); g.material.uniforms.uOp.value = 1.0;
    }
    // layers: coins spread thin over a rectangle, gathered into one stack by `gather`
    for (const e of state.extras ?? []) if (e.kind === 'layer' && (e.present ?? 1) > 0.001 && e.rect) {
      const R = e.rect, nf = Math.max(1, Math.round((R.f1 - R.f0) * 2)), nr = Math.max(1, Math.round((R.r1 - R.r0) * 2)), n = nf * nr, per = (e.coins / DISC) / n;
      const dst = metres(e.at), gth = clamp(e.gather ?? 0), br = 1 + 0.3 * (e.lit ?? 0);
      for (let i = 0; i < n; i++) {
        const fi = i % nf, ri = Math.floor(i / nf), src = metres({ f: R.f0 + (fi + 0.5) * (R.f1 - R.f0) / nf, r: R.r0 + (ri + 0.5) * (R.r1 - R.r0) / nr });
        const dly = hash(i, 17) * 0.35, k = smooth((gth - dly) / 0.65), y = lerp(src.y, dst.y + i * per * COIN.thick, k) + 4 * k * (1 - k) * 0.03;
        disc(lerp(src.x, dst.x, k), y, lerp(src.z, dst.z, k), 1, Math.max(0.02, per), 300 + i, br);
      }
      if ((e.lit ?? 0) > 0.01) { const c = metres({ f: (R.f0 + R.f1) / 2, r: (R.r0 + R.r1) / 2 }); glowAt(c.x, c.y + 0.0004, c.z, (R.f1 - R.f0) * SQ * 1.1, e.lit * 0.25 * (1 - gth)); }
    }
    // moves: stacks of discs or chips on a low arc
    for (const mv of state.moves ?? []) {
      const m = movePos(P, mv); if (!m) continue; const { p, seed } = m;
      if (mv.kind === 'chip') { for (let k = 0; k < Math.max(1, Math.round(mv.count ?? 1)); k++) chip(p.x, p.y + k * CHIP_T, p.z, seed + k, CHIP_TINT.red, 1.1); }
      else {   // stakes must read between the players: brighter, slightly larger, a warm pool under a resting stake
        const farShot = MERGE > 1, k = clamp(mv.u ?? 0), shown = Math.max(0, mv.show ?? mv.coins ?? 0), small = (mv.coins ?? 0) < 10 || shown > (mv.coins ?? 0) + 1e-6, sc = small ? (farShot ? 1.1 : 1.5) : 1.12;
        stack(p.x, p.y, p.z, shown / DISC, seed, sc, small ? (farShot ? 2.0 : 1.7) : 1.3);   // a 1 % slice drawn at its shown size, brighter (it must read in flight, also in a whole-board shot)
        if (small && k > 0.02 && k < 0.98) {
          glowAt(p.x, Math.max(0.0005, p.y - 0.01), p.z, farShot ? 0.06 : 0.035, farShot ? 1.2 : 0.7);
          for (let j = 1; j <= (farShot ? 1 : 2); j++) {   // a faint trail behind each slice: the flow (to the pile, back to everyone) reads as a direction
            const q = movePos(P, { ...mv, u: k - 0.07 * j }); if (!q || k - 0.07 * j <= 0) break;
            disc(q.p.x, q.p.y, q.p.z, sc * (1 - 0.15 * j), 1, seed + j * 31, 2.0); dFade[nD - 1] = 0.35 / j;
          }
        }
        if (k > 0.9 && p.y < 0.02) glowAt(p.x, p.y + 0.0005, p.z, 0.05, 0.9 * smooth((k - 0.9) / 0.1));
      }
    }
    // chip columns (the top chip falls in by the fraction of count)
    for (const { c, base, rows, n, frac } of P.chips.values()) {
      const tint = CHIP_TINT[c.color] ?? CHIP_TINT.red, seed = strHash(c.id), onRow = rows < 0.99;   // l59: a marker on a thin row column must still read: wider than the column, bright
      const br = onRow ? 2.6 : 1 + 0.6 * (c.lit ?? 0), cs = onRow ? Math.max(0.85, rows) : rows;
      if (onRow) glowAt(base.x, base.y + 0.0004, base.z, 0.03, 0.9, [1.6, 0.35, 0.25]);
      for (let k = 0; k < n; k++) chip(base.x, base.y + k * CHIP_T, base.z, seed + k, tint, br, null, cs);
      if (frac > 0.001) { const f = 1 - Math.pow(1 - frac, 2); chip(base.x, base.y + n * CHIP_T + (1 - f) * 0.07, base.z, seed + n, tint, br, new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0.4).normalize(), (1 - f) * 2.2), rows); }
      if ((c.lit ?? 0) > 0.01) glowAt(base.x, base.y + 0.0005, base.z, 0.05, c.lit * 0.8);
    }
    // the c07 rain: gold coins / red chips falling onto a pawn
    for (const d of state.rain ?? []) {
      const a = P.byKey.get('p' + d.to?.player); if (!a) continue;
      const head = a.pawn && !a.hidden ? a.head.clone() : V(a.x, a.top, a.z), u = clamp(d.u), y = head.y + 0.006 + 0.3 * (1 - u) * (1 - u), sd = strHash(d.id), RS = 2.0;   // QA r1: bigger, and slowing down as it reaches the pawn
      const q = new THREE.Quaternion().setFromAxisAngle(V(Math.cos(sd), 0.3, Math.sin(sd)).normalize(), (1 - (1 - u) * (1 - u)) * 6 + sd % 7);
      if (d.kind === 'red') chip(head.x, y, head.z, sd, CHIP_TINT.red, 1.5, q, RS);
      else discM(M4.compose(P3.set(head.x, y, head.z), q, S3.set(RS, RS, RS)), 1.6);
      glowAt(a.x, a.g + 0.0006, a.z, SQ * 1.1, (d.kind === 'red' ? 0.5 : 0.9) * smooth((u - 0.6) / 0.4));
    }
    const far = ['wide', 'high', 'top', 'low', 'row'].includes(kind); discs.visible = !far; discsFar.visible = far; discsFar.count = nD;
    discs.count = nD; discs.instanceMatrix.needsUpdate = true; discs.instanceColor.needsUpdate = true;
    discs.instanceMatrix.updateRanges.length = 0; discs.instanceColor.updateRanges.length = 0;
    discs.instanceMatrix.addUpdateRange(0, nD * 16); discs.instanceColor.addUpdateRange(0, nD * 3);
    const fA = discs.geometry.attributes.aFade; fA.needsUpdate = true; fA.updateRanges.length = 0; fA.addUpdateRange(0, Math.max(1, nD));
    chips.count = nC; chips.instanceMatrix.needsUpdate = true; chips.instanceColor.needsUpdate = true;
    glow.count = glowN; glow.instanceMatrix.needsUpdate = true; if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
    // flip coins + glint
    flips.forEach((c) => (c.visible = false)); stars.forEach((s) => (s.visible = false));
    const twoCoins = (state.flipCoins ?? []).filter((fc) => (fc.present ?? 1) > 0.05).length > 1;   // l33 / l38: two coins beside one pawn: smaller, so neither hides it
    (state.flipCoins ?? []).forEach((fc, i) => {
      const o = flipPose(P, fc); if (!o) return; const c = flipOf(i), s0 = o.scale * (twoCoins ? 0.66 : 1);
      c.visible = true; c.position.copy(o.pos); c.quaternion.copy(o.quat); c.scale.setScalar(s0); c.userData.s0 = s0; c.userData.q0 = o.quat.clone();
      c.userData.hover = fc.phase === 'hover' ? 1 : 0;
      const gl = clamp(fc.glint ?? 0); if (gl > 0.02) { const s = stars[i]; s.visible = true; s.position.copy(o.pos).add(V(-0.62, 0.55, 0.45).multiplyScalar(MP.FLIP.r)); s.scale.setScalar(0.012 + 0.05 * gl); s.userData.k = 1; s.material.color.setScalar(2.5 * gl); s.userData.on = true; }
    });
    // level plane
    const L = state.level;
    level.visible = !!(L && L.opacity > 0.003 && L.sweep > 0.001);
    if (level.visible) {
      const h = tower(L.coins, { rings: state.players?.[0]?.rings ?? 1 }).height;
      level.position.set(0, h, 0); level.material.uniforms.uOp.value = L.opacity; level.material.uniforms.uSweep.value = clamp(L.sweep);
    }
    // the frame's own time is the first call of each frame (film.frame(t) runs before the sub-frames): one counter value per output frame, also off the frame grid (stills)
    if (tags) {   // counters change faster than the shutter in a time-lapse: read them once per output frame so the digits never ghost
      let st = state;
      if (show && t != null) { if (frameMemo.t == null || t < frameMemo.t - 1e-6 || t > frameMemo.t + 0.75 / K.fps) { frameMemo.t = t; frameMemo.s = show.state(t); } st = { ...state, counter: frameMemo.s.counter ?? state.counter, total: frameMemo.s.total ?? state.total }; }
      tags.set(st, true);
    }
    lastP = P;
  }
  let lastP = null; const frameMemo = { t: null, s: null };

  /* ---------- screen pass (per sub-frame, camera final): what the line is about, and what stands in front of it */
  const FOCUS_KINDS = new Set(['player', 'pair', 'block', 'tower', 'tally', 'demo', 'coin']);
  const vv = V(), vp = V();
  const rectOf = (pts, cam) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, dz = 1e9;
    for (const q of pts) { vv.copy(q).applyMatrix4(cam.matrixWorldInverse); const d = -vv.z; if (d < 0.004) continue; dz = Math.min(dz, d); vp.copy(q).project(cam); const x = 0.5 + 0.5 * vp.x, y = 0.5 - 0.5 * vp.y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return x1 < x0 ? null : { x0, y0, x1, y1, d: dz };
  };
  const actorPts = (a) => {
    const R = Math.max(a.outerR, a.pawn ? 0.012 * (a.scale ?? 1) : 0.008), b = new THREE.Box3(V(a.x - R, a.g, a.z - R), V(a.x + R, a.top, a.z + R));
    if (a.pawn && !a.hidden) { const hatH = a.role && a.hat > 0 ? (MP.HAT_TOP[a.role] - PAWN_H) * a.scale : 0; b.expandByPoint(a.head.clone().add(V(0, hatH, 0))); b.expandByPoint(a.pose.pos.clone().add(V(0.013 * a.scale, 0, 0.013 * a.scale))); b.expandByPoint(a.pose.pos.clone().add(V(-0.013 * a.scale, 0, -0.013 * a.scale))); }
    if (lastP?.king && lastP.king.a === a) b.expandByPoint(V(a.x, lastP.king.pos.y + 0.1, a.z));
    // a ring of 8 at the bottom and at the top (box corners stick out diagonally and made tall towers' screen rects far too big)
    const out = [], cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, rx = (b.max.x - b.min.x) / 2, rz = (b.max.z - b.min.z) / 2;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz; out.push(V(x, b.min.y, z), V(x, b.max.y, z)); }
    return out;
  };
  const ovl = (a, b) => Math.min(Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const boxRect = (c, dx, h, cam) => rectOf([V(-dx, 0, -dx), V(dx, h, dx), V(dx, 0, -dx), V(-dx, h, dx), V(dx, h, -dx), V(-dx, 0, dx)].map((d) => d.add(c)), cam);
  function screenPass(cam, lens) {
    const P = lastP; screen.rects.clear(); screen.focus.length = 0; screen.avoid = objects.avoidRects ?? [];
    if (!P) return;
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const st = P.state, shot = st.shot ?? {}, seg = pairSeg(st), sub = shot.subject ?? {};
    const fo = st.focus ?? (seg ? { players: [seg.a, seg.b], coins: [seg.coin], hard: true } : null);   // l10: the pair in turn is what the line is about
    let hard; const keys = new Set();
    const addKeys = (o) => { if (!o) return; for (const id of o.players ?? []) keys.add('p' + id); for (const id of o.extras ?? []) keys.add('x' + id); if (o.skeptic) keys.add('sk'); if (o.king && st.king?.on != null) keys.add('p' + st.king.on); };
    if (fo) { hard = typeof fo.hard === 'number' ? clamp(fo.hard) : fo.hard ? 1 : 0; addKeys(fo); }
    else hard = FOCUS_KINDS.has(shot.kind) ? 1 : 0;
    const fx = fo ?? {};
    if (!fo) { addKeys(sub); addKeys(shot.to); }   // the model's focus wins (for a pan it is already the `to`)
    const mf = objects.macroFocus;   // set by the Macro camera only (the Host never sets it): l31 the hats while they pulse, the pawns in front ghost
    if (!fo && mf && mf.hard > 0.001 && !objects.avoidRects?.host) { hard = Math.max(hard, mf.hard); for (const k of mf.keys) keys.add(k); }
    for (const a of P.actors) { a.fade = 1; const r = rectOf(actorPts(a), cam); if (r) { r.key = a.key; r.named = !!(a.role && a.hat > 0.5) || a.lit > 0.3 || a.key === 'sk'; if (a.pawn && !a.hidden) { vp.copy(a.pose.pos).project(cam); r.pawnY = 0.5 - 0.5 * vp.y; }   /* pawnY: screen y of the pawn's foot (top of its tower), read by macro-tags in the Macro look only */ screen.rects.set(a.key, r); if (keys.has(a.key)) screen.focus.push(r); } }
    // the subject's other pieces: the flip coin, stakes, chip columns
    for (const id of new Set([...(sub.coins ?? []), ...(shot.to?.coins ?? []), ...(fx.coins ?? [])])) { const c = flipPose(P, (st.flipCoins ?? []).find((x) => x.id === id)); if (c) { const q = boxRect(c.pos.clone().add(V(0, -MP.FLIP.r, 0)), MP.FLIP.r * 1.1, MP.FLIP.r * 2, cam); if (q) screen.focus.push(q); } }
    for (const id of new Set([...(sub.moves ?? []), ...(shot.to?.moves ?? []), ...(fx.moves ?? [])])) { const m = movePos(P, (st.moves ?? []).find((x) => x.id === id)); if (m) { const q = boxRect(m.p, 0.016, m.h + 0.004, cam); if (q) screen.focus.push(q); } }
    for (const id of new Set([...(sub.chips ?? []), ...(shot.to?.chips ?? []), ...(fx.chips ?? [])])) { const c = P.chips.get(id); if (c) { const q = boxRect(c.base, CHIP_R, Math.max(1, c.c.count) * CHIP_T, cam); if (q) screen.focus.push(q); } }
    if (hard > 0.001 && screen.focus.length) {
      for (const a of P.actors) {
        if (keys.has(a.key)) continue; const r = screen.rects.get(a.key); if (!r) continue;
        let f = 1;
        for (const F of screen.focus) { const k = Math.max(smooth((ovl(r, F) + 0.004) / 0.024) * smooth((F.d - r.d - 0.004) / 0.03), smooth((0.62 - r.d / F.d) / 0.2) * (r.x1 > 0 && r.x0 < 1 && r.y1 > 0 && r.y0 < 1 ? 1 : 0)); f = Math.min(f, 1 - hard * k); }   // in front of the focus, or so close to the lens it would be a blur blob
        a.fade = f;
      }
    }
    // write the fades: discs of each tower (a contiguous range), hats; pawns are written by the split hook below
    let any = false;
    for (const a of P.actors) if (a.fade < 0.999 && a.d1 > a.d0) {
      any = true; dFade.fill(a.fade, a.d0, a.d1);
      if (a.fade < 0.03) for (let i = a.d0; i < a.d1; i++) { const o = i * 16; for (let k = 0; k < 11; k++) dArr[o + k] = 0; }   // gone: no shadow either
    }
    if (any) { discs.instanceMatrix.needsUpdate = true; discs.geometry.attributes.aFade.needsUpdate = true; }
    for (const a of P.actors) if (a.hatObj) { const f = a.fade; a.hatObj.visible = f > 0.03; a.hatObj.userData.mats.forEach((m) => { const on = f < 0.999; if (m.alphaHash !== on) { m.alphaHash = on; m.needsUpdate = true; } m.opacity = f; }); }
    // the large coin must stay followable in a wide shot: never smaller than about 7.5 % of the frame height on screen
    // in a pair / close shot the coin is the event: at least 9 % of the frame height (diameter)
    const th = Math.tan(lens.fov * Math.PI / 360), floor = ['pair', 'player', 'coin', 'block', 'demo'].includes(effKind(st)) ? 0.045 : 0.0375;
    flips.forEach((c, i) => {   // a hovering coin turns its face to the lens (seen from a low camera a flat coin read as a thin edge, l49)
      if (!c.visible || !c.userData.q0) return;
      c.quaternion.copy(c.userData.q0);
      if (c.userData.hover) { const dh = V(cam.position.x - c.position.x, 0, cam.position.z - c.position.z); if (dh.lengthSq() > 1e-8) { dh.normalize(); const ax = V().crossVectors(Y, dh).normalize(), lift = Math.atan2(cam.position.y - c.position.y, Math.hypot(cam.position.x - c.position.x, cam.position.z - c.position.z)); c.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, clamp(1.05 - lift, 0, 1.0))); } }
    });
    flips.forEach((c, i) => { if (!c.visible) return; const d = Math.max(0.01, c.position.distanceTo(cam.position)), k = clamp((c.userData.hover && floor > 0.04 ? 0.06 : floor) * d * th / MP.FLIP.r, 1, 2.6); c.scale.setScalar((c.userData.s0 ?? 1) * k); const sx = stars[i]; if (sx.visible) { sx.scale.multiplyScalar(k / (sx.userData.k ?? 1)); sx.userData.k = k; } });
    MP.DITHER.value = (MP.DITHER.value + 0.618034) % 1;
  }

  // per sub-frame, after the camera is known: high detail for the pawns near the lens; glint stars face the camera
  const tmp = V();
  K.onFrame.push((t, cam) => {
    for (const s of stars) if (s.visible) s.quaternion.copy(cam.quaternion);
    glow.material.color.setScalar(clamp(cam.position.length() / 0.35, 1, 2.2) / Math.sqrt(Math.max(1, glowN / 6)));   // one lit square must read from across the room; a crowd of them must not flood the board   // a lit square must still read from across the room
    const near = staged.map((s, i) => [tmp.copy(s.pos).distanceToSquared(cam.position), i]).sort((a, b) => a[0] - b[0]);
    let nh = 0, nl = 0;
    for (const [d2, i] of near) {
      const s = staged[i], fade = s.a.fade ?? 1; if (fade < 0.03) continue;   // a faded pawn costs nothing
      const hi = d2 < 0.42 * 0.42 && nh < HI_CAP, mesh = hi ? pawnsHi : pawnsLo, n = hi ? nh++ : nl++;
      if (n >= (hi ? HI_CAP : PAWN_CAP)) continue;
      mesh.setMatrixAt(n, s.m); mesh.geometry.attributes.aLook.setXYZW(n, ...s.look); mesh.geometry.attributes.aTint.setXYZ(n, ...s.tint); mesh.geometry.attributes.aFade.setX(n, fade);
    }
    pawnsHi.count = nh; pawnsLo.count = nl;
    for (const m of [pawnsHi, pawnsLo]) { m.instanceMatrix.needsUpdate = true; m.geometry.attributes.aLook.needsUpdate = true; m.geometry.attributes.aTint.needsUpdate = true; m.geometry.attributes.aFade.needsUpdate = true; }
  });

  /** bounds of a shot Subject: {center, radius, top, box} (everything listed must be in frame) */
  function bounds(subject, state, { capBoard = 0.3 } = {}) {
    const P = posed(state), box = new THREE.Box3(), pt = V(), pts = [];
    // pts = the subject's real extreme points (each piece's own box corners, the board's footprint): the camera fits these, not the
    // corners of one big box (a whole-board box that is as tall as its tallest tower at all four corners made every wide shot small)
    const own = new THREE.Box3(), push = (b) => { for (let i = 0; i < 8; i++) pts.push(V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); };
    const addActor = (a) => {
      if (!a) return;
      const b0 = box.clone(); box.makeEmpty();
      addActor0(a);
      if (!box.isEmpty()) push(box); box.union(b0);
    };
    const addActor0 = (a) => {
      const r = Math.max(a.outerR, a.pawn ? 0.014 * a.scale : 0, 0.012);
      box.expandByPoint(pt.set(a.x - r, a.g, a.z - r)); box.expandByPoint(pt.set(a.x + r, a.top, a.z + r));
      if (a.pawn && !a.hidden) {
        const hatH = a.role && a.hat > 0 ? (MP.HAT_TOP[a.role] - PAWN_H) * a.scale : 0;
        box.expandByPoint(pt.copy(a.head).add(V(0, hatH + 0.002, 0))); box.expandByPoint(pt.copy(a.pose.pos).add(V(0.014 * a.scale, 0, 0.014 * a.scale))); box.expandByPoint(pt.copy(a.pose.pos).add(V(-0.014 * a.scale, 0, -0.014 * a.scale)));
        if (a.down > 0.3) { box.expandByPoint(pt.copy(a.head).add(V(0.01, 0.012, 0.01))); box.expandByPoint(pt.copy(a.head).add(V(-0.01, -0.005, -0.01))); }
      }
      if (P.king && P.king.a === a) box.expandByPoint(pt.set(a.x, a.top + 0.1 + (P.king.hat > 0 ? 0.03 : 0), a.z));
    };
    if (subject?.board) {
      let top = 0.06; for (const a of P.actors) if (a.src && a.key[0] === 'p') top = Math.max(top, a.pawn && !a.hidden ? a.head.y : a.top);
      if (P.king) top = Math.max(top, P.king.a.top + 0.13);
      box.expandByPoint(pt.set(-half, 0, -half)); box.expandByPoint(pt.set(half, Math.min(top, capBoard), half));
      // footprint at the board top and at the height of an ordinary pawn on an ordinary tower; tall pieces add their own tops where they stand
      const base = 0.062;
      own.set(V(-half, 0, -half), V(half, Math.min(top, base), half)); push(own); for (let i = pts.length - 8; i < pts.length; i++) pts[i].foot = true;
      for (const a of P.actors) {
        if (a.key === 'sk' && !subject.skeptic) continue;
        const hr = (a.pawn && !a.hidden ? a.head.y + 0.006 : a.top) + (P.king && P.king.a === a ? 0.11 : 0), h = Math.min(capBoard, hr);
        if (hr > capBoard + 0.005) { const q = V(a.x, hr, a.z); q.tall = true; pts.push(q); }   // the real top of a tower taller than the cap: not fitted (the board keeps its width), but the aim keeps it in (refine)
        if (h > base + 0.01) { const r = Math.max(a.outerR, 0.014); own.set(V(a.x - r, 0, a.z - r), V(a.x + r, h, a.z + r)); for (let i = 2; i < 8; i++) if (i & 2) pts.push(V(i & 1 ? own.max.x : own.min.x, h, i & 4 ? own.max.z : own.min.z)); }
      }
    }
    const nBoard = pts.length;   // every point after this one is a named piece of the subject (`.must`: stays in frame even in a whole-board shot)
    for (const id of subject?.players ?? []) addActor(P.byKey.get('p' + id));
    const piece = (fn) => { const b0 = box.clone(); box.makeEmpty(); fn(); if (!box.isEmpty()) push(box); box.union(b0); };
    for (const id of subject?.extras ?? []) {
      const a = P.byKey.get('x' + id); if (a) { addActor(a); continue; }
      const e = (state.extras ?? []).find((x) => x.id === id);
      if (e && e.kind === 'layer' && e.rect) piece(() => { const g = e.gather ?? 0, p0 = metres({ f: e.rect.f0, r: e.rect.r0 }), p1 = metres({ f: e.rect.f1, r: e.rect.r1 }), c = metres(e.at); box.expandByPoint(g > 0.5 ? c.clone().add(V(-0.02, 0, -0.02)) : p0); box.expandByPoint(g > 0.5 ? c.clone().add(V(0.02, 0.01, 0.02)) : p1); });
    }
    if (subject?.skeptic) addActor(P.byKey.get('sk'));
    if (subject?.king) {   // where the king stands once landed (the fall from above the frame is not framed)
      const on = state.king?.on, a = on != null ? P.byKey.get('p' + on) : null;
      if (a) piece(() => { box.expandByPoint(pt.set(a.x - 0.02, a.top, a.z - 0.02)); box.expandByPoint(pt.set(a.x + 0.02, a.top + 0.13, a.z + 0.02)); });
    }
    for (const id of subject?.coins ?? []) {
      const fc0 = (state.flipCoins ?? []).find((x) => x.id === id), fc = fc0 && (fc0.lift ?? 0) > 0.8 ? { ...fc0, lift: 0.8 } : fc0, o = flipPose(P, fc);   // the top of a flip may leave the frame for an instant: framing the whole arc made every pair tiny
      if (o) { piece(() => { for (let i = 0; i < 8; i++) box.expandByPoint(pt.set(i & 1 ? MP.FLIP.r : -MP.FLIP.r, (i & 2 ? 1 : -1) * MP.FLIP.r * 0.5, i & 4 ? MP.FLIP.r : -MP.FLIP.r).add(o.pos)); }); continue; }   // not its spin: the frame must not breathe with it
      const mv = (state.moves ?? []).find((x) => x.id === id);   // a stake (a move) can be a subject too
      if (mv) { const B = anchorOf(mv.to, P, 'top'), A = anchorOf(mv.from, P, 'top'); for (const p of [A, B]) if (p) piece(() => { box.expandByPoint(pt.copy(p).add(V(-0.016, 0, -0.016))); box.expandByPoint(pt.copy(p).add(V(0.016, (mv.coins ?? 10) / DISC * COIN.thick + 0.004, 0.016))); }); }
    }
    for (const id of subject?.moves ?? []) { const m = movePos(P, (state.moves ?? []).find((x) => x.id === id)); if (m) piece(() => { box.expandByPoint(pt.copy(m.p).add(V(-0.016, 0, -0.016))); box.expandByPoint(pt.copy(m.p).add(V(0.016, m.h + 0.004, 0.016))); }); }
    for (const id of subject?.chips ?? []) { const c = P.chips.get(id); if (c) piece(() => { box.expandByPoint(pt.copy(c.base).add(V(-CHIP_R, 0, -CHIP_R))); box.expandByPoint(pt.copy(c.base).add(V(CHIP_R, Math.max(c.c.count, 1) * CHIP_T + 0.004, CHIP_R))); }); }
    if (subject?.board) for (let i = nBoard; i < pts.length; i++) pts[i].must = true;
    if (box.isEmpty()) { box.expandByPoint(pt.set(-outer, 0, -outer)).expandByPoint(pt.set(outer, 0.06, outer)); push(box); }
    if (!pts.length) push(box);
    const center = box.getCenter(V()), size = box.getSize(V());
    return { center, radius: size.length() / 2, top: box.max.y, box, pts };
  }

  const objects = {
    update, bounds, metres, stage, board, show, ground, light0,
    /** screen rectangles {x0, y0, x1, y1} (fractions of the frame, 0,0 = top left) the caller sets per frame (e.g. puppet faces): tags avoid them */
    avoidRects: [],
    /** per sub-frame screen facts, after the camera: rects (actor key -> rect, d = nearest view depth), focus (rects of what the line is about) */
    screen,
    anchor: (an, state, mode = 'tag') => { const p = anchorOf(an, posed(state), mode); return p ? p.clone() : null; },
    posed, flipPose: (state, fc) => flipPose(posed(state), fc), pairSeg, effKind,
    /** standing towers (camera collision) */
    columns: (state) => posed(state).actors.filter((a) => a.outerR > 0 || a.pawn).map((a) => ({ x: a.x, z: a.z, r: Math.max(a.outerR, 0.014), top: a.pawn && !a.hidden ? a.head.y + 0.01 : a.top })),
  };
  objectsRef = objects;
  return objects;
}

/* ================================================================== camera */
const KIND = {
  // bw = width of the whole board in the picture (fix round 2: >= 0.65, aim higher; the far edge and tall towers may leave the top)
  wide: { el: 0.34, az: 0.2, fov: 30, f: 4.0, exp: 0.86, mx: 0.92, bw: 0.84 },
  high: { el: 0.5, az: 0.12, fov: 30, f: 4.5, exp: 0.86, mx: 0.92, bw: 0.84 },
  top: { el: 1.12, az: 0.0, fov: 22, f: 5.6, exp: 0.86, mx: 0.92, bw: 0.66 },   // frame check: steep but not straight down, the board fills the frame height (straight down a square board was a third of the width)
  low: { el: 0.17, az: 0.26, fov: 30, f: 3.0, exp: 0.86, mx: 0.86, bw: 0.84 },
  player: { el: 0.26, az: 0.3, fov: 22, f: 2.6, exp: 0.95, mx: 0.62, fill: 0.62 },
  pair: { el: 0.62, az: null, fov: 24, f: 4.0, exp: 0.92, mx: 0.86 },   // from above the pair: no wall of blurred pawns in front, both pieces at a similar distance
  block: { el: 0.6, az: 0.24, fov: 22, f: 4.0, exp: 0.92, mx: 0.8 },
  tower: { el: 0.12, az: 0.3, fov: 24, f: 3.2, exp: 0.92, mx: 0.7 },
  coin: { el: 0.2, az: 0.22, fov: 20, f: 3.6, exp: 1.0, mx: 0.55, fill: 0.55 },
  demo: { el: 0.2, az: 0.16, fov: 22, f: 2.8, exp: 0.95, mx: 0.8 },
  tally: { el: 0.24, az: 0.7, fov: 24, f: 4.0, exp: 0.92, mx: 0.86 },   // from the side: each owner stands beside its column, not hidden behind it (l38-l40 the Heir)
  row: { el: 0.3, az: 0.4, fov: 26, f: 5.6, exp: 0.88, mx: 0.94 },   // along the row from the rich end: the curve of towers rises toward the lens (frame check r3, l59: from higher, the row reads as a curve, not a thin strip over empty board)
  skeptic: { el: 0.1, az: 0.15, fov: 24, f: 4.5, exp: 0.92, mx: 0.8 },   // the board behind must read (l48: the pile grows while the Skeptic talks), not a blur
};

export function makeCamera(K, objects) {
  const { stage } = objects, show = objects.show;
  const memo = new Map(), NO_AVOID = [], NAMES_BELOW = Object.assign([], { namesBelow: true });
  /** stable subject boxes for a whole shot: the union over five samples of the shot (when the show is known), else the current state */
  const shotBoxes = (state, s = state.shot) => {
    const key = s.id, real = state.shot?.id;
    if (show && memo.has(key)) return memo.get(key);
    const states = show ? (s.kind === 'row' ? [0.6, 0.8] : [0.45, 0.7, 0.9, 1]).map((k) => show.state(lerp(s.t0, s.t1 - 1e-3, k))).filter((x) => x.shot?.id === real) : [state];
    if (!states.length) states.push(state);
    if (s.kind === 'row') s = { ...s, subject: { players: Array.from({ length: 64 }, (_, i) => i) } };   // the sorted row is the subject, not the empty board around it
    const unite = (sub) => { if (!sub) return null; const b = new THREE.Box3(); b.pts = []; for (const st of states) { const o = objects.bounds(sub, st); b.union(o.box); b.pts.push(...o.pts); } return b; };
    const r = { sub: unite(s.subject), to: unite(s.to), band: states.concat([state]).map(titleBand).find(Boolean) ?? null,   // the screen text band of this shot (hook low, end text at the top) or null
      // screen tags / counters at the top of the picture: a board shot keeps a free strip for them (l20 l24 l51: tags lay on the towers)
      topText: states.concat([state]).some((st) => (st.tags ?? []).some((g) => g.anchor?.screen && g.anchor.screen[1] < 0.3) || (st.counter?.opacity ?? 0) > 0.01 || (st.total?.opacity ?? 0) > 0.01) };
    if (show) { memo.set(key, r); if (memo.size > 64) memo.delete(memo.keys().next().value); }
    return r;
  };
  /** the points a Subject box stands for (bounds().pts when known, else its 8 corners) */
  const ptsOf = (box) => box.pts ?? (box.pts = Array.from({ length: 8 }, (_, i) => V(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)));
  const dirOf = (az, el) => V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  /** camera distance so the whole box fits: horizontal margin mx, vertical range [y0, y1] of the picture */
  const fit = (box, az, el, fov, mx, y0, y1, only = null, bw = 0.66) => {
    if (box.pts && box.pts.some((q) => q.foot) && !only) {   // the whole board: width first (bw of the frame), tall towers may leave through the top
      const foot = (q) => q.foot, Ff = fit(box, az, el, fov, mx, y0, y1, foot), Fw = fit(box, az, el, fov, mx, -50, 50, foot), Fa = fit(box, az, el, fov, mx, y0, y1, () => true);
      // a tower taller than the cap may cost some board width (down to 0.7 of the frame) before its top leaves the picture (frame check: no tower top cut)
      let d = clamp(Fa.d, Ff.d, Math.max(Ff.d, Fw.d * mx / (box.pts.some((q) => q.tall) ? Math.min(bw, 0.7) : bw)));
      if (box.pts.some((q) => q.must)) d = Math.max(d, fit(box, az, el, fov, mx, y0, y1, (q) => q.must || q.foot).d);   // the named pieces (a giant tower, the coin) stay whole
      return { C: Ff.C, d };
    }
    const C = only ? (() => { const b = new THREE.Box3(); for (const q of ptsOf(box)) if (only(q)) b.expandByPoint(q); return b.isEmpty() ? box.getCenter(V()) : b.getCenter(V()); })() : box.getCenter(V()), dir = dirOf(az, el), right = V().crossVectors(Y, dir).normalize(), upv = V().crossVectors(dir, right);
    const tv = Math.tan(fov * Math.PI / 360), th = tv * K.W / K.H, tx = th * mx, ty = tv * (y1 - y0);
    let d = 0.05; const p = V();
    const Q = []; for (const q of ptsOf(box)) { if (only ? !only(q) : q.tall) continue; Q.push(q); p.copy(q).sub(C); const xc = p.dot(right), yc = p.dot(upv), zc = p.dot(dir); d = Math.max(d, zc + Math.abs(xc) / tx, zc + Math.abs(yc) / ty); }
    // the bound above assumes the box is centred on the picture (too far for a board seen at an angle): search the real distance at
    // which the projected spans fit (width <= mx, height <= the window), the picture being re-aimed vertically afterwards (refine)
    {
      pc.fov = fov; pc.updateProjectionMatrix();
      const fits = (dd) => {
        pc.position.copy(C).addScaledVector(dir, dd); pc.lookAt(C); pc.updateMatrixWorld();
        let x0 = 1e9, x1 = -1e9, a0 = 1e9, a1 = -1e9;
        for (const q of Q) { p.copy(q).applyMatrix4(pc.matrixWorldInverse); if (p.z > -0.006) return false; p.copy(q).project(pc); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); a0 = Math.min(a0, p.y); a1 = Math.max(a1, p.y); }
        return (x1 - x0) / 2 <= mx && (y1 - y0 > 5 || (a1 - a0) / 2 <= y1 - y0);
      };
      let lo = d * 0.35, hi = d;
      if (fits(lo)) hi = lo; else for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
      d = hi;
    }
    return { C, d };
  };
  /** where to look from pos so that the world point p lands at (sx, sy) of the picture (the quwk film's helper) */
  const aimAt = (pos, p, sx, sy, fov) => {
    const th = Math.tan(fov * Math.PI / 360), tx = (2 * sx - 1) * th * K.W / K.H, ty = (1 - 2 * sy) * th, n = Math.hypot(tx, ty, 1), d = p.clone().sub(pos);
    const e = Math.asin(clamp(n * d.y / d.length() / Math.hypot(1, ty), -1, 1)) - Math.atan(ty), ph = Math.atan2(d.z, d.x) - Math.atan2(tx, Math.cos(e) - ty * Math.sin(e));
    return V(pos.x + Math.cos(e) * Math.cos(ph), pos.y + Math.sin(e), pos.z + Math.cos(e) * Math.sin(ph));
  };
  /** a clear view of the subject (and of `to`): first swing around it (keeps the low macro angle), then raise the camera. -> {az, el} */
  const clearView = (state, boxes, az, el, fov, mx, y0, y1, minTop = -1) => {
    const cols = objects.columns(state), seg = V(), q = V();
    const sets = boxes.filter(Boolean).map((box) => {
      const C = box.getCenter(V()), targets = [C];
      for (let i = 2; i < 8; i += (i % 4 === 3 ? 3 : 1)) targets.push(V(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).lerp(C, 0.15));
      return { box, C, targets };
    });
    const inside = (c, box) => c.x > box.min.x - 0.004 && c.x < box.max.x + 0.004 && c.z > box.min.z - 0.004 && c.z < box.max.z + 0.004;
    const blocked = (a, e) => {
      for (const { box, C, targets } of sets) {
        const { d } = fit(box, a, e, fov, mx, y0, y1), P0 = C.clone().add(dirOf(a, e).multiplyScalar(d));
        for (const T of targets) for (const c of cols) {
          if (c.top < minTop || sets.some((st) => inside(c, st.box))) continue;
          seg.subVectors(T, P0); const L2 = seg.x * seg.x + seg.z * seg.z; if (L2 < 1e-8) continue;
          const k = clamp(((c.x - P0.x) * seg.x + (c.z - P0.z) * seg.z) / L2, 0, 0.97); q.copy(P0).addScaledVector(seg, k);
          if (Math.hypot(q.x - c.x, q.z - c.z) < c.r + 0.006 && q.y < c.top) return true;
        }
      }
      return false;
    };
    const capE = state.focus?.hard ? Math.min(1.25, el + 0.42) : 1.25;   // with a hard focus the blockers fade (object layer): no need to go top-down
    for (let r = 0; r < 12; r++) {
      const e = Math.min(capE, el + r * 0.07);
      for (const da of [0, 0.35, -0.3, 0.7, -0.55]) { const a = clamp(az + da, -0.2, 1.1); if (!blocked(a, e)) return { az: a, el: e }; }   // further left the window behind the board blows out
    }
    return { az, el: capE };
  };
  /** aim so the subject box's projected top/bottom sit centred in [y0, y1] (aimAt alone centres the box centre, not its picture) */
  const pc = new THREE.PerspectiveCamera(30, K.W / K.H, 0.005, 50), cp = V();
  const refine = (pos, C, box, fov, sy, y0, y1, horiz = false, slack = 0, cxT = 0.5, iters = 3) => {   // iters: more passes when the aim moves off-centre (a tally row panning: the top of a column crept out)   // cxT: where the span's centre goes left-right (horiz)   // slack: how far below y1 the base may go when the box is taller than the window (a board's near edge)   // horiz: also centre the picture span left-right (a row seen at an angle: its near end is much bigger)
    let aim = sy, ax = 0.5, look = aimAt(pos, C, ax, aim, fov);
    if (!box) return look;
    pc.fov = fov; pc.updateProjectionMatrix();
    for (let it = 0; it < iters; it++) {
      pc.position.copy(pos); pc.lookAt(look); pc.updateMatrixWorld();
      let lo = 1e9, hi = -1e9, l = 1e9, r = -1e9;
      for (const q of ptsOf(box)) { cp.copy(q).project(pc); const y = 0.5 - 0.5 * cp.y; lo = Math.min(lo, y); hi = Math.max(hi, y); l = Math.min(l, cp.x); r = Math.max(r, cp.x); }
      const err = hi - lo > y1 - y0 ? hi - y1 - Math.min(slack, hi - lo - (y1 - y0)) : (lo + hi) / 2 - (y0 + y1) / 2, ex = horiz ? (l + r) / 4 - (cxT - 0.5) : 0; if (Math.abs(err) < 0.004 && Math.abs(ex) < 0.004) break;   // too tall for the window: keep its base, let the top go
      aim = clamp(aim - err, 0.05, 0.95); ax = clamp(ax - ex, 0.1, 0.9); look = aimAt(pos, C, ax, aim, fov);
    }
    return look;
  };
  const pairAz = (box, state, s = state.shot) => {   // square-on to the line between the two: both at the same distance, both sharp
    const ps = s.subject?.players ?? [], P = objects.posed(state), pts = ps.map((id) => P.byKey.get('p' + id)).filter(Boolean);
    if (pts.length < 2) { const b = box.getSize(V()); return b.x >= b.z ? 0.2 : 0.75; }
    const lx = pts[1].x - pts[0].x, lz = pts[1].z - pts[0].z; let nx = -lz, nz = lx; if (nz < 0) { nx = -nx; nz = -nz; }
    return clamp(Math.atan2(nx, nz), -0.2, 0.95);
  };

  /** line-up test, decided once per shot: a 'block' shot whose subject is >= 3 players all standing at the front edge (at.r < 0.6) -> {sk: the Skeptic is in the row} or null */
  const lineMemo = new Map();
  function isLineUp(state, s) {
    if (s.kind !== 'block') return null;
    const ids = s.subject?.players ?? []; if (ids.length < 3) return null;
    const key = s.id; if (show && lineMemo.has(key)) return lineMemo.get(key);
    const st = show && s.t0 != null ? show.state(lerp(s.t0, s.t1 - 1e-3, 0.9)) : state;
    const r = ids.every((id) => (st.players?.[id]?.at?.r ?? 9) < 0.6) ? { sk: !!s.subject?.skeptic } : null;
    if (show) { lineMemo.set(key, r); if (lineMemo.size > 64) lineMemo.delete(lineMemo.keys().next().value); }
    return r;
  }

  /** [first, last] time (sampled every 0.25 s) a hat pawn is lit inside the shot, or null; decided once per shot */
  const pulseMemo = new Map();
  function hatPulse(s) {
    if (!show || s.t0 == null || s.t1 == null) return null;
    if (pulseMemo.has(s.id)) return pulseMemo.get(s.id);
    let r = null;
    for (let t = s.t0; t < s.t1; t += 0.25) { const st = show.state(t); if (st.shot?.id === s.id && (st.players ?? []).some((p) => p.role && (p.hat ?? 0) > 0.5 && (p.lit ?? 0) > 0.5)) r = r ? [r[0], t] : [t, t]; }
    pulseMemo.set(s.id, r); return r;
  }

  /** true when a TOTAL counter is up inside the shot (l48: the board's total is what the Skeptic talks about); once per shot */
  const totalMemo = new Map();
  function totalIn(s) {
    if (!show || s.t0 == null || s.t1 == null) return false;
    if (!totalMemo.has(s.id)) { let r = false; for (let t = s.t0; t < s.t1 && !r; t += 0.5) { const st = show.state(t); r = st.shot?.id === s.id && !!st.total; } totalMemo.set(s.id, r); }
    return totalMemo.get(s.id);
  }

  /** [first, last] time two or more long pawn tags ('under 10 coins: …') are up together inside the shot, or null; once per shot */
  const longMemo = new Map();
  function longSpan(s) {
    if (!show || s.t0 == null || s.t1 == null) return null;
    if (longMemo.has(s.id)) return longMemo.get(s.id);
    let r = null;
    for (let t = s.t0; t < s.t1; t += 0.25) { const st = show.state(t); if (st.shot?.id !== s.id) continue; if ((st.tags ?? []).filter((g) => g.anchor?.player != null && (g.text ?? '').length >= 14 && g.opacity > 0.5).length >= 2) r = r ? [r[0], t] : [t, t]; }
    longMemo.set(s.id, r); return r;
  }

  function solve(state) {
    let s = state.shot ?? { id: 'none', kind: 'wide', subject: { board: true }, move: 'hold', u: 0 }, macroFocus = null;
    const seg = objects.pairSeg(state);   // l10: one pair shot per pair (a cut each time the next pair is picked)
    if (seg) s = { ...s, id: seg.key, kind: 'pair', subject: { players: [seg.a, seg.b], coins: [seg.coin] }, to: null, move: 'hold', continuous: false, t0: seg.t0, t1: seg.t1, u: clamp(((state.t ?? seg.t0) - seg.t0) / Math.max(0.1, seg.t1 - seg.t0)) };
    let k = KIND[s.kind] ?? KIND.wide; const u = clamp(s.u ?? 0), e = inOut(u);
    { const Pd = objects.posed(state), ids = s.subject?.players ?? []; if (s.kind === 'player' && ids.length && ids.every((id) => (Pd.byKey.get('p' + id)?.down ?? 0) > 0.5)) k = { ...k, mx: 0.4 }; }   // l64: a fallen pawn with room around it, not an extreme close-up
    const B = shotBoxes(state, s), boardShot = !!s.subject?.board, top = boardShot && B.topText ? 0.17 : 0.07;
    // the subject window: clear of the screen text band (end text at the top: below it with room for one tag row; the hook low: above it)
    const endBand = B.band && B.band[0] <= 0.05, hookBand = B.band && !endBand;
    let Y0 = boardShot ? (s.kind === 'top' ? (B.topText ? 0.15 : 0.08) : top) : (state.tags ?? []).length || show ? (B.topText ? 0.17 : 0.15) : 0.07, Y1 = boardShot ? (s.kind === 'top' ? 0.9 : 0.86) : 0.725;
    if (endBand) Y0 = Math.max(Y0, B.band[1] + (boardShot ? 0.0 : 0.09));
    if (hookBand) Y1 = Math.min(Y1, B.band[0] - 0.01);
    let sy = (Y0 + Y1) / 2;
    const bb = (sub) => { const o = objects.bounds(sub, state); o.box.pts = o.pts; return o.box; };
    let subBox = (s.kind === 'coin' ? bb(s.subject) : B.sub) ?? bb({ board: true }), toBox = B.to;
    const rackTo = s.move === 'rack' && toBox ? toBox : null; if (rackTo) { const pp = [...ptsOf(subBox), ...ptsOf(toBox)]; subBox = subBox.clone().union(toBox); subBox.pts = pp; toBox = null; }
    // a line-up (>= 3 pawns standing in a row at the front edge): square on, low, the row fills ~3/4 of the width, hats high in the picture
    const lineUp = isLineUp(state, s);
    let y0 = Y0, y1 = Y1;
    // with the end text at the top: the names take two rows (about 0.14) under the text, the pawns stand under them, above the captions
    if (lineUp) { k = { ...k, el: 0.1, az: 0, fov: 24, mx: lineUp.sk ? 0.9 : 0.88, f: 7 }; y0 = endBand ? B.band[1] + 0.165 : lineUp.sk ? 0.62 : 0.32; y1 = endBand ? 0.725 : lineUp.sk ? 0.97 : 0.86; sy = (y0 + y1) / 2; }
    // frame check r2 (l65 closing, like Neon / Host): the captions are off from "which", so the names go UNDER the pawns' feet (macro-tags
    // namesBelow, two staggered rows, about 0.19 of the height): the hats sit high and large with air under the end text, the row a little
    // right of centre so the leftmost name (THE SCHOLAR) stays centred on its pawn inside title safe; the push settles early and holds
    // frame check r3 (l36-l40): a tally row (>= 3 chip columns and their owners) fills most of the width: lower angle, the window from just
    // under the top (no tag above a column: each number sits under its column's foot, macro-tags) down to a label row above the captions.
    // While two long pawn tags are up (l38, ~0.45 of the width each, staggered in macro-tags) the row pans left so the lower tag fits
    // right of the upper tag's drop line; then it pans back
    const row = isRow(state) && !lineUp;
    let cxRow = 0.52;
    if (row) {
      k = { ...k, el: 0.1, mx: 0.76 }; y0 = 0.065; y1 = 0.625; sy = (y0 + y1) / 2;
      const ls = longSpan(s), tt = state.t ?? s.t0;
      if (ls) cxRow -= 0.15 * smooth((tt - ls[0] + 1.6) / 1.4) * (1 - smooth((tt - ls[1]) / 1.4));
    }
    if (s.move === 'pull' && toBox && !boardShot) k = { ...k, mx: Math.min(k.mx, 0.68) };   // l45a: room at both sides for a tag beside its tower
    const namesBelow = !!(lineUp && endBand);
    if (namesBelow) { k = { ...k, mx: lineUp.sk ? 0.77 : 0.74 }; y0 = B.band[1] + 0.05; y1 = 0.74; sy = (y0 + y1) / 2; }
    let az = k.az ?? pairAz(subBox, state, s), el = k.el, fov = k.fov;
    if (s.kind === 'pair' && k.az == null) az = pairAz(subBox, state, s);
    if (s.kind === 'player' && (s.subject?.coins ?? []).length > 1) { az = 0; el = 0.45; }
    if (s.kind === 'block' && !lineUp && (s.subject?.coins ?? []).length) { el = 0.34; k = { ...k, mx: 0.72 }; }   // l53: the coin over the four hats: a lower angle spreads the hats and keeps the coin clear above them   // l33: the two coins left and right of the Worker, below its head, not in front of it
    // the tower shot of something very tall: a window up its side, and a tilt to the top
    const coinDemo = s.kind === 'coin' && (s.subject?.extras ?? []).length > 0;   // l49: the coin and the demo tower side by side, square on (the hard focus fades whatever stands in front)
    if (coinDemo) { az = 0.05; el = 0.42; k = { ...k, mx: 0.8 }; }
    if (!['wide', 'high', 'top', 'skeptic', 'row'].includes(s.kind) && !coinDemo && !lineUp) {
      const key = s.id + '|view';
      let cv = show ? memo.get(key) : null;   // decided once per shot (from the stable boxes): the angle never jumps inside a shot
      if (!cv) {
        cv = clearView(state, [subBox, toBox], az, el, fov, k.mx, y0, y1, s.kind === 'tower' || s.move === 'tilt' ? subBox.min.y + 0.55 * (subBox.max.y - subBox.min.y) : -1);
        // frame check r2 (l15): a pan from one pawn to another that stands right in front of it on screen: swing round until the two stand
        // apart (>= 0.12 of the width), so the second one's tags never sit on (or point across) the first
        if (s.kind === 'player' && s.move === 'pan' && toBox) {
          const Pv = objects.posed(state), toIds = new Set((s.to?.players ?? []).map((i) => 'p' + i)), th = Math.tan(fov * Math.PI / 360) * K.W / K.H;
          const tos = Pv.actors.filter((a) => toIds.has(a.key)), others = Pv.actors.filter((a) => !toIds.has(a.key) && a.pawn && ((a.role && a.hat > 0.5) || a.lit > 0.3));   // every other named / lit pawn
          void th;
          // badness of a view: how much the room just above each `to` pawn's hat (where its tags go) and its own pawn overlap another named pawn
          const U = toBox.clone().union(subBox), pr = (q) => { cp.copy(q).project(pc); return [0.5 + 0.5 * cp.x, 0.5 - 0.5 * cp.y]; };
          const pawnR = (a) => { const h = pr(a.head.clone().add(V(0, a.role && a.hat > 0 ? (MP.HAT_TOP[a.role] - PAWN_H) * a.scale : 0, 0))), f = pr(a.pose.pos); return [Math.min(h[0], f[0]) - 0.022, h[1], Math.max(h[0], f[0]) + 0.022, f[1]]; };
          const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
          const bad = (a, e) => {
            const F = fit(U, a, e, fov, k.mx, y0, y1); pc.fov = fov; pc.updateProjectionMatrix(); pc.position.copy(F.C).addScaledVector(dirOf(a, e), F.d); pc.lookAt(F.C); pc.updateMatrixWorld();
            let b = 0; for (const p of tos) { const R0 = pawnR(p), Z = [R0[0] - 0.02, R0[1] - 0.13, R0[2] + 0.02, R0[1]]; for (const o of others) { const Ro = pawnR(o), Rt = [Ro[0], Ro[1], Ro[2], pr(V(o.x, o.g, o.z))[1]]; b += ov(Z, Rt) + ov(R0, Ro); } }   // the room above it is clear of the other pawn AND its tower
            return b;
          };
          if (tos.length && others.length && bad(cv.az, cv.el) > 1e-4) {
            let best = [cv.az, cv.el], bb = bad(cv.az, cv.el);
            for (const de of [0, 0.15, 0.3]) for (const da of [0, 0.25, -0.25, 0.45, -0.45, 0.65, -0.65]) { const a = clamp(cv.az + da, -0.2, 1.1), e = Math.min(1.2, cv.el + de), q = bad(a, e) + 0.0004 * (Math.abs(da) + de); if (q < bb - 1e-5) { bb = q; best = [a, e]; } }
            cv = { az: best[0], el: best[1] };
          }
        }
        if (show) memo.set(key, cv);
      }
      az = cv.az; el = cv.el;
    }
    if (s.move === 'orbit' && !boardShot) {   // an orbit must stay framed all the way round: fit at both ends too
      const Fs = [-0.34, 0, 0.34].map((da) => fit(subBox, az + da, el, fov, k.mx, y0, y1, null, k.bw)), Fm = Fs.reduce((a, b) => (b.d > a.d ? b : a));
      const pp = ptsOf(subBox); subBox = subBox.clone(); subBox.pts = pp; subBox.dOrbit = Fm.d;
    }
    // a pan between two pieces ends with both whole (l15 l22: the tall tower it leaves stays in the picture, never cut by the top edge)
    if (s.move === 'pan' && toBox && !boardShot) { const pp = [...ptsOf(subBox), ...ptsOf(toBox)]; toBox = toBox.clone().union(subBox); toBox.pts = pp; }
    let F0 = fit(subBox, az, el, fov, k.mx, y0, y1, null, k.bw), F1 = toBox ? fit(toBox, az, el, fov, k.mx, y0, y1, null, k.bw) : { C: F0.C.clone(), d: F0.d };
    if (subBox.dOrbit) F0.d = Math.max(F0.d, subBox.dOrbit);
    let az0 = az, az1 = az, el0 = el, el1 = el, d0 = F0.d, d1 = F1.d, C0 = F0.C, C1 = F1.C, tilt = false;
    const tall = subBox.max.y - subBox.min.y, wide = Math.max(subBox.max.x - subBox.min.x, subBox.max.z - subBox.min.z);
    if (s.move === 'tilt') {
      // the start window holds the foot of BOTH pieces when the tilt climbs another one (l45: from the small stack up the 1 % tower; framing the tiny stack alone put the lens inside the tower)
      const foot = toBox ? subBox.clone().union(toBox) : subBox, fw = Math.max(foot.max.x - foot.min.x, foot.max.z - foot.min.z);
      const win = Math.min(Math.max(tall, toBox ? fw : 0), Math.max(0.085, (toBox ? fw : wide) * 2.4)), lo = new THREE.Box3(foot.min.clone(), V(foot.max.x, foot.min.y + win, foot.max.z));
      const Fl = fit(lo, az, el, fov, k.mx, y0, y1);
      const topY = toBox ? toBox.max.y : subBox.max.y, topC = toBox ? toBox.getCenter(V()) : V(Fl.C.x, subBox.max.y - win * 0.42, Fl.C.z);
      if (toBox) topC.y = Math.max(topC.y, toBox.max.y - win * 0.42);
      C0 = Fl.C; d0 = d1 = Fl.d * 1.06; C1 = V(topC.x, Math.min(topC.y, Fl.C.y + Fl.d * 2.4), topC.z); tilt = true;
      void topY;
    }
    switch (s.move) {
      case 'push': if (!boardShot) d0 *= row ? 1.05 : 1.14; d1 = (toBox ? d1 : F0.d) * (boardShot ? (ptsOf(subBox).some((q) => q.tall) ? 1.0 : 0.93) : lineUp && endBand ? 1.0 : s.kind === 'tally' ? 0.95 : 0.84); break;   // l65: the line-up ends exactly on its fit (a tighter end pushed the names into the end text)   // a whole-board push starts at the full-width fit
      case 'pull': d0 *= 0.86; d1 = (toBox ? d1 : F0.d) * (boardShot || toBox ? 1.0 : 1.2); break;   // frame check r3 (l45a): a pull to two towers ends on their fit (the 1.2 margin left them small); the fit's side margins hold the tags
      case 'orbit': az0 = Math.max(az - 0.34, -0.05); az1 = az0 + 0.68; break;   // never round to the window side
      case 'crane': if (!toBox) { d1 = F0.d * 1.55; } el1 = s.to?.board ? 0.42 : el + 0.32; break;   // a crane back to the whole board ends at a normal wide angle (top-down a square board is an island in 16:9)
      case 'drop': el0 = el + 0.5; d0 *= 1.08; break;
      case 'hold': d1 = d0 * 0.965; break;
      default: break;
    }
    const tb = s.to?.board, ty0 = tb ? 0.07 : y0, ty1 = tb ? 0.86 : y1, tmx = tb ? 0.92 : k.mx;
    if (s.move === 'crane' && toBox) { const F = fit(toBox, az, el1, fov, tmx, ty0, ty1, null, KIND.wide.bw); d1 = F.d; C1 = F.C; }
    if (s.move === 'drop' && toBox) { const F = fit(toBox, az, el1, fov, tmx, ty0, ty1, null, KIND.wide.bw); d1 = F.d; C1 = F.C; }
    const ee = namesBelow && s.move === 'push' ? inOut(u / 0.25) : s.move === 'hold' ? u : s.move === 'drop' && toBox ? inOut(u / 0.55) : s.move === 'pull' && toBox ? inOut(u / 0.22) : s.move === 'push' && toBox ? inOut(u / 0.5) : e;   // l45a: the pull reaches both towers as the 90 % tower finishes rising   // l45a: both towers whole by mid-line   // a drop lands on its `to` early and holds there (l63: the fallen pair is the point)
    let C = C0.clone().lerp(C1, ee), d = lerp(d0, d1, ee), A = lerp(az0, az1, ee), E = lerp(el0, el1, ee);
    if (row) d *= 1 + 0.9 * (0.52 - cxRow);   // the pan off-centre stretches the far column upward: step back while it lasts
    let pos;
    if (tilt) { const Cp = C0.clone(); pos = Cp.add(dirOf(A, E).multiplyScalar(d)); pos.y = Math.max(pos.y, C0.y); }
    else pos = C.clone().add(dirOf(A, E).multiplyScalar(d));
    let focusP = tilt ? C : C.clone(), look, fK = k.f;
    // the Skeptic: low behind it at the near edge, looking over it at the board
    if (s.kind === 'skeptic') {
      const sk = objects.anchor({ skeptic: true }, state, 'top') ?? V(0, 0.0, 0.29), head = objects.anchor({ skeptic: true }, state, 'tag') ?? sk.clone().add(V(0, 0.05, 0));
      const mid = sk.clone().lerp(head, 0.55), toward = V(-mid.x * 0.6, 0, -0.3 - mid.z).normalize();
      const dd = lerp(s.move === 'push' ? 0.27 : 0.22, s.move === 'push' ? 0.18 : 0.21, e);
      pos = mid.clone().addScaledVector(toward, -dd).add(V(0.07 + 0.03 * e, 0.05 - 0.01 * e, 0)); C = mid; focusP = mid;
      look = aimAt(pos, mid, 0.34, endBand ? 0.6 : hookBand ? 0.44 : 0.52, fov);
      // a long hold on the Skeptic with the board behind (l48, 9 s while the pile grows): the focus racks to the board in the middle of the shot
      if (s.move === 'hold' && s.subject?.board && (s.t1 ?? 0) - (s.t0 ?? 0) > 6) { const r = smooth((u - 0.3) / 0.25); focusP = mid.clone().lerp(V(0, 0.03, 0), r); }
      // frame check r3 (l31): when the line lights the hat pawns in turn ("smarter / work harder / start with more"), the lens widens and
      // tilts up from behind the Skeptic: the Skeptic stays large low left, the hats sit in the upper right third; while they pulse the
      // pawns standing between the lens and the hats ghost (objects.macroFocus, the hard-focus fade of the object layer) and the focus
      // racks to the hats and back
      const tp = s.move === 'hold' && s.subject?.board && (s.t1 ?? 0) - (s.t0 ?? 0) > 6 ? hatPulse(s) : null;
      if (tp) {
        const rs = objects.posed(state).actors.filter((a) => a.role && a.pawn && !a.hidden && a.hat > 0.5 && a.down < 0.5);
        if (rs.length >= 3) {
          const H = V(); for (const a of rs) H.add(a.head); H.multiplyScalar(1 / rs.length); H.y += 0.004;
          const tt = state.t ?? s.t0, w = smooth((tt - (tp[0] - 2.2)) / 2.0), fov2 = 38;
          const P2 = pos.clone().add(V(0.01, 0.03, 0.02)), look2 = aimAt(P2, mid, 0.36, 0.56, fov2);   // the Skeptic above the captions; the hats land in the upper third
          pos.lerp(P2, w); look.lerp(look2, w); fov = lerp(fov, fov2, w); fK = lerp(fK, 6.5, w);
          const g = smooth((tt - tp[0] + 0.4) / 0.8) * (1 - smooth((tt - tp[1] - 0.5) / 0.8)), lit = Math.max(0, ...rs.map((a) => clamp(a.lit)));
          focusP = focusP.clone().lerp(mid.clone().lerp(H, 0.2 + 0.65 * Math.max(lit, 0.6 * g)), w);
          macroFocus = { keys: rs.map((a) => a.key), hard: 0.8 * g * w };
        }
      } else if (s.move === 'hold' && s.subject?.board && (s.t1 ?? 0) - (s.t0 ?? 0) > 6 && totalIn(s)) {
        // frame check r6 (l48, the pile grows under a TOTAL counter while the Skeptic objects): ~2.3 s on the Skeptic, then the l31 two-plane
        // framing: the lens rises and widens, the Skeptic moves low left, the board fills the upper right and the focus + depth of field go to it
        const tt = state.t ?? s.t0, w = smooth((tt - (s.t0 + 2.3)) / 1.3), fov2 = 40;
        const P2 = pos.clone().add(V(0.015, 0.045, 0.03)), look2 = aimAt(P2, mid, 0.27, 0.58, fov2);
        pos.lerp(P2, w); look.lerp(look2, w); fov = lerp(fov, fov2, w); fK = lerp(fK, 9, w);
        focusP = mid.clone().lerp(V(0, 0.03, -0.05), w);
      }
    } else {
      // never inside a tower, never under the board
      for (const c of objects.columns(state)) { const dx = pos.x - c.x, dz = pos.z - c.z, dh = Math.hypot(dx, dz), need = c.r + 0.03; if (dh < need && pos.y < c.top + 0.02) { const ux = dh > 1e-4 ? dx / dh : 0, uz = dh > 1e-4 ? dz / dh : 1; pos.x = c.x + ux * need; pos.z = c.z + uz * need; } }
      pos.y = Math.max(pos.y, objects.ground(pos.x, pos.z) + 0.008);
      look = refine(pos, C, B.sub ? subBox : null, fov, sy, y0, y1, s.kind === 'row' || namesBelow || row, boardShot ? 0.1 : 0, namesBelow ? 0.56 : row ? cxRow : 0.5, row ? 8 : 3);
      if (toBox && !tilt && ['pan', 'drop', 'crane', 'pull', 'push'].includes(s.move) && ee > 0.001) look.lerp(refine(pos, C, toBox, fov, sy, y0, y1), ee);   // end the move framed on `to`, not on the subject
    }
    // rack: the camera holds on both, the focus moves from the subject to `to`
    if (rackTo) focusP = (B.sub ?? subBox).getCenter(V()).lerp(rackTo.getCenter(V()), smooth((u - 0.15) / 0.5));
    const wideKind = s.kind === 'skeptic' || ['wide', 'high', 'top', 'low', 'row'].includes(s.kind);
    // a fallen pawn lies flat across the focus plane: more depth of field so the whole piece (and its hat) is sharp (l63 l64)
    const Pd = objects.posed(state), downIds = (s.to?.players ?? s.subject?.players ?? []), fallen = downIds.length > 0 && downIds.every((id) => (Pd.byKey.get('p' + id)?.down ?? 0) > 0.5);
    return { macroFocus, namesBelow: namesBelow && !!titleBand(state), pos, look, fov, f: fallen ? Math.max(fK, 5.6) : fK, exp: k.exp, focusP, shutter: s.move === 'hold' || s.move === 'rack' ? 0.5 : 0.4,
      shC: wideKind ? V(0, 0, 0) : C.clone().setY(0), shR: wideKind ? 0.42 : clamp(subBox.getSize(V()).length() * 0.62, 0.11, 0.45),
      dbg: { kind: s.kind, move: s.move, band: B.band, d0: +d0.toFixed(3), d1: +d1.toFixed(3), el: +el.toFixed(2), box: [subBox.min.toArray(), subBox.max.toArray()].map((q) => q.map((v) => +v.toFixed(3))) } };
  }

  // continuous shots start exactly where the previous shot ends: blend from that camera into this shot's own path
  const endMemo = new Map();
  const shotList = show?.shots ?? [];
  const idx = new Map(shotList.map((x, i) => [x.id, i]));
  function camAt(state) {
    const own = solve(state), s = state.shot;
    if (!show || !s?.continuous || !idx.has(s.id) || idx.get(s.id) === 0) return own;
    const prev = shotList[idx.get(s.id) - 1];
    let pe = endMemo.get(prev.id);
    if (!pe) { pe = camAt(show.state(Math.max(prev.t0, prev.t1 - 1e-3))); endMemo.set(prev.id, pe); if (endMemo.size > 64) endMemo.delete(endMemo.keys().next().value); }
    const w = inOut(clamp(((state.t ?? s.t0) - s.t0) / Math.max(0.1, Math.min(3.0, 0.85 * (s.t1 - s.t0)))));   // the hand-over takes at most 3 s, then the shot's own framing holds
    return { ...own, pos: pe.pos.clone().lerp(own.pos, w), look: pe.look.clone().lerp(own.look, w), fov: lerp(pe.fov, own.fov, w), f: lerp(pe.f, own.f, w), exp: lerp(pe.exp, own.exp, w),
      focusP: pe.focusP.clone().lerp(own.focusP, w), shC: pe.shC.clone().lerp(own.shC, w), shR: lerp(pe.shR, own.shR, w), shutter: 0.4 };
  }
  function apply(state, t) {
    const c = camAt(state);
    K.look(c.pos, c.look); K.lens.fov = c.fov; K.camera.fov = c.fov; K.camera.updateProjectionMatrix();
    K.lens.fstop = c.f; K.lens.focus = K.focusDist(c.focusP); K.exposure = c.exp; K.shutter = c.shutter;
    stage.shadowFocus(c.shC, c.shR); K.dbgCam = c.dbg;
    objects.avoidRects = c.namesBelow ? NAMES_BELOW : NO_AVOID; objects.macroFocus = c.macroFocus ?? null;   // Macro camera only (the Host builds its own avoid rects): l65 names under the feet
    const close = !['wide', 'high', 'top', 'row'].includes(state.shot?.kind); stage.discGain = close ? 0.3 : 0.5; stage.discMax = close ? 2 : 6;
  }
  return { apply };
}

/* ================================================================== view */
export async function makeView(K, show) {
  const objects = await makeObjects(K, { show });
  const camera = makeCamera(K, objects);
  // frame check r3 (closing hold): while the end text is up at the top, no out-of-focus room light sits in its band (a bokeh disc at the left
  // of "ARE YOU?" read as a bullet point); the discs there fade out with the text. Runs after the stage's own disc hook (Macro view only)
  let cur = null; const fwd = V(), rel = V(), ndc = V();
  K.onFrame.push((t, cam) => {
    const band = titleBand(cur); if (!band || band[0] > 0.05) return;
    const op = clamp(cur.title.opacity), P5 = cam.projectionMatrix.elements[5]; cam.getWorldDirection(fwd);
    for (const m of objects.stage.discs ?? []) {
      if (!m.visible) continue;
      const z = rel.copy(m.position).sub(cam.position).dot(fwd); if (z <= 0) continue;
      ndc.copy(m.position).project(cam); const y = 0.5 - 0.5 * ndc.y, r = 0.5 * m.scale.x / z * P5;
      if (y - r < band[1] + 0.03 && y + r > band[0]) { if (op > 0.98) m.visible = false; else m.material.color.multiplyScalar(1 - op); }
    }
  });
  return { objects, camera, draw(state, t) { cur = state; objects.update(state, t); camera.apply(state, t); } };
}
