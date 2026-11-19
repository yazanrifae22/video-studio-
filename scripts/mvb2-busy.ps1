$p = Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|tsx' -and $_.CommandLine -match '(orchestrator|cli).*\bbuild\b|occ.*render|quiz:build' -and $_.CommandLine -notmatch 'mvb2-busy' }
if ($p) { $p | ForEach-Object { $_.CommandLine.Substring(0,[Math]::Min(160,$_.CommandLine.Length)) }; exit 1 } else { exit 0 }
