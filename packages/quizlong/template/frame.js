/* «شو شايف؟» quiz-long frame, direction blocks «مكعبات»: CSS 3D (real perspective, extruded slabs) + DOM Arabic text.
 * Contract: research/quiz-longform-2026-11-12/show-contract.md
 *   await __load(show[, {drift}])  ->  __seek(t)  (absolute seconds, pure function of t, any order)  ->  screenshot
 * Extras for the builder:
 *   __load(show, {drift:false, warm:false}): after the fonts/flags are in, every segment is set up once (data validation,
 *     text fits, activity windows) and painted once (warm-up, ~3 s) so the first captured frame of a worker is complete.
 *     Calling __load again with the same show returns at once (the page may self-load from ?show= first).
 *   __static(t0, t1[, {ignore_drift:true}]) -> true when nothing changes on screen between t0 and t1 (same segment, no
 *     entrance/exit/timer/effect/host-talk/blink in between). Background drift (camera sway + floating blocks) runs
 *     all the time except on the end frame, so with drift on this is true only on the end frame; turn drift off
 *     (show.theme.drift === false, __load(show, {drift:false}) or ?drift=0) to get holds elsewhere. window.__drift says which.
 *   Optional segment fields read beyond the contract: question.speed_index/speed_total (mechanic "speed": hero flag, no
 *     options, answers[0] pops at its t; hold_text (or learn_text) = «هل تعرف؟» strip under a smaller TV from t.reveal + 0.4 s
 *     to the end of the segment), card.stake_text (pill under new_text on level cards), clue.effect (zoom|blur|strips) + clue.focus [fx, fy],
 *     answer_iso / subject_iso (flag sticker at the reveal of text and emoji clues), hook_text (small line on the clue
 *     frame until the reveal), card.kind "speed", card.new_text / series_text, show.theme.finale (theme of ladder + end,
 *     default = level 1's theme). Missing t.learn_in or learn_text = no learn strip. Themes: l1..l4.
 *   v1.4 (animals): clue {type:"animal", emoji, effect zoom|blur|strips|silhouette|null, focus [fx, fy] = point on the emoji's
 *     own art square (0..1, x from the left, y from the top)}: the animal stands on a spotlight floor inside the clue plate;
 *     silhouette = solid black shape with a white rim until t.reveal, colour pops at t.reveal. answer_emoji / subject_emoji =
 *     emoji sticker (like answer_iso). option.emoji: big animal on 2-option keys, small emoji beside the word on 4-option keys.
 *     clue {type:"text", lines:[...]} (or text with "\n") = 2-3 stacked clue lines (who_am_i). show.theme.palette "wild" =
 *     themes w1..w4 + finale wf when level_themes are the defaults. All emoji are drawn with the bundled QuizEmoji font.
 *   v1.5 (look-alike flags): clue {type:"flags", pick:true, label} = layout "pick" (wide TV, label on top, the option flags
 *     numbered in option order, names under every flag at the reveal, no keys); clue {type:"flags", isos, labels, names} = 2-4
 *     flags in the standard clue TV over the 4 text keys; clue.ratio {iso: [w, h]} = true proportions, one shared height.
 *     show.theme.palette "twin" = themes t1..t4 + finale tf (emitted as level_themes by show.ts).
 * Every DOM write goes through S() (cached), every time-dependent value through pr()/step()/act() (records activity
 * windows for __static). Text is fitted once per segment with an off-screen measurer.
 */
(() => {
  'use strict';
  const W = 1920, H = 1080;
  const qp = new URLSearchParams(location.search);
  const byId = id => document.getElementById(id);
  const $ = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const ar = s => String(s ?? '').replace(/[0-9]/g, d => AR[+d]).replace(/[²³]/g, d => (d === '²' ? '٢' : '٣'));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  /* « | » (and « · », which reads as a zero beside an Eastern Arabic digit) is drawn as a small upright divider block, never as a glyph */
  const sepHtml = s => esc(s).replace(/\s+[|·•]\s+/g, '<i class="dv"></i>');
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const eo = p => 1 - Math.pow(1 - p, 3);
  const ei = p => p * p * p;
  const eb = (p, s = 1.7) => { const q = p - 1; return 1 + (s + 1) * q * q * q + s * q * q; };
  const f1 = n => String(Math.round(n * 10) / 10), f2 = n => String(Math.round(n * 100) / 100), f3 = n => String(Math.round(n * 1000) / 1000);
  const TAU = Math.PI * 2;
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------------------------------------------------------------- activity recorder (drives __static) */
  let REC = null;
  const pr = (t, a, d) => { if (REC) REC.push(a, a + d); return cl((t - a) / d); };
  const step = (t, at) => { if (REC) REC.push(at, at); return t >= at; };
  const act = (a, b) => { if (REC) REC.push(a, b); };

  /* ---------------------------------------------------------------- cached DOM writes */
  const NODES = [];
  function S(el, k, v) {
    let c = el._c; if (!c) { c = el._c = {}; NODES.push(el); }
    if (c[k] === v) return; c[k] = v;
    if (k === 'tf') el.style.transform = v; else if (k === 'op') el.style.opacity = v; else if (k === 'dp') el.style.display = v;
    else if (k === 'cls') el.className = v; else if (k === 'txt') el.textContent = v; else if (k === 'fl') el.style.filter = v; else if (k === 'html') el.innerHTML = v;
    else el.style.setProperty(k, v);
  }
  const X = (el, text) => S(el, 'html', sepHtml(text));   // text with dividers; an element is written either with X or with 'txt', never both

  /* ---------------------------------------------------------------- slab: extruded rounded block */
  const ALL = [];
  function slab(parent, cls, x, y, w, h, o = {}) {
    const d = o.d ?? 60, n = o.n ?? 5, r = o.r ?? 28;
    const wrap = $('div', 'slab ' + cls, parent);
    const s = { wrap, d, x, y, w, h, base: 'slab ' + cls, grp: o.grp || '' };
    wrap.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;--r:${typeof r === 'number' ? r + 'px' : r};` + (o.z ? `transform:translateZ(${o.z}px);` : '');
    if (o.shadow !== false) s.sh = $('div', 'sh', wrap);
    s.bd = $('div', 'bd', wrap);
    if (o.origin) s.bd.style.transformOrigin = o.origin;
    if (o.glow) { s.glow = $('div', 'glow', s.bd); s.glow.style.transform = 'translateZ(-1px)'; }
    if (!o.ring) for (let k = 0; k < n; k++) { const e = $('div', 'sl', s.bd); e.style.cssText = `transform:translateZ(${f1(k * d / n)}px);--k:${f2(n > 1 ? k / (n - 1) : 1)}`; }
    s.ft = $('div', 'ft', s.bd); s.ft.style.transform = `translateZ(${d}px)`;
    ALL.push(s);
    return s;
  }
  function resize(s, x, y, w, h) { s.x = x; s.y = y; s.w = w; s.h = h; S(s.wrap, 'left', x + 'px'); S(s.wrap, 'top', y + 'px'); S(s.wrap, 'width', w + 'px'); S(s.wrap, 'height', h + 'px'); }
  const off = s => S(s.wrap, 'dp', 'none');
  /** p: {x,y,z,rx,ry,rz,sc,dz,on}; dz scales the extrusion depth (pressed keys) */
  function pose(s, p) {
    if (p.on === false) { S(s.wrap, 'dp', 'none'); return; }
    S(s.wrap, 'dp', '');
    const x = p.x || 0, y = p.y || 0, z = p.z || 0, sc = p.sc ?? 1, dz = p.dz ?? 1;
    S(s.bd, 'tf', `translate3d(${f1(x)}px,${f1(y)}px,${f1(z)}px) rotateY(${f2(p.ry || 0)}deg) rotateX(${f2(p.rx || 0)}deg) rotateZ(${f2(p.rz || 0)}deg) scale3d(${f3(sc)},${f3(sc)},${f3(sc * dz)})`);
    if (s.sh) { const lift = Math.max(0, z + s.d * dz); S(s.sh, 'tf', `translate3d(${f1(x + 8 + lift * .14)}px,${f1(y + 12 + lift * .22)}px,-2px) rotateZ(${f2(p.rz || 0)}deg) scale(${f3(sc * (1 + lift * .0003))})`); }
  }
  /** extruded text: n stacked copies */
  function glyph3d(parent, x, y, w, h, z0, depth, n, px) {
    const g = $('div', 'g3d', parent);
    g.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;font-size:${px}px`;
    const spans = [];
    for (let k = 0; k <= n; k++) { const sp = $('span', k === n ? 'top' : 'side', g); sp.style.transform = `translateZ(${f1(z0 + k * depth / n)}px)`; spans.push(sp); }
    return { el: g, set(text, size) { for (const sp of spans) S(sp, 'txt', text); if (size) S(g, 'font-size', size + 'px'); } };
  }

  /* ---------------------------------------------------------------- icons */
  const IC_OK = '<svg class="ic-ok" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#fff"/><path d="M18 33l10 10 19-21" fill="none" stroke="#0B7A3A" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const IC_NO = '<svg class="ic-no" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" style="fill:var(--bad)"/><path d="M21 21l22 22M43 21L21 43" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>';
  const IC_LOCK = '<svg class="ic-lock" viewBox="0 0 64 64"><rect x="12" y="28" width="40" height="30" rx="8" fill="currentColor"/><path d="M20 30V20a12 12 0 0 1 24 0v10" fill="none" stroke="currentColor" stroke-width="7"/></svg>';
  const IC_NOW = '<svg class="ic-now" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#141B4D"/><path d="M25 18l22 14-22 14z" fill="#fff"/></svg>';
  const BOLT = '<svg class="bolt" viewBox="0 0 34 44"><path d="M21 0L2 25h12l-3 19 21-27H19z" fill="currentColor"/></svg>';
  const BULB = '<svg class="bulb" viewBox="0 0 34 34"><path d="M17 2a11 11 0 0 0-6 20v4h12v-4A11 11 0 0 0 17 2z" fill="currentColor"/><rect x="12" y="28" width="10" height="4" rx="2" fill="currentColor"/></svg>';
  const STAR = '<svg class="star" viewBox="0 0 64 64"><path d="M32 4l8.6 17.5 19.4 2.8-14 13.6 3.3 19.3L32 48.1 14.7 57.2 18 37.9 4 24.3l19.4-2.8z" fill="#141B4D"/></svg>';
  const MARK = arc => `<svg viewBox="0 0 512 512"><circle cx="256" cy="256" r="198" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="30"/><path class="m-arc" d="M256 58 A198 198 0 1 1 116 116" fill="none" stroke="${arc}" stroke-width="30" stroke-linecap="round"/>
    <g class="m-hook"><path d="M319.9 172.7 A68 68 0 1 0 207.9 244.1 L238.4 274.6 A60 60 0 0 1 256 317" fill="none" stroke="#fff" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g class="m-eye"><g class="m-open"><path d="M178 390 C212 340 300 340 334 390 C300 440 212 440 178 390Z" fill="#FFC83D"/><g class="m-pupil"><circle cx="256" cy="390" r="27" fill="#1D1548"/><circle cx="266" cy="380" r="8" fill="#fff"/></g></g>
    <path class="m-happy" d="M190 408 Q256 338 322 408" fill="none" stroke="#FFC83D" stroke-width="30" stroke-linecap="round"/></g></svg>`;

  /* ---------------------------------------------------------------- static scene */
  const canvas = byId('canvas'), bg = byId('bg'), bgPrev = byId('bgPrev'), world = byId('world'), rig = byId('rig'), M = byId('measure');

  // parallax blocks behind the UI
  const BLK = [[-70, 96, 200, 200, -230, 14, 'c-frame'], [1800, 70, 180, 180, -280, -18, 'c-accent'], [880, 60, 130, 130, -340, 28, 'c-ok'], [1830, 520, 210, 210, -190, 10, 'c-frame'],
    [-90, 520, 190, 190, -210, -12, 'c-accent'], [905, 760, 150, 150, -320, -22, 'c-tile'], [-30, 930, 170, 170, -150, 20, 'c-ok'], [1480, 990, 230, 150, -260, -8, 'c-accent'], [400, -70, 210, 150, -300, 8, 'c-tile']]
    .map(([x, y, w, h, z, rz, c], i) => { const s = slab(rig, 'blk ' + c, x, y, w, h, { d: 90, n: 4, r: 30, z, shadow: false, grp: 'always' }); s.rz = rz; s.i = i; return s; });

  /* vertical layout (2026-11-13): every information face ends at or above y = 950 px (88 % of 1080); the composition moved up,
   * gaps tightened, text sizes kept. Only the background blocks reach lower. Layout bottoms sit at SAFE_B (faces land ~4 px lower on screen). */
  const TOPY = 34, SAFE_B = 942;
  // top bar
  const TB_BRAND = slab(rig, 'tb tb-brand c-frame', 1553, TOPY, 290, 92, { d: 36, n: 3, r: 26, grp: 'top' });
  TB_BRAND.ft.innerHTML = MARK('#FFC83D') + '<span class="bn"></span>';
  const TB_LEVEL = slab(rig, 'tb tb-level c-frame', 1051, TOPY, 480, 92, { d: 36, n: 3, r: 26, grp: 'top' });
  TB_LEVEL.ft.innerHTML = '<span class="cap">المستوى</span><span class="lvn"></span><span class="lnm"></span>';
  const TB_COUNT = slab(rig, 'tb tb-count c-frame', 77, TOPY, 952, 92, { d: 36, n: 3, r: 26, grp: 'top' });
  TB_COUNT.ft.innerHTML = '<span class="cn"></span><span class="cof"></span><div class="prog"></div>';
  const TOP = [TB_BRAND, TB_LEVEL, TB_COUNT];
  const E = { cap: TB_LEVEL.ft.querySelector('.cap'), bn: TB_BRAND.ft.querySelector('.bn'), lvn: TB_LEVEL.ft.querySelector('.lvn'), lnm: TB_LEVEL.ft.querySelector('.lnm'), cn: TB_COUNT.ft.querySelector('.cn'), cof: TB_COUNT.ft.querySelector('.cof'), prog: TB_COUNT.ft.querySelector('.prog') };

  // clue TV (bezel ring slices, recessed screen, floating content)
  const BZ = 50, TVD = 130, RECESS = 46;
  function mkTV(x, y, w, h, ry) {
    const tv = slab(rig, 'tv c-frame', x, y, w, h, { d: TVD, n: 0, r: 66, ring: true, grp: 'q' });
    tv.ry = ry; tv.wrap.style.setProperty('--bz', BZ + 'px');
    const n = 6, ri = 10;
    for (let k = 0; k < n; k++) { const e = $('div', 'rs' + (k === 0 ? ' base' : ''), null); e.style.cssText = `transform:translateZ(${f1(k * TVD / n)}px);--k:${f2(k / (n - 1))}`; tv.bd.insertBefore(e, tv.ft); }
    tv.screen = $('div', 'screen', null); tv.bd.insertBefore(tv.screen, tv.ft);
    tv.screen.style.cssText = `left:${BZ - 6}px;top:${BZ - 6}px;width:${w - 2 * BZ + 12}px;height:${h - 2 * BZ + 12}px;transform:translateZ(${TVD - RECESS}px)`;
    const a = BZ, b = w - BZ, c = h - BZ;
    tv.ft.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z M${a + ri} ${a}H${b - ri}A${ri} ${ri} 0 0 1 ${b} ${a + ri}V${c - ri}A${ri} ${ri} 0 0 1 ${b - ri} ${c}H${a + ri}A${ri} ${ri} 0 0 1 ${a} ${c - ri}V${a + ri}A${ri} ${ri} 0 0 1 ${a + ri} ${a}Z")`;
    tv.ft.innerHTML = '<div class="gloss"></div><div class="dots"><i></i><i></i><i></i></div><div class="grille"></div>';
    tv.cw = w - 2 * BZ; tv.ch = h - 2 * BZ;
    tv.tvc = $('div', 'tvc', tv.bd); tv.tvc.style.cssText = `left:${BZ}px;top:${BZ}px;width:${tv.cw}px;height:${tv.ch}px;transform:translateZ(${TVD - RECESS + 1}px)`;
    tv.text = $('div', 'cluetext tx tx-clue', tv.tvc, '<span></span>'); tv.textSpan = tv.text.firstChild;
    tv.plate = slab(tv.tvc, 'plate', 0, 0, 400, 300, { d: 22, n: 4, r: 16, grp: 'q' });
    tv.plate.ft.innerHTML = '<div class="hair"></div><div class="astage"><div class="abeam"></div><div class="asc"><div class="afloor"></div><div class="ashadow"></div><span class="aemo emo"></span></div><div class="aflash"></div></div>';
    const pq = c => tv.plate.ft.querySelector(c);
    tv.plate.hair = pq('.hair'); tv.plate.beam = pq('.abeam'); tv.plate.sc = pq('.asc'); tv.plate.emo = pq('.aemo'); tv.plate.shadow = pq('.ashadow'); tv.plate.flash = pq('.aflash');
    tv.shut = []; for (let i = 0; i < 6; i++) { const s = slab(tv.plate.bd, 'shut c-frame', 0, 0, 60, 300, { d: 12, n: 3, r: 6, z: 24, shadow: false, origin: '0 50%', grp: 'q' }); s.ft.textContent = '؟'; tv.shut.push(s); }
    tv.emo = []; for (let i = 0; i < 4; i++) { const s = slab(tv.tvc, 'etile', 0, 0, 200, 200, { d: 26, n: 4, r: 30, grp: 'q' }); s.ft.innerHTML = '<span class="emo"></span>'; s.span = s.ft.firstChild; tv.emo.push(s); }
    tv.sticker = slab(tv.tvc, 'sticker', Math.round((tv.cw - 252) / 2), 14, 252, 189, { d: 12, n: 3, r: 14, grp: 'q' });
    tv.sticker.ft.innerHTML = '<span class="semo emo"></span>'; tv.sticker.emo = tv.sticker.ft.firstChild;
    tv.tag = slab(tv.bd, 'tag c-accent', 0, -8, 200, 64, { d: 16, n: 3, r: 18, z: TVD + 2, grp: 'q' });
    tv.tag.ft.innerHTML = '<span></span>'; tv.tagSpan = tv.tag.ft.firstChild;
    tv.note = slab(tv.bd, 'tag c-tile', 40, -12, 300, 62, { d: 16, n: 3, r: 18, z: TVD + 2, grp: 'q' });
    tv.note.ft.innerHTML = '<span></span>'; tv.noteSpan = tv.note.ft.firstChild;
    // v1.5 multi-flag clues: a label line (pick mode) and up to 4 flag tiles (number badge, Arabic name under the flag)
    tv.lab = $('div', 'flabel tx tx-clue', tv.tvc, '<span></span>'); tv.labSpan = tv.lab.firstChild;
    tv.ftl = []; for (let i = 0; i < 4; i++) {
      const s = slab(tv.tvc, 'ftile', 0, 0, 300, 225, { d: 20, n: 3, r: 12, glow: true, grp: 'q' });
      s.ft.innerHTML = `<div class="fimg"></div><div class="fnum"></div><div class="fok">${IC_OK}</div><div class="fname tx"><span></span></div>`;
      s.img = s.ft.children[0]; s.num = s.ft.children[1]; s.name = s.ft.children[3]; s.nameSpan = s.name.firstChild; tv.ftl.push(s);
    }
    tv.hint = []; for (let i = 0; i < 2; i++) { const s = slab(tv.bd, 'hint c-accent', 0, h - 96, 300, 88, { d: 20, n: 4, r: 22, z: TVD + 6, grp: 'q' }); s.ft.innerHTML = BULB + '<span></span>'; s.span = s.ft.lastChild; tv.hint.push(s); }
    return tv;
  }
  const TV = mkTV(131, 180, 820, 596, -9), TVB = mkTV(137, 180, 1090, SAFE_B - 190, -6);
  // v1.5 pick mode (flag_pick / flag_pair): one wide TV, the flags are the options (no keys column)
  const TVW = mkTV(60, 134, 1800, 660, 0);
  // v1.5 clue mode (flag_diff / flag_family): a wider clue TV next to a narrower keys column (flags as big as the frame allows)
  const TVC = mkTV(111, 180, 990, 596, -8);

  // question column (standard) and speed column: static groups turned toward the viewer
  const CW = 842, SW = 588, CWC = 692;   // column widths (standard / speed / v1.5 multi-flag clue)
  const COL = $('div', 'g3', rig); COL.style.cssText = `left:972px;top:0;width:${CW}px;height:1080px;transform:rotateY(8deg)`;
  const COLS = $('div', 'g3', rig); COLS.style.cssText = `left:1250px;top:0;width:${SW}px;height:1080px;transform:rotateY(9deg)`;
  const mkPlaque = (parent, w) => { const s = slab(parent, 'plaque c-frame', 0, 164, w, 124, { d: 56, n: 4, r: 30, grp: 'q' }); s.ft.innerHTML = '<span class="tx tx-ask"></span>'; s.span = s.ft.firstChild; s.tw = w - 52; return s; };
  const PLAQUE = mkPlaque(COL, CW), PLAQUES = mkPlaque(COLS, SW);
  function mkKey(parent, cls, x, y, w, h, o = {}) {
    const k = slab(parent, 'key c-tile ' + cls, x, y, w, h, { d: 88, n: 5, r: 30, glow: true, grp: 'q', ...o });
    k.ft.innerHTML = `<div class="kb"></div><div class="kf"></div><div class="kemo emo"></div><div class="bflag"></div><div class="bemo emo"></div><div class="kt tx tx-opt"></div><div class="kc">${IC_OK}${IC_NO}</div>`;
    const qk = c => k.ft.querySelector(c);
    k.kb = qk('.kb'); k.kf = qk('.kf'); k.kemo = qk('.kemo'); k.bflag = qk('.bflag'); k.bemo = qk('.bemo'); k.kt = qk('.kt'); k.extra = '';
    return k;
  }
  const LETTERS = ['أ', 'ب', 'ج', 'د'];
  const BW = 406;
  const KEYS = [0, 1, 2, 3].map(i => mkKey(COL, '', 0, 328 + i * 118, CW, 96));
  const BIG = [0, 1].map(i => mkKey(COL, 'big', i === 0 ? CW - BW - 10 : 0, 328, BW, 448, { r: 40 }));
  const ANS3 = [0, 1, 2].map(i => mkKey(COL, 'ans row', 0, 328 + i * 132, CW, 112));
  const ALSO = $('div', 'also', COL); ALSO.style.cssText = `left:0;top:716px;width:${CW}px;height:60px`;
  const SPD = slab(COLS, 'spd c-accent', 0, 298, SW, 84, { d: 40, n: 3, r: 24, grp: 'q' });
  SPD.ft.innerHTML = BOLT + '<span class="st"></span><span class="pips"></span>'; SPD.st = SPD.ft.children[1]; SPD.pips = SPD.ft.children[2];
  const AW = 534;
  const SOCKET = $('div', 'socket', COLS, '؟'); SOCKET.style.cssText = `left:10px;top:398px;width:${AW}px;height:380px`;
  const ANSS = mkKey(COLS, 'ans', 10, 398, AW, 380, { r: 40 });

  function mkStrip(parent, x, y, w, h) {
    const s = slab(parent, 'strip c-frame', x, y, w, h, { d: 60, n: 4, r: 34, grp: 'q' });
    s.ft.innerHTML = '<div class="dial"></div><div class="track"><div class="fill"></div><div class="ticks"></div></div>';
    s.dial = s.ft.querySelector('.dial'); s.fill = s.ft.querySelector('.fill'); s.ticks = s.ft.querySelector('.ticks');
    return s;
  }
  const STRIP = mkStrip(rig, 111, 808, 1504, 124), STRIPS = mkStrip(COLS, 0, 808, 356, 124);
  const LEARN = slab(rig, 'learn c-learn', 117, SAFE_B - 156, 1498, 156, { d: 70, n: 4, r: 34, grp: 'q' });
  LEARN.ft.innerHTML = '<div class="ltext tx tx-learn"><span></span></div>'; LEARN.text = LEARN.ft.firstChild; LEARN.span = LEARN.text.firstChild;
  LEARN.text.style.cssText = 'left:36px;top:4px;width:1144px;height:148px';
  const LBADGE = slab(LEARN.bd, 'lbadge c-accent', 1210, 27, 264, 102, { d: 24, n: 3, r: 22, z: 70, grp: 'q' });
  LBADGE.ft.textContent = 'هل تعرف؟';

  // mascot
  const MASC = slab(rig, 'masc c-frame', 1642, SAFE_B - 172, 170, 170, { d: 34, n: 4, r: 85, grp: 'always' });
  MASC.ft.innerHTML = MARK('#FFC83D');
  const MP = { hook: MASC.ft.querySelector('.m-hook'), eye: MASC.ft.querySelector('.m-eye'), pupil: MASC.ft.querySelector('.m-pupil') };
  // talk rings: two short arcs hugging the mascot's left side, in the gap between the strip and the mascot. Each element's box is
  // the arc's own box (never over an option key, the strip's text or below y = 950); they sit at the mascot face's depth.
  const WAVES = [0, 1].map(i => {
    const P = 4.5, r = 93.5 + i * 13, a = 48 * Math.PI / 180, x0 = 85 - r - P, x1 = 85 - r * Math.cos(a) + P, y0 = 85 - r * Math.sin(a) - P, y1 = 85 + r * Math.sin(a) + P;
    const w = $('div', 'wave', MASC.wrap, `<svg viewBox="${f1(x0)} ${f1(y0)} ${f1(x1 - x0)} ${f1(y1 - y0)}"><path d="M${f1(x1 - P)} ${f1(y0 + P)}A${r} ${r} 0 0 0 ${f1(x1 - P)} ${f1(y1 - P)}"/></svg>`);
    w.style.cssText = `left:${f1(x0)}px;top:${f1(y0)}px;width:${f1(x1 - x0)}px;height:${f1(y1 - y0)}px;transform:translateZ(36px)`; return w;
  });
  const CONF = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const c = $('div', 'confetti', MASC.wrap); c.style.background = ['#2AD46F', '#FFC532', '#FFFFFF', '#FF74AE'][i % 4]; c.a = -Math.PI * (0.12 + i * 0.11); return c; });

  // cards
  const CARD = slab(rig, 'card c-frame', 130, 50, 1660, 736, { d: 100, n: 5, r: 60, grp: 'card' });
  CARD.ft.innerHTML = '<div class="stripes"></div><div class="ctitle tx tx-card"><span></span></div><div class="cnew tx tx-sub"><span></span></div><div class="csub tx tx-sub"><span></span></div><div class="cstake"><div class="pill">' + STAR + '<span class="tx tx-sub"></span></div></div>';
  const CT = { title: CARD.ft.children[1], nw: CARD.ft.children[2], sub: CARD.ft.children[3], stake: CARD.ft.children[4] };
  CT.stakeSpan = CT.stake.querySelector('span');
  CT.title.style.cssText = 'left:80px;top:70px;width:1010px;height:250px'; CT.nw.style.cssText = 'left:80px;top:326px;width:1010px;height:84px'; CT.sub.style.cssText = 'left:80px;top:410px;width:1010px;height:80px';
  const DISC = slab(CARD.bd, 'disc c-accent', 1170, 80, 410, 410, { d: 44, n: 4, r: 205, z: 100, grp: 'card' });
  DISC.ft.innerHTML = '<div class="disc-cap"></div>'; DISC.cap = DISC.ft.firstChild; DISC.cap.style.cssText = 'left:0;width:410px;bottom:34px';
  const DNUM = glyph3d(DISC.bd, 0, 0, 410, 410, 44, 56, 9, 300);
  DNUM.el.style.cssText += ';--g-top:var(--on-accent);--g-side:var(--a-lo)';
  const TALLY = slab(CARD.bd, 'tally c-accent', 80, 520, 1010, 160, { d: 40, n: 3, r: 34, z: 100, grp: 'card' });
  TALLY.ft.innerHTML = '<span class="tx tx-big"></span>'; TALLY.span = TALLY.ft.firstChild;
  const CHIPS = [0, 1, 2, 3].map(i => { const s = slab(rig, `chip c-tile lv${i + 1}`, 116 + (3 - i) * 382, SAFE_B - 120, 356, 120, { d: 56, n: 4, r: 26, grp: 'card' }); s.ft.innerHTML = `<div class="cn2">${ar(i + 1)}</div><div class="cname"></div><div class="cst">${IC_OK}${IC_NOW}${IC_LOCK}</div>`; s.name = s.ft.children[1]; return s; });
  // speed card
  const SBAND = slab(rig, 'sband c-accent', -90, 290, 2100, 350, { d: 70, n: 5, r: 0, grp: 'speed' });
  SBAND.ft.innerHTML = '<div class="zz"></div>';
  const STITLE = glyph3d(SBAND.bd, 0, 0, 2100, 350, 70, 40, 7, 210);
  STITLE.el.style.cssText += ';--g-top:var(--on-accent);--g-side:var(--a-lo)';
  const SSUB = slab(rig, 'ssub c-frame', 300, 676, 1320, 124, { d: 50, n: 4, r: 30, grp: 'speed' });
  SSUB.ft.innerHTML = '<span class="tx"></span>'; SSUB.span = SSUB.ft.firstChild;
  const SCARDS = [0, 1, 2].map(i => { const s = slab(rig, 'scard c-tile', 400 + i * 390, 68, 310, 222, { d: 40, n: 3, r: 26, grp: 'speed' }); s.ft.textContent = '؟'; return s; });
  const STREAKS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const e = $('div', 'streak', rig); e.style.cssText = `left:0;top:${[30, 150, 250, 660, 790, 870, 960, 1040][i]}px;width:${[260, 420, 180, 340, 220, 460, 300, 200][i]}px`; e.v = [2600, 3400, 2200, 3000, 2500, 3600, 2800, 2300][i]; e.s = i * 517; return e; });
  // ladder
  const LTITLE = slab(rig, 'ltitle c-frame', 330, 42, 1260, 128, { d: 56, n: 4, r: 34, grp: 'ladder' });
  LTITLE.ft.innerHTML = '<span class="tx"></span>'; LTITLE.span = LTITLE.ft.firstChild;
  const LSTEPS = [0, 1, 2, 3, 4].map(i => { const s = slab(rig, `lstep c-lv${Math.min(4, i + 1)}`, 0, 0, 372, 300, { d: 110, n: 5, r: 30, grp: 'ladder' }); s.ft.innerHTML = `<div class="rng"></div><div class="stt tx tx-step"></div>${STAR}`; s.rng = s.ft.children[0]; s.stt = s.ft.children[1]; s.star = s.ft.children[2]; return s; });
  // end frame
  const ETEXT = slab(rig, 'etext c-frame', 250, 56, 1420, 250, { d: 60, n: 4, r: 44, grp: 'end' });
  ETEXT.ft.innerHTML = '<span class="tx"></span><span class="tx esub"></span>'; ETEXT.main = ETEXT.ft.children[0]; ETEXT.sub = ETEXT.ft.children[1];
  const SLOTV = slab(rig, 'slotv c-frame', 150, 380, 896, 528, { d: 70, n: 5, r: 36, grp: 'end' }); SLOTV.ft.innerHTML = '<div class="slot-in"></div>';
  const SLOTR = slab(rig, 'slotr c-frame', 1230, 440, 350, 350, { d: 60, n: 5, r: 175, grp: 'end' }); SLOTR.ft.innerHTML = '<div class="slot-in"></div>';

  /* ---------------------------------------------------------------- text fitting (off-screen measurer, cached) */
  const FITC = new Map(), LINT = [];
  function fit(cls, text, w, h, max, min, lines = 1, where = '') {
    const key = [cls, text, w, h, max, min, lines].join('|');
    if (FITC.has(key)) return FITC.get(key);
    M.className = 'tx ' + cls; M.textContent = text;
    M.style.width = lines > 1 ? w + 'px' : 'auto'; M.style.whiteSpace = lines > 1 ? 'normal' : 'nowrap';
    M.style.fontSize = '100px';
    const lh = parseFloat(getComputedStyle(M).lineHeight) / 100;
    let s = max, ok = false;
    for (;;) {
      M.style.fontSize = s + 'px';
      ok = M.scrollWidth <= w + 1 && M.offsetHeight <= Math.min(h, lines * s * lh + 2) + 1;
      if (ok || s <= min) break;
      s = Math.max(min, s - (s > 90 ? 4 : 2));
    }
    if (!ok) LINT.push(`text does not fit at ${min}px (${where}): "${text}"`);
    FITC.set(key, s);
    return s;
  }

  /* ---------------------------------------------------------------- flags */
  const SQUARE = new Set(['ch', 'va']);
  const SHAPE = { np: { crop: 0.615 } };   // Nepal: the 4x3 file holds the pennant (with its outline) in its left 61.5%; shown whole, centred on one neutral plate
  const FLAGS = new Map();                 // `${iso}|${slot}` -> decoded <img>
  const flagUrl = iso => `assets/flags/${SQUARE.has(iso) ? '1x1' : '4x3'}/${iso}.svg`;
  const flagAspect = iso => SQUARE.has(iso) ? 1 : SHAPE[iso] ? SHAPE[iso].crop * 4 / 3 : 4 / 3;
  const isoOk = iso => typeof iso === 'string' && /^[a-z]{2}(-[a-z]{2,3})?$/.test(iso);
  /** v1.4 emoji value: a short non-empty string with no Latin/Arabic letters (one emoji or a ZWJ sequence); drawn with QuizEmoji only */
  const emoOk = e => typeof e === 'string' && e.trim().length > 0 && e.trim().length <= 16 && !/[A-Za-z؀-ۿ]/.test(e);
  async function needFlag(iso, slot) {
    const key = iso + '|' + slot;
    if (!isoOk(iso) || FLAGS.has(key)) return;
    const img = new Image(); img.decoding = 'sync'; img.src = flagUrl(iso); FLAGS.set(key, img);
    try { await img.decode(); } catch { LINT.push(`flag missing: ${iso}`); img.broken = true; }
  }
  function putFlag(host, iso, slot) {
    const img = FLAGS.get(iso + '|' + slot);
    if (img && host._img === img && img.parentNode === host) return img;
    if (host._img && host._img.parentNode === host) host.removeChild(host._img);
    host._img = img || null;
    if (img && !img.broken) host.insertBefore(img, host.firstChild);
    return img;
  }

  /* ---------------------------------------------------------------- animals (v1.4) */
  // Noto Color Emoji: ascender 950 + descender 250 on 1024 units: the art fills a 1.172 em square centred on a line-height-1 box
  const EM_ART = 1200 / 1024, ABORDER = 0;

  /* ---------------------------------------------------------------- show state */
  let ART = {};   // optional show.art {emoji: image url}: a cut-out picture replaces the glyph on the animal plate (art test, 2026-11-13)
  let SHOW = null, SEGS = [], CUR = -1, DRIFT = true, LEVELS = [], CHAIN = Promise.resolve(), LAST = '', LASTINFO = null;
  const wild = () => !!(SHOW.theme && SHOW.theme.palette === 'wild');
  const themeOf = lv => {
    const th = (SHOW.theme && SHOW.theme.level_themes && SHOW.theme.level_themes[String(lv)]) || ('l' + cl(Number(lv) || 1, 1, 4));
    return wild() && /^l[1-4]$/.test(th) ? 'w' + th[1] : th;   // palette "wild" (v1.4) replaces the default l1..l4 themes
  };
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const str = v => (typeof v === 'string' ? v.trim() : '');

  function normalize(show) {
    const segs = (Array.isArray(show.segments) ? show.segments : []).filter(s => s && typeof s === 'object' && isFinite(s.start) && isFinite(s.end)).sort((a, b) => a.start - b.start);
    // levels (order of first appearance) and their question-number ranges
    const lv = new Map();
    for (const s of segs) if (s.type === 'question' && s.level != null) {
      let L = lv.get(s.level); if (!L) lv.set(s.level, L = { n: s.level, name: s.level_name || '', idx: new Set() });
      if (!L.name && s.level_name) L.name = s.level_name;
      L.idx.add(s.index);   // owner 2026-11-13: speed items count (index 1..40, each its own progress slot)
    }
    for (const s of segs) if (s.type === 'card' && s.level != null && lv.has(s.level) && !lv.get(s.level).name && s.level_name) lv.get(s.level).name = s.level_name;
    LEVELS = [...lv.values()];
    const total = num(show.total_questions, 0) || LEVELS.reduce((a, L) => a + L.idx.size, 0);
    let lastTheme = themeOf(LEVELS[0] ? LEVELS[0].n : 1), lastLevel = LEVELS[0] ? LEVELS[0].n : 1, lastIndex = 0;
    const finale = (show.theme && show.theme.finale) || (wild() ? 'wf' : themeOf(LEVELS[0] ? LEVELS[0].n : 1));
    segs.forEach((s, i) => {
      s._i = i; s._prev = segs[i - 1] || null; s._next = segs[i + 1] || null;
      s._host = (Array.isArray(s.host) ? s.host : []).filter(h => h && isFinite(h.t) && isFinite(h.end) && h.end > h.t);
      if (s.type === 'question') { lastLevel = s.level ?? lastLevel; lastTheme = themeOf(lastLevel); }
      else if (s.type === 'card' && s.level != null) { lastLevel = s.level; lastTheme = themeOf(lastLevel); }
      else if (s.type === 'ladder' || s.type === 'end') lastTheme = finale;
      s._th = lastTheme; s._lv = lastLevel;
      s._out = Math.max(s.start, s.end - 0.28);
      if (s.type === 'question') prepQ(s, total, lastIndex), lastIndex = s.index ?? lastIndex;
    });
    for (const s of segs) {
      const isQ = x => x && x.type === 'question';
      s._topIn = isQ(s) && s._i > 0 && !isQ(s._prev);
      s._topOut = isQ(s) && !isQ(s._next);
      if (isQ(s)) { s._a.keepIn = s._lay === 'speed' && isQ(s._prev) && s._prev._lay === 'speed'; s._a.keepOut = s._lay === 'speed' && isQ(s._next) && s._next._lay === 'speed'; }
      s._wipe = !!(s._prev && s._prev._th !== s._th);
      s._calm = s.type === 'end';
    }
    return { ...show, segments: segs, total_questions: total };
  }
  function prepQ(q, total, lastIndex) {
    const T = q.t && typeof q.t === 'object' ? q.t : {};
    const first = q._i === 0 && q.start <= 1e-6;
    const tin = num(T.in, q.start), speed = q.mechanic === 'speed';
    const ts = num(T.timer_start, tin + 1), te = Math.max(ts + 0.1, num(T.timer_end, ts + num(q.think_s, 5)));
    const rv = num(T.reveal, te);
    const out = cl(num(T.out, q.end - 0.3), rv, q.end);
    const str = v => (typeof v === 'string' ? v.trim() : '');
    // speed items: hold_text (or learn_text) shows as the learn strip from reveal + 0.4 s; other layouts need t.learn_in
    const learn = speed ? str(q.hold_text) || str(q.learn_text) : T.learn_in != null ? str(q.learn_text) : '';
    q.options = Array.isArray(q.options) ? q.options.filter(o => o && typeof o === 'object').slice(0, 4) : [];
    q.answers = Array.isArray(q.answers) ? q.answers.filter(o => o && typeof o === 'object').slice(0, 3) : [];
    q.hints = (Array.isArray(q.hints) ? q.hints : []).filter(h => h && isFinite(h.t) && h.text).slice(0, 2);
    q.clue = q.clue && typeof q.clue === 'object' ? q.clue : { type: 'text', text: '' };
    // v1.5 clue {type:"flags"}: pick mode = the options are the flags (iso + text); clue mode = isos[] + labels[] over text options
    const fc = q.clue.type === 'flags' ? q.clue : null;
    q._fpick = !!(fc && fc.pick === true && !speed && q.options.length >= 2 && q.options.every(o => isoOk(o.iso)));
    q._fl = q._fpick ? q.options.map(o => o.iso) : fc && Array.isArray(fc.isos) ? fc.isos.filter(isoOk).slice(0, 4) : [];
    q._fnm = q._fpick ? q.options.map(o => str(o.text)) : q._fl.map((_, i) => (fc && Array.isArray(fc.labels) ? str(fc.labels[i]) : ''));
    q._fnames = !q._fpick && !!(fc && fc.names === true);   // clue mode: labels under the flags from the start (else at the reveal)
    q._lay = speed ? 'speed' : q._fpick ? 'pick' : q.options.length === 2 ? 'two' : q.options.length ? 'std' : 'ans';
    q._learn = learn;
    q._a = { ain: first ? -10 : tin, aoin: first ? -10 : num(T.options_in, tin + 0.35), ts, te, rv, li: learn ? (speed ? Math.min(rv + 0.4, Math.max(rv, q.end - 0.5)) : Math.max(rv, num(T.learn_in, rv + 1.2))) : null, out, end: q.end,
      ex: Math.min(speed ? 0.25 : 0.3, Math.max(0.05, q.end - out)), fast: speed };
    q._cntPop = (q.index ?? 0) !== lastIndex && !first;
    const fxs = ['zoom', 'blur', 'strips'];
    q._pic = q.clue.type === 'flag' && isoOk(q.clue.iso) ? 'flag' : q.clue.type === 'animal' && emoOk(q.clue.emoji) ? 'animal' : '';
    q._fx = q.clue.type === 'flag' && fxs.includes(q.clue.effect) ? q.clue.effect : q._pic === 'animal' && (fxs.includes(q.clue.effect) || q.clue.effect === 'silhouette') ? q.clue.effect : '';
    // reveal sticker: the answer's flag (answer_iso / subject_iso) or animal (answer_emoji / subject_emoji) on text and emoji
    // clues; never on picture clues or when the options already show flags / animals
    const noSt = q.clue.type === 'flag' || q.clue.type === 'flags' || q.clue.type === 'animal' || q._lay === 'ans' || q.options.some(o => o.iso || emoOk(o.emoji));
    q._sticker = noSt ? '' : isoOk(q.answer_iso) ? q.answer_iso : isoOk(q.subject_iso) ? q.subject_iso : '';
    q._stEmo = noSt || q._sticker ? '' : emoOk(q.answer_emoji) ? q.answer_emoji.trim() : emoOk(q.subject_emoji) ? q.subject_emoji.trim() : '';
    q._st = !!(q._sticker || q._stEmo);
    const rnd = mulberry(1000 + q._i * 7919); const ord = [0, 1, 2, 3, 4, 5];
    for (let i = 5; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    q._ord = ord;
  }

  /* ---------------------------------------------------------------- per-segment setup (content, sizes, fits) */
  function hideGroups(keep) { for (const s of ALL) if (s.grp !== 'always' && !keep.includes(s.grp)) off(s); }
  function setTheme(seg) {
    S(world, 'cls', 'th-' + seg._th); S(bg, 'cls', 'bg th-' + seg._th);
    S(bgPrev, 'cls', 'bg th-' + (seg._prev ? seg._prev._th : seg._th));
  }
  function setupTop(q) {
    S(E.bn, 'txt', SHOW.brand || 'شو شايف؟');
    S(E.lvn, 'txt', ar(q.level ?? ''));
    const nm = q.level_name || (LEVELS.find(L => L.n === q.level) || {}).name || '';
    const wn = fitW('', nm, 62); let px = 62, cap = true, need = 44 + 132 + 76 + wn;
    if (need > 600) { cap = false; need -= 132; }
    if (need > 600) { px = Math.max(36, Math.floor(62 * (600 - 44 - 76) / wn)); need = 600; if (px < 59) LINT.push(`level name below 59 px (${px}): "${nm}"`); }
    const lw = Math.max(400, Math.round(need)), lx = 1553 - 22 - lw;
    resize(TB_LEVEL, lx, TOPY, lw, 92); resize(TB_COUNT, 77, TOPY, lx - 22 - 77, 92);
    S(E.cap, 'dp', cap ? '' : 'none'); S(E.lnm, 'txt', nm); S(E.lnm, 'font-size', px + 'px');
    S(E.cn, 'txt', ar(q.index ?? '')); S(E.cof, 'txt', '/ ' + ar(SHOW.total_questions));
    let html = '', k = 0;
    for (const L of LEVELS) {
      const n = L.idx.size; let segs = '';
      for (let j = 0; j < n; j++) { k++; segs += `<i class="${k < q.index ? 'd' : k === q.index ? 'c' : ''}"></i>`; }
      html += `<div class="pg lv${cl(LEVELS.indexOf(L) + 1, 1, 4)}${L.n === q.level ? ' now' : ''}" style="flex:${n}">${segs}</div>`;
    }
    S(E.prog, 'html', html);
  }
  function setupClue(q, tv) {
    const c = q.clue, cw = tv.cw, ch = tv.ch;
    off(tv.plate); for (const s of tv.shut) off(s); for (const s of tv.emo) off(s); off(tv.sticker); off(tv.tag); off(tv.note); for (const s of tv.hint) off(s);
    S(tv.text, 'dp', 'none'); S(tv.lab, 'dp', 'none'); for (const s of tv.ftl) off(s);
    if (q._fl.length) setupFlags(q, tv);
    else if (c.type === 'flag' && isoOk(c.iso)) {
      const asp = flagAspect(c.iso), mh = ch - (q.hints.length ? 76 : 44), mw = cw - 56;
      let ph = mh, pw = ph * asp; if (pw > mw) { pw = mw; ph = pw / asp; }
      pw = Math.round(pw); ph = Math.round(ph);
      resize(tv.plate, Math.round((cw - pw) / 2), Math.round((ch - ph) / 2) - (q.hints.length ? 14 : 0), pw, ph);
      S(tv.plate.wrap, 'cls', 'slab plate' + (SHAPE[c.iso] ? ' np' : ''));
      const img = putFlag(tv.plate.ft, c.iso, 'plate');
      if (img) {
        const iw = pw - 16, ih = ph - 16;
        if (SHAPE[c.iso]) { const pad = Math.round(ih * 0.035), fh = ih - 2 * pad, fw = fh * 4 / 3; img.style.cssText = `left:${Math.round((iw - fw * SHAPE[c.iso].crop) / 2)}px;top:${pad}px;height:${fh}px;width:${Math.round(fw)}px`; }
        else img.style.cssText = `left:0;top:0;width:${iw}px;height:${ih}px`;
        const f = Array.isArray(c.focus) ? c.focus : [0.5, 0.5];
        q._f = [cl(num(f[0], .5)), cl(num(f[1], .5))]; q._iw = iw; q._ih = ih;
        img.style.transformOrigin = `${f1(q._f[0] * 100)}% ${f1(q._f[1] * 100)}%`;
        img.style.transform = ''; img.style.filter = 'none'; if (img._c) { img._c.tf = ''; img._c.fl = 'none'; }
      }
      q._img = img || null;
      if (q._fx === 'strips') tv.shut.forEach((s, i) => resize(s, Math.round(i * pw / 6) - (i ? 0 : 0), 0, Math.ceil(pw / 6) + 1, ph));
      if (q._fx) { const name = { zoom: 'تكبير', blur: 'ضباب', strips: 'ستائر' }[q._fx]; S(tv.tagSpan, 'txt', name); const tw = fitW('', name, 36) + 56; resize(tv.tag, tv.w - BZ - tw - 6, -10, tw, 64); }
    } else if (q._pic === 'animal') {
      // v1.4: one big animal (QuizEmoji, vector) standing on a spotlight floor inside the 4:3 plate (same box as a flag plate)
      const mh = ch - (q.hints.length ? 76 : 44), mw = cw - 56;
      let ph = mh, pw = ph * 4 / 3; if (pw > mw) { pw = mw; ph = pw * 3 / 4; }
      pw = Math.round(pw); ph = Math.round(ph);
      resize(tv.plate, Math.round((cw - pw) / 2), Math.round((ch - ph) / 2) - (q.hints.length ? 14 : 0), pw, ph);
      S(tv.plate.wrap, 'cls', 'slab plate animal' + (q._fx === 'silhouette' ? ' sil' : ''));
      putFlag(tv.plate.ft, '', 'plate');   // drop a flag image left over from an earlier segment
      { const art = ART[c.emoji.trim()]; S(tv.plate.emo, 'html', art ? '<img class="aimg" alt="" src="' + art + '">' : c.emoji.trim()); }
      const iw = pw - 2 * ABORDER, ih = ph - 2 * ABORDER, A0 = Math.round(ih * 0.74);
      const f = Array.isArray(c.focus) ? c.focus : [0.5, 0.5];
      q._ag = { iw, ih, A0, F0: A0 / EM_ART, cx: iw / 2, cy: ih * 0.47, fx: cl(num(f[0], .5)), fy: cl(num(f[1], .5)) };
      if (q._fx === 'strips') tv.shut.forEach((s, i) => resize(s, Math.round(i * pw / 6), 0, Math.ceil(pw / 6) + 1, ph));
      if (q._fx) { const name = { zoom: 'تكبير', blur: 'ضباب', strips: 'ستائر', silhouette: 'ظلّ' }[q._fx]; S(tv.tagSpan, 'txt', name); const tw = fitW('', name, 36) + 56; resize(tv.tag, tv.w - BZ - tw - 6, -10, tw, 64); }
    } else if (c.type === 'emoji' && Array.isArray(c.items) && c.items.length) {
      const items = c.items.slice(0, 4), n = items.length, sz = Math.floor(Math.min(260, ch - 110, (cw - 24 - (n - 1) * 12) / n));
      const x0 = (cw - (n * sz + (n - 1) * 12)) / 2;
      items.forEach((it, i) => { const s = tv.emo[i]; resize(s, Math.round(x0 + (n - 1 - i) * (sz + 12)), Math.round((ch - sz) / 2), sz, sz); S(s.span, 'txt', String(it)); S(s.span, 'font-size', Math.round(sz * 0.64) + 'px'); });
      q._emo = n;
    } else {
      const letter = c.type === 'letter';
      // v1.4 who_am_i: clue.lines [...] (or text with "\n") = 2-3 stacked lines, one line each, all at the size of the longest
      const lines = letter ? [] : (Array.isArray(c.lines) ? c.lines : String(c.text || '').split('\n')).map(l => ar(String(l ?? '').trim())).filter(Boolean).slice(0, 3);
      if (lines.length > 1) {
        const n = lines.length, lh = (ch - 50) / n;
        const px = Math.min(...lines.map((l, j) => fit('tx-clue', l, cw - 60, lh, 116, 56, 1, q.id + ' clue line ' + (j + 1))));
        S(tv.text, 'dp', ''); S(tv.text, 'cls', 'cluetext tx tx-clue multi');
        S(tv.textSpan, 'html', lines.map((l, j) => `<b class="ln ln${j + 1}">${esc(l)}</b>`).join(''));
        S(tv.textSpan, 'font-size', px + 'px'); S(tv.textSpan, 'width', (cw - 40) + 'px');
      } else {
        const text = letter ? ar(c.letter || '') : lines[0] || '';
        S(tv.text, 'dp', ''); S(tv.text, 'cls', 'cluetext tx tx-clue' + (letter ? ' letter' : ''));
        S(tv.textSpan, 'html', esc(text));   // always 'html' (the multi-line branch writes html too)
        S(tv.textSpan, 'font-size', (letter ? Math.min(420, ch - 60) : fit('tx-clue', text, cw - 90, ch - 60, 150, 54, 3, q.id + ' clue')) + 'px');
        S(tv.textSpan, 'width', (cw - 90) + 'px');
      }
    }
    q._note = typeof q.hook_text === 'string' && !!q.hook_text.trim();
    if (q._note) {   // optional small on-screen line on the clue frame (Q1 hook_text)
      const name = ar(q.hook_text.trim()), px = Math.min(34, Math.floor(34 * (tv.w - 330) / Math.max(1, fitW('', name, 34)))), tw = fitW('', name, px) + 52;
      X(tv.noteSpan, name); S(tv.note.ft, 'font-size', px + 'px'); resize(tv.note, 44, -14, tw, 62);
      // opening pick question (wide TV): a big readable banner on the bottom bezel, brand yellow with dark text (clear of flags, label, HUD, timer)
      const big = q._lay === 'pick', yel = (k, v) => S(tv.note.wrap, k, big ? v : '');
      yel('--face', '#FFD23F'); yel('--s-hi', '#FFE98A'); yel('--s-mid', '#D9A400'); yel('--s-lo', '#A87C00'); yel('--txt', '#2A0B3A');
      if (big) { const bp = Math.min(54, Math.floor(54 * (tv.w - 400) / Math.max(1, fitW('', name, 54)))), bw = fitW('', name, bp) + 84, bh = 88; S(tv.note.ft, 'font-size', bp + 'px'); resize(tv.note, Math.round((tv.w - bw) / 2), tv.h - bh - 4, bw, bh); }
    }
    if (q._sticker) { putFlag(tv.sticker.ft, q._sticker, 'sticker'); S(tv.sticker.wrap, 'cls', tv.sticker.base); }
    else if (q._stEmo) { putFlag(tv.sticker.ft, '', 'sticker'); S(tv.sticker.emo, 'txt', q._stEmo); S(tv.sticker.wrap, 'cls', tv.sticker.base + ' emo-st'); }
    // hint chips sit on the bottom bezel
    const ws = q.hints.map(h => fitW('', ar(h.text), 44) + 96);
    let x = (tv.w - (ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * 20)) / 2;
    q.hints.forEach((h, j) => { const s = tv.hint[j]; S(s.span, 'txt', ar(h.text)); resize(s, Math.round(tv.w - x - ws[j]), tv.h - 98, ws[j], 88); x += ws[j] + 20; });
  }
  /** v1.5 multi-flag layout: every flag in one clue shares the same HEIGHT (true proportions from clue.ratio, else the file's
   *  4:3 / 1:1 / Nepal crop); one row or two rows (2 + 1 / 2 + 2), whichever gives clearly taller flags. Pick mode: label line on
   *  top, number badges, names at the reveal. A name line is reserved under every flag whenever there are names (no jump). */
  function setupFlags(q, tv) {
    const c = q.clue, cw = tv.cw, ch = tv.ch, n = q._fl.length, pick = q._fpick;
    const ratio = c.ratio && typeof c.ratio === 'object' ? c.ratio : {};
    // ratio [a, b] is read order-free as a landscape flag (w/h = max/min): the brief writes the usual flag notation (mc [4, 5] =
    // 4:5 height:width, id [2, 3]) under the label (width, height), and every stripe flag is wider than tall
    const asp = q._fl.map(iso => { const r = ratio[iso]; return Array.isArray(r) && num(r[0], 0) > 0 && num(r[1], 0) > 0 ? Math.max(r[0], r[1]) / Math.min(r[0], r[1]) : flagAspect(iso); });
    const label = pick ? ar(str(c.label)) : '';
    const grid4 = !pick && n === 4;   // clue-mode 2x2: compact name rows, gaps and margins so the four flags fill the TV
    const LH = pick ? 80 : 0, NH = q._fnm.some(Boolean) ? (pick ? 58 : grid4 ? 48 : 64) : 0, GX = pick ? 22 : 28, GY = grid4 ? 10 : 26, M = pick ? 8 : grid4 ? 10 : 22, RIM = 6;
    const top = M + LH + (pick ? 40 : 0), W0 = cw - 2 * M, H0 = ch - top - M - (q.hints.length ? 40 : 0);
    let best = null;
    // clue mode: 4 flags = 2x2, 3 flags = whichever of one row / 2 + 1 gives the bigger flags, 2 flags = one row (v1.5c)
    for (const rows of n === 4 && !pick ? [[2, 2]] : n >= 3 ? [[n], [2, n - 2]] : [[n]]) {
      let k = 0; const sums = rows.map(m => { const v = asp.slice(k, k + m).reduce((a, b) => a + b, 0); k += m; return v; });
      const h = Math.min((H0 - rows.length * NH - (rows.length - 1) * GY) / rows.length - 2 * RIM, ...sums.map((v, j) => (W0 - (rows[j] - 1) * GX - rows[j] * 2 * RIM) / v));
      if (!best || h > best.h * (pick ? 1.06 : 1.0)) best = { h, rows };   // pick: two rows only when clearly bigger (side by side reads best); clue mode: simply the bigger
    }
    const fh = Math.floor(best.h), rowsN = best.rows.length, blockH = rowsN * (fh + 2 * RIM + NH) + (rowsN - 1) * GY;
    let y = top + Math.max(0, Math.round((H0 - blockH) / 2)), k = 0;
    q._ftl = [];
    best.rows.forEach(m => {
      const ws = asp.slice(k, k + m).map(a => Math.round(fh * a) + 2 * RIM), rw = ws.reduce((a, b) => a + b, 0) + (m - 1) * GX;
      let x = Math.round((cw - rw) / 2);
      for (let j = m - 1; j >= 0; j--) {   // RTL: the first flag of a row sits on the right
        const i = k + j, s = tv.ftl[i], w = ws[j], iso = q._fl[i];
        resize(s, x, y, w, fh + 2 * RIM); x += w + GX; q._ftl[i] = s;
        const img = putFlag(s.img, iso, 'ft'), iw = w - 2 * RIM, ih = fh;
        if (img) {
          // the 4:3 (or 1:1) file is drawn at the flag's height and stretched sideways to its true width (stripe flags only, brief)
          const fa = SQUARE.has(iso) ? 1 : 4 / 3, r = ratio[iso];
          if (!r && SHAPE[iso]) img.style.cssText = `left:${Math.round((iw - ih * fa * SHAPE[iso].crop) / 2)}px;top:0;width:${Math.round(ih * fa)}px;height:${ih}px`;
          else img.style.cssText = `left:0;top:0;width:${f1(ih * fa)}px;height:${ih}px;transform-origin:0 0;transform:scaleX(${f3(iw / (ih * fa))})`;
        }
        S(s.num, 'txt', pick ? ar(i + 1) : ''); S(s.num, 'dp', pick ? '' : 'none');
        const nm = ar(q._fnm[i] || ''), nw = Math.min(w + GX - 10, Math.max(w, 260));
        S(s.name, 'dp', nm ? '' : 'none'); S(s.name, 'left', Math.round((w - nw) / 2) + 'px'); S(s.name, 'width', nw + 'px'); S(s.name, 'top', (fh + 2 * RIM + 10) + 'px'); S(s.name, 'height', (NH - 12) + 'px');
        if (nm) { S(s.nameSpan, 'txt', nm); S(s.nameSpan, 'font-size', fit('', nm, nw - 28, NH - 12, pick ? 48 : 44, 26, 1, q.id + ' flag name ' + (i + 1)) + 'px'); }
      }
      y += fh + 2 * RIM + NH + GY; k += m;
    });
    q._fh = fh;
    if (pick) {
      S(tv.lab, 'dp', 'flex'); S(tv.lab, 'top', M + 'px'); S(tv.lab, 'height', LH + 'px'); S(tv.lab, 'width', cw + 'px');
      S(tv.labSpan, 'txt', label); S(tv.labSpan, 'font-size', fit('tx-clue', label, cw - 80, LH, 76, 40, 1, q.id + ' flags label') + 'px');
    }
  }
  function fitW(cls, text, px) { M.className = 'tx ' + cls; M.style.width = 'auto'; M.style.whiteSpace = 'nowrap'; M.style.fontSize = px + 'px'; M.textContent = text; return M.offsetWidth; }
  function setKeyText(k, text, w, h, max, min, lines, where) {
    S(k.kt, 'txt', text); S(k.kt, 'font-size', fit('tx-opt', text, w, h, max, min, lines, where) + 'px');
  }
  function setupQ(q) {
    hideGroups(['q', 'top']);
    setTheme(q); setupTop(q);
    const lay = q._lay, hero = lay === 'speed', pick = lay === 'pick', wide = lay === 'std' && q._fl.length > 0, tv = hero ? TVB : pick ? TVW : wide ? TVC : TV;
    q._tv = tv; for (const o of [TV, TVB, TVW, TVC]) if (o !== tv) off(o);
    // column geometry: the standard values unless a multi-flag clue widens the TV (same writes = no change for every other item)
    const cw = wide ? CWC : CW;
    S(COL, 'left', (wide ? 1122 : 972) + 'px'); S(COL, 'width', cw + 'px');
    resize(PLAQUE, 0, 164, cw, 124); PLAQUE.tw = cw - 52;
    KEYS.forEach((k, i) => resize(k, 0, 328 + i * 118, cw, 96));
    setupClue(q, tv);
    const plaque = hero ? PLAQUES : PLAQUE, strip = hero ? STRIPS : STRIP;
    off(hero ? PLAQUE : PLAQUES); off(hero ? STRIP : STRIPS);
    if (pick) off(plaque);   // pick mode: the label on the wide TV carries the question (ask_text is spoken only)
    q._plaque = pick ? null : plaque; q._strip = strip;
    const ask = ar(q.ask_text || '');
    if (!pick) { X(plaque.span, ask); S(plaque.span, 'font-size', fit('tx-ask', ask, plaque.tw, 116, 70, 34, 2, q.id + ' ask') + 'px'); S(plaque.span, 'width', plaque.tw + 'px'); }
    S(strip.ticks, '--n', String(Math.max(1, Math.round(q._a.te - q._a.ts))));
    for (const k of KEYS) off(k); for (const k of BIG) off(k); for (const k of ANS3) off(k); off(ANSS); off(SPD);
    S(SOCKET, 'dp', hero ? '' : 'none'); S(ALSO, 'dp', 'none');
    q._keys = [];
    if (lay === 'std') {
      q.options.forEach((o, i) => {
        const k = KEYS[i]; q._keys.push(k); S(k.kb, 'txt', LETTERS[i]);
        const has = isoOk(o.iso) && putFlag(k.kf, o.iso, 'key'), emo = !has && emoOk(o.emoji);
        k.extra = has ? ' hasflag' : emo ? ' hasemo' : '';
        if (emo) S(k.kemo, 'txt', o.emoji.trim());
        setKeyText(k, ar(o.text || ''), cw - 40 - 70 - 66 - 40 - (has || emo ? 116 : 0), 88, 64, 30, 1, q.id + ' option');
      });
    } else if (lay === 'two') {
      q.options.forEach((o, i) => {
        const k = BIG[i]; q._keys.push(k);
        const has = isoOk(o.iso) && putFlag(k.bflag, o.iso, 'big'), emo = !has && emoOk(o.emoji);
        k.extra = has ? ' hasflag' : emo ? ' hasemo' : '';
        if (emo) S(k.bemo, 'txt', o.emoji.trim());
        setKeyText(k, ar(o.text || ''), BW - 44, has || emo ? 130 : 300, has || emo ? 84 : 170, 40, 1, q.id + ' option');
      });
    } else if (lay === 'speed') {
      const a = q.answers[0] || { text: '' };
      setKeyText(ANSS, ar(a.text || ''), AW - 64, 290, 124, 54, 2, q.id + ' answer'); S(ANSS.kt, 'width', (AW - 64) + 'px'); ANSS.extra = '';
      S(SPD.st, 'txt', 'جولة السرعة');
      const tot = cl(Math.round(num(q.speed_total, 3)), 1, 6), cur = Math.round(num(q.speed_index, 1));
      let pips = ''; for (let j = 1; j <= tot; j++) pips += `<i class="${j < cur ? 'd' : j === cur ? 'c' : ''}"></i>`;
      S(SPD.pips, 'html', pips);
    } else {
      q.answers.forEach((a, i) => {
        const k = ANS3[i]; const has = isoOk(a.iso) && putFlag(k.kf, a.iso, 'key'); k.extra = has ? ' hasflag' : '';
        setKeyText(k, ar(a.text || ''), CW - 80 - (has ? 116 : 0) - 86, 100, 70, 30, 1, q.id + ' answer');
      });
      if (q.also_text) { X(ALSO, ar(q.also_text)); S(ALSO, 'font-size', fit('', ar(q.also_text), CW - 36, 58, 40, 24, 1, q.id + ' also') + 'px'); }
    }
    if (q._learn) { const t = ar(q._learn); X(LEARN.span, t); S(LEARN.span, 'font-size', fit('tx-learn', t, 1144, 148, 62, 46, 2, q.id + ' learn') + 'px'); } else { off(LEARN); off(LBADGE); }
  }
  function setupCard(c) {
    const speed = c.kind === 'speed';
    hideGroups([speed ? 'speed' : 'card']);
    for (const e of STREAKS) S(e, 'dp', speed ? '' : 'none');
    setTheme(c);
    if (speed) {
      const title = ar(c.title || 'جولة السرعة'); STITLE.set(title, fit('', title, 1500, 300, 220, 90, 1, 'speed card title'));
      const sub = ar(c.sub || ''); c._sub = !!sub; X(SSUB.span, sub); S(SSUB.span, 'font-size', fit('', sub, 1260, 110, 62, 30, 1, 'speed card sub') + 'px');
      return;
    }
    const promise = c.kind === 'promise';
    const nLv = LEVELS.length || 4;
    const title = ar(c.title || (promise ? `${SHOW.total_questions} سؤال | ${nLv} مستويات` : `المستوى ${c.level ?? ''}${c.level_name ? ': ' + c.level_name : ''}`));
    // optional stake line (pill): title / new_text / sub move up and tighten so nothing meets the tally plate
    const stake = ar(typeof c.stake_text === 'string' ? c.stake_text.trim() : ''), hasSub = !!(c.sub && String(c.sub).trim()), th = stake ? 200 : 250;
    c._stake = !!stake;
    S(CT.title, 'top', (stake ? 50 : 70) + 'px'); S(CT.title, 'height', th + 'px');
    S(CT.nw, 'top', (stake ? 254 : 326) + 'px'); S(CT.sub, 'top', (stake ? 334 : 410) + 'px'); S(CT.sub, 'height', (stake ? 68 : 80) + 'px');
    S(CT.stake, 'dp', stake ? '' : 'none');
    if (stake) { const sh = hasSub ? 92 : 100; S(CT.stake, 'top', (hasSub ? 406 : 366) + 'px'); S(CT.stake, 'height', sh + 'px'); X(CT.stakeSpan, stake); S(CT.stakeSpan, 'font-size', fit('tx-sub', stake, 1010 - 130, sh - 12, 72, 34, 1, 'card stake_text') + 'px'); }
    X(CT.title.firstChild, title); S(CT.title.firstChild, 'font-size', fit('tx-card', title, 1010, th, 150, 56, promise ? 3 : 2, 'card title') + 'px');
    const nw = ar(c.new_text || c.series_text || ''); X(CT.nw.firstChild, nw); if (nw) S(CT.nw.firstChild, 'font-size', fit('tx-sub', nw, 1010, 84, 60, 34, 1, 'card new_text') + 'px');
    const sub = ar(c.sub || ''); X(CT.sub.firstChild, sub); if (sub) S(CT.sub.firstChild, 'font-size', fit('tx-sub', sub, 1010, stake ? 68 : 80, 56, 32, 1, 'card sub') + 'px');
    const tally = ar(c.tally_text || ''); c._tally = !!tally; X(TALLY.span, tally); if (tally) S(TALLY.span, 'font-size', fit('tx-big', tally, 950, 150, 84, 40, 2, 'card tally') + 'px'); S(TALLY.span, 'width', '950px');
    const big = promise ? ar(SHOW.total_questions) : ar(c.level ?? '');
    DNUM.set(big, big.length > 1 ? 220 : 300); S(DISC.cap, 'txt', promise ? 'سؤال' : ''); S(DNUM.el, 'top', promise ? '-36px' : '0px');
    c._chips = Math.min(4, LEVELS.length);
    const li = LEVELS.findIndex(L => L.n === c.level);
    CHIPS.forEach((s, i) => {
      if (i >= c._chips) { off(s); return; }
      const nm = LEVELS[i].name || ''; S(s.name, 'txt', nm); S(s.name, 'font-size', fit('', nm, 190, 80, 54, 30, 1, 'chip') + 'px');
      const st = promise || li < 0 ? 's-up' : i < li ? 's-done' : i === li ? 's-now' : 's-lock';
      S(s.wrap, 'cls', `slab chip c-tile lv${i + 1} ${st}`); s.now = st === 's-now';
    });
  }
  function setupLadder(l) {
    hideGroups(['ladder']); for (const e of STREAKS) S(e, 'dp', 'none'); setTheme(l);
    const title = ar(l.title || ''); X(LTITLE.span, title); S(LTITLE.span, 'font-size', fit('', title, 1200, 120, 86, 40, 1, 'ladder title') + 'px');
    const rows = (Array.isArray(l.rows) ? l.rows : []).filter(r => r && typeof r === 'object').slice(0, 5), n = rows.length;
    l._n = n;
    const gap = 22, w = Math.min(346, Math.floor((1450 - (n - 1) * gap) / Math.max(1, n))), x0 = 160 + (1450 - (n * w + (n - 1) * gap)) / 2;
    LSTEPS.forEach((s, i) => {
      if (i >= n) { off(s); return; }
      const h = Math.round(320 + (n > 1 ? i * (350 / (n - 1)) : 0));
      resize(s, Math.round(x0 + (n - 1 - i) * (w + gap)), SAFE_B - 4 - h, w, h); s.hh = h;
      const r = rows[i];
      S(s.rng, 'html', `<span>${esc(ar(r.min ?? ''))}</span><em>–</em><span>${esc(ar(r.max ?? ''))}</span>`);
      const t = ar(r.title || ''); X(s.stt, t); S(s.stt, 'font-size', fit('tx-step', t, w - 30, 140, 62, 30, 2, 'ladder row') + 'px');
      S(s.star, 'dp', i === n - 1 ? '' : 'none');
    });
  }
  function setupEnd(e) {
    hideGroups(['end']); for (const s of STREAKS) S(s, 'dp', 'none'); setTheme(e);
    let text = String(e.text || ''), sub = String(e.sub || '');
    if (!sub) { const p = text.split(/\s+[|·•]\s+/); if (p.length > 1) { text = p.shift(); sub = p.join(' | '); } }   // «A | B»: two lines, no separator glyph
    text = ar(text); sub = ar(sub);
    X(ETEXT.main, text); S(ETEXT.main, 'font-size', fit('', text, 1340, sub ? 130 : 220, 100, 44, sub ? 1 : 2, 'end text') + 'px');
    X(ETEXT.sub, sub); if (sub) S(ETEXT.sub, 'font-size', fit('', sub, 1340, 80, 58, 30, 1, 'end sub') + 'px'); S(ETEXT.sub, 'dp', sub ? '' : 'none');
  }

  /* ---------------------------------------------------------------- per-frame drawing */
  function drawWorld(seg, t) {
    const td = seg._calm ? seg.start : t, k = DRIFT ? 1 : 0;
    S(rig, 'tf', `translateZ(-30px) rotateX(${f3(6 + k * .45 * Math.sin(TAU * td / 27 + 1))}deg) rotateY(${f3(k * .9 * Math.sin(TAU * td / 19))}deg)`);
    for (const b of BLK) {
      const i = b.i, ph = TAU * (td / (11 + i * 1.7)) + i * 1.3;
      pose(b, { y: k * 16 * Math.sin(ph), x: k * 9 * Math.cos(ph * .7), rz: b.rz + k * 5 * Math.sin(ph * .6 + 1), rx: 14 + (i % 3) * 6, ry: (i % 2 ? -1 : 1) * (16 + (i % 4) * 4) });
    }
    if (seg._wipe) {
      const w = eo(pr(t, seg.start, .5)), x1 = w * (W + 520);
      S(bg, 'clip-path', w >= 1 ? 'none' : `polygon(0px 0px, ${f1(x1)}px 0px, ${f1(x1 - 520)}px ${H}px, 0px ${H}px)`);
    } else S(bg, 'clip-path', 'none');
  }
  const PUP = { ask: [-9, -7], teach: [-11, 3], dare: [0, -2], tease: [9, 0], react: [0, -4] };
  function drawMascot(seg, t, rv) {
    let talk = 0, tau = 0, mood = '';
    for (const h of seg._host) { act(h.t, h.end); if (t >= h.t && t < h.end) { tau = t - h.t; talk = Math.min(1, tau / .1, (h.end - t) / .14); mood = String(h.mood || ''); } }
    const B = 3.7, ph = t - Math.floor(t / B) * B;
    if (REC && !seg._calm) for (let b = Math.floor(seg.start / B) * B; b < seg.end; b += B) act(b, b + .15);
    const lid = ph < .15 && !seg._calm ? 1 - .92 * Math.sin(Math.PI * ph / .15) : 1;
    const jp = rv != null ? pr(t, rv, .62) : 0, cp = rv != null ? pr(t, rv, .8) : 0;
    const h1 = rv != null ? step(t, rv) : false, h2 = rv != null ? step(t, rv + 1.5) : false, happy = h1 && !h2;
    const jump = Math.sin(Math.PI * jp), bob = talk * Math.abs(Math.sin(Math.PI * 3.3 * tau));
    pose(MASC, { y: -13 * bob - 100 * jump, rz: 6 * talk * Math.sin(TAU * 1.65 * tau) - 360 * eo(jp), sc: 1 + .2 * jump + .03 * bob, z: 30 * jump });
    S(MASC.wrap, 'cls', 'slab masc c-frame' + (happy ? ' happy' : '') + (/^[a-z]+$/.test(mood) ? ' mood-' + mood : ''));
    S(MP.hook, 'tf', `translateY(${f1(-14 * bob)}px) scaleY(${f3(1 + .1 * talk * Math.sin(TAU * 3.3 * tau))})`);
    S(MP.eye, 'tf', `scaleY(${f3(lid)})`);
    const pu = PUP[mood] || [0, 0]; S(MP.pupil, 'tf', `translate(${pu[0]}px,${pu[1]}px)`);
    WAVES.forEach((w, j) => S(w, 'op', f2(talk * (.25 + .75 * Math.abs(Math.sin(Math.PI * 3.3 * tau - j * .7))))));
    const on = cp > 0 && cp < 1, dist = 190 * eo(cp);
    for (const c of CONF) S(c, 'tf', on ? `translate3d(${f1(Math.cos(c.a) * dist)}px,${f1(Math.sin(c.a) * dist + 120 * cp * cp)}px,70px) rotate(${f1(cp * 320)}deg) scale(${f3(1 - cp * .7)})` : 'scale(0)');
  }
  function drawTop(q, t, x) {
    const xt = q._topOut ? x : 0;
    TOP.forEach((s, i) => {
      const e = q._topIn ? eb(pr(t, q.start + i * .06, .4), 1.4) : 1;
      pose(s, { y: -240 * (1 - e) - 240 * xt, rx: 8 });
    });
    const cp = q._cntPop ? pr(t, q.start, .34) : 1;
    S(E.cn, 'tf', `scale(${f3(1 + .34 * Math.sin(Math.PI * cp))})`);
  }
  function drawTimer(st, t, A) {
    const p = pr(t, A.ts, A.te - A.ts), last = step(t, A.te - 1), done = step(t, A.te);
    S(st.fill, 'tf', `translateX(${f2(p * 101)}%)`);
    S(st.dial, 'txt', ar(Math.ceil((A.te - A.ts) * (1 - p) - 1e-4)));
    S(st.wrap, 'cls', st.base + (done ? ' done' : last ? ' alert' : ''));
    S(st.dial, 'tf', `scale(${f3(last && !done ? 1 + .16 * Math.abs(Math.sin(Math.PI * 3 * (t - (A.te - 1)))) : 1)})`);
  }
  const SHRINK = 0.24;
  const SINK = 0.26, SINK_Y = 3;
  const IDLE = { zx: .05, zy: .04, bb: 12, bx: 30, by: 18, br: 2.5, sT: 1.8, sr: 9, sl: .6 };   // idle motion before timer_start (zoom pan as a share of the crop, blur px / deg, shutter period s / deg / light)
  /** v1.4 animal on its spotlight floor. Zoom / blur scale the scene by font-size (vector glyph re-drawn at every size, never an
   *  upscaled bitmap); the focus point (fx, fy on the emoji's art square) stays where it is while the scene zooms out. */
  function drawAnimal(q, t, pl, p, idle, tau, R, cd) {
    const A = q._a, g = q._ag, fx = q._fx, sil = fx === 'silhouette';
    let sc = 1, dx = 0, dy = 0, blur = 0, rz = 0;
    if (fx === 'zoom') {
      sc = R ? 1 : Math.pow(5, 1 - p) * (1 + .04 * idle * (.5 - .5 * Math.cos(TAU * tau / 5.2)));
      const k = Math.min(1, sc - 1); dx = idle * IDLE.zx * g.A0 * Math.sin(TAU * tau / 4.4) * k; dy = idle * IDLE.zy * g.A0 * Math.sin(TAU * tau / 3.1) * k;
    } else if (fx === 'blur') {
      blur = R ? 0 : (90 * (1 - Math.min(1, p / .85)) - IDLE.bb * idle * Math.sin(TAU * tau / 3.2)) * g.A0 / 400;
      sc = 1 + blur / 220; dx = idle * IDLE.bx * Math.sin(TAU * tau / 4.4); dy = idle * IDLE.by * Math.sin(TAU * tau / 3.1); rz = idle * IDLE.br * Math.sin(TAU * tau / 5.2);
    }
    // entrance: the animal drops onto its floor and bounces (not on zoom: the magnified detail is there from the first frame)
    const dp = fx === 'zoom' ? 1 : pr(t, A.ain + cd + .04, A.fast ? .32 : .5), drop = 1 - eb(dp, 2.2);
    // alive until the reveal (plain + silhouette): a slow breathing bob, never frozen while the host talks
    let bob = 0;
    if (!fx || sil) { act(q.start, A.rv); if (!R) bob = Math.sin(TAU * (t - q.start) / 1.6); }
    // reveal: silhouette pops into colour with a big hop, wiggle and flash; the other looks get a small hop
    const rp = pr(t, A.rv, sil ? .55 : .4), pop = Math.sin(Math.PI * rp);
    // the pop scales the animal from its feet (transform on the glyph only), so neither the floor nor the head leaves the plate
    const ps = 1 + (sil ? .08 : .04) * pop; if (sil) rz += 10 * Math.sin(TAU * 1.5 * rp) * (1 - rp);
    const hop = (sil ? .035 : .025) * g.ih * pop;
    const F = g.F0 * sc, px = g.cx + (g.fx - .5) * g.A0, py = g.cy + (g.fy - .5) * g.A0;
    const cx = px + (g.cx - px) * sc + dx, cy = py + (g.cy - py) * sc + dy;
    S(pl.sc, 'left', f1(cx) + 'px'); S(pl.sc, 'top', f1(cy) + 'px'); S(pl.sc, 'font-size', f2(F) + 'px');
    const lift = drop * g.ih * .9 + hop + 5 * bob;   // px above the floor
    S(pl.emo, 'tf', `translateY(${f1(-lift)}px) rotate(${f2(rz)}deg) scale(${f3(ps)},${f3(ps * (1 + .012 * bob))})`);
    S(pl.shadow, 'tf', `scale(${f3(Math.max(.35, 1 - lift / (g.ih * 1.1)))})`); S(pl.shadow, 'op', f2(cl(.85 - lift / (g.ih * 1.2), .2, .85)));
    const rim = f1(Math.max(2, F * .007));
    S(pl.emo, 'fl', sil && !R ? `brightness(0) drop-shadow(0 0 ${rim}px rgba(255,255,255,.95)) drop-shadow(0 0 ${f1(F * .03)}px rgba(255,255,255,.4))` : blur > .3 ? `blur(${f1(blur)}px)` : 'none');
    const fp = pr(t, A.rv, .45);
    S(pl.flash, 'op', fp > 0 && fp < 1 ? f2((sil ? .95 : .5) * (1 - fp)) : '0'); S(pl.flash, 'tf', `scale(${f3(.25 + (sil ? 1.6 : 1.1) * eo(fp))})`);
    S(pl.beam, 'op', f2(.78 + .22 * Math.sin(Math.PI * fp))); S(pl.beam, 'cls', 'abeam' + (sil && !R ? ' hot' : ''));
  }
  /** v1.5 flag tiles: identical until t.reveal. Pick mode: the right flag lights up (green rim, glow, check, lift + bump like the
   *  answer key), the others dim, and every flag gets its Arabic name. Clue mode: names from the start (names true) or at the reveal. */
  function drawFlags(q, t, A, R, rp, bump, cd) {
    const tv = q._tv, pick = q._fpick;
    if (pick) { const pl = pr(t, A.ain + cd, .36); S(tv.lab, 'op', f2(Math.min(1, pl * 2))); S(tv.lab, 'tf', `scale(${f3(.7 + .3 * eb(pl, 1.8))})`); }
    q._ftl.forEach((s, i) => {
      const p0 = pr(t, (pick ? A.aoin : A.ain + cd) + i * .09, .4), e = eb(p0, 1.8);
      const right = pick && R && i === q.answer_index, keep = pick && R && !right && q.options[i] && q.options[i].keep === true, wrong = pick && R && !right && !keep;
      // opening question (hook_text): staggered pop (flag 1 first), then a soft highlight visits the flags one by one until the countdown starts
      let ps = 0, hl = 0;
      if (q._note && t < A.ts) {
        const pp = pr(t, .15 + i * .22, .35), h0 = .15 + q._ftl.length * .22 + .35, hu = (t - h0) / .6;
        ps = Math.sin(Math.PI * pp);
        if (hu >= 0 && Math.floor(hu) % q._ftl.length === i) hl = Math.pow(Math.sin(Math.PI * (hu - Math.floor(hu))), .6) * cl((A.ts - t) / .25);
      }
      S(s.glow, 'background', hl > 0 ? '#FFE15A' : ''); S(s.ft, 'box-shadow', hl > 0 ? `0 0 0 ${f1(2 + 5 * hl)}px rgba(255,225,90,${f2(hl)})` : '');
      pose(s, { sc: (.3 + .7 * e) * (right ? 1 + (pick ? .03 : .05) * bump : 1) * (1 + .1 * ps + .04 * hl), rz: -4 * ps * (i % 2 ? -1 : 1), z: 18 - 60 * (1 - e) + (right ? (pick ? 12 : 34) * eb(rp, 2.2) : 0) + 40 * ps + 20 * hl, on: p0 > 0 });
      S(s.wrap, 'cls', s.base + (right ? ' st-ok' : wrong ? ' st-no' : ''));
      S(s.glow, 'op', right ? f2(.55 + .35 * (1 - rp)) : hl > 0 ? f2(.7 * hl) : '0');
      const np = q._fnames ? Math.min(1, p0 * 1.6) : pr(t, A.rv + .12 + i * .07, .3);
      S(s.name, 'op', f2(Math.min(1, np * 2))); S(s.name, 'tf', `scale(${f3(q._fnames ? 1 : .5 + .5 * eb(np, 2.2))})`);
    });
  }
  function drawQ(q, t) {
    const A = q._a, tv = q._tv, lay = q._lay, c = q.clue;
    const x = ei(pr(t, A.end - A.ex, A.ex));                     // exit 0..1 (<= 0.3 s, speed <= 0.25 s)
    const xk = A.keepOut ? 0 : x;                                 // chrome that stays between speed items
    const R = step(t, A.rv), rp = pr(t, A.rv, .36), bump = Math.sin(Math.PI * rp);
    const IN = A.fast ? .25 : .5;
    drawTop(q, t, x);
    // clue frame swings in with depth
    const e = A.keepIn ? 1 : eb(pr(t, A.ain, IN), 1.25);
    const shr = lay === 'speed' && q._learn ? eo(pr(t, A.li, .4)) : 0;   // speed + hold text: the hero TV shrinks (top edge fixed) so the learn strip sits under it, never behind it
    pose(tv, { x: -1500 * (1 - e) - 1500 * xk, y: -tv.h * SHRINK / 2 * shr, z: -220 * (1 - e), ry: tv.ry - 50 * (1 - e) - 26 * xk, rx: 4, sc: 1 - SHRINK * shr });
    // clue content
    const cd = A.keepIn ? 0 : IN * .5, ep0 = pr(t, A.ain + cd, A.fast ? .2 : .36), ep = A.keepIn ? eo(ep0) : eb(ep0, 1.8);
    const xp = A.keepOut ? x : 0;
    const mk = q._st ? eo(pr(t, A.rv + .04, .3)) : 0;           // at the reveal the clue makes room for the answer's flag / animal sticker
    if (q._pic) {
      pose(tv.plate, A.keepIn || A.keepOut ? { rx: -88 * (1 - ep) + 88 * xp, z: 26 + 30 * bump, sc: 1, on: ep0 > 0 && xp < 1 } : { sc: .25 + .75 * ep, z: 26 + 30 * bump - 40 * (1 - ep), on: ep0 > 0 });
      const p = pr(t, A.ts, A.te - A.ts), img = q._img;
      // idle motion from the first frame of the segment to timer_start (pure function of t): the picture is never frozen while the
      // host talks. It eases back to the rest pose over the last 0.6 s, so the effect itself starts exactly as before.
      let idle = 0, tau = 0;
      if (q._fx) { act(q.start, A.ts); if (t < A.ts) { tau = t - q.start; const u = cl((A.ts - t) / .6); idle = u * u * (3 - 2 * u); } }
      if (q._pic === 'animal') drawAnimal(q, t, tv.plate, p, idle, tau, R, cd);
      else if (img && q._fx === 'zoom') {
        // slow creep across the magnified detail: +-5 % of the crop sideways (period 4.4 s), +-4 % up/down (3.1 s), <= 4 % push-in (never out)
        const sc = R ? 1 : Math.pow(5, 1 - p) * (1 + .04 * idle * (.5 - .5 * Math.cos(TAU * tau / 5.2)));
        const dx = cl(idle * IDLE.zx * q._iw * Math.sin(TAU * tau / 4.4), -(1 - q._f[0]) * q._iw * (sc - 1), q._f[0] * q._iw * (sc - 1));
        const dy = cl(idle * IDLE.zy * q._ih * Math.sin(TAU * tau / 3.1), -(1 - q._f[1]) * q._ih * (sc - 1), q._f[1] * q._ih * (sc - 1));
        S(img, 'tf', (idle ? `translate(${f1(dx)}px,${f1(dy)}px) ` : '') + `scale(${f3(sc)})`);
      } else if (img && q._fx === 'blur') {
        // breathing blur radius (90 +- 12 px, 3.2 s) and a slight drift / tilt of the blurred picture
        const b = R ? 0 : 90 * (1 - Math.min(1, p / .85)) - IDLE.bb * idle * Math.sin(TAU * tau / 3.2);
        S(img, 'fl', b > .3 ? `blur(${f1(b)}px)` : 'none');
        S(img, 'tf', (idle ? `translate(${f1(idle * IDLE.bx * Math.sin(TAU * tau / 4.4))}px,${f1(idle * IDLE.by * Math.sin(TAU * tau / 3.1))}px) rotate(${f2(idle * IDLE.br * Math.sin(TAU * tau / 5.2))}deg) ` : '') + `scale(${f3(1 + b / 220)})`);
      }
      if (q._fx === 'strips') {
        // shimmer: a wave runs across the closed shutters (each one rattles a few degrees on its hinge and catches the light)
        const span = Math.max(.05, A.te - A.ts - .34);
        tv.shut.forEach((s, j) => {
          const sp = R ? 1 : eo(pr(t, A.ts + q._ord[j] * span / 5, .34)), w = idle ? idle * Math.pow(Math.max(0, Math.sin(TAU * (tau / IDLE.sT - j / 6))), 2) : 0;
          pose(s, { ry: -112 * sp - IDLE.sr * w, z: 10 * w, on: sp < 1 });
          S(s.ft, 'fl', w > .004 ? `brightness(${f2(1 + IDLE.sl * w)})` : 'none');
        });
      }

    } else if (q._fl.length) {
      drawFlags(q, t, A, R, rp, bump, cd);
    } else if (c.type === 'emoji' && q._emo) {
      for (let i = 0; i < q._emo; i++) { const p0 = pr(t, A.ain + cd + i * .08, .34), ee = eb(p0, 2); pose(tv.emo[i], { sc: ee * (1 - .3 * mk), y: 88 * mk, z: 16 + 26 * bump, rz: (i - 1) * 3 * (1 - ee) + (i - (q._emo - 1) / 2) * -2.5, on: p0 > 0 }); }
    } else {
      S(tv.text, 'tf', `translateY(${f1(92 * mk)}px) scale(${f3((.6 + .4 * ep + .04 * bump) * (1 - .36 * mk))})`); S(tv.text, 'op', f2(Math.min(1, ep0 * 2.2)));
    }
    if (q._fx && q._pic) pose(tv.tag, { sc: ep, rz: -3, on: ep0 > 0 && !R });
    if (q._note) pose(tv.note, q._lay === 'pick' ? { sc: 1 + .06 * Math.sin(Math.PI * pr(t, .1, .35)), rz: -2, on: !R } : { sc: Math.min(1, ep), rz: 2, on: ep0 > 0 && !R });
    if (q._st) { const p0 = pr(t, A.rv + .12, .4), es = eb(p0, 2.2); pose(tv.sticker, { sc: es, rz: -4 + 10 * (1 - es), z: 44, on: p0 > 0 }); }
    q.hints.forEach((h, j) => { const p0 = pr(t, h.t, .36), eh = eb(p0, 2.4); pose(tv.hint[j], { sc: eh, rz: j ? 2.5 : -2.5, y: 30 * (1 - eh), on: p0 > 0 }); });
    // question plaque
    const pq = A.keepIn ? 1 : eb(pr(t, A.ain + .08, A.fast ? .22 : .42), 1.5);
    if (q._plaque) pose(q._plaque, { y: -420 * (1 - pq) - 420 * xk, rx: 6 - 60 * (1 - pq) });
    // option keys: identical until the reveal
    const sink = eo(pr(t, A.rv, .2));
    q._keys.forEach((k, i) => {
      const p0 = pr(t, A.aoin + i * (lay === 'two' ? .12 : .09), .42), ek = eb(p0, 1.7), right = R && i === q.answer_index, wrong = R && i !== q.answer_index;
      // wrong keys press in by SINK of their depth only (colour carries the rest): the face stays in front of the strip's and the mascot's
      // floor shadows and its text stays where it was (SINK_Y px back up against the tilt, so the key never drops toward the strip)
      pose(k, { y: 150 * (1 - ek) + 160 * x - (wrong ? SINK_Y * sink : 0), x: right ? -20 * eo(rp) : 0, z: -260 * (1 - ek) + (right ? 44 * eb(rp, 2.2) : 0) - 420 * x, rx: (lay === 'two' ? 9 : 16) - 60 * (1 - ek), dz: wrong ? 1 - SINK * sink : 1, sc: right ? 1 + .045 * bump : 1, on: p0 > 0 && x < 1 });
      S(k.wrap, 'cls', k.base + k.extra + (right ? ' st-ok' : wrong ? ' st-no' : ''));
      S(k.glow, 'op', right ? f2(.5 + .35 * (1 - rp)) : '0');
    });
    // answers without options (speed: one big key; legacy name3: three rows)
    if (lay === 'speed' || lay === 'ans') {
      const keys = lay === 'speed' ? [ANSS] : ANS3;
      q.answers.forEach((a, i) => {
        const at = num(a.t, A.rv), p0 = pr(t, at, lay === 'speed' ? .3 : .38), ea = eb(p0, 2.1);
        pose(keys[i], { sc: .35 + .65 * ea, z: -160 * (1 - ea) + 8, y: 60 * (1 - ea) + 160 * x, rx: lay === 'speed' ? 8 : 14, on: p0 > 0 && x < 1 });
        S(keys[i].wrap, 'cls', keys[i].base + keys[i].extra + ' st-ok');
        S(keys[i].glow, 'op', p0 > 0 ? f2(.45 + .35 * (1 - p0)) : '0');
      });
      if (lay === 'speed') {
        const si = A.keepIn ? pr(t, A.ain, .15) : pq, so = pr(t, A.rv, .12);
        S(SOCKET, 'op', f2(cl(si) * (1 - so) * (1 - xk) * .9)); S(SOCKET, 'tf', `translateY(${f1(-420 * (1 - Math.min(1, pq)) - 420 * xk)}px)`);
        const pt = A.keepIn ? 1 : eb(pr(t, A.ain + .12, .22), 1.6), pip = A.keepIn ? pr(t, A.ain, .25) : 1;
        pose(SPD, { y: -500 * (1 - pt) - 500 * xk, rx: 6, sc: 1 + .08 * Math.sin(Math.PI * pip) });
      } else if (q.also_text) { const pa = pr(t, num((q.answers[q.answers.length - 1] || {}).t, A.rv) + .3, .3); S(ALSO, 'dp', pa > 0 && x < 1 ? '' : 'none'); S(ALSO, 'op', f2(pa * (1 - x))); }
    }
    // timer strip, then the learn strip takes its place
    const st = q._strip, es = A.keepIn ? 1 : eb(pr(t, A.ain + .12, A.fast ? .22 : .4), 1.4);
    const xs = q._learn ? ei(pr(t, A.rv + .15, .25)) : xk;
    pose(st, { y: 320 * (1 - es) + 320 * xs, rx: 12, on: xs < 1 });
    drawTimer(st, t, A);
    if (q._learn) {
      const p0 = pr(t, A.li, .45), el = eb(p0, 1.5), pb = eb(pr(t, A.li + .16, .3), 2.6);
      pose(LEARN, { y: 320 * (1 - el) + 320 * x, rx: 10 - 50 * (1 - el), on: p0 > 0 && x < 1 });
      pose(LBADGE, { sc: pb, rz: 5 * (1 - pb) - 2 });
    }
    drawMascot(q, t, A.rv);
  }
  function drawCard(c, t) {
    const x = ei(pr(t, c._out, c.end - c._out)), s0 = c.start;
    if (c.kind === 'speed') {
      const e1 = eb(pr(t, s0, .3), 1.2), e2 = eb(pr(t, s0 + .16, .3), 3), e3 = eb(pr(t, s0 + .36, .3), 1.5), tau = t - s0;
      act(s0, c.end);
      pose(SBAND, { x: 2400 * (1 - e1) - 2500 * x, rz: -4, rx: 4, sc: 1 + .012 * Math.sin(TAU * 2.4 * tau) });
      S(STITLE.el, 'tf', `scale(${f3((.3 + .7 * e2) * (1 + .03 * Math.sin(TAU * 2.4 * tau)))}) skewX(-8deg)`);
      pose(SSUB, { x: -2200 * (1 - e3) + 2400 * x, rz: -4, rx: 6, on: c._sub });
      SCARDS.forEach((s, i) => { const p0 = pr(t, s0 + .5 + (2 - i) * .13, .28), ee = eb(p0, 2); pose(s, { x: -1900 * (1 - ee), y: -700 * x, rz: -40 * (1 - ee) + (i - 1) * -5 - 4, rx: 8, z: 30 * Math.max(0, Math.sin(TAU * 1.2 * tau - i)), on: p0 > 0 && x < 1 }); });
      for (const sk of STREAKS) { const px = W + 300 - ((sk.s + tau * sk.v) % (W + 900)); S(sk, 'tf', `translate3d(${f1(px)}px,0,-40px)`); S(sk, 'op', f2(.75 * (1 - x))); }
    } else {
      const e = eb(pr(t, s0 + .02, .5), 1.25), pd = pr(t, s0 + .3, .45), ed = eb(pd, 2), pt = pr(t, s0 + .55, .4), et = eb(pt, 2);
      pose(CARD, { y: -980 * (1 - e) - 1000 * x, rx: 5 - 34 * (1 - e) });
      pose(DISC, { sc: ed, rz: -120 * (1 - ed), on: pd > 0 });
      pose(TALLY, { sc: et, rz: -1.5, on: !!c._tally && pt > 0 });
      if (c._stake) { const pk = pr(t, s0 + .7, .35); S(CT.stake, 'op', f2(Math.min(1, pk * 2))); S(CT.stake, 'tf', `scale(${f3(.6 + .4 * eb(pk, 2))})`); }
      const np = pr(t, s0 + 1.0, .4);
      for (let i = 0; i < c._chips; i++) { const s = CHIPS[i], p0 = pr(t, s0 + .32 + i * .1, .42), ec = eb(p0, 1.7); pose(s, { y: 320 * (1 - ec) + 320 * x, rx: 12, z: s.now ? 34 * eb(np, 2.4) : 0, sc: s.now ? 1 + .05 * Math.sin(Math.PI * np) : 1, on: p0 > 0 && x < 1 }); }
    }
    drawMascot(c, t, null);
  }
  function drawLadder(l, t) {
    const x = ei(pr(t, l._out, l.end - l._out)), s0 = l.start, e = eb(pr(t, s0 + .05, .45), 1.4);
    pose(LTITLE, { y: -320 * (1 - e) - 320 * x, rx: 8 });
    for (let i = 0; i < l._n; i++) { const s = LSTEPS[i], p0 = pr(t, s0 + .3 + i * .17, .5), ee = eb(p0, 1.5); pose(s, { y: (s.hh + 260) * (1 - ee) + 1100 * x, rx: 4, ry: -10, on: p0 > 0 && x < 1 }); }
    const ps = pr(t, s0 + .3 + l._n * .17 + .25, .4); if (l._n) S(LSTEPS[l._n - 1].star, 'tf', `scale(${f3(eb(ps, 3))}) rotate(${f1(-90 * (1 - ps))}deg)`);
    drawMascot(l, t, null);
  }
  function drawEnd(en, t) {
    const s0 = en.start, e = eb(pr(t, s0 + .05, .5), 1.2), pv = pr(t, s0 + .2, .45), pc = pr(t, s0 + .32, .45);
    pose(ETEXT, { y: -420 * (1 - e), rx: 7 });
    pose(SLOTV, { sc: .4 + .6 * eb(pv, 1.5), y: 500 * (1 - eo(pv)), rx: 5, ry: -5, on: pv > 0 });
    pose(SLOTR, { sc: .3 + .7 * eb(pc, 1.8), y: 500 * (1 - eo(pc)), rx: 5, ry: 6, on: pc > 0 });
    drawMascot(en, t, null);
  }
  const SETUP = { question: setupQ, card: setupCard, ladder: setupLadder, end: setupEnd };
  const DRAW = { question: drawQ, card: drawCard, ladder: drawLadder, end: drawEnd };
  function segAt(t) { let lo = 0, hi = SEGS.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (SEGS[m].start <= t) lo = m; else hi = m - 1; } return lo; }
  function seek(t) {
    if (!SHOW) throw new Error('__seek before __load');
    if (!SEGS.length) return;
    t = cl(Number(t) || 0, 0, SEGS[SEGS.length - 1].end);
    const i = segAt(t), seg = SEGS[i];
    if (i !== CUR) { (SETUP[seg.type] || setupEnd)(seg); CUR = i; }
    drawWorld(seg, t); (DRAW[seg.type] || drawEnd)(seg, t);
  }

  /* ---------------------------------------------------------------- load */
  async function doLoad(show, opts) {
    window.__ready = false;
    if (!show || typeof show !== 'object') throw new Error('__load: show.json object expected');
    const raw = JSON.stringify(show) + '|' + JSON.stringify(opts || {});
    if (raw === LAST && SHOW) { CUR = -1; seek(0); window.__ready = true; return LASTINFO; }   // same show again (page self-loaded from ?show=, then the builder calls __load)
    show = JSON.parse(JSON.stringify(show));
    LINT.length = 0; FITC.clear(); CUR = -1; LAST = '';
    DRIFT = !(opts && opts.drift === false) && !(show.theme && show.theme.drift === false) && qp.get('drift') !== '0';
    ART = show.art && typeof show.art === 'object' ? show.art : {};
    SHOW = show; SHOW = normalize(show); SEGS = SHOW.segments;
    window.__drift = { enabled: DRIFT, what: 'camera sway (<= 0.9 deg, periods 19 s / 27 s) + background blocks (<= 16 px, periods 11-25 s); frozen on the end frame' };
    const emoji = new Set(); const jobs = [];
    for (const s of SEGS) if (s.type === 'question') {
      const c = s.clue; if (c.type === 'flag') jobs.push(needFlag(c.iso, 'plate'));
      if (c.type === 'emoji' && Array.isArray(c.items)) for (const it of c.items) emoji.add(String(it));
      if (s._pic === 'animal') emoji.add(c.emoji.trim());
      if (s._pic === 'animal' && ART[c.emoji.trim()]) jobs.push(new Promise(r => { const im = new Image(); im.onload = r; im.onerror = () => { LINT.push('art missing: ' + ART[c.emoji.trim()]); r(); }; im.src = ART[c.emoji.trim()]; }));
      for (const o of [...s.options, ...s.answers]) if (emoOk(o.emoji)) emoji.add(o.emoji.trim());
      if (s._stEmo) emoji.add(s._stEmo);
      for (const iso of s._fl) jobs.push(needFlag(iso, 'ft'));
      if (!s._fpick) for (const o of s.options) if (o.iso) jobs.push(needFlag(o.iso, s._lay === 'two' ? 'big' : 'key'));
      for (const a of s.answers) if (a.iso && s._lay === 'ans') jobs.push(needFlag(a.iso, 'key'));
      if (s._sticker) jobs.push(needFlag(s._sticker, 'sticker'));
    }
    jobs.push(document.fonts.load('900 40px Cairo', 'شو شايف؟ ٠١٢٣٤٥٦٧٨٩'), document.fonts.load('700 40px Cairo', 'هل تعرف؟'));
    jobs.push(document.fonts.load('100px QuizEmoji', [...emoji].join('') || '🙂').then(f => { if (!f.length) LINT.push('emoji font did not load'); }, () => LINT.push('emoji font did not load')));
    await Promise.all(jobs); await document.fonts.ready;
    // dry run of every segment: validates the data, warms the fit cache, records the activity windows for __static
    for (let i = 0; i < SEGS.length; i++) {
      const s = SEGS[i];
      try { (SETUP[s.type] || setupEnd)(s); REC = []; drawWorld(s, s.start); (DRAW[s.type] || drawEnd)(s, s.start); s._iv = REC; }
      finally { REC = null; }
    }
    // warm-up: paint every segment once (2 states per question) so fonts, emoji glyphs, flags and slab textures are
    // rastered before the first captured frame (the first frame after a cold load can otherwise miss tiles)
    if (!(opts && opts.warm === false) && qp.get('warm') !== '0') {
      const painted = () => new Promise(r => { let done = false; const f = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => requestAnimationFrame(f)); setTimeout(f, 150); });
      for (const s of SEGS) {
        if (s.type === 'question') { seek((s._a.ts + s._a.te) / 2); await painted(); seek(Math.min(s.end - .35, (s._a.li ?? s._a.rv) + .8)); await painted(); }
        else { seek(Math.min(s.end - .35, s.start + 1.5)); await painted(); }
      }
    }
    CUR = -1; seek(Number(qp.get('t')) || 0);
    await new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 150); });
    window.__ready = true;
    LAST = raw; LASTINFO = { duration: SEGS.length ? SEGS[SEGS.length - 1].end : 0, segments: SEGS.length, lint: LINT.slice() };
    return LASTINFO;
  }
  window.__ready = false;
  window.__load = (show, opts) => (CHAIN = CHAIN.catch(() => {}).then(() => doLoad(show, opts)));
  window.__seek = seek;
  window.__static = (t0, t1, opts) => {
    if (!SHOW || !SEGS.length) return false;
    if (t1 < t0) [t0, t1] = [t1, t0];
    const i = segAt(t0), s = SEGS[i];
    if (segAt(t1) !== i || t1 > s.end) return false;
    if (DRIFT && !s._calm && !(opts && opts.ignore_drift)) return false;
    const iv = s._iv || [];
    for (let k = 0; k < iv.length; k += 2) if (iv[k] <= t1 && iv[k + 1] > t0) return false;
    return true;
  };
  window.__info = () => ({ duration: SEGS.length ? SEGS[SEGS.length - 1].end : 0, drift: DRIFT, layers: document.querySelectorAll('.sl,.ft,.rs,.sh').length,
    segments: SEGS.map(s => ({ i: s._i, type: s.type, kind: s.kind, id: s.id, mechanic: s.mechanic, level: s.level, theme: s._th, start: s.start, end: s.end, t: s.t, fx: s._fx, pic: s._pic, lay: s._lay, hints: (s.hints || []).map(h => h.t), answers: (s.answers || []).map(a => a.t) })) });
  window.__lint = () => LINT.slice();
  window.__sig = () => { let h = 0; const str = CUR + '|' + NODES.map(n => JSON.stringify(n._c)).join('|'); for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0; return h; };
  /** leak check helper: computed look of every visible option key (must be identical before t.reveal) */
  window.__keys = () => (SEGS[CUR] && SEGS[CUR]._keys || []).map(k => {
    const cs = e => { const c = getComputedStyle(e); return [c.transform, c.backgroundColor, c.backgroundImage, c.boxShadow, c.color, c.opacity, c.filter, c.borderColor].join('~'); };
    const sl = [...k.bd.children].map(cs).join('#');
    return { cls: k.wrap.className, wrap: cs(k.wrap), body: cs(k.bd), faces: sl, shadow: cs(k.sh), badge: cs(k.kb), text: [getComputedStyle(k.kt).color, getComputedStyle(k.kt).opacity].join('~'), icons: [...k.ft.querySelectorAll('.kc svg')].map(e => getComputedStyle(e).display).join(','), h: k.h, w: k.w };
  });

  const auto = qp.get('show');
  if (auto) CHAIN = fetch(auto).then(r => r.json()).then(s => doLoad(s)).catch(e => { console.error('quiz-long template: ' + e); });
  addEventListener('keydown', ev => { if (!SHOW) return; const d = (ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0) * (ev.shiftKey ? 1 : 1 / 30); if (!d) return; window.__t = cl((window.__t || 0) + d, 0, SEGS[SEGS.length - 1].end); seek(window.__t); document.title = window.__t.toFixed(2) + ' s'; });
})();
