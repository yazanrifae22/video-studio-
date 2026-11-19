# GTA 6 thumbnails (Karto), 1280x720 JPG, EN + AR

Files: `A-en/ar` (box head on the lead, keyart3), `B-en/ar` (big Karto, keyart2), `C-en/ar` (box taped over the logo's "VI", keyart).
Re-render (from this folder, repo root is E:\clips-viral):
1. `node render-cutouts.mjs` - Karto/Skip plates from `packages/cutout/web/kit/art.js` -> `work/*.png` (transparent, 2x)
2. `python make-sticker.py` - white paper rim + soft shadow -> `work/st_*.png`
3. `node compose.mjs [A-en,C-ar,...]` - HTML (`work/html/`) -> headless Chrome -> the 6 JPGs
4. `python smalls.py` - `small/*-320.jpg`, `small/*-160.jpg`, `small/check.jpg`
Text: Lilita One (EN), Lalezar (AR, RTL), yellow with dark outline. Edit positions in `compose.mjs`.

Ranking: 1) A - one-second idea (a box where the head should be), reads at 160 px, Skip adds the "viewer" joke.
2) B - Karto's shock + huge "13" is the clearest at tiny size, but less of a puzzle. 3) C - best comment bait
(what is under the "VI"?), but crowded and text sits over the man's legs.
