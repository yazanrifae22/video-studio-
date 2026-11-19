// YouTube Studio scheduling helper — paste/inject into the Studio tab (Claude in Chrome javascript_tool).
// Usage after files are uploaded to the channel (owner selects files; browser tool can't upload >10 MB):
//   window.__altered = true;            // شو شايف؟ (AI images + synthetic voice); false for the English real-footage channels
//   window.__batch = <output of: python scripts/publish-batch.py <brand> <first> <last>>  (first 5 fields are used)
//   window.__runner = (async () => { for (const b of __batch) { const r = await __doOne(...b); __results[b[0]] = r; if (!r.ok) break; } })();
//   then poll __results (javascript_tool times out after 45 s, so never await a whole batch in one call),
//   and record each success: python scripts/publish-record.py <production_id> <video_id> <YYYY-MM-DD> <HH:MM> scheduled
// Notes: the scheduler defaults to the channel's US time zone — __setTz switches it to "(GMT+0300) Local Time".
// Daily upload limit for a new channel was 10/day (rows show "Daily upload limit reached"); phone verification raises it.
// eval() is blocked by Studio's CSP — redefine functions by re-injecting this file.
window.__sleep = ms => new Promise(r => setTimeout(r, ms));
window.__waitFor = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await __sleep(300); } return null; };
window.__closeScheduled = async () => {
  const b = [...document.querySelectorAll('button, ytcp-button')].filter(e => /^\s*Close\s*$/.test(e.innerText) && e.offsetParent)
    .find(e => { let p = e; for (let i = 0; i < 12 && p; i++, p = p.parentElement) if (/Video scheduled/.test(p.innerText || '')) return true; return false; });
  b?.click(); await __sleep(900); return !!b;
};
window.__setTz = async () => {
  const pk = document.querySelector('ytcp-datetime-picker');
  const tzb = [...pk.querySelectorAll('button, ytcp-button')].find(b => /Time zone/.test(b.innerText));
  if (tzb) { tzb.click(); await __sleep(900); }
  if (/GMT\+0300/.test(pk.innerText)) return pk.innerText;
  const trig = [...pk.querySelectorAll('ytcp-dropdown-trigger, ytcp-text-dropdown-trigger, [role=button], tp-yt-paper-input')].find(e => /GMT/.test(e.innerText));
  trig?.click(); await __sleep(900);
  [...document.querySelectorAll('tp-yt-paper-item')].find(e => /GMT\+0300\) Local/.test(e.innerText))?.click();
  await __sleep(900); return pk.innerText;
};
window.__open = async rowName => {
  const key = rowName.split('-').pop();
  const pr = [...document.querySelectorAll('ytcp-multi-progress-monitor .row, ytcp-multi-progress-monitor li')].find(r => r.innerText.includes(rowName));
  if (pr) { if (/limit|error|fail/i.test(pr.innerText)) return 'row not uploaded: ' + pr.innerText.replace(/\s+/g, ' '); pr.querySelector('ytcp-icon-button, #edit-button, button').click(); return 'panel'; }
  const lr = [...document.querySelectorAll('ytcp-video-row')].find(r => r.innerText.includes(key));
  if (lr) { const b = [...lr.querySelectorAll('ytcp-button, button')].find(b => /Edit draft/i.test(b.innerText)); if (!b) return 'no Edit draft on ' + key; b.click(); return 'list'; }
  return 'row not found';
};
clearInterval(window.__gotItTimer);  // "We're still checking your content" notice after Schedule
window.__gotItTimer = setInterval(() => { [...document.querySelectorAll('button, ytcp-button')].filter(e => /^\s*Got it\s*$/.test(e.innerText) && e.offsetParent && /still checking/i.test(e.closest('tp-yt-paper-dialog, ytcp-dialog')?.innerText || '')).pop()?.click(); }, 1000);
window.__doOne = async (rowName, t, d, dateStr, timeStr, altered = window.__altered) => {
  const log = [];
  if (document.querySelector('ytcp-video-title #textbox')?.offsetParent) return {error: 'a details dialog is already open'};
  const how = await __open(rowName); log.push(how);
  if (!['panel', 'list'].includes(how)) return {error: how};
  const title = await __waitFor(() => { const e = document.querySelector('ytcp-video-title #textbox'); return e && e.offsetParent && e; });
  if (!title) return {error: 'dialog not opened', log};
  await __sleep(1200);
  const vid = (location.href.match(/udvid=([\w-]{11})/) || [])[1];
  const put = (el, txt) => { el.focus(); document.execCommand('selectAll', false, null); document.execCommand('insertText', false, txt); el.dispatchEvent(new Event('input', {bubbles: true})); };
  put(title, t); put(document.querySelector('ytcp-video-description #textbox'), d);
  log.push('descLen=' + document.querySelector('ytcp-video-description #textbox').innerText.length);
  document.querySelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]')?.click();
  const more = document.querySelector('#toggle-button'); if (more && /show more/i.test(more.innerText)) { more.click(); await __sleep(1000); }
  const r = await __waitFor(() => document.querySelector(`tp-yt-paper-radio-button[name="VIDEO_HAS_ALTERED_CONTENT_${altered ? 'YES' : 'NO'}"]`));
  r?.click(); await __sleep(400); log.push('altered' + (altered ? 'YES' : 'NO') + '=' + !!r?.hasAttribute('checked'));
  for (let i = 0; i < 3; i++) { document.querySelector('#next-button')?.click(); await __sleep(1300); }
  (await __waitFor(() => document.querySelector('#second-container-expand-button')))?.click(); await __sleep(1200);
  const pk = () => document.querySelector('ytcp-datetime-picker');
  await __setTz();
  document.querySelector('#datepicker-trigger')?.click(); await __sleep(900);
  const din = await __waitFor(() => document.querySelector('ytcp-date-picker tp-yt-paper-input input, ytcp-date-picker input'));
  if (din) { din.focus(); din.select(); document.execCommand('insertText', false, dateStr); din.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 13, bubbles: true})); }
  await __sleep(900);
  pk().querySelector('input').click(); await __sleep(900);
  const it = [...document.querySelectorAll('tp-yt-paper-item')].find(e => e.innerText.replace(/[  ]/g, ' ').trim() === timeStr);
  if (it) { it.scrollIntoView(); it.click(); } await __sleep(900);
  const got = {date: document.querySelector('#datepicker-trigger')?.innerText.trim(), time: (pk().querySelector('input')?.value || '').replace(/[  ]/g, ' '), tz: pk().innerText.includes('GMT+0300')};
  log.push(JSON.stringify(got));
  if (got.date !== dateStr || got.time !== timeStr || !got.tz) return {error: 'schedule mismatch', vid, log};
  document.querySelector('#done-button')?.click();
  const ok = await __waitFor(() => [...document.querySelectorAll('*')].some(e => e.offsetParent && e.childElementCount === 0 && /Video scheduled/.test(e.textContent)), 30000);
  log.push('scheduled=' + !!ok); await __sleep(600); log.push('closed=' + await __closeScheduled());
  return {vid, ok: !!ok, log};
};
window.__results = window.__results || {};
'ready';
