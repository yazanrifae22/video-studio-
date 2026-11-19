# Render queue with watchdog (2026-10-23). Runs detached; one quiz:build at a time.
# Queue: data/render-queue.txt, one "<production> <agent>" per line (append any time; processed lines are removed).
# Status: data/logs/render-queue.status. Stop: create data/render-queue.stop.
# Watchdog (from the OpenChatCut era, still useful): a render can stall; when the build log is silent for
# $StallMin minutes (or the build exceeds $MaxMin) the whole process tree is killed and the build retried once.
# Memory gate: waits until at least $MinFreeGB of RAM is free before starting a build.
param([int]$StallMin = 6, [int]$MaxMin = 35, [double]$MinFreeGB = 8, [string]$Name = 'render-queue')
$root = 'E:\clips-viral'
$queue = "$root\data\$Name.txt"; $status = "$root\data\logs\render-queue.status"; $stop = "$root\data\render-queue.stop"
function Log($m) { Add-Content $status ("{0} {1}" -f (Get-Date -Format 'MM-dd HH:mm:ss'), $m) }
function FreeGB { [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1) }
function RunBuild($prod, $agent) {
  $log = "$root\data\logs\build-$prod.log"
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npm run -s cli -- quiz:build $prod --agent $agent > `"$log`" 2>&1" -WorkingDirectory $root -WindowStyle Hidden -PassThru
  $start = Get-Date
  while (-not $p.HasExited) {
    Start-Sleep 30
    $quiet = ((Get-Date) - (Get-Item $log).LastWriteTime).TotalMinutes
    $age = ((Get-Date) - $start).TotalMinutes
    if ($quiet -gt $StallMin -or $age -gt $MaxMin) {
      taskkill /PID $p.Id /T /F 2>$null | Out-Null
      return "stalled (quiet {0:N0} min, age {1:N0} min): $((Get-Content $log -Tail 1))" -f $quiet, $age
    }
  }
  $last = (Get-Content $log -Tail 3) -join ' | '
  if ($p.ExitCode -eq 0) { return "ok" }
  if (Select-String -Path $log -Pattern 'hyperframes render failed|MCP unreachable|fetch failed' -Quiet) { return "crash (transient): $last" }
  return "exit $($p.ExitCode): $last"
}
Log "queue $Name started (pid $PID)"
while (-not (Test-Path $stop)) {
  $lines = @(Get-Content $queue -ErrorAction SilentlyContinue | Where-Object { $_.Trim() })
  if (-not $lines) { Start-Sleep 60; continue }
  $prod, $agent = $lines[0].Trim() -split '\s+'
  if (-not $agent) { $agent = 'showrunner-shu-shayef' }
  while ((FreeGB) -lt $MinFreeGB -and -not (Test-Path $stop)) { Log "waiting for RAM ($(FreeGB) GB free)"; Start-Sleep 120 }
  $r = RunBuild $prod $agent
  if ($r -ne 'ok' -and ($r -like 'stalled*' -or $r -like 'crash*')) { Log "$prod RETRY after $r"; Start-Sleep 20; $r = RunBuild $prod $agent }
  Log "$prod $r [$Name]"
  $rest = @(Get-Content $queue | Where-Object { $_.Trim() -and ($_.Trim() -split '\s+')[0] -ne $prod })
  Set-Content $queue $rest -Encoding ascii
}
Log "queue stopped"
