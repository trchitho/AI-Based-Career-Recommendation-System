# 🧪 Quick Guide: Running False Positive Fix Tests

**Status:** ✅ All tests passing (35/35)  
**Last Updated:** 2026-04-12

---

## 🚀 Quick Start

### Run All TC-NON Tests (Including False Positive Fix):
```bash
cd apps/backend
python run_tc_non_tests.py
```

**Expected Output:**
```
✅ ALL TC-NON TESTS PASSED
35 passed in 1.73s
```

---

## 🎯 Run Specific Test Groups

### 1. Run ONLY False Positive Fix Tests:
```bash
cd apps/backend
python -m pytest test_tc_non_images.py -k "presentation" -v
```

**Tests Run:**
- `test_administrative_cv_with_prepared_presentations_accepted`
- `test_sales_cv_with_delivered_presentations_accepted`
- `test_marketing_cv_with_presentation_skills_accepted`
- `test_powerpoint_presentation_document_still_rejected`

**Expected:** 4 passed

---

### 2. Run Standalone False Positive Test Suite:
```bash
cd apps/backend
python test_false_positive_fix.py
```

**Expected Output:**
```
================================================================================
TESTING FALSE POSITIVE FIX
================================================================================

✅ TEST PASSED: Valid CV with 'presentation' in work context is accepted
✅ TEST PASSED: Actual presentation document is correctly rejected
✅ TEST PASSED: CV with 'delivered presentations' is accepted
✅ TEST PASSED: CV with 'presentation skills' is accepted

================================================================================
✅ ALL TESTS PASSED!
================================================================================

Summary:
- Valid CVs with 'presentation' in work context: ✅ ACCEPTED
- Valid CVs with 'delivered presentations': ✅ ACCEPTED
- Valid CVs with 'presentation skills': ✅ ACCEPTED
- Actual presentation documents: ✅ REJECTED
```

---

### 3. Run All TC-NON Tests by Category:

#### TC-NON-01: No Text Images
```bash
python -m pytest test_tc_non_images.py -k "landscape or abstract or blank or gemini_returns_empty" -v
```
**Expected:** 5 passed

#### TC-NON-02: Non-CV Content
```bash
python -m pytest test_tc_non_images.py -k "newspaper or receipt or menu or advertisement or book_page or id_card or meme or screenshot" -v
```
**Expected:** 8 passed

#### TC-NON-03: Selfie/Portrait
```bash
python -m pytest test_tc_non_images.py -k "selfie or portrait or group_photo or gemini_describes_portrait" -v
```
**Expected:** 3 passed

#### TC-NON-04: Gibberish Text
```bash
python -m pytest test_tc_non_images.py -k "gibberish or random or keyboard or lorem_ipsum_image" -v
```
**Expected:** 4 passed

#### TC-NON-05: Other Field Documents
```bash
python -m pytest test_tc_non_images.py -k "technical or medical or lab or legal or architectural" -v
```
**Expected:** 5 passed

#### TC-NON-06: Books/Stories
```bash
python -m pytest test_tc_non_images.py -k "story or novel or textbook or comic" -v
```
**Expected:** 4 passed

#### Positive Cases: Valid CVs
```bash
python -m pytest test_tc_non_images.py -k "valid_cv or cv_with_photo" -v
```
**Expected:** 2 passed

#### False Positive Fix Tests
```bash
python -m pytest test_tc_non_images.py -k "presentation" -v
```
**Expected:** 4 passed

---

## 📊 Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| TC-NON-01: No Text | 5 | ✅ |
| TC-NON-02: Non-CV Content | 8 | ✅ |
| TC-NON-03: Selfie/Portrait | 3 | ✅ |
| TC-NON-04: Gibberish | 4 | ✅ |
| TC-NON-05: Other Fields | 5 | ✅ |
| TC-NON-06: Books/Stories | 4 | ✅ |
| Positive Cases | 2 | ✅ |
| False Positive Fix | 4 | ✅ |
| **TOTAL** | **35** | **✅ 100%** |

---

## 🔍 Debugging Failed Tests

### If a test fails:

1. **Run with verbose output:**
```bash
python -m pytest test_tc_non_images.py::test_name -v -s
```

2. **Check the error message:**
```bash
python -m pytest test_tc_non_images.py::test_name --tb=short
```

3. **Run with full traceback:**
```bash
python -m pytest test_tc_non_images.py::test_name --tb=long
```

---

## 🐛 Common Issues

### Issue 1: Import Error
**Error:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
```bash
# Make sure you're in the backend directory
cd apps/backend

# Check PYTHONPATH
echo $PYTHONPATH  # Linux/Mac
echo %PYTHONPATH%  # Windows

# If needed, set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"  # Linux/Mac
set PYTHONPATH=%PYTHONPATH%;%cd%  # Windows
```

---

### Issue 2: PIL/Pillow Not Installed
**Error:** `ImportError: No module named 'PIL'`

**Solution:**
```bash
pip install Pillow
```

---

### Issue 3: PyMuPDF Not Installed
**Error:** `ImportError: No module named 'fitz'`

**Solution:**
```bash
pip install PyMuPDF
```

---

## 📝 Test File Locations

```
apps/backend/
├── test_tc_non_images.py          # Main test suite (35 tests)
├── test_false_positive_fix.py     # Standalone false positive tests (4 tests)
├── run_tc_non_tests.py            # Test runner script
├── app/modules/skill_gap/
│   └── cv_parser_v2.py            # Production code with fix
└── docs/
    ├── FALSE_POSITIVE_FIX_COMPLETE.md
    ├── FINAL_FALSE_POSITIVE_FIXED.md
    └── RUN_FALSE_POSITIVE_TESTS.md (this file)
```

---

## ✅ Verification Checklist

Before deploying to production, verify:

- [ ] All 35 tests pass: `python run_tc_non_tests.py`
- [ ] False positive tests pass: `python test_false_positive_fix.py`
- [ ] No import errors
- [ ] No deprecation warnings (except PyPDF2)
- [ ] Test execution time < 5 seconds
- [ ] All test files committed to git

---

## 🚀 CI/CD Integration

### Add to CI/CD Pipeline:

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd apps/backend
          pip install -r requirements.txt
      - name: Run TC-NON tests
        run: |
          cd apps/backend
          python run_tc_non_tests.py
      - name: Run false positive tests
        run: |
          cd apps/backend
          python test_false_positive_fix.py
```

---

## 📞 Support

If tests fail or you encounter issues:

1. Check this guide for common issues
2. Review test output for specific error messages
3. Verify all dependencies are installed
4. Check that you're in the correct directory (`apps/backend`)
5. Ensure Python version is 3.11+

---

**Last Updated:** 2026-04-12  
**Test Status:** ✅ 35/35 PASSED  
**Ready for Production:** YES 🚀
