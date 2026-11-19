/* Quiz chrome runtime (HyperFrames, GSAP). Shared by every round template.
 * Reads window.QUIZ (generated per round) and window.buildPuzzle(tl, Q) (template-specific), builds ONE paused timeline
 * and registers it. Deterministic: everything is a function of timeline time; the background uses global time
 * (Q.T0 + t) so the gradient drift and floating shapes continue seamlessly across round clips.
 */
(function () {
  var Q = window.QUIZ;
  var tl = gsap.timeline({ paused: true });

  /* ---------- background: drifting gradient + floating shapes (global time) ---------- */
  var bg = document.getElementById('bg');
  var shapes = Array.prototype.slice.call(document.querySelectorAll('.shape'));
  function drawBg(g) {
    var x = 50 + 45 * Math.sin((2 * Math.PI * g) / 10);
    var y = 50 + 45 * Math.cos((2 * Math.PI * g) / 13);
    bg.style.backgroundPosition = x.toFixed(2) + '% ' + y.toFixed(2) + '%';
    shapes.forEach(function (el, i) {
      var p = Q.shapes[i];
      var dx = 18 * Math.cos((2 * Math.PI * g) / p.px + p.ph);
      var dy = 34 * Math.sin((2 * Math.PI * g) / p.py + p.ph);
      el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + ((g * p.rot) % 360).toFixed(1) + 'deg)';
    });
  }
  var clock = { t: 0 };
  drawBg(Q.T0);
  tl.to(clock, { t: Q.D, duration: Q.D, ease: 'none', onUpdate: function () { drawBg(Q.T0 + clock.t); } }, 0);

  /* ---------- round counter chip ---------- */
  if (document.getElementById('chip')) tl.fromTo('#chip', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' }, 0.05);

  /* ---------- headline texts (hook / question / answer) crossfade in the question area ---------- */
  var heads = (Q.heads || []).slice().sort(function (a, b) { return a.at - b.at; });
  heads.forEach(function (h, i) {
    var next = heads[i + 1];
    var out = h.out != null ? h.out : null;
    if (next && (out == null || out > next.at)) out = next.at;  // hard cut on handover: never two headlines at once
    if (Q.T0 === 0 && i === 0 && h.at <= 0.15) tl.set('#' + h.id, { opacity: 1 }, 0);  // round 1: headline in place at frame 0
    else tl.fromTo('#' + h.id, { y: 40, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' }, h.at);
    if (out != null) tl.set('#' + h.id, { opacity: 0 }, out);
  });

  /* ---------- opening hook banner: opaque from frame 0, pops, gone at Q.hookb.dur ---------- */
  if (Q.hookb && document.getElementById('hookb')) {
    var hd = Q.hookb.dur;
    tl.fromTo('#hookb', { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', transformOrigin: '50% 50%' }, 0);
    tl.to('#hookb', { opacity: 0, duration: 0.15, ease: 'power1.in' }, hd - 0.15);
    tl.set('#hookb', { opacity: 0 }, hd);
  }

  /* ---------- puzzle card ---------- */
  if (Q.T0 === 0) tl.fromTo('#card', { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'power2.out' }, 0);  // frame 1 already shows the puzzle (hook)
  // later rounds: the card slides in from the right as the previous one left to the left (continuous whoosh, no blank frame)
  // later rounds: enter from a right-edge sliver (180 px visible on frame 0) — the previous clip ended on a left-edge
  // sliver, so every frame around a round change shows a card and no card vanishes mid-slide
  else tl.fromTo('#card', { x: 520, rotation: 3 }, { x: 0, rotation: 0, duration: 0.3, ease: 'power2.out' }, 0);

  /* ---------- countdown ring: L s (quiz.json timings.cd, default 3), ٣ ٢ ١ one beat each, accent -> alert in the last beat ---------- */
  if (Q.cd != null) {
    var C = 2 * Math.PI * 95;
    var L = (Q.marks && Q.marks.cdLen) || 3, st = L / 3;
    tl.fromTo('#cd', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, Q.cd - 0.15);
    tl.fromTo('#cd-arc', { strokeDashoffset: 0 }, { strokeDashoffset: C, duration: L, ease: 'none' }, Q.cd);
    tl.set('#cd-arc', { stroke: '#FF5C7A' }, Q.cd + 2 * st);
    tl.set('#cd-disc', { fill: '#FF5C7A' }, Q.cd + 2 * st);
    ['#cd3', '#cd2', '#cd1'].forEach(function (id, k) {
      tl.fromTo(id, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, Q.cd + k * st);
      tl.to(id, { scale: 0.6, opacity: 0, duration: 0.15, ease: 'power2.in' }, Q.cd + (k + 1) * st - 0.15);
    });
    // the ring pops out in the last 0.1 s and is fully gone ON the reveal frame (no faint disc fading into the reveal)
    var rvAt = Q.open ? Q.cd + L : Q.reveal != null ? Q.reveal : Q.cd + L;
    tl.to('#cd', { scale: 1.3, opacity: 0, duration: 0.1, ease: 'power2.in' }, rvAt - 0.1);
    tl.set('#cd', { opacity: 0, visibility: 'hidden' }, rvAt);
    if (document.getElementById('cdcue')) {  // countdown cue pill: in with the ring, out before the reveal (hidden on the reveal frame)
      tl.fromTo('#cdcue', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }, Q.cd - 0.15);
      tl.to('#cdcue', { opacity: 0, duration: 0.1, ease: 'power2.in' }, rvAt - 0.1);
      tl.set('#cdcue', { opacity: 0, visibility: 'hidden' }, rvAt);
    }
  }

  /* ---------- reveal: flash, pulse, correct glow + tick badge ---------- */
  if (Q.reveal != null && !Q.open) {  // open final round: no flash / pulse / glow / tick (nothing is revealed)
    // eased over >= 3 frames in and ~9 out, peak scaled per puzzle (dark puzzles get less): a 1-2 frame spike reads as a
    // glitch and trips techqa's single-frame flash check
    var fp = Q.flashPeak != null ? Q.flashPeak : 0.45;
    tl.fromTo('#flash', { opacity: 0 }, { opacity: fp, duration: 0.1, ease: 'power1.out' }, Q.reveal);
    tl.to('#flash', { opacity: 0, duration: 0.3, ease: 'power1.in' }, Q.reveal + 0.1);
    tl.fromTo('#card', { scale: 1 }, { scale: 1.035, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, Q.reveal);
    if (document.getElementById('glow')) {
      tl.fromTo('#glow', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' }, Q.reveal + 0.05);
      tl.fromTo('#tick', { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(2.2)' }, Q.reveal + 0.15);
    }
  }

  /* ---------- options row: in with the puzzle, 50 % after the reveal, gone when the explanation arrives ---------- */
  if (Q.opts) {
    tl.fromTo('#opts', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' }, 0.3);
    if (Q.reveal != null && !Q.open) tl.to('#opts', { opacity: 0.5, duration: 0.2 }, Q.reveal + 0.1);
    if (Q.explain != null) tl.to('#opts', { opacity: 0, duration: 0.2 }, Q.explain - 0.2);
  }

  /* ---------- explanation chip ---------- */
  // full-card art with no free chip slot: the stage makes room (scales down from its top edge) as the chip arrives
  if (Q.explain != null && Q.room && document.getElementById('stage'))
    tl.to('#stage', { scale: Q.room, transformOrigin: '50% 0%', duration: 0.35, ease: 'power2.inOut' }, Q.explain - 0.3);
  if (Q.explain != null && document.getElementById('explain'))
    tl.fromTo('#explain', { y: 30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, Q.explain);

  /* ---------- outgoing transition (whoosh): quick zoom/blur-free slide of the card ---------- */
  if (Q.exit != null) {
    // the slide-out is still mid-way on the round's last frame (power3.in), so the next round's sliding-in card follows
    // without an empty frame between them
    tl.to('#card', { x: -520, rotation: -4, duration: 0.3, ease: 'power2.in' }, Q.D - 1 / 30 - 0.3);  // done on the last frame
    tl.to('#qarea, #chip', { opacity: 0, duration: 0.2, ease: 'power2.in' }, Q.exit);
    // text overlays never ride off-canvas with the card (mvz9 v2 9.17 s: the explanation chip was cut by the left edge): they fade
    // over 0.15 s as the slide starts, before the card has moved far (the card/puzzle slide itself is unchanged)
    var xs = ['#explain', '#opts', '#cd', '#endq', '#hookb', '.qa', '#rs'].filter(function (q) { return document.querySelector(q); }).join(', ');
    if (xs) tl.to(xs, { opacity: 0, duration: 0.15, ease: 'power1.in', immediateRender: false, overwrite: false }, Q.D - 1 / 30 - 0.3);
  }

  /* puzzle build-in: animated in the first round (the hook); in later rounds the card slides in with the puzzle already
     on it (QA: no empty card), so intro tweens collapse to their end state at t = 0 */
  var TWEEN_KEYS = { duration: 1, ease: 1, stagger: 1, delay: 1, yoyo: 1, repeat: 1, immediateRender: 1 };
  Q.intro = function (tl, sel, from, to, at) {
    // every round (round 1 included) shows its puzzle fully built from frame 0 (QA: open on a readable puzzle)
    var end = {};
    for (var k in to) if (!TWEEN_KEYS[k]) end[k] = to[k];
    return tl.set(sel, end, 0);
  };
  window.buildPuzzle(tl, Q);
  /* open final round (owner 2026-11-08): NO answer marker may exist at any frame. Defensive: marker elements are hidden by
     CSS from frame 0 (shell_game/sequence glow+tick had no default-hidden state; chrome's reveal block is skipped when open)
     and removed from the DOM after the puzzle's tweens are built. */
  if (Q.open) {
    var MARK = '#lnA,#glow,#tick,#mglow,#mtick,#ftick,#ptick,.wglow,.wtick,.ring,.gh,#arrows,.qa,#rs,.rsu,.stp,#explain,#flash,#rv,.sb,#dim,#fx,#erase,#sl';
    var st = document.createElement('style'); st.textContent = MARK + '{display:none !important;opacity:0 !important;visibility:hidden !important}';
    document.head.appendChild(st);
    Array.prototype.forEach.call(document.querySelectorAll(MARK), function (el) { el.parentNode && el.parentNode.removeChild(el); });
  }

  /* ---------- end_question (owner 2026-11-08): big open question above the card in the final beat; the answer stays on the card ---------- */
  if (Q.marks && Q.marks.endq != null && document.getElementById('endq')) {
    var eqAt = Q.marks.endq;
    tl.to('#qarea, #chip', { opacity: 0, duration: 0.12, ease: 'power1.in', immediateRender: false, overwrite: false }, eqAt - 0.06);
    tl.fromTo('#endq', { opacity: 0, scale: 0.7, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: 'back.out(2)', transformOrigin: '50% 50%' }, eqAt);
    tl.to('#endq span', { scale: 1.04, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut', transformOrigin: '50% 50%' }, eqAt + 0.35);
  }

  /* ---------- loop "zoom" (final round): whip-zoom into a still of frame 0, so the end flows into frame 0 on replay ---------- */
  if (Q.marks && Q.marks.loop != null && document.getElementById('loopz')) {
    var lz = Q.marks.loop, lzD = Q.D - lz;
    // every text overlay of the last round (headlines, range chip, options pills, explain line, countdown ring) clears at zoom start, so none ghosts over frame 0 in the crossfade
    tl.to('#qarea, #chip, #opts, #explain, #cd' + (document.getElementById('endq') ? ', #endq' : ''), { opacity: 0, duration: 0.1, ease: 'power1.out', immediateRender: false, overwrite: false }, lz);
    tl.to('#scene', { scale: 2.2, duration: lzD, ease: 'power1.in', transformOrigin: '50% 47%' }, lz);
    // the frame-0 plate hard-cuts in 3 frames before the end (QA kyxs/zo3f: crossfades ghosted the last reveal over frame 0), is fully
    // opaque 2 frames before the end and settles toward scale 1 at D (the replay's frame 0)
    tl.fromTo('#loopz', { opacity: 0 }, { opacity: 1, duration: 0.001, ease: 'none', immediateRender: false }, Math.max(lz, Q.D - 3 / 30));  // hard cut (QA zo3f: even a 2-frame mix ghosted)
    tl.fromTo('#loopz', { scale: 1.35 }, { scale: 1, duration: lzD, ease: 'power2.out', transformOrigin: '50% 47%' }, lz);
  }
  /* ---------- loop seam (final round with a closing ask): picture cross-fades to the frame-0 still, the ask (#endq, z 22) stays on top ---------- */
  if (Q.marks && Q.marks.seam != null && document.getElementById('seamz')) {
    var sm = Q.marks.seam, smD = Math.max(0.2, Q.D - sm - 0.08);
    // #qarea is NOT faded: it holds the closing ask (h-cta), which must stay readable through the last frame (z 23, above the still)
    tl.to('#chip, #opts, #explain, #cd, #cdcue', { opacity: 0, duration: 0.15, ease: 'power1.out', immediateRender: false, overwrite: false }, sm);
    if (document.getElementById('h-cta')) tl.to('#h-cta span', { backgroundColor: '#1D1548', borderColor: '#FFC83D', boxShadow: '0 14px 40px rgba(0,0,0,.35)', duration: 0.2, ease: 'power1.out', immediateRender: false }, sm);
    tl.fromTo('#seamz', { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: smD, ease: 'power1.inOut', immediateRender: false, transformOrigin: '50% 47%' }, sm);
  }
  window.__timelines[Q.id] = tl;
})();
