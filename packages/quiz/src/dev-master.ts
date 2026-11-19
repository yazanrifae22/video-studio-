// Dev helper: run the shared loudness master on a raw render and report decoded audio vs video length.
import { execFileSync } from 'node:child_process';
import { master } from '../../occ/src/build.ts';
const [inp, out] = process.argv.slice(2);
await master(inp, out);
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', out, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 30 });
const v = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', out]).toString().trim();
console.log(JSON.stringify({ decoded_audio_s: pcm.length / 2 / 16000, video_s: +v }));
