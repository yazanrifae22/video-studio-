import { loadSpec } from './spec.ts';
import { fullTake } from './narration.ts';
const id = process.argv[2];
const { spec, script, dir } = loadSpec(id);
const r = await fullTake(spec, script, dir, id);
console.log(JSON.stringify({ wav: r.wav, cached: r.cached, model: r.model, wer: r.align.wer, kw: r.align.keywords, pitch: r.align.pitch, wps: r.align.rate_wps, dur: r.align.duration }));
for (const l of r.align.lines) console.log(l.id, l.start, l.end, l.wer);
console.log(r.align.asr_text);
