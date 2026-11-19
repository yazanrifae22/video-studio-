// test3d kit: generic props (gold coins, dark red game chips, a blank dark payment-style card). No logos, numbers or brand colours anywhere.
import * as THREE from 'three';
import { rng, makeCanvas } from './util.js';
import { goldMaterial } from './pieces.js';

const COIN = { r: 0.0135, t: 0.002 };

function coinGeometry() {
  const mm = [[0, 0.16], [6, 0.16], [11.3, 0.16], [11.75, 0.02], [12.9, 0], [13.38, 0.1], [13.5, 0.3], [13.5, 1.0], [13.5, 1.7], [13.38, 1.9], [12.9, 2.0], [11.75, 1.98], [11.3, 1.84], [6, 1.84], [0, 1.84]];
  const curve = new THREE.CatmullRomCurve3(mm.map(([r, y]) => new THREE.Vector3(r * 0.001, y * 0.001, 0)), false, 'centripetal', 0.5);
  const pts = curve.getSpacedPoints(56).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y)); pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, 72);
}
/** bump for the lathe uv: reeded edge in the middle band of v, a ring of beads and a plain circle on both faces (generic, not a real coin) */
function coinBump() {
  const w = 2048, h = 512, c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
  const y0 = h * 0.468, y1 = h * 0.532;
  for (let i = 0; i < 128; i++) { x.fillStyle = i % 2 ? '#c8c8c8' : '#3c3c3c'; x.fillRect(i * w / 128, y0, w / 128 + 1, y1 - y0); }
  for (const v of [0.4, 0.6]) { x.fillStyle = '#d2d2d2'; for (let i = 0; i < 64; i++) { x.beginPath(); x.ellipse((i + 0.5) * w / 64, h * v, w / 64 * 0.32, h * 0.012, 0, 0, 6.283); x.fill(); } }
  for (const v of [0.36, 0.64]) { x.fillStyle = '#b4b4b4'; x.fillRect(0, h * v - 2, w, 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/** coins(n, {seed}) -> Group: a neat stack of n gold coins (27 mm x 2 mm each), base centre at the origin; .height */
let coinGeo = null;
/** one coin material for many stacks (metal: 'gold' default | 'silver' cool white): coinMaterial(K) -> pass it as coins(n, {material}) */
export function coinMaterial(K, { seed = 1, metal = 'gold' } = {}) { const mat = goldMaterial(K, { roughness: metal === 'silver' ? 0.26 : 0.3, seed: seed + 9 }); mat.bumpMap = coinBump(); mat.bumpScale = 5; if (metal === 'silver') mat.color.setRGB(0.80, 0.84, 0.90); else mat.color.setRGB(1.0, 0.76, 0.36); return mat; }
export function coins(K, n = 10, { seed = 1, jitter = 0.0007, material = null } = {}) {
  const g = new THREE.Group(); g.name = 'coins';
  const R = rng(seed), geo = (coinGeo ??= coinGeometry()), mat = material ?? coinMaterial(K, { seed });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, mat); m.position.set(R.range(-jitter, jitter), i * COIN.t, R.range(-jitter, jitter)); m.rotation.y = R() * 6.283;
    m.castShadow = true; m.receiveShadow = true; m.userData.rest = m.position.clone(); g.add(m);
  }
  g.height = n * COIN.t; g.radius = COIN.r; g.thick = COIN.t; g.material = mat;
  return g;
}

const CHIP = { r: 0.015, t: 0.0033 };
/** worn clay-style game chip: plain dark red, six slightly lighter edge inserts, a pressed ring on both faces. No text, no symbols. */
const CHIP_COLORS = { red: { base: '#4e0d12', insert: '#6a2226' }, white: { base: '#d9d7d1', insert: '#cfccc4' } };
function chipTextures(seed, color = 'red') {
  const w = 1024, h = 256, c = makeCanvas(w, h), x = c.getContext('2d'), b = makeCanvas(w, h), bx = b.getContext('2d'), R = rng(seed), P = CHIP_COLORS[color] ?? CHIP_COLORS.red;
  x.fillStyle = P.base; x.fillRect(0, 0, w, h); bx.fillStyle = '#808080'; bx.fillRect(0, 0, w, h);
  // v runs along the outline: 0..0.36 bottom face (centre -> rim), 0.36..0.64 edge, 0.64..1 top face (rim -> centre)
  for (let i = 0; i < 6; i++) { x.fillStyle = P.insert; x.fillRect((i + 0.25) * w / 6, h * 0.27, w / 12, h * 0.46); }
  for (const v of [0.2, 0.8]) { bx.fillStyle = '#5a5a5a'; bx.fillRect(0, h * v - 3, w, 6); bx.fillStyle = '#9a9a9a'; bx.fillRect(0, h * v + 3, w, 3); }
  for (let i = 0; i < 2600; i++) { const g = R() > 0.5 ? 255 : 0; x.fillStyle = `rgba(${g},${g},${g},${R.range(0.015, 0.05)})`; x.fillRect(R() * w, R() * h, R.range(1, 5), R.range(1, 3)); }
  for (let i = 0; i < 900; i++) { const g = R() > 0.5 ? 150 : 100; bx.fillStyle = `rgba(${g},${g},${g},0.5)`; bx.fillRect(R() * w, R() * h, R.range(1, 4), R.range(1, 3)); }
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: mk(c, true), bump: mk(b, false) };
}
/** chips(n, {seed, like, color 'red' | 'white'}) -> Group (like = another chips() stack whose material and mesh it shares): a stack of n game chips (30 mm x 3.3 mm each; red = dark red clay, white = matte chalk white), base centre at the origin; .height. Children keep userData.rest. */
export function chips(K, n = 8, { seed = 1, jitter = 0.0009, like = null, color = 'red' } = {}) {
  const g = new THREE.Group(); g.name = 'chips';
  const R = rng(seed + 3), mm = [[0, 0], [13.9, 0], [14.6, 0.18], [15, 0.7], [15, 2.6], [14.6, 3.12], [13.9, 3.3], [0, 3.3]];
  // even v along the outline so the texture bands land where they are drawn: faces 0..0.36 / 0.64..1, edge between
  const pts = mm.map(([r, y]) => new THREE.Vector2(r * 0.001, y * 0.001)), geo = new THREE.LatheGeometry(pts, 56), uv = geo.attributes.uv, vs = [0, 0.33, 0.36, 0.4, 0.6, 0.64, 0.67, 1];
  for (let i = 0; i < uv.count; i++) uv.setY(i, vs[i % pts.length]);
  const white = color === 'white', tx = like ? null : chipTextures(seed, color);
  const mat = like?.material ?? (white
    ? new THREE.MeshPhysicalMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 1.2, roughness: 0.86, metalness: 0, sheen: 0.15, sheenRoughness: 0.8, sheenColor: new THREE.Color(0.9, 0.9, 0.9) })
    : new THREE.MeshPhysicalMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 1.2, roughness: 0.6, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.9, 0.5, 0.45) }));
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(like?.children[0]?.geometry ?? geo, mat); m.position.set(R.range(-jitter, jitter), i * CHIP.t, R.range(-jitter, jitter)); m.rotation.y = R() * 6.283;
    m.castShadow = true; m.receiveShadow = true; m.userData.rest = m.position.clone(); g.add(m);
  }
  g.height = n * CHIP.t; g.radius = CHIP.r; g.thick = CHIP.t; g.material = mat;
  return g;
}

/** card() -> Group: a generic dark card (85.6 x 54 x 0.8 mm) lying flat, with an embossed blank chip. No logo, no numbers. */
export function card(K, { seed = 1 } = {}) {
  const g = new THREE.Group(); g.name = 'card';
  const rr = (w, h, r) => { const s = new THREE.Shape(), x = w / 2, y = h / 2; s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y); return s; };
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.42, metalness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.22 });
  const bg = new THREE.ExtrudeGeometry(rr(0.0856 - 0.0003, 0.054 - 0.0003, 0.0031), { depth: 0.0005, bevelEnabled: true, bevelSize: 0.00015, bevelThickness: 0.00015, bevelSegments: 3, curveSegments: 10 });
  const body = new THREE.Mesh(bg, bodyMat); body.rotation.x = -Math.PI / 2; body.position.y = 0.00015; g.add(body);
  // chip: contact-pad lines only
  const cw = 0.0118, ch = 0.0092, c = makeCanvas(256, 200), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 200); x.strokeStyle = '#4a3512'; x.lineWidth = 5; x.lineCap = 'round';
  x.strokeRect(92, 62, 72, 76); for (const yy of [62, 100, 138]) { x.beginPath(); x.moveTo(0, yy); x.lineTo(92, yy); x.moveTo(164, yy); x.lineTo(256, yy); x.stroke(); } x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 62); x.moveTo(128, 138); x.lineTo(128, 200); x.stroke();
  const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace; ct.repeat.set(1 / cw, 1 / ch); ct.offset.set(0.5, 0.5); ct.anisotropy = 8;
  const chipMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.36, map: ct }); chipMat.color.setRGB(1.0, 0.78, 0.4);
  const cg = new THREE.ExtrudeGeometry(rr(cw, ch, 0.0012), { depth: 0.00008, bevelEnabled: true, bevelSize: 0.00006, bevelThickness: 0.00006, bevelSegments: 2, curveSegments: 8 });
  const chip = new THREE.Mesh(cg, chipMat); chip.rotation.x = -Math.PI / 2; chip.position.set(-0.0225, 0.0008, -0.002); g.add(chip);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.height = 0.00094; g.size = [0.0856, 0.054];
  return g;
}
