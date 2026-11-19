// Fair Game, NEON view (Brass Parable, expl-261115-1yab): draws any state(t) of show.js (docs/brands/test-3d/fair-game/STATE.md)
// as glowing line art on black. White = the grid and ordinary players, gold = money and the king, red = chips / loss, the four
// roles in their colours, the Skeptic = a dark body with a thin cold outline. Brightness tells the story: lit = the square and the
// tower flare, dim = de-emphasised, down = dark.
// makeView(K, show) -> { draw(state, t), objects, camera }. draw() is a pure function of (state, t): nothing survives between calls.
// Everything that repeats is instanced (pawns, discs, chips, column bodies): one draw call per kind, so 17 draws an output frame stay cheap.
import * as THREE from 'three';
import { makeNeon } from '../kit/neon.js';
import { tower, SEAT, COIN } from './game.js';

const SQ = 0.055, HALF = 4 * SQ, PAWN_H = 0.0504, PAWN_R = 0.0136, KING_H = 0.0858;
const CHIP = { radius: 0.0150, thick: 0.0033 }, BIG = { radius: 0.034, thick: 0.0056 };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x), lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10007) / 10007; };
const bx = (f) => (f - 4.5) * SQ, bz = (r) => (4.5 - r) * SQ;

/* ------------------------------------------------------------------ colours (linear HDR, about unit brightness; gains on top) */
const col = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const HUE = {
  white: col(0.92, 0.95, 1.0), gold: col(1.0, 0.6, 0.15), red: col(1.0, 0.1, 0.07), dead: col(0.42, 0.4, 0.38),
  scholar: col(0.22, 0.52, 1.0), worker: col(1.0, 0.42, 0.06), heir: col(1.0, 0.82, 0.32), fool: col(0.18, 1.0, 0.42), skeptic: col(0.5, 0.72, 1.0),
  good: col(1.0, 0.72, 0.2), bad: col(1.0, 0.16, 0.1), level: col(1.0, 0.78, 0.45),
};
const ROLE_GAIN = { scholar: 2.0, worker: 1.7, heir: 1.25, fool: 1.25 };
const HAT_SCALE = { scholar: 1.55, worker: 1.5, heir: 1.85, fool: 1.45 }, HAT_H = { scholar: 0.004, worker: 0.0075, heir: 0.0095, fool: 0.025 };   // hat size x, hat top above the head (m)
const END_BAND = [0.012, 0.245], END_FREE = 0.265;   // the closing text (film.json end_text_y -37.5): 2-23 % of the height + margin; pieces start below END_FREE
const KIND_GROUP ={ wide: 'far', high: 'far', top: 'far', low: 'far', skeptic: 'far', row: 'far' };
/** tag text colours (sRGB css) per colorKey */
const TAG_CSS = { null: '#F4F1EA', gold: '#FFC94A', good: '#FFC94A', red: '#FF5A4A', bad: '#FF5A4A', scholar: '#7DB2FF', worker: '#FF9A3C', heir: '#FFE07A', fool: '#5CFF8E', skeptic: '#BFD8FF' };

/* ------------------------------------------------------------------ shaders: instanced fat lines and instanced dark bodies */
const QROT = 'vec3 qrot( vec4 q, vec3 v ){ return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }';
const LINE_VS = `attribute vec3 aA; attribute vec3 aB; attribute vec2 aS; attribute float aBill;
attribute vec4 iPos; attribute vec4 iQuat; attribute vec4 iCol; attribute vec4 iCol2;
uniform vec2 uRes; uniform float uWidth; uniform vec2 uFog; uniform float uH;
varying vec3 vCol; varying float vFog;
${QROT}
vec3 place( vec3 p, float c, float s ){ if ( aBill > 0.5 ) p = vec3( p.x * c + p.z * s, p.y, - p.x * s + p.z * c ); return iPos.xyz + qrot( iQuat, p * iPos.w ); }
void main(){
  if ( iCol.w <= 0.0 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); vCol = vec3( 0.0 ); vFog = 0.0; return; }
  vec3 camL = qrot( vec4( - iQuat.xyz, iQuat.w ), cameraPosition - iPos.xyz );
  float ph = atan( camL.x, camL.z ), c = cos( ph ), s = sin( ph );
  vec4 ca = projectionMatrix * viewMatrix * vec4( place( aA, c, s ), 1.0 ), cb = projectionMatrix * viewMatrix * vec4( place( aB, c, s ), 1.0 );
  vec2 h = uRes * 0.5, sa = ca.xy / ca.w * h, sb = cb.xy / cb.w * h, d = sb - sa; float L = length( d ); d = L > 1e-4 ? d / L : vec2( 1.0, 0.0 );
  vec2 n = vec2( - d.y, d.x ); float w = uWidth * iCol.w;
  vec4 cc = aS.y < 0.5 ? ca : cb;
  cc.xy += ( n * aS.x + d * ( aS.y * 2.0 - 1.0 ) ) * w * 0.5 / h * cc.w;
  gl_Position = cc;
  float y = mix( aA.y, aB.y, aS.y ) / uH, sw = iCol2.w;
  vCol = mix( iCol.rgb, iCol2.rgb, sw <= 0.0 ? 0.0 : smoothstep( 1.0 - sw - 0.06, 1.0 - sw + 0.001, y ) );
  vFog = 1.0 - smoothstep( uFog.x, uFog.y, cc.w );
}`;
const BAND_FS = `uniform vec2 uRes; uniform vec3 uBand;
float band(){ float yt = 1.0 - gl_FragCoord.y / uRes.y; return 1.0 - uBand.z * smoothstep( uBand.x - 0.025, uBand.x, yt ) * ( 1.0 - smoothstep( uBand.y, uBand.y + 0.025, yt ) ); }`;
const LINE_FS = `varying vec3 vCol; varying float vFog;${BAND_FS}
void main(){ gl_FragColor = vec4( vCol * vFog * band(), 1.0 ); }`;
const BODY_VS = `attribute vec4 iPos; attribute vec4 iQuat; attribute vec4 iCol; attribute vec4 iRim; attribute vec4 iAux;
uniform vec2 uFog; uniform float uYS; varying vec3 vN; varying vec3 vV; varying vec3 vRim; varying float vFog; varying float vPow;
${QROT}
void main(){
  if ( iRim.w <= 0.0 || iAux.x <= 0.002 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); vRim = vec3( 0.0 ); return; }
  float sy = uYS > 0.5 ? iCol.w : iPos.w, sx = iPos.w * iAux.x;   // iAux.x < 1 = the black core shrinks to its axis while the piece fades out
  vec3 p = vec3( position.x * sx, position.y * sy, position.z * sx ), w = iPos.xyz + qrot( iQuat, p );
  vec4 mv = viewMatrix * vec4( w, 1.0 );
  vN = normalize( mat3( viewMatrix ) * qrot( iQuat, normal ) ); vV = - mv.xyz; vRim = iRim.rgb; vPow = iRim.w;
  gl_Position = projectionMatrix * mv; vFog = 1.0 - smoothstep( uFog.x, uFog.y, - mv.z );
}`;
const BODY_FS = `varying vec3 vN; varying vec3 vV; varying vec3 vRim; varying float vFog; varying float vPow;${BAND_FS}
void main(){ float f = pow( 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) ), vPow ); gl_FragColor = vec4( vRim * f * vFog * band(), 1.0 ); }`;

export async function makeView(K, show = null) {
  const N = makeNeon(K), { scene } = K;
  scene.background = null; scene.fog = new THREE.Fog(0x000000, 1, 4);
  const RES = V(K.W, K.H), PX = K.H / 1080;   // line widths are given in px at 1080p
  let DRY = false;   // the bounds-only pass: entities are computed, nothing is written to the GPU buffers
  const shared = { uRes: { value: new THREE.Vector2(K.W, K.H) }, uFog: { value: new THREE.Vector2(1, 4) }, uBand: { value: new THREE.Vector3(0.74, 0.88, 0.3) } };

  /* ---------------------------------------------------------------- instanced sets */
  function lineGeo(segs) {
    const n = segs.length, A = new Float32Array(n * 12), B = new Float32Array(n * 12), S = new Float32Array(n * 8), BL = new Float32Array(n * 4), idx = new Uint32Array(n * 6);
    segs.forEach((s, i) => { for (let k = 0; k < 4; k++) { const o = i * 4 + k; A.set([s[0], s[1], s[2]], o * 3); B.set([s[3], s[4], s[5]], o * 3); S.set([k % 2 ? 1 : -1, k < 2 ? 0 : 1], o * 2); BL[o] = s[6] ?? 0; } idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6); });
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(A, 3)); g.setAttribute('aA', new THREE.BufferAttribute(A, 3)); g.setAttribute('aB', new THREE.BufferAttribute(B, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(S, 2)); g.setAttribute('aBill', new THREE.BufferAttribute(BL, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }
  const instAttrs = (cap, names) => Object.fromEntries(names.map((k) => [k, new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage)]));
  /**
   * set(segs, cap, {width, height, body}) -> one instanced line mesh (+ an optional instanced dark body sharing the instance data).
   * .put(pos, scale, quat, color, gain, widthMul, color2?, sweep?, rim?, rimPow?, ySc?) appends one instance; .begin() / .end() per draw.
   */
  function set(segs, cap, { width = 2, height = 1, body = null, order = 0 } = {}) {
    const geo = lineGeo(segs), at = instAttrs(cap, ['iPos', 'iQuat', 'iCol', 'iCol2', 'iRim', 'iAux']);
    for (const k of ['iPos', 'iQuat', 'iCol', 'iCol2']) geo.setAttribute(k, at[k]);
    const mat = new THREE.ShaderMaterial({ uniforms: { ...shared, uWidth: { value: width * PX }, uH: { value: height } }, vertexShader: LINE_VS, fragmentShader: LINE_FS, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = order; scene.add(mesh);
    let bmesh = null;
    if (body) {
      const bg = new THREE.InstancedBufferGeometry(); bg.index = body.index; bg.setAttribute('position', body.attributes.position); bg.setAttribute('normal', body.attributes.normal);
      for (const k of ['iPos', 'iQuat', 'iCol', 'iRim', 'iAux']) bg.setAttribute(k, at[k]);
      const bm = new THREE.ShaderMaterial({ uniforms: { ...shared, uYS: { value: 0 } }, vertexShader: BODY_VS, fragmentShader: BODY_FS, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 3 });
      bmesh = new THREE.Mesh(bg, bm); bmesh.frustumCulled = false; bmesh.renderOrder = order - 1; scene.add(bmesh);
    }
    let n = 0;
    const s = {
      mesh, bmesh, cap, get n() { return n; },
      begin() { n = 0; },
      put(p, sc, q, c, gain, wm = 1, c2 = null, sweep = 0, rim = null, rimPow = 2.6, bodyK = 1) {
        // nothing at all when the lines are off: an invisible piece must not leave its black core behind (the l59 "black holes")
        if (DRY || n >= cap || !(gain > 0.0005)) return -1;
        at.iPos.setXYZW(n, p.x, p.y, p.z, sc); at.iQuat.setXYZW(n, q.x, q.y, q.z, q.w); at.iAux.setXYZW(n, bodyK, 0, 0, 0);
        at.iCol.setXYZW(n, c.r * gain, c.g * gain, c.b * gain, gain > 0.0005 ? wm : 0);
        if (c2) at.iCol2.setXYZW(n, c2.r * gain, c2.g * gain, c2.b * gain, sweep); else at.iCol2.setXYZW(n, 0, 0, 0, 0);
        if (rim) at.iRim.setXYZW(n, rim.r, rim.g, rim.b, rimPow); else at.iRim.setXYZW(n, 0, 0, 0, 0);
        return n++;
      },
      end() {
        geo.instanceCount = n; if (bmesh) bmesh.geometry.instanceCount = n;
        for (const k in at) { at[k].needsUpdate = true; at[k].clearUpdateRanges(); at[k].addUpdateRange(0, Math.max(1, n) * 4); }
      },
    };
    return s;
  }
  /** bodies with their own non-uniform height (tower columns, chip columns, the big coin): unit cylinder 0..1 high, radius 1 */
  function bodySet(cap, geoBody) {
    const at = instAttrs(cap, ['iPos', 'iQuat', 'iCol', 'iRim', 'iAux']), bg = new THREE.InstancedBufferGeometry();
    bg.index = geoBody.index; bg.setAttribute('position', geoBody.attributes.position); bg.setAttribute('normal', geoBody.attributes.normal);
    for (const k in at) bg.setAttribute(k, at[k]);
    const bm = new THREE.ShaderMaterial({ uniforms: { ...shared, uYS: { value: 1 } }, vertexShader: BODY_VS, fragmentShader: BODY_FS, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 3 });
    const mesh = new THREE.Mesh(bg, bm); mesh.frustumCulled = false; mesh.renderOrder = -1; scene.add(mesh);
    let n = 0;
    return {
      mesh, begin() { n = 0; },
      put(p, radius, height, q, rim, rimPow = 2.6) { if (DRY || n >= cap || height <= 1e-6 || radius <= 1e-5) return; at.iPos.setXYZW(n, p.x, p.y, p.z, radius); at.iAux.setXYZW(n, 1, 0, 0, 0); at.iQuat.setXYZW(n, q.x, q.y, q.z, q.w); at.iCol.setXYZW(n, 0, 0, 0, height); at.iRim.setXYZW(n, rim.r, rim.g, rim.b, rimPow); n++; },
      end() { bg.instanceCount = n; for (const k in at) { at[k].needsUpdate = true; at[k].clearUpdateRanges(); at[k].addUpdateRange(0, Math.max(1, n) * 4); } },
    };
  }

  /* ---------------------------------------------------------------- geometry (mm profiles from the neon kit) */
  const profilePts = (profile, n) => { const c = new THREE.CatmullRomCurve3(profile.map(([r, y]) => V(r * 0.001, y * 0.001, 0)), false, 'centripetal'); return c.getSpacedPoints(n); };
  const circleSegs = (out, r, y, n = 36, cx = 0, cz = 0, bill = 0) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; out.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, cx + Math.cos(b) * r, y, cz + Math.sin(b) * r, bill]); } return out; };
  const polySegs = (out, pts, bill = 1, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push([a[0], a[1], a[2] ?? 0, b[0], b[1], b[2] ?? 0, bill]); } return out; };
  function silhouette(profile, n = 110) {   // the turned outline, drawn in its own plane and turned to the camera about the piece's axis
    const pts = profilePts(profile, n), r0 = profile[1][0] * 0.001 * 0.99; let i0 = pts.findIndex((p) => p.x >= r0); if (i0 < 0) i0 = 1;
    const side = pts.slice(i0).map((p) => [Math.max(0, p.x), p.y]), out = [], L = [];
    for (let i = 0; i < side.length; i++) L.push([-side[i][0], side[i][1], 0]);
    for (let i = side.length - 2; i >= 0; i--) L.push([side[i][0], side[i][1], 0]);
    return polySegs(out, L, 1);
  }
  function lathe(profile, n = 44, seg = 28) { const pts = profilePts(profile, n).map((p) => new THREE.Vector2(Math.max(0, p.x) * 0.95, p.y)); pts[0].x = 0; pts[pts.length - 1].x = 0; return new THREE.LatheGeometry(pts, seg); }

  // pawn: outline + three true rings (base, collar)
  const pawnSegs = silhouette(N.PAWN); for (const [y, r] of [[1.8, 13.6], [6.8, 10.9], [31, 8.5]]) circleSegs(pawnSegs, r * 0.001, y * 0.001, 40);
  const pawns = set(pawnSegs, 160, { width: 2.6, height: PAWN_H, body: lathe(N.PAWN), order: 2 });
  // king: outline + cross + rings
  const kingSegs = silhouette(N.KING, 150); for (const [y, r] of [[2.2, 19.6], [10.4, 16.6], [55.4, 10.9], [60.2, 9.0], [76.8, 10.8]]) circleSegs(kingSegs, r * 0.001, y * 0.001, 44);
  const crossSegs = []; { const C = [[-1.3, 0], [1.3, 0], [1.1, 4.1], [4, 3.8], [4.1, 6.8], [1.1, 6.5], [1.5, 10.4], [-1.5, 10.4], [-1.1, 6.5], [-4.1, 6.8], [-4, 3.8], [-1.1, 4.1]], s = 1.45; polySegs(crossSegs, C.map(([x, y]) => [x * s * 0.001, 0.0851 + y * s * 0.001, 0]), 1, true); }
  const kings = set(kingSegs, 2, { width: 3.4, height: KING_H, body: lathe(N.KING, 60), order: 2 }), crosses = set(crossSegs, 2, { width: 3.2, height: 0.1, order: 2 });
  // hats (pawn-local metres; the pawn's head top is at 50.4 mm)
  const mm = (a) => a.map(([x, y, z]) => [x * 0.001, y * 0.001, (z ?? 0) * 0.001]);
  const hatGeo = {
    scholar: (() => { const o = []; const s = 12.5, y = 51.6; polySegs(o, mm([[-s, y, 0], [0, y, -s], [s, y, 0], [0, y, s]]), 0, true); polySegs(o, mm([[-s, y + 0.9, 0], [0, y + 0.9, -s], [s, y + 0.9, 0], [0, y + 0.9, s]]), 0, true);
      circleSegs(o, 0.0068, 0.0478, 28); circleSegs(o, 0.0072, 0.0512, 28); polySegs(o, mm([[0, y + 1, 0], [9, y + 0.5, 6], [10.5, y - 7, 7.5]]), 0); circleSegs(o, 0.0013, (y - 7.6) * 0.001, 10, 0.0105, 0.0075); return o; })(),
    worker: (() => { const o = []; circleSegs(o, 0.0128, 0.0462, 36); circleSegs(o, 0.0094, 0.0478, 30); const d = []; for (let i = 0; i <= 20; i++) { const a = Math.PI * i / 20; d.push([Math.cos(a) * 9.4, 47.8 + Math.sin(a) * 9.6, 0]); } polySegs(o, mm(d), 1); polySegs(o, mm([[0, 57.4, 0], [0, 57.4, 0.01]]), 1);
      const r = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; r.push([0, 47.8 + Math.sin(a) * 9.6, Math.cos(a) * 9.4]); } polySegs(o, mm(r), 0); return o; })(),
    heir: (() => { const o = []; circleSegs(o, 0.0074, 0.0488, 30); circleSegs(o, 0.0076, 0.0518, 30); const z = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2, up = i % 2 === 0; z.push([Math.cos(a) * (up ? 8.4 : 7.6), up ? 58.6 : 51.8, Math.sin(a) * (up ? 8.4 : 7.6)]); } polySegs(o, mm(z), 0);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circleSegs(o, 0.0011, 0.0596, 8, Math.cos(a) * 0.0084, Math.sin(a) * 0.0084); } return o; })(),
    fool: (() => { const o = []; circleSegs(o, 0.0084, 0.0468, 32); polySegs(o, mm([[-8.4, 46.8, 0], [-1.2, 66, 0], [1.6, 74.5, 0], [3.6, 72.2, 0], [1.4, 66, 0], [8.4, 46.8, 0]]), 1); circleSegs(o, 0.0021, 0.0745, 12, 0.0016, 0); return o; })(),
  };
  // fix2 (QA r2 blocker l11d / l23): hats read at phone size = thicker lines over a FILLED faint body in the role colour (lathe bodies)
  const hatBody = {
    scholar: [[0, 47.6], [6.9, 47.6], [7.1, 51.2], [9.6, 51.4], [9.6, 52.6], [0, 52.7]],
    worker: [[0, 46.0], [12.6, 46.1], [12.6, 47.6], [9.3, 47.9], [8.9, 51.5], [7.0, 55.0], [4.0, 57.0], [0, 57.4]],
    heir: [[0, 48.6], [7.4, 48.6], [8.2, 58.4], [5.5, 57.6], [0, 53.5]],
    fool: [[0, 46.6], [8.3, 46.7], [5.0, 55.0], [2.2, 63.0], [0.6, 71.0], [0, 73.0]],
  };
  const hats = Object.fromEntries(Object.entries(hatGeo).map(([k, g]) => [k, set(g, 8, { width: 3.6, height: 0.08, order: 3, body: lathe(hatBody[k], 40, 28) })]));
  // discs, chips, rain, ghosts, dust: one unit ring (radius 1) in the xz plane
  const rings = set(circleSegs([], 1, 0, 36), 12000, { width: 1.7, height: 1, order: 1 });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 22, 1, false).translate(0, 0.5, 0), columns = bodySet(3200, cyl);
  // the flip coin (origin = its centre): two rims, inner rings, a crown on the heads face, knurl marks on the edge
  const coinSegs = []; { const R = BIG.radius, h = BIG.thick / 2; circleSegs(coinSegs, R, h, 56); circleSegs(coinSegs, R, -h, 56); circleSegs(coinSegs, R * 0.8, h + 0.0001, 48); circleSegs(coinSegs, R * 0.8, -h - 0.0001, 48);
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; coinSegs.push([Math.cos(a) * R, -h, Math.sin(a) * R, Math.cos(a) * R, h, Math.sin(a) * R, 0]); } }
  const bigCoins = set(coinSegs, 4, { width: 3.0, height: 1, order: 2 });
  // the flip coin's FILLED faces (QA r1: "a thin ring you can't recognise"): heads = a gold face with a big dark crown emblem, tails = plain
  // gold with a ring; a shaded edge. Unit cylinder (radius 1, height 1, centred), scaled per frame; HDR colour below the bloom threshold
  // in the middle so the face reads as a face, the rim lines above it glow.
  function faceTex(crown) {
    const S = 512, c = K.makeCanvas(S, S), x = c.getContext('2d');
    const gr = x.createRadialGradient(S * 0.38, S * 0.34, S * 0.05, S / 2, S / 2, S / 2); gr.addColorStop(0, '#fff1b8'); gr.addColorStop(0.55, '#e9a83a'); gr.addColorStop(1, '#8a5210');
    x.fillStyle = gr; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill();
    x.lineWidth = S * 0.035; x.strokeStyle = '#5a3206'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2); x.stroke();
    x.lineWidth = S * 0.012; x.strokeStyle = '#ffe9a6'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.43, 0, Math.PI * 2); x.stroke();
    if (crown) {   // a crown: band + three points with balls, dark on gold with a bright edge (seen from above the coin's +y face; x right, canvas y = -z)
      const P = [[-0.27, 0.14], [0.27, 0.14], [0.31, -0.13], [0.15, 0.0], [0, -0.2], [-0.15, 0.0], [-0.31, -0.13]].map(([u, v]) => [S / 2 + u * S, S / 2 + v * S]);
      x.beginPath(); P.forEach(([u, v], i) => (i ? x.lineTo(u, v) : x.moveTo(u, v))); x.closePath(); x.fillStyle = '#4a2a05'; x.fill(); x.lineWidth = S * 0.018; x.strokeStyle = '#fff3c4'; x.stroke();
      x.fillRect(S / 2 - 0.27 * S, S / 2 + 0.17 * S, 0.54 * S, 0.06 * S); x.strokeRect(S / 2 - 0.27 * S, S / 2 + 0.17 * S, 0.54 * S, 0.06 * S);
      for (const [u, v] of [[-0.31, -0.13], [0, -0.2], [0.31, -0.13]]) { x.beginPath(); x.arc(S / 2 + u * S, S / 2 + v * S - S * 0.035, S * 0.035, 0, Math.PI * 2); x.fillStyle = '#4a2a05'; x.fill(); x.stroke(); }
    } else { x.lineWidth = S * 0.02; x.strokeStyle = '#5a3206'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.16, 0, Math.PI * 2); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return t;
  }
  const faceMat = (map, k) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k), toneMapped: false, fog: false });
  const coinFaces = Array.from({ length: 2 }, () => {
    const mats = [faceMat(null, 0), faceMat(faceTex(true), 1), faceMat(faceTex(false), 1)]; mats[0].color.setRGB(0.55, 0.3, 0.05);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 56, 1, false), mats); m.frustumCulled = false; m.visible = false; m.renderOrder = 1; scene.add(m);
    m.userData.set = (k) => { mats[1].color.setScalar(0.62 * k); mats[2].color.setScalar(0.5 * k); mats[0].color.setRGB(0.55 * k, 0.3 * k, 0.05 * k); };
    return m;
  });
  const glints = set([[-1, 0, 0, 1, 0, 0, 1], [0, -1, 0, 0, 1, 0, 1], [-0.35, -0.35, 0, 0.35, 0.35, 0, 1], [-0.35, 0.35, 0, 0.35, -0.35, 0, 1]], 4, { width: 2.4, height: 1, order: 4 });
  // the average plane: a sheet of light with its own grid (built at height 0, raised per frame), and a short vertical tick for the sweep front
  const G = N.grid({ line: 0.13, border: 0.28, width: 2.2 }); scene.add(G);
  const levelGrid = []; for (let i = 0; i <= 8; i++) { const p = -HALF + i * SQ; levelGrid.push(p, 0, 0, p, 0, -1); }
  const lvMatX = N.lineMat(HUE.level, 1.6 * PX, 0.5), lvMatZ = N.lineMat(HUE.level, 1.6 * PX, 0.5), lvEdge = N.lineMat(HUE.level, 3.2 * PX, 2.0);
  const lvLong = N.segments(levelGrid, lvMatZ); const lvCross = []; for (let i = 0; i <= 8; i++) { const l = N.segments([-HALF, 0, 0, HALF, 0, 0], i === 0 ? lvEdge : lvMatX); lvCross.push(l); }
  const lvFront = N.segments([-HALF - 0.01, 0, 0, HALF + 0.01, 0, 0], lvEdge);
  const lvFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false, side: THREE.DoubleSide }));
  const level = new THREE.Group(); level.add(lvLong, ...lvCross, lvFront, lvFill); scene.add(level); lvFill.renderOrder = 5;
  // layers (thin sheets of coins): additive planes, unit square in xz
  const sheetMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false, side: THREE.DoubleSide });
  const sheets = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sheetMat()); m.frustumCulled = false; m.renderOrder = 5; scene.add(m); return m; });
  const sheetEdges = Array.from({ length: 4 }, () => { const l = N.polyline([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, -0.5], N.lineMat(HUE.gold, 2 * PX, 1)); scene.add(l); return l; });
  const floorRing = set(circleSegs([], 1, 0, 40), 4, { width: 1.6, height: 1, order: 1 });   // the Skeptic's spot on the black "table"

  /* ---------------------------------------------------------------- labels: camera-facing overlay cards, one canvas each (redrawn only when the text changes) */
  const FONT = '"Segoe UI Black","Arial Black","Segoe UI",Arial,sans-serif', FPX = 120;
  function label() {
    const canvas = K.makeCanvas(256, 256), tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false,
      blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.frustumCulled = false; m.renderOrder = 100; m.layers.set(1); m.visible = false; scene.add(m);
    let key = '', cw = 1, ch = 1;
    m.setText = (txt, css) => {
      if (key === txt + '|' + css) return; key = txt + '|' + css;
      const x0 = canvas.getContext('2d'); x0.font = `900 ${FPX}px ${FONT}`; const pad = Math.round(FPX * 0.22), w = Math.ceil(x0.measureText(txt).width) + pad * 2, h = Math.round(FPX * 1.0 + pad * 2);
      if (canvas.width < w || canvas.height < h) { canvas.width = Math.max(canvas.width, 2 ** Math.ceil(Math.log2(w))); canvas.height = Math.max(canvas.height, 2 ** Math.ceil(Math.log2(h))); tex.dispose(); }
      const x = canvas.getContext('2d'); x.clearRect(0, 0, canvas.width, canvas.height); x.font = `900 ${FPX}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const cx = w / 2, cy = h / 2 + FPX * 0.05;
      x.lineJoin = 'round'; x.lineWidth = FPX * 0.16; x.strokeStyle = 'rgba(0,0,0,0.95)'; x.shadowColor = 'rgba(0,0,0,0.9)'; x.shadowBlur = FPX * 0.18; x.strokeText(txt, cx, cy);
      x.shadowBlur = 0; x.fillStyle = css; x.fillText(txt, cx, cy);
      cw = w; ch = h; tex.repeat.set(w / canvas.width, h / canvas.height); tex.offset.set(0, 1 - h / canvas.height); tex.needsUpdate = true;
    };
    /** aspect of the card (w / h) and the cap height as a fraction of the card height */
    m.dims = () => ({ aspect: cw / ch, cap: (FPX * 0.72) / ch });
    return m;
  }
  const labels = Array.from({ length: 14 }, label), counterLabel = label(), totalLabel = label(), measure = label();   // measure: never shown, sizes text only
  const cX = V(), cY = V(), cZ = V();
  /** place a card so its centre lands at (sx, sy) (fractions of the frame) with cap height `cap` (fraction of the frame height) */
  function hud(m, sx, sy, cap, opacity) {
    const c = K.camera; c.updateMatrixWorld(); c.matrixWorld.extractBasis(cX, cY, cZ);
    const th = Math.tan(K.lens.fov * Math.PI / 360), d = 0.2, hFrame = 2 * d * th, { aspect, cap: cf } = m.dims(), h = cap * hFrame / cf;
    m.position.copy(c.position).addScaledVector(cZ, -d).addScaledVector(cX, (sx - 0.5) * hFrame * K.W / K.H).addScaledVector(cY, (0.5 - sy) * hFrame);
    m.quaternion.copy(c.quaternion); m.scale.set(h * aspect, h, 1); m.material.opacity = clamp(opacity); m.visible = opacity > 0.003;
  }
  /** size of a card on screen: [w, h] as fractions of the frame width / height */
  const cardSize = (m, cap) => { const { aspect, cap: cf } = m.dims(), h = cap / cf; return [h * aspect * K.H / K.W, h]; };
  const boxSize = (m, cap) => { const [w, h] = cardSize(m, cap); return [w - 0.2 * h * K.H / K.W, h * 0.8]; };
  const CAP = { l: 0.068, m: 0.048, s: 0.033 };
  /** frame check 2026-11-15 (l17): screen tags stacked at the top (two rows ate a quarter of the frame) are packed side by side in ONE row
   * at the highest of their spots when they fit in the middle half of the width. -> Map(tag id -> [sx, sy]) for the packed ones */
  function screenSpots(state) {
    const out = new Map(), S = (state.tags ?? []).filter((g) => (g.opacity ?? 0) > 0.01 && g.anchor?.screen && g.anchor.screen[1] < 0.3);
    if (S.length < 2) return out;
    S.sort((a, b) => a.anchor.screen[1] - b.anchor.screen[1] || a.anchor.screen[0] - b.anchor.screen[0]);
    const ws = S.map((g) => { measure.setText(g.text, '#fff'); return boxSize(measure, CAP[g.size ?? 'm'] * 1.22)[0]; }), GAP = 0.035;
    const total = ws.reduce((a, b) => a + b, 0) + GAP * (S.length - 1); if (total > 0.5) return out;
    const y = S[0].anchor.screen[1]; let x = 0.5 - total / 2;
    S.forEach((g, i) => { out.set(g.id, [x + ws[i] / 2, y]); x += ws[i] + GAP; });
    return out;
  }

  /* ================================================================ OBJECT LAYER */
  const objects = (() => {
    const ent = new Map();   // key -> {x, z, base, top (tower top), head (pawn top), r (tower radius), ...} for anchors and bounds
    const chipTop = new Map(), coinAt = new Map(), moveAt = new Map(); let levelY = 0, rowU = 0;
    let cam = null, focalPx = 1;
    const Q0 = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), tmp = V(), tmp2 = V(), cc = new THREE.Color(), cc2 = new THREE.Color();
    const towerCache = new Map(); const towerOf = (coins, rings) => { const k = Math.round(Math.max(0, coins) * 1000) + '|' + rings; let t = towerCache.get(k); if (!t) { if (towerCache.size > 4000) towerCache.clear(); t = tower(coins, { rings }); towerCache.set(k, t); } return t; };
    const radiusOf = (tw) => { let r = 0; for (const c of tw.columns) r = Math.max(r, Math.hypot(c.dx, c.dz)); return r + COIN.radius; };

    /** world point of an anchor. mode 'move' = tops of towers / columns; 'tag' = just above heads */
    function anchor(a, state, mode = 'tag') {
      if (!a) return V(0, 0, 0);
      const up = (a.y ?? 0) * SQ;
      if (a.player != null || a.extra != null || a.skeptic || a.king) {
        const e = ent.get(a.player != null ? 'p' + a.player : a.extra != null ? 'x' + a.extra : a.skeptic ? 'sk' : 'king');
        if (!e) return V(0, up, 0);
        if (mode === 'base') return V(e.x, 0, e.z);
        return V(e.x, (mode === 'move' ? e.top : e.label) + up, e.z);
      }
      if (a.chips != null) { const c = chipTop.get(a.chips); return c ? V(c.x, c.y + up + (mode === 'tag' ? 0.006 : 0), c.z) : V(0, up, 0); }
      if (a.coin != null) { const c = coinAt.get(a.coin); if (!c) return V(0, up, 0); return c.p.clone(); }
      if (a.move != null) { const m = moveAt.get(a.move); return m ? V(m.x, m.y + (mode === 'tag' ? 0.008 : 0) + up, m.z) : V(0, up, 0); }
      if (a.f != null) return V(bx(a.f), up + (a.level ? levelY : 0), bz(a.r));
      return V(0, up, 0);
    }

    function pawnBox(e, out) {   // a few points that contain a standing (or lying) pawn and its tower (+ its hat)
      // a lying pawn: its (scaled-up) hat lies past the head end and its brim stands up like a disc: a wider, taller box (frame check l63)
      const lying = (e.down ?? 0) > 0.5, r = Math.max(e.r, lying ? (PAWN_H * 1.05 + (e.lyHat ? 0.032 : 0.014)) * (e.sc ?? 1) : 0.016), y1 = lying ? Math.max(e.head + 0.004, (e.top ?? 0) + 0.045 * (e.sc ?? 1)) : e.head + 0.004 + (e.hatH ?? 0);
      out.push(V(e.x - r, 0, e.z - r), V(e.x + r, 0, e.z + r), V(e.x - r, y1, e.z), V(e.x + r, y1, e.z), V(e.x, y1, e.z - r), V(e.x, y1, e.z + r));
      // frame check 2026-11-15 (l63): a LYING pawn fills its whole footprint (it may point at the camera): all four floor corners + a lid,
      // or a low close shot cuts its near end into the caption band
      if (lying) out.push(V(e.x - r, 0, e.z + r), V(e.x + r, 0, e.z - r), V(e.x - r, y1, e.z - r), V(e.x + r, y1, e.z + r), V(e.x - r, y1, e.z + r), V(e.x + r, y1, e.z - r));
    }
    /** world points that must be in frame for a Subject */
    function bounds(sub, state, out = [], cap = 0.2) {
      if (!sub) return out;
      for (const id of sub.players ?? []) { const e = ent.get('p' + id); if (e) pawnBox(e, out); }
      for (const id of sub.extras ?? []) { const e = ent.get('x' + id); if (e) { if (e.rect) { const R = e.rect; out.push(V(R.x0, 0, R.z0), V(R.x1, 0, R.z1), V(R.x0, 0.01, R.z1), V(R.x1, 0.01, R.z0)); } pawnBox(e, out); } }
      for (const id of sub.coins ?? []) { const c = coinAt.get(id); if (c) { const R = (c.R ?? BIG.radius) * 1.15, y0 = c.air ? 0 : c.p.y - R, y1 = c.air ? c.H + R : c.p.y + R; out.push(V(c.base.x - R, y0, c.base.z - R), V(c.base.x + R, y1, c.base.z + R), V(c.base.x + R, y0, c.base.z - R), V(c.base.x - R, y1, c.base.z + R)); } }
      for (const id of sub.chips ?? []) { const c = chipTop.get(id); if (c) { const R = CHIP.radius * 1.4, y1 = Math.max(c.y, c.y0 + 0.1) + 0.004; out.push(V(c.x - R, c.y0, c.z - R), V(c.x + R, c.y0, c.z + R), V(c.x - R, y1, c.z - R), V(c.x + R, y1, c.z + R), V(c.x - R, y1, c.z + R), V(c.x + R, y1, c.z - R)); } }
      for (const id of sub.moves ?? []) { const m = moveAt.get(id); if (m) { const R = COIN.radius * 1.5; out.push(V(m.x - R, m.y0, m.z - R), V(m.x + R, m.y + 0.004, m.z + R)); } }
      if (sub.king) { const e = ent.get('king'); if (e) pawnBox(e, out); }
      if (sub.skeptic) { const e = ent.get('sk'); if (e) pawnBox(e, out); }
      if (sub.board) {
        if (rowU > 0.5) {   // the sorted row (c09 l59): the row is the picture, not the empty squares around it
          for (const [k, e] of ent) if (k[0] === 'p' && e.present > 0.05) out.push(V(e.x - e.r, 0, e.z), V(e.x + e.r, Math.min(cap, e.top + 0.008), e.z));
        } else {
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(V(sx * HALF, 0, sz * HALF));
          for (const [k, e] of ent) if ((k[0] === 'p' || k === 'king') && e.present > 0.05 && e.head > 0.002) { const y = Math.min(cap, e.head + 0.004 + (e.hatH ?? 0)); out.push(V(e.x, y, e.z - e.r), V(e.x, y, e.z + e.r)); }
        }
      }
      return out;
    }

    /* ---------- the drawing pass */
    function towerRings(x, y0, z, tw, gain, color, pitchScale, radius = COIN.radius, widthMul = 1, alpha = 1) {
      if (DRY) return;
      const PT = COIN.thick * (pitchScale || 1);   // fix2: the sorted row (l59) is drawn taller (uniform vertical scale keeps the relative heights)
      // thin the rings when they would crowd under 3.5 px apart on screen; the top ring always shows (true height)
      tmp.set(x, y0, z); const depth = Math.max(0.02, cam ? tmp.applyMatrix4(cam.matrixWorldInverse).z * -1 : 1);
      const pitchPx = PT * focalPx / depth, L = Math.max(0, Math.log2(3.6 / pitchPx)), s = 2 ** Math.floor(L), fade = 1 - (L - Math.floor(L));
      for (const c of tw.columns) {
        const h = c.discs, n = Math.floor(h + 1e-6), cx = x + c.dx, cz = z + c.dz;
        if (alpha > 0.002) columns.put(tmp2.set(cx, y0, cz), radius * 0.955 * alpha, h * PT, Q0, cc2.copy(color).multiplyScalar(0.22 * Math.min(1, gain) * alpha), 2.4);
        for (let i = 1; i <= n; i++) {
          if (i === n && h - n < 0.02) break;   // the top ring is drawn below
          if (i % s) continue; const g = (i % (2 * s)) ? fade : 1; if (g < 0.02) continue;
          rings.put(tmp2.set(cx, y0 + i * PT, cz), radius, Q0, color, gain * g * alpha, widthMul);
        }
        const fr = h - n, topY = y0 + h * PT;
        if (h > 0.02) { rings.put(tmp2.set(cx, topY, cz), radius, Q0, color, gain * 1.15 * alpha * (n >= 1 ? 1 : Math.sqrt(fr)), widthMul * 1.1); rings.put(tmp2.set(cx, topY + 0.00005, cz), radius * 0.6, Q0, color, gain * 0.55 * alpha, widthMul * 0.8); }
      }
    }
    function stackRings(p, count, pitch, radius, color, gain, q = Q0, inner = true) {   // a free stack (moves, chips): count may be fractional
      if (DRY) return;
      const n = Math.ceil(count - 1e-6);
      for (let i = 1; i <= n; i++) { const y = Math.min(i, count) * pitch; tmp2.set(0, y, 0).applyQuaternion(q).add(p); rings.put(tmp2, radius, q, color, gain * (i === n ? 1.15 : 1), 1); }
      if (n > 0) { tmp2.set(0, count * pitch + 0.00005, 0).applyQuaternion(q).add(p); if (inner) rings.put(tmp2, radius * 0.6, q, color, gain * 0.55, 0.8); }
    }
    /** a small stack that must read as an OBJECT (stakes, slices, rain, the pile): every disc has its top and bottom edge, the body glows
     * across its face (filled, not a hollow ring), the top shows an inner ring. discs may be fractional; minimum drawn thickness 0.45 disc. */
    function solidStack(p, discs, pitch, radius, color, gain, q = Q0, wm = 1.25) {
      if (DRY || discs <= 0.001) return;
      const h = Math.max(0.45, discs), n = Math.max(1, Math.ceil(h - 1e-6));
      columns.put(p, radius * 0.97, h * pitch, q, cc2.copy(color).multiplyScalar(0.55 * Math.min(1.5, gain)), 1.15);
      rings.put(tmp2.set(0, 0.0001, 0).applyQuaternion(q).add(p), radius, q, color, gain * 0.8, wm);
      for (let i = 1; i <= n; i++) { const y = Math.min(i, h) * pitch; tmp2.set(0, y, 0).applyQuaternion(q).add(p); rings.put(tmp2, radius, q, color, gain * (i === n ? 1.25 : 0.9), wm); }
      tmp2.set(0, h * pitch + 0.00005, 0).applyQuaternion(q).add(p); rings.put(tmp2, radius * 0.62, q, color, gain * 0.7, wm * 0.85);
      tmp2.set(0, h * pitch + 0.0001, 0).applyQuaternion(q).add(p); rings.put(tmp2, radius * 0.3, q, color, gain * 0.5, wm * 0.8);
    }
    const arcAt = (a, b, u) => { const e = smooth(u), d = Math.hypot(b.x - a.x, b.z - a.z), arc = 4 * u * (1 - u) * (0.012 + 0.32 * d + Math.max(0, a.y - b.y) * 0.1); return V(lerp(a.x, b.x, e), lerp(a.y, b.y, e) + arc, lerp(a.z, b.z, e)); };
    const tipQuat = (id, down, out, dir = null) => {   // fall direction: the model's fallDir {f, r} (into the board on edge squares), else stable per id
      const h = hash(id), a = (h < 0.5 ? 0 : Math.PI) + (h * 4 % 1 - 0.5) * 1.1, L = dir ? Math.hypot(dir.f ?? 0, dir.r ?? 0) : 0;
      const dx = L > 1e-6 ? dir.f / L : Math.cos(a), dz = L > 1e-6 ? -dir.r / L : Math.sin(a);
      out.setFromAxisAngle(tmp.set(dz, 0, -dx).normalize(), -down * 1.66); return [dx, dz];
    };

    /** draw one pawn-like piece (players, extras, the Skeptic) on top of y0. Returns its entity record. */
    function drawPawn(key, o, x, z, y0, { color, gain, role, hat, kingHere, skeptic = false, alpha = 1, scale = 1, litHue = null }) {
      const down = clamp(o.down ?? 0), hop = (o.hop ?? 0) * 0.3 * PAWN_H * scale, sc = scale;
      const q = qa.identity(); let px = x, py = y0 + hop, pz = z;
      if (down > 0) { const [dx, dz] = tipQuat(key, smooth(down), q, o.fallDir); const R = PAWN_R * sc; const piv = tmp.set(x + dx * R, y0, z + dz * R); const off = tmp2.set(-dx * R, 0, -dz * R).applyQuaternion(q); px = piv.x + off.x; py = piv.y + off.y + hop; pz = piv.z + off.z; }
      const hw = clamp(hat ?? 0), roleOn = role && hw > 0.5;
      const lit = clamp(o.lit ?? 0); let dim = clamp(o.dim ?? 0) * (1 - lit);
      if (roleOn) dim = Math.min(dim, 0.5);   // a named pawn never sinks into the dark: lying broke it keeps a dim outline in its colour, with its hat
      const dead = clamp((down - 0.5) * 2);
      // lit = brighter and tinted to its meaning, never a white-out (22 lit pawns stay 22 marks); dim = a faint ghost
      let g = gain * (1 + 0.35 * lit) * (1 - 0.88 * dim) * alpha;
      const base = cc.copy(color); if (dead > 0) base.lerp(roleOn ? HUE[role] : HUE.dead, dead * (roleOn ? 0.85 : 0.7));
      if (lit > 0 && litHue && !roleOn) base.lerp(litHue, 0.8 * lit);
      const pos = V(px, py, pz);
      if (!kingHere) {
        const roleC = role ? HUE[role] : null;
        const rimC = skeptic ? cc2.copy(HUE.skeptic).multiplyScalar(0.25 * g) : cc2.copy(roleOn ? roleC : base).multiplyScalar((roleOn ? 0.18 : 0.1) * g);
        pawns.put(pos, sc, q, base, g * (skeptic ? 0.75 : 1), skeptic ? 0.75 : 1, roleC ? cc.clone().copy(roleC).multiplyScalar(ROLE_GAIN[role] ?? 1) : null, roleC ? (dead > 0 ? 1 : hw) : 0, rimC, skeptic ? 1.6 : 2.6, alpha);
        if (role && hw > 0.001 && hats[role]) {
          // hats are drawn larger than life (scaled about the head top) so the four read in a wide shot
          // fix2: the hat drops STRAIGHT down along the world vertical onto the head (no wobble: it swung the cone beside the head) and
          // ends exactly seated (fallY = 0 at hw = 1); a short squash on the landing instead of a swing
          const hs = HAT_SCALE[role] ?? 1.3, fallY = (1 - hw) * (1 - hw) * 0.06 * sc;
          const hp = tmp.set(0, PAWN_H * sc * (1 - hs), 0).applyQuaternion(q).add(tmp2.set(px, py + fallY, pz));
          const hg = Math.max(g, 0.6 * gain * alpha) * (ROLE_GAIN[role] ?? 1) * clamp(hw * 3);
          hats[role].put(hp.clone(), sc * hs, q, HUE[role], hg * 1.15, 1.35, null, 0, cc2.copy(HUE[role]).multiplyScalar(0.55 * Math.min(1.4, hg)), 1.1, 1);
        }
      }
      const head = down > 0.5 ? y0 + 0.022 * sc : py + PAWN_H * sc;
      const hatH = role && hw > 0.001 && !kingHere && down < 0.5 ? HAT_H[role] * (HAT_SCALE[role] ?? 1.3) * sc : 0;
      return { pos, head, lit, g, down, hatH };
    }

    function update(state, t, camera) {
      cam = camera; DRY = !camera; focalPx = K.H / 2 / Math.tan(K.lens.fov * Math.PI / 360);
      ent.clear(); chipTop.clear(); coinAt.clear(); moveAt.clear();
      levelY = state.level ? towerOf(state.level.coins, state.players?.[0]?.rings ?? 1).height : 0;
      pawns.begin(); kings.begin(); crosses.begin(); for (const k in hats) hats[k].begin(); rings.begin(); columns.begin(); bigCoins.begin(); glints.begin(); floorRing.begin();
      G.dark();
      const row = state.layout?.kind === 'row' ? clamp(state.layout.u) : 0; rowU = row;
      // ---- what the line is about (state.focus when the model gives it; until then the shot's subject in close shots)
      const sh = state.shot ?? {}, CLOSE = { player: 1, pair: 1, block: 1, tally: 1, coin: 1, tower: 1, demo: 1 }, HARD = { player: 1, pair: 1, block: 1, tower: 1, tally: 1, demo: 1 };
      const fx = state.focus && typeof state.focus === 'object' ? state.focus : null;
      const subs = [sh.subject ?? {}, sh.to ?? {}];
      const focP = new Set(fx ? (fx.players ?? []) : CLOSE[sh.kind] ? subs.flatMap((s) => s.players ?? []) : []);
      const focX = new Set(fx ? (fx.extras ?? []) : CLOSE[sh.kind] ? subs.flatMap((s) => s.extras ?? []) : []);
      const focC = new Set(fx ? (fx.chips ?? []) : CLOSE[sh.kind] ? subs.flatMap((s) => s.chips ?? []) : []);
      const focM = new Set(fx ? (fx.moves ?? []) : CLOSE[sh.kind] ? subs.flatMap((s) => s.moves ?? []) : []);
      const kg = state.king ?? {}, kingOn = kg.on ?? null;
      if (kingOn != null && (fx ? fx.king : CLOSE[sh.kind] && subs.some((s) => s.king))) focP.add(kingOn);
      if (fx?.skeptic || (CLOSE[sh.kind] && subs.some((s) => s.skeptic))) focX.add('__sk');
      const anyFoc = focP.size + focX.size + focC.size + focM.size > 0, hard = fx ? !!fx.hard : !!HARD[sh.kind];
      const focK = anyFoc ? (sh.continuous ? smooth(clamp(sh.u ?? 1) / 0.3) : 1) : 0;
      // a lit group anywhere: the others step back so the named pawns read as separate marks (no white blob)
      let litMax = 0; const cs = [];
      for (const p of state.players ?? []) if ((p.present ?? 1) > 0.5) { litMax = Math.max(litMax, clamp(p.lit ?? 0)); cs.push(p.coins ?? 0); }
      for (const xo of state.extras ?? []) if ((xo.present ?? 1) > 0.5) litMax = Math.max(litMax, clamp(xo.lit ?? 0));
      cs.sort((a, b) => a - b); const med = cs.length ? cs[cs.length >> 1] : 100;
      const litHueOf = (p) => (p.role && (p.hat ?? 0) > 0.5 ? HUE[p.role] : (p.down ?? 0) > 0.5 || (p.coins ?? 0) < 0.62 * med ? HUE.bad : HUE.good);
      const crowd = (p) => {
        if (p.kind != null) return 1;
        const l = clamp(p.lit ?? 0), inF = focP.has(p.id); let k = 1;
        if (anyFoc && !inF) k *= 1 - 0.6 * focK * (1 - l);
        if (litMax > 0.05 && !inF) k *= 1 - 0.55 * litMax * (1 - l);
        return k;
      };
      // ---- towers of the 64 (+ extras, + the Skeptic): entities first, so anchors resolve
      const towerG = 0.95, pawnG = 1.15;
      const lightSq = (f, r, level, color) => { if (DRY) return; const fi = Math.round(f), ri = Math.round(r); if (fi < 1 || fi > 8 || ri < 1 || ri > 8 || Math.abs(f - fi) > 0.3 || Math.abs(r - ri) > 0.3) return; G.light((ri - 1) * 8 + fi, level, color); };
      const towersOf = [];
      let rowYS = 1;
      if (row > 0) { let mx = 0; for (const p of state.players ?? []) if ((p.present ?? 1) > 0.002) mx = Math.max(mx, (p.coins ?? 0)); const hMax = towerOf(mx, 0).height; if (hMax > 1e-4) rowYS = lerp(1, Math.max(1, 0.15 / hMax), smooth(row)); }
      const headOf = (tw, o) => ((o.down ?? 0) > 0.5 ? tw.height + 0.022 * (o.scale ?? 1) : tw.height + PAWN_H * (o.scale ?? 1) * (row > 0 ? lerp(1, 0.32, row) : 1));
      for (const p of state.players ?? []) {
        const pr = clamp(p.present ?? 1); if (pr <= 0.002) continue;
        const x = bx(p.at.f), z = bz(p.at.r), tw0 = towerOf(p.coins, p.rings ?? 1), tw = rowYS !== 1 ? { ...tw0, height: tw0.height * rowYS } : tw0, lit = clamp(p.lit ?? 0), dim = clamp(p.dim ?? 0) * (1 - lit);
        // talent world (c07): the tower follows its pawn's size so a big talent stands on a visibly wider stack (radius only, heights stay true)
        const rad = row > 0 ? lerp(COIN.radius, 0.0031, row) : COIN.radius * (state.world === 'talent' ? clamp(Math.sqrt(p.scale ?? 1), 0.75, 1.3) : 1);
        const role = p.role && (p.hat ?? 0) > 0.001 ? p.role : null;
        const e = { x, z, top: tw.height, r: radiusOf(tw) * rad / COIN.radius, present: pr, label: 0, head: headOf(tw, p), down: p.down ?? 0, sc: p.scale ?? 1, hatH: role && (p.down ?? 0) < 0.5 ? HAT_H[role] * HAT_SCALE[role] * (p.scale ?? 1) : 0, lyHat: role && (p.hat ?? 0) > 0.5 ? 1 : 0 };
        if (kingOn === p.id && (kg.swap ?? 0) >= 0.5) e.head = tw.height + KING_H + 0.02;
        ent.set('p' + p.id, e); towersOf.push([p, e, tw, lit, dim, pr, rad]);
      }
      for (const xo of state.extras ?? []) {
        const pr = clamp(xo.present ?? 1); if (pr <= 0.002) continue;
        const x = bx(xo.at.f), z = bz(xo.at.r);
        if (xo.kind === 'layer') {
          const R = xo.rect ?? { f0: xo.at.f, r0: xo.at.r, f1: xo.at.f, r1: xo.at.r }, gth = smooth(xo.gather ?? 0);
          const x0 = lerp(bx(Math.min(R.f0, R.f1)), x - COIN.radius, gth), x1 = lerp(bx(Math.max(R.f0, R.f1)), x + COIN.radius, gth);
          const z0 = lerp(bz(Math.min(R.r0, R.r1)), z + COIN.radius, gth), z1 = lerp(bz(Math.max(R.r0, R.r1)), z - COIN.radius, gth);
          const tw = towerOf(xo.coins * gth, xo.rings ?? 1);
          ent.set('x' + xo.id, { x, z, top: tw.height, r: COIN.radius, present: pr, label: tw.height + 0.006, head: tw.height, rect: { x0, x1, z0, z1 }, layer: { xo, gth, tw } });
          continue;
        }
        const tw = towerOf(xo.show ?? xo.coins, xo.rings ?? 1), role = xo.role && (xo.hat ?? 0) > 0.001 ? xo.role : null;
        ent.set('x' + xo.id, { x, z, top: tw.height, r: radiusOf(tw), present: pr, label: 0, head: xo.kind === 'tower' ? tw.height : headOf(tw, xo), down: xo.down ?? 0, sc: xo.scale ?? 1, hatH: role && (xo.down ?? 0) < 0.5 ? HAT_H[role] * HAT_SCALE[role] * (xo.scale ?? 1) : 0 });
        towersOf.push([xo, ent.get('x' + xo.id), tw, clamp(xo.lit ?? 0), clamp(xo.dim ?? 0) * (1 - clamp(xo.lit ?? 0)), pr, COIN.radius]);
      }
      const sk = state.skeptic;
      if (sk && (sk.present ?? 0) > 0.002) { const tw = towerOf(sk.coins ?? 0, 1); ent.set('sk', { x: bx(sk.at.f), z: bz(sk.at.r), top: tw.height, r: radiusOf(tw), present: sk.present, label: 0, head: tw.height + PAWN_H, tw }); }

      // ---- CLEAR THE STAGE: a piece that is not in focus, stands nearer to the camera and covers the focus on screen fades out
      // completely (outline, rings and black core), smoothly with the overlap. Pure: depends only on this state and this camera.
      const fade = new Map();
      if (cam && hard && anyFoc && focK > 0.001) {
        const vm = cam.matrixWorldInverse, pv = V();
        const rectOf = (pts) => { let x0 = 9, x1 = -9, y0 = 9, y1 = -9, d = 0; for (const q of pts) { pv.copy(q).applyMatrix4(vm); d += -pv.z; q.project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } return [x0, y0, x1, y1, d / pts.length]; };
        const F = [];
        for (const id of focP) { const e = ent.get('p' + id); if (e) { const pts = []; pawnBox(e, pts); F.push(rectOf(pts)); } }
        for (const id of focX) { const e = ent.get(id === '__sk' ? 'sk' : 'x' + id); if (e) { const pts = []; if (e.rect) pts.push(V(e.rect.x0, 0, e.rect.z0), V(e.rect.x1, 0.01, e.rect.z1)); pawnBox(e, pts); F.push(rectOf(pts)); } }
        for (const mv of state.moves ?? []) if (focM.has(mv.id)) { const p = arcAt(anchor(mv.from, state, 'move'), anchor(mv.to, state, 'move'), clamp(mv.u ?? 0)), R = COIN.radius * 1.3, h = Math.max(0.45, (mv.show ?? mv.coins ?? 10) / 10) * COIN.thick; F.push(rectOf([V(p.x - R, p.y, p.z - R), V(p.x + R, p.y, p.z + R), V(p.x - R, p.y + h, p.z), V(p.x + R, p.y + h, p.z)])); }
        for (const c of state.chips ?? []) if (focC.has(c.id)) { const b = anchor(c.at, state, 'move'), h = Math.max(1, c.count ?? 0) * CHIP.thick, R = CHIP.radius * 1.3; F.push(rectOf([V(b.x - R, b.y, b.z - R), V(b.x + R, b.y, b.z + R), V(b.x - R, b.y + h, b.z), V(b.x + R, b.y + h, b.z)])); }
        if (F.length) {
          for (const [p, e] of towersOf) {
            if (p.kind == null ? focP.has(p.id) : focX.has(p.id)) continue;
            const pts = []; pawnBox(e, pts); const o = rectOf(pts), oa = Math.max(1e-6, (o[2] - o[0]) * (o[3] - o[1]));
            let amt = 0;
            for (const f of F) {
              const m = 0.03, ix = Math.min(o[2], f[2] + m) - Math.max(o[0], f[0] - m), iy = Math.min(o[3], f[3] + m) - Math.max(o[1], f[1] - m); if (ix <= 0 || iy <= 0) continue;
              const fa = Math.max(1e-6, (f[2] - f[0] + 2 * m) * (f[3] - f[1] + 2 * m)), k = ix * iy / Math.min(oa, fa);
              const nearer = smooth((f[4] - o[4] - 0.15 * SQ) / (0.6 * SQ));
              amt = Math.max(amt, smooth((k - 0.02) / 0.2) * nearer);
            }
            if (amt > 0) fade.set(e, 1 - focK * amt);
          }
        }
      }
      // ---- draw the towers
      for (const [p, e, tw, lit, dim, pr, rad] of towersOf) {
        if (p.kind === 'pawn' || p.kind === 'tower' || p.kind == null) {
          const al = fade.get(e) ?? 1; e.alpha = al;
          const g = towerG * (1 + 0.55 * lit) * (1 - 0.85 * dim) * pr * crowd(p);
          if (al > 0.002) towerRings(e.x, 0, e.z, tw, g, HUE.gold, p.kind == null ? rowYS : 1, rad, row > 0.5 ? 0.9 : 1, al);
          if (p.ghost > 0) {   // the old height (c05 l27): a clear white outline of the missing discs, its top ring bright
            const gt = towerOf(p.ghost, p.rings ?? 1);
            for (const c of gt.columns) {   // a band of white rings from the real top to the old top (dense: a loss of 0.4 disc still reads), the old top bright
              const real = tw.columns.find((k) => k.dx === c.dx && k.dz === c.dz)?.discs ?? 0; if (c.discs <= real + 0.02) continue;
              const n = Math.min(40, Math.max(3, Math.ceil((c.discs - real) * 4)));
              for (let i = 1; i <= n; i++) { const d = real + (c.discs - real) * i / n; rings.put(tmp2.set(e.x + c.dx, d * COIN.thick, e.z + c.dz), COIN.radius * (i === n ? 1.45 : 1.3), Q0, HUE.white, i === n ? 1.8 : 0.6, i === n ? 1.5 : 1); }   // wider than the pawn's foot so it is not hidden by it
            }
            // fix2 (QA r2 l27 "only a ring"): the old tower as a white cage around the real one (faint rings bottom to top, wider than the
            // tower) so the bright old top reads as the top of an OUTLINE, plus a second bright ring just above it
            if (!DRY) { const R2 = COIN.radius * 1.5, oh = gt.height, nC = 9; for (let i = 0; i <= nC; i++) rings.put(tmp2.set(e.x, oh * i / nC, e.z), R2, Q0, HUE.white, i === nC ? 2.4 : 0.42, i === nC ? 1.8 : 1.0); rings.put(tmp2.set(e.x, oh + 0.0012, e.z), R2 * 1.12, Q0, HUE.white, 1.2, 1.3); }
            e.top = Math.max(e.top, gt.height); e.ghostTop = gt.height;
          }
          if (lit > 0) lightSq(p.at.f, p.at.r, 0.6 * lit, litHueOf(p));
        }
      }
      // ---- layers (thin sheets) and their gathering
      let si = 0; for (const s of sheets) s.visible = false; for (const s of sheetEdges) s.visible = false;
      for (const [k, e] of ent) if (e.layer && si < sheets.length) {
        const { gth, tw, xo } = e.layer, R = e.rect, w = Math.abs(R.x1 - R.x0), d = Math.abs(R.z1 - R.z0), a = clamp(1 - (gth - 0.75) / 0.25) * e.present;
        const s = sheets[si], ed = sheetEdges[si]; si++;
        s.visible = ed.visible = a > 0.01; s.position.set((R.x0 + R.x1) / 2, 0.0006 + 0.004 * gth, (R.z0 + R.z1) / 2); s.scale.set(Math.max(1e-4, w), 1, Math.max(1e-4, d));
        s.material.color.copy(HUE.gold).multiplyScalar(0.016 * a * (1 + 2 * gth) * (1 + clamp(xo.lit ?? 0)));   // fix2 l44: the thin layer must read
        ed.position.copy(s.position); ed.scale.copy(s.scale); N.setLine(ed.material, 1.4 * a * (1 + clamp(xo.lit ?? 0)));
        if (gth > 0.01) towerRings(e.x, 0, e.z, tw, towerG * clamp(gth * 1.5) * (1 + clamp(xo.lit ?? 0)), HUE.gold, 1);
      }
      // ---- the Skeptic's tower
      if (ent.has('sk')) { const e = ent.get('sk'); if (e.tw.height > 0) towerRings(e.x, 0, e.z, e.tw, towerG * e.present * (1 + clamp(sk.lit ?? 0)), HUE.gold, 1); floorRing.put(V(e.x, 0.0004, e.z), 0.024, Q0, HUE.skeptic, 0.35 * e.present * (1 + 1.5 * clamp(sk.lit ?? 0)), 1); }

      // things that must read as objects grow in far shots (wide / high / top / low / skeptic / row): coins, rain, slices in flight
      const farK = KIND_GROUP[sh.kind] === 'far' ? 1.75 : 1;
      // ---- chip columns (anchors may sit on tower tops): filled red stacks, not hollow rings
      for (const c of state.chips ?? []) {
        const base = anchor(c.at, state, 'move'), pe = c.at?.player != null ? ent.get('p' + c.at.player) : null;
        const rad = pe && row > 0 ? lerp(CHIP.radius, 0.0044, row) : CHIP.radius, thick = pe && row > 0 ? lerp(CHIP.thick, 0.0042, row) : CHIP.thick;
        const cnt = Math.max(0, c.count ?? 0), n = Math.floor(cnt + 1e-6), fr = cnt - n, lit = clamp(c.lit ?? 0), hue = c.color === 'gold' || c.color === 'good' ? HUE.gold : c.color && HUE[c.color] && c.color !== 'red' && c.color !== 'bad' ? HUE[c.color] : HUE.red;
        const al = pe ? (pe.alpha ?? 1) : 1, g = 2.4 * (1 + 0.5 * lit) * al;
        if (n > 0 && al > 0.01) {
          columns.put(base, rad * 0.96, n * thick, Q0, cc2.copy(hue).multiplyScalar(0.62 * al), 1.25);
          const step = n > 40 ? 2 : 1;
          for (let i = 1; i <= n; i++) { if (i % step && i !== n) continue; rings.put(tmp2.set(base.x, base.y + i * thick, base.z), rad, Q0, hue, g * (i === n ? 1.25 : 0.85), 1); }
          rings.put(tmp2.set(base.x, base.y + 0.0002, base.z), rad, Q0, hue, g * 0.8, 1);
          rings.put(tmp2.set(base.x, base.y + n * thick + 0.00005, base.z), rad * 0.62, Q0, hue, g * 0.6, 0.8);
        }
        if (fr > 0.003) { const fall = (1 - smooth(fr)) * 0.06, y = base.y + n * thick + fall; solidStack(V(base.x, y, base.z), 1, thick, rad, hue, g * 1.3, Q0, 1.1); }
        if (cnt < 1) rings.put(tmp2.set(base.x, base.y + 0.0004, base.z), rad * 1.15, Q0, hue, 0.9 * al, 1);   // an empty column: its spot on the board
        chipTop.set(c.id, { x: base.x, y: base.y + Math.max(n, 0.5) * thick, y0: base.y, z: base.z });
      }
      // ---- the flip coins (the anchor and the frame need them before the pawns and tags): a filled gold face, the crown on heads
      const coinTops = (at) => { let m = 0.05; for (const [k, e] of ent) if (Math.hypot(e.x - bx(at.f), e.z - bz(at.r)) < 2.2 * SQ) m = Math.max(m, e.top + PAWN_H + (e.hatH ?? 0)); return m; };
      let ci = 0; for (const m of coinFaces) m.visible = false;
      for (const fc of state.flipCoins ?? []) {
        const pr = clamp(fc.present ?? 1); if (pr <= 0.002) continue;
        const cs = farK > 1 ? 1.3 : 1, R = BIG.radius * cs;
        const bxz = V(bx(fc.at.f), 0, bz(fc.at.r)), H = farK > 1 ? Math.min(coinTops(fc.at) + 0.03 + R, 0.13) : sh.kind === 'demo' && sh.subject?.coins?.includes(fc.id) ? 0.075 : coinTops(fc.at) + 0.03 + R * 0.5, y =   /* frame check l49/l05: a lower peak in close shots (the flight box set the frame) */ BIG.thick * cs / 2 + clamp(fc.lift ?? 0, 0, 1.2) * H;
        const q = new THREE.Quaternion().setFromAxisAngle(UP, (fc.yaw ?? 0) * Math.PI * 2).multiply(qb.setFromAxisAngle(tmp.set(1, 0, 0), (fc.angle ?? 0) * Math.PI * 2));
        const p = V(bxz.x, y, bxz.z), gl = clamp(fc.glint ?? 0), g = Math.min(1.9, 1.5 * pr * (1 + 1.0 * gl)) * (farK > 1 ? 0.8 : 1);   // fix2 l13a: capped (no glare over the time-lapse)
        bigCoins.put(p, cs, q, HUE.gold, g, 1, null, 0, null, 0);
        if (!DRY && ci < coinFaces.length) { const m = coinFaces[ci++]; m.visible = true; m.position.copy(p); m.quaternion.copy(q); m.scale.set(R * 0.985, BIG.thick * cs, R * 0.985); m.userData.set(Math.min(farK > 1 ? 0.78 : 1.0, pr * (1 + 0.6 * gl))); }
        if (gl > 0.01) glints.put(p.clone().add(V(-R * 0.45, R * 0.6, 0.004)), 0.016 * cs * (0.5 + gl), Q0, HUE.white, 3 * gl, 1);
        coinAt.set(fc.id, { p, base: bxz, H, q, R, air: sh.kind !== 'coin' });   // frame the whole flight (constant inside a shot), except in a coin close-up
        if ((fc.lift ?? 0) < 0.05) lightSq(fc.at.f, fc.at.r, 0.25 * pr, HUE.gold);
      }
      // ---- moves: real little stacks on low arcs (stakes, slices, shares); `show` = the size to draw a tiny slice; a short trail in flight
      // fix2 (QA r2 l07-l09, l26-l29, l55-l58 "tiny specks"): a stake RESTING on the board / table is drawn twice its size (no hand-over there:
      // the hand-over happens at a tower top) with a soft pool of light under it; in flight every stack grows, bright, with a 5-step trail.
      const poolAt = (x, z, R, hue, k) => { if (DRY) return; for (const [m, gg] of [[1.35, 0.9], [1.9, 0.5], [2.6, 0.25]]) rings.put(tmp2.set(x, 0.0003, z), R * m, Q0, hue, gg * k, 1.4); };
      const restK = { pair: 2.2, demo: 1.8, player: 1.8, block: 1.8 }[sh.kind] ?? 1.6;
      for (const m of state.moves ?? []) {
        const a = anchor(m.from, state, 'move'), b = anchor(m.to, state, 'move'), u = clamp(m.u ?? 0), p = arcAt(a, b, u);
        const onBoard = (an) => an && an.f != null && !an.player && an.extra == null;
        const restA = onBoard(m.from) ? restK : 1, restB = onBoard(m.to) ? restK : 1, rest = lerp(restA, restB, smooth(u));
        const flying = u > 0 && u < 1, grow = rest * (1 + (Math.max(farK, 1.5) - 1) * Math.sin(Math.PI * u));   // at a tower top (u = 0 / 1) the size stays exact
        const trail = (R, hue, gg, wm) => { if (flying) for (let i = 1; i <= 5; i++) { const uu = u - 0.035 * i; if (uu <= 0) break; rings.put(arcAt(a, b, uu), R, Q0, hue, gg * (1 - i / 6), wm); } };
        if (m.kind === 'chip') {
          const n = Math.max(0, m.show ?? m.count ?? 1);
          moveAt.set(m.id, { x: p.x, z: p.z, y0: p.y, y: p.y + Math.max(1, n) * CHIP.thick * grow });
          solidStack(p, n, CHIP.thick * Math.min(grow, 1.8), CHIP.radius * grow, HUE.red, 3.2, Q0, 1.4);
          trail(CHIP.radius * grow, HUE.red, 2.0, 1.2);
          if (rest > 1.01 && !flying) poolAt(p.x, p.z, CHIP.radius * grow, HUE.red, 1.0);
        } else {
          const dsc = Math.max(0, m.show ?? m.coins ?? 0) / 10; if (dsc <= 0.001) continue;
          const th = COIN.thick * Math.min(grow, 1.8);
          moveAt.set(m.id, { x: p.x, z: p.z, y0: p.y, y: p.y + Math.max(0.45, dsc) * th });
          solidStack(p, dsc, th, COIN.radius * grow, HUE.gold, flying ? 3.0 : 2.4, Q0, flying ? 1.7 : 1.5);
          trail(COIN.radius * grow, HUE.gold, 1.9, 1.3);
          if (rest > 1.01 && (!flying || p.y < 0.03)) poolAt(p.x, p.z, COIN.radius * grow, HUE.gold, 1.1);
          if (rest > 1.01 && !flying) { const fi = (p.x / SQ) + 4.5, ri = 4.5 - p.z / SQ; lightSq(fi, ri, 0.35, HUE.gold); }
        }
      }
      // ---- pawns of the 64 and the extras
      for (const [p, e, tw, lit, dim, pr] of towersOf) {
        if (p.kind === 'tower') { e.head = e.top; e.label = e.top + 0.006; continue; }
        const role = p.role ?? null, kingHere = kingOn != null && p.id === kingOn && p.kind == null && (kg.swap ?? 0) >= 0.5;
        let x = e.x, z = e.z, y0 = tw.height, scale = (p.scale ?? 1) * (row > 0 ? lerp(1, 0.32, row) : 1);
        if (p.jump && p.jump.to) {   // along an arc from its own tower top to the top of the target
          const u = clamp(p.jump.u), tgt = anchor(p.jump.to, state, 'move'), k = smooth(u), d = Math.hypot(tgt.x - x, tgt.z - z);
          x = lerp(x, tgt.x, k); z = lerp(z, tgt.z, k); y0 = lerp(y0, tgt.y, k) + 4 * u * (1 - u) * (0.03 + 0.4 * d);
        }
        const plain = !role || (p.hat ?? 0) <= 0, al = e.alpha ?? 1;
        const po = p.kind && focX.has(p.id) && (p.dim ?? 0) > 0.3 ? { ...p, dim: 0.3 } : p;   // fix2 l47: the pieces the shot racks to stay readable even when broke
        const o = drawPawn((p.kind ? 'x' : 'p') + p.id, po, x, z, y0, { color: HUE.white, gain: pawnG * pr * crowd(p) * (row > 0 ? lerp(1, 0.0, smooth((row - 0.5) * 2)) : 1), role, hat: p.hat ?? 0, kingHere, alpha: al, litHue: litHueOf(p), scale });   // fix2: talent sizes were never passed (QA r2 blocker l41)
        e.head = o.head; e.label = o.head + 0.007 + o.hatH; e.lit = o.lit; e.hatH = o.hatH;
        if (role && (p.hat ?? 0) > 0.5 && !plain) lightSq(p.at.f, p.at.r, (0.05 + 0.25 * clamp(p.down ?? 0)) * al, HUE[role]);   // a fallen named pawn: its square keeps its colour
      }
      // ---- the Skeptic: a dark body, a thin cold outline
      if (ent.has('sk')) {
        const e = ent.get('sk'); let x = e.x, z = e.z, y0 = e.top;
        if (sk.jump && sk.jump.to) { const u = clamp(sk.jump.u), tgt = anchor(sk.jump.to, state, 'move'), k = smooth(u), d = Math.hypot(tgt.x - x, tgt.z - z); x = lerp(x, tgt.x, k); z = lerp(z, tgt.z, k); y0 = lerp(y0, tgt.y, k) + 4 * u * (1 - u) * (0.03 + 0.4 * d); }
        const o = drawPawn('sk', sk, x, z, y0, { color: HUE.skeptic, gain: 0.8 * e.present * (1 - smooth(row)), skeptic: true, alpha: 1 - smooth(row) });
        e.head = o.head; e.label = o.head + 0.007;
      }
      // ---- the king: drops onto the tower of `on`, takes the pawn's place, wears the cone hat. Its frame box is the LANDED king.
      if (kingOn != null && ent.has('p' + kingOn)) {
        const e = ent.get('p' + kingOn), drop = clamp(kg.drop ?? 0), fall = Math.pow(1 - drop, 2) * 0.55;
        if (drop > 0.001) {
          // frame check 2026-11-15 (l63): the king fades WITH its tower (clear-the-stage fade), never floats over a faded tower
          const ka = e.alpha ?? 1, p = V(e.x, e.top + fall, e.z), g = 1.6 * (1 + 0.8 * Math.exp(-Math.max(0, drop - 0.999) * 50) * (drop > 0.98 ? 1 : 0)) * ka;
          if (ka > 0.002) kings.put(p, 1, Q0, HUE.gold, g, 1, null, 0, cc2.copy(HUE.gold).multiplyScalar(0.4 * ka), 2.4, ka);
          const hh = clamp(kg.hat ?? 0);
          if (hh < 0.999 && ka > 0.002) crosses.put(p, 1, Q0, HUE.gold, g * (1 - hh), 1);
          if (hh > 0.001) {   // fix2: a big green cone seated centred on the king's head (straight drop, ends exactly on it), filled, thick lines
            const yo = (1 - hh) * (1 - hh) * 0.06, s = 2.1, hg = 2.0 * clamp(hh * 3) * ka;
            if (ka > 0.002) hats.fool.put(V(e.x, p.y + yo + KING_H - 0.0466 * s - 0.0035, e.z), s, Q0, HUE.fool, hg, 1.6, null, 0, cc2.copy(HUE.fool).multiplyScalar(0.6 * Math.min(1.4, hg)), 1.1, ka);
          }
          const hx = hh > 0 ? 0.058 : 0.015;
          ent.set('king', { x: e.x, z: e.z, top: e.top, r: Math.max(e.r, 0.02), present: 1, head: e.top + KING_H + hx, label: p.y + KING_H + hx + 0.006 });
          if ((kg.swap ?? 0) >= 0.5) { e.head = ent.get('king').head; e.label = ent.get('king').label; }
          if (drop > 0.95) lightSq(state.players[kingOn].at.f, state.players[kingOn].at.r, 0.6, HUE.gold);
        }
      }
      // ---- the c07 rain: a lucky gold coin or an unlucky red chip falls onto a pawn, tumbling, big enough to follow, with a short trail
      for (const d of state.rain ?? []) {
        const e = ent.get('p' + d.to?.player); if (!e) continue; const u = clamp(d.u ?? 0); if (u >= 1) continue;
        // fix2 (QA r2 l42 "no rain"): big bright tokens (about two coins wide), a long trail, and a hit flash = an expanding ring at the head
        const red = d.kind === 'red', hue = red ? HUE.red : HUE.gold, k = Math.max(farK, 1.5) * 1.35, R = (red ? CHIP.radius * 1.3 : COIN.radius * 1.35) * k, th = (red ? CHIP.thick : COIN.thick) * 1.5 * k;
        const yAt = (uu) => e.head + R + (1 - uu * uu) * 0.3, rot = (uu) => new THREE.Quaternion().setFromEuler(new THREE.Euler(uu * 7 + hash(d.id) * 6, hash(d.id + 'y') * 6, uu * 4));
        solidStack(V(e.x, yAt(u), e.z), 1, th, R, hue, red ? 4.2 : 3.6, rot(u), 1.8);
        for (let i = 1; i <= 6; i++) { const uu = u - 0.03 * i; if (uu <= 0) break; rings.put(V(e.x, yAt(uu), e.z), R * (1 - 0.06 * i), rot(uu), hue, (red ? 2.4 : 2.0) * (1 - i / 7), 1.3); }
        if (u > 0.82) { const f = (u - 0.82) / 0.18; for (const [m, gg] of [[1, 1], [1.5, 0.6]]) rings.put(V(e.x, e.head + 0.002, e.z), R * (0.8 + 1.6 * f) * m, Q0, hue, 3.2 * gg * f, 1.6); }
        lightSq(state.players[d.to.player]?.at.f ?? 0, state.players[d.to.player]?.at.r ?? 0, 0.45 + 0.5 * u, hue);
      }
      // ---- the average level: a sheet of light with its own grid, sweeping in from the near edge
      const lv = state.level;
      level.visible = !!(lv && (lv.opacity ?? 0) > 0.002 && (lv.sweep ?? 0) > 0.002);
      if (level.visible) {
        const rg = state.players?.[0]?.rings ?? 1, y = towerOf(lv.coins, rg).height, sw = clamp(lv.sweep), op = clamp(lv.opacity), D = 2 * HALF * sw;
        level.position.set(0, y, HALF);
        lvLong.scale.set(1, 1, D); lvFill.scale.set(2 * HALF, 1, D); lvFill.material.color.copy(HUE.level).multiplyScalar(0.018 * op);
        lvCross.forEach((l, i) => { l.position.z = -i * SQ; l.visible = i * SQ <= D + 1e-4; });
        lvFront.position.z = -D; lvFront.visible = sw < 0.999; N.setLine(lvEdge, 2.4 * op); N.setLine(lvMatX, 0.45 * op); N.setLine(lvMatZ, 0.45 * op); N.setLine(lvFront.material, 2.4 * op);
        // where a tower pierces the sheet: a ring of light around it
        for (const [k, e] of ent) if (k[0] === 'p' && e.top > y && HALF - e.z <= D) rings.put(V(e.x, y + 0.0004, e.z), e.r + 0.006, Q0, HUE.level, 2.2 * op, 1.4);
      }
      // the four (seats) faintly marked when hatted; a lit player's square flares (above)
      if (DRY) { DRY = false; return; }
      pawns.end(); kings.end(); crosses.end(); for (const k in hats) hats[k].end(); rings.end(); columns.end(); bigCoins.end(); glints.end(); floorRing.end();
      G.commit();
    }
    return { update, anchor, bounds, ent, coinAt, chipTop, moveAt };
  })();

  /* ================================================================ CAMERA LAYER */
  const camera = (() => {
    // per shot kind: azimuth (0 = from the near side, +z), elevation, vertical fov (degrees)
    // lower and closer than round 1: whole-board shots fill >= 65 % of the width (QA r1: "a small island in the top half")
    const KIND = {
      wide: [0.2, 0.4, 30], high: [0.12, 0.5, 30], top: [0.0, 1.2, 30], low: [-0.28, 0.17, 32], player: [0.32, 0.5, 26], pair: [0.26, 0.6, 28], block: [0.34, 0.62, 28],
      tower: [0.26, 0.16, 30], coin: [0.3, 0.22, 26], demo: [0.18, 0.32, 28], tally: [0.18, 0.55, 28], row: [0.0, 0.16, 24], skeptic: [0.0, 0.34, 32],
    };
    const fwd = V(), rgt = V(), upv = V(), d = V(), M = new THREE.Matrix4();
    function basis(az, el) { fwd.set(-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az)); rgt.crossVectors(fwd, UP).normalize(); upv.crossVectors(rgt, fwd); }
    /** a camera pose (pos, quat, fov) that puts every point inside the rect [x0, x1, y0, y1] (fractions of the frame) */
    let fit = function (pts, az, el, fov, rect) {
      basis(az, el);
      const th = Math.tan(fov * Math.PI / 360), ta = th * K.W / K.H;
      const lo = V(Infinity, Infinity, Infinity), hi = V(-Infinity, -Infinity, -Infinity); for (const p of pts) { lo.min(p); hi.max(p); }
      const c = lo.clone().add(hi).multiplyScalar(0.5), rad = Math.max(0.03, lo.distanceTo(hi) / 2);
      const rx0 = 2 * rect[0] - 1, rx1 = 2 * rect[1] - 1, ry0 = 1 - 2 * rect[3], ry1 = 1 - 2 * rect[2];
      let D = rad / th * 1.3, ox = 0, oy = 0; const pos = V();
      for (let it = 0; it < 16; it++) {
        pos.copy(c).addScaledVector(fwd, -D).addScaledVector(rgt, ox).addScaledVector(upv, oy);
        let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity, behind = false;
        for (const p of pts) { d.subVectors(p, pos); const z = d.dot(fwd); if (z < 0.01) { behind = true; continue; } const x = d.dot(rgt) / (z * ta), y = d.dot(upv) / (z * th); mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
        if (behind) { D *= 1.5; continue; }
        const kx = (mxx - mnx) / (rx1 - rx0), ky = (mxy - mny) / (ry1 - ry0), k = Math.max(kx, ky, 0.05);
        // width-bound: sit the picture a little low in the rect (the black goes above, where the tags and the counter live)
        const tyc = kx > ky ? lerp((ry0 + ry1) / 2, ry0 + (mxy - mny) / 2, 0.45) : (ry0 + ry1) / 2;
        ox += ((mnx + mxx) / 2 - (rx0 + rx1) / 2) * D * ta; oy += ((mny + mxy) / 2 - tyc) * D * th;
        D *= lerp(1, k, it < 10 ? 0.9 : 1);
      }
      pos.copy(c).addScaledVector(fwd, -D).addScaledVector(rgt, ox).addScaledVector(upv, oy);
      M.makeBasis(rgt, upv, fwd.clone().negate());
      return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(M), fov, D, c };
    };
    const fitRaw = fit;
    fit = (pts, az, el, fov, rect) => { const P = fitRaw(pts, az, el, fov, rect), Dmin = 0.4; if (P.D >= Dmin) return P; const f2 = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * P.D / Dmin) * 180 / Math.PI; return fitRaw(pts, az, el, Math.max(6, f2), rect); };   // frame check l49/l56: small demo pieces fill the frame (min fov 9 -> 6)
    const mix = (A, B, u) => ({ pos: A.pos.clone().lerp(B.pos, u), quat: A.quat.clone().slerp(B.quat, u), fov: lerp(A.fov, B.fov, u), D: lerp(A.D, B.D, u), c: A.c.clone().lerp(B.c, u) });
    const scaleOut = (P, k) => ({ ...P, pos: P.c.clone().add(P.pos.clone().sub(P.c).multiplyScalar(k)), D: P.D * k });   // about the subject: it stays put on screen

    function apply(state, t, prevPose = null) {
      const sh = state.shot ?? { id: 'none', kind: 'wide', subject: { board: true }, move: 'hold', u: 0.5 };
      const [az0, el0, fov] = KIND[sh.kind] ?? KIND.wide, u = clamp(sh.u ?? 0), e = smooth(u);
      const hook = !!(state.title && (state.title.opacity ?? 0) > 0.001);
      // usable frame = 6-72 % of the height (the subtitle band 74-88 % stays free). Whole-board shots use all of it: tags, the counter and
      // the hook / end text sit over the far rows instead of shrinking the picture. Close shots keep a little room above for name tags.
      const boardShot = !!sh.subject?.board && !sh.subject?.players?.length && !sh.subject?.extras?.length;
      let top = (state.tags ?? []).some((g) => (g.opacity ?? 0) > 0.01 && !g.anchor?.screen) ? 0.16 : 0.07;   // fix2: room for a name tag above the heads
      // fix2: screen-anchored tags (sources, counts) keep their own strip at the top in every shot, the picture fits below them
      const spots = screenSpots(state);
      let scrTop = 0.05; for (const g of state.tags ?? []) if ((g.opacity ?? 0) > 0.01 && g.anchor?.screen && g.anchor.screen[1] < 0.3) { const y = (spots.get(g.id)?.[1] ?? g.anchor.screen[1]) + CAP[g.size ?? 'm'] / 0.85 / 2 + 0.035; top = Math.max(top, y); scrTop = Math.max(scrTop, y); }
      let rect = sh.subject?.board ? [0.035, 0.965, Math.min(0.24, scrTop), 0.72] : [0.06, 0.94, Math.min(0.24, top), 0.72];
      // frame check 2026-11-15 (l21 '55%'): a board shot with a tag on a piece keeps room above the tallest piece for it
      if (sh.subject?.board && (state.tags ?? []).some((g) => (g.opacity ?? 0) > 0.01 && !g.anchor?.screen && (g.anchor?.player != null || g.anchor?.extra != null || g.anchor?.king))) rect[2] = Math.max(rect[2], 0.13);
      // fix2: the end text (l65) sits in the 21-43 % band: the line-up goes under it, its name tags just above the heads (QA r2 l65)
      // frame check 2026-11-15: the end text now sits at the TOP (film.json end_text_y -37.5 = 2-23 % of the height). The line-up takes
      // 26-70 % (large, seen from the front); its four names stand in two staggered rows under the feet (no caption in the last line).
      // A board shot under the end text (before the cut to the line-up) also keeps its pieces below the text.
      const endUp = hook && (state.t ?? 0) > 10, endLine = endUp && !boardShot, tOp = endUp ? smooth(clamp(state.title.opacity ?? 0)) : 0;
      if (endLine) rect = [lerp(rect[0], 0.04, tOp), lerp(rect[1], 0.96, tOp), lerp(rect[2], END_FREE, tOp), lerp(0.72, 0.70, tOp)];   // eased with the title fade: no jump
      else if (endUp) rect = [rect[0], rect[1], lerp(rect[2], END_FREE, tOp), rect[3]];
      // fix2 (QA r2 "small island"): a whole-board shot is fitted on the BOARD (heads and the coin flight capped at 0.1 m above it, taller
      // things may rise into the black above or leave the frame, the giant tower of l51 does); a board shot ABOUT a piece (l03, l04, l44) comes
      // close to the piece with half the board around it; a tower shot with the king frames the king and the upper tower (the foot leaves)
      const capY = (pts, y) => pts.map((p) => (p.y > y ? V(p.x, y, p.z) : p));
      const B0 = (sub) => { const p = objects.bounds(sub, state); return p.length ? p : objects.bounds({ board: true }, state); };
      const halfBoard = (k) => { const o = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(V(sx * HALF * k, 0, sz * HALF * k)); return o; };
      const B = (sub) => {
        const pieces = { ...sub, board: false }, nP = (sub.players?.length ?? 0) + (sub.extras?.filter((x) => x !== 'pot').length ?? 0) + (sub.king ? 1 : 0);
        const real = (k) => { const e = objects.ent.get(k); return e && e.present > 0.5 && !e.rect && e.head > 0.004; };
        if (sub.board && nP > 0 && !(state.layout?.kind === 'row') && [...(sub.players ?? []).map((i) => 'p' + i), ...(sub.extras ?? []).map((x) => 'x' + x)].some(real)) { const solid = { ...pieces, extras: (sub.extras ?? []).filter((x) => real('x' + x)) }, p = objects.bounds(solid, state); for (const x of sub.extras ?? []) { const e = objects.ent.get('x' + x); if (e?.rect && e.present > 0.5 && (e.layer?.gth ?? 0) < 0.75) p.push(V(e.rect.x0, 0, e.rect.z0), V(e.rect.x1, 0, e.rect.z1), V(e.rect.x0, 0, e.rect.z1), V(e.rect.x1, 0, e.rect.z0)); }   /* frame check l45: the thin half-board layer is in frame while it gathers */ if (p.length) { let cx = 0, cz = 0; for (const q of p) { cx += q.x / p.length; cz += q.z / p.length; } return p.concat(halfBoard(sub.players?.length ? 0.45 : 0.25).map((q) => V(clamp(q.x + cx, -HALF, HALF), 0, clamp(q.z + cz, -HALF, HALF)))); } }   // the half board around the piece   // a thin layer (l44) shows around the tower, it does not set the frame
        if (sub.board) {   // the king and (outside the growth world) the tallest tower stay whole: they are what the board has made
          // frame check 2026-11-15: the king (with its cone hat) and the tallest tower stay WHOLE (no cap): they used to run off the top (l21, l24, l64)
          const out = capY(B0(sub), 0.1); if (state.king?.on != null && (state.king.drop ?? 0) > 0.5) out.push(...objects.bounds({ king: true }, state));
          if (state.world !== 'growth' && !(state.layout?.kind === 'row')) { let best = null; for (const p of state.players ?? []) if ((p.present ?? 1) > 0.5 && (!best || p.coins > best.coins)) best = p; if (best) out.push(...objects.bounds({ players: [best.id] }, state)); }
          return out;
        }
        // frame check 2026-11-15 (l23): a close shot on the king alone = the tower top with the king and its cone hat, not the whole tower
        if (sh.kind === 'player' && sub.king && !sub.players?.length && !sub.extras?.length) { const p = B0(sub), k = objects.ent.get('king'); if (k) { const yb = Math.max(0, k.top - 0.012); return p.map((q) => (q.y < yb ? V(q.x, yb, q.z) : q)); } return p; }
        if (sh.kind === 'tower' && sh.move !== 'tilt' && sub.king) { const p = B0(sub); let y1 = 0; for (const q of p) y1 = Math.max(y1, q.y); return capY(p.map((q) => (q.y < y1 * 0.3 ? V(q.x, y1 * 0.3, q.z) : q)), 9); }
        return B0(sub);
      };
      const sub = sh.subject ?? { board: true }, to = sh.to;
      // a slow, steady drift on every shot so nothing is ever frozen; the named move on top of it, bold and eased
      let az = (hook && (state.t ?? 0) < 10 ? 0.3 : 1) * az0 + 0.05 * (u - 0.5), el = el0, P;
      if (endLine) { el = lerp(el, Math.min(el, 0.12), tOp); az = lerp(az, 0.06 + 0.04 * (u - 0.5), tOp); }   // the line-up seen from the front: tall pieces in a wide row
      { const nP = (sub.players?.length ?? 0) + (sub.extras?.filter((x) => x !== 'pot').length ?? 0); if (sub.board && nP > 0 && sh.kind !== 'skeptic') el = Math.min(el, 0.26); }   // a piece on the board: from low, it stands tall
      // fix2 (QA r2 l07-l09): a pair is seen side by side (the camera looks across the line between the two), close
      if (sh.kind === 'pair' && (sub.players?.length ?? 0) === 2) { const a = objects.ent.get('p' + sub.players[0]), b = objects.ent.get('p' + sub.players[1]); if (a && b) { const dx = b.x - a.x, dz = b.z - a.z; if (Math.hypot(dx, dz) > 0.02) az = clamp(Math.atan(-dz / (Math.abs(dx) > 1e-6 ? dx : 1e-6)), -0.85, 0.85) + 0.05 * (u - 0.5); } }
      if (sh.kind === 'block' && sub.coins?.length) { el = Math.min(el, 0.4); az = 0.4636 + 0.05 * (u - 0.5); }   // frame check l53 / l05: the four hats with a coin over them seen from lower: hats apart, the coin above them
      if (sh.kind === 'demo' && sub.coins?.length) el = Math.min(el, 0.2);   // frame check l49: coin beside the demo tower, seen low: the flight box costs less height
      const pts = B(sub);
      if (sub.moves && !sub.players && !sub.extras && !sub.board) { el = Math.max(el, 0.7); for (const mv of state.moves ?? []) if (sub.moves.includes(mv.id)) for (const an of [mv.from, mv.to]) if (an?.player != null) pts.push(...objects.bounds({ players: [an.player] }, state)); }   // frame check l08: the stakes WITH the two players they came from, not a two-coin close-up   // stakes on the board: look down past the pawns
      switch (sh.move) {
        case 'orbit': P = fit(pts, az0 + lerp(-0.38, 0.38, e), el, fov, rect); break;
        case 'push': P = scaleOut(fit(pts, az, el, fov, rect), lerp(sub.board ? 1.05 : 1.15, sub.board ? 0.97 : 0.99, e)); break;
        case 'pull': P = to ? mix(fit(pts.concat(B(to)), az, el, fov, rect), fit(B(to), az, el, fov, rect), smooth(u * 2.5)) : scaleOut(fit(pts, az, el, fov, rect), lerp(0.96, 1.14, e)); break;   // fix2 l45a: a pull ends on its `to`; frame check: a `to` piece already up (a growing tower) is in frame from its first frame
        case 'crane': P = to ? mix(fit(pts, az, el, fov, rect), fit(B(to), az, (to.board ? KIND.wide[1] : el + 0.12), fov, to.board ? [0.035, 0.965, 0.05, 0.72] : rect), e) : scaleOut(fit(pts, az, el + 0.28 * e, fov, rect), lerp(1.0, 1.25, e)); break;
        case 'tilt': {
          if (sh.kind === 'tower' || !to) {   // from the foot of the subject up to its top (or to `to`)
            const all = to ? [...pts, ...B(to)] : pts; let y1 = 0; for (const p of all) y1 = Math.max(y1, p.y);
            const span = Math.min(y1, Math.max(0.09, y1 * 0.42)), foot = all.map((p) => V(p.x, Math.min(p.y, span), p.z)), head = all.filter((p) => p.y >= y1 - span * 1.2).concat(all.map((p) => V(p.x, Math.max(p.y, y1 - span), p.z)));
            // frame check 2026-11-15: the tilt starts on the WHOLE subject (foot to hat, low angle) and rises to its top: no head, hat or
            // tower top is ever cut by the top edge during the move (l19, l24, l45)
            const A = fit(pts.concat(foot), az, el0 - 0.05, fov, rect), Bp = fit(head, az, el0 + 0.12, fov, rect);
            P = mix(A, { ...Bp, pos: V(lerp(A.pos.x, Bp.pos.x, 0.5), Bp.pos.y, lerp(A.pos.z, Bp.pos.z, 0.5)) }, e); P.quat = (() => { const f = P.c.clone().sub(P.pos).normalize(); return lookQuat(P.pos, A.c.clone().lerp(Bp.c, e)); })();
          } else P = mix(fit(pts, az, el, fov, rect), fit(B(to), az, el + 0.1, fov, rect), e);
          break;
        }
        case 'pan': if (sh.kind === 'row') { P = fit(pts, az0 + lerp(-0.06, 0.06, e), el, fov, [0.04, 0.96, rect[2], 0.72]); break; }   // fix2 l59: the whole row stays inside
          // frame check 2026-11-15 (l15): the piece the pan leaves keeps its head and hat in frame (it used to be cut by the top edge mid-pan)
          if (to) { let y1 = 0; for (const q of pts) y1 = Math.max(y1, q.y); const heads = sub.board ? [] : pts.filter((q) => q.y >= y1 - 0.004); P = mix(fit(pts, az, el, fov, rect), fit(B(to).concat(heads), az + 0.1, el, fov, rect), e); }
          else P = fit(pts, az0 + lerp(-0.2, 0.2, e), el, fov, rect); break;
        // frame check 2026-11-15 (l63): a drop to `to` is a fast, bold fall (~12 % of the shot) that then holds on `to`: the old drop over the
        // whole line left the fallen pieces half cut under the caption and showed the faded tower with its king hanging over nothing
        case 'drop': P = to ? mix(fit(pts, az, el + 0.22, fov, rect), fit(B(to), az, Math.max(0.12, el - 0.08), fov, rect), smooth(clamp(u / 0.12))) : fit(pts, az, lerp(el + 0.3, el, e), fov, rect); break;
        case 'rack': { const both = [...pts, ...(to ? B(to) : [])]; P = mix(fit(both, az, el, fov, rect), fit(to ? B(to) : pts, az, el, fov, rect), 0.3 * e); break; }
        default: P = scaleOut(fit(pts, az, el, fov, rect), lerp(1.06, 1.0, e));
      }
      // a continuous shot glides from the previous pose; the end line-up arrives within ~3.5 s (not over the whole 11 s hold)
      if (sh.continuous && prevPose) P = mix(prevPose, P, endLine ? smooth(clamp(u / 0.3)) : e);
      return setPose(P);
    }
    function setPose(P) {
      K.camera.position.copy(P.pos); K.camera.quaternion.copy(P.quat); K.camera.updateMatrixWorld(true);
      K.lens.fov = P.fov; K.lens.fstop = 16; K.lens.focus = Math.max(0.05, P.D);
      K.camera.fov = P.fov; K.camera.updateProjectionMatrix();
      const near = Math.max(0.05, P.D * 0.7), far = P.D * 2.4 + 0.5; scene.fog.near = near; scene.fog.far = far; shared.uFog.value.set(near, far);
      return P;
    }
    const lookM = new THREE.Matrix4();
    function lookQuat(pos, tgt) { lookM.lookAt(pos, tgt, UP); return new THREE.Quaternion().setFromRotationMatrix(lookM); }
    return { apply, fit, mix, setPose };
  })();

  /* ================================================================ TAGS + COUNTER (screen layout) */
  const proj = V();
  function toScreen(p) { proj.copy(p).project(K.camera); return [(proj.x + 1) / 2, (1 - proj.y) / 2, proj.z < 1]; }
  // short leader lines from a moved tag to its anchor (overlay layer, like the cards)
  const leaderMat = N.lineMat(HUE.white, 2.2 * PX, 0.55); leaderMat.transparent = true; leaderMat.depthTest = false; leaderMat.depthWrite = false; leaderMat.toneMapped = false;
  const leaders = Array.from({ length: 10 }, () => { const l = N.segments([0, 0, 0, 0, 0, 0.001], leaderMat); l.layers.set(1); l.renderOrder = 99; l.visible = false; scene.add(l); return l; });
  function leader(l, ax, ay, bx2, by2) {
    const c = K.camera, th = Math.tan(K.lens.fov * Math.PI / 360), d = 0.2, hF = 2 * d * th, wF = hF * K.W / K.H;
    c.matrixWorld.extractBasis(cX, cY, cZ);
    const P = (sx, sy) => c.position.clone().addScaledVector(cZ, -d).addScaledVector(cX, (sx - 0.5) * wF).addScaledVector(cY, (0.5 - sy) * hF);
    const A = P(ax, ay), B = P(bx2, by2); l.geometry.setPositions([A.x, A.y, A.z, B.x, B.y, B.z]); l.visible = true;
  }
  function layoutTags(state) {
    for (const m of labels) m.visible = false;
    for (const l of leaders) l.visible = false;
    const hook = !!(state.title && (state.title.opacity ?? 0) > 0.001);
    const placed = [], obst = [];
    const endText = hook && (state.t ?? 0) > 10;   // the last line has no caption: its tags may use the band below the line-up
    const BAND = endText ? END_BAND : [0.215, 0.435];   // 2026-11-15: long-form end text is ONE line centred at 32 % of the height (long.ts LEND y -18), not the Short's band   // the burned hook text (build.ts HOOK y -22, two lines) / end text (END y -30, two lines at 140 px)
    const SAFE = [0.03, 0.97, 0.045, 0.725];   // fix2: never in the subtitle band, also in l65 (QA r2)   // never in the subtitle band (74-88 %), never cut by the frame
    // the counters: one fixed corner (top right), the TOTAL under it
    counterLabel.visible = false; totalLabel.visible = false;
    let cy0 = 0.05;
    for (const [lab, ct] of [[counterLabel, state.counter], [totalLabel, state.total]]) {
      if (!ct || (ct.opacity ?? 0) <= 0.003) continue;
      lab.setText(ct.text, '#FFC94A'); const [w, h] = cardSize(lab, 0.042);
      hud(lab, 0.965 - w / 2, cy0 + h / 2, 0.042, ct.opacity); placed.push([0.965 - w, cy0, 0.965, cy0 + h]); cy0 += h + 0.01;
    }
    // what the shot is about stays uncovered: every subject piece is an obstacle for every tag
    const scr = (pts) => { let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const p of pts) { const [x, y] = toScreen(p); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
    const sh = state.shot ?? {};
    for (const S of [sh.subject, sh.to]) {
      if (!S) continue;
      for (const id of S.players ?? []) { const b = objects.bounds({ players: [id] }, state); if (b.length) obst.push(scr(b)); }
      for (const id of S.extras ?? []) { const b = objects.bounds({ extras: [id] }, state); if (b.length) obst.push(scr(b)); }
      for (const id of S.chips ?? []) { const c = objects.chipTop.get(id); if (c) { const R = CHIP.radius; obst.push(scr([V(c.x - R, c.y0, c.z), V(c.x + R, c.y, c.z)])); } }
      if (S.king) { const b = objects.bounds({ king: true }, state); if (b.length) obst.push(scr(b)); }
      if (S.skeptic) { const b = objects.bounds({ skeptic: true }, state); if (b.length) obst.push(scr(b)); }
    }
    // frame check 2026-11-15 (l19 '782', l21 '55%', l51 '71%'): in every shot the king and the hatted pawns (head + hat part) are obstacles too
    {
      const headBox = (b) => { let y1 = 0; for (const q of b) y1 = Math.max(y1, q.y); const top = b.filter((q) => q.y >= y1 - 0.004), lo = Math.max(0, y1 - 0.045); return top.concat(top.map((q) => V(q.x, lo, q.z))); };
      for (const p of state.players ?? []) if (p.role && (p.hat ?? 0) > 0.5 && (p.present ?? 1) > 0.5 && (p.down ?? 0) < 0.5) { const b = objects.bounds({ players: [p.id] }, state); if (b.length) obst.push(scr(headBox(b))); }
      if (state.king?.on != null && (state.king.drop ?? 0) > 0.5) { const b = objects.bounds({ king: true }, state); if (b.length) obst.push(scr(headBox(b))); }
    }
    for (const [, c] of objects.coinAt) { const R = (c.R ?? BIG.radius) * 1.1; obst.push(scr([c.p.clone().add(V(-R, -R, 0)), c.p.clone().add(V(R, R, 0)), c.p.clone().add(V(0, 0, R)), c.p.clone().add(V(0, 0, -R))])); }   // frame check l49 '150': never on the coin
    if (sh.subject?.board) {   // frame check (l51): the tallest tower of a board shot is not covered by a tag either (its top part)
      let best = null; for (const p of state.players ?? []) if ((p.present ?? 1) > 0.5 && (!best || p.coins > best.coins)) best = p;
      if (best && best.coins > 400) { const b = objects.bounds({ players: [best.id] }, state); if (b.length) { const r = scr(b); obst.push([r[0], r[1], r[2], Math.min(r[3], r[1] + 0.6 * (r[3] - r[1]))]); } }
    }
    const spots = screenSpots(state);
    const order = [...(state.tags ?? [])].filter((g) => (g.opacity ?? 0) > 0.003).sort((a, b) => ({ l: 0, m: 1, s: 2 })[a.size ?? 'm'] - ({ l: 0, m: 1, s: 2 })[b.size ?? 'm']);
    const over = (r, q, mx = 0.008, my = 0.006) => r[0] < q[2] + mx && r[2] > q[0] - mx && r[1] < q[3] + my && r[3] > q[1] - my;
    const hit = (r) => placed.some((q) => over(r, q));
    const covers = (r) => obst.some((q) => over(r, q, 0.002, 0.002));
    const bad = (r) => r[0] < SAFE[0] - 1e-6 || r[2] > SAFE[1] + 1e-6 || r[1] < SAFE[2] - 1e-6 || r[3] > SAFE[3] + 1e-6 || (hook && r[3] > BAND[0] && r[1] < BAND[1]);
    // fix2 (QA r2 l65): under the end text the four names stand in two staggered rows right above the line-up, each centred over ITS pawn
    // (left to right in the pawns' order), the lower row just over the heads
    const forced = new Map();
    if (endText) {
      const nm = order.filter((g) => g.anchor?.player != null && g.kind === 'name').map((g) => { const [sx, sy] = toScreen(objects.anchor(g.anchor, state, 'tag')); const [, by] = toScreen(objects.anchor(g.anchor, state, 'base')); return { g, sx, sy, by }; }).sort((p, q) => p.sx - q.sx);
      // frame check 2026-11-15: names as large as the spacing allows (cap up to 4.6 % of the height, phone-readable); names in the same row
      // (every second pawn) keep >= 3 % of the width between them; the two rows have a clear gap; no leader lines (each name is under its pawn)
      if (nm.length >= 1) {
        // spacing from all four named pawns (not only the names already up), so the size never jumps when the next name arrives
        const xs = (state.players ?? []).filter((p) => p.role && (p.present ?? 1) > 0.5).map((p) => toScreen(objects.anchor({ player: p.id }, state, 'base'))[0]).sort((a, b) => a - b);
        let gap = 1; for (let i = 0; i + 2 < xs.length; i++) gap = Math.min(gap, xs[i + 2] - xs[i]);
        const c0 = 0.04; let wMax = 0; for (const n of nm) { measure.setText(n.g.text, '#fff'); wMax = Math.max(wMax, boxSize(measure, c0)[0]); }
        const cp = clamp(c0 * (gap - 0.03) / Math.max(1e-3, wMax), 0.03, 0.046), hh = cp / 0.5 * 0.8, by = Math.max(...nm.map((n) => n.by));
        nm.forEach((n, i) => forced.set(n.g, { x: n.sx, y: Math.min(0.93 - hh / 2, by + 0.018 + hh / 2 + (i % 2 ? hh + 0.016 : 0)), cap: cp }));
      }
    }
    let li = 0, ll = 0;
    for (const g of order) {
      if (li >= labels.length) break;
      const a = g.anchor ?? {}, big = g.kind === 'number' && a.chips != null;   // numbers a viewer must read are large (tally counts)
      const fz = forced.get(g), m = labels[li++]; let cap = (fz ? fz.cap : big ? 0.062 : CAP[g.size ?? 'm']) * (1 + 0.22 * clamp(g.pop ?? 0));
      m.setText(g.text, TAG_CSS[g.color ?? 'null'] ?? TAG_CSS.null);
      let [w, h] = boxSize(m, cap);
      let cx, cy, mode = 'above';
      if (a.screen) { const sp = spots.get(g.id); cx = sp ? sp[0] : a.screen[0]; cy = sp ? sp[1] : a.screen[1]; mode = 'centre'; }
      else {
        const wp = objects.anchor(a, state, 'tag'); const [sx, sy] = toScreen(wp); cx = sx; cy = sy;
        if (a.coin != null) { const c = objects.coinAt.get(a.coin); if (c) { const [ox] = toScreen(c.p.clone().add(V((c.R ?? BIG.radius) * 1.25, 0, 0).applyQuaternion(K.camera.quaternion))); const dx = Math.abs(ox - sx) + 0.012; cx = a.side === 'tails' ? sx + dx + w / 2 : sx - dx - w / 2; mode = 'centre'; } }
      }
      let rectAt = (x, y) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
      let y = mode === 'above' ? cy - h / 2 - 0.006 : cy, x = cx;
      if (a.skeptic && mode === 'above' && g.kind === 'name') { const [, by] = toScreen(objects.anchor(a, state, 'base')); y = by + h / 2 + 0.014; }   // frame check l31: the Skeptic stands in front of the crowd: its name goes on the black table under it
      // while the hook / end text is up, a name over a head would sit in its band: hang it under the piece's foot instead
      if (hook && !endText && mode === 'above' && y + h / 2 > BAND[0] && y - h / 2 < BAND[1] && (a.player != null || a.extra != null || a.skeptic)) { const [, by] = toScreen(objects.anchor(a, state, 'base')); y = by + h / 2 + 0.012; }
      const x0 = x, y0 = y, free = (rr) => !hit(rr) && !bad(rr) && !covers(rr);
      let r = rectAt(clamp(x, SAFE[0] + w / 2, SAFE[1] - w / 2), clamp(y, SAFE[2] + h / 2, SAFE[3] - h / 2));
      if (fz) r = rectAt(clamp(fz.x, SAFE[0] + w / 2, SAFE[1] - w / 2), fz.y);
      else if (!free(r)) {   // the nearest free spot: up first, then sideways and down; a tag moved off its anchor gets a leader line
        // frame check 2026-11-15 (l51 '36 under one coin'): when no spot is free at full size the tag shrinks (to 78 %, then 62 %) before it may cover a subject
        let best = null; const cap0 = cap;
        for (const k of [1, 0.78, 0.62]) {
          cap = cap0 * k; [w, h] = boxSize(m, cap); rectAt = (x, y) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; let bc = 1e9;
          for (const dy of [0, -0.5, -1, -1.5, -2, -2.6, -3.3, -4.2, 0.6, 1.2, 1.9, 2.7, 3.6, 4.6]) for (const dx of [0, -0.35, 0.35, -0.7, 0.7, -1.05, 1.05, -1.5, 1.5, -2.1, 2.1]) {
            const px = clamp(x0 + dx * w, SAFE[0] + w / 2, SAFE[1] - w / 2), py = clamp(y0 + dy * h, SAFE[2] + h / 2, SAFE[3] - h / 2), rr = rectAt(px, py);
            const cost = Math.hypot((px - x0) * 1.0, (py - y0) * (py > y0 ? 1.5 : 1.0)); if (cost >= bc || !free(rr)) continue; bc = cost; best = rr;
          }
          if (best || k < 0.7) break;
        }
        if (!best) { cap = cap0; [w, h] = boxSize(m, cap); rectAt = (x, y) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; for (const dy of [0, -0.6, -1.2, 0.8, 1.6, -2, 2.4]) for (const dx of [0, -0.6, 0.6, -1.2, 1.2]) { const rr = rectAt(clamp(x0 + dx * w, SAFE[0] + w / 2, SAFE[1] - w / 2), clamp(y0 + dy * h, SAFE[2] + h / 2, SAFE[3] - h / 2)); if (!hit(rr) && !bad(rr)) { best = rr; break; } } }
        if (best) r = best;
      }
      x = (r[0] + r[2]) / 2; y = (r[1] + r[3]) / 2;
      placed.push(r); if (globalThis.NEON_DEBUG) globalThis.NEON_DEBUG.push({ text: g.text, cx, cy, mode, r });
      hud(m, x, y, cap, g.opacity ?? 1);
      if (!a.screen && !fz && ll < leaders.length && (g.opacity ?? 0) > 0.3) {   // leader: from the nearest edge of the tag to the anchor point
        const ax = clamp(cx, r[0], r[2]), ay = clamp(cy, r[1], r[3]), dist = Math.hypot(ax - cx, (ay - cy) * K.H / K.W);
        if (dist > 0.03) { const k = 0.012 / Math.max(dist, 1e-3); leader(leaders[ll++], ax, ay, cx + (ax - cx) * k * 0.5, cy + (ay - cy) * k * 0.5); }
      }
    }
  }

  /* ================================================================ draw */
  // a continuous shot starts from the pose the previous shot has at that moment: evaluated from the model (memo per shot start = pure)
  const poseMemo = new Map();
  function poseAt(tq, depth = 0) {
    const key = tq.toFixed(4); if (poseMemo.has(key)) return poseMemo.get(key);
    const st = show.state(tq), sh = st.shot ?? {};
    const prev = sh.continuous && depth < 12 && sh.t0 != null ? poseAt(sh.t0 - 1e-3, depth + 1) : null;
    objects.update(st, tq, null); const P = camera.apply(st, tq, prev);
    if (poseMemo.size > 400) poseMemo.clear(); poseMemo.set(key, { pos: P.pos.clone(), quat: P.quat.clone(), fov: P.fov, D: P.D, c: P.c.clone() });
    return poseMemo.get(key);
  }
  // The camera and the tag layout are computed once per output frame (from the model at the frame's own time) and reused by the
  // 16 sub-frames inside its shutter: objects still move (motion blur), the frame stays sharp and the cost drops to one pass.
  // A memo keyed by the frame time, so draw stays a pure function of (state, t). Sub-frames on the other side of a cut compute their own.
  let frameMemo = null, tagsFor = null;
  function framePose(tq) {
    if (frameMemo && frameMemo.tq === tq) return frameMemo;
    const st = show.state(tq), sh = st.shot ?? {};
    const prev = sh.continuous && sh.t0 != null ? poseAt(sh.t0 - 1e-3) : null;
    objects.update(st, tq, null); const P = camera.apply(st, tq, prev);
    frameMemo = { tq, st, id: sh.id, P: { pos: P.pos.clone(), quat: P.quat.clone(), fov: P.fov, D: P.D, c: P.c.clone() } };
    return frameMemo;
  }
  function draw(state, t) {
    // the camera needs the entities (bounds) and the rings need the camera (thinning): entities -> camera -> instances
    const sh = state.shot ?? {};
    const fps = K.fps ?? 30, tq = Math.floor(t * fps + 1e-6) / fps;
    const F = show ? framePose(tq) : null;
    if (F && F.id === sh.id) camera.setPose(F.P);
    else { const prev = show && sh.continuous && sh.t0 != null ? poseAt(sh.t0 - 1e-3) : null; objects.update(state, t, null); camera.apply(state, t, prev); }
    objects.update(state, t, K.camera);
    if (F && F.id === sh.id) { if (tagsFor !== tq) { layoutTags(F.st); tagsFor = tq; } }
    else { layoutTags(state); tagsFor = null; }
    K.exposure = 1; K.shutter = 0.5;
  }
  const api = { draw, objects, camera, labels, sets: { pawns, rings, columns, kings } }; globalThis.NEON_VIEW = api;
  return api;
}
export default makeView;
