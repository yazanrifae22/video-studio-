// Prints OpenChatCut MCP tool schemas (names given as args), for adapter development.
import { Occ } from '../../occ/src/client.ts';
const occ = await Occ.fresh();
try {
  const tools = await occ.listTools();
  for (const t of tools) if (!process.argv[2] || process.argv.slice(2).includes(t.name)) console.log(t.name, '\n', JSON.stringify(t.inputSchema).slice(0, 6000), '\n', (t.description ?? '').slice(0, 1500), '\n----');
} finally { await occ.close(); }
