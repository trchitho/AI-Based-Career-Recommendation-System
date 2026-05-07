# Restart Dev Server Script
Write-Host "Stopping Node processes..." -ForegroundColor Yellow

# Kill all node processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

Write-Host "Node processes stopped." -ForegroundColor Green
Write-Host ""
Write-Host "Starting dev server..." -ForegroundColor Yellow
Write-Host ""

# Start dev server
Set-Location $PSScriptRoot
npm run dev
