# Quick Test Guide - RIASEC Filtering Fix

## 🚀 Quick Start (5 phút)

### 1. Unit Test (Không cần DB)

```bash
cd apps/backend
python test_riasec_filter.py
```

✅ Expect: `ALL TESTS PASSED`

---

### 2. Integration Test (Cần DB + AI-core)

```bash
# List assessments
python test_riasec_real.py --list

# Test specific assessment
python test_riasec_real.py --assessment-id 224
```

✅ Expect: `SUCCESS: All 5 recommendations match top_interest=A`

---

### 3. API Test (Cần Backend running)

```bash
# Terminal 1: Start backend
cd apps/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Test API
curl "http://localhost:8000/api/recommendations?assessment_id=224&top_k=5" | jq
```

✅ Expect: Tất cả items có `tags` chứa chữ cái đầu của Top Interest

---

### 4. Frontend Test (Full stack)

```bash
# Terminal 1: Backend
cd apps/backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: AI-core
cd packages/ai-core
uvicorn src.main:app --reload --port 9000

# Terminal 3: Frontend
cd apps/frontend
npm run dev

# Browser
http://localhost:3000/results/224
```

✅ Expect: Tab "Career Matches" hiển thị nghề khớp với "Top Career Interest"

---

## 🔍 Verify Results

### Check 1: Tags Match Top Interest

```python
# Example response
{
  "items": [
    {"title": "Graphic Designer", "tags": ["A", "AE"]},  # ✅ A matches
    {"title": "Musician", "tags": ["A"]},                # ✅ A matches
    {"title": "Art Director", "tags": ["AR"]},           # ✅ AR starts with A
  ]
}
```

### Check 2: Logs

```bash
tail -f logs/app.log | grep "Assessment"
```

Expected:
```
Assessment 224: top_interest=A, AI-core returned 50 careers
Assessment 224: 30 careers after metadata join
Assessment 224: 5 careers after RIASEC filter (top_interest=A)
```

### Check 3: Database

```sql
-- Check impressions
SELECT * FROM analytics.career_events 
WHERE event_type = 'impression' 
ORDER BY created_at DESC 
LIMIT 5;
```

Expected: 5 rows với `user_id` không null

---

## ❌ Troubleshooting

### Problem: "Only 0/5 careers match"

**Cause:** Không có nghề nào trong DB có nhãn khớp với Top Interest

**Fix:**
1. Check DB: `SELECT * FROM core.career_riasec_map LIMIT 10;`
2. Verify AI-core trả về nghề đúng: Check logs
3. Tăng `internal_top_k` nếu cần

---

### Problem: API returns empty items

**Cause:** Assessment không tồn tại hoặc không có scores

**Fix:**
```sql
SELECT id, user_id, scores 
FROM core.assessments 
WHERE id = 224;
```

---

### Problem: Tags không match nhưng should match

**Example:** Top Interest = "A", nghề có tag "AE" nhưng không match

**Debug:**
```python
# In service.py, add debug log
logger.info(f"Checking tag '{tag}' against top_code '{top_code}'")
logger.info(f"startswith result: {tag.startswith(top_code)}")
```

---

## 📊 Expected Behavior

| Top Interest | Matching Tags | Example Careers |
|--------------|---------------|-----------------|
| R (Realistic) | R, RC, RI, RA, RS, RE | Mechanic, Carpenter, Electrician |
| I (Investigative) | I, IR, IA, IS, IE, IC | Scientist, Researcher, Analyst |
| A (Artistic) | A, AR, AI, AS, AE, AC | Designer, Musician, Writer |
| S (Social) | S, SR, SI, SA, SE, SC | Teacher, Counselor, Nurse |
| E (Enterprising) | E, ER, EI, EA, ES, EC | Manager, Sales, Entrepreneur |
| C (Conventional) | C, CR, CI, CA, CS, CE | Accountant, Clerk, Administrator |

---

## 🎯 One-Liner Tests

```bash
# Test logic only
python test_riasec_filter.py && echo "✅ Logic OK"

# Test with DB
python test_riasec_real.py --assessment-id 224 && echo "✅ Integration OK"

# Test API
curl -s "localhost:8000/api/recommendations?assessment_id=224&top_k=5" | jq '.items[].tags' && echo "✅ API OK"
```

---

## 📞 Need Help?

1. Check logs: `tail -f logs/app.log`
2. Check docs: `/doc/FIX_RIASEC_FILTERING.md`
3. Run debug script: `python test_riasec_real.py --assessment-id <ID>`
