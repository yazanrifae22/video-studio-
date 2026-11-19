// STAND-IN for the Macro engineer's object layer (view-macro.js makeObjects), same API, crude objects. Host view dev only.
// makeObjects(K, opts) -> { update(state, t), anchor(anchor, state), bounds(subject, state), metres({f, r}), stage }
import * as THREE from 'three';
import { tower, COLORS, N } from '../game.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export async function makeObjects(K, opts = {}) {
  const { scene, kit } = K, SQ = kit.SQ;
  const stage = kit.stage();
  const board = kit.board(); scene.add(board);
  const metres = ({ f, r }) => V((f - 4.5) * SQ, 0, (4.5 - r) * SQ);
  const PAWN_H = 0.05, DISC = 0.002;
  const gold = kit.goldMaterial({ roughness: 0.3 });
  const colMat = new THREE.MeshStandardMaterial({ color: 0xd9a63c, metalness: 1, roughness: 0.3 });
  const cyl = new THREE.CylinderGeometry(0.0135, 0.0135, 1, 20); cyl.translate(0, 0.5, 0);
  const pawnGeo = new THREE.CylinderGeometry(0.008, 0.014, PAWN_H, 16); pawnGeo.translate(0, PAWN_H / 2, 0);
  const headGeo = new THREE.SphereGeometry(0.01, 12, 10);
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const wood = new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.6 });
  const roleMat = Object.fromEntries(Object.entries(COLORS).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })]));
  const MAXC = 19;
  const towers = Array.from({ length: N + 12 }, () => Array.from({ length: MAXC }, () => mk(cyl, colMat)));
  const pawns = Array.from({ length: N + 12 }, () => { const g = new THREE.Group(); const b = new THREE.Mesh(pawnGeo, wood), h = new THREE.Mesh(headGeo, wood); h.position.y = PAWN_H; b.castShadow = h.castShadow = true; g.add(b, h); scene.add(g); g.body = b; g.head = h; return g; });
  const hats = Array.from({ length: N + 12 }, () => mk(new THREE.ConeGeometry(0.012, 0.02, 12), wood));
  const coin = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 40), gold);
  const discs = Array.from({ length: 40 }, () => mk(cyl, colMat));
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x9a1b1b, roughness: 0.5 });
  const chipCols = Array.from({ length: 70 }, () => mk(new THREE.CylinderGeometry(0.015, 0.015, 1, 20).translate(0, 0.5, 0), chipMat));
  const king = kit.king(); scene.add(king);
  const skMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.4 });
  const sk = new THREE.Group(); { const b = new THREE.Mesh(pawnGeo, skMat), h = new THREE.Mesh(headGeo, skMat); h.position.y = PAWN_H; b.castShadow = h.castShadow = true; sk.add(b, h); } scene.add(sk);
  const skTower = Array.from({ length: 1 }, () => mk(cyl, colMat));

  const heightOf = (coins, rings) => tower(coins, { rings }).height;
  const pieceOf = (state, a) => {
    if (a.player != null) return state.players[a.player];
    if (a.extra != null) return state.extras.find((e) => e.id === a.extra);
    return null;
  };
  const anchor = (a, state) => {
    if (!a) return V();
    let p;
    if (a.player != null || a.extra != null) {
      const pc = pieceOf(state, a); if (!pc) return V();
      p = metres(pc.at); p.y = heightOf(pc.coins, pc.rings) + (pc.kind === 'tower' ? 0 : PAWN_H * (pc.scale ?? 1) * (1 - (pc.down ?? 0)));
    } else if (a.skeptic) { const s = state.skeptic; p = metres(s.at); p.y = heightOf(s.coins, 1) + PAWN_H; }
    else if (a.king) { const pl = state.players[state.king.on ?? 0]; p = metres(pl.at); p.y = heightOf(pl.coins, pl.rings) + 0.096; }
    else if (a.coin != null) { const c = state.flipCoins.find((x) => x.id === a.coin); p = c ? metres(c.at) : V(); p.y = (c?.lift ?? 0) * 0.25 + 0.03; }
    else if (a.chips != null) { const c = state.chips.find((x) => x.id === a.chips); p = c ? anchor(c.at, state) : V(); if (c && !c.at.player) p.y = Math.floor(c.count) * 0.0033; }
    else if (a.f != null) p = metres(a);
    else p = V(0, 0.05, 0);
    if (a.y) p.y += a.y * SQ;
    return p;
  };
  const bounds = (sub, state) => {
    const pts = [], add = (p, base = true) => { pts.push(p); if (base) pts.push(p.clone().setY(0)); };
    for (const i of sub.players ?? []) add(anchor({ player: i }, state));
    for (const i of sub.extras ?? []) add(anchor({ extra: i }, state));
    for (const i of sub.coins ?? []) add(anchor({ coin: i }, state));
    for (const i of sub.chips ?? []) add(anchor({ chips: i }, state));
    if (sub.king) add(anchor({ king: true }, state));
    if (sub.skeptic) add(anchor({ skeptic: true }, state));
    if (sub.board) { let top = 0; for (const p of state.players) if (p.present > 0.5) top = Math.max(top, heightOf(p.coins, p.rings) + PAWN_H); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pts.push(V(x * 0.24, 0, z * 0.24)); pts.push(V(0, top, 0)); }
    if (!pts.length) pts.push(V(0, 0.03, 0));
    const box = new THREE.Box3().setFromPoints(pts), center = box.getCenter(V()), radius = Math.max(0.03, box.getSize(V()).length() / 2);
    return { center, radius, top: box.max.y, box };
  };

  let used = 0;
  const putTower = (meshes, at, coins, rings) => {
    const tw = tower(coins, { rings }), c0 = metres(at);
    meshes.forEach((m, k) => { const col = tw.columns[k]; m.visible = !!col; if (col) { m.position.set(c0.x + col.dx, 0, c0.z + col.dz); m.scale.set(1, Math.max(1e-4, col.discs * DISC), 1); } });
    return tw.height;
  };
  const putPawn = (g, hat, pc, h, roleKey) => {
    const p = metres(pc.at); g.visible = pc.present > 0.5; hat.visible = g.visible && pc.hat > 0;
    g.position.set(p.x, h + (pc.hop ?? 0) * 0.016, p.z); g.scale.setScalar(pc.scale ?? 1);
    g.rotation.set(0, 0, (pc.down ?? 0) * Math.PI / 2); if (pc.down > 0.5) g.position.y = 0.01;
    const m = roleKey && pc.hat > 0.5 ? roleMat[roleKey] : wood; g.body.material = m; g.head.material = m;
    const lit = pc.lit ?? 0, dim = pc.dim ?? 0; g.body.material = g.body.material; g.visible = g.visible;
    if (hat.visible) { hat.material = roleMat[roleKey] ?? wood; hat.position.set(p.x, h + PAWN_H + 0.012 + (1 - pc.hat) * 0.08, p.z); }
    return lit - dim;
  };
  return {
    stage, board, metres, anchor, bounds,
    update(state, t) {
      used = 0;
      state.players.forEach((pc, i) => { const h = pc.present > 0.5 ? putTower(towers[i], pc.at, pc.coins, pc.rings) : (towers[i].forEach((m) => { m.visible = false; }), 0); putPawn(pawns[i], hats[i], pc, h, pc.role); });
      for (let k = 0; k < 12; k++) {
        const e = state.extras[k], i = N + k;
        if (!e || e.kind === 'layer') { towers[i].forEach((m) => { m.visible = false; }); pawns[i].visible = false; hats[i].visible = false; continue; }
        const h = putTower(towers[i], e.at, e.coins, e.rings); if (e.kind === 'pawn') putPawn(pawns[i], hats[i], e, h, e.role); else { pawns[i].visible = false; hats[i].visible = false; }
      }
      const fc = state.flipCoins[0]; coin.visible = !!fc && fc.present > 0.5;
      if (coin.visible) { const p = metres(fc.at); coin.position.set(p.x, 0.003 + fc.lift * 0.25, p.z); coin.rotation.set(fc.angle * Math.PI * 2, fc.yaw * Math.PI * 2, 0); }
      discs.forEach((d) => { d.visible = false; });
      state.moves.forEach((m, k) => { if (k >= discs.length) return; const a = anchor(m.from, state), b = anchor(m.to, state), p = a.lerp(b, m.u); p.y += Math.sin(Math.PI * m.u) * 0.04; const d = discs[k]; d.visible = true; d.position.copy(p); d.scale.set(1, Math.max(0.002, (m.coins / 10) * DISC || 0.0033 * m.count), 1); });
      chipCols.forEach((c) => { c.visible = false; });
      state.chips.forEach((c, k) => { if (k >= chipCols.length || c.count <= 0) return; const p = c.at.player != null ? anchor(c.at, state) : metres(c.at); const m = chipCols[k]; m.visible = true; m.position.copy(p); m.scale.set(1, Math.max(0.001, c.count * 0.0033), 1); });
      king.visible = state.king.on != null && state.king.drop > 0;
      if (king.visible) { const pl = state.players[state.king.on], p = metres(pl.at), h = heightOf(pl.coins, pl.rings); king.position.set(p.x, h + (1 - state.king.drop) * 0.6, p.z); if (state.king.swap > 0.5) pawns[state.king.on].visible = false; }
      const s = state.skeptic; sk.visible = s.present > 0.5; skTower[0].visible = false;
      if (sk.visible) { const p = metres(s.at), h = s.coins > 0 ? putTower(skTower, s.at, s.coins, 1) : 0; sk.position.set(p.x, h + s.hop * 0.016, p.z); }
    },
  };
}
