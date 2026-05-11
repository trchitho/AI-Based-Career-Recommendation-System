# 🎮 Quiz Game Architecture - Tetris-Style Puzzle Assessment

## 📋 Tổng Quan (Overview)

Hệ thống quiz game là một phần của Career Recommendation System, cho phép người dùng trả lời các câu hỏi đánh giá tính cách và sở thích nghề nghiệp thông qua một trò chơi xếp hình kiểu Tetris. Thay vì chọn đáp án truyền thống, người dùng kéo thả các khối hình Tetris chứa câu trả lời vào lưới để trả lời câu hỏi.

## 🏗️ Kiến Trúc Tổng Thể (System Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  AssessmentPage.tsx                                             │
│  ├─ Quiz Mode Selection (standard/game/legacy)                  │
│  ├─ TetrisQuizGame.tsx (Game Mode)                             │
│  ├─ PuzzleGameMode.tsx (Alternative Game Mode)                 │
│  └─ GameQuizMode.tsx (Legacy)                                   │
│                                                                  │
│  gamificationService.ts                                         │
│  └─ API calls to backend                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
├─────────────────────────────────────────────────────────────────┤
│  routes_gamification.py                                         │
│  ├─ POST /start-session                                         │
│  ├─ POST /save-progress                                         │
│  ├─ GET  /load-progress/{id}                                    │
│  └─ POST /complete-session                                      │
│                                                                  │
│  gamification_service.py                                        │
│  └─ Business logic for XP, levels, save/load                    │
│                                                                  │
│  gamification_models.py                                         │
│  └─ SQLAlchemy models                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ SQL
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────┤
│  core.user_gamification_profiles                                │
│  core.assessment_gamification_sessions                          │
│  core.user_achievements                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Luồng Dữ Liệu (Data Flow)

### 1. Khởi Động Game (Game Initialization)

```
User clicks "Game Mode" 
  → AssessmentPage loads questions from API
  → TetrisQuizGame component mounts
  → useEffect calls gamificationService.startSession()
  → Backend creates AssessmentGamificationSession record
  → Returns gamification_session_id
  → Frontend stores session ID in state
```


### 2. Chơi Game (Gameplay Loop)

```
User drags Tetris piece to grid
  → handleDrop() validates placement
  → Updates grid state with piece
  → Saves response to Map<questionId, answer>
  → Checks for completed rows/columns
  → Awards XP and updates score
  → Moves to next question
  → Repeats until all questions answered
```

### 3. Lưu Tiến Trình (Save Progress)

```
User clicks exit or browser back button
  → Exit confirmation dialog appears
  → User clicks "Có, lưu lại"
  → saveProgress() function called
  → Collects all game state:
     - currentIndex (current question)
     - responses (all answers)
     - grid (current board state)
     - xp, level, score
     - bombs, rockets, nuclear (power-ups)
     - combo, maxCombo
     - completedAnswers
  → gamificationService.saveGameProgress()
  → Backend saves to extra_data JSON field
  → Database commit
```

### 4. Tải Tiến Trình (Load Progress)

```
Component mounts with assessmentSessionId
  → initGamificationSession() runs
  → Calls gamificationService.loadGameProgress()
  → Backend queries AssessmentGamificationSession
  → Returns extra_data JSON
  → Frontend restores all state:
     - setCurrentIndex()
     - setResponses()
     - setGrid()
     - setXp(), setLevel(), setScore()
     - setPowerups()
  → User continues from where they left off
```

## 🗂️ Cấu Trúc File (File Structure)

### Frontend Files

```
apps/frontend/src/
├── pages/
│   └── AssessmentPage.tsx          # Main entry point, quiz mode selection
├── components/assessment/
│   ├── TetrisQuizGame.tsx          # Main Tetris game component (1502 lines)
│   ├── PuzzleGameMode.tsx          # Alternative puzzle game
│   ├── GameQuizMode.tsx            # Legacy game mode
│   ├── PuzzleGameIntro.tsx         # Intro screen for games
│   └── EnhancedAssessmentFlow.tsx  # Story-based assessment
└── services/
    └── gamificationService.ts      # API client for gamification
```

### Backend Files

```
apps/backend/app/modules/assessments/
├── routes_gamification.py          # API endpoints
├── gamification_service.py         # Business logic
└── gamification_models.py          # Database models
```

## 🎯 Component Chi Tiết: TetrisQuizGame.tsx

### State Management

```typescript
// Game State
const [grid, setGrid] = useState<(GridCell | null)[][]>()  // 12x11 grid
const [currentIndex, setCurrentIndex] = useState(0)         // Current question
const [responses, setResponses] = useState<Map>()           // User answers

// Gamification State
const [xp, setXp] = useState(0)                            // Experience points
const [level, setLevel] = useState(1)                       // Player level
const [score, setScore] = useState(0)                       // Game score
const [combo, setCombo] = useState(0)                       // Current combo
const [maxCombo, setMaxCombo] = useState(0)                 // Best combo

// Power-ups
const [bombs, setBombs] = useState(0)                       // 2x2 clear
const [rockets, setRockets] = useState(0)                   // 4x4 clear
const [nuclear, setNuclear] = useState(0)                   // Clear all (Easter egg)

// Session Management
const [gamificationSessionId, setGamificationSessionId] = useState<number | null>()
const [showExitConfirm, setShowExitConfirm] = useState(false)
```

### Key Functions

#### 1. **handleDrop(rowIndex, colIndex)**
- Validates piece placement using `canPlacePiece()`
- Updates grid with piece cells
- Saves response to Map
- Checks for completed rows/columns
- Awards XP and score
- Moves to next question

#### 2. **checkAndClearRows(currentGrid)**
- Scans all rows and columns
- Finds completed lines (all cells filled)
- Plays sound effect
- Increments combo counter
- Awards bonus XP (80 per line) and score (150 per line)
- Shows explosion animation
- Clears completed lines after 500ms
- Checks for Easter egg unlock (nuclear power at combo 3+)

#### 3. **saveProgress()**
- Collects all game state into object
- Tries database save first via `gamificationService.saveGameProgress()`
- Falls back to localStorage if database fails
- Logs all operations for debugging

#### 4. **loadProgressFromDatabase(sessionId)**
- Calls `gamificationService.loadGameProgress()`
- Receives saved state from backend
- Restores all state variables
- Reconstructs grid from saved data


### Game Mechanics

#### Grid System
- **Size**: 12 rows × 11 columns = 132 cells
- **Cell Size**: 50px × 50px
- **Background**: Black with grid pattern overlay
- **Cell States**: null (empty) or GridCell (filled)

#### Tetris Pieces
```typescript
PIECE_SHAPES = {
  I: 4 cells horizontal line (4×1)
  O: 2×2 square
  T: T-shape (3×2)
  L: L-shape (3×2)
  Z: Z-shape (3×2)
}
```

Each piece can be:
- **Rotated**: 0°, 90°, 180°, 270° (click rotate button or right-click)
- **Dragged**: Click and drag to grid
- **Previewed**: Shows green outline if valid, red if invalid

#### Scoring System
```typescript
// Base Points per Piece
I, O: 50 points
T, L: 60 points
Z: 70 points

// Line Clear Bonus
150 points per line cleared
80 XP per line cleared

// Combo System
Combo increments on each line clear
Resets to 0 when using power-ups
Max combo tracked for achievements

// Level System
Level up every 400 XP
Each level up awards: 2 bombs + 1 rocket
```

#### Power-ups
1. **Bomb (💣)**: Clears 2×2 area
2. **Rocket (🚀)**: Clears 4×4 area
3. **Nuclear (☢️)**: Clears entire grid (Easter egg)
   - Unlocked at combo 3 (first one)
   - Unlocked at combo 4 (second one)
   - Max 2 nuclear power-ups per game

## 🗄️ Database Schema

### Table: `core.assessment_gamification_sessions`

```sql
CREATE TABLE core.assessment_gamification_sessions (
    id BIGSERIAL PRIMARY KEY,
    assessment_session_id BIGINT NOT NULL,  -- Links to assessment
    user_id BIGINT NOT NULL,
    quiz_mode VARCHAR(50) NOT NULL,         -- 'standard', 'game', 'legacy'
    xp_earned INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    extra_data JSON                         -- Game progress stored here
);
```

### extra_data JSON Structure

```json
{
  "currentIndex": 5,
  "xp": 450,
  "level": 2,
  "score": 1200,
  "grid": [[null, {...}, null], ...],      // 12x11 array
  "responses": [["q1", "answer1"], ...],   // Array of [questionId, answer]
  "completedAnswers": [{...}, {...}],
  "bombs": 3,
  "rockets": 1,
  "nuclear": 0,
  "combo": 2,
  "maxCombo": 5,
  "timestamp": 1234567890
}
```

### Table: `core.user_gamification_profiles`

```sql
CREATE TABLE core.user_gamification_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table: `core.user_achievements`

```sql
CREATE TABLE core.user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description VARCHAR(500),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    achievement_metadata JSON
);
```

## 🔌 API Endpoints

### POST `/api/assessments/gamification/start-session`
**Request:**
```json
{
  "assessment_session_id": 123,
  "quiz_mode": "game"
}
```
**Response:**
```json
{
  "gamification_session_id": 456,
  "quiz_mode": "game",
  "xp_earned": 0
}
```

### POST `/api/assessments/gamification/save-progress`
**Request:**
```json
{
  "gamification_session_id": 456,
  "extra_data": {
    "currentIndex": 5,
    "xp": 450,
    "level": 2,
    "score": 1200,
    "grid": [...],
    "responses": [...],
    ...
  }
}
```
**Response:**
```json
{
  "success": true,
  "gamification_session_id": 456,
  "saved_at": "2024-01-15T10:30:00Z"
}
```

### GET `/api/assessments/gamification/load-progress/{id}`
**Response:**
```json
{
  "currentIndex": 5,
  "xp": 450,
  "level": 2,
  "score": 1200,
  "grid": [...],
  "responses": [...],
  ...
}
```

### POST `/api/assessments/gamification/complete-session`
**Request:**
```json
{
  "gamification_session_id": 456
}
```
**Response:**
```json
{
  "session_xp": 450,
  "questions_answered": 10,
  "total_xp": 1200,
  "level": 3,
  "quiz_mode": "game"
}
```


## 🎨 UI/UX Features

### Visual Design
- **Dark Theme**: Black grid with neon-colored pieces
- **Gradient Pieces**: Each Tetris shape has unique gradient colors
  - I: Cyan (from-cyan-500 to-cyan-700)
  - O: Yellow (from-yellow-500 to-yellow-700)
  - T: Purple (from-purple-500 to-purple-700)
  - L: Orange (from-orange-500 to-orange-700)
  - Z: Red (from-red-500 to-red-700)

### Animations
- **Line Clear**: Explosion effect (💥) with pulse animation
- **Power-up**: Larger explosion with sound effect
- **Combo**: Text color changes based on combo level
  - 0-2: Gray
  - 3-4: Orange
  - 5+: Red with pulse animation
- **Easter Egg**: Nuclear unlock notification slides in from top-right

### Sound Effects
- **Line Clear**: Rising pitch "pop" sound (400Hz → 800Hz)
- **Power-up**: Layered explosion sound (200Hz, 150Hz, 100Hz)
- Uses Web Audio API for real-time sound generation

### Exit Confirmation Dialog
```
┌─────────────────────────────────┐
│         💾 Lưu tiến trình?      │
│                                 │
│  Bạn có muốn lưu lại tiến trình │
│  hiện tại không?                │
│                                 │
│  [Có, lưu lại]                  │
│  [Không, reset kết quả]         │
│  [Tiếp tục chơi]                │
│                                 │
│  Tiến trình: 5/20 câu           │
│  XP: 450                        │
└─────────────────────────────────┘
```

### Victory Modal
Shows when all questions completed:
- Trophy animation
- Final stats: Score, Level, XP, Max Combo
- Special achievements badges
- "View My Analysis" button

## 🔄 State Persistence

### Two-Layer Approach

1. **Primary: Database (PostgreSQL)**
   - Persistent across devices
   - Requires authentication
   - Stored in `extra_data` JSON field
   - Survives browser close/refresh

2. **Fallback: localStorage**
   - Local to browser
   - No authentication needed
   - Key: `tetris_quiz_progress`
   - Used when database fails

### Save Triggers
- User clicks exit button
- Browser back button pressed
- Page close/refresh (beforeunload event)
- Automatic on state changes (debounced)

### Load Triggers
- Component mount with `assessmentSessionId`
- After successful session creation
- Automatic retry on failure

## 🐛 Debugging & Logging

### Console Logs
```typescript
// Session Management
'[TetrisQuizGame] Initializing gamification session...'
'[TetrisQuizGame] Session started:', session
'[TetrisQuizGame] Loading saved progress...'

// Save/Load Operations
'[TetrisQuizGame] Saving progress...', { sessionId, currentIndex, xp }
'[TetrisQuizGame] ✅ Progress saved to database'
'[TetrisQuizGame] ❌ Failed to save to database:', error

// Service Layer
'[GamificationService] Starting session:', { assessmentSessionId, quizMode }
'[GamificationService] ✅ Session started:', response.data
'[GamificationService] Saving progress:', { sessionId, currentIndex }
```

### Error Handling
```typescript
try {
  await gamificationService.saveGameProgress(...)
  console.log('✅ Progress saved to database')
} catch (error) {
  console.error('❌ Failed to save to database:', error)
  console.error('Error details:', error.response?.data || error.message)
  // Fallback to localStorage
  localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave))
  console.log('✅ Progress saved to localStorage')
}
```

## 🚀 Performance Optimizations

### Grid Rendering
- Uses CSS Grid for efficient layout
- Fixed cell sizes (50px) for consistent performance
- Minimal re-renders with React.memo potential

### State Updates
- Batched state updates in React 18
- Debounced auto-save (not implemented yet, but recommended)
- Lazy loading of questions

### Animation Performance
- CSS transforms for smooth animations
- GPU-accelerated properties (transform, opacity)
- RequestAnimationFrame for game loop (if needed)

## 🔐 Security Considerations

### Authentication
- All API calls require valid JWT token
- User ID extracted from token, not from request body
- Session ownership validated on backend

### Data Validation
- Backend validates all input data
- SQL injection prevented by SQLAlchemy ORM
- XSS prevented by React's automatic escaping

### Rate Limiting
- Should implement rate limiting on save endpoints
- Prevent spam saves (currently not implemented)

## 📝 Known Issues & Future Improvements

### Current Issues
1. **Foreign Key Constraint**: Fixed by removing FK constraints in models
2. **No Auto-Save**: Manual save only (should add debounced auto-save)
3. **No Offline Mode**: Requires internet connection

### Planned Improvements
1. **Auto-Save**: Debounced auto-save every 30 seconds
2. **Offline Support**: Service Worker + IndexedDB
3. **Multiplayer**: Real-time competition mode
4. **More Power-ups**: Time freeze, hint system
5. **Achievements**: More achievement types
6. **Leaderboard**: Global and friend leaderboards
7. **Mobile Optimization**: Touch controls, responsive grid


## 🧪 Testing Guide

### Manual Testing Checklist

#### Basic Gameplay
- [ ] Start game from AssessmentPage
- [ ] Questions load correctly
- [ ] Pieces can be dragged to grid
- [ ] Pieces can be rotated (button + right-click)
- [ ] Invalid placements show red preview
- [ ] Valid placements show green preview
- [ ] Pieces place correctly on drop
- [ ] Grid updates after placement
- [ ] Next question loads automatically

#### Line Clearing
- [ ] Complete a row → clears with animation
- [ ] Complete a column → clears with animation
- [ ] Multiple lines clear simultaneously
- [ ] Combo counter increments
- [ ] XP and score awarded correctly
- [ ] Sound effects play

#### Power-ups
- [ ] Bomb clears 2×2 area
- [ ] Rocket clears 4×4 area
- [ ] Nuclear clears entire grid
- [ ] Power-up count decrements after use
- [ ] Level up awards power-ups (2 bombs + 1 rocket)

#### Save/Load
- [ ] Exit button shows confirmation dialog
- [ ] "Có, lưu lại" saves progress
- [ ] "Không, reset kết quả" clears progress
- [ ] "Tiếp tục chơi" cancels exit
- [ ] Browser back button triggers confirmation
- [ ] Page refresh triggers confirmation
- [ ] Saved progress loads on return
- [ ] Grid state restored correctly
- [ ] All stats restored (XP, level, score, power-ups)

#### Database Verification
```sql
-- Check session created
SELECT * FROM core.assessment_gamification_sessions 
WHERE user_id = YOUR_USER_ID 
ORDER BY id DESC LIMIT 1;

-- Check extra_data saved
SELECT id, extra_data 
FROM core.assessment_gamification_sessions 
WHERE id = YOUR_SESSION_ID;

-- Check user profile updated
SELECT * FROM core.user_gamification_profiles 
WHERE user_id = YOUR_USER_ID;
```

### Automated Testing (Recommended)

```typescript
// Example Jest test
describe('TetrisQuizGame', () => {
  it('should save progress on exit', async () => {
    const { getByText } = render(<TetrisQuizGame {...props} />)
    
    // Simulate gameplay
    // ...
    
    // Click exit
    fireEvent.click(getByText('Cancel Assessment'))
    
    // Confirm save
    fireEvent.click(getByText('Có, lưu lại'))
    
    // Verify API called
    expect(gamificationService.saveGameProgress).toHaveBeenCalled()
  })
})
```

## 📚 Code Examples

### Starting a Game Session

```typescript
// In TetrisQuizGame.tsx
useEffect(() => {
  const initGamificationSession = async () => {
    if (assessmentSessionId && !gamificationSessionId) {
      try {
        const session = await gamificationService.startSession(
          assessmentSessionId, 
          'game'
        )
        setGamificationSessionId(session.gamification_session_id)
        await loadProgressFromDatabase(session.gamification_session_id)
      } catch (error) {
        console.error('Failed to start session:', error)
        loadProgressFromLocalStorage()
      }
    }
  }
  
  initGamificationSession()
}, [assessmentSessionId])
```

### Saving Game Progress

```typescript
const saveProgress = async () => {
  const dataToSave = {
    currentIndex,
    responses: Array.from(responses.entries()),
    completedAnswers,
    xp,
    level,
    score,
    bombs,
    rockets,
    nuclear,
    combo,
    maxCombo,
    grid,
    timestamp: Date.now(),
  }

  if (gamificationSessionId) {
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
      })
      console.log('✅ Progress saved to database')
      return
    } catch (error) {
      console.error('❌ Failed to save to database:', error)
    }
  }

  // Fallback to localStorage
  localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave))
  console.log('✅ Progress saved to localStorage')
}
```

### Loading Game Progress

```typescript
const loadProgressFromDatabase = async (sessionId: number) => {
  setIsLoadingProgress(true)
  try {
    const savedData = await gamificationService.loadGameProgress(sessionId)
    
    if (savedData && Object.keys(savedData).length > 0) {
      setCurrentIndex(savedData.currentIndex || 0)
      setResponses(new Map(savedData.responses || []))
      setCompletedAnswers(savedData.completedAnswers || [])
      setXp(savedData.xp || 0)
      setLevel(savedData.level || 1)
      setScore(savedData.score || 0)
      setBombs(savedData.bombs || 0)
      setRockets(savedData.rockets || 0)
      setNuclear(savedData.nuclear || 0)
      setCombo(savedData.combo || 0)
      setMaxCombo(savedData.maxCombo || 0)
      
      if (savedData.grid) {
        setGrid(savedData.grid)
      }
    }
  } catch (error) {
    console.error('Failed to load progress:', error)
  } finally {
    setIsLoadingProgress(false)
  }
}
```

## 🎓 Learning Resources

### Technologies Used
- **React 18**: Component framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Web Audio API**: Sound effects
- **FastAPI**: Backend framework
- **SQLAlchemy**: ORM
- **PostgreSQL**: Database

### Key Concepts
- **Drag and Drop API**: HTML5 drag events
- **State Management**: React hooks (useState, useEffect)
- **Grid Systems**: CSS Grid for layout
- **JSON Storage**: Flexible data persistence
- **RESTful API**: HTTP methods and status codes

### Related Documentation
- [React DnD](https://react-dnd.github.io/react-dnd/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Progress not saving to database
- **Check**: Backend server running?
- **Check**: Valid authentication token?
- **Check**: Database connection working?
- **Check**: Console logs for error messages
- **Solution**: Check backend logs, verify database tables exist

**Issue**: Grid not rendering correctly
- **Check**: Browser console for errors
- **Check**: Grid dimensions (12×11)
- **Check**: Cell size (50px)
- **Solution**: Clear browser cache, check CSS

**Issue**: Pieces not dropping
- **Check**: Drag events firing?
- **Check**: canPlacePiece() validation
- **Check**: Grid state not null
- **Solution**: Check browser console, verify piece coordinates

### Debug Commands

```bash
# Check backend logs
cd apps/backend
tail -f logs/app.log

# Check database
psql -U postgres -d career_db
\dt core.*
SELECT * FROM core.assessment_gamification_sessions;

# Check frontend console
# Open browser DevTools → Console tab
# Look for [TetrisQuizGame] and [GamificationService] logs
```

---

## 📄 Document Version

- **Version**: 1.0
- **Last Updated**: 2024-01-15
- **Author**: AI Assistant
- **Status**: Complete

---

**Tài liệu này mô tả chi tiết kiến trúc, luồng dữ liệu, và cách hoạt động của Quiz Game (Tetris-style puzzle assessment). Sử dụng tài liệu này để hiểu rõ hệ thống, debug issues, và phát triển tính năng mới.**
