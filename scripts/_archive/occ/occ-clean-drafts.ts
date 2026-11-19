// Discard leftover studio drafts on a project (after a failed build). Usage: npx tsx scripts/occ-clean-drafts.ts <projectId>
import { Occ } from '../packages/occ/src/client.ts';
const projectId = process.argv[2];
const occ = await Occ.fresh();
try {
  await occ.call('target_project', { projectId });
  const ls = await occ.call('list_edit_sessions', {});
  const sessions = ls.sessions ?? ls.result ?? ls;
  console.log(JSON.stringify(sessions).slice(0, 800));
  for (const s of Array.isArray(sessions) ? sessions : []) {
    if (['drafting', 'pending_review'].includes(s.status)) {
      if (s.orphaned && s.recoveryActions?.includes('discard')) await occ.call('recover_edit_session', { editSessionId: s.editSessionId, action: 'discard' }).then(() => console.log('discarded orphan', s.editSessionId), e => console.log('recover failed', e.message));
      else await occ.call('discard_edit_session', { editSessionId: s.editSessionId }).then(() => console.log('discarded', s.editSessionId), e => console.log('discard failed', e.message));
    }
  }
} finally { await occ.close(); }
