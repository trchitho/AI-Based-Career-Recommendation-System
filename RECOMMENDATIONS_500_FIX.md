# Career Recommendations 500 Error - Fix

## Problem
The `/api/recommendations?assessment_id=417&top_k=5` endpoint is returning 500 Internal Server Error when trying to load career recommendations after CV upload.

## Root Cause Analysis

The recommendations endpoint depends on the **AI-core service** (`http://localhost:9000`) to generate career recommendations. The 500 error occurs when:

1. AI-core service is not running or not reachable
2. AI-core returns an error or invalid response
3. No saved recommendations exist as fallback
4. Poor error handling causes unhandled exceptions

## Changes Made

### 1. Enhanced Logging in `get_main_recommendations()`

**File**: `apps/backend/app/modules/recommendation/service.py`

Added comprehensive logging to track the recommendation flow:

```python
logger.info(f"[Recommendations] Getting recommendations for assessment {assessment_id}, user {user_id}, top_k={top_k}")
logger.debug(f"[Recommendations] Calling AI-core for assessment {assessment_id}")
logger.debug(f"[Recommendations] AI-core returned {len(scored)} items")
logger.warning(f"[Recommendations] AI-core returned no results, trying saved recommendations")
logger.info(f"[Recommendations] Returning {len(saved_items)} saved recommendations")
logger.error(f"[Recommendations] No recommendations available for assessment {assessment_id}")
```

### 2. Improved Error Handling in `_call_ai_core_top_careers()`

Added specific exception handling for different failure modes:

```python
try:
    with httpx.Client(timeout=5.0) as client:
        resp = client.post(url, json=payload)
    # ... process response
except httpx.TimeoutException as e:
    logger.error(f"[Recommendations] AI-core timeout: {str(e)}")
    return []
except httpx.ConnectError as e:
    logger.error(f"[Recommendations] AI-core not reachable: {str(e)}")
    return []
except Exception as e:
    logger.error(f"[Recommendations] AI-core unexpected error: {type(e).__name__}: {str(e)}")
    return []
```

### 3. Better Fallback Handling

Wrapped saved recommendations fallback in try-except:

```python
try:
    saved_items = self._get_saved_recommendations_from_db(db, assessment_id, top_k)
    if saved_items:
        logger.info(f"[Recommendations] Returning {len(saved_items)} saved recommendations")
        return {"request_id": None, "items": saved_items}
except Exception as e:
    logger.error(f"[Recommendations] Failed to get saved recommendations: {type(e).__name__}: {str(e)}")
```

### 4. Graceful Empty Response

When all sources fail, return empty list instead of raising exception:

```python
logger.error(f"[Recommendations] No recommendations available for assessment {assessment_id}")
return {"request_id": None, "items": []}
```

## Expected Log Output

### Success Case (AI-core working):
```
INFO: [Recommendations] Getting recommendations for assessment 417, user 74, top_k=5
INFO: [Recommendations] Calling AI-core: http://localhost:9000/recs/top_careers with assessment_id=417, top_k=100
INFO: [Recommendations] AI-core response status: 200
INFO: [Recommendations] AI-core returned 50 career recommendations
INFO: [Recommendations] Processed 50 valid career recommendations
```

### Fallback Case (AI-core down, using saved):
```
INFO: [Recommendations] Getting recommendations for assessment 417, user 74, top_k=5
INFO: [Recommendations] Calling AI-core: http://localhost:9000/recs/top_careers
ERROR: [Recommendations] AI-core not reachable: Connection refused
WARNING: [Recommendations] AI-core returned no results, trying saved recommendations for assessment 417
INFO: [Recommendations] Returning 5 saved recommendations
```

### Empty Case (no recommendations available):
```
INFO: [Recommendations] Getting recommendations for assessment 417, user 74, top_k=5
ERROR: [Recommendations] AI-core not reachable: Connection refused
WARNING: [Recommendations] AI-core returned no results, trying saved recommendations for assessment 417
WARNING: [Recommendations] No saved recommendations found for assessment 417
ERROR: [Recommendations] No recommendations available for assessment 417
```

## Troubleshooting

### Issue 1: AI-core not running

**Symptoms**:
```
ERROR: [Recommendations] AI-core not reachable: Connection refused
```

**Solution**:
Start the AI-core service:
```bash
cd d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\ai-core
python -m uvicorn main:app --reload --port 9000
```

### Issue 2: AI-core returns error

**Symptoms**:
```
ERROR: [Recommendations] AI-core error 500: Internal Server Error
```

**Solution**:
Check AI-core logs for the specific error. Common issues:
- Database connection problems
- Missing assessment data
- Model loading failures

### Issue 3: No saved recommendations

**Symptoms**:
```
WARNING: [Recommendations] No saved recommendations found for assessment 417
ERROR: [Recommendations] No recommendations available
```

**Solution**:
This is expected for new assessments. The system will:
1. Return empty list (no 500 error)
2. Save recommendations after first successful AI-core call
3. Use saved recommendations as fallback in future

### Issue 4: Still getting 500 error

**Symptoms**:
Backend logs show an unhandled exception

**Solution**:
1. Check backend logs for the specific error with `[Recommendations]` prefix
2. Verify AI_CORE_BASE_URL in `.env` file:
   ```
   AI_CORE_BASE_URL=http://localhost:9000
   ```
3. Test AI-core endpoint manually:
   ```bash
   curl -X POST http://localhost:9000/recs/top_careers \
     -H "Content-Type: application/json" \
     -d '{"assessment_id": 417, "top_k": 5}'
   ```

## Files Modified

1. `apps/backend/app/modules/recommendation/service.py`
   - Enhanced `get_main_recommendations()` with better logging and error handling
   - Improved `_call_ai_core_top_careers()` with specific exception handling
   - Added try-except around saved recommendations fallback

## Verification Steps

1. **Restart Backend**:
   ```bash
   cd d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\backend
   # Stop current backend (Ctrl+C)
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Check AI-core Status**:
   ```bash
   curl http://localhost:9000/health
   ```
   If this fails, start AI-core service.

3. **Try Loading Recommendations**:
   - Upload a CV or complete an assessment
   - Check backend logs for `[Recommendations]` messages
   - Verify either AI-core recommendations or saved recommendations are returned

4. **Expected Behavior**:
   - ✅ If AI-core is running: Get fresh recommendations
   - ✅ If AI-core is down: Get saved recommendations (if available)
   - ✅ If no recommendations: Return empty list (no 500 error)
   - ✅ Backend logs show detailed information about what happened

## Next Steps

If you still see 500 errors after this fix:
1. Share the complete backend log output (look for `[Recommendations]` prefix)
2. Check if AI-core service is running on port 9000
3. Verify the AI_CORE_BASE_URL environment variable
4. Test the AI-core endpoint directly with curl

## Related Services

- **Backend API**: Port 8000 (FastAPI)
- **AI-core Service**: Port 9000 (FastAPI) - Handles ML recommendations
- **Frontend**: Port 5173 (Vite/React)

Make sure all three services are running for full functionality.
