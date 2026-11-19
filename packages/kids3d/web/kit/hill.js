// Sunny Hill: the series set (opening + ending of every episode) and generic topic tokens (an animal, a coloured ball, an apple,
// a shape, a big+small pair, a word slab). Used by web/series/sunny-hill.js; episodes may use sunnyHill()/token() too.
import * as THREE from 'three';
import { ball, cyl, cone, rbox, mat, mesh, Prop } from './core.js';
import { skyAndLight } from './sets.js';
import { hash, noise1, clamp, EASE, spring } from './anim.js';
import { FONT } from './fx.js';

export const HILL = { c: [0, 0, -6.5], rx: 11, ry: 3.3, rz: 6.5 };   // main dome; its crest is at (0, 3.3, -6.5)

/** height of the main hill at (x, z) (0 outside) */
export function hillY(x, z) {
  const dx = (x - HILL.c[0]) / HILL.rx, dz = (z - HILL.c[2]) / HILL.rz, r = 1 - dx * dx - dz * dz;
  return r > 0 ? HILL.ry * Math.sqrt(r) : 0;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function rr(x, a, b, w, h, r) { r = Math.min(r, h / 2, w / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

/** The set: sky + light rig, meadow, the big hill (rises with `rise(t)`), back hills, lollipop trees, flowers, drifting clouds. */
export function sunnyHill(K) {
  const { scene } = K;
  skyAndLight(K);
  // meadow
  const g = new THREE.PlaneGeometry(240, 240, 120, 120); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = [], c1 = new THREE.Color('#7FD064'), c2 = new THREE.Color('#62BA52'), c3 = new THREE.Color('#A4DD72');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), far = clamp((Math.hypot(x, z) - 26) / 30);
    pos.setY(i, far * (2.5 + Math.sin(x * 0.06) * 2.2 + Math.cos(z * 0.05) * 2.0));
    const n = 0.5 + 0.5 * noise1(x * 0.16 + z * 0.09, 3); const c = c1.clone().lerp(c2, n * 0.6).lerp(c3, clamp(noise1(z * 0.1 - x * 0.07, 6) * 0.8)); col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); ground.receiveShadow = true; scene.add(ground);
  // the hill (a smooth dome with a light path spiralling up) -> Prop so it can rise in the opening
  const hg = new THREE.SphereGeometry(1, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2), hp = hg.attributes.position, hc = [];
  const h1 = new THREE.Color('#8ED96B'), h2 = new THREE.Color('#6CC456'), path = new THREE.Color('#F1D9A6');
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i), a = Math.atan2(x, z), onPath = Math.abs(Math.sin(a * 1 - y * 5.2)) < 0.09 && y < 0.93 && z > -0.2;
    const c = onPath ? path : h1.clone().lerp(h2, 0.5 + 0.5 * noise1(a * 3 + y * 4, 2)); hc.push(c.r, c.g, c.b);
  }
  hg.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
  const hillMesh = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 })); hillMesh.receiveShadow = true; hillMesh.castShadow = false;
  hillMesh.scale.set(HILL.rx, HILL.ry, HILL.rz);
  const hillG = new THREE.Group(); hillG.add(hillMesh); hillG.position.set(...HILL.c); scene.add(hillG);
  // flowers on the hill
  const fl = new THREE.Group(); hillG.add(fl);
  for (let i = 0; i < 70; i++) {
    const a = hash(i * 1.3) * Math.PI * 2, r = 0.25 + hash(i * 2.9) * 0.7, x = Math.sin(a) * r * HILL.rx, z = Math.cos(a) * r * HILL.rz;
    if (z < -1) continue;
    const y = hillY(x + HILL.c[0], z + HILL.c[2]); const f = ball(['#FFFFFF', '#FFD23F', '#FF9EB5', '#FF7A45'][i % 4], 0.11, [x, y + 0.06, z], 'matte', [1, 0.6, 1], 12); f.castShadow = false; fl.add(f);
  }
  const hill = new Prop(hillG, {}); K.props.push(hill);
  const risers = [];
  /** the hill (and anything on it) rises out of the meadow at t (spring, ~0.35 s) */
  hill.rise = (t) => { risers.push(t); return hill; };
  hill.each((t, o) => { let k = 1; for (const t0 of risers) k = Math.min(k, t < t0 ? 0.04 : 0.04 + 0.96 * spring(t - t0, { freq: 1.5, damp: 0.5 })); o.scale.set(1, Math.max(0.04, k), 1); });
  // back hills
  [[-26, -34, 16, 6, '#74C75C'], [22, -38, 18, 7, '#6BBF57'], [0, -52, 26, 9, '#82CE67'], [-48, -28, 14, 5, '#7CCB62'], [46, -26, 14, 5, '#86D06A']].forEach(([x, z, r, h, c]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat(c, 'matte', { roughness: 0.95 })); m.scale.set(r, h, r * 0.7); m.position.set(x, 0, z); m.receiveShadow = true; scene.add(m);
  });
  // lollipop trees
  const tree = (x, z, s = 1, c = '#4DAE4F') => { const t = new THREE.Group(); t.position.set(x, 0, z); t.add(cyl('#8A5A3A', 0.18 * s, 0.24 * s, 1.8 * s, [0, 0.9 * s, 0], 'wood')); t.add(ball(c, 1.05 * s, [0, 2.5 * s, 0], 'fur', [1, 1, 1], 32)); t.add(ball(c, 0.7 * s, [0.6 * s, 2.1 * s, 0.3 * s], 'fur', [1, 1, 1], 24)); scene.add(t); K.solids.push({ name: 'tree', x, z, r: 0.3 * s }); return t; };
  tree(-13.5, -4, 1.2); tree(13, -3, 1.1, '#5BBE55'); tree(-18, -12, 1.4, '#5BBE55'); tree(17, -13, 1.5); tree(-9, -16, 1.0); tree(9.5, -17, 1.1, '#5BBE55');
  // meadow flowers (instanced)
  const fg = new THREE.SphereGeometry(0.09, 10, 8), fm = new THREE.MeshStandardMaterial({ roughness: 0.6 }), inst = new THREE.InstancedMesh(fg, fm, 260), m4 = new THREE.Matrix4(), cc = new THREE.Color();
  for (let i = 0; i < 260; i++) {
    let x = (hash(i * 3.1) - 0.5) * 44, z = (hash(i * 7.7) - 0.5) * 26 + 2; if (Math.abs(x) < 7 && z > -2 && z < 6) x += Math.sign(x || 1) * 7;   // keep the stage clear
    m4.makeScale(1, 0.6, 1).setPosition(x, 0.05, z); inst.setMatrixAt(i, m4); inst.setColorAt(i, cc.set(['#FFFFFF', '#FFD23F', '#FF9EB5', '#C79BFF'][i % 4]));
  }
  inst.castShadow = false; scene.add(inst);
  // clouds (drift)
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group(); [[0, 0, 0, 2.2], [1.9, -0.3, 0.2, 1.6], [-1.9, -0.4, 0, 1.5], [0.8, 0.9, -0.2, 1.4]].forEach(([a, b, d, r]) => { const m = ball('#FFFFFF', r, [a, b, d], 'matte', [1, 0.8, 0.8], 24); m.castShadow = false; m.material = new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFFFFF', emissiveIntensity: 0.25, roughness: 1, fog: false }); c.add(m); });
    c.position.set(-60 + i * 21, 20 + hash(i) * 9, -70 - hash(i * 3) * 30); c.scale.setScalar(1.2 + hash(i * 5)); scene.add(c); clouds.push(c);
  }
  K.onFrame.push((t) => clouds.forEach((c, i) => { c.position.x = -70 + ((i * 21 + t * (0.6 + hash(i) * 0.4)) % 140); }));
  return { hill, crest: [HILL.c[0], HILL.ry, HILL.c[2]], hillY };
}

/** The 3D title sign "Sunny Hill" (+ "with Tiko & Pip") on two posts: a thick rounded board with lit faces. Returns a Prop. */
export function titleSign(K, { at = [0, 0, 0], w = 6.4, h = 2.3, title = 'Sunny Hill', sub = 'with Tiko & Pip', postH = 2.0 } = {}) {
  const G = new THREE.Group(), PH = postH;
  const posts = [-1, 1].map((s) => cyl('#9A6A43', 0.11, 0.13, PH + 0.6, [s * w * 0.36, (PH + 0.6) / 2 - 0.6, -0.12], 'wood')); G.add(...posts);
  const board = rbox('#FFFFFF', [w, h, 0.32], [0, PH + h / 2, 0], 'matte', [0, 0, 0], 0.14); G.add(board);
  const rim = rbox('#FF7A45', [w + 0.2, h + 0.2, 0.22], [0, PH + h / 2, -0.08], 'gloss', [0, 0, 0], 0.16); G.add(rim);
  const tex = canvasTex(1600, Math.round(1600 * h / w), (x, W, H) => {
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    // sun icon
    const sx = W * 0.5, sy = H * 0.2;
    x.fillStyle = '#FFC93C'; for (let i = 0; i < 12; i++) { x.save(); x.translate(sx, sy); x.rotate(i * Math.PI / 6); rr(x, -9, -78, 18, 30, 9); x.fill(); x.restore(); }
    x.beginPath(); x.arc(sx, sy, 44, 0, Math.PI * 2); x.fill();
    x.font = `800 ${Math.round(H * 0.4)}px ${FONT}`; x.lineWidth = 26; x.strokeStyle = '#FFE3D3'; x.strokeText(title, W / 2, H * 0.55); x.fillStyle = '#24305E'; x.fillText(title, W / 2, H * 0.55);
    x.font = `800 ${Math.round(H * 0.17)}px ${FONT}`; x.fillStyle = '#FF7A45'; x.fillText(sub, W / 2, H * 0.84);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
  face.position.set(0, PH + h / 2, 0.17); G.add(face);
  G.position.set(...at); K.scene.add(G);
  const p = new Prop(G, { visible: false }); p.label = 'title sign'; K.props.push(p);
  p.top = [at[0], at[1] + PH + h, at[2]]; p.dims = [w, h];
  p.corners = [[at[0] - w / 2, at[1] + PH, at[2]], [at[0] + w / 2, at[1] + PH + h, at[2]], [at[0] - w / 2, at[1] + PH + h, at[2]], [at[0] + w / 2, at[1] + PH, at[2]]];
  return p;
}

/** A pill badge slab ("Ep 1 · Animal Sounds"): orange 3D pill with white text. Returns a Prop (place it with .place/.moveTo). */
export function pillBadge(K, text, { at = [0, 0, 0], height = 0.8, color = '#FF7A45', fg = '#FFFFFF', maxWidth = 0 } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = `800 150px ${FONT}`;
  const tw = Math.ceil(x.measureText(text).width) + 200; c.width = tw; c.height = 230;
  const x2 = c.getContext('2d'); x2.font = `800 150px ${FONT}`; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillStyle = fg; x2.fillText(text, tw / 2, 124);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (maxWidth > 0 && height * tw / 230 > maxWidth) height = maxWidth * 230 / tw;   // shrink-to-fit: a long topic gets a smaller pill, never a wider one
  const w = height * tw / 230, G = new THREE.Group();
  G.add(rbox(color, [w, height, 0.24], [0, 0, 0], 'gloss', [0, 0, 0], Math.min(0.38, height * 0.48)));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); face.position.z = 0.135; G.add(face);
  G.position.set(...at); K.scene.add(G);
  const p = new Prop(G, { visible: false }); p.label = `badge "${text}"`; p.width = w; p.height = height; K.props.push(p);
  return p;
}

/* ------------------------------------------------------------------ tokens */
function shapeGeo(kind, s = 1) {
  const sh = new THREE.Shape();
  if (kind === 'circle') sh.absarc(0, 0, 0.5 * s, 0, Math.PI * 2, false);
  else if (kind === 'oval') sh.absellipse(0, 0, 0.62 * s, 0.42 * s, 0, Math.PI * 2, false);
  else if (kind === 'square' || kind === 'rectangle') { const w = (kind === 'square' ? 0.9 : 1.25) * s, h = 0.9 * s * (kind === 'square' ? 1 : 0.7), r = 0.08 * s; sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); }
  else if (kind === 'triangle') { sh.moveTo(0, 0.56 * s); sh.lineTo(0.56 * s, -0.44 * s); sh.lineTo(-0.56 * s, -0.44 * s); sh.closePath(); }
  else if (kind === 'diamond') { sh.moveTo(0, 0.6 * s); sh.lineTo(0.42 * s, 0); sh.lineTo(0, -0.6 * s); sh.lineTo(-0.42 * s, 0); sh.closePath(); }
  else if (kind === 'star') { for (let i = 0; i < 10; i++) { const r = (i % 2 ? 0.24 : 0.56) * s, a = Math.PI / 2 + i * Math.PI / 5; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } sh.closePath(); }
  else if (kind === 'heart') { const k = s * 0.52; sh.moveTo(0, -0.55 * k * 1.6); sh.bezierCurveTo(0.9 * k, 0.05 * k, 0.75 * k, 1.05 * k, 0, 0.52 * k); sh.bezierCurveTo(-0.75 * k, 1.05 * k, -0.9 * k, 0.05 * k, 0, -0.55 * k * 1.6); }
  else sh.absarc(0, 0, 0.5 * s, 0, Math.PI * 2, false);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16 * s, bevelEnabled: true, bevelThickness: 0.07 * s, bevelSize: 0.06 * s, bevelSegments: 5, curveSegments: 24 });
  g.center(); g.computeVertexNormals(); return g;
}

/**
 * token(K, spec, name, {pos, yaw, scale}) -> {obj (Actor|Prop), h (height), show(t), hide(t), hop(t), at(t)}; starts hidden.
 * spec: {actor} | {ball:'#hex'} | {apple:true} | {shape, color} | {pair:<spec>} | {text, color}
 */
/** World width of a token's footprint (before `scale`): text slabs grow with their text, pairs are two objects, actors ~1.4 m. */
export function tokenWidth(spec, scale = 1) {
  const s = (spec.scale ?? 1) * scale;
  if (spec.actor) return 1.4 * s;
  if (spec.text) { const x = document.createElement('canvas').getContext('2d'); x.font = `800 160px ${FONT}`; return (0.9 * (Math.ceil(x.measureText(spec.text).width) + 120) / 230 + 0.2) * s; }
  if (spec.pair) return 2.0 * s;
  return (spec.shape ? 1.2 : 1.0) * s;
}

export function token(K, spec, name, { pos = [0, 0, 0], yaw = 0, scale = 1 } = {}) {
  const s = (spec.scale ?? 1) * scale;
  if (spec.actor) {
    const a = K.actor(name, spec.actor, { pos, yaw, visible: false, scale: s });
    const h = ({ cow: 1.75, horse: 2.1, sheep: 1.45, pig: 1.2, duck: 1.0, hen: 1.05, tiko: 1.75, pip: 1.0 }[spec.actor] ?? 1.4) * s;
    return { obj: a, h, show: (t) => a.show(t), hide: (t) => a.hide(t), hop: (t) => a.hop(t, 0.3), spec };
  }
  const G = new THREE.Group(), inner = new THREE.Group(); G.add(inner);
  let h = 1;
  if (spec.ball) { inner.add(ball(spec.ball, 0.48, [0, 0.48, 0], 'gloss', [1, 1, 1], 48)); h = 0.96; }
  else if (spec.apple) {
    inner.add(ball('#E5383B', 0.42, [0, 0.4, 0], 'gloss', [1.06, 0.95, 1.06], 48));
    inner.add(cyl('#7A4E2D', 0.035, 0.045, 0.24, [0, 0.86, 0], 'wood', [0, 0, 0.15]));
    const leaf = ball('#4DAE4F', 0.13, [0.14, 0.88, 0], 'fur', [1.4, 0.35, 0.7], 16); leaf.rotation.z = -0.5; inner.add(leaf); h = 0.98;
  } else if (spec.shape) {
    const m = mesh(shapeGeo(spec.shape, 1.1), mat(spec.color ?? '#FF7A45', 'gloss')); m.position.y = 0.95; inner.add(m);
    inner.add(cyl('#FFFFFF', 0.05, 0.05, 0.4, [0, 0.2, 0], 'matte')); inner.add(cyl('#FFFFFF', 0.28, 0.32, 0.08, [0, 0.04, 0], 'matte')); h = 1.6;
  } else if (spec.pair) {
    const big = token(K, spec.pair, `${name}_big`, { pos: [0, 0, 0], scale: 1.35 }), small = token(K, spec.pair, `${name}_small`, { pos: [0, 0, 0], scale: 0.6 });
    // pairs are props only (balls/apples/shapes); re-parent them into this group
    for (const [tk, x, k] of [[big, -0.62, 1.35], [small, 0.55, 0.6]]) { K.props.splice(K.props.indexOf(tk.obj), 1); tk.obj.obj.visible = true; tk.obj.obj.position.set(x, 0, 0); tk.obj.obj.scale.setScalar(k); inner.add(tk.obj.obj); }
    h = big.h;
  } else {
    const text = spec.text ?? '?', c = document.createElement('canvas'), x = c.getContext('2d'); x.font = `800 160px ${FONT}`;
    const tw = Math.ceil(x.measureText(text).width) + 120; c.width = tw; c.height = 230;
    const x2 = c.getContext('2d'); x2.font = `800 160px ${FONT}`; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.lineJoin = 'round'; x2.lineWidth = 22; x2.strokeStyle = '#24305E'; x2.strokeText(text, tw / 2, 122); x2.fillStyle = '#FFFFFF'; x2.fillText(text, tw / 2, 122);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const w = 0.9 * tw / 230;
    inner.add(rbox(spec.color ?? '#FF7A45', [w + 0.2, 1.1, 0.3], [0, 0.95, 0], 'gloss', [0, 0, 0], 0.3));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); f.position.set(0, 0.95, 0.16); inner.add(f); h = 1.5;
  }
  G.position.set(...pos); G.rotation.y = yaw; G.scale.setScalar(s); K.scene.add(G);
  const p = new Prop(G, { visible: false, rot: [0, yaw, 0], scale: s }); p.label = name; K.props.push(p);
  // shapes and slabs sway gently so they read as 3D
  if (spec.shape || spec.text) p.each((t, o) => { inner.rotation.y = Math.sin(t * 1.3 + hash(name.length)) * 0.35; });
  return { obj: p, h: h * s, show: (t) => p.show(t), hide: (t) => p.hide(t), hop: (t) => p.bounce(t, 0.45, 0.35), spec };
}

/** Thumbnail / tile placeholder art for an episode without a thumbnail yet (2D canvas, 16:9). */
export function tileArt(w, h, topic) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5CB8F5'); gr.addColorStop(0.7, '#CDEEFF'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  x.fillStyle = '#7FD064'; x.beginPath(); x.ellipse(w * 0.5, h * 1.05, w * 0.75, h * 0.5, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#FFC93C'; x.beginPath(); x.arc(w * 0.82, h * 0.22, h * 0.11, 0, Math.PI * 2); x.fill();
  let fs = Math.round(h * 0.3); x.font = `800 ${fs}px ${FONT}`; while (fs > h * 0.2 && x.measureText(topic).width > w * 0.9) { fs -= 2; x.font = `800 ${fs}px ${FONT}`; }   // 2026-11-08: bigger (readable at 360 px), shrunk to fit
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = h * 0.035; x.strokeStyle = '#24305E'; x.strokeText(topic, w / 2, h * 0.5); x.fillStyle = '#FFFFFF'; x.fillText(topic, w / 2, h * 0.5);
  return c;
}
export { rr as roundRectPath };
