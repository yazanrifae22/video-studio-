// Experiment (test project only): where does a created track land, and can a solid sit under V1?
import { Occ } from '../packages/occ/src/client.ts';
const projectId = process.argv[2];
const occ = await Occ.fresh();
try {
  await occ.call('target_project', { projectId });
  const s = await occ.call('begin_edit_session', { clientName: 'track test', approvalMode: 'auto', reuseExisting: true, editorProjectId: projectId });
  const id = s.editSessionId;
  const before = await occ.call('edit_track', { editSessionId: id, action: 'list' });
  console.log('before', JSON.stringify(before).slice(0, 1500));
  const r = await occ.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: 'video', name: 'Background', order: 0 }) });
  console.log('created', JSON.stringify(r.created));
  const after = await occ.call('edit_track', { editSessionId: id, action: 'list' });
  console.log('after', JSON.stringify((after.tracks ?? []).map((t: any) => [t.alias, t.name, t.order])));
  await occ.call('discard_edit_session', { editSessionId: id });
} finally { await occ.close(); }
