// test3d page engine: photographic renderer for small table-top scenes. Every output frame is a pure function of t.
// Per frame: N sub-frames accumulated in half-float HDR, each one jittered in (a) time across the shutter (motion blur),
// (b) camera position on the lens disk with the focus plane held still (thin-lens depth of field), (c) sub-pixel offset (AA),
// (d) light positions (soft area shadows). Then: gap-filling bokeh blur -> bloom -> vignette -> AgX/ACES -> grain -> sRGB -> WebCodecs H.264.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { makeKit } from './kit/index.js';
import * as U from './kit/util.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.get(k) !== null && q.get(k) !== '' && isFinite(+q.get(k)) ? +q.get(k) : d);
const W = num('w', 1080), H = num('h', 1920);
const SUB = Math.max(1, Math.round(num('sub', 16))), SHUTTER = num('shutter', 0.5);
const TM = q.get('tm') === 'aces' ? 'aces' : 'agx';
// sensor height (m) when the film gives none: a full-frame 36 mm long side, so 0.036 in portrait (unchanged) and 0.02025 at 16:9
const SENSOR = 0.036 * Math.min(1, H / W);
const BLOOM = num('bloom', 0.45), GRAIN = num('grain', 0.02), VIG = num('vig', 0.28), FILL = num('fill', 1.9), DOF = num('dof', 1) > 0;

function sampleSets(n) {
  if (n === 1) return { time: [0], lens: [[0, 0]], light: [[0, 0]], pix: [[0, 0]] };
  const perm = (seed) => { const a = [...Array(n).keys()], r = U.rng(seed); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const vogel = (rot) => [...Array(n)].map((_, k) => { const r = Math.sqrt((k + 0.5) / n), a = k * 2.39996323 + rot; return [r * Math.cos(a), r * Math.sin(a)]; });
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const pT = perm(11), pL = perm(23), pP = perm(37), vl = vogel(0.6), vg = vogel(2.1);
  return { time: pT.map((i) => (i + 0.5) / n), lens: vl, light: pL.map((i) => vg[i]), pix: pP.map((i) => [halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5]) };
}

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';

async function boot() {
  const score = await (await fetch(q.get('score') ?? '/score.json')).json();
  const fps = score.fps ?? 30;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.008, 60);

  const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}']/gu, '');
  const K = {
    THREE, scene, camera, renderer, score, fps, duration: score.duration, W, H,
    /** lens the film sets in frame(t): focus = metres from the camera to the plane in focus, fstop = aperture (lower = blurrier), fov = vertical degrees */
    lens: { focus: 0.3, fstop: 8, fov: 30, sensor: SENSOR },
    exposure: 1,
    /** shutter as a fraction of the frame time (0.5 = 180 degrees); a film may set it per shot in frame(t) */
    shutter: SHUTTER,
    onFrame: [], areaLights: [], cues: [], mirror: null,
    ...U,
    /** round a time to the frame grid (put cuts on frames so the shutter never straddles two shots) */
    snap: (t) => Math.round(t * fps) / fps,
    v3: (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z),
    /** place the camera: K.look(pos, target, rollRadians) (pos/target = Vector3 or [x, y, z]) */
    look(pos, target, roll = 0) {
      const p = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z], l = Array.isArray(target) ? target : [target.x, target.y, target.z];
      camera.position.set(p[0], p[1], p[2]); camera.up.set(0, 1, 0); camera.lookAt(l[0], l[1], l[2]); if (roll) camera.rotateZ(roll);
    },
    /** distance from the camera to a world point along the view axis (what K.lens.focus expects); call after K.look */
    focusDist(point) { const p = Array.isArray(point) ? new THREE.Vector3(...point) : point; camera.updateMatrixWorld(); return Math.max(0.01, -p.clone().applyMatrix4(camera.matrixWorldInverse).z); },
    sfx(name, t, db = -18, dur = undefined) { if (t >= 0 && t < score.duration) K.cues.push({ name, t: +(+t).toFixed(3), db: +(+db).toFixed(1), ...(dur !== undefined ? { dur: +(+dur).toFixed(3) } : {}) }); },
    line(id) { const l = (score.lines ?? []).find((x) => x.id === id); if (!l) throw new Error(`film: no line "${id}" in score.json (lines: ${(score.lines ?? []).map((x) => x.id).join(', ') || 'none'})`); return l; },
    wordAt(lineId, w, n = 0) {
      const l = K.line(lineId), hits = (l.words ?? []).filter((x) => norm(x.w) === norm(w)), h = hits[n < 0 ? hits.length + n : n];
      if (!h) throw new Error(`film: word "${w}" #${n} not in line "${lineId}" (${(l.words ?? []).map((x) => x.w).join(' ')})`);
      return h;
    },
    /** start / end time of the n-th (0-based, negative = from the end) word of a line matching w (case and punctuation ignored) */
    word(lineId, w, n = 0) { return K.wordAt(lineId, w, n).t0; },
    wordEnd(lineId, w, n = 0) { return K.wordAt(lineId, w, n).t1; },
  };
  K.kit = makeKit(K);
  window.K = K;

  const mod = await import(q.get('film') ?? '/ep/film.js');
  const film = await mod.default(K);
  if (!film || typeof film.frame !== 'function') throw new Error('film: build(K) must return { frame(t) }');

  // ---------- targets ----------
  const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
  const rtSub = new THREE.WebGLRenderTarget(W, H, { ...hf, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
  const mip = { ...hf, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter };
  const rtRefl = new THREE.WebGLRenderTarget(W, H, { ...mip, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
  const rtAcc = new THREE.WebGLRenderTarget(W, H, { ...mip, depthBuffer: false });
  const rtDof = new THREE.WebGLRenderTarget(W, H, { ...hf, depthBuffer: false });
  const LEV = 6, rtB = []; for (let i = 0, w = W >> 1, h = H >> 1; i < LEV; i++, w = Math.max(2, w >> 1), h = Math.max(2, h >> 1)) rtB.push(new THREE.WebGLRenderTarget(w, h, { ...hf, depthBuffer: false }));

  const quad = (uniforms, frag, extra = {}) => new FullScreenQuad(new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: frag, depthTest: false, depthWrite: false, ...extra }));
  const ADD = { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, blendEquation: THREE.AddEquation };
  // accumulate one sub-frame; alpha carries the circle-of-confusion radius (px) so the fill blur knows how far apart the lens samples landed
  const accQ = quad({ tex: { value: rtSub.texture }, tDepth: { value: rtSub.depthTexture }, w: { value: 1 }, near: { value: 0.01 }, far: { value: 60 }, focus: { value: 1 }, cocK: { value: 0 } }, `
    #include <packing>
    uniform sampler2D tex; uniform sampler2D tDepth; uniform float w, near, far, focus, cocK; varying vec2 vUv;
    void main(){ vec4 c = texture2D( tex, vUv ); float z = - perspectiveDepthToViewZ( texture2D( tDepth, vUv ).x, near, far );
      float coc = min( cocK * abs( 1.0 / focus - 1.0 / z ), 500.0 );
      gl_FragColor = vec4( clamp( c.rgb, 0.0, 80.0 ) * w, coc * clamp( c.a, 0.0, 1.0 ) * w ); }`, ADD);
  // gap-filling blur: N lens samples leave N ghost copies of anything out of focus; blur by about one sample spacing so they merge into a smooth disc
  const dofQ = quad({ tex: { value: rtAcc.texture }, inv: { value: new THREE.Vector2(1 / W, 1 / H) }, fillK: { value: 0 } }, `
    uniform sampler2D tex; uniform vec2 inv; uniform float fillK; varying vec2 vUv;
    float ign( vec2 p ){ return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
    void main(){ vec4 c0 = textureLod( tex, vUv, 0.0 ); float r0 = c0.a * fillK;
      if ( r0 < 0.6 ) { gl_FragColor = vec4( c0.rgb, 1.0 ); return; }
      // every tap reads a mip that covers its share of the disc, so small bright glints are averaged instead of sparkling
      float rot = ign( gl_FragCoord.xy ) * 6.2831853; float lod = clamp( log2( max( r0 * 0.2, 1.0 ) ), 0.0, 4.0 ); vec3 sum = c0.rgb; float ws = 1.0;
      for ( int i = 0; i < 64; i ++ ) { float fi = float( i ) + 0.5; float d = sqrt( fi / 64.0 ) * r0; float a = fi * 2.39996323 + rot;
        vec4 s = textureLod( tex, vUv + vec2( cos( a ), sin( a ) ) * d * inv, lod ); float k = smoothstep( d - 1.5, d + 0.5, s.a * fillK * 1.15 ); sum += s.rgb * k; ws += k; }
      gl_FragColor = vec4( sum / ws, 1.0 ); }`);
  const preQ = quad({ tex: { value: rtDof.texture }, exposure: { value: 1 }, thr: { value: num('bloomthr', 1.4) } }, `
    uniform sampler2D tex; uniform float exposure, thr; varying vec2 vUv;
    void main(){ vec3 c = min( texture2D( tex, vUv ).rgb * exposure, vec3( 40.0 ) ); float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      gl_FragColor = vec4( c * ( clamp( ( l - thr ) / max( l, 1e-4 ), 0.0, 1.0 ) + 0.012 ), 1.0 ); }`);
  const downQ = quad({ tex: { value: null }, inv: { value: new THREE.Vector2() } }, `
    uniform sampler2D tex; uniform vec2 inv; varying vec2 vUv;
    void main(){ vec3 c = texture2D( tex, vUv ).rgb * 4.0; c += texture2D( tex, vUv + inv * vec2( -1.0, -1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 1.0, -1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( -1.0, 1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 1.0, 1.0 ) ).rgb;
      gl_FragColor = vec4( c / 8.0, 1.0 ); }`);
  const upQ = quad({ tex: { value: null }, inv: { value: new THREE.Vector2() }, k: { value: 1 } }, `
    uniform sampler2D tex; uniform vec2 inv; uniform float k; varying vec2 vUv;
    void main(){ vec3 c = texture2D( tex, vUv ).rgb * 4.0;
      c += ( texture2D( tex, vUv + inv * vec2( -1.0, 0.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 1.0, 0.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 0.0, -1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 0.0, 1.0 ) ).rgb ) * 2.0;
      c += texture2D( tex, vUv + inv * vec2( -1.0, -1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 1.0, -1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( -1.0, 1.0 ) ).rgb + texture2D( tex, vUv + inv * vec2( 1.0, 1.0 ) ).rgb;
      gl_FragColor = vec4( c / 16.0 * k, 1.0 ); }`, ADD);
  const outQ = quad({ tex: { value: rtDof.texture }, tBloom: { value: rtB[0].texture }, uBloom: { value: BLOOM }, uVig: { value: VIG }, uGrain: { value: GRAIN }, uFrame: { value: 0 }, uAspect: { value: W / H }, uLook: { value: new THREE.Vector2(num('contrast', 1.16), num('sat', 1.12)) } }, `
    #include <common>
    #include <tonemapping_pars_fragment>
    uniform sampler2D tex; uniform sampler2D tBloom; uniform float uBloom, uVig, uGrain, uFrame, uAspect; uniform vec2 uLook; varying vec2 vUv;
    float h3( uvec3 v ){ v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; return float( v.x ) * ( 1.0 / 4294967296.0 ); }
    void main(){
      vec3 c = texture2D( tex, vUv ).rgb + texture2D( tBloom, vUv ).rgb * uBloom / toneMappingExposure;
      vec2 p = ( vUv - 0.5 ) * vec2( uAspect, 1.0 ); float d = length( p ) / length( vec2( uAspect, 1.0 ) * 0.5 );
      c *= 1.0 - uVig * pow( d, 2.4 );
      c = ${TM === 'aces' ? 'ACESFilmicToneMapping' : 'AgXToneMapping'}( max( c, vec3( 0.0 ) ) );
      c = clamp( c, 0.0, 1.0 );
      // look: a little contrast around mid grey and saturation (AgX alone is flat)
      c = pow( c, vec3( uLook.x ) ) * pow( 0.18, 1.0 - uLook.x );
      float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); c = max( vec3( 0.0 ), l + ( c - l ) * uLook.y );
      c = mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) );
      uvec3 s = uvec3( uint( gl_FragCoord.x ), uint( gl_FragCoord.y ), uint( uFrame ) );
      float n = h3( s ) + h3( s + uvec3( 7u, 13u, 101u ) ) - 1.0;
      float lum = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c += n * uGrain * mix( 1.0, 0.35, smoothstep( 0.1, 0.9, lum ) );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 ); }`);

  // ---------- frame ----------
  const S = sampleSets(SUB);
  const P0 = new THREE.Matrix4(), pos0 = new THREE.Vector3(), camR = new THREE.Vector3(), camU = new THREE.Vector3();
  const vcam = new THREE.PerspectiveCamera(); vcam.matrixAutoUpdate = false; vcam.matrixWorldAutoUpdate = false;
  const Rm = new THREE.Matrix4(), Sx = new THREE.Matrix4().makeScale(-1, 1, 1), clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), CLIP = [clipPlane], NOCLIP = [];
  const la = new THREE.Vector3(), lb = new THREE.Vector3(), ld = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const lightKeep = new Map();

  function pose(ts) {
    film.frame(ts);
    const L = K.lens; camera.fov = L.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    L.focus = Math.max(0.01, L.focus);
    L.A = DOF ? (L.sensor ?? SENSOR) / 2 / Math.tan(L.fov * Math.PI / 360) / (2 * Math.max(0.5, L.fstop)) : 0;   // aperture radius in metres
    for (const h of K.onFrame) h(ts, camera, L);
    return L;
  }

  function frame(t, fi = Math.round(t * fps)) {
    renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.shadowMap.autoUpdate = false;
    if (SUB > 1) film.frame(t);   // lets the film choose K.shutter for this frame
    const shutter = K.shutter;
    for (let k = 0; k < SUB; k++) {
      const ts = Math.max(0, t + S.time[k] * shutter / fps), L = pose(ts), s = L.focus;
      const pe = camera.projectionMatrix.elements;
      pe[8] -= 2 * S.pix[k][0] / W; pe[9] -= 2 * S.pix[k][1] / H;                       // (c) sub-pixel
      P0.copy(camera.projectionMatrix); pos0.copy(camera.position);
      const dx = S.lens[k][0] * L.A, dy = S.lens[k][1] * L.A;                             // (b) lens disk, focus plane fixed
      camR.setFromMatrixColumn(camera.matrixWorld, 0); camU.setFromMatrixColumn(camera.matrixWorld, 1);
      camera.position.addScaledVector(camR, dx).addScaledVector(camU, dy); camera.updateMatrixWorld(true);
      pe[8] -= pe[0] * dx / s; pe[9] -= pe[5] * dy / s;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      for (const l of K.areaLights) {                                                     // (d) area lights
        lightKeep.set(l, l.position.clone());
        ld.copy(l.position).sub(l.target.position); const D = ld.length(); ld.normalize();
        la.crossVectors(ld, Math.abs(ld.y) > 0.95 ? camR.set(1, 0, 0) : up).normalize(); lb.crossVectors(ld, la);
        const r = (l.userData.spread ?? 0.05) * D; l.position.addScaledVector(la, S.light[k][0] * r).addScaledVector(lb, S.light[k][1] * r); l.updateMatrixWorld();
      }
      renderer.shadowMap.needsUpdate = true;
      const bg = scene.background;
      if (K.mirror) {                                                                     // planar reflection for the polished board
        const y0 = K.mirror.y; Rm.set(1, 0, 0, 0, 0, -1, 0, 2 * y0, 0, 0, 1, 0, 0, 0, 0, 1);
        vcam.matrixWorld.multiplyMatrices(Rm, camera.matrixWorld).multiply(Sx); vcam.matrixWorldInverse.copy(vcam.matrixWorld).invert();
        vcam.projectionMatrix.copy(camera.projectionMatrix); vcam.projectionMatrix.elements[8] *= -1; vcam.projectionMatrixInverse.copy(vcam.projectionMatrix).invert();
        clipPlane.constant = -(y0 + 0.00015); renderer.clippingPlanes = CLIP; scene.background = null;
        K.mirror.uniforms.tRefl.value = null; K.mirror.uniforms.tReflDepth.value = null; K.mirror.mesh.visible = false;
        K.mirror.uniforms.uLens.value.set(camera.near, camera.far, s, W / 2 * P0.elements[0] * L.A * (SUB > 1 ? FILL / Math.sqrt(SUB) : 0));
        renderer.setRenderTarget(rtRefl); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, vcam);
        renderer.clippingPlanes = NOCLIP; scene.background = bg; K.mirror.mesh.visible = true; K.mirror.uniforms.tRefl.value = rtRefl.texture; K.mirror.uniforms.tReflDepth.value = rtRefl.depthTexture;
      }
      camera.layers.set(0);
      renderer.setRenderTarget(rtSub); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      // sharp layer (number tags, bokeh discs, dust): same instant and sub-pixel offset, no lens offset
      camera.position.copy(pos0); camera.updateMatrixWorld(true); camera.projectionMatrix.copy(P0); camera.projectionMatrixInverse.copy(P0).invert();
      camera.layers.set(1); scene.background = null; renderer.autoClear = false; renderer.render(scene, camera); renderer.autoClear = true; scene.background = bg; camera.layers.set(0);
      for (const l of K.areaLights) { l.position.copy(lightKeep.get(l)); l.updateMatrixWorld(); }
      const u = accQ.material.uniforms; u.w.value = 1 / SUB; u.near.value = camera.near; u.far.value = camera.far; u.focus.value = s; u.cocK.value = W / 2 * P0.elements[0] * L.A;
      rtAcc.texture.generateMipmaps = k === SUB - 1;   // mips once, after the last sub-frame
      renderer.setRenderTarget(rtAcc); renderer.autoClear = false; accQ.render(renderer); renderer.autoClear = true;
    }
    renderer.shadowMap.autoUpdate = true;
    // post
    dofQ.material.uniforms.fillK.value = SUB > 1 ? FILL / Math.sqrt(SUB) : 0;
    renderer.setRenderTarget(rtDof); dofQ.render(renderer);
    if (BLOOM > 0) {
      preQ.material.uniforms.exposure.value = K.exposure; renderer.setRenderTarget(rtB[0]); preQ.render(renderer);
      for (let i = 1; i < LEV; i++) { downQ.material.uniforms.tex.value = rtB[i - 1].texture; downQ.material.uniforms.inv.value.set(1 / rtB[i - 1].width, 1 / rtB[i - 1].height); renderer.setRenderTarget(rtB[i]); downQ.render(renderer); }
      renderer.autoClear = false;
      for (let i = LEV - 2; i >= 0; i--) { upQ.material.uniforms.tex.value = rtB[i + 1].texture; upQ.material.uniforms.inv.value.set(1 / rtB[i + 1].width, 1 / rtB[i + 1].height); upQ.material.uniforms.k.value = 1; renderer.setRenderTarget(rtB[i]); upQ.render(renderer); }
      renderer.autoClear = true;
    }
    outQ.material.uniforms.uFrame.value = fi; outQ.material.uniforms.uBloom.value = BLOOM / LEV;
    renderer.toneMappingExposure = K.exposure;
    renderer.setRenderTarget(null); outQ.render(renderer);
  }

  // ---------- encoder + API (same shapes as kids3d) ----------
  const N = Math.round(score.duration * fps);
  let enc = null, chunks = [], encErr = null, firstKey = false;
  const api = {
    info: () => ({ gl: (() => { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; })(), frames: N, fps, width: W, height: H, duration: score.duration, sub: SUB, cues: [...K.cues].sort((a, b) => a.t - b.t) }),
    async encStart(bitrate = 24e6) {
      chunks = []; encErr = null; firstKey = true;
      enc = new VideoEncoder({ output: (c) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); chunks.push(b); }, error: (e) => { encErr = String(e); } });
      const base = { codec: 'avc1.640033', width: W, height: H, bitrate, framerate: fps, avc: { format: 'annexb' }, latencyMode: 'quality', bitrateMode: 'variable' };
      for (const hw of ['prefer-hardware', 'no-preference']) { const cfg = { ...base, hardwareAcceleration: hw }; if ((await VideoEncoder.isConfigSupported(cfg)).supported) { enc.configure(cfg); return hw; } }
      throw new Error('H.264 encoder config not supported');
    },
    /** frames i0 .. min(i0 + n, end) - 1; end = N (whole film) unless a segment is rendered; the first frame after encStart is always a key frame */
    async renderBatch(i0, n, end = N) {
      end = Math.min(end, N);
      for (let i = i0; i < Math.min(i0 + n, end); i++) {
        frame(i / fps, i);
        const vf = new VideoFrame(renderer.domElement, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: firstKey || i % (fps * 2) === 0 }); vf.close(); firstKey = false;
        if (enc.encodeQueueSize > 6) await new Promise((res) => { const f = () => (enc.encodeQueueSize > 2 ? setTimeout(f, 1) : res()); f(); });
        if (encErr) throw new Error(encErr);
      }
      return Math.min(i0 + n, end);
    },
    async encFlush() { await enc.flush(); if (encErr) throw new Error(encErr); },
    take() { const n = chunks.reduce((a, b) => a + b.length, 0), o8 = new Uint8Array(n); let o = 0; for (const c of chunks) { o8.set(c, o); o += c.length; } chunks = []; let s = ''; for (let i = 0; i < o8.length; i += 0x8000) s += String.fromCharCode.apply(null, o8.subarray(i, i + 0x8000)); return btoa(s); },
    /** JPEG data URL of the frame at t, scaled to width w. crop = [x, y, w, h] as fractions of the frame (native pixels kept when w = 0). */
    still(t, w = 540, crop = null) {
      frame(t);
      const [cx, cy, cw, ch] = crop ? [crop[0] * W, crop[1] * H, crop[2] * W, crop[3] * H] : [0, 0, W, H];
      const c = document.createElement('canvas'); c.width = w || Math.round(cw); c.height = Math.round(c.width * ch / cw);
      const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(renderer.domElement, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.92);
    },
    /** timing probe: average ms per frame over n frames starting at t (GPU finished) */
    bench(t = 0, n = 8) { const gl = renderer.getContext(), px = new Uint8Array(4), t0 = performance.now(); for (let i = 0; i < n; i++) { frame(t + i / fps); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t0) / n; },
  };
  window.t3d = api;
  window.ready = true;
}
boot().catch((e) => { window.bootError = String(e && e.stack || e); console.error(e); });
