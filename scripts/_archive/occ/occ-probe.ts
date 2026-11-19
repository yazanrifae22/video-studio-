// Read-only probe of the running OpenChatCut: status, projects, templates. Usage: npx tsx scripts/occ-probe.ts [tool] [jsonArgs]
import { Occ } from '../packages/occ/src/client.ts';

const occ = await Occ.get();
console.log('connected:', occ.url);
const [tool, args] = process.argv.slice(2);
if (tool) {
  console.log(JSON.stringify(await occ.call(tool, args ? JSON.parse(args) : {}), null, 2).slice(0, 6000));
} else {
  console.log('status:', JSON.stringify(await occ.call('openchatcut_status'), null, 1).slice(0, 2500));
  console.log('projects:', JSON.stringify(await occ.call('list_projects'), null, 1).slice(0, 2500));
}
process.exit(0);
