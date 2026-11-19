/* Picture-art test for the animal plate (show.art = {emoji: image url}, frame.js).
 *   node art-test.mjs glyph <emoji> <out.png>            -> the bundled emoji glyph as a square transparent PNG (stand-in art)
 *   node art-test.mjs show <show.json> <out show.json> <emoji>=<url> [...]   -> copy of a show.json with an art map
 * URLs are relative to frame.html (keep art under template/dev/art3d/ so the dev capture server serves it).
 * Then: node render-animals.mjs show <out show.json> <outDir> <t...>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'show') {
  const [src, dst, ...pairs] = a;
  const show = JSON.parse(fs.readFileSync(src, 'utf8'));
  show.art = Object.fromEntries(pairs.map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
  fs.writeFileSync(dst, JSON.stringify(show));
  console.log(JSON.stringify({ out: dst, art: show.art }));
} else if (cmd === 'glyph') {
  const [emoji, out] = a;
  const font = pathToFileURL(path.resolve(HERE, '..', 'assets', 'fonts', 'NotoColorEmoji-Regular.ttf')).href;
  const CHROME = [process.env.STUDIO_CHROME, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean).find(f => fs.existsSync(f));
  const b = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.setContent(`<style>@font-face{font-family:E;src:url('${font}')}html,body{margin:0;background:transparent}div{width:1024px;height:1024px;font:874px/1024px E;text-align:center}</style><div>${emoji}</div>`);
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await p.screenshot({ path: out, omitBackground: true });
  await b.close();
  console.log(JSON.stringify({ out }));
} else { console.error('usage: art-test.mjs glyph|show ...'); process.exit(1); }
