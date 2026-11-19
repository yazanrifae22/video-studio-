// test3d look-dev for the 2026-11-17 props, NEON look (same shots as film.js). Render with
// --film film-neon.js --extra "bloom=1.3&bloomthr=0.7&dof=0&grain=0.012&vig=0.2&contrast=1.1&sat=1.2" (the b9l7 engine settings).
export default async function build(K) {
  const { THREE, scene, kit } = K;
  const { makeNeon } = await import('/kit/kit/neon.js');
  const N = makeNeon(K), C = N.C;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  scene.background = null; scene.fog = new THREE.Fog(0x000000, 0.4, 2.2);
  const G = N.grid(); scene.add(G);
  const col = (r, g, b) => new THREE.Color().setRGB(r, g, b);

  // A: three cups, a gold coin under the middle one
  const A = [G.sq(27), G.sq(28), G.sq(29)];
  const cupsA = A.map((p) => { const c = N.cup(); c.position.copy(p); scene.add(c); return c; });
  const coin = N.coin(); coin.position.copy(A[1]); scene.add(coin);
  const lift = kit.liftCup(cupsA[1], A[1], { t0: 0.3, dur: 0.8 });
  // B: 10 x 10 field
  const field = [];
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) { const c = N.cup({ width: 2.4, gain: 1.8 }); c.position.set((i - 4.5) * 0.0492, 0, (j - 4.5) * 0.0492); scene.add(c); field.push(c); }
  // C: paper at 0, 1.5, 3, 6 folds
  const sheets = [0, 1.5, 3, 6].map((k, i) => { const p = N.paper({ w: 0.105, h: 0.148 }); p.position.set((i % 2 - 0.5) * 0.17, 0, (Math.floor(i / 2) - 0.5) * 0.2); p.setFolds(k); scene.add(p); return p; });
  // D / E: king, tower, white chip (Moon), pawns in three tones + a servant
  const king = N.piece(N.KING, { color: C.gold, width: 4.2, cross: true, gain: 3.2, pool: 0.07, rings: [[2.2, 19.6], [10.4, 16.6], [55.4, 10.9], [76.8, 10.8]] }); scene.add(king);
  const tower = N.tower(); scene.add(tower);
  const moon = N.stack(1, { color: C.white, radius: 0.015, pitch: 0.0033, gain: 2.6 }); scene.add(moon);
  const pr = [[1.8, 13.6], [6.8, 10.9], [31, 8.5]], po = { width: 3.4, gain: 2.3, rim: 0.4, pool: 0.04 };
  const pawns = [N.piece(N.PAWN, { ...po, rings: pr, color: col(1, 0.82, 0.55) }), N.piece(N.PAWN, { ...po, rings: pr, color: col(1, 0.42, 0.12) }), N.piece(N.PAWN, { ...po, rings: pr, color: col(0.45, 0.55, 1) }),
    N.piece(N.scaleProfile(N.PAWN, 0.7), { ...po, width: 2.8, rings: pr.map(([y, r]) => [y * 0.7, r * 0.7]), color: col(1, 0.82, 0.55) })];
  pawns.forEach((p) => scene.add(p));
  const KP = G.sq(36), TP = V(KP.x + 0.042, 0, KP.z + 0.004);
  king.position.copy(KP); tower.position.copy(TP); moon.position.set(KP.x + 0.075, 0, KP.z + 0.05);
  [-0.075, -0.04, -0.005, 0.026].forEach((dx, i) => pawns[i].position.set(KP.x + dx, 0, KP.z + 0.06));

  const show = (s) => {
    cupsA.forEach((c) => (c.visible = s === 'A')); coin.visible = s === 'A';
    field.forEach((c) => (c.visible = s === 'B')); sheets.forEach((p) => (p.visible = s === 'C'));
    king.visible = tower.visible = s === 'D' || s === 'E'; moon.visible = s === 'D'; pawns.forEach((p) => (p.visible = s === 'D'));
  };
  const cam = (pos, target, fov) => { K.look(pos, target); K.lens.fov = fov; K.lens.fstop = 16; K.lens.focus = 1; };
  function frame(t) {
    K.shutter = 0.5; K.exposure = 1;
    if (t < 2) { show('A'); lift.apply(t); const c = A[1]; cam([c.x + 0.04, 0.2, c.z + 0.5], [c.x, 0.035, c.z - 0.01], 30); }
    else if (t < 4) { show('B'); cam([0.32, 0.62, 0.78], [0, 0, 0], 38); }
    else if (t < 6) { show('C'); cam([0.04, 0.66, 0.4], [0, 0, 0.03], 36); }
    else if (t < 8) { show('D'); tower.setHeight(0.05); const c = V(KP.x, 0.025, KP.z + 0.04); cam([c.x + 0.05, 0.2, c.z + 0.6], [c.x, 0.03, c.z - 0.02], 34); }
    else { show('E'); tower.setHeight(2); cam([KP.x - 0.05, 0.03, KP.z + 0.3], [KP.x + 0.03, 0.14, KP.z], 40); }
  }
  return { frame };
}
