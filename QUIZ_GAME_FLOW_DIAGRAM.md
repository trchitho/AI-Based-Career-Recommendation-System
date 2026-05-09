# 🎮 Quiz Game - Sơ Đồ Luồng Chi Tiết

## 1. Luồng Khởi Động Game (Game Initialization Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                                 │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    User clicks "Game Mode" button
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AssessmentPage.tsx                              │
├─────────────────────────────────────────────────────────────────────┤
│  1. Load questions from API                                         │
│     GET /api/assessments/questions?type=RIASEC                      │
│     GET /api/assessments/questions?type=BIGFIVE                     │
│                                                                      │
│  2. Combine questions: [...riasecQuestions, ...bigFiveQuestions]   │
│                                                                      │
│  3. Navigate to TetrisQuizGame component                            │
│     <TetrisQuizGame                                                 │
│       questions={questions}                                         │
│       assessmentSessionId={sessionId}                               │
│       onComplete={handleComplete}                                   │
│     />                                                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TetrisQuizGame.tsx - Mount                        │
├─────────────────────────────────────────────────────────────────────┤
│  useEffect(() => {                                                  │
│    initGamificationSession()                                        │
│  }, [assessmentSessionId])                                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  gamificationService.ts                              │
├─────────────────────────────────────────────────────────────────────┤
│  POST /api/assessments/gamification/start-session                   │
│  Body: {                                                            │
│    assessment_session_id: 123,                                      │
│    quiz_mode: "game"                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Backend: routes_gamification.py                         │
├─────────────────────────────────────────────────────────────────────┤
│  @router.post("/start-session")                                     │
│  def start_gamification_session():                                  │
│    1. Extract user_id from JWT token                                │
│    2. Call GamificationService.start_gamification_session()         │
│    3. Create AssessmentGamificationSession record                   │
│    4. Return session ID                                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database: PostgreSQL                              │
├─────────────────────────────────────────────────────────────────────┤
│  INSERT INTO core.assessment_gamification_sessions                  │
│  (assessment_session_id, user_id, quiz_mode, xp_earned,            │
│   questions_answered, started_at)                                   │
│  VALUES (123, 456, 'game', 0, 0, NOW())                             │
│  RETURNING id;                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Response to Frontend                                    │
├─────────────────────────────────────────────────────────────────────┤
│  {                                                                  │
│    "gamification_session_id": 789,                                  │
│    "quiz_mode": "game",                                             │
│    "xp_earned": 0                                                   │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TetrisQuizGame.tsx - State Update                       │
├─────────────────────────────────────────────────────────────────────┤
│  setGamificationSessionId(789)                                      │
│  loadProgressFromDatabase(789)  // Try to load saved progress       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                          GAME READY TO PLAY
```

## 2. Luồng Chơi Game (Gameplay Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GAME LOOP - Each Question                         │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │  Display Question                                        │
    │  - Question text                                         │
    │  - Question type (RIASEC/BIGFIVE)                       │
    │  - Progress indicator (5/20)                            │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Generate Answer Pieces                                  │
    │  - For SCALE: 5 pieces (1-5 with emojis)                │
    │  - For MULTIPLE_CHOICE: N pieces (options)              │
    │  - Each piece has random Tetris shape (I/O/T/L/Z)       │
    │  - Each shape has unique color gradient                 │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │  User Interaction                                        │
    │  1. User clicks rotate button (or right-click)          │
    │  2. User drags piece to grid                            │
    │  3. Preview shows (green=valid, red=invalid)            │
    │  4. User drops piece                                    │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │  handleDrop(rowIndex, colIndex)                         │
    │  ├─ Validate placement: canPlacePiece()                 │
    │  │  ├─ Check bounds (0-11 cols, 0-11 rows)             │
    │  │  ├─ Check rotation (0°/90°/180°/270°)               │
    │  │  └─ Check cells empty                                │
    │  │                                                       │
    │  ├─ If valid:                                           │
    │  │  ├─ Update grid with piece cells                     │
    │  │  ├─ Save response: Map.set(questionId, answer)       │
    │  │  ├─ Award base XP (50-70 based on shape)            │
    │  │  ├─ Update score                                     │
    │  │  └─ Call checkAndClearRows()                         │
    │  │                                                       │
    │  └─ If invalid:                                         │
    │     └─ Reject drop, piece returns to origin             │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │  checkAndClearRows(grid)                                │
    │  ├─ Scan all rows (0-11)                                │
    │  │  └─ If all cells filled → add to completedRows[]    │
    │  │                                                       │
    │  ├─ Scan all columns (0-10)                             │
    │  │  └─ If all cells filled → add to completedCols[]    │
    │  │                                                       │
    │  ├─ If any lines completed:                             │
    │  │  ├─ Play sound effect (playLineClearSound)           │
    │  │  ├─ Increment combo counter                          │
    │  │  ├─ Award bonus: 150 points + 80 XP per line        │
    │  │  ├─ Show explosion animation (💥)                    │
    │  │  ├─ Check Easter egg unlock (combo ≥ 3)             │
    │  │  └─ Clear lines after 500ms                          │
    │  │                                                       │
    │  └─ Update grid state                                   │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Level Up Check                                          │
    │  - Every 400 XP → Level up                              │
    │  - Award power-ups: 2 bombs + 1 rocket                  │
    │  - Show level up animation                              │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Move to Next Question                                   │
    │  - currentIndex++                                        │
    │  - Reset piece rotations                                │
    │  - Generate new pieces                                  │
    │  - If last question → Show Victory Modal                │
    └─────────────────────────────────────────────────────────┘
                            │
                            ▼
                    REPEAT UNTIL ALL QUESTIONS ANSWERED
```


## 3. Luồng Lưu Tiến Trình (Save Progress Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SAVE TRIGGERS                                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. User clicks exit button                                         │
│  2. Browser back button pressed                                     │
│  3. Page close/refresh (beforeunload)                               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Show Exit Confirmation Dialog                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐         │
│  │  💾 Lưu tiến trình?                                   │         │
│  │                                                        │         │
│  │  Bạn có muốn lưu lại tiến trình hiện tại không?      │         │
│  │                                                        │         │
│  │  ┌──────────────────────────────────────────┐        │         │
│  │  │  [Có, lưu lại]                           │        │         │
│  │  └──────────────────────────────────────────┘        │         │
│  │  ┌──────────────────────────────────────────┐        │         │
│  │  │  [Không, reset kết quả]                  │        │         │
│  │  └──────────────────────────────────────────┘        │         │
│  │  ┌──────────────────────────────────────────┐        │         │
│  │  │  [Tiếp tục chơi]                         │        │         │
│  │  └──────────────────────────────────────────┘        │         │
│  │                                                        │         │
│  │  Tiến trình: 5/20 câu                                │         │
│  │  XP: 450                                              │         │
│  └───────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                    │                │                │
        ┌───────────┘                │                └───────────┐
        ▼                            ▼                            ▼
   [Có, lưu lại]            [Không, reset]              [Tiếp tục chơi]
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  saveProgress()  │      │  clearProgress() │      │  Close dialog    │
│                  │      │                  │      │  Continue game   │
│  Collect state:  │      │  localStorage    │      └──────────────────┘
│  - currentIndex  │      │    .removeItem() │
│  - responses     │      │                  │
│  - grid          │      │  Exit game       │
│  - xp, level     │      └──────────────────┘
│  - score         │
│  - power-ups     │
│  - combo         │
│  - completedAns  │
└──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              gamificationService.saveGameProgress()                  │
├─────────────────────────────────────────────────────────────────────┤
│  POST /api/assessments/gamification/save-progress                   │
│  Body: {                                                            │
│    gamification_session_id: 789,                                    │
│    extra_data: {                                                    │
│      currentIndex: 5,                                               │
│      xp: 450,                                                       │
│      level: 2,                                                      │
│      score: 1200,                                                   │
│      grid: [[null, {...}, null], ...],  // 12x11 array             │
│      responses: [["q1", "answer1"], ...],                           │
│      completedAnswers: [{...}, {...}],                              │
│      bombs: 3,                                                      │
│      rockets: 1,                                                    │
│      nuclear: 0,                                                    │
│      combo: 2,                                                      │
│      maxCombo: 5,                                                   │
│      timestamp: 1234567890                                          │
│    }                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Backend: routes_gamification.py                         │
├─────────────────────────────────────────────────────────────────────┤
│  @router.post("/save-progress")                                     │
│  def save_game_progress():                                          │
│    1. Validate user_id from JWT                                     │
│    2. Find gamification session                                     │
│    3. Update extra_data field                                       │
│    4. Commit to database                                            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database: PostgreSQL                              │
├─────────────────────────────────────────────────────────────────────┤
│  UPDATE core.assessment_gamification_sessions                       │
│  SET extra_data = '{                                                │
│    "currentIndex": 5,                                               │
│    "xp": 450,                                                       │
│    "level": 2,                                                      │
│    ...                                                              │
│  }'::jsonb                                                          │
│  WHERE id = 789 AND user_id = 456;                                  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Response to Frontend                                    │
├─────────────────────────────────────────────────────────────────────┤
│  {                                                                  │
│    "success": true,                                                 │
│    "gamification_session_id": 789,                                  │
│    "saved_at": "2024-01-15T10:30:00Z"                               │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TetrisQuizGame.tsx                                      │
├─────────────────────────────────────────────────────────────────────┤
│  console.log('✅ Progress saved to database')                       │
│  Close dialog                                                       │
│  Navigate away (onCancel())                                         │
└─────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────┐
        │  FALLBACK: If database save fails        │
        ├──────────────────────────────────────────┤
        │  localStorage.setItem(                   │
        │    'tetris_quiz_progress',               │
        │    JSON.stringify(dataToSave)            │
        │  )                                       │
        │  console.log('✅ Saved to localStorage') │
        └──────────────────────────────────────────┘
```

## 4. Luồng Tải Tiến Trình (Load Progress Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│              User Returns to Game                                    │
├─────────────────────────────────────────────────────────────────────┤
│  - Clicks "Game Mode" again                                         │
│  - Has existing gamification_session_id                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TetrisQuizGame.tsx - Mount                              │
├─────────────────────────────────────────────────────────────────────┤
│  useEffect(() => {                                                  │
│    if (gamificationSessionId) {                                     │
│      loadProgressFromDatabase(gamificationSessionId)                │
│    }                                                                │
│  }, [gamificationSessionId])                                        │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              gamificationService.loadGameProgress()                  │
├─────────────────────────────────────────────────────────────────────┤
│  GET /api/assessments/gamification/load-progress/789                │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Backend: routes_gamification.py                         │
├─────────────────────────────────────────────────────────────────────┤
│  @router.get("/load-progress/{gamification_session_id}")            │
│  def load_game_progress():                                          │
│    1. Validate user_id from JWT                                     │
│    2. Find gamification session                                     │
│    3. Return extra_data field                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database: PostgreSQL                              │
├─────────────────────────────────────────────────────────────────────┤
│  SELECT extra_data                                                  │
│  FROM core.assessment_gamification_sessions                         │
│  WHERE id = 789 AND user_id = 456;                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Response to Frontend                                    │
├─────────────────────────────────────────────────────────────────────┤
│  {                                                                  │
│    "currentIndex": 5,                                               │
│    "xp": 450,                                                       │
│    "level": 2,                                                      │
│    "score": 1200,                                                   │
│    "grid": [[null, {...}, null], ...],                              │
│    "responses": [["q1", "answer1"], ...],                           │
│    "completedAnswers": [{...}, {...}],                              │
│    "bombs": 3,                                                      │
│    "rockets": 1,                                                    │
│    "nuclear": 0,                                                    │
│    "combo": 2,                                                      │
│    "maxCombo": 5,                                                   │
│    "timestamp": 1234567890                                          │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TetrisQuizGame.tsx - Restore State                      │
├─────────────────────────────────────────────────────────────────────┤
│  setCurrentIndex(savedData.currentIndex || 0)                       │
│  setResponses(new Map(savedData.responses || []))                   │
│  setCompletedAnswers(savedData.completedAnswers || [])              │
│  setXp(savedData.xp || 0)                                           │
│  setLevel(savedData.level || 1)                                     │
│  setScore(savedData.score || 0)                                     │
│  setBombs(savedData.bombs || 0)                                     │
│  setRockets(savedData.rockets || 0)                                 │
│  setNuclear(savedData.nuclear || 0)                                 │
│  setCombo(savedData.combo || 0)                                     │
│  setMaxCombo(savedData.maxCombo || 0)                               │
│  setGrid(savedData.grid)                                            │
│                                                                      │
│  console.log('✅ Progress loaded from database')                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    GAME CONTINUES FROM SAVED STATE
```

## 5. Luồng Hoàn Thành Game (Game Completion Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│              User Answers Last Question                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              handleDrop() - Last Question                            │
├─────────────────────────────────────────────────────────────────────┤
│  if (currentIndex >= questions.length - 1) {                        │
│    // Last question completed                                       │
│    const responseArray = Array.from(responses.entries())            │
│      .map(([questionId, answer]) => ({                              │
│        questionId,                                                  │
│        answer                                                       │
│      }))                                                            │
│                                                                      │
│    setFinalResponses(responseArray)                                 │
│    setShowVictoryModal(true)                                        │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Victory Modal Display                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐         │
│  │  🏆 CONGRATULATIONS!                                  │         │
│  │                                                        │         │
│  │  You've Completed All 20 Questions!                   │         │
│  │                                                        │         │
│  │  ┌──────────────┬──────────────┐                     │         │
│  │  │ Final Score  │ Final Level  │                     │         │
│  │  │    1200      │      2       │                     │         │
│  │  ├──────────────┼──────────────┤                     │         │
│  │  │  Total XP    │  Max Combo   │                     │         │
│  │  │    450       │      5x      │                     │         │
│  │  └──────────────┴──────────────┘                     │         │
│  │                                                        │         │
│  │  🌟 Special Achievements:                             │         │
│  │  🔥 Combo Master (5x)                                 │         │
│  │  🎯 Level Champion (Lv.2)                             │         │
│  │                                                        │         │
│  │  ┌──────────────────────────────────────────┐        │         │
│  │  │  ✨ View My Analysis ✨                  │        │         │
│  │  └──────────────────────────────────────────┘        │         │
│  └───────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    User clicks "View My Analysis"
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              onComplete(finalResponses)                              │
├─────────────────────────────────────────────────────────────────────┤
│  // Back to AssessmentPage                                          │
│  handleTestComplete(responses)                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Submit Assessment to Backend                            │
├─────────────────────────────────────────────────────────────────────┤
│  POST /api/assessments/submit                                       │
│  Body: {                                                            │
│    testTypes: ['RIASEC', 'BIG_FIVE'],                               │
│    responses: [                                                     │
│      { questionId: 'q1', answer: 'answer1' },                       │
│      { questionId: 'q2', answer: 'answer2' },                       │
│      ...                                                            │
│    ],                                                               │
│    test_mode: 'traditional'                                         │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Backend Processing                                      │
├─────────────────────────────────────────────────────────────────────┤
│  1. Calculate RIASEC scores                                         │
│  2. Calculate Big Five scores                                       │
│  3. Generate career recommendations                                 │
│  4. Save assessment results                                         │
│  5. Return assessment ID                                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Navigate to Results Page                                │
├─────────────────────────────────────────────────────────────────────┤
│  navigate(`/results/${assessmentId}`)                               │
└─────────────────────────────────────────────────────────────────────┘
```

## 6. Sơ Đồ Cấu Trúc Dữ Liệu (Data Structure Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND STATE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Grid State (12×11 array)                                           │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ [                                                     │          │
│  │   [null, GridCell, null, GridCell, ...],  // Row 0   │          │
│  │   [GridCell, null, GridCell, null, ...],  // Row 1   │          │
│  │   ...                                                 │          │
│  │   [null, null, GridCell, GridCell, ...]   // Row 11  │          │
│  │ ]                                                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
│  GridCell Structure:                                                │
│  {                                                                  │
│    filled: true,                                                    │
│    text: "Strongly Agree",                                          │
│    emoji: "😊",                                                     │
│    value: 5,                                                        │
│    questionId: "q1",                                                │
│    color: "from-cyan-500 to-cyan-700"                               │
│  }                                                                  │
│                                                                      │
│  Responses Map:                                                     │
│  Map {                                                              │
│    "q1" => 5,                                                       │
│    "q2" => "Option A",                                              │
│    "q3" => 3,                                                       │
│    ...                                                              │
│  }                                                                  │
│                                                                      │
│  Completed Answers Array:                                           │
│  [                                                                  │
│    {                                                                │
│      questionText: "I enjoy working with my hands",                 │
│      answer: "Strongly Agree",                                      │
│      emoji: "😊",                                                   │
│      timestamp: 1234567890                                          │
│    },                                                               │
│    ...                                                              │
│  ]                                                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  core.assessment_gamification_sessions                              │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ id: 789                                               │          │
│  │ assessment_session_id: 123                            │          │
│  │ user_id: 456                                          │          │
│  │ quiz_mode: "game"                                     │          │
│  │ xp_earned: 450                                        │          │
│  │ questions_answered: 5                                 │          │
│  │ started_at: 2024-01-15 10:00:00                       │          │
│  │ completed_at: null                                    │          │
│  │ extra_data: {                                         │          │
│  │   "currentIndex": 5,                                  │          │
│  │   "xp": 450,                                          │          │
│  │   "level": 2,                                         │          │
│  │   "score": 1200,                                      │          │
│  │   "grid": [[...], [...], ...],                        │          │
│  │   "responses": [["q1", 5], ["q2", "A"], ...],         │          │
│  │   "completedAnswers": [{...}, {...}, ...],            │          │
│  │   "bombs": 3,                                         │          │
│  │   "rockets": 1,                                       │          │
│  │   "nuclear": 0,                                       │          │
│  │   "combo": 2,                                         │          │
│  │   "maxCombo": 5,                                      │          │
│  │   "timestamp": 1234567890                             │          │
│  │ }                                                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Sơ đồ này mô tả chi tiết các luồng hoạt động chính của Quiz Game, từ khởi động, chơi game, lưu/tải tiến trình, đến hoàn thành game. Sử dụng để hiểu rõ cách các component tương tác với nhau và dữ liệu di chuyển qua hệ thống.**
