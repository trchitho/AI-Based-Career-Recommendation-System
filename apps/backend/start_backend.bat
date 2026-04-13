@echo off
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d %~dp0
echo Killing old backend processes...
taskkill /F /IM uvicorn.exe /T 2>nul
taskkill /F /IM python.exe /FI "COMMANDLINE eq *uvicorn*" 2>nul
timeout /t 2 /nobreak >nul
echo Starting backend...
.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
