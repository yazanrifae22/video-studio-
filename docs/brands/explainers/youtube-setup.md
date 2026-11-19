# YouTube setup: index

Everything the owner needs to create the three channels and get the first week live. Uploads and publishing always need
the owner's explicit approval. The studio uploads **private** by default, and scheduled publishing needs a per-channel opt-in.

## 1. Channel kits (copy-paste values + brand files)
| Channel | Kit | Brand files |
|---|---|---|
| Tech Made Simple (`tech`) | [channels/tech/brand/channel-kit.md](../channels/tech/brand/channel-kit.md) | `avatar.png` 800×800 · `banner.png` 2560×1440 · `watermark.png` 150×150 |
| The Moment (`celebrity`) | [channels/celebrity/brand/channel-kit.md](../channels/celebrity/brand/channel-kit.md) | same set |
| Tiko & Pip (`kids`) | [channels/kids/brand/channel-kit.md](../channels/kids/brand/channel-kit.md) | same set (YouTube doesn't show the watermark on made-for-kids videos) |

Each kit has the name, handle with fallbacks, About text, keywords, country, upload defaults, the AI-disclosure setting,
the audience setting, playlists with their video ids, links (none yet) and where each brand file goes.
Re-render the brand files with `npx tsx packages/video-engine/src/stills.ts brand` (and `watermark`). Check the banner safe area with `... stills.ts check`.

## Connect the studio (OAuth)
TODO (orchestrator): OAuth client + per-channel `youtube:auth`. The step-by-step currently lives in [youtube-connect.md](youtube-connect.md).

## 2. Schedule
The week-1 calendar has 42 slots (Oct 21–27 UTC), one video per slot. Every video's `scheduled_at` equals its slot time. Time-sensitive deadlines are in `config/deadlines.json`.
```
npm run -s cli -- schedule:check all                                  # slot → video table + deadline status
npm run -s cli -- schedule:shift all --start 2026-10-22T00:00:00Z --dry-run   # preview moving unuploaded videos later
```
`schedule:shift` keeps each channel's daily slot times and the order, and only moves videos with no `youtube_id`. It refuses to
apply a plan that breaks a deadline unless you pass `--force`. A one-day shift breaks Messi, Hamilton and Yamal on `celebrity`, so reorder that channel by hand instead of forcing.

## 3. Upload
```
npm run -s cli -- youtube:upload-all <channel> --dry-run              # what would upload, and why others are skipped
npm run -s cli -- youtube:upload-all <channel>                        # private drafts, in scheduled order; stops on first error
npm run -s cli -- youtube:upload-all <channel> --schedule             # needs youtube:authorize-publishing <channel> --i-am-the-owner
```
Eligible = owner-approved in the studio (stage `approved`/`scheduled` plus an owner "approve" on the current version), a passing
agent review on the current version, `v<N>/final.mp4` present, and no `youtube_id` yet.

### Fallback: manual upload in YouTube Studio
Google's documentation contradicts itself here. The API revision history (28 July 2020) says uploads from **unverified** projects created
after that date are locked to private until the project passes a compliance audit. The current `videos.insert` reference says
"Videos uploaded from unverified API projects are not restricted to private viewing mode." The first real private upload will settle it:
if YouTube emails that the video is "locked as private", the lock applies. In that case (or any time the API path is blocked), export a manual kit and upload by hand:
```
npm run -s cli -- youtube:kit <channel>                       # → exports/<channel>/<YYYY-MM-DD_HHMM>_<slug>/
```
Each folder holds `final.mp4` (a hardlink to the render; don't edit it in place), `thumbnail.png`, `captions.vtt` and `metadata.txt`.
`metadata.txt` has the title, the description with the disclosure, tags, category, the made-for-kids answer, the altered-content answer, and the publish time in UTC and Asia/Amman.
`exports/<channel>/index.txt` lists the upload order. `exports/` is git-ignored. Re-run the command after any re-render or schedule change.

Sources (accessed 2026-10-21):
- https://developers.google.com/youtube/v3/revision_history (entry "July 28, 2020": restricted to private, audit lifts it)
- https://developers.google.com/youtube/v3/docs/videos/insert (status.privacyStatus: "not restricted to private viewing mode")
