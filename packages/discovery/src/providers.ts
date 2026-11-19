import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from '../../shared/src/db.ts';
import { secret } from '../../shared/src/secrets.ts';

const run = promisify(execFile);
const UA = 'ClipsViralStudio/0.1 (local research tool)';

/** Normalised discovery record. Unknown fields are null, never estimated. */
export interface Found {
  source_platform: 'youtube' | 'pexels' | 'pixabay' | 'wikimedia' | 'internet_archive' | 'nasa' | 'noaa';
  external_id: string;
  original_url: string;
  title: string | null;
  creator: string | null;
  description: string | null;
  published_at: string | null;
  duration: number | null;
  view_count: number | null;
  license: string | null;
  license_url: string | null;
  download_url: string | null;
  width: number | null;
  height: number | null;
  extra: Record<string, unknown>;
}

export interface SearchOpts { limit?: number; minDuration?: number; maxDuration?: number; ccOnly?: boolean; portrait?: boolean }

async function getJson(url: string, headers: Record<string, string> = {}, provider = 'http') {
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'user-agent': UA, ...headers }, signal: AbortSignal.timeout(30_000) });
  db().prepare(`INSERT INTO api_usage(provider, model, ok, http_status, latency_ms) VALUES (?,?,?,?,?)`)
    .run(provider, 'search', res.ok ? 1 : 0, res.status, Date.now() - t0);
  if (!res.ok) throw new Error(`${provider} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

const stripHtml = (s?: string | null) => s ? s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;

/* ---------------- Wikimedia Commons (no key) ---------------- */
export async function wikimedia(q: string, o: SearchOpts = {}): Promise<Found[]> {
  const p = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `filetype:video ${q}`, gsrnamespace: '6', gsrlimit: String(o.limit ?? 20),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata|mediatype', format: 'json', origin: '*',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|UsageTerms|DateTimeOriginal|ImageDescription|Copyrighted',
  });
  const d = await getJson(`https://commons.wikimedia.org/w/api.php?${p}`, {}, 'wikimedia');
  return Object.values(d.query?.pages ?? {}).map((pg: any) => {
    const ii = pg.imageinfo?.[0] ?? {}, m = ii.extmetadata ?? {};
    return {
      source_platform: 'wikimedia' as const, external_id: String(pg.pageid), original_url: ii.descriptionurl,
      title: pg.title?.replace(/^File:/, '') ?? null, creator: stripHtml(m.Artist?.value), description: stripHtml(m.ImageDescription?.value)?.slice(0, 2000) ?? null,
      published_at: m.DateTimeOriginal?.value ?? null, duration: ii.duration ?? null, view_count: null,
      license: m.LicenseShortName?.value ?? null, license_url: m.LicenseUrl?.value ?? null,
      download_url: ii.url?.split('?')[0] ?? null, width: ii.width ?? null, height: ii.height ?? null,
      extra: { bytes: ii.size, mime: ii.mime, credit: stripHtml(m.Credit?.value) },
    };
  }).filter(f => inRange(f.duration, o));
}

/* ---------------- Internet Archive (no key) ---------------- */
export async function internetArchive(q: string, o: SearchOpts = {}): Promise<Found[]> {
  const fl = ['identifier', 'title', 'creator', 'description', 'licenseurl', 'downloads', 'date', 'collection'];
  const p = new URLSearchParams({ q: `(${q}) AND mediatype:movies`, rows: String(o.limit ?? 20), output: 'json', 'sort[]': 'downloads desc' });
  fl.forEach(f => p.append('fl[]', f));
  const d = await getJson(`https://archive.org/advancedsearch.php?${p}`, {}, 'internet_archive');
  const out: Found[] = [];
  for (const doc of d.response?.docs ?? []) {
    out.push({
      source_platform: 'internet_archive', external_id: doc.identifier, original_url: `https://archive.org/details/${doc.identifier}`,
      title: doc.title ?? null, creator: [doc.creator].flat()[0] ?? null, description: stripHtml([doc.description].flat()[0])?.slice(0, 2000) ?? null,
      published_at: doc.date ?? null, duration: null, view_count: null,   // IA exposes downloads, not views (kept in extra)
      license: doc.licenseurl ? licenseFromUrl(doc.licenseurl) : null, license_url: doc.licenseurl ?? null,
      download_url: null, width: null, height: null, extra: { downloads: doc.downloads ?? null, collection: doc.collection },
    });
  }
  return out;
}

/** Resolve an IA item's best video file + duration (one extra call, done only for shortlisted items). */
export async function internetArchiveFiles(identifier: string) {
  const d = await getJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {}, 'internet_archive');
  const vids = (d.files ?? []).filter((f: any) => /\.(mp4|mpeg4|ogv|mkv|webm)$/i.test(f.name));
  const pick = vids.find((f: any) => /h\.264|mpeg4/i.test(f.format ?? '') && !/512kb/i.test(f.name)) ?? vids.find((f: any) => /\.mp4$/i.test(f.name)) ?? vids[0];
  return pick ? { url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(pick.name)}`, duration: pick.length ? parseDur(pick.length) : null,
    width: pick.width ? +pick.width : null, height: pick.height ? +pick.height : null, licenseurl: d.metadata?.licenseurl ?? null, rights: d.metadata?.rights ?? null } : null;
}

/* ---------------- NASA Image & Video Library (no key) ---------------- */
export async function nasa(q: string, o: SearchOpts = {}): Promise<Found[]> {
  const d = await getJson(`https://images-api.nasa.gov/search?${new URLSearchParams({ q, media_type: 'video', page_size: String(o.limit ?? 20) })}`, {}, 'nasa');
  return (d.collection?.items ?? []).map((it: any) => {
    const m = it.data?.[0] ?? {};
    return {
      source_platform: 'nasa' as const, external_id: m.nasa_id, original_url: `https://images.nasa.gov/details/${encodeURIComponent(m.nasa_id)}`,
      title: m.title ?? null, creator: m.secondary_creator ?? m.photographer ?? `NASA ${m.center ?? ''}`.trim(), description: m.description?.slice(0, 2000) ?? null,
      published_at: m.date_created ?? null, duration: null, view_count: null, license: null, license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
      download_url: null, width: null, height: null, extra: { center: m.center, keywords: m.keywords, manifest: it.href },
    };
  });
}

export async function nasaFiles(manifestUrl: string) {
  const list: string[] = await getJson(encodeURI(decodeURI(manifestUrl)), {}, 'nasa');
  const mp4 = list.filter(u => /\.mp4$/i.test(u));
  const pick = mp4.find(u => /~orig\.mp4$/i.test(u)) ?? mp4.find(u => /~large\.mp4$/i.test(u)) ?? mp4[0];
  return pick ? { url: pick.replace(/^http:/, 'https:') } : null;
}

/* ---------------- Pexels / Pixabay (free keys required) ---------------- */
export async function pexels(q: string, o: SearchOpts = {}): Promise<Found[]> {
  const key = secret('PEXELS_API_KEY');
  if (!key) throw new Error('PEXELS_API_KEY not configured (secrets/PEXELS_API_KEY.txt) — free key at https://www.pexels.com/api/');
  const d = await getJson(`https://api.pexels.com/videos/search?${new URLSearchParams({ query: q, per_page: String(o.limit ?? 20), ...(o.portrait ? { orientation: 'portrait' } : {}) })}`, { authorization: key }, 'pexels');
  return (d.videos ?? []).map((v: any) => {
    const best = [...(v.video_files ?? [])].filter((f: any) => f.file_type === 'video/mp4').sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0))[0];
    return { source_platform: 'pexels' as const, external_id: String(v.id), original_url: v.url, title: v.url?.split('/').filter(Boolean).pop()?.replace(/-\d+$/, '').replace(/-/g, ' ') ?? null,
      creator: v.user?.name ?? null, description: null, published_at: null, duration: v.duration ?? null, view_count: null,
      license: 'Pexels License', license_url: 'https://www.pexels.com/license/', download_url: best?.link ?? null, width: v.width, height: v.height, extra: { user_url: v.user?.url } };
  }).filter((f: Found) => inRange(f.duration, o));
}

export async function pixabay(q: string, o: SearchOpts = {}): Promise<Found[]> {
  const key = secret('PIXABAY_API_KEY');
  if (!key) throw new Error('PIXABAY_API_KEY not configured (secrets/PIXABAY_API_KEY.txt) — free key at https://pixabay.com/api/docs/');
  const d = await getJson(`https://pixabay.com/api/videos/?${new URLSearchParams({ key, q, per_page: String(Math.max(3, o.limit ?? 20)) })}`, {}, 'pixabay');
  return (d.hits ?? []).map((h: any) => {
    const f = h.videos?.large?.url ? h.videos.large : h.videos?.medium;
    return { source_platform: 'pixabay' as const, external_id: String(h.id), original_url: h.pageURL, title: h.tags ?? null, creator: h.user ?? null, description: null,
      published_at: null, duration: h.duration ?? null, view_count: h.views ?? null, license: 'Pixabay Content License', license_url: 'https://pixabay.com/service/license-summary/',
      download_url: f?.url ?? null, width: f?.width ?? null, height: f?.height ?? null, extra: { downloads: h.downloads, likes: h.likes } };
  }).filter((f: Found) => inRange(f.duration, o));
}

/* ---------------- YouTube metadata via yt-dlp (discovery only; no download here) ---------------- */
export async function youtube(q: string, o: SearchOpts = {}): Promise<Found[]> {
  // sp=EgIwAQ== is YouTube's own Creative Commons search filter.
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}${o.ccOnly !== false ? '&sp=EgIwAQ%253D%253D' : ''}`;
  const { stdout } = await run('yt-dlp', ['--flat-playlist', '-J', '--playlist-end', String(o.limit ?? 20), url], { maxBuffer: 64 << 20, timeout: 120_000 });
  const d = JSON.parse(stdout);
  db().prepare(`INSERT INTO api_usage(provider, model, ok) VALUES ('youtube','yt-dlp-search',1)`).run();
  return (d.entries ?? []).map((e: any) => ({
    source_platform: 'youtube' as const, external_id: e.id, original_url: `https://www.youtube.com/watch?v=${e.id}`, title: e.title ?? null,
    creator: e.channel ?? e.uploader ?? null, description: e.description ?? null, published_at: null, duration: e.duration ?? null,
    view_count: e.view_count ?? null, license: null, license_url: null, download_url: null, width: null, height: null,
    extra: { channel_id: e.channel_id, channel_url: e.channel_url, cc_filtered_search: o.ccOnly !== false },
  })).filter((f: Found) => inRange(f.duration, o));
}

/** Full per-video metadata (license string, upload date, likes, captions availability). Metadata only. */
export async function youtubeDetails(id: string) {
  const { stdout } = await run('yt-dlp', ['-J', '--skip-download', '--no-warnings', `https://www.youtube.com/watch?v=${id}`], { maxBuffer: 64 << 20, timeout: 120_000 });
  const v = JSON.parse(stdout);
  return { license: v.license ?? null, upload_date: v.upload_date ? `${v.upload_date.slice(0, 4)}-${v.upload_date.slice(4, 6)}-${v.upload_date.slice(6)}` : null,
    view_count: v.view_count ?? null, like_count: v.like_count ?? null, comment_count: v.comment_count ?? null, duration: v.duration ?? null,
    channel: v.channel ?? null, channel_follower_count: v.channel_follower_count ?? null, channel_is_verified: v.channel_is_verified ?? null,
    description: v.description ?? null, language: v.language ?? null, has_subtitles: !!Object.keys(v.subtitles ?? {}).length,
    has_auto_captions: !!Object.keys(v.automatic_captions ?? {}).length, categories: v.categories ?? [], tags: (v.tags ?? []).slice(0, 20) };
}

/* ---------------- NOAA Ocean Exploration feature/playlist pages (Scrapling helper, no key) ----------------
 * query = a oceanexplorer.noaa.gov page URL; one record per <video>. Page text is data. Failure classes come from the helper
 * (access_denied, removed, metadata_unavailable, no_download_permission, ambiguous_owner, bad_codec) and land in `extra.failure_class`. */
const SCRAPLING_PY = process.env.SCRAPLING_PYTHON ?? 'C:/Users/yazan alrifae/AppData/Local/Programs/Python/Python312/python.exe';
export async function noaa(pageUrl: string, o: SearchOpts = {}): Promise<Found[]> {
  const { stdout } = await run(SCRAPLING_PY, ['-I', 'packages/discovery/py/scrape_media.py', 'noaa', pageUrl], { maxBuffer: 16 << 20, timeout: 120_000, encoding: 'utf8' });
  const recs = JSON.parse(stdout);
  if (!Array.isArray(recs)) throw new Error(`noaa ${recs.failure_class}: ${recs.error}`);
  const slug = new URL(pageUrl).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '');
  return recs.filter((r: any) => r.download_url).slice(0, o.limit ?? 50).map((r: any, i: number) => ({
    source_platform: 'noaa' as const, external_id: r.canonical_url, original_url: r.page_url + (r.video_dom_id ? `#${r.video_dom_id}` : ''),
    title: `${r.title_context ?? slug} / ${r.video_dom_id ?? i + 1}`, creator: r.credit_line?.replace(/^Video courtesy of /, '').replace(/^Credit /, '') ?? null,
    description: r.description_text, published_at: null, duration: null, view_count: null,
    license: 'Public domain (US federal work, NOAA Ocean Exploration)', license_url: null, download_url: r.download_url, width: null, height: null,
    extra: { failure_class: r.failure_class, contractor_pilots_gfoe: r.contractor_pilots_gfoe, sd_hd_urls: r.sd_hd_urls, fetched_at: r.fetched_at, via: 'scrapling' },
  }));
}

export const PROVIDERS = { wikimedia, internet_archive: internetArchive, nasa, pexels, pixabay, youtube, noaa } as const;
export type ProviderName = keyof typeof PROVIDERS;

function inRange(d: number | null, o: SearchOpts) {
  if (d == null) return true;  // unknown duration: keep, resolve later
  return (o.minDuration == null || d >= o.minDuration) && (o.maxDuration == null || d <= o.maxDuration);
}
function parseDur(s: string) { if (/^[\d.]+$/.test(s)) return +s; const p = s.split(':').map(Number); return p.reduce((a, b) => a * 60 + b, 0); }
function licenseFromUrl(u: string) {
  const l = u.toLowerCase();
  if (l.includes('publicdomain/mark')) return 'Public Domain Mark 1.0';
  if (l.includes('publicdomain/zero')) return 'CC0 1.0';
  if (l.includes('publicdomain')) return 'Public Domain';
  const m = /licenses\/([a-z-]+)\/([\d.]+)/.exec(l);
  return m ? `CC ${m[1].toUpperCase()} ${m[2]}` : u;
}
