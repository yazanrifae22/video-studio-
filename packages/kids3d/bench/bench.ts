/** Render-path benchmark for kids3d (2026-11-02): headless Chrome WebGL → frames → mp4. Run: npx tsx packages/kids3d/bench/bench.ts */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve('packages/kids3d/bench'), THREE = path.resolve('node_modules/three');
const OUT = process.argv[2] || path.resolve('data/cache/kids3d-bench'); fs.mkdirSync(OUT, { recursive: true });
const N = Number(process.argv[3] ?? 150), FPS = 30;
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent(q.url!.split('?')[0]);
  const f = u.startsWith('/three/') ? path.join(THREE, u.slice(7)) : path.join(ROOT, u === '/' ? 'bench.html' : u);
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(s);
}).listen(0);
const port = (srv.address() as any).port;
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/`); await page.waitForFunction('window.ready === true');
console.log('GL:', await page.evaluate('glinfo()'));
const ff = (args: string[]) => spawn('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = (p: ReturnType<typeof ff>) => new Promise(r => p.on('close', r));

// warm-up
for (let i = 0; i < 10; i++) await page.evaluate(`seek(${i / FPS})`);

if (process.env.ONLY_B2) { } else {
// A: page.screenshot jpeg → ffmpeg mjpeg pipe → h264_nvenc
{ const t0 = Date.now(); const p = ff(['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '19', '-pix_fmt', 'yuv420p', path.join(OUT, 'A.mp4')]);
  for (let i = 0; i < N; i++) { await page.evaluate(`seek(${i / FPS})`); p.stdin!.write(await page.screenshot({ type: 'jpeg', quality: 92 })); }
  p.stdin!.end(); await done(p); console.log(`A screenshot: ${((Date.now() - t0) / N).toFixed(1)} ms/frame`); }
// C: canvas.toDataURL jpeg in page → ffmpeg
{ const t0 = Date.now(); const p = ff(['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '19', '-pix_fmt', 'yuv420p', path.join(OUT, 'C.mp4')]);
  for (let i = 0; i < N; i++) { const d = await page.evaluate(`(seek(${i / FPS}), document.querySelector('canvas').toDataURL('image/jpeg', 0.92))`) as string; p.stdin!.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64')); }
  p.stdin!.end(); await done(p); console.log(`C toDataURL: ${((Date.now() - t0) / N).toFixed(1)} ms/frame`); }
// B: WebCodecs VideoEncoder (hardware H.264) in page → Annex B → ffmpeg mux
{ const t0 = Date.now(); const ok = await page.evaluate(`encStart(${FPS})`); console.log('webcodecs supported:', ok);
  const h264 = path.join(OUT, 'B.h264'); fs.writeFileSync(h264, Buffer.alloc(0));
  for (let i = 0; i < N; i++) { await page.evaluate(`(seek(${i / FPS}), encFrame(${i}, ${FPS}))`); if (i % 60 === 59) fs.appendFileSync(h264, Buffer.from(await page.evaluate('encTake()') as string, 'base64')); }
  await page.evaluate('encFlush()'); fs.appendFileSync(h264, Buffer.from(await page.evaluate('encTake()') as string, 'base64'));
  const p = ff(['-r', String(FPS), '-f', 'h264', '-i', h264, '-c', 'copy', path.join(OUT, 'B.mp4')]); p.stdin!.end(); await done(p);
  console.log(`B webcodecs: ${((Date.now() - t0) / N).toFixed(1)} ms/frame`); }
}
// B2: WebCodecs, 30 frames per evaluate (loop inside the page)
{ const t0 = Date.now(); await page.evaluate(`encStart(${FPS})`);
  const h264 = path.join(OUT, 'B2.h264'); fs.writeFileSync(h264, Buffer.alloc(0));
  for (let i = 0; i < N; i += 30) { await page.evaluate(`(async()=>{for(let k=${i};k<Math.min(${i + 30},${N});k++){seek(k/${FPS}); await encFrame(k, ${FPS});} return 1})()`); fs.appendFileSync(h264, Buffer.from(await page.evaluate('encTake()') as string, 'base64')); }
  await page.evaluate('encFlush()'); fs.appendFileSync(h264, Buffer.from(await page.evaluate('encTake()') as string, 'base64'));
  const p = ff(['-r', String(FPS), '-f', 'h264', '-i', h264, '-c', 'copy', path.join(OUT, 'B2.mp4')]); p.stdin!.end(); await done(p);
  console.log(`B2 webcodecs batched: ${((Date.now() - t0) / N).toFixed(1)} ms/frame`); }
// B4: WebCodecs with 4 render passes per frame (cost of subframe motion blur, render only)
{ const t0 = Date.now(); for (let i = 0; i < N; i++) await page.evaluate(`(()=>{for(let k=0;k<4;k++) seek(${i / FPS}+k/${FPS * 4}); return 1})()`); console.log(`render x4 only: ${((Date.now() - t0) / N).toFixed(1)} ms/frame`); }
await browser.close(); srv.close();
