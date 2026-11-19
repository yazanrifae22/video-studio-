// FX: speech/sound bubbles (Baloo text on a 3D pill that faces the camera), sparkle bursts, title card PNG.
import * as THREE from 'three';
import { Prop, mat } from './core.js';
import { hash, clamp, spring, EASE } from './anim.js';

export const FONT = '"Baloo 2", "Segoe UI", sans-serif';

function textCanvas(text, { size = 150, color = '#24305E', bg = '#FFFFFF', stroke = null, pad = 70, radius = 120, tail = true, accent = '#FF7A45' } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = `800 ${size}px ${FONT}`;
  const w = Math.ceil(x.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.25) + pad * 1.2 + (tail ? 60 : 0);
  c.width = w; c.height = h;
  const bh = h - (tail ? 60 : 0);
  x.fillStyle = 'rgba(36,48,94,0.18)'; roundRect(x, 10, 16, w - 20, bh - 20, radius); x.fill();
  x.fillStyle = bg; roundRect(x, 4, 4, w - 16, bh - 20, radius); x.fill();
  if (tail) { x.beginPath(); x.moveTo(w * 0.42, bh - 24); x.lineTo(w * 0.5, h - 4); x.lineTo(w * 0.58, bh - 24); x.closePath(); x.fill(); }
  x.lineWidth = 10; x.strokeStyle = accent; roundRect(x, 4, 4, w - 16, bh - 20, radius); x.stroke();
  x.font = `800 ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (stroke) { x.lineWidth = size * 0.12; x.strokeStyle = stroke; x.strokeText(text, (w - 12) / 2, bh / 2 - 4); }
  x.fillStyle = color; x.fillText(text, (w - 12) / 2, bh / 2 - 4);
  return c;
}
function roundRect(x, a, b, w, h, r) { r = Math.min(r, h / 2, w / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

/** A billboard bubble prop: K.bubble('Moo! Moo!', [x,y,z], {height}) → Prop with show/hide/wiggle; faces the camera every frame. */
export function bubble(K, text, pos, { height = 1.0, clamp = false, maxWidth = 0, ...style } = {}) {
  const cv = textCanvas(text, style);
  if (maxWidth > 0 && height * cv.width / cv.height > maxWidth) height = maxWidth * cv.height / cv.width;   // shrink-to-fit (opt-in)
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * cv.width / cv.height, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  m.renderOrder = 10; const g = new THREE.Group(); g.add(m); g.position.set(...pos); K.scene.add(g);
  const pr = new Prop(g, { visible: false }); pr.label = `bubble "${text}"`; pr.width = height * cv.width / cv.height;
  pr.each((t, o) => { o.quaternion.copy(K.camera.quaternion); });
  K.props.push(pr);
  // opt-in `clamp: true`: each frame the anchor is pulled back inside the camera frustum (the whole pill stays within 88 % of the frame),
  // so a "?" bubble near the edge never reads as out of frame in kids:lint. Deterministic (derived from the camera each frame); default off = unchanged pictures.
  if (clamp) {
    const v = new THREE.Vector3(), w2 = pr.width;
    K.onFrame.push((t, cam) => {
      if (!g.visible || pr.size.at(t) <= 0.01) return;
      cam.updateProjectionMatrix(); cam.updateMatrixWorld(); g.updateMatrixWorld(true); v.copy(g.position).project(cam);
      if (v.z > 1) return;
      const dist = Math.max(0.5, g.position.distanceTo(cam.position)), sc = pr.size.at(t) * pr.base;
      const hx = (w2 * 0.5 * sc) / (dist * Math.tan(cam.fov * Math.PI / 360) * cam.aspect), hy = (height * 0.5 * sc) / (dist * Math.tan(cam.fov * Math.PI / 360));
      const mx = Math.max(0, 0.88 - hx), my = Math.max(0, 0.88 - hy), nx = Math.max(-mx, Math.min(mx, v.x)), ny = Math.max(-my, Math.min(my, v.y));
      if (nx === v.x && ny === v.y) return;
      v.set(nx, ny, v.z).unproject(cam); g.position.copy(v);
    });
  }
  return pr;
}

/** gentle sparkle burst (soft stars drifting up and fading; no flashing). */
export function sparkles(K, at, t0, { n = 18, color = '#FFD65A', spread = 1.4, dur = 1.6, size = 0.12 } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  x.translate(64, 64); x.fillStyle = '#FFFFFF'; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 58, a = i * Math.PI / 5 - Math.PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill();
  const tex = new THREE.CanvasTexture(cv);
  const g = new THREE.Group(); K.scene.add(g);
  const items = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(i % 3 === 0 ? '#FFFFFF' : color), transparent: true, depthWrite: false, fog: false }));
    s.renderOrder = 11; g.add(s);
    const a = hash(i * 3.7 + t0) * Math.PI * 2, r = spread * (0.4 + hash(i * 1.9 + t0) * 0.6), up = 0.6 + hash(i * 5.3) * 1.2;
    items.push({ s, v: [Math.cos(a) * r, up, Math.sin(a) * r * 0.6], d: hash(i * 2.2) * 0.25 });
  }
  K.onFrame.push((t) => {
    for (const it of items) {
      const u = (t - t0 - it.d) / dur; it.s.visible = u > 0 && u < 1; if (!it.s.visible) continue;
      const e = EASE.outCubic(u);
      it.s.position.set(at[0] + it.v[0] * e, at[1] + it.v[1] * e, at[2] + it.v[2] * e);
      const k = Math.sin(Math.PI * clamp(u * 1.3)) * size * (1 + 0.3 * Math.sin((t + it.d) * 9));
      it.s.scale.setScalar(Math.max(1e-3, k)); it.s.material.opacity = 1 - u * u; it.s.material.rotation = (t - t0) * 2 + it.d * 10;
    }
  });
}

/** Title card PNG (data URL) for the timeline overlay: big friendly Baloo title on a white pill with the brand accents. */
export function titleCard(lines, { w = 1500 } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d'), size = 132;
  c.width = w; c.height = 150 + lines.length * size * 1.02;
  x.fillStyle = 'rgba(36,48,94,0.22)'; roundRect(x, 14, 22, w - 28, c.height - 30, 70); x.fill();
  x.fillStyle = '#FFFFFF'; roundRect(x, 8, 8, w - 28, c.height - 30, 70); x.fill();
  x.lineWidth = 14; x.strokeStyle = '#FF7A45'; roundRect(x, 8, 8, w - 28, c.height - 30, 70); x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((ln, i) => { x.font = `800 ${size}px ${FONT}`; x.fillStyle = i === 0 ? '#24305E' : '#FF7A45'; x.fillText(ln, (w - 20) / 2, 80 + size * 0.5 + i * size * 1.0); });
  return c.toDataURL('image/png');
}
