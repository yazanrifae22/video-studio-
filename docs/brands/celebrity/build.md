# Moments That Made Them: build path (`celebrity:build`, 2026-11-08)

The old video-automation HyperFrames spec engine stays archived. Celebrity builds through the tech builder (`packages/tech`),
same spec format and pipeline as `docs/brands/tech/build.md` (spec.json + scenes/*.html → one TTS take → align → HyperFrames
picture → timeline.json → ffmpeg → master → techqa). `celebrity:build` is a thin alias that sets the brand profile
(`packages/tech/src/brands.ts`); `tech:build` on a celebrity production picks the same profile from the DB brand.

## What the celebrity profile changes
- Palette from `brand.json` data.palette: near-black `#0B0B0D` stage, gold `#E8C170` accent (`--acc`/`--gold`), ink `#F4EFE6`, red `#E5484D` (`--bad`). Scene CSS should use the variables, not tech blues.
- Voice default `Algenib` (alts Orus, Gacrux via `spec.voice.name`), storyteller style note; music bed `data/brand/celebrity/kit/music/story-cinematic.wav` (original procedural, provenance in the kit folder).
- Hook pill / captions in ink on near-black with a gold border; duration warn band 36-55 s (target 38-48 s).
- Fonts and SFX are the tech kit's (Inter, Space Grotesk, JetBrains Mono; original SFX).

## Hard rule enforced by the builder: original typography/illustration only
The build refuses when a scene has `<video>`, `<iframe>`, `<audio>`, a remote image/video URL, or a raster image under `assets/`
that is not listed in `productions/<id>/assets/provenance.json` with `origin` starting "original" (or `"original": true`).
No clips, no photos, no likeness, no silhouettes of real people. Generated art still goes to rights-scout (trade dress).

## Commands (from E:\clips-viral)
- `npm run -s cli -- production:create --brand celebrity --format explainer --title "..."`
- `npm run -s cli -- celebrity:build <id> --plan` → validate + lint + layout + write the HyperFrames project; no TTS, no render.
- `npm run -s cli -- celebrity:build <id> --no-tts` → draft picture + stills in `productions/<id>/draft/` (estimated timing, no quota).
- `npm run -s cli -- celebrity:build <id> --agent showrunner-celebrity [--snap ...]` → `vN/` (spends one Gemini TTS take).
- Then `prelint <id>` and `production:stage <id> qa` (story gate: story.json + script-doctor.json verdict pass).

Smoke proof 2026-11-08: 2-scene scratch fixture, `--plan` and `--no-tts` draft rendered (HyperFrames 27 s), gold-on-black stills OK; no TTS spent.
