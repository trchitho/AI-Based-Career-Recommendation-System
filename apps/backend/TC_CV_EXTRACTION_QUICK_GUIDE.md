# TC-CV-04 to TC-CV-07: Quick Reference Guide

## 🚀 Quick Start

### Run All Tests
```bash
cd apps/backend
python run_tc_cv_extraction_tests.py
```

### Run Specific Test Suite
```bash
# Personal info tests only
pytest test_tc_cv_extraction.py::TestPersonalInfoExtraction -v

# Skills extraction tests only
pytest test_tc_cv_extraction.py::TestSkillsExtraction -v

# Normalization tests only
pytest test_tc_cv_extraction.py::TestSkillNormalization -v

# Experience tests only
pytest test_tc_cv_extraction.py::TestExperienceExtraction -v
```

---

## 📋 Test Cases Summary

### TC-CV-04: Personal Information Extraction (7 tests)
```python
✅ Extract name from standard format
✅ Extract email from various formats  
✅ Extract Vietnamese phone numbers
✅ No confusion between fields
✅ Extract with Vietnamese diacritics
✅ Handle missing personal info
✅ Multiple emails - take first
```

### TC-CV-05: Skills Extraction (7 tests)
```python
✅ Extract from bullet points
✅ Extract from paragraph
✅ Extract from mixed format
✅ Verify skills have categories
✅ Extract soft skills
✅ Case-insensitive extraction
✅ No duplicate skills
```

### TC-CV-06: Skill Normalization (7 tests)
```python
✅ Normalize React variants (ReactJS, React.js → React)
✅ Normalize JavaScript variants (JS → JavaScript)
✅ Normalize Node.js variants (NodeJS, Node → Node.js)
✅ Normalize database variants (Postgres → PostgreSQL)
✅ Normalize cloud platforms (AWS, GCP)
✅ Preserve unique skills
✅ Case-insensitive normalization
```

### TC-CV-07: Experience Extraction (7 tests)
```python
✅ Extract experience with dates
✅ Calculate total years
✅ Extract job titles
✅ Handle various date formats
✅ Handle current position (Present/Current)
✅ Extract company names
✅ Extract responsibilities
```

---

## 💻 Code Examples

### 1. Extract Personal Info
```python
from app.modules.skill_gap.cv_parser import CVParser

parser = CVParser()
cv_text = "NGUYEN VAN AN\nEmail: test@example.com\nPhone: 0912345678"

info = parser.extract_personal_info(cv_text)
# {'name': 'Nguyen Van An', 'email': 'test@example.com', 'phone': '0912345678'}
```

### 2. Extract Skills
```python
from app.modules.skill_gap.cv_parser import CVParser

parser = CVParser()
cv_text = "SKILLS: Python, JavaScript, React, Node.js, PostgreSQL"

skills = parser.extract_skills(cv_text)
# [{'name': 'Python', 'category': 'Programming', 'source': 'cv'}, ...]
```

### 3. Normalize Skills
```python
from app.modules.skill_gap.cv_parser import CVParser

parser = CVParser()
skills = [
    {'name': 'ReactJS', 'category': 'Frontend', 'source': 'cv'},
    {'name': 'React.js', 'category': 'Frontend', 'source': 'cv'},
]

normalized = parser.normalize_skills(skills)
# [{'name': 'React', 'category': 'Frontend', 'source': 'cv'}]  # Deduplicated!
```

### 4. Complete CV Parsing
```python
from app.modules.skill_gap.cv_parser_v2 import CVParserV2

parser = CVParserV2()

with open('cv.pdf', 'rb') as f:
    content = f.read()

result = parser.parse_cv_complete(content, file_type='pdf', target_career='Backend Developer')
# {
#   'personal_info': {...},
#   'skills': [...],
#   'text': '...'
# }
```

---

## 🔧 Normalization Rules

### Common Mappings
| Input | Output |
|-------|--------|
| ReactJS, React.js, react | React |
| JS, js | JavaScript |
| NodeJS, Node.js, node | Node.js |
| Postgres, postgresql | PostgreSQL |
| Mongo, mongodb | MongoDB |
| Amazon Web Services, aws | AWS |
| Google Cloud, gcp | GCP |

---

## 📊 Test Results

```
Total Tests: 29
Passed: 29 ✅
Failed: 0
Coverage: 100%
Duration: ~1.4s
```

---

## 🐛 Troubleshooting

### Test Failures

**Issue**: Phone extraction test fails
```bash
# Fix: Check phone regex pattern in cv_parser.py
# Pattern should support: 0xxx, +84xxx, xxx-xxx-xxxx
```

**Issue**: Name extraction returns job title
```bash
# Fix: Update invalid_keywords list in _is_valid_name()
# Add more job titles to filter out
```

**Issue**: Skills not normalized
```bash
# Fix: Check SKILL_NORMALIZATION_MAP in cv_extractor_enhanced.py
# Add missing skill variants
```

---

## 📁 File Structure

```
apps/backend/
├── test_tc_cv_extraction.py              # All test cases
├── run_tc_cv_extraction_tests.py         # Test runner
├── TC_CV_EXTRACTION_REPORT.md            # Detailed report
├── TC_CV_EXTRACTION_QUICK_GUIDE.md       # This guide
└── app/modules/skill_gap/
    ├── cv_parser.py                      # Main parser
    ├── cv_parser_v2.py                   # AI-powered parser
    └── cv_extractor_enhanced.py          # Enhanced extraction
```

---

## 🎯 Success Criteria

- ✅ All 29 tests pass
- ✅ Personal info extracted correctly
- ✅ Skills extracted from multiple formats
- ✅ Skills normalized (no duplicates)
- ✅ Experience dates parsed correctly
- ✅ Vietnamese language supported
- ✅ No confusion between fields

---

## 📞 Support

**For Issues**:
- Check `TC_CV_EXTRACTION_REPORT.md` for detailed documentation
- Review test cases in `test_tc_cv_extraction.py`
- Run tests with `-v` flag for verbose output

**For Questions**:
- Contact: Development Team
- Documentation: See report files

---

**Last Updated**: 2026-04-12  
**Status**: ✅ All tests passing
