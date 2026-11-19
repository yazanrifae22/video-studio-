// test3d kit: lighting rig. Procedural environment (warm window key, cool fill, rim strip, dark warm room) through PMREM,
// three shadow-casting lights that the engine jitters per sub-frame (soft area shadows), out-of-focus light discs and dust.
import * as THREE from 'three';
import { rng, clamp } from './util.js';

const KEY = new THREE.Vector3(-0.7, 0.62, 0.28).normalize();
const RIM = new THREE.Vector3(0.55, 0.36, -0.76).normalize();
const FILL = new THREE.Vector3(0.3, 0.84, 0.46).normalize();

function buildEnv(lights, panels = true) {
  const s = new THREE.Scene();
  const sg = new THREE.SphereGeometry(20, 64, 32), col = [], p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ny = p.getY(i) / 20, az = Math.atan2(p.getX(i), -p.getZ(i));   // 0 = straight behind the board (-z)
    const up = clamp(ny), down = clamp(-ny), back = Math.pow(Math.max(0, Math.cos(az)), 2);
    const warm = panels ? 0.012 + 0.03 * up * up + 0.02 * down + 0.012 * back * (1 - Math.abs(ny)) : 0.02 + 0.05 * Math.pow(1 - Math.abs(ny), 3) * (0.55 + 0.45 * back) + 0.012 * up;
    col.push(warm * 1.0, warm * 0.62, warm * 0.4);
  }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, dir, dist, rgb, k, off = [0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.material.color.setRGB(rgb[0] * k, rgb[1] * k, rgb[2] * k);
    const c = dir.clone().multiplyScalar(dist), right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize(), upv = new THREE.Vector3().crossVectors(dir, right).normalize();
    m.position.copy(c).addScaledVector(right, off[0]).addScaledVector(upv, off[1]); m.lookAt(0, 0, 0); s.add(m); return m;
  };
  if (!panels) return s;
  // window: 2 x 3 warm panes with dark bars between them (reads as a real window in the gold and in the polished marble)
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) panel(1.25, 1.05, KEY, 6, [1.0, 0.8, 0.56], 15, [(i - 0.5) * 1.42, (j - 1) * 1.2]);
  panel(0.5, 4.2, RIM, 6, [1.0, 0.86, 0.7], 11);                                    // rim strip, behind right
  panel(5, 4, FILL, 7, [0.55, 0.72, 1.0], 0.5);                                       // big cool fill, high front right
  panel(3.2, 1.6, new THREE.Vector3(0.95, 0.12, 0.3).normalize(), 6, [0.5, 0.62, 0.9], 0.22);   // low cool side bounce
  panel(3.4, 2.6, new THREE.Vector3(-0.25, 0.22, 0.94).normalize(), 6, [1.0, 0.74, 0.5], 1.1);  // warm bounce from behind the camera
  for (const l of lights) { const m = new THREE.Mesh(new THREE.SphereGeometry(l.r0 * 1.6, 16, 12), new THREE.MeshBasicMaterial()); m.material.color.setRGB(l.col[0] * 70, l.col[1] * 70, l.col[2] * 70); m.position.copy(l.pos); s.add(m); }
  return s;
}

function discTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#b4b4b4'); g.addColorStop(0.7, '#bcbcbc'); g.addColorStop(0.9, '#d8d8d8'); g.addColorStop(0.955, '#ffffff'); g.addColorStop(0.985, '#8a8a8a'); g.addColorStop(1, '#000000');
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 6.283); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

/**
 * stage({env: 0.36, key: 3.5, rim: 2.6, fill: 0.5, discs: 14, dust: true, background: 1, seed})
 * -> {key, rim, fill, discs, dust, shadowFocus(centre, radius), probe(obj, at), envTexture}
 */
export function stage(K, { env = 0.36, key = 3.5, rim = 2.6, fill = 0.5, discs = 14, dust = true, background = 1, seed = 11, shadowMap = 4096 } = {}) {
  const { scene, renderer } = K, R = rng(seed), st = {};
  // out-of-focus practical lights far behind the board
  const lights = [];
  const pal = [[1.0, 0.6, 0.24], [1.0, 0.74, 0.4], [1.0, 0.5, 0.17], [1.0, 0.82, 0.55], [1.0, 0.66, 0.3], [0.7, 0.82, 1.0]];
  for (let i = 0; i < discs; i++) {
    const az = (-1 + 2 * (i + 0.5) / discs) * 2.2 + R.range(-0.08, 0.08), d = R.range(2.6, 4.6), c = pal[i % pal.length];
    lights.push({ pos: new THREE.Vector3(Math.sin(az) * d, R.range(0.05, 0.25) + Math.pow(R(), 1.6) * 1.2, -Math.cos(az) * d), col: c, r0: R.range(0.012, 0.03), gain: (c[2] > 0.9 ? 0.35 : 1) * R.range(0.55, 1.2) });
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const envRT = pm.fromScene(buildEnv(lights), 0.012, 0.1, 100);
  scene.environment = envRT.texture; scene.environmentIntensity = env;
  // what the camera sees behind the set: the same dark warm room without the light panels (they would read as grey haze)
  const bgRT = pm.fromScene(buildEnv(lights, false), 0.04, 0.1, 100);
  scene.background = bgRT.texture; scene.backgroundBlurriness = 0.12; scene.backgroundIntensity = background;
  st.envTexture = envRT.texture; st.backgroundTexture = bgRT.texture;

  const mk = (dir, color, intensity, spread, map, radius) => {
    const l = new THREE.DirectionalLight(color, intensity); l.castShadow = true; l.shadow.mapSize.set(map, map); l.shadow.radius = radius;
    l.userData.dir = dir.clone(); l.userData.spread = spread; l.layers.enableAll(); scene.add(l); scene.add(l.target); K.areaLights.push(l); return l;
  };
  st.key = mk(KEY, new THREE.Color().setRGB(1.0, 0.85, 0.66), key, 0.085, shadowMap, 2.5);
  st.rim = mk(RIM, new THREE.Color().setRGB(1.0, 0.87, 0.72), rim, 0.05, 2048, 2);
  st.fill = mk(FILL, new THREE.Color().setRGB(0.6, 0.75, 1.0), fill, 0.42, 2048, 3);

  /** aim the shadow maps at the part of the set the shot shows (call it in frame(t); smaller radius = finer shadows) */
  st.shadowFocus = (centre, radius = 0.42) => {
    for (const l of [st.key, st.rim, st.fill]) {
      const D = Math.max(1.2, radius * 4), r = radius * (1 + l.userData.spread * 1.5) + 0.02;
      l.target.position.copy(centre); l.position.copy(centre).addScaledVector(l.userData.dir, D); l.userData.dist = D;
      const c = l.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 0.05; c.far = D + radius * 3 + 0.4; c.updateProjectionMatrix();
      const texel = 2 * r / l.shadow.mapSize.x;
      l.shadow.normalBias = texel * 1.6; l.shadow.bias = -texel * 1.2 / (c.far - c.near);
      l.target.updateMatrixWorld();
    }
  };
  st.shadowFocus(new THREE.Vector3(0, 0, 0), 0.42);

  // bokeh discs: drawn on the sharp layer as discs whose size follows the lens (circle of confusion), so they are clean and round
  const dTex = discTexture(), dGeo = new THREE.CircleGeometry(1, 64), fwd = new THREE.Vector3(), rel = new THREE.Vector3();
  st.discs = lights.map((l) => {
    const m = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ map: dTex, transparent: true, depthWrite: false, toneMapped: false, fog: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }));
    m.position.copy(l.pos); m.layers.set(1); m.renderOrder = -5; m.frustumCulled = false; m.userData.l = l; scene.add(m); return m;
  });
  // a film may set per frame: discGain (brightness), discMax (at most this many discs inside the picture, the brightest), discSoft (true = no bright edge ring, soft falloff)
  st.discGain = 1; st.discMax = Infinity; st.discSoft = false;
  const softTex = (() => { const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, '#c8c8c8'); g.addColorStop(0.55, '#b0b0b0'); g.addColorStop(0.8, '#6a6a6a'); g.addColorStop(1, '#000000'); x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 6.283); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t; })();
  const ndc = new THREE.Vector3(), seen = [];
  K.onFrame.push((t, cam, lens) => {
    cam.getWorldDirection(fwd); seen.length = 0;
    for (const m of st.discs) {
      const l = m.userData.l, z = rel.copy(l.pos).sub(cam.position).dot(fwd);
      if (z < 0.2) { m.visible = false; continue; }
      const rw = lens.A * Math.abs(z / lens.focus - 1) + l.r0, k = clamp((0.1 / rw) ** 2, 0.02, 30) * 1.5 * l.gain * st.discGain * (0.93 + 0.07 * Math.sin(t * 2.1 + l.pos.x * 9));
      m.visible = true; m.scale.setScalar(rw); m.quaternion.copy(cam.quaternion); m.material.color.setRGB(l.col[0] * k, l.col[1] * k, l.col[2] * k);
      const tx = st.discSoft ? softTex : dTex; if (m.material.map !== tx) { m.material.map = tx; m.material.needsUpdate = true; }
      if (st.discMax < st.discs.length) { ndc.copy(l.pos).project(cam); const rn = rw / z * cam.projectionMatrix.elements[5]; if (Math.abs(ndc.x) < 1 + rn * K.H / K.W && Math.abs(ndc.y) < 1 + rn) seen.push([k * rw * rw, m]); }
    }
    if (seen.length > st.discMax) { seen.sort((a, b) => b[0] - a[0]); for (let i = Math.max(0, st.discMax); i < seen.length; i++) seen[i][1].visible = false; }
  });

  // dust motes: points whose size is their circle of confusion
  if (dust) {
    const N = 220, pos = new Float32Array(N * 3), sd = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = R.range(-0.4, 0.4); pos[i * 3 + 1] = R.range(0.01, 0.45); pos[i * 3 + 2] = R.range(-0.45, 0.4); sd[i * 3] = R(); sd[i * 3 + 1] = R(); sd[i * 3 + 2] = R(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed3', new THREE.BufferAttribute(sd, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uS: { value: 1 }, uPx: { value: 1 }, uTime: { value: 0 }, uGain: { value: 0.3 } }, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      vertexShader: `uniform float uA, uS, uPx, uTime, uGain; attribute vec3 seed3; varying float vK;
        void main(){ vec3 p = position + 0.014 * vec3( sin( uTime * 0.31 + seed3.x * 6.283 ), sin( uTime * 0.23 + seed3.y * 6.283 ), cos( uTime * 0.27 + seed3.z * 6.283 ) );
          vec4 mv = modelViewMatrix * vec4( p, 1.0 ); float z = max( 0.02, -mv.z ); float size = clamp( 2.0 * uPx * uA * abs( 1.0 / uS - 1.0 / z ), 2.2, 180.0 );
          gl_PointSize = size; vK = uGain * ( 0.4 + 0.6 * seed3.x ) * min( 1.0, 5.0 / ( size * size ) ) * step( 0.03, z ); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vK; void main(){ float d = length( gl_PointCoord - 0.5 ) * 2.0; float a = smoothstep( 1.0, 0.82, d ) * ( 0.8 + 0.2 * smoothstep( 0.55, 0.95, d ) ); gl_FragColor = vec4( vec3( 1.0, 0.82, 0.6 ) * vK * a, 0.0 ); }`,
    });
    const pts = new THREE.Points(g, mat); pts.layers.set(1); pts.frustumCulled = false; pts.renderOrder = -4; scene.add(pts); st.dust = pts;
    K.onFrame.push((t, cam, lens) => { mat.uniforms.uA.value = lens.A; mat.uniforms.uS.value = lens.focus; mat.uniforms.uPx.value = K.H / 2 * cam.projectionMatrix.elements[5]; mat.uniforms.uTime.value = t; });
  }

  /**
   * probe(obj, at?): give a shiny object real local reflections (board, rice, other pieces) by baking the built scene around it once.
   * Call it at the end of build(), after everything is placed. at = world point (default: the middle of the object).
   */
  st.probe = (obj, at = null, { size = 256, intensity = 1 } = {}) => {
    const box = new THREE.Box3().setFromObject(obj), p = at ?? box.getCenter(new THREE.Vector3());
    const keep = [obj.visible, scene.backgroundBlurriness, scene.backgroundIntensity, K.mirror?.uniforms.uReflK.value, scene.background];
    obj.visible = false; scene.background = envRT.texture; scene.backgroundBlurriness = 0; scene.backgroundIntensity = 1; if (K.mirror) K.mirror.uniforms.uReflK.value = 0;
    const rt = pm.fromScene(scene, 0, 0.004, 40, { position: p, size });
    obj.visible = keep[0]; scene.background = keep[4]; scene.backgroundBlurriness = keep[1]; scene.backgroundIntensity = keep[2]; if (K.mirror) K.mirror.uniforms.uReflK.value = keep[3];
    obj.traverse((o) => { if (o.isMesh && o.material?.isMeshStandardMaterial) { o.material.envMap = rt.texture; o.material.envMapIntensity = intensity; o.material.needsUpdate = true; } });
    return rt.texture;
  };
  return st;
}
