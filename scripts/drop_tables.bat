@echo off
echo ========================================
echo    XOA AN TOAN 2 BANG DATABASE
echo ========================================
echo.
echo Bang can xoa:
echo - ai.quick_text_embeddings
echo - core.essay_quick_inputs
echo.
echo Dang kiem tra Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python khong duoc cai dat hoac khong co trong PATH
    echo Vui long cai dat Python truoc khi chay script nay
    pause
    exit /b 1
)

echo Python da san sang!
echo.
echo Dang kiem tra thu vien psycopg2...

python -c "import psycopg2" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Thu vien psycopg2 chua duoc cai dat
    echo Dang cai dat psycopg2...
    pip install psycopg2-binary
    if %errorlevel% neq 0 (
        echo ERROR: Khong the cai dat psycopg2
        echo Vui long cai dat thu cong: pip install psycopg2-binary
        pause
        exit /b 1
    )
)

echo Thu vien da san sang!
echo.
echo Dang chay script xoa bang...
echo.

python "%~dp0drop_tables_safely.py"

echo.
echo Script da hoan thanh!
pause