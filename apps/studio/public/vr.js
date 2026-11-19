// Viral Rankings channel section (#vr/<tab>[/<id>]). Installed into the dashboard's view table by app.js; same helpers, same morph rendering.
// Rules: unknown metrics are shown as "unknown" (never 0); fixture snapshots always carry the TEST FIXTURE label.

export function install(X) {
  const { V, api, esc, pill, kpi, ic, st, S, saveS, toast, act, refresh, paint, ago, num } = X;
  const TABS = [['overview', 'Overview'], ['arena', 'Idea arena'], ['categories', 'Categories'], ['moments', 'Moments'], ['rank', 'Rank editor'], ['script', 'Script review'], ['lineage', 'Lineage'], ['learning', 'Learning']];
  const vs = () => st('vr', { fx: false, age: '7d', mq: '', rights: '', status: '', sort: 'fit', cat: '', page: 0, sel: null, catOpen: null, pass: null });
  const PAGE = 25;
  const unk = '<span class="unk">unknown</span>';
  const sec = ms => ms == null ? '—' : (ms / 1000).toFixed(1) + 's';
  const FX = '<span class="fxbadge" title="Invented numbers for acceptance test 12. Not real channel data.">TEST FIXTURE</span>';
  const FMT = { median_views: num, total_views: num, engaged_views: num, avg_pct_viewed: v => v.toFixed(1) + '%', stayed_to_watch: v => v.toFixed(1) + '%', normalized_perf: v => v.toFixed(2) + 'x',
    avg_view_duration: v => v.toFixed(1) + 's', likes_per_1k: v => v.toFixed(1), comments_per_1k: v => v.toFixed(1), subs_per_1k: v => v.toFixed(1), sample_size: v => String(v) };
  const mv = (k, v) => v == null ? unk : (FMT[k] || String)(v);
  const confPill = c => c == null ? unk : `<span class="pill ${{ none: 't-bad', low: 't-warn', medium: 't-info', high: 't-ok' }[c] || ''}">${esc(c)}</span>`;
  const rightsPill = r => `<span class="pill ${{ cleared: 't-ok', pending: 't-warn', blocked: 't-bad', unknown: '' }[r.state ?? r] || ''}" title="${r.state ? esc(`source: ${r.source_status ?? '-'} | moment: ${r.moment_status ?? 'inherits source'} | stricter wins`) : ''}">${esc(r.state ?? r)}</span>`;
  const scoreCell = v => v == null ? '<span class="dim">—</span>' : `<span class="score ${v >= 80 ? 'hi' : v >= 65 ? 'mid' : 'lo'}">${esc(v)}</span>`;
  const sub = (tab, label, id) => `<a class="chip ${tab === label ? 'on' : ''}" href="#vr/${label}${id ? '/' + encodeURIComponent(id) : ''}">${esc(TABS.find(t => t[0] === label)[1])}</a>`;
  const head = (tab, id, extra = '') => `<div class="row vr-tabs" data-k="vr-tabs">${TABS.map(t => sub(tab, t[0], ['rank', 'script', 'lineage'].includes(t[0]) ? (tab === t[0] ? id : S.vrLast?.[t[0]]) : '')).join('')}${extra}</div>`;
  const setChip = (key, cur, v, label, c) => `<span class="chip ${String(cur) === String(v) ? 'on' : ''}" data-set="vr.${key}" data-v="${esc(v)}" data-reload>${esc(label)}${c != null ? ` <span class="c">${c}</span>` : ''}</span>`;
  const bar = (n, tot, color = 'var(--acc)') => `<div class="bar" style="width:70px;display:inline-flex"><i style="width:${tot ? Math.min(100, n / tot * 100) : 0}%;background:${color}"></i></div>`;
  const invCells = i => `<td class="num">${i.total}</td><td class="num">${i.available}</td><td class="num">${i.rights_cleared}</td><td class="num">${i.rights_pending || '<span class="dim">0</span>'}</td><td class="num">${i.used || '<span class="dim">0</span>'}</td><td class="num">${i.recently_used || '<span class="dim">0</span>'}</td><td class="num">${i.unused_high_potential || '<span class="dim">0</span>'}</td>`;
  const INV_TH = '<th class="num" title="all moments">Moments</th><th class="num" title="usable and not a duplicate">Avail.</th><th class="num" title="source and moment both approved">Cleared</th><th class="num">Rights pend.</th><th class="num">Used</th><th class="num" title="approved/published in the last 30 days">Recent</th><th class="num" title="unused, cleared, fit >= 7">High pot.</th>';
  const remember = (tab, id) => { S.vrLast = { ...(S.vrLast || {}), ...(id ? { [tab]: id } : {}) }; };
  const parseArg = arg => { const [tab, ...r] = String(arg || 'overview').split('/'); return { tab: TABS.some(t => t[0] === tab) ? tab : 'overview', id: r.length ? decodeURIComponent(r.join('/')) : null }; };

  const V0 = { title: 'Viral Rankings' };
  V.vr = V0;
  V0.live = e => /^(category|moment|ranking|rights|idea)\./.test(e.kind) || /^production\./.test(e.kind);
  V0.tools = (c) => c?.tab === 'moments' ? `<label class="search">${ic('search')}<input data-vrq value="${esc(vs().mq)}" placeholder="Search moments, tags, sources…" aria-label="Search moments"></label>` : '';

  V0.load = async arg => {
    const { tab, id } = parseArg(arg), s = vs();
    if (['rank', 'script', 'lineage'].includes(tab)) {
      const prods = await api('/api/vr/productions');
      const pool = prods.filter(p => tab === 'rank' ? p.has_plan : tab === 'script' ? p.has_script : true);
      const pid = id || S.vrLast?.[tab] && pool.find(p => p.production_id === S.vrLast[tab])?.production_id || pool[0]?.production_id || null;
      if (pid) remember(tab, pid);
      const data = !pid ? null : await api(`/api/vr/${tab === 'rank' ? 'ranking/plans' : tab}/${encodeURIComponent(pid)}`).catch(e => ({ error: e.message }));
      return { tab, id: pid, pool, data };
    }
    if (tab === 'overview') return { tab, data: await api('/api/vr/overview') };
    if (tab === 'arena') return { tab, data: await api('/api/vr/ideas/arena') };
    if (tab === 'categories') return { tab, data: await api('/api/vr/categories?fixtures=' + (s.fx ? 1 : 0)) };
    if (tab === 'learning') return { tab, data: await api('/api/vr/learning?age=' + s.age) };
    if (tab === 'moments') {
      const q = new URLSearchParams({ limit: PAGE, cursor: s.page * PAGE, sort: s.sort });
      for (const k of ['rights', 'status']) if (s[k]) q.set(k, s[k]);
      if (s.mq) q.set('q', s.mq); if (s.cat) q.set('category', s.cat);
      const [list, cats, detail] = await Promise.all([api('/api/vr/moments?' + q), api('/api/vr/categories'), s.sel ? api('/api/vr/moments/' + encodeURIComponent(s.sel)).catch(() => null) : null]);
      return { tab, list, cats, detail };
    }
  };

  V0.html = c => {
    let body;
    try { body = ({ overview, arena, categories, moments, rank, script, lineage, learning })[c.tab](c); } catch (e) { console.error(e); body = `<div class="empty">Could not draw this view: ${esc(e.message)}</div>`; }
    if (c.data?.error && !['rank', 'script', 'lineage'].includes(c.tab)) body = `<div class="empty">${esc(c.data.error)}</div>`;
    return head(c.tab, c.id) + body;
  };

  /* ------------------------------------------------------------ 1. overview */
  function overview({ data: o }) {
    const t = o.inventory.total, a = o.analytics, stages = o.stage_counts.reduce((n, x) => n + x.n, 0) || 1;
    const SC = { idea: '#8d95aa', research: '#45b7ff', rights: '#5ec8e8', analysis: '#6aa8ff', script: '#9b8cff', editing: '#c48bff', qa: '#f5a524', approved: '#2fd27a', scheduled: '#45b7ff', published: '#20c997', rejected: '#ff5a5a' };
    return `<div class="kpis" style="margin-bottom:12px">${kpi(t.total, 'Moments in library')}${kpi(t.available, 'Available (status usable)', 'ok')}${kpi(t.rights_cleared, 'Rights cleared', 'ok')}${kpi(t.rights_pending, 'Rights pending', t.rights_pending ? 'warn' : '')}
      ${kpi(t.used, 'Used in productions')}${kpi(t.recently_used, 'Recently used (30d)')}${kpi(t.unused_high_potential, 'Unused high-potential', 'acc')}${kpi(o.ideas_in_progress.length, 'Ideas in progress', '', '#vr/arena')}</div>
    <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
      <div class="card"><div class="h">Ideas in progress <span class="r"><a href="#vr/arena">Idea arena</a></span></div>
        <div class="tablewrap" style="max-height:none"><table><tr><th>Idea</th><th class="num">Score</th><th>Judge</th><th>Status</th></tr>
        ${o.ideas_in_progress.map(i => `<tr data-k="${esc(i.idea_id)}"><td dir="auto">${esc(i.topic)}</td><td class="num">${scoreCell(i.opportunity_score)}</td><td class="small muted">${esc(i.decision || '—')}</td><td>${pill(i.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">None</td></tr>'}</table></div></div>
      <div class="card"><div class="h">Productions &amp; stages</div>
        <div class="stack">${o.stage_counts.map(x => `<i style="width:${x.n / stages * 100}%;background:${SC[x.stage] || '#666'}" title="${esc(x.stage)} ${x.n}"></i>`).join('')}</div>
        <div class="legend" style="margin:6px 0">${o.stage_counts.map(x => `<span><i style="background:${SC[x.stage] || '#666'}"></i>${esc(x.stage)} ${x.n}</span>`).join('') || '<span>none</span>'}</div>
        ${o.productions.map(p => `<div class="row small" data-k="${esc(p.production_id)}" style="padding:3px 0;border-top:1px solid var(--line)"><a class="mono" href="#vr/lineage/${esc(p.production_id)}">${esc(p.production_id)}</a>${pill(p.stage)}${p.fixture ? FX : ''}<span class="muted trunc" dir="auto">${esc(p.title)}</span>${p.plan ? `<a class="right" href="#vr/rank/${esc(p.production_id)}">plan</a>` : ''}</div>`).join('') || '<div class="muted small">No productions yet.</div>'}
        <div class="small muted" style="margin-top:6px">Publishing: ${o.publishing.length ? o.publishing.map(x => `${esc(x.status)} ${x.n}`).join(' · ') : 'nothing scheduled or published'}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);margin-top:12px">
      <div class="card"><div class="h">Moment inventory per category <span class="r"><a href="#vr/categories">Category explorer</a></span></div>
        <div class="tablewrap" style="max-height:none"><table><tr><th>Category</th>${INV_TH}</tr>
        ${o.inventory.top.map(c => `<tr data-k="${esc(c.id)}"><td><b dir="auto">${esc(c.title)}</b> <span class="dim small">${esc(c.rights_risk)} risk</span></td>${invCells(c)}</tr>${c.subs.filter(s => s.total).map(s => `<tr data-k="${esc(s.id)}"><td class="muted" style="padding-left:22px" dir="auto">${esc(s.title)}</td>${invCells(s)}</tr>`).join('')}`).join('')}
        ${o.inventory.uncategorised.total ? `<tr><td class="muted">Uncategorised</td>${invCells(o.inventory.uncategorised)}</tr>` : ''}</table></div></div>
      <div class="card"><div class="h">Analytics sync</div>
        <div class="list-tight small">
          <div>Real category snapshots: <b>${a.real_snapshots}</b>, last ${a.real_last ? ago(a.real_last) : unk}</div>
          <div>YouTube rows for this brand: <b>${a.youtube_rows}</b>, last ${a.youtube_last ? ago(a.youtube_last) : unk}</div>
          <div>${FX} snapshots: <b>${a.fixture_snapshots}</b>${a.fixture_last ? `, seeded ${ago(a.fixture_last)}` : ''} <span class="dim">(never counted above)</span></div></div>
        <div class="small muted" style="margin-top:6px">${esc(a.note)}</div></div></div>`;
  }

  /* ------------------------------------------------------------ 2. idea arena */
  function arena({ data: d }) {
    const byScout = {};
    for (const i of d.ideas) for (const m of i.merged_from) byScout[String(m).split(' ')[0]] = i;
    const sc = s => s ? ['creative', 'demand', 'feasibility', 'portfolio_fit', 'risk'].map(k => `<span class="sc ${k === 'risk' ? 'rk' : ''}" title="${k} ${s[k] ?? 'unknown'}"><b>${s[k] ?? '?'}</b>${k[0]}</span>`).join('') : unk;
    const card = i => { const m = byScout[i.id]; return `<div class="icard" data-k="${esc(i.id)}"><div class="row" style="flex-wrap:nowrap"><b dir="auto" style="flex:1">${esc(i.title)}</b>${m ? `<span class="pill t-acc" title="merged into ${esc(m.idea_id)}">→ ${esc(m.idea_id.split('-').pop().toUpperCase())}</span>` : '<span class="pill">not merged</span>'}</div>
      <div class="small muted">${esc([i.category, i.subcategory].filter(Boolean).join(' › '))} · ${esc(i.criterion || '')}</div><div class="scs">${sc(i.scores)}</div>
      <div class="small dim">${esc(i.format || '')}</div><div class="small">${i.confidence ? confPill(i.confidence) : ''} ${i.production_ready ? pill(i.production_ready) : ''} <span class="dim">evidence ${i.evidence_n} · candidates ${i.candidates_n}${i.usable_estimate ? ' · usable ' + esc(String(i.usable_estimate).slice(0, 40)) : ''}</span></div>
      ${i.gate_notes ? `<div class="small muted clamp2" title="${esc(i.gate_notes)}">${esc(i.gate_notes)}</div>` : ''}</div>`; };
    const j = d.judge, ranked = d.ideas.filter(i => i.status !== 'rejected' || i.judge?.total != null);
    const rejected = d.ideas.filter(i => i.status === 'rejected' && i.judge?.total == null);
    const row = (i, n) => `<tr data-k="${esc(i.idea_id)}"><td class="num dim">${n}</td><td dir="auto"><b>${esc(i.topic)}</b><div class="small dim">${esc(i.category || 'no category')} · from ${esc(i.merged_from.join(', ') || '—')}</div></td>
      <td class="scs">${sc(i.judge?.scores)}</td><td class="num">${scoreCell(i.judge?.total ?? i.score)}</td><td class="small muted" style="max-width:260px">${esc(i.judge?.decision || '—')}<div class="dim">${esc(i.judge?.gates || '')}</div></td>
      <td>${pill(i.status)}${i.overrides.length ? `<div class="small dim" title="${esc(i.overrides.map(o => `${o.at.slice(0, 10)} ${o.from}→${o.to}: ${o.reason}`).join('\n'))}">${i.overrides.length} override${i.overrides.length > 1 ? 's' : ''}</div>` : ''}</td>
      <td><div class="row" style="flex-wrap:nowrap;gap:4px"><select data-ovs="${esc(i.idea_id)}" aria-label="New status">${d.statuses.map(s => `<option${s === i.status ? ' selected' : ''}>${s}</option>`).join('')}</select><input data-ovr="${esc(i.idea_id)}" placeholder="Reason (required)" style="width:130px" aria-label="Override reason"><button class="sm" data-vr="override" data-id="${esc(i.idea_id)}">Set</button></div></td></tr>`;
    return `<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${d.scouts.map(s => `<div class="card"><div class="h">Scout ${esc(s.scout)} <span class="r dim">${s.ideas.length} proposals${s.lane ? ' · ' + esc(s.lane) : ''}</span></div><div class="col" style="max-height:520px;overflow:auto">${s.ideas.map(card).join('')}</div></div>`).join('') || '<div class="empty">No scout files in docs/brands/viral-rankings/ideas.</div>'}</div>
    ${j ? `<div class="grid g2" style="margin-top:12px"><div class="card"><div class="h">Judge decision <span class="r dim">${esc(j.judge)} · ${esc(j.decided_at)}</span></div>
      <div class="small"><b>Formula</b> <span class="mono">${esc(j.formula)}</span></div><div class="small muted" style="margin:4px 0">${esc(j.formula_note || '')}</div>
      ${j.pick ? `<div class="pickbox"><b>Pick: ${esc(j.pick.merged_id)} as ${esc(String(j.pick.format).toUpperCase())}</b><div class="small">${esc(j.pick.criterion || '')}</div><div class="small muted"><b>Why ${esc(j.pick.format)}:</b> ${esc(j.pick.why_top3_not_top5 || '')}</div>${(j.pick.hooks || []).map(h => `<div class="small" dir="auto">• ${esc(h)}</div>`).join('')}</div>` : ''}</div>
      <div class="card"><div class="h">Hard gates &amp; disagreements</div>${(j.hard_gates || []).map(g => `<div class="small">• ${esc(g)}</div>`).join('')}<div class="sep"></div>${(j.disagreements || []).map(g => `<div class="small muted">↔ ${esc(g)}</div>`).join('') || '<div class="muted small">None recorded</div>'}</div></div>` : '<div class="empty" style="margin-top:12px">No judge-decision.json yet.</div>'}
    <div class="card" style="margin-top:12px"><div class="h">Merged ideas, scores and manual override <span class="r dim">override = POST, recorded with reason; history is kept</span></div>
      <div class="tablewrap" style="max-height:none"><table><tr><th class="num">#</th><th>Idea</th><th>Scores <span class="dim" style="text-transform:none">c d f p r(isk)</span></th><th class="num">Total</th><th>Decision</th><th>Status</th><th>Override</th></tr>${ranked.map((i, n) => row(i, n + 1)).join('')}</table></div></div>
    <div class="card" style="margin-top:12px"><div class="h">Rejected ideas and why (${rejected.length}) <span class="r dim">rejected before scoring</span></div>
      ${rejected.map(i => `<div class="row small" data-k="${esc(i.idea_id)}" style="padding:4px 0;border-top:1px solid var(--line);flex-wrap:nowrap;align-items:flex-start"><b style="width:280px;flex:none" dir="auto">${esc(i.topic)}</b><span class="muted">${esc(i.judge?.decision || '')} <span class="dim">· ${esc(i.judge?.gates || '')}</span></span><button class="sm right" data-vr="reopen" data-id="${esc(i.idea_id)}" title="Set back to proposed (asks for a reason)">Reopen</button></div>`).join('') || '<div class="muted small">None</div>'}</div>`;
  }

  /* ------------------------------------------------------------ 3. category explorer */
  function categories({ data: d }) {
    const s = vs(), age = s.age;
    const mcell = (c, k) => { const m = c.metrics[age] || c.metrics[age + ':fx']; return m ? `<td class="num">${mv(k, m[k])}</td>` : '<td class="num dim">no data</td>'; };
    const snap = c => c.metrics[age] || c.metrics[age + ':fx'] || null;
    const row = (c, lvl) => { const m = snap(c), open = s.catOpen === c.id, warn = [];
      if (m) { if (m.sample_size == null) warn.push('sample size unknown'); else if (m.sample_size < 6) warn.push(`n=${m.sample_size} (<6)`); if (!m.confidence || ['none', 'low'].includes(m.confidence)) warn.push(`confidence ${m.confidence || 'unknown'}`); }
      return `<tr data-k="${esc(c.id)}" data-set="vr.catOpen" data-v="${open ? '' : esc(c.id)}" style="cursor:pointer"><td style="padding-left:${lvl ? 24 : 8}px" dir="auto">${lvl ? '<span class="dim">↳</span> ' : ''}<b>${esc(c.title)}</b> <span class="dim small">${esc(c.rights_risk)}</span>${m?.is_fixture ? ' ' + FX : ''}</td>
        <td class="num">${c.ideas}</td>${invCells(c.inventory)}${mcell(c, 'median_views')}${mcell(c, 'engaged_views')}${mcell(c, 'avg_pct_viewed')}${mcell(c, 'normalized_perf')}
        <td class="num">${m ? mv('sample_size', m.sample_size) : '<span class="dim">—</span>'}</td><td>${m ? confPill(m.confidence) : '<span class="dim">—</span>'}</td><td class="small">${warn.map(w => `<span class="pill t-warn" style="margin:1px">⚠ ${esc(w)}</span>`).join('') || (m ? '' : '<span class="dim">no data yet</span>')}</td></tr>`
      + (open ? `<tr class="detail" data-k="${esc(c.id)}-d"><td colspan="17"><div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div><div class="h2">Purpose</div><div class="small" dir="auto">${esc(c.purpose || '—')}</div><div class="small dim">${esc(c.audience_fit || '')}</div></div>
        <div><div class="h2">Keywords</div><div class="small">${c.keywords.map(esc).join(', ') || '—'}</div><div class="h2">Exclusions</div><div class="small">${c.exclusions.map(esc).join(', ') || '—'}</div></div>
        <div><div class="h2">Safety</div>${c.safety_constraints.map(x => `<div class="small">• ${esc(x)}</div>`).join('') || '<div class="small dim">—</div>'}</div>
        <div><div class="h2">Next experiments</div>${c.next_experiments.map(x => `<div class="small">• ${esc(x)}</div>`).join('') || '<div class="small dim">none recorded</div>'}<div class="small dim" style="margin-top:4px">Snapshots: ${c.snapshot_counts.real} real${c.snapshot_counts.fixture ? ` · ${c.snapshot_counts.fixture} test fixture` : ''}</div><a class="small" href="#vr/moments" data-vrcat="${esc(c.id)}">Open moments →</a></div></div></td></tr>` : ''); };
    return `<div class="row" style="margin-bottom:10px"><span class="muted small">Age cohort</span><div class="chips">${['24h', '72h', '7d', '28d'].map(a => setChip('age', age, a, a)).join('')}</div>
      <div class="chips" style="margin-left:12px">${`<span class="chip ${s.fx ? 'on' : ''}" data-set="vr.fx" data-v="${s.fx ? '' : '1'}" data-reload>${s.fx ? 'Hide' : 'Show'} TEST FIXTURE snapshots</span>`}</div>
      <span class="small muted right">Unknown = not measured; it is never shown as 0. n &lt; 6 or low confidence = directional only.</span></div>
    <div class="card" style="padding:0"><div class="tablewrap"><table class="dense"><tr><th>Category</th><th class="num">Ideas</th>${INV_TH}<th class="num">Median views</th><th class="num">Engaged views</th><th class="num">Avg % viewed</th><th class="num">Perf vs base</th><th class="num">n</th><th>Conf.</th><th>Warnings</th></tr>
      ${d.tree.map(c => row(c, 0) + c.children.map(k => row(k, 1)).join('')).join('')}
      ${d.uncategorised.total ? `<tr><td class="muted" style="padding-left:8px">Uncategorised moments</td><td></td>${invCells(d.uncategorised)}<td colspan="7"></td></tr>` : ''}</table></div></div>
    ${d.tree.every(c => !Object.keys(c.metrics).length && c.children.every(k => !Object.keys(k.metrics).length)) ? '<div class="small muted" style="margin-top:8px">No real analytics snapshots exist yet, so every metric is unknown. Toggle the TEST FIXTURE view to see the labelled demo numbers.</div>' : ''}`;
  }

  /* ------------------------------------------------------------ 4. moment library */
  function moments({ list, cats, detail }) {
    const s = vs(), from = s.page * PAGE + 1, to = s.page * PAGE + list.rows.length, flat = cats.tree.flatMap(c => [c, ...c.children]);
    const f = (key, opts) => `<div class="chips">${opts.map(([v, l, n]) => setChip(key, s[key], v, l, n)).join('')}</div>`;
    const rows = list.rows.map(m => `<tr data-k="${esc(m.moment_id)}" data-set="vr.sel" data-v="${esc(m.moment_id)}" data-reload class="${s.sel === m.moment_id ? 'sel' : ''}" style="cursor:pointer">
      <td style="width:74px"><img class="mth" loading="lazy" src="${esc(m.thumb)}" alt="" onerror="this.style.visibility='hidden'"></td>
      <td><div class="mono">${esc(m.moment_id)}</div><div class="small dim trunc" style="max-width:190px" title="${esc(m.source_title)}">${esc(m.source_title || m.source_id)}</div></td>
      <td class="mono" style="white-space:nowrap">${sec(m.start_ms)}–${sec(m.end_ms)}</td><td class="small clamp2" style="min-width:190px" dir="auto">${esc(m.description)}</td>
      <td class="num">${scoreCell(m.rank_suitability == null ? null : Math.round(m.rank_suitability * 10))}</td><td>${pill(m.creative_status)}</td><td>${rightsPill(m.rights)}</td><td class="num">${m.used ? '<span class="pill t-info">used</span>' : '<span class="dim">0</span>'}</td></tr>`).join('');
    const d = detail;
    return `<div class="row" style="margin-bottom:10px;gap:14px"><div class="row"><span class="muted small">Rights</span>${f('rights', [['', 'all'], ...list.facets.rights.map(x => [x.v, x.v, x.n])])}</div>
      <div class="row"><span class="muted small">Status</span>${f('status', [['', 'all'], ...list.facets.status.map(x => [x.v, x.v.replace(/_/g, ' '), x.n])])}</div>
      <div class="row"><span class="muted small">Sort</span>${f('sort', [['fit', 'best fit'], ['newest', 'newest'], ['source', 'by source'], ['length', 'longest']])}</div>
      <select data-vrcatsel aria-label="Category"><option value="">All categories</option>${flat.map(c => `<option value="${esc(c.id)}"${s.cat === c.id ? ' selected' : ''}>${c.parent_id ? '— ' : ''}${esc(c.title)}</option>`).join('')}</select></div>
    <div class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(330px,1fr);align-items:start">
      <div class="card" style="padding:0"><div class="tablewrap"><table class="dense"><tr><th></th><th>Moment</th><th>Window</th><th>Description</th><th class="num" title="rank suitability x10">Fit</th><th>Status</th><th>Rights</th><th class="num">Usage</th></tr>${rows || '<tr><td colspan="8" class="muted" style="padding:16px">No moments match.</td></tr>'}</table></div>
        <div class="row" style="padding:8px 12px;border-top:1px solid var(--line)"><span class="small muted">${list.total ? `${from}–${to} of ${list.total}` : '0'}</span><span class="right"></span>
          <button class="sm" ${s.page ? '' : 'disabled'} data-set="vr.page" data-v="${s.page - 1}" data-num data-reload>${ic('left')} Prev</button><button class="sm" ${list.next == null ? 'disabled' : ''} data-set="vr.page" data-v="${s.page + 1}" data-num data-reload>Next ${ic('right')}</button></div></div>
      <div class="card player-card">${d && !d.error ? momentDetail(d) : '<div class="empty">Select a moment to preview, scrub and inspect rights and usage.</div>'}</div></div>`;
  }
  function momentDetail(d) {
    const src = d.media_url ? `${d.media_url}#t=${(d.start_ms / 1000).toFixed(2)},${(d.end_ms / 1000).toFixed(2)}` : null;
    const strict = d.rights.state === 'cleared' ? 'Both source and moment approved.' : 'Blocked or pending: the stricter of source and moment wins.';
    return `<div class="h">${esc(d.moment_id)} <span class="r">${rightsPill(d.rights)}</span></div>
      ${src ? `<video controls preload="metadata" playsinline src="${esc(src)}" poster="${esc(d.thumb)}" data-k="vid-${esc(d.moment_id)}" style="width:100%;max-height:300px;background:#000;border-radius:10px"></video>
        <div class="row small" style="margin:4px 0"><button class="sm" data-vr="seek" data-t="${d.start_ms / 1000}" data-e="${d.end_ms / 1000}">▶ Play ${sec(d.start_ms)}–${sec(d.end_ms)}</button><button class="sm" data-vr="seek" data-t="0">Full source</button><span class="dim">window start ${sec(d.start_ms)}${d.payoff_ms != null ? ` · payoff ${sec(d.payoff_ms)}` : ''}</span></div>`
        : '<div class="empty small">No local media for this source (not acquired).</div>'}
      <div class="small" dir="auto" style="margin:6px 0">${esc(d.description)}</div>
      <div class="row small">${pill(d.creative_status)}${d.tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      <div class="sep"></div><div class="h2">Lineage</div>
      <div class="chainmini small"><span>${d.idea ? `Idea: <b dir="auto">${esc(d.idea.topic)}</b>` : `Idea: ${unk}`}</span> → <span>${d.category ? `Category: <b>${esc((d.category.parent_title ? d.category.parent_title + ' › ' : '') + d.category.title)}</b>` : `Category: ${unk}`}</span> → <span>Source: <b class="mono">${esc(d.source.asset_id)}</b></span> → <span>Moment ${sec(d.start_ms)}–${sec(d.end_ms)}</span> → <span>${d.usage.length ? [...new Set(d.usage.map(u => u.production_id))].map(p => `<a class="mono" href="#vr/lineage/${esc(p)}">${esc(p)}</a>`).join(', ') : 'no production yet'}</span></div>
      <div class="sep"></div><div class="h2">Rights</div>
      <div class="small">Source <b>${esc(d.source.status)}</b> (${esc(d.source.license || 'licence unknown')}) · moment <b>${esc(d.rights.moment_status || 'inherits source')}</b>. ${esc(strict)}</div>
      ${d.license_conditions.length ? d.license_conditions.map(c => `<div class="small">• ${esc(c)}</div>`).join('') : ''}
      ${d.source.license_expires ? `<div class="small warn">Licence expires ${esc(d.source.license_expires)}</div>` : ''}
      ${d.source.attribution ? `<div class="small muted" dir="auto">Credit: ${esc(d.source.attribution)}</div>` : ''}
      <div class="small">${d.source.original_url ? `<a href="${/^https?:/i.test(d.source.original_url) ? esc(d.source.original_url) : '#'}" target="_blank" rel="noopener">Original page ${ic('ext')}</a>` : unk}${d.source.evidence_url ? ` · <a href="${/^https?:/i.test(d.source.evidence_url) ? esc(d.source.evidence_url) : '#'}" target="_blank" rel="noopener">Rights evidence ${ic('ext')}</a>` : ''}</div>
      <details style="margin-top:6px"><summary>Rights log (${d.rights_log.length})</summary>${d.rights_log.map(l => `<div class="small"><span class="dim">${esc(l.ts)}</span> ${esc(l.actor)}: ${esc(l.from_status)} → <b>${esc(l.to_status)}</b> <span class="muted">${esc(l.reason || '')}</span></div>`).join('') || '<div class="small dim">none</div>'}</details>
      <div class="sep"></div><div class="h2">Usage history</div>
      ${d.usage.length ? `<table class="dense"><tr><th>Production</th><th>v</th><th>Status</th><th class="num">Rank</th><th class="num">Reveal</th><th>When</th></tr>${d.usage.map(u => `<tr><td><a class="mono" href="#vr/lineage/${esc(u.production_id)}">${esc(u.production_id)}</a></td><td>${esc(u.version ?? '—')}</td><td>${pill(u.status)}</td><td class="num">${u.rank_position ?? '—'}</td><td class="num">${u.reveal_index ?? '—'}</td><td class="small muted">${ago(u.updated_at)}</td></tr>`).join('')}</table>` : '<div class="small muted">Never used. Sibling moments on this source stay usable.</div>'}
      ${d.siblings.length ? `<div class="small muted" style="margin-top:6px">Other moments on this source: ${d.siblings.map(x => `<a href="#vr/moments" data-vrsel="${esc(x.moment_id)}" class="mono">${esc(x.moment_id.split('-').slice(-2).join('-'))}</a> ${sec(x.start_ms)}`).join(' · ')}</div>` : ''}
      ${d.sheets.length ? `<details style="margin-top:8px"><summary>Contact sheet</summary>${d.sheets.map(u => `<img class="sheet" loading="lazy" src="${esc(u)}" alt="contact sheet">`).join('')}</details>` : ''}`;
  }

  /* ------------------------------------------------------------ 5. rank editor */
  let DRAFT = null;                                         // {id, plan, report, dirty, busy}
  const sortedByReveal = p => [...p.entries].sort((a, b) => a.reveal_index - b.reveal_index);
  const renumber = (plan, ordered) => { ordered.forEach((e, i) => { e.reveal_index = i; }); plan.entries = ordered; plan.reveal_order = ordered.map(e => e.rank_position); };
  async function validateDraft() { if (!DRAFT) return; DRAFT.busy = true; paint(); try { DRAFT.report = await api('/api/vr/ranking/validate', { plan: DRAFT.plan }); } catch (e) { DRAFT.report = { valid: false, publishable: false, errors: [e.message], rights_blockers: [], warnings: [] }; } DRAFT.busy = false; paint(); }
  function rank({ id, pool, data }) {
    const picker = `<div class="row" style="margin-bottom:10px"><span class="muted small">Production</span><div class="chips">${pool.map(p => `<a class="chip ${p.production_id === id ? 'on' : ''}" href="#vr/rank/${esc(p.production_id)}">${esc(p.production_id)}${p.fixture ? ' <span class="c">fixture</span>' : ''}</a>`).join('') || '<span class="dim small">no ranking plans yet</span>'}</div></div>`;
    if (!id || !data) return picker + '<div class="empty">No RankingPlan (productions/&lt;id&gt;/plan.json) exists yet.</div>';
    if (data.error) return picker + `<div class="empty">${esc(data.error)}</div>`;
    if (!DRAFT || DRAFT.id !== id) DRAFT = { id, plan: JSON.parse(JSON.stringify(data.plan)), report: data.report, dirty: false, busy: false };
    const D = DRAFT, plan = D.plan, ord = sortedByReveal(plan), n = ord.length, M = Object.fromEntries(data.moments.map(m => [m.moment_id, m])), rep = D.report;
    const byRank = [...plan.entries].sort((a, b) => a.rank_position - b.rank_position);
    const slotCard = (e, i, mode) => { const m = M[e.moment_id] || {};
      return `<div class="slot2 ${mode}" data-k="${mode}-${esc(e.moment_id)}"><div class="rk">${mode === 'rv' ? `<small>reveal</small><b>${i + 1}</b>` : `<small>rank</small><b>#${e.rank_position}</b>`}</div>
        ${m.thumb ? `<img class="mth" src="${esc(m.thumb)}" alt="" onerror="this.style.display='none'">` : '<div class="mth ph"></div>'}
        <div style="min-width:0;flex:1"><div class="trunc"><b dir="auto">${esc(e.left_label || '(no label)')}</b></div><div class="small muted clamp2" dir="auto">${esc(m.description || e.moment_id)}</div>
          <div class="small dim mono">${sec(e.in_ms)}–${sec(e.out_ms)} · ${esc(e.moment_id)} ${rightsPill(m.rights || 'unknown')}</div></div>
        ${mode === 'rv' ? `<div class="col" style="gap:3px"><button class="sm" ${i === 0 ? 'disabled' : ''} data-vr="mv" data-i="${i}" data-d="-1" aria-label="Reveal earlier">▲</button><button class="sm" ${i === n - 1 ? 'disabled' : ''} data-vr="mv" data-i="${i}" data-d="1" aria-label="Reveal later">▼</button></div>
          <label class="small muted col" style="gap:2px">rank<select data-vrrank="${i}" aria-label="Rank position">${Array.from({ length: n }, (_, k) => `<option${k + 1 === e.rank_position ? ' selected' : ''}>${k + 1}</option>`).join('')}</select></label>` : `<span class="pill">reveal ${e.reveal_index + 1}</span>`}</div>`; };
    return picker + `<div class="row" style="margin-bottom:10px"><b style="font-size:15px" dir="auto">${esc(plan.title || plan.ranking_criterion)}</b>${pill(plan.format, String(plan.format).toUpperCase())}
      ${rep.valid ? '<span class="pill t-ok">valid</span>' : '<span class="pill t-bad">invalid</span>'}${rep.publishable ? '<span class="pill t-ok">publishable</span>' : '<span class="pill t-warn">not publishable (rights)</span>'}${D.dirty ? '<span class="pill t-acc">unsaved changes</span>' : ''}${D.busy ? '<span class="dim small">validating…</span>' : ''}
      <span class="right"></span><button class="sm" ${D.dirty ? '' : 'disabled'} data-vr="revert">Revert</button><button class="primary sm" ${D.dirty && rep.valid ? '' : 'disabled'} data-vr="saveplan">Save plan</button></div>
    <div class="card" style="margin-bottom:12px"><div class="h">Reveal order vs rank position <span class="r dim">viewers see the left-to-right order; the rail keeps the true rank</span></div>
      <div class="revstrip">${ord.map((e, i) => `<span class="rv-n" title="reveal ${i + 1}">${i ? '<i>→</i>' : ''}<b>#${e.rank_position}</b></span>`).join('')}<span class="dim small" style="margin-left:10px">reveal_order = [${plan.reveal_order.join(', ')}]${plan.reveal_order.join() === byRank.map(e => e.rank_position).reverse().join() ? ' · plain countdown' : ''}</span></div>
      <div class="small muted" dir="auto">Criterion: ${esc(plan.ranking_criterion)}${plan.criterion_kind ? ` (${esc(plan.criterion_kind)})` : ''}</div></div>
    <div class="grid g2" style="align-items:start"><div class="card"><div class="h">Reveal order (reorder here)</div><div class="col">${ord.map((e, i) => slotCard(e, i, 'rv')).join('')}</div></div>
      <div class="card"><div class="h">Ranking (by rank_position)</div><div class="col">${byRank.map((e, i) => slotCard(e, i, 'rk2')).join('')}</div>
        <div class="sep"></div><div class="h2">Validation ${D.busy ? '(running…)' : ''}</div>
        ${[...rep.errors.map(x => ['bad', 'Error', x]), ...rep.rights_blockers.map(x => ['bad', 'Rights', x]), ...rep.warnings.map(x => ['warn', 'Warning', x])].map(([t, l, x]) => `<div class="vmsg ${t}"><b>${l}</b> ${esc(x)}</div>`).join('') || '<div class="vmsg ok">All checks passed.</div>'}
        <div class="small muted" style="margin-top:8px">Saving writes plan.json (previous file kept as plan.prev-*.json). Narration lines that say "Number two…" belong to the entry, so re-read them after a reorder, then rebuild with <span class="mono">ranking:cutlist</span>.${data.has_cutlist ? ' A cutlist.json exists and becomes stale after a save.' : ''}</div></div></div>`;
  }

  /* ------------------------------------------------------------ 6. script review */
  function script({ id, pool, data }) {
    const picker = `<div class="row" style="margin-bottom:10px"><span class="muted small">Production</span><div class="chips">${pool.map(p => `<a class="chip ${p.production_id === id ? 'on' : ''}" href="#vr/script/${esc(p.production_id)}">${esc(p.production_id)}${p.fixture ? ' <span class="c">fixture</span>' : ''}</a>`).join('') || '<span class="dim small">no script passes yet</span>'}</div></div>`;
    if (!id || !data || data.error) return picker + `<div class="empty">${esc(data?.error || 'No writer/critic passes yet: productions/<id>/script/writer-pass-N.json and critic-pass-N.json appear when the comedy loop runs.')}</div>`;
    if (!data.passes.length) return picker + '<div class="empty">This production has no writer-pass-N.json yet.</div>';
    const s = vs(), cur = data.passes.find(p => p.n === s.pass) || data.passes[data.passes.length - 1];
    const prior = {}; for (const p of data.passes) for (const l of p.writer?.lines || []) prior[l.line_id] = { ...l, pass: p.n };
    const rv = Object.fromEntries((cur.critic?.reviews || []).map(r => [r.line_id, r]));
    const chosen = new Set(); const walk = (o, d = 0) => { if (d > 5 || o == null) return; if (typeof o === 'string') { chosen.add(o.split(' ')[0]); return; } if (Array.isArray(o)) return o.forEach(x => walk(x, d + 1)); for (const [k, v] of Object.entries(o)) { chosen.add(k); if (k === 'line_id' || typeof v !== 'number') walk(v, d + 1); } };
    walk(cur.critic?.selected || {});
    const isSel = lid => chosen.has(lid);
    const ids = [...new Set([...(cur.writer?.lines || []).map(l => l.line_id), ...Object.keys(rv)])];
    const lines = ids.map(i => { const f = (cur.writer?.lines || []).find(l => l.line_id === i); return f ? { ...(prior[i] && !f.kind ? { kind: prior[i].kind, moment_id: prior[i].moment_id, rank_position: prior[i].rank_position, reveal_index: prior[i].reveal_index } : {}), ...f } : prior[i] || { line_id: i }; });
    const groups = []; for (const l of lines) { const g = l.kind === 'hook' ? 'Hook options' : l.kind === 'transition' ? 'Transitions' : l.moment_id ? `Rank #${l.rank_position ?? '?'} · reveal_index ${l.reveal_index ?? '?'}` : 'Other'; let G = groups.find(x => x.g === g); if (!G) groups.push(G = { g, l: [], m: l.moment_id }); G.l.push(l); }
    groups.sort((a, b) => (a.g.startsWith('Hook') ? -1 : b.g.startsWith('Hook') ? 1 : a.g.startsWith('Trans') ? 1 : b.g.startsWith('Trans') ? -1 : a.g.localeCompare(b.g)));
    const left = l => `<div class="ln ${isSel(l.line_id) ? 'selected' : ''}"><span class="mono dim">${esc(l.line_id)}</span>${l.kind === 'silent_beat' ? ' <span class="pill">silent beat</span>' : ''}${l.response ? ` <span class="pill t-info">${esc(l.response)}</span>` : ''}${l.pass && l.pass !== cur.n ? ` <span class="pill">pass ${l.pass}</span>` : ''}${isSel(l.line_id) ? ' <span class="pill t-ok">SELECTED</span>' : ''}
      <div dir="auto" class="lt">${l.spoken_text ? '“' + esc(l.spoken_text) + '”' : '<span class="dim">(no spoken text)</span>'}</div><div class="small dim">${esc([l.angle, l.delivery_style, l.max_dur_ms ? l.max_dur_ms + ' ms max' : ''].filter(Boolean).join(' · '))}${l.joke_rationale ? ' · ' + esc(l.joke_rationale) : ''}</div></div>`;
    const right = r => !r ? '<div class="ln dim small">not reviewed in this pass</div>' : `<div class="ln"><div class="row">${scoreCell(r.total)}${pill(r.verdict)}${r.evidence_ms ? `<span class="mono small dim">@${sec(r.evidence_ms)}</span>` : ''}</div><div class="small" dir="auto">${esc(r.note || '')}</div>${r.suggestion && !/^none/i.test(r.suggestion) ? `<div class="small muted" dir="auto">→ ${esc(r.suggestion)}</div>` : ''}
      ${r.scores ? `<div class="mini-sc">${(() => { const e = Object.entries(r.scores), k10 = Math.max(...e.map(x => Number(x[1]) || 0)) <= 10 ? 10 : 1; return e.map(([k, v]) => `<span title="${esc(k)} ${v}" class="${v * k10 < 60 ? 'lo' : v * k10 >= 80 ? 'hi' : ''}">${esc(k.slice(0, 4))} ${v}</span>`).join(''); })()}</div>` : ''}</div>`;
    const top = cur.writer?.concept || cur.writer?.titles ? `<div class="card" style="margin-bottom:10px"><div class="h">Concept and titles</div>${cur.writer.concept ? `<div class="small" dir="auto">${esc(cur.writer.concept)}</div>` : ''}${(cur.writer.titles || []).map(x => `<div class="small"><span class="mono dim">${esc(x.id)}</span> <b dir="auto">${esc(x.text)}</b> <span class="dim">${esc([x.accent_1, x.accent_2].filter(Boolean).join(' / '))}</span></div>`).join('')}${cur.writer.rail_labels ? `<div class="small muted" style="margin-top:4px">Rail labels: ${Object.entries(cur.writer.rail_labels).map(([k, x]) => `${esc(k)} <b>${esc(x.pick ?? (x.options || [])[0] ?? '?')}</b>`).join(' · ')}</div>` : ''}</div>` : '';
    const final = [...lines.filter(l => isSel(l.line_id) && l.spoken_text)];
    return picker + `<div class="row" style="margin-bottom:10px"><span class="muted small">Pass</span><div class="chips">${data.passes.map(p => `<span class="chip ${p.n === cur.n ? 'on' : ''}" data-set="vr.pass" data-v="${p.n}" data-num>${p.n}${p.fixture ? ' <span class="c">fixture</span>' : ''}</span>`).join('')}</div>
      ${cur.critic?.stabilised != null ? (cur.critic.stabilised ? '<span class="pill t-ok">stabilised</span>' : '<span class="pill t-warn">not stabilised: another rewrite round</span>') : ''}${cur.fixture ? FX : ''}<span class="small dim">${esc(cur.writer?.note || '')}</span></div>
    ${top}<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 12px"><div class="h2">Writer lines (comedy-voice-writer)</div><div class="h2">Critic notes (punchline-critic)</div></div>
    ${groups.map(g => `<div class="card" style="margin-bottom:10px" data-k="g-${esc(g.g)}"><div class="h">${esc(g.g)}${g.m && data.moments[g.m] ? `<span class="r dim" dir="auto">${esc(data.moments[g.m].description).slice(0, 90)} · ${sec(data.moments[g.m].start_ms)}–${sec(data.moments[g.m].end_ms)}</span>` : ''}</div>
      ${g.l.map(l => `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-bottom:6px" data-k="l-${esc(l.line_id)}">${left(l)}${right(rv[l.line_id])}</div>`).join('')}</div>`).join('')}
    <div class="card"><div class="h">Selected final lines (subtitle preview)</div><div class="subprev">${final.map(l => `<span class="cap" dir="auto">${esc(l.spoken_text)}</span>`).join('') || '<span class="dim small">The critic has not selected lines yet.</span>'}</div></div>`;
  }

  /* ------------------------------------------------------------ 7. lineage */
  function lineage({ id, pool, data }) {
    const picker = `<div class="row" style="margin-bottom:10px"><span class="muted small">Production</span><div class="chips">${pool.map(p => `<a class="chip ${p.production_id === id ? 'on' : ''}" href="#vr/lineage/${esc(p.production_id)}">${esc(p.production_id)}${p.fixture ? ' <span class="c">fixture</span>' : ''}</a>`).join('') || '<span class="dim small">none</span>'}</div></div>`;
    if (!id || !data || data.error) return picker + `<div class="empty">${esc(data?.error || 'No viral-rankings productions yet.')}</div>`;
    const node = (title, body, ok) => `<div class="node ${ok ? '' : 'none'}"><div class="nt">${esc(title)}</div>${body}</div>`;
    const arrow = '<div class="arr">→</div>';
    const nSrc = data.sources.length, nMom = data.sources.reduce((n, x) => n + x.moments.length, 0);
    return picker + `<div class="chain">
      ${node('Idea', data.idea ? `<b dir="auto">${esc(data.idea.topic)}</b><div class="small muted">${pill(data.idea.status)} score ${data.idea.score ?? 'unknown'}</div>` : `<div class="small">${unk}</div>`, data.idea)}${arrow}
      ${node('Category', data.category ? `<b>${esc((data.category.parent_title ? data.category.parent_title + ' › ' : '') + data.category.title)}</b>` : `<div class="small">${unk}</div>`, data.category)}${arrow}
      ${node('Sources', nSrc ? data.sources.map(s => `<div class="small trunc" title="${esc(s.title)}"><span class="mono">${esc(s.asset_id.slice(4))}</span> ${pill(s.status)}</div>`).join('') : '<div class="small dim">none</div>', nSrc)}${arrow}
      ${node('Moments', nMom ? data.sources.flatMap(s => s.moments).map(m => `<div class="small"><a class="mono" href="#vr/moments" data-vrsel="${esc(m.moment_id)}">${esc(m.moment_id.split('-').slice(-2).join('-'))}</a> ${rightsPill(m.rights)}</div>`).join('') : '<div class="small dim">none</div>', nMom)}${arrow}
      ${node('Production', data.production ? `<b class="mono">${esc(data.production.production_id)}</b><div class="small">${pill(data.production.stage)} QA ${data.production.qa_score ?? 'unknown'}</div>${data.production.fixture ? FX : ''}` : `<div class="small">${unk}</div>`, data.production)}${arrow}
      ${node('Versions', data.versions.length ? data.versions.map(v => `<div class="small">v${v.n} ${v.rendered ? pill('rendered') : pill('pending')} ${v.duration ? Math.round(v.duration) + 's' : ''}</div>`).join('') : '<div class="small dim">none</div>', data.versions.length)}${arrow}
      ${node('Publishing id', data.publishing.length ? data.publishing.map(p => `<div class="small">${esc(p.platform)} ${pill(p.status)}<div class="mono">${esc(p.external_post_id || 'no id yet')}</div></div>`).join('') : '<div class="small dim">not scheduled / published</div>', data.publishing.length)}${arrow}
      ${node('Analytics', data.analytics.length ? data.analytics.map(a => `<div class="small">${a.hours_since_publish != null ? a.hours_since_publish + 'h' : '?'}: ${num(a.views)} views</div>`).join('') : '<div class="small dim">no snapshots</div>', data.analytics.length)}</div>
    ${data.gaps.length ? `<div class="small muted" style="margin:8px 0">Not yet linked: ${data.gaps.map(esc).join(' · ')}</div>` : ''}
    <div class="grid g2" style="margin-top:8px;align-items:start"><div class="card"><div class="h">Moment usage in this production (${data.usage_rows} rows)</div>
      ${data.sources.map(s => `<div class="small" style="margin-top:6px"><b dir="auto">${esc(s.title)}</b> <span class="dim">${esc(s.creator || '')} · ${esc(s.license || '')}</span> ${s.original_url ? `<a href="${/^https?:/i.test(s.original_url) ? esc(s.original_url) : '#'}" target="_blank" rel="noopener">${ic('ext')}</a>` : ''}</div>
        <table class="dense">${s.moments.map(m => `<tr><td class="mono"><a href="#vr/moments" data-vrsel="${esc(m.moment_id)}">${esc(m.moment_id)}</a></td><td dir="auto" class="small muted">${esc((m.description || '').slice(0, 70))}</td><td>${rightsPill(m.rights)}</td><td class="small">${m.usage.map(u => `v${u.version ?? '?'} ${esc(u.status)} #${u.rank_position ?? '?'}/r${u.reveal_index ?? '?'}`).join(' · ')}</td></tr>`).join('')}</table>`).join('') || '<div class="muted small">No usage recorded.</div>'}</div>
      <div class="card"><div class="h">Reviews</div>${data.reviews.map(r => `<div class="row small" style="padding:3px 0;border-top:1px solid var(--line)">${scoreCell(r.score)}${pill(r.verdict)}<span class="muted">${esc(r.reviewer || '')}</span><span class="right dim">${ago(r.created_at)}</span></div>`).join('') || '<div class="muted small">No independent review yet.</div>'}</div></div>`;
  }

  /* ------------------------------------------------------------ 8. learning dashboard */
  function learning({ data: d }) {
    const s = vs();
    const arrow = r => r.weight == null ? '' : `<span class="wchg ${r.action}">1.00 → <b>${r.weight.toFixed(2)}</b> ${r.action === 'raise' ? '▲' : r.action === 'lower' ? '▼' : '■'}</span>`;
    const card = (c, fixture) => { const at = c.cohorts[d.age], r = c.recommendation;
      const rowM = (k, label) => `<tr><td class="muted">${label}</td>${['24h', '72h', '7d'].map(a => `<td class="num">${c.cohorts[a] ? mv(k, c.cohorts[a][k]) : '<span class="dim">—</span>'}</td>`).join('')}</tr>`;
      return `<div class="card lcard ${fixture ? 'fx' : ''}" data-k="${fixture ? 'fx' : 'rl'}-${esc(c.id)}"><div class="h"><span dir="auto">${esc(c.title)}</span>${fixture ? FX : ''}</div>
        <div class="reco ${esc(r.action)}">${arrow(r)}<div class="small">${esc(r.text)}</div></div>
        <table class="dense"><tr><th></th><th class="num">24h</th><th class="num">72h</th><th class="num">7d</th></tr>${rowM('sample_size', 'videos (n)')}${rowM('median_views', 'median views')}${rowM('engaged_views', 'engaged views')}${rowM('avg_pct_viewed', 'avg % viewed')}${rowM('stayed_to_watch', 'stayed to watch')}${rowM('normalized_perf', 'perf vs baseline')}
        <tr><td class="muted">confidence</td>${['24h', '72h', '7d'].map(a => `<td class="num">${c.cohorts[a] ? confPill(c.cohorts[a].confidence) : '<span class="dim">—</span>'}</td>`).join('')}</tr>
        <tr><td class="muted">sample age</td>${['24h', '72h', '7d'].map(a => `<td class="num small">${c.cohorts[a] ? c.cohorts[a].age_days + 'd' : '<span class="dim">—</span>'}</td>`).join('')}</tr></table>
        ${r.warnings.map(w => `<div class="vmsg warn">⚠ ${esc(w)}</div>`).join('')}
        ${r.perf != null ? `<div class="small dim">perf ${r.perf.toFixed(2)}x from ${esc(r.perf_source)}; damping x${r.damping.toFixed(2)}</div>` : ''}</div>`; };
    return `<div class="row" style="margin-bottom:10px"><span class="muted small">Recommendation cohort</span><div class="chips">${['24h', '72h', '7d'].map(a => setChip('age', s.age, a, a)).join('')}</div>
      <span class="small muted right">Compare only the same age: a 24h number is never judged against a 7d one.</span></div>
    <div class="card" style="margin-bottom:12px"><div class="h">Real channel data <span class="r dim">${d.real.snapshots} snapshots</span></div>
      ${d.real.categories.length ? `<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${d.real.categories.map(c => card(c, false)).join('')}</div>`
        : `<div class="empty">No real category snapshots yet, so there is nothing to learn from and no recommendation: weights stay at 1.00. Snapshots appear after an owner-invoked analytics pull (docs/brands/viral-rankings/ANALYTICS-EXPERIMENTS.md). The labelled fixture below demonstrates the view.</div>`}</div>
    <div class="fxband"><b>TEST FIXTURE</b> invented numbers (acceptance test 12). Shown separately; never mixed into real totals or real recommendations.</div>
    ${d.fixture.categories.length ? `<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${d.fixture.categories.map(c => card(c, true)).join('')}</div>` : '<div class="empty">No fixture snapshots loaded (npm run -s cli -- category:snapshot docs/brands/viral-rankings/fixtures/category-snapshots.fixture.json --fixture).</div>'}
    <details class="card" style="margin-top:12px"><summary>How the revised recommendation is computed</summary><div class="small" style="margin-top:6px"><div class="mono">${esc(d.rule.weight)}</div>
      <div>Confidence weights: ${Object.entries(d.rule.confidence_weight).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')}. Minimum sample ${d.rule.min_sample} videos; snapshots older than ${d.rule.stale_days} days are flagged stale.</div>
      <div class="muted">${esc(d.rule.perf)}</div><div class="muted">${esc(d.rule.note)}</div></div></details>`;
  }

  /* ------------------------------------------------------------ events (delegated) */
  const dlgText = async (title, text) => { const d = document.querySelector('#dlg'), f = document.querySelector('#dlgForm'); return new Promise(res => {
    f.innerHTML = `<h3>${esc(title)}</h3><div class="small muted">${esc(text)}</div><textarea name="note" required placeholder="Reason"></textarea><div class="row"><span class="right"></span><button value="cancel" formnovalidate>Cancel</button><button class="primary" value="ok">Confirm</button></div>`;
    d.onclose = () => res(d.returnValue === 'ok' ? f.note.value.trim() : null); d.returnValue = ''; d.showModal(); f.note.focus(); }); };
  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-vr]'); if (a) {
      const k = a.dataset.vr;
      if (k === 'override') { const id = a.dataset.id, sel = document.querySelector(`[data-ovs="${id}"]`), why = document.querySelector(`[data-ovr="${id}"]`);
        if (!why.value.trim()) { toast('A reason is required for a manual override', true); why.focus(); return; } await act(`/api/vr/ideas/${encodeURIComponent(id)}/status`, { status: sel.value, reason: why.value.trim() }, 'Idea status updated'); }
      else if (k === 'reopen') { const why = await dlgText('Reopen idea', 'Sets the idea back to "proposed". Say why it deserves another look.'); if (why) await act(`/api/vr/ideas/${encodeURIComponent(a.dataset.id)}/status`, { status: 'proposed', reason: why }, 'Idea reopened'); }
      else if (k === 'seek') { const v = document.querySelector('video[data-k^="vid-"]'); if (v) { v.currentTime = Number(a.dataset.t); if (a.dataset.e) { const end = Number(a.dataset.e); const stop = () => { if (v.currentTime >= end) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); } v.play().catch(() => {}); } }
      else if (k === 'mv' && DRAFT) { const i = Number(a.dataset.i), d = Number(a.dataset.d), ord = sortedByReveal(DRAFT.plan); [ord[i], ord[i + d]] = [ord[i + d], ord[i]]; renumber(DRAFT.plan, ord); DRAFT.dirty = true; validateDraft(); }
      else if (k === 'revert') { DRAFT = null; refresh(true); }
      else if (k === 'saveplan' && DRAFT) { const id = DRAFT.id; if (await act(`/api/vr/ranking/plans/${encodeURIComponent(id)}`, { plan: DRAFT.plan }, 'Plan saved')) DRAFT = null; refresh(true); }
      return;
    }
    const sel = e.target.closest('[data-vrsel]'); if (sel) { vs().sel = sel.dataset.vrsel; saveS(); if (location.hash.startsWith('#vr/moments')) setTimeout(() => refresh(true), 0); }       // navigation happens through the link's href
    const cat = e.target.closest('[data-vrcat]'); if (cat) { Object.assign(vs(), { cat: cat.dataset.vrcat, page: 0 }); saveS(); }
  }, true);
  document.addEventListener('change', e => {
    const r = e.target.closest('[data-vrrank]'); if (r && DRAFT) { const ord = sortedByReveal(DRAFT.plan), i = Number(r.dataset.vrrank), want = Number(r.value), other = ord.find(x => x.rank_position === want), me = ord[i];
      if (other && other !== me) { other.rank_position = me.rank_position; } me.rank_position = want; renumber(DRAFT.plan, ord); DRAFT.dirty = true; validateDraft(); }
    const c = e.target.closest('[data-vrcatsel]'); if (c) { Object.assign(vs(), { cat: c.value, page: 0 }); saveS(); refresh(true); }
  });
  let qt = null;
  document.addEventListener('input', e => { const q = e.target.closest('[data-vrq]'); if (!q) return; clearTimeout(qt); qt = setTimeout(() => { Object.assign(vs(), { mq: q.value, page: 0 }); saveS(); refresh(true); }, 260); });
}
