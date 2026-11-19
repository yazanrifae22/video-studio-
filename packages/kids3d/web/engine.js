// kids3d page engine: builds the world from the episode choreography, then renders any time t deterministically.
// Render path: 4 sub-frames (180° shutter) accumulated in HDR -> tone map -> canvas -> WebCodecs H.264 (hardware) in the page.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CameraRig, Actor, Prop } from './kit/core.js';
import { makeActor } from './kit/characters.js';
import { farm } from './kit/sets.js';
import { bubble, sparkles, titleCard, FONT } from './kit/fx.js';
import * as anim from './kit/anim.js';
import * as core from './kit/core.js';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') ?? 1920), H = +(q.get('h') ?? 1080);
const SUB = +(q.get('sub') ?? 4), SHUTTER = +(q.get('shutter') ?? 0.28);   // 0.28: soft motion, no smear on fast trots or camera trucks

async function boot() {
  for (const [wt, f] of [['800', 'baloo-2-latin-800-normal.woff2'], ['600', 'baloo-2-latin-600-normal.woff2']]) {
    const ff = new FontFace('Baloo 2', `url(/kit/fonts/${f})`, { weight: wt }); await ff.load(); document.fonts.add(ff);
  }
  const score = await (await fetch(q.get('score') ?? '/score.json')).json();
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = ({ none: THREE.NoToneMapping, neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping })[q.get('tm') ?? 'neutral']; renderer.toneMappingExposure = +(q.get('exp') ?? 0.92); renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 900);
  const K = {
    THREE, anim, core, scene, camera, renderer, score, fps: score.fps, duration: score.duration,
    props: [], actors: [], onFrame: [], cues: [], cam: new CameraRig(camera),
    /** footprints characters must not stand inside ({name, x,z,r} | {name, x,z,rx,rz} | {name, box:[x0,z0,x1,z1]}, allow:[actor names]) */
    solids: [],
    /** big set pieces that must not crowd the frame edges when they are not the subject ({name, min:[x,y,z], max:[x,y,z]}) */
    crowders: [],
    /** quiet windows: ambient critters (butterflies) fade out (reveals, close-ups) */
    quiets: [],
    quiet(t0, t1) { K.quiets.push([t0, t1]); },
    quietAt(t) { let k = 0; for (const [a, b] of K.quiets) k = Math.max(k, Math.min(1, (t - a + 0.3) / 0.3, (b - t + 0.3) / 0.3)); return Math.max(0, k); },
    /** answers: the lint fails if this actor can be seen (in frame and not occluded) before t. Also quiets critters around the reveal. */
    answers: [],
    answer(actor, t) { K.answers.push({ a: actor, t }); K.quiet(t - 0.5, t + 4.5); return actor; },
    /** thumbnail spec: {t, pos, look, fov, text?} (kids:build renders a 1280x720 PNG with a big "?") */
    thumb: null,
    thumbnail(spec) { K.thumb = spec; },
    actor(name, kind, opts = {}) { const a = makeActor(scene, name, kind, opts); K.actors.push(a); return a; },
    farm() { return farm(K); },
    bubble(text, pos, opts) { return bubble(K, text, pos, opts); },
    sparkles(at, t, opts) { sparkles(K, at, t, opts); },
    prop(obj, opts) { const p = new Prop(obj, opts); K.props.push(p); return p; },
    sfx(name, t, db = -18) { if (t >= 0 && t < score.duration) K.cues.push({ name, t: +t.toFixed(3), db }); },
    line(id) { const l = score.lines.find((x) => x.id === id); if (!l) throw new Error(`choreo: no line "${id}"`); return l; },
    span(id) { const s = score.scenes.find((x) => x.id === id); if (!s) throw new Error(`choreo: no scene "${id}"`); return s; },
    /** start time of the n-th (0-based) word of a line matching w (case/punctuation-insensitive); n<0 counts from the end */
    word(lineId, w, n = 0) { return K.wordAt(lineId, w, n).t0; },
    wordEnd(lineId, w, n = 0) { return K.wordAt(lineId, w, n).t1; },
    /**
     * Camera that frames world points (x,y,z): az = side angle in radians (0 = from +z looking -z), el = elevation,
     * pad > 1 adds room, shift = [x,y] look offset as a fraction of the framed size. Returns {pos, look, fov}.
     */
    frame(points, opts = {}) {
      // barn-avoid: if a crowder (barn) that is not part of the subject would fill a frame edge, swing the camera side a little
      const subj = (b) => points.some((p) => p[0] > b.min[0] - 1.2 && p[0] < b.max[0] + 1.2 && p[2] > b.min[2] - 1.2 && p[2] < b.max[2] + 1.2);
      const crowd = K.crowders.filter((b) => !subj(b));
      const base = K.frame1(points, opts);
      if (!crowd.length || opts.crowd === false) return base;
      const az0 = opts.az ?? 0; let best = null;
      for (const d of [0, 0.1, -0.1, 0.2, -0.2, 0.3, -0.3]) {   // small swings only: big ones reshuffle who stands in front of whom
        const f = d ? K.frame1(points, { ...opts, az: az0 + d }) : base, c = Math.max(...crowd.map((b) => K.edgeCrowd(f, b)));
        if (c <= 0.25) return f;
        if (!best || c < best.c) best = { f, c };
      }
      return best.f;
    },
    /** crowding (0..1): share of the left or right 18 % frame strip covered by box b, seen from shot f */
    edgeCrowd(f, b) {
      const tc = new THREE.PerspectiveCamera(f.fov, W / H, 0.1, 900); tc.position.set(...f.pos); tc.lookAt(...f.look); tc.updateMatrixWorld(); tc.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9, behind = 0; const v = new THREE.Vector3(), pts = [];
      for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) { v.set(x, y, z).applyMatrix4(tc.matrixWorldInverse); if (v.z > -0.1) behind++; pts.push(v.clone()); }
      if (behind === 8) return 0; if (behind) return 1;   // box straddles the camera plane: it fills a side
      for (const v of pts) {
        v.applyMatrix4(tc.projectionMatrix); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      const cy = Math.max(0, Math.min(1, y1) - Math.max(-1, y0)) / 2;
      const strip = (a, bb) => Math.max(0, Math.min(bb, x1) - Math.max(a, x0)) / (bb - a);
      return Math.max(strip(-1, -0.64), strip(0.64, 1)) * cy;
    },
    frame1(points, { az = 0, el = 0.2, pad = 1.3, fov = 38, shift = [0, 0], minDist = 3, near = 4.6, avoid = [], avoidDist = 3.4 } = {}) {
      const c = [0, 1, 2].map((k) => points.reduce((a, p) => a + p[k], 0) / points.length);
      const ar = W / H, vf = fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * ar);
      const right = [Math.cos(az), 0, -Math.sin(az)];
      let hx = 0.6, hy = 0.6;
      for (const p of points) { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; hx = Math.max(hx, Math.abs(d[0] * right[0] + d[2] * right[2])); hy = Math.max(hy, Math.abs(d[1])); }
      const dist = Math.max(minDist, (hx / Math.tan(hf)) * pad + 0.6, (hy / Math.tan(vf)) * pad + 0.6);
      const look = [c[0] + right[0] * hx * shift[0], c[1] + hy * shift[1], c[2] + right[2] * hx * shift[0]];
      const at = (d) => [look[0] + Math.sin(az) * Math.cos(el) * d, look[1] + Math.sin(el) * d, look[2] + Math.cos(az) * Math.cos(el) * d];
      // perspective refinement: grow/shrink the distance until every point sits inside +-(0.86/pad) of the frame
      const tc = new THREE.PerspectiveCamera(fov, ar, 0.1, 900), v = new THREE.Vector3(), lim = 0.86 / Math.max(1, pad * 0.85);
      const ok = (d) => { tc.position.set(...at(d)); tc.lookAt(...look); tc.updateMatrixWorld(); tc.updateProjectionMatrix();
        const cp = tc.position, dd = (p) => Math.hypot(p[0] - cp.x, p[1] - cp.y, p[2] - cp.z); if (Math.min(...points.map(dd)) < near || (avoid.length && Math.min(...avoid.map(dd)) < avoidDist)) return false;
        return points.every((p) => { v.set(...p).project(tc); return v.z < 1 && Math.abs(v.x) <= lim && Math.abs(v.y) <= lim; }); };
      // smallest distance that frames everything (bisection between minDist and a far bound)
      let lo = minDist, hi = Math.max(dist * 4, 40); while (!ok(hi) && hi < 400) hi *= 1.5;
      for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
      const d = hi;
      return { pos: at(Math.max(minDist, d)), look, fov };
    },
    /** lint marks: things that must be in frame and unblocked during [t0,t1] (actors or bubbles); tiko/pip are checked whenever visible */
    marks: [],
    keep(t0, t1, ...things) { for (const x of things) K.marks.push({ t0, t1, x }); },
    /** intentional exits (lint ignores these actors during [t0,t1]) */
    exits: [],
    offscreen(t0, t1, ...names) { for (const n of names) K.exits.push({ t0, t1, n: typeof n === 'string' ? n : n.name }); },
    wordAt(lineId, w, n = 0) {
      const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
      const hits = K.line(lineId).words.filter((x) => norm(x.w) === norm(w));
      const h = hits[n < 0 ? hits.length + n : n];
      if (!h) throw new Error(`choreo: word "${w}" #${n} not in line ${lineId} (${K.line(lineId).words.map((x) => x.w).join(' ')})`);
      return h;
    },
  };
  window.K = K;
  const mod = await import(q.get('ep') ?? '/ep/choreo.js');
  await mod.default(K);
  // voices: an actor named like a line's speaker moves its mouth with that line's loudness envelope
  for (const l of score.lines) { const a = K.actors.find((x) => x.name === l.who); if (a && l.env?.length) a.talk(l.t0, l.env, score.fps); }

  // HDR accumulation targets
  const rtMS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const rtAcc = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const accMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rtMS.texture }, w: { value: 1 } }, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ vec4 c = texture2D(tex, vUv); gl_FragColor = vec4(c.rgb * w, w); }',
  });
  const accQuad = new FullScreenQuad(accMat), out = new OutputPass(); out.renderToScreen = true; out.setSize(W, H);

  function state(t) {
    for (const p of K.props) p.seek(t);
    for (const a of K.actors) a.seek(t);
    K.cam.seek(t);
    for (const f of K.onFrame) f(t, camera);
  }
  function frame(t) {
    if (q.get('direct')) { state(t); renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear();
    for (let k = 0; k < SUB; k++) {
      const ts = t + (SUB > 1 ? (k / SUB - 0.5) * SHUTTER / score.fps : 0);
      state(Math.max(0, ts));
      renderer.setRenderTarget(rtMS); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      accMat.uniforms.w.value = 1 / SUB; renderer.setRenderTarget(rtAcc); renderer.autoClear = false; accQuad.render(renderer); renderer.autoClear = true;
    }
    renderer.setRenderTarget(null); out.render(renderer, null, rtAcc);
  }

  // WebCodecs encoder (hardware H.264, Annex B)
  let enc = null, chunks = [], encErr = null;
  const api = {
    info: () => ({ gl: (() => { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; })(), frames: Math.round(score.duration * score.fps), cues: K.cues.length, actors: K.actors.map((a) => a.name) }),
    cues: () => K.cues,
    async encStart(bitrate = 28e6) {
      chunks = []; encErr = null;
      enc = new VideoEncoder({ output: (c) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); chunks.push(b); }, error: (e) => { encErr = String(e); } });
      const cfg = { codec: 'avc1.640033', width: W, height: H, bitrate, framerate: score.fps, hardwareAcceleration: 'prefer-hardware', avc: { format: 'annexb' }, latencyMode: 'quality', bitrateMode: 'variable' };
      const s = await VideoEncoder.isConfigSupported(cfg); if (!s.supported) throw new Error('H.264 encoder config not supported');
      enc.configure(cfg); return true;
    },
    async renderBatch(i0, n) {
      const N = Math.round(score.duration * score.fps);
      for (let i = i0; i < Math.min(i0 + n, N); i++) {
        frame(i / score.fps);
        const vf = new VideoFrame(renderer.domElement, { timestamp: Math.round(i * 1e6 / score.fps), duration: Math.round(1e6 / score.fps) });
        enc.encode(vf, { keyFrame: i % (score.fps * 2) === 0 }); vf.close();
        if (enc.encodeQueueSize > 6) await new Promise((res) => { const f = () => (enc.encodeQueueSize > 2 ? setTimeout(f, 1) : res()); f(); });
        if (encErr) throw new Error(encErr);
      }
      return Math.min(i0 + n, N);
    },
    async encFlush() { await enc.flush(); if (encErr) throw new Error(encErr); },
    take() { const n = chunks.reduce((a, b) => a + b.length, 0), o8 = new Uint8Array(n); let o = 0; for (const c of chunks) { o8.set(c, o); o += c.length; } chunks = []; let s = ''; for (let i = 0; i < o8.length; i += 0x8000) s += String.fromCharCode.apply(null, o8.subarray(i, i + 0x8000)); return btoa(s); },
    still(t, w = 480) { frame(t); const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * H / W); c.getContext('2d').drawImage(renderer.domElement, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.88); },
    title(lines) { return titleCard(lines); },
    /** framing lint (every `step` s). Returns merged spans {name, issue, t0, t1}. Issues:
     *  out of frame / blocked: Tiko/Pip (when visible, not under K.offscreen) and every K.keep() mark (head point, 8 % margin, raycast);
     *  cropped >15%: a main character (Tiko/Pip or a K.keep() actor) has more than 15 % of its body box outside the frame
     *    (under K.offscreen() only a big half-cut body fails); giant: a main character taller than 95 % of the frame;
     *  spoiler: a K.answer() actor is in frame and not occluded before its reveal time (a single sample fails);
     *  inside <solid>: a visible in-frame actor stands inside a bush / hay / pond / barn wall / coop / tree footprint (K.solids; a single sample fails);
     *  too fast: an in-frame actor moves faster than 5 m/s (smears under the motion-blur shutter). */
    lint(step = 0.25) {
      const ray = new THREE.Raycaster(), out = []; ray.camera = camera; const v = new THREE.Vector3(), N = Math.floor(score.duration / step);
      const tikoPip = K.actors.filter((a) => a.name === 'tiko' || a.name === 'pip');
      const ownedBy = (hit, o) => { for (let p = hit; p; p = p.parent) if (p === o) return true; return false; };
      const shown = (m) => { for (let q2 = m; q2; q2 = q2.parent) if (!q2.visible) return false; return true; };
      const headOf = (x) => { const o = x.root ?? x.obj; const b = new THREE.Box3().setFromObject(o); return b.isEmpty() ? null : [new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.72, (b.min.z + b.max.z) / 2), o, b]; };
      const blockedTo = (p, o, m = 0.3) => {
        const dir = p.clone().sub(camera.position), dist = dir.length(); ray.set(camera.position, dir.normalize()); ray.far = dist - Math.min(0.2, m);
        const hit = ray.intersectObjects(scene.children, true).find((x) => x.object.isMesh && shown(x.object) && !x.object.material?.transparent && !x.object.userData.critter && !ownedBy(x.object, o) && !(x.object.geometry?.parameters?.radius >= 300) && !x.object.isInstancedMesh);
        return !!(hit && hit.distance < dist - m);
      };
      /** screen rect of a world box: vis = visible area fraction, h = height in NDC (2 = full frame), any = some part in frame */
      const rectOf = (b) => {
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9, behind = 0;
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { v.set(x, y, z).project(camera); if (v.z > 1) { behind++; continue; } x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        if (behind === 8) return { vis: 0, h: 0, any: false };
        if (behind) return { vis: 0.5, h: 2.5, any: true };
        const A = (x1 - x0) * (y1 - y0), I = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)) * Math.max(0, Math.min(1, y1) - Math.max(-1, y0));
        return { vis: A > 0 ? I / A : 0, h: y1 - y0, any: I > 0 };
      };
      // actor footprint (rest pose, scale 1, yaw 0): half width + half length along its facing axis (z)
      const foot = new Map();
      const footOf = (a) => {
        if (foot.has(a)) return foot.get(a);
        const R = a.root, keep = [R.position.clone(), R.rotation.clone(), R.scale.clone()];
        R.position.set(0, 0, 0); R.rotation.set(0, 0, 0); R.scale.set(1, 1, 1); R.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(R); R.position.copy(keep[0]); R.rotation.copy(keep[1]); R.scale.copy(keep[2]); R.updateMatrixWorld(true);
        const f = { r: (b.max.x - b.min.x) / 2 * 0.8, half: Math.max(0, (b.max.z - b.min.z) / 2 - (b.max.x - b.min.x) / 2) * 0.85, cz: (b.max.z + b.min.z) / 2 };
        foot.set(a, f); return f;
      };
      const inFoot = (a, sol) => {   // capsule along the actor's yaw vs circle / ellipse / box (xz); allowed penetration 0.15 m
        const f = footOf(a), s0 = a.root.scale.x, p = a.root.position, yaw = a.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), r = f.r * s0;
        for (let k = -2; k <= 2; k++) {
          const off = (f.cz + f.half * k / 2) * s0, x = p.x + fx * off, z = p.z + fz * off;
          if (sol.box) { const d = Math.hypot(Math.max(sol.box[0] - x, 0, x - sol.box[2]), Math.max(sol.box[1] - z, 0, z - sol.box[3])); if (d < r - 0.15) return true; }
          else if (sol.rx) { if (Math.hypot((x - sol.x) / (sol.rx + r - 0.15), (z - sol.z) / (sol.rz + r - 0.15)) < 1) return true; }
          else if (Math.hypot(x - sol.x, z - sol.z) - sol.r < r - 0.15) return true;
        }
        return false;
      };
      for (let i = 0; i <= N; i++) {
        const t = i * step; state(t); scene.updateMatrixWorld(true); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
        const exiting = (n) => K.exits.some((e) => e.n === n && t >= e.t0 && t <= e.t1);
        const keptActors = K.marks.filter((m) => t >= m.t0 && t <= m.t1 && m.x instanceof Actor).map((m) => m.x);
        const things = [...tikoPip.filter((a) => a.root.visible && a.root.scale.y > 0.4 && !exiting(a.name)).map((a) => [a.name, a]), ...K.marks.filter((m) => t >= m.t0 && t <= m.t1).map((m) => [m.x.name ?? m.x.label ?? 'mark', m.x])];
        for (const [name, x] of things) {
          const h = headOf(x); if (!h) continue; const [p, o] = h;
          v.copy(p).project(camera);
          if (v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.92) { out.push({ t, name, issue: 'out of frame' }); continue; }
          if (!o.isMesh && o.children.some((c) => c.material?.transparent)) continue;   // bubbles: frame check only
          if (blockedTo(p, o)) out.push({ t, name, issue: 'blocked' });
        }
        // crop: main characters fully in frame
        for (const a of new Set([...tikoPip, ...keptActors])) {
          if (!a.root.visible || a.root.scale.y < 0.4) continue;
          const r = rectOf(new THREE.Box3().setFromObject(a.root)); if (!r.any) continue;
          if (exiting(a.name)) { if (r.vis > 0.1 && r.vis < 0.85 && r.h > 0.5) out.push({ t, name: a.name, issue: 'cropped (big half-cut body during offscreen)' }); continue; }
          if (r.vis < 0.85) out.push({ t, name: a.name, issue: 'cropped >15%' });
          if (r.h > 1.9) out.push({ t, name: a.name, issue: 'giant (fills the frame height)' });
        }
        // spoiler: an answer animal seen before its reveal
        for (const { a, t: tr } of K.answers) {
          if (t >= tr || !a.root.visible || a.root.scale.y < 0.05) continue;
          const b = new THREE.Box3().setFromObject(a.root); if (b.isEmpty() || !rectOf(b).any) continue;
          const c = b.getCenter(new THREE.Vector3()), e = b.getSize(new THREE.Vector3()).multiplyScalar(0.35);   // samples inside the body (70 % box)
          const pts = [c, new THREE.Vector3(c.x, c.y + e.y, c.z), new THREE.Vector3(c.x - e.x, c.y, c.z), new THREE.Vector3(c.x + e.x, c.y, c.z), new THREE.Vector3(c.x, c.y, c.z - e.z), new THREE.Vector3(c.x, c.y, c.z + e.z)];
          if (pts.some((q2) => { v.copy(q2).project(camera); return v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && !blockedTo(q2, a.root, 0.02); })) out.push({ t, name: a.name, issue: 'spoiler (answer visible before its reveal)', hard: true });
        }
        // intersections + speed (actors in frame)
        for (const a of K.actors) {
          if (!a.root.visible || a.root.scale.y < 0.4) continue;
          if (!rectOf(new THREE.Box3().setFromObject(a.root)).any) continue;
          for (const sol of K.solids) if (!(sol.allow ?? []).includes(a.name) && inFoot(a, sol)) out.push({ t, name: a.name, issue: `inside ${sol.name}`, hard: true });
          const p = a.pos.at(t), q = a.pos.at(t + 0.05), sp = Math.hypot(q[0] - p[0], q[2] - p[2]) / 0.05;
          if (sp > 5 && sp < 60) out.push({ t, name: a.name, issue: 'too fast (>5 m/s)' });
        }
      }
      const spans = [];
      for (const w of out) { const l = spans.find((s) => s.name === w.name && s.issue === w.issue && Math.abs(s.t1 - w.t) <= step + 1e-6); if (l) l.t1 = w.t; else spans.push({ name: w.name, issue: w.issue, t0: w.t, t1: w.t, hard: !!w.hard }); }
      return spans.filter((s) => s.hard || s.t1 - s.t0 >= 0.5).map(({ hard, ...x }) => x);   // spoilers + intersections never ignored; other blips < 0.5 s (camera moves) are
    },
    /** 1280x720 thumbnail (PNG data URL): the K.thumbnail() shot (or a default late frame) + a big "?" badge and an optional short text. */
    thumbnail(badge = null) {
      const sp = K.thumb ?? { t: score.duration * 0.88 };
      state(sp.t);
      if (sp.pos) { camera.position.set(...sp.pos); camera.lookAt(...sp.look); camera.fov = sp.fov ?? 38; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); for (const f of K.onFrame) f(sp.t, camera); }
      renderer.setRenderTarget(rtMS); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(rtAcc); renderer.setClearColor(0x000000, 0); renderer.clear(); accMat.uniforms.w.value = 1; renderer.autoClear = false; accQuad.render(renderer); renderer.autoClear = true;
      renderer.setRenderTarget(null); out.render(renderer, null, rtAcc);
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const x = c.getContext('2d');
      x.drawImage(renderer.domElement, 0, 0, 1280, 720);
      if (badge && badge.clean) return c.toDataURL('image/png');   // clean picture (series wall tiles): no mark, text or chip
      const rr = (a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
      // where Tiko and Pip are on the thumbnail (screen boxes, px): overlays must not cover them
      const v3 = new THREE.Vector3(), boxes = K.actors.filter((a) => (a.name === 'tiko' || a.name === 'pip') && a.root.visible).map((a) => {
        const b = new THREE.Box3().setFromObject(a.root); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const X of [b.min.x, b.max.x]) for (const Y of [b.min.y, b.max.y]) for (const Z of [b.min.z, b.max.z]) { v3.set(X, Y, Z).project(camera); x0 = Math.min(x0, (v3.x + 1) * 640); x1 = Math.max(x1, (v3.x + 1) * 640); y0 = Math.min(y0, (1 - v3.y) * 360); y1 = Math.max(y1, (1 - v3.y) * 360); }
        return [x0, y0, x1, y1];
      });
      const hits = (a, b, w, h) => boxes.some(([x0, y0, x1, y1]) => a < x1 && a + w > x0 && b < y1 && b + h > y0);
      // the mark: legacy "?" without a series badge; with one, the registry's topic mark ("?", "123", "@colours", "@shapes" or none)
      const mark = badge && badge.ep ? badge.mark ?? null : '?';
      if (mark) {
        const R = badge && badge.ep ? 108 : 150;
        const cands = [[sp.qx ?? 1085, sp.qy ?? 245], [1150, 140], [130, 140], [640, 130], [1150, 380]];
        const [qx, qy] = cands.find(([a, b]) => !hits(a - R, b - R, 2 * R, 2 * R)) ?? cands[0];
        x.fillStyle = 'rgba(36,48,94,0.25)'; x.beginPath(); x.arc(qx + 6, qy + 10, R, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(qx, qy, R, 0, Math.PI * 2); x.fill(); x.lineWidth = R * 0.1; x.strokeStyle = '#2EC4B6'; x.stroke();
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
        if (mark === '@colours') ['#E5383B', '#FF8C1A', '#FFD23F', '#3DBB5A', '#2F7DE1', '#9B5DE5'].forEach((col, i) => { const a = i * Math.PI / 3 - Math.PI / 2; x.fillStyle = col; x.beginPath(); x.arc(qx + Math.cos(a) * R * 0.5, qy + Math.sin(a) * R * 0.5, R * 0.24, 0, Math.PI * 2); x.fill(); });
        else if (mark === '@shapes') {
          const s = R * 0.3; x.fillStyle = '#2F7DE1'; x.beginPath(); x.arc(qx - R * 0.42, qy + R * 0.22, s, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#3DBB5A'; x.fillRect(qx + R * 0.12, qy + R * 0.22 - s, 2 * s * 0.9, 2 * s * 0.9);
          x.fillStyle = '#FF7A45'; x.beginPath(); x.moveTo(qx, qy - R * 0.72); x.lineTo(qx + s * 1.1, qy - R * 0.1); x.lineTo(qx - s * 1.1, qy - R * 0.1); x.closePath(); x.fill();
        } else {
          const fs = Math.min(R * 1.65, R * 1.7 / Math.max(1, mark.length * 0.62)); x.font = `800 ${Math.round(fs)}px ${FONT}`;
          x.lineWidth = R * 0.09; x.strokeStyle = '#24305E'; x.strokeText(mark, qx, qy + fs * 0.09); x.fillStyle = '#FF7A45'; x.fillText(mark, qx, qy + fs * 0.09);
        }
      }
      if (sp.text) { x.font = `800 112px ${FONT}`; x.textAlign = 'left'; x.lineWidth = 18; x.strokeStyle = '#24305E'; x.strokeText(sp.text, 48, 112); x.fillStyle = '#FFFFFF'; x.fillText(sp.text, 48, 112); }
      // series chip (Sunny Hill): small rounded chip, bottom-left on every episode (YouTube's duration stamp sits bottom-right)
      if (badge && badge.ep) {
        const name = String(badge.series ?? 'Sunny Hill').toUpperCase(), ep = `EP ${badge.ep}`;
        x.font = `800 21px ${FONT}`; const nw = x.measureText(name).width; x.font = `800 52px ${FONT}`; const ew = x.measureText(ep).width;
        const w = Math.max(nw, ew) + 92, h = 90, bx = 22, by = 720 - h - 22;
        x.fillStyle = 'rgba(36,48,94,0.3)'; rr(bx + 4, by + 6, w, h, 26); x.fill();
        x.fillStyle = '#FFFFFF'; rr(bx, by, w, h, 26); x.fill(); x.lineWidth = 5; x.strokeStyle = '#FF7A45'; rr(bx, by, w, h, 26); x.stroke();
        const sx = bx + 38, sy = by + h / 2; x.fillStyle = '#FFC93C';
        for (let i = 0; i < 10; i++) { x.save(); x.translate(sx, sy); x.rotate(i * Math.PI / 5); x.fillRect(-3, -26, 6, 9); x.restore(); }
        x.beginPath(); x.arc(sx, sy, 14, 0, Math.PI * 2); x.fill();
        x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = `800 21px ${FONT}`; x.fillStyle = '#24305E'; x.fillText(name, bx + 70, by + 31);
        x.font = `800 52px ${FONT}`; x.fillStyle = '#FF7A45'; x.fillText(ep, bx + 68, by + 78);
      }
      return c.toDataURL('image/png');
    },
  };
  window.kids = api;
  window.ready = true;
}
boot().catch((e) => { window.bootError = String(e && e.stack || e); console.error(e); });
