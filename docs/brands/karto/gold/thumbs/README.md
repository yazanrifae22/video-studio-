# Gold thumbnails (Karto & Skip, video 2), 1280x720 JPG, EN + AR

Files: `A-en/ar`, `B-en/ar`, `C-en/ar`. Same family as GTA 6 concept B: one real photo, a big shocked Karto, 2-4 huge words.
- A: giant red "-30%" with a falling arrow over real gold bars (`bars_vault`, CC BY-SA), small line "FROM THE JAN RECORD" / «من أعلى سعر» so it never reads as a one-day crash. AR «نزل ٣٠٪».
- B: cardboard staircase going down step by step with "NOT IN / ONE DAY" over Swiss bars (`boe_bars`, CC BY-SA). AR «مو بيوم واحد».
- C: "WHO SOLD?" with a queue of cardboard Skips in the Dubai Gold Souk lane (`souk_windows`, CC BY). AR «مين باع؟».

Re-render (repo root E:\clips-viral):
1. Sticker PNGs: `work/st_karto_shocked.png`, `st_skip_shocked.png`, `st_skip_skip.png` are copies of `../../gta6/thumbs/work/` (made there by `node render-cutouts.mjs` + `python make-sticker.py`).
2. `node docs/brands/karto/gold/thumbs/compose.mjs [A-en,C-ar,...]` - HTML in `work/html/` -> headless Chrome -> the JPGs (positions and text are in that file).
3. `python docs/brands/karto/gold/thumbs/smalls.py` - `small/*-320.jpg` and `small/check.jpg` (all six at 320 px).
Text: Lilita One (EN), Lalezar (AR, RTL), yellow with dark outline; red for the number.

Pick: A first (the number is the whole idea, reads at 160 px, the red arrow says "down", the small line keeps it honest),
then C (best comment bait, but less gold in the frame), then B (best match to the "not in one day" angle, busiest at small size).
