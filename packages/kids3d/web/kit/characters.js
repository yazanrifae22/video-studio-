// Tiko & Pip + farm friends, built from primitives (original designs; style bible docs/brands/kids/bible.md).
// Every builder returns a rig for core.Actor. Units: metres-ish; Tiko is ~1.7 tall. Characters face +z.
import * as THREE from 'three';
import { ball, capsule, cone, cyl, torus, eye, mouth, onSphere, pivot, group, mat, mesh, sphereGeo, Actor } from './core.js';
import { hash } from './anim.js';

export const COLORS = { tiko: '#FF7A45', tikoDark: '#E8622E', cream: '#FFE6D5', navy: '#24305E', pink: '#FF9E9E', pip: '#2EC4B6', pipLight: '#DDF8F4', beak: '#FFA62B' };

function place(obj, p, lookOut = null) { obj.position.set(...p); if (lookOut) obj.lookAt(lookOut[0], lookOut[1], lookOut[2]); return obj; }

/* ------------------------------------------------------------------ Tiko: round orange fox cub */
export function tikoRig() {
  const C = COLORS, root = new THREE.Group();
  const tilt = new THREE.Group(); root.add(tilt);           // head-is-body: whole ball tilts for pitch
  const BC = [0, 0.86, 0], R = 0.8, SC = [1, 1.0, 0.93];
  tilt.add(ball(C.tiko, R, BC, 'fur', SC, 56));
  tilt.add(ball(C.cream, 0.56, [0, 0.58, 0.34], 'fur', [1, 0.9, 0.62], 48));
  // face
  const eyes = [-1, 1].map((s) => { const e = eye(0.135, { iris: C.navy, skin: C.tiko }); place(e.g, onSphere(R, 14, s * 21, BC, SC)); e.g.lookAt(e.g.position.x * 2.2, e.g.position.y + 0.1, 4); e.g.position.z -= 0.035; tilt.add(e.g); return e; });
  tilt.add(ball(C.navy, 0.075, onSphere(R * 1.01, -1, 0, BC, SC), 'gloss', [1.25, 0.9, 0.9]));
  const m = mouth(0.1); place(m.g, onSphere(R * 1.012, -12, 0, BC, SC)); m.g.rotation.x = 0.25; tilt.add(m.g);
  [-1, 1].forEach((s) => { const c = ball(C.pink, 0.11, onSphere(R * 0.99, -8, s * 40, BC, SC), 'matte', [1.2, 0.75, 0.4]); c.lookAt(c.position.x * 3, c.position.y, 3); c.castShadow = false; tilt.add(c); });
  // ears
  const ears = [-1, 1].map((s) => {
    const pv = pivot(onSphere(R * 0.93, 58, s * 34, BC, SC));
    pv.add(cone(C.tiko, 0.21, 0.46, [0, 0.2, 0], 'fur', [0, 0, 0], 20));
    pv.add(cone(C.pink, 0.12, 0.28, [0, 0.17, 0.08], 'matte', [0.12, 0, 0], 16));
    pv.rotation.set(-0.12, 0, -s * 0.42); pv.traverse((o) => { o.castShadow = false; });
    tilt.add(pv); return pv;
  });
  // arms (pivot at shoulder)
  const arm = (s) => { const pv = pivot([s * 0.7, 0.98, 0.12]); pv.add(capsule(C.tikoDark, 0.13, 0.32, [s * 0.05, -0.26, 0], 'fur', [0, 0, s * 0.12])); return pv; };
  const armL = arm(1), armR = arm(-1); tilt.add(armL, armR);
  // feet
  const legs = [-1, 1].map((s) => { const pv = pivot([s * 0.33, 0.2, 0.12]); pv.add(ball(C.tikoDark, 0.2, [0, -0.1, 0.08], 'fur', [1.1, 0.6, 1.4])); root.add(pv); return pv; });
  // tail
  const tail = pivot([0.34, 0.42, -0.62]);
  tail.add(capsule(C.tiko, 0.16, 0.42, [0.06, 0.24, -0.12], 'fur', [-0.6, 0, -0.35]));
  tail.add(ball('#FFFFFF', 0.17, [0.17, 0.58, -0.32], 'fur', [1, 1.2, 1]));
  tilt.add(tail);
  return { root, tiltNode: tilt, headIsBody: true, eyes, mouth: m, armL, armR, legs, tail, ears };
}

/* ------------------------------------------------------------------ Pip: small teal bird */
export function pipRig() {
  const C = COLORS, root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
  const BC = [0, 0.52, 0], R = 0.42, SC = [1, 1.02, 0.95];
  tilt.add(ball(C.pip, R, BC, 'fur', SC, 48));
  tilt.add(ball(C.pipLight, 0.3, [0, 0.44, 0.2], 'fur', [1, 0.95, 0.6], 40));
  const eyes = [-1, 1].map((s) => { const e = eye(0.072, { iris: C.navy, skin: C.pip }); place(e.g, onSphere(R, 16, s * 26, BC, SC)); e.g.lookAt(e.g.position.x * 2.5, e.g.position.y + 0.05, 3); e.g.position.z -= 0.018; tilt.add(e.g); return e; });
  // beak: upper fixed, lower opens
  const bp = onSphere(R, -2, 0, BC, SC);
  const beakUp = cone(C.beak, 0.085, 0.2, [bp[0], bp[1] + 0.02, bp[2] + 0.07], 'gloss', [Math.PI / 2, 0, 0], 20); beakUp.scale.set(1.2, 1, 0.7);
  const beakLow = pivot([bp[0], bp[1] - 0.005, bp[2] - 0.0]);
  const bl = cone('#F28C1B', 0.06, 0.14, [0, -0.012, 0.075], 'gloss', [Math.PI / 2, 0, 0], 16); bl.scale.set(1.15, 1, 0.6); beakLow.add(bl);
  tilt.add(beakUp, beakLow);
  [-1, 1].forEach((s) => { const c = ball(C.pink, 0.055, onSphere(R * 0.99, -6, s * 42, BC, SC), 'matte', [1.2, 0.75, 0.4]); c.lookAt(c.position.x * 3, c.position.y, 3); c.castShadow = false; tilt.add(c); });
  // crest
  const crest = pivot([0, 0.93, 0.02]);
  crest.add(capsule(C.pip, 0.04, 0.12, [0, 0.06, 0], 'fur', [-0.25, 0, 0]));
  crest.add(capsule(C.pip, 0.035, 0.09, [0.05, 0.04, -0.02], 'fur', [-0.2, 0, -0.5]));
  tilt.add(crest);
  // wings (pivot at shoulder, flap = rotation.z)
  const wing = (s) => { const pv = pivot([s * 0.38, 0.6, 0]); pv.add(ball('#22A99D', 0.2, [s * 0.06, -0.12, -0.02], 'fur', [0.45, 1, 0.75])); return pv; };
  const wingL = wing(1), wingR = wing(-1); tilt.add(wingL, wingR);
  const legs = [-1, 1].map((s) => { const pv = pivot([s * 0.12, 0.16, 0.02]); pv.add(cyl(C.beak, 0.022, 0.022, 0.16, [0, -0.06, 0], 'matte')); pv.add(ball(C.beak, 0.06, [0, -0.14, 0.04], 'matte', [1, 0.4, 1.4])); root.add(pv); return pv; });
  const tail = pivot([0, 0.42, -0.36]); tail.add(cone('#22A99D', 0.1, 0.22, [0, 0, -0.08], 'fur', [-1.9, 0, 0])); tilt.add(tail);
  return { root, tiltNode: tilt, headIsBody: true, eyes, beakLow, wingL, wingR, legs, tail };
}

/* ------------------------------------------------------------------ farm friends (generic quadruped) */
/**
 * spec: { body, belly?, len, r, legH, legR, hoof, head:{r, color, y, z}, snout:{color, r, len}, ears:{kind:'flop'|'up', color, size},
 *         horns?, tail:{kind:'tuft'|'curl'|'long', color}, spots?: color, fluff?: color, mane?: color }
 */
export function quadRig(sp) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const y0 = sp.legH + sp.r * 0.8;
  if (sp.fluff) {
    for (let i = 0; i < 34; i++) {
      const a = hash(i * 1.3) * Math.PI * 2, b = (hash(i * 2.7) - 0.5) * 1.6, zz = (hash(i * 4.1) - 0.5) * sp.len * 1.15;
      body.add(ball(sp.fluff, sp.r * (0.42 + hash(i * 5.5) * 0.18), [Math.cos(a) * sp.r * 0.72, y0 + Math.sin(a) * sp.r * 0.7 * Math.cos(b * 0.5), zz], 'fur', [1, 1, 1], 20));
    }
    body.add(ball(sp.fluff, sp.r * 1.02, [0, y0, 0], 'fur', [1, 0.95, (sp.len / 2 + sp.r) / sp.r * 0.9]));
  } else {
    body.add(capsule(sp.body, sp.r, sp.len, [0, y0, 0], 'fur', [Math.PI / 2, 0, 0]));
    if (sp.belly) body.add(ball(sp.belly, sp.r * 0.8, [0, y0 - sp.r * 0.32, 0], 'fur', [0.95, 0.7, (sp.len / 2 + sp.r * 0.6) / (sp.r * 0.8)]));
  }
  if (sp.spots) for (let i = 0; i < 9; i++) {
    const a = (hash(i * 9.1) - 0.5) * 2.6 + (i % 2 ? Math.PI : 0) * 0.5, zz = (hash(i * 3.3) - 0.5) * sp.len * 1.1;
    const p = [Math.sin(a) * sp.r * 0.97, y0 + Math.cos(a) * sp.r * 0.97, zz];
    const s = ball(sp.spots, sp.r * (0.28 + hash(i * 7.7) * 0.18), p, 'fur', [1.3, 1, 1.5], 20); s.scale.multiply(new THREE.Vector3(1, 1, 1)); s.lookAt(p[0] * 3, (p[1] - y0) * 3 + y0, p[2]); s.scale.z *= 0.25; body.add(s);
  }
  // legs (pivot at hip)
  const lx = sp.r * 0.55, lz = sp.len * 0.42;
  const legs = [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]].map(([x, z]) => {
    const pv = pivot([x, sp.legH + 0.05, z]);
    pv.add(cyl(sp.leg ?? sp.body, sp.legR, sp.legR * 0.9, sp.legH, [0, -sp.legH / 2, 0], 'fur'));
    pv.add(cyl(sp.hoof ?? '#5A4032', sp.legR * 1.05, sp.legR * 1.1, sp.legR * 1.1, [0, -sp.legH + sp.legR * 0.5, 0], 'matte'));
    root.add(pv); return pv;
  });
  // head
  const H = sp.head, head = pivot([0, y0 + (H.y ?? sp.r * 0.6), sp.len / 2 + sp.r * 0.55 + (H.z ?? 0)]);
  body.add(head);
  head.add(ball(H.color ?? sp.body, H.r, [0, 0, 0], 'fur', H.scale ?? [1, 1, 1], 44));
  if (sp.mane) for (let i = 0; i < 6; i++) head.add(ball(sp.mane, H.r * 0.32, [0, H.r * 0.85 - i * 0.02, -H.r * 0.3 - i * H.r * 0.28], 'fur', [0.6, 1, 1]));
  if (sp.maneBody) for (let i = 0; i < 5; i++) body.add(ball(sp.mane, sp.r * 0.28, [0, y0 + sp.r * 0.9 + 0.05 - i * 0.03, sp.len / 2 + sp.r * 0.2 - i * sp.r * 0.35], 'fur', [0.55, 1, 1]));
  const eyes = [-1, 1].map((s) => { const e = eye(H.r * 0.2, { iris: COLORS.navy, skin: H.color ?? sp.body, sclera: '#FFFFFF' }); place(e.g, onSphere(H.r * 0.97, 22, s * 34)); e.g.lookAt(e.g.position.x * 2.2, e.g.position.y + 0.1, 3); e.g.position.multiplyScalar(0.96); head.add(e.g); return e; });
  // snout + jaw
  const S = sp.snout, sn = new THREE.Group(); sn.position.set(0, -H.r * 0.28, H.r * 0.72); head.add(sn);
  if (S.kind === 'disc') { sn.add(cyl(S.color, S.r, S.r, S.len, [0, 0, S.len / 2], 'fur', [Math.PI / 2, 0, 0], 32)); [-1, 1].forEach((s) => sn.add(ball('#B55A6A', S.r * 0.18, [s * S.r * 0.38, 0, S.len + 0.005], 'matte', [1, 1.3, 0.4]))); }
  else { sn.add(ball(S.color, S.r, [0, 0, S.len * 0.3], 'fur', [1.15, 0.85, 1])); [-1, 1].forEach((s) => sn.add(ball('#6A3B3B', S.r * 0.14, [s * S.r * 0.42, S.r * 0.15, S.len * 0.3 + S.r * 0.92], 'matte', [1, 1.3, 0.4]))); }
  const jaw = pivot([0, -S.r * 0.55, S.len * 0.15]);
  jaw.add(ball('#6B2A2A', S.r * 0.55, [0, S.r * 0.12, S.r * 0.32], 'matte', [1, 0.45, 0.7]));
  jaw.add(ball(S.jaw ?? S.color, S.r * 0.7, [0, -S.r * 0.28, S.r * 0.35], 'fur', [1.05, 0.45, 1]));
  sn.add(jaw);
  // ears
  const E = sp.ears, ears = [-1, 1].map((s) => {
    const pv = pivot([s * H.r * 0.78, H.r * 0.42, -H.r * 0.05]);
    if (E.kind === 'flop') { pv.add(ball(E.color, E.size, [s * E.size * 0.6, -E.size * 0.3, 0], 'fur', [1.2, 0.35, 0.75])); pv.rotation.z = s * -0.5; }
    else { pv.add(cone(E.color, E.size * 0.45, E.size * 1.3, [0, E.size * 0.55, 0], 'fur', [0, 0, 0], 18)); pv.rotation.z = -s * 0.5; }
    head.add(pv); return pv;
  });
  if (sp.horns) [-1, 1].forEach((s) => head.add(cone(sp.horns, H.r * 0.12, H.r * 0.42, [s * H.r * 0.42, H.r * 0.86, -H.r * 0.1], 'gloss', [0, 0, -s * 0.5], 16)));
  // tail
  const tail = pivot([0, y0 + sp.r * 0.4, -sp.len / 2 - sp.r * 0.85]);
  const T = sp.tail;
  if (T.kind === 'curl') tail.add(torus(T.color, 0.09, 0.03, Math.PI * 1.6, [0, 0.02, -0.06], 'fur', [0, Math.PI / 2, 0]));
  else if (T.kind === 'long') tail.add(capsule(T.color, sp.r * 0.16, sp.r * 1.1, [0, -sp.r * 0.45, -sp.r * 0.25], 'fur', [0.5, 0, 0]));
  else { tail.add(cyl(T.color, 0.025, 0.025, sp.r * 1.1, [0, -sp.r * 0.5, -0.05], 'fur', [0.2, 0, 0], 10)); tail.add(ball(T.tuft ?? T.color, 0.09, [0, -sp.r * 1.05, -0.14], 'fur', [1, 1.4, 1])); }
  body.add(tail);
  return { root, body, head, eyes, jaw, legs, tail, ears };
}

/* ------------------------------------------------------------------ horse: dedicated rig (arched neck that carries the head,
   long muzzle, two-part legs, flowing mane) — the generic quadruped read as a flat body with a floating head. */
export function horseRig() {
  const BODY = '#B9773F', DARK = '#A0622F', MANE = '#5A3420', MUZ = '#E8C49A', HOOF = '#3D2A1E';
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legH = 0.95, r = 0.5, len = 1.05, y0 = legH + r * 0.72;
  body.add(capsule(BODY, r, len, [0, y0, 0], 'fur', [Math.PI / 2, 0, 0]));
  body.add(ball('#C98A52', r * 0.82, [0, y0 - r * 0.3, 0.05], 'fur', [0.92, 0.66, (len / 2 + r * 0.6) / (r * 0.82)]));
  body.add(ball(BODY, r * 1.0, [0, y0 + 0.04, -len * 0.42], 'fur', [1.02, 1.0, 1.0]));          // rump
  body.add(ball(BODY, r * 0.98, [0, y0 + 0.06, len * 0.42], 'fur', [1.0, 1.04, 1.0]));         // chest
  // neck: a thick capsule rising forward from the chest; the head pivot sits at its top, so the head always stays attached
  const neck = pivot([0, y0 + 0.28, len / 2 + 0.12]); body.add(neck); neck.rotation.x = 0.55;
  neck.add(capsule(BODY, 0.27, 0.62, [0, 0.42, 0], 'fur'));
  neck.add(ball(BODY, 0.3, [0, 0.02, 0], 'fur', [1, 1, 1.1]));
  for (let i = 0; i < 7; i++) neck.add(ball(MANE, 0.12 - i * 0.004, [0, 0.05 + i * 0.13, -0.2], 'fur', [0.55, 1.15, 1]));
  const head = pivot([0, 0.86, 0.02]); neck.add(head);
  const hg = new THREE.Group(); hg.rotation.x = -0.55 + 0.75; head.add(hg);   // undo the neck tilt, then point the face forward-down
  hg.add(ball(BODY, 0.29, [0, 0.06, 0], 'fur', [0.9, 0.95, 1.05], 44));
  hg.add(capsule(BODY, 0.2, 0.32, [0, -0.06, 0.3], 'fur', [Math.PI / 2 + 0.25, 0, 0]));
  const muzzle = ball(MUZ, 0.22, [0, -0.15, 0.55], 'fur', [0.95, 0.85, 0.95], 36); hg.add(muzzle);
  [-1, 1].forEach((s2) => hg.add(ball('#6A3B3B', 0.035, [s2 * 0.09, -0.1, 0.75], 'matte', [1, 1.4, 0.5])));
  hg.add(ball(MANE, 0.1, [0, 0.33, 0.12], 'fur', [1.1, 0.7, 1.2]));                                   // forelock
  const eyes = [-1, 1].map((s2) => { const e = eye(0.075, { iris: COLORS.navy, skin: BODY, sclera: '#FFFFFF' }); place(e.g, [s2 * 0.2, 0.12, 0.14]); e.g.lookAt(s2 * 1.2, 0.3, 1.6); hg.add(e.g); return e; });
  const ears = [-1, 1].map((s2) => { const pv = pivot([s2 * 0.13, 0.3, -0.02]); pv.add(cone(DARK, 0.065, 0.22, [0, 0.1, 0], 'fur', [0, 0, 0], 16)); pv.add(cone('#F2C7A8', 0.035, 0.14, [0, 0.08, 0.025], 'matte', [0.1, 0, 0], 12)); pv.rotation.z = -s2 * 0.25; hg.add(pv); return pv; });
  const jaw = pivot([0, -0.25, 0.42]); jaw.add(ball('#6B2A2A', 0.1, [0, 0.03, 0.12], 'matte', [1, 0.4, 0.8])); jaw.add(ball(MUZ, 0.15, [0, -0.03, 0.12], 'fur', [1, 0.45, 1.1])); hg.add(jaw);
  // legs: hip pivot, thigh + cannon + hoof (front legs straighter, hind legs with a hock angle)
  const legs = [[-0.27, len * 0.45, 1], [0.27, len * 0.45, 1], [-0.27, -len * 0.45, 0], [0.27, -len * 0.45, 0]].map(([x, z, front]) => {
    const pv = pivot([x, legH + 0.12, z]);
    pv.add(capsule(BODY, 0.16, 0.32, [0, -0.2, front ? 0 : -0.04], 'fur'));
    pv.add(cyl(BODY, 0.09, 0.08, legH * 0.62, [0, -legH * 0.62, front ? 0.02 : 0.03], 'fur'));
    pv.add(cyl(MUZ, 0.095, 0.1, 0.1, [0, -legH + 0.12, 0.03], 'fur'));
    pv.add(cyl(HOOF, 0.1, 0.115, 0.12, [0, -legH + 0.02, 0.03], 'matte'));
    root.add(pv); return pv;
  });
  // tail: long flowing mane-coloured tail
  const tail = pivot([0, y0 + r * 0.55, -len / 2 - r * 0.85]);
  tail.add(capsule(MANE, 0.1, 0.55, [0, -0.3, -0.12], 'fur', [0.35, 0, 0])); tail.add(ball(MANE, 0.14, [0, -0.66, -0.22], 'fur', [1, 1.5, 1]));
  body.add(tail);
  return { root, body, head, eyes, jaw, legs, tail, ears, trotRock: true };
}

/* ------------------------------------------------------------------ farm birds (duck, hen) */
export function birdRig(sp) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const R = sp.r, y0 = sp.legH + R * 0.85;
  body.add(ball(sp.body, R, [0, y0, 0], 'fur', [0.9, 0.85, 1.2], 44));
  body.add(cone(sp.body, R * 0.45, R * 0.7, [0, y0 + R * 0.3, -R * 1.15], 'fur', [-2.2, 0, 0], 16)); // tail flick
  const head = pivot([0, y0 + R * 0.95, R * 0.75]); body.add(head);
  head.add(ball(sp.head ?? sp.body, R * 0.55, [0, 0, 0], 'fur', [1, 1, 1], 40));
  const eyes = [-1, 1].map((s) => { const e = eye(R * 0.13, { iris: COLORS.navy, skin: sp.head ?? sp.body, sclera: '#FFFFFF' }); place(e.g, onSphere(R * 0.53, 18, s * 38)); e.g.lookAt(e.g.position.x * 2.2, e.g.position.y + 0.05, 3); head.add(e.g); return e; });
  const bk = sp.beak;
  let beakLow;
  if (bk.kind === 'bill') {
    head.add(ball(bk.color, R * 0.3, [0, -R * 0.08, R * 0.55], 'gloss', [1.15, 0.32, 1.25], 28));
    beakLow = pivot([0, -R * 0.14, R * 0.42]); beakLow.add(ball(bk.color2 ?? bk.color, R * 0.26, [0, -R * 0.03, R * 0.14], 'gloss', [1.05, 0.26, 1.2], 24)); head.add(beakLow);
  } else {
    head.add(cone(bk.color, R * 0.12, R * 0.26, [0, -R * 0.02, R * 0.6], 'gloss', [Math.PI / 2, 0, 0], 16));
    beakLow = pivot([0, -R * 0.08, R * 0.5]); beakLow.add(cone(bk.color2 ?? bk.color, R * 0.08, R * 0.16, [0, -R * 0.01, R * 0.08], 'gloss', [Math.PI / 2, 0, 0], 12)); head.add(beakLow);
  }
  if (sp.comb) { for (let i = 0; i < 3; i++) head.add(ball(sp.comb, R * 0.13, [0, R * 0.55 + (i === 1 ? 0.03 : 0), R * (0.15 - i * 0.15)], 'fur', [0.6, 1, 1])); head.add(ball(sp.comb, R * 0.09, [0, -R * 0.3, R * 0.48], 'fur', [0.7, 1.3, 0.7])); }
  const wing = (s) => { const pv = pivot([s * R * 0.82, y0 + R * 0.15, 0]); pv.add(ball(sp.wing ?? sp.body, R * 0.5, [s * R * 0.08, -R * 0.2, -R * 0.1], 'fur', [0.35, 0.75, 1.15])); body.add(pv); return pv; };
  const wingL = wing(1), wingR = wing(-1);
  const legs = [-1, 1].map((s) => { const pv = pivot([s * R * 0.35, sp.legH + 0.02, 0.05]); pv.add(cyl(sp.feet, 0.025, 0.025, sp.legH, [0, -sp.legH / 2, 0], 'matte')); pv.add(ball(sp.feet, R * 0.2, [0, -sp.legH, R * 0.12], 'matte', [1.1, 0.25, 1.4])); root.add(pv); return pv; });
  return { root, body, head, eyes, beakLow, wingL, wingR, legs };
}

/* ------------------------------------------------------------------ presets */
export const ANIMALS = {
  cow: () => quadRig({ body: '#FFFFFF', belly: '#FBEFEF', spots: '#2B2B33', len: 1.25, r: 0.62, legH: 0.55, legR: 0.13, hoof: '#4A3A35', leg: '#FFFFFF',
    head: { r: 0.48, color: '#FFFFFF', y: 0.55, z: 0.05 }, snout: { color: '#FFB3C1', r: 0.3, len: 0.25 }, ears: { kind: 'flop', color: '#F2D7D7', size: 0.2 }, horns: '#F4E3B5', tail: { kind: 'tuft', color: '#FFFFFF', tuft: '#2B2B33' } }),
  pig: () => quadRig({ body: '#FFB3C7', belly: '#FFC9D6', len: 0.75, r: 0.55, legH: 0.3, legR: 0.11, hoof: '#C77B8E', leg: '#FFB3C7',
    head: { r: 0.45, color: '#FFB3C7', y: 0.25, z: -0.12 }, snout: { kind: 'disc', color: '#FF94AE', r: 0.19, len: 0.16 }, ears: { kind: 'up', color: '#FF9BB4', size: 0.2 }, tail: { kind: 'curl', color: '#FF9BB4' } }),
  sheep: () => quadRig({ body: '#FFFFFF', fluff: '#FAF7F0', len: 0.7, r: 0.6, legH: 0.38, legR: 0.08, hoof: '#3A3A42', leg: '#4B4B55',
    head: { r: 0.36, color: '#4B4B55', y: 0.5, z: 0.0, scale: [0.95, 1.05, 1.1] }, snout: { color: '#5A5A66', r: 0.2, len: 0.2, jaw: '#5A5A66' }, ears: { kind: 'flop', color: '#4B4B55', size: 0.16 }, tail: { kind: 'tuft', color: '#FAF7F0' } }),
  horse: () => horseRig(),
  duck: () => birdRig({ body: '#FFFFFF', head: '#FFFFFF', wing: '#F1F3F6', r: 0.42, legH: 0.18, feet: '#FF9F1C', beak: { kind: 'bill', color: '#FFA62B', color2: '#F28C1B' } }),
  hen: () => birdRig({ body: '#C8743A', head: '#D98545', wing: '#A85E2C', r: 0.4, legH: 0.22, feet: '#F2B33D', comb: '#E5383B', beak: { kind: 'cone', color: '#F2B33D', color2: '#E0A02F' } }),
};

export function makeActor(scene, name, kind, opts = {}) {
  const rig = kind === 'tiko' ? tikoRig() : kind === 'pip' ? pipRig() : ANIMALS[kind]();
  scene.add(rig.root);
  return new Actor(name, rig, { gait: ['horse', 'cow'].includes(kind) ? 'trot' : ['duck', 'hen', 'pig', 'sheep'].includes(kind) ? 'waddle' : 'hop', ...opts });
}
