# RIASEC Filtering Fix V2 - Enhanced Debug & Logging

**Date:** 2025-12-10  
**Status:** ✅ Code Updated, ⏳ Testing Required

## Changes Made

### 1. Enhanced Debug Logging

**File:** `apps/backend/app/modules/recommendation/service.py`

#### Added Logs in `_load_traits_snapshot()`:

```python
# Log scores structure
logger.info(f"Assessment {assessment_id} scores keys: {list(scores.keys())}")
logger.info(f"Assessment {assessment_id} traits keys: {list(traits.keys())}")

# Log RIASEC scores with visual indicator
logger.info(f"Assessment {assessment_id} RIASEC scores:")
for i, dim in enumerate(dims):
    marker = "👉" if i == max_idx else "  "
    logger.info(f"  {marker} {dim}: {fused[i]:.3f}")

# Log final top interest
logger.info(f"🎯 Assessment {assessment_id} TOP INTEREST: {top_dim}")
```

#### Added Logs in `get_main_recommendations()`:

```python
# Log first 10 careers with tags
logger.info(f"📋 First 10 careers with tags:")
for i, item in enumerate(items_with_meta[:10], 1):
    title = item.get("title_en") or item.get("title_vi") or "Unknown"
    tags = item.get("tags", [])
    score = item.get("match_score", 0.0)
    logger.info(f"  {i}. {title[:40]:<40} | Tags: {tags} | Score: {score:.3f}")

# Log filtered results
if items_filtered:
    logger.info(f"✅ Filtered careers (top_interest={top_dim}):")
    for i, item in enumerate(items_filtered, 1):
        # ... same format
else:
    logger.error(f"❌ NO CAREERS MATCH top_interest={top_dim}!")
    logger.error(f"   Available tags in first 10 careers:")
    for i, item in enumerate(items_with_meta[:10], 1):
        tags = item.get("tags", [])
        logger.error(f"     {i}. Tags: {tags}")
```

### 2. Debug Scripts

#### `debug_tags.py`
- Check RIASEC labels trong DB
- List sample careers với tags
- Count careers by RIASEC code
- Find careers without tags

#### `debug_scores.py`
- Check scores structure trong assessments
- Extract RIASEC top interest
- Verify field paths

#### `test_assessment_rcm.py`
- Test RCM cho assessment cụ thể
- Show full recommendation results
- Easy to run: `python test_assessment_rcm.py 224`

#### `run_debug.sh`
- Run all debug steps in sequence
- Usage: `./run_debug.sh 224`

### 3. Documentation

#### `DEBUG_RIASEC_RCM.md`
- Complete troubleshooting guide
- 4 root causes với fixes
- Step-by-step debug process
- Test cases cho I, A, S

---

## How to Debug

### Quick Test (1 phút)

```bash
cd apps/backend
python test_assessment_rcm.py 224
```

Check output:
- ✅ `top_interest=I` (hoặc A, S, R, E, C)
- ✅ First 10 careers có tags đa dạng
- ✅ Filtered careers có 5 nghề khớp nhãn

### Full Debug (5 phút)

```bash
# 1. Check tags
python debug_tags.py

# 2. Check scores
python debug_scores.py

# 3. Test RCM
python test_assessment_rcm.py 224

# Or run all at once
./run_debug.sh 224
```

---

## Expected Behavior

### Logs Should Show:

```
Assessment 224 scores keys: ['traits', 'riasec_scores', 'big_five_scores']
Assessment 224 traits keys: ['riasec_fused', 'big5_fused', 'riasec_test', ...]
Assessment 224 RIASEC scores:
     R: 0.650
  👉 I: 0.850  ← Highest
     A: 0.550
     S: 0.700
     E: 0.600
     C: 0.500
🎯 Assessment 224 TOP INTEREST: I

Assessment 224: top_interest=I, AI-core returned 100 careers
Assessment 224: 95 careers after metadata join

📋 First 10 careers with tags:
  1. Chemist                                  | Tags: ['I'] | Score: 0.920
  2. Biologist                                | Tags: ['I', 'IR'] | Score: 0.910
  3. Physicist                                | Tags: ['I'] | Score: 0.905
  4. Research Scientist                       | Tags: ['I', 'IA'] | Score: 0.900
  5. Data Scientist                           | Tags: ['I', 'IC'] | Score: 0.895
  ...

Assessment 224: 5 careers after RIASEC filter (top_interest=I)

✅ Filtered careers (top_interest=I):
  1. Chemist                                  | Tags: ['I'] | Score: 0.920
  2. Biologist                                | Tags: ['I', 'IR'] | Score: 0.910
  3. Physicist                                | Tags: ['I'] | Score: 0.905
  4. Research Scientist                       | Tags: ['I', 'IA'] | Score: 0.900
  5. Data Scientist                           | Tags: ['I', 'IC'] | Score: 0.895
```

### If Something Goes Wrong:

#### Scenario 1: `top_interest=None`

```
Assessment 224 scores keys: ['riasec', 'big_five']  ← Missing 'traits'
❌ Failed to load traits.riasec_fused: KeyError 'traits'
🎯 Assessment 224 TOP INTEREST: None
```

**Fix:** Update `_load_traits_snapshot()` to read correct field

---

#### Scenario 2: All tags are `[]`

```
📋 First 10 careers with tags:
  1. Chemist                                  | Tags: [] | Score: 0.920
  2. Biologist                                | Tags: [] | Score: 0.910
  ...
❌ NO CAREERS MATCH top_interest=I!
```

**Fix:** Check `_load_career_meta()` query - join might be wrong

---

#### Scenario 3: Tags correct but filter returns `[]`

```
📋 First 10 careers with tags:
  1. Chemist                                  | Tags: ['I'] | Score: 0.920
  ...
❌ NO CAREERS MATCH top_interest=I!
   Available tags in first 10 careers:
     1. Tags: ['I']
     2. Tags: ['I', 'IR']
```

**Fix:** Check `_filter_by_top_interest()` - `startswith()` logic might be wrong

---

## Testing Checklist

### Unit Tests
- [x] `test_riasec_filter.py` - Logic tests pass

### Integration Tests
- [ ] `debug_tags.py` - Tags exist in DB
- [ ] `debug_scores.py` - Scores structure correct
- [ ] `test_assessment_rcm.py 224` - RCM returns correct careers

### Manual Tests
- [ ] Test với Top Interest = I (Investigative)
- [ ] Test với Top Interest = A (Artistic)
- [ ] Test với Top Interest = S (Social)
- [ ] Test với Top Interest = R (Realistic)
- [ ] Test với Top Interest = E (Enterprising)
- [ ] Test với Top Interest = C (Conventional)

### UI Tests
- [ ] Navigate to `/results/224`
- [ ] Check "Top Career Interest" in Summary tab
- [ ] Check "Career Matches" tab
- [ ] Verify all 5 careers have matching RIASEC badge

---

## Next Steps

1. **Run debug scripts** để xác định root cause:
   ```bash
   cd apps/backend
   ./run_debug.sh 224
   ```

2. **Check logs** để xem vấn đề ở đâu:
   - Scores structure?
   - Tags join?
   - Filter logic?
   - AI-core data?

3. **Apply fix** dựa trên root cause (xem `DEBUG_RIASEC_RCM.md`)

4. **Re-test** với 3 assessment khác nhau (I, A, S)

5. **Deploy** khi tất cả tests pass

---

## Files Changed

- ✅ `apps/backend/app/modules/recommendation/service.py` - Enhanced logging
- ✅ `apps/backend/debug_tags.py` - New debug script
- ✅ `apps/backend/debug_scores.py` - New debug script
- ✅ `apps/backend/test_assessment_rcm.py` - New test script
- ✅ `apps/backend/run_debug.sh` - New debug runner
- ✅ `doc/DEBUG_RIASEC_RCM.md` - New troubleshooting guide
- ✅ `doc/RIASEC_FIX_V2.md` - This document

---

## Success Criteria

✅ **PASS** if:
1. Logs show correct `top_interest` (matches FE display)
2. First 10 careers have diverse tags (not all `[]` or all `['R']`)
3. Filtered careers: 5/5 match `top_interest`
4. UI displays correct careers with matching badges

❌ **FAIL** if:
1. `top_interest=None` (scores structure issue)
2. All tags are `[]` (join issue)
3. Filter returns `[]` despite correct tags (logic issue)
4. AI-core doesn't return careers with target RIASEC (data issue)

---

## Contact

- Debug guide: `/doc/DEBUG_RIASEC_RCM.md`
- Quick test: `/doc/RIASEC_QUICK_TEST.md`
- Original fix: `/doc/FIX_RIASEC_FILTERING.md`
