// Fair Game, Macro look: props built on top of the test3d kit (no kit edits). Metres, y up, board top = 0.
// pawnMaterial (instanced role colour sweep / dim / lit), cheap disc + pawn geometries for instancing, the four hats,
// the large flip coin (crown relief / plain side), lit glow, ghost outline, average level plane, glint star.
import * as THREE from 'three';

export const PAWN_H = 0.0504;
const mm = 0.001;

/** lathe from a [r, y] mm profile (same smoothing as the kit's pieces) */
export function lathe(profile, seg, samples) {
  const curve = new THREE.CatmullRomCurve3(profile.map(([r, y]) => new THREE.Vector3(r * mm, y * mm, 0)), false, 'centripetal');
  const pts = curve.getSpacedPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, seg);
}

/** one gold disc (the kit coin profile, fewer facets: it is instanced thousands of times) */
export function discGeometry(seg = 30, n = 22) {
  const P = [[0, 0.16], [6, 0.16], [11.3, 0.16], [11.75, 0.02], [12.9, 0], [13.38, 0.1], [13.5, 0.3], [13.5, 1.0], [13.5, 1.7], [13.38, 1.9], [12.9, 2.0], [11.75, 1.98], [11.3, 1.84], [6, 1.84], [0, 1.84]];
  const curve = new THREE.CatmullRomCurve3(P.map(([r, y]) => new THREE.Vector3(r * mm, y * mm, 0)), false, 'centripetal', 0.5);
  const pts = curve.getSpacedPoints(n).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y)); pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, seg);
}

/**
 * the pawn wood material with per-instance look: aLook = (sweep 0..1 of the role colour from the head down, dim 0..1, lit 0..1, gloss),
 * aTint = role colour (linear). Works on InstancedMesh geometries that carry both attributes.
 */
export function pawnMaterial(base) {
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aLook; attribute vec3 aTint; varying vec4 vLook; varying vec3 vTint; varying float vLY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLook = aLook; vTint = aTint; vLY = position.y / 0.0504;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vLook; varying vec3 vTint; varying float vLY;')
      .replace('#include <map_fragment>', `#include <map_fragment>
  {
    float sw = vLook.x * 1.15, m = smoothstep( 1.0 - sw - 0.06, 1.0 - sw + 0.01, vLY ) * step( 0.001, vLook.x );
    float lum = dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
    vec3 paint = vTint * ( 0.62 + 0.8 * lum );
    diffuseColor.rgb = mix( diffuseColor.rgb, paint, m );
    float dl = dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
    diffuseColor.rgb = mix( diffuseColor.rgb, vec3( dl ) * vec3( 0.92, 0.96, 1.08 ), 0.85 * vLook.y ) * mix( 1.0, 0.16, vLook.y );
  }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix( roughnessFactor, 0.28, vLook.w );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3( 1.0, 0.66, 0.30 ) * vLook.z * ( 0.07 + 0.2 * smoothstep( 0.45, 1.0, vLY ) ) * clamp( 0.15 + 3.0 * dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) ), 0.0, 1.0 );');
  };
  m.customProgramCacheKey = () => 'parable-macro-pawn';
  return m;
}

/**
 * per-instance fade (attribute aFade 0..1) as a stratified screen-door dither (threshold = pixel offset + DITHER.value, which steps by the
 * golden ratio every sub-frame): the engine
 * accumulates 16 sub-frames, so a half-faded piece reads as a real see-through fade with no blur blob and no sorting problems.
 * Chains any onBeforeCompile already on the material.
 */
export const DITHER = { value: 0 };
export function fadeable(m, key) {
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uDither = DITHER;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFade; varying float vFade;').replace('#include <begin_vertex>', '#include <begin_vertex>\n  vFade = aFade;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDither; varying float vFade;')
      .replace('void main() {', `void main() {
  if ( vFade < 0.999 ) { float hh = fract( 52.9829189 * fract( dot( floor( gl_FragCoord.xy ), vec2( 0.06711056, 0.00583715 ) ) ) + uDither ); if ( hh >= vFade ) discard; }`);   // stratified: a fixed per-pixel offset + a golden-ratio step per sub-frame, so 16 sub-frames give every pixel the same coverage (no grain)
  };
  m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|fade-' + key;
  m.needsUpdate = true;
  return m;
}

export function instanced(geo, mat, cap, attrs = {}) {
  const g = geo.clone();
  for (const [name, size] of Object.entries(attrs)) { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); }
  const m = new THREE.InstancedMesh(g, mat, cap); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false;
  return m;
}

/* ------------------------------------------------------------------ hats (pawn-local: y from the pawn base, metres) */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
const col = (hex) => new THREE.Color(hex);

function scholarCap() {
  const g = new THREE.Group(), cloth = phys({ color: col('#16224a'), roughness: 0.72, sheen: 0.6, sheenRoughness: 0.5, sheenColor: col('#5f78c8') });
  const skull = new THREE.Mesh(new THREE.CylinderGeometry(7.4 * mm, 8.7 * mm, 5.2 * mm, 40), cloth); skull.position.y = 47.6 * mm; g.add(skull);
  const board = new THREE.Mesh(new THREE.BoxGeometry(20 * mm, 1.3 * mm, 20 * mm), cloth); board.position.y = 50.6 * mm; board.rotation.y = Math.PI / 4; g.add(board);
  const goldM = phys({ color: col('#e9b84a'), metalness: 0.6, roughness: 0.35 });
  const btn = new THREE.Mesh(new THREE.SphereGeometry(1.3 * mm, 12, 8), goldM); btn.position.y = 51.4 * mm; g.add(btn);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * mm, 0.45 * mm, 13 * mm, 6), goldM); cord.rotation.z = Math.PI / 2 - 0.04; cord.position.set(6.5 * mm, 51.4 * mm, 0); g.add(cord);
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * mm, 0.45 * mm, 7 * mm, 6), goldM); hang.position.set(13.2 * mm, 47.8 * mm, 0); g.add(hang);
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(1.0 * mm, 1.8 * mm, 5 * mm, 10), goldM); fringe.position.set(13.2 * mm, 43.4 * mm, 0); g.add(fringe);
  g.userData.mats = [cloth, goldM];
  return g;
}
function hardHat() {
  const g = new THREE.Group(), plastic = phys({ color: col('#f5c21b'), roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9.4 * mm, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), plastic); dome.scale.y = 0.84; dome.position.y = 45.3 * mm; g.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(11.6 * mm, 12.0 * mm, 1.0 * mm, 48), plastic); brim.position.set(0, 45.4 * mm, 1.4 * mm); g.add(brim);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(7.95 * mm, 1.15 * mm, 8, 24, Math.PI), plastic); ridge.rotation.y = Math.PI / 2; ridge.scale.y = 0.84; ridge.position.y = 45.3 * mm; g.add(ridge);
  g.userData.mats = [plastic];
  return g;
}
function crown(goldMat) {
  const g = new THREE.Group(), geo = new THREE.CylinderGeometry(8.2 * mm, 7.7 * mm, 7 * mm, 60, 4, true), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / mm + 3.5, a = Math.atan2(p.getZ(i), p.getX(i)); if (y > 0.5) { const k = Math.pow(0.5 + 0.5 * Math.cos(5 * a + Math.PI / 2), 3); p.setY(i, (y / 7 * (3.2 + 5.2 * k) - 3.5) * mm); } }
  geo.computeVertexNormals();
  const mat = goldMat.clone(); mat.side = THREE.DoubleSide;
  const band = new THREE.Mesh(geo, mat); band.position.y = 47.6 * mm; g.add(band);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.9 * mm, 0.9 * mm, 10, 48), mat); ring.rotation.x = Math.PI / 2; ring.position.y = 44.4 * mm; g.add(ring);
  for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.1 * mm, 12, 8), mat); b.userData.k = k; g.add(b); }
  // place the balls on the point tips (cos(5a + pi/2) = 1)
  let k = 0; for (const c of g.children) if (c.userData.k !== undefined) { const a = (2 * Math.PI * k - Math.PI / 2) / 5; c.position.set(Math.cos(a) * 8.05 * mm, (47.6 + 3.5 + 1.6) * mm, Math.sin(a) * 8.05 * mm); k++; }
  g.userData.mats = [mat];
  return g;
}
function coneHat() {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#1f9a52'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#ffd23a'; for (let i = -4; i < 8; i++) { x.beginPath(); x.moveTo(i * 64, 256); x.lineTo(i * 64 + 22, 256); x.lineTo(i * 64 + 22 + 140, 0); x.lineTo(i * 64 + 140, 0); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  const g = new THREE.Group(), paper = phys({ map: t, roughness: 0.55, sheen: 0.3, sheenColor: col('#ffffff') });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7.9 * mm, 23 * mm, 48, 1, true), paper); cone.position.y = (46.0 + 11.5) * mm; g.add(cone);
  const pomM = phys({ color: col('#ffd23a'), roughness: 0.9, sheen: 1, sheenColor: col('#fff2b0') });
  const pom = new THREE.Mesh(new THREE.SphereGeometry(2.7 * mm, 16, 12), pomM); pom.position.y = 69.3 * mm; g.add(pom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.8 * mm, 0.9 * mm, 8, 40), pomM); rim.rotation.x = Math.PI / 2; rim.position.y = 46.2 * mm; g.add(rim);
  g.userData.mats = [paper, pomM];
  return g;
}
/** hats by role; every hat is a Group in pawn-local space. .userData.top = highest point (m above the pawn base) */
export function makeHat(role, goldMat) {
  const h = role === 'scholar' ? scholarCap() : role === 'worker' ? hardHat() : role === 'heir' ? crown(goldMat) : coneHat();
  h.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  h.userData.top = { scholar: 0.0516, worker: 0.0532, heir: 0.0545, fool: 0.072 }[role];
  h.userData.base = h.userData.mats.map((m) => m.color.clone());
  h.matrixAutoUpdate = false;
  return h;
}
export const HAT_TOP = { scholar: 0.0516, worker: 0.0532, heir: 0.0545, fool: 0.072 };

/* ------------------------------------------------------------------ the large flip coin */
export const FLIP = { r: 0.026, t: 0.0036 };
export function flipCoin(goldMat) {
  const g = new THREE.Group();
  const P = [[0, 0.55], [19.5, 0.55], [21.6, 0.42], [23.4, 0.0], [25.4, 0.12], [26, 0.6], [26, 3.0], [25.4, 3.48], [23.4, 3.6], [21.6, 3.18], [19.5, 3.05], [0, 3.05]];
  const body = lathe(P, 96, 90); body.translate(0, -1.8 * mm, 0);
  const mat = goldMat; const m = new THREE.Mesh(body, mat); g.add(m);
  // heads: a crown in relief (+y face); tails: plain field with one fine ring
  const s = new THREE.Shape(), C = [[-10, -6.5], [10, -6.5], [11.2, 5], [6.6, 0.4], [4.2, 7.6], [1.6, 1.6], [0, 9.6], [-1.6, 1.6], [-4.2, 7.6], [-6.6, 0.4], [-11.2, 5]];
  C.forEach(([x, y], i) => (i ? s.lineTo(x * mm, y * mm) : s.moveTo(x * mm, y * mm)));
  const cg = new THREE.ExtrudeGeometry(s, { depth: 0.35 * mm, bevelEnabled: true, bevelSize: 0.45 * mm, bevelThickness: 0.35 * mm, bevelSegments: 3, curveSegments: 6 });
  cg.rotateX(-Math.PI / 2); cg.translate(0, 1.25 * mm, 1.0 * mm);
  const cr = new THREE.Mesh(cg, mat); g.add(cr);
  const band = new THREE.Shape(); band.moveTo(-10 * mm, -9.6 * mm); band.lineTo(10 * mm, -9.6 * mm); band.lineTo(10 * mm, -8.0 * mm); band.lineTo(-10 * mm, -8.0 * mm);
  const bg = new THREE.ExtrudeGeometry(band, { depth: 0.3 * mm, bevelEnabled: true, bevelSize: 0.3 * mm, bevelThickness: 0.3 * mm, bevelSegments: 2 }); bg.rotateX(-Math.PI / 2); bg.translate(0, 1.25 * mm, 0);
  g.add(new THREE.Mesh(bg, mat));
  for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.25 * mm, 12, 8), mat); const tip = [C[2], C[4], C[6], C[8], C[10]][k]; b.position.set(tip[0] * mm, 1.6 * mm, -(tip[1] + 1.3) * mm + 1.0 * mm); g.add(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17 * mm, 0.32 * mm, 6, 96), mat); ring.rotation.x = Math.PI / 2; ring.position.y = -1.25 * mm; g.add(ring);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ------------------------------------------------------------------ glow under a lit player (ring + soft pool), additive, HDR so it blooms */
export function glowTexture() {
  const S = 256, c = canvas(S, S), x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(0.7, 'rgba(255,255,255,0.75)'); g.addColorStop(0.76, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}
export function glowMesh(cap) {
  const mat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false; m.renderOrder = 2;
  m.setColorAt(0, new THREE.Color(0, 0, 0)); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return m;
}

/* ------------------------------------------------------------------ ghost: faint outline of where a tower used to reach */
export function ghostMesh() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vY = uv.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uOp; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); float top = smoothstep(0.93, 1.0, vY); float dash = step(0.5, fract(vY * 9.0)); gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * uOp * (0.06 + 1.3 * f * (0.5 + 0.5 * dash) + 2.2 * top), 1.0); }',
  });
  const geo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true); geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 3; m.frustumCulled = false; m.visible = false;
  const capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.2), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  m.userData.cap = capMat;
  return m;
}

/* ------------------------------------------------------------------ the average level: a thin glowing sheet that sweeps in from the near edge */
export function levelMesh(size) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 1 }, uSweep: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uOp, uSweep; varying vec2 vUv;
      void main(){ vec2 g = abs(fract(vUv * 8.0) - 0.5); float grid = smoothstep(0.47, 0.5, max(g.x, g.y));
        float front = smoothstep(0.035, 0.0, abs(vUv.y - (1.0 - uSweep))) ;
        float edge = smoothstep(0.012, 0.0, min(min(vUv.x, 1.0 - vUv.x), 1.0 - vUv.y));
        float inside = step(1.0 - uSweep, vUv.y);
        vec3 c = vec3(1.0, 0.82, 0.5) * (0.07 + 0.25 * grid + 0.8 * edge) * inside + vec3(1.0, 0.9, 0.7) * front * 1.4;
        gl_FragColor = vec4(c * uOp, 1.0); }`,
  });
  const geo = new THREE.PlaneGeometry(size, size); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 4; m.frustumCulled = false; m.visible = false;
  return m;
}

/* ------------------------------------------------------------------ glint star (sharp layer, camera facing) */
export function glintStar() {
  const S = 256, c = canvas(S, S), x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'lighter';
  for (const a of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { x.save(); x.translate(S / 2, S / 2); x.rotate(a); const w = a % (Math.PI / 2) ? 0.5 : 1; const lg = x.createLinearGradient(-S / 2, 0, S / 2, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${0.9 * w})`); lg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = lg; x.fillRect(-S / 2 * w, -1.6, S * w, 3.2); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  m.layers.set(1); m.renderOrder = 90; m.frustumCulled = false; m.visible = false;
  return m;
}
