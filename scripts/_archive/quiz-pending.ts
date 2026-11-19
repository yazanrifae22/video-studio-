// Lists quiz-ar productions whose latest render has passed techqa but has no review for that version yet (orchestrator QA feed).
import { db } from '../packages/shared/src/db.ts';
import fs from 'node:fs'; import path from 'node:path';
const d = db();
const rows = d.prepare(`SELECT production_id id, title, version, approval_status FROM productions WHERE brand_id='quiz-ar' AND approval_status!='approved' ORDER BY production_id`).all() as any[];
for (const p of rows) {
  const dir = path.join('productions', p.id), vs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^v\d+$/.test(f)).sort((a, b) => +a.slice(1) - +b.slice(1)) : [];
  const v = vs.at(-1); if (!v) continue;
  const tq = path.join(dir, v, 'qa', 'techqa.json'); if (!fs.existsSync(tq)) continue;
  const t = JSON.parse(fs.readFileSync(tq, 'utf8'));
  const rev = d.prepare(`SELECT score, verdict FROM reviews WHERE production_id=? AND version=? ORDER BY rowid DESC LIMIT 1`).get(p.id, +v.slice(1)) as any;
  if (!rev) console.log(`${p.id} ${v} techqa=${t.pass} ${(+t.duration).toFixed(1)}s  ${p.title}`);
}
