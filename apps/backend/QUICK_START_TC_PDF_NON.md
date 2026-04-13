# 🚀 Quick Start: TC-PDF-NON Tests

**Last Updated:** 2026-04-12  
**Status:** ✅ 27/27 PASSING

---

## ⚡ Quick Commands

### Run All Tests:
```bash
cd apps/backend
python run_all_tc_pdf_non_tests.py
```

### Run Original Tests Only:
```bash
python run_tc_pdf_non_tests.py
```

### Run Enhanced Tests Only:
```bash
python -m pytest test_tc_pdf_non_enhanced.py -v
```

---

## 📊 What's Tested

| ID | Description | Tests | Status |
|----|-------------|-------|--------|
| TC-PDF-NON-01 | Gibberish/Lorem Ipsum | 7 | ✅ |
| TC-PDF-NON-02 | Page limit (>20) | 5 | ✅ |
| TC-PDF-NON-03 | Financial docs | 6 | ✅ |
| TC-PDF-NON-04 | Contact-only | 5 | ✅ |
| Positive | Valid CVs | 4 | ✅ |
| **TOTAL** | | **27** | **✅** |

---

## 🎯 Expected Results

### All Tests Pass:
```
======================= 27 passed in 1.53s ========================
✅ ALL TC-PDF-NON TESTS PASSED (27/27)
```

### If Tests Fail:
1. Check Python version (need 3.11+)
2. Install dependencies: `pip install -r requirements.txt`
3. Check PYTHONPATH: `export PYTHONPATH="${PYTHONPATH}:$(pwd)"`
4. Run with verbose: `python -m pytest test_tc_pdf_non.py -v --tb=long`

---

## 📝 Error Messages

### TC-PDF-NON-01 (Gibberish):
```
"File không chứa nội dung CV/Resume. 
Cần có thông tin cá nhân (email/SĐT), kinh nghiệm làm việc, hoặc học vấn."
```

### TC-PDF-NON-02 (Too long):
```
"File PDF có {page_count} trang, vượt quá giới hạn 20 trang cho CV. 
Đây có thể là sách hoặc tài liệu kỹ thuật, không phải CV/Resume."
```

### TC-PDF-NON-03 (Financial):
```
"File chứa nội dung tài chính (hóa đơn/biên lai/chứng từ), không phải CV/Resume. 
Vui lòng tải lên file CV chứa thông tin nghề nghiệp."
```

### TC-PDF-NON-04 (Contact only):
```
"File chỉ chứa thông tin liên lạc, thiếu kinh nghiệm làm việc, học vấn hoặc kỹ năng. 
Vui lòng tải lên CV/Resume đầy đủ."
```

---

## 📁 Key Files

```
apps/backend/
├── test_tc_pdf_non.py              # 15 original tests
├── test_tc_pdf_non_enhanced.py     # 12 enhanced tests
├── run_all_tc_pdf_non_tests.py     # Run all tests
└── app/modules/skill_gap/
    └── cv_parser_v2.py             # Production code
```

---

## 🔍 Quick Debug

### Test specific category:
```bash
# Gibberish tests
python -m pytest -k "lorem or gibberish" -v

# Page limit tests
python -m pytest -k "pages" -v

# Financial tests
python -m pytest -k "invoice or receipt or tax" -v

# Contact-only tests
python -m pytest -k "portrait or contact" -v
```

### Check validation logic:
```python
from app.modules.skill_gap.cv_parser_v2 import CVParserV2
parser = CVParserV2()
text = "Your test text here"
is_cv, reason = parser._is_cv_content(text)
print(f"Is CV: {is_cv}, Reason: {reason}")
```

---

## ✅ Checklist

Before deploying:
- [ ] All 27 tests pass
- [ ] No import errors
- [ ] Test execution < 5 seconds
- [ ] Error messages in Vietnamese
- [ ] Documentation updated

---

**Status:** ✅ READY  
**Tests:** 27/27 PASSING  
**Time:** 1.53s
