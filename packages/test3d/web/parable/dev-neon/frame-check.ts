// dev: NEON framing check on the real score. For every shot at 3 times (u = 0.1, 0.5, 0.9) it draws the state with the real camera,
// projects the shot's Subject bounds (the `to` subject at the end of pan / tilt / drop / rack moves) and lists the violations of the rule:
//   the Subject box spans >= 60 % of the frame width OR >= 60 % of the usable height (6-72 %), and lies inside the frame and above the
//   subtitle band (bottom <= 74 %); whole-board shots (subject.board) need >= 65 % of the width.
// npx tsx packages/test3d/web/parable/dev-neon/frame-check.ts [--version 2] [--from 0 --to 700] [--json out.json]
import path from 'node:path';
import fs from 'node:fs';
import { open } from '../../../src/capture.ts';
const argv = process.argv.slice(2), opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ep = path.resolve('productions/expl-261115-1yab'), ver = opt('version', '2');
const score = path.join(ep, ver === 'draft' ? 'draft' : `v${ver}`, 'score.json');
const film = JSON.parse(fs.readFileSync(path.join(ep, 'film.json'), 'utf8'));
const extra = Object.entries(film.engine ?? {}).map(([k, v]) => `&${k}=${v}`).join('');
const s = await open(ep, score, { width: 1920, height: 1080, sub: 1, extra });
try {
  s.page.on('console', (m) => { if (m.type() === 'error') console.log(`[page] ${m.text().slice(0, 300)}`); });
  const res = await s.page.evaluate(`(async () => {
    const { makeShow } = await import('/kit/parable/show.js');
    const show = makeShow(K.score), V = window.NEON_VIEW, out = [], from = ${Number(opt('from', '0'))}, to = ${Number(opt('to', '1e9'))};
    const shots = show.shots ?? [];
    for (const sh of shots) {
      if (sh.t1 < from || sh.t0 > to) continue;
      for (const u of [0.1, 0.5, 0.9]) {
        const t = sh.t0 + u * (sh.t1 - sh.t0), st = show.state(t);
        V.draw(st, t); K.camera.updateMatrixWorld(true);
        const shot = st.shot ?? {}, end = u > 0.5 && shot.to && ['pan', 'tilt', 'drop', 'rack', 'crane'].includes(shot.move);
        const sub = end ? shot.to : shot.subject ?? { board: true };
        const pts = V.objects.bounds(sub, st, [], 0.2);
        if (!pts.length) { out.push({ shot: shot.id, kind: shot.kind, move: shot.move, line: st.line, t: +t.toFixed(2), u, empty: true }); continue; }
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
        for (const p of pts) { const q = p.clone().project(K.camera); const x = (q.x + 1) / 2, y = (1 - q.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const w = x1 - x0, h = (Math.min(y1, 0.72) - Math.max(y0, 0.06)) / 0.66, why = [];
        const hook = !!(st.title && st.title.opacity > 0.001);
        // whole-board shots: the board itself >= 65 % of the width, unless tall towers already fill >= 90 % of the usable height
        let bw = w, hb = 0;
        if (sub.board && !(st.layout && st.layout.kind === 'row' && st.layout.u > 0.5)) { let a = 9, b = -9; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const q = new K.THREE.Vector3(sx * 0.22, 0, sz * 0.22).project(K.camera); a = Math.min(a, (q.x + 1) / 2); b = Math.max(b, (q.x + 1) / 2); } bw = Math.min(b, 1) - Math.max(a, 0); let c0 = 9, c1 = -9; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const q = new K.THREE.Vector3(sx * 0.22, 0, sz * 0.22).project(K.camera); c0 = Math.min(c0, (1 - q.y) / 2); c1 = Math.max(c1, (1 - q.y) / 2); } hb = (c1 - c0) / 0.66; }
        const ok = sub.board ? (bw >= 0.65 || (h >= 0.9 && hb < 0.7)) : (w >= 0.6 || h >= 0.6);
        if (!ok) why.push('small w' + (w * 100).toFixed(0) + (sub.board ? ' board' + (bw * 100).toFixed(0) + '/' + (hb * 100).toFixed(0) : '') + ' h' + (h * 100).toFixed(0));
        const tilt = shot.kind === 'tower' && shot.move === 'tilt';   // deliberate: a tilt up a tall tower leaves its foot (start) or top (end)
        if (x0 < -0.005 || x1 > 1.005) why.push('cut x ' + x0.toFixed(2) + '..' + x1.toFixed(2));
        if (y0 < -0.005 && !tilt) why.push('cut top ' + y0.toFixed(2));
        if (y1 > 0.745 && !tilt) why.push('low ' + y1.toFixed(2));
        out.push({ shot: shot.id, kind: shot.kind, move: shot.move, line: st.line, t: +t.toFixed(2), u, hook, box: [x0, y0, x1, y1].map(v => +v.toFixed(3)), why });
      }
    }
    return out;
  })()`) as any[];
  const bad = res.filter((r) => r.empty || r.why?.length);
  for (const r of bad) console.log(`${r.line}\t${r.shot}\t${r.kind}/${r.move}\tt=${r.t}\tu=${r.u}\t${r.empty ? 'EMPTY' : r.why.join('; ')}\t${JSON.stringify(r.box ?? null)}`);
  console.log(`${bad.length} violations of ${res.length} samples (${new Set(bad.map((r) => r.shot)).size} shots)`);
  if (opt('json')) fs.writeFileSync(opt('json')!, JSON.stringify(res, null, 1));
} finally { await s.close(); }
