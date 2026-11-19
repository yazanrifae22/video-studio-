/**
 * viral-rankings acceptance tests (master prompt §Q: 1, 2, 5, 6, 7) + reveal director.
 * Runs on a THROWAWAY COPY of the studio DB (never the live file):
 *   npx tsx --disable-warning=ExperimentalWarning scripts/test-viral-rankings.ts [path/to/copy-source.db]
 * Default copy source: the newest data/backups/studio-*.db, else data/studio.db (copied with VACUUM INTO).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(import.meta.dirname, '..');
const tmp = path.join(os.tmpdir(), `studio-test-vr-${process.pid}.db`);
const backups = fs.existsSync(path.join(root, 'data', 'backups')) ? fs.readdirSync(path.join(root, 'data', 'backups')).filter(f => /^studio-.*\.db$/.test(f)).sort() : [];
const from = process.argv[2] ?? (backups.length ? path.join(root, 'data', 'backups', backups[backups.length - 1]) : path.join(root, 'data', 'studio.db'));
for (const f of [tmp, `${tmp}-wal`, `${tmp}-shm`]) fs.rmSync(f, { force: true });
new DatabaseSync(from, { readOnly: true }).exec(`VACUUM INTO '${tmp.replace(/\\/g, '/').replace(/'/g, "''")}'`);
process.env.STUDIO_DB = tmp;

const { db, J } = await import('../packages/shared/src/db.ts');
const { setRights } = await import('../packages/rights/src/rights.ts');
const lib = await import('../packages/ranking/src/library.ts');
const { validateRankingPlan } = await import('../packages/ranking/src/plan.ts');
const { directReveal, parseScores } = await import('../packages/ranking/src/reveal.ts');

let pass = 0, fail = 0;
const ok = (cond: unknown, name: string, extra?: unknown) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${extra !== undefined ? ` → ${JSON.stringify(extra).slice(0, 400)}` : ''}`); }
};
const throws = (fn: () => unknown, re: RegExp, name: string) => { try { fn(); ok(false, name, 'did not throw'); } catch (e: any) { ok(re.test(e.message), name, e.message); } };

console.log(`DB copy: ${from} → ${tmp}`);
const d = db();
const snapshot = () => ({
  brands: d.prepare(`SELECT id, name, format, status, data FROM brands WHERE id<>'viral-rankings' ORDER BY id`).all(),
  accounts: (d.prepare(`SELECT COUNT(*) n FROM accounts WHERE brand_id<>'viral-rankings'`).get() as any).n,
  productions: d.prepare(`SELECT brand_id, COUNT(*) n, SUM(approval_status='approved') approved FROM productions GROUP BY 1 ORDER BY 1`).all(),
  publishing: (d.prepare(`SELECT COUNT(*) n FROM publishing`).get() as any).n,
  ideas: (d.prepare(`SELECT COUNT(*) n FROM ideas WHERE category_id IS NULL`).get() as any).n,
});

/* ---------------------------------------------------------------- 1. brand isolation */
console.log('\n[1] register viral-rankings without touching existing brands');
const before = snapshot();
const accountsBefore = (d.prepare(`SELECT COUNT(*) n FROM accounts WHERE brand_id='viral-rankings'`).get() as any).n;
const b = JSON.parse(fs.readFileSync(path.join(root, 'brands', 'viral-rankings', 'brand.json'), 'utf8'));
d.prepare(`INSERT INTO brands(id, name, format, positioning, audience, language, status, data) VALUES (?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, data=excluded.data`).run(b.id, b.name, b.format, b.positioning, b.audience, b.language, b.status, J.str(b.data));
const after = snapshot();
ok(JSON.stringify(before) === JSON.stringify(after), 'existing brands, accounts, productions, publishing, ideas unchanged', { before, after });
// the Podium Pop YouTube account is connected in the live DB (2026-10-31): registration must not add or change accounts
ok((d.prepare(`SELECT COUNT(*) n FROM accounts WHERE brand_id='viral-rankings'`).get() as any).n === accountsBefore, 'registration creates no accounts for viral-rankings');
ok(['rankings', 'clipping', 'compilations', 'quiz-ar'].every(id => d.prepare(`SELECT 1 FROM brands WHERE id=?`).get(id)), 'four existing brands still present');
ok((d.prepare(`PRAGMA table_info(ideas)`).all() as any[]).some(c => c.name === 'category_id'), 'ideas.category_id added (nullable)');

/* ---------------------------------------------------------------- 2. categories, null ≠ 0 */
console.log('\n[2] two-level categories; unknown (null) metrics are not zero');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'brands', 'viral-rankings', 'categories.seed.json'), 'utf8'));
for (const c of [...seed].sort((a: any, z: any) => Number(!!a.parent_slug) - Number(!!z.parent_slug))) lib.upsertCategory(c, 'test');
const cats = lib.listCategories('viral-rankings');
const parents = cats.filter((c: any) => !c.parent_id), subs = cats.filter((c: any) => c.parent_id);
// the live catalog has grown past the seed (500-category plan): the seed's 5 parents / 17 subs must all exist, extras are fine
const seedParents = seed.filter((c: any) => !c.parent_slug).length, seedSubs = seed.filter((c: any) => c.parent_slug).length;
ok(parents.length >= seedParents && subs.length >= seedSubs && seedParents === 5 && seedSubs >= 10, `seed ${seedParents} parents / ${seedSubs} subs present (db: ${parents.length}/${subs.length})`);
ok(subs.every((s: any) => parents.some((p: any) => p.id === s.parent_id)), 'every subcategory points at a parent of the same brand');
ok(cats.every((c: any) => c.latest_snapshot === null), 'fresh categories have no metrics (null, not 0)');
throws(() => lib.upsertCategory({ brand_id: 'viral-rankings', parent_id: subs[0].id, slug: 'x/y/z', title: 'Too deep' }), /two levels/, 'third level rejected');
throws(() => lib.upsertCategory({ brand_id: 'nope', slug: 'a', title: 'Bad brand' }), /unknown brand/, 'unknown brand rejected');
const cat = subs.find((s: any) => s.slug === 'animals/cats')!;
lib.addCategorySnapshot({ category_id: cat.id, age_bucket: '7d', sample_size: 3, median_views: 0, avg_pct_viewed: null, source: 'fixture', provenance: 'test-viral-rankings.ts' }, { fixture: true });
const real = lib.listCategories('viral-rankings').find((c: any) => c.id === cat.id);
const withFx = lib.listCategories('viral-rankings', { includeFixtures: true }).find((c: any) => c.id === cat.id);
ok(real.latest_snapshot === null, 'fixture snapshots are hidden from real views by default');
ok(withFx.latest_snapshot?.is_fixture === true, 'fixture flag stored and shown when asked');
ok(withFx.latest_snapshot?.median_views === 0 && withFx.latest_snapshot?.avg_pct_viewed === null && withFx.latest_snapshot?.engaged_views === null, 'measured 0 stays 0, unknown stays null');
lib.addCategorySnapshot({ category_id: cat.id, age_bucket: '24h', sample_size: 1, median_views: 12, source: 'fixture' }, { fixture: true });
ok((d.prepare(`SELECT COUNT(*) n FROM category_metrics_snapshots WHERE category_id=?`).get(cat.id) as any).n === 2, 'snapshots append (history kept)');
ok(lib.listCategories('viral-rankings', { includeFixtures: true, ageBucket: '7d' }).find((c: any) => c.id === cat.id).latest_snapshot.age_bucket === '7d', 'age-bucket filter compares like with like');

/* ---------------------------------------------------------------- 5. multi-moment source + reserve */
console.log('\n[5] one source, several moments; reserving one leaves the others usable');
const mkSource = (id: string, status: string) => d.prepare(`INSERT OR REPLACE INTO sources(asset_id, original_url, source_platform, external_id, title, duration, permission_status, license)
  VALUES (?,?,?,?,?,?,?,?)`).run(id, `https://example.org/${id}`, 'pexels', id, `test ${id}`, 60, status, 'Pexels License');
mkSource('src-test-a', 'pending'); mkSource('src-test-b', 'pending'); mkSource('src-test-c', 'pending'); mkSource('src-test-d', 'pending'); mkSource('src-test-e', 'pending');
const mk = (src: string, s: number, e: number, extra: any = {}) => lib.addMoment({ source_id: src, brand_id: 'viral-rankings', category_id: cat.id, start_ms: s, end_ms: e, description: `test moment ${src} ${s}`, creative_status: 'usable', rank_suitability: 8, ...extra }, 'test');
const baseCounts = lib.momentCounts({ categoryId: cat.id }); // real moments may already sit in this category
const a1 = mk('src-test-a', 1000, 6000), a2 = mk('src-test-a', 20000, 26000), a3 = mk('src-test-a', 40000, 45000);
const b1 = mk('src-test-b', 2000, 8000), c1 = mk('src-test-c', 0, 5000), dd1 = mk('src-test-d', 3000, 9000), e1 = mk('src-test-e', 1000, 7000);
ok(lib.listMoments({ sourceId: 'src-test-a' }).length === 3, 'three moments stored on one source');
const res = lib.reserveMoment(a1, 'rank-test-0001', { agent: 'test' });
ok(lib.getMoment(a1).creative_status === 'reserved' && lib.getMoment(a1).reserved_by === 'rank-test-0001', 'reserved moment marked with its production');
ok(res.siblings_still_available.includes(a2) && res.siblings_still_available.includes(a3), 'sibling moments of the same source stay available', res);
ok(lib.listMoments({ sourceId: 'src-test-a', available: true }).length === 2, 'available list = 2 after reserving 1 of 3');
ok(res.publishable === false, 'reservation reports the moment is not yet publishable (source pending)');
throws(() => lib.reserveMoment(a1, 'rank-test-other'), /reserved by/, 'a second production cannot take a reserved moment');
ok(lib.usageOf({ momentId: a1 }).some((u: any) => u.status === 'reserved'), 'reservation recorded in moment_usage');
const dup = mk('src-test-a', 1000, 6000);
ok(lib.getMoment(dup).duplicate_of === a1, 'identical window flagged duplicate_of');
const counts = lib.momentCounts({ categoryId: cat.id });
ok(counts.total - baseCounts.total === 8 && counts.rights_pending - baseCounts.rights_pending === 8 && counts.rights_cleared === baseCounts.rights_cleared, 'counts: pending vs cleared tracked separately', counts);

/* ---------------------------------------------------------------- 6 + 7. ranking plans */
console.log('\n[6/7] RankingPlan: rights gate, rank vs reveal order');
const entry = (rank: number, reveal: number, moment: string, src: string, i: number, o: number) => ({ rank_position: rank, reveal_index: reveal, source_id: src, moment_id: moment, in_ms: i, out_ms: o, left_label: `Label ${rank}` });
const top3 = { brand_id: 'viral-rankings', production_id: 'rank-test-0001', category_id: cat.id, format: 'top3', ranking_criterion: 'funniest cat misjudgements (editorial)',
  reveal_order: [2, 3, 1], entries: [entry(2, 0, a1, 'src-test-a', 1200, 5800), entry(3, 1, b1, 'src-test-b', 2000, 8000), entry(1, 2, c1, 'src-test-c', 0, 5000)],
  title: 'TOP 3 CAT FAIL MOMENTS', title_styles: { primary: 'yellow', secondary: 'red', connector: 'white', spans: [{ text: 'TOP 3', color: 'connector' }, { text: 'CAT', color: 'primary' }, { text: 'FAIL', color: 'secondary' }, { text: 'MOMENTS', color: 'connector' }] }, cta_variant: 'none' };
let r = validateRankingPlan(top3);
ok(r.valid && !r.publishable && r.rights_blockers.length === 3, '[6] structurally valid top3 with pending sources is NOT publishable', r);
setRights('src-test-a', 'approved_with_conditions', { actor: 'test', reason: 'test fixture', evidence: 'https://www.pexels.com/license/' });
setRights('src-test-b', 'approved', { actor: 'test', reason: 'test fixture', evidence: 'https://www.pexels.com/license/' });
r = validateRankingPlan(top3);
ok(!r.publishable && r.rights_blockers.some(b => /src-test-c is pending/.test(b)), '[6] one remaining pending source still blocks the plan', r.rights_blockers);
setRights('src-test-c', 'approved', { actor: 'test', reason: 'test fixture', evidence: 'https://www.pexels.com/license/' });
// countersign gate (hardening 2026-10-31): approvals by anyone but rights-scout/owner are proposals only
r = validateRankingPlan(top3);
ok(r.valid && !r.publishable && r.rights_blockers.length === 3 && r.rights_blockers.every(b => /not countersigned/.test(b)), '[6] approved but only PROPOSED (not by rights-scout/owner) is NOT publishable', r.rights_blockers);
for (const s of ['src-test-a', 'src-test-b']) setRights(s, s === 'src-test-a' ? 'approved_with_conditions' : 'approved', { actor: 'rights-scout', reason: 'countersigned by rights-scout (test)', evidence: 'https://www.pexels.com/license/' });
setRights('src-test-c', 'approved', { actor: 'showrunner-viral-rankings', reason: 'proposed by showrunner', evidence: 'https://www.pexels.com/license/' });
r = validateRankingPlan(top3);
ok(!r.publishable && r.rights_blockers.length === 1 && /src-test-c.*showrunner-viral-rankings/.test(r.rights_blockers[0]), '[6] showrunner proposal after the classifier still blocks until countersigned', r.rights_blockers);
setRights('src-test-c', 'approved', { actor: 'rights-scout', reason: 'countersigned by rights-scout (test)', evidence: 'https://www.pexels.com/license/' });
r = validateRankingPlan(top3);
ok(r.valid && r.publishable, '[7] top3 reveal 2→3→1 valid + publishable once all rights approved and countersigned', r);
setRights('src-test-c', 'approved', { actor: 'showrunner-viral-rankings', reason: 'window changed, re-proposed', evidence: 'https://www.pexels.com/license/' });
ok(!validateRankingPlan(top3).publishable, '[6] a later re-proposal (newer than the countersign) needs a new countersign');
setRights('src-test-c', 'approved', { actor: 'owner', reason: 'owner decision (test)', evidence: 'owner note' });
ok(validateRankingPlan(top3).publishable, '[6] an explicit owner decision counts as a countersign');
lib.setMomentStatus(b1, null, { rights: 'rejected', actor: 'test', reason: 'broadcast logo in window' });
r = validateRankingPlan(top3);
ok(!r.publishable && /moment rights rejected/.test(r.rights_blockers.join()), '[6] moment-level rights rejection blocks even with an approved source', r.rights_blockers);
lib.setMomentStatus(b1, null, { rights: 'approved', actor: 'showrunner-viral-rankings', reason: 'logo cropped out', evidence: 'frame check' });
ok(!validateRankingPlan(top3).publishable && /moment .*not countersigned/.test(validateRankingPlan(top3).rights_blockers.join()), '[6] a moment-level approval also needs a countersign');
lib.setMomentStatus(b1, null, { rights: 'inherit', actor: 'test', reason: 'logo cropped out, re-reviewed' });
const expiredId = (d.prepare(`SELECT id FROM rights_log WHERE asset_id='src-test-c' ORDER BY id DESC LIMIT 1`).get() as any).id;
ok(validateRankingPlan({ ...top3, entries: top3.entries.map(e => e.rank_position === 1 ? { ...e, rights_decision_id: expiredId } : e) }).publishable, 'rights_decision_id pointing at the approval is accepted');
ok(!validateRankingPlan({ ...top3, entries: top3.entries.map(e => e.rank_position === 1 ? { ...e, rights_decision_id: 1 } : e) }).publishable, 'rights_decision_id for another asset is rejected');

for (const s of ['src-test-d', 'src-test-e']) setRights(s, 'approved', { actor: 'rights-scout', reason: 'test fixture', evidence: 'https://www.pexels.com/license/' });
const top5 = { ...top3, format: 'top5', title: 'TOP 5 CAT FAIL MOMENTS', title_styles: { ...top3.title_styles, spans: top3.title_styles.spans.map((sp: any, i: number) => i === 0 ? { ...sp, text: 'TOP 5' } : sp) }, reveal_order: [4, 2, 5, 3, 1], entries: [
  entry(4, 0, a2, 'src-test-a', 20000, 25000), entry(2, 1, b1, 'src-test-b', 2000, 8000), entry(5, 2, dd1, 'src-test-d', 3000, 9000),
  entry(3, 3, e1, 'src-test-e', 1000, 7000), entry(1, 4, c1, 'src-test-c', 0, 5000)] };
r = validateRankingPlan(top5);
ok(r.valid && r.publishable, '[7] top5 reveal 4→2→5→3→1 valid + publishable', r);

const bad = (name: string, plan: any, re: RegExp) => { const x = validateRankingPlan(plan); ok(!x.valid && !x.publishable && re.test(x.errors.join(' | ')), `[7] rejects ${name}`, x.errors); };
bad('wrong entry count', { ...top3, entries: top3.entries.slice(0, 2) }, /exactly 3 entries/);
bad('duplicate rank', { ...top3, entries: top3.entries.map(e => e.rank_position === 3 ? { ...e, rank_position: 2 } : e) }, /rank_position must be exactly 1..3/);
bad('duplicate reveal index', { ...top3, entries: top3.entries.map(e => e.rank_position === 3 ? { ...e, reveal_index: 0 } : e) }, /reveal_index must be exactly 0..2/);
bad('reveal_order not matching entries', { ...top3, reveal_order: [3, 2, 1] }, /reveal_order\[0\] = 3/);
bad('reveal_order not a permutation', { ...top3, reveal_order: [2, 2, 1] }, /permutation/);
bad('in/out outside moment bounds', { ...top3, entries: top3.entries.map(e => e.rank_position === 2 ? { ...e, out_ms: 9000 } : e) }, /outside moment bounds/);
bad('window under 0.8 s', { ...top3, entries: top3.entries.map(e => e.rank_position === 2 ? { ...e, out_ms: e.in_ms + 500 } : e) }, /0\.8 s/);
bad('moment from another source', { ...top3, entries: top3.entries.map(e => e.rank_position === 2 ? { ...e, source_id: 'src-test-b' } : e) }, /belongs to src-test-a/);
bad('same moment twice', { ...top3, entries: top3.entries.map(e => e.rank_position === 3 ? { ...e, moment_id: a1, source_id: 'src-test-a', in_ms: 1200, out_ms: 5800 } : e) }, /same moment appears twice/);
// overlapping windows: add an overlapping moment on src-test-a
const aOver = mk('src-test-a', 4000, 12000);
bad('overlapping windows on one source', { ...top5, entries: top5.entries.map(e => e.rank_position === 3 ? { ...e, moment_id: aOver, source_id: 'src-test-a', in_ms: 4000, out_ms: 9000 } : e).map(e => e.rank_position === 4 ? { ...e, moment_id: a1, in_ms: 1200, out_ms: 5800 } : e) }, /overlap/);
bad('adjacent reveals from one source', { ...top5, entries: top5.entries.map(e => e.rank_position === 2 ? { ...e, moment_id: a3, source_id: 'src-test-a', in_ms: 40000, out_ms: 45000 } : e) }, /adjacent reveals/);
bad('three entries from one source', { ...top5, entries: top5.entries.map(e => e.rank_position === 5 ? { ...e, moment_id: a3, source_id: 'src-test-a', in_ms: 40000, out_ms: 45000 } : e.rank_position === 1 ? { ...e, moment_id: a1, source_id: 'src-test-a', in_ms: 1200, out_ms: 5800 } : e) }, /used 3 times/);
const two = validateRankingPlan({ ...top5, entries: top5.entries.map(e => e.rank_position === 3 ? { ...e, moment_id: a3, source_id: 'src-test-a', in_ms: 40000, out_ms: 45000 } : e) });
ok(two.publishable && two.warnings.some(w => /used twice/.test(w)), '[7] two non-adjacent, non-overlapping moments of one source allowed with a review warning', two);
ok(validateRankingPlan({ ...top3, reveal_order: [3, 2, 1], entries: top3.entries.map(e => ({ ...e, reveal_index: 3 - e.rank_position })) }).warnings.some(w => /plain countdown/.test(w)), 'plain countdown allowed but flagged');
lib.setMomentStatus(c1, 'rejected', { actor: 'test', reason: 'context misleading' });
bad('dead (rejected) moment', top3, /moment is rejected/);

/* ---------------------------------------------------------------- build step: plan → cutlist, layout, content-addressed import */
console.log('\n[B] ranking:cutlist converter, layer layout, import by content');
{
  const { planToCutlist, titleWords } = await import('../packages/ranking/src/cutlist.ts');
  const { placedRect, zoneInSource, VR, blockedAccentWords } = await import('../packages/ranking/src/layout.ts');
  const { revealStarts } = await import('../packages/ranking/src/layers.ts');
  const { stageByContent, shaOfFileSync } = await import('../packages/occ/src/build.ts');
  lib.setMomentStatus(c1, 'usable', { actor: 'test', reason: 'restore for converter tests' });
  d.prepare(`INSERT OR IGNORE INTO productions(production_id, brand_id, format, title, current_state) VALUES ('rank-test-0001','viral-rankings','ranking','test','research')`).run();
  d.prepare(`INSERT OR IGNORE INTO productions(production_id, brand_id, format, title, current_state) VALUES ('rank-test-other-brand','rankings','ranking','test','research')`).run();
  // owner rule (2026-10-31): the converter renders TOP 5 only. Fixture = top3's first two reveals (#2 a1, #3 b1) + #5 d, #4 e, #1 c last,
  // so the timeline of the first clips (payoff/CTA/punch tests) is unchanged.
  const plan = { ...top5, reveal_order: [2, 3, 5, 4, 1], entries: [entry(2, 0, a1, 'src-test-a', 1200, 5800), entry(3, 1, b1, 'src-test-b', 2000, 8000), entry(5, 2, dd1, 'src-test-d', 3000, 9000),
    entry(4, 3, e1, 'src-test-e', 1000, 7000), entry(1, 4, c1, 'src-test-c', 0, 5000)] };
  ok(validateRankingPlan(plan).publishable, 'converter fixture: top5 reveal 2→3→5→4→1 publishable', validateRankingPlan(plan));
  throws(() => planToCutlist(top3), /every ranking is TOP 5/, 'converter refuses a TOP 3 plan (owner rule)');
  const { cutlist } = planToCutlist(plan);
  ok(cutlist.segments.map((s: any) => s.item).join() === '2,3,5,4,1', 'segments emitted in reveal order 2→3→5→4→1 with item = rank_position', cutlist.segments.map((s: any) => s.item));
  ok(cutlist.segments[0].src_in === 1.2 && cutlist.segments[0].src_out === 5.8, 'ms → seconds on the source timebase');
  ok(cutlist.ranking.entries.every((e: any, i: number) => e.segment === i && e.moment_id === cutlist.segments[i].why.split('moment ')[1]), 'segment ↔ rank ↔ moment map recorded', cutlist.ranking.entries);
  ok(cutlist.rank_layers.labels['1'] === 'Label 1' && cutlist.rank_layers.n === 5 && cutlist.rank_layers.cta === null, 'rail labels per rank, CTA off by default');
  ok(cutlist.rank_layers.title.words.map((w: any) => w.color).join() === '#FFFFFF,#FFFFFF,#FFD60A,#FF3B47,#FFFFFF', 'title spans → white connectors + two accents', cutlist.rank_layers.title.words);
  ok(cutlist.texts.length === 0 && cutlist.caption_x != null && cutlist.caption_max_chars === 20, 'caption band options set; no text overlays (layers carry the graphics)');
  throws(() => titleWords({ title: 'TOP 3 CAT FAILS', title_styles: { primary: 'yellow', secondary: 'red', connector: 'white', spans: [{ text: 'TOP 3 CAT FAILS', color: 'primary' }] } }), /two accent colours/, 'title with one accent colour refused');
  throws(() => titleWords({ title: 'TOP 3 CAT FAILS', title_styles: { primary: 'yellow', secondary: 'red', spans: [{ text: 'TOP 3', color: 'primary' }, { text: 'DOG', color: 'secondary' }] } }), /do not spell/, 'spans that do not spell the title refused');
  const cta = planToCutlist({ ...plan, cta_variant: 'mid_sub' }).cutlist.rank_layers.cta;
  ok(cta && cta.dur <= 0.8 && cta.at >= 1.5, 'mid_sub CTA ≤ 0.8 s placed after the first 1.5 s', cta);
  const pay = lib.addMoment({ source_id: 'src-test-b', brand_id: 'viral-rankings', start_ms: 2000, end_ms: 8000, payoff_ms: 4000, description: 'payoff moment', creative_status: 'usable' }, 'test');
  const withPayoff = { ...plan, entries: plan.entries.map((e: any) => e.rank_position === 3 ? { ...e, moment_id: pay } : e) };
  throws(() => planToCutlist({ ...withPayoff, cta_variant: 'mid_sub', cta_at_ms: 6200 }), /overlaps a payoff/, 'CTA over a payoff refused (payoff at 6.6 s timeline)');
  lib.setMomentStatus(b1, null, { rights: 'rejected', actor: 'test', reason: 'converter gate test' });
  throws(() => planToCutlist(plan), /non-publishable/, 'converter re-runs the per-moment rights gate (rejected moment refused)');
  lib.setMomentStatus(b1, null, { rights: 'inherit', actor: 'test', reason: 'restore' });
  throws(() => planToCutlist({ ...plan, production_id: 'rank-test-other-brand', entries: plan.entries.map((e: any) => e.rank_position === 2 ? { ...e, moment_id: a2, in_ms: 20000, out_ms: 25000 } : e) }), /brand rankings/, 'converter refuses a production of another brand');
  // geometry: landscape fit box below the title band, rail zone maps into the picture's left edge only
  const pr = placedRect(1920, 1080, { fit_box: VR.footage });
  ok(pr[1] >= VR.title[3] && Math.round(pr[2] - pr[0]) === 1080, 'landscape footage fits under the title band', pr);
  const rz = zoneInSource(VR.rail, pr, 1920, 1080)!;
  ok(rz && rz[2] < 1920 * 0.3, 'rail zone covers < 30 % of the picture width (left edge)', rz);
  ok(VR.rail[2] <= 290 && VR.caption[3] <= 1420 && VR.caption[1] > VR.rail[3] && VR.title[3] < VR.rail[1], 'rail/title/caption zones do not overlap and stay in the safe box');
  // title accent rule (owner 2026-10-31): accents on hype/generic words are refused by the validator and the converter
  { const badTitle = { ...plan, title: 'Funniest ROBOT Fails', title_styles: { primary: 'mint', secondary: 'orange', connector: 'white', spans: [{ text: 'Funniest', color: 'primary' }, { text: 'ROBOT', color: 'secondary' }, { text: 'Fails', color: 'connector' }] } };
    ok(!validateRankingPlan(badTitle).valid && validateRankingPlan(badTitle).errors.some((e: string) => /accent/.test(e)), 'validator refuses an accent on "Funniest"');
    throws(() => planToCutlist(badTitle), /accent|topic keywords/, 'converter refuses an accent on "Funniest"');
    ok(blockedAccentWords(['DEEP-SEA', 'ROBOT']).length === 0 && blockedAccentWords(['Most', 'WILD']).length === 2, 'blocklist check'); }
  // title format (owner 2026-10-31 final): exactly "TOP <N> <WORD1> <WORD2> MOMENTS", two different accents on the middle words
  { const mk = (title: string, spans: any[], extra: any = {}) => ({ ...plan, title, title_styles: { primary: 'mint', secondary: 'orange', connector: 'white', spans }, ...extra });
    const okSpans = [{ text: 'TOP 5', color: 'connector' }, { text: 'DEEP-SEA', color: 'primary' }, { text: 'OCTOPUS', color: 'secondary' }, { text: 'MOMENTS', color: 'connector' }];
    const fmt = (p: any) => validateRankingPlan(p).errors.filter((e: string) => /title/.test(e));
    ok(fmt(mk('TOP 5 DEEP-SEA OCTOPUS MOMENTS', okSpans)).length === 0, 'title format: valid (hyphenated compound = one word)');
    ok(fmt(mk('TOP 5 CAT FAILS', [{ text: 'TOP 5', color: 'connector' }, { text: 'CAT', color: 'primary' }, { text: 'FAILS', color: 'secondary' }])).some((e: string) => /exactly/.test(e)), 'title format: old 3-word title refused');
    ok(fmt(mk('TOP 5 CAT FAIL MOMENTS', okSpans.map((s, i) => i === 1 ? { ...s, text: 'CAT' } : i === 2 ? { ...s, text: 'FAIL' } : s))).length === 0, 'title format: plain words valid');
    ok(fmt(mk('TOP 3 DEEP-SEA OCTOPUS MOMENTS', okSpans.map((s, i) => i === 0 ? { ...s, text: 'TOP 3' } : s))).some((e: string) => /format has 5/.test(e)), 'title format: N must equal the format count');
    ok(fmt(mk('TOP 5 DEEP SEA OCTOPUS MOMENTS', [{ text: 'TOP 5', color: 'connector' }, { text: 'DEEP SEA', color: 'primary' }, { text: 'OCTOPUS', color: 'secondary' }, { text: 'MOMENTS', color: 'connector' }])).some((e: string) => /exactly/.test(e)), 'title format: three topic words refused');
    ok(fmt(mk('TOP 5 DEEP-SEA OCTOPUS MOMENTS', okSpans.map((s, i) => i === 2 ? { ...s, color: 'primary' } : s))).some((e: string) => /secondary|different/.test(e)), 'title format: both keywords in the same accent refused');
    ok(fmt(mk('TOP 5 DEEP-SEA OCTOPUS MOMENTS', okSpans.map((s, i) => i === 3 ? { ...s, color: 'secondary' } : s))).some((e: string) => /MOMENTS.*white/.test(e)), 'title format: MOMENTS must stay white');
    ok(fmt(mk('TOP 5 DEEP-SEA OCTOPUS MOMENTS', okSpans, { title_styles: { primary: 'mint', secondary: 'mint', connector: 'white', spans: okSpans } })).some((e: string) => /differ/.test(e)), 'title format: primary = secondary colour refused');
    ok(fmt(mk('TOP 5 DEEP-SEA OCTOPUS MOMENTS', [])).some((e: string) => /spans is required/.test(e)), 'title format: needs spans'); }
  const starts = revealStarts({ ...cutlist.rank_layers, reveal_order: [2, 3, 1] } as any, [{ item: 2, startF: 0 }, { item: 3, startF: 138 }, { item: 1, startF: 318 }] as any);
  ok(starts.join() === '0,138,318', 'reveal starts follow the reveal order (non-sequential ranks)', starts);
  // import by content: same name + different content → different pool names; identical content → same name
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-stage-'));
  const f1 = path.join(dir, 'a', 'narr_00_hook.wav'), f2 = path.join(dir, 'b', 'narr_00_hook.wav'), f3 = path.join(dir, 'c', 'renamed.wav');
  for (const [f, c] of [[f1, 'take one'], [f2, 'take two'], [f3, 'take one']] as const) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); }
  const st = path.join(dir, 'stage'); fs.mkdirSync(st);
  const [s1, s2, s3] = [f1, f2, f3].map(f => stageByContent(f, shaOfFileSync(f), st));
  ok(path.basename(s1) !== path.basename(s2), 'same file name, different content → different import names', [s1, s2]);
  ok(shaOfFileSync(s3) === shaOfFileSync(s1) && path.basename(s3).split('.')[1] === path.basename(s1).split('.')[1], 'identical content under another name → same content hash in the import name', [s1, s3]);
  fs.rmSync(dir, { recursive: true, force: true });

  // compact title layout (2026-10-31 hardening #5): one-line band, 4:3 sources fill the 960 px box (50 % of the frame) via fill_box
  const { titleLayout, fillBoxTrim } = await import('../packages/ranking/src/layout.ts');
  for (const s of ['src-test-a', 'src-test-b', 'src-test-c', 'src-test-d', 'src-test-e']) d.prepare(`UPDATE sources SET analysis=? WHERE asset_id=?`).run(J.str({ width: 1440, height: 1080 }), s);
  const std = planToCutlist(plan).cutlist;
  ok(!std.rank_layers.title_box && std.segments.every((s: any) => JSON.stringify(s.fit_box) === JSON.stringify(VR.footage) && !s.trim) && !('footage_height_pct' in std.ranking.entries[0]),
    'default (no title_layout) output unchanged: standard band, footage box [0,590,1080,1210], no auto trim');
  const cp = planToCutlist({ ...plan, style: 'v1', title_layout: 'compact', entries: plan.entries.map((e: any) => ({ ...e, fill: 'blur', framing: { fill_box: true } })) }).cutlist;
  const lay = titleLayout('compact');
  ok(JSON.stringify(cp.rank_layers.title_box) === JSON.stringify(lay.title) && lay.title[3] < lay.footage[1], 'compact: title band y 262-402 passed to the layer renderer, above the footage box', cp.rank_layers);
  ok(cp.segments.every((s: any) => JSON.stringify(s.fit_box) === '[0,410,1080,1370]' && s.trim.left + s.trim.right === 225), 'compact: 4:3 1440x1080 gets box y 410-1370 + 225 px side trim', cp.segments.map((s: any) => [s.fit_box, s.trim]));
  ok(cp.ranking.entries.every((e: any) => e.footage_height_pct >= 50), '4:3 footage fills ≥ 50 % of the frame height', cp.ranking.entries.map((e: any) => e.footage_height_pct));
  throws(() => planToCutlist({ ...plan, style: 'v1', title_layout: 'compact', entries: plan.entries.map((e: any) => ({ ...e, framing: { fit_box: [0, 300, 1080, 1300] } })) }), /compact footage area/, 'compact: fit_box over the title band refused');
  // tall layout (2026-10-31, QA F13): band y 262-372, footage y 380-1600 with a follow window; captions/credit/CTA unchanged inside the safe box
  const tl = planToCutlist({ ...plan, style: 'v1', title_layout: 'tall', entries: plan.entries.map((e: any) => ({ ...e, fill: 'blur', framing: { follow: { keys: [[0, 0.5, 0.5]] } } })) }).cutlist;
  const tlay = titleLayout('tall');
  ok(tl.rank_layers.title_layout === 'tall' && JSON.stringify(tl.rank_layers.title_box) === '[64,262,1016,372]' && tlay.title[3] < tlay.footage[1], 'tall: title band y 262-372 passed to the layer renderer, above the footage box', tl.rank_layers);
  ok(tl.segments.every((s: any) => JSON.stringify(s.fit_box) === '[0,380,1080,1600]') && tl.ranking.entries.every((e: any) => e.footage_height_pct >= 63), 'tall: footage box y 380-1600 (>= 63 % of the frame)', tl.ranking.entries.map((e: any) => e.footage_height_pct));
  ok(tl.caption_y_ranges.every((r: any) => r.y === std.caption_y_ranges[0].y), 'tall: caption band stays in the union safe box (over the footage)');
  ok(planToCutlist({ ...plan, style: 'v1', title_layout: 'tall', entries: plan.entries.map((e: any) => ({ ...e, fill: 'blur', framing: { fit_box: [0, 372, 1080, 1620] } })) }).cutlist.segments.length === plan.entries.length, 'tall: max box [0,372,1080,1620] accepted');
  throws(() => planToCutlist({ ...plan, style: 'v1', title_layout: 'tall', entries: plan.entries.map((e: any) => ({ ...e, framing: { fit_box: [0, 380, 1080, 1700] } })) }), /tall footage area/, 'tall: fit_box into the bottom UI strip refused');
  throws(() => fillBoxTrim(1920, 1080, [0, 410, 1080, 1370]), /cut 37 % of the width/, 'fill_box refuses cutting > 25 % (16:9 into a 9:8 box)');
  ok(JSON.stringify(fillBoxTrim(320, 240, [0, 410, 1080, 1370])) === JSON.stringify({ top: 0, bottom: 0, left: 25, right: 25 }), 'fill_box trim for 320x240 = 25 px each side');
  throws(() => titleLayout('tiny'), /unknown/, 'unknown title_layout refused');
  // full layout (2026-11-11, opt-in, style v2): footage owns the canvas, title over it 0-1.6 s then a one-line chip, rail under the chip
  {
    const { VR_FULL, VR_V2, fullFootageBox, vrRailRect } = await import('../packages/ranking/src/layout.ts');
    const { subBadgeAnchor } = await import('../packages/ranking/src/layers.ts');
    throws(() => titleLayout('full', 'v1'), /needs style v2/, 'full: style v1 refused');
    ok(JSON.stringify(fullFootageBox(1080, 1920)) === '[0,0,1080,1920]' && JSON.stringify(fullFootageBox(720, 1280)) === '[0,0,1080,1920]', 'full: 9:16 source = whole canvas (contain == cover, zero crop)');
    ok(JSON.stringify(fullFootageBox(1920, 1080)) === JSON.stringify(VR_FULL.footage) && VR_FULL.footage[1] >= 200 && VR_FULL.footage[3] <= 1680 && (VR_FULL.footage[1] + VR_FULL.footage[3]) / 2 <= 960, 'full: landscape = tall box, centre at/above the middle');
    const mid = fullFootageBox(1080, 1720);   // 9:16 with a 200 px top trim: full width, nothing cropped
    ok(mid[0] === 0 && mid[2] === 1080 && mid[1] >= 0 && mid[3] <= 1920 && Math.abs((mid[3] - mid[1]) - 1720) <= 1, 'full: near-vertical (0.63) keeps the full width', mid);
    const [sx0, sy0, sx1, sy1] = VR.safe, inSafe = (r: number[]) => r[0] >= sx0 && r[1] >= sy0 && r[2] <= sx1 && r[3] <= sy1;
    ok(inSafe(VR_FULL.title) && inSafe(VR_FULL.chip), 'full: title + chip boxes inside the safe box x 64-936, y >= 270');
    ok(vrRailRect('full')[1] >= VR_FULL.chip[3] + 8 && vrRailRect('full')[3] < VR.caption[1] && JSON.stringify(vrRailRect('tall')) === JSON.stringify(VR_V2.rail), 'full: rail starts under the chip and ends above the caption band; other layouts keep the v2 rail');
    const b = subBadgeAnchor({ style: 'v2', title_layout: 'full' } as any);
    ok(b.y0 >= vrRailRect('full')[3] && b.y0 + 76 < VR.caption[1] && b.x1 <= sx1, 'full: subscribe badge between the rail and the caption band', b);
    for (const s of ['src-test-a', 'src-test-b', 'src-test-c', 'src-test-d', 'src-test-e']) d.prepare(`UPDATE sources SET analysis=? WHERE asset_id=?`).run(J.str({ width: 1080, height: 1920 }), s);
    const fl = planToCutlist({ ...plan, style: 'v2', title_layout: 'full' }).cutlist;
    ok(fl.segments.every((s: any) => s.fill === 'blur' && JSON.stringify(s.fit_box) === '[0,0,1080,1920]' && !s.trim) && fl.ranking.entries.every((e: any) => e.footage_height_pct === 100),
      'full: vertical sources contain-fit into the whole canvas, no trim, 100 % height', fl.segments.map((s: any) => [s.fill, s.fit_box]));
    ok(fl.rank_layers.title_layout === 'full' && JSON.stringify(fl.rank_layers.title_box) === JSON.stringify(VR_FULL.title) && fl.rank_layers.style === 'v2', 'full: title_layout + title box passed to the layer renderer');
    ok(fl.caption_y_ranges.every((r: any) => { const cy = VR.H / 2 + r.y / 100 * VR.H; return cy > vrRailRect('full')[3] && cy < sy1; }), 'full: caption band under the rail, inside the safe box');
    ok(planToCutlist({ ...plan, style: 'v2', title_layout: 'full', entries: plan.entries.map((e: any) => ({ ...e, framing: { follow: { keys: [[0, 0.5, 0.5]] } } })) }).cutlist.segments.every((s: any) => s.follow && JSON.stringify(s.fit_box) === '[0,0,1080,1920]'), 'full: follow keeps working inside the full canvas');
    for (const s of ['src-test-a', 'src-test-b', 'src-test-c', 'src-test-d', 'src-test-e']) d.prepare(`UPDATE sources SET analysis=? WHERE asset_id=?`).run(J.str({ width: 1440, height: 1080 }), s);
    ok(planToCutlist({ ...plan, style: 'v2', title_layout: 'full' }).cutlist.segments.every((s: any) => JSON.stringify(s.fit_box) === JSON.stringify(VR_FULL.footage)), 'full: 4:3 source = tall box over the blur fill, no crop');
  }
  // zoom guard + plan-entry payoff (2026-11-08)
  const zoomed = (fr: any) => ({ ...plan, entries: plan.entries.map((e: any) => ({ ...e, fill: 'blur', framing: fr })) });
  const follow = { zoom: 0.5, keys: [[0, 0.5, 0.5]] };
  throws(() => planToCutlist(zoomed({ follow })), /whole in frame/, 'zoom below 0.75 without zoom_ok_reason refused');
  ok(planToCutlist(zoomed({ follow, zoom_ok_reason: 'test' })).warnings.some((w: string) => /zoom 0\.5 below/.test(w)), 'zoom below 0.75 with a reason = named warning');
  ok(planToCutlist(zoomed({ follow: { ...follow, zoom: 0.75 } })).cutlist.segments.length === plan.entries.length, 'zoom 0.75 passes');
  const pe2 = planToCutlist({ ...plan, entries: plan.entries.map((e: any) => ({ ...e, payoff_ms: e.in_ms + 100 })) }).cutlist.ranking.entries;
  ok(pe2.every((e: any) => e.payoff_est != null && e.payoff_ms != null), 'payoff_est comes from the plan entry payoff_ms', pe2.map((e: any) => e.payoff_est));

  // clipped punch (8knt v6 bug): the punch is baked into the window at a FIXED frame size (= the picture's size in the fit_box), zoom anchored
  // bottom-centre, so the picture can never grow past the fit_box into the title band
  { const { punchFilter } = await import('../packages/occ/src/build.ts');
    const { execFileSync } = await import('node:child_process');
    const pd = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-punch-')), pf = path.join(pd, 'pz.mp4');
    const f = punchFilter({ ow: 1080, oh: 810, t0: 0.5, t1: 2.0, s: 1.15 });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x240:r=30:d=3', '-vf', `drawbox=x=0:y=0:w=iw:h=24:color=red:t=fill,${f}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', pf]);
    const probe = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'csv=p=0', pf]).toString().trim();
    ok(probe === '1080,810,90', 'punched window keeps a fixed frame size (fit_box placement unchanged) and every frame', probe);
    const px = (t: number) => [...execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', pf, '-frames:v', '1', '-vf', 'crop=1080:4:0:10', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])].slice(0, 3);
    const [p0, p1] = [px(0.2), px(2.6)];
    ok(p0[0] > 200 && p0[2] < 60 && p1[0] < 60 && p1[2] > 200, 'punch zooms inside the frame: top band (red) visible before, cropped away after (bottom anchored, clipped)', { p0, p1 });
    fs.rmSync(pd, { recursive: true, force: true }); }

  // post-edit fields (hardening #2): what showrunners hand-edited in cutlist.json is now reproducible from the plan
  const pe = planToCutlist({ ...plan, end_hold_ms: 250, caption_max_chars: 16, caption_font_px: 60, credit_text: 'Clips via Pexels (Pexels License)', credit_center_y_px: 1515,
    credit_style: { font_px: 34, max_chars: 52 }, credits: ['Clean title A. Pexels License', 'Clean title B. Pexels License'], build_defaults: { clip_credits: false } });
  ok(pe.cutlist.end_hold === 0.25 && pe.cutlist.caption_max_chars === 16 && pe.cutlist.caption_font_px === 60, 'end_hold_ms / caption_max_chars / caption_font_px mapped', [pe.cutlist.end_hold, pe.cutlist.caption_max_chars]);
  ok(!pe.cutlist.credit_line && !pe.cutlist.clip_credits, 'no on-screen credit plates (owner rule 2026-11-01)', pe.cutlist.credit_line);
  ok(pe.cutlist.credits.length === 2 && pe.cutlist.credits[0] === 'Clean title A. Pexels License', 'credits override replaces source file names');
  ok(!('end_hold' in std) && std.credits.length > 0 && std.caption_max_chars === 20, 'without the new fields the defaults are unchanged');
  ok(!validateRankingPlan({ ...plan, credit_center_y_px: 1600 }).valid, 'credit_center_y_px above 1520 refused');
  // build defaults (2026-10-31, wave-1 QA i1gu v2 / akn1 v3): on for every viral-rankings cut list unless plan.build_defaults turns one off
  { const { VR_DEFAULTS } = await import('../packages/ranking/src/layout.ts');
    const { shortCredit, fullCredit } = await import('../packages/ranking/src/cutlist.ts');
    const k1 = std.segments.findIndex((s: any) => s.item === 1);
    ok(std.caption_start_zero === true && std.rank_layers.empty_open === true && std.tail_max === 0.3 && std.cta_band === true, 'defaults: caption at 0, empty rail at 0, tail <= 0.3 s, CTA in the caption band', [std.caption_start_zero, std.rank_layers.empty_open, std.tail_max, std.cta_band]);
    ok(JSON.stringify(std.segments[0].punch_stages) === JSON.stringify([{ from_s: 0.15, to_s: 0.65, scale: 1.12 }]), 'defaults: opening punch 100->112 % at 0.15-0.65 s on the first clip', std.segments[0].punch_stages);
    ok(std.one_hit && std.one_hit.seg === k1 && std.one_hit.flash && /sfx\/hook_slam\.wav$/.test(std.one_hit.sting) && std.segments[k1].punch_stages?.some((p: any) => p.scale === 1.12), 'defaults: #1 hit (punch stage + flash + sting) on the #1 segment', std.one_hit);
    ok(std.bed_dips?.some((d: any) => d.db === VR_DEFAULTS.one_hit.dip_db && Math.abs(d.at - (std.one_hit.at - 0.05)) < 0.01), 'defaults: bed dip -8 dB on the #1 payoff', std.bed_dips);
    ok(!std.clip_credits && std.rank_layers, 'defaults: no per-clip credit plates (owner rule 2026-11-01)');
    ok(!('description_credits' in std.ranking), 'no description credits block (owner 2026-11-01)');
    ok(std.rank_layers.sub_badge && std.rank_layers.sub_badge.at.at(-1) === +(std.target_duration - 2.5).toFixed(3), 'sub_badge default ON: end badge in the last 2.5 s', std.rank_layers.sub_badge);
    ok(!('credit_line' in std), 'defaults: no single persistent credit line');
    const off = planToCutlist({ ...plan, build_defaults: { caption_zero: false, rail_empty: false, open_punch: false, one_hit: false, clip_credits: false, cta_band: false, tail_max_ms: null } }).cutlist;
    ok(!off.caption_start_zero && !off.rank_layers.empty_open && !('tail_max' in off) && !off.cta_band && !off.one_hit && !off.clip_credits && off.segments.every((s: any) => !s.punch_stages), 'build_defaults all false: legacy cut list', off);
    // a fast plan punch over the payoff wins; a slow one continues after the default stage
    const fast = planToCutlist({ ...withPayoff, entries: withPayoff.entries.map((e: any) => e.rank_position === 2 ? { ...e, framing: { punch: { from_s: 0, to_s: 0.8, scale_to: 1.1 } } } : e) }).cutlist;
    ok(!fast.segments[0].punch_stages && fast.segments[0].punch.to_s === 0.8, 'open punch: a fast plan punch on the first clip is kept (no double zoom)', fast.segments[0]);
    const slow = planToCutlist({ ...withPayoff, entries: withPayoff.entries.map((e: any) => e.rank_position === 2 ? { ...e, framing: { punch: { from_s: 0, to_s: 4, scale_to: 1.05 } } } : e) }).cutlist;
    ok(slow.segments[0].punch.from_s === 0.65 && slow.segments[0].punch_stages.length === 1, 'open punch: a slow plan punch continues after the stage', slow.segments[0]);
    // grade -> segment.lift; end CTA; payoff override
    const g = planToCutlist({ ...plan, end_cta: { text: 'Name the next category' }, entries: plan.entries.map((e: any) => e.rank_position === 1 ? { ...e, grade: { gamma: 1.3, brightness: 0.04 }, payoff_ms: e.in_ms + 1500 } : e) }).cutlist;
    ok(g.segments[k1].lift?.gamma === 1.3 && g.segments[k1].lift?.brightness === 0.04, 'grade {gamma, brightness} -> segment.lift (ffmpeg eq)', g.segments[k1].lift);
    ok(g.end_cta.text === 'Name the next category' && g.end_cta.dur === 2.2, 'end_cta -> cut list (2.2 s default)', g.end_cta);
    ok(g.one_hit.rel === 1.5 && g.one_hit.from === 'entry payoff_ms', 'entry payoff_ms drives the #1 hit time', g.one_hit);
    ok(!validateRankingPlan({ ...plan, entries: plan.entries.map((e: any) => e.rank_position === 1 ? { ...e, grade: { gamma: 3 } } : e) }).valid, 'grade gamma > 2 refused');
    // credits from source rows
    const pix = { attribution: 'cat, kitten, pet, cute by JawadAliKhan (Pixabay Content License) \u2014 https://pixabay.com/videos/id-1/', creator: 'JawadAliKhan', license: 'Pixabay Content License', source_platform: 'pixabay', original_url: 'https://pixabay.com/videos/id-1/' };
    ok(shortCredit(pix) === 'JawadAliKhan via Pixabay' && fullCredit(pix) === 'JawadAliKhan via Pixabay (Pixabay Content License) https://pixabay.com/videos/id-1/', 'tag-soup attribution -> creator/platform credit (one line on screen, full in description)', [shortCredit(pix), fullCredit(pix)]);
    ok(shortCredit({ attribution: 'Video courtesy of NOAA Ocean Exploration', creator: 'NOAA Ocean Exploration', source_platform: 'noaa' }) === 'Video courtesy of NOAA Ocean Exploration', 'a real attribution line is kept as the on-screen credit'); }

  // punch stages (open punch + #1 hit): clipped, fixed frame size, cumulative zoom; one stage = the old single punch filter
  { const { punchFilter, punchStagesOf, punchKeysOf } = await import('../packages/occ/src/build.ts');
    const { execFileSync } = await import('node:child_process');
    const st = punchStagesOf({ punch: { from_s: 2, to_s: 2.5, scale_to: 1.1 }, punch_stages: [{ from_s: 0.15, to_s: 0.65, scale: 1.12 }, { from_s: 0.5, to_s: 1, scale: 2 }] });
    ok(st.length === 2 && st[0].from_s === 0.15 && st[1].from_s === 2, 'punchStagesOf: sorted, overlapping stage dropped', st);
    const keys = punchKeysOf(st, 0);
    ok(Math.abs(keys[3][1] - 1.232) < 1e-9, 'punch stages multiply (1.12 x 1.1)', keys);
    ok(punchFilter({ ow: 1080, oh: 810, keys: [[0.5, 1], [2, 1.15]] }) === punchFilter({ ow: 1080, oh: 810, t0: 0.5, t1: 2, s: 1.15 }), 'one stage = the legacy single-punch filter (cache + behaviour unchanged)');
    const pd = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-punch2-')), pf = path.join(pd, 'pz.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x240:r=30:d=3', '-vf', `drawbox=x=0:y=0:w=iw:h=24:color=red:t=fill,${punchFilter({ ow: 1080, oh: 810, keys })}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', pf]);
    const probe = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'csv=p=0', pf]).toString().trim();
    ok(probe === '1080,810,90', 'two-stage punch keeps the fixed frame size and every frame', probe);
    const px = (t: number) => [...execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', pf, '-frames:v', '1', '-vf', 'crop=1080:4:0:10', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])].slice(0, 3);
    const [q0, q1] = [px(0.05), px(0.9)];
    ok(q0[0] > 200 && q1[0] < 60 && q1[2] > 200, 'opening stage zooms by 0.9 s (top band cropped away, clipped to the frame)', { q0, q1 });
    fs.rmSync(pd, { recursive: true, force: true }); }

  // layers.py: empty rail state (nothing lit) + #1 white flash WebM
  { const { execFileSync } = await import('node:child_process');
    const { VR } = await import('../packages/ranking/src/layout.ts');
    const od = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-layers-'));
    const spec = { W: 1080, H: 1920, out_dir: od, fonts: { display: path.join(root, VR.fonts.display), text: path.join(root, VR.fonts.text) }, colours: VR.colours,
      geometry: { title: VR.title, rail: VR.rail, logo: VR.logo, cta: VR.cta, flashCentre: VR.flashCentre }, title: { words: [{ text: 'TOP', color: '#FFFFFF' }, { text: '3', color: '#FFD60A' }, { text: 'CATS', color: '#FF3B47' }] },
      rail: { n: 3, reveal_order: [2, 3, 1], labels: { 1: 'A', 2: 'B', 3: 'C' }, label_at: null, big_labels: true, empty: true }, logo: { file: null, text: 'TOP RANK' }, flash: [], cta: null,
      white_flash: { rect: [0, 410, 1080, 1370], dur: 0.4 } };
    const sf = path.join(od, 'spec.json'); fs.writeFileSync(sf, JSON.stringify(spec), 'utf8');
    const res = JSON.parse(execFileSync(path.join(root, '.venv-asr', 'Scripts', 'python.exe'), ['-I', path.join(root, 'packages', 'ranking', 'py', 'layers.py'), sf]).toString().trim().split('\n').pop()!);
    const keys = res.files.map((f: any) => f.key);
    ok(keys.includes('rail_e') && keys.includes('white') && res.info.rail_empty.active === null, 'layers.py renders the empty rail (no active card) and the white flash', keys);
    const yellow = execFileSync(path.join(root, '.venv-asr', 'Scripts', 'python.exe'), ['-I', '-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGBA");print(sum(1 for r,g,b,a in im.getdata() if a>200 and r>230 and g>190 and b<60))', path.join(od, 'vr_rail_e.png')]).toString().trim();
    ok(yellow === '0', 'empty rail has no lit (yellow) card', yellow);
    fs.rmSync(od, { recursive: true, force: true }); }

  // mojibake (hardening #3): why strings ASCII, mojibake in plan text refused
  ok(std.segments.every((s: any) => /^[\x20-\x7e]*$/.test(s.why)), 'segment why strings are ASCII', std.segments.map((s: any) => s.why));
  const mj = validateRankingPlan({ ...plan, entries: plan.entries.map((e: any) => e.rank_position === 1 ? { ...e, left_label: 'Cat â€” dog' } : e) });
  ok(!mj.valid && mj.errors.some((e: string) => /mojibake/.test(e)), 'plan text with mojibake (â€”) refused', mj.errors);
}

/* ---------------------------------------------------------------- review kinds (hardening #4) */
console.log('\n[R] retention / rights reviews never overwrite the QA score');
{
  const { execFileSync } = await import('node:child_process');
  const { reviewKind } = await import('../packages/shared/src/schemas.ts');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-review-'));
  const cli = (file: string) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--disable-warning=ExperimentalWarning', path.join(root, 'packages/orchestrator/src/cli.ts'), 'review:add', file],
    { env: { ...process.env, STUDIO_DB: tmp }, cwd: root }).toString().trim().split('\n').filter(l => l.trim()).slice(-8).join('\n').replace(/^[^{]*/, ''));
  d.prepare(`INSERT OR IGNORE INTO productions(production_id, brand_id, format, title, current_state) VALUES ('rank-test-review','viral-rankings','ranking','review test','qa')`).run();
  const base = { production_id: 'rank-test-review', version: 1, issues: [], blockers: [], summary: 'test' };
  const qaFile = path.join(dir, 'qa.json'), retFile = path.join(dir, 'ret.json');
  fs.writeFileSync(qaFile, JSON.stringify({ ...base, reviewer: 'qa-director', breakdown: { hook: 13, pacing: 13, story: 13, editing: 13, audio: 9, captions: 9, originality: 8, format: 9 } }));
  fs.writeFileSync(retFile, JSON.stringify({ ...base, reviewer: 'retention-reviewer', breakdown: { R1: 10, R2: 10, R3: 20, R4: 10, R5: 10, R6: 5, R7: 5, R8: 2 } }));
  const q = cli(qaFile);
  ok(q.score === 87 && q.kind === 'qa' && q.qa_score_updated, 'QA director review sets qa_score', q);
  const rt = cli(retFile);
  ok(rt.kind === 'retention' && rt.qa_score_updated === false && rt.score === 72, 'retention review recorded with its own score', rt);
  const row = d.prepare(`SELECT qa_score, current_state FROM productions WHERE production_id='rank-test-review'`).get() as any;
  ok(row.qa_score === 87 && row.current_state === 'qa', 'productions.qa_score / state still the QA director\'s after the retention review', row);
  const last = d.prepare(`SELECT reviewer, score FROM reviews WHERE production_id='rank-test-review' AND COALESCE(kind,'agent') IN ('agent','qa') ORDER BY id DESC LIMIT 1`).get() as any;
  ok(last.reviewer === 'qa-director' && last.score === 87, 'latest QA review (approval gate) ignores the retention row', last);
  ok(reviewKind({ reviewer: 'rights-scout' }) === 'rights' && reviewKind({ reviewer: 'qa-director' }) === 'qa' && reviewKind({ reviewer: 'x', kind: 'critic' }) === 'critic', 'kind inferred from reviewer or set explicitly');
  // retention-reviewer retired 2026-11-02: qa-director writes the retention review (explicit kind, or inferred from the R1..R8 breakdown)
  const qaRetFile = path.join(dir, 'qa-ret.json');
  fs.writeFileSync(qaRetFile, JSON.stringify({ ...base, reviewer: 'qa-director', kind: 'retention', breakdown: { R1: 10, R2: 15, R3: 20, R4: 10, R5: 10, R6: 5, R7: 10, R8: 8 } }));
  const qr = cli(qaRetFile);
  ok(qr.kind === 'retention' && qr.qa_score_updated === false && qr.score === 88, 'qa-director retention review (kind: retention) recorded as retention, QA score untouched', qr);
  const ret = d.prepare(`SELECT reviewer, score FROM reviews WHERE production_id='rank-test-review' AND kind='retention' ORDER BY id DESC LIMIT 1`).get() as any;
  ok(ret.reviewer === 'qa-director' && ret.score >= 80, 'retention bar (latest kind=retention >= 80) met by a qa-director review', ret);
  ok(reviewKind({ reviewer: 'qa-director', breakdown: { R1: 1, R8: 2 } }) === 'retention' && reviewKind({ reviewer: 'qa-director', breakdown: { hook: 1 } }) === 'qa', 'R1..R8 breakdown without kind is inferred as retention');
  fs.rmSync(dir, { recursive: true, force: true });
}

/* ---------------------------------------------------------------- reveal director */
console.log('\n[J] reveal-order director');
const s3 = parseScores('1=5/9/9/8,2=8/6/5,3=6/4/7');
const r3 = directReveal(3, s3);
ok(r3.candidates.length === 6 && r3.chosen.order.length === 3 && new Set(r3.chosen.order).size === 3, 'top3: 6 permutations, chosen is a permutation');
ok(JSON.stringify(directReveal(3, s3)) === JSON.stringify(r3), 'deterministic');
ok(r3.chosen.order[0] !== 1, `does not open on #1 (chose ${r3.chosen.order.join('→')})`);
const r5 = directReveal(5, parseScores('1=5/10/9/9,2=6/8,3=7/6,4=9/7/8,5=4/5'));
ok(r5.candidates.length === 120 && r5.reasons.length >= 4, `top5: 120 permutations, chose ${r5.chosen.order.join('→')}`);
ok(r5.chosen.order[0] === 4, 'strongest hook (#4) opens');
const again = directReveal(5, parseScores('1=5/10/9/9,2=6/8,3=7/6,4=9/7/8,5=4/5'), { recent: [r5.chosen.order] });
ok(again.chosen.order.join() !== r5.chosen.order.join(), `recent-order penalty varies the template (${again.chosen.order.join('→')})`);
throws(() => directReveal(3, parseScores('1=5/9,2=8/6')), /missing scores for rank #3/, 'missing rank scores rejected');

console.log(`\n${pass} passed, ${fail} failed`);
d.close();
for (const f of [tmp, `${tmp}-wal`, `${tmp}-shm`]) fs.rmSync(f, { force: true });
process.exitCode = fail ? 1 : 0;
