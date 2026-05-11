# Gamification Integration Guide

## Overview
Hệ thống gamification đã được setup với 3 bảng database và API endpoints để lưu/load game progress.

## Database Tables

### 1. `core.user_gamification_profiles`
Lưu profile gamification của user:
- `user_id`: ID của user
- `total_xp`: Tổng XP tích lũy
- `level`: Level hiện tại
- `created_at`, `updated_at`: Timestamps

### 2. `core.assessment_gamification_sessions`
Lưu mỗi session chơi game:
- `assessment_session_id`: Link đến assessment session
- `user_id`: ID của user
- `quiz_mode`: 'standard', 'game', hoặc 'legacy'
- `xp_earned`: XP kiếm được trong session này
- `questions_answered`: Số câu đã trả lời
- `extra_data`: JSON field lưu game state (grid, responses, score, etc.)
- `started_at`, `completed_at`: Timestamps

### 3. `core.user_achievements`
Lưu achievements của user:
- `user_id`: ID của user
- `achievement_type`: Loại achievement
- `achievement_name`: Tên achievement
- `achievement_description`: Mô tả
- `achievement_metadata`: JSON metadata
- `earned_at`: Timestamp

## API Endpoints

### Start Session
```typescript
POST /gamification/start-session
Body: {
  assessment_session_id: number,
  quiz_mode: 'game' | 'standard' | 'legacy'
}
Response: {
  gamification_session_id: number,
  quiz_mode: string,
  xp_earned: number
}
```

### Award XP
```typescript
POST /gamification/award-xp
Body: {
  gamification_session_id: number
}
Response: {
  xp_earned: number,
  total_xp: number,
  level: number,
  level_up: boolean,
  xp_for_next_level: number
}
```

### Complete Session
```typescript
POST /gamification/complete-session
Body: {
  gamification_session_id: number
}
Response: {
  session_xp: number,
  questions_answered: number,
  total_xp: number,
  level: number,
  quiz_mode: string
}
```

### Save Progress (NEW)
```typescript
POST /gamification/save-progress
Body: {
  gamification_session_id: number,
  extra_data: {
    currentIndex: number,
    xp: number,
    level: number,
    score: number,
    grid: any,
    responses: Array<[string, string | number]>,
    completedAnswers: any[],
    bombs: number,
    rockets: number,
    nuclear: number,
    combo: number,
    maxCombo: number,
    timestamp: number
  }
}
Response: {
  success: boolean,
  gamification_session_id: number,
  saved_at: string
}
```

### Load Progress (NEW)
```typescript
GET /gamification/load-progress/{gamification_session_id}
Response: {
  currentIndex: number,
  xp: number,
  level: number,
  score: number,
  grid: any,
  responses: Array<[string, string | number]>,
  // ... all saved data
}
```

### Get Profile
```typescript
GET /gamification/profile
Response: {
  user_id: number,
  total_xp: number,
  level: number,
  xp_for_next_level: number,
  created_at: string,
  updated_at: string
}
```

### Get Stats
```typescript
GET /gamification/stats
Response: {
  total_xp: number,
  level: number,
  xp_for_next_level: number,
  total_assessments: number,
  achievements: Array<{
    type: string,
    name: string,
    description: string,
    earned_at: string
  }>
}
```

## Frontend Integration

### 1. Import Service
```typescript
import gamificationService from '../services/gamificationService';
```

### 2. Start Session (khi bắt đầu game)
```typescript
const startGameSession = async (assessmentSessionId: number) => {
  try {
    const session = await gamificationService.startSession(
      assessmentSessionId,
      'game' // hoặc 'standard'
    );
    setGamificationSessionId(session.gamification_session_id);
  } catch (error) {
    console.error('Failed to start gamification session:', error);
  }
};
```

### 3. Award XP (sau mỗi câu trả lời)
```typescript
const handleAnswerQuestion = async () => {
  try {
    const result = await gamificationService.awardXP(gamificationSessionId);
    setXp(result.total_xp);
    setLevel(result.level);
    
    if (result.level_up) {
      // Show level up animation
      showLevelUpNotification();
    }
  } catch (error) {
    console.error('Failed to award XP:', error);
  }
};
```

### 4. Save Progress (khi user thoát)
```typescript
const saveProgress = async () => {
  try {
    await gamificationService.saveGameProgress({
      gamificationSessionId,
      currentIndex,
      xp,
      level,
      score,
      grid,
      responses: Array.from(responses.entries()),
      completedAnswers,
      bombs,
      rockets,
      nuclear,
      combo,
      maxCombo,
    });
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

### 5. Load Progress (khi vào lại game)
```typescript
const loadProgress = async (gamificationSessionId: number) => {
  try {
    const savedData = await gamificationService.loadGameProgress(gamificationSessionId);
    
    if (savedData) {
      setCurrentIndex(savedData.currentIndex || 0);
      setXp(savedData.xp || 0);
      setLevel(savedData.level || 1);
      setScore(savedData.score || 0);
      setGrid(savedData.grid || initialGrid);
      setResponses(new Map(savedData.responses || []));
      // ... restore other states
    }
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
};
```

### 6. Complete Session (khi hoàn thành assessment)
```typescript
const completeGameSession = async () => {
  try {
    const result = await gamificationService.completeSession(gamificationSessionId);
    // Show completion summary
    showCompletionSummary(result);
  } catch (error) {
    console.error('Failed to complete session:', error);
  }
};
```

## Migration from LocalStorage to Database

### Before (LocalStorage):
```typescript
localStorage.setItem('tetris_quiz_progress', JSON.stringify(data));
const saved = localStorage.getItem('tetris_quiz_progress');
```

### After (Database):
```typescript
await gamificationService.saveGameProgress(data);
const saved = await gamificationService.loadGameProgress(sessionId);
```

## Benefits

1. **Cross-device sync**: User có thể tiếp tục game trên device khác
2. **Persistent data**: Không bị mất khi clear browser cache
3. **Analytics**: Track được user behavior và game stats
4. **Achievements**: Có thể award achievements dựa trên game progress
5. **Leaderboard**: Có thể tạo leaderboard từ database

## Next Steps

1. Update TetrisQuizGame component để dùng gamificationService
2. Update PuzzleGameMode component để dùng gamificationService
3. Replace localStorage calls với database calls
4. Add error handling và loading states
5. Test save/load functionality
6. Add achievements system
7. Create leaderboard feature

## Notes

- `extra_data` field là JSON, có thể lưu bất kỳ data nào
- XP và level được tính tự động bởi backend
- Mỗi câu trả lời = 10 XP
- Mỗi level = 100 XP
- Session chỉ được complete 1 lần
