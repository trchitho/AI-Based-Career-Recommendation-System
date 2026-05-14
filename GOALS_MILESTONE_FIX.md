# Career Goals Milestone Generation - 500 Error Fix

## Problem
The `/api/goals/{goal_id}/generate-milestones` endpoint was returning 500 Internal Server Error when trying to generate AI milestones.

## Root Cause
1. **Incorrect Gemini model names**: Models were prefixed with `models/` (e.g., `models/gemini-2.5-flash`) which is incorrect
2. **Poor error handling**: Errors were not being logged properly, making debugging difficult
3. **No fallback on AI failure**: If all Gemini models failed, the error was not caught properly

## Changes Made

### 1. Fixed Gemini Model Names
**File**: `apps/backend/app/modules/goals/routes_goals.py`

**Before**:
```python
return [
    "models/gemini-2.5-flash",       # ❌ Wrong format
    "models/gemini-flash-latest",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
]
```

**After**:
```python
return [
    "gemini-2.0-flash-exp",          # ✅ Correct format
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]
```

### 2. Enhanced Error Logging

Added comprehensive logging throughout the milestone generation process:

```python
# In _get_gemini_models()
logger.info("[Goals] Gemini API configured successfully")
logger.error("[Goals] GEMINI_API_KEY not found in environment")

# In _generate_with_fallback()
logger.info(f"[Goals] Trying model: {model_name}")
logger.info(f"[Goals] Success with model: {model_name}")
logger.warning(f"[Goals] Model {model_name} failed: {type(e).__name__}: {str(e)}")
logger.error(f"[Goals] All Gemini models failed. Last error: ...")

# In generate_ai_milestones()
logger.info(f"[Goals] Generating milestones for goal {goal_id}, target_months={target_months}")
logger.info(f"[Goals] AI response received, length={len(response_text)}")
logger.error(f"[Goals] AI milestone generation error for goal {goal_id}: {type(e).__name__}: {str(e)}")
```

### 3. Improved Error Handling

- Added `session.rollback()` on error to prevent database issues
- Better exception type logging (`type(e).__name__`)
- More descriptive error messages
- Proper fallback to `_create_fallback_milestones()` when AI fails

### 4. Better API Configuration Error Handling

```python
try:
    genai.configure(api_key=api_key)
    logger.info("[Goals] Gemini API configured successfully")
except Exception as e:
    logger.error(f"[Goals] Failed to configure Gemini API: {type(e).__name__}: {str(e)}")
    raise HTTPException(status_code=500, detail="AI service configuration failed")
```

## Testing

### 1. Check Backend Logs
After the fix, when you try to generate milestones, you should see logs like:

**Success case**:
```
INFO: [Goals] Gemini API configured successfully
INFO: [Goals] Generating milestones for goal 13, target_months=6
INFO: [Goals] Trying model: gemini-2.0-flash-exp
INFO: [Goals] Success with model: gemini-2.0-flash-exp
INFO: [Goals] AI response received, length=523
```

**Failure case (with fallback)**:
```
INFO: [Goals] Trying model: gemini-2.0-flash-exp
WARNING: [Goals] Model gemini-2.0-flash-exp failed: ResourceExhausted: Quota exceeded
INFO: [Goals] Trying model: gemini-1.5-flash
WARNING: [Goals] Model gemini-1.5-flash failed: ResourceExhausted: Quota exceeded
ERROR: [Goals] All Gemini models failed. Last error: ResourceExhausted: Quota exceeded
ERROR: [Goals] AI milestone generation error for goal 13: Exception: All Gemini models failed
INFO: Creating fallback milestones for career: Software Developer
```

### 2. Verify Fallback Works
Even if Gemini API fails, the endpoint should now return basic milestones instead of a 500 error.

### 3. Check GEMINI_API_KEY
Make sure your `.env` file has a valid Gemini API key:
```bash
GEMINI_API_KEY=your_api_key_here
```

## Common Issues and Solutions

### Issue 1: "AI service not configured"
**Cause**: `GEMINI_API_KEY` not set in environment
**Solution**: Add the key to `.env` file and restart backend

### Issue 2: "ResourceExhausted" or "Quota exceeded"
**Cause**: Gemini API quota limit reached
**Solution**: 
- Wait for quota to reset
- Use a different API key
- The system will automatically fall back to creating basic milestones

### Issue 3: "Invalid model name"
**Cause**: Model name format incorrect or model deprecated
**Solution**: The fix updates to use correct model names that are currently available

### Issue 4: Still getting 500 error
**Cause**: Different error not related to Gemini
**Solution**: Check backend logs for the specific error message with `[Goals]` prefix

## Files Modified

1. `apps/backend/app/modules/goals/routes_goals.py`
   - Fixed `_get_gemini_models()` - corrected model names and added error handling
   - Enhanced `_generate_with_fallback()` - better logging and error messages
   - Improved `generate_ai_milestones()` - added logging and rollback on error

## Verification Steps

1. **Restart Backend**:
   ```bash
   cd d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\backend
   # Stop current backend (Ctrl+C)
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Try Generating Milestones**:
   - Go to Career Goals page
   - Click "Generate AI Milestones" on a goal
   - Check browser console and backend logs

3. **Expected Behavior**:
   - ✅ Either AI milestones are generated successfully
   - ✅ OR fallback milestones are created (no 500 error)
   - ✅ Backend logs show detailed information about what happened

## Next Steps

If you still see 500 errors after this fix:
1. Share the complete backend log output (look for `[Goals]` prefix)
2. Check if `GEMINI_API_KEY` is set correctly
3. Verify the API key is valid and has quota remaining
