// test3d kit: the HOST. A stop-motion style puppet storyteller (vinyl / clay look, knit sweater) who sits behind the table, plus his small cloth bag.
// Everything is procedural (no downloaded models, textures or fonts). He is a generic invented figure, not a likeness of anyone.
// World: y up, the camera sits on +z, he faces +z. His RIGHT hand is on world -x (screen left), his LEFT on +x.
// Use from a film:  const { makeHost, makeBag } = await import('/kit/kit/host.js');  const man = makeHost(K);  scene.add(man.root);
//   every frame:    man.pose({ t, lean, side, twist, yaw, pitch, tilt, look, follow, brow, browTilt, squint, lid, mouth, R, L })
//   hands:          R / L = man.hand('R', { at, point, dir, palm, grip, roll }) or a track: man.track('R').key(t, move, spec, { lift }) ... .at(t)
import * as THREE from 'three';
import { rng, clamp, lerp, smooth, fbm, noise2, makeCanvas, normalCanvas } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const toV = (p) => (p.isVector3 ? p : V(p[0], p[1], p[2]));
const ss = (a, b, x) => smooth((x - a) / (b - a));
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const tex = (canvas, srgb = false, wrap = true) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const rgb = (c) => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
const uvScale = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ------------------------------------------------------------------ textures */
/** chunky knit: columns of V stitches (7 mm wide). Returns colour + normal canvases that tile. */
function knit(col, { size = 512, cols = 32, rows = 40, width = 0.224 } = {}) {
  const Hh = new Float32Array(size * size), c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const u = px / size * cols, v = py / size * rows, cx = u - Math.floor(u), cy = v - Math.floor(v), e = Math.abs(cx - 0.5) * 2;
    const strand = 0.5 + 0.5 * Math.cos(6.2832 * (cy + 0.5 * e)), groove = Math.pow(Math.sin(Math.PI * cx), 0.6), h = groove * (0.4 + 0.6 * strand);
    Hh[py * size + px] = h * 0.0012;
    const k = (0.48 + 0.52 * h) * (0.92 + 0.16 * noise2(px / 2.5, py / 2.5, 5, Math.round(size / 2.5))), o = (py * size + px) * 4;
    d[o] = col[0] * k; d[o + 1] = col[1] * k; d[o + 2] = col[2] * k; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return { col: c, nrm: normalCanvas(Hh, size, width / size, 1) };
}
/** plain weave (linen sack) */
function weave(col, size = 256, n = 40) {
  const Hh = new Float32Array(size * size), c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const u = px / size * n, v = py / size * n, a = 0.5 + 0.5 * Math.sin(6.2832 * u), b = 0.5 + 0.5 * Math.sin(6.2832 * v), over = (Math.floor(u) + Math.floor(v)) % 2, h = over ? a * (0.5 + 0.5 * b) : b * (0.5 + 0.5 * a);
    Hh[py * size + px] = h * 0.0006;
    const k = (0.62 + 0.38 * h) * (0.88 + 0.24 * noise2(px / 5, py / 1.3, 9, Math.round(size / 5))), o = (py * size + px) * 4;
    d[o] = col[0] * k; d[o + 1] = col[1] * k; d[o + 2] = col[2] * k; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return { col: c, nrm: normalCanvas(Hh, size, 0.1 / size, 1) };
}

/** soft terminator for skin (light seems to travel a little way through it) */
function soft(m, k = 0.5) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  #if NUM_DIR_LIGHTS > 0
  { float ndl = dot( normalize( normal ), directionalLights[ 0 ].direction ); float wr = pow( clamp( ndl * 0.5 + 0.5, 0.0, 1.0 ), 1.7 ) - max( ndl, 0.0 );
    totalEmissiveRadiance += diffuseColor.rgb * directionalLights[ 0 ].color * vec3( 1.0, 0.46, 0.32 ) * max( wr, 0.0 ) * ${k.toFixed(3)} * RECIPROCAL_PI; }
  #endif`); };
  m.customProgramCacheKey = () => 'host-skin-' + k;
  return m;
}

/* ------------------------------------------------------------------ head */
const HEAD = { rx: 0.098, ry: 0.112, rz: 0.104, c: V(0, 0.098, 0.012) };
const SKIN = [206, 148, 110], HAIR = [50, 37, 30], GREY = [128, 120, 114], LIP = [168, 96, 86];
/** painted regions of the head for a unit direction (x, y, z), +z = face */
function faceMasks(x, y, z) {
  const az = Math.atan2(x, z), f = Math.abs(az) / Math.PI, n = fbm(Math.cos(az) * 3 + 5, Math.sin(az) * 3 + y * 5, 3, 3) - 0.5;
  const hl = 0.8 - 0.6 * ss(0.17, 0.45, f) - 0.72 * ss(0.5, 0.9, f) + 0.06 * Math.exp(-(((f - 0.2) / 0.07) ** 2)) + 0.05 * n;
  const hair = ss(hl - 0.015, hl + 0.025, y);
  const bl = -0.36 + 0.61 * ss(0.2, 0.46, f) + 0.04 * n;
  const lip = ss(0.1, 0.08, f) * ss(-0.57, -0.54, y) * ss(-0.31, -0.34, y);
  const tache = ss(0.14, 0.11, f) * ss(-0.2, -0.235, y) * ss(-0.38, -0.35, y);
  const beard = Math.max(ss(bl + 0.02, bl - 0.02, y) * ss(0.5, 0.455, f) * (1 - lip), tache);
  const blush = Math.exp(-(((f - 0.19) / 0.07) ** 2) - (((y + 0.13) / 0.16) ** 2));
  return { hair, beard, lip, blush, f, az };
}
function headTextures(W = 1024, H = 512) {
  const c = makeCanvas(W, H), b = makeCanvas(W, H), r = makeCanvas(W, H), cx = c.getContext('2d'), bx = b.getContext('2d'), rx = r.getContext('2d');
  const ci = cx.createImageData(W, H), bi = bx.createImageData(W, H), ri = rx.createImageData(W, H);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const th = (py + 0.5) / H * Math.PI, ph = (px + 0.5) / W * 2 * Math.PI, x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th);
    const m = faceMasks(x, y, z), o = (py * W + px) * 4;
    const pore = noise2(px / 1.6, py / 1.6, 21, Math.round(W / 1.6)), mott = fbm(Math.cos(m.az) * 4 + 1, Math.sin(m.az) * 4 + y * 6, 31, 3);
    let col = [SKIN[0] * (0.95 + 0.1 * mott), SKIN[1] * (0.93 + 0.14 * mott), SKIN[2] * (0.92 + 0.16 * mott)];
    col = col.map((v, i) => lerp(v, [222, 118, 100][i], 0.3 * m.blush));
    col = col.map((v, i) => lerp(v, LIP[i], 0.22 * m.lip));
    // hair and beard: strands that run down from the crown, salt and pepper (more grey at the temples and on the chin)
    const strand = 0.5 * noise2(Math.cos(m.az) * 46 + 9, Math.sin(m.az) * 46 + y * 5, 41) + 0.5 * noise2(Math.cos(m.az) * 110, Math.sin(m.az) * 110 + y * 9, 42);
    const temple = Math.exp(-(((m.f - 0.4) / 0.12) ** 2)) * ss(0.5, 0.0, y), gk = clamp(0.1 + 0.55 * temple + 0.5 * m.beard * ss(-0.2, -0.75, y) + 0.9 * (noise2(Math.cos(m.az) * 70 + 3, Math.sin(m.az) * 70 + y * 30, 44) - 0.62));
    const hk = Math.max(m.hair, m.beard), hc = HAIR.map((v, i) => lerp(v, GREY[i], gk) * (0.62 + 0.8 * strand));
    col = col.map((v, i) => lerp(v, hc[i], hk));
    ci.data[o] = col[0]; ci.data[o + 1] = col[1]; ci.data[o + 2] = col[2]; ci.data[o + 3] = 255;
    const bump = lerp(0.5 + 0.12 * (pore - 0.5), 0.25 + 0.75 * strand, hk) * 255; bi.data[o] = bi.data[o + 1] = bi.data[o + 2] = bump; bi.data[o + 3] = 255;
    const ro = lerp(lerp(0.52, 0.4, m.lip), 0.82, hk) * 255; ri.data[o] = ri.data[o + 1] = ri.data[o + 2] = ro; ri.data[o + 3] = 255;
  }
  cx.putImageData(ci, 0, 0); bx.putImageData(bi, 0, 0); rx.putImageData(ri, 0, 0);
  return { col: c, bump: b, rgh: r };
}
function headGeometry() {
  const w = 112, h = 80, g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), l = Math.hypot(x, y, z) || 1, dx = x / l, dy = y / l, dz = z / l, m = faceMasks(dx, dy, dz);
    let e = (0.0085 + 0.007 * Math.exp(-(((dy - 0.86) / 0.16) ** 2)) * ss(0.3, 0.05, m.f)) * m.hair + 0.0045 * m.beard;
    e += 0.003 * Math.exp(-(((dy - 0.42) / 0.09) ** 2)) * ss(0.3, 0.1, m.f);                                 // brow ridge
    e += 0.004 * Math.exp(-(((m.f - 0.18) / 0.08) ** 2) - (((dy + 0.16) / 0.16) ** 2));                     // cheeks
    e -= 0.004 * Math.exp(-(((m.f - 0.12) / 0.05) ** 2) - (((dy - 0.15) / 0.11) ** 2));                     // eye sockets
    const sx = 1 + 0.05 * ss(0.2, -0.6, dy) - 0.04 * ss(0.3, 1, dy);                                          // a little wider at the jaw than at the crown
    p.setXYZ(i, (HEAD.rx + e) * sx * dx, (HEAD.ry + e) * dy, (HEAD.rz + e) * dz);
  }
  g.computeVertexNormals();
  const nr = g.attributes.normal;   // close the seam (the first and the last column are the same points)
  for (let j = 0; j <= h; j++) { const a = j * (w + 1), b2 = a + w, n = V(nr.getX(a) + nr.getX(b2), nr.getY(a) + nr.getY(b2), nr.getZ(a) + nr.getZ(b2)).normalize(); nr.setXYZ(a, n.x, n.y, n.z); nr.setXYZ(b2, n.x, n.y, n.z); }
  return g;
}

/* ------------------------------------------------------------------ hands */
// Right hand, local frame: origin = wrist, +z = fingers, -y = palm side, +x = thumb side. The left hand is the mirror image (scale.x = -1).
const HAND = { I0: V(0.027, -0.001, 0.086), a: 0.040, b: 0.032, ri: 0.0096, M0: V(-0.0125, -0.001, 0.084), ma: 0.038, mb: 0.030, T0: V(0.034, -0.016, 0.036), t1: 0.046, t2: 0.036, rt: 0.0102 };
const GRIPS = {
  open: { i1: 0.08, i2: 0.08, m1: 0.1, m2: 0.1, th: [0.086, -0.004, 0.07] },
  relax: { i1: 0.32, i2: 0.36, m1: 0.42, m2: 0.46, th: [0.07, -0.03, 0.074] },
  cup: { i1: 0.5, i2: 0.45, m1: 0.55, m2: 0.5, th: [0.064, -0.036, 0.074] },
  pinch: { i1: 1.0, i2: 0.55, m1: 1.3, m2: 1.2, th: null },   // th = on the index pad (filled in below)
  point: { i1: 0.03, i2: 0.03, m1: 1.45, m2: 1.5, th: [0.012, -0.045, 0.07] },
  fist: { i1: 1.42, i2: 1.5, m1: 1.45, m2: 1.5, th: [0.018, -0.05, 0.072] },
  hold: { i1: 0.72, i2: 0.6, m1: 0.78, m2: 0.66, th: [0.03, -0.074, 0.066] },   // around something about 4 cm thick
};
function indexFK(i1, i2) {
  const a1 = i1, a2 = i1 + i2, d2 = V(0, -Math.sin(a2), Math.cos(a2)), pn = V(0, -Math.cos(a2), -Math.sin(a2));
  const tip = HAND.I0.clone().add(V(0, -Math.sin(a1), Math.cos(a1)).multiplyScalar(HAND.a)).addScaledVector(d2, HAND.b);
  return { tip, d2, pn };
}
{ const k = indexFK(GRIPS.pinch.i1, GRIPS.pinch.i2), t = k.tip.clone().addScaledVector(k.pn, HAND.ri + HAND.rt * 0.78).addScaledVector(k.d2, 0.002); GRIPS.pinch.th = [t.x + 0.001, t.y, t.z]; }
const gripOf = (g) => {
  if (!g) return gripOf('relax');
  if (typeof g === 'string') { const o = GRIPS[g]; if (!o) throw new Error(`host: no grip "${g}"`); return { i1: o.i1, i2: o.i2, m1: o.m1, m2: o.m2, th: V(...o.th) }; }
  if (Array.isArray(g)) return mixGrip(gripOf(g[0]), gripOf(g[1]), g[2]);
  return { i1: g.i1, i2: g.i2, m1: g.m1, m2: g.m2, th: toV(g.th).clone() };
};
const mixGrip = (a, b, k) => ({ i1: lerp(a.i1, b.i1, k), i2: lerp(a.i2, b.i2, k), m1: lerp(a.m1, b.m1, k), m2: lerp(a.m2, b.m2, k), th: a.th.clone().lerp(b.th, k) });
/** a named point of the (right) hand in its local frame for a grip */
function handPoint(grip, name) {
  const k = indexFK(grip.i1, grip.i2);
  switch (name) {
    case 'wrist': return V();
    case 'palm': return V(0, -0.0165, 0.05);
    case 'heel': return V(0, -0.015, 0.012);
    case 'edge': return V(-0.04, -0.004, 0.085);                                                   // the little-finger side
    case 'tip': return k.tip.clone().addScaledVector(k.d2, HAND.ri);                                 // the very end of the index finger
    case 'pad': return k.tip.clone().addScaledVector(k.pn, HAND.ri);
    case 'pinch': return k.tip.clone().addScaledVector(k.pn, HAND.ri * 0.8).addScaledVector(k.d2, HAND.ri * 0.75);   // between the two finger tips
    case 'grasp': return k.tip.clone().lerp(grip.th, 0.5);
    default: throw new Error(`host: no hand point "${name}"`);
  }
}
const capZ = (r, len, sx = 1) => { const g = new THREE.CapsuleGeometry(r, len, 8, 16); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); if (sx !== 1) g.scale(sx, 1, 1); return g; };
function buildHand(mat) {
  const g = new THREE.Group(), add = (geo, parent = g) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const palm = add(new THREE.SphereGeometry(1, 28, 18)); palm.scale.set(0.041, 0.0165, 0.047); palm.position.set(0, 0, 0.047);
  const heel = add(new THREE.SphereGeometry(1, 20, 14)); heel.scale.set(0.03, 0.0175, 0.03); heel.position.set(0.004, -0.003, 0.022);
  const wr = add(new THREE.CylinderGeometry(0.0235, 0.026, 0.06, 20)); wr.rotation.x = Math.PI / 2; wr.position.z = -0.012;
  const i1 = new THREE.Group(); i1.position.copy(HAND.I0); g.add(i1); add(capZ(0.0122, HAND.a), i1);
  const i2 = new THREE.Group(); i2.position.z = HAND.a; i1.add(i2); add(capZ(HAND.ri, HAND.b), i2);
  const m1 = new THREE.Group(); m1.position.copy(HAND.M0); g.add(m1); add(capZ(0.0125, HAND.ma, 2.25), m1);
  const m2 = new THREE.Group(); m2.position.z = HAND.ma; m1.add(m2); add(capZ(0.0114, HAND.mb, 2.2), m2);
  const t1 = add(capZ(0.0135, HAND.t1)), t2 = add(capZ(HAND.rt, HAND.t2));
  const tb = add(new THREE.SphereGeometry(0.0185, 18, 14)); tb.position.copy(HAND.T0).add(V(-0.006, 0.004, -0.004));   // the ball of the thumb
  g.parts = { i1, i2, m1, m2, t1, t2 };
  return g;
}
const _q = new THREE.Quaternion(), _a = V(), _b = V(), _c = V(), _m = new THREE.Matrix4();
/** elbow / knuckle of a two-bone chain from S to W (lengths l1, l2), bent toward `pole` */
function ik2(S, W, l1, l2, pole, out = V()) {
  const d = _a.copy(W).sub(S), L = d.length() || 1e-6, dist = clamp(L, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4), dir = d.multiplyScalar(1 / L);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = _b.copy(pole).addScaledVector(dir, -pole.dot(dir)); if (p.lengthSq() < 1e-8) p.set(0, -1, 0).addScaledVector(dir, dir.y); p.normalize();
  return out.copy(S).addScaledVector(dir, a).addScaledVector(p, h);
}
function poseHandGrip(hand, g) {
  const P = hand.parts;
  P.i1.rotation.x = g.i1; P.i2.rotation.x = g.i2; P.m1.rotation.x = g.m1; P.m2.rotation.x = g.m2;
  const tip = _c.copy(g.th), kn = ik2(HAND.T0, tip, HAND.t1, HAND.t2, V(0.9, 0.25, 0.35), V());
  const reach = Math.min(1, (HAND.t1 + HAND.t2 - 1e-4) / (tip.distanceTo(HAND.T0) || 1)), end = HAND.T0.clone().lerp(tip, reach);
  P.t1.position.copy(HAND.T0); P.t1.quaternion.setFromUnitVectors(Z, _a.copy(kn).sub(HAND.T0).normalize());
  P.t2.position.copy(kn); P.t2.quaternion.setFromUnitVectors(Z, _a.copy(end).sub(kn).normalize());
}

/* ------------------------------------------------------------------ the man */
/**
 * makeHost(K, {seat, sweater: [r, g, b]}) -> host
 *   .root (add to the scene), .pose(P), .hand(side, spec), .mix(a, b, k, lift), .track(side), .chan(v0), .point(side, name), .marks, .mouthAt(t), .blinkAt(t)
 */
export function makeHost(K, { seat = V(0, -0.22, -0.45), sweater = [44, 108, 116], seed = 7 } = {}) {
  const root = new THREE.Group(); root.name = 'host';
  const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const kt = knit(sweater), knitMat = new THREE.MeshPhysicalMaterial({ map: tex(kt.col, true), normalMap: tex(kt.nrm), normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.94, sheen: 0.9, sheenRoughness: 0.65, sheenColor: rgb(sweater.map((v) => Math.min(255, v * 1.7 + 30))) });
  const skinMat = soft(new THREE.MeshPhysicalMaterial({ color: rgb(SKIN), roughness: 0.52, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(1, 0.55, 0.42), clearcoat: 0.1, clearcoatRoughness: 0.45 }));
  const ht = headTextures(), headMat = soft(new THREE.MeshPhysicalMaterial({ map: tex(ht.col, true, false), bumpMap: tex(ht.bump, false, false), bumpScale: 1.4, roughnessMap: tex(ht.rgh, false, false), roughness: 1, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(1, 0.55, 0.42), clearcoat: 0.08, clearcoatRoughness: 0.5 }));
  const hairMat = new THREE.MeshPhysicalMaterial({ color: rgb(HAIR.map((v) => v * 1.25)), roughness: 0.8, sheen: 0.3, sheenColor: new THREE.Color(0.6, 0.5, 0.4) });
  const noseMat = soft(skinMat.clone()); noseMat.color.copy(rgb([208, 136, 104]));

  /* torso */
  const torso = new THREE.Group(); torso.position.copy(seat); torso.rotation.order = 'YXZ'; root.add(torso);
  const prof = [[0.11, -0.2], [0.116, 0.0], [0.12, 0.12], [0.128, 0.2], [0.138, 0.27], [0.146, 0.32], [0.141, 0.356], [0.12, 0.386], [0.084, 0.404], [0.05, 0.413], [0.0, 0.415]];
  const curve = new THREE.CatmullRomCurve3(prof.map(([r, y]) => V(r, y, 0)), false, 'centripetal'), pts = curve.getSpacedPoints(60).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y)); pts[pts.length - 1].x = 0;
  const body = shadow(new THREE.Mesh(uvScale(new THREE.LatheGeometry(pts, 72), 4, 3), knitMat)); body.scale.set(1, 1, 0.74); torso.add(body);
  const SH = { R: V(-0.15, 0.352, -0.004), L: V(0.15, 0.352, -0.004) }, L1 = 0.24, L2 = 0.235;
  const collar = shadow(new THREE.Mesh(uvScale(new THREE.TorusGeometry(0.05, 0.017, 14, 40), 2, 0.3), knitMat)); collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.408, 0.004); collar.scale.set(1, 0.92, 1); torso.add(collar);
  const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.1, 24), skinMat)); neck.position.set(0, 0.42, 0.002); torso.add(neck);

  /* head */
  const head = new THREE.Group(); head.position.set(0, 0.428, 0.008); head.rotation.order = 'YXZ'; torso.add(head);
  const skull = shadow(new THREE.Mesh(headGeometry(), headMat)); skull.position.copy(HEAD.c); head.add(skull);
  for (const s of [-1, 1]) { const ear = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skinMat)); ear.scale.set(0.011, 0.026, 0.017); ear.position.set(s * 0.1, 0.102, 0.004); ear.rotation.y = s * 0.35; head.add(ear); }
  const nose = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), noseMat)); nose.scale.set(0.0172, 0.0166, 0.0172); nose.position.set(0, 0.089, 0.1125); head.add(nose);
  const bridge = shadow(new THREE.Mesh(capZ(0.0098, 0.03), skinMat)); bridge.position.set(0, 0.126, 0.0995); bridge.rotation.x = 1.2; head.add(bridge);
  // eyes: white ball, iris and pupil caps, a painted glint; upper and lower lids are half shells that turn about the eye's x axis
  const ER = 0.0205, eyeW = new THREE.MeshPhysicalMaterial({ color: rgb([236, 231, 222]), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const irisM = new THREE.MeshPhysicalMaterial({ color: rgb([74, 45, 25]), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }), pupM = new THREE.MeshPhysicalMaterial({ color: 0x050403, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const glintM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.9) });
  const cap = (r, ang) => { const g = new THREE.SphereGeometry(r, 28, 8, 0, Math.PI * 2, 0, ang); g.rotateX(Math.PI / 2); return g; };
  const lidGeo = new THREE.SphereGeometry(ER * 1.1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Group(); e.position.set(s * 0.0365, 0.115, 0.0925); head.add(e);
    const ball = new THREE.Group(); ball.rotation.order = 'YXZ'; e.add(ball);
    ball.add(new THREE.Mesh(new THREE.SphereGeometry(ER, 28, 20), eyeW), new THREE.Mesh(cap(ER * 1.004, 0.56), irisM), new THREE.Mesh(cap(ER * 1.008, 0.3), pupM));
    const gl = new THREE.Mesh(new THREE.SphereGeometry(ER * 0.11, 10, 8), glintM); gl.position.copy(V(-0.28, 0.3, 1).normalize().multiplyScalar(ER * 1.0)); ball.add(gl);
    const up = shadow(new THREE.Mesh(lidGeo, skinMat)), lo = shadow(new THREE.Mesh(lidGeo, skinMat)); lo.scale.y = -1; e.add(up, lo);
    return { e, ball, up, lo, s };
  });
  const browGeo = new THREE.CapsuleGeometry(0.0052, 0.03, 6, 12); browGeo.rotateZ(Math.PI / 2);
  const brows = [-1, 1].map((s) => { const b = shadow(new THREE.Mesh(browGeo, hairMat)); head.add(b); b.userData.s = s; return b; });
  // mouth: a dark opening under the moustache that grows downward, a lower lip that rides on it, a strip of teeth
  const mouth = new THREE.Group(); mouth.position.set(0, 0.0585, 0.1068); mouth.rotation.x = 0.36; head.add(mouth);
  const cav = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: rgb([44, 12, 14]), roughness: 0.95 })); mouth.add(cav);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: rgb([232, 224, 208]), roughness: 0.4 })); mouth.add(teeth);
  const lipGeo = new THREE.CapsuleGeometry(0.0046, 0.026, 6, 12); lipGeo.rotateZ(Math.PI / 2);
  const lipMat = soft(skinMat.clone()); lipMat.color.copy(rgb(LIP)); lipMat.roughness = 0.4;
  const lip = shadow(new THREE.Mesh(lipGeo, lipMat)); mouth.add(lip);
  for (const s of [-1, 1]) { const m = shadow(new THREE.Mesh(capZ(0.0072, 0.03), hairMat)); m.position.set(s * 0.002, 0.0655, 0.1125); m.quaternion.setFromUnitVectors(Z, V(s * 0.92, -0.3, -0.26).normalize()); m.scale.set(1, 1.05, 1); head.add(m); }

  /* arms and hands (posed in world space) */
  const arms = {};
  for (const side of ['R', 'L']) {
    const up = shadow(new THREE.Mesh(uvScale(new THREE.CylinderGeometry(0.039, 0.047, 1, 24, 1, true), 1, 1), knitMat)), fore = shadow(new THREE.Mesh(uvScale(new THREE.CylinderGeometry(0.0335, 0.039, 1, 24, 1, true), 1, 1), knitMat));
    const sh = shadow(new THREE.Mesh(uvScale(new THREE.SphereGeometry(0.056, 24, 16), 1.5, 0.8), knitMat)), el = shadow(new THREE.Mesh(uvScale(new THREE.SphereGeometry(0.0395, 20, 14), 1, 0.6), knitMat));
    const cuff = shadow(new THREE.Mesh(uvScale(new THREE.CylinderGeometry(0.036, 0.0375, 0.03, 24), 1, 0.15), knitMat));
    const hand = buildHand(skinMat); if (side === 'L') hand.scale.x = -1;
    root.add(up, fore, sh, el, cuff, hand);
    arms[side] = { up, fore, sh, el, cuff, hand, S: V(), E: V(), W: V(), quat: new THREE.Quaternion(), grip: gripOf('relax') };
  }

  /* hand states */
  const SIDE = { R: 1, L: -1 };
  /** hand(side, {at, point = 'wrist', dir = [0,0,1], palm = [0,-1,0], grip = 'relax', roll = 0}) -> {pos, quat, grip}: the wrist that puts `point` of the hand on `at` */
  const handState = (side, spec) => {
    if (spec.pos && spec.quat) return spec;
    const grip = gripOf(spec.grip), dir = toV(spec.dir ?? [0, 0, 1]).clone().normalize(), y = toV(spec.palm ?? [0, -1, 0]).clone().negate();
    y.addScaledVector(dir, -y.dot(dir)); if (y.lengthSq() < 1e-8) y.set(0, 1, 0).addScaledVector(dir, -dir.y); y.normalize();
    const x = V().crossVectors(y, dir), quat = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(x, y, dir));
    if (spec.roll) quat.multiply(_q.setFromAxisAngle(Z, spec.roll));
    const p = handPoint(grip, spec.point ?? 'wrist'); p.x *= SIDE[side];
    return { pos: toV(spec.at).clone().sub(p.applyQuaternion(quat)), quat, grip };
  };
  const mix = (a, b, k, lift = 0) => (k <= 0 ? a : k >= 1 && !lift ? b : { pos: a.pos.clone().lerp(b.pos, k).add(V(0, lift * Math.sin(Math.PI * clamp(k)), 0)), quat: a.quat.clone().slerp(b.quat, k), grip: mixGrip(a.grip, b.grip, k) });
  /** track(side): .key(t, move, spec | (t) => spec, {lift, ease}) = "be there at t, having moved for `move` seconds"; .at(t) -> hand state */
  const track = (side) => {
    const keys = [], tr = {
      key(t, move, spec, { lift = 0, ease = K.ease.inOutQuad } = {}) { keys.push({ t, move: Math.max(1e-3, move), fn: typeof spec === 'function' ? (tt) => handState(side, spec(tt)) : ((s) => () => s)(handState(side, spec)), lift, ease }); keys.sort((a, b) => (a.t - a.move) - (b.t - b.move)); return tr; },
      at(t) { let cur = keys[0].fn(t); for (let i = 1; i < keys.length; i++) { const k = keys[i], t0 = k.t - k.move; if (t <= t0) break; cur = mix(cur, k.fn(t), k.ease(clamp((t - t0) / k.move)), k.lift); } return cur; },
      keys,
    };
    return tr;
  };
  /** chan(v0): .key(t, move, value, ease) ... .at(t): the same idea for one number (or an [x, y, z]) */
  const chan = (v0) => {
    const keys = [], ch = {
      key(t, move, v, ease = K.ease.inOutQuad) { keys.push({ t, move: Math.max(1e-3, move), v, ease }); keys.sort((a, b) => (a.t - a.move) - (b.t - b.move)); return ch; },
      at(t) { let cur = v0; for (const k of keys) { const t0 = k.t - k.move; if (t <= t0) break; const kk = k.ease(clamp((t - t0) / k.move)); cur = Array.isArray(cur) ? cur.map((c, i) => lerp(c, k.v[i], kk)) : lerp(cur, k.v, kk); } return cur; },
    };
    return ch;
  };

  /* speech: the mouth follows the word times of the score */
  const words = []; for (const l of K.score.lines ?? []) for (const w of l.words ?? []) words.push({ t0: w.t0, t1: w.t1, w: String(w.w).toLowerCase(), end: /[.,:;?!]$/.test(w.w) });
  const VIS = { a: [1, 1], e: [0.62, 1.12], i: [0.48, 1.18], o: [0.86, 0.72], u: [0.5, 0.62], y: [0.5, 1.1] };
  words.forEach((w, i) => {
    const vs = [...w.w].filter((c) => VIS[c]); w.vis = (k) => { const v = vs.length ? VIS[vs[k % vs.length]] : [0.6, 1], h = hash(i + 11, k); return k % 2 ? [v[0] * (0.25 + 0.2 * h), lerp(1, v[1], 0.5)] : [v[0] * (0.78 + 0.22 * h), v[1]]; };
    w.amp = w.t1 - w.t0 > 0.24 || w.w.length > 5 ? 1 : 0.74; w.gap = i + 1 < words.length ? words[i + 1].t0 - w.t1 : 9;
  });
  /** mouthAt(t) -> {open 0..1, wide 0.6..1.2}: open during words, closed in gaps over 0.12 s, the shape changes about 6 times a second inside a word */
  const mouthAt = (t) => {
    let open = 0, wide = 1, wsum = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]; if (w.t0 - 0.05 > t) break; if (w.t1 + 0.14 < t) continue;
      const out = w.gap < 0.12 ? Math.max(0.3, ss(w.t1 + 0.07, w.t1 - 0.01, t)) * (t < w.t1 + w.gap ? 1 : 0) : ss(w.t1 + 0.07, w.t1 - 0.01, t), env = ss(w.t0 - 0.04, w.t0 + 0.03, t) * out; if (env <= 0) continue;
      const k = Math.max(0, t - w.t0) * 6.2 + 0.5, k0 = Math.floor(k), fr = smooth(k - k0), a = w.vis(k0), b = w.vis(k0 + 1), o = lerp(a[0], b[0], fr) * w.amp * env;
      if (o > open) open = o; wide += (lerp(a[1], b[1], fr) - 1) * env; wsum += env;
    }
    return { open: clamp(open), wide: clamp(wide, 0.6, 1.22), talking: wsum > 0 };
  };
  const stress = []; for (const w of words) if ((w.t1 - w.t0 >= 0.25 || w.end) && (!stress.length || w.t0 - stress[stress.length - 1] > 0.5)) stress.push(w.t0 + 0.04);
  const nodAt = (t) => { let p = 0, yw = 0; for (let i = 0; i < stress.length; i++) { const u = (t - stress[i] + 0.07) / 0.36; if (u > 0 && u < 1) { const b = Math.sin(Math.PI * u) ** 2; p += 0.05 * b; yw += (hash(i, 3) - 0.5) * 0.07 * b; } } return [p, yw]; };
  const blinks = []; { const R = rng(seed + 70); for (let t = 1.35; t < K.duration - 0.6; t += R.range(2, 3.9)) blinks.push(t); }
  const blinkAt = (t) => { let v = 0; for (const tb of blinks) { const b = t - tb; if (b > 0 && b < 0.2) v = Math.max(v, b < 0.07 ? smooth(b / 0.07) : 1 - smooth((b - 0.07) / 0.13)); } return v; };

  /* pose */
  const marks = {}, hm = new THREE.Matrix4(), hmi = new THREE.Matrix4(), tl = V(), D = K.duration || 60, TAU = Math.PI * 2;
  const host = { root, torso, head, arms, marks, words, stress, blinks, hand: handState, mix, track, chan, mouthAt, blinkAt, GRIPS, reach: L1 + L2 };
  /**
   * pose(P): P = {t, lean (rad forward), side (rad toward +x), twist (rad, + = turns toward +x), yaw, pitch (+ = down), tilt (+ = toward +x), look (world point the eyes fix),
   *   follow (0..1: how far the head turns with the eyes), brow (-1..1), browTilt (+ = worried, - = stern), squint (0..1), lid (0..1 extra closing), mouth ({open, wide} or null = talk), still (no idle sway),
   *   R, L (hand states from hand() / track.at())}
   */
  host.pose = (P) => {
    const t = P.t ?? 0, id = P.still ? 0 : 1, w1 = TAU * t / D;
    let lean = (P.lean ?? 0) + id * 0.012 * Math.sin(w1 * 9 + 1), side = (P.side ?? 0) + id * 0.009 * Math.sin(w1 * 7 + 2), twist = (P.twist ?? 0) + id * 0.012 * Math.sin(w1 * 5);
    const R = P.R, L = P.L, nod = P.nod === false ? [0, 0] : nodAt(t);
    // lean in when a hand has to reach further than the arm is long
    for (let it = 0; it < 4; it++) {
      torso.rotation.set(lean, twist, -side); torso.updateMatrix();
      let ex = 0, tw = 0; for (const s of ['R', 'L']) { const st = s === 'R' ? R : L; if (!st) continue; const d = arms[s].S.copy(SH[s]).applyMatrix4(torso.matrix).distanceTo(st.pos) - 0.955 * (L1 + L2); if (d > ex) { ex = d; tw = s === 'R' ? 1 : -1; } }
      if (ex <= 0) break; lean += ex * 2.4; twist += tw * ex * 0.9;
    }
    torso.rotation.set(lean, twist, -side); torso.updateMatrix();
    // head: explicit angles + part of the turn toward what the eyes look at + small nods on stressed words
    let yaw = (P.yaw ?? 0) + nod[1] + id * 0.018 * Math.sin(w1 * 6 + 0.7), pitch = (P.pitch ?? 0) + nod[0] - lean * 0.55 + id * 0.012 * Math.sin(w1 * 8 + 2.2), tilt = (P.tilt ?? 0) + id * 0.014 * Math.sin(w1 * 4 + 1.3);
    head.rotation.set(pitch, yaw, -tilt); head.updateMatrix(); hm.multiplyMatrices(torso.matrix, head.matrix);
    if (P.look && (P.follow ?? 0.5) > 0) {
      hmi.copy(hm).invert(); tl.copy(P.look).applyMatrix4(hmi).sub(V(0, 0.115, 0.09));
      const fy = Math.atan2(tl.x, tl.z), fp = -Math.atan2(tl.y, Math.hypot(tl.x, tl.z)), f = P.follow ?? 0.5;
      yaw += clamp(fy, -1, 1) * f; pitch += clamp(fp, -0.7, 0.7) * f;
      head.rotation.set(pitch, yaw, -tilt); head.updateMatrix(); hm.multiplyMatrices(torso.matrix, head.matrix);
    }
    hmi.copy(hm).invert();
    const blink = Math.max(P.blink === false ? 0 : blinkAt(t), P.lid ?? 0), squint = P.squint ?? 0, brow = P.brow ?? 0, bt = P.browTilt ?? 0;
    for (const e of eyes) {
      let ey = 0, ep = 0;
      if (P.look) { tl.copy(P.look).applyMatrix4(hmi).sub(e.e.position); ey = clamp(Math.atan2(tl.x, tl.z), -0.62, 0.62); ep = clamp(-Math.atan2(tl.y, Math.hypot(tl.x, tl.z)), -0.42, 0.5); }
      e.ball.rotation.set(ep, ey, 0);
      const open = -0.9 + 0.14 * squint - 0.1 * Math.max(0, brow) + 0.55 * ep;   // rim of the upper lid: 42 degrees above the eye's axis when open
      e.up.rotation.x = lerp(open, 0.26, blink); e.lo.rotation.x = lerp(0.62 - 0.2 * squint + 0.25 * ep, 0.34, blink * 0.5);
    }
    for (const b of brows) { const s = b.userData.s; b.position.set(s * 0.0385, 0.153 + 0.011 * brow - 0.003 * squint, 0.1035 - 0.002 * brow); b.rotation.set(0, s * 0.42, s * (-0.02 - 0.3 * bt - 0.05 * Math.max(0, brow))); }
    const mo = P.mouth ?? mouthAt(t), op = clamp(mo.open), hh = 0.0011 + 0.0105 * op, hw = 0.0215 * (mo.wide ?? 1) * (0.9 + 0.1 * op);
    cav.scale.set(hw, hh, 0.0062); cav.position.set(0, -hh, 0);
    teeth.visible = op > 0.3; teeth.scale.set(hw * 1.5, Math.min(0.004, hh * 0.5), 0.003); teeth.position.set(0, -0.0006 - teeth.scale.y / 2, 0.0052);
    lip.position.set(0, -2 * hh - 0.0028, 0.0012 - 0.0035 * op); lip.scale.set(0.82 * (mo.wide ?? 1), 1, 1);
    // arms
    for (const s of ['R', 'L']) {
      const A = arms[s], st = (s === 'R' ? R : L) ?? A.last ?? handState(s, { at: [SIDE[s] * -0.16, 0, -0.3], dir: [SIDE[s] * 0.9, 0, 0.3] }), sg = s === 'R' ? -1 : 1;
      A.last = st; A.S.copy(SH[s]).applyMatrix4(torso.matrix);
      const d = _c.copy(st.pos).sub(A.S), len = d.length(), W = A.W.copy(st.pos); if (len > L1 + L2 - 1e-3) W.copy(A.S).addScaledVector(d, (L1 + L2 - 1e-3) / len);
      // elbow: out to the side and down; never under the table
      let pole = V(sg * 0.75, -0.6, -0.35); if (P.elbow?.[s]) pole = toV(P.elbow[s]);
      ik2(A.S, W, L1, L2, pole, A.E); const floor = (P.table ?? -0.029) + 0.045;
      if (A.E.y < floor + 0.03) {   // swing the elbow up around the shoulder-wrist line just as far as it takes to clear the table
        const ax = _a.copy(W).sub(A.S).normalize(), mid = V().copy(A.E).addScaledVector(ax, -_b.copy(A.E).sub(A.S).dot(ax)).sub(A.S).negate().add(A.E), p0 = V().copy(A.E).sub(mid), hgt = p0.length() || 1e-6; p0.multiplyScalar(1 / hgt);
        const q0 = V().crossVectors(ax, p0), need = (floor + 0.03 * smooth((floor + 0.03 - A.E.y) / 0.06) - mid.y) / hgt, Rr = Math.hypot(p0.y, q0.y) || 1e-6;
        if (need > p0.y) { const base = Math.atan2(q0.y, p0.y), d = need >= Rr ? 0 : Math.acos(need / Rr), f1 = base - d, f2 = base + d, phi = Math.abs(f1) < Math.abs(f2) ? f1 : f2; A.E.copy(mid).addScaledVector(p0, Math.cos(phi) * hgt).addScaledVector(q0, Math.sin(phi) * hgt); }
      }
      A.sh.position.copy(A.S); A.el.position.copy(A.E);
      A.up.position.copy(A.S).add(A.E).multiplyScalar(0.5); A.up.scale.set(1, A.S.distanceTo(A.E), 1); A.up.quaternion.setFromUnitVectors(Y, _a.copy(A.E).sub(A.S).normalize());
      A.fore.position.copy(A.E).add(W).multiplyScalar(0.5); A.fore.scale.set(1, A.E.distanceTo(W), 1); const fd = _a.copy(W).sub(A.E).normalize(); A.fore.quaternion.setFromUnitVectors(Y, fd);
      A.cuff.position.copy(W).addScaledVector(fd, -0.012); A.cuff.quaternion.copy(A.fore.quaternion);
      A.hand.position.copy(W); A.hand.quaternion.copy(st.quat); A.quat.copy(st.quat); A.grip = st.grip; poseHandGrip(A.hand, st.grip);
    }
    // world points a film frames on
    marks.eyes = V(0, 0.115, 0.11).applyMatrix4(hm); marks.mouth = V(0, 0.05, 0.112).applyMatrix4(hm); marks.chin = V(0, -0.012, 0.07).applyMatrix4(hm); marks.top = V(0, 0.215, 0.02).applyMatrix4(hm);
    marks.chest = V(0, 0.3, 0.1).applyMatrix4(torso.matrix); marks.handR = arms.R.W.clone(); marks.handL = arms.L.W.clone();
    return host;
  };
  /** world position of a named point of a hand as posed: 'pinch', 'tip', 'pad', 'palm', 'edge', 'grasp', 'wrist' */
  host.point = (side, name) => { const A = arms[side], p = handPoint(A.grip, name); p.x *= SIDE[side]; return p.applyQuaternion(A.quat).add(A.W); };
  /** world direction of a local hand axis as posed ('x' thumb side, 'y' back of the hand, 'z' fingers, 'tipdir' = where the index tip points) */
  host.axis = (side, name) => { const A = arms[side]; if (name === 'tipdir') { const k = indexFK(A.grip.i1, A.grip.i2); return k.d2.applyQuaternion(A.quat); } const v = name === 'x' ? V(SIDE[side], 0, 0) : name === 'y' ? V(0, 1, 0) : V(0, 0, 1); return v.applyQuaternion(A.quat); };
  host.pose({ t: 0, still: true });
  return host;
}

/* ------------------------------------------------------------------ the cloth bag */
/** makeBag(K, {seed}) -> Group: a small open linen sack of rice (about 10 cm wide, 8 cm tall), base centre at the origin. .mouth = local centre of the opening, .rice (the grains seen in the opening) */
export function makeBag(K, { seed = 3, grains = 150 } = {}) {
  const g = new THREE.Group(); g.name = 'bag';
  const wv = weave([186, 160, 118]), mat = new THREE.MeshPhysicalMaterial({ map: tex(wv.col, true), normalMap: tex(wv.nrm), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.92, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.9, 0.8, 0.6), side: THREE.DoubleSide });
  const prof = [[0, 0.001], [0.03, 0.0], [0.046, 0.006], [0.052, 0.024], [0.051, 0.045], [0.046, 0.064], [0.043, 0.075], [0.044, 0.082], [0.04, 0.085], [0.036, 0.08], [0.0345, 0.066]];
  const curve = new THREE.CatmullRomCurve3(prof.map(([r, y]) => V(r, y, 0)), false, 'centripetal'), pts = curve.getSpacedPoints(48).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y)); pts[0].x = 0;
  const seg = 56, geo = new THREE.LatheGeometry(pts, seg), p = geo.attributes.position, np = pts.length;
  for (let i = 0; i < p.count; i++) {   // slumps and folds
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z) || 1e-6, a = Math.atan2(z, x);
    const k = 1 + (0.09 * (fbm(Math.cos(a) * 1.6 + 3 + seed, Math.sin(a) * 1.6 + y * 22, seed, 3) - 0.5) + 0.03 * Math.sin(a * 9 + y * 60)) * ss(0.0, 0.02, y);
    p.setXYZ(i, x * k, y * (1 + 0.05 * Math.sin(a * 2 + seed)), z * k);
  }
  for (let j = 0; j < np; j++) { const a = j, b = seg * np + j; p.setXYZ(b, p.getX(a), p.getY(a), p.getZ(a)); }
  geo.computeVertexNormals();
  const nr = geo.attributes.normal; for (let j = 0; j < np; j++) { const a = j, b = seg * np + j, n = V(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize(); nr.setXYZ(a, n.x, n.y, n.z); nr.setXYZ(b, n.x, n.y, n.z); }
  uvScale(geo, 3, 1.4);
  const sack = new THREE.Mesh(geo, mat); sack.castShadow = true; sack.receiveShadow = true; g.add(sack);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.036, 32), new THREE.MeshStandardMaterial({ color: rgb([226, 218, 198]), roughness: 0.8 })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.0665; fill.receiveShadow = true; g.add(fill);
  const rice = K.kit.rice.pile(grains, V(0, 0.0665, 0), seed + 20, { radius: 0.03, slope: 0.25, detail: 'mid' }); g.add(rice);
  g.mouth = V(0, 0.083, 0); g.rice = rice; g.height = 0.085; g.radius = 0.052;
  return g;
}
