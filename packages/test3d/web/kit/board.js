// test3d kit: polished marble chess board in a bevelled dark-wood frame on a walnut table. All textures are procedural.
// World: board top surface = y 0, centre = origin, square = 0.055 m. Square 1 (a1) is near-left for a camera on +z.
import * as THREE from 'three';
import { fbm, noise2, rng, makeCanvas, clamp, lerp } from './util.js';

export const SQ = 0.055;

function marbleCanvases(size, dark, seed) {
  const col = makeCanvas(size, size), rgh = makeCanvas(size, size);
  const cc = col.getContext('2d'), rc = rgh.getContext('2d');
  const ci = cc.createImageData(size, size), ri = rc.createImageData(size, size), cd = ci.data, rd = ri.data;
  const per = size / 8, R = rng(seed);
  const sqp = []; for (let i = 0; i < 64; i++) sqp.push({ a: R() * Math.PI * 2, ox: R() * 40, oy: R() * 40, tone: R.range(-1, 1), s: R.range(0.8, 1.25) });
  const darkBase = dark === 'black' ? [[10, 10, 12], [26, 26, 30], [150, 150, 150]] : [[7, 30, 21], [16, 58, 40], [150, 190, 165]];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const fi = Math.min(7, Math.floor(px / per)), rj = 7 - Math.min(7, Math.floor(py / per));
      const lx = px / per - fi, ly = py / per - Math.floor(py / per);
      const sp = sqp[rj * 8 + fi], isDark = (fi + rj) % 2 === 0;
      const ca = Math.cos(sp.a), sa = Math.sin(sp.a);
      const x = ((lx - 0.5) * ca - (ly - 0.5) * sa) * sp.s + sp.ox, y = ((lx - 0.5) * sa + (ly - 0.5) * ca) * sp.s + sp.oy;
      const sd = seed + (isDark ? 100 : 200);
      const wx = fbm(x * 1.3, y * 1.3, sd + 1, 3), wy = fbm(x * 1.3 + 9.1, y * 1.3 + 3.3, sd + 2, 3);
      const n1 = fbm(x * 0.9 + wx * 1.6, y * 0.9 + wy * 1.6, sd + 3, 5);
      const n2 = fbm(x * 2.6 + wy * 1.2, y * 2.6 + wx * 1.2, sd + 4, 4);
      const mask = clamp(fbm(x * 0.7 + 4, y * 0.7 + 8, sd + 7, 2) * 2.4 - 0.75);
      const v1 = Math.pow(1 - Math.abs(2 * n1 - 1), 26), v2 = Math.pow(1 - Math.abs(2 * n2 - 1), 40);
      const cloud = fbm(x * 1.4 + wx * 0.8, y * 1.4 + wy * 0.8, sd + 5, 5), fine = fbm(x * 9, y * 9, sd + 8, 3), speck = noise2(px * 0.9, py * 0.9, sd + 6);
      let r, g, b, vein;
      if (isDark) {
        const [b0, b1, vn] = darkBase, k = clamp(cloud * 1.25 - 0.22 + sp.tone * 0.1 + (fine - 0.5) * 0.25);
        vein = clamp(v1 * (0.25 + 0.75 * mask) + v2 * 0.35 * mask);
        r = lerp(lerp(b0[0], b1[0], k), vn[0], vein * 0.7); g = lerp(lerp(b0[1], b1[1], k), vn[1], vein * 0.7); b = lerp(lerp(b0[2], b1[2], k), vn[2], vein * 0.7);
        const sk = 1 + (speck - 0.5) * 0.22; r *= sk; g *= sk; b *= sk;
      } else {
        const k = clamp(cloud * 1.4 - 0.2 + sp.tone * 0.15 + (fine - 0.5) * 0.2);
        vein = clamp(v1 * (0.35 + 0.65 * mask) + v2 * 0.5 * mask);
        r = lerp(lerp(233, 214, k), 142, vein * 0.6); g = lerp(lerp(224, 199, k), 120, vein * 0.6); b = lerp(lerp(202, 170, k), 92, vein * 0.6);
        const sk = 1 + (speck - 0.5) * 0.05; r *= sk; g *= sk; b *= sk;
      }
      // hairline joints between the inlaid squares
      const ex = Math.min(lx, 1 - lx) * per, ey = Math.min(ly, 1 - ly) * per, e = Math.min(ex, ey);
      const joint = e < 1.4 ? 0.55 + 0.45 * (e / 1.4) : 1;
      const o = (py * size + px) * 4;
      cd[o] = r * joint; cd[o + 1] = g * joint; cd[o + 2] = b * joint; cd[o + 3] = 255;
      const ro = clamp(0.62 + vein * 0.3 + (speck - 0.5) * 0.1 + (1 - joint) * 0.8) * 255;
      rd[o] = ro; rd[o + 1] = ro; rd[o + 2] = ro; rd[o + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); rc.putImageData(ri, 0, 0);
  return { col, rgh };
}

/** fine crystalline speckle + micro scratches, tiled many times over the marble (detail at macro distance) */
function detailCanvas(size, seed) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const a = fbm(px / 6, py / 6, seed, 3, size / 6 | 0), b = noise2(px / 1.7, py / 1.7, seed + 9, Math.round(size / 1.7));
    const o = (py * size + px) * 4; d[o] = clamp(0.5 + (a - 0.5) * 0.9 + (b - 0.5) * 0.35) * 255; d[o + 1] = clamp(0.5 + (b - 0.5) * 0.8) * 255; d[o + 2] = 128; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const R = rng(seed + 3); x.globalAlpha = 0.16; x.lineWidth = 0.7;
  for (let i = 0; i < 60; i++) { const g = R() > 0.5 ? 255 : 0; x.strokeStyle = `rgb(${g},${g},128)`; const px = R() * size, py = R() * size, a = R() * 6.283, l = R.range(10, 70); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  return c;
}

/** wear on the polish (tiles): r = hairline scratches (wiping arcs + strays), g = dull smudges (low frequency), b = dust specks and short fibres */
function wearCanvas(size, seed) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data, R = rng(seed);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const g = fbm(px / size * 5, py / size * 5, seed + 1, 4, 5), o = (py * size + px) * 4;
    d[o] = 0; d[o + 1] = clamp((g - 0.34) * 2.4) * 255; d[o + 2] = 0; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
  const wrapped = (fn) => { for (const ox of [0, -size]) for (const oy of [0, -size]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
  const dirs = [R() * 6.283, R() * 6.283, R() * 6.283];
  for (let i = 0; i < 520; i++) {
    const a = R() < 0.7 ? R.pick(dirs) + R.gauss() * 0.16 : R() * 6.283, l = R() < 0.85 ? R.range(20, 160) : R.range(160, 620), px = R() * size, py = R() * size, bend = R.gauss() * l * 0.06;
    const ex = px + Math.cos(a) * l, ey = py + Math.sin(a) * l, mx = (px + ex) / 2 - Math.sin(a) * bend, my = (py + ey) / 2 + Math.cos(a) * bend;
    x.strokeStyle = `rgba(255,0,0,${R.range(0.12, 0.6).toFixed(2)})`; x.lineWidth = R.range(0.5, 1.25);
    wrapped(() => { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(mx, my, ex, ey); x.stroke(); });
  }
  for (let i = 0; i < 620; i++) {
    const px = R() * size, py = R() * size, r = R() < 0.9 ? R.range(0.5, 1.3) : R.range(1.3, 2.4); x.fillStyle = `rgba(0,0,255,${R.range(0.35, 1).toFixed(2)})`;
    wrapped(() => { x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill(); });
  }
  for (let i = 0; i < 40; i++) {   // lint: short curved fibres
    const px = R() * size, py = R() * size, a = R() * 6.283, l = R.range(8, 26); x.strokeStyle = `rgba(0,0,255,${R.range(0.3, 0.7).toFixed(2)})`; x.lineWidth = 0.8;
    wrapped(() => { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.9) * l * 0.6, py + Math.sin(a + 0.9) * l * 0.6, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); });
  }
  return c;
}

/** wood canvas: grain runs along canvas x. palette = [dark, mid, light] rgb */
export function woodCanvas(size, seed, pal, { rings = 9, fibre = 1 } = {}) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  const rg = makeCanvas(size, size), rx = rg.getContext('2d'), rim = rx.createImageData(size, size), r = rim.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const u = px / size, v = py / size;
    const vv = v + 0.035 * (fbm(u * 1.6, v * 5, seed, 3) - 0.5) + 0.012 * (fbm(u * 5, v * 14, seed + 3, 2) - 0.5);
    const ring = (vv * rings + fbm(u * 0.45, vv * 1.6, seed + 5, 3) * 2.4) % 1, rr = Math.abs(ring * 2 - 1);
    const band = Math.pow(rr, 1.4);
    const fib = noise2(u * 22, v * 620, seed + 11) * 0.55 + noise2(u * 7, v * 230, seed + 12) * 0.45;
    const pore = Math.pow(noise2(u * 60, v * 900, seed + 13), 10);
    const tone = fbm(u * 0.9, v * 1.7, seed + 20, 3);
    let k = clamp(band * 0.4 + fib * 0.34 * fibre + tone * 0.42 - 0.08);
    const a = k < 0.5 ? pal[0] : pal[1], b = k < 0.5 ? pal[1] : pal[2], kk = k < 0.5 ? k * 2 : k * 2 - 1;
    const dk = 1 - pore * 0.55;
    const o = (py * size + px) * 4;
    d[o] = lerp(a[0], b[0], kk) * dk; d[o + 1] = lerp(a[1], b[1], kk) * dk; d[o + 2] = lerp(a[2], b[2], kk) * dk; d[o + 3] = 255;
    const ro = clamp(0.6 + (fib - 0.5) * 0.35 + pore * 0.6 - band * 0.12) * 255; r[o] = ro; r[o + 1] = ro; r[o + 2] = ro; r[o + 3] = 255;
  }
  x.putImageData(img, 0, 0); rx.putImageData(rim, 0, 0);
  return { col: c, rgh: rg };
}

function tex(canvas, renderer, { srgb = false, repeat = null, mirror = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) { t.wrapS = t.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/**
 * board({dark: 'green' | 'black', border: 0.03, thick: 0.028, seed, table: true})
 * -> Group with .sq(n) (world centre of square n, 1..64), .S (square size), .half (half width of the marble), .tableY
 */
export function board(K, { dark = 'green', border = 0.03, thick = 0.028, seed = 7, table = true, texSize = 2048, wear = 1 } = {}) {
  const g = new THREE.Group(); g.name = 'board';
  const half = SQ * 4, { renderer } = K;

  // marble top with planar reflections of whatever stands on it (the engine renders K.mirror every sub-frame)
  const m = marbleCanvases(texSize, dark, seed);
  // uWear: how used the polish is (0 = a perfect mirror, 1 = hairline scratches, dull smudges and dust that break the reflection up a little)
  const refl = { tRefl: { value: null }, tReflDepth: { value: null }, uLens: { value: new THREE.Vector4(0.01, 60, 1, 0) }, uReflInv: { value: new THREE.Vector2(1 / K.W, 1 / K.H) }, uReflK: { value: 1 }, tDetail: { value: tex(detailCanvas(512, seed + 50), renderer, { repeat: [1, 1] }) },
    tWear: { value: tex(wearCanvas(1024, seed + 70), renderer, { repeat: [1, 1] }) }, uWear: { value: wear } };
  const marble = new THREE.MeshPhysicalMaterial({
    map: tex(m.col, renderer, { srgb: true }), roughnessMap: tex(m.rgh, renderer), roughness: 0.3, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.035, ior: 1.55, specularIntensity: 1, envMapIntensity: 1,
  });
  marble.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, refl);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform sampler2D tReflDepth; uniform sampler2D tDetail; uniform sampler2D tWear; uniform vec2 uReflInv; uniform float uReflK, uWear; uniform vec4 uLens;')
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec4 det = texture2D( tDetail, vMapUv * 56.0 );
  diffuseColor.rgb *= 0.93 + 0.14 * det.r;
  // wear, two scales: 0.11 m tiles (smudges, coarse scratches, dust) and 0.037 m tiles (hairlines that only show at macro distance)
  vec4 wrA = texture2D( tWear, vMapUv * 4.0 ), wrB = texture2D( tWear, vMapUv.yx * 11.7 + vec2( 0.37, 0.61 ) );
  float wScr = clamp( max( wrA.r * 0.75, wrB.r ), 0.0, 1.0 ) * uWear, wSmg = wrA.g * uWear, wDust = clamp( max( wrA.b, wrB.b * 0.8 ), 0.0, 1.0 ) * uWear;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.6, 0.57, 0.51 ), wDust * 0.6 ) + vec3( 0.022 ) * wScr;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp( roughnessFactor + ( det.g - 0.5 ) * 0.08 + wScr * 0.25 + wSmg * 0.1 + wDust * 0.4, 0.03, 1.0 );')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n  #ifdef USE_CLEARCOAT\n  material.clearcoatRoughness = clamp( material.clearcoatRoughness + wScr * 0.3 + wSmg * 0.07 + wDust * 0.5, 0.03, 1.0 ); material.clearcoat *= 1.0 - 0.6 * wDust;\n  #endif')
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
  #ifdef USE_CLEARCOAT
  {
    vec2 ruv = vec2( 1.0 - gl_FragCoord.x * uReflInv.x, gl_FragCoord.y * uReflInv.y );
    // the polish is not optically flat: the mirror image wanders a little with the smudges
    ruv += ( vec2( wrA.g, texture2D( tWear, vMapUv * 2.3 + vec2( 0.13, 0.71 ) ).g ) - 0.5 ) * 0.005 * uWear;
    // the mirror image is as far away as the thing it shows: blur it by that thing's circle of confusion, not the marble's
    float zr = uLens.x * uLens.y / ( uLens.y - ( uLens.y - uLens.x ) * texture2D( tReflDepth, ruv ).x );
    float rr = clamp( uLens.w * abs( 1.0 / uLens.z - 1.0 / zr ) + wSmg * 7.0 + wScr * 12.0, 1.2, 90.0 );
    float lod = clamp( log2( rr * 0.42 ), 0.0, 4.5 ), rot = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.2831853;
    vec4 rf = textureLod( tRefl, ruv, lod );
    for ( int i = 0; i < 14; i ++ ) { float fi = float( i ) + 0.5, d = sqrt( fi / 14.0 ) * rr, a = fi * 2.39996323 + rot; rf += textureLod( tRefl, ruv + vec2( cos( a ), sin( a ) ) * d * uReflInv, lod ); }
    rf /= 15.0;
    float cover = clamp( rf.a, 0.0, 1.0 ) * uReflK * ( 1.0 - 0.6 * wScr ) * ( 1.0 - 0.32 * wSmg ) * ( 1.0 - 0.9 * wDust );
    clearcoatRadiance = mix( clearcoatRadiance, rf.rgb, cover );
    radiance = mix( radiance, rf.rgb, cover * 0.6 );
  }
  #endif`);
  };
  const top = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), marble);
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; top.name = 'marble'; g.add(top);
  K.mirror = { y: 0, uniforms: refl, mesh: top };

  // bevelled dark-wood frame
  const bev = 0.003, lip = 0.0016, out = half + border;
  const shp = new THREE.Shape(); const rad = 0.006;
  shp.moveTo(-out + rad, -out); shp.lineTo(out - rad, -out); shp.quadraticCurveTo(out, -out, out, -out + rad); shp.lineTo(out, out - rad); shp.quadraticCurveTo(out, out, out - rad, out);
  shp.lineTo(-out + rad, out); shp.quadraticCurveTo(-out, out, -out, out - rad); shp.lineTo(-out, -out + rad); shp.quadraticCurveTo(-out, -out, -out + rad, -out);
  const hole = new THREE.Path(), hh = half + bev; hole.moveTo(-hh, -hh); hole.lineTo(-hh, hh); hole.lineTo(hh, hh); hole.lineTo(hh, -hh); hole.lineTo(-hh, -hh); shp.holes.push(hole);
  const fw = woodCanvas(1024, seed + 21, [[17, 9, 6], [36, 20, 12], [60, 35, 21]], { rings: 9 });
  const frameMat = new THREE.MeshPhysicalMaterial({ map: tex(fw.col, renderer, { srgb: true, repeat: [1 / 0.32, 1 / 0.16], mirror: true }), roughnessMap: tex(fw.rgh, renderer, { repeat: [1 / 0.32, 1 / 0.16], mirror: true }), roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.18 });
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: thick - bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 5, curveSegments: 8 }), frameMat);
  frame.rotation.x = -Math.PI / 2; frame.position.y = lip - thick; frame.castShadow = true; frame.receiveShadow = true; frame.name = 'frame'; g.add(frame);
  const body = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.004, thick - 0.001, half * 2 + 0.004), frameMat); body.position.y = -thick / 2 - 0.0006; g.add(body);

  // walnut table: a wide disc that falls off into the dark (baked light pool), grain along x
  const tableY = -thick + lip - bev;
  if (table) {
    const tw = woodCanvas(2048, seed + 33, [[30, 17, 10], [56, 33, 19], [88, 56, 33]], { rings: 22 });
    const tableMat = new THREE.MeshPhysicalMaterial({ map: tex(tw.col, renderer, { srgb: true, repeat: [1 / 1.1, 1 / 0.55], mirror: true }), roughnessMap: tex(tw.rgh, renderer, { repeat: [1 / 1.1, 1 / 0.55], mirror: true }), roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.35, vertexColors: true });
    // ring-subdivided disc so the vertex-colour falloff is smooth
    const rings = 24, seg = 96, pos = [], uv = [], colr = [], idx = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= seg; j++) {
      const r = 2.6 * Math.pow(i / rings, 1.6), a = j / seg * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, 0, z); uv.push(x, -z); const f = Math.pow(clamp(1 - (r - 0.45) / 1.75), 2.2) * 0.96 + 0.04; colr.push(f, f, f);
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tg.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); tg.setIndex(idx); tg.computeVertexNormals();
    const tb = new THREE.Mesh(tg, tableMat); tb.position.y = tableY; tb.receiveShadow = true; tb.name = 'table'; g.add(tb);
  }

  g.S = SQ; g.half = half; g.outer = out; g.tableY = tableY;
  /** world centre of square n (1..64): 1 = a1 near-left, left to right, then up rank by rank */
  g.sq = (n, y = 0) => { const i = (n - 1) % 8, j = Math.floor((n - 1) / 8); return new THREE.Vector3((i - 3.5) * SQ, y, (3.5 - j) * SQ).add(g.position); };
  return g;
}
