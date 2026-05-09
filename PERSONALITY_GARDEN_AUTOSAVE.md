# Personality Garden Auto-Save Feature ✅

## Changes Made

### 1. Removed Icons from QuizModeSelectorPage
- **File**: `apps/frontend/src/pages/QuizModeSelectorPage.tsx`
- **Change**: Removed all feature icons (🌱, ✨, 🎨, 🌳, 💾) from Personality Garden card
- **Result**: Cleaner, simpler card design matching user preference

### 2. Added Auto-Save Functionality
- **File**: `apps/frontend/src/components/assessment/PersonalityGarden/PersonalityGardenFlow.tsx`

#### Features Added:

**A. Auto-save on Page Leave**
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    saveProgress(); // Auto-save
    
    if (responses.size > 0 && phase === 'nurturing') {
      e.preventDefault();
      e.returnValue = 'Bạn có muốn lưu tiến trình không?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [responses, phase, currentIndex, natureEnergy, growthLevel, bloomChain]);
```

**B. Auto-save Every 30 Seconds**
```typescript
useEffect(() => {
  if (phase !== 'nurturing' || responses.size === 0) return;

  const autoSaveInterval = setInterval(() => {
    saveProgress();
  }, 30000); // 30 seconds

  return () => clearInterval(autoSaveInterval);
}, [phase, responses, currentIndex, natureEnergy, growthLevel, bloomChain]);
```

**C. Save Progress Indicator**
- Added `lastSaved` state to track last save time
- Added `isSaving` state to show saving status
- Visual indicator in bottom-right corner showing:
  - "Đang lưu..." with spinner when saving
  - "Đã lưu HH:MM" with checkmark when saved

**D. Enhanced saveProgress Function**
```typescript
const saveProgress = async () => {
  if (!gamificationSessionId) return;
  
  setIsSaving(true);
  try {
    await gamificationService.saveGameProgress({
      gamificationSessionId,
      currentIndex,
      xp: natureEnergy,
      level: growthLevel,
      score: bloomChain,
      responses: Array.from(responses.entries())
    });
    setLastSaved(new Date());
    console.log('[PersonalityGarden] ✅ Progress saved');
  } catch (error) {
    console.error('[PersonalityGarden] ❌ Failed to save progress:', error);
  } finally {
    setIsSaving(false);
  }
};
```

## Auto-Save Behavior

### When Does It Save?
1. **After Each Answer** - Immediately after user selects an answer
2. **Every 30 Seconds** - Automatic periodic save during gameplay
3. **Before Page Leave** - When user tries to close tab or navigate away
4. **On Browser Refresh** - Caught by beforeunload event

### What Gets Saved?
- Current question index
- All responses (Map of questionId → answer)
- Nature energy (XP)
- Growth level
- Bloom chain (score)
- Tree growth state (calculated from progress)

### User Experience
- **Seamless**: Auto-save happens in background
- **Visual Feedback**: Small indicator shows save status
- **No Interruption**: User can continue playing while saving
- **Protection**: Warns user before leaving if unsaved changes

## Comparison with Puzzle Game

| Feature | Puzzle Game | Personality Garden |
|---------|-------------|-------------------|
| Auto-save on answer | ✅ | ✅ |
| Auto-save every 30s | ✅ | ✅ |
| Auto-save on leave | ✅ | ✅ |
| Save indicator | ✅ | ✅ |
| Load on return | ✅ | ✅ |
| Database storage | ✅ | ✅ |

## Testing

To test auto-save:
1. Start Personality Garden game
2. Answer a few questions
3. Check bottom-right for "Đã lưu HH:MM" indicator
4. Refresh page → Progress should be restored
5. Close tab → Should show warning dialog
6. Return later → Should resume from last question

## Files Modified

1. `apps/frontend/src/pages/QuizModeSelectorPage.tsx`
   - Removed feature icons from Personality Garden card

2. `apps/frontend/src/components/assessment/PersonalityGarden/PersonalityGardenFlow.tsx`
   - Added `lastSaved` and `isSaving` states
   - Added beforeunload event listener
   - Added 30-second auto-save interval
   - Enhanced `saveProgress` function
   - Added save indicator UI

## Next Steps

User should:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Test the auto-save functionality
3. Verify progress is saved and restored correctly
