/* Dev renderer for the quiz-long template (system Chrome headless, playwright-core from the repo's node_modules).
 *   node render.mjs sheets            -> out/states-sheet.jpg, themes-sheet.jpg, cards-sheet.jpg, phone-360.jpg, motion-sheet.jpg, effects-sheet.jpg
 *   node render.mjs shot <t> [name]   -> out/<name>.png at absolute time t of sample-show.json
 *   node render.mjs geom <t> [x]      -> JSON: screen rectangles of every visible face / text at time t (x = use the extras show)
 *   node render.mjs checks            -> leak check (option keys identical before reveal), __static soundness, emoji font, lint, safe margins
 *   node render.mjs bench             -> ms per __seek (JS + layout) and ms per captured frame
 * Shows: dev/sample-show.json (make-sample-show.mjs) and an in-memory "extras" show (themes L1-L4 of one question,
 * flag effects, promise card, legacy name3) built from it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(HERE, '..');
const ROOT = path.resolve(TEMPLATE, '..', '..', '..');
const OUT = path.join(HERE, 'out');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ALLOW = [TEMPLATE, path.join(ROOT, 'data', 'brand')].map(a => a.toLowerCase());
const CHROME = [process.env.STUDIO_CHROME, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean).find(f => fs.existsSync(f));
const requests = [];
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  requests.push(q.url);
  if (!ALLOW.some(a => path.resolve(f).toLowerCase().startsWith(a)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(s);
}).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
const URL0 = `http://127.0.0.1:${srv.address().port}/${path.relative(ROOT, TEMPLATE).split(path.sep).join('/')}/frame.html`;

const sample = JSON.parse(fs.readFileSync(path.join(HERE, 'sample-show.json'), 'utf8'));
const Q = sample.segments.filter(s => s.type === 'question');
const byMech = (m, n = 0) => Q.filter(s => s.mechanic === m)[n];
const clone = o => JSON.parse(JSON.stringify(o));
/** copy of a segment moved to start at `at` (all absolute times shifted) */
function retime(seg, at, patch = {}) {
  const s = clone(seg), d = at - s.start;
  s.start += d; s.end += d;
  if (s.t) for (const k of Object.keys(s.t)) s.t[k] += d;
  for (const h of s.host || []) { h.t += d; h.end += d; }
  for (const h of s.hints || []) h.t += d;
  for (const a of s.answers || []) if (a.t != null) a.t += d;
  return Object.assign(s, patch);
}
function extrasShow() {
  const segs = []; let t = 0;
  const add = (seg, patch) => { const s = retime(seg, t, patch); segs.push(s); t = s.end; return s; };
  const flagQ = byMech('flag', 1) || byMech('flag', 0) || Q[0];
  const noFx = (m, id, level, extra = {}) => { const src = byMech(m) || flagQ, s = clone(src); s.clue = { type: 'flag', iso: src.clue.iso || 'gr' }; s.mechanic = 'flag'; return [s, { id, level, level_name: '', ...extra }]; };
  const names = {}; for (const s of Q) names[s.level] = s.level_name;
  for (const lv of [1, 2, 3, 4]) add(flagQ, { id: 'theme' + lv, level: lv, level_name: names[lv] || '', index: 2 });
  const fx = (effect, iso, focus) => { const s = clone(flagQ); s.clue = { type: 'flag', iso, effect, ...(focus ? { focus } : {}) }; return add(s, { id: 'fx-' + effect, level: 1, level_name: names[1] || '', index: 2 }); };
  fx('zoom', 'br', [0.5, 0.5]); fx('blur', 'za'); fx('strips', 'jp');
  { const [s, p] = noFx('flag_strips', 'plain', 3); p.level_name = names[3] || ''; add(s, p); }
  { const [s, p] = noFx('flag_zoom', 'plain2', 2); p.level_name = names[2] || ''; add(s, p); }
  { const src = Q.filter(x => x.mechanic === 'flag_strips')[1] || byMech('flag_hint') || flagQ, s = clone(src); s.clue = { type: 'flag', iso: src.clue.iso }; s.mechanic = 'flag_hint'; s.ask_text = 'علم أي دولة؟ انتبه للتلميح';
    const h = add(s, { id: 'hint', level: 3, level_name: names[3] || '' }); h.hints = [{ t: h.t.timer_start + 0.5 * (h.t.timer_end - h.t.timer_start), text: 'في أفريقيا' }]; }
  segs.push({ type: 'card', kind: 'promise', id: 'promise', level: null, title: null, sub: null, start: t, end: t + 3.5, host: [{ t: t + .2, end: t + 2.6, mood: 'dare', text: '' }] }); t += 3.5;
  segs.push({ type: 'card', kind: 'promise', id: 'promise2', level: null, title: '٤٠ سؤالاً عن دول العالم | من السهل إلى المستحيل', sub: 'احسب نقاطك', tally_text: 'من يصل إلى ٣٠؟', start: t, end: t + 3.5, host: [] }); t += 3.5;
  const base = byMech('nickname') || Q[1];
  const n3 = retime(base, t, { id: 'name3', mechanic: 'name3', level: 1, level_name: names[1] || '', ask_text: 'سمِّ ٣ دول تبدأ بحرف الباء', clue: { type: 'letter', letter: 'ب' }, also_text: 'وأي دولة غيرها بنفس الحرف تُحسب' });
  delete n3.options; delete n3.answer_index; delete n3.answer_iso;
  n3.answers = [{ text: 'البحرين', iso: 'bh', t: n3.t.reveal }, { text: 'البرازيل', iso: 'br', t: n3.t.reveal + .7 }, { text: 'بلجيكا', iso: 'be', t: n3.t.reveal + 1.4 }];
  n3.t.learn_in = Math.max(n3.t.learn_in, n3.t.reveal + 2); segs.push(n3); t = n3.end;
  const long = retime(base, t, { id: 'long', level: 3, level_name: names[3] || '', ask_text: 'أي دولة عاصمتها هذه المدينة الجميلة؟', clue: { type: 'text', text: 'دولة أفريقية لغتها الرسمية الأولى هي اللغة الإسبانية' },
    options: [{ text: 'الولايات المتحدة', iso: null }, { text: 'كوريا الجنوبية', iso: null }, { text: 'جمهورية الكونغو الديمقراطية', iso: null }, { text: 'بابوا غينيا الجديدة', iso: null }], answer_index: 2, learn_text: 'المكسيك فيها أكبر عدد من الناطقين الأصليين بالإسبانية، أكثر من إسبانيا' });
  segs.push(long); t = long.end;
  return { ...clone(sample), duration: t, segments: segs };
}
const extras = extrasShow();

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
let loaded = null, nkey = 0;
async function load(show, opts) {
  const key = (show === extras ? 'x' : show === sample ? 's' : (show._key || (show._key = 'o' + (++nkey)))) + JSON.stringify(opts || {});
  if (loaded === key) return;
  if (loaded == null) { await page.goto(URL0); await page.waitForFunction('typeof window.__load === "function"'); }   // one navigation per process; later shows reuse the page (__load is re-entrant)
  const r = await page.evaluate(async ([s, o]) => await window.__load(s, o), [show, opts || null]);
  await page.waitForFunction('window.__ready === true');
  loaded = key;
  return r;
}
const seek = t => page.evaluate(`window.__seek(${t})`);
async function shot(file) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  return file;
}
const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
function grid(files, cols, cellW, out, pre = '') {
  const cellH = Math.round(cellW * 9 / 16);
  const sc = files.map((_, i) => `[${i}]${pre}scale=${cellW}:${cellH}:flags=lanczos[s${i}]`).join(';');
  const layout = files.map((_, i) => `${(i % cols) * cellW}_${Math.floor(i / cols) * cellH}`).join('|');
  ff([...files.flatMap(f => ['-i', f]), '-filter_complex', `${sc};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black[o]`, '-map', '[o]', '-frames:v', '1', '-q:v', '2', out]);
  return out;
}
const tmp = path.join(OUT, 'tmp');
fs.mkdirSync(tmp, { recursive: true });
let nshot = 0;
/** items: [show, t] -> png files */
async function frames(items) { const files = []; for (const [show, t] of items) { await load(show); await seek(t); files.push(await shot(path.join(tmp, `f${String(nshot++).padStart(3, '0')}.png`))); } return files; }
const seg = id => sample.segments.find(s => s.id === id);
const xseg = id => extras.segments.find(s => s.id === id);
const mid = s => (s.t.timer_start + s.t.timer_end) / 2;
const learnT = s => (s.t.learn_in ?? s.t.reveal) + 1.0;

/** bottom safe zone: bounding boxes of every visible information face (all slabs except the background blocks, the speed
 *  socket, the "also" line) and of every visible text node's own face; nothing may end below y = 950 px (88 % of 1080) */
const SAFE_BOTTOM = 950;
const bottomsOf = () => page.evaluate(() => {
  const vis = e => { for (let n = e; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return false; } return true; };
  const out = [], seen = new Set();
  const add = (el, name) => { if (seen.has(el) || !vis(el)) return; seen.add(el); const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2 || b.top > 1080 || b.bottom < 0) return; out.push({ name, bottom: Math.round(b.bottom * 10) / 10, top: Math.round(b.top * 10) / 10 }); };
  const nm = s => s.className.replace('slab ', '').replace(/c-\w+/g, '').trim().split(/\s+/).slice(0, 2).join('.');
  document.querySelectorAll('#rig .slab:not(.blk)').forEach(s => add(s.querySelector(':scope > .bd > .ft'), nm(s)));
  document.querySelectorAll('#rig .socket, #rig .also').forEach(e => add(e, e.className));
  const w = document.createTreeWalker(document.getElementById('rig'), NodeFilter.SHOW_TEXT), raw = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const txt = n.nodeValue.trim(); if (!txt) continue; const el = n.parentElement; if (!vis(el)) continue;
    if (/[·•|]/.test(txt) && !el.closest('.socket')) raw.push(txt.slice(0, 40));
    const ft = el.closest('.ft'); if (ft) add(ft, 'text:' + txt.slice(0, 16));
  }
  return { faces: out, raw };
});
/** reveal overlap: screen boxes of every visible option key's text (ink range clipped to the key face) and letter badge, of the fact
 *  strip (face, text, badge) and of the mascot's talk rings (their own boxes, whether or not they are lit at this frame) */
const overlapBoxes = () => page.evaluate(() => {
  const vis = e => { for (let n = e; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return false; } return true; };
  const rd = v => Math.round(v * 10) / 10, R = b => [b.left, b.top, b.right, b.bottom].map(rd);
  const keys = [];
  document.querySelectorAll('#rig .slab.key').forEach(k => {
    if (!vis(k)) return; const ft = k.querySelector(':scope > .bd > .ft'), kt = ft.querySelector('.kt'), kb = ft.querySelector('.kb'), f = ft.getBoundingClientRect();
    const r = document.createRange(); r.selectNodeContents(kt); const a = r.getBoundingClientRect();
    keys.push({ state: k.classList.contains('st-ok') ? 'ok' : k.classList.contains('st-no') ? 'no' : '', face: R(f), text: [Math.max(a.left, f.left), Math.max(a.top, f.top), Math.min(a.right, f.right), Math.min(a.bottom, f.bottom)].map(rd), badge: vis(kb) ? R(kb.getBoundingClientRect()) : null });
  });
  const learn = document.querySelector('#rig .slab.learn'); let strip = null, stripText = null, stripBadge = null, learnPx = null, learnLines = null;
  if (learn && vis(learn)) {
    strip = R(learn.querySelector(':scope > .bd > .ft').getBoundingClientRect());
    const sp = learn.querySelector('.ltext span'); stripText = R(sp.getBoundingClientRect()); learnPx = parseFloat(getComputedStyle(sp).fontSize); learnLines = Math.round(sp.offsetHeight / parseFloat(getComputedStyle(sp).lineHeight));
    stripBadge = R(learn.querySelector('.lbadge > .bd > .ft').getBoundingClientRect());
  }
  let ring = null;
  document.querySelectorAll('#rig .wave').forEach(w => { if (!vis(w)) return; const b = w.getBoundingClientRect(); ring = ring ? [Math.min(ring[0], b.left), Math.min(ring[1], b.top), Math.max(ring[2], b.right), Math.max(ring[3], b.bottom)] : [b.left, b.top, b.right, b.bottom]; });
  return { keys, strip, stripText, stripBadge, learnPx, learnLines, ring: ring && ring.map(rd) };
});
const hit = (a, b) => !!a && !!b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
/** every 4-option reveal: answer in slot 1..4 x 1-line / 2-line fact x themes L1..L4 (cloned from one sample question), + a 2-option one */
function overlapShow() {
  const src = Q.find(s => (s.options || []).length === 4 && s.t.learn_in != null && s.learn_text), two = Q.find(s => (s.options || []).length === 2 && s.t.learn_in != null && s.learn_text);
  const segs = []; let t = 0;
  const facts = ['سُمّيت على اسم سيمون بوليفار', 'سُمّيت على اسم سيمون بوليفار، بطل استقلال أمريكا الجنوبية وقائد حروب التحرير فيها'];
  for (const lv of [1, 2, 3, 4]) for (const slot of [0, 1, 2, 3]) for (const li of [0, 1]) { const s = retime(src, t, { id: `ov-l${lv}-s${slot + 1}-f${li + 1}`, level: lv, answer_index: slot, learn_text: facts[li] }); segs.push(s); t = s.end; }
  if (two) for (const slot of [0, 1]) { const s = retime(two, t, { id: `ov-two-s${slot + 1}`, answer_index: slot }); segs.push(s); t = s.end; }
  return { ...clone(sample), duration: t, segments: segs };
}
/** rows {id, t, problems[]}: three frames per question (sunk keys before the strip, strip landed, late hold); ring boxes are static */
async function overlapCheck(show, segs) {
  const rows = [];
  for (const s of segs) for (const t of [s.t.reveal + 0.3, Math.min(s.end - 0.4, learnT(s)), Math.min(s.end - 0.4, s.t.learn_in + 2.5)]) {
    await load(show, { drift: false }); await seek(t);
    const b = await overlapBoxes(), bad = [], n = (s.options || []).length;
    if (b.keys.length !== n) bad.push(`keys visible ${b.keys.length}/${n}`);
    b.keys.forEach((k, i) => {
      for (const [nm, box] of [['text', k.text], ['badge', k.badge]]) {
        if (hit(box, b.strip)) bad.push(`key ${i + 1} ${nm} under the fact strip`);
        if (hit(box, b.ring)) bad.push(`key ${i + 1} ${nm} under the mascot rings`);
        if (box && box[3] > SAFE_BOTTOM) bad.push(`key ${i + 1} ${nm} below ${SAFE_BOTTOM}`);
      }
      if (n === 4 && hit(k.face, b.strip)) bad.push(`key ${i + 1} face overlaps the fact strip`);
    });
    if (hit(b.ring, b.stripText)) bad.push('rings over the fact text'); if (hit(b.ring, b.stripBadge)) bad.push('rings over the fact badge');
    if (b.ring && b.ring[3] > SAFE_BOTTOM) bad.push('rings below ' + SAFE_BOTTOM);
    if (b.strip && t > s.t.learn_in + 0.6) { if (b.strip[3] > SAFE_BOTTOM) bad.push('strip below ' + SAFE_BOTTOM); if (b.learnPx < 46) bad.push('fact text ' + b.learnPx + 'px'); if (b.learnLines > 2) bad.push('fact text ' + b.learnLines + ' lines'); }
    rows.push({ id: s.id, t: +t.toFixed(2), answer_slot: s.answer_index + 1, options: n, fact_lines: b.learnLines, fact_px: b.learnPx, key4_face_bottom: b.keys[3] ? b.keys[3].face[3] : null, strip_top: b.strip ? b.strip[1] : null, ring: b.ring, strip_badge: b.stripBadge, problems: bad });
  }
  return rows;
}
const cmd = process.argv[2] || 'sheets';
const report = { cmd };
fs.mkdirSync(OUT, { recursive: true });

function plan() {
  const fl = xseg('plain'), fl2 = xseg('plain2'), em = byMech('emoji'), nk = byMech('nickname'), fh = xseg('hint'), tf = byMech('truefalse'), bg = byMech('bigger'), sp = byMech('speed', 1) || byMech('speed'), sp2 = byMech('speed', 7) || sp;
  const fxq = e => byMech('flag_' + e) || xseg('fx-' + e), fxs = e => (byMech('flag_' + e) ? sample : extras);
  const card = k => sample.segments.find(s => s.type === 'card' && s.kind === k);
  const lv3 = sample.segments.find(s => s.type === 'card' && s.kind === 'level' && s.level === 3) || card('level');
  const lad = sample.segments.find(s => s.type === 'ladder'), end = sample.segments.find(s => s.type === 'end'), spc = card('speed');
  return {
    states: [[sample, 0], [extras, mid(fl)], [extras, learnT(fl)], [sample, mid(em)], [sample, mid(nk)], [extras, fh.t.timer_end - 0.6], [sample, mid(tf)], [sample, bg.t.reveal + 0.8], [sample, sp.t.reveal + 0.7]],
    themes: [1, 2, 3, 4].map(l => [extras, mid(xseg('theme' + l))]),
    cards: [[sample, lv3.start + 2.2], [sample, lad.start + 2.6], [sample, end.start + 3], [extras, xseg('promise').start + 2.2], [sample, spc.start + 1.4], [sample, sp2.t.timer_start + 1.2]],
    phone: [[extras, learnT(fl)], [extras, mid(fl)]],
    motion: [[extras, fl2.start + 0.2], [extras, fl2.start + 0.62], [extras, fl2.t.timer_end - 0.5], [extras, fl2.t.reveal + 0.18], [extras, (fl2.t.learn_in ?? fl2.t.reveal + 1) + 0.25], [extras, fl2.end - 0.12]],
    effects: ['zoom', 'blur', 'strips'].flatMap(e => { const s = fxq(e), w = fxs(e); return [[w, s.t.timer_start + 0.3 * (s.t.timer_end - s.t.timer_start)], [w, s.t.timer_start + 0.72 * (s.t.timer_end - s.t.timer_start)]]; }),
  };
}

if (cmd === 'sheets' || cmd === 'mega') {
  const P = plan();
  if (cmd === 'mega') {
    // one contact sheet for self-review: 4 x 4 cells
    const items = [...P.states.slice(0, 9), P.themes[3], P.cards[0], P.cards[1], P.cards[2], P.cards[4], P.effects[1], P.effects[5]];
    const extra = (process.argv[3] || '').split(',').filter(Boolean);
    if (process.argv[3] === '2') {
      const X = id => extras.segments.find(s => s.id === id), S2 = id => sample.segments.find(s => s.id === id), p2 = X('plain2'), tf = byMech('truefalse'), bl = byMech('flag_blur') || X('fx-blur'), zm = byMech('flag_zoom') || X('fx-zoom');
      const sp3 = Q.filter(s => s.mechanic === 'speed')[7], sp1 = Q.filter(s => s.mechanic === 'speed')[1];
      const list = [[extras, mid(X('theme4'))], [sample, S2('level3').start + 2.2], [extras, X('promise').start + 2.2], [sample, sp3.t.timer_start + 1.2], [sample, mid(tf)], [sample, learnT(tf)], [extras, learnT(X('name3')) + 0.6], [extras, learnT(X('long'))],
        [byMech('flag_blur') ? sample : extras, bl.t.timer_start + 0.3 * (bl.t.timer_end - bl.t.timer_start)], [byMech('flag_zoom') ? sample : extras, zm.t.timer_start + 0.1 * (zm.t.timer_end - zm.t.timer_start)],
        [extras, p2.start + 0.25], [extras, p2.start + 0.55], [extras, p2.t.reveal + 0.12], [extras, p2.end - 0.12], [sample, 3], [sample, sp1.start + 0.1]];
      report.mega = grid(await frames(list), 4, 480, path.join(OUT, 'mega-sheet.jpg'));
    } else
    report.mega = grid(await frames(extra.length ? extra.map(x => { const [w, t] = x.split(':'); return [w === 'x' ? extras : sample, +t]; }) : items), +(process.argv[4] || 4), +(process.argv[5] || 480), path.join(OUT, process.argv[6] || 'mega-sheet.jpg'));
  } else {
    report.states = grid(await frames(P.states), 3, 640, path.join(OUT, 'states-sheet.jpg'));
    report.themes = grid(await frames(P.themes), 2, 960, path.join(OUT, 'themes-sheet.jpg'));
    report.cards = grid(await frames(P.cards), 3, 640, path.join(OUT, 'cards-sheet.jpg'));
    report.phone = grid(await frames(P.phone), 2, 360, path.join(OUT, 'phone-360.jpg'));
    report.motion = grid(await frames(P.motion), 3, 640, path.join(OUT, 'motion-sheet.jpg'));
    const fxf = await frames(P.effects);
    report.effects = grid([fxf[0], fxf[2], fxf[4], fxf[1], fxf[3], fxf[5]], 3, 640, path.join(OUT, 'effects-sheet.jpg'));
  }
}
if (cmd === 'vr1') {
  // proof sheet for the 2026-11-13 fixes: 3 x 3 cells (640 px each) from the current episode, guide line at y = 950 px
  const q = id => seg(id), card = (k, lv) => sample.segments.find(s => s.type === 'card' && s.kind === k && (lv == null || s.level === lv));
  const q1 = Q[0], normal = q('q05') || Q[4], two = Q.filter(s => s.t.learn_in != null && String(s.learn_text || '').length > 60)[0] || Q[1];
  const hold = Q.filter(s => s.mechanic === 'speed' && s.hold_text).pop(), spc = card('speed'), lv2 = card('level', 2) || card('level');
  const lad = sample.segments.find(s => s.type === 'ladder'), end = sample.segments.find(s => s.type === 'end');
  const list = [['Q1 t=0.0', q1.start], ['Q1 t=1.5', q1.start + 1.5], [normal.id + ' mid-timer', mid(normal)], [two.id + ' learn', learnT(two) + 0.4], [hold.id + ' hold_text', hold.t.reveal + 1.6],
    ['speed card', spc.start + 1.8], ['level 2 card', lv2.start + 2.6], ['ladder', lad.start + 3.2], ['end', end.start + 3]];
  await load(sample);
  // how far the magnified detail moves in the first 1.5 s (screen px of the flag image's own box)
  const box = async t => { await seek(t); return page.evaluate(() => { const i = [...document.querySelectorAll('.plate img')].find(e => e.offsetParent !== null || e.getClientRects().length); const b = i.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width]; }); };
  const b0 = await box(q1.start), b4 = await box(q1.start + 0.4), b15 = await box(q1.start + 1.5);
  const d = (a, b) => ({ dx: +(b[0] - a[0]).toFixed(1), dy: +(b[1] - a[1]).toFixed(1), px: +Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1) });
  report.q1_detail_moved = { after_0_4s: d(b0, b4), after_1_5s: d(b0, b15), static_first_second: await page.evaluate(([a]) => window.__static(a, a + 1, { ignore_drift: true }), [q1.start]) };
  report.cells = list.map(([n, t]) => `${n} @ ${t.toFixed(2)}`);
  const files = await frames(list.map(([, t]) => [sample, t]));
  report.sheet = grid(files, 3, 640, path.join(OUT, 'vr1-sheet.jpg'), 'drawbox=x=0:y=949:w=1920:h=3:color=0x00E5FF@0.95:t=fill,');
}
if (cmd === 'overlap') {
  // node render.mjs overlap <show.json>: overlap assertion over every option question of that show + proof sheet out/overlap-fix-sheet.jpg
  // (2 x 2, 1920 px wide): q31 @ 400.0 (slot 3), q01 @ 14.6 (slot 4), a slot-1 answer after learn_in, a 2-option question after learn_in
  const show = JSON.parse(fs.readFileSync(path.resolve(process.argv[3]), 'utf8')), qs = show.segments.filter(s => s.type === 'question' && (s.options || []).length >= 2 && s.t && s.t.learn_in != null && s.learn_text);
  const rows = await overlapCheck(show, qs);
  report.overlap = { questions: qs.length, frames: rows.length, problems: rows.filter(r => r.problems.length) };
  const at = tt => show.segments.find(s => s.type === 'question' && s.start <= tt && tt < s.end);
  const s1 = qs.find(s => s.options.length === 4 && s.answer_index === 0), s2 = qs.find(s => s.options.length === 2);
  const list = [[at(400.0), 400.0], [at(14.6), 14.6], [s1, s1.t.learn_in + 1.2], [s2, s2.t.learn_in + 1.2]];
  report.cells = list.map(([s, t]) => `${s.id} slot ${s.answer_index + 1}/${s.options.length} @ ${t.toFixed(2)}`);
  delete show._key;
  report.sheet = grid(await frames(list.map(([, t]) => [show, t])), 2, 960, path.join(OUT, 'overlap-fix-sheet.jpg'));
}
if (cmd === 'shot') { await load(process.argv[5] === 'x' ? extras : sample); await seek(+process.argv[3]); report.file = await shot(path.join(OUT, (process.argv[4] || 'shot') + '.png')); }
if (cmd === 'geom') {
  await load(process.argv[4] === 'x' ? extras : sample); await seek(+process.argv[3]);
  report.geom = await page.evaluate(() => {
    const vis = e => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false; return true; };
    const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const out = {};
    document.querySelectorAll('.slab').forEach(s => { if (!vis(s) || s.classList.contains('blk')) return; const ft = s.querySelector(':scope > .bd > .ft'), sl = s.querySelector(':scope > .bd > .sl, :scope > .bd > .rs'); const name = s.className.replace('slab ', '').replace(/c-\w+/g, '').trim().replace(/\s+/g, '.'); (out[name] = out[name] || []).push({ face: r(ft), base: sl ? r(sl) : null, text: (ft.textContent || '').trim().slice(0, 24) }); });
    return out;
  });
}
if (cmd === 'sizes') {
  // fitted font sizes of every question's texts (regression aid when the layout changes)
  await load(sample, { drift: false, warm: false });
  const out = {};
  for (const s of sample.segments) {
    if (s.type !== 'question') continue;
    await seek(Math.min(s.end - 0.4, learnT(s)));
    out[s.id] = await page.evaluate(() => { const vis = e => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false; return true; };
      const px = sel => [...document.querySelectorAll(sel)].filter(vis).map(e => Math.round(parseFloat(getComputedStyle(e).fontSize)));
      return { ask: px('.plaque .tx-ask'), clue: px('.cluetext span'), opt: px('.key .kt'), learn: px('.learn .ltext span') }; });
  }
  report.sizes = out;
}
if (cmd === 'checks') {
  const info = await load(sample, { drift: false });
  report.load = info;
  // 1) leak: option keys identical just before the reveal (5 questions incl. 2-option ones)
  const picks = [byMech('flag'), byMech('truefalse'), byMech('bigger'), byMech('capital'), byMech('emoji'), byMech('flag_zoom'), byMech('flag_strips'), byMech('nickname')].filter(Boolean);
  report.leak = [];
  for (const s of picks) for (const t of [s.t.timer_start + 0.05, s.t.reveal - 1 / 30]) {
    await seek(t);
    const keys = await page.evaluate('window.__keys()');
    const diff = []; for (const f of ['cls', 'wrap', 'body', 'faces', 'shadow', 'badge', 'text', 'icons', 'h', 'w']) if (new Set(keys.map(k => String(k[f]))).size !== 1) diff.push(f);
    report.leak.push({ id: s.id, mechanic: s.mechanic, t: +t.toFixed(3), keys: keys.length, identical: diff.length === 0 && keys.length === s.options.length, diff });
  }
  // sanity: after the reveal the keys must differ
  { const s = picks[0]; await seek(s.t.reveal + 0.5); const keys = await page.evaluate('window.__keys()'); report.leak_after_reveal_differs = new Set(keys.map(k => k.cls)).size > 1; }
  // 2) __static soundness (drift off): whenever it says static between consecutive frames, the DOM state must be identical
  const st = await page.evaluate(async dur => {
    let stat = 0, bad = 0, n = 0, firstBad = null; window.__seek(0); let prev = window.__sig();
    for (let f = 1; f / 30 <= dur; f++) { const t0 = (f - 1) / 30, t1 = f / 30; window.__seek(t1); const sig = window.__sig(); n++; if (window.__static(t0, t1)) { stat++; if (sig !== prev) { bad++; if (firstBad == null) firstBad = t1; } } prev = sig; }
    return { frames: n, static_frames: stat, unsound: bad, firstBad };
  }, sample.duration);
  report.static_drift_off = st;
  await load(sample);
  const end = sample.segments.find(s => s.type === 'end');
  report.static_drift_on = await page.evaluate(([a, b, q]) => ({ end_frame_hold: window.__static(a + 1, b - 0.01), during_question: window.__static(q, q + 0.2), declared: window.__drift }), [end.start, end.end, Q[3].t.learn_in + 1]);
  // 3) emoji font actually used
  const em = byMech('emoji'); await seek(mid(em));
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 }); await cdp.send('CSS.enable');
  const nodes = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.emo' });
  const fonts = new Set();
  for (const nodeId of nodes.nodeIds) { const { fonts: fs2 } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }); for (const f of fs2) fonts.add(`${f.familyName}${f.isCustomFont ? ' (web font)' : ' (system)'}`); }
  report.emoji_fonts = [...fonts];
  // 4) lint + safe margins over a set of frames (faces of UI slabs inside x 77..1843 (4 %), top >= 3 % (32 px); the bottom edge has its own check below)
  report.lint = await page.evaluate('window.__lint()');
  const P = plan(); const outside = [];
  for (const [show, t] of [...P.states, ...P.cards, ...P.themes]) {
    await load(show); await seek(t);
    const o = await page.evaluate(() => { const bad = []; const vis = e => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false; return true; };
      document.querySelectorAll('.slab:not(.blk):not(.sband):not(.scard)').forEach(s => { if (!vis(s)) return; const b = s.querySelector(':scope > .bd > .ft').getBoundingClientRect(); if (b.width < 2) return; if (b.left < 76 || b.right > 1844 || b.top < 32 || b.bottom > 1038) bad.push(s.className.replace('slab ', '') + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round).join(',')); }); return bad; });
    if (o.length) outside.push({ t: +t.toFixed(2), show: show === extras ? 'extras' : 'sample', o });
  }
  report.outside_safe = outside;
  // 5) text: every visible text node inside its face / screen, no Latin digits or letters on screen
  const X = id => extras.segments.find(s => s.id === id), tx = [], low = [], rawSep = []; let worst = { bottom: 0 }, kinds = new Set(); const byFace = {};
  const more = [[extras, learnT(X('long'))], [extras, mid(X('long'))], [extras, learnT(X('name3')) + 0.5], [extras, X('promise').start + 2], [extras, X('promise2').start + 2], [extras, X('hint').t.timer_end - 0.3]];
  for (const s of sample.segments) { if (s.type === 'question') { more.push([sample, mid(s)], [sample, Math.min(s.end - 0.4, learnT(s))]); } else more.push([sample, Math.min(s.end - 0.4, s.start + 2)]); }
  for (const [show, t] of more) {
    await load(show); await seek(t);
    const o = await page.evaluate(() => {
      const bad = [], vis = e => { for (let n = e; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return false; } return true; };
      const w = document.createTreeWalker(document.getElementById('rig'), NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const txt = n.nodeValue.trim(); if (!txt) continue; const el = n.parentElement; if (!vis(el) || el.closest('.socket')) continue;
        if (/[0-9A-Za-z]/.test(txt)) bad.push('latin: ' + txt);
        if (el.closest('.g3d') && !el.classList.contains('top')) continue;
        const tvc = el.closest('.tvc'), box = el.closest('.cluetext') ? tvc.parentElement.querySelector('.screen') : el.closest('.ft'); if (!box) continue;
        const r = document.createRange(); r.selectNodeContents(n); const a = r.getBoundingClientRect(), b = box.getBoundingClientRect();
        if (a.width < 1) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); const over = Math.max(b.left - a.left, a.right - b.right, b.top - a.top - fs * 0.62, a.bottom - b.bottom - fs * 0.62);   // the range box is the font's full content area (Cairo: ~1.9 em), far taller than the ink
        if (over > 3) bad.push(`overflow ${Math.round(over)}px in .${(box.parentElement.parentElement.className || box.className).replace('slab ', '').split(' ').slice(0, 2).join('.')}: ${txt.slice(0, 30)}`);
      }
      return bad;
    });
    if (o.length) tx.push({ t: +t.toFixed(2), show: show === extras ? 'extras' : 'sample', o });
    // 5b) bottom safe zone + raw separator glyphs, same frames (drift on): a normal question mid-timer, reveal + learn strip, 2-option
    //     questions, speed items (with hold_text), every card kind, the ladder and the end frame are all in this list
    const bz = await bottomsOf(), who = { t: +t.toFixed(2), show: show === extras ? 'extras' : 'sample' };
    for (const f of bz.faces) { const k = f.name.startsWith('text:') ? 'text' : f.name; byFace[k] = Math.max(byFace[k] || 0, f.bottom); if (f.bottom > worst.bottom) worst = { ...f, ...who }; if (f.bottom > SAFE_BOTTOM) low.push({ ...f, ...who }); }
    if (bz.raw.length) rawSep.push({ ...who, raw: bz.raw });
  }
  { const S2 = show => show.segments.map(s => (s.type === 'question' ? (s.mechanic === 'speed' ? (s.hold_text ? 'speed+hold' : 'speed') : (s.options || []).length === 2 ? 'two-option' : 'question') : s.type + (s.kind ? ':' + s.kind : ''))); for (const k of [...S2(sample), ...S2(extras)]) kinds.add(k); }
  report.bottom_edge = { limit_px: SAFE_BOTTOM, covered: [...kinds].sort(), lowest_face: worst, lowest_by_face: Object.fromEntries(Object.entries(byFace).filter(([, v]) => v > 880).sort((a, b) => b[1] - a[1])), below_limit: low };
  report.raw_separator_glyphs = rawSep;
  report.text_frames_checked = more.length; report.text_problems = tx;
  // 6) contrast of the declared text/background pairs in every theme
  report.contrast = await page.evaluate(() => {
    const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2); };
    const out = {}, probe = document.createElement('div'); document.body.appendChild(probe);
    for (const th of ['l1', 'l2', 'l3', 'l4']) {
      probe.className = 'th-' + th; const cs = getComputedStyle(probe), v = n => cs.getPropertyValue('--' + n).trim();
      const pairs = { 'on-frame/frame': [v('on-frame'), v('frame')], 'on-frame/f-mid': [v('on-frame'), v('f-mid')], 'soft/f-mid': [v('soft'), v('f-mid')], 'num/f-mid': [v('num'), v('f-mid')], 'ink/tile': [v('ink'), v('tile')], 'on-accent/accent': [v('on-accent'), v('accent')],
        'on-ok/ok': ['#052B17', '#2AD46F'], 'wink/wtile': [v('wink'), v('wtile')], 'learn-ink/learn': [v('learn-ink'), v('learn')], 'dial/timer': ['#141B4D', v('timer')], 'dial-alert/white': ['#C8002C', '#FFFFFF'], 'cluetext/scr2': ['#FFFFFF', v('scr2')],
        'step/lv1': ['#141B4D', '#FFC532'], 'step/lv2': ['#141B4D', '#FF74AE'], 'step/lv3': ['#141B4D', '#FF5A3C'], 'step/lv4': ['#141B4D', '#DDE3FF'] };
      const low = {}; let min = 99; for (const [k, [a, b]] of Object.entries(pairs)) { const r = cr(a, b); min = Math.min(min, r); if (r < 4.5) low[k] = r; }
      out[th] = { min, below_4_5: low };
    }
    probe.remove(); return out;
  });
  report.network_outside_localhost = requests.filter(u => /^https?:/i.test(u)).length;
  // 7) idle motion: effect flags are never static between the segment start and timer_start
  await load(sample, { drift: false });
  report.idle_motion = [];
  for (const s of Q.filter(x => x.clue && x.clue.effect)) {
    const a = s.start + 0.6, b = Math.max(a + 0.1, s.t.timer_start - 0.7); const sig = async t => { await seek(t); return page.evaluate('window.__sig()'); };
    const st = await page.evaluate(([x, y]) => [window.__static(x, x + 1 / 30), window.__static(y, y + 1 / 30)], [a, b]);
    report.idle_motion.push({ id: s.id, effect: s.clue.effect, static_flagged: st.some(Boolean), frames_differ: (await sig(a)) !== (await sig(a + 1 / 30)) && (await sig(b)) !== (await sig(b + 1 / 30)) });
  }
  // 8) reveal overlap: option texts / badges clear of the fact strip and of the mascot rings (4 slots x 1/2 fact lines x 4 themes + 2-option)
  let overlapOk = false;
  { const ov = overlapShow(), rows = await overlapCheck(ov, ov.segments), bad = rows.filter(r => r.problems.length);
    const real = Q.filter(s => (s.options || []).length >= 2 && s.t.learn_in != null && s.learn_text), rows2 = await overlapCheck(sample, real), bad2 = rows2.filter(r => r.problems.length);
    const gap = rows.filter(r => r.options === 4 && r.strip_top != null && r.key4_face_bottom != null && r.t > 0).map(r => r.strip_top - r.key4_face_bottom);
    report.reveal_overlap = { frames: rows.length + rows2.length, synthetic_cases: ov.segments.length, sample_questions: real.length, slots_covered: [...new Set(rows.filter(r => r.options === 4).map(r => r.answer_slot))].sort(), fact_lines_covered: [...new Set(rows.map(r => r.fact_lines).filter(Boolean))].sort(),
      min_gap_key4_to_strip_px: +Math.min(...gap).toFixed(1), ring_box: rows[0].ring, strip_badge_box: rows[1].strip_badge, problems: [...bad, ...bad2] };
    overlapOk = !bad.length && !bad2.length; }
  report.ok = { reveal_overlap: overlapOk, bottom_edge: !low.length, separators: !rawSep.length, lint: !report.lint.length, leak: report.leak.every(l => l.identical), static_sound: !st.unsound, safe_margins: !outside.length, text: !tx.length, idle: report.idle_motion.every(m => !m.static_flagged && m.frames_differ) };
}
if (cmd === 'bench') {
  await load(sample);
  const s = byMech('flag', 1) || Q[0], a = s.start, N = 300;
  report.seek_js_ms = await page.evaluate(([a0, n]) => { const t0 = performance.now(); for (let i = 0; i < n; i++) window.__seek(a0 + i / 30); return +((performance.now() - t0) / n).toFixed(3); }, [a, N]);
  report.seek_js_layout_ms = await page.evaluate(([a0, n]) => { const t0 = performance.now(); for (let i = 0; i < n; i++) { window.__seek(a0 + i / 30); document.body.offsetWidth; } return +((performance.now() - t0) / n).toFixed(3); }, [a, N]);
  report.seek_whole_episode_ms = await page.evaluate(dur => { const t0 = performance.now(); let n = 0; for (let f = 0; f / 30 < dur; f++) { window.__seek(f / 30); n++; } return +((performance.now() - t0) / n).toFixed(3); }, sample.duration);
  for (let i = 0; i < 20; i++) { await seek(a + i / 30); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true }); }
  const t0 = performance.now();
  for (let i = 0; i < N; i++) { await cdp.send('Runtime.evaluate', { expression: `window.__seek(${a + i / 30})` }); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, fromSurface: true }); }
  report.capture_jpeg_ms_per_frame = +((performance.now() - t0) / N).toFixed(1);
  report.info = await page.evaluate('({ layers: window.__info().layers, drift: window.__info().drift })');
  const timeIt = async (f, n = 120) => { const t1 = performance.now(); for (let i = 0; i < n; i++) { await cdp.send('Runtime.evaluate', { expression: `window.__seek(${f(i)})` }); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, fromSurface: true }); } return +((performance.now() - t1) / n).toFixed(1); };
  report.same_frame_ms = await timeIt(() => a + 3);
  report.timer_phase_ms = await timeIt(i => s.t.timer_start + 0.5 + i / 30);
  report.level_card_ms = await timeIt(i => sample.segments.find(x => x.type === 'card' && x.kind === 'level').start + 1.5 + i / 30);
  report.speed_q_ms = await timeIt(i => byMech('speed').t.timer_start + 0.3 + i / 30, 60);
  loaded = 'reload'; await page.evaluate(async sh => { await window.__load(sh, { drift: false, warm: false }); }, sample);
  report.drift_off_timer_phase_ms = await timeIt(i => s.t.timer_start + 0.5 + i / 30);
  report.drift_off_same_frame_ms = await timeIt(() => a + 3);
  await page.setContent('<body style="margin:0;background:#234"><div id="x" style="width:1920px;height:1080px;background:linear-gradient(90deg,#123,#fed)"></div></body>');
  { const t1 = performance.now(); for (let i = 0; i < 60; i++) { await page.evaluate(`document.getElementById('x').style.opacity = ${(0.5 + i / 200).toFixed(3)}`); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, fromSurface: true }); } report.baseline_trivial_page_ms = +((performance.now() - t1) / 60).toFixed(1); }
}
if (cmd === 'raster') {
  // the first capture after a seek must equal the capture after the compositor settled (no missing tiles):
  // (a) cold: fresh page per start point, like a capture worker; (b) sequential: across every segment boundary
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cap = async (c = cdp) => (await c.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, fromSurface: true })).data;
  report.cold = [];
  for (const t of [0, Q[1].t.timer_start + 1, sample.duration * 0.33, sample.duration * 0.66, sample.segments.find(s => s.type === 'ladder').start + 2]) {
    const p2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); const c2 = await p2.context().newCDPSession(p2);
    await p2.goto(URL0); await p2.waitForFunction('typeof window.__load === "function"'); await p2.evaluate(async s => { await window.__load(s); }, sample); await p2.waitForFunction('window.__ready === true');
    await c2.send('Runtime.evaluate', { expression: `window.__seek(${t})` }); const a = await cap(c2); await wait(900); const b = await cap(c2);
    report.cold.push({ t: +t.toFixed(2), same: a === b, first_bytes: a.length, settled_bytes: b.length }); await p2.close();
  }
  { // builder flow: the page self-loads from ?show=, then __load(show) is called with the same show (must not load twice)
    const p2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); const c2 = await p2.context().newCDPSession(p2);
    await p2.goto(URL0 + '?show=dev/sample-show.json'); await p2.waitForFunction('typeof window.__load === "function" && typeof window.__seek === "function"');
    const t1 = performance.now(); await p2.evaluate(async s => { await window.__load(s); }, sample); const firstMs = performance.now() - t1;
    const t2 = performance.now(); await p2.evaluate(async s => { await window.__load(s); }, sample); const againMs = performance.now() - t2;
    await p2.waitForFunction('window.__ready === true');
    const t = Q[2].t.timer_start + 1; await c2.send('Runtime.evaluate', { expression: `window.__seek(${t})` }); const a = await cap(c2); await wait(900); const b = await cap(c2);
    report.builder_flow = { load_ms_incl_selfload: Math.round(firstMs), second_load_ms: Math.round(againMs), first_capture_equals_settled: a === b }; await p2.close(); }
  await load(sample); let bad = [];
  for (const s of sample.segments) for (const dt of [1 / 30, 0.5]) {
    if (dt === 1 / 30 && s.start > 0) await seek(s.start - 1 / 30), await cap();
    await seek(s.start + dt); const a = await cap(); await wait(350); const b = await cap(); if (a !== b) bad.push({ id: s.id, dt: +dt.toFixed(3), first: a.length, settled: b.length });
  }
  report.sequential = { tested: sample.segments.length * 2, differing: bad };
}
report.errors = errs;
console.log(JSON.stringify(report, null, 1));
await browser.close(); srv.close();
fs.rmSync(tmp, { recursive: true, force: true });
