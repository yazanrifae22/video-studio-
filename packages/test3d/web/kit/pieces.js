// test3d kit: chess pieces (lathe profiles in millimetres, built in metres). Origin = centre of the base, y up.
import * as THREE from 'three';
import { rng, makeCanvas, spring, clamp } from './util.js';
import { woodCanvas } from './board.js';

function lathe(mm, seg = 128, samples = 320) {
  const curve = new THREE.CatmullRomCurve3(mm.map(([r, y]) => new THREE.Vector3(r * 0.001, y * 0.001, 0)), false, 'centripetal');
  const pts = curve.getSpacedPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, seg);
}

/** fine random polishing scratches: g = roughness multiplier (mid grey = 1), also used as a tiny bump */
function scratchCanvas(size, seed) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = 'rgb(150,150,150)'; x.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const g = R() > 0.45 ? R.range(175, 245) : R.range(95, 135);
    x.strokeStyle = `rgba(${g},${g},${g},${R.range(0.1, 0.4)})`; x.lineWidth = R.range(0.4, 1.3);
    const px = R() * size, py = R() * size, a = (R() > 0.3 ? R.gauss() * 0.25 : R() * 6.283), l = R.range(8, 120);
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // soft blotches (finger-polish variation)
  for (let i = 0; i < 40; i++) { const px = R() * size, py = R() * size, r = R.range(30, 130), g = R() > 0.5 ? 200 : 120; const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(${g},${g},${g},0.12)`); gr.addColorStop(1, `rgba(${g},${g},${g},0)`); x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); }
  return c;
}

const KING = [[0, 0], [17.5, 0], [19, 0.6], [19.6, 2.2], [19.5, 4.2], [18.6, 5.8], [16.4, 7], [15.3, 7.9], [15.9, 9.2], [16.6, 10.4], [15.8, 11.9], [13.6, 13.2], [11.2, 15.5], [9.4, 19.5], [8.1, 26], [7.1, 35], [6.5, 44], [6.6, 51],
  [7.6, 53], [10, 54], [10.9, 55.4], [10, 56.8], [8, 57.6], [7.7, 58.3], [8.6, 59.2], [9, 60.2], [8.4, 61.2], [7.1, 62], [6.9, 63.2], [7.4, 66], [8.8, 71], [10.2, 75.2], [10.8, 76.8], [10.3, 78], [8.7, 78.9], [6.6, 80.2], [4.2, 81.4], [3.1, 82.3], [3.3, 83.4], [3, 84.6], [1.9, 85.5], [0, 85.8]];
const PAWN = [[0, 0], [12, 0], [13.2, 0.5], [13.6, 1.8], [13.4, 3.4], [12.2, 4.7], [10.7, 5.6], [10.9, 6.8], [10.4, 8.2], [8.6, 9.8], [6.6, 12.5], [5.4, 17], [4.7, 22], [4.5, 26.5], [5.2, 28.8], [7.6, 30], [8.5, 31], [7.8, 32.2], [5.8, 33], [4.9, 34], [5.6, 35.6], [7.2, 38.2], [8.2, 41.2], [8.3, 44], [7.4, 47], [5.2, 49.2], [2.6, 50.2], [0, 50.4]];

/** polished gold: physically based (metalness 1, gold reflectance), fine scratches in the roughness */
export function goldMaterial(K, { roughness = 0.2, seed = 3 } = {}) {
  const sc = new THREE.CanvasTexture(scratchCanvas(1024, seed)); sc.wrapS = sc.wrapT = THREE.RepeatWrapping; sc.repeat.set(3, 2); sc.anisotropy = 8;
  const m = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness, roughnessMap: sc, bumpMap: sc, bumpScale: 0.12, envMapIntensity: 1 });
  m.color.setRGB(1.0, 0.74, 0.32);   // linear reflectance of gold
  return m;
}

/** king({height: 0.096}) -> Group (polished gold, cross on top) */
export function king(K, { roughness = 0.2, seed = 3, material = null } = {}) {
  const g = new THREE.Group(); g.name = 'king';
  const mat = material ?? goldMaterial(K, { roughness, seed });
  const body = new THREE.Mesh(lathe(KING), mat); g.add(body);
  const s = new THREE.Shape(); const P = [[-1.3, 0], [1.3, 0], [1.1, 4.1], [4, 3.8], [4.1, 6.8], [1.1, 6.5], [1.5, 10.4], [-1.5, 10.4], [-1.1, 6.5], [-4.1, 6.8], [-4, 3.8], [-1.1, 4.1]];
  P.forEach(([x, y], i) => (i ? s.lineTo(x * 0.001, y * 0.001) : s.moveTo(x * 0.001, y * 0.001)));
  const cg = new THREE.ExtrudeGeometry(s, { depth: 0.0014, bevelEnabled: true, bevelSize: 0.00045, bevelThickness: 0.00045, bevelSegments: 4 }); cg.translate(0, 0, -0.0007);
  const cross = new THREE.Mesh(cg, mat); cross.position.y = 0.0851; g.add(cross);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.height = 0.096; g.radius = 0.0196; g.material = mat; g.profile = KING;
  return g;
}

/** wood tones for pawns (sRGB palettes for woodCanvas, satin finish) */
export const PAWN_TONES = {
  maple: { pal: [[140, 96, 52], [192, 146, 88], [224, 186, 128]], roughness: 0.62, clearcoat: 0.18, sheen: [0.9, 0.75, 0.5] },
  walnut: { pal: [[52, 30, 16], [92, 58, 32], [128, 86, 52]], roughness: 0.55, clearcoat: 0.3, sheen: [0.7, 0.5, 0.35] },
  ebony: { pal: [[14, 11, 10], [28, 22, 19], [46, 38, 32]], roughness: 0.4, clearcoat: 0.55, sheen: [0.5, 0.45, 0.4] },
};
PAWN_TONES.dark = PAWN_TONES.ebony;

/** pawn({seed, scale 1, tone 'maple' | 'walnut' | 'ebony' (= 'dark')}) -> Group (worn wood, satin), 0.05 m x scale tall. scale is built into the outline (tilt/topple stay right). */
export function pawn(K, { seed = 5, scale = 1, tone = 'maple' } = {}) {
  const g = new THREE.Group(); g.name = 'pawn';
  const T = PAWN_TONES[tone] ?? PAWN_TONES.maple;
  const w = woodCanvas(1024, seed + 40, T.pal, { rings: 3, fibre: 1.3 });
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.repeat.set(0.5, 1.2); t.anisotropy = 8; return t; };
  const mat = new THREE.MeshPhysicalMaterial({ map: mk(w.col, true), roughnessMap: mk(w.rgh, false), roughness: T.roughness, clearcoat: T.clearcoat, clearcoatRoughness: 0.45, sheen: 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color(...T.sheen) });
  const prof = scale === 1 ? PAWN : PAWN.map(([r, y]) => [r * scale, y * scale]);
  const body = new THREE.Mesh(lathe(prof, 96, 240), mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  g.height = 0.0504 * scale; g.radius = 0.0136 * scale; g.material = mat; g.profile = prof; g.tone = tone;
  return g;
}

/* ---------- rigid-body acting for lathe pieces (pure functions of t; the piece always rests on its real outline) ---------- */
const Y_AXIS = new THREE.Vector3(0, 1, 0);
/** lowest point of the turned outline when the axis leans by th from vertical, relative to the base centre (metres, <= 0) */
function lowest(profile, th) { const c = Math.cos(th), s = Math.sin(Math.abs(th)); let m = 0; for (const [r, h] of profile) { const y = (h * c - r * s) * 0.001; if (y < m) m = y; } return m; }
/** the base edge the piece pivots on: the widest point of the foot */
function baseEdge(profile) { let b = profile[1]; for (const p of profile) if (p[1] < 6 && p[0] > b[0]) b = p; return [b[0] * 0.001, b[1] * 0.001]; }

/**
 * tilt(piece, home, dir, angle): lean a standing piece by `angle` radians toward the horizontal direction `dir` (radians in the xz plane, 0 = +x, PI/2 = +z),
 * rocking on its base edge (it never sinks into the board or floats). angle < 0 leans the other way. Sets position and quaternion.
 */
export function tilt(piece, home, dir, angle) {
  if (angle < 0) { angle = -angle; dir += Math.PI; }
  const [re, he] = baseEdge(piece.profile), dx = Math.cos(dir), dz = Math.sin(dir), k = re - (he * Math.sin(angle) + re * Math.cos(angle));
  piece.position.set(home.x + dx * k, (home.y ?? 0) - lowest(piece.profile, angle), home.z + dz * k);
  piece.quaternion.setFromAxisAngle(new THREE.Vector3(dz, 0, -dx), angle);   // axis = y x d: turns +y toward d
  return piece;
}

/**
 * topple(piece, home, {dir, t0, roll, ...}) -> {at(t) -> {pos, quat, top}, apply(t), tHit, tRest, hits: [{t, gain}]}.
 * A heavy piece tips over its base edge toward `dir` (radians in xz) starting at t0 (slow at first, like an upside-down pendulum), its head hits the
 * board at tHit, bounces once (and a little second time), then it rolls on its side through `roll` radians (it travels on an arc, as a cone does)
 * and rocks back and forth to rest. Hand-animated, a pure function of t.
 */
export function topple(piece, home, { dir = 0.9, t0 = 0, roll = -1.9, theta0 = 0.021, tau = 0.105, bounce = [[0.12, 0.105], [0.06, 0.022]], rollHz = 0.85, rollDamp = 0.26 } = {}) {
  const P = piece.profile, [re, he] = baseEdge(P), dx = Math.cos(dir), dz = Math.sin(dir);
  // lying angle: lean until a second point of the outline touches the board
  let thL = Math.PI; for (const [r, h] of P) { const rr = r * 0.001, hh = h * 0.001; if (hh > 0.012 && rr < re) thL = Math.min(thL, Math.PI - Math.atan((hh - he) / (re - rr))); }
  const Th = tau * Math.acosh(thL / theta0 + 1), tHit = t0 + Th, T1 = bounce[0][0], T2 = bounce[1][0];
  const originAt = (th) => { const k = re - (he * Math.sin(th) + re * Math.cos(th)); return new THREE.Vector3(home.x + dx * k, (home.y ?? 0) - lowest(P, th), home.z + dz * k); };
  // point where the lying axis meets the board: the piece rolls around it
  const oL = originAt(thL), sL = oL.y / -Math.cos(thL), apex = new THREE.Vector3(oL.x + dx * sL * Math.sin(thL), 0, oL.z + dz * sL * Math.sin(thL));
  const edge = new THREE.Vector3(home.x + dx * re, 0, home.z + dz * re), kYaw = re / Math.max(0.02, edge.distanceTo(apex));
  const tiltAxis = new THREE.Vector3(dz, 0, -dx), qT = new THREE.Quaternion(), qR = new THREE.Quaternion(), qY = new THREE.Quaternion();
  const at = (t) => {
    const a = t - t0; let th = 0, rho = 0;
    if (a > 0 && a < Th) th = theta0 * (Math.cosh(a / tau) - 1);
    else if (a >= Th) {
      const b = a - Th; th = thL;
      if (b < T1) { const u = b / T1; th -= bounce[0][1] * 4 * u * (1 - u); } else if (b < T1 + T2) { const u = (b - T1) / T2; th -= bounce[1][1] * 4 * u * (1 - u); }
      rho = roll * spring(b, rollHz, rollDamp);
    }
    const pos = originAt(th), yaw = kYaw * rho;
    qT.setFromAxisAngle(tiltAxis, th); qR.setFromAxisAngle(Y_AXIS, rho); qY.setFromAxisAngle(Y_AXIS, yaw);
    pos.sub(apex).applyQuaternion(qY).add(apex);
    const quat = qY.clone().multiply(qT).multiply(qR);
    return { pos, quat, theta: th, top: new THREE.Vector3(0, piece.height * 0.93, 0).applyQuaternion(quat).add(pos) };
  };
  return { at, apply(t) { const o = at(t); piece.position.copy(o.pos); piece.quaternion.copy(o.quat); return o; }, t0, tHit, tRest: tHit + 2.2, thL, hits: [{ t: tHit, gain: 1 }, { t: tHit + T1, gain: 0.3 }] };
}
