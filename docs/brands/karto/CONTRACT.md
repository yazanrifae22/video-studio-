# Karto (cardboard cutout channel) — build contract (2026-11-18)

Owner order 2026-11-18: new channel, random viral topics told as a story, **cardboard cutout look with static characters**,
one long 16:9 video (9+ min) in TWO languages (English + Arabic, same characters, same picture, only the talk and the
on-screen words change), plus 5+ Shorts (9:16) cut from it that send viewers to the full video.

Brands: `karto-en` (English) and `karto-ar` (Arabic, Syrian-leaning simple dialect). Docs here: `docs/brands/karto/`.

## Cast (same in both languages)
- **Karto / كرتو** = the host, a cardboard-box-headed storyteller. Speaker id `karto`.
- **Skip / سكيب** = the viewer on screen: small, sticky-note yellow, phone in hand, always one thumb away from skipping.
  Karto's job is to keep Skip watching. Speaker id `skip`.
- Characters are STATIC cutouts on sticks: no limb animation, no lip sync. They act by swapping pose plates, hopping,
  tilting, sliding, bobbing while their line is spoken.

## Split of work
- **Builder** = `packages/cutout/src/**` (Node): film.json -> narration (two voices) -> score -> show.json -> capture ->
  audio -> master -> techqa; Shorts cut; drafts, previews, stills.
- **Kit + page** = `packages/cutout/web/**` (browser): `frame.html`, `kit/*.js|css`, the look, characters, props, the
  scene API that film scripts use, both layouts.
- **Film** (per video, written later by scene authors) = `packages/cutout/films/<slug>/film.js` + `assets/`,
  shared by the English and the Arabic production.

## Page contract (same as quizlong / quizlab: `packages/quizlong/src/capture.ts` `capturePicture`)
`frame.html` exposes `await window.__load(show, opts)`, `window.__seek(t)` (pure function of t, random access),
`window.__ready === true` after load. `__load` returns `{ cues: [{name, t, db?, dur?}], lint: string[], marks?: {} }`
(`cues` = sound effects the film asks for; names from the SFX table the builder publishes in `packages/cutout/sfx.json`).
The page is served from the repo root (allow-list: `packages/cutout`, `data/brand`, `node_modules`, the production folder).

## show.json (written by the builder, read by the page)
```json
{ "schema": "cutout/1", "lang": "en|ar", "dir": "ltr|rtl", "layout": "wide|tall",
  "fps": 30, "width": 1920, "height": 1080, "duration": 612.4,
  "film": "/packages/cutout/films/<slug>/film.js",
  "window": null,
  "hook_text": "…", "end_text": "…", "captions": true,
  "chapters": [{ "id": "c01", "title": "…", "t0": 0, "t1": 41.2, "mood": "curious" }],
  "lines": [{ "id": "l001", "chapter": "c01", "who": "karto", "text": "…", "t0": 0.2, "t1": 3.9,
              "words": [{ "w": "…", "t0": 0.2, "t1": 0.5 }] }],
  "strings": { "key": "on-screen text in this language" },
  "short": null }
```
- `layout: "tall"` = 1080x1920 for Shorts: same film, the kit re-lays the stage (board on top, characters below).
- `window: {t0, t1}` (Shorts / previews) = the builder captures only that time range; `__seek` still gets FILM time.
- `short: {id, hook_text, cta_text, t0, t1}` on a Short: the page draws the Short's hook over the first seconds and
  the "full video" card over the last ~2.5 s (cta line is spoken there).
- Times are film seconds. Line ids are the SAME in both languages (1:1 lines), so a film script keyed by line id and
  by fractions of a line (`K.line('l014').t0`, `K.at('l014', 0.5)`) works for both; word-level anchors are optional
  and must degrade to fractions (Arabic word order differs).

## film.json (input, one per production; made from the master storyboard by a script, never by hand)
```json
{ "schema": "cutout-film/1", "slug": "<slug>", "lang": "en", "title": "…",
  "format": { "width": 1920, "height": 1080, "fps": 30 },
  "cast": { "karto": { "voice": "…", "style": "…" }, "skip": { "voice": "…", "style": "…" } },
  "hook_text": "…", "end_text": "…", "tail": 12, "chapter_gap": 1.0, "captions": true,
  "strings": { "…": "…" },
  "chapters": [{ "id": "c01", "title": "…", "mood": "curious", "retake": 0,
                 "lines": [{ "id": "l001", "who": "karto", "text": "…", "pause_after": 0 }] }],
  "shorts": [{ "id": "s1", "from": "l020", "to": "l041", "hook_text": "…", "cta": { "who": "karto", "text": "…" } }] }
```

## Master storyboard (the single source for both languages)
`docs/brands/karto/<slug>/storyboard.json`: chapters -> lines `{id, who, en, ar, picture, motion, asset?}` + strings
`{key: {en, ar}}` + shorts. `picture` / `motion` = the per-line picture contract (owner rule: every named thing is on
screen with a fitting animation). A script (`packages/cutout/src/make-film-json.ts`) writes the two film.json files.

## Rules that bind everyone
- No AI-generation wording anywhere (shared guard `packages/shared/src/ai-text.ts`).
- Python = `python` or `.venv-asr`, never `python3`; `open(..., encoding="utf8")`.
- Heavy renders one at a time; drive E: has only ~17 GB free: keep one version folder per production, clean work files.
- Fonts and any downloaded asset need a licence note (OFL fonts only). No paid APIs.
