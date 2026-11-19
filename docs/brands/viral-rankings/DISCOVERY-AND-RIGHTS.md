# Viral Rankings: discovery and rights (pilot, 2026-10-31)

Author: source-librarian / viral-analyst. Code: `packages/discovery/py/scrape_media.py` (Scrapling 0.5 helper) + `noaa` provider in `packages/discovery/src/providers.ts` (`discover noaa "<page url>"`). Log: `data/logs/discovery-scrapling.jsonl`.

## 1. Providers tested
| Provider | Method | Result |
|---|---|---|
| NOAA Ocean Exploration feature + video_playlist pages | Scrapling `Fetcher.get` (plain HTTP, stealthy headers, no browser) | WORKED. HTTP 200, server-rendered `<video>` + `<source>` + "Download file" anchors. 8 videos (feature page) and 1 (playlist page) extracted with credit line, description, GFOE flag, 1080p/720p URLs. |
| Wikimedia Commons file metadata | Commons API (`prop=imageinfo`, `extmetadata`) fetched via Scrapling | WORKED for 9 of 9 existing files; 1 non-existent title returned `removed` correctly. Licence, artist, credit, size, mime, API duration. |
| NOAA legacy page `ex1603/logs/mar2` | Scrapling | `removed` (HTTP 404). Commons copy is the only file left. |
| Existing studio providers (wikimedia search, IA, NASA, Pexels, Pixabay, YouTube) | untouched | not re-tested here |
| StealthyFetcher / browser | not needed, browsers not installed | not tested |

Behaviour: >=1 s per-host gap, 3 attempts with backoff on 429/5xx/network errors, canonical-URL dedupe in the helper and `(platform, external_id)` dedupe in the DB (re-running `discover noaa` on the playlist page refreshed the existing row instead of inserting).

## 2. Results (pilot)
- 14 files downloaded to `data/media/viral-rankings/` (826 MB, cap 2 GB), sha256 + ffprobe recorded in `sources.data`, `fingerprint`.
- Commons API `duration` is broken for NOAA webms (~141,000-143,000 s for Flapjack, Graneledone close-up/flees). NOAA's own mp4 masters were used instead; every duration comes from ffprobe.
- NOAA page defect: the link for "#7 Teeny Tiny Octopus" serves the same bytes as #6 (sha b38b9937...). The helper does not detect this; the librarian caught it by hash. Add a hash-dedupe on acquisition (the DB `possible_duplicate_of` uses titles only).
- The adapter's `ambiguous_owner` check is a keyword heuristic: it flagged octopus #1 only because the text names MBARI (species ID, not footage owner). Heuristic, never a decision.
- Failure classes implemented: `access_denied` (401/403/429 after retry), `removed` (404/410, tested), `metadata_unavailable` (no licence / no `<video>` / network), `no_download_permission` (no file URL), `ambiguous_owner` (OET/Nautilus/MBARI/Schmidt/WHOI keywords or no credit line), `bad_codec` (unexpected mime), `duplicate`. Only `removed` was triggered live.
- Not claimed: no platform search (YouTube/TikTok/IG) was run; discovery here is page-targeted, not a complete search.

## 3. Stats evidence policy
Views, likes, shares are always `null` in these providers (none are exposed on NOAA/Commons). Never estimate. A future provider that does read stats must tag each value `public | platform_api | estimated | missing | stale` with `observed_at`. Popularity is a research signal, never rights evidence.

## 4. Rights gate (as applied)
- Proposed by `source-librarian` only; rights-scout countersigns (nobody reviews their own work).
- 12 NOAA/Commons files = `approved_with_conditions` (US federal work, credit "Video courtesy of NOAA Ocean Exploration", strip ROV audio, no implied endorsement, left-rail vs NOAA bug). `wgt9` = `pending` (producer unverified). `x2ti` = `rejected` (duplicate/mislabelled, not a licence issue).
- Rejected earlier by the judge: `Wk215-deep-sea-octopuses` (OET/NOAA, E/V Nautilus, private).
- Contractor check: EX2301 Dive 04 was flown by GFOE pilots (kgm4, vixe, geow, t6w6; the page names GFOE explicitly for t6w6). Rights-scout must confirm NOAA's ownership (CLAUDE.md: contractor reels get overturned). Also confirm: 3zvd (Hohonu Moana 2016, original page gone), fg5q (CC0 via Commons), gvcz/u3js (Commons copies of NOAA OER productions).
- Moments inherit the source's status; no moment-level rights were narrowed.
- **Countersign is enforced in code (2026-10-31, pipeline-engineer).** `ranking:validate`, `ranking:cutlist` and the build-time recheck require the **latest `rights_log` row** of every used source (and of a moment that has its own `rights_status`) to be by a countersigning actor: `config/policy.json viralRankings.countersignActors` = `rights-scout`, `owner`. An `approved_with_conditions` written by a showrunner / source-librarian / classifier is a proposal only and blocks the plan ("not countersigned"). Any later re-proposal (new window, quote or conditions) is newer than the countersign and blocks again until rights-scout re-countersigns: `rights:set <asset> approved_with_conditions --actor rights-scout --reason "countersigned by rights-scout: …" --evidence <url>`. A plan entry's `rights_decision_id` must also point at a countersign row. Derived from the audit log, no schema change (`packages/ranking/src/library.ts rightsCountersign`). Verified read-only: fzcu, jcx9, 8knt plans all pass (every source's latest row is rights-scout).

## 5. Fallbacks
- Commons copy when the NOAA original is gone (3zvd) or when only a Commons-hosted master exists (fg5q, gvcz, u3js, wgt9).
- If GFOE footage is overturned: slot candidates without Dive 04 are lpww-1, wz6c-1, dc6u-1, mlir-1 (Dives 06/07/09), fg5q-1, 3zvd. Slot 3 then has only fg5q-1 as a flee beat: sweep the EX2301/EX1811/EX1806 playlists for more.
- Page 404 / layout change: re-run `scrape_media.py` against the playlist (`/video_playlist/...`) pages, or use Commons API.
- Scrapling failure on a page that needs JS: switch to `StealthyFetcher` (needs `scrapling install`), not yet installed.

## 6. Video understanding (2026-10-31, viral-analyst)
- **`python3` shim for the `video-analyze` skill (2026-10-31, pipeline-engineer):** the skill's scripts call `python3`, which on this box is the Microsoft Store stub and hangs the shell. Do not call `~/.claude/skills/video-analyze/scripts/run.sh` directly; use the studio wrapper (skill files unchanged):
  `bash scripts/video-analyze.sh <url> [run.sh flags]` (Git Bash). It puts a temporary `python3` / `python3.11` / `python3.12` shim first on PATH that execs `.venv-asr/Scripts/python.exe` (has Pillow; falls back to global `python`, never a `WindowsApps` path), sets `PYTHONUTF8=1`, refuses YouTube URLs (discovery-only), and writes to `data/cache/research/video-analyze/<ts>/` unless `--out-dir` is given (research_only material, never a cut-list source). `bash scripts/video-analyze.sh --check` prints the resolved interpreter and runs the skill's setup check. Local files: pass a `file:///E:/...` URL (see below).
- **`source:analyze`** (studio, GPU-locked, run sequentially, no `--transcribe`) on lpww, wz6c, mlir, dc6u, vixe, kgm4, geow, t6w6. Per sha it writes `data/cache/<sha>/analysis.json` (scenes, motion_0p5s, audio_db_0p5s, peaks), `sheet_00.jpg`, keyframes, and a mezzanine in `data/media/mezz/`. Result: every file = 1 scene (no cuts), audio silent (-120 dB).
- **`video-analyze` skill** on the local files of lpww, dc6u, vixe: works with a local path only as a `file:///E:/...` URL (its curl fallback copies the file into the output dir; deleted afterwards). Low-fidelity grids (2x2..4x4) at `data/cache/analysis/video-analyze/<lpww|dc6u|vixe>/` (manifest.json, frames/, grids/). Auto interval is 5 s, too coarse for in-points, so cut points came from the motion curve plus 8-frame tiles at chosen seconds. Its scripts call `python3` (Store stub on this box): needs a `python3 -> python` shim on PATH. No transcript (skipped).
- **Output:** `productions/_viral-rankings-pilot/motion-report.md`; `evidence.motion` written on 11 moments via `moment:add` (upsert; rights untouched).
- **Findings that changed the plan:** vixe-2 has no hard cut at 23 s (it is a zoom-out), frame 0 should be 24.0 s; dc6u-1 "scoot" is mostly an ROV push-in; 3 of 11 windows contain > 1.5 s dead air (t6w6-1, mlir-1, geow-1).
- **Limits:** the motion metric is whole-frame (camera + subject), 0.5 s resolution; no subject tracking/optical flow; frames eyeballed only at cited seconds. Running two `source:analyze` loops at once corrupts the shared mezzanine files (the lock does not cover the mezz write): run one loop only.
