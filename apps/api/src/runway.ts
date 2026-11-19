import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../packages/shared/src/db.ts';
import { P } from '../../../packages/shared/src/paths.ts';

/**
 * Channel runway: per brand, how long the YouTube queue lasts, from DB (publishing/productions), config/publish-times.json,
 * data/youtube-stats/<brand>.json (live counts/views) and the Windows upload tasks. Read-only. Unknown stays null.
 * colour: red runway < 3 days, amber < 7, green >= 7 (scheduled-on-YouTube runway); paused/retired channels are grey.
 */
const DAY = 864e5;
const TASKS: Record<string, string> = { celebrity: 'ClipsViral-DailyUploads', 'viral-rankings': 'ClipsViral-DailyUploads', clipping: 'ClipsViral-DailyUploads', compilations: 'ClipsViral-DailyUploads' };  // one shared quota-aware uploader (scripts/daily-uploads.ps1)
const PRE = ['idea', 'research', 'rights', 'analysis', 'script', 'editing'];
const all = (sql: string, ...a: any[]) => db().prepare(sql).all(...a) as any[];
const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const toD = (t: any): Date | null => { if (!t) return null; const s = String(t); const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z'); return isNaN(+d) ? null : d; };
const r1 = (n: number) => Math.round(n * 10) / 10;

const PS = `Get-ScheduledTask -TaskName 'ClipsViral*' | ForEach-Object { $i = $_ | Get-ScheduledTaskInfo; $n = ''; if ($i.NextRunTime -and $i.NextRunTime.Year -gt 2000) { $n = $i.NextRunTime.ToUniversalTime().ToString('o') }; $_.TaskName + '|' + $_.State + '|' + $n }`;
let taskCache: { at: number; v: Record<string, { state: string; next: string | null }> } = { at: 0, v: {} };
function tasks(): Promise<typeof taskCache.v> {
  if (Date.now() - taskCache.at < 60_000) return Promise.resolve(taskCache.v);
  return new Promise(res => {
    execFile('powershell.exe', ['-NoProfile', '-Command', PS], { timeout: 8000, windowsHide: true }, (err, out) => {
      const v: typeof taskCache.v = {};
      if (!err) for (const l of String(out).split(/\r?\n/)) { const [n, s, nx] = l.trim().split('|'); if (n) v[n] = { state: s, next: nx || null }; }
      taskCache = { at: Date.now(), v: err ? taskCache.v : v }; res(taskCache.v);
    });
  });
}

export async function runway(targetDays = 14) {
  const nowMs = Date.now(), cfg = readJson(path.join(P.config, 'publish-times.json')) ?? {};
  const tk = await tasks();
  const order = ['quiz-ar', 'viral-rankings', 'clipping', 'compilations', 'rankings', 'celebrity', 'tech', 'kids'];
  const brands = all(`SELECT id, name, format FROM brands`).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return brands.map(b => {
    const c = cfg[b.id] ?? {}, times: string[] = c.times ?? [];
    const status = c.retired ? 'retired' : c.paused ? 'paused' : c.publishing_only ? 'publishing-only' : 'active';
    const grey = status === 'paused' || status === 'retired';
    const cadence: number = Number(c.uploads_per_day) || times.length;  // uploads_per_day = real upload rate under the shared 6/day Google quota
    const stats = readJson(path.join(P.root, 'data', 'youtube-stats', `${b.id}.json`));
    const yt = all(`SELECT publication_status s, scheduled_time t FROM publishing WHERE platform='youtube' AND production_id IN (SELECT production_id FROM productions WHERE brand_id=?)`, b.id)
      .map(r => ({ s: r.s, d: toD(r.t) }));
    const pubDb = yt.filter(r => r.s === 'published' && r.d && +r.d <= nowMs).map(r => r.d!).sort((x, y) => +y - +x);
    const sch = yt.filter(r => r.s === 'scheduled' && r.d && +r.d >= nowMs).map(r => r.d!).sort((x, y) => +y - +x);
    const overdue = yt.filter(r => r.s === 'scheduled' && r.d && +r.d < nowMs).length;
    const sv: any[] = stats?.videos ?? [];
    const pubStats = sv.filter(v => v.privacy === 'public' && v.publishedAt).map(v => toD(v.publishedAt)!).filter(d => d && +d <= nowMs).sort((x, y) => +y - +x);
    const lastPub = pubStats[0] ?? pubDb[0] ?? null;
    const live = stats ? Number(stats.channel?.videoCount ?? sv.filter(v => v.privacy === 'public').length) : pubDb.length;
    const prods = all(`SELECT production_id id, current_state s, updated_at u, data FROM productions WHERE brand_id=?`, b.id);
    const approved = prods.filter(p => p.s === 'approved').length;
    const lastSch = sch[0] ?? null;
    const runwayDays = lastSch ? Math.max(0, (+lastSch - nowMs) / DAY) : 0;
    const incl = cadence ? runwayDays + approved / cadence : null;
    const runsOut = cadence ? new Date((lastSch ? +lastSch : nowMs) + approved / cadence * DAY) : lastSch;
    const need = cadence && !grey ? Math.max(0, Math.ceil((targetDays - (incl ?? 0)) * cadence)) : null;
    const pipe = { qa: 0, editing: 0, script: 0, research: 0, shelved: 0, oldest_days: null as number | null, oldest_id: null as string | null };
    let oldest = Infinity;
    for (const p of prods) {
      if (p.s !== 'qa' && !PRE.includes(p.s)) continue;
      let dj: any = {}; try { dj = JSON.parse(p.data || '{}'); } catch { /* ignore */ }
      if (dj.shelved || dj.parked) { pipe.shelved++; continue; }
      if (p.s === 'qa') pipe.qa++; else if (p.s === 'editing') pipe.editing++; else if (p.s === 'script') pipe.script++; else pipe.research++;
      const u = toD(p.u); if (u && +u < oldest) { oldest = +u; pipe.oldest_id = p.id; }
    }
    if (oldest < Infinity) pipe.oldest_days = r1((nowMs - oldest) / DAY);
    const t = TASKS[b.id] ? tk[TASKS[b.id]] : null;
    return {
      brand_id: b.id, name: b.name, format: b.format, status, cadence_per_day: cadence, times, audience_tz: c.audience_tz ?? null,
      auto_upload: TASKS[b.id] ? { job: TASKS[b.id], exists: !!t, state: t?.state ?? null, next_run: t?.next ?? null } : { job: null, exists: false, state: null, next_run: null },
      live_videos: live, last_published: lastPub?.toISOString() ?? null,
      total_views: stats?.channel?.viewCount != null ? Number(stats.channel.viewCount) : null, views_as_of: stats?.fetched ?? null,
      subscribers: stats?.channel?.subscriberCount != null ? Number(stats.channel.subscriberCount) : null,
      scheduled: sch.length, scheduled_overdue: overdue, last_scheduled: lastSch?.toISOString() ?? null, runway_days: r1(runwayDays),
      approved_unscheduled: approved, runway_incl_approved_days: incl == null ? null : r1(incl),
      runs_out: runsOut?.toISOString() ?? null, target_days: targetDays, need_for_target: need, pipeline: pipe,
      colour: grey ? 'grey' : runwayDays < 3 ? 'red' : runwayDays < 7 ? 'amber' : 'green',
    };
  });
}

export function registerRunway(app: FastifyInstance) {
  app.get('/api/runway', async (req: any) => {
    const d = Math.min(Math.max(Number(req.query?.days ?? 14) || 14, 1), 90);
    return { now: new Date().toISOString(), target_days: d, channels: await runway(d) };
  });
}
