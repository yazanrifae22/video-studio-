// Clips Viral Studio dashboard. No build step: plain ES module served by apps/api.
// Rendering model: each view returns an HTML string that is *morphed* into the page (DOM diff), so live
// updates never reset a playing video, the scroll position, an open <details> or a field you are typing in.

import { install as installVr } from './vr.js';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toDate = t => t ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : String(t).replace(' ', 'T') + 'Z') : null;
const ago = t => { const d0 = toDate(t); if (!d0) return '—'; const d = (Date.now() - d0) / 1000; if (d < 0) return 'in ' + rel(-d); return rel(d) + ' ago'; };
const rel = d => d < 60 ? `${d | 0}s` : d < 3600 ? `${d / 60 | 0}m` : d < 86400 ? `${d / 3600 | 0}h` : `${d / 86400 | 0}d`;
const dur = s => s == null ? '—' : s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s)}s`;
const num = n => n == null ? '—' : Number(n).toLocaleString();
const hm = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayKey = d => d.toLocaleDateString('en-CA');
const LS = { get: (k, d) => { try { const v = localStorage.getItem('cvs.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('cvs.' + k, JSON.stringify(v)); } catch {} } };
const ICON = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', bot: 'M12 8V4M8 4h8M5 8h14v11H5zM9 13h.01M15 13h.01', flask: 'M9 3h6M10 3v6L4 20h16L14 9V3', spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  board: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v13h-4z', play: 'M6 4l14 8-14 8z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  cal: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', chart: 'M3 3v18h18M7 15l4-4 3 3 6-7', box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12h2M3 12h2M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3', ext: 'M14 3h7v7M10 14 21 3M21 14v7H3V3h7', x: 'M18 6 6 18M6 6l12 12', left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6', yt: 'M22 8s0-3-3-3H5C2 5 2 8 2 8v8s0 3 3 3h14c3 0 3-3 3-3zM10 9l5 3-5 3z', flow: 'M3 4h6v5H3zM15 15h6v5h-6zM15 4h6v5h-6zM6 9v4a2 2 0 0 0 2 2h7M9 6.5h6',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24"><path d="${ICON[n]}"/></svg>`;
const TONE = {
  ok: 'approved done pass connected working published selected rendered success active', ok2: 'approved_with_conditions',
  warn: 'pending queued revise blocked created qa editing planned proposed revision_requested claimed minor', bad: 'rejected failed error reject cancelled restricted blocker major critical',
  info: 'running scheduled analysis research script rights downloaded', acc: 'idea analytics',
};
const toneOf = s => { s = String(s ?? ''); for (const [t, l] of Object.entries(TONE)) if (l.split(' ').includes(s)) return 't-' + t; return ''; };
const pill = (s, label) => `<span class="pill ${toneOf(s)}">${esc(label ?? String(s ?? '—').replace(/_/g, ' '))}</span>`;
const scoreCls = v => v == null ? '' : v >= 85 ? 'hi' : v >= 75 ? 'mid' : 'lo';
const score = v => v == null ? '<span class="dim">—</span>' : `<span class="score ${scoreCls(v)}">${esc(v)}</span>`;
const bc = id => `--c:var(--b-${esc(id)},var(--acc))`;
const brandName = id => G.brands[id]?.name || id || '—';
const brandTag = id => `<span class="brand" style="${bc(id)}" dir="auto">${esc(brandName(id))}</span>`;
const mediaUrl = p => { if (!p) return null; const n = p.replace(/\\/g, '/'); const i = n.indexOf('/data/cache/'); if (i >= 0) return '/media/cache/' + n.slice(i + 12); const j = n.indexOf('/productions/'); return j >= 0 ? '/media/productions/' + n.slice(j + 13) : null; };
const kpi = (v, l, tone = '', go = '') => `<div class="kpi ${tone ? 'tone-' + tone : ''}"${go ? ` data-go="${esc(go)}"` : ''}><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`;
const chips = (key, cur, opts) => `<div class="chips">${opts.map(([v, l, c, style]) => `<span class="chip ${String(cur) === String(v) ? 'on' : ''}" data-set="${esc(key)}" data-v="${esc(v)}"${style ? ` style="${style}"` : ''}>${l}${c != null ? ` <span class="c">${c}</span>` : ''}</span>`).join('')}</div>`;
const searchBox = (key, val, ph = 'Search…') => `<label class="search">${ic('search')}<input data-model="${esc(key)}" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}"></label>`;
const safeUrl = u => /^https?:\/\//i.test(String(u ?? '')) ? esc(u) : '#';
const has = (q, ...f) => !q || f.some(x => String(x ?? '').toLowerCase().includes(q.toLowerCase()));

/* ---------- API ---------- */
async function api(p, body) {
  const r = await fetch(p, body ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-studio': '1' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j && j.error && !Array.isArray(j))) throw new Error(j.error || r.statusText);
  return j;
}
function toast(m, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = m; $('#toasts').append(t); setTimeout(() => t.remove(), bad ? 5000 : 2600); }
async function act(p, body, msg = 'Saved') { try { await api(p, body); toast(msg); await refresh(true); await loadShared(); return true; } catch (e) { toast(e.message, true); return false; } }

/* ---------- DOM morph ---------- */
function morph(el, html) { const t = document.createElement('template'); t.innerHTML = html; patchChildren(el, t.content); }
const keyOf = n => n.nodeType === 1 ? n.getAttribute('data-k') : null;
function patch(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  if (a.hasAttribute('data-keep')) return;                    // e.g. <video>: never touched once mounted
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name) && !(name === 'open' && a.tagName === 'DETAILS')) a.removeAttribute(name);
  for (const { name, value } of [...b.attributes]) if (a.getAttribute(name) !== value && !(name === 'open' && a.tagName === 'DETAILS')) a.setAttribute(name, value);
  const tag = a.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (tag !== 'SELECT') patchChildren(a, b);
    if (document.activeElement !== a) {
      if (tag === 'INPUT' && a.type === 'checkbox') a.checked = b.hasAttribute('checked');
      else if (tag === 'INPUT') { const v = b.getAttribute('value') ?? ''; if (a.value !== v) a.value = v; }
      else if (tag === 'TEXTAREA') { if (a.value !== b.textContent) a.value = b.textContent; }
    }
    if (tag === 'SELECT') { patchChildren(a, b); if (document.activeElement !== a) { const o = b.querySelector('option[selected]'); a.value = o ? (o.getAttribute('value') ?? o.textContent) : (a.options[0]?.value ?? ''); } }
    return;
  }
  patchChildren(a, b);
}
function patchChildren(a, b) {
  const olds = [...a.childNodes], news = [...b.childNodes], keyed = new Map(), used = new Set();
  for (const o of olds) { const k = keyOf(o); if (k) keyed.set(k, o); }
  let i = 0;
  news.forEach((n, idx) => {
    const k = keyOf(n); let o = null;
    if (k) { o = keyed.get(k); if (o && (used.has(o) || o.tagName !== n.tagName)) o = null; }
    else {
      while (i < olds.length && (used.has(olds[i]) || keyOf(olds[i]))) i++;
      // Prefer a close match (same tag and class) a few nodes ahead, so a conditional sibling (banner) never
      // gets paired with — and overwrites — an unrelated element; fall back to the next node of the same tag.
      const sameKind = c => c && !used.has(c) && !keyOf(c) && c.nodeType === n.nodeType && (c.nodeType !== 1 || c.tagName === n.tagName);
      let j = i, hit = -1;
      if (n.nodeType === 1) for (; j < Math.min(olds.length, i + 5); j++) if (sameKind(olds[j]) && olds[j].className === n.getAttribute('class')) { hit = j; break; }
      if (hit < 0 && sameKind(olds[i])) hit = i;
      if (hit >= 0) { o = olds[hit]; if (hit === i) i++; }
    }
    const ref = a.childNodes[idx] || null;
    if (o) { used.add(o); patch(o, n); if (ref !== o) a.insertBefore(o, ref); }
    else a.insertBefore(document.importNode(n, true), ref);
  });
  for (const o of olds) if (!used.has(o)) o.remove();
}

/* ---------- shared state ---------- */
const G = { brands: {}, brandList: [], overview: null, prods: [], progress: {}, events: [] };
const S = LS.get('state', {});                                 // per-view UI state (filters, modes)
const st = (view, def) => (S[view] ??= def);
const saveS = () => LS.set('state', S);
async function loadShared() {
  const [ov, prods] = await Promise.all([api('/api/overview'), api('/api/productions')]);
  G.overview = ov; G.prods = prods; G.brandList = ov.brands; G.brands = Object.fromEntries(ov.brands.map(b => [b.id, b]));
  renderNav();
}
const STAGES = ['idea', 'research', 'rights', 'analysis', 'script', 'editing', 'qa', 'approved', 'scheduled', 'published', 'analytics', 'rejected'];
const STAGE_C = { idea: '#8d95aa', research: '#45b7ff', rights: '#5ec8e8', analysis: '#6aa8ff', script: '#9b8cff', editing: '#c48bff', qa: '#f5a524', approved: '#2fd27a', scheduled: '#45b7ff', published: '#20c997', analytics: '#a28bff', rejected: '#ff5a5a' };

/* ---------- nav ---------- */
const NAV = [
  ['dashboard', 'Overview', 'home'], ['runway', 'Channel runway', 'cal'], ['board', 'Production board', 'board'], ['review', 'Review studio', 'play'], ['workflow', 'Workflow & rules', 'flow'], ['calendar', 'Publishing calendar', 'cal'],
  ['@Channels'], ['#channels'],
  ['@Create'], ['research', 'Research lab', 'flask'], ['clips', 'Clip intelligence', 'spark'], ['agents', 'Agents', 'bot'],
  ['@Operate'], ['accounts', 'Social accounts', 'users'], ['analytics', 'Analytics & learning', 'chart'], ['insights', 'YouTube insights', 'spark'], ['learn', 'Channel learning', 'flask'], ['assets', 'Assets & licensing', 'box'], ['jobs', 'Jobs', 'cog'],
];
function renderNav() {
  const ov = G.overview, qa = G.prods.filter(p => p.current_state === 'qa').length, failed = ov ? (ov.jobs.find(j => j.status === 'failed')?.n || 0) : 0;
  const badge = { review: qa ? `<span class="n hot" title="${qa} in QA">${qa}</span>` : '', jobs: failed ? `<span class="n red" title="${failed} failed">${failed}</span>` : '' };
  const cur = curView();
  const html = `<div class="logo"><i></i><span>Clips Viral Studio</span></div>` + NAV.map(([id, l, icn]) => {
    if (id.startsWith('@')) return `<small>${esc(id.slice(1))}</small>`;
    if (id === '#channels') return G.brandList.map(b => { const n = G.prods.filter(p => p.brand_id === b.id).length;
      return `<a href="#channel/${esc(b.id)}" class="${(cur.view === 'channel' && cur.arg === b.id) || (b.id === 'viral-rankings' && cur.view === 'vr') ? 'on' : ''}" title="${esc(b.name)}"><span class="bdot" style="${bc(b.id)}"></span><span class="lbl trunc" dir="auto">${esc(b.name)}</span><span class="n">${n}</span></a>`; }).join('');
    return `<a href="#${id}" class="${cur.view === id ? 'on' : ''}" title="${esc(l)}">${ic(icn)}<span class="lbl">${esc(l)}</span>${badge[id] || ''}</a>`;
  }).join('');
  morph($('#nav'), html);
}

/* ---------- views ---------- */
const QUIET = new Set(['build.step', 'render.progress', 'api.tts', 'api.quota', 'agent.task.progress']);
const V = {};

/* ---------- channel runway ---------- */
const cairo = iso => { const d = toDate(iso); if (!d) return '—'; return d.toLocaleString('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }); };
const cairoD = iso => { const d = toDate(iso); return d ? d.toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', day: '2-digit', month: 'short' }) : '—'; };
const utcTip = iso => { const d = toDate(iso); return d ? `${d.toISOString().replace('T', ' ').slice(0, 16)} UTC` : ''; };
const T = iso => iso ? `<span title="${esc(utcTip(iso))}">${esc(cairo(iso))}</span>` : '—';
const rwDays = () => Number(S.rw?.days) || 14;
async function loadRunway() { return api('/api/runway?days=' + rwDays()); }
function runwayHtml(rw) {
  const d = rw.target_days;
  const stCls = { active: 't-ok', paused: '', retired: 't-bad', 'publishing-only': 't-warn' };
  const rows = rw.channels.map(c => {
    const p = c.pipeline, grey = c.colour === 'grey';
    const ageTone = p.oldest_days == null ? '' : p.oldest_days > 7 ? 'tone-bad' : p.oldest_days > 3 ? 'tone-warn' : '';
    const job = c.auto_upload.job ? (c.auto_upload.exists ? `<span class="pill t-ok" title="${esc(c.auto_upload.job)} (${esc(c.auto_upload.state)})">auto-upload</span> <span class="small muted">next ${T(c.auto_upload.next_run)}</span>` : `<span class="pill t-bad" title="${esc(c.auto_upload.job)} not found">job missing</span>`) : '<span class="pill">no auto-upload</span>';
    const pipe = `<span class="${p.qa ? 'tone-warn' : 'dim'}" title="in QA">QA <b>${p.qa}</b></span> · <span title="editing">ed <b>${p.editing}</b></span> · <span title="script">scr <b>${p.script}</b></span> · <span title="idea / research / rights / analysis">res <b>${p.research}</b></span>${p.shelved ? ` · <span class="dim" title="shelved / parked">shelved ${p.shelved}</span>` : ''}`;
    return `<tr class="rw ${c.colour}" data-k="rw-${esc(c.brand_id)}" data-go="#channel/${esc(c.brand_id)}">
      <td class="rw-name"><span class="bdot" style="${bc(c.brand_id)}"></span><b dir="auto">${esc(c.name)}</b><div><span class="pill ${stCls[c.status] || ''}">${esc(c.status)}</span>${c.subscribers != null ? ` <span class="small muted">${num(c.subscribers)} subs</span>` : ''}</div></td>
      <td><b>${c.cadence_per_day}</b>/day<div class="small muted">${esc(c.times.join(' '))}${c.audience_tz ? ' ' + esc(c.audience_tz.split('/')[1] || c.audience_tz) : ''}</div><div>${job}</div></td>
      <td><b>${num(c.live_videos)}</b> live · <b>${c.total_views == null ? '—' : num(c.total_views)}</b> views<div class="small muted">last ${T(c.last_published)}</div></td>
      <td class="rw-run"><span class="rw-n ${c.colour}">${c.runway_days}<small>d</small></span></td>
      <td><b>${c.scheduled}</b> scheduled${c.scheduled_overdue ? ` <span class="pill t-bad" title="scheduled in the past, not published">${c.scheduled_overdue} overdue</span>` : ''}<div class="small muted">last ${T(c.last_scheduled)}</div></td>
      <td><b class="${c.approved_unscheduled ? 'tone-ok' : ''}">${c.approved_unscheduled}</b> approved<div class="small muted">incl. approved: <b>${c.runway_incl_approved_days == null ? '—' : c.runway_incl_approved_days + 'd'}</b></div></td>
      <td>${grey ? '<span class="muted">' + esc(c.status) + '</span>' : `runs out <b>${esc(cairoD(c.runs_out))}</b>`}<div class="small ${c.need_for_target ? 'tone-warn' : 'muted'}">${c.need_for_target == null ? '' : c.need_for_target ? `need <b>${c.need_for_target}</b> more for ${d}d` : `covered for ${d}d`}</div></td>
      <td class="small">${pipe}<div class="${ageTone || 'muted'}">${p.oldest_days == null ? 'nothing in pipeline' : `oldest stuck ${p.oldest_days}d <span class="mono dim">${esc(p.oldest_id)}</span>`}</div></td></tr>`;
  }).join('');
  const tgt = [7, 14, 21, 30].map(v => `<span class="chip ${v === d ? 'on' : ''}" data-set="rw.days" data-v="${v}" data-num data-reload>${v}d</span>`).join('');
  return `<div class="card" style="padding:0;margin-bottom:12px"><div class="h" style="padding:8px 12px 0">Channel runway <span class="small muted">times Africa/Cairo (hover = UTC) · colour = scheduled runway: red &lt;3d, amber &lt;7d, green ≥7d</span><span class="r"><span class="small muted">target</span> <span class="chips" style="display:inline-flex">${tgt}</span> <a href="/api/runway" target="_blank" rel="noopener" class="small">JSON</a></span></div>
    <div style="overflow-x:auto"><table class="rwt"><tr><th>Channel</th><th>Cadence · auto-upload</th><th>Live · views</th><th>Runway</th><th>On YouTube</th><th>Approved</th><th>Runs out</th><th>Pipeline</th></tr>${rows}</table></div></div>`;
}

V.runway = {
  title: 'Channel runway',
  load: async () => { const rw = await loadRunway(); await loadShared(); return { rw }; },
  live: e => !QUIET.has(e.kind),
  html: ({ rw }) => runwayHtml(rw),
};

V.dashboard = {
  title: 'Overview',
  load: async () => { const [ag, sc, rw] = await Promise.all([api('/api/agents'), api('/api/schedule'), loadRunway()]); await loadShared(); return { ag, sc, rw }; },
  live: e => !QUIET.has(e.kind),
  html: ({ ag, sc, rw }) => {
    const o = G.overview, P = G.prods, by = s => P.filter(p => p.current_state === s);
    const r = Object.fromEntries(o.rights.map(s => [s.s, s.n])), jb = Object.fromEntries(o.jobs.map(s => [s.status, s.n]));
    const inProd = P.filter(p => ['idea', 'research', 'rights', 'analysis', 'script', 'editing', 'qa'].includes(p.current_state)).length;
    const now = Date.now(), next = sc.filter(x => toDate(x.slot_at) >= now).slice(0, 8);
    const today = sc.filter(x => dayKey(toDate(x.slot_at)) === dayKey(new Date()));
    const qa = by('qa'), ed = by('editing'), working = ag.filter(a => a.status === 'working');
    const needs = [
      qa.length && `<div class="row"><span class="pill t-warn">${qa.length} in QA</span><span class="muted">waiting for independent review or your decision</span><a class="right" href="#review">Open review →</a></div>`,
      ed.length && `<div class="row"><span class="pill t-warn">${ed.length} in editing</span><span class="muted">revisions being rebuilt</span><a class="right" href="#board">Board →</a></div>`,
      jb.failed && `<div class="row"><span class="pill t-bad">${jb.failed} failed jobs</span><a class="right" href="#jobs">Retry →</a></div>`,
      r.pending && `<div class="row"><span class="pill t-warn">${r.pending} sources</span><span class="muted">awaiting a rights decision</span><a class="right" href="#assets?status=pending">Review →</a></div>`,
      by('approved').length && `<div class="row"><span class="pill t-ok">${by('approved').length} approved</span><span class="muted">ready, not yet scheduled</span><a class="right" href="#board">Board →</a></div>`,
    ].filter(Boolean);
    const brandCard = b => {
      const mine = P.filter(p => p.brand_id === b.id), cnt = s => mine.filter(p => p.current_state === s).length, tot = mine.length || 1;
      const segs = STAGES.filter(s => cnt(s)).map(s => `<i style="width:${cnt(s) / tot * 100}%;background:${STAGE_C[s]}" title="${s}: ${cnt(s)}"></i>`).join('');
      return `<div class="card" data-k="b-${esc(b.id)}" style="border-top:3px solid var(--b-${esc(b.id)},var(--acc))">
        <div class="row" style="flex-wrap:nowrap"><a href="#channel/${esc(b.id)}" class="trunc">${brandTag(b.id)}</a>${pill(b.format)}<span class="right small muted" style="white-space:nowrap">${b.connected}/5 acc.</span></div>
        <div class="mstats"><div><b>${mine.length}</b>total</div><div class="tone-warn"><b>${cnt('qa') + cnt('editing')}</b>in work</div><div class="tone-acc"><b>${cnt('scheduled')}</b>scheduled</div><div class="tone-ok"><b>${cnt('published')}</b>published</div></div>
        <div class="stack">${segs}</div>${tgtRow(b.id)}</div>`;
    };
    // owner 2026-11-08: output target 2 approved per channel per day (/api/overview throughput, config/gates.json daily_target_approved)
    const tp = o.throughput, tgtRow = id => { const x = tp?.brands?.find(y => y.brand === id); if (!x) return '';
      const tone = x.met_today ? 't-ok' : x.today ? 't-warn' : 't-bad';
      return `<div class="row tgt small" style="margin-top:6px;gap:6px;flex-wrap:nowrap" title="approved today ${x.today} / target ${x.target} per day; 7-day ${x.last7} (avg ${x.avg7}/day)"><span class="muted">target ${x.target}/day</span><span class="pill ${tone}">${x.today}/${x.target} today</span><span class="right muted mono">7d avg ${x.avg7}</span></div>`; };
    return `${runwayHtml(rw)}<div class="kpis">${kpi(inProd, 'In production', 'warn', '#board')}${kpi(qa.length, 'In QA', qa.length ? 'warn' : '', '#review')}${kpi(by('approved').length, 'Approved, ready', 'ok', '#board')}
      ${kpi(o.scheduled, 'Scheduled posts', 'acc', '#calendar')}${kpi(o.published, 'Published', 'ok', '#calendar')}${kpi(today.length, 'Posts today', '', '#calendar')}
      ${kpi(working.length, 'Agents working', working.length ? 'ok' : '', '#agents')}${kpi((r.approved || 0) + (r.approved_with_conditions || 0), 'Rights-cleared sources', '', '#assets?status=approved')}
      ${kpi(r.pending || 0, 'Sources awaiting rights', r.pending ? 'warn' : '', '#assets?status=pending')}${kpi(jb.failed || 0, 'Failed jobs', jb.failed ? 'bad' : '', '#jobs')}
      ${kpi(o.disk ? o.disk.freeGB + ' GB' : '—', 'Free disk', o.disk && o.disk.freeGB < 20 ? 'bad' : '')}${kpi(o.views == null ? '—' : num(o.views), 'Views (real analytics)')}</div>
    <div class="grid g2" style="margin-top:12px">
      <div class="card"><div class="h">Needs attention</div><div class="list-tight">${needs.join('') || '<div class="muted">Nothing waiting on you. 🎉</div>'}</div></div>
      <div class="card"><div class="h">Next posts <a class="r" href="#calendar">Calendar →</a></div><div class="list-tight">${next.map(x => { const d = toDate(x.slot_at);
        return `<div class="row" data-k="n${x.id}"${x.production_id ? ` data-open="${esc(x.production_id)}" style="cursor:pointer"` : ''}><span class="mono muted" style="width:92px">${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))} ${esc(hm(d))}</span><span class="bdot" style="${bc(x.brand_id)}"></span><span class="trunc" style="flex:1;min-width:0" dir="auto">${esc(x.title || x.note || 'open slot')}</span>${pill(x.status)}</div>`; }).join('') || '<div class="muted">No upcoming slots</div>'}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(270px,1fr));margin-top:12px">${G.brandList.map(brandCard).join('')}</div>
    <div class="legend" style="margin-top:8px">${STAGES.map(s => `<span><i style="background:${STAGE_C[s]}"></i>${s}</span>`).join('')}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr));margin-top:12px">
      <div class="card"><div class="h">Agents working now <a class="r" href="#agents">All agents →</a></div><div class="list-tight">${working.map(a => `<div data-k="a-${esc(a.id)}"><div class="row"><span class="livedot on"></span><b>${esc(a.name)}</b><span class="right small muted">${esc(a.model)}</span></div>${a.current_task ? `<div class="small muted clamp2">${esc(a.current_task)}</div>` : ''}</div>`).join('') || '<div class="muted">No agent is running</div>'}</div></div>
      <div class="card"><div class="h">API usage today</div>${o.usageToday.length ? `<table><tr><th>Provider</th><th class="num">Calls</th><th class="num">OK</th><th class="num">Shadow $</th></tr>${o.usageToday.map(u => `<tr><td>${esc(u.provider)}</td><td class="num">${num(u.calls)}</td><td class="num">${num(u.ok)}</td><td class="num">${u.shadow_cost_usd ?? 0}</td></tr>`).join('')}</table>` : '<div class="muted">No calls yet today</div>'}<div class="small dim" style="margin-top:6px">Free tiers only. Shadow cost = what a paid tier would have charged.</div></div>
      <div class="card"><div class="h">Credentials</div><div class="list-tight">${Object.entries(o.credentials).map(([k, v]) => `<div class="row"><span class="mono">${esc(k)}</span><span class="right">${typeof v === 'number' ? `<b>${v}</b>` : v ? pill('connected') : pill('not_created', 'missing')}</span></div>`).join('')}</div></div>
    </div>`;
  },
};

V.board = {
  title: 'Production board',
  load: async () => { const [, wfp] = await Promise.all([loadShared(), api('/api/progress').catch(() => ({}))]); G.wfp = wfp; return {}; },
  live: e => /^production\.|^review\.|^publish/.test(e.kind),
  tools: () => { const s = st('board', { brand: '', q: '', empty: false }); return `${searchBox('board.q', s.q, 'Filter titles…')}<label class="row small muted"><input type="checkbox" data-model="board.empty"${s.empty ? ' checked' : ''}> empty stages</label>`; },
  html: () => {
    const s = st('board', { brand: '', q: '', empty: false, more: {} }); s.more ??= {};
    const P = G.prods.filter(p => (!s.brand || p.brand_id === s.brand) && has(s.q, p.title, p.production_id));
    const brandOpts = [['', 'All brands', G.prods.length], ...G.brandList.map(b => [b.id, esc(b.name), G.prods.filter(p => p.brand_id === b.id).length, bc(b.id)])];
    const cols = STAGES.map(stg => [stg, P.filter(p => p.current_state === stg)]).filter(([stg, l]) => l.length || s.empty || ['qa', 'editing', 'approved'].includes(stg));
    const tile = p => { const pr = G.progress[p.production_id]; return `<div class="tile" data-k="${esc(p.production_id)}" data-open="${esc(p.production_id)}" style="${bc(p.brand_id)}">
      <div class="t clamp2" dir="auto">${esc(p.title)}</div>
      <div class="m"><span class="trunc" dir="auto" style="max-width:110px">${esc(brandName(p.brand_id))}</span>· v${esc(p.version)}<span class="right">${score(p.qa_score)}</span></div>
      ${pr && pr.pct < 100 && Date.now() - pr.at < 120000 ? `<div class="bar" style="margin-top:6px"><i style="width:${pr.pct}%"></i></div>` : ''}${tileProgress(G.wfp?.[p.production_id])}</div>`; };
    return `<div class="row" style="margin-bottom:10px">${chips('board.brand', s.brand, brandOpts)}</div>
    <div class="board">${cols.map(([stg, items]) => { const lim = s.more[stg] ? 1e9 : 40;
      return `<section class="bcol" data-k="col-${stg}"><header><i style="--sc:${STAGE_C[stg]}"></i>${stg}<span class="n">${items.length}</span></header>
      <div class="list">${items.slice(0, lim).map(tile).join('') || '<div class="dim small" style="padding:6px">Empty</div>'}
      ${items.length > lim ? `<button class="ghost sm" data-set="board.more.${stg}" data-v="1">Show all ${items.length}</button>` : ''}</div></section>`; }).join('')}</div>`;
  },
};

V.review = {
  title: 'Review studio',
  load: async id => { if (!id) return (await loadShared(), {}); const e = encodeURIComponent(id);
    const [p, sc, prog] = await Promise.all([api('/api/productions/' + e), api('/api/productions/' + e + '/script').catch(() => null), api('/api/productions/' + e + '/progress').catch(() => null), wfData().catch(() => null)]);
    return { p, sc, prog }; },
  live: (e, id) => id ? e.production_id === id && e.kind !== 'render.progress' && e.kind !== 'build.step' : /^production\.|^review\./.test(e.kind),
  tools: (d, id) => { if (id) return reviewTools(id); const s = st('rl', { brand: '', stage: 'qa', q: '' }); return searchBox('rl.q', s.q, 'Search productions…'); },
  html: (d, id) => id ? reviewDetail(d.p, d.sc, d.prog) : reviewList(),
};
function reviewList() {
  const s = st('rl', { brand: '', stage: 'qa', q: '' });
  const base = G.prods.filter(p => (!s.brand || p.brand_id === s.brand) && has(s.q, p.title, p.production_id));
  const rows = base.filter(p => !s.stage || p.current_state === s.stage);
  const stOpts = [['', 'All', base.length], ...['qa', 'editing', 'approved', 'scheduled', 'published', 'rejected'].map(x => [x, x, base.filter(p => p.current_state === x).length])];
  return `<div class="row" style="margin-bottom:10px">${chips('rl.stage', s.stage, stOpts)}<span class="right">${chips('rl.brand', s.brand, [['', 'All brands'], ...G.brandList.map(b => [b.id, esc(b.name), null, bc(b.id)])])}</span></div>
  ${rows.length ? `<div class="card" style="padding:0"><div class="tablewrap"><table><tr><th>Production</th><th>Brand</th><th>Stage</th><th class="num">QA</th><th class="num">Ver.</th><th>Updated</th></tr>
  ${rows.map(p => `<tr data-k="${esc(p.production_id)}" data-go="#review/${esc(p.production_id)}"><td><div class="trunc" style="max-width:520px;font-weight:600" dir="auto">${esc(p.title)}</div><div class="mono dim">${esc(p.production_id)}</div></td>
  <td>${brandTag(p.brand_id)}</td><td>${pill(p.current_state)}</td><td class="num">${score(p.qa_score)}</td><td class="num">v${esc(p.version)}</td><td class="muted small">${ago(p.updated_at)}</td></tr>`).join('')}</table></div></div>` : '<div class="empty">No productions match these filters.</div>'}`;
}
let SG = 85;   // script gate (script-doctor forecast must reach this); replaced by config/gates.json script_forecast once /api/workflow is loaded
const scCls = (v, g = SG) => v == null ? '' : v >= g ? 'hi' : v >= 75 ? 'mid' : 'lo';
function scriptPanel(sc) {
  if (!sc || sc.error) return '';
  const { hook, story, lines = [], rounds = [], title, description } = sc;
  const G = sc.gate ?? SG;   // per-brand script gate from the API (config/gates.json brand_overrides: kids 90)
  if (!hook && !story && !lines.length && !rounds.length) return '';
  const last = rounds[rounds.length - 1], tm = t => t == null ? '' : `${Math.round(t * 10) / 10}s`;
  const chips = rounds.length ? rounds.map(r => `<span class="sgchip ${scCls(r.score, G)}" title="${esc(r.file)}">R${esc(r.round)} <b>${r.score ?? '—'}</b> ${esc(r.verdict || '')}</span>`).join('')
    : '<span class="sgchip">not scored yet</span>';
  const notes = last?.notes || [];
  const bm = new Map((story?.beats || []).map(b => [b.id, b])), groups = [], seen = new Map();
  for (const l of lines) { const k = l.beat || ''; if (!seen.has(k)) { const g = { k, ls: [] }; seen.set(k, g); groups.push(g); } seen.get(k).ls.push(l); }
  const noteIds = new Set(notes.flatMap(n => String(n.line_id || '').split('/')));
  return `<div class="card" data-k="script-panel"><div class="h">Script <span class="sgchip gate">Script gate ${G}${sc.brand && G !== SG ? ` (${esc(sc.brand)})` : ''}</span>${chips}</div>
    ${last ? `<div class="row small" style="margin-bottom:6px">${pill(last.verdict)}<span class="muted">latest round ${esc(last.round)}${last.forecast_verdict ? ' · ' + esc(last.forecast_verdict) : ''}</span></div>` : ''}
    ${hook ? `<div class="sgrow"><b>Hook</b> <span dir="auto">${esc(hook.premise)}</span>${hook.payoff_ts != null ? ` <span class="sgchip">payoff ${esc(tm(hook.payoff_ts))}</span>` : ''}${hook.chosen ? `<div class="small muted" dir="auto">${esc(hook.chosen)}</div>` : ''}</div>` : ''}
    ${story?.spine ? `<div class="sgrow"><b>Spine</b> <span dir="auto">${esc(story.spine)}</span><div class="small muted">${esc(story.structure || '')}${story.peak_t != null ? ' · peak ' + tm(story.peak_t) : ''}${story.ending ? ' · ending: ' + esc(story.ending) : ''}</div>${story.send_reason ? `<div class="small muted">Send reason: ${esc(story.send_reason)}</div>` : ''}</div>` : ''}
    ${notes.length ? `<div class="tablewrap"><table class="sgtab"><tr><th>Line</th><th>Issue</th><th>Rewrite</th></tr>${notes.map(n => `<tr><td class="mono">${esc(n.line_id)}</td><td dir="auto">${esc(n.issue)}</td><td dir="auto">${esc(n.rewrite)}</td></tr>`).join('')}</table></div>` : ''}
    ${last?.improvements ? `<div class="small" style="margin:6px 0"><b>Biggest lift:</b> ${esc(last.improvements)}</div>` : ''}
    ${groups.length ? `<details open><summary>Script lines (${lines.length})</summary><div class="sglines">${groups.map(g => { const b = bm.get(g.k);
      return `<div class="sgbeat"><div class="sgbh"><span class="mono">${esc(g.k || '—')}</span>${b ? `${pill(b.job)}<span class="dim small">${esc(tm(b.t))}${b.t_end != null ? '–' + esc(tm(b.t_end)) : ''}</span>` : ''}</div>
      ${g.ls.map(l => `<div class="sgl${[...noteIds].some(i => i && l.id && i === l.id) ? ' flag' : ''}"><span class="mono dim">${esc(l.id || '')}</span><span class="sgw">${esc(l.speaker || '')}${l.t != null ? ' ' + esc(tm(l.t)) : ''}</span><span dir="auto">${esc(l.text)}</span></div>`).join('')}</div>`; }).join('')}</div></details>` : ''}
    ${title || description ? `<details style="margin-top:6px"><summary>Title &amp; description</summary><div class="small" dir="auto"><b>${esc(title)}</b></div><div class="small muted" dir="auto" style="white-space:pre-wrap">${esc(description)}</div></details>` : ''}
  </div>`;
}
function reviewNav() {
  const s = st('rl', { brand: '', stage: 'qa', q: '' });
  return G.prods.filter(p => (!s.brand || p.brand_id === s.brand) && (!s.stage || p.current_state === s.stage) && has(s.q, p.title, p.production_id));
}
function reviewTools(id) {
  let list = reviewNav(); if (!list.some(p => p.production_id === id)) list = G.prods;
  const i = list.findIndex(p => p.production_id === id);
  const prev = list[i - 1], next = list[i + 1];
  const d = (k, l, c = '') => `<button class="sm ${c}" data-act="decide" data-id="${esc(id)}" data-d="${k}">${l}</button>`;
  return `${d('approve', 'Approve', 'ok')}${d('revise', 'Request revision')}${d('reject', 'Reject', 'bad')}<span style="width:10px"></span><a class="btn" href="#review">${ic('left')} All</a><button class="sm" ${prev ? `data-go="#review/${esc(prev.production_id)}"` : 'disabled'} title="Previous (k)">${ic('left')}</button><button class="sm" ${next ? `data-go="#review/${esc(next.production_id)}"` : 'disabled'} title="Next (j)">${ic('right')}</button>`;
}
const playable = p => p.versions.filter(v => v.exists !== false && mediaUrl(v.render_path));
function playerHtml(p, sel, keyPrefix = 'v') {
  const vs = playable(p), v = vs.find(x => x.n === sel) || vs[0];
  if (!v) return p.versions.some(x => x.render_path) ? '<div class="empty">Render file is missing on disk (old version folders were removed). Rebuild to watch it here.</div>' : '<div class="empty">No render yet</div>';
  return `<video data-keep data-k="${keyPrefix}-${esc(p.production_id)}-${v.n}" controls preload="metadata" playsinline src="${esc(mediaUrl(v.render_path))}"></video>`;
}
function watchBar(p, W, v0, sel) {
  const id = esc(p.production_id), shown = sel === 'preview' ? `Quick preview of v${W.latest}` : v0 ? `Previous version v${v0.n}` : W.fallback ? (W.fallback.n != null ? `Previous version v${W.fallback.n}` : `Earlier file ${esc(W.fallback.file)}`) : null;
  const msg = shown ? `<b>${shown}</b> — current v${W.latest} not rendered yet.` : `<b>v${W.latest} is not rendered yet</b> and no earlier render exists.`;
  const pct = G.progress[p.production_id]?.pct ?? W.previewing?.pct ?? 0, btn = W.previewing ? `<span class="small">Quick preview ${pct}%</span><div class="bar" style="width:220px"><i style="width:${pct}%"></i></div>`
    : W.hasTimeline ? `<button class="primary sm" data-act="post" data-p="/api/productions/${id}/preview" data-b="{}">${ic('play')} Quick preview v${W.latest}</button>` : '';
  const plan = !W.hasTimeline ? `<span class="small muted">No timeline.json yet (build has not reached that step)${W.plan ? ` · plan: ${W.plan.segments} segments, ${W.plan.texts} texts${W.plan.captions != null ? `, ${W.plan.captions} captions` : ''}${W.plan.size ? ` · ${esc(W.plan.size)}` : ''}${W.plan.entries ? ` · ${W.plan.entries} entries` : ''}` : ''}</span>` : '';
  return `<div class="banner" data-k="b-prev" style="flex-wrap:wrap"><span>${msg}</span>${plan}<span class="right row" style="gap:8px">${btn}</span></div>`;
}
function reviewDetail(p, sc, prog) {
  if (prog && !prog.error) WFC = { ver: prog.workflow, prog, sel: WFC?.prog?.id === prog.id ? WFC.sel : null };
  if (!p || p.error) return `<div class="empty">${esc(p?.error || 'Not found')}</div>`;
  const rs = st('rvSel', {}), vs = playable(p), latest = vs[0]?.n;
  const W = p.watch || {}, noNew = W.latest != null && !W.latestRendered && W.latest > (latest ?? 0);   // newest version has no render yet
  if (rs[p.production_id] == null || (rs[p.production_id] !== 'preview' && !vs.some(v => v.n === rs[p.production_id])) || (rs[p.production_id] === 'preview' && !W.preview)) rs[p.production_id] = latest;
  const sel = rs[p.production_id], v = vs.find(x => x.n === sel), prev = sel === 'preview' ? W.preview : null, fb = !vs.length && !prev ? W.fallback : null, r = p.reviews[0], pr = G.progress[p.production_id];
  const pub = p.publishing.find(x => x.platform === 'youtube'), slot = p.slots?.[0], url = pub?.metadata?.url || (slot?.note?.startsWith('http') ? slot.note : null);
  const ring = r ? `<div class="ring" style="--p:${r.score};--c:${r.score >= 85 ? 'var(--ok)' : r.score >= 75 ? 'var(--warn)' : 'var(--bad)'}"><b>${esc(r.score)}</b></div>` : '';
  return `<div class="row" style="margin-bottom:10px;gap:10px"><h2 style="margin:0;font-size:19px;flex:1;min-width:260px" dir="auto">${esc(p.title)}</h2></div>
  <div class="row" style="margin:-4px 0 12px">${brandTag(p.brand_id)}${pill(p.format)}${pill(p.current_state)}<span class="muted small">approval</span>${pill(p.approval_status)}<span class="mono dim">${esc(p.production_id)}</span>
    </div>
  ${prog && !prog.error ? pipeStrip(prog) : ''}
  ${noNew ? watchBar(p, W, vs[0], sel) : ''}
  ${latest != null && sel !== latest && sel !== 'preview' ? `<div class="banner" data-k="b-new">New render <b>v${latest}</b> is ready (you are watching v${sel}).<button class="primary sm" data-set="rvSel.${esc(p.production_id)}" data-v="${latest}" data-num>Watch v${latest}</button></div>` : ''}
  ${pr && pr.pct < 100 && Date.now() - pr.at < 120000 ? `<div class="banner" data-k="b-render">Rendering… ${pr.pct}%<div class="bar" style="flex:1"><i style="width:${pr.pct}%"></i></div></div>` : ''}
  <div class="rv" data-k="rv-${esc(p.production_id)}">
    <div class="player">
      <div class="card">${prev ? `<video data-keep data-k="pv-${esc(p.production_id)}-${Math.round(prev.mtime)}" controls autoplay preload="metadata" playsinline src="${esc(prev.url)}"></video>`
          : fb ? `<video data-keep data-k="fb-${esc(p.production_id)}-${esc(fb.n)}" controls preload="metadata" playsinline src="${esc(fb.url)}"></video>` : playerHtml(p, sel)}
        ${vs.length > 1 || W.preview ? `<div class="vtabs">${vs.map(x => `<button class="sm ${x.n === sel ? 'primary' : ''}" data-set="rvSel.${esc(p.production_id)}" data-v="${x.n}" data-num>v${x.n}</button>`).join('')}${W.preview ? `<button class="sm ${sel === 'preview' ? 'primary' : ''}" data-set="rvSel.${esc(p.production_id)}" data-v="preview" title="Half-res quick preview of v${W.latest}">Preview v${W.latest}</button>` : ''}</div>` : ''}
        ${prev ? `<div class="small muted" style="margin-top:6px">Quick preview of v${W.latest} · half-res, unmastered audio · ${ago(new Date(prev.mtime).toISOString())}${prev.stale ? ' · <b>timeline changed since</b>' : ''}<a class="right" href="${esc(prev.url)}" download>Download MP4</a></div>` : ''}
        ${fb ? `<div class="small muted" style="margin-top:6px">${fb.n != null ? `Version ${fb.n}` : esc(fb.file)} · ${ago(new Date(fb.mtime).toISOString())}</div>` : ''}
        ${v && !prev ? `<div class="row small muted" style="margin-top:6px">Version ${v.n} · ${ago(v.created_at)}${v.tech_qa?.duration ? ' · ' + dur(v.tech_qa.duration) : ''}<a class="right" href="${esc(mediaUrl(v.render_path))}" download>Download MP4</a></div>` : ''}
        ${p.data?.decision ? `<div class="small muted" style="margin-top:8px">Last decision: <b>${esc(p.data.decision.decision)}</b> by ${esc(p.data.decision.by)} · ${ago(p.data.decision.at)}${p.data.decision.note ? `<div class="clamp2">${esc(p.data.decision.note)}</div>` : ''}</div>` : ''}
      </div>
      <div class="card" style="margin-top:10px"><div class="h">Publishing</div>
        ${slot || pub ? `<div class="list-tight">${(p.slots || []).map(sl => `<div class="row">${ic('cal')}<b>${esc(toDate(sl.slot_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</b>${pill(sl.status)}</div>`).join('')}
        ${p.publishing.map(x => `<div class="row">${ic('yt')}${esc(x.platform)} ${pill(x.publication_status)}${x.metadata?.url ? `<a class="right" href="${safeUrl(x.metadata.url)}" target="_blank" rel="noopener">Open ${ic('ext')}</a>` : ''}</div>`).join('')}</div>` : '<div class="muted">Not scheduled yet</div>'}
        ${url && !p.publishing.length ? `<a href="${safeUrl(url)}" target="_blank" rel="noopener">YouTube ${ic('ext')}</a>` : ''}</div>
    </div>
    <div class="col" style="gap:12px">
      <div class="card"><div class="h">Independent QA ${r ? `${pill(r.verdict)}<span class="r small muted">${esc(r.reviewer)} · v${esc(r.version)} · ${ago(r.created_at)}</span>` : ''}</div>
        ${r ? `<div class="row" style="align-items:flex-start;gap:14px;flex-wrap:nowrap">${ring}<div style="flex:1;min-width:0"><div style="margin-bottom:8px">${esc(r.summary)}</div><div class="bd">${Object.entries(r.breakdown || {}).map(([k, val]) => `<div><span class="muted">${esc(k)}</span><b>${esc(val)}</b></div>`).join('')}</div></div></div>
          ${(r.blockers || []).map(b => `<div class="blocker">⛔ ${esc(b)}</div>`).join('')}
          ${(r.issues || []).length ? `<div style="margin-top:8px">${r.issues.map(i => `<div class="issue"><span class="ts">${esc(i.t)}</span><div><div class="row">${pill(i.severity)}<span>${esc(i.issue)}</span></div>${i.fix ? `<div class="small muted" style="margin-top:3px">Fix: ${esc(i.fix)}${i.owner ? ` → ${esc(i.owner)}` : ''}</div>` : ''}</div></div>`).join('')}</div>` : ''}`
        : '<div class="muted">Not reviewed yet</div>'}</div>
      ${scriptPanel(sc)}
      ${W.pack ? `<div class="card"><details open><summary>QA pack</summary><img class="sheet" loading="lazy" src="${esc(W.pack)}" alt="QA pack"></details></div>` : ''}
      ${noNew && !v?.contact_sheet && W.contact ? `<div class="card"><details open><summary>Latest contact sheet</summary><img class="sheet" loading="lazy" src="${esc(W.contact)}" alt="Contact sheet"></details></div>` : ''}
      ${v?.contact_sheet && mediaUrl(v.contact_sheet) ? `<div class="card"><details><summary>Contact sheet (v${v.n})</summary><img class="sheet" loading="lazy" src="${esc(mediaUrl(v.contact_sheet))}" alt="Contact sheet"></details></div>` : ''}
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <div class="card"><div class="h">Sources & rights</div><div class="list-tight">${p.sources.map(s => `<div class="row" data-k="s-${esc(s.asset_id)}"><span class="trunc" style="flex:1;min-width:0">${esc(s.title)}</span>${pill(s.permission_status)}</div>`).join('') || '<div class="muted">None attached</div>'}</div></div>
        <div class="card"><div class="h">Review history</div><div class="list-tight">${p.reviews.map(x => `<div class="row" data-k="r-${x.id}"><b>v${esc(x.version)}</b>${score(x.score)}${pill(x.verdict)}<span class="small muted">${esc(x.reviewer)}</span><span class="right small dim">${ago(x.created_at)}</span></div>`).join('') || '<div class="muted">No reviews</div>'}</div></div>
      </div>
      <div class="card"><div class="h">Activity <span class="r small dim">last ${p.events.length}</span></div><div class="timeline" style="max-height:340px;overflow:auto">${p.events.map(e => `<div class="ev ${esc(e.level)}" data-k="e${e.id}"><i></i><span class="mono dim">${esc(toDate(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span><div><div class="meta"><b>${esc(e.agent || e.kind)}</b>${ago(e.ts)}</div><div class="msg">${esc(e.message)}</div></div></div>`).join('') || '<div class="muted">No events</div>'}</div></div>
    </div>
  </div>`;
}

/* Calendar: week (Mon–Sun), month, or agenda list. Slots are stored in UTC and shown in local time. */
const startOfWeek = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
function calRange(s) {
  if (!['week', 'month', 'list'].includes(s.mode)) s.mode = 'week';
  if (!Number.isInteger(s.off) || Math.abs(s.off) > 520) s.off = 0;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  if (s.mode === 'month') { const a = new Date(t.getFullYear(), t.getMonth() + s.off, 1); const g = startOfWeek(a); const e = new Date(g); e.setDate(e.getDate() + 42); return { a, g, e }; }
  const g = startOfWeek(t); g.setDate(g.getDate() + 7 * s.off); const e = new Date(g); e.setDate(e.getDate() + (s.mode === 'list' ? 28 : 7)); return { a: g, g, e };
}
V.calendar = {
  title: 'Publishing calendar',
  load: async () => {
    const s = st('cal', { mode: 'week', off: 0, brand: '' }), { g, e } = calRange(s);
    const iso = d => new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
    const [sc] = await Promise.all([api(`/api/schedule?from=${iso(g)}&to=${new Date(e.getTime() + 86400000).toISOString().slice(0, 10)}`), G.brandList.length ? null : loadShared()]);
    return { sc };
  },
  live: e => e.kind === 'publish' || e.kind === 'production.decision',
  tools: () => { const s = st('cal', { mode: 'week', off: 0, brand: '' });
    return `<div class="seg">${['week', 'month', 'list'].map(m => `<button class="${s.mode === m ? 'on' : ''}" data-set="cal.mode" data-v="${m}" data-reload>${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
    <button class="sm" data-act="cal" data-v="-1" title="Previous">${ic('left')}</button><button class="sm" data-act="cal" data-v="0">Today</button><button class="sm" data-act="cal" data-v="1" title="Next">${ic('right')}</button>`; },
  html: ({ sc }) => {
    const s = st('cal', { mode: 'week', off: 0, brand: '' }), { a, g, e } = calRange(s), todayK = dayKey(new Date()), now = Date.now();
    const items = sc.map(x => ({ ...x, d: toDate(x.slot_at) })).filter(x => x.d >= g && x.d < e && x.status !== 'moved');  // a rescheduled video keeps its old slot row as 'moved'
    const shown = items.filter(x => !s.brand || x.brand_id === s.brand);
    const byDay = {}; for (const x of shown) (byDay[dayKey(x.d)] ??= []).push(x);
    const cnt = k => items.filter(x => x.status === k).length;
    const label = s.mode === 'month' ? a.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : `${g.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(e - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const slot = x => `<div class="slot ${esc(x.status)}" data-k="s${x.id}" style="${bc(x.brand_id)}"${x.production_id ? ` data-open="${esc(x.production_id)}"` : ''} title="${esc(brandName(x.brand_id))} · ${esc(x.status)}">
      <div class="hd"><span class="st-ico ${esc(x.status)}"></span><span class="tm">${esc(hm(x.d))}</span>${x.qa_score != null ? `<span class="dim">QA ${esc(x.qa_score)}</span>` : ''}${x.url ? `<a class="right" href="${safeUrl(x.url)}" target="_blank" rel="noopener" data-stop title="Open on YouTube">${ic('yt')}</a>` : ''}</div>
      <div class="tt" dir="auto">${esc(x.title || x.note || 'Open slot')}</div></div>`;
    const days = [...Array(s.mode === 'month' ? 42 : s.mode === 'list' ? 28 : 7)].map((_, i) => { const d = new Date(g); d.setDate(d.getDate() + i); return d; });
    const head = `<div class="row" style="margin-bottom:10px"><b style="font-size:15px">${esc(label)}</b>
      <span class="legend" style="margin-left:8px"><span><span class="st-ico published"></span>published ${cnt('published')}</span><span><span class="st-ico scheduled"></span>scheduled on YouTube ${cnt('scheduled')}</span><span><span class="st-ico planned"></span>planned (not uploaded) ${cnt('planned')}</span></span>
      <span class="right">${chips('cal.brand', s.brand, [['', 'All', items.length], ...G.brandList.map(b => [b.id, esc(b.name), items.filter(x => x.brand_id === b.id).length, bc(b.id)])])}</span></div>
      <div class="small dim" style="margin:-4px 0 10px">Times are your local time (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}). Click a post to preview the video.</div>`;
    if (s.mode === 'week') return head + `<div class="cal-week">${days.map(d => { const k = dayKey(d), l = byDay[k] || [];
      return `<section class="day ${k === todayK ? 'today' : ''} ${d < new Date(new Date().setHours(0, 0, 0, 0)) ? 'past' : ''}" data-k="d${k}"><header><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))}</span><span class="n">${l.length || ''}</span></header>
        <div class="list">${l.map(slot).join('') || '<div class="dim small" style="padding:4px">No posts</div>'}</div></section>`; }).join('')}</div>`;
    if (s.mode === 'month') return head + `<div class="cal-month">${days.slice(0, 7).map(d => `<div class="dow">${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))}</div>`).join('')}
      ${days.map(d => { const k = dayKey(d), l = byDay[k] || [], per = G.brandList.map(b => [b.id, l.filter(x => x.brand_id === b.id).length]).filter(x => x[1]);
        return `<div class="mcell ${d.getMonth() !== a.getMonth() ? 'out' : ''} ${k === todayK ? 'today' : ''}" data-k="m${k}"><div class="d">${d.getDate()}<span class="n">${l.length || ''}</span></div>
        ${l.slice(0, 4).map(x => `<div class="mini" style="${bc(x.brand_id)}" data-open="${esc(x.production_id || '')}" dir="auto">${esc(hm(x.d))} ${esc(x.title || 'slot')}</div>`).join('')}${l.length > 4 ? `<div class="small dim" data-set="cal.mode" data-v="week" data-week="${k}" style="cursor:pointer">+${l.length - 4} more</div>` : ''}
        <div class="mbars">${per.map(([id, n]) => `<i style="flex:${n};${bc(id)}"></i>`).join('')}</div></div>`; }).join('')}</div>`;
    return head + `<div class="agenda">${days.filter(d => byDay[dayKey(d)]).map(d => { const k = dayKey(d), l = byDay[k];
      return `<div data-k="ag${k}"><div class="dayh ${k === todayK ? 'today' : ''}">${esc(d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }))}<span class="small dim">${l.length} posts</span></div>
      <div class="card" style="padding:0"><table>${l.map(x => `<tr data-k="s${x.id}"${x.production_id ? ` data-open="${esc(x.production_id)}"` : ''}><td class="mono" style="width:70px">${esc(hm(x.d))}</td><td style="width:170px">${brandTag(x.brand_id)}</td><td dir="auto">${esc(x.title || x.note || 'Open slot')}</td><td style="width:110px">${pill(x.status)}</td><td style="width:70px">${x.url ? `<a href="${safeUrl(x.url)}" target="_blank" rel="noopener" data-stop>${ic('yt')}</a>` : ''}</td></tr>`).join('')}</table></div></div>`; }).join('') || '<div class="empty">No posts in these four weeks.</div>'}</div>`;
  },
};

let LNL = null;                                                      // /api/learning cached once per page load
const learnList = () => (LNL ??= api('/api/learning').catch(() => ({ brands: [] })));
V.channel = {
  title: 'Channel',
  load: async id => { id ||= G.brandList[0]?.id || 'quiz-ar'; const [c, lib, hk, ln] = await Promise.all([api('/api/channel/' + encodeURIComponent(id)), id === 'quiz-ar' ? api('/api/reflib') : [], id === 'quiz-ar' ? api('/api/hooks/quiz-ar').catch(() => null) : null, learnList()]); return { c, lib, hk, ln }; },
  live: (e, id) => /^production\.|^review\.|^publish/.test(e.kind) && (!e.production_id || G.prods.find(p => p.production_id === e.production_id)?.brand_id === id),
  tools: () => { const s = st('ch', { stage: '', q: '' }); return searchBox('ch.q', s.q, 'Search productions…'); },
  html: ({ c, lib, hk, ln }) => {
    if (c.error) return `<div class="empty">${esc(c.error)}</div>`;
    const s = st('ch', { stage: '', q: '' }), ps = c.productions, refs = c.refs, b = c.brand;
    const pubd = ps.filter(p => p.publishing.some(x => x.publication_status === 'published')).length;
    const cnt = x => ps.filter(p => p.stage === x).length;
    const rows = ps.filter(p => (!s.stage || p.stage === s.stage) && has(s.q, p.title, p.production_id)).slice().reverse();
    const lc = lib.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
    return `<div class="card" style="border-top:3px solid var(--b-${esc(b.id)},var(--acc));margin-bottom:12px"><div class="row">${brandTag(b.id)}${pill(b.format)}${b.id === 'viral-rankings' ? ' <a class="btn sm" href="#vr/overview">Ranking workspace →</a>' : ''}${ln?.brands?.some(x => x.brand === b.id) ? ` <a class="btn sm" href="#learn/${esc(b.id)}">Channel learning →</a>` : ''}<span class="muted" dir="auto">${esc(b.positioning)}</span></div></div>
    <div class="kpis">${kpi(ps.length, 'Productions')}${kpi(cnt('qa') + cnt('editing'), 'In work', 'warn')}${kpi(cnt('approved'), 'Approved', 'ok')}${kpi(cnt('scheduled'), 'Scheduled', 'acc', '#calendar')}${kpi(pubd, 'Published', 'ok')}
      ${kpi(refs.length, 'Sources / references')}${kpi(refs.filter(r => r.local_path).length, 'Footage downloaded')}${kpi(refs.filter(r => r.permission_status === 'research_only').length, 'Research-only')}</div>
    ${lib.length ? `<div class="card" style="margin-top:12px"><div class="h">Reference library <span class="r small muted">${lib.length} reels · done = approved video</span></div>
      <div class="row" style="margin-bottom:8px">${['done', 'claimed', 'available', 'skipped'].map(x => `${pill(x)} <b>${lc[x] || 0}</b>`).join(' &nbsp; ')}</div>
      <div class="bar" style="height:8px"><i style="width:${Math.min(100, (lc.done || 0) / lib.length * 100)}%;background:var(--ok)"></i><i style="width:${(lc.claimed || 0) / lib.length * 100}%;background:var(--warn)"></i></div></div>` : ''}
    ${hk && !hk.error ? hooksPanel(hk) : ''}
    <div class="card" style="margin-top:12px;padding:10px 0 0"><div class="row" style="padding:0 14px 8px"><div class="h" style="margin:0">Productions</div><span class="right">${chips('ch.stage', s.stage, [['', 'All', ps.length], ...STAGES.filter(cnt).map(x => [x, x, cnt(x)])])}</span></div>
    ${rows.length ? `<div class="tablewrap"><table><tr><th>Production</th><th>Stage</th><th>Render</th><th class="num">QA</th><th>Publishing</th><th>Created</th></tr>
    ${rows.map(p => { const r = p.pipeline?.render || {}; return `<tr data-k="${esc(p.production_id)}" data-go="#review/${esc(p.production_id)}"><td><div class="trunc" style="max-width:460px;font-weight:600" dir="auto">${esc(p.title)}</div><div class="mono dim">${esc(p.production_id)}</div></td><td>${pill(p.stage)}</td>
      <td>${p.latest ? `<span class="small">v${p.versions} · ${dur(p.latest.duration)}</span>` : r.status ? pill(r.status) : '<span class="dim">—</span>'}</td><td class="num">${p.review ? score(p.review.score) : score(null)}</td>
      <td>${p.publishing.length ? p.publishing.map(x => { const u = x.metadata?.url || (x.external_post_id && x.platform === 'youtube' ? 'https://youtu.be/' + x.external_post_id : null), t = x.scheduled_time ? toDate(x.scheduled_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return `${pill(x.publication_status, x.platform + ' · ' + x.publication_status)}${t ? ` <span class="small muted">${esc(t)}</span>` : ''}${u ? ` <a href="${safeUrl(u)}" target="_blank" rel="noopener" data-stop class="mono small">${ic('yt')} ${esc(x.external_post_id || 'open')}</a>` : ''}`; }).join('<br>') : '<span class="dim">—</span>'}</td><td class="small muted">${ago(p.created_at)}</td></tr>`; }).join('')}</table></div>` : '<div class="empty" style="margin:0 14px 14px">No productions match.</div>'}</div>
    ${lib.length ? `<div class="card" style="margin-top:12px"><details><summary>Reference reels in use (${lib.filter(r => r.status !== 'available').length})</summary><div class="tablewrap" style="margin-top:8px"><table><tr><th>Status</th><th>Reel</th><th class="num">Views</th><th>Production</th><th>Stage</th><th class="num">QA</th></tr>
      ${lib.filter(r => r.status !== 'available').sort((x, y) => ({ claimed: 0, done: 1, skipped: 2 }[x.status] - { claimed: 0, done: 1, skipped: 2 }[y.status]) || (y.views || 0) - (x.views || 0)).map(r => `<tr data-k="l${esc(r.id)}"><td>${pill(r.status)}</td><td><a href="https://www.facebook.com/reel/${esc(r.id)}/" target="_blank" rel="noopener" dir="auto">${esc(String(r.caption || r.id).slice(0, 70))}</a><div class="small dim">${esc(r.upload_date)}${r.reason ? ' · ' + esc(r.reason) : ''}</div></td>
      <td class="num">${num(r.views)}</td><td>${r.production && !r.production.startsWith('batch-') ? `<a href="#review/${esc(r.production)}" class="mono">${esc(r.production)}</a>` : esc(r.production || '—')}</td><td>${r.stage ? pill(r.stage) : '—'}</td><td class="num">${score(r.qa_score)}</td></tr>`).join('')}</table></div></details></div>` : ''}
    <div class="card" style="margin-top:12px"><details><summary>Sources & reference videos (${refs.length})</summary><div class="tablewrap" style="margin-top:8px"><table><tr><th>Published</th><th>Title</th><th>Creator</th><th>Dur</th><th class="num">Views</th><th>Rights</th><th>Footage</th></tr>
      ${refs.slice(0, 200).map(r => `<tr data-k="r${esc(r.asset_id)}" data-src="${esc(r.asset_id)}"><td class="small">${esc(r.published_at)}</td><td><span class="trunc" style="max-width:380px;display:block" dir="auto">${esc(r.title)}</span></td><td class="small">${esc(r.creator)}</td><td>${dur(r.duration)}</td><td class="num">${num(r.view_count)}</td><td>${pill(r.permission_status)}</td><td>${r.local_path ? pill('downloaded') : '<span class="dim">—</span>'}</td></tr>`).join('')}</table></div></details></div>`;
  },
};

V.agents = {
  title: 'Agents',
  load: async () => ({ a: await api('/api/agents') }),
  live: e => /^agent\./.test(e.kind),
  html: ({ a }) => `<div class="small muted" style="margin-bottom:10px">Real task records and decision summaries logged by each agent.</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${a.map(x => `<div class="card" data-k="${esc(x.id)}"><div class="row"><span class="livedot ${x.status === 'working' ? 'on' : ''}"></span><b>${esc(x.name)}</b><span class="right">${pill(x.status)}</span></div>
   <div class="small muted" style="margin:3px 0 6px">${esc(x.role)}</div><div class="small dim">Model ${esc(x.model)} · ${x.done} tasks done</div>
   ${x.current_task ? `<div class="banner" style="margin:8px 0 0;padding:6px 10px"><span class="small"><b>Now:</b> ${esc(x.current_task)}</span></div>` : ''}
   <div class="list-tight" style="margin-top:6px">${x.tasks.slice(0, 4).map(t => `<div class="small" data-k="t${t.id}"><div class="row">${pill(t.status)}<span class="trunc" style="flex:1;min-width:0">${esc(t.title)}</span><span class="dim">${ago(t.started_at)}</span></div>
     ${t.summary ? `<div class="muted clamp2">${esc(t.summary)}</div>` : ''}${(t.decisions || []).slice(0, 2).map(d => `<div class="clamp2">↳ <b>${esc(d.decision)}</b> <span class="muted">— ${esc(d.why)}</span></div>`).join('')}${t.error ? `<div style="color:var(--bad)">${esc(t.error)}</div>` : ''}</div>`).join('') || '<div class="dim small">No tasks yet</div>'}</div></div>`).join('')}</div>`,
};

/* Hooks panel (quiz-ar): views per hook category (docs/brands/quiz-ar/hooks.md), then every video's hook. */
const pct = v => v == null ? '<span class="dim">—</span>' : `${Number(v).toFixed(1)}%`;
const hkChip = (key, label) => `<span class="hkc hk-${esc(key)}" title="${esc(key)}"><b dir="rtl">${esc(label)}</b><i>${esc(key.replace(/_/g, ' '))}</i></span>`;
function hooksPanel(h) {
  const lab = Object.fromEntries(h.categories.map(c => [c.key, c.label_ar]));
  const best = Math.max(0, ...h.categories.map(c => c.avg_views), h.baseline?.avg_views ?? 0);
  const fmtD = t => { const d = toDate(t); return d ? `${d.toLocaleDateString('en-CA').slice(5)} ${hm(d)}` : '—'; };
  const rows = h.videos.slice().sort((a, b) => String(a.publish_at).localeCompare(String(b.publish_at)));
  return `<div class="card hooks" style="margin-top:12px;padding:10px 0 0"><div class="h" style="padding:0 14px">Hooks <span class="r small muted">${h.videos.length} videos · 8 categories · views ${h.stats_at ? 'updated ' + ago(h.stats_at) : 'not pulled yet'}${h.stats_note ? ' · ' + esc(h.stats_note) : ''} · <span class="mono">npx tsx scripts/youtube.ts stats quiz-ar</span></span></div>
  <div class="tablewrap"><table class="hk-cat"><tr><th>Category</th><th class="num">Videos</th><th class="num">Live</th><th class="num">Total views</th><th class="num">Avg views</th><th class="num">Stayed to watch</th><th class="num">Avg view %</th><th style="width:20%"></th></tr>
  ${[...h.categories, ...(h.baseline?.videos ? [h.baseline] : [])].map(c => `<tr data-k="hc-${esc(c.key)}"${c.key === 'no_hook' ? ' style="border-top:2px solid var(--line,#333)"' : ''}><td>${c.key === 'no_hook' ? `<span class="hkc" title="baseline: published before hooks"><b dir="rtl">${esc(c.label_ar)}</b><i>baseline · no hook</i></span>` : hkChip(c.key, c.label_ar)}</td><td class="num">${c.videos}</td><td class="num">${c.live}/${c.videos}</td><td class="num">${num(c.views)}</td><td class="num">${num(Math.round(c.avg_views))}</td><td class="num">${pct(c.stayed_pct)}</td><td class="num">${pct(c.avg_view_pct)}</td>
    <td><div class="bar" style="height:6px"><i class="hk-bg-${esc(c.key)}" style="width:${best ? (c.avg_views / best * 100).toFixed(1) : 0}%;${c.key === 'no_hook' ? 'background:#888' : ''}"></i></div></td></tr>`).join('')}</table></div>
  <div class="tablewrap" style="max-height:60vh"><table class="hk-vid"><tr><th>Date · slot</th><th>Production</th><th>Category</th><th>Variant</th><th>Hook line</th><th>YouTube</th><th class="num">Views</th><th class="num">Stayed</th><th class="num">View %</th><th>Status</th></tr>
  ${rows.map(v => `<tr data-k="hv-${esc(v.production_id)}" data-open="${esc(v.production_id)}"><td class="mono small" style="white-space:nowrap">${fmtD(v.publish_at)} · <b>S${v.slot ?? '?'}</b></td>
    <td><div class="trunc" style="max-width:240px" dir="auto">${esc(v.title || v.production_id)}</div><div class="mono dim" style="font-size:10.5px">${esc(v.production_id)}</div></td>
    <td>${hkChip(v.category, lab[v.category] || v.category)}${v.planned_category && v.planned_category !== v.category ? `<div class="dim small">plan: ${esc(v.planned_category)}</div>` : ''}</td>
    <td class="small">${v.variant ? esc(v.variant) : '<span class="dim">—</span>'}</td><td dir="rtl" class="hk-line">${esc(v.line_ar || '—')}</td>
    <td>${v.url ? `<a href="${safeUrl(v.url)}" target="_blank" rel="noopener" data-stop class="mono small">${ic('yt')} ${esc(v.youtube_id)}</a>` : '<span class="dim">—</span>'}</td>
    <td class="num">${num(v.views)}</td><td class="num">${pct(v.stayed_pct)}</td><td class="num">${pct(v.avg_view_pct)}</td><td>${pill(v.status === 'live_hook' ? 'approved' : v.status, String(v.status || '—').replace(/_/g, ' '))}${v.stage ? ` <span class="dim small">${esc(v.stage)}</span>` : ''}</td></tr>`).join('')}</table></div></div>`;
}

function sourceTable(src) {
  return `<div class="tablewrap"><table><tr><th>Platform</th><th>Title</th><th>Dur</th><th class="num">Views</th><th>License</th><th>Rights</th><th>Proposal</th></tr>${src.map(s => `<tr data-k="${esc(s.asset_id)}" data-src="${esc(s.asset_id)}" style="cursor:pointer"><td class="small">${esc(s.source_platform)}</td>
   <td><div class="trunc" style="max-width:420px;font-weight:600" dir="auto">${esc(s.title)}</div><div class="small dim">${esc(s.creator)}${s.dup ? ` · possible duplicate of ${esc(s.dup)}` : ''}</div></td><td>${dur(s.duration)}</td><td class="num">${num(s.view_count)}</td>
   <td class="small trunc" style="max-width:160px">${esc(s.license)}</td><td>${pill(s.permission_status)}${s.acquired ? ' ' + pill('downloaded', 'acquired') : ''}</td><td>${s.proposal ? pill(s.proposal.proposed) : '<span class="dim">—</span>'}</td></tr>`).join('')}</table></div>`;
}
function candTable(c) {
  return `<div class="tablewrap"><table><tr><th class="num">Score</th><th>Time</th><th>Moment</th><th>Hook / quote</th><th>Rights</th><th>Status</th><th></th></tr>${c.map(x => `<tr data-k="${esc(x.candidate_id)}"><td class="num">${score(x.overall_score)}<div class="dim" style="font-size:10.5px">H${x.hook_score ?? '-'} C${x.coherence_score ?? '-'} E${x.emotional_score ?? '-'} V${x.visual_score ?? '-'}</div></td>
   <td class="mono">${(+x.start_time).toFixed(1)}–${(+x.end_time).toFixed(1)}s</td><td><b>${esc(x.moment_description)}</b><div class="small muted clamp2">${esc(x.editorial_rationale)}</div>${x.source_title ? `<div class="small dim trunc" style="max-width:340px">${esc(x.source_title)}</div>` : ''}</td>
   <td class="small">${esc(x.suggested_hook)}${x.transcript_excerpt ? `<div class="muted clamp2">“${esc(x.transcript_excerpt)}”</div>` : ''}</td><td>${pill(x.rights_status)}</td><td>${pill(x.status)}</td>
   <td><div class="row" style="flex-wrap:nowrap"><button class="ok sm" data-act="post" data-p="/api/candidates/${esc(x.candidate_id)}/status" data-b='{"status":"selected"}'>Select</button><button class="bad sm" data-act="post" data-p="/api/candidates/${esc(x.candidate_id)}/status" data-b='{"status":"rejected"}'>Reject</button></div></td></tr>`).join('')}</table></div>`;
}
V.research = {
  title: 'Research lab',
  load: async () => { const [ideas, src] = await Promise.all([api('/api/ideas'), api('/api/sources')]); return { ideas, src }; },
  live: e => /^idea|^discovery|^rights|^source/.test(e.kind),
  tools: () => searchBox('rs.q', st('rs', { q: '' }).q, 'Filter ideas & sources…'),
  html: ({ ideas, src }) => { const q = st('rs', { q: '' }).q, I = ideas.filter(i => has(q, i.topic, i.hook, i.brand_id)), Sx = src.filter(s => has(q, s.title, s.creator));
    return `<div class="card" style="padding:10px 0 0"><div class="h" style="padding:0 14px">Idea backlog <span class="r">${I.length}</span></div>${I.length ? `<div class="tablewrap" style="max-height:44vh"><table><tr><th class="num">Score</th><th>Brand</th><th>Topic</th><th>Evidence</th><th>Status</th><th></th></tr>
    ${I.map(i => `<tr data-k="${esc(i.idea_id)}"><td class="num">${score(i.opportunity_score)}</td><td>${brandTag(i.brand_id)}</td><td><b dir="auto">${esc(i.topic)}</b><div class="small muted clamp2">${esc(i.hook)}</div></td>
     <td class="small">${(i.trend_evidence || []).slice(0, 2).map(e => `<div class="clamp2">${e.url ? `<a href="${safeUrl(e.url)}" target="_blank" rel="noopener">${esc(e.claim)}</a>` : esc(e.claim)} <span class="dim">${esc(e.observed_at)}</span></div>`).join('')}</td>
     <td>${pill(i.status)}</td><td><div class="row" style="flex-wrap:nowrap"><button class="ok sm" data-act="post" data-p="/api/ideas/${esc(i.idea_id)}/status" data-b='{"status":"approved"}'>Approve</button><button class="sm" data-act="post" data-p="/api/ideas/${esc(i.idea_id)}/status" data-b='{"status":"parked"}'>Park</button></div></td></tr>`).join('')}</table></div>` : '<div class="empty" style="margin:0 14px 14px">No ideas</div>'}</div>
    <div class="card" style="margin-top:12px;padding:10px 0 0"><div class="h" style="padding:0 14px">Discovered sources <span class="r">${Sx.length}</span></div>${sourceTable(Sx.slice(0, 300))}</div>`; },
};
V.clips = {
  title: 'Clip intelligence',
  load: async () => ({ c: await api('/api/candidates') }),
  live: e => /^candidates/.test(e.kind),
  html: ({ c }) => c.length ? `<div class="small muted" style="margin-bottom:10px">Scored candidate moments across sources (${c.length}). Click a source in Research or Assets for contact sheets and rights.</div><div class="card" style="padding:0">${candTable(c)}</div>` : '<div class="empty">No candidates scored yet. The viral analyst adds them after a source is analysed.</div>',
};
V.accounts = {
  title: 'Social accounts',
  load: async () => ({ a: await api('/api/accounts') }),
  live: e => e.kind === 'account.status',
  html: ({ a }) => { const by = {}; a.forEach(x => (by[x.brand_id] ??= []).push(x)); const live = a.filter(x => x.status === 'connected').length;
    return `<div class="small muted" style="margin-bottom:10px">${live} of ${a.length} accounts connected. You create and log in to accounts yourself (docs/accounts.md). Every post is approved by you.</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${Object.entries(by).map(([b, list]) => `<div class="card" data-k="${esc(b)}" style="border-top:3px solid var(--b-${esc(b)},var(--acc))"><div class="row" style="margin-bottom:6px">${brandTag(b)}</div><div class="list-tight">${list.map(x => { const d = x.data || {};
      return `<div data-k="${esc(x.id)}"><div class="row"><b style="width:80px">${esc(x.platform)}</b>${pill(x.status)}${d.url ? `<a class="trunc" style="max-width:120px" href="${safeUrl(d.url)}" target="_blank" rel="noopener">${esc(x.handle || 'open')}</a>` : `<span class="dim small">${esc(x.handle || '')}</span>`}
      <select class="right" data-change="account" data-id="${esc(x.id)}" aria-label="Status">${['not_created', 'created', 'connected', 'restricted'].map(s => `<option value="${s}"${s === x.status ? ' selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select></div>
      ${d.upload_route ? `<div class="small muted" style="margin:3px 0 0 88px">${x.can_publish ? '✅' : '⏳'} ${esc(d.upload_route)}${d.studio ? ` · <a href="${safeUrl(d.studio)}" target="_blank" rel="noopener">Studio</a>` : ''}</div>` : ''}</div>`; }).join('')}</div></div>`).join('')}</div>`; },
};
V.analytics = {
  title: 'Analytics & learning',
  load: async () => ({ l: await api('/api/lessons') }),
  html: ({ l }) => `<div class="small muted" style="margin-bottom:10px">Only real platform metrics. Lessons are marked hypothesis or evidence, with confidence.</div>
  <div class="card"><div class="h">Lessons <span class="r">${l.lessons.length}</span></div>${l.lessons.length ? `<table>${l.lessons.map(x => `<tr data-k="${x.id}"><td>${pill(x.kind)}</td><td><b>${esc(x.title)}</b><div class="small muted">${esc(x.evidence)}</div></td><td>${esc(x.confidence)}</td><td>${x.brand_id ? brandTag(x.brand_id) : 'all'}</td></tr>`).join('')}</table>` : '<div class="muted">No lessons yet. They need published videos and real analytics.</div>'}</div>
  <div class="card" style="margin-top:12px"><div class="h">Experiments</div>${l.experiments.length ? l.experiments.map(e => `<div class="row">${pill(e.status)} ${esc(e.hypothesis)}</div>`).join('') : '<div class="muted">None running</div>'}</div>
  <div class="card" style="margin-top:12px"><details><summary>Cycle reports (${l.cycles.length})</summary>${l.cycles.map(c => `<pre class="mono" style="white-space:pre-wrap;background:var(--bg2);padding:10px;border-radius:8px;max-height:300px;overflow:auto">${esc(JSON.stringify(c, null, 1))}</pre>`).join('') || '<div class="muted">None yet</div>'}</details></div>`,
};
/* YouTube Studio "Ask Studio" review per channel (data/ask-studio/*.json, docs/ask-studio-*.md). */
const tag = s => { const m = /^\[([^\]]+)\]\s*/.exec(s); return m ? `<span class="pill ${m[1] === 'Analytics' ? 't-ok' : ''}" style="font-size:10px">${esc(m[1])}</span> ${esc(s.slice(m[0].length))}` : esc(s); };
const ul = (l, cls = '') => l?.length ? `<ul class="ins-ul ${cls}">${l.map(x => `<li dir="auto">${tag(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ul>` : '<div class="dim small">—</div>';
const tone = (v, good, ok) => v == null ? '' : v >= good ? 'color:var(--ok)' : v >= ok ? 'color:var(--warn)' : 'color:var(--bad)';
V.insights = {
  title: 'YouTube insights',
  load: async () => ({ d: await api('/api/ask-studio') }),
  tools: (c) => { const s = st('ins', { brand: '' }); return chips('ins.brand', s.brand, [['', 'All channels', c.d.channels.length], ...c.d.channels.map(x => [x.brand, esc(brandName(x.brand)), x.videos.length, bc(x.brand)])]); },
  html: ({ d }) => {
    if (!d.channels.length) return '<div class="empty">No Ask Studio review yet. Run one per channel (docs/ask-studio-*.md).</div>';
    const s = st('ins', { brand: '' }), S0 = d.summary, chs = d.channels.filter(c => !s.brand || c.brand === s.brand);
    const all = d.channels.flatMap(c => c.videos.filter(v => v.stayed_pct != null));
    const avg = (l, k) => { const x = l.filter(v => v[k] != null); return x.length ? x.reduce((n, v) => n + v[k], 0) / x.length : null; };
    const summary = S0 && !s.brand ? `<div class="kpis">${kpi(d.channels.length, 'Channels reviewed')}${kpi(all.length, 'Videos with data')}${kpi(pct(avg(all, 'stayed_pct')), 'Avg stayed to watch', 'warn')}${kpi('~80%', '1M-view Shorts stay', 'ok')}
        ${kpi(pct(avg(all, 'apv')), 'Avg % viewed')}${kpi(num(all.reduce((n, v) => n + (v.views || 0), 0)), 'Views (these videos)')}</div>
      <div class="grid g2" style="margin-top:12px"><div class="card"><div class="h">Cross-channel rules <span class="r small muted">${esc(S0.date)} · ${esc(S0.doc)}</span></div><div class="banner" style="margin:0 0 8px;padding:6px 10px"><span class="small"><b>${esc(S0.headline)}</b></span></div>${ul(S0.rules)}</div>
        <div class="card"><div class="h">Owner decisions</div>${ul(S0.decisions)}<div class="small" style="margin-top:8px;color:var(--warn)">⚠ ${esc(S0.caveat)}</div>
        <div class="tablewrap" style="margin-top:8px"><table><tr><th>Channel</th><th class="num">Videos</th><th class="num">Stayed</th><th class="num">Avg % viewed</th><th class="num">Best stayed</th></tr>${d.channels.map(c => { const v = c.videos.filter(x => x.stayed_pct != null), a = avg(v, 'stayed_pct');
          return `<tr data-k="sum-${esc(c.brand)}" data-set="ins.brand" data-v="${esc(c.brand)}" style="cursor:pointer"><td>${brandTag(c.brand)}</td><td class="num">${v.length}</td><td class="num" style="${tone(a, 70, 50)}">${pct(a)}</td><td class="num">${pct(avg(v, 'apv'))}</td><td class="num">${pct(v.length ? Math.max(...v.map(x => x.stayed_pct)) : null)}</td></tr>`; }).join('')}</table></div></div></div>` : '';
    const card = c => {
      const vids = c.videos.slice().sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
      const fp = c.format_performance, ac = c.audience_countries, uf = c.uploaded_fixes;
      return `<div class="card" data-k="ins-${esc(c.brand)}" style="margin-top:12px;border-top:3px solid var(--b-${esc(c.brand)},var(--acc))">
        <div class="row" style="margin-bottom:8px">${brandTag(c.brand)}<span class="small muted" dir="auto">${esc(c.channel)}</span>${pill(c.source_available ? 'approved' : 'pending', c.source_available ? 'Ask Studio answered' : 'Analytics only')}<span class="right small muted mono">${esc(c.doc)}</span></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px">
          <div><div class="h small" style="color:var(--bad)">1 · Why not 1M yet</div>${ul(c.blockers)}</div>
          <div><div class="h small" style="color:var(--acc)">2 · Hook &amp; timing</div>${ul(c.hook_rules)}</div>
          <div><div class="h small" style="color:var(--ok)">3 · Channel advice</div>${ul(c.channel_advice)}${c.playlists?.length ? `<div class="small muted" style="margin-top:4px">Playlists: ${c.playlists.map(p => `<span class="pill" dir="auto">${esc(p)}</span>`).join(' ')}</div>` : ''}</div>
        </div>
        ${fp ? `<div class="h small" style="margin-top:10px">Format performance</div><div class="tablewrap"><table><tr><th class="num">#</th><th>Format</th><th>Evidence</th><th>Note</th></tr>${fp.map(f => `<tr><td class="num">${esc(f.rank)}</td><td><b>${esc(f.format)}</b></td><td class="small">${esc(f.evidence)}</td><td class="small muted">${esc(f.note)}</td></tr>`).join('')}</table></div>` : ''}
        <div class="h small" style="margin-top:10px">4 · Uploaded videos — numbers &amp; fixes <span class="r small muted">${vids.length}</span></div>
        <div class="tablewrap" style="max-height:52vh"><table><tr><th>Video</th><th class="num">Views</th><th class="num">Stayed</th><th class="num">% viewed</th><th>Issue</th><th>Fix (check facts first)</th></tr>
        ${vids.map((v, i) => `<tr data-k="iv-${esc(c.brand)}-${i}"><td><div class="trunc" style="max-width:280px;font-weight:600" dir="auto">${esc(v.title)}</div>${v.videoId ? `<a class="mono small" href="https://youtu.be/${esc(v.videoId)}" target="_blank" rel="noopener">${ic('yt')} ${esc(v.videoId)}</a>` : ''}${v.production ? ` <a class="mono dim small" href="#review/${esc(v.production)}">${esc(v.production)}</a>` : ''}</td>
          <td class="num">${num(v.views)}</td><td class="num" style="${tone(v.stayed_pct, 70, 50)}">${pct(v.stayed_pct)}</td><td class="num" style="${tone(v.apv, 80, 55)}">${pct(v.apv)}</td><td class="small" dir="auto">${esc(v.issue || '—')}</td><td class="small muted" dir="auto">${esc(v.fix || '—')}</td></tr>`).join('')}</table></div>
        ${uf ? `<div class="h small" style="margin-top:10px">Fixes for uploaded videos</div><div class="list-tight small">${Object.entries(uf).map(([k, v]) => `<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><b style="width:120px;flex:none">${esc(k.replace(/_/g, ' '))}</b><span dir="auto">${Array.isArray(v) ? v.map(esc).join('<br>') : esc(v)}</span></div>`).join('')}</div>` : ''}
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;margin-top:10px">
          <div><div class="h small">5 · Ideas from Ask Studio</div>${ul(c.ideas)}${c.comment_signals?.length ? `<div class="h small" style="margin-top:6px">Comment signals</div>${ul(c.comment_signals)}` : ''}</div>
          ${ac ? `<div><div class="h small">Audience countries <span class="r dim small">views % · % viewed</span></div><table>${Object.entries(ac).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `<tr><td>${esc(k)}</td><td style="width:45%"><div class="bar" style="height:6px"><i style="width:${Math.min(100, v[0] * 2)}%"></i></div></td><td class="num">${pct(v[0])}</td><td class="num">${pct(v[1])}</td></tr>`).join('')}</table></div>` : ''}
          <div><div class="h small" style="color:var(--warn)">⚠ Ask Studio got wrong / invented</div>${ul(c.errors)}</div>
        </div></div>`;
    };
    return summary + chs.map(card).join('');
  },
};
/* Channel learning (data/learning/<brand>.json, docs/youtube-intelligence/learning-schema.md). */
const FC = { verified: ['t-ok', 'verified'], partly: ['t-warn', 'partly'], unverified: ['', 'unverified'], contradicted: ['t-bad', 'contradicted'], unavailable: ['', 'unavailable'] };
const fcPill = f => { const [c, l] = FC[f] || ['', f || '—']; return `<span class="pill ${c}${f === 'unavailable' ? ' dim' : ''}">${esc(l)}</span>`; };
const VERD = [['adopt', 'Adopt', 'var(--ok)'], ['test', 'Test', 'var(--info)'], ['later', 'Later', 'var(--mute)'], ['reject', 'Reject', 'var(--bad)']];
const IDEA_ST = { open: 't-warn', running: 't-ok', won: 't-ok', lost: 't-bad', dropped: '' };
const CHK_ST = { open: 't-warn', pass: 't-ok', fail: 't-bad' };
const xp = (t, cls = '') => `<div class="xp ${cls}" data-xp dir="auto" title="Click to expand">${esc(t ?? '—')}</div>`;
V.learn = {
  title: 'Channel learning',
  load: async arg => {
    const sample = arg === '_sample' ? '?sample=1' : '';
    const list = await api('/api/learning' + sample);
    const brand = arg || list.brands[0]?.brand;
    if (!brand) return { list, d: null };
    let d; try { d = await api('/api/learning/' + encodeURIComponent(brand) + sample); } catch (e) { d = { error: e.message }; }
    return { list, d, brand };
  },
  tools: ({ list, brand }) => `<div class="chips">${(list?.brands || []).map(x => `<a class="chip ${x.brand === brand ? 'on' : ''}" href="#learn/${esc(x.brand)}" style="${bc(x.brand)}"><span dir="auto">${esc(G.brands[x.brand]?.name || x.channel || x.brand)}</span> <span class="c">${x.counts.questions}q · ${x.counts.ideas}i</span></a>`).join('')}</div>`,
  html: ({ list, d, brand }) => {
    if (!d) return '<div class="empty">No channel learning file yet. Run a learning session (docs/youtube-intelligence/learning-schema.md) and write data/learning/&lt;brand&gt;.json.</div>';
    if (d.error) return `<div class="empty">${esc(d.error)}</div>`;
    const s = st('ln', { type: '', cat: '' }), today = dayKey(new Date());
    const ideas = d.ideas || [], qs = d.questions || [], types = [...new Set(ideas.map(i => i.type))], cats = [...new Set(qs.map(q => q.category))];
    const sess = (d.sessions || []).map(x => x.date).sort().reverse();
    const P = d.path_to_100k || {}, H = d.hooks || {};
    const head = `<div class="card" style="border-top:3px solid var(--b-${esc(brand)},var(--acc));padding:8px 14px"><div class="row">${brandTag(brand)}<span class="small muted" dir="auto">${esc(d.channel)}</span><span class="right small muted">Updated ${esc(ago(d.updated_at))} · ${sess.length} session${sess.length === 1 ? '' : 's'}${sess[0] ? ' · latest ' + esc(sess[0]) : ''}</span></div></div>`;
    const kp = `<div class="kpis" style="margin-top:10px">${(d.kpis || []).map(k => `<div class="kpi" title="${esc(k.source || '')}"><div class="v">${esc(k.value)}</div><div class="l">${esc(k.label)}${k.window ? ` <span class="dim small">· ${esc(k.window)}</span>` : ''}</div></div>`).join('')}</div>`;
    const bm = (P.benchmarks || []).map(b => { const mx = Math.max(b.target, b.best ?? 0, b.current) || 1, u = b.unit || '', r = v => (v / mx * 100).toFixed(1), ok = b.current >= b.target;
      return `<tr><td><b>${esc(b.metric)}</b><div class="dim small">${esc(b.source)}</div></td><td class="num" style="${ok ? 'color:var(--ok)' : ''}">${num(b.current)}${esc(u)}</td><td class="num">${b.best == null ? '—' : num(b.best) + esc(u)}</td><td class="num">${num(b.target)}${esc(u)}</td>
      <td style="width:38%"><div class="lnbar"><i style="width:${r(b.current)}%;background:${ok ? 'var(--ok)' : 'var(--acc)'}"></i>${b.best != null ? `<s class="best" style="left:${r(b.best)}%" title="best ${esc(b.best)}"></s>` : ''}<s class="tgt" style="left:${r(b.target)}%" title="target ${esc(b.target)}"></s></div></td></tr>`; }).join('');
    const path100 = `<div class="card" style="padding:10px 0 0"><div class="h" style="padding:0 14px">Path to 100K <span class="r small muted">bar = current · white tick = best · amber tick = target</span></div><div class="tablewrap"><table><tr><th>Metric</th><th class="num">Now</th><th class="num">Best</th><th class="num">Target</th><th></th></tr>${bm}</table></div>
      <div style="padding:6px 14px 10px">${ul(P.levers)}</div></div>`;
    const hookRow = (v, tone) => `<div class="lnh" data-k="hk-${esc(v.videoId)}"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="min-width:0;flex:1"><div class="trunc" style="font-weight:600" dir="auto">${esc(v.title)}</div>${xp(v.opening, 'small muted')}</div>
      <div style="text-align:right;flex:none"><div class="lnbig" style="color:var(--${tone})">${pct(v.stayed_pct)}</div><div class="small dim">${num(v.views)} views</div></div></div>
      <div class="row small" style="margin-top:2px"><span class="pill">${esc(String(v.hook || '—').replace(/_/g, ' '))}</span>${v.videoId ? `<a class="mono" href="https://youtu.be/${esc(v.videoId)}" target="_blank" rel="noopener">${ic('yt')} ${esc(v.videoId)}</a>` : ''}</div></div>`;
    const cat = (H.by_category || []).slice().sort((a, b) => (b.stayed_pct ?? 0) - (a.stayed_pct ?? 0));
    const hooks = `<div class="card"><div class="h">Hooks <span class="r small muted">real Studio numbers</span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px"><div><div class="h2" style="color:var(--ok)">Best</div>${(H.best || []).map(v => hookRow(v, 'ok')).join('') || '<div class="dim small">—</div>'}</div>
      <div><div class="h2" style="color:var(--bad)">Worst</div>${(H.worst || []).map(v => hookRow(v, 'bad')).join('') || '<div class="dim small">—</div>'}</div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-top:8px"><div><div class="h2">By hook category (stayed %)</div><div class="tablewrap"><table><tr><th>Category</th><th class="num">n</th><th class="num">Stayed</th><th class="num">Avg views</th></tr>${cat.map(c => `<tr><td>${esc(String(c.category).replace(/_/g, ' '))}</td><td class="num">${c.n}</td><td class="num" style="${tone(c.stayed_pct, 70, 55)}">${pct(c.stayed_pct)}</td><td class="num">${num(c.avg_views)}</td></tr>`).join('')}</table></div></div>
      <div><div class="h2">Hook rules</div>${ul(H.rules)}</div></div></div>`;
    const sel = ideas.filter(i => !s.type || i.type === s.type);
    const board = `<div class="card"><div class="row" style="margin-bottom:6px"><div class="h" style="margin:0">Idea board <span class="r small muted">${sel.length} of ${ideas.length}</span></div><span class="right">${chips('ln.type', s.type, [['', 'All', ideas.length], ...types.map(t => [t, esc(t), ideas.filter(i => i.type === t).length])])}</span></div>
      <div class="lncols">${VERD.map(([v, l, col]) => { const L = sel.filter(i => i.verdict === v); return `<div class="lncol"><div class="lncolh" style="border-color:${col};color:${col}">${l} <span class="dim">${L.length}</span></div>${L.map(i => `<div class="lni" data-k="id-${esc(i.id)}"><div class="row" style="flex-wrap:nowrap"><span class="mono dim">${esc(i.id)}</span><span class="pill">${esc(i.type)}</span><span class="right pill ${IDEA_ST[i.status] ?? ''}">${esc(i.status)}</span></div>
        <div style="font-weight:600;margin:2px 0" dir="auto">${esc(i.idea)}</div>
        <div class="small"><span class="dim">Ask Studio</span> ${xp(i.ask_studio, 'small muted')}</div><div class="small"><span class="dim">Our data</span> ${xp(i.our_data, 'small')}</div>
        <div class="small"><span class="dim">Test</span> ${xp(i.test_plan, 'small')}</div><div class="small"><span class="dim">Metric</span> <span dir="auto">${esc(i.metric || '—')}</span></div></div>`).join('') || '<div class="dim small">—</div>'}</div>`; }).join('')}</div></div>`;
    const qsel = qs.filter(q => !s.cat || q.category === s.cat);
    const qtab = `<div class="card" style="padding:10px 0 0"><div class="row" style="padding:0 14px 8px"><div class="h" style="margin:0">What we asked <span class="r small muted">${esc(sess.length ? 'sessions ' + sess.join(', ') : '')}</span></div><span class="right">${chips('ln.cat', s.cat, [['', 'All', qs.length], ...cats.map(c => [c, esc(c), qs.filter(q => q.category === c).length])])}</span></div>
      <div class="tablewrap"><table class="lnq"><tr><th>ID</th><th>Category</th><th>Question</th><th>Answer</th><th>Fact-check</th><th>Takeaway</th></tr>${qsel.map(q => `<tr data-k="q-${esc(q.id)}"><td class="mono">${esc(q.id)}<div class="dim small">${esc(q.session)}</div></td><td><span class="pill">${esc(q.category)}</span></td><td>${xp(q.question)}</td><td>${xp(q.answer, 'muted')}</td>
        <td>${fcPill(q.factcheck)}${q.evidence ? xp(q.evidence, 'small dim') : ''}</td><td>${xp(q.takeaway)}</td></tr>`).join('')}</table></div></div>`;
    const rules = `<div class="grid g2e"><div class="card"><div class="h">Showrunner rules <span class="r small muted">what to MAKE</span></div><div class="list-tight">${(d.showrunner_rules || []).map(r => `<div data-k="sr-${esc(r.id)}"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="mono dim" style="width:34px;flex:none">${esc(r.id)}</span><div style="min-width:0"><div dir="auto">${esc(r.rule)}</div><div class="small dim" dir="auto">${esc(r.why)} · ${esc(r.added)}</div></div></div></div>`).join('') || '<div class="dim small">—</div>'}</div></div>
      <div class="card"><div class="h">QA checks <span class="r small muted">what QA VERIFIES</span></div><div class="list-tight">${(d.qa_checks || []).map(r => `<div data-k="qa-${esc(r.id)}"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="mono dim" style="width:34px;flex:none">${esc(r.id)}</span><div style="min-width:0;flex:1"><div dir="auto">${esc(r.check)}</div><div class="small dim" dir="auto">${esc(r.how)} · ${esc(r.threshold)}</div></div>${r.must ? '<span class="pill t-bad">must</span>' : '<span class="pill">should</span>'}</div></div>`).join('') || '<div class="dim small">—</div>'}</div></div></div>`;
    const checks = `<div class="card" style="padding:10px 0 0"><div class="h" style="padding:0 14px">Next check <span class="r small muted">overdue = read date passed and still open</span></div><div class="tablewrap"><table><tr><th>ID</th><th>Check</th><th>Metric</th><th>Target</th><th>Read on</th><th>Owner</th><th>Status</th><th>Result</th></tr>
      ${(d.next_checks || []).map(c => { const od = c.status === 'open' && c.read_on && c.read_on < today; return `<tr data-k="nc-${esc(c.id)}"><td class="mono">${esc(c.id)}</td><td dir="auto">${esc(c.check)}</td><td class="small" dir="auto">${esc(c.metric)}</td><td class="small" dir="auto">${esc(c.target)}</td>
        <td class="mono" style="white-space:nowrap;${od ? 'color:var(--warn);font-weight:700' : ''}">${esc(c.read_on)}${od ? ' overdue' : ''}</td><td class="small">${esc(c.owner)}</td><td><span class="pill ${CHK_ST[c.status] ?? ''}">${esc(c.status)}</span></td><td class="small" dir="auto">${esc(c.result ?? '—')}</td></tr>`; }).join('')}</table></div></div>`;
    const T = d.timing || {}, A = d.audience || {}, Cm = d.comments?.themes || [];
    const bottom = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px">
      <div class="card"><div class="h">Timing</div><div class="small" dir="auto">${esc(T.summary || '—')}</div>${T.best_slots_utc?.length ? `<div class="small muted" style="margin:4px 0">Best UTC: ${T.best_slots_utc.map(x => `<span class="pill">${esc(x)}</span>`).join(' ')}</div>` : ''}
        <table>${(T.countries || []).map(c => `<tr><td class="small">${esc(c.country)}</td><td style="width:45%"><div class="bar" style="height:6px"><i style="width:${Math.min(100, c.pct * 2)}%"></i></div></td><td class="num small">${pct(c.pct)}</td></tr>`).join('')}</table></div>
      <div class="card"><div class="h">Audience</div><div class="small" dir="auto">${esc(A.summary || '—')}</div><div class="h2">Facts</div>${ul(A.facts)}<div class="h2">Search terms</div><div>${(A.search_terms || []).map(x => `<span class="pill" dir="auto">${esc(x)}</span>`).join(' ') || '—'}</div><div class="h2">Content gaps</div>${ul(A.content_gaps)}</div>
      <div class="card"><div class="h">Comment themes</div>${Cm.map(c => `<div style="margin-bottom:5px"><div class="row"><b dir="auto">${esc(c.theme)}</b><span class="right pill">${c.count}</span></div><div class="small muted" dir="auto">${(c.examples || []).map(esc).join(' · ')}</div></div>`).join('') || '<div class="dim small">—</div>'}</div>
      <div class="card"><div class="h" style="color:var(--warn)">⚠ Ask Studio got wrong / invented</div>${ul(d.errors)}</div></div>`;
    return `${head}${kp}<div class="lnstack">${path100}${hooks}${board}${qtab}${rules}${checks}${bottom}</div>`;
  },
};
V.assets = {
  title: 'Assets & licensing',
  load: async () => { const q = new URLSearchParams(location.hash.split('?')[1] || ''); return { src: await api('/api/sources?' + q), q }; },
  live: e => /^rights|^source|^discovery/.test(e.kind),
  html: ({ src, q }) => `<form class="row" style="margin-bottom:10px" data-form="assets"><label class="search">${ic('search')}<input name="q" placeholder="Title or creator" value="${esc(q.get('q') || '')}"></label>
    <select name="status"><option value="">Any rights</option>${['approved', 'approved_with_conditions', 'pending', 'research_only', 'rejected'].map(r => `<option value="${r}"${q.get('status') === r ? ' selected' : ''}>${r.replace(/_/g, ' ')}</option>`).join('')}</select>
    <select name="platform"><option value="">Any platform</option>${['wikimedia', 'internet_archive', 'nasa', 'pixabay', 'pexels', 'youtube', 'facebook'].map(r => `<option${q.get('platform') === r ? ' selected' : ''}>${r}</option>`).join('')}</select>
    <button class="primary" type="submit">Filter</button><span class="right small muted">${src.length} assets${src.length >= 500 ? ' (first 500)' : ''}</span></form>
  <div class="card" style="padding:0">${src.length ? sourceTable(src) : '<div class="empty">No assets match.</div>'}</div>`,
};
V.jobs = {
  title: 'Jobs',
  load: async () => ({ j: await api('/api/jobs') }),
  live: e => /^job|render\.progress/.test(e.kind),
  html: ({ j }) => j.length ? `<div class="small muted" style="margin-bottom:10px">Durable queue: analysis, builds, renders, technical QA.</div><div class="card" style="padding:0"><div class="tablewrap"><table><tr><th class="num">#</th><th>Type</th><th>Production</th><th>Status</th><th>Progress</th><th>Error</th><th></th></tr>
  ${j.map(x => `<tr data-k="${x.id}"><td class="num mono">${x.id}</td><td>${esc(x.type)}</td><td>${x.production_id ? `<a class="mono" href="#review/${esc(x.production_id)}">${esc(x.production_id)}</a>` : '—'}</td><td>${pill(x.status)}</td><td style="width:130px"><div class="bar"><i style="width:${(x.progress || 0) * 100}%"></i></div></td>
   <td class="small muted clamp2">${esc(x.error)}</td><td>${['failed', 'cancelled'].includes(x.status) ? `<button class="sm" data-act="post" data-p="/api/jobs/${x.id}/retry" data-b="{}">Retry</button>` : ''}${['queued', 'running'].includes(x.status) ? `<button class="bad sm" data-act="post" data-p="/api/jobs/${x.id}/cancel" data-b="{}">Cancel</button>` : ''}</td></tr>`).join('')}</table></div></div>` : '<div class="empty">No jobs yet.</div>',
};

/* ---------- workflow: versions diagram (config/workflow.json), gates (config/gates.json), live production progress ---------- */
let WFD = null, WFC = null;                                         // /api/workflow (cached per page load) · last drawn context for the step drawer
const wfData = async (fresh) => { if (!WFD || fresh) { WFD = await api('/api/workflow'); if (WFD.gate_values?.script_forecast != null) SG = WFD.gate_values.script_forecast; } return WFD; };
const sdef = (wf, ver, id) => ({ id, ...(wf.steps[id] || { label: id, lane: 'idea' }), ...(ver?.overrides?.[id] || {}) });
const laneC = (wf, l) => wf.lanes.find(x => x.id === l)?.color || 'var(--acc)';
const OPS = { '>=': '≥', '<=': '≤', 'blocks at >=': '<', 'blocks on': '≠' };
function gateBadge(wf, d) {
  const gv = wf.gate_values || {}, m = k => wf.gates_meta?.[k] || {};
  if (d.gate && gv[d.gate] != null) {
    const v = gv[d.gate], op = OPS[m(d.gate).op] ?? '';
    const t = d.gate2 && gv[d.gate2] != null ? `${op}${v}` : op === '≠' ? `✕${v}` : `${op}${v}`;
    const tip = [d.gate, d.gate2].filter(Boolean).map(k => `${m(k).label || k}: ${m(k).op || ''} ${gv[k]} (config/gates.json ${k})`).join(' · ');
    return { t, tip, soft: false };
  }
  if (d.soft_gate && wf.soft_gates?.[d.soft_gate] != null) return { t: `${wf.soft_gates[d.soft_gate]}`, tip: `${d.soft_gate} ${wf.soft_gates[d.soft_gate]}: playbook bar, not enforced in code`, soft: true };
  return null;
}
const statusTxt = { done: 'done', active: 'in progress', blocked: 'blocked', todo: 'to do', skipped: 'no record', na: 'n/a' };

/** Lane-column layout: lanes left→right, steps top→bottom; loops get a dashed frame; removed steps (compare) slot in after their old neighbour. */
function wfLayout(wf, ver, base) {
  const ids = [...ver.steps], all = [...ids], removed = base ? base.steps.filter(x => !ids.includes(x)) : [];
  for (const r of removed) { const bi = base.steps.indexOf(r); let at = -1; for (let k = bi - 1; k >= 0; k--) { const j = all.indexOf(base.steps[k]); if (j >= 0) { at = j; break; } } all.splice(at + 1, 0, r); }
  const defOf = id => ids.includes(id) ? sdef(wf, ver, id) : sdef(wf, base, id);
  const laneSteps = Object.fromEntries(wf.lanes.map(l => [l.id, []]));
  for (const id of all) (laneSteps[defOf(id).lane] ??= []).push(id);
  const lanes = wf.lanes.filter(l => laneSteps[l.id].length), n = lanes.length;
  const avail = Math.max(760, (($('#main')?.clientWidth || 1240) - 44));
  const L = { PX: 14, GX: 26, NH: 62, GY: 11, PY: 8, HEAD: 30, LT: 24, LB: 10 };
  L.CW = Math.round(Math.min(250, Math.max(150, (avail - 2 * L.PX - (n - 1) * L.GX) / n)));
  const loopOf = id => (ver.loops || []).find(l => l.steps.includes(id));
  const pos = {}, boxes = {}; let H = 0;
  lanes.forEach((l, li) => {
    const x = L.PX + li * (L.CW + L.GX); let y = L.PY + L.HEAD, prev = null;
    for (const id of laneSteps[l.id]) {
      const lp = ids.includes(id) ? loopOf(id) : prev;              // a removed step inside a loop stays in the frame
      if (lp && lp !== prev) y += L.LT;
      if (!lp && prev) y += L.LB;
      pos[id] = { x, y, lane: l.id, li };
      if (lp) { const b = boxes[lp.id] ??= { loop: lp, x, y0: y, y1: y }; b.y1 = y + L.NH; }
      y += L.NH + L.GY; prev = lp;
    }
    if (prev) y += L.LB;
    H = Math.max(H, y);
  });
  return { ...L, lanes, laneSteps, pos, boxes, ids, removed, defOf, W: 2 * L.PX + n * L.CW + (n - 1) * L.GX, H: H + L.PY };
}

/** Flow diagram (HTML nodes + one SVG edge layer). opts: { prog (progress json), base (compare version) }. */
function wfDiagram(wf, ver, opts = {}) {
  const base = opts.base || null, L = wfLayout(wf, ver, base), P = L.pos, prog = opts.prog;
  const stOf = Object.fromEntries((prog?.steps || []).map(s => [s.id, s]));
  const grp = id => ver.flow.find(x => Array.isArray(x) && x.includes(id)) || null;
  const cur = L.ids.filter(id => P[id]);
  const laneCur = l => L.laneSteps[l].filter(id => L.ids.includes(id));
  const adj = (a, b) => { const ls = laneCur(P[a].lane); return Math.abs(ls.indexOf(a) - ls.indexOf(b)) === 1; };
  const isHot = b => ['active', 'blocked'].includes(stOf[b]?.status);
  const mid = id => P[id].y + L.NH / 2;
  const paths = [], seen = new Set();
  for (const [a0, b0] of ver.edges) {
    if (!P[a0] || !P[b0]) continue;
    if (P[a0].lane === P[b0].lane) {
      if (!adj(a0, b0)) continue;
      const [a, b] = P[a0].y < P[b0].y ? [a0, b0] : [b0, a0], x = P[a].x + L.CW / 2;
      paths.push(`<path class="${isHot(b) ? 'hot' : stOf[b]?.status === 'done' ? 'ok' : ''}" d="M${x} ${P[a].y + L.NH + 1}V${P[b].y - 3}" marker-end="url(#wfa)"/>`);
      continue;
    }
    const ga = grp(a0), gb = grp(b0);
    const a = ga ? laneCur(P[a0].lane).filter(x => ga.includes(x)).at(-1) : a0, b = gb ? laneCur(P[b0].lane).filter(x => gb.includes(x))[0] : b0;
    const k = a + '>' + b; if (seen.has(k)) continue; seen.add(k);
    const x1 = P[a].x + L.CW + 1, y1 = mid(a), x2 = P[b].x - 3, y2 = mid(b), xm = x1 + (L.GX - 8) / 2 + 2, r = Math.min(8, Math.abs(y2 - y1) / 2), dir = y2 < y1 ? -1 : 1;
    paths.push(`<path class="${isHot(b) ? 'hot' : stOf[b]?.status === 'done' ? 'ok' : ''}" d="M${x1} ${y1}H${xm - r}Q${xm} ${y1} ${xm} ${y1 + dir * r}V${y2 - dir * r}Q${xm} ${y2} ${xm + r} ${y2}H${x2}" marker-end="url(#wfa)"/>`);
  }
  // parallel members: dotted rail on the right
  for (const g of ver.flow.filter(Array.isArray)) {
    const ms = g.filter(id => P[id]); if (ms.length < 2) continue;
    const x = P[ms[0]].x + L.CW + 6, y0 = P[ms[0]].y + 8, y1 = P[ms.at(-1)].y + L.NH - 8;
    paths.push(`<path class="par" d="M${x - 4} ${y0}H${x}V${y1}H${x - 4}"/>`);
  }
  // loop frames + return rails
  const frames = Object.values(L.boxes).map(b => {
    const lp = b.loop, max = lp.max_gate ? wf.gate_values?.[lp.max_gate] : null, top = b.y0 - L.LT + 2, bot = b.y1 + L.LB - 2;
    const rn = lp.id === 'script_round' ? prog?.rounds?.script?.n : lp.id === 'video_round' ? prog?.rounds?.video?.n : null;
    const back = P[lp.back_to], rx = b.x - 7, hot = prog && lp.steps.some(id => ['active', 'blocked'].includes(stOf[id]?.status));
    let d = `M${rx} ${bot - 6}V${top + 10}`;
    if (back && P[lp.back_to].lane === P[lp.steps[0]].lane) d = `M${rx} ${bot - 6}V${mid(lp.back_to) + 6}Q${rx} ${mid(lp.back_to)} ${rx + 5} ${mid(lp.back_to)}H${b.x - 3}`;
    else if (back) { const bx = P[lp.back_to].x + L.CW, my = Math.max(mid(lp.back_to), top + 18); d = `M${rx} ${bot - 6}V${top + 12}Q${rx} ${top + 4} ${rx - 7} ${top + 4}H${bx + 14}Q${bx + 8} ${top + 4} ${bx + 8} ${top + 10}V${my - 6}Q${bx + 8} ${my} ${bx + 3} ${my}`; }
    paths.push(`<path class="rail${hot ? ' hot2' : ''}" d="${d}" marker-end="url(#wfr)"/>`);
    const tip = `${lp.label}: ${lp.steps.map(id => sdef(wf, ver, id).label).join(' + ')} run together; fixes go back to ${sdef(wf, ver, lp.back_to).label}`;
    return `<div class="wfloop${hot ? ' hot' : ''}" data-k="lp-${esc(lp.id)}" style="left:${b.x - 11}px;top:${top}px;width:${L.CW + 22}px;height:${bot - top}px" title="${esc(tip)}">
      <span class="ll">↻ ${esc(lp.label)} ${max != null ? `≤ ${esc(max)}` : ''}${rn != null ? ` <b>${esc(rn)}${max != null ? '/' + esc(max) : ''}</b>` : ''}</span><span class="lb">back to ${esc(sdef(wf, ver, lp.back_to).label)}</span></div>`;
  }).join('');
  const heads = L.lanes.map((l, li) => { const n = laneCur(l.id).length, dn = prog ? laneCur(l.id).filter(id => ['done', 'skipped', 'na'].includes(stOf[id]?.status)).length : null;
    return `<div class="wflh" data-k="lh-${l.id}" style="left:${L.PX + li * (L.CW + L.GX)}px;top:${L.PY}px;width:${L.CW}px;--lc:${l.color}"><span>${esc(l.label)}</span><span class="c">${dn != null ? `${dn}/` : ''}${n}</span></div>`; }).join('');
  const nodes = [...cur, ...L.removed].map(id => {
    const d = L.defOf(id), p = P[id], s = stOf[id], rem = L.removed.includes(id);
    let cmp = '';
    if (base && !rem) { if (!base.steps.includes(id)) cmp = 'cmp-add'; else { const bd = sdef(wf, base, id); if (bd.label !== d.label || String(bd.agents) !== String(d.agents) || bd.gate !== d.gate || String(bd.rules) !== String(d.rules)) cmp = 'cmp-chg'; } }
    if (rem) cmp = 'cmp-rem';
    const gb = gateBadge(wf, d), gcls = s ? (s.status === 'done' ? 'ok' : s.status === 'blocked' ? 'bad' : '') : '';
    const sc = s?.score != null ? `<span class="sv ${s.gate != null && typeof s.gate === 'number' ? (s.score >= s.gate ? 'hi' : 'lo') : ''}">${esc(s.score)}${typeof s.gate === 'number' ? `<i>/${esc(s.gate)}</i>` : ''}</span>` : '';
    const foot = s ? `${sc}<span class="trunc">${esc(s.detail || statusTxt[s.status])}</span>` : `<span class="trunc mono">${esc((d.artifacts || [])[0] || '')}</span>`;
    const tag = cmp === 'cmp-add' ? '<span class="tag add">NEW</span>' : cmp === 'cmp-rem' ? '<span class="tag rem">REMOVED</span>' : cmp === 'cmp-chg' ? '<span class="tag chg">CHANGED</span>' : d.note ? `<span class="tag">${esc(d.note)}</span>` : '';
    return `<div class="wfn ${s ? 's-' + s.status : ''} ${cmp}${s?.warn ? ' warn' : ''}${WFC?.sel === id ? ' sel' : ''}" data-k="n-${esc(id)}" data-wfstep="${esc(id)}" style="left:${p.x}px;top:${p.y}px;width:${L.CW}px;height:${L.NH}px;--lc:${laneC(wf, d.lane)}" title="${esc(d.label)}${s ? ' · ' + statusTxt[s.status] : ''} (click for rules)">
      ${tag}${gb ? `<span class="gdw ${gcls}${gb.soft ? ' soft' : ''}" title="${esc(gb.tip)}"><span class="gd">${esc(gb.t)}</span></span>` : ''}
      <div class="wfn-h${gb ? ' hg' : ''}"><b class="trunc">${esc(d.label)}</b></div>
      <div class="wfn-a trunc">${esc((d.agents || []).join(' · '))}${d.gate_text ? ` <span class="gt">◇ ${esc(d.gate_text)}</span>` : ''}</div>
      <div class="wfn-f">${foot}</div></div>`;
  }).join('');
  return `<div class="wfd" data-k="wfd-${esc(ver.id)}${base ? '-' + esc(base.id) : ''}" style="width:${L.W}px;height:${L.H}px">
    <svg class="wfe" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}"><defs><marker id="wfa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#56608a"/></marker><marker id="wfr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f5a524"/></marker></defs>${paths.join('')}</svg>
    ${heads}${frames}${nodes}</div>`;
}

/** Live pipeline strip for one production (review page + #workflow/<id>). */
function pipeStrip(pr, opts = {}) {
  const wf = WFD; if (!pr || pr.error) return '';
  const lanes = (wf?.lanes || [...new Set(pr.steps.map(s => s.lane))].map(id => ({ id, label: id, color: 'var(--acc)' }))).map(l => ({ ...l, steps: pr.steps.filter(s => s.lane === l.id) })).filter(l => l.steps.length);
  const cur = pr.steps.find(s => s.id === pr.current), rs = pr.rounds || {};
  const rc = (l, r) => r?.n != null || r?.max != null ? `<span class="rnd ${r.max != null && r.n >= r.max ? 'cap' : ''}" title="${esc(l)} round counter">${esc(l)} <b>${esc(r.n ?? 0)}</b>${r.max != null ? `/${esc(r.max)}` : ''}</span>` : '';
  const g3 = (pr.gaps || []).slice(0, 3);
  const nx = pr.next;
  return `<div class="card pipe" data-k="pipe-${esc(pr.id)}">
    <div class="h">Live pipeline ${pr.legacy ? `<span class="pill t-warn" title="Built before the v3 loop: mapped onto ${esc(pr.workflow)}">${esc(pr.legacy)}</span>` : `<span class="pill t-acc">${esc(pr.workflow)} · ${esc(pr.workflow_title)}</span>`}
      <span class="pbar" title="${pr.done}/${pr.total} steps"><i style="width:${pr.pct}%"></i></span><span class="small" style="text-transform:none;letter-spacing:0">${pr.done}/${pr.total}</span>
      ${rs.script?.applies ? rc('Script round', rs.script) : ''}${rs.video?.max != null || rs.video?.n ? rc('Video round', rs.video) : ''}
      <span class="r small muted"><span class="livedot on"></span> live · ${ago(pr.at)}${opts.diagramLink !== false ? ` · <a href="#workflow/${esc(pr.id)}">Open diagram →</a>` : ''}</span></div>
    <div class="pstrip">${lanes.map(l => `<div class="plane" style="--lc:${l.color};--n:${l.steps.length}"><div class="plh">${esc(l.label)}</div><div class="psteps">${l.steps.map(s =>
      `<span class="pst s-${s.status}${s.warn ? ' warn' : ''}" data-k="ps-${esc(s.id)}" data-wfstep="${esc(s.id)}" title="${esc(s.label)} · ${statusTxt[s.status]}${s.detail ? ' · ' + esc(s.detail) : ''}"><i></i><b>${esc(s.short || s.label)}</b>${s.score != null ? `<em class="${typeof s.gate === 'number' ? (s.score >= s.gate ? 'hi' : 'lo') : ''}">${esc(s.score)}</em>` : ''}</span>`).join('')}</div></div>`).join('')}</div>
    <div class="pinfo">
      <div class="pbox ${pr.blocker ? 'bad' : 'ok'}"><div class="pt">${pr.blocker ? 'Blocker' : 'Where we are'}</div>${pr.blocker ? `<b>${esc(pr.blocker.label)}</b><div class="clamp2">${esc(pr.blocker.text || '')}</div>` : cur ? `<b>${esc(cur.label)}</b> <span class="pill t-acc">${statusTxt[cur.status]}</span><div class="small muted clamp2">${esc(cur.detail || '')}</div>` : `<b>All steps done</b><div class="small muted">stage ${esc(pr.stage)}</div>`}</div>
      <div class="pbox"><div class="pt">Top fixes to the gate${pr.gaps_total > 3 ? ` <span class="dim">(${pr.gaps_total})</span>` : ''}</div>${g3.length ? g3.map(x => `<div class="gap" title="${esc([x.source, x.item, x.now != null || x.needed != null ? `${x.now ?? '?'}→${x.needed ?? '?'}` : '', x.fix, x.points != null ? '+' + x.points : '', x.owner ? '[' + x.owner + ']' : ''].filter(Boolean).join(' · '))}"><span class="mono dim">${esc(x.source)}</span> ${x.item ? `<b>${esc(x.item)}</b>${x.now != null || x.needed != null ? ` <span class="dim">${esc(x.now ?? '?')}→${esc(x.needed ?? '?')}</span>` : ''}: ` : ''}<span dir="auto">${esc(x.fix || '')}</span>${x.points != null ? ` <span class="pts">+${esc(x.points)}</span>` : ''}</div>`).join('') : '<div class="dim small">No gap_to_gate items open</div>'}</div>
      <div class="pbox nx"><div class="pt">Next step</div>${nx ? `<b>${esc(nx.label)}</b><div class="small"><span class="pill">${esc(nx.agent)}</span></div><div class="cmd"><code>${esc(nx.command)}</code><button class="ghost sm" data-act="copy" data-v="${esc(nx.command)}" title="Copy command">copy</button></div>` : '<div class="dim small">—</div>'}</div>
    </div></div>`;
}

const tileProgress = w => { if (!w || !w.total) return ''; const pct = Math.round(w.done / w.total * 100), c = w.current;
  return `<div class="tbar" title="${w.done}/${w.total} steps · ${esc(w.legacy || w.version)}"><i style="width:${pct}%"></i></div>${c ? `<div class="tcur s-${esc(c.status)}"><i></i><span class="trunc">${esc(c.label)}</span><span class="right dim">${w.done}/${w.total}</span></div>` : ''}`; };

/** Side drawer with one step's rules, gate, artifacts and (with a production) its live status. */
async function openStep(id) {
  const wf = await wfData().catch(() => null); if (!wf) return;
  const ctx = WFC || {}, ver = wf.versions.find(v => v.id === (ctx.prog?.workflow || ctx.ver)) || wf.versions.find(v => v.id === wf.current);
  const d = sdef(wf, ver, id), s = ctx.prog?.steps?.find(x => x.id === id), gv = wf.gate_values || {};
  const inV = wf.versions.filter(v => v.steps.includes(id)).map(v => v.id);
  const gates = [d.gate, d.gate2].filter(Boolean).map(k => { const m = wf.gates_meta?.[k] || {}; return `<div class="row"><span class="gdw"><span class="gd">${esc((OPS[m.op] ?? '') + gv[k])}</span></span><b>${esc(m.label || k)}</b><span class="mono dim">${esc(k)}</span><div class="small muted" style="flex-basis:100%">${esc(m.where || '')}</div></div>`; }).join('');
  const lp = (ver.loops || []).find(l => l.steps.includes(id));
  const pv = ctx.prog, subst = t => pv ? String(t).replaceAll('<id>', pv.id).replaceAll('<brand>', pv.brand).replaceAll('<showrunner>', 'showrunner-' + pv.brand).replaceAll('v<N>', pv.latest_version ? 'v' + pv.latest_version : 'v<N>') : String(t);
  const nxt = d.next ? `<div class="cmd"><code>${esc(subst(d.next.command))}</code><button class="ghost sm" data-act="copy" data-v="${esc(subst(d.next.command))}">copy</button></div><div class="small muted">by ${esc(subst(d.next.agent))}</div>` : '';
  const fileUrl = s?.file && ctx.prog ? `/media/productions/${encodeURIComponent(ctx.prog.id)}/${s.file.split('/').map(encodeURIComponent).join('/')}` : null;
  const dr = $('#drawer');
  dr.innerHTML = `<header><span class="bdot" style="--c:${laneC(wf, d.lane)}"></span><b class="trunc" style="flex:1">${esc(d.label)}</b><span class="pill">${esc(ver.id)}</span><button class="ghost sm" data-act="drawer-close" title="Close (Esc)">${ic('x')}</button></header>
  <div class="body wfdr">
    <div class="row small muted" style="margin-bottom:8px">lane <b style="color:${laneC(wf, d.lane)}">${esc(wf.lanes.find(l => l.id === d.lane)?.label || d.lane)}</b>${lp ? ` · inside <b>${esc(lp.label)}</b>${lp.max_gate ? ` (≤ ${esc(gv[lp.max_gate])})` : ''}` : ''} · in ${inV.map(v => `<span class="pill ${v === ver.id ? 't-acc' : ''}">${esc(v)}</span>`).join(' ')}</div>
    ${s ? `<div class="card wfst s-${esc(s.status)}"><div class="h">${esc(ctx.prog.id)} <span class="pill">${statusTxt[s.status]}</span></div>${s.score != null ? `<div class="big">${esc(s.score)}${typeof s.gate === 'number' ? `<small> / gate ${esc(s.gate)}</small>` : ''}</div>` : ''}${s.detail ? `<div>${esc(s.detail)}</div>` : ''}${s.file ? `<div class="small mono" style="margin-top:4px">${fileUrl && /\.json$/.test(s.file) ? `<a href="${esc(fileUrl)}" target="_blank" rel="noopener">${esc(s.file)} ${ic('ext')}</a>` : esc(s.file)}</div>` : ''}</div>` : ''}
    <div class="h2">Agents</div><div class="row">${(d.agents || []).map(a => `<span class="pill t-info">${esc(a)}</span>`).join('')}</div>
    <div class="h2">Produces</div>${(d.artifacts || []).map(a => `<div class="mono small">${esc(a)}</div>`).join('') || '<div class="dim small">—</div>'}
    <div class="h2">Gate</div>${gates || (d.soft_gate ? `<div class="small"><b>${esc(wf.soft_gates[d.soft_gate])}</b> ${esc(d.soft_gate)} (playbook bar, not enforced in code)</div>` : '')}${d.gate_text ? `<div class="small">◇ ${esc(d.gate_text)}</div>` : ''}${!gates && !d.soft_gate && !d.gate_text ? '<div class="dim small">No gate on this step</div>' : ''}
    <div class="h2">Rules</div><ul class="ins-ul">${(d.rules || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <div class="h2">Doc</div><div class="mono small">${esc(d.doc || '—')}</div>
    ${nxt ? `<div class="h2">Run it</div>${nxt}` : ''}
  </div>`;
  dr.classList.add('on'); $('#scrim').classList.add('on');
  if (WFC) { WFC.sel = id; paint(); }
}

V.workflow = {
  title: 'Workflow & rules',
  load: async id => {
    const [wf, prog] = await Promise.all([wfData(true), id ? api('/api/productions/' + encodeURIComponent(id) + '/progress') : null, G.prods.length ? null : loadShared()]);
    return { wf, prog };
  },
  live: (e, id) => id ? e.production_id === id && e.kind !== 'render.progress' : false,
  tools: (d, id) => { const open = G.prods.filter(p => !['scheduled', 'published', 'analytics', 'rejected'].includes(p.current_state));
    return `<label class="small muted">Live production</label><select data-change="wfprod" aria-label="Live production"><option value="">— versions view —</option>${open.map(p => `<option value="${esc(p.production_id)}"${p.production_id === id ? ' selected' : ''}>${esc(p.production_id)} · ${esc(p.current_state)} · ${esc(String(p.title || '').slice(0, 40))}</option>`).join('')}${id && !open.some(p => p.production_id === id) ? `<option value="${esc(id)}" selected>${esc(id)}</option>` : ''}</select>${id ? `<a class="btn" href="#review/${esc(id)}">${ic('play')} Review</a><a class="btn" href="#workflow">All versions</a>` : ''}`; },
  html: ({ wf, prog }, id) => {
    const s = st('wf', { ver: wf.current, cmp: false, base: '' });
    if (!wf.versions.some(v => v.id === s.ver)) s.ver = wf.current;
    if (prog?.error) return `<div class="empty">${esc(prog.error)}</div>`;
    const vi = id ? wf.versions.findIndex(v => v.id === prog.workflow) : wf.versions.findIndex(v => v.id === s.ver);
    const ver = wf.versions[vi], prevV = wf.versions[vi - 1];
    const base = !id && s.cmp ? (wf.versions.find(v => v.id === s.base && v.id !== ver.id) || prevV || null) : null;
    WFC = { ver: ver.id, prog: prog || null, sel: WFC?.sel };
    const gv = wf.gate_values || {};
    const vchips = wf.versions.map(v => `<span class="vchip ${v.id === ver.id ? 'on' : ''} ${base && v.id === base.id ? 'base' : ''}" ${id ? '' : `data-set="wf.ver" data-v="${esc(v.id)}"`} data-k="vc-${esc(v.id)}" title="${esc(v.changed.join(' · '))}">${v.id === wf.current ? '<span class="cur">CURRENT</span>' : ''}<b>${esc(v.id)} <span class="vt">${esc(v.title)}</span></b><small>${esc(v.date)} · ${v.steps.length} steps</small></span>`).join('<span class="varr">›</span>');
    const cmpBar = id ? '' : `<span class="chip ${s.cmp ? 'on' : ''}" data-set="wf.cmp" data-v="${s.cmp ? '' : '1'}" title="Highlight what changed against another version">${s.cmp ? '✓ ' : ''}Compare</span>${s.cmp ? `<span class="small muted">vs</span>${chips('wf.base', base?.id, wf.versions.filter(v => v.id !== ver.id).map(v => [v.id, esc(v.id)]))}` : ''}`;
    const diff = base ? (() => { const add = ver.steps.filter(x => !base.steps.includes(x)), rem = base.steps.filter(x => !ver.steps.includes(x));
      return `<div class="small" style="margin-top:6px"><span class="pill t-ok">+${add.length} new</span> ${add.map(x => esc(sdef(wf, ver, x).label)).join(', ') || '—'} <span class="pill t-bad" style="margin-left:8px">−${rem.length} removed</span> ${rem.map(x => esc(sdef(wf, base, x).label)).join(', ') || '—'}</div>`; })() : '';
    const rules = Object.entries(gv).map(([k, v]) => { const m = wf.gates_meta?.[k] || {}; return `<tr data-k="g-${esc(k)}"><td><span class="gdw"><span class="gd">${esc((OPS[m.op] ?? '') + v)}</span></span></td><td><b>${esc(m.label || k)}</b><div class="mono dim">${esc(k)}</div></td><td class="small muted">${esc(m.where || '')}</td><td class="mono small dim">${esc(m.doc || '')}</td></tr>`; }).join('')
      + Object.entries(wf.gate_brand_overrides || {}).flatMap(([b, o]) => Object.entries(o).map(([k, v]) => { const m = wf.gates_meta?.[k] || {}; return `<tr data-k="g-${esc(b)}-${esc(k)}"><td><span class="gdw"><span class="gd">${esc((OPS[m.op] ?? '') + v)}</span></span></td><td><b>${esc(m.label || k)} · ${esc(b)}</b><div class="mono dim">${esc(k)} (brand override)</div></td><td class="small muted">brand ${esc(b)} only; other brands ${esc(gv[k])}</td><td class="mono small dim">config/gates.json brand_overrides</td></tr>`; })).join('')
      + Object.entries(wf.soft_gates || {}).map(([k, v]) => `<tr><td><span class="gdw soft"><span class="gd">${esc(v)}</span></span></td><td><b>${esc(k)}</b><div class="mono dim">soft</div></td><td class="small muted">playbook bar, not enforced in code</td><td class="mono small dim">docs/packaging-playbook.md</td></tr>`).join('');
    const legend = `<div class="legend wfleg">${['done', 'active', 'blocked', 'todo', 'skipped', 'na'].map(k => `<span><i class="lg s-${k}"></i>${statusTxt[k]}</span>`).join('')}<span><span class="gdw"><span class="gd">≥85</span></span>gate (config/gates.json)</span><span><i class="lg loopi"></i>loop (max rounds)</span>${base ? '<span><i class="lg cmp-add"></i>new</span><span><i class="lg cmp-rem"></i>removed</span><span><i class="lg cmp-chg"></i>changed</span>' : ''}</div>`;
    return `${prog ? pipeStrip(prog, { diagramLink: false }) : ''}
      <div class="wfvers" data-k="wfvers">${vchips}</div>
      <div class="row" style="margin:8px 0">${cmpBar}<span class="right">${legend}</span></div>${diff}
      <div class="card wfwrap" data-k="wfwrap">${wfDiagram(wf, ver, { prog, base })}</div>
      <div class="grid wfgrid" style="margin-top:12px">
        <div class="card"><div class="h">What changed in ${esc(ver.id)} <span class="r small muted">${esc(ver.date)} · ${esc(ver.title)}</span></div><ul class="ins-ul">${ver.changed.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          <div class="h" style="margin-top:10px">History</div><div class="vhist">${wf.versions.slice().reverse().map(v => `<div class="${v.id === ver.id ? 'on' : ''}"><b>${esc(v.id)}</b> <span class="dim">${esc(v.date)}</span> ${esc(v.title)}</div>`).join('')}</div></div>
        <div class="card" style="padding:0"><div class="h" style="padding:10px 12px 0">Rules · gates <span class="r small muted">config/gates.json (single source) · packages/shared/src/gates.ts</span></div><div class="tablewrap"><table class="dense gtab">${rules}</table></div></div>
      </div>`;
  },
};

/* ---------- router + soft refresh ---------- */
const ALIAS = { '': 'dashboard', overview: 'dashboard' };
function curView() { const h = location.hash.slice(1).split('?')[0], [v0, ...rest] = h.split('/'), v = ALIAS[v0] ?? v0; return { view: V[v] ? v : 'dashboard', arg: rest.join('/') ? decodeURIComponent(rest.join('/')) : undefined }; }
let cache = null, cacheFor = '', loading = null;
function paint() {
  const { view, arg } = curView(), Vw = V[view];
  if (!cache || cacheFor !== location.hash) return;
  const title = view === 'channel' ? brandName(arg || G.brandList[0]?.id) : view === 'review' && arg ? 'Review' : Vw.title;
  const sub = view === 'review' && arg ? '' : view === 'calendar' ? '' : '';
  let body; try { body = Vw.html(cache, arg); } catch (e) { console.error(e); body = `<div class="empty">Could not draw this view: ${esc(e.message)}</div>`; }
  morph($('#main'), `<div class="top" data-k="top-${esc(view)}"><button class="ghost sm mobile-only" data-act="feed-toggle" title="Live activity">${ic('pulse')}</button><h1 dir="auto">${esc(title)}</h1>${sub}<div class="tools">${Vw.tools ? Vw.tools(cache, arg) : ''}</div></div><div class="page" data-k="page-${esc(location.hash.split('?')[0])}">${body}</div>`);
}
async function refresh(soft) {
  const { view, arg } = curView(), h = location.hash;
  if (!soft) { renderNav(); cache = null; morph($('#main'), `<div class="top"><h1>${esc(V[view].title)}</h1></div><div class="page view-enter" data-k="loading"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:70%"></div></div>`); }
  const p = (async () => V[view].load(arg))();
  loading = p;
  try {
    const d = await p;
    if (loading !== p || h !== location.hash) return;                  // a newer navigation won
    const first = cacheFor !== h; cache = d; cacheFor = h; paint();
    if (first) { $('#main').scrollTop = 0; $('.page')?.classList.add('view-enter'); }
  } catch (e) { if (h === location.hash) morph($('#main'), `<div class="page"><div class="empty">Could not load: ${esc(e.message)} <button data-act="reload">Retry</button></div></div>`); }
  renderNav();
}
let lastHashView = '';
window.addEventListener('hashchange', () => { closeDrawer(); if ($('#main').contains(document.activeElement)) document.activeElement.blur(); const v = location.hash.split('?')[0]; if (v !== lastHashView) { lastHashView = v; cacheFor = ''; delete S.rvSel; refresh(false); } else refresh(true); });

// Live refresh: only when an event matters to this view, debounced, never while a dialog is open.
let rt = null, lastRefresh = 0;
function scheduleRefresh() {
  if (rt) return;                                                    // throttle, not debounce: a busy stream must not starve refreshes
  const wait = Math.max(800, 3000 - (Date.now() - lastRefresh));
  rt = setTimeout(() => { rt = null; if ($('#dlg').open) return scheduleRefresh(); lastRefresh = Date.now(); refresh(true); }, wait);
}

/* ---------- drawer (production / source preview) ---------- */
async function openDrawer(id) {
  const dr = $('#drawer'); dr.innerHTML = `<header><b>Loading…</b><button class="ghost sm right" data-act="drawer-close">${ic('x')}</button></header><div class="body"><div class="skel"></div><div class="skel" style="width:60%"></div></div>`;
  dr.classList.add('on'); $('#scrim').classList.add('on');
  try {
    const p = await api('/api/productions/' + encodeURIComponent(id)), vs = playable(p), r = p.reviews[0], pub = p.publishing.find(x => x.metadata?.url);
    dr.innerHTML = `<header><span class="bdot" style="${bc(p.brand_id)}"></span><b class="trunc" style="flex:1" dir="auto">${esc(p.title)}</b><button class="ghost sm" data-act="drawer-close" title="Close (Esc)">${ic('x')}</button></header>
    <div class="body"><div class="row" style="margin-bottom:10px">${brandTag(p.brand_id)}${pill(p.current_state)}${r ? `QA ${score(r.score)} ${pill(r.verdict)}` : ''}<span class="mono dim">${esc(p.production_id)}</span></div>
    ${vs[0] ? playerHtml(p, vs[0].n, 'd') : '<div class="empty">No render yet</div>'}
    <div class="list-tight" style="margin-top:10px">${(p.slots || []).map(sl => `<div class="row">${ic('cal')}<b>${esc(toDate(sl.slot_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</b>${pill(sl.status)}</div>`).join('')}
      ${r ? `<div class="small">${esc(r.summary)}</div>` : ''}</div>
    <div class="row" style="margin-top:12px"><a class="btn primary" href="#review/${esc(p.production_id)}">Open full review</a>${pub ? `<a class="btn" href="${safeUrl(pub.metadata.url)}" target="_blank" rel="noopener">${ic('yt')} YouTube</a>` : ''}${vs[0] ? `<a class="btn" href="${esc(mediaUrl(vs[0].render_path))}" download>Download</a>` : ''}</div></div>`;
  } catch (e) { dr.querySelector('.body').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
async function openSource(id) {
  const dr = $('#drawer'); dr.classList.add('on'); $('#scrim').classList.add('on'); dr.innerHTML = `<header><b>Loading…</b></header><div class="body"><div class="skel"></div></div>`;
  try {
    const s = await api('/api/sources/' + encodeURIComponent(id));
    const sheets = (s.analysis?.contact_sheets || []).map(f => `<img class="sheet" loading="lazy" src="/media/cache/${esc(s.fingerprint)}/${esc(f)}" alt="">`).join('');
    dr.innerHTML = `<header><b class="trunc" style="flex:1" dir="auto">${esc(s.title)}</b><button class="ghost sm" data-act="drawer-close">${ic('x')}</button></header><div class="body">
    <div class="row">${pill(s.permission_status)}<span class="small muted">${esc(s.license)} · ${esc(s.creator)} · ${dur(s.duration)} · ${num(s.view_count)} views</span></div>
    <p><a href="${safeUrl(s.original_url)}" target="_blank" rel="noopener" class="small">${esc(s.original_url)} ${ic('ext')}</a></p>
    <div class="h" style="margin-top:12px;font-size:12px;color:var(--mute)">CONDITIONS</div>${(s.usage_restrictions || []).map(c => `<div class="small">• ${esc(c)}</div>`).join('') || '<div class="muted small">None recorded</div>'}
    <form class="card" style="margin-top:12px" data-form="rights" data-id="${esc(s.asset_id)}"><div class="h">Rights decision</div>
      <div class="col"><select name="status">${['approved', 'approved_with_conditions', 'pending', 'research_only', 'rejected'].map(r => `<option value="${r}"${r === s.permission_status ? ' selected' : ''}>${r.replace(/_/g, ' ')}</option>`).join('')}</select>
      <input name="reason" placeholder="Reason"><input name="evidence" placeholder="Evidence URL (required to approve)" value="${esc(s.permission_evidence || '')}"><button class="primary" type="submit">Save decision</button></div></form>
    <details style="margin-top:12px"><summary>Rights log (${s.rights_log.length})</summary><div class="list-tight small">${s.rights_log.map(l => `<div><span class="dim">${esc(l.ts)}</span> ${esc(l.actor)}: ${esc(l.from_status)} → <b>${esc(l.to_status)}</b><div class="muted">${esc(l.reason)}${l.evidence ? ` · <a href="${safeUrl(l.evidence)}" target="_blank" rel="noopener">evidence</a>` : ''}</div></div>`).join('')}</div></details>
    ${sheets ? `<details style="margin-top:8px"><summary>Scene contact sheets</summary>${sheets}</details>` : ''}
    ${s.candidates.length ? `<details style="margin-top:8px"><summary>Candidates (${s.candidates.length})</summary>${candTable(s.candidates)}</details>` : ''}
    <details style="margin-top:8px"><summary>Description</summary><pre class="small" style="white-space:pre-wrap">${esc(s.description)}</pre></details></div>`;
  } catch (e) { dr.innerHTML = `<header><b>Error</b><button class="ghost sm right" data-act="drawer-close">${ic('x')}</button></header><div class="body"><div class="empty">${esc(e.message)}</div></div>`; }
}
function closeDrawer() { const dr = $('#drawer'); if (WFC?.sel) { WFC.sel = null; paint(); } if (!dr.classList.contains('on')) return; dr.querySelectorAll('video').forEach(v => v.pause()); dr.classList.remove('on'); $('#scrim').classList.remove('on'); setTimeout(() => { if (!dr.classList.contains('on')) dr.innerHTML = ''; }, 300); }

/* ---------- dialog ---------- */
function ask({ title, text, field, okLabel = 'Confirm', tone = 'primary', required }) {
  return new Promise(res => {
    const d = $('#dlg'), f = $('#dlgForm');
    f.innerHTML = `<h3>${esc(title)}</h3><div class="small muted">${esc(text || '')}</div>${field ? `<textarea name="note" placeholder="${esc(field)}"${required ? ' required' : ''}></textarea>` : '<div style="height:12px"></div>'}
      <div class="row"><span class="right"></span><button value="cancel" formnovalidate>Cancel</button><button class="${tone}" value="ok">${esc(okLabel)}</button></div>`;
    d.onclose = () => res(d.returnValue === 'ok' ? { note: f.note?.value.trim() || '' } : null);
    d.returnValue = ''; d.showModal(); (f.note || f.querySelector('button.' + tone))?.focus();
  });
}
const DECIDE = {
  approve: { title: 'Approve this video?', text: 'Approval needs a passing independent QA review. The video becomes ready to schedule.', field: 'Optional note', okLabel: 'Approve', tone: 'ok' },
  revise: { title: 'Request a revision', text: 'Moves the production back to editing. Tell the showrunner what should change.', field: 'What should change?', okLabel: 'Send back', tone: 'primary', required: true },
  reject: { title: 'Reject this production?', text: 'It leaves the pipeline. Say why so the agents learn from it.', field: 'Why reject?', okLabel: 'Reject', tone: 'bad', required: true },
};

/* ---------- events (delegated) ---------- */
function setPath(path, v) { const ks = path.split('.'); let o = S; for (const k of ks.slice(0, -1)) o = (o[k] ??= {}); o[ks.at(-1)] = v; saveS(); }
document.addEventListener('click', async e => {
  const xpe = e.target.closest('[data-xp]'); if (xpe && !e.target.closest('a')) { xpe.classList.toggle('open'); return; }
  const t = e.target.closest('[data-stop]'); if (t) return e.stopPropagation();
  const set = e.target.closest('[data-set]');
  if (set) {
    let v = set.dataset.v; if (set.hasAttribute('data-num')) v = Number(v); if (v === '1' && set.dataset.set.includes('.more.')) v = true;
    setPath(set.dataset.set, v);
    if (set.dataset.week) { const d = new Date(set.dataset.week + 'T12:00'); const w = Math.round((startOfWeek(d) - startOfWeek(new Date())) / 6048e5); S.cal.off = w; saveS(); }
    if (set.hasAttribute('data-reload') || set.dataset.week) { if (set.dataset.set === 'cal.mode') { S.cal.off = set.dataset.week ? S.cal.off : 0; saveS(); } return refresh(true); }
    return paint();
  }
  const a = e.target.closest('[data-act]');
  if (a) {
    const k = a.dataset.act;
    if (k === 'feed-toggle') { feedOpen = !feedOpen; LS.set('feedOpen', feedOpen); applyFeed(); }
    else if (k === 'drawer-close') closeDrawer();
    else if (k === 'reload') refresh(false);
    else if (k === 'cal') { const s = st('cal', { mode: 'week', off: 0 }); s.off = a.dataset.v === '0' ? 0 : s.off + Number(a.dataset.v); saveS(); refresh(true); }
    else if (k === 'copy') { try { await navigator.clipboard.writeText(a.dataset.v); toast('Copied'); } catch { toast('Copy failed', true); } }
    else if (k === 'post') { a.disabled = true; await act(a.dataset.p, JSON.parse(a.dataset.b || '{}')); a.disabled = false; }
    else if (k === 'decide') {
      const d = a.dataset.d, r = await ask(DECIDE[d]); if (!r) return;
      await act(`/api/productions/${encodeURIComponent(a.dataset.id)}/decision`, { decision: d, note: r.note || undefined }, d === 'approve' ? 'Approved' : d === 'reject' ? 'Rejected' : 'Revision requested');
    }
    return;
  }
  const wst = e.target.closest('[data-wfstep]'); if (wst && !e.target.closest('a')) return openStep(wst.dataset.wfstep);
  const op = e.target.closest('[data-open]'); if (op && op.dataset.open && !e.target.closest('a')) { e.preventDefault(); return openDrawer(op.dataset.open); }
  const src = e.target.closest('[data-src]'); if (src && !e.target.closest('a,button')) return openSource(src.dataset.src);
  const go = e.target.closest('[data-go]'); if (go && !e.target.closest('a,button:not([data-go])')) location.hash = go.dataset.go;
});
let it = null;
document.addEventListener('input', e => { const m = e.target.closest('[data-model]'); if (!m) return; setPath(m.dataset.model, m.type === 'checkbox' ? m.checked : m.value); clearTimeout(it); it = setTimeout(paint, m.type === 'checkbox' ? 0 : 140); });
document.addEventListener('change', async e => {
  const c = e.target.closest('[data-change="account"]'); if (c) await act(`/api/accounts/${encodeURIComponent(c.dataset.id)}`, { status: c.value });
  const w = e.target.closest('[data-change="wfprod"]'); if (w) location.hash = w.value ? 'workflow/' + encodeURIComponent(w.value) : 'workflow';
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const fd = Object.fromEntries(new FormData(f));
  if (f.dataset.form === 'assets') location.hash = 'assets?' + new URLSearchParams(Object.entries(fd).filter(x => x[1]));
  if (f.dataset.form === 'rights') { if (await act(`/api/sources/${encodeURIComponent(f.dataset.id)}/rights`, { status: fd.status, reason: fd.reason, evidence: fd.evidence || undefined }, 'Rights saved')) openSource(f.dataset.id); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#dlg').open) closeDrawer();
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || $('#dlg').open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { const i = $('.top input'); if (i) { e.preventDefault(); i.focus(); } }
  const { view, arg } = curView();
  if (view === 'review' && arg && (e.key === 'j' || e.key === 'k')) { let L = reviewNav(); if (!L.some(p => p.production_id === arg)) L = G.prods; const i = L.findIndex(p => p.production_id === arg), n = L[i + (e.key === 'j' ? 1 : -1)]; if (n) location.hash = 'review/' + n.production_id; }
});

/* ---------- live feed ---------- */
let feedOpen = LS.get('feedOpen', innerWidth > 1500), feedTab = LS.get('feedTab', 'key'), unread = 0, ft = null;
function applyFeed() { $('#feedPanel').classList.toggle('closed', !feedOpen); if (feedOpen) unread = 0; renderFeed(); }
function groupFeed() {
  const evs = G.events.filter(e => feedTab === 'all' ? true : feedTab === 'problems' ? e.level === 'error' || e.level === 'warn' : !QUIET.has(e.kind) || e.level === 'error');
  const out = [];
  for (const e of evs) {
    const g = out.at(-1);
    if (g && QUIET.has(e.kind) && QUIET.has(g.e.kind) && g.e.agent === e.agent && g.e.production_id === e.production_id && g.e.kind === e.kind) { g.n++; continue; }
    out.push({ e, n: 1 });
  }
  return out.slice(0, 150);
}
function renderFeed() {
  const u = $('#unread'); u.hidden = feedOpen || !unread; u.textContent = unread > 99 ? '99+' : unread;
  morph($('#ftabs'), [['key', 'Key'], ['all', 'Everything'], ['problems', 'Problems']].map(([k, l]) => `<button class="sm ${feedTab === k ? 'on' : ''}" data-feedtab="${k}">${l}</button>`).join(''));
  if (!feedOpen) return;
  morph($('#feed'), groupFeed().map(({ e, n }) => `<div class="ev ${esc(e.level)}${Date.now() - new Date(e.ts) < 4000 ? ' fresh' : ''}" data-k="f${e.id}"${e.production_id ? ` data-open="${esc(e.production_id)}" title="Preview ${esc(e.production_id)}"` : ''}><i></i><div style="min-width:0">
    <div class="meta"><span>${esc(new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</span>${e.agent ? `<b>${esc(e.agent)}</b>` : ''}${n > 1 ? `<span class="cnt">×${n}</span>` : ''}</div>
    <div class="msg">${esc(e.message)}</div></div></div>`).join('') || '<div class="dim small" style="padding:10px">Quiet for now.</div>');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-feedtab]'); if (b) { feedTab = b.dataset.feedtab; LS.set('feedTab', feedTab); renderFeed(); } });
function onEvent(e) {
  G.events.unshift(e); if (G.events.length > 600) G.events.length = 600;
  if (e.kind === 'render.progress' && e.production_id) { const m = /(\d+)%/.exec(e.message); if (m) G.progress[e.production_id] = { pct: +m[1], at: Date.now() }; }
  if (e.kind === 'preview.done' && e.production_id) { (S.rvSel ||= {})[e.production_id] = 'preview'; delete G.progress[e.production_id]; }
  if (!feedOpen && !QUIET.has(e.kind)) unread++;
  clearTimeout(ft); ft = setTimeout(renderFeed, 250);
  const { view, arg } = curView(), Vw = V[view];
  if (Vw.live?.(e, arg)) scheduleRefresh();
  else if (e.kind === 'render.progress' && (view === 'board' || (view === 'review' && arg === e.production_id))) { clearTimeout(pt); pt = setTimeout(paint, 300); }
  if (/^production\.|^review\.|^job/.test(e.kind)) { clearTimeout(nt); nt = setTimeout(() => loadShared().catch(() => {}), 5000); }
}
let pt = null, nt = null;

/* ---------- viral-rankings channel section (apps/studio/public/vr.js) ---------- */
installVr({ V, api, esc, pill, kpi, ic, st, S, saveS, toast, act, refresh, paint, ago, num });

/* ---------- live progress: re-fetch every 10 s while a production's review / workflow page is open (SSE events refresh sooner) ---------- */
setInterval(async () => {
  const { view, arg } = curView(); if (document.hidden || !arg || !['review', 'workflow'].includes(view) || !cache || cacheFor !== location.hash || $('#dlg').open) return;
  const h = location.hash;
  try { const pr = await api('/api/productions/' + encodeURIComponent(arg) + '/progress'); if (cacheFor === h && cache) { cache.prog = pr; paint(); } } catch {}
}, 10000);
let rzt = null; window.addEventListener('resize', () => { if (curView().view !== 'workflow') return; clearTimeout(rzt); rzt = setTimeout(paint, 150); });

/* ---------- boot ---------- */
delete S.rvSel;
applyFeed();
lastHashView = location.hash.split('?')[0];
loadShared().then(() => refresh(false)).catch(e => morph($('#main'), `<div class="page"><div class="empty">Studio API not reachable: ${esc(e.message)}</div></div>`));
api('/api/events?limit=120').then(evs => { G.events = evs; renderFeed(); }).catch(() => {});
const es = new EventSource('/api/stream');
const setLive = (on, t) => { const l = $('#live'); l.classList.toggle('on', on); l.querySelector('span').textContent = t; };
es.onopen = () => setLive(true, 'live');
es.onerror = () => setLive(false, 'reconnecting…');
es.onmessage = m => { try { onEvent(JSON.parse(m.data)); } catch (err) { console.error(err); } };
