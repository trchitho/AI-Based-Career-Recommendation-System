# 🚀 Quick Start: Enhanced TC-CV-11 to TC-CV-13 Tests

**Version**: 2.0 (Enhanced)  
**Total Tests**: 33 (increased from 19)  
**Status**: ✅ Ready to run

---

## ⚡ QUICK RUN

### Option 1: Enhanced Test Runner (Recommended)
```bash
cd apps/backend
python run_tc_cv_performance_tests_enhanced.py
```

### Option 2: Direct Pytest
```bash
cd apps/backend
pytest test_tc_cv_performance_quality.py -v
```

### Option 3: Run Specific Test Class
```bash
# Performance tests only (9 tests)
pytest test_tc_cv_performance_quality.py::TestPerformanceLatency -v

# Layout tests only (10 tests)
pytest test_tc_cv_performance_quality.py::TestComplexLayoutHandling -v

# Quality tests only (14 tests)
pytest test_tc_cv_performance_quality.py::TestNoisyDataHandling -v
```

---

## 📊 WHAT'S NEW IN VERSION 2.0

### ✨ 14 New Tests Added (+74%)

**Performance (3 new)**:
- ✅ OCR simulation performance
- ✅ Memory efficiency monitoring
- ✅ Stress test (50 rapid requests)

**Layouts (4 new)**:
- ✅ Nested table layouts
- ✅ Multi-page CV simulation
- ✅ Vertical text handling
- ✅ Mixed language layouts

**Quality (7 new)**:
- ✅ Specific error messages
- ✅ File type detection
- ✅ Malformed contact info
- ✅ Duplicate information
- ✅ Incomplete sections
- ✅ Special characters in skills
- ✅ OCR-spaced text

---

## 📋 TEST BREAKDOWN

### TC-CV-11: Performance & Latency (9 tests)
```
✅ test_pdf_extraction_latency
✅ test_skill_extraction_performance
✅ test_normalization_performance
✅ test_complete_cv_parsing_latency
✅ test_concurrent_processing_performance
✅ test_large_cv_performance
✅ test_ocr_simulation_performance [NEW]
✅ test_memory_efficient_processing [NEW]
✅ test_stress_test_rapid_requests [NEW]
```

### TC-CV-12: Complex Layout Handling (10 tests)
```
✅ test_two_column_layout_extraction
✅ test_icon_based_cv_handling
✅ test_table_based_layout
✅ test_mixed_formatting_cv
✅ test_non_standard_section_headers
✅ test_compressed_layout_no_whitespace
✅ test_nested_table_layout [NEW]
✅ test_multi_page_cv_simulation [NEW]
✅ test_vertical_text_simulation [NEW]
✅ test_mixed_language_layout [NEW]
```

### TC-CV-13: Data Quality & Noise (14 tests)
```
✅ test_non_cv_document_detection
✅ test_random_text_file_handling
✅ test_empty_file_handling
✅ test_corrupted_text_handling
✅ test_cv_quality_validation
✅ test_invalid_format_detection
✅ test_mixed_language_noise
✅ test_specific_error_messages [NEW]
✅ test_file_type_detection [NEW]
✅ test_malformed_contact_info [NEW]
✅ test_duplicate_information_handling [NEW]
✅ test_incomplete_sections [NEW]
✅ test_special_characters_in_skills [NEW]
✅ test_cv_with_only_images_text [NEW]
```

---

## ✅ EXPECTED RESULTS

### Success Output:
```
====================================================================================================
33 passed in 2.45s
====================================================================================================

  Total Duration: 2.45 seconds
  Exit Code: 0
  Status: ✅ ALL TESTS PASSED
```

### Performance Metrics:
```
PDF extraction:     ~0.001s (Target: < 2s)    ✅ 2000x faster
Skill extraction:   ~0.01s  (Target: < 1s)    ✅ 100x faster
Complete parsing:   ~0.02s  (Target: < 10s)   ✅ 500x faster
OCR processing:     ~0.02s  (Target: < 3s)    ✅ 150x faster
Stress test (50x):  ~0.5s   (Target: < 5s)    ✅ 10x faster
```

---

## 🔧 TROUBLESHOOTING

### Issue: pytest not found
```bash
# Install pytest
pip install pytest

# Or use python -m pytest
python -m pytest test_tc_cv_performance_quality.py -v
```

### Issue: Import errors
```bash
# Make sure you're in the backend directory
cd apps/backend

# Check Python path
python -c "import sys; print(sys.path)"
```

### Issue: Tests fail
```bash
# Run with more verbose output
pytest test_tc_cv_performance_quality.py -vv --tb=long

# Run single test to debug
pytest test_tc_cv_performance_quality.py::TestPerformanceLatency::test_pdf_extraction_latency -vv
```

---

## 📚 DOCUMENTATION

### Full Documentation:
- `KET_QUA_TEST_TC_CV_11_13_ENHANCED.md` - Detailed test results
- `NANG_CAP_TC_CV_11_13_SUMMARY.md` - Enhancement summary
- `QUICK_START_ENHANCED_TESTS.md` - This file

### Test Implementation:
- `test_tc_cv_performance_quality.py` - Test source code
- `run_tc_cv_performance_tests_enhanced.py` - Enhanced test runner

---

## 🎯 QUICK VERIFICATION

### Verify All Tests Pass:
```bash
cd apps/backend
python run_tc_cv_performance_tests_enhanced.py | grep "passed"
```

### Expected Output:
```
33 passed in 2.45s
```

### Count New Tests:
```bash
# Should show 33 tests total
pytest test_tc_cv_performance_quality.py --collect-only | grep "test_" | wc -l
```

---

## 💡 TIPS

### Run Faster (Skip Slow Tests):
```bash
pytest test_tc_cv_performance_quality.py -v -m "not slow"
```

### Run Only New Tests:
```bash
# Performance new tests
pytest test_tc_cv_performance_quality.py::TestPerformanceLatency::test_ocr_simulation_performance -v
pytest test_tc_cv_performance_quality.py::TestPerformanceLatency::test_memory_efficient_processing -v
pytest test_tc_cv_performance_quality.py::TestPerformanceLatency::test_stress_test_rapid_requests -v

# Layout new tests
pytest test_tc_cv_performance_quality.py::TestComplexLayoutHandling::test_nested_table_layout -v
pytest test_tc_cv_performance_quality.py::TestComplexLayoutHandling::test_multi_page_cv_simulation -v
pytest test_tc_cv_performance_quality.py::TestComplexLayoutHandling::test_vertical_text_simulation -v
pytest test_tc_cv_performance_quality.py::TestComplexLayoutHandling::test_mixed_language_layout -v

# Quality new tests (7 tests)
pytest test_tc_cv_performance_quality.py::TestNoisyDataHandling::test_specific_error_messages -v
# ... and 6 more
```

### Generate HTML Report:
```bash
pip install pytest-html
pytest test_tc_cv_performance_quality.py --html=report.html
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All 33 tests pass locally
- [ ] Performance metrics meet SLA
- [ ] Error messages tested (Vietnamese + English)
- [ ] Documentation reviewed
- [ ] Code reviewed by team
- [ ] Staging environment tested
- [ ] User acceptance testing complete

---

## 📞 SUPPORT

### Need Help?
- Check documentation files listed above
- Review test source code
- Run tests with `-vv` for detailed output

### Report Issues:
- Include test output
- Include Python version
- Include platform (Windows/Linux/Mac)

---

**Quick Start Guide**  
**Version**: 2.0 (Enhanced)  
**Last Updated**: 12/04/2026  
**Status**: ✅ Ready to use

**Run now**: `python run_tc_cv_performance_tests_enhanced.py` 🚀
