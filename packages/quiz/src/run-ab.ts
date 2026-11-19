import { loadSpec } from './spec.ts';
import { abTest } from './narration.ts';
const id = process.argv[2];
const { spec, script, dir } = loadSpec(id);
const res = await abTest(spec, script, dir, (process.argv[3] ?? 'Puck,Zephyr').split(','), id);
for (const r of res) console.log(JSON.stringify({ voice: r.voice, dialect: r.dialect, cached: r.cached, model: r.model, wer: r.wer, kw: r.keywords, pitch: r.pitch, wps: r.rate_wps, dur: r.duration, asr: r.asr_text }));
