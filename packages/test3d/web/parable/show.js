// Fair Game: the picture MODEL. makeShow(score, {storyboard?}) -> { duration, beats, lines, warnings, state(t) }.
// Pure JS (node + browser), no Three.js. Schema: docs/brands/test-3d/fair-game/STATE.md. Every number on screen comes from game.js.
// Built once: worlds, crossing events (who tips over when), the timeline (board segments, overlay items, shots, tags, beats).
// state(t): binary search of the board segment + the overlay items of a 1 s bucket. Pure: no state survives between calls
// (the only caches are the precomputed tables built in makeShow).
import * as G from './game.js';

const { N, SEAT, CAST, each } = G;
const ROLE = Object.fromEntries(Object.entries(CAST).map(([k, p]) => [p, k]));
const CASTS = Object.values(CAST);
const sqAt = (n) => ({ f: (n - 1) % 8 + 1, r: Math.floor((n - 1) / 8) + 1 });
const SEATP = Array.from({ length: N }, (_, p) => sqAt(SEAT[p]));
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}']/gu, '');
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const inOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const outCubic = (u) => 1 - Math.pow(1 - clamp(u), 3);
const ramp = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
const sramp = (t, a, b) => smooth(ramp(t, a, b));
const pulse = (t, a, up, hold, down) => sramp(t, a, a + up) * (1 - sramp(t, a + up + hold, a + up + hold + down));   // 0 -> 1 -> 0
const hopCurve = (t, a, d = 0.45) => { const u = (t - a) / d; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); };
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (x) => `${Math.round(x)}%`;
const TIP = 0.5;   // seconds for a pawn to tip over (or stand back up)
const CENTRE = { f: 4.5, r: 4.5 };
const midOf = (a, b, k = 0.5) => ({ f: lerp(a.f, b.f, k), r: lerp(a.r, b.r, k) });
/** round 4: the direction a pawn falls (unit {f, r} on the board), hashed per id but always pointing INTO the board on edge squares */
const FALL = SEATP.map((q, p) => { const h = (Math.sin((p + 1) * 12.9898) * 43758.5453) % 1, a = 2 * Math.PI * Math.abs(h); let df = Math.cos(a), dr = Math.sin(a);
  if (q.f === 1) df = Math.abs(df); if (q.f === 8) df = -Math.abs(df); if (q.r === 1) dr = Math.abs(dr); if (q.r === 8) dr = -Math.abs(dr); return { f: +df.toFixed(3), r: +dr.toFixed(3) }; });
const FALL_X = { f: 0, r: 1 };

/** chapter of each line (storyboard round 3); used when no storyboard is passed */
const CHAPTERS = { c01: 'l01 l02 l03 l04 l05', c02: 'l06 l07 l08 l09 l10 l11 l11a l11b l11c l11d l12', c03: 'l13a l13 l14 l15 l16', c04: 'l17a l17 l18 l19 l20 l21 l22a l22 l23 l24', c05: 'l25 l26 l27 l28 l29 l30', c06: 'l31 l32 l33 l34 l35 l36 l37 l38 l39 l40', c07: 'l41 l42 l43 l44 l45 l45a l46 l47', c08: 'l48 l49 l50a l50 l51 l52 l53', c09: 'l54 l55 l56 l57 l58 l59 l60', c10: 'l61 l62 l63 l64 l64a l65' };
export const HOOK_TEXT = '64 PLAYERS. 1 FAIR COIN.', END_TEXT = 'WHICH ONE ARE YOU?';

/* ------------------------------------------------------------------ worlds + crossing events */
/** every time a player's stack crosses 1 coin: {x (fractional flip index), p, under} in x order. Works for exchange worlds and the growth world. */
function crossings(wd) {
  const ev = [], st = new Uint8Array(N), prev = new Float64Array(N).fill(G.START);
  if (wd.scan) {
    wd.scan((i, w, a, b) => {
      const touched = i % (N / 2) === 0 && wd.tax ? null : [a, b];
      const list = touched ?? Array.from({ length: N }, (_, k) => k);
      for (const p of list) { const u = w[p] < 1 ? 1 : 0; if (u !== st[p]) { const f = clamp((1 - prev[p]) / ((w[p] - prev[p]) || 1)); ev.push({ x: i - 1 + f, p, under: u }); st[p] = u; } prev[p] = w[p]; }
      if (!touched) for (let k = 0; k < N; k++) prev[k] = w[k];
    });
  } else {
    for (let i = 1; i <= wd.rounds; i++) { const w = wd.at(i); for (let p = 0; p < N; p++) { const u = w[p] < 1 ? 1 : 0; if (u !== st[p]) { const f = clamp((1 - prev[p]) / ((w[p] - prev[p]) || 1)); ev.push({ x: i - 1 + f, p, under: u }); st[p] = u; } prev[p] = w[p]; } }
  }
  return ev;
}

export function makeShow(score, { storyboard, log = (m) => {} } = {}) {
  const warnings = [], warn = (m) => { warnings.push(m); log(m); };
  const fps = score.fps ?? 30, D = score.duration;
  const LINES = score.lines ?? [], LI = new Map(LINES.map((l, i) => [l.id, i]));
  const chapterOf = new Map();
  if (storyboard) for (const c of storyboard.chapters) for (const l of c.lines) chapterOf.set(l.id, c.id);
  else for (const [c, ids] of Object.entries(CHAPTERS)) for (const id of ids.split(' ')) chapterOf.set(id, c);
  const has = (id) => LI.has(id);
  const L = (id) => LINES[LI.get(id)];
  const s = (id) => L(id).t0, e = (id) => L(id).t1;
  const n = (id) => { const i = LI.get(id); return i + 1 < LINES.length ? LINES[i + 1].t0 : D; };   // end of the silence after the line
  /** start of the k-th word of line id matching w (same rule as K.word); missing -> a fraction of the line + a warning */
  const W = (id, w, k = 0, frac = 0.5) => {
    const l = L(id), hits = l.words.filter((x) => norm(x.w) === norm(w)), h = hits[k < 0 ? hits.length + k : k];
    if (h) return h.t0;
    warn(`word "${w}" #${k} not found in ${id}; using ${Math.round(frac * 100)} % of the line`);
    return l.t0 + frac * (l.t1 - l.t0);
  };
  const WE = (id, w, k = 0, frac = 0.5) => { const t = W(id, w, k, frac), h = L(id).words.find((x) => x.t0 === t); return h ? h.t1 : t + 0.3; };

  /* ---------------- worlds */
  const fair = G.WORLDS.fair(), FAIR_END = fair.flips;
  const again = new Map(); for (const k of G.AGAIN_KINGS) again.set(k, G.world({ seed: 7001 + k, flips: each(6000) }));   // = WORLDS.again(k), denser checkpoints (same numbers)
  const hats = G.WORLDS.hats(), growth = G.WORLDS.growth();
  const LEAK_END = each(12500), leak = G.world({ seed: 13, flips: LEAK_END + 32 * 16, tax: 0.01 });   // = WORLDS.leak() for the first 400,000 flips (same seed), played on in l58
  const EV = new Map();
  const events = (wd) => { if (!EV.has(wd)) EV.set(wd, crossings(wd)); return EV.get(wd); };
  leak.tax = 0.01;
  const equal = new Float64Array(N).fill(G.START);
  const fairAt = (x) => fair.at(x);
  const stEnd = G.stats(fair.final), st20 = G.stats(fair.at(each(20))), st200 = G.stats(fair.at(each(200))), st600 = G.stats(fair.at(each(600))), st2000 = G.stats(fair.at(each(2000)));
  const w20 = fair.at(each(20)), w200 = fair.at(each(200)), hatsF = hats.final, hatsStart = hats.at(0), growF = growth.final, stGrow = G.stats(growF);
  const leakF = leak.at(LEAK_END), stLeak = G.stats(leakF);
  const S = CAST.scholar, Wk = CAST.worker, H = CAST.heir, F = CAST.fool;
  const NOBODY = G.stats(hatsF).order.find((p) => !CASTS.includes(p));
  const GIANT = stGrow.richest;

  /* ---------------- timeline containers */
  const segs = [];      // board segments: {t0, fill(St, t)}; each runs until the next one
  const items = [];     // overlays: {t0, t1, fn(St, t)} applied in insertion order
  const shots = [];     // {t0, kind, subject, move, to, continuous, line}
  const beats = [];
  const tagDefs = [];   // {id, text, line, t0, t1, anchor, size, color, kind}
  const seg = (t0, fill) => segs.push({ t0, fill });
  const item = (t0, t1, fn) => { items.push({ t0, t1, fn }); };
  const beat = (type, t0, t1, o = {}) => beats.push({ type, t0, t1, ...o });
  let curLine = 'l01';
  const cut = (t0, kind, subject, move = 'hold', to = null, continuous = false) => shots.push({ t0, kind, subject, move, to, continuous, line: curLine });
  /** a tag keyed to the time `tw` its word is spoken (round 4): titles come up at the start of their line, every other tag LEAD s
   *  before its word; it stays up to the end of the line + the silence after it, or the next cut, unless `until` says otherwise
   *  (`replaced: true` = the storyboard replaces it on purpose). t1 of default tags is finalised once the shots are known. */
  const LEAD = 0.15;
  const tag = (line, tw, text, anchor, o = {}) => {
    const kind = o.kind ?? 'number', t0 = o.at ?? (kind === 'title' ? Math.min(tw, s(line)) : tw - (o.lead ?? LEAD));
    // round 5: o.holdLine = survive the cuts inside its own line (end at the first cut after the line's silence starts);
    // o.anchorAfter = {t, anchor}: from t (a cut) the tag uses another anchor (l51 '36 under one coin' after the cut to the giant tower)
    const def = { id: `${line}:${text}${o.k ? ':' + o.k : ''}`, text, line, t0, tw, t1: o.until ?? n(line), byCut: o.until == null, holdTo: o.holdLine ? e(line) : null, anchorAfter: o.anchorAfter ?? null, replaced: !!o.replaced, anchor, size: o.size ?? 'm', color: o.color ?? null, kind };
    tagDefs.push(def); beat('tag', tw, tw + 0.35, { id: def.id, text });
    return def;
  };
  /** what the line is ABOUT (STATE.md Changes round 4): explicit focus windows; otherwise derived from the shot subject */
  const focusDefs = [];
  const focusOn = (t0, t1, f) => focusDefs.push({ t0, t1, f });
  /** counters: value function v(t) so the text is stable and `fast` (value changing > 8 times a second) is exact */
  const counterItem = (t0, t1, label, v, op, key = 'counter') => item(t0, t1, (St, t) => {
    const val = Math.round(v(t)), fast = Math.abs(Math.round(v(t + 1 / 16)) - Math.round(v(t - 1 / 16))) >= 1;
    St[key] = { label, value: val, text: `${label} ${fmt(val)}`, opacity: op(t), fast };
  });
  const block = (id, fn) => { if (!has(id)) { warn(`line ${id} missing from the score: its picture is skipped`); return; } curLine = id; fn(); };

  /* ---------------- board segment kinds */
  const setCoins = (St, arr, o = {}) => {
    for (let p = 0; p < N; p++) { const P = St.players[p]; P.coins = arr[p]; P.down = arr[p] < 1 ? 1 : 0; }
    if (o.rings != null) for (const P of St.players) P.rings = o.rings;
    St.world = o.world ?? 'fair'; St.flips = o.flips ?? null;
  };
  const staticSeg = (t0, arr, o = {}) => seg(t0, (St) => setCoins(St, arr, o));
  /** play a world from x0 to x1 between tA and tB (eased), pawns tipping over at their real crossing times; holds x1 after tB */
  const playSeg = (t0, wd, x0, x1, tA, tB, o = {}) => {
    const up = x1 > x0, logEase = x0 > 0 && x1 > 0 && Math.max(x0, x1) / Math.min(x0, x1) >= 4;
    const X = (t) => { const u = inOut(ramp(t, tA, tB)); if (logEase) return Math.exp(lerp(Math.log(x0), Math.log(x1), u)); return up ? lerp(x0, x1, u * u) : lerp(x1, x0, (1 - u) * (1 - u)); };
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    const start = wd.at(x0), init = Array.from(start, (c) => (c < 1 ? 1 : 0));
    const inv = (x) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2, xm = X(lerp(tA, tB, m)); if ((xm < x) === up) a = m; else b = m; } return lerp(tA, tB, (a + b) / 2); };
    const per = Array.from({ length: N }, () => []);
    for (const ev of events(wd)) if (ev.x > lo && ev.x <= hi) per[ev.p].push({ tc: inv(ev.x), under: up ? ev.under : 1 - ev.under });
    // rewind: an event at x means "status flips to `under`" going up, so going down it flips to the opposite
    const tracks = per.map((list, p) => {
      list.sort((a, b) => a.tc - b.tc);
      let v = init[p], target = init[p], tprev = tA; const out = [];
      for (const ev of list) { v = toward(v, target, (ev.tc - tprev) / TIP); out.push({ tc: ev.tc, v, target: ev.under }); target = ev.under; tprev = ev.tc; }
      return out;
    });
    const tick = o.counter ? o.counter : null;
    seg(t0, (St, t) => {
      const x = X(t), arr = wd.at(x);
      for (let p = 0; p < N; p++) {
        const P = St.players[p], tr = tracks[p]; P.coins = arr[p];
        let v, target, tt;
        if (!tr.length || t < tr[0].tc) { v = init[p]; target = init[p]; tt = tA; } else { let a = 0, b = tr.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (tr[m].tc <= t) a = m; else b = m - 1; } v = tr[a].v; target = tr[a].target; tt = tr[a].tc; }
        P.down = smooth(toward(v, target, Math.max(0, t - Math.max(tt, tA)) / TIP));
      }
      if (o.rings != null) for (const P of St.players) P.rings = o.rings;
      St.world = o.world ?? 'fair'; St.flips = x;
      if (tick) tick(St, x, t);
    });
    beat(up ? 'timelapse' : 'rewind', tA, tB, { world: o.world ?? 'fair', x0, x1 });
    return X;
  };
  function toward(v, target, k) { return v < target ? Math.min(target, v + k) : Math.max(target, v - k); }
  /** morph every stack from one array to another (reset); fallen pawns stand up during the first part */
  const morphSeg = (t0, from, to, tA, tB, o = {}) => {
    // round 4: the pawns start from the `down` the previous segment really shows at tA (a pawn still tipping over is not snapped)
    const prev = segs[segs.length - 1]; let d0s = null;
    const downsAt = () => { if (d0s) return d0s; if (!prev) return (d0s = Array.from(from, (c) => (c < 1 ? 1 : 0)));
      const Sc = { players: Array.from({ length: N }, () => ({ coins: 0, down: 0, rings: 1 })), moves: [], world: 'fair', flips: null }; prev.fill(Sc, tA);
      return (d0s = Sc.players.map((P) => P.down)); };
    seg(t0, (St, t) => {
      const u = sramp(t, tA, tB), tip = Math.min(TIP, 0.9 * (tB - tA)), D0 = downsAt();   // stand-up finishes inside the morph (short resets, l24)
      for (let p = 0; p < N; p++) { const P = St.players[p], d0 = D0[p], d1 = to[p] < 1 ? 1 : 0; P.coins = lerp(from[p], to[p], u); P.down = lerp(d0, d1, sramp(t, tA, tA + tip)); }
      if (o.rings != null) for (const P of St.players) P.rings = o.rings;
      St.world = o.world ?? 'fair'; St.flips = u < 1 ? null : (o.flips ?? 0);
    });
    beat('reset', tA, tB);
  };
  const flipsEachCounter = (X, tIn, tOut, tUp = tIn - 0.2) => counterItem(tUp, tOut, 'FLIPS EACH', (t) => X(t) / (N / 2), (t) => sramp(t, tUp, tUp + 0.2) * (1 - sramp(t, tOut - 0.3, tOut)));

  /* ---------------- overlay helpers */
  const light = (ids, t0, t1, k = 1, fade = 0.2) => item(t0, t1 + fade, (St, t) => { const v = k * sramp(t, t0, t0 + fade) * (1 - sramp(t, t1, t1 + fade)); for (const p of ids) St.players[p].lit = Math.max(St.players[p].lit, v); });
  const dimOthers = (ids, t0, t1, k = 0.65, fade = 0.3) => item(t0, t1 + fade, (St, t) => { const v = k * sramp(t, t0, t0 + fade) * (1 - sramp(t, t1, t1 + fade)); const keep = new Set(ids); for (const P of St.players) if (!keep.has(P.id)) P.dim = Math.max(P.dim, v); });
  const hopAt = (who, t0, d = 0.45) => { item(t0, t0 + d, (St, t) => { const v = hopCurve(t, t0, d); if (who === 'skeptic') St.skeptic.hop = v; else if (typeof who === 'number') St.players[who].hop = Math.max(St.players[who].hop, v); else { const x = St.extras.find((q) => q.id === who); if (x) x.hop = v; } }); beat('hop', t0, t0 + d, { who }); };
  const present = (t0, t1, v) => item(t0, t1, (St) => { for (const P of St.players) P.present = v; });
  const coinsOf = (St, id) => St.flipCoins.find((c) => c.id === id) ?? (St.flipCoins.push({ id, at: { ...CENTRE }, present: 0, phase: 'rest', lift: 0, angle: 0, yaw: 0, face: 'heads', glint: 0, labels: null }), St.flipCoins[St.flipCoins.length - 1]);
  /** a coin flip: leaves the board at tA, lands at tLand on `face`; present from tIn to tOut */
  const flip = (id, at, tA, tLand, face, o = {}) => {
    const turns = o.turns ?? Math.max(2, Math.round((tLand - tA) * 3)), a0 = o.a0 ?? 0, end = Math.floor(a0 + 1e-9) + turns + (face === 'tails' ? 0.5 : 0);
    const tIn = o.tIn ?? tA - 0.35, tOut = o.tOut ?? tLand + 0.8;
    // o.restLift: after landing the coin rises to this hover height and stays (l09: visible, not hidden between pawns);
    // o.preLift: the height it starts from before tA (the previous flip's rest height), easing down to the board by tA
    item(tIn, tOut, (St, t) => {
      const C = coinsOf(St, id), u = ramp(t, tA, tLand); C.at = typeof at === 'function' ? at(t) : at; C.present = Math.max(C.present, (o.fadeIn === false ? 1 : sramp(t, tIn, tIn + 0.3)) * (1 - (o.fadeOut === false ? 0 : sramp(t, tOut - 0.3, tOut))));
      C.phase = t < tA ? 'rest' : t < tLand ? 'air' : o.restLift ? 'hover' : 'rest'; C.lift = (o.peak ?? 1) * 4 * u * (1 - u);
      if (t < tA && o.preLift) C.lift = o.preLift * (1 - sramp(t, tIn, tA));
      if (t >= tLand && o.restLift) C.lift = o.restLift * sramp(t, tLand, tLand + 0.35);
      C.angle = lerp(a0, end, u); C.yaw = (o.yaw ?? 0.03) * u; C.face = face; if (o.labels) C.labels = o.labels;
    });
    beat('flip', tA, tLand, { coin: id, a: o.a ?? null, b: o.b ?? null, winner: o.winner ?? null, face, tLand });
  };
  /** the coin hovering and turning slowly (rate in turns per second), optional glint at tG */
  const hover = (id, at, t0, t1, o = {}) => item(t0, t1, (St, t) => {
    const C = coinsOf(St, id); C.at = typeof at === 'function' ? at(t) : at; C.present = Math.max(C.present, sramp(t, t0, t0 + 0.4) * (o.fadeOut === false ? 1 : 1 - sramp(t, t1 - 0.4, t1)));
    C.phase = 'hover'; C.lift = o.lift ?? 0.55; C.angle = o.angle ? o.angle(t) : (o.a0 ?? 0.2) + (o.rate ?? 0.08) * (t - t0); C.yaw = (o.yawRate ?? 0.05) * (t - t0);
    C.face = (((C.angle % 1) + 1) % 1) > 0.25 && (((C.angle % 1) + 1) % 1) < 0.75 ? 'tails' : 'heads'; if (o.labels) C.labels = o.labels;
    if (o.glint != null) C.glint = pulse(t, o.glint - 0.25, 0.25, 0.3, 0.6);
  });
  /** decorative "coin keeps flipping" loop at a point: one flip every `per` s */
  const coinLoop = (id, at, t0, t1, per = 0.75) => { for (let t = t0, k = 0; t + per * 0.8 <= t1; t += per, k++) flip(id, at, t, t + per * 0.8, k % 2 ? 'tails' : 'heads', { a0: k % 2 ? 0 : 0.5, turns: 2, peak: 0.7, tIn: k ? t : t0 - 0.3, tOut: t + per * 0.8 + (t + per * 1.8 <= t1 ? per * 0.2 : 0.5), fadeOut: t + per * 1.8 > t1 }); };
  const ex = (id, kind, at, o = {}) => ({ id, kind, at, coins: 0, rings: 1, present: 1, down: 0, lit: 0, dim: 0, hop: 0, scale: 1, role: null, hat: 0, ghost: 0, jump: null, rect: null, gather: 0, ...o });
  const addEx = (St, x) => { St.extras.push(x); return x; };
  const mv = (id, kind, amount, from, to, u) => ({ id, kind, coins: kind === 'disc' ? amount : 0, count: kind === 'chip' ? amount : 0, show: amount, from, to, u });

  /* ================================================================== the film, line by line */
  // default board before anything: the equal fair board
  staticSeg(-2e9, equal, { world: 'fair', flips: 0 });
  // round 4 (2026-11-15): the burned hook text owns the band 22-42 % for the first 3.0 s; the title flag keeps the views' tags/subjects out of it until 3.2 s
  // 2026-11-15 (owner: the opening must show the result at once): the burned hook text now sits in the LOWER third (film.json hook_text_y), like a title card over the
  // foot of the picture, so the views frame the first shot at full size and no band is reserved (St.title stays for the end text only).

  /* c01 ---------------------------------------------------------------- */
  // round 4 (2026-11-15): the film opens ON the result (= the thumbnail), rewinds to the equal start, shows the real stake, previews the four, asks for a pick.
  const tC02 = has('l06') ? s('l06') - 0.06 : D;                    // everything the preview adds to the board ends before c02 starts (equal board, no hats)
  const kingUp = (t0, t1) => item(t0, t1, (St) => { St.king = { on: F, drop: 1, swap: 1, hat: 1 }; });
  const LINEUP = [S, Wk, H, F], LROLE = ['scholar', 'worker', 'heir', 'fool'], LSPOT = LINEUP.map((_, i) => ({ f: 1.6 + i * 1.6, r: -0.15 }));   // the l65 line-up spots (front edge, 1.6 squares apart): every view frames it frontally and LARGE
  const heirC = has('l04') ? (t) => lerp(G.START, hatsStart[H], inOut(ramp(t, W('l04', 'ten') - 0.4, WE('l04', 'money', 0, 0.9)))) : () => G.START;
  /** the four hat pawns in a line on a cleared board (the other 60 leave), from tIn on (tIn very early = already there) */
  const lineup = (t0, t1, tIn) => item(t0, t1, (St, t) => {
    const out = 1 - sramp(t, tIn, tIn + 0.4);
    for (const P of St.players) if (!LINEUP.includes(P.id)) P.present = Math.min(P.present, out);
    LINEUP.forEach((p, i) => { const a = tIn + i * 0.12, P = St.players[p]; P.at = midOf(SEATP[p], LSPOT[i], inOut(ramp(t, a, a + 0.9))); P.hat = Math.max(P.hat, sramp(t, a - 0.1, a + 0.5)); });
    St.players[H].coins = heirC(t);
  });
  const tKing5 = has('l05') ? W('l05', 'one') - 0.15 : D, tBack5 = has('l05') ? W('l05', 'Before') - 0.1 : D;
  block('l01', () => {
    const tG = W('l01', 'game') + 0.2, tSm = W('l01', 'smarter') - 0.15, tNo = W('l01', 'nobody') - 0.25, pF = SEATP[F];
    staticSeg(-1e9 + 1, fair.final, { flips: FAIR_END });
    // from the first frame: the end of the fair world with the king on the great tower (the l23 state), no fade from black
    kingUp(-1e9, has('l02') ? s('l02') - 0.06 : D);
    cut(-1e9, 'tower', { players: [F], king: true }, 'push');   // 2026-11-15: a slow push on the whole tower (the pull to the board cropped the king's head in Neon); the wide cut on 'game' shows the fallen pawns
    cut(tG, 'wide', { board: true, players: [F] }, 'hold', null, true);
    cut(tSm, 'low', { board: true, players: [F] }, 'push');
    cut(tNo, 'tower', { players: [F], king: true, coins: ['main'] }, 'hold');
    tag('l01', Math.max(0.3, s('l01')), pct(stEnd.top1), { player: F }, { size: 'l', color: 'fool', at: 0, holdLine: true });
    flip('main', { f: pF.f + 1.0, r: pF.r - 0.7 }, tNo + 0.1, WE('l01', 'cheated', 0, 0.95), 'heads', { tIn: tNo - 0.1, tOut: has('l02') ? s('l02') - 0.35 : n('l01'), turns: 3 });
  });
  block('l02', () => {
    const t0 = s('l02') - 0.05, tA = s('l02') + 0.05, tB = Math.max(tA + 1.4, WE('l02', 'equal', 0, 0.3)), tEq = WE('l02', 'equal', 0, 0.3);
    cut(t0, 'high', { board: true }, 'push');
    const X = playSeg(t0, fair, FAIR_END, 0, tA, tB);
    // the king lifts off first, the tower drains, the fallen stand up
    const kUp = (t) => ramp(t, tA, tA + 0.5);
    item(t0, tB, (St, t) => { const u = kUp(t); St.king = { on: F, drop: Math.pow(1 - u, 2), swap: 1 - ramp(t, tA, tA + 0.12), hat: 1 - ramp(t, tA, tA + 0.12) }; if (u >= 1) St.king.on = null; });
    flipsEachCounter(X, tA, tEq + 0.8, s('l02') - 0.05);
    const tFair = W('l02', 'fair'), tCoin = W('l02', 'coin'), tEnds = W('l02', 'ends') - 0.05;
    tag('l02', W('l02', 'Sixty-four') + 0.05, `${N} players`, { screen: [0.5, 0.16] }, { size: 'l', kind: 'title', at: W('l02', 'Sixty-four') - 0.1, until: W('l02', 'ends') - 0.05 });
    const t100 = W('l02', 'hundred');
    [27, 20, 42, 9, 53].forEach((p, k) => tag('l02', t100 + k * 0.12, String(G.START), { player: p }, { k, until: tFair + 0.4 }));
    cut(W('l02', 'One', 1, 0.7) - 0.1, 'wide', { board: true, coins: ['main'] }, 'push');
    flip('main', CENTRE, tFair - 0.3, Math.max(tFair + 0.9, WE('l02', 'coin', 0, 0.9)), 'heads', { tIn: tFair - 0.65, turns: 5, tOut: tEnds });
    const ts = [tEnds, 0, 0].map((_, j) => tEnds + j * (e('l02') - tEnds) / 3);
    G.AGAIN_KINGS.slice(0, 3).forEach((k, j) => { cut(ts[j], 'wide', { board: true, players: [G.AGAIN.winners[k]] }, 'hold'); staticSeg(ts[j], again.get(k).final, { world: 'again', flips: FAIR_END }); });
  });
  block('l03', () => {
    const t0 = s('l03') - 0.05, tB = W('l03', 'Does') - 0.1, tAm = W('l03', 'America'), tR = W('l03', 'richest') - 0.2, tT = W('l03', 'third');
    cut(t0, 'demo', { extras: ['real1', 'real50'] }, 'push');   // frame check 2026-11-15: the two stacks side by side and close (in the wide board shot the 1 % stack read as a stub)
    staticSeg(t0, equal, { world: 'empty' }); present(t0, tB, 0); item(t0, tB, (St) => { St.world = 'empty'; St.flips = null; });
    item(t0, tB, (St, t) => {
      addEx(St, ex('real1', 'tower', { f: 4.7, r: 6.2 }, { coins: 325 * inOut(ramp(t, tR, tT + 0.3)), rings: 0 }));
      addEx(St, ex('real50', 'layer', { f: 5.7, r: 6.2 }, { coins: 23, rings: 0, present: sramp(t, t0, t0 + 0.4), rect: { f0: 0.5, r0: 0.5, f1: 8.5, r1: 4.5 }, gather: 1 }));   // already gathered: the bottom half as ONE small stack next to the 1 % stack
    });
    beat('appear', tR, tT + 0.3, { who: 'real1' });
    tag('l03', tAm + 0.3, 'bottom 50%', { extra: 'real50' }, { until: tB });
    tag('l03', W('l03', 'percent'), '1%', { extra: 'real1' }, { size: 'l', color: 'gold', until: tB });
    tag('l03', tT, 'a third of all wealth', { screen: [0.5, 0.15] }, { kind: 'note', until: tB });
    // back to the king on the great tower (a fallen pawn at its foot), slow push in
    cut(tB, 'tower', { players: [F], king: true }, 'push');
    staticSeg(tB, fair.final, { flips: FAIR_END }); kingUp(tB, has('l04') ? s('l04') - 0.06 : D);
    tag('l03', W('l03', 'better'), 'BETTER?', { player: F }, { size: 'l', color: 'fool', until: n('l03') });
  });
  block('l04', () => {
    const t0 = s('l04') - 0.05, tF = W('l04', 'Four') - 0.1;
    cut(t0, 'wide', { board: true }, 'hold'); staticSeg(t0, equal, { flips: 0 });
    cut(tF + 1.5, 'block', { players: LINEUP }, 'hold');
    lineup(tF - 0.01, tKing5 - 0.02, tF + 0.1);
    const nm = [['Scholar', '55 in 100', 'wins', 'scholar'], ['Worker', '2x', 'twice', 'worker'], ['Heir', `${fmt(hatsStart[H])} coins`, 'times', 'heir'], ['Fool', 'nothing', 'nothing', 'fool']];
    nm.forEach(([w, adv, aw, role], i) => {
      const p = LINEUP[i], tw = W('l04', w), nxt = i < 3 ? W('l04', nm[i + 1][0]) - 0.1 : tKing5;
      hopAt(p, tw, 0.45); light([p], tw - 0.05, nxt, 1);
      tag('l04', tw, `THE ${role.toUpperCase()}`, { player: p }, { color: role, kind: 'name', until: i < 3 ? nxt : tKing5 - 0.02, replaced: i < 3 });   // the name stays until the next name is spoken (frame check: 'THE SCHOLAR' was up for 0.3 s), then only the advantage stays
      tag('l04', W('l04', aw), adv, { player: p }, { color: role, k: 'adv', until: tKing5 - 0.02 });
    });
  });
  block('l05', () => {
    const tCut = s('l05') - 0.05, tPick = W('l05', 'pick'), tRule = W('l05', 'rule');
    // the four stay in their line; WORLDS races to 10,000 (no bars, nobody wins yet)
    const tUp = tCut, tOut = n('l05') - 0.3;
    counterItem(tUp, tOut + 0.3, 'WORLDS', (t) => 10000 * smooth(ramp(t, s('l05') + 0.1, WE('l05', 'thousand', 0, 0.4))), (t) => sramp(t, tUp, tUp + 0.25) * (1 - sramp(t, tOut - 0.1, tOut + 0.3)));
    // "the one rule that stops the king": the king on the great tower, the tower sinks a little, '?'
    cut(tKing5, 'tower', { players: [F], king: true }, 'push');
    staticSeg(tKing5, fair.final, { flips: FAIR_END }); kingUp(tKing5, tBack5 - 0.02);
    item(tKing5, tBack5 - 0.02, (St, t) => { St.players[F].coins = fair.final[F] * (1 - 0.15 * sramp(t, tRule - 0.2, tRule + 1.2)); });
    tag('l05', tRule, '?', { player: F }, { size: 'l', color: 'fool', until: tBack5 });
    // back to the four: names, a hop each in turn, PICK ONE held through the silence, the coin over them on "coin"
    cut(tBack5, 'block', { players: LINEUP, coins: ['main'] }, 'hold'); staticSeg(tBack5, equal, { flips: 0 });
    lineup(tBack5 - 0.01, tC02, -1e6);
    LINEUP.forEach((p, i) => { hopAt(p, tPick + 0.15 + i * 0.35, 0.45); tag('l05', tBack5 + 0.15, `THE ${LROLE[i].toUpperCase()}`, { player: p }, { color: LROLE[i], kind: 'name', until: n('l05'), at: tBack5 }); });
    tag('l05', tPick, 'PICK ONE', { screen: [0.5, 0.16] }, { size: 'l', at: tPick - 0.15, until: n('l05') });
    const tCo = W('l05', 'coin'), tLand = Math.max(tCo + 1.0, e('l05') - 0.1);
    flip('main', { f: 4.0, r: 1.4 }, tCo - 0.15, tLand, 'heads', { restLift: 0.45, tIn: tCo - 0.45, turns: Math.max(3, Math.round((tLand - tCo) * 3)), tOut: tC02, fadeOut: true });
  });

  /* c02 ---------------------------------------------------------------- */
  block('l06', () => {
    const t0 = s('l06') - 0.05; cut(t0, 'low', { board: true }, 'hold'); staticSeg(t0, equal, { flips: 0 });
    tag('l06', s('l06'), 'THE GAME', { screen: [0.5, 0.2] }, { size: 'l', kind: 'title' });
  });
  // the slow flips 1..6 of the fair world (l07 - l10)
  const slow = [];
  if (has('l07') && has('l09')) {
    const f1 = fair.flip(1);
    slow.push({ i: 1, ...f1, tLa: W('l07', 'Two'), tLb: W('l07', 'players'), tS: W('l07', 'stake'), tSd: 0.7, tA: s('l09'), tLand: W('l09', 'Heads'), tPd: 0.8, tEnd: n('l09') });
    // the payout slides on "takes both stakes" (round 4), never before the landing
    const tk = Math.max(slow[0].tLand + 0.35, W('l09', 'takes', 0, 0.45)); slow[0].tP = tk; slow[0].tPd = clamp(WE('l09', 'stakes', 0, 0.55) - tk, 0.6, 1.2);
  }
  if (has('l10')) {
    const tA = s('l10') - 0.05, tB = n('l10') - 0.25, ws = [1, 0.82, 0.68, 0.56, 0.46], sum = ws.reduce((a, b) => a + b, 0); let t = tA;
    for (let k = 0; k < 5; k++) { const d = (tB - tA) * ws[k] / sum, fi = fair.flip(k + 2); slow.push({ i: k + 2, ...fi, tLa: t, tLb: t + 0.05 * d, tS: t + 0.12 * d, tSd: 0.18 * d, tA: t + 0.3 * d, tLand: t + 0.62 * d, tP: t + 0.68 * d, tPd: 0.25 * d, tEnd: t + d }); t += d; }
  }
  if (slow.length) {
    const t0 = s('l07') - 0.05, pts = slow.map((f) => { const A = SEATP[f.a], B = SEATP[f.b]; return { pa: midOf(A, B, 0.4), pb: midOf(A, B, 0.6), mid: midOf(A, B) }; });
    seg(t0, (St, t) => {
      let k = -1; for (let j = 0; j < slow.length; j++) if (slow[j].tS <= t) k = j;
      if (k < 0) { setCoins(St, equal, { flips: 0 }); return; }
      const f = slow[k], done = t >= f.tP + f.tPd;
      setCoins(St, fair.at(done ? f.i : f.i - 1), { flips: done ? f.i : f.i - 1 + ramp(t, f.tS, f.tP + f.tPd) });
      if (!done) { St.players[f.a].coins -= f.stake; St.players[f.b].coins -= f.stake;
        const winner = f.aWins ? f.a : f.b, pay = t >= f.tP, uS = outCubic(ramp(t, f.tS, f.tS + f.tSd)), uP = inOut(ramp(t, f.tP, f.tP + f.tPd));
        St.moves.push(mv(`stake${f.i}a`, 'disc', f.stake, pay ? pts[k].pa : { player: f.a }, pay ? { player: winner } : pts[k].pa, pay ? uP : uS));
        St.moves.push(mv(`stake${f.i}b`, 'disc', f.stake, pay ? pts[k].pb : { player: f.b }, pay ? { player: winner } : pts[k].pb, pay ? uP : uS)); }
    });
    // the coin of flip 1 rests in FRONT of the pair (nearer the camera), lifted, so it is never hidden between the pawns (round 4)
    const coinPt = pts.map((q, k) => (k ? q.mid : { f: q.mid.f, r: q.mid.r - 0.7 }));
    let aPrev = 0;
    slow.forEach((f, k) => {
      const winner = f.aWins ? f.a : f.b, face = f.aWins ? 'heads' : 'tails';
      if (k) { light([f.a], f.tLa, f.tEnd - 0.15); light([f.b], f.tLb, f.tEnd - 0.15); }
      beat('stake', f.tS, f.tS + f.tSd, { a: f.a, b: f.b, coins: f.stake }); beat('payout', f.tP, f.tP + f.tPd, { to: winner, coins: 2 * f.stake });
      // the coin: glides from the previous pair once the previous line is over (flip 1 holds through all of l09)
      const prev = k ? coinPt[k - 1] : null, here = coinPt[k], tPrev = k ? Math.max(slow[k - 1].tLand + 0.15, Math.min(slow[k - 1].tEnd - 0.05, f.tA - 0.3)) : f.tA - 0.4;
      const at = (t) => (prev && t < f.tA ? midOf(prev, here, sramp(t, tPrev, f.tA - 0.05)) : here);
      const turns = k ? 3 : 4, end = Math.floor(aPrev + 1e-9) + turns + (face === 'tails' ? 0.5 : 0);
      flip('main', at, f.tA, f.tLand, face, { a: f.a, b: f.b, winner, tIn: k ? tPrev : f.tA - 0.4, tOut: k < slow.length - 1 ? slow[k + 1].tA : (has('l11') ? s('l11') : f.tEnd + 1), fadeOut: k === slow.length - 1, turns, a0: aPrev, restLift: k ? 0 : 0.45, preLift: k === 1 ? 0.45 : 0, fadeIn: k ? false : undefined });
      aPrev = end;
    });
    const f1 = slow[0];
    // flip 1: the pair lit and everyone else dimmed strongly for all of l07 and through l08-l09 (round 4)
    const fEnd = has('l09') ? n('l09') - 0.15 : f1.tEnd - 0.15;
    light([f1.a, f1.b], s('l07') - 0.05, fEnd, 1, 0.15); dimOthers([f1.a, f1.b], s('l07') - 0.05, fEnd, 0.85, 0.15);
    for (const f of slow.slice(1)) dimOthers([f.a, f.b], f.tLa, f.tEnd - 0.1, 0.45, 0.12);
    block('l07', () => {
      cut(s('l07') - 0.05, 'pair', { players: [f1.a, f1.b] }, 'push');
      tag('l07', f1.tS, fmt(f1.stake), { move: 'stake1a' }, { k: 'a' }); tag('l07', f1.tS + 0.1, fmt(f1.stake), { move: 'stake1b' }, { k: 'b' });
    });
    block('l08', () => {
      cut(s('l08') - 0.05, 'pair', { moves: ['stake1a', 'stake1b'] }, 'push');
      // round 4: the voice's example on the table in front of the board: a 100-coin and a 400-coin pawn, each puts in 20
      const tP = W('l08', 'player', 0, 0.35), tC = tP - 0.45, t100 = W('l08', 'hundred', 0, 0.4), t400 = W('l08', 'four', 0, 0.5);
      const tPut = W('l08', 'put', 0, 0.55), t20 = W('l08', 'twenty', 0, 0.6), tBoth = W('l08', 'both', 1, 0.7), tEnd = n('l08');
      const D1 = { f: 3.4, r: -0.35 }, D4 = { f: 5.6, r: -0.35 }, S1 = { f: 3.4, r: -0.95 }, S4 = { f: 5.6, r: -0.95 }, stake = 20;
      cut(tC, 'demo', { extras: ['d100', 'd400'], moves: ['d100s', 'd400s'] }, 'push');
      item(tC, tEnd, (St, t) => {
        const u = outCubic(ramp(t, tPut, Math.max(tPut + 0.5, t20 + 0.25))), go = t >= tPut;
        addEx(St, ex('d100', 'pawn', D1, { coins: 100 - (go ? stake : 0), rings: 0 })); addEx(St, ex('d400', 'pawn', D4, { coins: 400 - (go ? stake : 0), rings: 0 }));
        if (go) { St.moves.push(mv('d100s', 'disc', stake, { extra: 'd100' }, S1, u)); St.moves.push(mv('d400s', 'disc', stake, { extra: 'd400' }, S4, u)); }
      });
      focusOn(tC, tEnd, { players: [], extras: ['d100', 'd400'], moves: ['d100s', 'd400s'], hard: true });
      beat('stake', tPut, Math.max(tPut + 0.5, t20 + 0.25), { a: 'd100', b: 'd400', coins: stake });
      tag('l08', t100, '100', { extra: 'd100' }); tag('l08', t400, '400', { extra: 'd400' });
      tag('l08', t20, '20', { move: 'd100s' }, { k: 'a' }); tag('l08', t20 + 0.08, '20', { move: 'd400s' }, { k: 'b' });
      tag('l08', tBoth, '1/5 of the smaller stack', { screen: [0.5, 0.18] }, { kind: 'note' });
    });
    block('l09', () => {
      cut(s('l09') - 0.05, 'pair', { players: [f1.a, f1.b], coins: ['main'] }, 'hold');
      const after = fair.at(1), tT = f1.tP + f1.tPd;
      tag('l09', tT, fmt(after[f1.a]), { player: f1.a }, { color: f1.aWins ? 'good' : 'bad' }); tag('l09', tT + 0.1, fmt(after[f1.b]), { player: f1.b }, { color: f1.aWins ? 'bad' : 'good' });
    });
    block('l10', () => cut(s('l10') - 0.05, 'high', { board: true, coins: ['main'] }, 'hold'));
  }
  const hatAt = {}; // role -> time its hat lands
  block('l11', () => cut(s('l11') - 0.05, 'block', { players: [H, F, S, Wk] }, 'push'));
  [['l11a', 'Scholar', 'scholar'], ['l11b', 'Worker', 'worker'], ['l11c', 'Heir', 'heir'], ['l11d', 'Fool', 'fool']].forEach(([id, word, role]) => block(id, () => {
    // round 4: the hat is SEATED and the colour complete by the END of the name word (the drop starts early, look-ahead)
    // round 5: the Fool's line is two short words: its hat drops during l11c's silence and is seated at the START of "Fool"
    const t0 = W(id, word), tE = WE(id, word), hB = role === 'fool' ? t0 : tE - 0.03, hA = role === 'fool' ? hB - 0.7 : Math.min(t0 - 0.2, tE - 0.7); hatAt[role] = hB;
    item(hA, 1e9, (St, t) => { St.players[CAST[role]].hat = Math.max(St.players[CAST[role]].hat, sramp(t, hA, hB)); });
    light([CAST[role]], hA, n(id) - 0.1, 1);
    tag(id, t0, `THE ${role.toUpperCase()}`, { player: CAST[role] }, { color: role, kind: 'name', until: has('l12') ? s('l12') + 0.3 : n(id) });   // gone before the l12 crane pulls back (the four names ran into each other as the pawns shrank)
    beat('intro', hA, hB, { role, player: CAST[role] });
  }));
  // l12: the pull-back reaches the whole board by the middle of the line, then holds (round 4)
  block('l12', () => { cut(s('l12') - 0.05, 'block', { players: [H, F, S, Wk] }, 'crane', { board: true }, true); cut((s('l12') + e('l12')) / 2, 'wide', { board: true }, 'hold', null, true); });

  /* c03 ---------------------------------------------------------------- */
  /** the FLIPS EACH counter of a time-lapse: up at the start of its line, value from the time-lapse itself (stable after tB) */
  const tlCounter = (id, X, tA, until, tCut = s(id) - 0.05) => flipsEachCounter(X, tA, until, Math.max(tCut, Math.min(tA - 0.3, s(id) - 0.05)));
  block('l13a', () => {
    const t0 = s('l13a') - 0.05, tA = s('l13a') + 0.1, tB = n('l13a') - 0.35;
    cut(t0, 'wide', { board: true }, 'hold'); const X = playSeg(t0, fair, 6, each(20), tA, tB);
    tlCounter('l13a', X, tA, n('l13a') + 0.4);
    coinLoop('main', CENTRE, tA, tB);
  });
  block('l13', () => {
    cut(s('l13') - 0.05, 'high', { board: true }, 'hold');
    const tA = W('l13', 'Twenty-two'), tB = W('l13', 'Twenty');
    const ahead = [], half = []; for (let p = 0; p < N; p++) { if (w20[p] > G.START) ahead.push(p); if (w20[p] < G.START / 2) half.push(p); }
    light(ahead, tA - 0.1, tB - 0.2); light(half, tB - 0.1, n('l13') - 0.2);
    // round 4: both tags stay up to the end of the line (two screen spots, not one replacing the other)
    tag('l13', tA, `${st20.ahead} ahead`, { screen: [0.5, 0.1] }, { size: 'l', color: 'good' }); tag('l13', tB, `${st20.belowHalf} lost half`, { screen: [0.5, 0.2] }, { size: 'l', color: 'bad' });
  });
  block('l14', () => {
    cut(s('l14') - 0.05, 'player', { players: [S] }, 'push'); light([S], s('l14'), n('l14') - 0.1); dimOthers([S], s('l14') - 0.05, n('l14') - 0.1, 0.8, 0.2);
    tag('l14', W('l14', 'Three'), fmt(w20[S]), { player: S }); tag('l14', W('l14', 'richest'), `#${st20.order.indexOf(S) + 1}`, { player: S, y: 0.5 }, { color: 'scholar' });
  });
  block('l15', () => {
    cut(s('l15') - 0.05, 'player', { players: [S] }, 'pan', { players: [F] }); light([F], s('l15'), n('l15') - 0.1); dimOthers([S, F], s('l15') - 0.05, n('l15') - 0.1, 0.8, 0.2);
    tag('l15', W('l15', 'twenty-seven'), fmt(w20[F]), { player: F }, { color: 'fool' }); tag('l15', W('l15', 'Fifty-sixth'), `#${st20.order.indexOf(F) + 1}`, { player: F, y: 0.5 }, { color: 'fool' });
  });
  block('l16', () => {
    cut(s('l16') - 0.05, 'pair', { players: [S, F], coins: ['main'] }, 'hold'); light([S, F], s('l16'), n('l16') - 0.1, 0.8); dimOthers([S, F], s('l16') - 0.05, n('l16') - 0.1, 0.8, 0.2);
    const at = midOf(SEATP[S], SEATP[F]); flip('main', at, W('l16', 'Keep'), W('l16', 'Keep') + 1.1, 'heads', { tIn: s('l16') + 0.2, tOut: n('l16') + 0.1, turns: 4 });
  });

  /* c04 ---------------------------------------------------------------- */
  block('l17a', () => {
    const t0 = s('l17a') - 0.05, tA = s('l17a') + 0.1, tB = n('l17a') - 0.6;
    cut(t0, 'wide', { board: true }, 'hold'); const X = playSeg(t0, fair, each(20), each(200), tA, tB);
    tlCounter('l17a', X, tA, n('l17a') + 0.4); coinLoop('main', CENTRE, tA, tB);
  });
  block('l17', () => {
    cut(s('l17') - 0.05, 'high', { board: true }, 'orbit');
    const tA = W('l17', 'Six'), tB = W('l17', 'Twenty'), top6 = st200.order.slice(0, 6), out = []; for (let p = 0; p < N; p++) if (w200[p] < 1) out.push(p);
    light(top6, tA, tB - 0.2); light(out, tB - 0.1, n('l17') - 0.2);
    tag('l17', W('l17', 'half'), pct(st200.top6), { screen: [0.5, 0.1] }, { size: 'l' }); tag('l17', tB, `${st200.under1} out`, { screen: [0.5, 0.2] }, { size: 'l', color: 'bad' });
  });
  block('l18', () => {
    cut(s('l18') - 0.05, 'player', { players: [S] }, 'hold'); const tW = W('l18', 'Worker');
    cut(tW - 0.6, 'player', { players: [S] }, 'pan', { players: [Wk] }, true); light([S], s('l18'), tW); light([Wk], tW - 0.2, n('l18'));
    dimOthers([S, Wk], s('l18') - 0.05, n('l18') - 0.1, 0.8, 0.2);
    focusOn(s('l18') - 0.05, tW - 0.6, { players: [S], hard: true }); focusOn(tW - 0.6, n('l18'), { players: [Wk], hard: true });
  });
  block('l19', () => {
    cut(s('l19') - 0.05, 'tower', { players: [F] }, 'tilt', { players: [F] }); light([F], s('l19'), n('l19') - 0.3); dimOthers([F], s('l19') - 0.05, n('l19') - 0.3, 0.8, 0.2);
    tag('l19', W('l19', 'Fool'), fmt(w200[F]), { player: F }); tag('l19', W('l19', 'first'), `#${st200.order.indexOf(F) + 1}`, { player: F, y: 0.5 }, { color: 'fool' });
    hover('main', { f: SEATP[F].f + 0.9, r: SEATP[F].r }, s('l19') + 0.3, n('l19') - 0.05, { rate: 0.12 });
  });
  // l20 / l21 / l22a: the time-lapse ends just before the number is spoken, so the board shows that number when the tag appears
  block('l20', () => {
    // round 4: the board is settled (every pawn that is out has finished tipping over) LEAD s before the word, when the tag comes up
    const t37 = W('l20', 'Thirty-seven'), t0 = Math.max(e('l19') + 0.35, n('l19') - 0.7), tA = t0 + 0.1, tB = Math.max(tA + 0.8, t37 - LEAD - TIP - 0.1);
    cut(t0, 'wide', { board: true }, 'hold'); const X = playSeg(t0, fair, each(200), each(600), tA, tB);
    tlCounter('l20', X, tA, n('l20') + 0.4, t0);
    const out = []; for (let p = 0; p < N; p++) if (fair.at(each(600))[p] < 1) out.push(p);
    light(out, t37 - 0.15, n('l20') - 0.3, 0.8); tag('l20', t37, `${st600.under1} out`, { screen: [0.5, 0.15] }, { size: 'l', color: 'bad' });
  });
  block('l21', () => {
    const t0 = s('l21') - 0.05, tA = s('l21') + 0.05, tB = W('l21', 'half') - 0.25 - LEAD;
    cut(t0, 'wide', { board: true }, 'push'); const X = playSeg(t0, fair, each(600), each(2000), tA, tB);
    tlCounter('l21', X, tA, n('l21') + 0.4);
    tag('l21', W('l21', 'half'), pct(st2000.top1), { player: st2000.richest }, { size: 'l', color: 'fool' });
  });
  block('l22a', () => {
    const t0 = s('l22a') - 0.05, tA = s('l22a') + 0.1, tB = n('l22a') - 0.6;
    cut(t0, 'high', { board: true }, 'hold'); const X = playSeg(t0, fair, each(2000), FAIR_END, tA, tB);
    tlCounter('l22a', X, tA, n('l22a') + 0.4); coinLoop('main', CENTRE, tA, tB);
  });
  block('l22', () => {
    cut(s('l22') - 0.05, 'tower', { players: [F] }, 'hold');
    tag('l22', W('l22', 'ninety'), pct(stEnd.top1), { player: F }, { size: 'l', color: 'fool' });
    const standing = []; for (let p = 0; p < N; p++) if (fair.final[p] >= 1) standing.push(p);
    light(standing, W('l22', 'Three') - 0.1, n('l22') - 0.2);
    tag('l22', W('l22', 'Three'), `${stEnd.standing} standing`, { screen: [0.5, 0.15] }, { size: 'l' });
    cut(W('l22', 'One') - 0.1, 'player', { players: [F] }, 'pan', { players: [H] }, true);
  });
  block('l23', () => {
    // round 4: the king lands ON "made" (thud), the cone hat pops on right after and stays through "king" and the silence
    // round 5: landed, swapped AND cone hat seated by the end of "made" (hat = 1 before "king")
    // frame check 2026-11-15: the drop + 5 s identical hold did not read at 1 fps. The round-5 rule stays (landed and hat seated by the end
    // of "made", dump R4/R5), so the drop starts AT the line start and spans all of "The board has made" (milder ease-in: in frame longer);
    // a close cut on the tower top right at the landing so the cone-hat pop happens big, then a continuous move back to the whole tower
    const t0 = s('l23') - 0.05, tA = s('l23') - 0.02, tHat = Math.min(WE('l23', 'made', 0, 0.5), W('l23', 'king', 0, 0.9)) - 0.02;
    const tLand = Math.max(tA + 0.35, tHat - 0.3), tOff = has('l24') ? s('l24') - 0.05 : D, tClose = tLand + 0.02, tBack = Math.max(tHat + 1.2, tOff - 2.2);
    cut(t0, 'tower', { players: [F], king: true }, 'hold');
    cut(tClose, 'player', { king: true }, 'push');
    cut(tBack, 'tower', { players: [F], king: true }, 'hold', null, true);
    item(tA - 0.01, tOff, (St, t) => { const u = ramp(t, tA, tLand); St.king.on = F; St.king.drop = u * (1 + u) / 2; St.king.swap = ramp(t, tLand - 0.06, tLand + 0.06); St.king.hat = outCubic(ramp(t, tLand + 0.08, tHat)); });
    beat('king', tA, tLand, { on: F });
  });
  block('l24', () => {
    const t0 = s('l24') - 0.05, tWe = W('l24', 'We'), span = (tWe - 0.1 - s('l24')) / 3;
    cut(t0, 'wide', { board: true }, 'hold');
    let from = fair.final;
    G.AGAIN_KINGS.slice(3, 6).forEach((k, j) => {
      const a = s('l24') + j * span, wd = again.get(k);
      morphSeg(j ? a : t0, from, equal, a, a + 0.25 * span, { world: 'again' });
      playSeg(a + 0.28 * span, wd, 0, FAIR_END, a + 0.3 * span, a + 0.92 * span, { world: 'again' });
      from = wd.final;
    });
    cut(tWe - 0.05, 'top', { board: true }, 'hold');
    // a marker chip on every square, in the order of the first world each square won
    const first = new Map(); G.AGAIN.winners.forEach((p, k) => { if (!first.has(SEAT[p])) first.set(SEAT[p], k); });
    const order = [...first.entries()].sort((a, b) => a[1] - b[1]).map(([sq]) => sq);
    const tA = tWe + 0.2, tB = Math.max(tA + 1.5, WE('l24', 'once') + 0.2);
    // frame check 2026-11-15: the chips board no longer holds 9-13 s; from "But" two more worlds RUN (the first three again worlds of l02,
    // there only shown as end states), each with its final winner lit pulling away, then a tilt up the winner's tower through the silence
    const tBut = W('l24', 'But') - 0.1, tPull = W('l24', 'pulls'), tKeep = W('l24', 'keeps'), tEndL = has('l25') ? s('l25') - 0.05 : D;
    item(tA - 0.4, tBut, (St, t) => { order.forEach((sq, i) => { const tl = lerp(tA, tB, Math.pow(i / (order.length - 1), 0.85)); const c = ramp(t, tl - 0.35, tl); St.chips.push({ id: 'mark' + sq, at: sqAt(sq), count: c, color: 'red', lit: 0, label: 'won' }); }); });
    order.forEach((sq, i) => beat('chip', lerp(tA, tB, Math.pow(i / 63, 0.85)) - 0.35, lerp(tA, tB, Math.pow(i / 63, 0.85)), { stack: 'mark' + sq }));
    tag('l24', W('l24', 'three'), '300 worlds', { screen: [0.5, 0.07] }, { size: 'l' });
    if (G.AGAIN.winners.length !== 300 || first.size !== 64) warn(`l24: AGAIN has ${G.AGAIN.winners.length} worlds, ${first.size} winning squares`);
    const [kA, kB] = G.AGAIN_KINGS.slice(0, 2), winA = G.AGAIN.winners[kA], winB = G.AGAIN.winners[kB], tSw = Math.max(tBut + 2.2, W('l24', 'One') - 0.15);
    cut(tBut, 'high', { board: true }, 'push');
    playSeg(tBut, again.get(kA), 0, FAIR_END, tBut + 0.1, tSw - 0.35, { world: 'again' });
    light([winA], lerp(tBut, tSw, 0.45), tSw - 0.1);
    cut(tSw, 'wide', { board: true, players: [winB] }, 'hold');   // the l02 again-world framing (a push started inside the crowd in Neon)
    const tKp = Math.max(tSw + 1.4, tKeep - 0.05);
    playSeg(tSw, again.get(kB), 0, FAIR_END, tSw + 0.05, tKp, { world: 'again' });
    light([winB], Math.min(tPull - 0.3, lerp(tSw, tKp, 0.4)), tEndL - 0.2);
    cut(tKp, 'tower', { players: [winB] }, 'tilt', { players: [winB] });
  });

  /* c05 ---------------------------------------------------------------- */
  let c05 = has('l25') ? s('l25') - 0.05 : null; const c05end = has('l30') ? s('l30') - 0.05 : D;
  if (c05 != null) { staticSeg(c05, equal, { world: 'demo' }); present(c05, c05end, 0); item(c05, c05end, (St) => { St.world = 'demo'; St.flips = null; }); }
  block('l25', () => {
    cut(c05, 'coin', { coins: ['main'] }, 'hold');
    const tF = W('l25', 'fair');
    hover('main', CENTRE, c05, n('l25') + 0.1, { lift: 0.6, angle: (t) => 0.5 * sramp(t, tF - 0.8, tF), yawRate: 0.04, labels: ['50%', '50%'], fadeOut: false });
    // round 4: both '50%' up from the start of the line (the coin is the whole picture), held through the silence
    tag('l25', s('l25') + 0.35, '50%', { coin: 'main', side: 'heads' }); tag('l25', s('l25') + 0.5, '50%', { coin: 'main', side: 'tails' }, { k: 2 });
  });
  const demoAt = { f: 4.5, r: 4.5 }, OFF = { f: 11, r: 6 };
  block('l26', () => {
    cut(s('l26') - 0.05, 'demo', { extras: ['demo'] }, 'push');
    const tL = W('l26', 'Lose'), tWn = W('l26', 'Win'), lost = G.FRACTION * G.START, won = G.FRACTION * (G.START - lost);
    const tEnd = has('l28') ? s('l28') - 0.05 : D;
    item(s('l26') - 0.05, tEnd, (St, t) => {
      const back = t >= tWn + 0.6, x = addEx(St, ex('demo', 'pawn', demoAt, { coins: G.START - (t >= tL ? lost : 0) + (back ? won : 0), rings: 0 }));
      if (has('l27')) { const g1 = Math.max(s('l27') + 0.3, W('l27', 'four', 0, 0.4) - 0.1), g0 = Math.max(s('l27') - 0.05, g1 - 0.6); x.ghost = t >= g0 ? lerp(x.coins, G.START, sramp(t, g0, g1)) : 0; }   // complete by "four coins are gone" (round 4)
      if (t >= tL && t < tL + 0.8) St.moves.push(mv('lose', 'disc', lost, { extra: 'demo' }, OFF, inOut(ramp(t, tL, tL + 0.8))));
      if (t >= tWn && t < tWn + 0.6) St.moves.push(mv('win', 'disc', won, OFF, { extra: 'demo' }, inOut(ramp(t, tWn, tWn + 0.6))));
    });
    tag('l26', W('l26', 'hundred'), fmt(G.START), { extra: 'demo' }); tag('l26', W('l26', 'eighty'), fmt(G.START - lost), { extra: 'demo' }, { color: 'bad', until: tWn, replaced: true });
    tag('l26', W('l26', 'ninety-six'), fmt(G.START - lost + won), { extra: 'demo' }, { color: 'good' });
    if (Math.round(G.START - lost + won) !== 96) warn('l26: 100 -> 80 -> 96 does not come out of FRACTION');
  });
  block('l27', () => { cut(s('l27') - 0.05, 'demo', { extras: ['demo'] }, 'hold'); tag('l27', W('l27', 'four'), `-${fmt(G.START - (G.START * (1 - G.FRACTION) * (1 + G.FRACTION)))}`, { extra: 'demo' }, { color: 'bad' }); });
  block('l28', () => {
    const t0 = s('l28') - 0.05, short0 = 80, tall0 = 800, stake = G.FRACTION * short0, tB = W('l28', 'bet');
    const pS = { f: 3.7, r: 4.5 }, pT = { f: 5.3, r: 4.5 }, lift = { y: 0.6 };
    cut(t0, 'demo', { extras: ['short', 'tall'] }, 'push');
    // l29: 20 losses on both, accelerating, the last one just before "never"
    const losses = []; if (has('l29')) { const a = s('l29') + 0.4, b = W('l29', 'never') - 0.3, m = 20; for (let i = 0; i < m; i++) losses.push(lerp(a, b, 1 - Math.pow(1 - i / (m - 1), 1.6))); }
    let sh = short0; const stakes = losses.map(() => { const st = G.FRACTION * sh; sh -= st; return st; });
    const tEnd = c05end;
    item(t0, tEnd, (St, t) => {
      let cs = short0, ct = tall0;
      const lifted = t >= tB;   // the first stake is lifted on "bet" and flies off with the first loss
      if (lifted) { cs -= stake; ct -= stake; }
      losses.forEach((tl, i) => { if (t >= tl) { if (i) { cs -= stakes[i]; ct -= stakes[i]; } } });
      const xs = addEx(St, ex('short', 'pawn', pS, { coins: Math.max(0, cs), rings: 0 })), xt = addEx(St, ex('tall', 'pawn', pT, { coins: ct, rings: 0 }));
      if (lifted && (!losses.length || t < losses[0] + 0.5)) {
        const go = losses.length && t >= losses[0], u = go ? inOut(ramp(t, losses[0], losses[0] + 0.5)) : outCubic(ramp(t, tB, tB + 0.6));
        St.moves.push(mv('slice-short', 'disc', stake, go ? { extra: 'short', y: 0.6 } : { extra: 'short' }, go ? OFF : { extra: 'short', y: 0.6 }, u));
        St.moves.push(mv('slice-tall', 'disc', stake, go ? { extra: 'tall', y: 0.6 } : { extra: 'tall' }, go ? OFF : { extra: 'tall', y: 0.6 }, u));
      }
      losses.forEach((tl, i) => { if (i && t >= tl && t < tl + 0.5) { const u = inOut(ramp(t, tl, tl + 0.5)); St.moves.push(mv(`loss${i}s`, 'disc', stakes[i], { extra: 'short' }, OFF, u)); St.moves.push(mv(`loss${i}t`, 'disc', stakes[i], { extra: 'tall' }, OFF, u)); } });
      if (losses.length) { const tf = losses[losses.length - 1]; xs.down = smooth(ramp(t, tf, tf + TIP)); xs.dim = xs.down; }
    });
    if (losses.length) beat('fall', losses[losses.length - 1], losses[losses.length - 1] + TIP, { who: 'short' });
    tag('l28', W('l28', 'fifth'), pct(100 * stake / short0), { extra: 'short' }, { color: 'bad' }); tag('l28', W('l28', 'same', 0, 0.75), pct(100 * stake / tall0), { extra: 'tall' }, { color: 'good' });
  });
  block('l29', () => cut(s('l29') - 0.05, 'demo', { extras: ['short', 'tall'] }, 'hold'));
  block('l30', () => {
    const t0 = s('l30') - 0.05; cut(t0, 'high', { players: st200.order.slice(0, 6) }, 'orbit');
    staticSeg(t0, w200, { flips: each(200) }); hover('main', { f: 4.5, r: 5.5 }, t0, n('l30'), { lift: 0.75, rate: 0.1 });
  });

  /* c06 ---------------------------------------------------------------- */
  const skBack = { f: 4.5, r: -0.75 }, skFwd = { f: 4.5, r: -0.3 };
  const skeptic = (t0, t1, tF, back) => item(t0, t1, (St, t) => { const u = sramp(t, tF, tF + 0.8) * (back ? 1 - sramp(t, back, back + 0.8) : 1); St.skeptic.forward = Math.max(St.skeptic.forward, u); });
  // round 4: the Skeptic's presence is derived in state() (from l31 on, whenever the 64-seat board is shown; see SK_ON)
  const SK_ON = has('l31') ? s('l31') - 0.05 : D + 1;
  block('l31', () => {
    const t0 = s('l31') - 0.05, tR = W('l31', 'Real'); cut(t0, 'skeptic', { skeptic: true, board: true }, 'hold');
    staticSeg(t0, w200, { flips: each(200) }); morphSeg(tR - 0.3, w200, equal, tR - 0.3, tR + 0.6, { world: 'hats' });
    skeptic(t0, n('l31') + 1, W('l31', 'typing') - 0.3, Math.min(e('l31'), n('l31') - 0.85)); beat('objection', W('l31', 'typing') - 0.3, W('l31', 'typing') + 0.5);
    light([S, Wk, H, F], tR + 0.6, W('l31', 'smarter') - 0.2, 0.6);
    hopAt(S, W('l31', 'smarter')); light([S], W('l31', 'smarter'), W('l31', 'smarter') + 0.6);
    hopAt(Wk, W('l31', 'harder')); light([Wk], W('l31', 'harder'), W('l31', 'harder') + 0.6);
    hopAt(H, W('l31', 'more')); light([H], W('l31', 'more'), W('l31', 'more') + 0.6);
    tag('l31', W('l31', 'Skeptic'), 'THE SKEPTIC', { skeptic: true }, { color: 'skeptic', kind: 'name' });
  });
  block('l32', () => {
    cut(s('l32') - 0.05, 'player', { players: [S], coins: ['main'] }, 'push'); light([S], s('l32'), n('l32') - 0.1); dimOthers([S], s('l32') - 0.05, n('l32') - 0.1, 0.8, 0.2);
    flip('main', { f: SEATP[S].f + 0.7, r: SEATP[S].r - 0.3 }, s('l32') + 0.2, W('l32', 'wins'), 'heads', { tOut: n('l32'), turns: 3 });
    tag('l32', W('l32', 'fifty-five'), '55 / 45', { player: S }, { color: 'scholar' });
  });
  block('l33', () => {
    cut(s('l33') - 0.05, 'player', { players: [Wk], coins: ['main', 'second'] }, 'hold'); light([Wk], s('l33'), n('l33') - 0.1); dimOthers([Wk], s('l33') - 0.05, n('l33') - 0.1, 0.8, 0.2);
    const tA = W('l33', 'plays'), tT = W('l33', 'twice'), p = SEATP[Wk];
    flip('main', { f: p.f - 0.45, r: p.r - 0.3 }, tA, tT + 0.5, 'heads', { tOut: n('l33'), turns: 4 }); flip('second', { f: p.f + 0.45, r: p.r - 0.3 }, tA + 0.15, tT + 0.75, 'tails', { tOut: n('l33'), turns: 4 });
    tag('l33', tT, 'x2 flips', { player: Wk }, { color: 'worker' });
  });
  // hats world start: the Heir's 1,000 coins grow in l34
  const heirGrow = has('l34') ? [W('l34', 'starts'), WE('l34', 'thousand') + 0.2] : null;
  block('l34', () => {
    cut(s('l34') - 0.05, 'tower', { players: [H] }, 'tilt', { players: [H] }); light([H], s('l34'), n('l34') - 0.1); dimOthers([H], s('l34') - 0.05, n('l34') - 0.1, 0.8, 0.2);
    item(s('l34') - 0.05, has('l35') ? W('l35', 'this') - 0.05 : D, (St, t) => { St.players[H].coins = lerp(G.START, hatsStart[H], inOut(ramp(t, heirGrow[0], heirGrow[1]))); });
    tag('l34', W('l34', 'thousand'), fmt(hatsStart[H]), { player: H }, { color: 'heir' });
  });
  block('l35', () => {
    cut(s('l35') - 0.05, 'player', { players: [F] }, 'hold'); hopAt(F, W('l35', 'nothing'), 0.5);
    const t0 = W('l35', 'this') - 0.05, tA = t0 + 0.1, tB = n('l35') - 0.4;
    cut(t0, 'wide', { board: true }, 'hold'); playSeg(t0, hats, 0, hats.flips, tA, tB, { world: 'hats' });
    const tUp = s('l35') - 0.05; counterItem(tUp, n('l35') + 0.3, 'WORLDS', (t) => 10000 * smooth(ramp(t, tA, tB)), (t) => sramp(t, tUp, tUp + 0.25) * (1 - sramp(t, n('l35'), n('l35') + 0.3)));
  });
  // the tally (l36 - l40), round 4: a clean bar chart. At the cut the 60 plain players except the nobody leave the board; the four
  // hats and the nobody stand in ONE row on equal 100-coin towers, each chip column directly in front of its owner (nearer the camera).
  // Left to right: Heir 47, Scholar 6, Worker 2, Fool <1, Nobody 45 (the two tall columns at the ends, the small ones between them).
  const TL = G.TALLY.richest, TALLY_ORDER = ['heir', 'scholar', 'worker', 'fool', 'nobody'];
  const owners = { heir: H, scholar: S, worker: Wk, fool: F, nobody: NOBODY };
  const TROW = 4.9, TCOL = 3.95, TGAP = 1.5;
  const rowAt = Object.fromEntries(TALLY_ORDER.map((k, i) => [k, { f: 4.5 + (i - 2) * TGAP, r: TROW }]));
  const colAt = (k) => ({ f: rowAt[k].f, r: TCOL });
  const TALLY_P = TALLY_ORDER.map((k) => owners[k]), TALLY_C = TALLY_ORDER.map((k) => 'tally-' + k);
  const tally0 = has('l36') ? s('l36') - 0.05 : D, tallyEnd = has('l41') ? s('l41') - 0.05 : D;
  const colCount = {};   // key -> (t) => count
  const grow = (key, n0, n1, tA, tB) => { const prev = colCount[key]; colCount[key] = (t) => (t < tA ? (prev ? prev(t) : n0) : lerp(n0, n1, ramp(t, tA, tB))); for (let i = 0; i < Math.abs(n1 - n0); i++) beat('chip', lerp(tA, tB, i / Math.abs(n1 - n0)), lerp(tA, tB, (i + 1) / Math.abs(n1 - n0)), { stack: 'tally-' + key }); };
  const tallyTagEnd = has('l40') ? W('l40', 'run', 0, 0.3) : tallyEnd;
  block('l36', () => {
    cut(tally0, 'tally', { players: TALLY_P, chips: TALLY_C }, 'push');
    staticSeg(tally0, equal, { world: 'hats', flips: 0 });
    item(tally0, tallyEnd, (St) => {
      const keep = new Set(TALLY_P); for (const P of St.players) if (!keep.has(P.id)) P.present = 0;
      for (const k of TALLY_ORDER) St.players[owners[k]].at = rowAt[k];
    });
    grow('heir', 0, TL.heir, s('l36') + 0.3, Math.max(s('l36') + 1.5, W('l36', 'forty-seven') + 0.1));   // complete as the voice says the number
    item(tally0, tallyEnd, (St, t) => { for (const k of TALLY_ORDER) St.chips.push({ id: 'tally-' + k, at: colAt(k), count: colCount[k] ? Math.max(0, colCount[k](t)) : 0, color: 'red', lit: 0, label: k }); });
    tag('l36', W('l36', 'forty-seven'), fmt(TL.heir), { chips: 'tally-heir' }, { color: 'heir', until: tallyTagEnd });
    focusOn(tally0, n('l36'), { players: [H], chips: ['tally-heir'], hard: false });
  });
  block('l37', () => {
    const t6 = W('l37', 'Six'); grow('scholar', 0, TL.scholar, t6 - 0.7, t6 + 0.1); tag('l37', t6, fmt(TL.scholar), { chips: 'tally-scholar' }, { color: 'scholar', until: tallyTagEnd });
    focusOn(s('l37') - 0.05, n('l37'), { players: [S], chips: ['tally-scholar'], hard: false });
  });
  block('l38', () => {
    const t2 = W('l38', 'Two'), tL1 = W('l38', 'Less'), tU = W('l38', 'ugly'), tMore = W('l38', 'more', -1, 0.9);
    grow('worker', 0, TL.worker, t2 - 0.4, t2 + 0.1); grow('fool', 0, Math.max(1, Math.round(G.TALLY_PCT.richest.fool)), tL1 - 0.3, tL1 + 0.1);
    tag('l38', t2, fmt(TL.worker), { chips: 'tally-worker' }, { color: 'worker', until: tallyEnd }); tag('l38', tL1, G.TALLY_PCT.richest.fool < 1 ? '<1' : fmt(TL.fool), { chips: 'tally-fool' }, { color: 'fool', until: tallyEnd });
    // the Worker drains to its end of the shown hats world (0.2 coins) and tips over on "ugly part"
    const tD0 = tU - 0.6, tD1 = tU, wEnd = hatsF[Wk];
    item(tD0, tallyEnd, (St, t) => { const P = St.players[Wk]; P.coins = lerp(G.START, wEnd, inOut(ramp(t, tD0, tD1))); P.down = smooth(ramp(t, tD1, tD1 + TIP)); P.dim = Math.max(P.dim, P.down); });
    beat('fall', tD1, tD1 + TIP, { who: Wk });
    tag('l38', W('l38', 'seventy'), `under 10 coins: ${G.TALLY.broke.worker} in 100`, { player: Wk }, { color: 'worker', kind: 'note' });
    tag('l38', W('l38', 'Fool', -1, 0.75), `under 10 coins: ${G.TALLY.broke.fool} in 100`, { player: F }, { color: 'fool', kind: 'note' });
    const p = rowAt.worker; flip('main', { f: p.f - 0.45, r: p.r - 0.2 }, tMore, tMore + 0.9, 'heads', { tOut: n('l38'), turns: 3 }); flip('second', { f: p.f + 0.45, r: p.r - 0.2 }, tMore + 0.12, tMore + 1.05, 'tails', { tOut: n('l38'), turns: 3 });
    focusOn(s('l38') - 0.05, n('l38'), { players: [Wk, F], chips: ['tally-worker', 'tally-fool'], hard: false });
  });
  block('l39', () => {
    const t45 = W('l39', 'forty-five'); grow('nobody', 0, TL.nobody, t45 - 1.6, t45 + 0.1); light([NOBODY], t45 - 1.2, n('l39'));
    tag('l39', t45, fmt(TL.nobody), { chips: 'tally-nobody' }, { until: tallyEnd });
    focusOn(s('l39') - 0.05, n('l39'), { players: [NOBODY], chips: ['tally-nobody'], hard: false });
  });
  block('l40', () => {
    focusOn(s('l40') - 0.05, tallyEnd, { players: [H, S], chips: ['tally-heir', 'tally-scholar'], hard: false });
    const tA = W('l40', 'run'), tB = W('l40', 'likely') - 0.1, TT = G.TALLY.tenTimesLonger;
    const go = TL.heir - TT.heir, arrive = TT.scholar - TL.scholar, departs = Array.from({ length: go }, (_, i) => lerp(tA, tB - 0.6, i / Math.max(1, go - 1)));
    const prevH = colCount.heir, prevS = colCount.scholar;
    colCount.heir = (t) => (t < tA ? prevH(t) : TL.heir - departs.reduce((a, d) => a + ramp(t, d, d + 0.25), 0));
    colCount.scholar = (t) => (t < tA ? prevS(t) : TL.scholar + departs.slice(0, arrive).reduce((a, d) => a + ramp(t, d + 0.35, d + 0.6), 0));
    item(tA, tB + 0.2, (St, t) => { departs.slice(0, arrive).forEach((d, i) => { if (t >= d + 0.25 && t < d + 0.6) St.moves.push(mv('chip' + i, 'chip', 1, { chips: 'tally-heir' }, { chips: 'tally-scholar' }, ramp(t, d + 0.25, d + 0.6))); }); });
    const tUp = s('l40') - 0.05; counterItem(tUp, n('l40'), 'FLIPS EACH', (t) => lerp(200, 2000, inOut(ramp(t, tA, tB))), (t) => sramp(t, tUp, tUp + 0.25) * (1 - sramp(t, n('l40') - 0.3, n('l40'))));
    tag('l40', W('l40', 'likely'), fmt(TT.scholar), { chips: 'tally-scholar' }, { color: 'scholar' }); tag('l40', W('l40', 'winner'), fmt(TT.heir), { chips: 'tally-heir' }, { color: 'heir' });
  });

  /* c07 ---------------------------------------------------------------- */
  // the talent model (a toy version of Pluchino et al.): talent = pawn size; gold doubles a stack only if the talent "uses" it, red halves it
  const talent = (() => {
    for (let seed = 1; seed < 4000; seed++) {
      const r = G.rng(9000 + seed), g = () => { let u = 0; for (let k = 0; k < 6; k++) u += r(); return (u - 3) / Math.sqrt(0.5); };
      // round 5: a wider bell readable at phone size: most within ~0.9..1.1, long tails to ~0.7 (least) and ~1.6 (the few brilliant)
      const size = (x) => clamp(x >= 0 ? 1 + 0.08 * x + 0.03 * x * x * x : 1 + 0.08 * x + 0.012 * x * x * x, 0.7, 1.6);
      const scale = Array.from({ length: N }, (_, p) => (CASTS.includes(p) ? 1 : size(g())));
      const drops = [], w = new Float64Array(N).fill(G.START);
      for (let k = 0; k < 80; k++) { const p = Math.floor(r() * N), gold = r() < 0.5, used = gold && r() < clamp((scale[p] - 0.75) / 0.6, 0.05, 0.95); drops.push({ p, gold, used, ts: r() }); w[p] = gold ? (used ? w[p] * 2 : w[p]) : w[p] / 2; }
      const best = scale.indexOf(Math.max(...scale)), rich = G.stats(w).richest;
      if (CASTS.includes(rich) || rich === best || Math.abs(scale[rich] - 1) > 0.04 || w[best] > G.START || w[rich] < 800 || w[rich] > 3300 || Math.max(...scale) < 1.5 || Math.min(...scale) > 0.76 || scale.filter((x) => x >= 1.3).length > 4) continue;
      drops.sort((a, b) => a.ts - b.ts); return { seed, scale, drops, final: w, best, rich };
    }
    warn('talent: no seed found'); return null;
  })();
  const c07board = has('l41') ? s('l41') - 0.05 : null, c07end = has('l44') ? s('l44') - 0.05 : D;
  block('l41', () => {
    cut(c07board, 'wide', { board: true }, 'push'); staticSeg(c07board, equal, { world: 'talent' });
    const tA = W('l41', 'Talent'), tB = Math.max(tA + 1.2, W('l41', 'middle'));   // round 5: every pawn sized by "...in the middle"
    item(c07board, c07end, (St, t) => { St.world = 'talent'; St.flips = null; if (talent) for (let p = 0; p < N; p++) St.players[p].scale = lerp(1, talent.scale[p], sramp(t, lerp(tA, tB - 0.6, (SEATP[p].f - 1 + (SEATP[p].r - 1) * 0.3) / 9.1), lerp(tA, tB - 0.6, (SEATP[p].f - 1 + (SEATP[p].r - 1) * 0.3) / 9.1) + 0.6)); });
    tag('l41', W('l41', 'twenty'), 'Pluchino, Biondo, Rapisarda 2018', { screen: [0.5, 0.12] }, { size: 's', kind: 'source' });
    tag('l41', W('l41', 'thousand'), '1,000 people, 40 years', { screen: [0.5, 0.18] }, { size: 's', kind: 'note' });
  });
  block('l42', () => {
    cut(s('l42') - 0.05, 'high', { board: true }, 'hold'); if (!talent) return;
    const tA = s('l42') + 0.1, tB = n('l42') - 0.4, FALL = 0.7, hitT = talent.drops.map((d, i) => lerp(tA + FALL, tB, i / (talent.drops.length - 1)));
    const hist = Array.from({ length: N }, () => []); talent.drops.forEach((d, i) => hist[d.p].push({ t: hitT[i], k: d.gold ? (d.used ? 2 : 1) : 0.5 }));
    item(tA, c07end, (St, t) => {
      for (let p = 0; p < N; p++) { let c = G.START; for (const h of hist[p]) c = h.t > t ? c : lerp(c, c * h.k, smooth(ramp(t, h.t, h.t + 0.3))); St.players[p].coins = c; St.players[p].down = c < 1 ? 1 : 0; }
      talent.drops.forEach((d, i) => { if (t >= hitT[i] - FALL && t < hitT[i]) St.rain.push({ id: 'drop' + i, kind: d.gold ? 'gold' : 'red', to: { player: d.p }, u: ramp(t, hitT[i] - FALL, hitT[i]), used: d.used }); });
    });
    talent.drops.forEach((d, i) => beat('rain', hitT[i] - FALL, hitT[i], { who: d.p, kind: d.gold ? 'gold' : 'red', used: d.used }));
  });
  block('l43', () => {
    if (!talent) return;
    // round 5: on the tall pawn (lit, tag) through "...the most talented one."; the pan starts on "It was somebody" and is finished
    // by "average" (continuous hold on the rich pawn after it); 'richest' up from "It"
    cut(s('l43') - 0.05, 'player', { players: [talent.best] }, 'hold');
    const tIt = W('l43', 'It'), tAv = Math.max(tIt + 0.6, W('l43', 'average'));
    cut(tIt - 0.05, 'player', { players: [talent.best] }, 'pan', { players: [talent.rich] }, true);
    cut(tAv, 'player', { players: [talent.rich] }, 'hold', null, true);
    light([talent.best], W('l43', 'most') - 0.1, tIt - 0.05); light([talent.rich], tIt - 0.1, n('l43'));
    tag('l43', W('l43', 'most'), 'most talented', { player: talent.best }, { kind: 'note' }); tag('l43', tIt, 'richest', { player: talent.rich }, { kind: 'note', color: 'good' });
  });
  // the real board (l44 - l45a): 100 discs = all US household wealth (1 disc = 1 %), board cleared
  const realEnd = has('l46') ? s('l46') - 0.05 : D, REAL1 = { f: 4.7, r: 6.2 }, REAL50 = { f: 5.7, r: 6.2 }, B90 = { f: 3.5, r: 6.2 };
  // frame check 2026-11-15: the l45 gather (thin layer -> one small stack) runs over "One stack. Less than one square." (~3 s), not in the first second
  const g45 = has('l45') ? [W('l45', 'One') + 0.1, Math.max(W('l45', 'One') + 2.2, W('l45', 'More') - 0.3)] : null;
  block('l44', () => {
    const t0 = s('l44') - 0.05; cut(t0, 'wide', { board: true, extras: ['real1', 'real50'] }, 'hold');
    staticSeg(t0, equal, { world: 'empty' }); present(t0, realEnd, 0); item(t0, realEnd, (St) => { St.world = 'empty'; St.flips = null; });
    const tT = W('l44', 'third'), tR = W('l44', 'richest') - 0.2, tBo = W('l44', 'bottom');
    item(t0, realEnd, (St, t) => {
      addEx(St, ex('real1', 'tower', REAL1, { coins: 325 * inOut(ramp(t, tR, tT + 0.2)), rings: 0 }));
      addEx(St, ex('real50', 'layer', REAL50, { coins: 23, rings: 0, present: sramp(t, tBo - 0.2, tBo + 0.4), lit: pulse(t, tBo - 0.2, 0.4, 1.6, 0.6), rect: { f0: 0.5, r0: 0.5, f1: 8.5, r1: 4.5 }, gather: g45 ? inOut(ramp(t, g45[0], g45[1])) : 0 }));
      if (has('l45a')) { const a = W('l45a', 'board'); addEx(St, ex('board90', 'tower', B90, { coins: Math.round(stEnd.top1 * 10) * inOut(ramp(t, a - 0.2, a + 1.2)), present: sramp(t, a - 0.3, a), rings: 0 })); }
    });
    tag('l44', tT, 'top 1%: 32.5%', { extra: 'real1' }, { color: 'gold' }); tag('l44', W('l44', 'two'), 'bottom half: 2.3%', { extra: 'real50' });
    beat('appear', tR, tT + 0.2, { who: 'real1' });
  });
  block('l45', () => {
    // frame check 2026-11-15: high board shot while the layer slides together (lit), a tilt from the small stack up the 1 % tower on
    // "More than ten times taller", then the two side by side on "thirty-two squares"
    const tMore = W('l45', 'More') - 0.1, tTw = W('l45', 'thirty-two') - 0.15, tTl = W('l45', 'taller');
    cut(s('l45') - 0.05, 'high', { board: true, extras: ['real1', 'real50'] }, 'push');
    beat('appear', g45[0], g45[1], { who: 'real50' });
    cut(tMore, 'tower', { extras: ['real50'] }, 'tilt', { extras: ['real1'] });
    if (tTw - tMore > 1.5) cut(tTw, 'demo', { extras: ['real1', 'real50'] }, 'push');
    item(s('l45') - 0.05, n('l45'), (St, t) => { for (const x of St.extras) {
      if (x.id === 'real50') x.lit = Math.max(x.lit, 0.7 * sramp(t, g45[0], g45[0] + 0.3) * (1 - sramp(t, g45[1], g45[1] + 0.4)), pulse(t, tTw, 0.3, 1.2, 0.5));
      if (x.id === 'real1') x.lit = Math.max(x.lit, pulse(t, tTl - 0.1, 0.3, 1.0, 0.5)); } });
  });
  block('l45a', () => {
    cut(s('l45a') - 0.05, 'demo', { extras: ['real1'] }, 'pull', { extras: ['real1', 'board90'] });
    tag('l45a', W('l45a', 'board'), `the board: ${pct(stEnd.top1)}`, { extra: 'board90' }, { color: 'fool' }); tag('l45a', W('l45a', 'real'), 'the real top 1%: 32.5%', { extra: 'real1' }, { color: 'gold' });
  });
  block('l46', () => {
    const t0 = s('l46') - 0.05, tEnd = has('l48') ? s('l48') - 0.05 : D; cut(t0, 'demo', { extras: ['heir', 'heirTower'] }, 'hold');
    staticSeg(t0, equal, { world: 'empty' }); present(t0, tEnd, 0); item(t0, tEnd, (St) => { St.world = 'empty'; St.flips = null; });
    const HP = { f: 3.6, r: 4.2 }, HT = { f: 4.3, r: 4.2 }, SP = { f: 5.4, r: 4.2 }, t91 = W('l46', 'ninety-one'), tIn = W('l46', 'inherited'), tJ = tIn + 0.15, tJd = 0.6;
    const scholarBuild = has('l47') ? [W('l47', 'ninety-six'), Math.max(W('l47', 'ninety-six') + 2, W('l47', 'that') + 0.2)] : null;
    item(t0, tEnd, (St, t) => {
      const landed = t >= tJ + tJd;
      addEx(St, ex('heir', 'pawn', landed ? HT : HP, { coins: landed ? 298 : 0, rings: 0, role: 'heir', hat: 1, jump: t >= tJ && !landed ? { to: { extra: 'heirTower' }, u: ramp(t, tJ, tJ + tJd) } : null }));
      if (!landed) addEx(St, ex('heirTower', 'tower', { f: lerp(11, HT.f, outCubic(ramp(t, t91, tIn))), r: HT.r }, { coins: 298, rings: 0 }));
      for (let k = 0; k < 7; k++) addEx(St, ex('builder' + k, 'pawn', { f: 1.6 + k * 0.95, r: 6.6 + (k % 2) * 0.35 }, { down: 1, dim: 1, lit: has('l47') ? 0.8 * pulse(t, W('l47', 'nobody') - 0.1, 0.4, 2.5, 0.8) : 0 }));
      if (scholarBuild && t >= s('l47') - 0.3) { const k = 38.7 * ramp(t, scholarBuild[0], scholarBuild[1]), whole = Math.floor(k); addEx(St, ex('scholar', 'pawn', SP, { coins: k >= 38.7 ? 387 : 10 * (whole + smooth(k - whole)), rings: 0, role: 'scholar', hat: 1, present: sramp(t, s('l47') - 0.3, s('l47') + 0.1) })); }
    });
    beat('jump', tJ, tJ + tJd, { who: 'heir' });
    tag('l46', t91, '91 heirs, $298 billion', { extra: 'heirTower' }, { color: 'heir' }); tag('l46', W('l46', 'recent'), 'UBS, year to April 2025', { screen: [0.5, 0.12] }, { size: 's', kind: 'source' });
  });
  block('l47', () => {
    cut(s('l47') - 0.05, 'demo', { extras: ['heir', 'scholar'] }, 'hold');
    const tN = W('l47', 'nobody'); cut(tN - 0.1, 'demo', { extras: ['heir', 'scholar'] }, 'rack', { extras: ['builder0', 'builder3', 'builder6'] }, true);
    tag('l47', W('l47', 'ninety-six'), '196 self-made, $387 billion', { extra: 'scholar' }, { color: 'scholar' });
  });

  /* c08 ---------------------------------------------------------------- */
  block('l48', () => {
    const t0 = s('l48') - 0.05; cut(t0, 'skeptic', { skeptic: true, board: true }, 'hold');
    const tm = W('l48', 'moves'), tg = W('l48', 'grows'), f1 = fair.flip(1), f2 = fair.flip(2);
    seg(t0, (St, t) => {
      setCoins(St, equal, { flips: 0 });
      for (const [f, ta] of [[f1, tm], [f2, tg]]) { const lo = f.aWins ? f.b : f.a, hi = f.aWins ? f.a : f.b; if (t >= ta) { const u = inOut(ramp(t, ta, ta + 0.8)); if (u < 1) { St.players[lo].coins -= f.stake; St.moves.push(mv('trade' + ta.toFixed(2), 'disc', f.stake, { player: lo }, { player: hi }, u)); } else { St.players[lo].coins -= f.stake; St.players[hi].coins += f.stake; } } }
    });
    skeptic(t0, n('l48') + 1, W('l48', 'objection') - 0.3, Math.min(e('l48'), n('l48') - 0.85)); beat('objection', W('l48', 'objection') - 0.3, W('l48', 'objection') + 0.5);
    const tUp48 = s('l48') - 0.05; counterItem(tUp48, n('l48'), 'TOTAL', () => N * G.START, (t) => sramp(t, tUp48, tUp48 + 0.25) * (1 - sramp(t, n('l48') - 0.3, n('l48'))), 'total');   // trades never change the total
  });
  block('l49', () => {
    // frame-check fix 2026-11-15: the board is CLEARED (like c05) so the coin and ONE demo tower are the whole picture, on the
    // centre squares. Coin close-up (two turns, lands crown up on "Heads") -> cut to coin + tower: 100 grows to 150 on "grows by
    // half", the coin flips to the plain side on "Tails", the tower shrinks to 90 on "shrinks"; orbit on "Nobody"; the coin spins
    // through "on average" and glints on "money". Something changes every 1-3 s.
    const t0 = s('l49') - 0.05, tEnd = n('l49') - 0.05, CP = { f: 3.7, r: 4.5 }, DP = { f: 5.3, r: 4.5 };
    const tH = W('l49', 'Heads'), tT = W('l49', 'Tails'), tG = W('l49', 'grows'), tS2 = W('l49', 'shrinks'), tPc = W('l49', 'percent'), tHalf = W('l49', 'half');
    const tNb = W('l49', 'Nobody'), tAv = W('l49', 'average'), tMo = W('l49', 'money'), tDemo = tH - 0.3, tF0 = tT - 0.45, tF1 = tT + 0.15;
    cut(t0, 'coin', { coins: ['main'] }, 'push');
    cut(tDemo, 'demo', { extras: ['demo'], coins: ['main'] }, 'hold');
    cut(tNb - 0.1, 'demo', { extras: ['demo'], coins: ['main'] }, 'orbit', null, true);
    staticSeg(t0, equal, { world: 'demo' }); present(t0, tEnd, 0); item(t0, tEnd, (St) => { St.world = 'demo'; St.flips = null; });
    item(t0, tEnd, (St, t) => {
      const C = coinsOf(St, 'main'); C.at = CP; C.present = 1; C.labels = ['+50%', '-40%'];
      let a, lift = 0.6;
      if (t < tH) a = -2 + 2 * inOut(ramp(t, t0 + 0.2, tH));                         // two full turns, crown up on "Heads"
      else if (t < tF0) a = 0;
      else if (t < tAv - 0.1) { const u = ramp(t, tF0, tF1); a = 1.5 * inOut(u); lift = 0.6 + 0.35 * 4 * u * (1 - u); }   // flips to the plain side on "Tails"
      else a = 1.5 + 1.2 * (t - (tAv - 0.1));                                         // spins through "on average ... makes money"
      C.angle = a; C.lift = lift; C.yaw = 0.03 * (t - t0); C.phase = t >= tF0 && t < tF1 ? 'air' : 'hover';
      const fr = ((a % 1) + 1) % 1; C.face = t >= tF0 && t < tF1 ? 'tails' : fr > 0.25 && fr < 0.75 ? 'tails' : 'heads';
      C.glint = Math.max(pulse(t, s('l49') + 1.1, 0.25, 0.3, 0.6), pulse(t, tMo - 0.25, 0.25, 0.4, 0.6));
      if (t >= tDemo) addEx(St, ex('demo', 'pawn', DP, { rings: 0, lit: 0.6 * pulse(t, tG - 0.1, 0.2, 0.8, 0.4) + 0.6 * pulse(t, tS2 - 0.1, 0.2, 0.8, 0.4),
        coins: G.START * (1 + 0.5 * inOut(ramp(t, tG, tG + 0.6))) * (1 - 0.4 * inOut(ramp(t, tS2, tS2 + 0.6))) }));
    });
    beat('flip', tF0, tF1, { coin: 'main', a: null, b: null, winner: null, face: 'tails', tLand: tF1 });
    tag('l49', tH, '+50%', { coin: 'main', side: 'heads' }, { color: 'good' }); tag('l49', tT, '-40%', { coin: 'main', side: 'tails' }, { color: 'bad' });
    tag('l49', tDemo + 0.15, fmt(G.START), { extra: 'demo' }, { until: tHalf - 0.15, replaced: true });
    tag('l49', tHalf, fmt(G.START * 1.5), { extra: 'demo' }, { color: 'good', until: tPc - 0.15, replaced: true });
    tag('l49', tPc, fmt(G.START * 1.5 * 0.6), { extra: 'demo' }, { color: 'bad' });
  });
  const totalItem = (X, t0, t1) => counterItem(t0, t1, 'TOTAL', (t) => growth.at(X(t)).reduce((a, b) => a + b, 0), (t) => sramp(t, t0, t0 + 0.25) * (1 - sramp(t, t1 - 0.3, t1)), 'total');
  block('l50a', () => {
    const t0 = s('l50a') - 0.05, tA = s('l50a') + 0.1, tB = n('l50a') - 0.6; cut(t0, 'wide', { board: true }, 'hold');
    const X = playSeg(t0, growth, 0, growth.rounds, tA, tB, { world: 'growth', rings: 2 });
    counterItem(t0, n('l50a') + 0.3, 'FLIPS EACH', X, (t) => sramp(t, t0, t0 + 0.25) * (1 - sramp(t, n('l50a'), n('l50a') + 0.3)));
    totalItem(X, t0, has('l51') ? s('l51') + 0.5 : n('l50a'));
  });
  block('l50', () => { cut(s('l50') - 0.05, 'high', { board: true }, 'hold'); tag('l50', W('l50', 'seven'), `x ${(stGrow.total / (N * G.START)).toFixed(1)}`, { screen: [0.5, 0.15] }, { size: 'l', color: 'gold' }); });
  block('l51', () => {
    cut(s('l51') - 0.05, 'high', { board: true }, 'hold');
    const t9 = W('l51', 'Nine'), t55 = W('l51', 'Fifty-five'), t36 = W('l51', 'Thirty-six'), tSt = W('l51', 'stack');
    const above = [], below = [], under = []; for (let p = 0; p < N; p++) { if (growF[p] > G.START) above.push(p); else below.push(p); if (growF[p] < 1) under.push(p); }
    light(above, t9 - 0.1, t55 - 0.2); light(below, t55 - 0.1, t36 - 0.2, 0.7); light(under, t36 - 0.1, tSt - 0.3, 0.8);
    // round 4: the three counts stay up together until the cut to the giant tower; '36 under one coin' sits over the fallen pawns, off the giant
    const uc = under.reduce((a, p) => ({ f: a.f + SEATP[p].f / under.length, r: a.r + SEATP[p].r / under.length }), { f: 0, r: 0 });
    // round 5: the three counts stay up THROUGH the cut to the giant tower until the end of the line + silence; after that cut the
    // '36 under one coin' tag (board point, off frame in the tower shot) moves to a screen spot at the bottom of the frame
    const tGiant = tSt - 0.3;
    tag('l51', t9, `${stGrow.ahead} above`, { screen: [0.28, 0.1] }, { size: 'l', color: 'good', holdLine: true }); tag('l51', t55, `${N - stGrow.ahead} below`, { screen: [0.72, 0.1] }, { size: 'l', color: 'bad', holdLine: true });
    tag('l51', t36, `${stGrow.under1} under one coin`, { f: +uc.f.toFixed(2), r: +uc.r.toFixed(2), y: 0.6 }, { size: 'l', color: 'bad', holdLine: true, anchorAfter: { t: tGiant, anchor: { screen: [0.5, 0.88] } } });
    cut(tGiant, 'tower', { players: [GIANT] }, 'tilt', { players: [GIANT] }); light([GIANT], tGiant, n('l51'));
    tag('l51', W('l51', 'seventy-one'), pct(stGrow.top1), { player: GIANT }, { size: 'l', color: 'gold' });
  });
  block('l52', () => {
    cut(s('l52') - 0.05, 'low', { board: true }, 'pan'); const tA = s('l52') + 0.2, avg = stGrow.total / N;
    item(tA, n('l52'), (St, t) => { St.level = { coins: avg, sweep: inOut(ramp(t, tA, tA + 1.6)), opacity: sramp(t, tA, tA + 0.3) * (1 - sramp(t, n('l52') - 0.3, n('l52'))) }; });
    tag('l52', W('l52', 'average'), `average ${fmt(avg)}`, { f: 8.7, r: 4.5, level: true }, { color: 'gold' });
  });
  block('l53', () => {
    // round 5: the Skeptic forward (held at 1) through "...So nothing I do matters?"; cut to the four hats on "No."; the coin goes up
    // on "luck decides"; cut to the king on "So can anything stop the king?", held through the silence
    const t0 = s('l53') - 0.05, tNo = W('l53', 'No'), tLuck = W('l53', 'luck'), tKing = W('l53', 'So', -1) - 0.1, tHats = tNo - 0.1;
    cut(t0, 'skeptic', { skeptic: true, board: true }, 'hold'); staticSeg(t0, equal, { flips: 0 });
    const tFw = Math.max(t0 + 0.35, WE('l53', 'objection') - 0.05);   // slides forward on "Second objection", at 1 by the end of it
    item(t0, tHats, (St, t) => { St.skeptic.forward = Math.max(St.skeptic.forward, sramp(t, t0, tFw)); }); beat('objection', W('l53', 'Second') - 0.2, W('l53', 'Second') + 0.6);
    cut(tHats, 'block', { players: [H, F, S, Wk], coins: ['main'] }, 'hold');
    const tLand = Math.min(tKing - 0.5, Math.max(tLuck + 0.9, WE('l53', 'decides')));
    // frame-check fix 2026-11-15 (the hats stood still 7-12 s): the coin rises from the board on "No." and spins over the four
    // through "Skill is the ticket"; the four hop in turn on "ticket"; the crowd darkens on "Without it ... table"; the coin flips
    // on "luck" and lands on "decides" -> the Fool wins 20 from the Scholar; it flips again on "the coin does not check" -> the
    // Fool wins 20 from the Worker and hops in the pause (the coin does not check who deserved it); then the king cut.
    const C4 = [S, Wk, H, F], tSk = W('l53', 'Skill'), tTk = W('l53', 'ticket'), tWo = W('l53', 'Without'), tA1 = tLuck - 0.05, tUp = tHats + 0.3;
    const tA2 = Math.max(tLand + 1.0, W('l53', 'coin', -1) - 0.1), tL2 = Math.min(tKing - 0.9, Math.max(tA2 + 0.8, WE('l53', 'check'))), STK = 20;
    const spinA = (t) => 0.6 * Math.max(0, t - tUp), a1 = spinA(tA1), e1 = Math.ceil(a1) + 4, e2 = e1 + 3;
    item(tHats, tKing, (St, t) => {
      const C = coinsOf(St, 'main'); C.at = CENTRE; C.present = 1; C.yaw = 0.03 * (t - tHats);
      if (t < tA1) { C.phase = t < tUp ? 'rest' : 'hover'; C.angle = spinA(t); C.lift = 0.75 * outCubic(ramp(t, tUp, tSk)) + 0.04 * Math.sin(2.4 * Math.max(0, t - tSk)) * sramp(t, tSk, tSk + 0.4); }
      else if (t < tLand) { const u = ramp(t, tA1, tLand); C.phase = 'air'; C.angle = lerp(a1, e1, u); C.lift = lerp(0.75 + 0.04 * Math.sin(2.4 * Math.max(0, tA1 - tSk)), 0, u) + 0.6 * 4 * u * (1 - u); }
      else if (t < tA2) { C.phase = 'rest'; C.angle = e1; C.lift = 0; }
      else if (t < tL2) { const u = ramp(t, tA2, tL2); C.phase = 'air'; C.angle = lerp(e1, e2, u); C.lift = 0.85 * 4 * u * (1 - u); }
      else { C.phase = 'rest'; C.angle = e2; C.lift = 0; }
      C.face = 'heads';
      // the crowd darkens: 0.5 from the cut, 0.9 from "Without" (only the four stay at the table)
      const v = 0.5 * sramp(t, tHats, tHats + 0.25) + 0.4 * sramp(t, tWo, tWo + 0.6), keep = new Set(C4);
      for (const P of St.players) if (!keep.has(P.id)) P.dim = Math.max(P.dim, v);
      // the two stakes the Fool wins (handed over at u = 0 / u = 1, conserving the total)
      for (const [from, ta] of [[S, tLand + 0.1], [Wk, tL2 + 0.1]]) {
        if (t < ta) continue; const u = ramp(t, ta, ta + 0.7);
        St.players[from].coins -= STK; if (u < 1) St.moves.push(mv('l53win' + from, 'disc', STK, { player: from }, { player: F }, inOut(u))); else St.players[F].coins += STK;
      }
    });
    beat('flip', tA1, tLand, { coin: 'main', a: S, b: F, winner: F, face: 'heads', tLand }); beat('payout', tLand + 0.1, tLand + 0.8, { to: F, coins: STK });
    beat('flip', tA2, tL2, { coin: 'main', a: Wk, b: F, winner: F, face: 'heads', tLand: tL2 }); beat('payout', tL2 + 0.1, tL2 + 0.8, { to: F, coins: STK });
    C4.forEach((p, i) => hopAt(p, tTk + i * 0.16));
    hopAt(F, Math.min(tKing - 0.5, tL2 + 0.85)); light([F], tLand + 0.8, tKing - 0.01, 0.8);
    cut(tKing, 'tower', { king: true, players: [F] }, 'push'); staticSeg(tKing, fair.final, { flips: FAIR_END });
    item(tKing, n('l53'), (St) => { St.king = { on: F, drop: 1, swap: 1, hat: 1 }; });
  });

  /* c09 ---------------------------------------------------------------- */
  // a tax round: every stack sends 1 % to the middle (pot), the pot comes back in equal shares
  // round 4: every slice and share carries `show` = the coins to DRAW (true `coins` kept): at least one whole disc going in,
  // thick slices 3x their true size, every share the same size back; the pot draws the shown slices that have arrived (`show`).
  const SHOWMIN = 10, showOut = (c) => Math.max(SHOWMIN, 3 * c);
  const taxRound = (pre, tOut, tBack, dur, id = 'tax') => {
    tBack = Math.max(tBack, tOut + 0.26 + dur);   // the pot pays out only after every slice has arrived
    const c = Array.from(pre, (v) => v * 0.01), share = c.reduce((a, b) => a + b, 0) / N;
    const sOut = c.map(showOut), sBack = Math.max(SHOWMIN, sOut.reduce((a, b) => a + b, 0) / N);
    const dist = (p) => Math.hypot(SEATP[p].f - CENTRE.f, SEATP[p].r - CENTRE.r) / 5;
    const out = (p) => tOut + 0.25 * dist(p), back = (p) => tBack + 0.25 * dist(p);
    beat('tax', tOut, tBack + dur + 0.25, { id });
    return (St, t) => {
      let pot = 0, potShow = 0;
      for (let p = 0; p < N; p++) {
        const P = St.players[p]; let v = pre[p];
        if (t >= out(p)) { v -= c[p]; const u = ramp(t, out(p), out(p) + dur); if (u < 1) St.moves.push({ ...mv(`${id}o${p}`, 'disc', c[p], { player: p }, { extra: 'pot' }, inOut(u)), show: sOut[p] }); else { pot += c[p]; potShow += sOut[p]; } }
        if (t >= back(p)) { pot -= share; potShow -= sBack; const u = ramp(t, back(p), back(p) + dur); if (u < 1) St.moves.push({ ...mv(`${id}b${p}`, 'disc', share, { extra: 'pot' }, { player: p }, inOut(u)), show: sBack }); else v += share; }
        P.coins = v;
      }
      if (t >= tOut - 0.3 && t < tBack + 0.25 + dur + 0.5) addEx(St, ex('pot', 'tower', CENTRE, { coins: Math.max(0, pot), show: Math.max(0, potShow), lit: 1, present: sramp(t, tOut - 0.3, tOut) * (1 - sramp(t, tBack + dur + 0.25, tBack + dur + 0.5)) }));
    };
  };
  block('l54', () => {
    const t0 = s('l54') - 0.05; cut(t0, 'wide', { board: true }, 'hold'); staticSeg(t0, equal, { world: 'leak', flips: 0 });
    tag('l54', W('l54', 'rule'), 'ONE NEW RULE', { screen: [0.5, 0.2] }, { size: 'l', kind: 'title' });
  });
  block('l55', () => {
    cut(s('l55') - 0.05, 'high', { board: true, extras: ['pot'] }, 'hold');
    const tO = W('l55', 'slides') - 0.2, tBk = W('l55', 'shared') - 0.3, fn = taxRound(equal, tO, tBk, 1.3, 'tax55');
    seg(tO - 0.05, (St, t) => { setCoins(St, equal, { world: 'leak', flips: 0 }); fn(St, t); });
    tag('l55', W('l55', 'percent'), '1%', { extra: 'pot' }, { color: 'gold' });
  });
  // l56 (round 4): one tax round on a board with a ~2,000-coin tower and a ~100-coin one, so the thick slice and the thin sliver
  // read side by side and the same share returns to both. The board is the fair world where its richest first passes 1,900 coins
  // (an illustration: the leak world never grows a 2,000 tower). The board is the leak world at K1 with its richest (a plain player)
  // raised to 2,000 and everyone else scaled down to keep the 6,400 total; nobody is out. l57 cuts to the real leak world at K1.
  const K1 = each(150);
  const { pre56, tallP, shortP } = (() => {
    const w = leak.at(K1), tall = G.stats(w).order.find((p) => !CASTS.includes(p)), rest = w.reduce((a, b) => a + b, 0) - w[tall], k = (N * G.START - 2000) / rest;
    const v = Array.from(w, (c, p) => (p === tall ? 2000 : c * k)), short = [...Array(N).keys()].filter((p) => p !== tall && !CASTS.includes(p)).sort((a, b) => Math.abs(v[a] - 100) - Math.abs(v[b] - 100))[0];
    return { pre56: v, tallP: tall, shortP: short };
  })();
  block('l56', () => {
    // frame-check fix 2026-11-15: the whole board + 64 slices + a pot by the hats did not read. Now a cleared board (world 'demo',
    // like c05 l28): ONE tall tower (800) and ONE short tower (80) on the centre rank with the pot between them. "The rich put in
    // more": a thick slice (drawn 5 discs) leaves the tall one, then a thin sliver (half a disc) the short one, both into the pot;
    // "Everybody gets the same back": the pot splits into two equal shares that land on both. True coins: 1 % = 8 and 0.8, shares
    // (8.8 / 2) = 4.4 each; drawn x6.25 (`show`) so the 10 : 1 slice ratio and the equal shares stay exact.
    const t0 = s('l56') - 0.05, tEnd = n('l56') - 0.05, pS = { f: 3.3, r: 4.5 }, pT = { f: 5.7, r: 4.5 }, POT = { f: 4.5, r: 4.5 }, K = 6.25;
    const T0 = 800, S0 = 80, cT = T0 * 0.01, cS = S0 * 0.01, sh = (cT + cS) / 2;
    const tOT = Math.max(t0 + 0.3, W('l56', 'more') - 0.35), tOS = Math.max(tOT + 0.9, W('l56', 'because') - 0.1), dOut = 0.8;
    const tB = Math.max(tOS + dOut + 0.3, W('l56', 'Everybody') - 0.1), dB = 0.9;
    cut(t0, 'demo', { extras: ['tall', 'short', 'pot'] }, 'hold');
    staticSeg(t0, equal, { world: 'demo' }); present(t0, tEnd, 0); item(t0, tEnd, (St) => { St.world = 'demo'; St.flips = null; });
    item(t0, tEnd, (St, t) => {
      let ct = T0, cs = S0, pot = 0, potShow = 0;
      for (const [id, tO, c, from] of [['l56sliceT', tOT, cT, 'tall'], ['l56sliceS', tOS, cS, 'short']]) {
        if (t < tO) continue; const u = ramp(t, tO, tO + dOut); if (from === 'tall') ct -= c; else cs -= c;
        if (u < 1) St.moves.push({ ...mv(id, 'disc', c, { extra: from }, { extra: 'pot' }, inOut(u)), show: c * K }); else if (t < tB) { pot += c; potShow += c * K; }
      }
      if (t >= tB) { const u = ramp(t, tB, tB + dB);
        if (u < 1) for (const to of ['tall', 'short']) St.moves.push({ ...mv('l56share' + to, 'disc', sh, { extra: 'pot' }, { extra: to }, inOut(u)), show: sh * K });
        else { ct += sh; cs += sh; } }
      const lt = 0.8 * pulse(t, tOT - 0.1, 0.2, dOut, 0.3) + 0.4, ls = 0.8 * pulse(t, tOS - 0.1, 0.2, dOut, 0.3) + 0.4;
      addEx(St, ex('tall', 'pawn', pT, { coins: ct, rings: 0, lit: Math.min(1, lt) }));
      addEx(St, ex('short', 'pawn', pS, { coins: cs, rings: 0, lit: Math.min(1, ls) }));
      addEx(St, ex('pot', 'tower', POT, { coins: pot, show: potShow, rings: 0, lit: 1, present: sramp(t, tOT - 0.3, tOT) * (1 - sramp(t, tB + dB, tB + dB + 0.3)) }));
    });
    beat('tax', tOT, tB + dB, { id: 'tax56' });
  });
  block('l57', () => {
    const t0 = s('l57') - 0.05, tA = s('l57') + 0.05, tB = W('l57', 'No') - 0.3; cut(t0, 'wide', { board: true }, 'hold');
    const X = playSeg(t0, leak, K1, LEAK_END, tA, tB, { world: 'leak' }); tlCounter('l57', X, tA, n('l57') + 0.2);
    tag('l57', W('l57', 'eight'), `richest: ${pct(stLeak.top1)}`, { player: stLeak.richest }, { color: 'good' }); tag('l57', W('l57', 'Nobody'), `${stLeak.under1} out`, { screen: [0.5, 0.15] }, { size: 'l' });
  });
  let leakShown = LEAK_END;
  block('l58', () => {
    const t0 = s('l58') - 0.05, tEnd = n('l58'), R = 2.6, rounds = Math.min(16, Math.floor((tEnd - t0 - 0.3) / R)); cut(t0, 'high', { board: true }, 'orbit');
    const plan = []; for (let k = 0; k < rounds; k++) { const K = LEAK_END + 32 * (k + 1), a = t0 + 0.2 + k * R, f = leak.flip(K), pre = leak.at(K - 1); if (f.aWins) { pre[f.a] += f.stake; pre[f.b] -= f.stake; } else { pre[f.a] -= f.stake; pre[f.b] += f.stake; } plan.push({ K, a, pre, tax: taxRound(pre, a + 0.4 * R, a + 0.62 * R, 0.4, 'tax58_' + k) }); }
    leakShown = LEAK_END + 32 * rounds;
    seg(t0, (St, t) => {
      let k = plan.length - 1; while (k >= 0 && plan[k].a > t) k--;
      if (k < 0) { setCoins(St, leak.at(LEAK_END), { world: 'leak', flips: LEAK_END }); return; }
      const P = plan[k], u = (t - P.a) / R;
      if (u < 0.33) { const x = lerp(P.K - 32, P.K - 1, Math.min(1, u / 0.33)); setCoins(St, leak.at(x), { world: 'leak', flips: x }); }
      else if (u < 0.38) { const a = leak.at(P.K - 1), m = smooth((u - 0.33) / 0.05); setCoins(St, a.map((v, i) => lerp(v, P.pre[i], m)), { world: 'leak', flips: P.K - 1 + m }); }
      else { setCoins(St, P.pre, { world: 'leak', flips: P.K }); P.tax(St, t); }
    });
  });
  block('l59', () => {
    const t0 = s('l59') - 0.05, w = leak.at(leakShown), order = [...Array(N).keys()].sort((a, b) => w[a] - w[b]), slot = new Array(N); order.forEach((p, i) => { slot[p] = i; });
    cut(t0, 'row', { board: true }, 'pan'); staticSeg(t0, w, { world: 'leak', flips: leakShown, rings: 0 }); const rowEnd = has('l60') ? s('l60') - 0.06 : n('l59');
    const tA = s('l59') + 0.4, tB = tA + 3.2, tF = W('l59', 'fitted'), tP = Math.max(tF + 2, W('l59', 'percent'));
    item(t0, rowEnd, (St, t) => {
      St.layout = { kind: 'row', u: sramp(t, tA, tB) };
      for (let p = 0; p < N; p++) { const P = St.players[p], a0 = lerp(tA, tB - 0.8, slot[p] / 63), u = inOut(ramp(t, a0, a0 + 0.8)); P.slot = slot[p]; P.at = midOf(SEATP[p], { f: 0.6 + slot[p] * 7.8 / 63, r: 4.5 }, u); }
      order.forEach((p, i) => { const tl = lerp(tF, tP, i / 63), c = ramp(t, tl - 0.3, tl); if (c > 0) St.chips.push({ id: 'data' + p, at: { player: p }, count: c, color: 'red', lit: 0, label: 'data' }); });
    });
    beat('sort', tA, tB);
    tag('l59', W('l59', 'Boghosian'), 'Boghosian, Tufts', { screen: [0.5, 0.12] }, { size: 's', kind: 'source' }); tag('l59', W('l59', 'twenty-seven'), 'US wealth data 1989-2016', { screen: [0.5, 0.18] }, { size: 's', kind: 'source' });
  });
  block('l60', () => {
    const t0 = s('l60') - 0.05; cut(t0, 'tally', { chips: ['vote-no', 'vote-yes'] }, 'push');
    staticSeg(t0, equal, { world: 'empty' }); present(t0, n('l60') - 0.05, 0); item(t0, n('l60') - 0.05, (St) => { St.world = 'empty'; St.flips = null; });
    // round 4: both columns build from the start of the line and are complete before "fifty-three" is spoken
    // round 5: the 'no' column starts first and leads by >= 6 chips from the first chips (never two equal columns); both end together
    const tA = s('l60') + 0.2, tB = Math.max(tA + 2, W('l60', 'fifty-three') - LEAD - 0.4), tY = tA + 0.4;
    const noAt = (t) => Math.min(53, Math.max(0, 53 * (t - tA) / (tB - tA))), yesAt = (t) => Math.min(47, Math.max(0, 47 * (t - tY) / (tB - tY)));
    item(t0, n('l60'), (St, t) => { St.chips.push({ id: 'vote-no', at: { f: 3.6, r: 3.5 }, count: noAt(t), color: 'red', lit: 0, label: 'no' }, { id: 'vote-yes', at: { f: 5.4, r: 3.5 }, count: yesAt(t), color: 'red', lit: 0, label: 'yes' }); });
    tag('l60', W('l60', 'fifty-three'), '53 no', { chips: 'vote-no' }); tag('l60', W('l60', 'forty-seven'), '47 yes', { chips: 'vote-yes' });
    tag('l60', W('l60', 'November', 0, 0.3), 'California, November 2026', { screen: [0.5, 0.08] }, { size: 's', kind: 'source' });
  });

  /* c10 ---------------------------------------------------------------- */
  const kingOn = (t0, t1) => item(t0, t1, (St) => { St.king = { on: F, drop: 1, swap: 1, hat: 1 }; });
  const tFinal = has('l65') ? s('l65') - 0.05 : D;
  block('l61', () => { const t0 = s('l61') - 0.05; cut(t0, 'tower', { king: true, players: [F] }, 'push'); staticSeg(t0, fair.final, { flips: FAIR_END }); kingOn(t0, tFinal); });
  block('l62', () => { cut(s('l62') - 0.05, 'tower', { king: true, coins: ['main'] }, 'orbit', null, true); hover('main', { f: SEATP[F].f + 0.9, r: SEATP[F].r - 0.2 }, s('l62') - 0.05, n('l62'), { lift: 0.8, rate: 0.1, glint: W('l62', 'liked') }); });
  block('l63', () => { cut(s('l63') - 0.05, 'tower', { king: true }, 'drop', { players: [S, Wk] }); light([S, Wk], s('l63') + 0.5, n('l63'), 0.6); focusOn(s('l63') - 0.05, n('l63'), { players: [S, Wk], hard: true }); });
  block('l64', () => {
    cut(s('l64') - 0.05, 'tower', { king: true }, 'hold'); cut(W('l64', 'Worker') - 0.25, 'player', { players: [Wk] }, 'hold'); cut(W('l64', 'board') - 0.25, 'wide', { board: true }, 'hold');
  });
  block('l64a', () => {
    // round 5: the tower rises fast from "There is a stack" and is complete (100) before "waiting"; the hop starts on "Everybody"
    // and has landed before the line ends
    const t0 = s('l64a') - 0.05, tR0 = Math.max(t0, W('l64a', 'There') - 0.1), tWait = W('l64a', 'waiting'), tR1 = Math.max(tR0 + 0.4, Math.min(W('l64a', 'stack') + 0.6, tWait - 0.05));
    const tJ = W('l64a', 'Everybody'), JD = clamp(e('l64a') - 0.08 - tJ, 0.3, 0.6), SKT = { f: 5.4, r: -0.3 }, tEnd = D;
    cut(t0, 'skeptic', { skeptic: true, board: true }, 'push');
    item(t0, tEnd, (St, t) => {
      const sk = St.skeptic, landed = t >= tJ + JD;   // round 4: no step forward here (only l31, l48, l53); it jumps from its back spot
      if (landed) { sk.coins = 100; sk.at = { ...SKT }; return; }
      addEx(St, ex('skTower', 'tower', SKT, { coins: 100 * outCubic(ramp(t, tR0, tR1)) }));
      if (t >= tJ) sk.jump = { to: { extra: 'skTower' }, u: ramp(t, tJ, tJ + JD) };
    });
    beat('appear', tR0, tR1, { who: 'skTower' }); beat('jump', tJ, tJ + JD, { who: 'skeptic' });
  });
  block('l65', () => {
    const t0 = s('l65') - 0.05, tSo = W('l65', 'So'), lineup = [S, Wk, H, F], spots = lineup.map((_, i) => ({ f: 1.6 + i * 1.6, r: -0.15 }));   // round 4: 1.6 squares apart, left to right = name order
    cut(t0, 'wide', { board: true, skeptic: true }, 'hold'); morphSeg(t0, fair.final, equal, t0 + 0.1, t0 + 1.1);
    item(t0, D + 1, (St, t) => { lineup.forEach((p, i) => { const a = tSo - 0.2 + i * 0.15; St.players[p].at = midOf(SEATP[p], spots[i], inOut(ramp(t, a, a + 1.1))); }); St.skeptic.at = { f: 8.1, r: -0.3 }; });
    cut(tSo + 0.3, 'block', { players: lineup, skeptic: true }, 'push', null, true);
    [['Scholar', S, 'scholar'], ['Worker', Wk, 'worker'], ['Heir', H, 'heir'], ['Fool', F, 'fool']].forEach(([w, p, role]) => { const tw = W('l65', w, -1); hopAt(p, tw, 0.45); light([p], tw - 0.05, D + 1, 1); tag('l65', tw, `THE ${role.toUpperCase()}`, { player: p }, { color: role, kind: 'name', until: D + 1 }); });
    const tE = W('l65', 'which'); item(tE - 0.3, D + 1, (St, t) => { St.title = { text: storyboard?.end_text ?? END_TEXT, opacity: sramp(t, tE - 0.3, tE + 0.3) }; }); beat('title', tE - 0.3, tE + 0.3, { text: END_TEXT });
  });
  // the skeptic stands on its own tower from l64a on: keep it there in l65 (the l64a item ends at D)

  /* ---------------- finish: sort, index, shots, tags */
  segs.sort((a, b) => a.t0 - b.t0);
  shots.sort((a, b) => a.t0 - b.t0);
  const SHOTS = shots.map((sh, i) => ({ ...sh, id: `s${String(i + 1).padStart(3, '0')}-${sh.line}`, t0: Math.max(0, sh.t0), t1: i + 1 < shots.length ? shots[i + 1].t0 : D }));
  SHOTS.forEach((sh, i) => { if (i) beat('cut', sh.t0, sh.t0, { shot: sh.id, continuous: sh.continuous }); });
  // round 4: a default tag ends at the end of its line's silence or at the first CUT after it comes up, whichever is first (a cut ends it at once)
  // a tag whose lead would start it in the previous shot starts at the cut instead (no flash on the old picture)
  const CUTS = SHOTS.filter((sh, i) => i && !sh.continuous).map((sh) => sh.t0);
  for (const d of tagDefs) { const c0 = CUTS.filter((x) => x > d.t0 && x <= d.tw).pop(); if (c0 != null) d.t0 = c0; }
  for (const d of tagDefs) if (d.byCut) { const c = CUTS.find((x) => x > Math.max(d.tw, d.holdTo ?? -Infinity)); if (c != null && c <= d.t1) { d.t1 = c; d.hardEnd = true; } }
  for (const d of tagDefs) items.push({ t0: d.t0 - 0.01, t1: d.t1 + 0.3, fn: (St, t) => {
    if (d.hardEnd && t >= d.t1) return;
    const op = sramp(t, d.t0, d.t0 + 0.12) * (d.hardEnd ? 1 : 1 - sramp(t, d.t1 - 0.25, d.t1)); if (op <= 0) return;
    St.tags.push({ id: d.id, line: d.line, text: d.text, anchor: d.anchorAfter && t >= d.anchorAfter.t ? d.anchorAfter.anchor : d.anchor, opacity: op, pop: t < d.tw ? 0 : clamp(1 - (t - d.tw) / 0.35), size: d.size, color: d.color, kind: d.kind });
  } });
  focusDefs.sort((a, b) => a.t0 - b.t0);
  const BUCKET = 1, NB = Math.ceil(D / BUCKET) + 2, buckets = Array.from({ length: NB }, () => []);
  items.forEach((it, idx) => { it.idx = idx; const a = clamp(Math.floor(it.t0 / BUCKET), 0, NB - 1), b = clamp(Math.floor(it.t1 / BUCKET), 0, NB - 1); for (let k = a; k <= b; k++) buckets[k].push(it); });
  beats.sort((a, b) => a.t0 - b.t0);
  const lineStarts = LINES.map((l) => l.t0);

  function state(t) {
    t = Number.isFinite(t) ? Math.min(Math.max(t, 0), D) : 0;
    let li = 0; { let a = 0, b = LINES.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (lineStarts[m] <= t) a = m; else b = m - 1; } li = a; }
    const ln = LINES[li];
    const St = {
      t, chapter: chapterOf.get(ln.id) ?? null, line: ln.id, lineU: clamp((t - ln.t0) / Math.max(1e-6, ln.t1 - ln.t0)),
      world: 'fair', flips: null,
      players: Array.from({ length: N }, (_, p) => ({ id: p, at: SEATP[p], coins: G.START, rings: 1, present: 1, down: 0, lit: 0, dim: 0, hop: 0, scale: 1, role: ROLE[p] ?? null, hat: 0, slot: null, fallDir: FALL[p] })),
      extras: [], skeptic: { present: 0, at: skBack, forward: 0, lit: 0, hop: 0, coins: 0, jump: null }, king: { on: null, drop: 0, swap: 0, hat: 0 },
      flipCoins: [], moves: [], chips: [], rain: [], level: null, layout: { kind: 'board', u: 0 }, tags: [], counter: null, total: null, title: null, shot: null, focus: null,
    };
    let si = 0; { let a = 0, b = segs.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (segs[m].t0 <= t) a = m; else b = m - 1; } si = a; }
    segs[si].fill(St, t);
    const bk = buckets[clamp(Math.floor(t / BUCKET), 0, NB - 1)];
    for (const it of bk) if (t >= it.t0 && t <= it.t1) it.fn(St, t);
    // derived: skeptic position, fallen = dimmed, coins never negative
    const sk = St.skeptic; if (!sk.coins) sk.at = sk.at === skBack ? midOf(skBack, skFwd, sk.forward) : sk.at;
    // round 4: the Skeptic is on screen from l31 on whenever the 64-seat board is shown (not on the cleared board, demos or the tally)
    sk.present = t >= SK_ON && St.world !== 'empty' && St.world !== 'demo' && !(t >= tally0 && t < tallyEnd) ? 1 : 0;
    for (const P of St.players) { if (P.coins < 0) P.coins = 0; P.dim = Math.max(P.dim, 0.85 * P.down); }
    for (const x of St.extras) { if (x.show == null) x.show = x.coins; if (!x.fallDir) x.fallDir = FALL_X; }
    if (St.counter && St.counter.fast == null) St.counter.fast = false;
    let hi = 0; { let a = 0, b = SHOTS.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (SHOTS[m].t0 <= t) a = m; else b = m - 1; } hi = a; }
    const sh = SHOTS[hi]; St.shot = { id: sh.id, kind: sh.kind, subject: sh.subject, to: sh.to, move: sh.move, continuous: sh.continuous, t0: sh.t0, t1: sh.t1, u: clamp((t - sh.t0) / Math.max(1e-6, sh.t1 - sh.t0)) };
    // focus: an explicit window (the last one that covers t), else the shot subject without the board (null when the board is the subject)
    let fd = null; for (const f of focusDefs) { if (f.t0 > t) break; if (t < f.t1) fd = f.f; }
    if (fd) St.focus = { players: [], extras: [], ...fd };
    else if (sh.subject.board) St.focus = null;
    else { const { board, ...rest } = (sh.move === 'pan' || sh.move === 'rack') && sh.to && !sh.to.board ? sh.to : sh.subject; St.focus = { players: [], extras: [], ...rest, hard: true }; }   // a pan / rack is about where it goes
    return St;
  }
  return { duration: D, fps, beats, shots: SHOTS, tagDefs, lines: LINES.map((l) => ({ id: l.id, t0: l.t0, t1: l.t1, next: n(l.id), chapter: chapterOf.get(l.id) })), warnings, state, cast: { ...CAST, nobody: NOBODY, giant: GIANT, talentBest: talent?.best, talentRich: talent?.rich, tall56: tallP, short56: shortP } };
}
export default makeShow;
