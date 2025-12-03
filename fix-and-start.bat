@echo off
echo ==========================================
echo   Auto Fix and Start Backend
echo ==========================================
echo.

echo [1/5] Stopping all Python processes...
taskkill /F /IM python.exe 2>nul
if errorlevel 1 (
    echo No Python process found.
) else (
    echo Python processes stopped.
)
timeout /t 2 >nul

echo.
echo [2/5] Checking .env file...
findstr "ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001" apps\backend\.env >nul
if errorlevel 1 (
    echo WARNING: ALLOWED_ORIGINS may not be correct!
    echo Please check apps\backend\.env
) else (
    echo .env file looks good.
)

echo.
echo [3/5] Starting backend on port 8000...
cd apps\backend
start "Backend Server" cmd /k "uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

echo Waiting for backend to start...
timeout /t 5 >nul

echo.
echo [4/5] Testing backend health...
curl -s http://localhost:8000/health
echo.

echo.
echo [5/5] Testing payment API...
curl -s http://localhost:8000/api/payment/plans
echo.

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Backend is running on: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo If you see JSON data above, everything is working!
echo If you see errors, check the Backend Server window.
echo.
pause
