# 🧪 Testing TOEIC Answer Key Rejection Fix

## Quick Test Guide

### Prerequisites
✅ Backend server running
✅ Gemini API key configured in `.env`
✅ TOEIC answer key PDF file ready

### Test 1: TOEIC Answer Key Rejection (Main Test)

**File:** KEY P56 - TEST 7.pdf (or similar TOEIC answer key)

**Expected Behavior:**
1. System extracts text successfully
2. Keyword validation passes (text contains words like "design", "sales")
3. **NEW:** AI validation step runs
4. AI identifies document as "Test Answer Key"
5. System rejects with error message

**Expected Error Message:**
```
File tải lên không phải là CV/Resume. 
AI phát hiện đây là tài liệu khác (đáp án bài thi, sách giáo khoa, tài liệu học tập, v.v.). 
Vui lòng tải lên file CV/Resume chứa thông tin cá nhân và kinh nghiệm làm việc.
```

**Expected Log Output:**
```
✅ TEXT EXTRACTION SUCCESSFUL
   Extracted: 16657 characters

🤖 [GEMINI VALIDATION] Asking AI: Is this a CV/Resume?
  📤 Sending 2000 chars to Gemini for CV validation...
  📥 Gemini response:
     - Is CV: False
     - Confidence: 0.95
     - Document type: Test Answer Key
     - Reason: This is a TOEIC test answer key with explanations
❌ [GEMINI VALIDATION] AI confirmed: This is NOT a CV/Resume
```

### Test 2: Valid CV Acceptance

**File:** Any legitimate CV/Resume

**Expected Behavior:**
1. System extracts text successfully
2. Keyword validation passes
3. AI validation runs
4. AI identifies document as "CV/Resume"
5. System continues with skill extraction

**Expected Log Output:**
```
✅ TEXT EXTRACTION SUCCESSFUL
   Extracted: 2500 characters

🤖 [GEMINI VALIDATION] Asking AI: Is this a CV/Resume?
  📤 Sending 2000 chars to Gemini for CV validation...
  📥 Gemini response:
     - Is CV: True
     - Confidence: 0.95
     - Document type: CV/Resume
     - Reason: Contains personal info, work experience, and skills
✅ [GEMINI VALIDATION] AI confirmed: This looks like a CV/Resume

🤖 [CV Parser V2] STARTING AI EXTRACTION
...
```

### Test 3: Other Non-CV Documents

**Files to test:**
- Textbooks
- Tutorial documents
- News articles
- Research papers

**Expected:** All should be rejected by AI validation

## How to Test

### Option 1: Frontend (Recommended)
1. Start backend: `cd apps/backend && python restart_server.py`
2. Start frontend: `cd apps/frontend && npm start`
3. Navigate to Skill Gap Analysis page
4. Upload TOEIC answer key PDF
5. Verify error message appears
6. Upload valid CV
7. Verify it processes successfully

### Option 2: API Direct Test
```bash
curl -X POST http://localhost:8000/api/skill-gap/analyze \
  -F "file=@KEY_P56_TEST_7.pdf" \
  -F "target_career=occupational-therapists-29-1122-00"
```

**Expected Response:**
```json
{
  "detail": "File tải lên không phải là CV/Resume. AI phát hiện đây là tài liệu khác..."
}
```

### Option 3: Unit Test
```bash
cd apps/backend
python test_toeic_rejection.py
```

**Note:** Requires Gemini API to be available

## Troubleshooting

### Issue: "CV analysis stream not available"
**Cause:** Gemini API key not configured or invalid
**Fix:** Check `.env` file for `GEMINI_CV_API_KEY`

### Issue: Valid CV rejected
**Cause:** AI confidence < 0.7 or API error
**Fix:** Check logs for Gemini response, may need to adjust confidence threshold

### Issue: TOEIC still accepted
**Cause:** AI validation not running or returning wrong result
**Fix:** Check logs for "🤖 [GEMINI VALIDATION]" message

## Success Criteria

✅ TOEIC answer key is rejected with clear error message
✅ Valid CVs are still accepted and processed
✅ Error message is in Vietnamese and user-friendly
✅ Token usage is minimal (only 2000 chars sent to Gemini)
✅ System fails safe (rejects on error rather than accepts)

## Performance Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| TOEIC rejection rate | 100% | Upload 5 different TOEIC PDFs |
| Valid CV acceptance | >95% | Upload 20 different valid CVs |
| False positive rate | <5% | Monitor production logs |
| Token cost per validation | <$0.002 | Check Gemini API usage |
| Response time | <3s | Measure from upload to error |

## Rollback Plan

If issues occur:
1. Comment out AI validation in `parse_cv_complete()` (line ~1140-1150)
2. System will fall back to keyword-only validation
3. Restart server

```python
# TEMPORARY ROLLBACK - Comment out these lines:
# print("\n🤖 [GEMINI VALIDATION] Asking AI: Is this a CV/Resume?")
# is_cv_by_ai = self._ask_gemini_is_cv(text)
# if not is_cv_by_ai:
#     raise ValueError(...)
```

---

**Ready to Test:** ✅
**Estimated Test Time:** 10-15 minutes
**Risk Level:** Low (safe defaults, easy rollback)
