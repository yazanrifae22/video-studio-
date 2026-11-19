// Sunny Hill series wrapper choreography (kit-level, same for every episode). The score's `series` field says which part
// (opening | ending) and carries the episode data (ep, topic, hero, recap, next, tiles). Spec: docs/brands/kids/series-bible.md 4-5.
import { sunnyHill, titleSign, pillBadge, token, tokenWidth, tileArt, roundRectPath } from '/kit/kit/hill.js';
import { FONT } from '/kit/kit/fx.js';

export default function (K) {
  const S = K.score.series;
  if (!S) throw new Error('series choreo: score.series missing');
  const set = sunnyHill(K);
  const L = K.line, cam = K.cam, cue = (n, t, db) => K.sfx(n, t, db);
  const has = (id) => K.score.lines.some((l) => l.id === id);
  const W = (id, w, n = 0) => K.word(id, w, n);
  const body = (p, h = 1.8) => [[p[0], p[1] + 0.05, p[2]], [p[0], p[1] + h, p[2]]];
  const onHill = (x, z) => [x, set.hillY(x, z), z];
  const T = K.duration;
  if (S.part === 'opening') opening(); else ending();

  /* -------------------------------------------------------------- opening (~8 s): jingle, hill rises, title sign, badge, Boing! */
  function opening() {
    const TK = [-1.15, 0, 2.3], PP = [1.3, 0, 2.5], HERO = [-3.1, 0, 1.9];
    const tiko = K.actor('tiko', 'tiko', { pos: TK, yaw: 0.12, visible: false });
    const pip = K.actor('pip', 'pip', { pos: [9.5, 0, 1.2], yaw: -1.2 });
    const hero = token(K, S.hero, 'hero', { pos: HERO, yaw: 0.45, scale: S.hero.actor ? 0.85 : 1.1 });
    const signAt = [0, set.hillY(0, -2.2) - 0.1, -2.2], PH = 0.8, SH = 2.7;
    const sign = titleSign(K, { at: signAt, w: 7.6, h: SH, postH: PH });
    const B1 = [0, signAt[1] + PH + SH + 0.5, signAt[2] + 0.3];   // the badge sits on top of the board, like a tab (always above the friends' heads)
    const badge = pillBadge(K, `Ep ${S.ep} · ${S.topic}`, { at: B1, height: 1.15, maxWidth: 8.4 });   // 1.15 m = cap ~9 px at 360 px wide (Ep 11 QA: 0.66 was ~6 px); shrinks to fit a long topic
    const sing = L('sx_sing'), boing = L('sx_boing');
    cue('jingle', 0.0, -13);
    set.hill.rise(0.02);
    hero.show(0.12); cue('pop', 0.15, -22);
    // Pip flies in from the right and lands; Tiko pops up with a hop
    pip.fly(0, 0.01, 1.9); pip.moveTo(0.05, 1.35, PP, { e: 'outCubic', faceBack: 0 }); pip.fly(1.0, 0.45, 0); cue('chirp', 1.15, -22);
    K.offscreen(0, 0.9, 'pip');
    tiko.show(0.55); tiko.hop(0.6, 0.35); cue('boing', 0.6, -25);
    // title sign pops on "Sunny", sparkles; second "Sunny" wiggles it
    const tS = W('sx_sing', 'sunny', 0) - 0.05;
    // the sign is in frame from frame 0 (on-screen title at 0.00 s): it drops onto the rising hill, then pops on the sung "Sunny"
    sign.size.set(0, 1); sign.place(0, [signAt[0], signAt[1] + 0.9, signAt[2]]); sign.moveTo(0.02, 0.6, signAt, 'outBack');
    sign.pulse(tS, 0.5, 0.08); cue('sparkle', tS + 0.05, -21); K.sparkles([0, signAt[1] + PH + SH + 0.3, signAt[2] + 0.4], tS + 0.1, { n: 22, spread: 2.8 });
    sign.wiggle(W('sx_sing', 'sunny', 1), 0.6, 0.05);
    tiko.look(tS, 1.2, 0, -0.35); pip.look(tS + 0.1, 1.2, 0, -0.4);
    tiko.hop(W('sx_sing', 'play!'), 0.3); pip.hop(W('sx_sing', 'play!') + 0.08, 0.3); hero.hop(W('sx_sing', 'play!') + 0.15);
    // "Ep N · Topic" badge slides in from the right
    const tB = sing.t1 + 0.05;
    badge.place(tB - 0.01, [7.5, B1[1], B1[2]]); badge.show(tB, 0.4); badge.moveTo(tB, 0.55, B1, 'outCubic'); cue('whoosh', tB, -26);
    // catchphrase: "Up the hill, up the hill... Ready, friend? Boing!" both jump on Boing
    tiko.turn(boing.t0 - 0.3, 0.3, 0);
    tiko.hop(W('sx_boing', 'up', 0), 0.25); pip.hop(W('sx_boing', 'up', 0) + 0.06, 0.22);
    tiko.hop(W('sx_boing', 'up', 1), 0.25); pip.hop(W('sx_boing', 'up', 1) + 0.06, 0.22);
    tiko.tilt(W('sx_boing', 'ready,'), 0.9, 0.2); pip.tilt(W('sx_boing', 'ready,') + 0.1, 0.9, -0.22);
    const tJ = W('sx_boing', 'boing!');
    tiko.jump(tJ - 0.04, 0.85, 0.7); pip.jump(tJ, 0.8, 0.66); pip.flap(tJ, 0.8); hero.hop(tJ + 0.1);
    cue('boing', tJ, -19); K.sparkles([0, 2.2, 2.4], tJ + 0.2, { n: 20, spread: 2.0 }); tiko.mood(tJ, 'wow'); tiko.mood(tJ + 0.8, 'happy');
    // camera: wide on the rising hill -> settles on the whole title -> low and closer on the friends (sign above them) for the catchphrase
    const wide = K.frame([...sign.corners, [-2.6, B1[1] + 0.45, B1[2]], [2.6, B1[1] + 0.45, B1[2]], ...body(TK), ...body(PP, 1.0), ...body(HERO, hero.h), [HERO[0] - 0.8, 0.5, HERO[2]]], { az: 0.04, el: 0.1, pad: 1.03, fov: 38 });
    const mid = { pos: [0.25, 1.05, 10.6], look: [-0.15, 3.0, -1.0], fov: 41 };
    cam.cut(0, { pos: [wide.pos[0], wide.pos[1] + 0.6, wide.pos[2] + 3.0], look: wide.look, fov: wide.fov });
    cam.move(0, tS + 0.3, wide, 'outCubic');
    cam.move(boing.t0 - 0.6, 1.4, mid, 'inOutSine');
    K.keep(0.7, boing.t0 - 0.5, sign); K.keep(tB + 0.6, T - 0.1, badge);
    K.keep(0.4, T - 0.1, hero.obj);
  }

  /* -------------------------------------------------------------- ending (~26 s): recap song, next time, ask, playlist + wall, bye + hill clap */
  function ending() {
    const TK = onHill(-1.6, -2.3), PP = onHill(1.6, -2.2);   // up the hill, above the recap labels
    const tiko = K.actor('tiko', 'tiko', { pos: TK, yaw: 0.08 });
    const pip = K.actor('pip', 'pip', { pos: PP, yaw: -0.08 });
    const R = S.recap ?? [], n = R.length, anim = R.some((r) => r.token.actor);
    const sp = n > 7 ? 0.98 : anim ? 1.55 : 1.4, z0 = 2.1;
    // each recap token gets its own slot sized to its widest part (token or label bubble); the usual even spacing is kept
    // while everything fits it, otherwise slots are laid side by side and the whole row shrinks to fit the frame (no overlap)
    const baseScale = (r) => r.token.actor ? 0.7 : n > 7 ? 0.8 : 0.95, bH0 = n > 7 ? 0.48 : 0.56;
    const bubW = (word, h) => { const x = document.createElement('canvas').getContext('2d'); x.font = `800 150px ${FONT}`; return h * (Math.ceil(x.measureText(word).width) + 140) / (Math.ceil(150 * 1.25) + 84 + 60); };
    const slot0 = R.map((r) => Math.max(tokenWidth(r.token, baseScale(r)), bubW(r.word, bH0)) + 0.12);
    const wide = slot0.some((w) => w > sp), GAP = 0.3, MAXW = 10.5;
    const sumW = slot0.reduce((a, b) => a + b, 0) + GAP * (n - 1), fit = wide ? Math.min(1, MAXW / sumW) : 1;
    const slotW = slot0.map((w) => w * fit);
    const xs = []; { let c = -(wide ? sumW * fit : 0) / 2; slotW.forEach((w, i) => { xs.push(wide ? c + w / 2 : (i - (n - 1) / 2) * sp); c += w + GAP * fit; }); }
    const toks = R.map((r, i) => {
      const x = xs[i], zz = z0 + (wide ? Math.abs(x) * 0.02 : Math.abs(i - (n - 1) / 2) * 0.1);
      const tk = token(K, r.token, `rc${i}`, { pos: [x, 0, zz], yaw: -x * 0.05, scale: baseScale(r) * fit });
      tk.x = x; tk.z = zz; tk.slot = wide ? slotW[i] : 1.5; return tk;
    });
    const bubbles = R.map((r, i) => K.bubble(r.word, [toks[i].x, toks[i].h + 0.5 * fit + (!wide && n > 7 && i % 2 ? 0.5 : 0), toks[i].z], { height: bH0 * fit }));
    const ls = L('sx_letsing'), rc = L('sx_recap'), ask = L('sx_ask'), lst = L('sx_list'), bye = L('sx_bye');
    // "Let's sing what we learned!"
    tiko.wave(ls.t0, 1.2, 'R'); pip.hops(ls.t0 + 0.1, 2, 0.4, 0.25); cue('ding', ls.t0 + 0.1, -24);
    // recap song: each word pops its object + label; the friends dance on every word
    R.forEach((r, i) => {
      const t = W('sx_recap', r.word, R.slice(0, i).filter((q) => q.word.toLowerCase() === r.word.toLowerCase()).length) - 0.04;
      toks[i].show(t); bubbles[i].show(t + 0.05); cue('pop', t, -23);
      (i % 2 ? pip : tiko).hop(t, 0.32); if (i % 3 === 2) K.sparkles([toks[i].x, toks[i].h + 0.4, toks[i].z], t + 0.1, { n: 10, spread: 0.9 });
    });
    tiko.spin(rc.t1 + 0.05, 0.8); pip.spin(rc.t1 + 0.1, 0.8); cue('yay', rc.t1 + 0.05, -22);
    const crest = set.crest;
    // next time: the recap clears, the next topic peeks up from behind the hill crest (camera low, so the crest hides it until it rises)
    let tN = null;
    const NZ = crest[2] - 1.5, NY = set.hillY(0, NZ);
    if (has('sx_next') && S.next) {
      const nl = L('sx_next'); tN = nl.t0;
      tiko.moveTo(tN - 0.3, 0.7, onHill(-2.3, -1.9), { faceBack: 0.15 }); pip.moveTo(tN - 0.25, 0.7, onHill(2.3, -1.8), { faceBack: -0.15 });   // make room: the next topic peeks up between them
      toks.forEach((tk, i) => tk.hide(tN - 0.2 + i * 0.03)); bubbles.forEach((b, i) => b.hide(tN - 0.25 + i * 0.03));
      // the peek object is ~1.6 m tall whatever its kind, so the label bubble above it always stays in this shot
      const unitH = (k) => k.actor ? ({ cow: 1.75, horse: 2.1, sheep: 1.45, pig: 1.2, duck: 1.0, hen: 1.05, tiko: 1.75, pip: 1.0 }[k.actor] ?? 1.4) : k.pair ? 1.3 : k.shape ? 1.6 : k.text ? 1.5 : 1.0;
      const nx = token(K, S.next.hero, 'next', { pos: [0, NY - 2.8, NZ], yaw: 0, scale: Math.min(2.0, 1.6 / unitH(S.next.hero)) });
      const tUp = W('sx_next', 'sunny');
      nx.show(tUp - 0.6);
      if (S.next.hero.actor) nx.obj.moveTo(tUp - 0.6, 0.9, [0, NY - 0.05, NZ], { e: 'outBack', face: false }); else nx.obj.moveTo(tUp - 0.6, 0.9, [0, NY - 0.05, NZ], 'outBack');
      cue('whoosh', tUp - 0.6, -27); cue('sparkle', tUp + 0.3, -22); K.sparkles([0, NY + nx.h + 0.3, NZ + 0.3], tUp + 0.3, { n: 18, spread: 1.6 });
      const nb = K.bubble(`${S.next.topic}!`, [0, NY + nx.h + 1.1, NZ + 0.2], { height: 1.8, maxWidth: 12, clamp: true });   // 1.8 m = cap ~9 px at 360 px wide (Ep 11 QA: 1.0 was ~4 px); shrinks to fit a long topic
      nb.show(tUp + 0.5);
      pip.hops(tUp + 0.1, 3, 0.36, 0.3); pip.flap(tUp + 0.1, 1.1); tiko.mood(tUp + 0.2, 'wow'); tiko.mood(tUp + 1.4, 'happy');
      tiko.look(tUp - 0.2, nl.t1 - tUp + 0.6, 0.5, -0.25); pip.look(tUp - 0.1, nl.t1 - tUp + 0.5, -0.5, -0.3);   // glance up at the hill, still facing us
      nb.hide(ask.t0 - 0.5); nx.hide(ask.t0 - 0.4);   // the ask frames only the friends
      K.keep(tUp + 0.5, ask.t0 - 0.6, nx.obj, nb);
      const camNext = { pos: [0.0, 2.2, 5.6], look: [0, 3.3, -6.5], fov: 41 };
      cam.move(tN - 0.4, 1.3, camNext, 'inOutSine');
    }
    // the ask (to grown-ups), led by Pip: Pip hops forward and waves; happy chirp-chirp after
    const PF = onHill(0.85, 0.1), TF = onHill(-0.9, 0.1);
    pip.moveTo(ask.t0 - 0.5, 0.7, PF, { faceBack: 0 }); tiko.moveTo(ask.t0 - 0.45, 0.7, TF, { faceBack: 0 });
    pip.wave(ask.t0 + 0.2, 1.6, 'R'); pip.wave(W('sx_ask', 'subscribe') - 0.1, 1.2, 'L');
    tiko.nod(W('sx_ask', 'play'), 0.6, 2);
    cue('chirp', ask.t1 + 0.15, -20); pip.hops(ask.t1 + 0.1, 2, 0.32, 0.22); pip.flap(ask.t1 + 0.1, 0.8);
    // playlist line: Tiko nods (no pointing at the tiles: they are pictures, not buttons)
    tiko.nod(lst.t0 + 0.3, 0.6, 1); tiko.tilt(lst.t0 + 1.0, 1.2, 0.15);
    // goodbye + hill clap (two claps and a jump)
    tiko.wave(bye.t0 - 0.05, 1.3, 'R'); pip.wave(bye.t0 + 0.05, 1.3, 'L');
    const tc = bye.t1 + 0.05;   // overlaps the voice tail: no silent gap before the clap
    tiko.clap(tc, 0.95); pip.flap(tc, 0.9); cue('clap', tc + 0.09, -18); cue('clap', tc + 0.48, -18);
    tiko.jump(tc + 1.0, 0.75, 0.62); pip.jump(tc + 1.02, 0.75, 0.6); cue('boing', tc + 1.0, -21); K.sparkles([0, TF[1] + 2.4, 0.2], tc + 1.1, { n: 22, spread: 2.2 });
    // camera: recap row (whole row + friends) -> low on the crest for the teaser -> friends big in the upper part during the wall
    const rowPts = toks.flatMap((tk) => [[tk.x - tk.slot / 2, 0.05, tk.z], [tk.x + tk.slot / 2, 0.05, tk.z], [tk.x, tk.h + 1.0, tk.z]]);
    const camRecap = K.frame([...rowPts, ...body(TK), ...body(PP, 1.0)], { az: 0, el: 0.12, pad: 1.1, fov: 36 });
    const yF = TF[1];
    const camAsk = { pos: [0, yF + 1.2, 7.4], look: [0, yF + 0.25, 0.1], fov: 34 };   // friends fill the middle; the bottom quarter stays meadow for the wall
    cam.cut(0, { pos: [camRecap.pos[0] + 1.2, camRecap.pos[1] + 0.8, camRecap.pos[2] + 2.5], look: camRecap.look, fov: camRecap.fov });
    cam.move(0, ls.t1 + 0.4, camRecap, 'outCubic');
    cam.move(ask.t0 - 0.6, 1.3, camAsk, 'inOutSine');
    cam.move(bye.t0 - 0.2, T - bye.t0 + 0.2, { pos: [camAsk.pos[0], camAsk.pos[1] + 0.2, camAsk.pos[2] + 0.7], look: camAsk.look }, 'inOutSine');
    K.keep(rc.t0 + 0.3, (tN ?? ask.t0) - 0.3, ...toks.map((tk) => tk.obj));
    K.wall = { t0: ask.t0 - 0.4, t1: T };
  }

  /** the "watch more" wall: a soft row of non-clickable episode tiles at the bottom (1920x1080 transparent PNG) */
  K.wallPng = async () => {
    const tiles = S.tiles ?? [], Wd = 1920, H = 1080, tw = 480, th = Math.round(tw * 9 / 16), gap = 40;   // big enough to read on a phone
    const c = document.createElement('canvas'); c.width = Wd; c.height = H; const x = c.getContext('2d');
    // owner 2026-11-08 text safety: the row (incl. its 9 px shadow) ends above the YouTube player controls (bottom 10 %, config/text-safety.json 16:9)
    const total = tiles.length * tw + (tiles.length - 1) * gap, x0 = (Wd - total) / 2, y0 = Math.round(H * 0.9) - th - 16 - 40;   // 40 px extra clearance (Ep 5: the row read as sitting in the player-controls band)
    const img = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    for (const [i, t] of tiles.entries()) {
      const tx = x0 + i * (tw + gap);
      x.save(); x.fillStyle = 'rgba(36,48,94,0.28)'; roundRectPath(x, tx + 6, y0 + 9, tw, th, 26); x.fill(); x.restore();
      x.save(); roundRectPath(x, tx, y0, tw, th, 26); x.clip();
      const im = t.src ? await img(t.src) : null;
      if (im) x.drawImage(im, tx, y0, tw, th); else x.drawImage(tileArt(tw, th, t.topic), tx, y0, tw, th);
      x.restore();
      x.lineWidth = 7; x.strokeStyle = '#FFFFFF'; roundRectPath(x, tx, y0, tw, th, 26); x.stroke();
      // one label chip per tile, top-left on the clean picture: "Ep 2" (or "Coming next: Ep 2")
      const label = t.kind === 'next' ? `Next: Ep ${t.ep}` : `Ep ${t.ep}`;
      x.font = `800 68px ${FONT}`; const lw = x.measureText(label).width + 52;   // 68 px = cap ~48 px = ~9 px at 360 px wide (QA Ep 6: 44 px was 5 px)
      x.fillStyle = 'rgba(36,48,94,0.3)'; roundRectPath(x, tx + 18, y0 + 22, lw, 92, 46); x.fill();
      x.fillStyle = '#FF7A45'; roundRectPath(x, tx + 14, y0 + 16, lw, 92, 46); x.fill(); x.lineWidth = 4; x.strokeStyle = '#FFFFFF'; x.stroke();
      x.fillStyle = '#FFFFFF'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(label, tx + 40, y0 + 64);
    }
    return c.toDataURL('image/png');
  };
}
