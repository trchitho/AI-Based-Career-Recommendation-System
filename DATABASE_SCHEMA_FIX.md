# Database Schema Fix - Assessment Questions

## Problem
The backend was failing with this error:
```
column assessment_questions.prompt does not exist
HINT: Perhaps you meant to reference the column "assessment_questions.prompt_en" or the column "assessment_questions.prompt_vi".
```

## Root Cause
The database schema was updated to use separate columns for English and Vietnamese prompts:
- Old: `prompt` (single column)
- New: `prompt_en` and `prompt_vi` (separate columns)

But the backend model was still trying to use the old `prompt` column.

## Solution Applied
Updated the `AssessmentQuestion` model in `apps/backend/app/modules/assessments/models.py`:

### Changes Made:
1. **Column Definitions** - Changed from:
   ```python
   prompt = Column(Text, nullable=True)
   ```
   To:
   ```python
   prompt_en = Column(Text, nullable=True)
   prompt_vi = Column(Text, nullable=True)
   ```

2. **to_client() Method** - Updated to use Vietnamese prompts by default:
   ```python
   def to_client(self) -> dict:
       # ... existing code ...
       
       # Use Vietnamese prompt by default, fallback to English
       question_text = self.prompt_vi or self.prompt_en or ""
       
       return {
           "id": str(self.id),
           "test_type": None,
           "question_text": question_text,  # Now uses Vietnamese
           # ... rest of fields ...
       }
   ```

## Question Count Update
**Changed from 44 questions to 33 questions** for both games:

### Frontend Changes:
1. **assessmentService.ts**: Changed `per_dim` from 4 to 3
   - RIASEC: 6 dimensions × 3 = 18 questions
   - Big Five: 5 dimensions × 3 = 15 questions
   - Total: 33 questions

2. **StoryBasedAssessment.tsx**: 
   - Updated slice from 44 to 33
   - Changed essay scenario from "45 of 45" to "34 of 34"

### Distribution:
- Each of 11 dimensions (6 RIASEC + 5 Big Five) gets 3 questions
- Total: 33 questions (down from 44)

## Next Steps
**IMPORTANT:** You need to restart the backend server for these changes to take effect:

1. Stop the backend server if it's running (Ctrl+C)
2. Start it again:
   ```bash
   cd apps/backend
   uvicorn app.main:app --reload --port 8000
   ```

## Verification
After restarting the backend:
1. ✅ The error should disappear
2. ✅ Questions should load correctly in Vietnamese
3. ✅ Both games should show 33 questions total
4. ✅ The RIASEC and BIG_FIVE assessments should work properly

## Database Status
- ✅ Database schema is correct (has `prompt_en` and `prompt_vi` columns)
- ✅ Backend model is updated
- ✅ Frontend updated to use 33 questions
- ⏳ Backend server needs restart to apply changes

## Question Count in Database
Current database has:
- RIASEC288: 288 questions (48 per dimension)
- BIG5_240: 240 questions (48 per dimension)
- Total: 528 questions available

API now returns:
- RIASEC: 18 questions (3 per dimension)
- Big Five: 15 questions (3 per dimension)
- **Total: 33 questions per assessment**
