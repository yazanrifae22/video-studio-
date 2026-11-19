/** dev: npx tsx packages/kids3d/src/dev-music.ts <out.wav> <seconds> [gainDb] */
import { musicBed, duckWav } from './audio.ts';
const [out, dur, g] = process.argv.slice(2);
musicBed(out, Number(dur), 11); duckWav(out, [[5, 10]], Number(g ?? -12), Number(g ?? -12) - 9);
