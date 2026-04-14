# 🔑 HƯỚNG DẪN TẠO API KEY MỚI

## ⚡ Quick Fix - Tạo API Key mới trong 2 phút:

### **Bước 1: Truy cập Google AI Studio**
1. Mở: https://aistudio.google.com/
2. Đăng nhập Google account (có thể dùng account khác)

### **Bước 2: Tạo API Key**
1. Click **"Get API Key"** 
2. Click **"Create API Key in new project"**
3. Chọn project hoặc tạo project mới
4. Copy API key (dạng: AIzaSy...)

### **Bước 3: Cập nhật .env**
1. Mở file: `apps/backend/.env`
2. Thay dòng:
   ```
   GEMINI_API_KEY=AIzaSyBLf440-C0J2FDs...
   ```
   Thành:
   ```
   GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
   ```

### **Bước 4: Restart Backend**
```bash
# Stop current backend (Ctrl+C)
# Then restart:
cd apps/backend
python -m uvicorn app.main:app --reload
```

### **Bước 5: Test**
- Upload CV lại
- AI sẽ extract 20+ skills thay vì 2 skills

## 🎯 **Kết quả mong đợi:**
- ✅ AI extraction: 20+ skills
- ✅ Personal info: Name, email, phone
- ✅ Fast processing: < 10 seconds
- ✅ No quota errors

## 📋 **Backup Plan:**
Nếu không muốn tạo API key mới, tôi sẽ fix skill extraction algorithm để tìm được nhiều skills hơn từ keyword matching.