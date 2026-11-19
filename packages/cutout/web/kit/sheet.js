/* Karto kit - pose sheet: every pose plate of both characters, baked like on stage, labelled. Returns a JPEG data URL.
   Used by snap.mjs --pose-sheet. */
import { bake, svgImage, card, backdrop } from './tex.js';
import { karto, skip, KARTO_POSES, SKIP_POSES } from './art.js';

export async function poseSheet() {
  await document.fonts.load("400 40px 'K Display'", 'Karto');
  const rows = [['karto', karto, KARTO_POSES, 0.5], ['skip', skip, SKIP_POSES, 0.62]];
  const cols = 6, cw = 268, ch = 318, Z = cw / 400, W = cols * cw, rowsN = rows.reduce((a, r) => a + Math.ceil((Object.keys(r[2]).length + 1) / cols), 0), H = rowsN * ch + 40;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#C99A62'; g.fillRect(0, 0, W, H);
  const bg = card(W, H, { stock: 'kraft', edge: 0, blur: 0, seed: 9, amp: 0 }); g.drawImage(bg.face, 0, 0, bg.face.width, bg.face.height, -bg.pad, -bg.pad, bg.w, bg.h);
  let i = 0;
  for (const [id, art, poses, k] of rows) {
    const names = [...Object.keys(poses), 'point (mirrored)'];
    for (const name of names) {
      const mir = name.includes('mirrored'), p = art(mir ? 'point' : name), img = await svgImage(p.svg);
      const b = bake(img, p.w, p.h, { edge: 8, blur: 12, stock: id === 'skip' ? 'paper' : 'kraft', flutes: id !== 'skip' });
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch + 20, s = k * (id === 'skip' ? 1.6 : 1) * 0.92 * Z;
      const dw = b.w * s, dh = b.h * s, dx = x + cw / 2 - (b.pad + p.ax) * s, dy = y + ch - 50 - (b.pad + p.ay) * s;
      g.save(); if (mir) { g.translate(x + cw, 0); g.scale(-1, 1); g.translate(-x, 0); }
      g.drawImage(b.shadow, dx + 8, dy + 7, dw, dh); g.drawImage(b.face, dx, dy, dw, dh); g.restore();
      g.fillStyle = '#FBF8F0'; g.fillRect(x + 12, y + ch - 46, cw - 24, 34);
      g.fillStyle = '#1E1712'; g.font = "400 21px 'K Display'"; g.textAlign = 'center'; g.fillText(`${id} · ${name}`, x + cw / 2, y + ch - 22);
      i++;
    }
    i = Math.ceil(i / cols) * cols;
  }
  return c.toDataURL('image/jpeg', 0.86);
}

/** one character alone, neutral pose, on a lit cardboard backdrop (square JPEG data URL) */
export async function hero(id, size = 800) {
  await document.fonts.ready;
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.drawImage(backdrop(id === 'skip' ? '#2E7F86' : 'night', size, size, 7), 0, 0); // contrasting painted backdrop
  const lamp = g.createRadialGradient(size * 0.3, size * 0.15, 20, size * 0.5, size * 0.5, size * 0.8);
  lamp.addColorStop(0, 'rgba(255,236,200,0.28)'); lamp.addColorStop(0.55, 'rgba(255,236,200,0)'); lamp.addColorStop(1, 'rgba(30,15,0,0.38)'); g.fillStyle = lamp; g.fillRect(0, 0, size, size);
  const p = (id === 'skip' ? skip : karto)('neutral'), img = await svgImage(p.svg);
  const b = bake(img, p.w, p.h, { edge: 8, blur: 14, stock: id === 'skip' ? 'paper' : 'kraft', flutes: id !== 'skip', res: 2 });
  const s = id === 'skip' ? (size * 0.9) / p.h : (size * 0.94) / p.w, dw = b.w * s, dh = b.h * s;
  const dx = size / 2 - (b.pad + p.ax) * s, dy = size * 0.99 - (b.pad + p.ay) * s;
  g.drawImage(b.shadow, dx + 16, dy + 12, dw, dh); g.drawImage(b.face, dx, dy, dw, dh);
  return c.toDataURL('image/jpeg', 0.9);
}