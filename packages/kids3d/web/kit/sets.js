// Sets: sky, light rig and the sunny farm (barn, hay, pond, coop, bushes, field gate, trees, flowers, clouds, butterflies).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ball, box, rbox, cyl, cone, capsule, torus, mat, mesh, pivot, group, Prop } from './core.js';
import { hash, noise1, clamp, Track } from './anim.js';

export const SKY = { top: '#2E9BEF', mid: '#69C2F7', horizon: '#CDEEFF', ground: '#7CCB6B' };

export function skyAndLight(K) {
  const { scene, renderer } = K;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(SKY.top) }, mid: { value: new THREE.Color(SKY.mid) }, hor: { value: new THREE.Color(SKY.horizon) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(hor, mid, smoothstep(0.0,0.18,h)); c = mix(c, top, smoothstep(0.18,0.75,h)); gl_FragColor = vec4(c,1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat); sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(SKY.horizon, 55, 190);
  const hemi = new THREE.HemisphereLight('#DDF3FF', '#86C46E', 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF1D6', 2.7);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 70 });
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#CFE6FF', 0.55); fill.position.set(-10, 6, 8); scene.add(fill);
  // the shadow frustum follows the camera's look point (deterministic: derived from the camera each frame)
  K.onFrame.push((t, cam) => {
    const d = new THREE.Vector3(); cam.getWorldDirection(d);
    const c = cam.position.clone().addScaledVector(d, 9); c.y = 0;
    sun.target.position.copy(c); sun.position.set(c.x + 12, 22, c.z + 14);
  });
  // sun disc
  const sunDisc = ball('#FFF6C9', 9, [-70, 85, -260], 'matte', [1, 1, 1], 24); sunDisc.material = new THREE.MeshBasicMaterial({ color: '#FFF3B8', fog: false }); sunDisc.castShadow = false; scene.add(sunDisc);
  return { sun, hemi };
}

/* ------------------------------------------------------------------ farm */
export function farm(K) {
  const { scene } = K, props = {};
  skyAndLight(K);
  // ground with gentle rolling hills outside the yard
  const g = new THREE.PlaneGeometry(260, 260, 160, 160); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = [];
  const c1 = new THREE.Color('#7BCB62'), c2 = new THREE.Color('#5DB651'), c3 = new THREE.Color('#9AD86F');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z + 4);
    const hill = clamp((r - 20) / 30) * (Math.sin(x * 0.05) * 3 + Math.cos(z * 0.045 + 1) * 3 + 3.5) + (noise1(x * 0.3, 1) + noise1(z * 0.3, 2)) * 0.04;
    pos.setY(i, hill);
    const n = 0.5 + 0.5 * noise1(x * 0.18 + z * 0.07, 5), c = c1.clone().lerp(c2, n * 0.7).lerp(c3, clamp(noise1(z * 0.11 - x * 0.05, 8) * 0.8));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); ground.receiveShadow = true; scene.add(ground);
  // dirt path from the yard to the barn
  const path = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat('#DDB985', 'matte', { roughness: 1 })); path.rotation.x = -Math.PI / 2; path.scale.set(2.2, 6.5, 1); path.position.set(0, 0.02, -2); path.receiveShadow = true; scene.add(path);
  const yard = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat('#A8DA7E', 'matte', { roughness: 1 })); yard.rotation.x = -Math.PI / 2; yard.scale.set(6, 4.5, 1); yard.position.set(0, 0.015, 3); yard.receiveShadow = true; scene.add(yard);

  // far hills
  [[-60, -120, 38, '#78C46A'], [10, -150, 50, '#6BBF63'], [80, -110, 36, '#84CC6E'], [-120, -60, 40, '#7BC86A'], [120, -40, 30, '#86CF73']].forEach(([x, z, r, c]) => {
    const h = ball(c, r, [x, -r * 0.62, z], 'matte', [1.6, 1, 1], 32); h.castShadow = false; scene.add(h);
  });

  /* barn (faces +z) at (0,0,-8) */
  const barn = new THREE.Group(); barn.position.set(0, 0, -8); scene.add(barn);
  const RED = '#D9483B', TRIM = '#FFF7EE', ROOF = '#7A3B2E';
  // walls with a real doorway (2.4 x 2.4) so animals can walk out of a warm, lit interior (never a dark hole)
  barn.add(box(RED, [4.6, 3.2, 0.16], [0, 1.6, -1.72], 'matte'));
  [-1, 1].forEach((s) => barn.add(box(RED, [0.16, 3.2, 3.6], [s * 2.22, 1.6, 0], 'matte')));
  [-1, 1].forEach((s) => barn.add(box(RED, [1.1, 3.2, 0.16], [s * 1.75, 1.6, 1.72], 'matte')));
  barn.add(box(RED, [2.4, 0.8, 0.16], [0, 2.8, 1.72], 'matte'));
  barn.add(box('#7A3B2E', [4.6, 0.12, 3.6], [0, 3.2, 0], 'matte'));
  // gable front + back
  const gable = new THREE.Shape(); gable.moveTo(-2.3, 0); gable.lineTo(2.3, 0); gable.lineTo(0, 1.9); gable.lineTo(-2.3, 0);
  [1.8, -1.8].forEach((z) => { const m = mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false }), mat(RED, 'matte'), { pos: [0, 3.2, z - 0.06] }); barn.add(m); });
  [-1, 1].forEach((s) => barn.add(rbox(ROOF, [2.95, 0.18, 4.1], [s * 1.18, 4.12, 0], 'matte', [0, 0, -s * 0.69], 0.06)));
  // trims
  [[-2.3, 1.6], [2.3, 1.6]].forEach(([x, y]) => barn.add(box(TRIM, [0.16, 3.2, 0.16], [x, y, 1.82], 'matte')));
  barn.add(box(TRIM, [4.7, 0.16, 0.16], [0, 3.22, 1.84], 'matte'));
  // loft window
  barn.add(box(TRIM, [1.0, 0.9, 0.1], [0, 3.9, 1.86], 'matte')); barn.add(box('#FFE7A8', [0.78, 0.68, 0.1], [0, 3.9, 1.9], 'glow'));
  // interior (warm, never dark): back wall + floor hay
  barn.add(box('#FFD98A', [4.2, 3.0, 0.1], [0, 1.5, -1.6], 'glow'));
  [-1, 1].forEach((s) => barn.add(box('#F5C77E', [0.1, 3.0, 3.3], [s * 2.1, 1.5, 0], 'glow')));
  barn.add(box('#FFE7B0', [4.2, 0.1, 3.3], [0, 3.05, 0], 'glow'));
  barn.add(box('#F2C46B', [4.2, 0.08, 3.4], [0, 0.04, 0], 'matte'));
  [[-1.3, -1.1], [1.4, -1.0]].forEach(([x, z]) => barn.add(cyl('#EBC45E', 0.5, 0.5, 1.0, [x, 0.5, z], 'matte', [0, 0, Math.PI / 2], 24)));
  // door frame
  barn.add(box(TRIM, [2.6, 0.16, 0.14], [0, 2.4, 1.86], 'matte'));
  // doors: pivots on the outer edges
  const door = (s) => {
    const pv = pivot([s * 1.2, 0, 1.86]);
    const d = new THREE.Group(); d.position.set(-s * 0.6, 1.17, 0); pv.add(d);
    d.add(box(RED, [1.23, 2.3, 0.12], [0, 0, 0], 'matte'));   // 1.23 > 1.2: the two doors overlap (no see-through seam)
    d.add(box(TRIM, [1.18, 0.12, 0.14], [0, 1.09, 0.02], 'matte')); d.add(box(TRIM, [1.18, 0.12, 0.14], [0, -1.09, 0.02], 'matte'));
    d.add(box(TRIM, [0.12, 2.3, 0.14], [s * 0.53, 0, 0.02], 'matte')); d.add(box(TRIM, [0.12, 2.3, 0.14], [-s * 0.53, 0, 0.02], 'matte'));
    d.add(box(TRIM, [0.11, 2.45, 0.13], [0, 0, 0.03], 'matte', [0, 0, s * 0.47]));
    barn.add(pv); return pv;
  };
  const doorL = door(-1), doorR = door(1);
  K.solids.push({ name: 'barn', box: [-2.45, -9.85, 2.45, -6.05], allow: ['cow'] }); K.crowders.push({ name: 'barn', min: [-2.4, 0, -9.8], max: [2.4, 6.1, -6.1] });
  props.barn = new Prop(barn);
  props.barnDoors = { open: new Track(0) };
  props.barn.each((t) => { const o = props.barnDoors.open.at(t), w = props.barnDoors.wob ? props.barnDoors.wob(t) : 0; doorL.rotation.y = -o * 1.9 - w; doorR.rotation.y = o * 1.9 + w; });
  const wobs = []; props.barnDoors.wob = (t) => wobs.reduce((a, [t0, d]) => a + (t >= t0 && t < t0 + d ? Math.sin((t - t0) * 26) * 0.07 * Math.sin(Math.PI * (t - t0) / d) : 0), 0);
  props.barnDoors.rattle = (t0, d = 0.7) => wobs.push([t0, d]);
  K.props.push(props.barn);

  /* hay bales (pig hides behind) around (-7,0,-2) */
  const hay = new THREE.Group(); hay.position.set(-7, 0, -2.5); scene.add(hay);
  const bale = (p, ry) => { const b = new THREE.Group(); b.position.set(...p); b.rotation.y = ry; b.add(cyl('#EBC45E', 0.62, 0.62, 1.3, [0, 0, 0], 'matte', [0, 0, Math.PI / 2], 32)); [-1, 1].forEach((s) => b.add(torus('#D6A945', 0.42, 0.05, Math.PI * 2, [s * 0.66, 0, 0], 'matte', [0, Math.PI / 2, 0]))); return b; };
  hay.add(bale([-0.7, 0.62, 0], 0.1), bale([0.75, 0.62, 0.1], -0.08), bale([0.05, 1.8, 0.05], 0.05));
  K.solids.push({ name: 'hay', box: [-8.4, -3.15, -5.6, -1.8] });
  props.hay = new Prop(hay); K.props.push(props.hay);

  /* pond at (7.5,0,-1.5) */
  const pond = new THREE.Group(); pond.position.set(7.5, 0, -1.5); scene.add(pond);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshPhysicalMaterial({ color: '#4FB8E8', roughness: 0.08, metalness: 0, clearcoat: 1, transmission: 0, envMapIntensity: 1.4 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.06; water.scale.set(1.25, 1, 1); water.receiveShadow = true; pond.add(water);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; pond.add(ball('#B8B2A8', 0.24 + hash(i) * 0.12, [Math.cos(a) * 3.25, 0.08, Math.sin(a) * 2.6], 'matte', [1.3, 0.55, 1], 16)); }
  const pads = [];
  [[-1, 0.8], [1.2, -0.6], [0.4, 1.4]].forEach(([x, z], i) => { const p = cyl('#4FA94A', 0.32, 0.32, 0.03, [x, 0.09, z], 'matte', [0, i, 0], 24); pond.add(p); pads.push(p); });
  const reeds = new THREE.Group(); reeds.position.set(-1.2, 0, -1.6); pond.add(reeds);
  for (let i = 0; i < 9; i++) { const x = (hash(i * 3) - 0.5) * 2.2, z = (hash(i * 5) - 0.5) * 0.8, h = 1.3 + hash(i * 7) * 0.7; const r = new THREE.Group(); r.position.set(x, 0, z); r.add(cyl('#3E9A4A', 0.03, 0.04, h, [0, h / 2, 0], 'matte', [0, 0, 0], 8)); r.add(capsule('#8A5A3A', 0.07, 0.25, [0, h + 0.05, 0], 'matte')); reeds.add(r); }
  props.reeds = new Prop(reeds); K.props.push(props.reeds);
  K.solids.push({ name: 'pond', x: 7.5, z: -1.5, rx: 3.1, rz: 2.45, allow: ['duck'] });
  props.pond = new Prop(pond); props.pond.each((t) => { pads.forEach((p, i) => { p.position.y = 0.09 + Math.sin(t * 1.5 + i) * 0.015; p.rotation.y = i + Math.sin(t * 0.4 + i) * 0.2; }); reeds.children.forEach((r, i) => { r.rotation.x = Math.sin(t * 1.3 + i) * 0.05; }); });
  K.props.push(props.pond);

  /* bushes (sheep) at (6.5,0,-10): three short ROUND bushes (never one long row: it read as a caterpillar).
     The hidden animal waits parked (actor.park) and steps out from behind the middle bush at its reveal. */
  const bushes = new THREE.Group(); bushes.position.set(6.5, 0, -10); scene.add(bushes);
  const BUSH = [[-2.3, 0.02, 0.85], [0, 0, 1.0], [3.0, -0.04, 0.85]];   // gap of ~1.15 m right of the middle bush: the hidden animal walks out through it
  BUSH.forEach(([bx, bz, r], k) => {
    const b = new THREE.Group(); b.position.set(bx, 0, bz); bushes.add(b);
    b.add(ball(k % 2 ? '#4FAE4A' : '#5CBB52', r, [0, r * 0.82, 0], 'fur', [1, 0.92, 1], 32));
    [[-0.45, 0.55, 0.25, 0.55], [0.42, 0.6, 0.2, 0.52], [0.05, 1.18, 0.1, 0.5], [0.0, 0.62, -0.4, 0.55]].forEach(([x, y, z, s2], i) => b.add(ball(i % 2 ? '#56B84E' : '#4AA846', r * s2, [x * r, y * r, z * r], 'fur', [1, 0.9, 1], 24)));
    [[-0.35, 1.3, '#FF8FB1'], [0.4, 1.15, '#FFD65A'], [0.05, 1.55, '#FFFFFF']].forEach(([x, y, c]) => b.add(ball(c, 0.1, [x * r, y * r * 0.95, r * 0.78], 'matte', [1, 1, 1], 12)));
    K.solids.push({ name: `bush${k + 1}`, x: 6.5 + bx, z: -10 + bz, r: r * 1.02 });
  });
  props.bushes = new Prop(bushes); K.props.push(props.bushes);
  props.bushes.hideAt = [7.6, 0, -11.6];   // behind the bushes, in line with the gap (seen from the front-right)

  /* hen coop at (9.5,0,-7) */
  const coop = new THREE.Group(); coop.position.set(13, 0, -11); coop.rotation.y = -0.4; scene.add(coop);
  coop.add(box('#FFE29A', [2.2, 1.6, 1.8], [0, 1.25, 0], 'matte'));
  for (const x of [-0.9, 0.9]) for (const z of [-0.7, 0.7]) coop.add(cyl('#A8743F', 0.07, 0.07, 0.5, [x, 0.25, z], 'wood'));
  [-1, 1].forEach((s) => coop.add(rbox('#E5483B', [1.45, 0.12, 2.2], [s * 0.6, 2.35, 0], 'matte', [0, 0, -s * 0.62], 0.05)));
  const gab = new THREE.Shape(); gab.moveTo(-1.1, 0); gab.lineTo(1.1, 0); gab.lineTo(0, 0.95); gab.lineTo(-1.1, 0);
  [0.9, -0.9].forEach((z) => coop.add(mesh(new THREE.ExtrudeGeometry(gab, { depth: 0.08, bevelEnabled: false }), mat('#FFE29A', 'matte'), { pos: [0, 2.05, z - 0.04] })));
  coop.add(cyl('#FFF2C4', 0.42, 0.42, 0.06, [0, 1.2, 0.9], 'glow', [Math.PI / 2, 0, 0], 32));
  coop.add(rbox('#C98F55', [0.5, 0.06, 1.3], [0, 0.32, 1.45], 'wood', [0.62, 0, 0], 0.02));
  K.solids.push({ name: 'coop', x: 13, z: -11, r: 1.35, allow: ['hen'] });
  props.coop = new Prop(coop); K.props.push(props.coop);

  /* field gate + fence (horse) on the left back at (-9,0,-10) */
  const fence = new THREE.Group(); scene.add(fence);
  const fenceLine = (x0, z0, x1, z1, n) => { for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; fence.add(rbox('#F3E6CF', [0.18, 1.2, 0.18], [x, 0.6, z], 'wood', [0, 0, 0], 0.04)); }
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    [0.45, 0.95].forEach((y) => fence.add(rbox('#F3E6CF', [0.08, 0.14, len], [(x0 + x1) / 2, y, (z0 + z1) / 2], 'wood', [0, ang, 0], 0.03))); };
  fenceLine(-7.5, -13.5, -3.5, -12.5, 4); fenceLine(3.5, -12.8, 11.5, -13, 7); fenceLine(15, 2, 16.5, -9, 9);
  props.fence = fence;

  /* trees */
  const tree = (x, z, s = 1) => { K.solids.push({ name: 'tree', x, z, r: 0.35 * s }); const t = new THREE.Group(); t.position.set(x, 0, z); t.add(cyl('#8A5A3A', 0.22 * s, 0.3 * s, 2.2 * s, [0, 1.1 * s, 0], 'wood')); [[0, 2.9, 0, 1.4], [-0.8, 2.4, 0.2, 1.0], [0.8, 2.5, -0.1, 1.05], [0.1, 3.6, 0.1, 0.9]].forEach(([a, b, c, r]) => t.add(ball(hash(x + a) > 0.5 ? '#4DAE4F' : '#5BBE55', r * s, [a * s, b * s, c * s], 'fur', [1, 0.95, 1], 28))); scene.add(t); return t; };
  [[-13, -15, 1.3], [-18, -4, 1.1], [15, -15, 1.4], [19, -2, 1.2], [-4, -17, 1.0], [24, -20, 1.5], [-24, -14, 1.4]].forEach(([x, z, s]) => tree(x, z, s));
  tree(3.9, -7.3, 0.95);   // beside the barn's east wall: breaks up the red wall in shots from the bushes/pond side
  // apple tree near the yard (round red apples)
  const at = tree(-11, 4, 1.15); for (let i = 0; i < 7; i++) at.add(ball('#E5383B', 0.13, [(hash(i) - 0.5) * 2.4, 2.4 + hash(i * 3) * 1.4, 0.9 + hash(i * 5) * 0.4], 'gloss', [1, 1, 1], 14));

  /* flowers + grass tufts (instanced) */
  const fl = []; for (let i = 0; i < 260; i++) { const a = hash(i * 1.7) * Math.PI * 2, r = 5 + hash(i * 3.1) * 22, x = Math.cos(a) * r, z = Math.sin(a) * r - 3; if (Math.abs(x) < 3.5 && z < 1 && z > -12) continue; if (((x) / 6.6) ** 2 + ((z - 3) / 5.1) ** 2 < 1) continue; if (Math.hypot(x - 7.5, z + 1.5) < 4.2) continue; fl.push([x, z, i]); }
  const stemG = new THREE.CylinderGeometry(0.015, 0.02, 0.32, 5); stemG.translate(0, 0.16, 0);
  const headG = new THREE.SphereGeometry(0.075, 10, 8); headG.translate(0, 0.34, 0);
  const stems = new THREE.InstancedMesh(stemG, mat('#3F9A45', 'matte'), fl.length), heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.6 }), fl.length);
  const FC = ['#FF8FB1', '#FFD65A', '#FFFFFF', '#B39DFF', '#FF9F68'].map((c) => new THREE.Color(c));
  fl.forEach(([x, z, i], k) => heads.setColorAt(k, FC[i % FC.length]));
  heads.castShadow = false; stems.castShadow = false; scene.add(stems, heads);
  const tuftG = new THREE.ConeGeometry(0.05, 0.26, 4); tuftG.translate(0, 0.12, 0);
  const tufts = []; for (let i = 0; i < 1400; i++) { const a = hash(i * 2.9) * Math.PI * 2, r = 4 + hash(i * 4.3) * 26, x = Math.cos(a) * r, z = Math.sin(a) * r - 3; if (Math.abs(x) < 2.8 && z < 1 && z > -10.5) continue; if (((x) / 6.4) ** 2 + ((z - 3) / 4.9) ** 2 < 1) continue; if (Math.hypot(x - 7.5, z + 1.5) < 3.9) continue; for (let k = 0; k < 3; k++) tufts.push([x + (hash(i * 7 + k) - 0.5) * 0.12, z + (hash(i * 5 + k) - 0.5) * 0.12, i * 3 + k]); }
  const tuftM = new THREE.InstancedMesh(tuftG, new THREE.MeshStandardMaterial({ roughness: 0.9 }), tufts.length); tuftM.castShadow = false; scene.add(tuftM);
  const TC = ['#3E9B3C', '#4FAE45', '#5DBB4E', '#46A23F'].map((c) => new THREE.Color(c)); tufts.forEach(([, , i], k) => tuftM.setColorAt(k, TC[i % 4]));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  K.onFrame.push((t) => {
    fl.forEach(([x, z, i], k) => { e.set(Math.sin(t * 1.6 + i) * 0.12, 0, Math.cos(t * 1.3 + i) * 0.12); q.setFromEuler(e); s.setScalar(0.9 + hash(i) * 0.6); p.set(x, 0, z); m4.compose(p, q, s); stems.setMatrixAt(k, m4); heads.setMatrixAt(k, m4); });
    stems.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    tufts.forEach(([x, z, i], k) => { e.set(Math.sin(t * 1.4 + i * 0.7) * 0.1 + (hash(i * 3) - 0.5) * 0.5, hash(i) * 3, (hash(i * 2) - 0.5) * 0.5); q.setFromEuler(e); s.set(1, 0.7 + hash(i * 9) * 0.9, 1); p.set(x, 0, z); m4.compose(p, q, s); tuftM.setMatrixAt(k, m4); });
    tuftM.instanceMatrix.needsUpdate = true;
  });

  /* clouds (drift) */
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group(); const n = 4 + (i % 3);
    for (let k = 0; k < n; k++) { const b = ball('#FFFFFF', 2.2 + hash(i * 7 + k) * 1.6, [k * 2.4 - n * 1.2, hash(i + k) * 1.2, hash(k * 3 + i) * 1.5], 'matte', [1, 0.75, 0.8], 20); b.castShadow = false; b.material = mat('#FFFFFF', 'matte', { emissive: '#FFFFFF', emissiveIntensity: 0.35, roughness: 1 }); c.add(b); }
    const x0 = (i - 4) * 32, y = 28 + hash(i * 5) * 16, z = -90 - hash(i * 3) * 60;
    scene.add(c); K.onFrame.push((t) => { c.position.set(((x0 + t * 1.2 + 160) % 320) - 160, y, z); });
  }
  /* butterflies: two-lobed flat wings (double-sided), small; they fade out near the camera and during K.quiet() windows
     (reveals), so they never read as a blob on a character's face. */
  const wingShape = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.05, 0.16, 0.2, 0.2, 0.22, 0.09); sh.bezierCurveTo(0.23, 0.02, 0.12, -0.01, 0.05, -0.01);
    sh.bezierCurveTo(0.15, -0.05, 0.16, -0.15, 0.08, -0.15); sh.bezierCurveTo(0.03, -0.15, 0.0, -0.06, 0, 0); return new THREE.ShapeGeometry(sh, 10); })();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group(), colr = ['#FF8FB1', '#FFD65A', '#B39DFF', '#7FDBFF'][i];
    const wm = new THREE.MeshStandardMaterial({ color: colr, roughness: 0.6, side: THREE.DoubleSide });
    const w = (s) => { const pv = new THREE.Group(); const m = new THREE.Mesh(wingShape, wm); m.rotation.x = -Math.PI / 2; m.scale.set(s, 1, 1); m.castShadow = false; pv.add(m); b.add(pv); return pv; };
    const wl = w(1), wr = w(-1); b.add(capsule('#3A2E2E', 0.018, 0.12, [0, 0, 0], 'matte', [Math.PI / 2, 0, 0]));
    b.userData.critter = true; b.traverse((o) => { o.userData.critter = true; }); scene.add(b);
    const cx = [-4, 5, -8, 9][i], cz = [1, -4, -6, 2][i];
    K.onFrame.push((t, cam) => {
      const a = t * 0.45 + i * 1.7; b.position.set(cx + Math.sin(a) * 2.5, 1.4 + Math.sin(t * 1.7 + i) * 0.4, cz + Math.cos(a * 0.8) * 2); b.rotation.y = a + Math.PI / 2;
      const f = Math.sin(t * 22 + i) * 0.9; wl.rotation.z = f; wr.rotation.z = -f;
      const near = clamp((b.position.distanceTo(cam.position) - 6) / 2.5), q2 = K.quietAt(t);
      const k = near * (1 - q2); b.scale.setScalar(Math.max(1e-3, 0.8 * k)); b.visible = k > 0.02;
    });
  }

  // stations: where things happen (actor marks + camera hints)
  props.spots = {
    yard: [0, 0, 3], barn: [0, 0, -8], barnFront: [0, 0, -4.6], hay: [-7, 0, -2.5], hayFront: [-6.6, 0, 0.6], pond: [7.5, 0, -1.5], pondFront: [5.2, 0, 2.2],
    bushes: [6.5, 0, -10], coop: [13, 0, -11], coopDoor: [12.65, 1.2, -10.17], field: [-9, 0, -10], fieldFront: [-6.4, 0, -6.4],
  };
  return props;
}
