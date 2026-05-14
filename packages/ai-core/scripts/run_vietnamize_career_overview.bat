@echo off
echo ========================================
echo VIỆT HÓA BẢNG core.career_overview
echo ========================================
echo.

REM Kiểm tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python không được cài đặt!
    pause
    exit /b 1
)

REM Cài đặt thư viện cần thiết
echo 📦 Cài đặt thư viện Google Translate...
pip install googletrans==4.0.0rc1 psycopg2-binary

echo.
echo 🚀 Bắt đầu việt hóa...
echo.

REM Chạy script việt hóa
python vietnamize_career_overview.py

echo.
echo ✅ Hoàn thành!
pause