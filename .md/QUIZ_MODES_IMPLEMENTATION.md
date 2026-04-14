# Quiz Modes Implementation Guide

## Overview

This document describes the implementation of the dual-mode quiz system for the Career Orientation Assessment platform. The system allows users to choose between two quiz experiences while maintaining identical assessment accuracy.

## Architecture

### Core Principles

1. **Assessment Integrity**: Both modes use identical questions and scoring algorithms
2. **Data Separation**: Gamification data is stored separately from assessment results
3. **Mode Independence**: Assessment results are identical regardless of chosen mode
4. **User Choice**: Users explicitly select their preferred mode before starting

## System Components

### Frontend Components

#### 1. Quiz Mode Selector (`QuizModeSelectorPage.tsx`)
- **Purpose**: Allow users to choose between Standard and Game-based modes
- **Location**: `/quiz-mode-selector`
- **Features**:
  - Visual comparison of both modes
  - Clear explanation that results are identical
  - Mode selection with visual feedback
  - Navigation to assessment with selected mode

#### 2. Standard Quiz Mode (`StandardQuizMode.tsx`)
- **Purpose**: Traditional assessment experience
- **Features**:
  - Clean, minimal interface
  - Linear question progression
  - Review and change answers
  - No time pressure
  - Progress tracking
- **UI Characteristics**:
  - Simple radio buttons/scales
  - Clear question display
  - Previous/Next navigation
  - Review screen before submission

#### 3. Game-based Quiz Mode (`GameQuizMode.tsx`)
- **Purpose**: Engaging, interactive assessment experience
- **Features**:
  - Animated card interactions
  - XP and level system
  - Visual feedback on answers
  - Progress rewards
  - Emoji-based scales
- **UI Characteristics**:
  - Gradient backgrounds
  - Animated transitions
  - Real-time XP display
  - Level progression
  - Achievement feedback

#### 4. Updated Assessment Page (`AssessmentPage.tsx`)
- **Changes**:
  - Added mode detection from URL params
  - Conditional rendering based on mode
  - Question loading for new modes
  - Backward compatibility with legacy mode

### Backend Components

#### 1. Gamification Models (`gamification_models.py`)

**UserGamificationProfile**
```python
- user_id: Foreign key to users
- total_xp: Total XP earned
- level: Current level
- created_at, updated_at: Timestamps
```

**AssessmentGamificationSession**
```python
- assessment_session_id: Links to assessment
- user_id: Foreign key to users
- quiz_mode: 'standard', 'game', or 'legacy'
- xp_earned: XP for this session
- questions_answered: Count of answered questions
- started_at, completed_at: Timestamps
- extra_data: JSON for additional gamification data
```

**UserAchievement**
```python
- user_id: Foreign key to users
- achievement_type: Type identifier
- achievement_name: Display name
- achievement_description: Description text
- earned_at: Timestamp
- metadata: JSON for additional data
```

#### 2. Gamification Service (`gamification_service.py`)

**Key Methods**:
- `get_or_create_profile()`: Get/create user gamification profile
- `calculate_level()`: Calculate level from XP
- `start_gamification_session()`: Initialize session
- `award_xp_for_question()`: Award XP for answered question
- `complete_gamification_session()`: Finalize session
- `get_user_stats()`: Retrieve user statistics
- `award_achievement()`: Grant achievement to user

**Constants**:
- `XP_PER_QUESTION = 10`: XP awarded per question
- `XP_FOR_LEVEL = 100`: XP required per level

#### 3. Gamification Routes (`routes_gamification.py`)

**Endpoints**:
- `POST /api/assessments/gamification/start-session`: Start gamification session
- `POST /api/assessments/gamification/award-xp`: Award XP for question
- `POST /api/assessments/gamification/complete-session`: Complete session
- `GET /api/assessments/gamification/stats`: Get user stats
- `GET /api/assessments/gamification/profile`: Get user profile

### Database Schema

#### Tables Created

1. **core.user_gamification_profiles**
   - Stores user's total XP and level
   - One row per user
   - Separate from assessment data

2. **core.assessment_gamification_sessions**
   - Links gamification data to assessment sessions
   - Stores quiz mode used
   - Tracks XP earned per session
   - Does NOT affect assessment scoring

3. **core.user_achievements**
   - Stores user achievements
   - Purely for gamification
   - Unique constraint on (user_id, achievement_type)

## Data Flow

### Standard Mode Flow

1. User selects "Standard Mode" on selector page
2. Navigate to `/assessment?mode=standard`
3. AssessmentPage loads questions
4. StandardQuizMode component renders
5. User answers questions (no gamification)
6. Submit responses to assessment API
7. Assessment scored normally
8. Results displayed

### Game Mode Flow

1. User selects "Game Mode" on selector page
2. Navigate to `/assessment?mode=game`
3. AssessmentPage loads questions
4. GameQuizMode component renders
5. Start gamification session via API
6. For each question answered:
   - Submit answer to assessment API
   - Award XP via gamification API (optional)
   - Update UI with XP/level
7. Complete gamification session
8. Submit responses to assessment API
9. Assessment scored normally (identical to standard)
10. Results displayed with gamification summary

### Legacy Mode Flow

1. User clicks "Quick Start (Legacy)" on intro screen
2. Navigate to `/assessment` (no mode param)
3. AssessmentPage uses legacy CareerTestComponent
4. Existing flow unchanged
5. Backward compatibility maintained

## Critical Rules

### Assessment Integrity

1. **Same Questions**: Both modes use identical question sets
2. **Same Scoring**: Assessment algorithms are identical
3. **Same Results**: Career orientation results are identical
4. **Data Separation**: Gamification data stored separately

### Gamification Constraints

1. **No Time Limits**: No countdown timers affecting assessment
2. **No Speed Scoring**: XP not based on answer speed
3. **No Competition**: No rankings affecting results
4. **Optional**: Gamification is purely for engagement

### User Experience

1. **Explicit Choice**: Users must choose mode before starting
2. **Clear Communication**: Both modes produce same results
3. **No Pressure**: Standard mode available for serious users
4. **Accessibility**: Both modes equally accessible

## API Integration

### Assessment Submission

```typescript
// Same for both modes
const response = await assessmentService.submitAssessment({
  testTypes: ['RIASEC', 'BIG_FIVE'],
  responses: [
    { questionId: '1', answer: 4 },
    { questionId: '2', answer: 'Agree' },
    // ...
  ]
});
```

### Gamification (Game Mode Only)

```typescript
// Start session
const session = await fetch('/api/assessments/gamification/start-session', {
  method: 'POST',
  body: JSON.stringify({
    assessment_session_id: assessmentId,
    quiz_mode: 'game'
  })
});

// Award XP (optional, for UI feedback)
const xpResult = await fetch('/api/assessments/gamification/award-xp', {
  method: 'POST',
  body: JSON.stringify({
    gamification_session_id: sessionId
  })
});

// Complete session
await fetch('/api/assessments/gamification/complete-session', {
  method: 'POST',
  body: JSON.stringify({
    gamification_session_id: sessionId
  })
});
```

## Testing Checklist

### Functional Testing

- [ ] Mode selector displays both options correctly
- [ ] Standard mode shows clean, minimal interface
- [ ] Game mode shows animated, engaging interface
- [ ] Both modes load same questions
- [ ] Both modes submit answers correctly
- [ ] Assessment results identical for same answers
- [ ] Gamification data stored separately
- [ ] XP and levels calculated correctly
- [ ] Legacy mode still works

### Integration Testing

- [ ] Mode selection persists through navigation
- [ ] Assessment submission works for all modes
- [ ] Gamification API endpoints functional
- [ ] Database tables created correctly
- [ ] Foreign key constraints working
- [ ] User can switch between modes

### User Experience Testing

- [ ] Mode selector is intuitive
- [ ] Standard mode feels professional
- [ ] Game mode feels engaging
- [ ] No confusion about result equivalence
- [ ] Progress tracking clear in both modes
- [ ] Error handling graceful

## Deployment Steps

1. **Database Migration**
   ```bash
   psql -U postgres -d your_database -f db/migrations/add_gamification_tables.sql
   ```

2. **Backend Deployment**
   - Deploy updated backend code
   - Verify gamification routes registered
   - Test API endpoints

3. **Frontend Deployment**
   - Deploy updated frontend code
   - Verify routing works
   - Test mode selection

4. **Verification**
   - Test complete flow for both modes
   - Verify assessment results identical
   - Check gamification data storage
   - Monitor for errors

## Future Enhancements

### Potential Features

1. **Additional Game Modes**
   - Story-based progression
   - Scenario-based questions
   - Card-flip interactions

2. **Enhanced Gamification**
   - Badges and achievements
   - Streak tracking
   - Leaderboards (non-competitive)
   - Customizable avatars

3. **Analytics**
   - Mode preference tracking
   - Completion rate by mode
   - User engagement metrics

4. **Accessibility**
   - Screen reader support
   - Keyboard navigation
   - High contrast mode
   - Font size options

## Maintenance Notes

### Code Organization

- Frontend quiz components in `apps/frontend/src/components/assessment/`
- Backend gamification in `apps/backend/app/modules/assessments/gamification_*`
- Database migrations in `db/migrations/`
- Documentation in `docs/`

### Key Files

- `QuizModeSelectorPage.tsx`: Mode selection UI
- `StandardQuizMode.tsx`: Standard mode component
- `GameQuizMode.tsx`: Game mode component
- `AssessmentPage.tsx`: Main assessment page
- `gamification_service.py`: Gamification logic
- `routes_gamification.py`: Gamification API
- `add_gamification_tables.sql`: Database schema

### Dependencies

- React Router for navigation
- Tailwind CSS for styling
- FastAPI for backend
- PostgreSQL for database
- SQLAlchemy for ORM

## Support

For questions or issues:
1. Check this documentation
2. Review code comments
3. Test with both modes
4. Verify database schema
5. Check API responses

## Conclusion

This implementation provides a flexible, engaging quiz system while maintaining scientific assessment integrity. Users can choose their preferred experience, and the system ensures accurate, consistent results regardless of mode selection.
