// Shared 3D kit core: materials, shape helpers, Actor (timed, pure-function-of-time animation), Prop, Camera rig.
import * as THREE from 'three';
import { Track, EASE, ease, spring, bump, clamp, lerp, hash, noise1 } from './anim.js';

/* ------------------------------------------------------------------ materials */
const matCache = new Map();
/** Soft toy material. kind: 'fur' (sheen), 'gloss' (clearcoat, eyes/nose), 'matte', 'wood', 'glow' */
export function mat(color, kind = 'fur', extra = {}) {
  const key = `${color}|${kind}|${JSON.stringify(extra)}`;
  if (matCache.has(key)) return matCache.get(key);
  const c = new THREE.Color(color);
  let m;
  if (kind === 'gloss') m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });
  else if (kind === 'fur') m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, sheen: 0.6, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.45), ...extra });
  else if (kind === 'glow') m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.5, ...extra });
  else if (kind === 'wood') m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
  else m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra });
  matCache.set(key, m);
  return m;
}

/* ------------------------------------------------------------------ geometry helpers */
const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
export const sphereGeo = (seg = 40) => G(`s${seg}`, () => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)));
export function mesh(geo, material, { pos = [0, 0, 0], scale = 1, rot = [0, 0, 0], shadow = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos); if (Array.isArray(scale)) m.scale.set(...scale); else m.scale.setScalar(scale);
  m.rotation.set(...rot); m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export const ball = (color, r, pos, kind = 'fur', scale = [1, 1, 1], seg = 40) => mesh(sphereGeo(seg), mat(color, kind), { pos, scale: scale.map((s) => s * r) });
export const box = (color, size, pos, kind = 'matte', rot = [0, 0, 0]) => mesh(G(`b`, () => new THREE.BoxGeometry(1, 1, 1)), mat(color, kind), { pos, scale: size, rot });
export const rbox = (color, size, pos, kind = 'matte', rot = [0, 0, 0], radius = 0.08) => {
  const g = G(`rb${size.join(',')}|${radius}`, () => roundedBox(size[0], size[1], size[2], radius));
  return mesh(g, mat(color, kind), { pos, rot });
};
export const cyl = (color, rTop, rBot, h, pos, kind = 'matte', rot = [0, 0, 0], seg = 28) => mesh(G(`c${rTop},${rBot},${h},${seg}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg)), mat(color, kind), { pos, rot });
export const cone = (color, r, h, pos, kind = 'fur', rot = [0, 0, 0], seg = 28) => mesh(G(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), mat(color, kind), { pos, rot });
export const capsule = (color, r, len, pos, kind = 'fur', rot = [0, 0, 0]) => mesh(G(`p${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 8, 24)), mat(color, kind), { pos, rot });
export const torus = (color, R, r, arc, pos, kind = 'matte', rot = [0, 0, 0]) => mesh(G(`t${R},${r},${arc}`, () => new THREE.TorusGeometry(R, r, 12, 32, arc)), mat(color, kind), { pos, rot });

function roundedBox(w, h, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r * 0.6, bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.6, bevelSegments: 4, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * r * 0.6) / 2); g.computeVertexNormals();
  return g;
}

/** point on an ellipsoid-ish sphere surface: lat/lon in degrees, lon 0 = +z (front) */
export function onSphere(R, lat, lon, c = [0, 0, 0], sc = [1, 1, 1]) {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  return [c[0] + R * sc[0] * Math.cos(la) * Math.sin(lo), c[1] + R * sc[1] * Math.sin(la), c[2] + R * sc[2] * Math.cos(la) * Math.cos(lo)];
}
export const group = (...children) => { const g = new THREE.Group(); children.forEach((c) => c && g.add(c)); return g; };
export const pivot = (pos = [0, 0, 0], ...children) => { const g = group(...children); g.position.set(...pos); return g; };

/* ------------------------------------------------------------------ face kit */
/** Cartoon eye: glossy iris + highlight + lid (skin coloured) that closes over it. Returns {g, lid, setBlink(b), setLook(x,y), setWide(k)} */
export function eye(r, { iris = '#24305E', skin = '#FF7A45', sclera = null } = {}) {
  const g = new THREE.Group();
  const parts = new THREE.Group(); g.add(parts);
  if (sclera) parts.add(ball(sclera, r, [0, 0, 0], 'gloss', [1, 1.1, 0.7]));
  const ir = ball(iris, sclera ? r * 0.62 : r, [0, 0, sclera ? r * 0.38 : 0], 'gloss', [1, 1.18, 0.6], 32);
  parts.add(ir);
  const hl = ball('#ffffff', r * 0.28, [r * 0.32, r * 0.42, r * 0.62], 'glow', [1, 1, 0.5], 16); hl.castShadow = false;
  hl.material = mat('#ffffff', 'matte', { emissive: '#ffffff', emissiveIntensity: 0.9 });
  parts.add(hl);
  const lidGeo = new THREE.SphereGeometry(r * 1.32, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const lid = new THREE.Mesh(lidGeo, mat(skin, 'fur')); lid.castShadow = false;
  lid.scale.set(1, 1.18, 0.75);
  g.add(lid);
  const api = {
    g, lid, iris: ir, parts,
    setBlink(b) { lid.rotation.x = lerp(-1.45, 1.55, clamp(b)); lid.visible = b > 0.02; },
    setLook(x, y) { parts.position.set(x * r * 0.18, y * r * 0.18, 0); },
    setWide(k) { parts.scale.setScalar(k); },
    /** sad brow (mood 'sad'): k 0..1, side -1 = the figure's left eye (x < 0) / +1 = right; the inner end tilts up and the brow sits a little lower */
    setBrow(k, side) { k = clamp(k); brow.visible = k > 0.02; if (!brow.visible) return; brow.rotation.z = -side * 0.5 * k; brow.position.set(0, r * (1.62 - 0.12 * k), r * 0.3); },
  };
  const brow = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.17, r * 0.95, 4, 10), mat('#3A2A33', 'matte')); brow.rotation.order = 'XYZ'; brow.castShadow = false;
  const browHolder = new THREE.Group(); browHolder.add(brow); g.add(browHolder); brow.visible = false;
  brow.geometry.rotateZ(Math.PI / 2);
  api.setBlink(0);
  return api;
}
/** Smile arc + open mouth (dark oval + tongue). setOpen(0..1), setSmile(k) */
export function mouth(w, { color = '#5B1F1F', tongue = '#FF8A8A', line = '#3A1A1A' } = {}) {
  const g = new THREE.Group();
  const smile = torus(line, w, w * 0.12, Math.PI, [0, 0, 0], 'matte', [0, 0, Math.PI]); smile.castShadow = false; g.add(smile);
  const open = new THREE.Group(); g.add(open);
  const hole = ball(color, w, [0, -w * 0.25, 0], 'matte', [1, 0.8, 0.35], 24); hole.castShadow = false; open.add(hole);
  const tg = ball(tongue, w * 0.55, [0, -w * 0.62, w * 0.08], 'matte', [1, 0.45, 0.3], 16); tg.castShadow = false; open.add(tg);
  let frown = 0, o0 = 0;
  const apply = () => { const s = (1 - o0 * 0.6) * (1 - 0.45 * frown); smile.scale.setScalar(s); smile.rotation.z = Math.PI * (1 - frown); smile.position.y = -w * 0.75 * frown; };
  const api = {
    g, setOpen(o) { o = clamp(o); o0 = o; open.visible = o > 0.04; open.scale.set(0.75 + o * 0.35, Math.max(0.05, o), 1); smile.visible = o < 0.35; apply(); },
    setSmile(k) { smile.scale.y = k; },
    /** small gentle frown (mood 'sad'): the smile arc flips upside down, shorter, a little lower. k 0..1 */
    setFrown(k) { frown = clamp(k); apply(); },
  };
  api.setOpen(0);
  return api;
}

/* ------------------------------------------------------------------ Actor */
/**
 * An actor wraps a rig ({root, body, eyes[], mouth, armL, armR, wingL, wingR, legs[], tail, head, ears[]}) and holds
 * keyframe tracks + timed actions. seek(t) recomputes everything from t only.
 */
export class Actor {
  constructor(name, rig, opts = {}) {
    this.name = name; this.rig = rig; this.root = rig.root;
    const p = opts.pos ?? [0, 0, 0];
    this.pos = new Track([...p]); this.yaw = new Track(opts.yaw ?? 0); this.size = new Track(opts.visible === false ? 0 : 1);
    this.moodT = new Track(opts.mood ?? 'happy'); this.eyeLook = new Track([0, 0]);
    this.actions = []; this.talks = []; this.seed = opts.seed ?? (name.length * 7.3 + 1);
    this.baseScale = opts.scale ?? 1; this.gait = opts.gait ?? 'hop'; this.flying = new Track(0);
    this.mem = { pos: [...p], yaw: opts.yaw ?? 0 };
  }
  /* ---- placement */
  place(t, pos, yaw) { this.pos.set(t, pos); if (yaw != null) this.yaw.set(t, yaw); return this; }
  moveTo(t, dur, pos, { e = 'inOutSine', face = true, faceBack = null } = {}) {
    const from = this.pos.at(t);
    if (face) { const dx = pos[0] - from[0], dz = pos[2] - from[2]; if (Math.hypot(dx, dz) > 0.05) this.turn(t, Math.min(0.35, dur * 0.3), Math.atan2(dx, dz)); }
    this.pos.to(t, dur, pos, e);
    if (faceBack != null) this.turn(t + dur - 0.05, 0.4, faceBack);
    return this;
  }
  turn(t, dur, yaw) {
    // shortest way round
    let cur = this.yaw.at(t); let d = yaw - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    this.yaw.to(t, dur, cur + d, 'inOutSine'); return this;
  }
  faceTo(t, dur, target) { const p = this.pos.at(t); return this.turn(t, dur, Math.atan2(target[0] - p[0], target[2] - p[2])); }
  show(t, { dur = 0.6 } = {}) { this.actions.push({ k: 'pop', t, dur }); this.size.set(t, 1); return this; }
  hide(t, { dur = 0.35 } = {}) { this.actions.push({ k: 'unpop', t, dur }); this.size.set(t + dur, 0); return this; }
  /** park: invisible and far away (under the ground, off every shot) from t; use for answer animals before their reveal */
  park(t) { this.size.set(t, 0); this.pos.set(t, [0, -60, 300]); return this; }
  /** unpark: appear at pos at t (instantly, e.g. hidden behind a prop; pop:true springs it in) */
  unpark(t, pos, yaw, { pop = false } = {}) { this.pos.set(t, pos); if (yaw != null) this.yaw.set(t, yaw); this.size.set(t, 1); if (pop) this.actions.push({ k: 'pop', t, dur: 0.6 }); return this; }
  mood(t, m) { this.moodT.set(t, m); return this; }
  lookEyes(t, dur, xy) { this.eyeLook.to(t, dur, xy, 'inOutSine'); return this; }
  fly(t, dur, h) { this.flying.to(t, dur, h, 'inOutSine'); return this; }
  /* ---- gestures (all additive, pure functions of t) */
  act(k, t, dur, extra = {}) { this.actions.push({ k, t, dur, ...extra }); return this; }
  jump(t, h = 0.7, dur = 0.62) { return this.act('jump', t, dur, { h }); }
  hop(t, h = 0.25, dur = 0.34) { return this.act('jump', t, dur, { h }); }
  hops(t, n = 3, gap = 0.4, h = 0.3) { for (let i = 0; i < n; i++) this.hop(t + i * gap, h, Math.min(0.36, gap * 0.9)); return this; }
  wave(t, dur = 1.4, side = 'R') { return this.act('wave', t, dur, { side }); }
  cheer(t, dur = 1.2) { this.act('cheer', t, dur); return this.jump(t + 0.05, 0.55, 0.6); }
  look(t, dur, yaw = 0.5, pitch = 0) { return this.act('look', t, dur, { yaw, pitch }); }
  nod(t, dur = 0.5, n = 2) { return this.act('nod', t, dur, { n }); }
  tilt(t, dur = 1.2, a = 0.25) { return this.act('tilt', t, dur, { a }); }
  wiggle(t, dur = 0.8, a = 0.12) { return this.act('wiggle', t, dur, { a }); }
  spin(t, dur = 0.9) { return this.act('spin', t, dur); }
  squash(t, dur = 0.4) { return this.act('squash', t, dur); }
  flap(t, dur = 1.0, rate = 7) { return this.act('flap', t, dur, { rate }); }
  clap(t, dur = 1.2) { return this.act('clap', t, dur); }
  /** mouth from a narration envelope: env = per-frame 0..1 values starting at t */
  talk(t, env, fps) { this.talks.push({ t, env, fps }); return this; }
  /** a short open-close on a word (beat sync for actors that do not own the voice) */
  say(t, dur = 0.45, open = 0.8) { return this.act('say', t, dur, { open }); }

  seek(t) {
    const r = this.rig, A = this.actions;
    const p = this.pos.at(t); let yaw = this.yaw.at(t);
    let sz = this.size.at(t) * this.baseScale;
    // velocity for gait
    const p2 = this.pos.at(t + 1 / 60), speed = Math.hypot(p2[0] - p[0], p2[2] - p[2]) * 60;
    let y = 0, sx = 1, sy = 1, headYaw = 0, headPitch = 0, roll = 0, spinY = 0;
    let armL = 0, armR = 0, armLf = 0, armRf = 0, wing = 0, mouthO = 0, legSwing = 0;
    // idle life
    const breathe = Math.sin(t * 2.1 + this.seed) * 0.018;
    sy += breathe; sx -= breathe * 0.5;
    headYaw += noise1(t * 0.35, this.seed) * 0.07; headPitch += noise1(t * 0.3, this.seed + 3) * 0.04;
    // gait while moving
    let rock = 0;
    if (speed > 0.15 && speed < 40) {
      const ph = t * (this.gait === 'trot' ? 8.5 : 7.5);   // constant cadence (a speed-scaled rate on absolute t would spin the legs)
      if (this.gait === 'trot') rock = Math.sin(ph * 2) * 0.035 * clamp(speed / 1.5);
      if (this.gait === 'hop') { const b = Math.abs(Math.sin(ph)); y += b * 0.16 * clamp(speed / 2); sy += (b - 0.5) * 0.06; }
      else { y += Math.abs(Math.sin(ph)) * 0.06; }
      legSwing = Math.sin(ph) * 0.55 * clamp(speed / 1.5); roll += Math.sin(ph) * 0.05;
      armL += Math.sin(ph) * 0.35; armR -= Math.sin(ph) * 0.35;
    }
    for (const a of A) {
      const x = t - a.t; if (x < -0.12 || x > a.dur + 0.4) continue;
      const u = clamp(x / a.dur);
      switch (a.k) {
        case 'pop': { const s = spring(x, { freq: 2.0, damp: 0.42 }); sz *= x < 0 ? 0 : s; break; }
        case 'unpop': { sz *= 1 - EASE.in(u) * (x >= 0 ? 1 : 0); break; }
        case 'jump': {
          // anticipation squash (0.08 s before), arc, landing squash
          if (x < 0 && x > -0.1) { const k = bump(x + 0.1, 0.1); sy -= 0.12 * k; sx += 0.08 * k; }
          if (x >= 0 && x <= a.dur) { const arc = 4 * u * (1 - u); y += a.h * arc; sy += 0.1 * Math.sin(Math.PI * u) - 0.02; sx -= 0.05 * Math.sin(Math.PI * u); armL += 0.9 * arc; armR -= 0.9 * arc; wing += arc; }
          if (x > a.dur && x < a.dur + 0.18) { const k = bump(x - a.dur, 0.18); sy -= 0.14 * k; sx += 0.1 * k; }
          break;
        }
        case 'wave': {
          if (x < 0 || x > a.dur) break;
          const env = Math.min(1, u * 5, (1 - u) * 5), osc = Math.sin(x * 11) * 0.35;
          if (a.side === 'L') { armL += env * 2.3; armLf += env * osc; } else { armR -= env * 2.3; armRf += env * osc; }
          wing += env * (0.6 + osc); roll += env * 0.06 * Math.sin(x * 5.5);
          break;
        }
        case 'cheer': { if (x < 0 || x > a.dur) break; const env = Math.min(1, u * 6, (1 - u) * 4); armL += env * 2.6; armR -= env * 2.6; armLf += env * Math.sin(x * 14) * 0.2; armRf -= env * Math.sin(x * 14) * 0.2; wing += env * (1 + Math.sin(x * 22) * 0.6); break; }
        case 'look': { if (x < 0 || x > a.dur) break; const env = EASE.inOutSine(Math.min(1, x / 0.3, (a.dur - x) / 0.3)); headYaw += a.yaw * env; headPitch += a.pitch * env; break; }
        case 'nod': { if (x < 0 || x > a.dur) break; headPitch += Math.sin(u * Math.PI * 2 * a.n) * 0.18 * Math.sin(Math.PI * u); break; }
        case 'tilt': { if (x < 0 || x > a.dur) break; roll += a.a * EASE.inOutSine(Math.min(1, x / 0.3, (a.dur - x) / 0.3)); break; }
        case 'wiggle': { if (x < 0 || x > a.dur) break; roll += Math.sin(x * 18) * a.a * Math.sin(Math.PI * u); break; }
        case 'spin': { if (x < 0) break; spinY += Math.PI * 2 * EASE.inOutCubic(u); break; }
        case 'squash': { if (x < 0 || x > a.dur) break; const k = Math.sin(Math.PI * u); sy -= 0.18 * k; sx += 0.12 * k; break; }
        case 'flap': { if (x < 0 || x > a.dur) break; wing += (0.5 + 0.5 * Math.sin(x * a.rate * Math.PI * 2)) * 1.3 * Math.min(1, u * 8, (1 - u) * 8); break; }
        case 'clap': { if (x < 0 || x > a.dur) break; const env = Math.min(1, u * 6, (1 - u) * 6), c = 0.5 + 0.5 * Math.sin(x * 16); armL += env * 1.2; armR -= env * 1.2; armLf -= env * c * 0.9; armRf += env * c * 0.9; break; }
        case 'say': { if (x < 0 || x > a.dur) break; mouthO = Math.max(mouthO, a.open * Math.sin(Math.PI * u)); break; }
      }
    }
    for (const tk of this.talks) {
      const f = (t - tk.t) * tk.fps; if (f < 0 || f >= tk.env.length - 1) continue;
      const i = Math.floor(f), v = lerp(tk.env[i], tk.env[i + 1], f - i); mouthO = Math.max(mouthO, v);
      headPitch += v * 0.06;
    }
    const fly = this.flying.at(t);
    if (fly > 0) { y += fly + Math.sin(t * 3.1 + this.seed) * 0.08; wing = Math.max(wing, 0.6 + 0.6 * Math.sin(t * 30)); }
    // apply
    const R = this.root;
    R.position.set(p[0], p[1] + y, p[2]);
    R.rotation.set(0, yaw + spinY + (r.headIsBody ? headYaw : 0), r.headIsBody ? roll : 0);
    R.scale.set(sz * sx, sz * sy, sz * sx);
    R.visible = sz > 0.003;
    if (r.body && !r.headIsBody) { r.body.rotation.z = roll; if (r.trotRock) r.body.rotation.x = rock; }
    if (r.head) { r.head.rotation.y = r.headIsBody ? 0 : headYaw; r.head.rotation.x = -headPitch; }
    else if (r.headIsBody && r.tiltNode) r.tiltNode.rotation.x = -headPitch * 0.6;
    if (r.armL) { r.armL.rotation.z = armL + 0.15; r.armL.rotation.x = armLf; }
    if (r.armR) { r.armR.rotation.z = armR - 0.15; r.armR.rotation.x = armRf; }
    if (r.wingL) { r.wingL.rotation.z = 0.15 + wing * 0.9; r.wingR.rotation.z = -0.15 - wing * 0.9; }
    if (r.legs) r.legs.forEach((l, i) => { l.rotation.x = legSwing * (i % 2 ? 1 : -1) * (i >= 2 ? -1 : 1); });
    if (r.tail) r.tail.rotation.y = Math.sin(t * 2.6 + this.seed) * 0.25 + Math.sin(t * 9) * 0.08 * clamp(speed);
    if (r.ears) r.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (Math.max(0, noise1(t * 1.3, this.seed + 9 + i)) * 0.25); });
    // face
    const m = this.moodT.at(t);
    const blink = blinkAt(t, this.seed);
    const happyLid = m === 'happy' ? 0.1 : m === 'think' ? 0.06 : m === 'sleepy' ? 0.6 : m === 'sad' ? 0.3 : 0;   // sad = droopy (not sleepy) lids + lowered inner brows + small frown, eyes glance down, no tears
    const look = this.eyeLook.at(t);
    if (r.eyes) r.eyes.forEach((e, i) => { e.setBlink(Math.max(blink, happyLid)); e.setWide(m === 'wow' ? 1.18 : 1); e.setLook(look[0] + (m === 'think' ? 0.5 : 0), look[1] + (m === 'think' ? 0.55 : m === 'sad' ? -0.7 : 0)); if (e.setBrow) e.setBrow(m === 'sad' ? 1 : 0, i === 0 ? -1 : 1); });
    const mo = Math.max(mouthO, m === 'wow' ? 0.55 : 0);
    if (r.mouth) { r.mouth.setOpen(mo); if (r.mouth.setFrown) r.mouth.setFrown(m === 'sad' ? 1 : 0); }
    if (r.beakLow) r.beakLow.rotation.x = mo * 0.6;
    if (r.jaw) r.jaw.rotation.x = mo * 0.45;
  }
}
/** deterministic blinks every ~2.5-4.5 s, 0.16 s long, occasional doubles */
export function blinkAt(t, seed) {
  let tt = 0.7 + hash(seed) * 2;
  for (let i = 0; i < 400 && tt < t + 1; i++) {
    const x = t - tt; if (x >= 0 && x < 0.16) return Math.sin(Math.PI * x / 0.16);
    if (hash(seed + i * 3.1) > 0.82) { const x2 = t - tt - 0.26; if (x2 >= 0 && x2 < 0.14) return Math.sin(Math.PI * x2 / 0.14); }
    tt += 2.4 + hash(seed + i * 1.7) * 2.2;
  }
  return 0;
}

/* ------------------------------------------------------------------ Prop: any Object3D with timed tracks */
export class Prop {
  constructor(obj, opts = {}) {
    this.obj = obj; this.root = obj;
    this.pos = new Track(opts.pos ?? obj.position.toArray()); this.rot = new Track(opts.rot ?? [obj.rotation.x, obj.rotation.y, obj.rotation.z]);
    this.size = new Track(opts.visible === false ? 0 : 1); this.base = opts.scale ?? obj.scale.x; this.actions = []; this.custom = [];
    this.seed = opts.seed ?? 3;
  }
  place(t, pos) { this.pos.set(t, pos); return this; }
  moveTo(t, dur, pos, e = 'inOutSine') { this.pos.to(t, dur, pos, e); return this; }
  rotTo(t, dur, rot, e = 'inOutSine') { this.rot.to(t, dur, rot, e); return this; }
  show(t, dur = 0.6) { this.actions.push({ k: 'pop', t, dur }); this.size.set(t, 1); return this; }
  hide(t, dur = 0.35) { this.actions.push({ k: 'unpop', t, dur }); this.size.set(t + dur, 0); return this; }
  wiggle(t, dur = 0.8, a = 0.1) { this.actions.push({ k: 'wiggle', t, dur, a }); return this; }
  bounce(t, dur = 0.5, h = 0.3) { this.actions.push({ k: 'bounce', t, dur, h }); return this; }
  pulse(t, dur = 0.5, a = 0.15) { this.actions.push({ k: 'pulse', t, dur, a }); return this; }
  /** fn(t, obj) applied after the tracks each frame (for doors, water, custom bits) */
  each(fn) { this.custom.push(fn); return this; }
  seek(t) {
    const o = this.obj, p = this.pos.at(t), r = this.rot.at(t);
    let s = this.size.at(t) * this.base, y = 0, rz = 0, sy = 1;
    for (const a of this.actions) {
      const x = t - a.t; if (x < 0 || x > a.dur + 0.5) continue; const u = clamp(x / a.dur);
      if (a.k === 'pop') s *= spring(x, { freq: 2.0, damp: 0.42 });
      if (a.k === 'unpop') s *= 1 - EASE.in(u);
      if (a.k === 'wiggle' && x <= a.dur) rz += Math.sin(x * 20) * a.a * Math.sin(Math.PI * u);
      if (a.k === 'bounce' && x <= a.dur) y += a.h * 4 * u * (1 - u);
      if (a.k === 'pulse' && x <= a.dur) { const k = Math.sin(Math.PI * u) * a.a; s *= 1 + k; }
    }
    o.position.set(p[0], p[1] + y, p[2]); o.rotation.set(r[0], r[1], r[2] + rz); o.scale.setScalar(Math.max(1e-4, s)); o.visible = s > 0.003;
    for (const f of this.custom) f(t, o);
  }
}

/* ------------------------------------------------------------------ Camera rig */
/** Segments of camera motion. Each shot: {t, dur, from?, to, e}; values {pos, look, fov}. Holds the last value between shots. */
export class CameraRig {
  constructor(cam) { this.cam = cam; this.pos = new Track([0, 4, 14]); this.look = new Track([0, 1, 0]); this.fov = new Track(35); this.orbits = []; this.shakeAmt = new Track(1); }
  cut(t, { pos, look, fov }) { this.pos.set(t, pos); this.look.set(t, look); if (fov) this.fov.set(t, fov); return this; }
  move(t, dur, { pos, look, fov }, e = 'inOutSine') { if (pos) this.pos.to(t, dur, pos, e); if (look) this.look.to(t, dur, look, e); if (fov) this.fov.to(t, dur, fov, e); return this; }
  /** orbit around center from angle a0 to a1 (radians, 0 = +z) at radius/height, overriding pos during [t, t+dur] */
  orbit(t, dur, { center, radius, height, a0, a1, look, e = 'inOutSine' }) {
    this.orbits.push({ t, dur, center, radius, height, a0, a1, look: look ?? center, e });
    const end = [center[0] + Math.sin(a1) * radius, height, center[2] + Math.cos(a1) * radius];
    this.pos.set(t + dur, end); this.look.set(t + dur, look ?? center);
    return this;
  }
  seek(t) {
    let p = this.pos.at(t), l = this.look.at(t);
    for (const o of this.orbits) if (t >= o.t && t < o.t + o.dur) {
      const u = ease(o.e)((t - o.t) / o.dur), a = lerp(o.a0, o.a1, u);
      p = [o.center[0] + Math.sin(a) * o.radius, o.height, o.center[2] + Math.cos(a) * o.radius]; l = o.look;
    }
    // gentle handheld drift (keeps every frame alive, never shaky)
    const k = 0.05 * this.shakeAmt.at(t);
    const c = this.cam;
    c.position.set(p[0] + noise1(t * 0.45, 1) * k * 2, p[1] + noise1(t * 0.4, 2) * k, p[2] + noise1(t * 0.38, 3) * k);
    c.lookAt(l[0] + noise1(t * 0.5, 4) * k, l[1] + noise1(t * 0.5, 5) * k * 0.6, l[2]);
    c.fov = this.fov.at(t); c.updateProjectionMatrix();
  }
}
export { THREE, Track, EASE, spring, bump, clamp, lerp, hash, noise1 };
