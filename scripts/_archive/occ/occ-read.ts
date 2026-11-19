// Read-only: print a project's timeline shape. Usage: npx tsx scripts/occ-read.ts <projectId>
import { Occ } from '../packages/occ/src/client.ts';
const projectId = process.argv[2];
const occ = await Occ.fresh();
try {
  const t = await occ.call('target_project', { projectId });
  const s = await occ.call('begin_edit_session', { clientName: 'read', approvalMode: 'auto', reuseExisting: true, editorProjectId: projectId });
  const tl = await occ.call('read_timeline', { editSessionId: s.editSessionId });
  console.log('binding', t.bindingMode, 'type', typeof tl, 'keys', tl && typeof tl === 'object' ? Object.keys(tl) : '-');
  console.log(JSON.stringify(tl).slice(0, 600));
  await occ.call('discard_edit_session', { editSessionId: s.editSessionId }).catch(() => {});
} finally { await occ.close(); }
