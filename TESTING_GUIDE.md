# Testing Guide - Gamification System

## ✅ What's Been Fixed

1. **Database Models**: Removed foreign key constraints that were causing errors
2. **API Routes**: Fixed route signatures to match service methods
3. **Frontend Service**: Updated API paths to use correct endpoints
4. **Test Scripts**: Created verification scripts to test database operations

## 🧪 Testing Steps

### Step 1: Verify Database Connection

Open a terminal in `apps/backend` and run:
```bash
python verify_data.py
```

Expected output:
```
✅ Total records in assessment_gamification_sessions: 1
```

### Step 2: Start Backend Server

In terminal 1:
```bash
cd D:\Project\AI-Based-Career-Recommendation-System\apps\backend
python -m uvicorn app.main:app --reload
```

Wait for:
```
✅ Gamification router registered
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Start Frontend Server

In terminal 2:
```bash
cd D:\Project\AI-Based-Career-Recommendation-System\apps\frontend
npm run dev
```

Wait for:
```
VITE ready in XXX ms
Local: http://localhost:3000/
```

### Step 4: Test in Browser

1. Open browser to `http://localhost:3000`
2. Login with your account
3. Navigate to Assessment page
4. Select "Puzzle Game" mode
5. Start playing the game

### Step 5: Test Save Functionality

#### Test Exit Save:
1. While playing, click the browser back button
2. You should see dialog: "Lưu tiến trình?"
3. Click "Có, lưu lại" (Yes, save)
4. Check browser console (F12) for logs:
   ```
   [GamificationService] Saving progress: {...}
   [GamificationService] ✅ Progress saved: {...}
   ```

#### Test Page Refresh:
1. While playing, press F5 or Ctrl+R
2. You should see the save dialog
3. Click "Có, lưu lại"

### Step 6: Verify Data in Database

Open pgAdmin and run:
```sql
SELECT 
    id,
    user_id,
    quiz_mode,
    xp_earned,
    questions_answered,
    started_at,
    extra_data
FROM core.assessment_gamification_sessions
ORDER BY id DESC
LIMIT 5;
```

You should see:
- New records with your `user_id`
- `quiz_mode` = 'game'
- `extra_data` containing game state (grid, responses, bombs, etc.)

### Step 7: Test Load Functionality

1. After saving, navigate back to the assessment
2. Start the game again
3. The game should load your previous progress
4. Check console for:
   ```
   [GamificationService] Loading progress...
   [TetrisQuizGame] Loaded progress: {...}
   ```

## 🔍 Debugging

### Check Backend Logs

In the backend terminal, look for:
```
[gamification] save_progress error: ...
[gamification] load_progress error: ...
```

### Check Frontend Console

Press F12 in browser and look for:
```
[GamificationService] ❌ Failed to save progress: ...
[TetrisQuizGame] ❌ Failed to save to database: ...
```

### Check Database Connection

Run this in backend terminal:
```bash
python -c "from app.core.db import SessionLocal; db = SessionLocal(); print('✅ Database connected'); db.close()"
```

### Common Issues

#### Issue: "401 Unauthorized"
**Solution**: Make sure you're logged in. Check that the JWT token is in localStorage.

#### Issue: "404 Not Found"
**Solution**: Verify the API paths are correct. Should be `/api/assessments/gamification/...`

#### Issue: "500 Internal Server Error"
**Solution**: Check backend logs for detailed error message.

#### Issue: Data not saving
**Solution**: 
1. Check backend is running
2. Check database connection
3. Check browser console for errors
4. Run `python verify_data.py` to test direct database access

## 📊 Expected Behavior

### When User Exits:
1. Dialog appears: "Lưu tiến trình?"
2. Three options:
   - "Có, lưu lại" → Save and exit
   - "Không, reset kết quả" → Clear and exit
   - "Tiếp tục chơi" → Cancel and continue

### When User Saves:
1. Frontend calls `/api/assessments/gamification/save-progress`
2. Backend saves to `core.assessment_gamification_sessions.extra_data`
3. Success message in console
4. User is redirected

### When User Returns:
1. Frontend calls `/api/assessments/gamification/load-progress/{id}`
2. Backend returns saved game state
3. Game restores: grid, responses, XP, level, power-ups, combo
4. User can continue playing

## ✅ Success Criteria

- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can login and navigate to assessment
- [ ] Can start Puzzle Game mode
- [ ] Exit dialog appears when trying to leave
- [ ] Save button works (no errors in console)
- [ ] Data appears in database table
- [ ] Can load saved progress when returning
- [ ] Game state is fully restored (grid, responses, power-ups)

## 🎯 Next Steps

After confirming everything works:
1. Test with multiple users
2. Test with different game modes
3. Add error handling for network failures
4. Add loading indicators during save/load
5. Add success/error notifications to UI
