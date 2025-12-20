# Debug RIASEC RCM - Troubleshooting Guide

## Vấn đề

User có **Top Career Interest = INVESTIGATIVE (I)** nhưng recommendations trả về nghề sai nhãn (R, RC, etc.)

## Root Causes (Có thể)

1. ❌ **Scores field sai cấu trúc** - Backend đọc sai field RIASEC
2. ❌ **Tags join sai** - Query join `core.career_riasec_map` không đúng
3. ❌ **Filter logic sai** - `startswith()` không match đúng
4. ❌ **AI-core trả nghề sai** - Retrieval/NeuMF không có nghề nhãn I

## Debug Steps

### Step 1: Check Tags trong DB

```bash
cd apps/backend
python debug_tags.py
```

**Verify:**
- [ ] Bảng `core.riasec_labels` có đủ 6 nhãn (R, I, A, S, E, C)
- [ ] Bảng `core.career_riasec_map` có data
- [ ] Sample careers có tags đúng (ví dụ: Chemist → ["I"])
- [ ] Có nghề nhãn I trong DB (ít nhất 10-20 nghề)

**Nếu FAIL:**
- Check migration: `db/init/*.sql`
- Re-seed data: `python seed_riasec_data.py`

---

### Step 2: Check Scores Structure

```bash
python debug_scores.py
```

**Verify:**
- [ ] Field `scores.traits.riasec_fused` tồn tại
- [ ] `riasec_fused` là array 6 phần tử [R, I, A, S, E, C]
- [ ] Top Interest được tính đúng (max value)

**Nếu FAIL:**
- Check FE: Xem FE hiển thị Top Interest từ field nào
- Update backend logic để đọc đúng field đó

---

### Step 3: Test RCM với Assessment

```bash
# Lấy assessment_id từ URL (ví dụ: /results/224)
python test_assessment_rcm.py 224
```

**Verify:**
- [ ] Log hiển thị `top_interest=I`
- [ ] AI-core trả về >50 nghề
- [ ] Sau metadata join, có nghề nhãn I
- [ ] Sau filter, trả về 5 nghề nhãn I

**Nếu FAIL:**

#### Case 1: `top_interest=None`
→ Scores structure sai, xem Step 2

#### Case 2: `top_interest=I` nhưng tags toàn `[]`
→ Tags join sai, check query trong `_load_career_meta()`

#### Case 3: `top_interest=I`, tags đúng nhưng filter trả `[]`
→ Filter logic sai, check `_filter_by_top_interest()`

#### Case 4: AI-core không trả nghề nhãn I
→ Retrieval/NeuMF issue, cần retrain hoặc tăng `internal_top_k`

---

### Step 4: Check Logs

```bash
tail -f logs/app.log | grep "Assessment"
```

**Expected:**
```
Assessment 224 scores keys: ['traits', 'riasec_scores', ...]
Assessment 224 traits keys: ['riasec_fused', 'big5_fused', ...]
Assessment 224 RIASEC scores:
  👉 I: 0.850
     R: 0.650
     A: 0.550
     ...
🎯 Assessment 224 TOP INTEREST: I
Assessment 224: top_interest=I, AI-core returned 100 careers
Assessment 224: 95 careers after metadata join
📋 First 10 careers with tags:
  1. Chemist                                  | Tags: ['I'] | Score: 0.920
  2. Biologist                                | Tags: ['I', 'IR'] | Score: 0.910
  ...
Assessment 224: 5 careers after RIASEC filter (top_interest=I)
✅ Filtered careers (top_interest=I):
  1. Chemist                                  | Tags: ['I'] | Score: 0.920
  2. Biologist                                | Tags: ['I', 'IR'] | Score: 0.910
  ...
```

---

## Quick Fixes

### Fix 1: Scores Field Sai

**Problem:** Backend đọc `scores.riasec` nhưng DB có `scores.traits.riasec_fused`

**Fix:** Update `_load_traits_snapshot()` trong `service.py`

```python
# Thay đổi logic đọc scores
traits = scores.get("traits") or {}
fused = traits.get("riasec_fused")  # Đúng field
```

---

### Fix 2: Tags Join Sai

**Problem:** Query join trả `riasec_codes = []` cho tất cả nghề

**Fix:** Check query trong `_load_career_meta()`:

```sql
-- Verify query
SELECT
    c.onet_code,
    c.title_en,
    array_agg(rl.code) FILTER (WHERE rl.code IS NOT NULL) AS riasec_codes
FROM core.careers c
LEFT JOIN core.career_riasec_map m ON m.career_id = c.id
LEFT JOIN core.riasec_labels rl ON rl.id = m.label_id
WHERE c.onet_code = '19-2031.00'  -- Chemist
GROUP BY c.onet_code, c.title_en;
```

**Expected:** `riasec_codes = ['I']` hoặc `['I', 'IR']`

**Nếu trả `[]`:**
- Check `core.career_riasec_map` có data không
- Check `m.career_id = c.id` join đúng không (có thể cần `c.onet_code`)

---

### Fix 3: Filter Logic Sai

**Problem:** `tag.startswith('I')` không match `['I']`

**Debug:**

```python
# Add log trong _filter_by_top_interest()
for tag in tags:
    tag_str = str(tag).upper()
    logger.info(f"Checking tag '{tag_str}' startswith '{top_code}': {tag_str.startswith(top_code)}")
```

**Possible issues:**
- `tag` là `None` → `str(None) = 'None'` → không match
- `tag` có whitespace → `' I '` không match `'I'`
- `tags` là string thay vì list → `'I'` thành `['I']` → iterate thành `'I'[0] = 'I'`

**Fix:** Add validation:

```python
for tag in tags:
    if tag is None:
        continue
    tag_str = str(tag).strip().upper()
    if tag_str.startswith(top_code):
        is_match = True
        break
```

---

### Fix 4: AI-core Không Trả Nghề Nhãn I

**Problem:** Retrieval/NeuMF chỉ trả nghề R, không có nghề I

**Temporary fix:** Tăng `internal_top_k`

```python
# service.py
internal_top_k = max(top_k * 20, 200)  # Tăng từ 10x lên 20x
```

**Long-term fix:**
- Retrain NeuMF với balanced sampling
- Improve retrieval (pgvector) với RIASEC constraint
- Add diversity penalty trong ranking

---

## Verification Checklist

Sau khi fix, verify:

- [ ] `python debug_tags.py` - Tags đúng trong DB
- [ ] `python debug_scores.py` - Scores structure đúng
- [ ] `python test_assessment_rcm.py 224` - RCM trả đúng nhãn
- [ ] Check logs - Không có errors
- [ ] Test trên UI - 5 nghề khớp Top Interest

---

## Test Cases

### Test Case 1: Top Interest = I

```bash
python test_assessment_rcm.py <assessment_id_with_I>
```

**Expected:** 5 nghề có tags `['I']`, `['I', 'IR']`, `['I', 'IA']`, etc.

### Test Case 2: Top Interest = A

```bash
python test_assessment_rcm.py <assessment_id_with_A>
```

**Expected:** 5 nghề có tags `['A']`, `['A', 'AE']`, `['AR']`, etc.

### Test Case 3: Top Interest = S

```bash
python test_assessment_rcm.py <assessment_id_with_S>
```

**Expected:** 5 nghề có tags `['S']`, `['S', 'SE']`, `['SA']`, etc.

---

## Contact

Nếu vẫn không fix được:
1. Chạy `./run_debug.sh <assessment_id>`
2. Copy toàn bộ output
3. Share với team để debug
