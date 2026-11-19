// test3d kit: cups (shell game), a sheet of paper that folds in half again and again, a tower of paper sheets. Procedural, metres, y up, board top = y 0.
import * as THREE from 'three';
import { rng, makeCanvas, clamp, smooth, ease } from './util.js';
import { woodCanvas } from './board.js';

/* ------------------------------------------------------------------ cup */
// outline in millimetres [radius, height] of an UPTURNED cup, mouth on the board: inner top -> down the inside -> rounded rim bead -> up the outside -> foot ring on top.
// Inner radius at the mouth 18.1 mm (a 27 mm coin fits with 4.6 mm all round), outer 21.3 mm at the bead, 45 mm tall, tapers to 16 mm under the foot.
export const CUP = [[0, 41.6], [10, 41.5], [14.4, 41.1], [15.9, 39.9], [16.5, 37.5], [17.0, 26], [17.6, 10], [18.0, 2.4], [18.15, 0.7], [18.6, 0.1], [19.6, 0], [20.6, 0.15], [21.2, 0.8],
  [21.3, 1.8], [21.0, 2.8], [20.4, 3.6], [20.25, 5], [19.4, 18], [18.4, 32], [17.9, 37.4], [17.3, 38.9], [16.2, 39.6], [15.7, 40.4], [16.0, 41.6], [16.3, 43.6], [16.0, 44.6], [15.0, 45], [8, 45.05], [0, 45.05]];
/** outer silhouette only (rim on the board -> top), for line art */
export const CUP_OUTER = [[0, 0], ...CUP.slice(10)];
const CUP_H = 0.04505, CUP_R = 0.0213, CUP_IN = 0.0181;

function lathe(mm, seg, samples) {
  const curve = new THREE.CatmullRomCurve3(mm.map(([r, y]) => new THREE.Vector3(r * 0.001, y * 0.001, 0)), false, 'centripetal');
  const pts = curve.getSpacedPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, seg);
}
let cupGeo = null;
const cupGeometry = () => (cupGeo ??= lathe(CUP, 72, 220));

/** fine turning/brushing marks running around the cup (lathe uv: u around, v along the outline) */
function brushedCanvas(seed) {
  const w = 512, h = 1024, c = makeCanvas(w, h), x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = 'rgb(140,140,140)'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2200; i++) { const g = R() > 0.5 ? R.range(165, 215) : R.range(95, 125); x.fillStyle = `rgba(${g},${g},${g},${R.range(0.15, 0.45)})`; x.fillRect(R() * w - 40, R() * h, R.range(60, 600), R.range(0.6, 1.8)); }
  for (let i = 0; i < 30; i++) { const py = R() * h, r = R.range(20, 90), g = R() > 0.5 ? 185 : 110, gr = x.createLinearGradient(0, py - r, 0, py + r); gr.addColorStop(0, `rgba(${g},${g},${g},0)`); gr.addColorStop(0.5, `rgba(${g},${g},${g},0.18)`); gr.addColorStop(1, `rgba(${g},${g},${g},0)`); x.fillStyle = gr; x.fillRect(0, py - r, w, 2 * r); }
  return c;
}
/** cupMaterial({material 'metal' | 'copper' | 'wood', seed}): share one between many cups */
export function cupMaterial(K, { material = 'metal', seed = 1 } = {}) {
  const tex = (cv, srgb, rep = [1, 1]) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
  if (material === 'wood') {
    const w = woodCanvas(1024, seed + 60, [[96, 58, 30], [140, 92, 52], [176, 128, 80]], { rings: 4, fibre: 1.2 });
    const mk = (cv, srgb) => { const t = tex(cv, srgb); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.repeat.set(0.6, 2); return t; };
    return new THREE.MeshPhysicalMaterial({ map: mk(w.col, true), roughnessMap: mk(w.rgh, false), roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, sheen: 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.9, 0.7, 0.5), side: THREE.DoubleSide });
  }
  const br = tex(brushedCanvas(seed), false, [2, 1]);
  const m = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: material === 'copper' ? 0.42 : 0.52, roughnessMap: br, bumpMap: br, bumpScale: 0.04, anisotropy: 0.4, envMapIntensity: 2, side: THREE.DoubleSide });
  if (material === 'copper') m.color.setRGB(0.95, 0.6, 0.46); else m.color.setRGB(0.78, 0.78, 0.8);
  return m;
}
/** cup({seed, material 'metal' | 'copper' | 'wood' | a Material}) -> Mesh: an upturned cup, origin = centre of the rim on the board. .height .radius .inner */
export function cup(K, { seed = 1, material = 'metal' } = {}) {
  const mat = material?.isMaterial ? material : cupMaterial(K, { material, seed });
  const m = new THREE.Mesh(cupGeometry(), mat); m.name = 'cup'; m.castShadow = true; m.receiveShadow = true;
  m.height = CUP_H; m.radius = CUP_R; m.inner = CUP_IN; m.profile = CUP;
  return m;
}
/**
 * cups(n, {seed, material}) -> InstancedMesh of n cups sharing one geometry + material (100 cups = one draw call).
 * .place(i, pos, quat?, scale?) .hide(i) .commit() (after places). All start hidden.
 */
export function cups(K, n = 100, { seed = 1, material = 'metal' } = {}) {
  const mat = material?.isMaterial ? material : cupMaterial(K, { material, seed });
  const im = new THREE.InstancedMesh(cupGeometry(), mat, n); im.name = 'cups'; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), Q0 = new THREE.Quaternion();
  im.place = (i, pos, quat = Q0, scale = 1) => { im.setMatrixAt(i, M.compose(pos, quat, S.setScalar(scale))); return im; };
  im.hide = (i) => { im.setMatrixAt(i, M.makeScale(0, 0, 0)); return im; };
  im.commit = () => { im.instanceMatrix.needsUpdate = true; return im; };
  for (let i = 0; i < n; i++) im.hide(i);
  im.height = CUP_H; im.radius = CUP_R; im.inner = CUP_IN;
  return im;
}
/**
 * liftCup(cup, home, {t0, height 0.055, tilt 1.05, dur 0.7, dir -PI/2, hold, back, index}) -> {at(t) -> {pos, quat, k}, apply(t), tUp, tDown}.
 * The cup rises off home (fast start, soft stop) and tips its top toward dir (radians in xz, 0 = +x; default -z = away from a camera on +z) so the mouth
 * turns to the camera and shows what was under it. hold = seconds it stays up, then it comes down again in back s (omit hold = stays up).
 * index: an instance of cups() (apply() then sets that instance; call cups.commit()). Pure function of t.
 */
export function liftCup(cup, home, { t0 = 0, height = 0.055, tilt = 1.05, dur = 0.7, dir = -Math.PI / 2, hold = null, back = null, index = null } = {}) {
  const dx = Math.cos(dir), dz = Math.sin(dir), axis = new THREE.Vector3(dz, 0, -dx), tDown = hold == null ? Infinity : t0 + dur + hold, bk = back ?? dur;
  const at = (t) => {
    let k = clamp((t - t0) / dur); if (t > tDown) k = 1 - clamp((t - tDown) / bk);
    const up = t > tDown ? smooth(k) : ease.out(k), tl = smooth(clamp((k - 0.15) / 0.85)) * tilt;
    const pos = new THREE.Vector3(home.x + dx * 0.012 * tl, (home.y ?? 0) + height * up, home.z + dz * 0.012 * tl);
    // tip around the rim point nearest the camera side when it is low (no sinking into the board), around the rim centre once it is high
    const quat = new THREE.Quaternion().setFromAxisAngle(axis, tl);
    const lift = CUP_R * Math.sin(tl); pos.y += Math.max(0, lift - height * up);
    return { pos, quat, k };
  };
  const apply = (t) => { const o = at(t); if (index != null && cup.isInstancedMesh) cup.place(index, o.pos, o.quat); else { cup.position.copy(o.pos); cup.quaternion.copy(o.quat); } return o; };
  return { at, apply, tUp: t0 + dur, tDown };
}

/* ------------------------------------------------------------------ paper */
function paperCanvases(seed) {
  const R = rng(seed);
  // face: off-white with faint fibres (bump)
  const fw = 512, f = makeCanvas(fw, fw), fx = f.getContext('2d');
  fx.fillStyle = 'rgb(128,128,128)'; fx.fillRect(0, 0, fw, fw);
  for (let i = 0; i < 5000; i++) { const g = R() > 0.5 ? 150 : 108; fx.strokeStyle = `rgba(${g},${g},${g},0.35)`; fx.lineWidth = R.range(0.4, 1); const px = R() * fw, py = R() * fw, a = R() * 6.283, l = R.range(2, 10); fx.beginPath(); fx.moveTo(px, py); fx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); fx.stroke(); }
  // edge: 16 sheets per tile, each sheet a light band with a thin shadow line between (v = up)
  const ew = 64, eh = 256, e = makeCanvas(ew, eh), ex = e.getContext('2d');
  for (let i = 0; i < 16; i++) { const y0 = i * eh / 16, g = Math.round(R.range(222, 240)); ex.fillStyle = `rgb(${g},${g},${g - 4})`; ex.fillRect(0, y0, ew, eh / 16); ex.fillStyle = 'rgb(150,148,142)'; ex.fillRect(0, y0, ew, 2.2); ex.fillStyle = 'rgb(250,250,248)'; ex.fillRect(0, y0 + 3, ew, 1.5); }
  return { face: f, edge: e };
}
function paperMaterials(seed) {
  const cv = paperCanvases(seed);
  const fb = new THREE.CanvasTexture(cv.face); fb.wrapS = fb.wrapT = THREE.RepeatWrapping; fb.repeat.set(4, 4); fb.colorSpace = THREE.NoColorSpace;
  const edge = new THREE.CanvasTexture(cv.edge); edge.wrapS = edge.wrapT = THREE.RepeatWrapping; edge.colorSpace = THREE.SRGBColorSpace; edge.anisotropy = 16;
  const face = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.8, 0.8, 0.78), roughness: 0.88, bumpMap: fb, bumpScale: 0.25, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color(1, 1, 1) });
  const side = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.92, 0.92, 0.9), map: edge, roughness: 0.92 });
  return { face, side, edge };
}
/** box 1 x 1 x 1 standing on y 0 (centred in x and z); material order +x -x +y -y +z -z */
const unitBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/**
 * foldState(w, h, thick, k): the folding sheet at fold k (fraction = the fold in progress). Folds halve the longer side first, then alternate.
 * -> {n, f, x, z, T (layer stack thickness before the current fold), axis 'x' | 'z', layers, shift}. Used by paper() and neon paper().
 */
export function foldState(w, h, thick, k) {
  const n = Math.floor(Math.max(0, k) + 1e-9), f = Math.max(0, k) - n; let x = w, z = h; const first = w >= h ? 'x' : 'z';
  const axisOf = (i) => (i % 2 === 0 ? first : first === 'x' ? 'z' : 'x');
  for (let i = 0; i < n; i++) { if (axisOf(i) === 'x') x /= 2; else z /= 2; }
  return { n, f, x, z, T: thick * 2 ** n, layers: 2 ** n, axis: axisOf(n) };
}
/**
 * paper({w 0.21, h 0.297, thick 0.0001, seed}) -> Group: a white sheet lying on the board (w on x, h on z), footprint centred on the origin.
 * .setFolds(k): k folds in half (fraction = the top half swinging over: footprint halves, thickness doubles; longer side first, then alternate;
 * the result slides back to the centre while it folds). Readable 0..8 (a real 0.1 mm A4 sheet: 12.8 mm thick, 19 x 26 mm after 7).
 * After setFolds: .size = {x, y, z} footprint and height.
 */
export function paper(K, { w = 0.21, h = 0.297, thick = 0.0001, seed = 1 } = {}) {
  const g = new THREE.Group(); g.name = 'paper';
  const M = paperMaterials(seed), edges = [0, 1].map(() => { const t = M.edge.clone(); t.needsUpdate = true; return t; });
  const sides = edges.map((t) => { const s = M.side.clone(); s.map = t; return s; });
  const mk = (i) => { const m = new THREE.Mesh(unitBox(), [sides[i], sides[i], M.face, M.face, sides[i], sides[i]]); m.castShadow = true; m.receiveShadow = true; return m; };
  const fixed = mk(0), pivot = new THREE.Group(), flap = mk(1); pivot.add(flap); g.add(fixed, pivot);
  const LIFT = 0.00004;
  g.size = { x: w, y: thick, z: h };
  g.setFolds = (k) => {
    const s = foldState(w, h, thick, k), T = s.T;
    edges.forEach((e) => e.repeat.set(1, s.layers / 16));
    if (s.f < 1e-4) {
      fixed.scale.set(s.x, T, s.z); fixed.position.set(0, LIFT, 0); pivot.visible = false;
      g.size = { x: s.x, y: T, z: s.z }; return g;
    }
    pivot.visible = true; const f = s.f, th = Math.PI * smooth(f), sh = smooth(f);
    if (s.axis === 'x') {
      const L = s.x, shift = L / 4 * sh;
      fixed.scale.set(L / 2, T, s.z); fixed.position.set(-L / 4 + shift, LIFT, 0);
      pivot.position.set(shift, LIFT + T, 0); pivot.rotation.set(0, 0, th);
      flap.scale.set(L / 2, T, s.z); flap.position.set(L / 4, -T, 0);
      g.size = { x: L / 2 + (L / 2) * Math.max(0, Math.cos(th)), y: T * 2, z: s.z };
    } else {
      const L = s.z, shift = L / 4 * sh;
      fixed.scale.set(s.x, T, L / 2); fixed.position.set(0, LIFT, -L / 4 + shift);
      pivot.position.set(0, LIFT + T, shift); pivot.rotation.set(-th, 0, 0);
      flap.scale.set(s.x, T, L / 2); flap.position.set(0, -T, L / 4);
      g.size = { x: s.x, y: T * 2, z: L / 2 + (L / 2) * Math.max(0, Math.cos(th)) };
    }
    return g;
  };
  g.setFolds(0);
  return g;
}

/**
 * paperStack({w 0.03, d 0.021, pitch 0.0001, seed}) -> Mesh: a tower of paper sheets standing on y 0 (footprint w on x, d on z, centred).
 * .setHeight(hm) any height (1 mm .. kilometres): the side faces carry the sheet lines as a repeating texture (pitch = one sheet), so they stay right at any height.
 * .height
 */
export function paperStack(K, { w = 0.03, d = 0.021, pitch = 0.0001, seed = 2 } = {}) {
  const M = paperMaterials(seed), ex = M.edge.clone(), ez = M.edge.clone(); ex.needsUpdate = ez.needsUpdate = true;
  const sx = M.side.clone(), sz = M.side.clone(); sx.map = ex; sz.map = ez;
  const m = new THREE.Mesh(unitBox(), [sx, sx, M.face, M.face, sz, sz]); m.name = 'paperStack'; m.castShadow = true; m.receiveShadow = true;
  // ream bands: every 500 sheets a faint seam and a slightly different white (in the shader, from the sheet uv), so a tall tower still reads as stacked paper;
  // the seams fade out where they would be denser than the pixels
  for (const sm of [sx, sz]) sm.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  { float rq = vMapUv.y / 31.25, ri = floor( rq ), rf = fract( rq ), fw = fwidth( rq ), keep = 1.0 - smoothstep( 0.04, 0.25, fw );
    float tone = 1.0 - 0.07 * fract( sin( ri * 12.9898 + 4.1 ) * 43758.5453 ) * keep;
    float seam = 1.0 - 0.35 * keep * ( 1.0 - smoothstep( 0.0, max( 0.006, fw * 1.5 ), rf ) );
    diffuseColor.rgb *= tone * seam; }`);
  };
  m.scale.set(w, 0.001, d);
  m.setHeight = (hm) => { hm = Math.max(1e-5, hm); m.scale.y = hm; const rep = hm / (16 * pitch); ex.repeat.set(1, rep); ez.repeat.set(1, rep); m.height = hm; return m; };
  m.setHeight(0.001); m.w = w; m.d = d;
  return m;
}
