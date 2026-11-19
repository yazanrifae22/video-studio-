import { Occ } from '../packages/occ/src/client.ts';
const occ = await Occ.fresh();
try {
  const t = await occ.call('target_project', { projectId: '627fd9f9-dd1b-4566-9938-a6c2afb6e8bd' });
  console.log('binding', t.bindingMode);
  const s = await occ.call('begin_edit_session', { clientName: 'import test', approvalMode: 'auto', reuseExisting: true, editorProjectId: '627fd9f9-dd1b-4566-9938-a6c2afb6e8bd' });
  const r = await occ.call('import_assets', { editSessionId: s.editSessionId, paths: [process.argv[2]] });
  console.log(JSON.stringify(r).slice(0, 500));
  await occ.call('discard_edit_session', { editSessionId: s.editSessionId });
} finally { await occ.close(); }
