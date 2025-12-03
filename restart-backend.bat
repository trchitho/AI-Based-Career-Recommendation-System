@echo off
echo ==========================================
echo   Restarting Backend
echo ==========================================
echo.

echo Stopping any running backend processes...
taskkill /F /IM python.exe 2>nul
timeout /t 2 >nul

echo.
echo Starting backend on port 8000...
cd apps\backend
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
