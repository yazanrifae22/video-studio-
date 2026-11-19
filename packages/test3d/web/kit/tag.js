// test3d kit: floating number tag. A camera-facing plane on the "sharp" layer: the engine renders it without lens blur, so it stays crisp.
import * as THREE from 'three';
import { makeCanvas } from './util.js';

const FONT = '"Segoe UI Black","Arial Black","Segoe UI",Arial,sans-serif';

/**
 * numberTag(text, {height, color, gain, shadow, sharp, px, overlay}) -> Mesh. px = canvas font size (220; lower for long strings that change often), overlay = drawn over everything, outline = black outline width as a fraction of the font size (0.1 reads on white rice).
 * height = cap height of the digits in metres (default 0.014).
 * .setText(s) (cached per string), .pop (scale factor, animate it), .opacity. Add it to the scene (not to a rotated parent).
 */
export function numberTag(K, text, { height = 0.014, color = '#ffffff', gain = 1.5, shadow = 0.85, sharp = true, weight = 900, px = 220, overlay = false, outline = 0, plate = 0, plateColor = '13,10,7' } = {}) {
  // plate = opacity of a dark rounded plate behind the text (0.5 makes gold digits read on white rice); plateColor = 'r,g,b' (0-255) of that plate
  const cache = new Map(), PX = px, PAD = Math.round(px * (plate ? 0.5 : 0.36));
  const draw = (txt) => {
    if (cache.has(txt)) return cache.get(txt);
    let c = makeCanvas(8, 8), x = c.getContext('2d'); x.font = `${weight} ${PX}px ${FONT}`;
    const w = Math.ceil(x.measureText(txt).width) + PAD * 2, h = PX + PAD * 2;
    c = makeCanvas(w, h); x = c.getContext('2d'); x.font = `${weight} ${PX}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const cy = h / 2 + PX * 0.05;
    if (plate) {
      const m = PX * 0.2, ph = PX * 1.22, py = h / 2 - ph / 2 + PX * 0.01;
      x.save(); x.shadowColor = `rgba(0,0,0,${Math.min(1, plate * 1.2)})`; x.shadowBlur = PX * 0.16; x.fillStyle = `rgba(${plateColor},${plate})`;
      x.beginPath(); x.roundRect(m, py, w - 2 * m, ph, PX * 0.26); x.fill(); x.restore();
    }
    x.shadowColor = `rgba(0,0,0,${shadow})`; x.shadowBlur = PX * 0.2; x.shadowOffsetY = PX * 0.045; x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText(txt, w / 2, cy);
    if (outline) { x.lineJoin = 'round'; x.lineWidth = PX * outline; x.strokeStyle = 'rgba(0,0,0,0.92)'; x.strokeText(txt, w / 2, cy); }
    x.shadowBlur = PX * 0.073; x.shadowOffsetY = PX * 0.023; x.fillStyle = color; x.fillText(txt, w / 2, cy);
    x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0; x.fillText(txt, w / 2, cy);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    const r = { t, w, h }; cache.set(txt, r); return r;
  };
  const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, fog: false,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  mat.color.setScalar(gain);
  if (overlay) mat.depthTest = false;   // a label over the picture (place it with the camera): never hidden by the scene
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.name = 'tag'; m.renderOrder = 100; m.frustumCulled = false;
  if (sharp) m.layers.set(1);
  let base = [1, 1];
  m.pop = 1; m.capHeight = height;
  m.setText = (s) => { const r = draw(String(s)); if (mat.map !== r.t) { mat.map = r.t; mat.needsUpdate = true; } const k = height / (0.72 * PX); base = [r.w * k, r.h * k]; m.text = String(s); return m; };
  Object.defineProperty(m, 'opacity', { get: () => mat.opacity, set: (v) => { mat.opacity = v; m.visible = v > 0.003; } });
  m.setText(text);
  K.onFrame.push((t, cam) => { m.quaternion.copy(cam.quaternion); m.scale.set(base[0] * m.pop, base[1] * m.pop, 1); });
  return m;
}
