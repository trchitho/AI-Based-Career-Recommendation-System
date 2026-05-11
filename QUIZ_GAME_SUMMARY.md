# 🎮 Quiz Game - Tóm Tắt Nhanh

## 📌 Tổng Quan 1 Phút

**Quiz Game** là một trò chơi xếp hình kiểu Tetris được tích hợp vào hệ thống đánh giá nghề nghiệp. Người dùng trả lời câu hỏi bằng cách kéo thả các khối Tetris chứa đáp án vào lưới 12×11 ô.

## 🎯 Mục Đích

- Làm cho việc trả lời câu hỏi đánh giá trở nên thú vị hơn
- Tăng engagement và completion rate
- Gamification: XP, levels, power-ups, achievements
- Lưu tiến trình để người dùng có thể tiếp tục sau

## 🏗️ Kiến Trúc 3 Tầng

```
Frontend (React/TypeScript)
    ↓ REST API
Backend (FastAPI/Python)
    ↓ SQL
Database (PostgreSQL)
```

## 📂 Files Chính

### Frontend
- `AssessmentPage.tsx` - Entry point, quiz mode selection
- `TetrisQuizGame.tsx` - Main game component (1502 lines)
- `gamificationService.ts` - API client

### Backend
- `routes_gamification.py` - API endpoints
- `gamification_service.py` - Business logic
- `gamification_models.py` - Database models

## 🗄️ Database Tables

1. **`core.assessment_gamification_sessions`**
   - Lưu session game của mỗi lần chơi
   - Field `extra_data` (JSON) chứa toàn bộ game state

2. **`core.user_gamification_profiles`**
   - Lưu tổng XP và level của user

3. **`core.user_achievements`**
   - Lưu các achievement đã unlock

## 🎮 Game Mechanics

### Grid
- **Kích thước**: 12 rows × 11 columns = 132 cells
- **Cell size**: 50px × 50px
- **Background**: Đen với grid pattern

### Tetris Pieces
- **5 shapes**: I (line), O (square), T, L, Z
- **Rotation**: 0°, 90°, 180°, 270°
- **Colors**: Mỗi shape có gradient riêng

### Scoring
- **Base points**: 50-70 per piece
- **Line clear**: +150 points, +80 XP
- **Combo**: Tăng khi clear nhiều line liên tiếp
- **Level up**: Mỗi 400 XP

### Power-ups
- **Bomb (💣)**: Clear 2×2 area
- **Rocket (🚀)**: Clear 4×4 area
- **Nuclear (☢️)**: Clear toàn bộ grid (Easter egg)

## 🔄 Luồng Hoạt Động

### 1. Khởi Động
```
User clicks "Game Mode"
→ Load questions from API
→ Create gamification session
→ Try load saved progress
→ Start game
```

### 2. Chơi Game
```
Display question
→ User drags piece to grid
→ Validate placement
→ Update grid & save response
→ Check for completed lines
→ Award XP & score
→ Next question
```

### 3. Lưu Tiến Trình
```
User clicks exit
→ Show confirmation dialog
→ Collect all game state
→ Save to database (extra_data JSON)
→ Fallback to localStorage if fails
```

### 4. Tải Tiến Trình
```
User returns to game
→ Load from database
→ Restore all state
→ Continue from saved position
```

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/gamification/start-session` | Tạo session mới |
| POST | `/gamification/save-progress` | Lưu tiến trình |
| GET | `/gamification/load-progress/{id}` | Tải tiến trình |
| POST | `/gamification/complete-session` | Hoàn thành game |

## 💾 Data Saved

```json
{
  "currentIndex": 5,
  "xp": 450,
  "level": 2,
  "score": 1200,
  "grid": [[null, {...}, null], ...],
  "responses": [["q1", "answer1"], ...],
  "completedAnswers": [{...}, {...}],
  "bombs": 3,
  "rockets": 1,
  "nuclear": 0,
  "combo": 2,
  "maxCombo": 5,
  "timestamp": 1234567890
}
```

## 🎨 UI Features

- **Dark theme** với neon colors
- **Animations**: Line clear, power-up explosions
- **Sound effects**: Web Audio API
- **Exit confirmation**: 3 options (Save/Don't Save/Continue)
- **Victory modal**: Stats & achievements

## 🐛 Debugging

### Console Logs
```
[TetrisQuizGame] Initializing...
[TetrisQuizGame] ✅ Progress saved to database
[GamificationService] Starting session...
```

### Database Check
```sql
SELECT * FROM core.assessment_gamification_sessions 
WHERE user_id = YOUR_USER_ID 
ORDER BY id DESC LIMIT 1;
```

## ⚠️ Known Issues

1. ~~Foreign key constraint error~~ ✅ Fixed (removed FK)
2. No auto-save (manual only)
3. No offline mode

## 🚀 Future Improvements

- [ ] Auto-save every 30 seconds
- [ ] Offline support (Service Worker)
- [ ] Multiplayer mode
- [ ] More power-ups
- [ ] Leaderboard
- [ ] Mobile optimization

## 📚 Tài Liệu Chi Tiết

- **`QUIZ_GAME_ARCHITECTURE.md`** - Kiến trúc chi tiết, API, database schema
- **`QUIZ_GAME_FLOW_DIAGRAM.md`** - Sơ đồ luồng hoạt động
- **`GAMIFICATION_IMPLEMENTATION_SUMMARY.md`** - Implementation summary

## 🔗 Related Components

- `PuzzleGameMode.tsx` - Alternative puzzle game
- `GameQuizMode.tsx` - Legacy game mode
- `EnhancedAssessmentFlow.tsx` - Story-based assessment

---

**Tài liệu này cung cấp overview nhanh về Quiz Game. Xem các file khác để biết chi tiết.**
