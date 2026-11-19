# Tiko & Pip 3D pipeline: decision (2026-11-02)

Owner asked for: 4 long-form episodes (2-3 min, 16:9 1920x1080) in **real 3D**. The pipeline must run on this laptop (RTX 4070, Windows) with free tools only, and go through the same QA and rights loop as every other brand.

## Reference studied
`yihui-dev/awesome-opus5-5-videos`, prompt `twoclipping-496100` (the owner's pick). It is listed under "3D scenes", but the prompt itself says **"2D only"**. It describes a 1440x1440 HTML film where every scene morphs out of the previous one. The method transfers; the look does not. What we took from it:
- **Every frame is a pure function of time.** `seek(t)`, no timers, and no state carried between frames.
- **Closed-form springs.**
- **Rendering** uses Playwright with **sub-frames blended for motion blur**. Each SFX is placed so its measured peak lands on the event.
- **Finishing** is loudness at -14 LUFS, a check of one frame per beat, and then a scan for single-frame pops.

The truly 3D prompts in the list (Three.js / GLSL scenes such as `twoclipping-000267`'s 3D carousel) use the same seek-and-capture method. In Three.js this gives real 3D with the same render path.

## Options measured on this machine (EA FC 27 was running on the same GPU during the tests, so these numbers are conservative)
| Option | Measured | Per 1 min of 30 fps video | Notes |
|---|---|---|---|
| HyperFrames (`npx hyperframes render`, page screenshots) | 42.2 s for an 8 s clip (legacy bake-off, `research/legacy-video-automation/bakeoff/REPORT.md`) | ~5.3 min | quiz-ar logs show render hangs with 200-300 s timeouts; adds a composition contract we don't need |
| Three.js + Playwright `page.screenshot` per frame | 109 ms/frame | ~3.3 min | CDP screenshot dominates |
| Three.js + `canvas.toDataURL` JPEG → ffmpeg pipe | 49.6 ms/frame | ~1.5 min | JPEG re-encode, extra generation loss |
| Three.js + **WebCodecs H.264 encoder in the page**, 1 frame per call | 39.7 ms/frame | ~1.2 min | hardware encoder |
| **Three.js + WebCodecs, 30 frames per call (chosen)** | **24.7 ms/frame** (bench), raw GPU render x4 sub-frames ≈ 5-6 ms | **~45 s** | pixels never leave the GPU process; Annex B pulled in batches, ffmpeg `-c copy` mux |
| Blender EEVEE (bpy rigs) | not installed; not measured | est. 15-60 min | heavier rigs and much slower iteration; the quality gain doesn't pay for that at this style |
| AI video generation | excluded | — | paid, inconsistent characters, rights unclear |

Headless Chrome uses the real GPU: `ANGLE (NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11)`, launched with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`.
**Pilot measured** (full farm scene, 8 actors, 4 sub-frames, soft shadows; a game was running on the same GPU): v1 rendered 4855 frames in 266 s (54.7 ms/frame) and v2 in 171 s (**35.2 ms/frame, about 63 s of 3D render per video minute**). A full build of the 2:42 pilot with cached TTS took 15.1 min (alignment about 3 min, 3D about 3-4.5 min, ffmpeg composite 45 s, master and techqa). An audio-only rebuild with `--reuse-3d N` took 5.7 min.

## Chosen: `packages/kids3d`
- **Three.js r187 kit** (`packages/kids3d/web/kit/`). Tiko, Pip and six farm animals are built from primitives with soft "toy" PBR materials (sheen fur, clearcoat eyes). Each character has blinking lids, eye direction, moods, a mouth or beak, arms or wings, and legs and a tail. The set is a sunny farm: barn with swinging doors and a lit interior, hay, pond and reeds, bushes, hen coop, fences, instanced flowers and grass, drifting clouds and butterflies (two-lobed wings; they fade near the camera and around reveals). Hiding bushes are three short round bushes; the horse has its own rig (arched neck carrying the head, long muzzle, two-part legs, mane, body rock at the trot). The lighting rig is a sky dome, a hemisphere light, a warm sun with soft shadows that follow the camera, and a room environment map.
- **Motion.** `Actor` keyframe tracks plus additive gestures: jump, hop, wave, cheer, look, tilt, nod, flap, say and talk. All are pure functions of `t`. A gait (hop, waddle or trot) starts automatically when an actor moves, and idle breathing, blinks and head drift run all the time.
- **Lip sync.** The build computes a per-frame loudness envelope of each line. Any actor named like a line's speaker (`tiko`) moves its mouth to it automatically, and animals open their mouths on their sound words.
- **Camera.** `K.frame(points, {az, el})` auto-frames subjects. It is perspective-aware, uses bisection, and keeps a minimum distance (`near`/`avoid`). On top of that are `cut`, `move` and `orbit`, plus a gentle handheld drift.
- **Picture.** 4 sub-frames at a 0.28 shutter are accumulated in half-float HDR, then Neutral tone mapping and 4x MSAA. Encoding is WebCodecs H.264 at 28 Mb/s.
- **Choreography.** One `choreo.js` per episode, scheduled from word times (`K.word(line, 'moo')`). `K.keep()` and `K.offscreen()` declare what must be visible. `kids:lint` checks framing and occlusion every 0.25 s.
- **Studio path.** `episode.json` goes through Gemini TTS (`packages/voice`: one cached take per voice) and faster-whisper alignment to `score.json`. Then come the 3D render, `timeline.json` (3D picture, title card, narration lanes, SFX cues from the choreography, procedural music bed ducked under speech), `packages/render` (ffmpeg), `master` (-14 LUFS) and `techqa`.
- **Music ducking** under speech is baked into `music.wav` (`duckWav`), because a long volume-keyframe expression breaks the ffmpeg filter parser.
- **Audio** is all original procedural material (`packages/kids3d/src/audio.ts`): SFX (pop, ding, sparkle, chirp, clop, boing, splash, rustle, door, yay) and a full-length ukulele, marimba and glockenspiel bed. There are no samples, so no rights are needed and no credit is required.

## Why
The chosen path is 7x faster than HyperFrames and 4x faster than screenshots, at the same or better image quality (no JPEG step). It is fully deterministic: a re-render gives identical frames. It uses only free, local tools. A sonnet showrunner can make a new episode by writing JSON plus about 150 lines of choreography against a documented kit. The renderer is reused as is (`packages/render` untouched).
