// test3d look-dev for the 2026-11-17 props (MACRO look, 10 s, 1080x1920). 2 s per shot, stills at 1.6, 3, 5, 7, 9:
// 0-2 three cups, the middle one lifts off a gold coin · 2-4 a 10 x 10 field of cups · 4-6 paper at 0, 1.5, 3 and 6 folds ·
// 6-8 king + paper tower 5 cm + white chips (Moon) + maple / walnut / ebony pawns + a small servant · 8-10 the tower at 2 m beside the king, low camera.
export default async function build(K) {
  const { THREE, scene, kit, lerp, seg, ease } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const stage = kit.stage();
  const board = kit.board(); scene.add(board);

  // A: three cups, a coin under the middle one
  const cm = kit.cupMaterial({ seed: 3 });
  const A = [board.sq(27), board.sq(28), board.sq(29)];
  const cupsA = A.map((p) => { const c = kit.cup({ material: cm }); c.position.copy(p); scene.add(c); return c; });
  const coin = kit.coins(1, { seed: 4 }); coin.position.copy(A[1]); scene.add(coin);
  const lift = kit.liftCup(cupsA[1], A[1], { t0: 0.3, dur: 0.8 });

  // B: 10 x 10 field, pitch 49.2 mm (the outer ring stands on the frame lip, 1.6 mm up)
  const field = kit.cups(100, { material: cm }); scene.add(field);
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
    const x = (i - 4.5) * 0.0492, z = (j - 4.5) * 0.0492, out = i === 0 || j === 0 || i === 9 || j === 9;
    field.place(j * 10 + i, V(x, out ? 0.0016 : 0, z));
  }
  field.commit();

  // C: four sheets (A6, 105 x 148 mm) at 0, 1.5, 3, 6 folds
  const ks = [0, 1.5, 3, 6], sheets = ks.map((k, i) => { const p = kit.paper({ w: 0.105, h: 0.148, seed: i + 1 }); p.position.set((i % 2 - 0.5) * 0.17, 0, (Math.floor(i / 2) - 0.5) * 0.2); p.setFolds(k); scene.add(p); return p; });

  // D / E: king, tower, white chips, pawns
  const king = kit.king(); scene.add(king);
  const tower = kit.paperStack(); scene.add(tower);
  const moon = kit.chips(1, { color: 'white', seed: 5 }); scene.add(moon);
  const pawns = [kit.pawn({ tone: 'maple', seed: 5 }), kit.pawn({ tone: 'walnut', seed: 6 }), kit.pawn({ tone: 'ebony', seed: 7 }), kit.pawn({ tone: 'maple', scale: 0.7, seed: 8 })];
  pawns.forEach((p) => scene.add(p));
  const KP = board.sq(36), TP = V(KP.x + 0.042, 0, KP.z + 0.004);
  king.position.copy(KP); tower.position.copy(TP);
  moon.position.set(KP.x + 0.075, 0, KP.z + 0.05);
  const PP = [-0.075, -0.04, -0.005, 0.026].map((dx) => V(KP.x + dx, 0, KP.z + 0.06)); pawns.forEach((p, i) => p.position.copy(PP[i]));

  const show = (s) => {
    cupsA.forEach((c) => (c.visible = s === 'A')); coin.visible = s === 'A';
    field.visible = s === 'B'; sheets.forEach((p) => (p.visible = s === 'C'));
    king.visible = tower.visible = s === 'D' || s === 'E'; moon.visible = s === 'D'; pawns.forEach((p) => (p.visible = s === 'D'));
  };
  show('A'); lift.apply(0); scene.updateMatrixWorld(true); stage.probe(cupsA[0], V(A[1].x, 0.03, A[1].z), { intensity: 2 });
  show('D'); scene.updateMatrixWorld(true); stage.probe(king, V(KP.x, 0.045, KP.z));

  function frame(t) {
    K.shutter = 0.5; K.exposure = 0.9;
    if (t < 2) {
      show('A'); lift.apply(t);
      const c = A[1];
      K.look([c.x + 0.04, 0.2, c.z + 0.5], [c.x, 0.035, c.z - 0.01]);
      K.lens.fov = 30; K.lens.fstop = 8; K.lens.focus = K.focusDist(V(c.x, 0.02, c.z));
      stage.shadowFocus(c, 0.2);
    } else if (t < 4) {
      show('B');
      K.look([0.32, 0.62, 0.78], [0, 0.0, 0.0]);
      K.lens.fov = 38; K.lens.fstop = 5.6; K.lens.focus = K.focusDist(V(0, 0, 0)); K.exposure = 0.8;
      stage.shadowFocus(V(0, 0, 0), 0.42);
    } else if (t < 6) {
      show('C');
      K.look([0.04, 0.66, 0.4], [0, 0, 0.03]);
      K.lens.fov = 36; K.lens.fstop = 8; K.lens.focus = K.focusDist(V(0, 0, 0)); K.exposure = 0.85;
      stage.shadowFocus(V(0, 0, 0), 0.3);
    } else if (t < 8) {
      show('D'); tower.setHeight(0.05);
      const c = V(KP.x, 0.025, KP.z + 0.04);
      K.look([c.x + 0.05, 0.2, c.z + 0.6], [c.x, 0.03, c.z - 0.02]);
      K.lens.fov = 34; K.lens.fstop = 8; K.lens.focus = K.focusDist(c);
      stage.shadowFocus(c, 0.25);
    } else {
      show('E'); tower.setHeight(2);
      K.look([KP.x - 0.05, 0.03, KP.z + 0.3], [KP.x + 0.03, 0.14, KP.z]);
      K.lens.fov = 40; K.lens.fstop = 8; K.lens.focus = K.focusDist(V(TP.x, 0.05, TP.z));
      stage.shadowFocus(V(KP.x, 0, KP.z), 0.3);
    }
  }
  return { frame };
}
