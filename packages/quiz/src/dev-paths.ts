// Dev helper: run the follow_path fairness check on a paths JSON ({label: d} or {paths:{label:d}}).
import fs from 'node:fs';
import { checkPaths } from './templates-more.ts';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const paths = j.paths ?? j;
const r = checkPaths(Object.fromEntries(Object.entries(paths).filter(([, v]) => typeof v === 'string')) as any);
console.log(JSON.stringify({ ends: Object.fromEntries(Object.entries(r.ends).map(([k, v]) => [k, v.map(Math.round)])), problems: r.problems }));
