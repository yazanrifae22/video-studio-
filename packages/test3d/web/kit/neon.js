// test3d kit: NEON. Glowing line art on black: constant-width fat lines, unlit emissive grains, no lights and no textures of the photographic kit.
// A film loads it by itself: const { makeNeon } = await import('/kit/kit/neon.js'); const N = makeNeon(K).
// Everything is HDR linear colour (values above the bloom threshold glow). Metres, y up, board top = y 0, board centre = origin (same as the kit).
// The film must set scene.fog (THREE.Fog, black) once: every neon material is depth-cued by it.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CUP_OUTER, foldState } from './table-props.js';

export const SQ = 0.055;
// lathe outlines in millimetres [radius, height] (the same pieces as kit/pieces.js)
export const KING = [[0, 0], [17.5, 0], [19, 0.6], [19.6, 2.2], [19.5, 4.2], [18.6, 5.8], [16.4, 7], [15.3, 7.9], [15.9, 9.2], [16.6, 10.4], [15.8, 11.9], [13.6, 13.2], [11.2, 15.5], [9.4, 19.5], [8.1, 26], [7.1, 35], [6.5, 44], [6.6, 51],
  [7.6, 53], [10, 54], [10.9, 55.4], [10, 56.8], [8, 57.6], [7.7, 58.3], [8.6, 59.2], [9, 60.2], [8.4, 61.2], [7.1, 62], [6.9, 63.2], [7.4, 66], [8.8, 71], [10.2, 75.2], [10.8, 76.8], [10.3, 78], [8.7, 78.9], [6.6, 80.2], [4.2, 81.4], [3.1, 82.3], [3.3, 83.4], [3, 84.6], [1.9, 85.5], [0, 85.8]];
export const PAWN = [[0, 0], [12, 0], [13.2, 0.5], [13.6, 1.8], [13.4, 3.4], [12.2, 4.7], [10.7, 5.6], [10.9, 6.8], [10.4, 8.2], [8.6, 9.8], [6.6, 12.5], [5.4, 17], [4.7, 22], [4.5, 26.5], [5.2, 28.8], [7.6, 30], [8.5, 31], [7.8, 32.2], [5.8, 33], [4.9, 34], [5.6, 35.6], [7.2, 38.2], [8.2, 41.2], [8.3, 44], [7.4, 47], [5.2, 49.2], [2.6, 50.2], [0, 50.4]];
const CROSS = [[-1.3, 0], [1.3, 0], [1.1, 4.1], [4, 3.8], [4.1, 6.8], [1.1, 6.5], [1.5, 10.4], [-1.5, 10.4], [-1.1, 6.5], [-4.1, 6.8], [-4, 3.8], [-1.1, 4.1]];

const FOG_V = `
#include <fog_pars_vertex>`;
const QROT = `
vec3 qrot( vec4 q, vec3 v ){ return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }`;
// screen-space dimming shared by all grains: a darker band behind the caption line and a rectangular hole for a number
const SCREEN_PARS = `
uniform vec2 uRes; uniform vec4 uBand; uniform vec4 uHole; uniform float uHoleAmt;
float screenDim(){
  vec2 s = gl_FragCoord.xy / uRes; float yt = 1.0 - s.y;
  float band = smoothstep( uBand.x - uBand.w, uBand.x, yt ) * ( 1.0 - smoothstep( uBand.y, uBand.y + uBand.w, yt ) );
  float hx = smoothstep( uHole.x - 0.03, uHole.x, s.x ) * ( 1.0 - smoothstep( uHole.z, uHole.z + 0.03, s.x ) );
  float hy = smoothstep( uHole.y - 0.018, uHole.y, yt ) * ( 1.0 - smoothstep( uHole.w, uHole.w + 0.018, yt ) );
  return ( 1.0 - ( 1.0 - uBand.z ) * band ) * ( 1.0 - uHoleAmt * hx * hy );
}`;

export function makeNeon(K) {
  const res = new THREE.Vector2(K.W, K.H), clamp = K.clamp;
  const col = (r, g, b) => new THREE.Color().setRGB(r, g, b);
  /** colours (linear, about unit brightness): multiply by a gain */
  const C = { white: col(1, 1, 1), gold: col(1.0, 0.6, 0.15), rice: col(1.0, 0.9, 0.7), tile: col(1.0, 0.82, 0.55), red: col(1.0, 0.09, 0.06), dead: col(0.5, 0.44, 0.36) };
  /** uniforms shared by every grain material (set them per frame) */
  const shared = { uT: { value: 0 }, uRes: { value: res }, uBand: { value: new THREE.Vector4(0.6, 0.72, 1, 0.03) }, uHole: { value: new THREE.Vector4(0, 0, 0, 0) }, uHoleAmt: { value: 0 } };

  /* ------------------------------------------------------------------ lines */
  const lineMat = (color, width, gain = 1) => { const m = new LineMaterial({ linewidth: width, worldUnits: false, fog: true }); m.resolution.copy(res); m.userData.base = color.clone(); m.userData.gain = gain; m.color.copy(color).multiplyScalar(gain); return m; };
  const setLine = (m, gain, tint) => m.color.copy(tint ?? m.userData.base).multiplyScalar(gain);
  const polyline = (flat, mat) => { const l = new Line2(new LineGeometry().setPositions(flat), mat); l.frustumCulled = false; return l; };
  const segments = (flat, mat) => { const l = new LineSegments2(new LineSegmentsGeometry().setPositions(flat), mat); l.frustumCulled = false; return l; };
  const circle = (flat, r, y, n = 48, cx = 0, cz = 0) => { for (let i = 0; i < n; i++) { const a = i / n * 6.2831853, b = (i + 1) / n * 6.2831853; flat.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, cx + Math.cos(b) * r, y, cz + Math.sin(b) * r); } return flat; };
  const loop = (r, y, n = 64) => { const f = []; for (let i = 0; i <= n; i++) { const a = i / n * 6.2831853; f.push(Math.cos(a) * r, y, Math.sin(a) * r); } return f; };

  /** black body that hides the lines behind it, with a soft glow on its limb */
  const bodyMat = (color, rim = 0.4, pow = 2.6) => new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: color.clone() }, uRim: { value: rim }, uPow: { value: pow } }]),
    vertexShader: `varying vec3 vN; varying vec3 vV;${FOG_V}
void main(){
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); vN = normalMatrix * normal; vV = - mvPosition.xyz; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uColor; uniform float uRim, uPow; varying vec3 vN; varying vec3 vV;
#include <fog_pars_fragment>
void main(){
  float f = pow( 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) ), uPow );
  gl_FragColor = vec4( uColor * ( uRim * f ), 1.0 );
#include <fog_fragment>
}`,
    fog: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 3,
  });

  /* ------------------------------------------------------------------ textures (procedural) */
  const dataTex = (S, fn) => { const c = K.makeCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S); for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const v = Math.round(255 * clamp(fn((i + 0.5) / S, (j + 0.5) / S))), o = (j * S + i) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255; } x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const tileTex = dataTex(128, (u, v) => { const d = Math.min(u, 1 - u, v, 1 - v); return 0.012 + 0.988 * Math.exp(-d / 0.022); });   // a lit square: bright rim, soft inside
  const poolTex = dataTex(128, (u, v) => { const r = Math.hypot(u - 0.5, v - 0.5) * 2; return Math.pow(clamp(1 - r), 2.2); });
  const addMat = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false });

  /* ------------------------------------------------------------------ the board: a grid of light */
  /**
   * grid({line, border, width, checker}) -> Group. .sq(n) centre of square n (1 = near left for a camera on +z, left to right, then up; same as kit.board),
   * .light(n, level, color?) adds light to one square (call .dark() first, .commit() after), .set({line, border, checker}) gains, .centre(gain) the middle line.
   */
  function grid({ line = 0.14, border = 0.3, width = 2.4, checker = 0.004 } = {}) {
    const g = new THREE.Group(), half = 4 * SQ, a = [];
    for (let i = 1; i < 8; i++) { const p = -half + i * SQ; a.push(p, 0, -half, p, 0, half, -half, 0, p, half, 0, p); }
    const mIn = lineMat(C.white, width, line), mEdge = lineMat(C.white, width * 1.3, border), mMid = lineMat(C.rice, width * 2.2, 0);
    g.add(segments(a, mIn));
    const e = []; for (const b of [half, half + 0.008]) e.push(-b, 0, -b, b, 0, -b, b, 0, -b, b, 0, b, b, 0, b, -b, 0, b, -b, 0, b, -b, 0, -b);
    g.add(segments(e, mEdge));
    const mid = polyline([-half, 0.00025, 0, half, 0.00025, 0], mMid); mid.visible = false; g.add(mid);
    // 64 quads just under the lines: a faint chess pattern + the light of each square
    const P = new Float32Array(64 * 12), UV = new Float32Array(64 * 8), COL = new Float32Array(64 * 12), idx = [];
    for (let n = 0; n < 64; n++) {
      const i = n % 8, j = Math.floor(n / 8), x0 = -half + i * SQ, z1 = half - j * SQ, z0 = z1 - SQ, y = -0.0004;
      P.set([x0, y, z1, x0 + SQ, y, z1, x0 + SQ, y, z0, x0, y, z0], n * 12); UV.set([0, 0, 1, 0, 1, 1, 0, 1], n * 8); idx.push(n * 4, n * 4 + 1, n * 4 + 2, n * 4, n * 4 + 2, n * 4 + 3);
    }
    const mk = (map) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); const c = new THREE.BufferAttribute(map ? COL : new Float32Array(64 * 12), 3); geo.setAttribute('color', c); geo.setIndex(idx); const m = addMat(map); m.vertexColors = true; const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = -2; return mesh; };
    const lights = mk(tileTex), chk = mk(null); chk.renderOrder = -3;
    { const c = chk.geometry.attributes.color; for (let n = 0; n < 64; n++) { const on = (n % 8 + Math.floor(n / 8)) % 2 === 1 ? 1 : 0; for (let k = 0; k < 4; k++) c.setXYZ(n * 4 + k, on, on, on); } }
    chk.material.color.setScalar(checker);
    g.add(chk, lights);
    g.half = half; g.S = SQ;
    g.sq = (n, y = 0) => { const i = (n - 1) % 8, j = Math.floor((n - 1) / 8); return new THREE.Vector3((i - 3.5) * SQ, y, (3.5 - j) * SQ); };
    g.dark = () => { COL.fill(0); };
    g.light = (n, level, color = C.tile) => { if (!(level > 0)) return; const o = (n - 1) * 12; for (let k = 0; k < 4; k++) { COL[o + k * 3] += color.r * level; COL[o + k * 3 + 1] += color.g * level; COL[o + k * 3 + 2] += color.b * level; } };
    g.commit = () => { lights.geometry.attributes.color.needsUpdate = true; };
    g.set = ({ line: l = line, border: b = border, checker: c = checker } = {}) => { setLine(mIn, l); setLine(mEdge, b); chk.material.color.setScalar(c); };
    g.centre = (gain) => { mid.visible = gain > 0.001; setLine(mMid, gain); };
    return g;
  }

  /* ------------------------------------------------------------------ chess pieces drawn as outlines */
  /**
   * piece(profileMm, {color, width, rings: [[heightMm, radiusMm]], cross, gain, ringGain, rim, pool}) -> Group (origin = centre of the base).
   * The outline is the turned profile, always turned toward the camera around the piece's own axis; a few true rings; a black body hides what is behind.
   * .set(glow, tint?) brightness of the whole piece (1 = normal, 0 = off), .profile / .height / .radius (kit.tilt and kit.topple work on it).
   */
  function piece(profile, { color = C.white, width = 3.6, rings = [], cross = false, gain = 3, ringGain = 0.5, rim = 0.5, pool = 0.05 } = {}) {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3(profile.map(([r, y]) => new THREE.Vector3(r * 0.001, y * 0.001, 0)), false, 'centripetal'), pts = curve.getSpacedPoints(260);
    const lp = pts.map((p) => new THREE.Vector2(Math.max(0, p.x) * 0.95, p.y)); lp[0].x = 0; lp[lp.length - 1].x = 0;
    const bm = bodyMat(color, rim), body = new THREE.Mesh(new THREE.LatheGeometry(lp, 72), bm); g.add(body);
    const r0 = profile[1][0] * 0.001 * 0.99; let i0 = pts.findIndex((p) => p.x >= r0); if (i0 < 0) i0 = 1;
    const side = pts.slice(i0).map((p) => [Math.max(0, p.x), p.y]), flat = [];
    for (let i = 0; i < side.length; i++) flat.push(-side[i][0], side[i][1], 0);
    for (let i = side.length - 2; i >= 0; i--) flat.push(side[i][0], side[i][1], 0);
    const lm = lineMat(color, width, gain), rm = lineMat(color, width * 0.72, gain * ringGain), sil = new THREE.Group();
    sil.add(polyline(flat, lm));
    if (cross) { const s = 1.45 * 0.001, y0 = 0.0851, f = []; for (let i = 0; i <= CROSS.length; i++) { const [x, y] = CROSS[i % CROSS.length]; f.push(x * s, y0 + y * s, 0); } sil.add(polyline(f, lm)); }
    g.add(sil);
    if (rings.length) { const f = []; for (const [y, r] of rings) circle(f, r * 0.001, y * 0.001, 56); g.add(segments(f, rm)); }
    // a pool of its own light on the floor
    const pm = addMat(poolTex), pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), pm); pl.frustumCulled = false; pl.renderOrder = -1; pl.scale.setScalar(0.17); K.scene.add(pl);
    const loc = new THREE.Vector3();
    K.onFrame.push((t, cam) => {
      pl.visible = g.visible && g.parent !== null && pm.color.r + pm.color.g + pm.color.b > 1e-4;
      if (!g.visible) return;
      g.updateWorldMatrix(true, false); loc.copy(cam.position); g.worldToLocal(loc); sil.rotation.y = Math.atan2(loc.x, loc.z);
      pl.position.set(g.position.x, 0.0003, g.position.z);
    });
    g.profile = profile; g.height = profile[profile.length - 1][1] * 0.001 + (cross ? 0.0102 : 0); g.radius = Math.max(...profile.map((p) => p[0])) * 0.001; g.pool = pl;
    g.set = (glow, tint = null) => { setLine(lm, gain * glow, tint); setLine(rm, gain * ringGain * glow, tint); bm.uniforms.uColor.value.copy(tint ?? color); bm.uniforms.uRim.value = rim * glow; pm.color.copy(color).multiplyScalar(pool * Math.max(0, glow)); };
    g.setWidth = (w) => { lm.linewidth = w; rm.linewidth = w * 0.72; };
    g.set(1);
    return g;
  }

  /* ------------------------------------------------------------------ rice: glowing grains */
  function grainGeo(ws, hs) {
    const g = new THREE.SphereGeometry(1, ws, hs); g.rotateZ(Math.PI / 2);   // poles on x: the long axis
    const a = 0.00325, b = 0.0009, c = 0.0011, p = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), tp = 1 - 0.2 * x * x * x * x, nx = x / a, ny = y / b, nz = z / c, l = Math.hypot(nx, ny, nz) || 1; p.setXYZ(i, x * a, y * b * tp, z * c * tp); nr.setXYZ(i, nx / l, ny / l, nz / l); }
    return g;
  }
  const geoHi = grainGeo(40, 20), geoLo = grainGeo(10, 7), geoMin = grainGeo(8, 5);
  const GRAIN_FRAG = `uniform vec3 uColor; uniform float uGain; varying vec3 vN; varying vec3 vV; varying float vI;${SCREEN_PARS}
#include <fog_pars_fragment>
void main(){
  float f = abs( dot( normalize( vN ), normalize( vV ) ) );
  vec3 c = uColor * mix( vec3( 1.0, 0.68, 0.36 ), vec3( 1.0 ), smoothstep( 0.1, 0.7, f ) );   // a hot core, a warmer rim
  gl_FragColor = vec4( c * ( uGain * vI * ( 0.4 + 0.6 * f * f ) * screenDim() ), 1.0 );
#include <fog_fragment>
}`;
  const instGeo = (base, attrs, n) => { const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('normal', base.attributes.normal); for (const k in attrs) geo.setAttribute(k, attrs[k]); geo.instanceCount = n; return geo; };

  /**
   * grains(n, {color, gain, detail 'hi' | 'lo'}) -> Mesh of n grains (6.5 x 1.8 x 2.2 mm x scale).
   * .put(i, pos, quat, scale, tLand, bright, seed): rest pose + the time the grain lands (it settles in from just above during uFall seconds before that, growing in, and flashes when it lands; -1e3 = at rest for ever).
   * .commit() after puts, .show(k) first k grains, .u = uniforms (uGain, uFall s, uVel, uAcc, uFlash, uFlashT, uColor).
   */
  function grains(n, { color = C.rice, gain = 2.2, detail = 'lo' } = {}) {
    const aRest = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aQuat = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4), aPar = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    const geo = instGeo(detail === 'hi' ? geoHi : geoLo, { aRest, aQuat, aPar }, n);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...shared, uColor: { value: color.clone() }, uGain: { value: gain }, uFall: { value: 0.18 }, uVel: { value: 0.16 }, uAcc: { value: 0.0 }, uFlash: { value: 2.0 }, uFlashT: { value: 0.3 }, uDrift: { value: 0.02 } },
      vertexShader: `attribute vec3 aRest; attribute vec4 aQuat; attribute vec4 aPar;
uniform float uT, uFall, uVel, uAcc, uFlash, uFlashT, uDrift; varying vec3 vN; varying vec3 vV; varying float vI;${FOG_V}${QROT}
void main(){
  float tau = aPar.y - uT, k = clamp( tau, 0.0, uFall ), sd = aPar.z;
  float vis = ( 1.0 - smoothstep( uFall * 0.45, uFall, tau ) ) * aPar.x;
  float ang = k * ( 9.0 + 14.0 * fract( sd * 7.13 ) ); vec3 ax = normalize( vec3( 0.25, 0.3 + fract( sd * 3.7 ), 0.9 ) ); vec4 qt = vec4( ax * sin( ang * 0.5 ), cos( ang * 0.5 ) );
  vec3 p = qrot( aQuat, qrot( qt, position * vis ) ), n = qrot( aQuat, qrot( qt, normal ) );
  vec3 c = aRest + vec3( ( fract( sd * 13.7 ) - 0.5 ) * uDrift * k, uVel * k - uAcc * k * k, ( fract( sd * 29.3 ) - 0.5 ) * uDrift * k );
  vec4 mvPosition = modelViewMatrix * vec4( c + p, 1.0 ); vN = normalMatrix * n; vV = - mvPosition.xyz;
  vI = aPar.w * ( 1.0 + step( tau, 0.0 ) * uFlash * exp( min( tau, 0.0 ) / uFlashT ) + 0.6 * step( 0.0, tau ) );
  gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
      fragmentShader: GRAIN_FRAG, fog: true,
    });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.n = n; m.u = mat.uniforms;
    m.put = (i, pos, quat, scale = 1, tLand = -1e3, bright = 1, seed = (i * 0.618034 + 0.137) % 1) => { aRest.setXYZ(i, pos.x, pos.y, pos.z); aQuat.setXYZW(i, quat.x, quat.y, quat.z, quat.w); aPar.setXYZW(i, scale, tLand, seed, bright); };
    m.commit = () => { aRest.needsUpdate = true; aQuat.needsUpdate = true; aPar.needsUpdate = true; };
    m.show = (k) => { geo.instanceCount = Math.max(0, Math.min(n, Math.round(k))); };
    return m;
  }

  /**
   * storm(n, {color, gain, height}) -> Mesh: grains that rise for ever in columns (a pure function of the uniform uT).
   * .put(i, x, z, tBirth, speed, seed, scale): the column foot, when it starts, how fast it climbs. .commit().
   * .u: uT (set it), uH (height of the volume: a grain that reaches it starts again at the floor), uSpread (the column widens with height), uSway, uFill (0..1 share of the grains shown),
   * uCap (grains above this height are hidden: a wall that grows), uScale, uGain, uNear (x, y: grains shrink away between these distances from the lens).
   */
  function storm(n, { color = C.rice, gain = 1.2, height = 0.7 } = {}) {
    const aBase = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aPar = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    const geo = instGeo(geoMin, { aBase, aPar }, n);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uRes: shared.uRes, uBand: shared.uBand, uHole: shared.uHole, uHoleAmt: shared.uHoleAmt, uT: { value: 0 }, uColor: { value: color.clone() }, uGain: { value: gain }, uH: { value: height }, uSpread: { value: 0.18 }, uSway: { value: 0.012 }, uFill: { value: 1 }, uCap: { value: 1e3 }, uScale: { value: 1 }, uNear: { value: new THREE.Vector2(0, 0.001) } },
      vertexShader: `attribute vec3 aBase; attribute vec4 aPar;
uniform float uT, uH, uSpread, uSway, uFill, uCap, uScale; uniform vec2 uNear; varying vec3 vN; varying vec3 vV; varying float vI;${FOG_V}${QROT}
void main(){
  float age = uT - aBase.z, sd = aPar.y, y = mod( aPar.x * age, uH );
  float on = step( 0.0, age ) * step( sd, uFill ) * step( y, uCap );
  float a = sd * 61.7;
  vec3 c = vec3( aBase.x + cos( a ) * uSpread * y * fract( sd * 5.3 ) + uSway * sin( age * ( 1.3 + 2.0 * sd ) + sd * 40.0 ), y, aBase.y + sin( a ) * uSpread * y * fract( sd * 5.3 ) + uSway * cos( age * ( 1.1 + 1.7 * fract( sd * 7.0 ) ) + sd * 23.0 ) );
  float ang = sd * 50.0 + age * ( 1.5 + 3.0 * fract( sd * 9.1 ) ); vec3 ax = normalize( vec3( fract( sd * 3.3 ) - 0.5, fract( sd * 5.7 ) - 0.5, fract( sd * 8.9 ) - 0.5 ) + 1e-3 ); vec4 q = vec4( ax * sin( ang * 0.5 ), cos( ang * 0.5 ) );
  vec4 mc = modelViewMatrix * vec4( c, 1.0 ); on *= smoothstep( uNear.x, uNear.y, - mc.z );
  vec3 p = qrot( q, position * ( aPar.z * uScale * on ) ), n = qrot( q, normal );
  vec4 mvPosition = modelViewMatrix * vec4( c + p, 1.0 ); vN = normalMatrix * n; vV = - mvPosition.xyz;
  vI = smoothstep( 0.0, 0.012, y ) * ( 1.0 - smoothstep( uH * 0.88, uH, y ) ) * ( 1.0 - smoothstep( uCap * 0.9, uCap, y ) * step( uCap, 100.0 ) ) * ( 0.65 + 0.7 * fract( sd * 17.0 ) );
  gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
      fragmentShader: GRAIN_FRAG, fog: true,
    });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.n = n; m.u = mat.uniforms;
    m.put = (i, x, z, tBirth, speed, seed, scale = 1) => { aBase.setXYZ(i, x, z, tBirth); aPar.setXYZW(i, speed, seed, scale, 0); };
    m.commit = () => { aBase.needsUpdate = true; aPar.needsUpdate = true; };
    return m;
  }

  /* ------------------------------------------------------------------ money: stacked rings */
  /**
   * stack(n, {color, radius, pitch, width, gain}) -> Group: n rings on top of each other (a stack of coins or chips drawn in light). .show(k): k rings stand
   * (a fraction = the next one is falling in), .height, .set(glow).
   */
  function stack(n, { color = C.gold, radius = 0.0135, pitch = 0.002, width = 2.2, gain = 2.4, seg = 40 } = {}) {
    const g = new THREE.Group(), f = [];
    for (let k = 0; k < n; k++) circle(f, radius, (k + 0.5) * pitch, seg);
    const lm = lineMat(color, width, gain), geo = new LineSegmentsGeometry().setPositions(f), rings = new LineSegments2(geo, lm); rings.frustumCulled = false; g.add(rings);
    const bm = bodyMat(color, 0.25), body = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, 1, 40).translate(0, 0.5, 0), bm); g.add(body);
    const tm = lineMat(color, width, gain * 0.6), top = polyline(loop(radius * 0.62, 0), tm); g.add(top);
    const dm = lineMat(color, width, gain * 1.4), drop = polyline(loop(radius, 0), dm); g.add(drop);
    g.n = n; g.height = n * pitch; g.radius = radius;
    g.show = (kf) => {
      const v = clamp(kf, 0, n), k = Math.floor(v + 1e-6), fr = v - k;
      geo.instanceCount = k * seg; rings.visible = k > 0; body.visible = k > 0; body.scale.y = Math.max(1e-5, k * pitch); top.visible = k > 0; top.position.y = k * pitch + 0.0002;
      drop.visible = fr > 1e-3 && k < n; drop.position.y = (k + 0.5) * pitch + (1 - fr) * 0.03;
    };
    g.set = (glow) => { setLine(lm, gain * glow); setLine(tm, gain * 0.6 * glow); setLine(dm, gain * 1.4 * glow); bm.uniforms.uRim.value = 0.25 * glow; };
    g.show(n);
    return g;
  }

  /** coin({color}) -> Group: one coin as two rims and a ring on each face (origin = centre of the lower face). .radius, .thick, .set(glow) */
  function coin({ color = C.gold, radius = 0.0135, thick = 0.002, width = 3, gain = 3 } = {}) {
    const g = new THREE.Group(), f = []; circle(f, radius, 0, 56); circle(f, radius, thick, 56);
    const lm = lineMat(color, width, gain), im = lineMat(color, width * 0.75, gain * 0.55), fi = []; circle(fi, radius * 0.66, -0.00005, 48); circle(fi, radius * 0.66, thick + 0.00005, 48);
    g.add(segments(f, lm), segments(fi, im));
    const bm = bodyMat(color, 0.3); g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, thick * 0.9, 48).translate(0, thick / 2, 0), bm));
    g.radius = radius; g.thick = thick;
    g.set = (glow) => { setLine(lm, gain * glow); setLine(im, gain * 0.55 * glow); bm.uniforms.uRim.value = 0.3 * glow; };
    return g;
  }

  /** card({color}) -> Group: a blank card lying flat (85.6 x 54 mm, long side on x), outline + a blank chip; no logo, no numbers. Origin = centre. */
  function card({ color = C.red, width = 3, gain = 1.6, w = 0.0856, h = 0.054 } = {}) {
    const g = new THREE.Group(), rr = (cx, cz, ww, hh, r, y) => { const f = [], n = 8; const cs = [[cx + ww / 2 - r, cz + hh / 2 - r, 0], [cx - ww / 2 + r, cz + hh / 2 - r, 1], [cx - ww / 2 + r, cz - hh / 2 + r, 2], [cx + ww / 2 - r, cz - hh / 2 + r, 3]]; for (const [x, z, q] of cs) for (let i = 0; i <= n; i++) { const a = (q + i / n) * Math.PI / 2; f.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r); } f.push(f[0], f[1], f[2]); return f; };
    const lm = lineMat(color, width, gain), cm = lineMat(color, width * 0.7, gain * 0.6);
    g.add(polyline(rr(0, 0, w, h, 0.0035, 0.0012), lm), polyline(rr(-w * 0.27, -h * 0.02, 0.0125, 0.0098, 0.0018, 0.0013), cm));
    const body = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.97, h * 0.96).rotateX(-Math.PI / 2).translate(0, 0.0008, 0), bodyMat(color, 0)); g.add(body);
    g.set = (glow) => { setLine(lm, gain * glow); setLine(cm, gain * 0.6 * glow); };
    return g;
  }

  /* ------------------------------------------------------------------ cups, paper, paper tower (2026-11-17) */
  /** cup({color, width, gain, rim, pool}) -> Group: an upturned cup (kit.cup outline, 45 mm), mouth on the board, origin = rim centre. kit.liftCup works on it. */
  function cup({ color = C.white, width = 3.2, gain = 2.4, rim = 0.4, pool = 0, ...o } = {}) {
    return piece(CUP_OUTER, { color, width, gain, rim, pool, rings: [[0.3, 21.0], [0.3, 18.2], [43.6, 16.3]], ringGain: 0.6, ...o });
  }
  /** scaleProfile(profileMm, s): a smaller or bigger piece (e.g. piece(scaleProfile(PAWN, 0.72)) = a servant pawn; scale its rings by hand) */
  const scaleProfile = (P, s) => P.map(([r, y]) => [r * s, y * s]);
  /** edges of a unit box standing on y 0 (centred in x, z) */
  const BOX_EDGES = (() => { const f = [], c = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]; for (let i = 0; i < 4; i++) { const [a, b] = c[i], [p, q] = c[(i + 1) % 4]; f.push(a, 0, b, p, 0, q, a, 1, b, p, 1, q, a, 0, b, a, 1, b); } return f; })();
  const ringAt = (f, y) => { const c = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]; for (let i = 0; i < 4; i++) { const [a, b] = c[i], [p, q] = c[(i + 1) % 4]; f.push(a, y, b, p, y, q); } return f; };
  const boxBody = (m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98).translate(0, 0.5, 0), m); return b; };
  /** paper({w, h, thick, color, width, gain}) -> Group: the folding sheet as glowing outlines (same fold rule as kit.paper). .setFolds(k), .set(glow), .size */
  function paper({ w = 0.21, h = 0.297, thick = 0.0001, color = C.white, width = 2.6, gain = 2.2, layerGain = 0.45 } = {}) {
    const g = new THREE.Group(), lm = lineMat(color, width, gain), ly = lineMat(color, width * 0.6, gain * layerGain), bm = bodyMat(color, 0.15);
    const layerRings = []; for (let j = 1; j < 8; j++) layerRings.push(ringAt([], j / 8));
    const mkBox = () => { const b = new THREE.Group(); b.add(segments(BOX_EDGES, lm), boxBody(bm)); b.layers8 = layerRings.map((f) => { const s = segments(f, ly); b.add(s); return s; }); return b; };
    const fixed = mkBox(), pivot = new THREE.Group(), flap = mkBox(); pivot.add(flap); g.add(fixed, pivot);
    const showLayers = (b, L, T) => { b.layers8.forEach((s, j) => { s.visible = L >= 2 && (L >= 8 || (j + 1) % (8 / L) === 0) && T > 0.0006; }); };
    g.setFolds = (k) => {
      const s = foldState(w, h, thick, k), T = Math.max(s.T, 0.00005);
      if (s.f < 1e-4) { fixed.scale.set(s.x, T, s.z); fixed.position.set(0, 0.00005, 0); pivot.visible = false; showLayers(fixed, s.layers, T); g.size = { x: s.x, y: T, z: s.z }; return g; }
      pivot.visible = true; const th = Math.PI * K.smooth(s.f), sh = K.smooth(s.f);
      showLayers(fixed, s.layers, T); showLayers(flap, s.layers, T);
      if (s.axis === 'x') { const L = s.x, d = L / 4 * sh; fixed.scale.set(L / 2, T, s.z); fixed.position.set(-L / 4 + d, 0.00005, 0); pivot.position.set(d, T + 0.00005, 0); pivot.rotation.set(0, 0, th); flap.scale.set(L / 2, T, s.z); flap.position.set(L / 4, -T, 0); }
      else { const L = s.z, d = L / 4 * sh; fixed.scale.set(s.x, T, L / 2); fixed.position.set(0, 0.00005, -L / 4 + d); pivot.position.set(0, T + 0.00005, d); pivot.rotation.set(-th, 0, 0); flap.scale.set(s.x, T, L / 2); flap.position.set(0, -T, L / 4); }
      g.size = { x: s.x, y: 2 * T, z: s.z }; return g;
    };
    g.set = (glow) => { setLine(lm, gain * glow); setLine(ly, gain * layerGain * glow); bm.uniforms.uRim.value = 0.15 * glow; };
    g.setFolds(0);
    return g;
  }
  /**
   * tower({w, d, color, width, gain}) -> Group: a paper tower as a glowing box with sheet bands on it. .setHeight(hm) any height (bands keep 12-24 on screen:
   * their spacing doubles smoothly as it grows), .set(glow), .height.
   */
  function tower({ w = 0.03, d = 0.021, color = C.white, width = 2.8, gain = 2.4, bandGain = 0.4 } = {}) {
    const g = new THREE.Group(), lm = lineMat(color, width, gain), ev = lineMat(color, width * 0.6, gain * bandGain), od = lineMat(color, width * 0.6, gain * bandGain), bm = bodyMat(color, 0.2);
    const box = new THREE.Group(); box.add(segments(BOX_EDGES, lm), boxBody(bm)); g.add(box);
    const fe = [], fo = []; for (let k = 1; k <= 48; k++) ringAt(k % 2 ? fo : fe, k);
    const bands = new THREE.Group(), se = segments(fe, ev), so = segments(fo, od); bands.add(se, so); g.add(bands);
    let glow = 1;
    g.setHeight = (hm) => {
      hm = Math.max(1e-5, hm); g.height = hm; box.scale.set(w, hm, d);
      const lv = Math.log2(hm / 12), sp = 2 ** Math.floor(lv), fr = lv - Math.floor(lv), n = Math.min(48, Math.floor(hm / sp - 1e-6));
      bands.scale.set(w, sp, d); se.geometry.instanceCount = Math.floor(n / 2) * 4; so.geometry.instanceCount = Math.ceil(n / 2) * 4;
      setLine(ev, gain * bandGain * glow); setLine(od, gain * bandGain * glow * (1 - fr)); return g;
    };
    g.set = (gl) => { glow = gl; setLine(lm, gain * gl); bm.uniforms.uRim.value = 0.2 * gl; g.setHeight(g.height ?? 0.001); };
    g.setHeight(0.001);
    return g;
  }

  return { C, shared, SQ, KING, PAWN, CUP_OUTER, grid, piece, grains, storm, stack, coin, card, cup, paper, tower, scaleProfile, lineMat, setLine, polyline, segments };
}
