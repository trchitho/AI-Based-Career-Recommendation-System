# Cài đặt Tesseract OCR cho Windows

## Bước 1: Download Tesseract

Tải file installer từ đây:
https://github.com/UB-Mannheim/tesseract/wiki

Hoặc link trực tiếp (64-bit):
https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.5.0.20241111.exe

## Bước 2: Cài đặt

1. Chạy file .exe vừa tải
2. Chọn đường dẫn cài đặt (mặc định: `C:\Program Files\Tesseract-OCR`)
3. Nhấn Next và Install
4. Đợi cài đặt hoàn tất

## Bước 3: Thêm vào PATH (Quan trọng!)

### Cách 1: Tự động (Khuyến nghị)
Trong quá trình cài đặt, chọn option "Add to PATH"

### Cách 2: Thủ công
1. Mở System Properties (Win + Pause/Break)
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Trong "System variables", tìm "Path"
5. Click "Edit"
6. Click "New"
7. Thêm: `C:\Program Files\Tesseract-OCR`
8. Click OK

## Bước 4: Kiểm tra

Mở terminal mới và chạy:
```bash
tesseract --version
```

Nếu thấy version number là thành công!

## Bước 5: Restart Backend

Sau khi cài xong, restart backend:
```bash
cd apps/backend
python -m uvicorn app.main:app --reload --port 8000
```

## Nếu vẫn lỗi

Thêm dòng này vào file `.env`:
```
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

Và thêm vào `cv_parser.py`:
```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```
