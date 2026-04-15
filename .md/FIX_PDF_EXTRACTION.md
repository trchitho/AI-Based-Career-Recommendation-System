# 🔧 Sửa Lỗi PDF Extraction

## ❌ Vấn Đề

1. **PDF chỉ extract được 1 ký tự**: `✅ Extracted 1 characters`
2. **Gemini model 404**: `models/gemini-1.5-flash is not found`

## 🎯 Nguyên Nhân

### Vấn đề 1: PDF Extraction
- PyPDF2 không đọc được một số loại PDF (đặc biệt là PDF được tạo từ design tools)
- PDF có thể là image-based (scanned)
- PDF có encoding đặc biệt

### Vấn đề 2: Gemini Model
- Vẫn còn prefix `models/` trong tên model
- Code đã sửa nhưng backend chưa restart

## ✅ Giải Pháp

### Solution 1: Install Thư Viện PDF Tốt Hơn

**PyMuPDF** (tốt nhất, nhanh nhất):
```bash
pip install PyMuPDF
```

**pdfplumber** (backup):
```bash
pip install pdfplumber
```

**Hoặc chạy script tự động**:
```bash
cd apps/backend
install_pdf_libs.bat
```

### Solution 2: Code Đã Update

Parser V2 bây giờ thử 4 methods theo thứ tự:
1. **PyMuPDF** (fitz) - Tốt nhất
2. **pdfplumber** - Backup tốt
3. **PyPDF2** - Fallback cơ bản
4. **AI Vision** - Last resort (đọc PDF như ảnh)

### Solution 3: Fix Gemini Model Name

Code đã sửa để remove prefix `models/` hoàn toàn.

## 🚀 Cách Sửa (3 Bước)

### Bước 1: Install Thư Viện
```bash
cd apps/backend
pip install PyMuPDF pdfplumber
```

### Bước 2: Restart Backend
```bash
# Ctrl+C để dừng
python -m uvicorn app.main:app --reload --port 8000
```

### Bước 3: Test Upload CV
Upload CV lại, bạn sẽ thấy:

```
📄 [CV Parser V2] Extracting text...
  [PyMuPDF] PDF has 2 pages
  [PyMuPDF] Page 1: 2500 chars
  [PyMuPDF] Page 2: 1800 chars
  ✅ [PyMuPDF] Total: 4300 characters
  ✅ Extracted 4300 characters
  Preview: Tran Quoc Vi Email: vit76404@gmail.com ...

🤖 [CV Parser V2] Using AI to extract all information...
  Using Gemini model: gemini-1.5-flash
  ✅ AI Complete Extraction:
     - Name: Tran Quoc Vi
     - Email: vit76404@gmail.com
     - Phone: 0774594729
     - Skills: 18
```

## 🧪 Test PDF Extraction

Trước khi upload, test xem PDF có đọc được không:

```bash
cd apps/backend
python test_pdf_extraction.py
# Nhập đường dẫn PDF khi được hỏi
```

Script sẽ test cả 3 methods và cho biết method nào tốt nhất.

## 📊 So Sánh Methods

| Method | Speed | Accuracy | Complex PDF | Image PDF |
|--------|-------|----------|-------------|-----------|
| PyMuPDF | ⚡⚡⚡ | ✅✅✅ | ✅ | ❌ |
| pdfplumber | ⚡⚡ | ✅✅ | ✅ | ❌ |
| PyPDF2 | ⚡ | ✅ | ⚠️ | ❌ |
| AI Vision | ⚡ | ✅✅✅ | ✅ | ✅ |

## ⚠️ Nếu Vẫn Lỗi

### Nếu PDF là image-based (scanned):
```bash
# Install pdf2image để dùng AI Vision
pip install pdf2image

# Windows: Cần cài Poppler
# Download: https://github.com/oschwartz10612/poppler-windows/releases
# Extract và add vào PATH
```

### Nếu vẫn không đọc được:
- Thử convert PDF sang image (JPG/PNG) rồi upload
- Hoặc dùng online tool để convert PDF sang text-based PDF

## 📝 Checklist

- [ ] Install PyMuPDF: `pip install PyMuPDF`
- [ ] Install pdfplumber: `pip install pdfplumber`
- [ ] Restart backend
- [ ] Test với script: `python test_pdf_extraction.py`
- [ ] Upload CV qua frontend
- [ ] Check backend console log

---

**Expected Result**: 
- ✅ Extract > 1000 characters từ PDF
- ✅ AI extract name, email, phone chính xác
- ✅ AI extract 15-20 skills
- ✅ Match percentage > 0%
