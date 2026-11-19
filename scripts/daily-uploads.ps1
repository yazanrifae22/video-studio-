# ONE quota-aware daily YouTube uploader for every brand (owner 2026-11-02). Replaces ClipsViral-CelebrityUploads + ClipsViral-PodiumPopUploads.
# Task "ClipsViral-DailyUploads" runs it at 10:20 and 16:20 local (Google quota resets at midnight Pacific = ~10:00 Cairo); 45 min timeout.
# One Google project = 10,000 units/day, shared by all channels (ledger data/daily-uploads-ledger.json). Old assumption 'upload = 1,600 units -> max 6/day' was wrong on 2026-11-03 (7th upload succeeded); a quotaExceeded error still stops every brand.
# Priority and caps: kids (Sunny Hill) 3, Podium Pop (viral-rankings) 3, Mission Voices (clipping) 1, The Way It Was Made (compilations) 1, celebrity 2, Shu Shayef (quiz-ar) 1 + leftovers (2026-11-03).
# Unused allowance flows down the list, then a second pass lets any brand with approved videos use what is still left.
# Only approved productions upload (uploadBrand / upload-legacy gates in scripts/youtube.ts, which also refuse AI-generation text).
# Celebrity keeps its date-pinned logic inside youtube.ts upload-legacy (data/celebrity-upload-plan.json: reserved_et, deadline_utc).
# Usage: -DryRun [-AsOfPacific 2026-11-03]  previews (no upload, no ledger change; AsOfPacific simulates that quota day).
param([switch]$DryRun, [string]$AsOfPacific = '')
$root = 'E:\clips-viral'
$log = "$root\data\logs\daily-uploads.log"
$ledgerPath = "$root\data\daily-uploads-ledger.json"
$total = 80   # owner 2026-11-03: up to 10 uploads per channel per day (videos.insert no longer eats 1,600 of the 10,000 units: a 7th upload on 11-03 worked)
$brands = @(
  @{ id = 'kids';           cap = 10; legacy = $false },   # owner 2026-11-03: schedule all Sunny Hill episodes (Made for Kids flag set by youtube.ts)
  @{ id = 'viral-rankings'; cap = 10; legacy = $false },
  @{ id = 'clipping';       cap = 10; legacy = $false },
  @{ id = 'compilations';   cap = 10; legacy = $false },
  @{ id = 'tech';           cap = 10; legacy = $false },   # owner 2026-11-03: Tech Made Simple resumed (tech:build), slots 19:00 Cairo (config/publish-times.json)
  @{ id = 'rankings';       cap = 10; legacy = $false },   # owner 2026-11-08: Planet Extremes revived (1/day grid 16:00 ET in config/publish-times.json)
  @{ id = 'celebrity';      cap = 10; legacy = $false },   # owner 2026-11-08: revived; NEW celebrity:build productions first (publish-plan new_times grid) ...
  @{ id = 'celebrity';      cap = 10; legacy = $true },    # ... then the legacy queue (upload-legacy); both share celebrity's per-day ledger count
  @{ id = 'quiz-ar';        cap = 10; legacy = $false }   # owner 2026-11-03: schedule all approved videos (YouTube runway full to 11-18); pass 2 gives it any leftover
)
Set-Location $root
New-Item -ItemType Directory -Force "$root\data\logs" | Out-Null
$t0 = Get-Date
function Log($m) { Add-Content $log ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) }
function Run-Yt([string]$cmdline) {
  $left = [int]((45 * 60) - ((Get-Date) - $t0).TotalSeconds)
  if ($left -le 30) { Log 'TIMEOUT budget (45 min) used up'; return @{ text = ''; timeout = $true; code = 2 } }
  $tmp = "$root\data\logs\daily-uploads.tmp"
  Remove-Item $tmp -ErrorAction SilentlyContinue
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npx tsx scripts/youtube.ts $cmdline > `"$tmp`" 2>&1" -WorkingDirectory $root -WindowStyle Hidden -PassThru
  if (-not $p.WaitForExit($left * 1000)) { Stop-Process -Id $p.Id -Force; & taskkill /T /F /PID $p.Id 2>$null | Out-Null; Log 'TIMEOUT after 45 min, killed'; return @{ text = ''; timeout = $true; code = 2 } }
  $t = if (Test-Path $tmp) { Get-Content $tmp -Raw -Encoding UTF8 } else { '' }
  if ($t) { Add-Content $log $t }
  return @{ text = $t; timeout = $false; code = $p.ExitCode }
}
function Yt-Cmd($b, [int]$n, [bool]$dry) {
  $x = if ($dry) { ' --dry-run' } else { '' }
  if ($b.legacy) { return "upload-legacy $($b.id) --limit $n$x" } else { return "upload $($b.id) --limit $n$x" }
}
function Count-Dry([string]$t, $b) { if ($b.legacy) { ([regex]::Matches($t, '(?m)"publishAt":')).Count } else { ([regex]::Matches($t, '(?m)^\s*"at":')).Count } }

$pac = if ($AsOfPacific) { $AsOfPacific } else { [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'UTC', 'Pacific Standard Time').ToString('yyyy-MM-dd') }
$ledger = [ordered]@{}   # { "<pacific day>": { "<brand>": n } }
if (Test-Path $ledgerPath) {
  $o = Get-Content $ledgerPath -Raw | ConvertFrom-Json
  foreach ($d in $o.PSObject.Properties) { $ledger[$d.Name] = [ordered]@{}; foreach ($k in $d.Value.PSObject.Properties) { $ledger[$d.Name][$k.Name] = [int]$k.Value } }
}
if (-not $ledger.Contains($pac)) { $ledger[$pac] = [ordered]@{} }
$day = $ledger[$pac]
$used = 0; foreach ($v in $day.Values) { $used += [int]$v }
$remaining = $total - $used
Log ("=== start (pacific day {0}, used {1}/{2}, dry={3})" -f $pac, $used, $total, [bool]$DryRun)
if ($remaining -le 0) { Log 'daily quota reached, nothing to do'; exit 0 }
$env:YT_LEGACY_MAX_PER_DAY = '99'   # the shared ledger here is the cap; youtube.ts' own per-brand cap is bypassed
$summary = @()
try { [void](Run-Yt 'sync all'); Log 'youtube sync done (runway truth)' } catch { Log "youtube sync failed: $_" }
$quotaHit = $false
$sim = @{}   # dry-run planning: what each brand takes

function Do-Brand($b, [int]$allow) {
  if ($allow -le 0 -or $script:remaining -le 0 -or $script:quotaHit) { return 0 }
  $n = [Math]::Min($allow, $script:remaining)
  $d = Run-Yt (Yt-Cmd $b $n $true)
  if ($d.timeout) { exit 2 }
  $c = Count-Dry $d.text $b
  if ($c -eq 0 -and -not $b.legacy -and -not $DryRun) {
    Log "$($b.id): no approved slot in plan -> python scripts/publish-plan.py"
    & python scripts/publish-plan.py 2>&1 | Out-String | Add-Content $log
    $d = Run-Yt (Yt-Cmd $b $n $true); if ($d.timeout) { exit 2 }
    $c = Count-Dry $d.text $b
  }
  if ($c -eq 0) { Log "$($b.id): nothing to upload (flows to next brand)"; return 0 }
  if ($DryRun) {
    $show = ([regex]::Matches($d.text, '(?m)^\s*"(id|at|publishAt|title)":.*$') | ForEach-Object { $_.Value.Trim() }) -join ' | '
    $script:summary += "{0} x{1}: {2}" -f $b.id, [Math]::Min($c, $n), $show
    $script:remaining -= [Math]::Min($c, $n); return [Math]::Min($c, $n)
  }
  $r = Run-Yt (Yt-Cmd $b $n $false)
  if ($r.timeout) { exit 2 }
  $ok = ([regex]::Matches($r.text, '(?m)^scheduled ')).Count
  if ($ok -gt 0) {
    $day[$b.id] = [int]($day[$b.id]) + $ok
    $ledger[$script:pac] = $day
    ($ledger | ConvertTo-Json -Depth 5) | Set-Content $ledgerPath -Encoding UTF8
    $script:remaining -= $ok
  }
  Log ("{0}: scheduled {1} (pacific day total left {2})" -f $b.id, $ok, $script:remaining)
  if ($r.text -match '(?i)uploadLimitExceeded|exceeded the number of videos') { Log "$($b.id): channel daily upload limit reached (per-channel cap; other brands continue)" }
  elseif ($r.text -match '(?i)quotaExceeded|dailyLimitExceeded|rateLimit|quota') { Log "project quota error in $($b.id): stopping all brands until next run"; $script:quotaHit = $true }
  return $ok
}

# pass 1: caps in priority order (celebrity takes everything that is left, so it always gets >=1 while PP/MV/TW stay within caps)
foreach ($b in $brands) { [void](Do-Brand $b ($b.cap - [int]($day[$b.id]))) }   # per-brand cap counts what that brand already uploaded this Pacific day
# pass 2: anything still left goes to brands that still have approved videos (priority order, whole remainder)
# (pass 2 removed 2026-11-03: every brand already gets its full 10/day in pass 1)

# read-only analytics after uploads (2026-11-08): hook-log refresh, 24h/72h/7d snapshots + day-3/7 retention, weekly calibration on Mondays.
# Wrapped so a failure here can never block or fail the uploads above.
if (-not $DryRun) {
  try {
    foreach ($cmd in @('scripts/hook-log-build.py', 'scripts/analytics-snapshots.py')) {
      $o = (& python $cmd 2>&1 | Out-String); Add-Content $log ("analytics {0}: {1}" -f $cmd, $o.Trim().Split("`n")[-1])
    }
    if ((Get-Date).DayOfWeek -eq 'Monday') { $o = (& python scripts/calibrate-scores.py 2>&1 | Out-String); Add-Content $log ("calibration: " + $o.Trim().Split("`n")[-1]) }
  } catch { Log "analytics step failed (ignored): $_" }
}
if ($DryRun) { Log 'dry run only (no upload, ledger unchanged)'; $summary | ForEach-Object { Log "PLAN $_"; Write-Output "PLAN $_" } }
Log ("=== done (left {0})" -f $remaining)
exit 0
