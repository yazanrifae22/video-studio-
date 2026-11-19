# Writing a video spec (`productions/<id>/spec.json`)

The spec is the single source of truth for a video. Writers fill `narration`; motion designers pick scene types,
props and **word-timed beats**. The engine (HyperFrames) pins every animation to the real narration word timestamps.

```json
{
  "id": "<videoId>", "channel": "tech", "title": "Webhooks in 45 Seconds", "format": "short",
  "kicker": "TECH MADE SIMPLE",
  "voice": { "name": "Charon", "style": "Clear, confident, curious explainer. Brisk but never rushed.", "maxPause": 0.28 },
  "music": { "bed": "tech-focus", "gainDb": -24 },
  "scenes": [
    { "id": "hook", "type": "hook", "narration": "Your app keeps asking the server: anything new? Anything new?",
      "lines": [{ "text": "Anything new?" }], "emphasis": ["new"] },
    { "id": "poll", "type": "diagram", "narration": "...",
      "nodes": [{ "id": "app", "label": "Your App", "icon": "laptop", "x": 22, "y": 50 }, { "id": "srv", "label": "Stripe", "icon": "server", "x": 78, "y": 50 }],
      "edges": [{ "from": "app", "to": "srv" }],
      "beats": [{ "at": "asking", "do": "packet", "from": "app", "to": "srv", "label": "GET /orders", "repeat": 2 }] }
  ]
}
```

## Scene catalogue
```
hook      {kicker?, lines:[{text, at?, size?, color?}], big?, bigAt?, bigIcon?, strike?:{text, at, showAt?}, sub?, subAt?}
          First scene of the video: anything cued at 0 (`at: 0`; the kicker by default) is fully visible at frame 0, with no fade-in (Shorts-feed rule).
diagram   {heading?, nodes:[{id,label,sub?,icon?,x%,y%,w?,h?,color?}], edges:[{from,to,label?,dashed?,color?,at?}],
           beats: show | packet{from,to,label?,color?,dur?,repeat?,every?} | status{target,text,color?} | bubble{target,text,until?}
                  | check{target} | cross{target} | flow{target:"from-to"} | camera{focus|x,y, zoom, dur} | camera{reset}
                  | highlight{target,until?} | pulse | dim | undim | shake}
list      {number?, kicker?, heading, items:[{title, sub?, icon?, tag?, at, strikeAt?}]}   (strikeAt: animated cross-out)
bars      {kicker?, heading?, rows:[{label?, value, color?, at?}], at?, until?, unit?}   (ranked bar chart; rows cascade from at→until)
compare   {heading?, left:{title,icon?,color?,at?}, right:{...}, rows:[{left,right,at?}], verdict?:{text,at}}
stat      {kicker?, value, prefix?, suffix?, decimals?, format?:"compact", label, sub?, at?, dur?}
code      {heading?, title?, lines:[{text, at?, hl?}], fontSize?}
quote     {text, by, source?, at?, size?}                    (only real, sourced quotes)
timeline  {heading?, events:[{year, text, at}]}
headline  {kicker?, title, sub?, at?, subAt?, size?}
count     {item:"🍎"|icon, n, from?, ats?:[word...], label?, labelAt?}; beat parade{at, hops?} (kids)
          from: continue numbering in a second scene (e.g. from:6, n:5 counts six..ten)
character {} + cast:[{who:"tiko"|"pip", x%?, mood?:happy|wow|think|sad, talk?}]; beats wave|jump|cheer|look|squash {who}
cta       {title, sub?, next?}
custom    {html (use {{p}} for id prefix), js (has tl, S, E, T(word,n), u), beats?:[{at, do:"sfx", name}]}  (escape hatch; add sfx beats for sound design)
Any scene: css (scene-scoped `<style>` text; `{{p}}` becomes the scene prefix, e.g. `#{{p}}-stage > .fill{...}`, so restyle built-in scenes here, never from another scene's html), narration, emphasis[], holdAfter (sec of breathing room), captions:false, cast[] (kids), beats[], quietIn:true (no transition whoosh into this scene, e.g. a death or sombre line)
diagram extras: `continue: true` = same canvas as the previous diagram scene (no transition; nodes with the same id MORPH to their new x/y; heading swaps in place).
               edges `arrow: true | "both"` draw arrowheads (direction = from → to).
```
Top-level (not a scene) — on-screen CTA overlays on top of any scene, see "Calls to action" below:
ctas      [{kind:"subscribe"|"like"|"heart"|"comment"|"share", at, dur?, text?, pos?:"top"|"mid"|"low"}]   (max 3 per Short; not on kids)
**Timing refs:** seconds-from-scene-start · `"word"` · `"word#2"` · `"word+0.3"` · `"@globalWordIndex"` · `"end"`.
Words match case/punctuation-insensitively; 4+ letter prefixes match (`"webhook"` hits "webhooks").

**Icons:** server db user phone laptop globe bolt lock key clock check x mail code cpu bell card cloud cart shield brain chat queue refresh search trophy mic star film calendar chart ball — or any emoji.
**Voices (Gemini):** Charon (informative), Puck (upbeat), Kore (firm), Leda (youthful), Aoede (breezy), Algenib (gravelly), Orus (firm), Iapetus (clear), Achernar (soft), Gacrux (mature), Sulafat (warm) … 30 total.
**Music beds:** tech-focus, kids-sunny, kids-calm, story-cinematic.  **SFX** are added automatically from beats.

## Craft rules
1. **Every sentence gets a visual change** — a beat, a scene change, or a camera move. Nothing on screen should sit still > 2s.
2. **Hook in < 2s**: first scene ≤ 3s, states the tension, shows motion in the first 0.3s.
3. Shorts: scene change every 3–7s; 9:16; key text inside the middle 80% (YouTube UI covers the bottom ~20%).
4. Diagram node coordinates are % of the stage box; keep ≥ 18% spacing between node centres; ≤ 5 nodes per scene.
5. Packets should arrive **on** the word that names the effect ("…and it **pings** you") — put `at` ~0.5s before.
6. Elements are hidden until their own cue, so give every list item, compare row and card an `at` on the word that introduces it.
7. Shorts safe zone: keep content out of the bottom ~20% and right ~12%; the stage box already does this — but custom
   scenes, wide pills, letter-spaced subtitles, rotated cards and the stage push-in (scale 1.02–1.03) can still cross it.
   **Check before rendering:** `npm run -s cli -- safezone <id>` composes the current spec with the cached narration
   timing (no TTS, temp dir; nothing in productions/ changes), seeks it in headless Chrome every 0.1 s and lists
   painted content inside the scene stages whose right edge passes **x 945** (YouTube's action buttons) or whose bottom
   enters **y > 1536** (title overlay): `Right edge x 983 at 31.2 s in scene loop ("It started with cat + hat") ...`.
   `--version N` checks an existing `v<N>/comp`; `--json` for machine output. MAJOR = resting layout, minor = only
   while moving (fly-outs, ripples). It ignores the chip, progress bar, captions, cast, full-bleed layers (> 85% wide),
   tiny untexted dots (< 400 px²), anything at opacity < 0.05, things on screen < 0.3 s, and elements marked
   `data-safezone="off"` / `data-bg` (use for deliberate bleed art only). Every Short render runs it too
   (`v<N>/safezone.json`), and its findings land in qa.json as `composition` issues owned by motion. Takes ~3–10 s.
8. Use `holdAfter` (0.3–0.8s) after a payoff so the viewer can see it land. `holdAfter`, `voice.tempo` and `voice.maxPause` change the audio stage: re-run with `produce <id> --from audio` (narration comes from the cache, no TTS). `--from render` ignores them.
7. Kids: slower (maxPause 0.45, tempo 0.95), 3-word captions, one concept per scene, cast present in most scenes, praise/payoff at the end.
8. Validate before producing: `npm run cli -- spec:validate <id>`.

## Portrait band layout (`layout`, opt-in)
Built-in scenes sit compactly in the stage, which leaves the lower third of a Short bare. Add one top-level field:
`"layout": { "portraitBand": "center", "scale": 1.15 }` (scale optional, 1-1.25). Tech/celebrity Shorts only; absent = layout unchanged (byte-identical).
- Built-in scenes (hook, stat, headline, quote, list, compare, code, timeline, bars, diagram, cta) render in a taller band, y 400-1290 (centre 845), at `scale` times larger, with the right edge held at x 940. `custom`, `image`, `count`, `character` scenes are not touched.
- Captions are unchanged. CTA `pos:"low"` pills move 40 px lower (row y 1221-1353) so they sit under the band; use `low` (not `mid`) with this option. Diagram nodes at y > 85% can still meet a low pill: keep them higher.
- Diagram/timeline geometry stretches over the taller band; long list titles wrap earlier at the larger scale, so re-check with `safezone <id>` and frames.

## Calls to action (`ctas`)
Small animated overlays that sit **on top of** whatever scene is playing, cued to a spoken word. Use them instead of a
"follow for more" end card: Shorts loop, so the last line must flow back into the hook.

```json
"ctas": [
  { "kind": "subscribe", "at": "subscribe" },
  { "kind": "heart", "at": "heart-0.2", "text": "Drop a ❤ if you knew" }
]
```
| kind | what it shows (original SVG/CSS, no platform logos) | sound |
|---|---|---|
| `subscribe` | red pill "SUBSCRIBE" + bell; a hand taps it → grey "SUBSCRIBED ✓", bell rings (default 2.6 s) | pop, tap, bell |
| `like` | thumbs-up badge that punches with a burst + label "Leave a like" | pop, tap |
| `heart` | red heart that beats twice, mini hearts float up + label "Tap the ❤" | pop, sparkle |
| `comment` | speech bubble, typing dots turn into a heart + label "❤ in the comments" | pop, click |
| `share` | curved arrow that nudges + label "Send this to a friend" | pop, whoosh |

- `at` is a **global** timing ref: seconds from the video start, `"word"`, `"word#2"`, `"word+0.3"`, `"@globalWordIndex"`.
  A word ref hits the **first occurrence in the whole narration** ("Cameras" may match the hook). `spec:validate` prints
  every CTA's resolved time; check it, and use `#n` or `@idx` when the word repeats.
- `dur` 1.2–5 s (default 2.2, subscribe 2.6). `text` overrides the label (≤ 28 chars; `❤` is drawn as an SVG heart).
- `pos`: `low` (default, just above the captions), `mid` (frame centre), `top` (top of the stage, where headings sit).
  Pick the band that is empty in that scene. The overlay covers whatever is under it.
- Accent colour follows the channel theme (tech blue, celebrity gold). It stays inside the Shorts safe zone (centred at
  x ≈ 497, never past x 945 or below y 1536), and the safe-zone check measures it like scene content.
- Each CTA is its own clip, hidden before its cue (no frame-0 flash) and seek-safe. Its SFX are exempt from SFX de-dupe.
- `spec:validate` rejects unknown kinds and fields, unresolvable words, overlapping CTAs (they need ≥ 0.2 s between them),
  more than 3 CTAs in a Short, and any CTA on the kids channel (Made for Kids). It warns when a CTA lands on the hook
  (< 1.5 s) or is still on screen at the final line.
- Visual-only: adding or moving CTAs needs only `produce <id> --from render` (no TTS).

**Recommended pattern (Shorts):**
1. One `subscribe` at ~55–70 % of the video, on a spoken line that earns it: *"If that's new to you, subscribe"*.
   The writer adds the line to the narration, and the CTA cues on "subscribe".
2. One `like` / `heart` / `comment` on a spoken engagement line (*"Drop a red heart in the comments if you knew"* → `heart` or `comment` on "heart").
3. **Never as the final line.** The last scene stays the loop line back into the hook. Max 3 CTAs per Short; 2 is usually right.

## AI-generated images (`/codex-image-generation`)
Use generated stills whenever an illustration makes the video clearer or more engaging than shapes and icons can:
backdrops (a pumpkin patch, a data centre, a stadium at night), props and objects (kids items, a ballot box),
symbolic editorial art, and scene backgrounds. Generation is free (ChatGPT subscription via Codex CLI), so
**generate 2–3 candidates and pick the best. Never accept a near-miss.**

```
npm run -s cli -- image:gen <videoId> <name> --aspect 9:16 --n 3 --prompt "<what, composition, where to leave empty space>"
#   → productions/<id>/images/cand/<name>__1..3.png   (look at them with the Read tool, then pick)
npm run -s cli -- image:pick <videoId> <name> <k> --aspect 9:16   → productions/<id>/images/<name>.png
#   reusable art for many videos: use videoId _library → assets/generated/<name>.png, referenced as "library/<name>.png"
#   edits/consistency: --edit <pickedParentName> and/or --ref <file> (max 4 refs; 3 for edits)
```
The channel's house style is prepended automatically (tech flat vector, kids picture-book, celebrity cinematic symbolic).
Always name the composition and the empty area you need (e.g. "leave the middle third open for numbers").
Asset provenance is logged automatically.

Use in the spec:
- `"background": {"src": "images/x.png", "dim": 0.3}`: whole-video backdrop with a slow drift.
- `{"type": "image", "src": "images/x.png", "kenburns": "in", "title": "...", "frame": true}`: a full or framed still scene.
- `"bg": {"src": "images/x.png", "opacity": 0.4}` on any scene, or any `icon`/`item` set to `"images/x.png"` (nodes, list items, kids counting objects).

**Rules:**
- **Celebrity:** never generate real people, faces or likenesses, logos or trademarks. Use symbolic/abstract imagery only (the CLI refuses likeness prompts).
- **Kids:** nothing scary. Keep Tiko and Pip as our SVG rig; generated art is for scenery and props. Pass a reference (`--ref`) to keep a series consistent.
- **Text:** no text inside images (it comes out garbled). Put words in the engine's typography.

## Long-form (16:9) layout
`"format": "long"` renders 1920×1080 with `u = 1` (the same px sizes as Shorts). Built-in scenes lay out inside the **stage box x 154–1766, y 184–832**; captions sit at **y ≈ 896** (bottom band).
- `custom` scenes and absolutely positioned elements must stay inside the stage box, or they collide with the captions. Positions copied from a vertical spec put content left of centre and run into the caption band (tested 2026-10-20 by rendering the RAG Short as 16:9).
- Use the width: side-by-side comparisons, left-to-right timelines and wide diagrams read better than stacked layouts.
- Keep each scene ≤ ~8 s with a visible change at least every ~3 s. Long-form has the same no-static-stretch rule as Shorts.
- Narration must fit ONE TTS request: about 3–4 min (≤ ~600 words).
- Kids cast in 16:9: the default positions (x 26%/66%, y 0.92H) sit in the caption band. Set `x`/`y` on every cast member explicitly, e.g. Tiko x 17%, Pip x 85%, with feet above y ≈ 860.
- In 16:9, diagram and timeline headings sit at y ≈ 150–235, so start their content below ~y 250. The `hook` scene centres on the whole frame: keep it to ≤ 3 short lines plus an optional `sub`, or it reaches the caption band.

## Engagement enhancements (`"enhancements": "v2"`)
Top-level string enum (currently only `"v2"`; absent = old behaviour, unchanged). With v2, `spec:validate` ERRORS unless: >= 2 `ctas`,
one of kind `comment`, the final scene's narration ends with `?` (open-question loop), no cta is cued inside the final scene,
and `productions/<id>/upload.json` has `pinnedComment` (string, 10-120 chars). Missing upload.json or missing `layout` = WARNING only.
All pass -> prints `enhancements v2: OK`. Rules: docs/run240-protocol.md "Engagement enhancements v2".
