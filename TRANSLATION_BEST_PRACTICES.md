# Hướng Dẫn Dịch Trang Web Chuẩn

## 🎯 Các Phương Pháp Dịch

### 1. **Backend Translation (Khuyên dùng nhất)** ⭐⭐⭐⭐⭐

**Cách hoạt động:**
- Lưu bản dịch trong database
- Backend trả về theo ngôn ngữ request

**Ưu điểm:**
- ✅ Nhanh nhất (không cần gọi API dịch)
- ✅ Không tốn chi phí API
- ✅ Có thể chỉnh sửa bản dịch thủ công
- ✅ SEO tốt
- ✅ Offline-ready

**Nhược điểm:**
- ❌ Cần thêm cột trong database
- ❌ Phải dịch trước khi lưu

**Cấu trúc Database:**
```sql
-- Thêm cột tiếng Việt
ALTER TABLE questions ADD COLUMN question_text_vi TEXT;
ALTER TABLE careers ADD COLUMN title_vi TEXT;
ALTER TABLE careers ADD COLUMN description_vi TEXT;

-- Hoặc dùng bảng riêng
CREATE TABLE translations (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50),  -- 'question', 'career', etc.
  entity_id UUID,
  field_name VARCHAR(50),   -- 'title', 'description', etc.
  language VARCHAR(5),      -- 'vi', 'en', etc.
  translated_text TEXT,
  created_at TIMESTAMP
);
```

**Backend API:**
```python
# FastAPI example
@app.get("/api/questions")
async def get_questions(lang: str = "en"):
    if lang == "vi":
        return db.query(Question).with_entities(
            Question.id,
            Question.question_text_vi.label("question_text")
        ).all()
    return db.query(Question).all()
```

---

### 2. **Google Cloud Translation API (Chính thức)** ⭐⭐⭐⭐

**Cách hoạt động:**
- Sử dụng API chính thức của Google
- Trả phí theo số ký tự

**Ưu điểm:**
- ✅ Chất lượng dịch tốt nhất
- ✅ Hỗ trợ 100+ ngôn ngữ
- ✅ Có cache, tối ưu performance
- ✅ Reliable, uptime cao

**Nhược điểm:**
- ❌ Trả phí ($20/1 triệu ký tự)
- ❌ Cần Google Cloud account
- ❌ Có delay khi dịch lần đầu

**Setup:**
```bash
# 1. Tạo Google Cloud Project
# 2. Enable Cloud Translation API
# 3. Tạo API Key
# 4. Thêm vào .env
VITE_GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

**Sử dụng:**
```tsx
import officialTranslationService from './services/translationService.official';

// Dịch text
const translated = await officialTranslationService.translateText(text, 'vi');

// Dịch batch (tối ưu hơn)
const translations = await officialTranslationService.translateBatch(texts, 'vi');
```

---

### 3. **Hybrid Approach (Backend + Frontend)** ⭐⭐⭐⭐⭐

**Cách hoạt động:**
- Ưu tiên backend (nếu có sẵn bản dịch)
- Fallback sang frontend API nếu chưa có

**Ưu điểm:**
- ✅ Tốt nhất của cả 2 thế giới
- ✅ Nhanh với nội dung đã dịch
- ✅ Vẫn hoạt động với nội dung mới
- ✅ Có thể cache và lưu dần vào DB

**Sử dụng:**
```tsx
import hybridTranslationService from './services/translationService.hybrid';

const translated = await hybridTranslationService.translateText(text, 'vi');
```

---

### 4. **Free API (Hiện tại)** ⭐⭐⭐

**Cách hoạt động:**
- Sử dụng Google Translate API miễn phí (unofficial)

**Ưu điểm:**
- ✅ Miễn phí
- ✅ Không cần setup
- ✅ Dễ sử dụng

**Nhược điểm:**
- ❌ Không chính thức, có thể bị block
- ❌ Giới hạn request
- ❌ Không stable cho production

---

## 🚀 Khuyến Nghị Triển Khai

### **Giai đoạn 1: Development (Hiện tại)**
- Dùng Free API để test
- File: `translationService.ts`

### **Giai đoạn 2: Pre-Production**
- Chuyển sang Google Cloud Translation API
- File: `translationService.official.ts`
- Setup cache để giảm chi phí

### **Giai đoạn 3: Production**
- Implement Backend Translation
- Dịch trước các nội dung tĩnh
- Dùng Hybrid cho nội dung động
- File: `translationService.hybrid.ts`

---

## 📊 So Sánh Chi Phí

| Phương pháp | Chi phí/tháng | Performance | Chất lượng |
|-------------|---------------|-------------|------------|
| Backend DB | $0 | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| Google API | $20-100 | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| Hybrid | $5-20 | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| Free API | $0 | ⚡⚡⚡ | ⭐⭐⭐⭐ |

---

## 🛠️ Migration Plan

### **Bước 1: Thêm cột database**
```sql
ALTER TABLE questions ADD COLUMN question_text_vi TEXT;
ALTER TABLE careers ADD COLUMN title_vi TEXT;
ALTER TABLE careers ADD COLUMN description_vi TEXT;
ALTER TABLE skills ADD COLUMN name_vi TEXT;
ALTER TABLE skills ADD COLUMN description_vi TEXT;
```

### **Bước 2: Script dịch hàng loạt**
```python
# translate_all.py
import requests
from database import db

def translate_all_questions():
    questions = db.query(Question).all()
    
    for q in questions:
        if not q.question_text_vi:
            translated = translate_text(q.question_text, 'vi')
            q.question_text_vi = translated
    
    db.commit()

translate_all_questions()
```

### **Bước 3: Update Backend API**
```python
@app.get("/api/questions")
async def get_questions(lang: str = "en"):
    questions = db.query(Question).all()
    
    if lang == "vi":
        return [
            {
                "id": q.id,
                "question_text": q.question_text_vi or q.question_text,
                "options": q.options
            }
            for q in questions
        ]
    
    return questions
```

### **Bước 4: Update Frontend**
```tsx
// Không cần dùng translation service nữa
// Backend đã trả về đúng ngôn ngữ
const { i18n } = useTranslation();
const questions = await assessmentService.getQuestions('RIASEC', i18n.language);
```

---

## 🎓 Best Practices

1. **Cache aggressively** - Lưu cache để tránh dịch lại
2. **Batch translations** - Dịch nhiều text cùng lúc
3. **Fallback gracefully** - Hiển thị tiếng Anh nếu lỗi
4. **Monitor costs** - Theo dõi chi phí API
5. **Pre-translate static content** - Dịch trước nội dung tĩnh
6. **Use CDN** - Cache bản dịch ở CDN
7. **Lazy load translations** - Chỉ dịch khi cần

---

## 📝 Checklist Triển Khai

- [ ] Thêm cột translation vào database
- [ ] Tạo script dịch hàng loạt
- [ ] Update backend API để hỗ trợ `?lang=vi`
- [ ] Test với sample data
- [ ] Dịch toàn bộ nội dung hiện có
- [ ] Setup monitoring và alerting
- [ ] Document cho team
- [ ] Train team về cách thêm nội dung mới

---

## 🔗 Resources

- [Google Cloud Translation API](https://cloud.google.com/translate/docs)
- [i18next Best Practices](https://www.i18next.com/principles/best-practices)
- [React i18n Guide](https://react.i18next.com/)
