import { Occ } from '../packages/occ/src/client.ts';
const projectId = process.argv[2];
const occ = await Occ.fresh();
try {
  await occ.call('target_project', { projectId });
  const s = await occ.call('begin_edit_session', { clientName: 'read', approvalMode: 'auto', reuseExisting: true, editorProjectId: projectId });
  const tl = await occ.call('read_timeline', { editSessionId: s.editSessionId });
  const r = await occ.call('read_agent_artifact', { editSessionId: s.editSessionId, artifactId: tl.artifactId, offset: 0, limit: 300 });
  console.log(typeof r, typeof r === 'object' ? Object.keys(r) : '', JSON.stringify(r).slice(0, 700));
  await occ.call('discard_edit_session', { editSessionId: s.editSessionId }).catch(() => {});
} finally { await occ.close(); }
