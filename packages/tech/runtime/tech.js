/* Tech Made Simple scene runtime (HyperFrames + GSAP). Reads window.TECH (written by packages/tech/src/build.ts),
 * builds ONE paused timeline, runs every scene function window.TECH_SCENES[id](tl, S) and registers the timeline.
 * Deterministic: every motion is a tween on the timeline (no Date/rAF/Math.random); time is absolute seconds.
 * S (per scene): t0 t1 dur el cam q(sel) qa(sel) at(ref, n) end(lineId) + motion helpers (pop slide draw travel count
 * type stamp punch shake pulse). ref = 'word' | 'lineId' | 'lineId:word' (word = spoken word, case/punctuation-free).
 */
(function () {
  var T = window.TECH, tl = gsap.timeline({ paused: true });
  var norm = function (w) { return String(w).toLowerCase().replace(/[^a-z0-9%$+.-]/g, '').replace(/^[.-]+|[.-]+$/g, ''); };

  /* background: grid drift + glow on global time, so no frame is ever static */
  var bg = document.getElementById('bg'), glow = document.getElementById('glow'), clock = { t: 0 };
  function drawBg(g) {
    bg.style.transform = 'translate(' + (-(g * 14) % 90).toFixed(1) + 'px,' + (-(g * 22) % 90).toFixed(1) + 'px)';
    glow.style.transform = 'translate(' + (120 * Math.sin(g / 3.1)).toFixed(1) + 'px,' + (160 * Math.cos(g / 4.3)).toFixed(1) + 'px)';
  }
  drawBg(0);
  tl.to(clock, { t: T.D, duration: T.D, ease: 'none', onUpdate: function () { drawBg(clock.t); } }, 0);

  function scope(s) {
    var el = document.getElementById('scene-' + s.id), cam = el.querySelector(':scope > .cam');
    var lines = s.lines.map(function (id) { return T.lines[id]; });
    var S = { id: s.id, t0: s.t0, t1: s.t1, dur: s.t1 - s.t0, el: el, cam: cam,
      q: function (sel) { return typeof sel === 'string' ? el.querySelector(sel) : sel; },
      qa: function (sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); } };
    S.at = function (ref, n) {
      n = n || 0; var lid = null, w = ref;
      if (T.lines[ref]) return T.lines[ref].t0;
      if (String(ref).indexOf(':') > 0) { lid = ref.split(':')[0]; w = ref.split(':').slice(1).join(':'); }
      var k = 0, want = norm(w);
      for (var i = 0; i < lines.length; i++) {
        if (lid && lines[i].id !== lid) continue;
        for (var j = 0; j < lines[i].words.length; j++) if (norm(lines[i].words[j].w) === want && k++ === n) return lines[i].words[j].s;
      }
      (window.__techWarn = window.__techWarn || []).push(s.id + ': S.at("' + ref + '") not found');
      return s.t0;
    };
    S.end = function (lid) { return T.lines[lid].t1; };
    var T_ = function (x) { return S.q(x); };
    S.pop = function (x, at, o) { o = o || {}; return tl.fromTo(T_(x), { scale: o.from || 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: o.dur || 0.35, ease: o.ease || 'back.out(2)' }, at); };
    S.slide = function (x, at, o) { o = o || {}; return tl.fromTo(T_(x), { x: o.x || 0, y: o.y == null ? 120 : o.y, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: o.dur || 0.4, ease: o.ease || 'power3.out' }, at); };
    S.draw = function (x, at, dur) { var p = T_(x), L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; return tl.to(p, { strokeDashoffset: 0, duration: dur || 0.6, ease: 'power2.inOut' }, at); };
    /* move element x along SVG path p (same coordinate space as the stage: svg must be 1:1 px) */
    S.travel = function (x, p, at, dur, ease) {
      var e = T_(x), path = T_(p), L = path.getTotalLength(), st = { k: 0 };
      var place = function () { var pt = path.getPointAtLength(st.k * L); e.style.transform = 'translate(' + pt.x.toFixed(1) + 'px,' + pt.y.toFixed(1) + 'px) translate(-50%,-50%)'; };
      place(); return tl.to(st, { k: 1, duration: dur || 0.8, ease: ease || 'power1.inOut', onUpdate: place, onStart: place }, at);
    };
    S.count = function (x, from, to, at, dur, o) {
      o = o || {}; var e = T_(x), st = { v: from };
      var fmt = function (v) { var s = o.dec ? v.toFixed(o.dec) : Math.round(v).toLocaleString('en-US'); return (o.pre || '') + s + (o.suf || ''); };
      e.textContent = fmt(from);
      return tl.to(st, { v: to, duration: dur || 0.8, ease: o.ease || 'power2.out', onUpdate: function () { e.textContent = fmt(st.v); } }, at);
    };
    S.type = function (x, text, at, cps) {
      var e = T_(x), st = { n: 0 }, N = text.length; e.textContent = '';
      return tl.to(st, { n: N, duration: N / (cps || 24), ease: 'none', onUpdate: function () { e.textContent = text.slice(0, Math.round(st.n)); } }, at);
    };
    S.stamp = function (x, at) { return tl.fromTo(T_(x), { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'power4.in' }, at); };
    S.punch = function (at, scale, origin, dur) { if (origin) cam.style.transformOrigin = origin; return tl.to(cam, { scale: scale || 1.15, duration: dur || 0.35, ease: 'power3.out' }, at); };
    S.shake = function (x, at) { return tl.fromTo(T_(x), { x: -18 }, { x: 0, duration: 0.4, ease: 'elastic.out(1.2,0.25)', immediateRender: false }, at); };
    S.pulse = function (x, at, scale) { return tl.fromTo(T_(x), { scale: 1 }, { scale: scale || 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut', immediateRender: false }, at); };
    return S;
  }

  T.scenes.forEach(function (s, i) {
    var el = document.getElementById('scene-' + s.id);
    if (i > 0) tl.set(el, { visibility: 'visible' }, s.t0);
    if (s.t1 < T.D - 1e-3) tl.set(el, { visibility: 'hidden' }, s.t1);
    if (s.drift !== false) tl.fromTo(el, { scale: 1 }, { scale: 1.035, duration: s.t1 - s.t0, ease: 'none', immediateRender: i === 0 }, s.t0);   // slow camera push: nothing sits still
    var fn = (window.TECH_SCENES || {})[s.id];
    if (fn) fn(tl, scope(s));
  });
  tl.to({}, { duration: 0.001 }, T.D - 0.001);
  window.__timelines[T.id] = tl;
})();
