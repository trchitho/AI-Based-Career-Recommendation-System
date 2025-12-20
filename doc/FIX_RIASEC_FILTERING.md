# Fix RIASEC Filtering - Đảm bảo RCM khớp Top Career Interest

**Ngày:** 2025-12-10  
**Module:** `apps/backend/app/modules/recommendation/service.py`

## Vấn đề

Kết quả recommendation không khớp với Top Career Interest hiển thị trên UI:
- User có Top Career Interest = **A (Artistic)**
- Nhưng 5 nghề được recommend lại có nhãn **R (Realistic)** hoặc **RC**

### Nguyên nhân

1. **Logic filter cũ dùng set intersection** không hoạt động đúng:
   ```python
   tags = set(["R", "RC"])
   allowed_codes = set(["A", "AR", "AE", "AI", "AS", "AC"])
   
   if tags & allowed_codes:  # Empty set → không match
       preferred.append(it)
   ```

2. **Soft mode luôn fill đủ top_k** bằng nghề sai nhãn khi không đủ nghề khớp

3. **Internal top_k quá nhỏ** (4x) → không đủ nghề để filter

## Giải pháp

### 1. Thay đổi logic filter

**Cũ:** Set intersection  
**Mới:** String `startswith()` check

```python
def _filter_by_top_interest(jobs, top_code, top_k, strict=True):
    """
    Filter nghề theo RIASEC top_interest.
    
    - Lọc nghề có tag BẮT ĐẦU bằng top_code
    - Ví dụ: top_code="A" → match ["A", "AR", "AE", "AI", "AS", "AC"]
    - Strict mode: chỉ trả nghề khớp nhãn (100% đúng Top Career Interest)
    """
    matched = []
    
    for job in jobs:
        tags = job.get("tags", [])
        for tag in tags:
            if str(tag).upper().startswith(top_code):
                matched.append(job)
                break
    
    matched.sort(key=lambda x: x["match_score"], reverse=True)
    
    if strict:
        return matched[:top_k]  # Chỉ trả nghề khớp
    else:
        # Fill bằng nghề khác nếu không đủ
        ...
```

### 2. Tăng internal_top_k

**Cũ:** `internal_top_k = max(top_k * 4, 20)`  
**Mới:** `internal_top_k = max(top_k * 10, 100)`

Lý do: Cần nhiều nghề hơn từ AI-core để sau khi filter vẫn còn đủ nghề khớp nhãn.

### 3. Strict mode mặc định

**Cũ:** Luôn fill đủ top_k (dù sai nhãn)  
**Mới:** `strict=True` - chỉ trả nghề khớp nhãn

```python
items_filtered = self._filter_by_top_interest(
    jobs=items_with_meta,
    top_code=top_dim,
    top_k=top_k,
    strict=True,  # 100% nghề phải khớp Top Career Interest
)
```

### 4. Thêm logging

```python
logger.info(
    f"Assessment {assessment_id}: top_interest={top_dim}, "
    f"AI-core returned {len(scored)} careers"
)

logger.info(
    f"Assessment {assessment_id}: {len(items_filtered)} careers after RIASEC filter"
)
```

## Kết quả

### Trước khi fix

```json
{
  "top_interest": "A (Artistic)",
  "recommendations": [
    {"title": "Signal Repairer", "tags": ["R", "RC"], "score": 0.95},
    {"title": "Mechanic", "tags": ["R"], "score": 0.90},
    {"title": "Carpenter", "tags": ["RC"], "score": 0.85},
    ...
  ]
}
```

❌ **0/5 nghề khớp với Top Interest = A**

### Sau khi fix

```json
{
  "top_interest": "A (Artistic)",
  "recommendations": [
    {"title": "Graphic Designer", "tags": ["A", "AE"], "score": 0.90},
    {"title": "Musician", "tags": ["A"], "score": 0.85},
    {"title": "Art Director", "tags": ["AR"], "score": 0.75},
    {"title": "Fashion Designer", "tags": ["AE"], "score": 0.70},
    {"title": "Interior Designer", "tags": ["A", "AS"], "score": 0.65}
  ]
}
```

✅ **5/5 nghề khớp với Top Interest = A**

## Test Coverage

File: `apps/backend/test_riasec_filter.py`

```bash
python test_riasec_filter.py
```

**Test cases:**
1. ✅ Top Interest = A, có đủ nghề nhãn A
2. ✅ Top Interest = A, không đủ nghề → chỉ trả nghề khớp (không fill)
3. ✅ Top Interest = R, nghề RC được match (startswith)
4. ✅ Soft mode - fill bằng nghề khác khi cần

## Luồng hoạt động sau khi fix

```
FE: GET /api/recommendations?assessment_id=224&top_k=5
  ↓
BFF: RecService.get_main_recommendations()
  ↓
  1. internal_top_k = 5 * 10 = 50
  2. Gọi AI-core /recs/top_careers (top_k=50)
  ↓
AI-core: Trả về 50 nghề (NeuMF hoặc retrieval)
  ↓
BFF:
  3. Load traits: riasec_top_dim = "A"
  4. Join metadata: lấy tags từ core.careers
  5. Filter STRICT:
     - Chỉ giữ nghề có tag bắt đầu bằng "A"
     - Sort by match_score
     - Lấy top 5
  6. Normalize display_match (70-95%)
  7. Log impressions
  ↓
FE: Render 5 nghề (100% khớp Top Interest = A)
```

## Breaking Changes

**Không có** - API response format không đổi.

Chỉ thay đổi nội bộ logic filter, đảm bảo kết quả đúng hơn.

## Rollback Plan

Nếu cần rollback, đổi lại:

```python
# service.py line ~200
items_filtered = self._filter_by_top_interest(
    jobs=items_with_meta,
    top_code=top_dim,
    top_k=top_k,
    strict=False,  # Cho phép fill bằng nghề khác
)
```

Hoặc revert commit này.

## Monitoring

Sau khi deploy, kiểm tra:

1. **Log warning** nếu không đủ nghề khớp:
   ```
   Only 3/5 careers match top_interest=A
   ```

2. **Analytics**: So sánh click-through rate trước/sau fix
   - Giả thuyết: CTR tăng vì nghề khớp với interest của user

3. **User feedback**: Kiểm tra rating/comment về recommendation quality

## Related Files

- `apps/backend/app/modules/recommendation/service.py` - Main logic
- `apps/backend/test_riasec_filter.py` - Unit tests
- `packages/ai-core/src/api/routes_recs.py` - AI-core endpoint (không đổi)

## Next Steps

1. ✅ Fix logic filter (DONE)
2. ⏳ Test trên staging với real data
3. ⏳ Monitor logs để tune internal_top_k nếu cần
4. ⏳ Consider: Thêm fallback sang top_interest thứ 2 nếu không đủ nghề
