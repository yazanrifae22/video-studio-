# Daily Podium Pop (brand viral-rankings) YouTube scheduler (owner standing approval 2026-11-02: approved videos auto-schedule 4/day).
# Scheduled task "ClipsViral-PodiumPopUploads" runs this at 10:20 and 16:20 local (after ClipsViral-CelebrityUploads; quota resets midnight Pacific = ~10:00 Cairo).
# Ledger data/podium-upload-ledger.json = uploads per Pacific day, cap 4 (4x1600 + celebrity 2x1600 = 9,600 of the shared 10,000 units).
# Only approved productions are uploaded (youtube.ts gate). If the plan has no valid approved slot, publish-plan.py regenerates slots first.
# Stops gracefully on quota errors. Log: data/logs/podium-upload.log. Use -DryRun to preview (no ledger change, no upload).
param([switch]$DryRun)
$root = 'E:\clips-viral'
$log = "$root\data\logs\podium-upload.log"
$ledgerPath = "$root\data\podium-upload-ledger.json"
$cap = 4
Set-Location $root
New-Item -ItemType Directory -Force "$root\data\logs" | Out-Null
function Log($m) { Add-Content $log ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) }
function Run-Yt([string]$extra) {
  $tmp = "$root\data\logs\podium-upload.tmp"
  Remove-Item $tmp -ErrorAction SilentlyContinue
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npx tsx scripts/youtube.ts upload viral-rankings $extra > `"$tmp`" 2>&1" -WorkingDirectory $root -WindowStyle Hidden -PassThru
  if (-not $p.WaitForExit(45 * 60 * 1000)) { Stop-Process -Id $p.Id -Force; & taskkill /T /F /PID $p.Id 2>$null | Out-Null; Log 'TIMEOUT after 45 min, killed'; return @{ text = ''; timeout = $true } }
  $t = if (Test-Path $tmp) { Get-Content $tmp -Raw -Encoding UTF8 } else { '' }
  if ($t) { Add-Content $log $t }
  return @{ text = $t; timeout = $false }
}
function Count-Ok([string]$t) { ([regex]::Matches($t, '(?m)^\s*"at":')).Count }

$pac = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'UTC', 'Pacific Standard Time').ToString('yyyy-MM-dd')
$ledger = @{}
if (Test-Path $ledgerPath) { (Get-Content $ledgerPath -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $ledger[$_.Name] = [int]$_.Value } }
$used = if ($ledger.ContainsKey($pac)) { $ledger[$pac] } else { 0 }
$budget = $cap - $used
Log ("=== start (pacific day {0}, used {1}/{2}, dry={3})" -f $pac, $used, $cap, [bool]$DryRun)
if ($budget -le 0) { Log 'daily cap reached, nothing to do'; exit 0 }

# valid approved slots available? else regenerate the plan (preserves existing entries)
$d = Run-Yt "--limit $budget --dry-run"
if ($d.timeout) { exit 2 }
if ((Count-Ok $d.text) -eq 0) {
  Log 'no approved slot in plan -> python scripts/publish-plan.py'
  & python scripts/publish-plan.py 2>&1 | Out-String | Add-Content $log
  $d = Run-Yt "--limit $budget --dry-run"
  if ($d.timeout) { exit 2 }
  if ((Count-Ok $d.text) -eq 0) { Log 'still no approved productions with a future slot, done'; exit 0 }
}
if ($DryRun) { Log 'dry run only, stopping'; exit 0 }

$r = Run-Yt "--limit $budget"
if ($r.timeout) { exit 2 }
$n = ([regex]::Matches($r.text, '(?m)^scheduled ')).Count
if ($n -gt 0) { $ledger[$pac] = $used + $n; ($ledger | ConvertTo-Json) | Set-Content $ledgerPath -Encoding UTF8 }
if ($r.text -match '(?i)quota|rateLimit|403') { Log "quota/limit error after $n upload(s): stopping gracefully until next run"; exit 0 }
Log ("=== done, scheduled {0}" -f $n)
exit 0
