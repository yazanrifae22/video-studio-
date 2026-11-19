# Daily continuation of the 51 legacy "Moments That Made Them" uploads (owner OK 2026-11-02).
# Scheduled task "ClipsViral-CelebrityUploads" runs this at 10:10 and 16:10 local (YouTube quota resets at midnight Pacific = 10:00 local).
# Each run uploads at most the remaining Pacific-day allowance (ledger data/celebrity-upload-ledger.json, cap 2/day, leaves Podium Pop its 4/day).
# Exit 3 from upload-legacy = all 51 scheduled -> this script removes its own task. Log: data/logs/celebrity-upload.log
$root = 'E:\clips-viral'
$log = "$root\data\logs\celebrity-upload.log"
Set-Location $root
Add-Content $log ("=== {0} start" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npx tsx scripts/youtube.ts upload-legacy celebrity --limit 2 >> `"$log`" 2>&1" -WorkingDirectory $root -WindowStyle Hidden -PassThru
if (-not $p.WaitForExit(45 * 60 * 1000)) { Stop-Process -Id $p.Id -Force; & taskkill /T /F /PID $p.Id 2>$null | Out-Null; Add-Content $log 'TIMEOUT after 45 min, killed'; exit 2 }
Add-Content $log ("=== {0} exit {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $p.ExitCode)
if ($p.ExitCode -eq 3) {
  Unregister-ScheduledTask -TaskName 'ClipsViral-CelebrityUploads' -Confirm:$false -ErrorAction SilentlyContinue
  Add-Content $log 'ALL DONE: task unregistered'
}
exit $p.ExitCode
