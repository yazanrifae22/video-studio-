/**
 * Karto brands + productions in data/studio.db, the minimal way test-3d did it: brand rows karto-en / karto-ar (status "test",
 * format "explainer"; also docs/brands/karto/brand-<lang>.json) and productions `expl-yyMMdd-xxxx` with a productions/<id>/ folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { db, J, newId } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';

export const BRANDS = {
  'karto-en': { id: 'karto-en', name: 'Karto', format: 'explainer', language: 'en', status: 'test', audience: 'General 16-45, English',
    positioning: 'Owner 2026-11-18: random viral topics told as a story in a cardboard cutout look (static characters on sticks): host Karto keeps the viewer Skip from skipping. One 16:9 long video (9+ min) + 5 Shorts cut from it.' },
  'karto-ar': { id: 'karto-ar', name: 'كرتو', format: 'explainer', language: 'ar', status: 'test', audience: 'General 16-45, Arabic (Syrian-leaning simple dialect)',
    positioning: 'Owner 2026-11-18: the Arabic twin of Karto: same characters and picture, Arabic talk and on-screen words. One 16:9 long video (9+ min) + 5 Shorts cut from it.' },
} as const;
const DATA = { engine: 'packages/cutout (film.json -> two-speaker TTS -> align -> show.json -> page capture -> mix -> master -> techqa; Shorts cut from the film)', docs: 'docs/brands/karto/', cast: { karto: 'host', skip: 'viewer on screen' } };

export function ensureBrands() {
  const made: string[] = [];
  for (const b of Object.values(BRANDS)) {
    const f = path.join(P.root, 'docs', 'brands', 'karto', `brand-${b.language}.json`);
    if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify({ ...b, data: DATA }, null, 1) + '\n', 'utf8');
    const has = db().prepare(`SELECT 1 FROM brands WHERE id=?`).get(b.id);
    if (!has) { db().prepare(`INSERT INTO brands(id, name, format, positioning, audience, language, status, data) VALUES (?,?,?,?,?,?,?,?)`).run(b.id, b.name, b.format, b.positioning, b.audience, b.language, b.status, J.str(DATA)); made.push(b.id); }
  }
  return made;
}

export function newProduction(brand: string, title: string, o: { dryRun?: boolean } = {}) {
  if (!(brand in BRANDS)) throw new Error(`--brand must be one of ${Object.keys(BRANDS).join(', ')}`);
  if (!title?.trim()) throw new Error('--title is required');
  const id = newId('expl');
  if (o.dryRun) return { productionId: id, dryRun: true };
  ensureBrands();
  db().prepare(`INSERT INTO productions(production_id, brand_id, format, title, current_state, data) VALUES (?,?,?,?,?,?)`).run(id, brand, 'explainer', title.trim(), 'script', J.str({ builder: 'cutout' }));
  fs.mkdirSync(path.join(P.productions, id), { recursive: true });
  try { emit({ kind: 'production.created', productionId: id, message: `Production created: ${title.trim()} (${brand})` }); } catch { /* events busy */ }
  return { productionId: id };
}
