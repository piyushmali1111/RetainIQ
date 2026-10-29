param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$frontendRoot = Join-Path $projectRoot 'frontend'
$runtimeRoot = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$pythonPath = Join-Path $backendRoot '.venv\Scripts\python.exe'
$nodePath = (Get-Command node -ErrorAction Stop).Source
if (!(Test-Path -LiteralPath $pythonPath)) { throw 'Missing Python environment. Follow LOCAL_SETUP.md first.' }
if (!(Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules\next\dist\bin\next'))) { throw 'Missing frontend dependencies. Run npm ci in frontend first.' }
if (!(Test-Path -LiteralPath (Join-Path $backendRoot '.env'))) {
    [IO.File]::WriteAllText((Join-Path $backendRoot '.env'), "DATABASE_URL=sqlite:///./local.db" + [Environment]::NewLine)
}
if (!(Test-Path -LiteralPath (Join-Path $backendRoot 'local.db'))) {
    Copy-Item -LiteralPath (Join-Path $backendRoot 'churnguardai.db') -Destination (Join-Path $backendRoot 'local.db')
}
$stateFile = Join-Path $runtimeRoot 'local-processes.json'
$owned = @()
if (Test-Path -LiteralPath $stateFile) {
    $savedEntries = ConvertFrom-Json -InputObject (Get-Content -LiteralPath $stateFile -Raw)
    $owned = @(foreach ($entry in $savedEntries) {
        $existing = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
        if ($existing -and $existing.StartTime.ToUniversalTime().ToString('o') -eq $entry.started) { $entry }
    })
}
function Test-LocalPort([int]$port) {
    $client = New-Object Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}
$services = @(
    @{name='backend';port=8000;exe=$pythonPath;args='-m uvicorn app.main:app --host 127.0.0.1 --port 8000';cwd=$backendRoot;url='http://127.0.0.1:8000/health'},
    @{name='frontend';port=3000;exe=$nodePath;args='"' + (Join-Path $frontendRoot 'node_modules\next\dist\bin\next') + '" dev --hostname 127.0.0.1 --port 3000';cwd=$frontendRoot;url='http://127.0.0.1:3000'}
)
foreach ($service in $services) {
    if (Test-LocalPort $service.port) {
        Write-Host "$($service.name) port $($service.port) is already in use. Leaving that process unchanged."
        continue
    }
    $process = Start-Process -FilePath $service.exe -ArgumentList $service.args -WorkingDirectory $service.cwd -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot ($service.name+'.log')) -RedirectStandardError (Join-Path $runtimeRoot ($service.name+'.error.log'))
    $owned += @{name=$service.name;id=$process.Id;started=$process.StartTime.ToUniversalTime().ToString('o')}
    ConvertTo-Json -InputObject @($owned) | Set-Content -LiteralPath $stateFile
    Write-Host "Starting $($service.name)..."
}
foreach ($service in $services) {
    $ready = $false
    for ($attempt=0; $attempt -lt 90; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $service.url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw "$($service.name) did not become ready. See artifacts\$($service.name).error.log." }
}
Write-Host 'ChurnGuardAI is ready at http://127.0.0.1:3000'
Write-Host 'Local account: manager@churnguard.ai / ChurnGuard@2026'
if (!$NoBrowser) { Start-Process 'http://127.0.0.1:3000' }
