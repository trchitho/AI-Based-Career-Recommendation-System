# 🔍 BigFive Debug - Quick Start Guide

**Mục tiêu**: Tìm và fix lỗi BigFive personality data không hiển thị trên Results page

---

## 🚀 Bắt Đầu Debug (5 Phút)

### Bước 1: Start Backend với Debug Logging

```bash
cd apps/backend
python -m uvicorn app.main:app --reload --port 8000 --log-level debug
```

**Quan sát**: Terminal sẽ hiển thị nhiều log messages

---

### Bước 2: Start Frontend

```bash
# Terminal mới
cd apps/frontend
npm run dev
```

**Mở browser**: http://localhost:5173

---

### Bước 3: Chạy Assessment

1. **Login** với user account
2. **Click** "Bắt Đầu Đánh Giá Tương Tác" (Interactive Story button)
3. **Hoàn thành** assessment (trả lời tất cả câu hỏi)
4. **Submit** assessment

---

### Bước 4: Thu Thập Logs

**Trong terminal backend**, tìm các dòng log này:

```
[DEBUG get_questions] test_type=BIGFIVE, normalized=BigFive
[DEBUG get_questions] Returning X questions for BigFive
[DEBUG save_assessment] Question metadata: X RIASEC, Y BigFive
[DEBUG save_assessment] RIASEC responses: X, BigFive responses: Y
[DEBUG save_assessment] BigFive accumulator: {O: X, C: Y, E: Z, A: W, N: V}
[DEBUG save_assessment] has_riasec=True, has_big5=???
```

**Copy tất cả logs** từ khi submit assessment

---

## 🔎 Phân Tích Logs

### Scenario 1: BigFive Questions Không Load

**Log pattern**:
```
[DEBUG get_questions] test_type=BIGFIVE, normalized=BigFive
[DEBUG get_questions] Returning 0 questions for BigFive
```

**Nguyên nhân**: Database không có BigFive questions hoặc form_type sai

**Fix**: Check database
```sql
SELECT COUNT(*) as total, f.form_type, f.lang
FROM core.assessment_questions q
JOIN core.assessment_forms f ON q.form_id = f.id
WHERE f.form_type = 'BigFive'
GROUP BY f.form_type, f.lang;
```

**Expected**: Ít nhất 240 questions với form_type = 'BigFive'

---

### Scenario 2: BigFive Responses Không Được Gửi

**Log pattern**:
```
[DEBUG save_assessment] Question metadata: 60 RIASEC, 240 BigFive
[DEBUG save_assessment] RIASEC responses: 60, BigFive responses: 0
```

**Nguyên nhân**: Frontend không gửi BigFive responses

**Fix**: Check frontend payload
1. Mở **Browser DevTools** (F12)
2. Tab **Network**
3. Filter: `submit`
4. Click vào request
5. Tab **Payload** → Check `responses` array
6. Verify có questions với `questionId` trong range 289-528 (BigFive IDs)

---

### Scenario 3: BigFive Responses Bị Skip

**Log pattern**:
```
[DEBUG save_assessment] Question metadata: 60 RIASEC, 240 BigFive
[DEBUG save_assessment] RIASEC responses: 60, BigFive responses: 240
[DEBUG save_assessment] Processed 60 responses, skipped 240
[DEBUG save_assessment] BigFive accumulator: {O: 0, C: 0, E: 0, A: 0, N: 0}
```

**Nguyên nhân**: BigFive responses bị skip trong processing loop

**Possible reasons**:
- `form_type_norm` không match
- `dim_letter` không trong `big5_letters`
- `score_val` là None (không parse được answer)

**Fix**: Check trong `save_assessment()` function:
- Line ~450: `form_type_norm = _normalize_type(ftype)`
- Line ~460: `dim_letter = (qkey or "").strip()[:1].upper()`
- Line ~465: `score_val = _to_score(raw_ans)`

---

### Scenario 4: BigFive Assessment Không Được Tạo

**Log pattern**:
```
[DEBUG save_assessment] BigFive accumulator: {O: 48, C: 48, E: 48, A: 48, N: 48}
[DEBUG save_assessment] has_riasec=True, has_big5=False
```

**Nguyên nhân**: Logic `has_big5` sai

**Fix**: Check line ~480:
```python
has_big5 = any(big5_acc[k] for k in big5_letters)
```

Should be True nếu có ít nhất 1 dimension có scores

---

## 🛠️ Common Fixes

### Fix 1: Normalize Type Issue

**Problem**: `_normalize_type()` không nhận diện "BIGFIVE" từ frontend

**Current code** (line ~280):
```python
def _normalize_type(t: str) -> str:
    up = s.upper()
    if up in {"BIGFIVE", "BIG_FIVE", "BIG5", "OCEAN", "BIG FIVE"}:
        return "BigFive"
```

**Verify**: Thêm log để check
```python
def _normalize_type(t: str) -> str:
    s = (t or "").strip()
    up = s.upper()
    print(f"[DEBUG _normalize_type] input='{t}' → upper='{up}'")
    # ... rest of function
```

---

### Fix 2: Question Key Format Issue

**Problem**: `question_key` không có dimension letter

**Check database**:
```sql
SELECT id, question_key, form_id
FROM core.assessment_questions
WHERE id BETWEEN 289 AND 528
LIMIT 10;
```

**Expected format**: 
- `O1`, `O2`, ... (Openness)
- `C1`, `C2`, ... (Conscientiousness)
- `E1`, `E2`, ... (Extraversion)
- `A1`, `A2`, ... (Agreeableness)
- `N1`, `N2`, ... (Neuroticism)

**If wrong format**: Update database
```sql
-- Example: Update question_key format
UPDATE core.assessment_questions
SET question_key = 'O' || question_no
WHERE form_id IN (
    SELECT id FROM core.assessment_forms WHERE form_type = 'BigFive'
)
AND question_key NOT LIKE 'O%';
```

---

### Fix 3: Answer Parsing Issue

**Problem**: `_to_score()` không parse được BigFive answers

**Check**: BigFive answers có format khác RIASEC

**RIASEC answers**:
- "Strongly Like", "Like", "Unsure", "Dislike", "Strongly Dislike"

**BigFive answers** (might be):
- "Strongly Agree", "Agree", "Neutral", "Disagree", "Strongly Disagree"

**Verify** `_to_score()` function (line ~320) có map cho BigFive:
```python
likert_map: dict[str, float] = {
    # RIASEC style
    "strongly dislike": 1.0,
    "dislike": 2.0,
    "unsure": 3.0,
    "neutral": 3.0,
    "like": 4.0,
    "strongly like": 5.0,
    # Big Five style
    "strongly disagree": 1.0,
    "disagree": 2.0,
    "agree": 4.0,
    "strongly agree": 5.0,
}
```

---

## 📊 Verify Fix

### 1. Check Database

```sql
-- Should see both RIASEC and BigFive assessments
SELECT id, user_id, a_type, scores, created_at
FROM core.assessments
WHERE user_id = YOUR_USER_ID
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: 2 rows với cùng `created_at`:
- 1 row: `a_type = 'RIASEC'`
- 1 row: `a_type = 'BigFive'`

---

### 2. Check Results Page

1. Navigate to: http://localhost:5173/results/YOUR_ASSESSMENT_ID
2. Scroll to **"Tính Cách Big Five"** section
3. **Verify**: 
   - Chart hiển thị 5 bars (O, C, E, A, N)
   - Mỗi bar có giá trị > 0
   - Không còn message "Chưa có dữ liệu tính cách"

---

### 3. Check API Response

```bash
# Get assessment results
curl http://localhost:8000/api/assessments/YOUR_ASSESSMENT_ID/results
```

**Expected JSON**:
```json
{
  "riasec": {
    "R": 3.5,
    "I": 4.2,
    ...
  },
  "big_five": {
    "O": 3.8,
    "C": 4.1,
    "E": 3.2,
    "A": 4.5,
    "N": 2.9
  }
}
```

---

## 🎯 Success Criteria

✅ Backend logs show:
```
[DEBUG save_assessment] has_riasec=True, has_big5=True
[DEBUG save_assessment] RIASEC scores: {R: X, I: Y, ...}
[DEBUG save_assessment] BigFive scores: {O: X, C: Y, E: Z, A: W, N: V}
```

✅ Database has 2 assessments (RIASEC + BigFive)

✅ Results page displays BigFive chart with data

✅ No console errors in browser

---

## 📞 Need Help?

**If stuck**, share:
1. ✅ Full backend logs (from submit to commit)
2. ✅ Frontend Network tab payload
3. ✅ Database query results
4. ✅ Screenshots of Results page

**Continue conversation** với Kiro để analyze và fix!

---

**Estimated Time**: 15-30 minutes
**Difficulty**: Medium
**Priority**: HIGH 🔴

Good luck! 🚀
