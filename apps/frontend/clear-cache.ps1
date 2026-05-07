# Clear Vite Cache and Restart
Write-Host "Clearing Vite cache..." -ForegroundColor Yellow

# Remove node_modules/.vite
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "Vite cache cleared." -ForegroundColor Green
} else {
    Write-Host "No Vite cache found." -ForegroundColor Gray
}

# Remove dist
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "Dist folder cleared." -ForegroundColor Green
}

Write-Host ""
Write-Host "Cache cleared! Now restart your dev server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
