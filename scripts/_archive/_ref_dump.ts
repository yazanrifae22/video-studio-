import fs from 'node:fs';
import { db, J } from '../packages/shared/src/db.ts';
const rows = db().prepare(`SELECT asset_id, title, published_at, duration, view_count, data FROM sources WHERE source_platform='facebook' AND category='reference' ORDER BY view_count DESC`).all() as any[];
const out = rows.map(r => { const d = J.parse(r.data, {}) as any; return { id: r.asset_id, views: r.view_count, date: r.published_at, dur: r.duration, title: r.title, file: d.reference_file, status: (d.library ?? {}).status }; });
fs.writeFileSync(process.argv[2], JSON.stringify(out));
