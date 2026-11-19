// Dev helper: show OpenChatCut media-pool entries of a project (fields available for matching).
import { Occ } from '../../occ/src/client.ts';
const occ = await Occ.fresh();
try {
  await occ.call('target_project', { projectId: process.argv[2] });
  const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', editorProjectId: process.argv[2] });
  const pool = await occ.call('read_project', { editSessionId: s.editSessionId, view: 'assets' });
  const as = pool.mediaPool?.assets ?? [];
  console.log(as.length, JSON.stringify(as.filter((a: any) => /outro/.test(a.name)), null, 1).slice(0, 3000));
  await occ.call('discard_edit_session', { editSessionId: s.editSessionId });
} finally { await occ.close(); }
