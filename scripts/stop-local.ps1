$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $projectRoot 'artifacts\local-processes.json'
if (!(Test-Path -LiteralPath $stateFile)) { Write-Host 'No launcher-owned processes are recorded.'; exit 0 }
$owned = ConvertFrom-Json -InputObject (Get-Content -LiteralPath $stateFile -Raw)
foreach ($entry in $owned) {
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if ($process -and $process.StartTime.ToUniversalTime().ToString('o') -eq $entry.started) {
        # Exact PID plus creation time prevents stopping a later unrelated process.
        & taskkill.exe /PID $entry.id /T /F | Out-Null
        Write-Host "Stopped $($entry.name)."
    }
}
Set-Content -LiteralPath $stateFile -Value '[]'
