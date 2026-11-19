// test3d kit: rice. One grain = 6.5 x 2.2 x 1.8 mm (long axis = local x, thickness = local y). Everything is seeded.
import * as THREE from 'three';
import { rng, clamp, makeCanvas, normalCanvas, noise2, fbm } from './util.js';

export const GRAIN = { L: 0.0065, W: 0.0022, T: 0.0018 };
const V_GRAIN = 4.7e-8;   // m3 one grain takes in a loose heap

function grainGeometry(na, nr, groove = 0) {
  // parametric grain: s = 0..1 along the length (x), a = angle around it. Normals from the surface derivatives, uv = (s, a / 2pi).
  const P = (s, a, o) => {
    const x = -0.5 * Math.cos(Math.PI * s), ax = Math.abs(2 * x);
    // hero grain: the far end (+x) runs out to a soft point, the germ end stays blunt (a long milled grain, not a pill)
    let r = Math.pow(Math.max(0, 1 - Math.pow(ax, groove ? (x > 0 ? 1.7 : 2.6) : 3.1)), 0.5) * 0.5 * (1 - (groove ? 0.3 : 0.17) * (x + 0.5)) * (1 + 0.025 * Math.sin(x * 9 + 1) + 0.02 * Math.sin(x * 17 + a * 2));
    const notch = Math.min(1, Math.max(0, (-0.28 - x) / 0.2)); r *= 1 - (groove ? 0.58 : 0.42) * notch * notch * (3 - 2 * notch) * Math.max(0, Math.sin(a)) ** 1.5;   // oblique cut where the germ sat
    if (groove) {   // hero grain: two shallow furrows along the length, a flat on the back, slightly lumpy outline (a milled grain, not a pebble)
      const body = Math.max(0, 1 - Math.pow(ax, 2.4)), wrapA = (v) => Math.atan2(Math.sin(v), Math.cos(v));
      r *= 1 - groove * 0.085 * body * Math.exp(-((wrapA(a - 0.95 - 0.5 * x) / 0.2) ** 2)) - groove * 0.06 * body * Math.exp(-((wrapA(a - 2.5 + 0.4 * x) / 0.24) ** 2)) - groove * 0.05 * body * Math.exp(-((wrapA(a - 4.6) / 0.6) ** 2));
      r *= 1 + groove * (0.022 * Math.sin(x * 23 + a * 3 + 0.7) + 0.016 * Math.sin(x * 41 - a * 2));
    }
    return o.set(x * GRAIN.L, Math.cos(a) * r * GRAIN.T, (Math.sin(a) * r + 0.05 * (1 - 4 * x * x) - 0.022) * GRAIN.W);
  };
  const pos = [], nrm = [], uv = [], idx = [], p = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), n = new THREE.Vector3(), e = 1e-3;
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nr; j++) {
    const s = i / na, a = j / nr * Math.PI * 2, sc = Math.min(1 - 2 * e, Math.max(2 * e, s));
    P(s, a, p); P(sc + e, a, p1).sub(P(sc - e, a, p2)); const ds = p1.clone(); P(sc, a + e, p1).sub(P(sc, a - e, p2));
    n.crossVectors(p1, ds).normalize(); if (!(n.lengthSq() > 0.5)) n.set(s < 0.5 ? -1 : 1, 0, 0);
    pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); uv.push(s, j / nr);
  }
  for (let i = 0; i < na; i++) for (let j = 0; j < nr; j++) { const a = i * (nr + 1) + j, b = a + 1, c = a + nr + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

/** grain skin: chalky white belly, more translucent (greyer, warmer) ends and edges, fine ridges along the length (normal map) */
function grainTextures(hero = 0) {
  const S = hero ? 512 : 256, c = makeCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data, Hh = new Float32Array(S * S);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const u = px / S, v = py / S, o = py * S + px;
    const ends = Math.pow(Math.abs(u * 2 - 1), 2.2), belly = Math.exp(-(((u - 0.52) / 0.3) ** 2)) * (0.5 + 0.5 * Math.cos((v - 0.25) * Math.PI * 2));
    const n = fbm(u * 5, v * 5, 77, 3, 5), sp = noise2(u * 60, v * 60, 78, 60);
    const stria = hero * 0.035 * (Math.sin(v * Math.PI * 2 * 9 + n * 6) * 0.5 + 0.5) * (1 - ends);   // hero: glassy body with a milk-white heart, fine lines along the length
    const chalk = clamp(belly * (0.9 + 0.5 * hero) + (n - 0.5) * (0.5 + 0.3 * hero) - 0.12 * hero), k = 0.82 - 0.05 * hero + (0.18 + 0.09 * hero) * chalk - (0.13 + 0.07 * hero) * ends + (sp - 0.5) * 0.035 - stria;
    const germ = Math.exp(-(((u - 0.04) / 0.05) ** 2)) * 0.35;
    d[o * 4] = 255 * clamp(k); d[o * 4 + 1] = 255 * clamp(k * (0.985 - 0.02 * ends) - germ * 0.06); d[o * 4 + 2] = 255 * clamp(k * (0.95 - 0.07 * ends - 0.05 * (1 - chalk)) - germ * 0.2); d[o * 4 + 3] = 255;
    Hh[o] = (Math.sin(v * Math.PI * 2 * 11 + noise2(u * 3, 0.5, 79, 3) * 5) * 0.5 + Math.sin(v * Math.PI * 2 * 23 + u * 3) * 0.25) * 0.000012 * (1 - ends) + (fbm(u * 24, v * 24, 80, 2, 24) - 0.5) * 0.00001;
  }
  x.putImageData(img, 0, 0);
  return { col: c, nrm: normalCanvas(Hh, S, 0.0064 / S, 1) };
}

/** half height of a posed grain (ellipsoid bound) along world y */
const _m = new THREE.Matrix4();
function extY(quat, scale) {
  const e = _m.makeRotationFromQuaternion(quat).elements, a = GRAIN.L / 2 * (scale?.x ?? 1), b = GRAIN.T / 2 * (scale?.y ?? 1), c = GRAIN.W / 2 * (scale?.z ?? 1);
  return Math.hypot(a * e[1], b * e[5], c * e[9]);
}

export function makeRice(K) {
  const geoHi = grainGeometry(48, 24), geoMid = grainGeometry(18, 12), geoLo = grainGeometry(10, 8), geoHero = grainGeometry(120, 64, 1.6);   // deeper furrows: the hero has to read as rice at a glance
  const gt = grainTextures(), heroTex = grainTextures(1), gtex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: gtex(gt.col, true), normalMap: gtex(gt.nrm, false), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.44, metalness: 0, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(1, 0.95, 0.86), specularIntensity: 0.75, ior: 1.5 });
  mat.emissive.setRGB(0.035, 0.03, 0.022); mat.emissiveMap = mat.map;
  // cheap translucency: (1) the thin rim of a grain glows a little, (2) the key light wraps past the terminator (half-lambert), as if it travelled through the grain
  // thru = how much light the grain lets through (1 = the bulk look; the hero grain uses more: light from behind glows through the thin ends)
  const translucent = (m, thru = 1) => {
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3( 1.0, 0.92, 0.78 ) * ${(0.1 * thru).toFixed(3)} * pow( 1.0 - abs( dot( normalize( normal ), normalize( vViewPosition ) ) ), 1.6 );
  #if NUM_DIR_LIGHTS > 0
  for ( int li = 0; li < ${thru > 1 ? 2 : 1}; li ++ ) { float ndl = dot( normalize( normal ), directionalLights[ li ].direction ); float wr = pow( clamp( ndl * 0.5 + 0.5, 0.0, 1.0 ), 1.3 ) - max( ndl, 0.0 );
    float back = pow( clamp( dot( normalize( vViewPosition ), directionalLights[ li ].direction ) * -0.5 + 0.5, 0.0, 1.0 ), 2.0 );
    totalEmissiveRadiance += diffuseColor.rgb * directionalLights[ li ].color * vec3( 1.0, 0.9, 0.76 ) * ( max( wr, 0.0 ) * ${(0.4 * thru).toFixed(3)} + back * clamp( 0.5 - ndl * 0.5, 0.0, 1.0 ) * ${(0.62 * (thru - 1)).toFixed(3)} ) * RECIPROCAL_PI; }
  #endif`); };
    m.customProgramCacheKey = () => 'rice-rim-' + thru;   // a touch of light held inside the grain (cheap translucency)
    return m;
  };
  translucent(mat, 1);
  const ivory = (R) => { const l = R.range(0.88, 1), w = R.range(0, 1); return new THREE.Color().setRGB(0.965 * l, (0.945 - 0.03 * w) * l, (0.885 - 0.09 * w) * l, THREE.SRGBColorSpace); };
  const tmpM = new THREE.Matrix4(), yAxis = new THREE.Vector3(0, 1, 0), zAxis = new THREE.Vector3(0, 0, 1), xAxis = new THREE.Vector3(1, 0, 0);

  function instanced(count, detail) {
    const im = new THREE.InstancedMesh(detail === 'hi' ? geoHi : detail === 'lo' ? geoLo : geoMid, mat, count);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    return im;
  }

  const rice = {
    GRAIN, material: mat, extY,

    /** one hero grain (high detail Mesh) for macro shots; pose it with rice.drop(...).at(t) */
    grain({ seed = 1 } = {}) {
      const hm = mat.clone(); hm.map = hm.emissiveMap = gtex(heroTex.col, true); hm.normalMap = gtex(heroTex.nrm, false);
      const m = new THREE.Mesh(geoHero, translucent(hm, 1.9)); m.material.color.copy(ivory(rng(seed))); m.material.roughness = 0.36; m.material.emissive.setRGB(0.06, 0.052, 0.04); m.material.normalScale.set(1.1, 1.1); m.castShadow = true; m.receiveShadow = true;
      m.rest = (p) => ({ pos: new THREE.Vector3(p.x, p.y + GRAIN.T / 2, p.z), quat: new THREE.Quaternion().setFromAxisAngle(yAxis, rng(seed + 7)() * 6.283), scale: new THREE.Vector3(1, 1, 1) });
      m.pose = (o) => { m.position.copy(o.pos); m.quaternion.copy(o.quat); m.visible = o.visible !== false; };
      return m;
    },

    /**
     * pile(n, centre, seed, {radius, slope, detail}) -> InstancedMesh of n grains at rest in a natural low heap.
     * Grains are dropped one by one on a height field: each lies flat on the surface or on the grains under it, none floats, none cuts the board.
     * .rest[i] = {pos, quat, scale} in deposit order; .show(k) shows the first k grains; .place(i, pose) overrides one grain; .reset().
     */
    pile(n, centre, seed = 1, { radius = Infinity, slope = 0.3, detail = null } = {}) {
      const R = rng(seed), c = centre.clone ? centre : new THREE.Vector3(centre.x, centre.y, centre.z);
      const Rc = Math.cbrt(V_GRAIN * n * 3 / (Math.PI * slope)), sigma = Math.max(0.0032, Math.min(Rc, radius) * 0.55);
      const maxR = Math.min(radius, Math.max(Rc * 1.5, 0.008)), ext = maxR + GRAIN.L, cell = n > 1200 ? 0.0005 : 0.00035, G = Math.ceil(2 * ext / cell) + 2;
      const Hf = new Float32Array(G * G);
      const im = instanced(n, detail ?? (n <= 400 ? 'hi' : 'mid')), rest = [];
      const land = (x, z, yaw, L, W, T, stamp) => {
        const dx = Math.cos(yaw), dz = -Math.sin(yaw), px = Math.sin(yaw), pz = Math.cos(yaw);
        const hx = Math.abs(dx) * L / 2 + Math.abs(px) * W / 2, hz = Math.abs(dz) * L / 2 + Math.abs(pz) * W / 2;
        const i0 = Math.max(0, Math.floor((x - hx + ext) / cell)), i1 = Math.min(G - 1, Math.ceil((x + hx + ext) / cell)), j0 = Math.max(0, Math.floor((z - hz + ext) / cell)), j1 = Math.min(G - 1, Math.ceil((z + hz + ext) / cell));
        let hA = 0, hB = 0;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const ox = i * cell - ext - x, oz = j * cell - ext - z, s = ox * dx + oz * dz, w = ox * px + oz * pz;
          if ((2 * s / L) ** 2 + (2 * w / W) ** 2 > 1) continue;
          const h = Hf[j * G + i]; if (s < -0.12 * L) { if (h > hA) hA = h; } else if (s > 0.12 * L && h > hB) hB = h;
        }
        const pitch = clamp(Math.atan2(hB - hA, 0.55 * L), -0.55, 0.55), sp = Math.sin(pitch);
        let yc = 0;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const ox = i * cell - ext - x, oz = j * cell - ext - z, s = ox * dx + oz * dz, w = ox * px + oz * pz, e = (2 * s / L) ** 2 + (2 * w / W) ** 2;
          if (e > 1) continue;
          const need = Hf[j * G + i] - s * sp + T / 2 * Math.sqrt(1 - e); if (need > yc) yc = need;
        }
        if (stamp) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const ox = i * cell - ext - x, oz = j * cell - ext - z, s = ox * dx + oz * dz, w = ox * px + oz * pz, e = (2 * s / L) ** 2 + (2 * w / W) ** 2;
          if (e > 1) continue;
          const top = yc + s * sp + T / 2 * Math.sqrt(1 - e); if (top > Hf[j * G + i]) Hf[j * G + i] = top;
        }
        return { yc, pitch };
      };
      let top = 0;
      for (let k = 0; k < n; k++) {
        const sl = R() < 0.05 ? R.range(0.55, 0.75) : R.range(0.86, 1.1), sw = R.range(0.9, 1.08), L = GRAIN.L * sl, W = GRAIN.W * sw, T = GRAIN.T * sw;
        const stray = n >= 6 && R() < 0.08, tries = n === 1 ? 1 : stray ? 1 : 8;
        let best = null;
        for (let a = 0; a < tries; a++) {
          let x, z, r, guard = 0;
          do { const sg = sigma * (stray ? 1.8 : 1); x = R.gauss() * sg; z = R.gauss() * sg; r = Math.hypot(x, z); } while (r > maxR && ++guard < 20);
          if (n === 1) { x = 0; z = 0; r = 0; } else if (r > maxR) { x *= maxR / r; z *= maxR / r; r = maxR; }
          const yaw = R() * Math.PI * 2, l = land(x, z, yaw, L, W, T, false), cost = l.yc + slope * r;
          if (!best || cost < best.cost) best = { x, z, yaw, cost };
        }
        const l = land(best.x, best.z, best.yaw, L, W, T, true), roll = R.range(-0.12, 0.12);
        const quat = new THREE.Quaternion().setFromAxisAngle(yAxis, best.yaw).multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, l.pitch)).multiply(new THREE.Quaternion().setFromAxisAngle(xAxis, roll));
        rest.push({ pos: new THREE.Vector3(c.x + best.x, c.y + l.yc, c.z + best.z), quat, scale: new THREE.Vector3(sl, sw, sw) });
        im.setColorAt(k, ivory(R)); if (c.y + l.yc + T > top) top = c.y + l.yc + T;
      }
      im.rest = rest; im.n = n; im.top = top; im.radius = maxR; im.centre = c;
      im.place = (i, o) => { im.setMatrixAt(i, tmpM.compose(o.pos, o.quat, o.scale ?? rest[i].scale)); im.instanceMatrix.needsUpdate = true; };
      im.reset = () => { for (let i = 0; i < n; i++) im.setMatrixAt(i, tmpM.compose(rest[i].pos, rest[i].quat, rest[i].scale)); im.instanceMatrix.needsUpdate = true; };
      im.show = (k) => { im.count = Math.max(0, Math.min(n, Math.round(k))); im.visible = im.count > 0; };
      im.reset(); im.instanceColor.needsUpdate = true;
      return im;
    },

    /**
     * drop(target, t0, opts) -> {at(t) -> {pos, quat, scale, visible, landed}, tStart, tEnd, hits[{t, gain}]}.
     * target = a rest pose {pos, quat, scale} (pile.rest[i], grain.rest(p)); the grain FIRST TOUCHES the surface at t0, bounces (opts.bounces, 2), tumbles and settles on the target.
     * opts: height 0.1 m, slow 1 (4 = four times slower than real gravity), bounce 0.3 (restitution), scatter 0.012 m sideways travel, spin 9 rad/s, seed.
     */
    drop(target, t0, { height = 0.1, slow = 1, bounce = 0.3, bounces = 2, scatter = 0.012, spin = 9, settle = 0.22, seed = 1, g = 9.81 } = {}) {
      const R = rng(seed + 101), tp = target.pos, tq = target.quat, ts = target.scale ?? new THREE.Vector3(1, 1, 1);
      const G = g / (slow * slow), Tf = Math.sqrt(2 * height / G), v0 = G * Tf;
      const Tb = []; let v = v0; for (let k = 0; k < bounces; k++) { v *= bounce * R.range(0.85, 1.1) * (k ? 0.8 : 1); Tb.push(2 * v / G); }
      const tb = [t0]; for (const T of Tb) tb.push(tb[tb.length - 1] + T);
      const tLand = tb[tb.length - 1], st = settle * slow, tEnd = tLand + st, tStart = t0 - Tf;
      const w0 = spin / slow, ws = Tb.map((_, k) => w0 * (k ? 0.7 : 1.5));
      const ang = [0]; for (let k = Tb.length - 1; k >= 0; k--) ang.unshift(ang[0] + ws[k] * Tb[k]);   // remaining tumble angle at every contact
      const ph = R() * 6.283, axis = new THREE.Vector3(R.range(-0.25, 0.25), Math.sin(ph), Math.cos(ph)).normalize();
      const da = R() * 6.283, dist = scatter * R.range(0.7, 1.2), total = Tb.reduce((a, b) => a + b, 0) || 1;
      const rem = [1]; for (const T of Tb) rem.push(Math.max(0, rem[rem.length - 1] - T / total));
      const at0 = (k) => new THREE.Vector3(tp.x - Math.cos(da) * dist * rem[k], 0, tp.z - Math.sin(da) * dist * rem[k]);
      const support = tp.y - extY(tq, ts), wobAxis = xAxis, wobA = R.range(0.18, 0.3) * (R() > 0.5 ? 1 : -1);
      const quatAt = (t) => {
        let th = 0, wob = 0;
        if (t < t0) th = ang[0] + w0 * (t0 - t);
        else if (t < tLand) { let k = 0; while (t >= tb[k + 1]) k++; th = ang[k + 1] + ws[k] * (tb[k + 1] - t); }
        else if (t < tEnd) { const u = (t - tLand) / st; wob = wobA * Math.exp(-4.5 * u) * Math.sin(u * Math.PI * 5) * (1 - u); }
        const qq = tq.clone(); if (th) qq.multiply(new THREE.Quaternion().setFromAxisAngle(axis, th)); if (wob) qq.multiply(new THREE.Quaternion().setFromAxisAngle(wobAxis, wob));
        return qq;
      };
      const yContact = tb.map((t) => support + extY(quatAt(Math.min(t, tLand)), ts)); yContact[yContact.length - 1] = support + extY(tq, ts);
      return {
        t0, tStart, tLand, tEnd, hits: tb.map((t, k) => ({ t, gain: Math.pow(bounce, k) })),
        at(t) {
          if (t >= tEnd) return { pos: tp.clone(), quat: tq.clone(), scale: ts, visible: true, landed: true };
          const quat = quatAt(t), floor = support + extY(quat, ts); let pos, y;
          if (t < t0) { pos = at0(0); y = yContact[0] + Math.max(0, height - 0.5 * G * Math.max(0, t - tStart) ** 2); }   // free fall from rest: slow at the top, fastest at the touch
          else if (t < tLand) { let k = 0; while (t >= tb[k + 1]) k++; const u = (t - tb[k]) / Tb[k]; pos = at0(k).lerp(at0(k + 1), u); y = yContact[k] + (yContact[k + 1] - yContact[k]) * u + 0.5 * G * (t - tb[k]) * (tb[k + 1] - t); }
          else { pos = at0(Tb.length); y = floor; }
          pos.y = Math.max(y, floor);
          return { pos, quat, scale: ts, visible: t >= tStart, landed: false };
        },
      };
    },

    /**
     * heap(radius, height, centre, seed, {rz, grains, lumps}) -> Group: a big mound for huge counts (wide and medium shots).
     * Dune mesh with a rice-carpet colour + normal texture and a top layer of real grains (dense at the rim, strays on the floor around it).
     * radius = half size along x, rz = half size along z (default = radius). It rests on the plane y = centre.y. .heightAt(x, z) = world surface height.
     */
    heap(radius, height, centre, seed = 1, { rz = radius, grains = 4000, lumps = 0.34, res = 240 } = {}) {
      const R = rng(seed), grp = new THREE.Group(); grp.name = 'riceHeap'; grp.position.copy(centre);
      const edgeAt = (th) => 1 + 0.2 * (noise2(Math.cos(th) * 1.4 + 5, Math.sin(th) * 1.4 + 5, seed) - 0.5) + 0.09 * (noise2(Math.cos(th) * 4.5 + 9, Math.sin(th) * 4.5 + 9, seed + 1) - 0.5);
      const hAt = (x, z) => {
        const rho = Math.hypot(x / radius, z / rz) / edgeAt(Math.atan2(z / rz, x / radius)); if (rho >= 1) return -1;
        const gph = 0.7 * Math.pow(1 - rho, 1.2) + 0.3 * (1 - rho * rho) ** 2;
        return height * gph * (1 + lumps * (fbm(x * 16 + 3, z * 16 + 7, seed + 2, 3) - 0.5) * 2 * Math.min(1, (1 - rho) * 4)) + 0.0006 * Math.min(1, (1 - rho) * 30);
      };
      const X = radius * 1.14, Z = rz * 1.14, tile = 0.048, pos = [], uv = [], col = [], idx = [];
      for (let j = 0; j <= res; j++) for (let i = 0; i <= res; i++) {
        const x = -X + 2 * X * i / res, z = -Z + 2 * Z * j / res, h = hAt(x, z);
        pos.push(x, h < 0 ? -0.0015 : h, z); uv.push(x / tile, -z / tile);
        const s = 0.86 + 0.24 * fbm(x * 9 + 1, z * 9 + 2, seed + 5, 3); col.push(s, s, s);
      }
      for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { const a = j * (res + 1) + i, b = a + 1, c2 = a + res + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, rice.carpetMaterial()); mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh);
      // top layer of real grains
      const im = instanced(grains, 'lo'), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), nrm = new THREE.Vector3(), sc = new THREE.Vector3(), p = new THREE.Vector3(), used = new Set();
      let k = 0, guard = 0;
      while (k < grains && guard++ < grains * 6) {
        const rim = R() < 0.5, th = R() * 6.283, e = edgeAt(th), rho = rim ? 1 + R.gauss() * 0.05 + 0.01 : Math.sqrt(R()) * 0.98;
        const x = rho * e * radius * Math.cos(th), z = rho * e * rz * Math.sin(th), h = hAt(x, z), out = h < 0;
        if (out) { const key = Math.round(x / 0.0034) * 100003 + Math.round(z / 0.0034); if (used.has(key) || rho > 1.16) continue; used.add(key); }
        const d = 0.002, hx = Math.max(0, hAt(x + d, z)) - Math.max(0, hAt(x - d, z)), hz = Math.max(0, hAt(x, z + d)) - Math.max(0, hAt(x, z - d));
        nrm.set(-hx / (2 * d), 1, -hz / (2 * d)).normalize(); if (out) nrm.set(0, 1, 0);
        const sl = R() < 0.05 ? R.range(0.55, 0.75) : R.range(0.86, 1.1), sw = R.range(0.9, 1.08);
        q.setFromUnitVectors(yAxis, nrm).multiply(qa.setFromAxisAngle(yAxis, R() * 6.283));
        if (!out) q.multiply(qa.setFromAxisAngle(zAxis, R.range(-0.22, 0.22))).multiply(qa.setFromAxisAngle(xAxis, R.range(-0.3, 0.3)));
        p.set(x, out ? GRAIN.T * sw / 2 : h + GRAIN.T * 0.36, z).addScaledVector(nrm, 0);
        im.setMatrixAt(k, tmpM.compose(p, q, sc.set(sl, sw, sw))); im.setColorAt(k, ivory(R)); k++;
      }
      im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; grp.add(im);
      grp.mesh = mesh; grp.grains = im;
      grp.heightAt = (x, z) => grp.position.y + Math.max(0, hAt(x - grp.position.x, z - grp.position.z)) * grp.scale.y;
      return grp;
    },

    /**
     * flood({size, res, grains, cell, slope, ground, seed}) -> Group: a rice mass that can GROW, spill over the board edge and bury things.
     * Call .set(sources, opts) in frame(t); the shape is a pure function of what you pass.
     *   sources = [{x, z, p, s?, r0?, x1?, z1?}]: heaps with their top at height p (metres, board top = 0) and slope s (default 0.58 = 30 degrees,
     *   the angle of repose); x1/z1 make it a ridge from (x, z) to (x1, z1). The surface is the highest heap at every point (+ lumps); it shows
     *   wherever it is above the ground (ground(x, z): board top, lower table), so a tall heap runs over the frame and down onto the table by itself.
     *   opts: flow (a number that rises while the mass grows: the top grains slide downhill by flowLen metres per unit, sinking and resurfacing),
     *   focus (Vector3) + radius = the disc that gets REAL grains (put it where the camera looks; about 110 000 grains per m2), dense (1 = one layer, 2 = two),
     *   lumps, edge (metres of unevenness), view {x, z, size} = the square of world the surface mesh covers (default: centred, `size` wide).
     * .heightAt(x, z) = world y of the rice (or of the ground where there is none); .grains (InstancedMesh; .castShadow off by default), .detail('lo' | 'mid' | 'hi').
     */
    flood({ size = 1.6, res = 220, grains = 26000, cell = 0.003, slope = 0.58, ground = null, seed = 1 } = {}) {
      const grp = new THREE.Group(); grp.name = 'riceFlood';
      const N = res + 1, NV = N * N, pos = new Float32Array(NV * 3), nrm = new Float32Array(NV * 3), uv = new Float32Array(NV * 2), col = new Float32Array(NV * 3), idx = new Uint32Array(res * res * 6);
      for (let j = 0, o = 0; j < res; j++) for (let i = 0; i < res; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
      const geo = new THREE.BufferGeometry(), attr = (a, n) => { const b = new THREE.BufferAttribute(a, n); b.setUsage(THREE.DynamicDrawUsage); return b; };
      geo.setAttribute('position', attr(pos, 3)); geo.setAttribute('normal', attr(nrm, 3)); geo.setAttribute('uv', attr(uv, 2)); geo.setAttribute('color', attr(col, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const mesh = new THREE.Mesh(geo, rice.carpetMaterial()); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; grp.add(mesh);
      const im = instanced(grains, 'mid'); im.castShadow = false; im.count = 0; grp.add(im);
      im.setColorAt(0, new THREE.Color(1, 1, 1));
      const gnd = ground ?? ((x, z) => (Math.abs(x) < 0.25 && Math.abs(z) < 0.25 ? 0 : -0.029));
      const Y = new Float32Array(NV), GX = new Float32Array(NV), GZ = new Float32Array(NV), LUMP = new Float32Array(NV), EDGE = new Float32Array(NV), GND = new Float32Array(NV);
      const pal = []; { const R = rng(seed + 31); for (let i = 0; i < 64; i++) pal.push(ivory(R)); }
      const hsh = (i, j, k) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k + seed * 7, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
      let vx = NaN, vz = NaN, vs = NaN, x0 = 0, z0 = 0, hh = 1, src = [], sig = '';
      const setView = (cx, cz, sz) => {
        if (cx === vx && cz === vz && sz === vs) return false;
        vx = cx; vz = cz; vs = sz; x0 = cx - sz / 2; z0 = cz - sz / 2; hh = sz / res;
        for (let j = 0, v = 0; j < N; j++) for (let i = 0; i < N; i++, v++) {
          const x = x0 + i * hh, z = z0 + j * hh;
          pos[v * 3] = x; pos[v * 3 + 2] = z; uv[v * 2] = x / 0.048; uv[v * 2 + 1] = -z / 0.048;
          const s = 0.86 + 0.24 * fbm(x * 9 + 1, z * 9 + 2, seed + 5, 3); col[v * 3] = s; col[v * 3 + 1] = s; col[v * 3 + 2] = s;
          LUMP[v] = (fbm(x * 15 + 3, z * 15 + 7, seed + 2, 3) - 0.5) * 2; EDGE[v] = (fbm(x * 5 + 11, z * 5 + 4, seed + 9, 2) - 0.5) * 2; GND[v] = gnd(x, z);
        }
        geo.attributes.uv.needsUpdate = true; geo.attributes.color.needsUpdate = true;
        return true;
      };
      // one heap. s.rough (0..0.4, with s.seed) makes it a real poured heap: the slope changes with the direction (lobes and avalanche tongues that run out further),
      // it sags and steepens on the way down, and a ridge gets an uneven crest
      const one = (s, x, z) => {
        let dx = x - s.x, dz = z - s.z, qx = s.x, qz = s.z;
        if (s.x1 !== undefined) { const ex = s.x1 - s.x, ez = s.z1 - s.z, u = clamp((dx * ex + dz * ez) / (ex * ex + ez * ez || 1)); dx -= ex * u; dz -= ez * u; qx += ex * u; qz += ez * u; }
        const r0 = s.r0 ?? 0.007, d2 = dx * dx + dz * dz, rr = Math.sqrt(d2 + r0 * r0) - r0;
        let sl = s.s ?? slope, p = s.p;
        if (s.rough) {
          const d = Math.sqrt(d2) || 1e-9, ux = dx / d, uz = dz / d, sd = s.seed ?? 3, ax = qx * 9 + ux * 1.7, az = qz * 9 + uz * 1.7;
          const n1 = noise2(ax + 31, az + 17, sd) + 0.5 * noise2(qx * 21 + ux * 4.3 + 5, qz * 21 + uz * 4.3 + 9, sd + 1) - 0.75, n2 = noise2(ax + rr * 6, az - rr * 5, sd + 2) - 0.5;
          sl *= Math.max(0.4, 1 + s.rough * (1.33 * n1 + 0.6 * n2));
          if (s.x1 !== undefined && p > 0) p *= 1 + s.rough * 0.7 * (noise2(qx * 8 + 3, qz * 8 + 1, sd + 5) - 0.5);
          // slumps: low swells and hollows on the face (nothing at the crest), so a raking light has something to model
          p += s.rough * 0.26 * Math.min(rr, 0.25) * (noise2(x * 13 + 5, z * 13 + 9, sd + 7) + 0.5 * noise2(x * 29 + 2, z * 29 + 6, sd + 8) - 0.75);
        }
        return p - sl * rr;
      };
      const cone = (x, z) => { let y = -9; for (let k = 0; k < src.length; k++) { const v = one(src[k], x, z); if (v > y) y = v; } return y; };
      let Sx = 0, Sy = 0, Sgx = 0, Sgz = 0;
      const sample = (x, z) => {
        const fx = (x - x0) / hh, fz = (z - z0) / hh, i = Math.floor(fx), j = Math.floor(fz); if (i < 1 || j < 1 || i >= res - 1 || j >= res - 1) return false;
        const a = fx - i, b = fz - j, o = j * N + i, w00 = (1 - a) * (1 - b), w10 = a * (1 - b), w01 = (1 - a) * b, w11 = a * b;
        Sy = Y[o] * w00 + Y[o + 1] * w10 + Y[o + N] * w01 + Y[o + N + 1] * w11; Sgx = GX[o] * w00 + GX[o + 1] * w10 + GX[o + N] * w01 + GX[o + N + 1] * w11; Sgz = GZ[o] * w00 + GZ[o + 1] * w10 + GZ[o + N] * w01 + GZ[o + N + 1] * w11;
        return true;
      };
      grp.set = (sources, { flow = 0, flowLen = 0.03, focus = null, radius = 0.15, dense = 1, lumps = 0.004, edge = 0.004, view = null, strays = 0.1, scatter = null } = {}) => {
        src = sources.filter((s) => s.p > -0.05);
        const moved = setView(view?.x ?? 0, view?.z ?? 0, view?.size ?? size);
        let sg = `${lumps}|${edge}`; for (const s of src) sg += `|${s.x},${s.z},${s.p},${s.s ?? ''},${s.r0 ?? ''},${s.x1 ?? ''},${s.z1 ?? ''},${s.rough ?? ''},${s.seed ?? ''}`;
        if (moved || sg !== sig) {
          sig = sg;
          for (let j = 0, v = 0; j < N; j++) for (let i = 0; i < N; i++, v++) {
            const g = GND[v]; let y = cone(pos[v * 3], pos[v * 3 + 2]) + EDGE[v] * edge;
            y += LUMP[v] * lumps * clamp((y - g) / 0.012);
            Y[v] = y < g - 0.012 ? g - 0.012 : y;
          }
          for (let j = 0, v = 0; j < N; j++) for (let i = 0; i < N; i++, v++) {
            const gx = (Y[v + (i < res ? 1 : 0)] - Y[v - (i > 0 ? 1 : 0)]) / ((i > 0 && i < res ? 2 : 1) * hh), gz = (Y[v + (j < res ? N : 0)] - Y[v - (j > 0 ? N : 0)]) / ((j > 0 && j < res ? 2 : 1) * hh), l = 1 / Math.hypot(gx, gz, 1);
            GX[v] = gx; GZ[v] = gz; pos[v * 3 + 1] = Y[v]; nrm[v * 3] = -gx * l; nrm[v * 3 + 1] = l; nrm[v * 3 + 2] = -gz * l;
          }
          geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
        }
        // real grains on a world lattice inside the focus disc (the lattice does not move with the focus, so nothing swims)
        let k = 0; const M = im.instanceMatrix.array, C = im.instanceColor.array;
        if (focus && radius > 0) {
          for (let layer = 0; layer < dense; layer++) {
            const off = layer * 0.5, i0 = Math.floor((focus.x - radius) / cell), i1 = Math.ceil((focus.x + radius) / cell), j0 = Math.floor((focus.z - radius) / cell), j1 = Math.ceil((focus.z + radius) / cell);
            for (let j = j0; j <= j1 && k < grains; j++) for (let i = i0; i <= i1 && k < grains; i++) {
              const h1 = hsh(i, j, 1 + layer * 16), h2 = hsh(i, j, 2 + layer * 16);
              let x = (i + off + 0.15 + 0.7 * h1) * cell, z = (j + off + 0.15 + 0.7 * h2) * cell;
              const rr = Math.hypot(x - focus.x, z - focus.z) / radius; if (rr > 1 || (rr > 0.8 && hsh(i, j, 3) > (1 - rr) * 5)) continue;
              if (!sample(x, z)) continue;
              const h5 = hsh(i, j, 5 + layer * 16); let sink = 0;
              if (flow) {
                const f = h5 + flow - Math.floor(h5 + flow), gl = Math.hypot(Sgx, Sgz);
                if (gl > 0.05) { x -= Sgx / gl * flowLen * (f - 0.5); z -= Sgz / gl * flowLen * (f - 0.5); if (!sample(x, z)) continue; }
                const e = clamp(Math.min(f, 1 - f) / 0.16); sink = 1 - e * e * (3 - 2 * e);
              }
              const g = gnd(x, z), h4 = hsh(i, j, 4 + layer * 16), sl = h4 < 0.05 ? 0.6 + h4 * 3 : 0.86 + 0.24 * hsh(i, j, 6), sw = 0.9 + 0.18 * hsh(i, j, 7);
              let y, nx, ny, nz;
              if (Sy < g + 0.0005) { if (layer || h5 > strays || Sy < g - 0.012 * h4) continue; y = g + GRAIN.T * sw / 2; nx = 0; ny = 1; nz = 0; }
              else { const l = 1 / Math.hypot(Sgx, Sgz, 1); nx = -Sgx * l; ny = l; nz = -Sgz * l; y = Sy + GRAIN.T * (0.42 - sink * 1.6 - layer * 0.7); if (y < g + GRAIN.T * 0.3) y = g + GRAIN.T * 0.3 * sw; }
              // tangent frame: long axis t (random yaw, a little pitch), thickness n, width b
              const yaw = hsh(i, j, 8 + layer * 16) * 6.2831853, pit = (hsh(i, j, 9) - 0.5) * (ny === 1 ? 0 : 0.55);
              let ux = ny, uy = -nx, uz = 0; { const l = 1 / (Math.hypot(ux, uy) || 1); ux *= l; uy *= l; }                 // u = n x z
              const wx = ny * uz - nz * uy, wy = nz * ux - nx * uz, wz = nx * uy - ny * ux, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
              let tx = ux * cy + wx * sy, ty = uy * cy + wy * sy, tz = uz * cy + wz * sy;
              const t2x = tx * cp + nx * sp, t2y = ty * cp + ny * sp, t2z = tz * cp + nz * sp, n2x = nx * cp - tx * sp, n2y = ny * cp - ty * sp, n2z = nz * cp - tz * sp;
              const bx = t2y * n2z - t2z * n2y, by = t2z * n2x - t2x * n2z, bz = t2x * n2y - t2y * n2x, o = k * 16;
              M[o] = t2x * sl; M[o + 1] = t2y * sl; M[o + 2] = t2z * sl; M[o + 3] = 0; M[o + 4] = n2x * sw; M[o + 5] = n2y * sw; M[o + 6] = n2z * sw; M[o + 7] = 0;
              M[o + 8] = bx * sw; M[o + 9] = by * sw; M[o + 10] = bz * sw; M[o + 11] = 0; M[o + 12] = x; M[o + 13] = y; M[o + 14] = z; M[o + 15] = 1;
              const c = pal[(h4 * 4096 | 0) & 63]; C[k * 3] = c.r; C[k * 3 + 1] = c.g; C[k * 3 + 2] = c.b; k++;
            }
          }
        }
        // loose grains that rolled out past the edge of the mass, over the whole view (wide shots: the outline is never a clean line)
        if (scatter) {
          const st = scatter.step ?? 0.009, reach = scatter.reach ?? 0.035, dn = scatter.density ?? 0.6, i0 = Math.ceil(x0 / st), i1 = Math.floor((x0 + vs) / st), j0 = Math.ceil(z0 / st), j1 = Math.floor((z0 + vs) / st);
          for (let j = j0; j <= j1 && k < grains; j++) for (let i = i0; i <= i1 && k < grains; i++) {
            const x = (i + hsh(i, j, 41)) * st, z = (j + hsh(i, j, 42)) * st; if (!sample(x, z)) continue;
            const g = gnd(x, z); if (Sy > g + 0.003) continue;
            const out = (g - cone(x, z)) / slope; if (out < -0.004 || out > reach * 3.2) continue;
            if (hsh(i, j, 43) > dn * Math.exp(-Math.max(0, out) / reach)) continue;
            const h4 = hsh(i, j, 44), sl = 0.86 + 0.24 * hsh(i, j, 45), sw = 0.9 + 0.18 * hsh(i, j, 46), yaw = hsh(i, j, 47) * 6.2831853, cy = Math.cos(yaw), sy = Math.sin(yaw), o = k * 16;
            M[o] = cy * sl; M[o + 1] = 0; M[o + 2] = sy * sl; M[o + 3] = 0; M[o + 4] = 0; M[o + 5] = sw; M[o + 6] = 0; M[o + 7] = 0; M[o + 8] = -sy * sw; M[o + 9] = 0; M[o + 10] = cy * sw; M[o + 11] = 0;
            M[o + 12] = x; M[o + 13] = g + GRAIN.T * sw / 2; M[o + 14] = z; M[o + 15] = 1;
            const c = pal[(h4 * 4096 | 0) & 63]; C[k * 3] = c.r; C[k * 3 + 1] = c.g; C[k * 3 + 2] = c.b; k++;
          }
        }
        if (k) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
        im.count = k; im.visible = k > 0;
      };
      /** how far below its top a heap is at (x, z): the height the film must add to make the rice reach a level there (source without p) */
      grp.fallOf = (s, x, z) => -one({ ...s, p: 0 }, x, z);
      grp.heightAt = (x, z) => Math.max(gnd(x, z), src.length ? cone(x, z) : -9);
      grp.riceAt = (x, z) => (src.length ? cone(x, z) : -9);
      grp.detail = (d) => { im.geometry = d === 'hi' ? geoHi : d === 'lo' ? geoLo : geoMid; };
      grp.mesh = mesh; grp.grains = im;
      return grp;
    },

    /**
     * rain(n, {seed, detail}) -> InstancedMesh: grains pouring down in a stream. Call .set(t, {at, top, speed, tOn, tOff, heightAt}) in frame(t):
     * at(ts) -> {x, z, r} = where the stream is at time ts (a grain keeps the place it was let go from), top = y it falls from, speed m/s,
     * grains are let go between tOn and tOff, heightAt(x, z) = what they land on (flood.heightAt), density = share of the n grains in use (a thin stream needs few,
     * or it turns into a solid rod). They vanish at the surface.
     */
    rain(n = 1500, { seed = 1, detail = 'lo' } = {}) {
      const im = instanced(n, detail), R = rng(seed + 55), ph = new Float32Array(n), ox = new Float32Array(n), oz = new Float32Array(n), w = new Float32Array(n), ax = [];
      for (let i = 0; i < n; i++) { ph[i] = R(); ox[i] = R.gauss() * 0.5; oz[i] = R.gauss() * 0.5; w[i] = R.range(8, 30); ax.push(new THREE.Vector3(R.gauss(), R.gauss(), R.gauss()).normalize()); im.setColorAt(i, ivory(R)); }
      im.castShadow = false; im.visible = false;
      const q = new THREE.Quaternion(), p = new THREE.Vector3(), s0 = new THREE.Vector3(0, 0, 0);
      im.set = (t, { at, top = 0.4, speed = 2.2, tOn = -Infinity, tOff = Infinity, heightAt = null, floor = 0, streak = 2.4, density = 1 }) => {
        const T = (top - floor) / speed; let any = false;
        for (let i = 0; i < n; i++) {
          const c = t / T + ph[i], u = c - Math.floor(c), ts = t - u * T; let ok = i < n * density && ts >= tOn && ts <= tOff;
          if (ok) { const a = at(ts); p.set(a.x + ox[i] * a.r, top - u * (top - floor), a.z + oz[i] * (a.rz ?? a.r)); ok = p.y > (heightAt ? heightAt(p.x, p.z) : floor); }
          if (ok) { q.setFromAxisAngle(ax[i], w[i] * t + ph[i] * 6.283); const e = tmpM.makeRotationFromQuaternion(q).elements; e[1] *= streak; e[5] *= streak; e[9] *= streak; tmpM.setPosition(p); im.setMatrixAt(i, tmpM); any = true; }   // drawn out along the fall: a grain at speed is a streak, not a dot
          else im.setMatrixAt(i, tmpM.compose(p.set(0, -5, 0), q.identity(), s0));
        }
        im.instanceMatrix.needsUpdate = true; im.visible = any;
      };
      return im;
    },

    /**
     * pour(n, {seed, detail}) -> InstancedMesh: rice poured in a thin stream (slow-motion look). Call .set(t, opts) in frame(t), AFTER flood.set (it lands on the flood):
     *   at(ts, k) -> {x, z, r?, spread?} = where the stream is let go at time ts (k = grain number: `k % 3` gives three streams), top = the height it enters at (above the frame),
     *   v0 = speed there (m/s), g = gravity (9.81 / slow^2; 3.2 = 1.75x slow motion), rate = grains per second, r0 = radius at the top, spread = sideways speed (m/s: the
     *   stream widens as it falls), sway = metres the source wanders (the stream snakes), tOn / tOff, heightAt(x, z) = what it lands on (flood.heightAt), floor.
     *   Every grain is its own body: own speed, drift and tumble; it hits the surface, hops outward once or twice (bounce = restitution, kick = outward speed factor), skitters, and is taken up by the heap.
     * Real motion blur comes from the engine's shutter (use K.shutter 0.25-0.35 for a pour); grains are never stretched. n must be >= rate x (fall time + about 0.8 s).
     */
    pour(n = 2000, { seed = 1, detail = 'mid' } = {}) {
      const im = instanced(n, detail), R = rng(seed + 77), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), axis = new THREE.Vector3();
      const pal = []; for (let i = 0; i < 64; i++) pal.push(ivory(R));
      im.setColorAt(0, pal[0]); im.visible = false; im.count = 0;
      const H = (k, c) => { let h = Math.imul(k, 374761393) ^ Math.imul(c + seed * 13, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
      im.set = (t, { at, top = 0.4, v0 = 0.7, g = 3.2, rate = 200, r0 = 0.004, spread = 0.02, sway = 0.004, tOn = -Infinity, tOff = Infinity, heightAt = null, floor = -0.03, bounce = 0.3, kick = 1, skitter = 0.2, size = 1 }) => {
        const fallMax = (-v0 * 0.8 + Math.sqrt(v0 * v0 * 0.64 + 2 * g * (top - floor))) / g, life = fallMax + 0.9, kMax = Math.floor(t * rate), kMin = Math.max(Math.ceil((t - life) * rate), kMax - n + 1), hMax = Math.sqrt(2 * g * 0.028);
        let c = 0;
        for (let k = kMin; k <= kMax; k++) {
          const ts = (k + H(k, 1)) / rate; if (ts < tOn || ts > tOff || ts > t) continue;
          const tau = t - ts, a = at(ts, k), rk = a.r ?? r0;
          const sx = a.x + sway * (noise2(ts * 2.3, 0.5, seed + 3) - 0.5) * 2, sz = a.z + sway * (noise2(ts * 2.3 + 40, 7.5, seed + 4) - 0.5) * 2;
          const ph = H(k, 2) * 6.2831853, rad = Math.sqrt(H(k, 3)), vs = (a.spread ?? spread) * (0.2 + 0.8 * rad) * (0.5 + H(k, 4)), dph = ph + (H(k, 5) - 0.5) * 1.3, vx = Math.cos(dph) * vs, vz = Math.sin(dph) * vs;
          const x0 = sx + Math.cos(ph) * rad * rk, z0 = sz + Math.sin(ph) * rad * rk, vy = v0 * (0.8 + 0.4 * H(k, 6));
          let hS = heightAt ? heightAt(x0, z0) : floor, tl = (-vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, top - hS))) / g;
          if (heightAt) { hS = heightAt(x0 + vx * tl, z0 + vz * tl); tl = (-vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, top - hS))) / g; }
          const w = (5 + 15 * H(k, 7)) * Math.sqrt(g / 9.81) * 1.6;
          let x, y, z, ang, s = size * (H(k, 15) < 0.06 ? 0.7 : 0.9 + 0.2 * H(k, 16));
          if (tau < tl) { x = x0 + vx * tau; z = z0 + vz * tau; y = top - vy * tau - 0.5 * g * tau * tau; ang = w * tau; }
          else {
            // hit: one hop outward, a smaller one, then it skitters to a stop and the heap takes it
            const tb = tau - tl, vi = vy + g * tl, bph = ph + (H(k, 11) - 0.5) * 2.4, bs = (0.04 + 0.2 * H(k, 12) * H(k, 17)) * kick * Math.sqrt(g / 3.2);
            const vb = Math.min(vi * bounce * (0.35 + 0.65 * H(k, 13)), hMax), T1 = 2 * vb / g, T2 = 0.45 * T1, Ts = skitter * (0.5 + H(k, 14));
            let trav, hop = 0;
            if (tb < T1) { trav = bs * tb; hop = vb * tb - 0.5 * g * tb * tb; }
            else if (tb < T1 + T2) { const u = tb - T1; trav = bs * T1 + bs * 0.6 * u; hop = 0.45 * vb * u - 0.5 * g * u * u; }
            else { const u = (tb - T1 - T2) / Ts, uc = Math.min(1, u); trav = bs * T1 + bs * 0.6 * T2 + bs * 0.6 * Ts * (uc - 0.5 * uc * uc); const dead = (u - 1) * Ts / 0.14; if (dead >= 1) continue; if (dead > 0) s *= 1 - dead; }
            x = x0 + vx * tl + Math.cos(bph) * trav; z = z0 + vz * tl + Math.sin(bph) * trav;
            y = (heightAt ? heightAt(x, z) : floor) + GRAIN.T * 0.45 + Math.max(0, hop);
            ang = w * tl + w * 0.8 * Math.min(tb, T1 + T2 + Ts * 0.6);
          }
          axis.set(H(k, 8) - 0.5, H(k, 9) - 0.5, H(k, 10) - 0.5).normalize(); q.setFromAxisAngle(axis, ang + ph);
          const cc = pal[(H(k, 18) * 64) | 0], C = im.instanceColor.array; C[c * 3] = cc.r; C[c * 3 + 1] = cc.g; C[c * 3 + 2] = cc.b;
          im.setMatrixAt(c++, tmpM.compose(p.set(x, y, z), q, sc.setScalar(s)));
        }
        im.count = c; im.visible = c > 0; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      };
      return im;
    },

    /** rice-carpet material (tiling 48 mm): colour, shadowed gaps and a real normal map, all from a simulated layer of grains */
    carpetMaterial() {
      if (rice._carpet) return rice._carpet;
      const S = 1024, tile = 0.048, cell = tile / S, Hf = new Float32Array(S * S), id = new Uint16Array(S * S), R = rng(4242), tints = [null];
      const wrap = (i) => ((i % S) + S) % S;
      const n = Math.round(tile * tile / (GRAIN.L * GRAIN.W * 0.785) * 3.4);
      for (let gI = 1; gI <= n; gI++) {
        const sl = R.range(0.86, 1.1), sw = R.range(0.9, 1.08), L = GRAIN.L * sl, W = GRAIN.W * sw, T = GRAIN.T * sw, hl = Math.ceil(L / 2 / cell);
        let best = null;
        for (let a = 0; a < 3; a++) {
          const x = R() * S, z = R() * S, yaw = R() * Math.PI, dx = Math.cos(yaw), dz = Math.sin(yaw);
          let hA = 0, hB = 0, yc = 0;
          for (let s = -hl; s <= hl; s += 3) { const h = Hf[wrap(Math.round(z + dz * s)) * S + wrap(Math.round(x + dx * s))]; if (s < 0) hA = Math.max(hA, h); else hB = Math.max(hB, h); }
          const pitch = clamp(Math.atan2(hB - hA, 0.55 * L), -0.5, 0.5), sp = Math.sin(pitch);
          for (let s = -hl; s <= hl; s += 3) for (let w = -8; w <= 8; w += 8) {
            const e = (2 * s * cell / L) ** 2 + (2 * w * cell / W) ** 2; if (e > 1) continue;
            const need = Hf[wrap(Math.round(z + dz * s + dx * w)) * S + wrap(Math.round(x + dx * s - dz * w))] - s * cell * sp + T / 2 * Math.sqrt(1 - e); if (need > yc) yc = need;
          }
          if (!best || yc < best.yc) best = { x, z, dx, dz, sp, yc };
        }
        const { x, z, dx, dz, sp, yc } = best, c = ivory(R); tints.push([c.r, c.g, c.b]);
        for (let j = -hl; j <= hl; j++) for (let i = -hl; i <= hl; i++) {
          const s = (i * dx + j * dz) * cell, w = (-i * dz + j * dx) * cell, e = (2 * s / L) ** 2 + (2 * w / W) ** 2; if (e > 1) continue;
          const o = wrap(Math.round(z) + j) * S + wrap(Math.round(x) + i), top = yc + s * sp + T / 2 * Math.sqrt(1 - e);
          if (top > Hf[o]) { Hf[o] = top; id[o] = gI; }
        }
      }
      // gaps between grains get dark and warm: compare each texel with the blurred height around it
      const blur = (src, r) => { const tmp = new Float32Array(S * S), out = new Float32Array(S * S); for (let y = 0; y < S; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * S + wrap(x)]; for (let x = 0; x < S; x++) { tmp[y * S + x] = acc / (2 * r + 1); acc += src[y * S + wrap(x + r + 1)] - src[y * S + wrap(x - r)]; } } for (let x = 0; x < S; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[wrap(y) * S + x]; for (let y = 0; y < S; y++) { out[y * S + x] = acc / (2 * r + 1); acc += tmp[wrap(y + r + 1) * S + x] - tmp[wrap(y - r) * S + x]; } } return out; };
      const avg = blur(Hf, 22), cv = makeCanvas(S, S), cx = cv.getContext('2d'), img = cx.createImageData(S, S), d = img.data;
      const enc = (v) => Math.pow(clamp(v), 1 / 2.2) * 255;
      for (let o = 0; o < S * S; o++) {
        const t = tints[id[o]] ?? [0.8, 0.75, 0.65], ao = clamp(0.72 + (Hf[o] - avg[o]) / (GRAIN.T * 1.1));
        d[o * 4] = enc(t[0] * (0.2 + 0.8 * ao)); d[o * 4 + 1] = enc(t[1] * (0.16 + 0.84 * ao)); d[o * 4 + 2] = enc(t[2] * (0.11 + 0.89 * ao)); d[o * 4 + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = K.renderer.capabilities.getMaxAnisotropy(); return t; };
      rice._carpet = new THREE.MeshPhysicalMaterial({ map: mk(cv, true), normalMap: mk(normalCanvas(Hf, S, cell, 0.8), false), roughness: 0.5, sheen: 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color(1, 0.95, 0.86), specularIntensity: 0.6, vertexColors: true });
      rice._carpet.emissive.setRGB(0.014, 0.012, 0.009); rice._carpet.emissiveMap = rice._carpet.map;
      return rice._carpet;
    },
  };
  return rice;
}
