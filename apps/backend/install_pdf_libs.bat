@echo off
echo ============================================================
echo Installing PDF Extraction Libraries
echo ============================================================
echo.

echo Installing PyMuPDF (best for PDF extraction)...
pip install PyMuPDF

echo.
echo Installing pdfplumber (backup method)...
pip install pdfplumber

echo.
echo Installing pdf2image (for AI Vision fallback)...
pip install pdf2image

echo.
echo ============================================================
echo Installation Complete!
echo ============================================================
echo.
echo Now restart the backend:
echo   cd apps/backend
echo   python -m uvicorn app.main:app --reload --port 8000
echo.
pause
