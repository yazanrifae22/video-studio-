// dev: framing check of the HOST look on the real score (fix round 1; round 2 adds: both heads sliced by the top, subject out of the depth of field = "dof"). For every shot at u = 0.15, 0.5, 0.9 the real camera projects:
//  - object shots (player pair tower tally demo row top block coin): the Subject's box must span >= 60 % of the frame width OR >= 60 % of
//    the usable height (6 % .. 72 %), inside the frame (tilt / pan / drop moves may start outside);
//  - people shots (wide high low): the board spans >= 55 % of the frame width; the storyteller's head is not cut by the top
//    (except the hook / end text windows, where it may sit above the frame);
//  - every objection (show.beats 'objection', + l64a) and every 'skeptic' shot: the Skeptic's head AND her raised hand are in frame.
// npx tsx packages/test3d/web/parable/dev-host/framing.ts [--version 2] [--from t] [--to t] [--all] [--json out.json]
import path from 'node:path';
import fs from 'node:fs';
import { open } from '../../../src/capture.ts';
const argv = process.argv.slice(2), opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.resolve(path.join(ep, `v${opt('version') ?? 2}/score.json`)), { width: 1920, height: 1080, sub: 1 });
try {
  s.page.on('console', (m) => { if (m.type() === 'error') console.log(`[page ${m.type()}] ${m.text().slice(0, 300)}`); });
  const rows = await s.page.evaluate(`(() => {
    const T = K.THREE, show = K.show, view = K.view, cam = K.camera, cast = view.cast, out = [];
    const from = ${Number(opt('from') ?? 0)}, to = ${Number(opt('to') ?? 1e9)};
    const OBJ = new Set(['player', 'pair', 'tower', 'tally', 'demo', 'row', 'top', 'block', 'coin']);
    const objs = show.beats.filter((b) => b.type === 'objection').map((b) => [b.t0 - 0.1, Math.max(b.t1 ?? 0, b.t0 + 2.4)]);
    const l64a = (show.lines ?? []).find((l) => l.id === 'l64a'); if (l64a) objs.push([l64a.t0, l64a.t1]);
    const lines = K.score.lines, endT = lines[lines.length - 1].t0 - 0.25;
    const proj = (pts) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const p = new T.Vector3(); for (const q of pts) { p.copy(q).project(cam); if (p.z > 1) continue; const x = 0.5 + 0.5 * p.x, y = 0.5 - 0.5 * p.y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
    const corners = (b) => { const o = []; for (let i = 0; i < 8; i++) o.push(new T.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); return o; };
    const sph = (c, r) => [c.clone().add(new T.Vector3(r, 0, 0)), c.clone().add(new T.Vector3(-r, 0, 0)), c.clone().add(new T.Vector3(0, r, 0)), c.clone().add(new T.Vector3(0, -r, 0))];
    const inF = (b, m = 0.0) => b[0] >= -m && b[2] <= 1 + m && b[1] >= -m && b[3] <= 1 + m;
    for (const sh of show.shots) {
      if (sh.t1 < from || sh.t0 > to) continue;
      for (const u of [0.15, 0.5, 0.9]) {
        const t = sh.t0 + u * (sh.t1 - sh.t0), st = show.state(t);
        view.draw(st, t); cam.fov = K.lens.fov; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        const kind = st.shot.kind, move = st.shot.move ?? 'hold', issues = [];
        let w = null, h = null, box = null, play = null;
        const head = cast.teller.toWorld ? cast.teller.marks.top : null;
        const hb = proj(sph(cast.teller.marks.eyes, 0.095)), skb = proj(sph(cast.skeptic.toWorld(cast.skeptic.marks.eyes), 0.1));
        const skHand = proj([cast.skeptic.toWorld(cast.skeptic.point('L', 'tip'))]);
        const txt = t < 3.2 || t >= endT;
        if (OBJ.has(kind)) {
          const b = view.objects.bounds(st.shot.subject ?? { board: true }, st).box; box = proj(corners(b));
          w = Math.min(box[2], 1) - Math.max(box[0], 0); h = (Math.min(box[3], 0.72) - Math.max(box[1], 0.06)) / 0.66;
          if (!(w >= 0.6 || h >= 0.6)) issues.push('small');
          if (!inF(box, 0.01) && !['tilt', 'pan', 'drop'].includes(move)) issues.push('outside');
        } else {
          // w = the whole board (wooden frame included, what a viewer calls "the board"); play = the 64 squares only (reported)
          const o = view.objects.board?.outer ?? 0.25, b = view.objects.bounds({ board: true }, st).box; box = proj(corners({ min: { x: -o, y: 0, z: -o }, max: { x: o, y: 0, z: o } }));
          const pb = proj(corners({ min: { x: b.min.x, y: 0, z: b.min.z }, max: { x: b.max.x, y: 0, z: b.max.z } })); play = +(Math.min(pb[2], 1) - Math.max(pb[0], 0)).toFixed(2);
          w = Math.min(box[2], 1) - Math.max(box[0], 0); h = (Math.min(box[3], 0.72) - Math.max(box[1], 0.06)) / 0.66;
          if (['wide', 'high', 'low'].includes(kind) && w < 0.55) issues.push('board<55%');
        }
        // a head sliced by the frame top (crown outside, chin inside): either puppet; the hook / end text windows excepted
        const slice = (pup, world) => { const w = (v) => (world ? pup.toWorld(v) : v.clone()); const a = proj([w(pup.marks.top)]), c = proj([w(pup.marks.chin)]), e = proj([w(pup.marks.eyes)]); return a[1] < -0.005 && c[1] > 0.015 && e[0] > 0.02 && e[0] < 0.98; };
        if (!txt && slice(cast.teller, false)) issues.push('head-cut');
        if (!txt && cast.skeptic.root.visible !== false && slice(cast.skeptic, true)) issues.push('sk-head-cut');
        // depth of field: blur diameter (fraction of the frame height) of the subject's nearest and farthest points
        let blur = null;
        if (OBJ.has(kind)) {
          const L = K.lens, th = Math.tan(L.fov * Math.PI / 360), A = (L.sensor ?? 0.02025) / 2 / th / (2 * Math.max(0.5, L.fstop)), s = L.focus;
          const bb = view.objects.bounds(st.shot.subject ?? { board: true }, st), P = (bb.pts && bb.pts.length ? bb.pts : corners(bb.box));
          const m = cam.matrixWorldInverse; let worst = 0; for (const q of P) { const d = -q.clone().applyMatrix4(m).z; if (d <= 0.01) continue; const p = q.clone().project(cam); if (p.x < -1.05 || p.x > 1.05 || p.y < -1.05 || p.y > 1.05) continue; worst = Math.max(worst, A * Math.abs(1 / d - 1 / s) / th); }
          blur = +worst.toFixed(4); if (worst > 0.0045) issues.push('dof');
        }
        const inObj = objs.some(([a, b]) => t >= a && t <= b);
        if (inObj || kind === 'skeptic') { if (!inF(skb, 0.02)) issues.push('skeptic-out'); else if (!inF(skHand, 0)) issues.push('sk-hand-out'); }
        out.push({ id: sh.id, line: st.line, kind, move, t: +t.toFixed(2), u, w: +w.toFixed(2), play, h: +h.toFixed(2), box: box.map((v) => +v.toFixed(2)), head: hb.map((v) => +v.toFixed(2)), sk: skb.map((v) => +v.toFixed(2)), obj: inObj, blur, issues });
      }
    }
    return out;
  })()`) as any[];
  const bad = rows.filter((r) => r.issues.length);
  const fmt = (r: any) => `${String(r.line).padEnd(5)} ${String(r.id).padEnd(6)} ${r.kind.padEnd(7)} ${r.move.padEnd(6)} t=${r.t} u=${r.u} w=${r.w}${r.play != null ? `(sq ${r.play})` : ""} h=${r.h} box=${r.box.join(',')}${r.blur != null ? ` blur=${r.blur}` : ''} ${r.issues.join(' ')}`;
  for (const r of argv.includes('--all') ? rows : bad) console.log(fmt(r));
  if (opt('json')) fs.writeFileSync(opt('json')!, JSON.stringify(rows, null, 0));
  const shots = new Set(rows.map((r) => r.id)), badShots = new Set(bad.map((r) => r.id));
  const by: Record<string, number> = {}; for (const r of bad) for (const i of r.issues) by[i] = (by[i] ?? 0) + 1;
  console.log(`samples ${rows.length}, violations ${bad.length} ${JSON.stringify(by)}; shots ${shots.size}, shots with a violation ${badShots.size}`);
} finally { await s.close(); }
