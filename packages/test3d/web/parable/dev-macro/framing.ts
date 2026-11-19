// dev: framing check of the Macro look on the real score. For every shot, at 3 times (u = 0.15, 0.5, 0.9), the shot Subject's
// bounds are projected with the real camera. Rule (fix round 1): the Subject's screen box spans >= 60 % of the frame width OR
// >= 60 % of the usable height (6 % .. 72 %), and sits inside the frame (tilts excepted).
// npx tsx packages/test3d/web/parable/dev-macro/framing.ts [--score productions/expl-261115-c2fy/v2/score.json] [--from t] [--to t] [--all]
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const argv = process.argv.slice(2), opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const ep = path.resolve('productions/expl-261115-c2fy');
const s = await open(ep, path.resolve(opt('score') ?? path.join(ep, 'v2/score.json')), { width: 1920, height: 1080, sub: 1 });
try {
  const rows = await s.page.evaluate(`(() => {
    const T = K.THREE, show = K.show, view = K.view, cam = K.camera, out = [];
    const from = ${Number(opt('from') ?? 0)}, to = ${Number(opt('to') ?? 1e9)};
    for (const sh of show.shots) {
      if (sh.t1 < from || sh.t0 > to) continue;
      for (const u of [0.15, 0.5, 0.9]) {
        const t = sh.t0 + u * (sh.t1 - sh.t0), st = show.state(t);
        view.draw(st, t); cam.fov = K.lens.fov; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        const measure = (sub) => {
          const o = view.objects.bounds(sub, st), p = new T.Vector3();
          let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, behind = false;
          for (const q of (sub.board ? o.pts.filter((q) => q.foot) : o.pts)) { p.copy(q).applyMatrix4(cam.matrixWorldInverse); if (p.z > -0.005) { behind = true; continue; } p.copy(q).project(cam); const x = 0.5 + 0.5 * p.x, y = 0.5 - 0.5 * p.y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
          const w = Math.min(x1, 1) - Math.max(x0, 0), h = (Math.min(y1, 0.72) - Math.max(y0, 0.06)) / 0.66;
          const inside = !behind && x0 > -0.01 && x1 < 1.01 && y0 > -0.01 && y1 < 1.01;
          const board = !!sub.board;
          const ok = (board ? w >= 0.65 : (w >= 0.6 || h >= 0.6)) && (inside || st.shot.move === 'tilt');
          return { w, h, x0, y0, x1, y1, inside, ok, behind };
        };
        const sh2 = st.shot, A = measure(sh2.kind === 'skeptic' ? { skeptic: true } : sh2.subject), B = sh2.to ? measure(sh2.to) : null;
        const pick = !B ? A : u < 0.3 ? A : u > 0.7 ? B : (B.ok ? B : A);
        const { w, h, x0, y0, x1, y1, inside, ok, behind } = pick;
        out.push({ id: sh.id, line: st.line, kind: sh.kind, move: sh.move, t: +t.toFixed(2), u, w: +w.toFixed(2), h: +h.toFixed(2), box: [x0, y0, x1, y1].map((v) => +v.toFixed(2)), inside, ok, behind, which: pick === A ? 'sub' : 'to' });
      }
    }
    return out;
  })()`) as any[];
  const bad = rows.filter((r) => !r.ok);
  if (argv.includes('--all')) for (const r of rows) console.log(JSON.stringify(r));
  else for (const r of bad) console.log(`${r.line.padEnd(5)} ${String(r.id).padEnd(6)} ${r.kind.padEnd(7)} ${r.move.padEnd(6)} t=${r.t} u=${r.u} w=${r.w} h=${r.h} box=${r.box.join(',')}${r.inside ? '' : ' OUTSIDE'}${r.behind ? ' BEHIND' : ''} [${r.which}]`);
  const shots = new Set(rows.map((r) => r.id)), badShots = new Set(bad.map((r) => r.id));
  console.log(`samples ${rows.length}, violations ${bad.length}; shots ${shots.size}, shots with a violation ${badShots.size}`);
} finally { await s.close(); }
