@echo off
echo ========================================
echo   FIX BACKEND DEPENDENCIES
echo ========================================
echo.

cd /d "%~dp0..\apps\backend"

echo [1/3] Installing core dependencies...
pip install msgpack orjson httpx --quiet

echo [2/3] Installing database dependencies...
pip install psycopg2-binary sqlalchemy --quiet

echo [3/3] Installing FastAPI and auth...
pip install fastapi uvicorn python-jose passlib --quiet

echo.
echo ========================================
echo   TESTING BACKEND IMPORT
echo ========================================
echo.

python -c "import sys; sys.path.insert(0, '.'); from app.main import app; print('✅ Backend imports successfully!')" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   ✅ SUCCESS! Backend is ready
    echo ========================================
    echo.
    echo Next steps:
    echo   1. Start backend: python -m uvicorn app.main:app --reload --port 8000
    echo   2. Open API docs: http://localhost:8000/docs
    echo.
) else (
    echo.
    echo ========================================
    echo   ⚠️  IMPORT FAILED
    echo ========================================
    echo.
    echo Please install all dependencies:
    echo   pip install -r requirements.txt
    echo.
)

pause
