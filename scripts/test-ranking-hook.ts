// ranking:cutlist emits the script.json hook as cutlist.texts at 0 s, with narration clear of it (2026-11-02; rank-261102-91sf shipped without it).
// usage: npx tsx scripts/test-ranking-hook.ts   (reads the DB + one real plan; writes nothing)
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../packages/shared/src/paths.ts';
import { hookText, planToCutlist, scriptHook } from '../packages/ranking/src/cutlist.ts';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };

ok(scriptHook({ hook_text: 'STAY FOR #1' })?.text === 'STAY FOR #1' && scriptHook({ hook_text: 'X' })!.dur === 0.9, 'hook_text -> hook, default 0.9 s');
ok(scriptHook({ on_screen: [{ text: 'WAIT FOR #1', role: 'hook', dur: 1.2 }] })?.dur === 1.2, 'on_screen role hook wins with its dur');
ok(scriptHook({}) === null && scriptHook(null) === null, 'no hook -> null');
const lines = [{ id: 'a', at: 0.1 }, { id: 'b', at: 4.5 }];
const h = hookText({ text: 'stay for #1', dur: 0.9 }, lines, 18);
ok(h.text.at === 0 && h.text.role === 'hook' && h.text.text === 'STAY FOR #1' && h.text.y === 18, 'hook card at 0 s in the caption band');
ok(lines[0].at >= 0.9 && lines[1].at === 4.5 && h.moved.length === 1, `first narration line moved clear of the hook (${lines[0].at})`);

// real plan (the production that shipped without its hook)
const id = 'rank-261102-91sf', plan = path.join(P.productions, id, 'ranking-plan.json');
if (fs.existsSync(plan)) {
  const sj = JSON.parse(fs.readFileSync(path.join(P.productions, id, 'script.json'), 'utf8'));
  const { cutlist } = planToCutlist(JSON.parse(fs.readFileSync(plan, 'utf8')), { planPath: plan, script: sj });
  const t = (cutlist.texts as any[]).find(x => x.role === 'hook');
  ok(!!t && t.at === 0 && t.text === 'STAY FOR #1', `${id}: cutlist.texts has the hook at 0 s (${JSON.stringify(t)})`);
  const first = Math.min(...(cutlist.narration?.lines ?? []).map((l: any) => l.at));
  ok(first >= t.dur, `${id}: first narration line ${first} s starts after the hook (${t.dur} s)`);
  ok(!(cutlist as any).caption_start_zero, `${id}: frame-0 caption snap off (the hook is the frame-0 text)`);
  const { cutlist: noHook } = planToCutlist(JSON.parse(fs.readFileSync(plan, 'utf8')), { planPath: plan, script: null });
  ok((noHook.texts as any[]).length === 0 && !!(noHook as any).caption_start_zero, `${id}: no script hook -> no text, caption snap kept`);
} else console.log(`skip ${id}: no ranking-plan.json`);
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
