# ChurnGuardAI Backend - Start Script
# Always uses the project virtual environment, regardless of system Python
$venvUvicorn = Join-Path $PSScriptRoot ".venv\Scripts\uvicorn.exe"
$venvPython  = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (Test-Path $venvUvicorn) {
    Write-Host "[*] Starting backend with venv uvicorn..." -ForegroundColor Cyan
    & $venvUvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} elseif (Test-Path $venvPython) {
    Write-Host "[*] Starting backend with venv python -m uvicorn..." -ForegroundColor Cyan
    & $venvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} else {
    Write-Host "[!] Virtual environment not found at .venv" -ForegroundColor Red
    Write-Host "    Run: python -m venv .venv" -ForegroundColor Yellow
    Write-Host "    Then: .\.venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
}
