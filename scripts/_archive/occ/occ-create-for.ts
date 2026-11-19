// Pre-create a production's OpenChatCut project (so it can be opened for watch mode before the build).
import { Occ } from '../packages/occ/src/client.ts';
import { db } from '../packages/shared/src/db.ts';
const id = process.argv[2];
const p = db().prepare(`SELECT p.*, b.name brand FROM productions p JOIN brands b ON b.id=p.brand_id WHERE production_id=?`).get(id) as any;
if (p.openchatcut_project_id) { console.log(p.openchatcut_project_id); process.exit(0); }
const occ = await Occ.fresh();
const r = await occ.call('create_project', { name: `${p.brand} — ${p.title}`, description: `Clips Viral Studio production ${id}`, compositionWidth: 1080, compositionHeight: 1920, fps: 30 });
db().prepare(`UPDATE productions SET openchatcut_project_id=? WHERE production_id=?`).run(r.id, id);
await occ.close();
console.log(r.id);
