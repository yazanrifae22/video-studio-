// test3d look-dev film (10 s, 1080x1920): proves the macro-photography look of the kit.
// 0-3 one grain lands on square 1 (king out of focus behind) · 3-5 rack focus to the king · 5-8 glide along row 1 (1..128 grains) · 8-10 wide: half the board under rice.
export default async function build(K) {
  const { THREE, scene, kit, ease, seg, lerp } = K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const stage = kit.stage();
  const board = kit.board(); scene.add(board);
  const king = kit.king(); scene.add(king);
  const pawn = kit.pawn(); scene.add(pawn);
  const kingA = board.sq(17), kingB = board.sq(53), pawnA = board.sq(12), pawnB = board.sq(43);

  // shots 1-2: the hero grain
  const s1 = board.sq(1);
  const hero = kit.rice.grain({ seed: 3 }); scene.add(hero);
  const rest = hero.rest(V(s1.x + 0.002, 0, s1.z + 0.004)); rest.quat.setFromAxisAngle(V(0, 1, 0), 0.32);
  const drop = kit.rice.drop(rest, K.word('l1', 'grain'), { height: 0.05, slow: 6, bounce: 0.42, scatter: 0.007, settle: 0.1, spin: 10, seed: 4 });
  drop.hits.forEach((h) => K.sfx('tick', h.t, -12 + 20 * Math.log10(h.gain)));

  // shot 3: 1, 2, 4 ... 128 grains on squares 1..8 (square 1 is the hero grain)
  const piles = [], tags = [];
  for (let i = 0; i < 8; i++) {
    const n = 2 ** i, c = board.sq(i + 1);
    const p = i ? kit.rice.pile(n, c, 20 + i, { radius: 0.024 }) : null; if (p) scene.add(p);
    const tag = kit.numberTag(String(n), { height: 0.009 }); tag.position.set(c.x, (p ? p.top : 0.002) + 0.015, c.z); scene.add(tag);
    piles.push(p); tags.push(tag);
  }
  K.sfx('whoosh', 4.95, -16); K.sfx('riser', 6.4, -20, 1.6);

  // shot 4: the heap over the near half
  const heap = kit.rice.heap(0.212, 0.075, V(0, 0, 0.108), 5, { rz: 0.098, grains: 9000 }); scene.add(heap);
  K.sfx('hit', 8.0, -10); K.sfx('pour', 8.05, -16, 1.8);

  // local reflections for the gold king: one bake per position
  const setShot = (wide) => {
    king.position.copy(wide ? kingB : kingA); pawn.position.copy(wide ? pawnB : pawnA);
    heap.visible = wide; hero.visible = !wide; for (const p of piles) if (p) p.visible = !wide;
  };
  hero.pose(rest);
  setShot(false); scene.updateMatrixWorld(true); const envA = stage.probe(king, V(kingA.x, 0.045, kingA.z));
  setShot(true); scene.updateMatrixWorld(true); const envB = stage.probe(king, V(kingB.x, 0.045, kingB.z));

  const T2 = 3, T3 = K.snap(5), T4 = K.snap(8);
  const grainP = V(rest.pos.x, 0.002, rest.pos.z), kingFront = V(kingA.x, 0.03, kingA.z + 0.012);
  const rowX0 = board.sq(1).x, rowX1 = board.sq(8).x, rowZ = board.sq(1).z;

  function frame(t) {
    const wide = t >= T4;
    setShot(wide);
    king.material.envMap = wide ? envB : envA;
    for (let i = 0; i < 8; i++) tags[i].opacity = 0;

    if (t < T3) {
      // 1: extreme macro, low angle, slow push-in · 2: rack focus grain -> king with a small tilt up
      hero.pose(drop.at(t));
      const push = seg(t, 0, T3, ease.inOutQuad), rack = seg(t, T2 + 0.15, T3 - 0.35, ease.inOut);
      const dist = lerp(0.072, 0.05, push);
      K.look([grainP.x + 0.005, lerp(0.0095, 0.0085, push), grainP.z + dist], [grainP.x - 0.001, lerp(0.0125, 0.0215, rack), grainP.z - 0.02]);
      K.lens.fov = 34; K.lens.fstop = 13;
      K.lens.focus = lerp(K.focusDist(grainP), K.focusDist(kingFront), rack);
      K.exposure = 1.08; K.shutter = 0.5;
      stage.shadowFocus(V(s1.x, 0, s1.z - 0.05), 0.14);
    } else if (!wide) {
      // 3: glide along the first row, the row runs away into the depth of the frame
      hero.pose(rest);
      const k = seg(t, T3, T4, ease.inOutQuad), x = lerp(rowX0 - 0.012, rowX1 - 0.02, k);
      const F = V(x, 0.004, rowZ);
      K.look([x - 0.14, 0.06, rowZ + 0.03], [x + 0.06, 0.014, rowZ + 0.004]);
      K.lens.fov = 36; K.lens.fstop = 5.6; K.lens.focus = K.focusDist(F);
      K.exposure = 0.82; K.shutter = 0.3;
      for (let i = 0; i < 8; i++) { const far = (board.sq(i + 1).x - x) / kit.SQ; tags[i].opacity = 1 - K.smooth((far - 1.9) / 0.9); tags[i].pop = K.spring(t - (T3 + 0.05 + i * 0.07), 3.2, 0.55); }   // only the tags near the lens, the far ones would pile up
      stage.shadowFocus(V(0, 0, rowZ - 0.08), 0.3);
    } else {
      // 4: wide, high three-quarter view, slow push
      const k = seg(t, T4, K.duration, ease.out), d = lerp(1.02, 0.93, k), az = lerp(0.5, 0.44, k), el = 0.62;
      K.look([Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d + 0.02], [0, 0.02, 0.025]);
      K.lens.fov = 38; K.lens.fstop = 5.6; K.lens.focus = K.focusDist(V(kingB.x, 0.03, kingB.z + 0.02));
      K.exposure = 0.8; K.shutter = 0.5;
      stage.shadowFocus(V(0, 0, 0), 0.42);
    }
  }
  return { frame };
}
