$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

Write-Host "Repo root:" $repoRoot

# Backend window
$backendCmd = "cd `"$repoRoot\apps\backend`"; python -m pip install -r requirements.txt; python -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList @("-NoExit","-Command", $backendCmd)

# Frontend window
$frontendCmd = "cd `"$repoRoot\apps\frontend`"; if (Test-Path package-lock.json) { npm install } else { npm i }; npm run dev"
Start-Process powershell -ArgumentList @("-NoExit","-Command", $frontendCmd)

Write-Host "Launched backend (8000) and frontend (3000). Open http://localhost:3000"

