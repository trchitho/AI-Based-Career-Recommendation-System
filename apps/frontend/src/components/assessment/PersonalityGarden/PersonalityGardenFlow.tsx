import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../../types/assessment';
import GardenTutorial from './GardenTutorial.tsx';
import SeedSelection from './SeedSelection.tsx';
import type { Seed } from './SeedSelection.tsx';
import PlantingIntro from './PlantingIntro.tsx';
import QuestionNurture from './QuestionNurture.tsx';
import PersonalityTreeResult from './PersonalityTreeResult.tsx';
import BackgroundMusic from './BackgroundMusic.tsx';
import { useTreeGrowth } from './hooks/useTreeGrowth';
import { NurtureElement } from './types/garden.types';
import gamificationService from '../../../services/gamificationService';

interface PersonalityGardenFlowProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
  assessmentSessionId?: number;
}

type GamePhase = 'tutorial' | 'seed-selection' | 'planting' | 'nurturing' | 'revealing';

const PersonalityGardenFlow: React.FC<PersonalityGardenFlowProps> = ({
  questions,
  onComplete,
  onCancel,
  assessmentSessionId
}) => {
  // Game phase - start with tutorial
  const [phase, setPhase] = useState<GamePhase>('tutorial');
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedSeed, setSelectedSeed] = useState<Seed | null>(null);
  
  // Assessment state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [answeredQuestions, setAnsweredQuestions] = useState<Array<{
    question: Question;
    selectedElement: NurtureElement;
    questionNumber: number;
  }>>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false); // Prevent rapid clicks
  
  // Debug log
  useEffect(() => {
    console.log('[PersonalityGarden] showExitConfirm:', showExitConfirm);
  }, [showExitConfirm]);
  
  // Gamification state
  const [gamificationSessionId, setGamificationSessionId] = useState<number | null>(null);
  const [natureEnergy, setNatureEnergy] = useState(0);
  const [growthLevel, setGrowthLevel] = useState(1);
  const [bloomChain, setBloomChain] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Day/Night cycle state
  const [currentDay, setCurrentDay] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'noon' | 'afternoon' | 'evening'>('morning');
  
  // Tree growth hook
  const { treeGrowth, growTree, setColorPalette, resetTree } = useTreeGrowth();
  
  const currentQuestion = questions[currentIndex];
  const actualAnsweredCount = responses.size; // Số câu đã trả lời thực sự
  const progress = (actualAnsweredCount / questions.length) * 100;

  // Calculate day and time of day based on answered questions
  useEffect(() => {
    // Every 5 questions = 1 day (changed from 10)
    const questionsPerDay = 5;
    const day = Math.floor(actualAnsweredCount / questionsPerDay) + 1;
    setCurrentDay(day);
    
    // Calculate time of day within the current day (4 periods per day)
    const questionInDay = actualAnsweredCount % questionsPerDay;
    
    if (questionInDay === 0) {
      setTimeOfDay('morning'); // Question 0
    } else if (questionInDay === 1) {
      setTimeOfDay('noon'); // Question 1
    } else if (questionInDay === 2 || questionInDay === 3) {
      setTimeOfDay('afternoon'); // Questions 2-3
    } else {
      setTimeOfDay('evening'); // Question 4
    }
  }, [actualAnsweredCount]);

  // Get background gradient based on time of day
  const getBackgroundGradient = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'from-orange-200 via-yellow-100 to-sky-200 dark:from-orange-900/40 dark:via-yellow-900/30 dark:to-sky-900/40';
      case 'noon':
        return 'from-sky-300 via-blue-200 to-cyan-200 dark:from-sky-900/50 dark:via-blue-900/40 dark:to-cyan-900/40';
      case 'afternoon':
        return 'from-amber-300 via-orange-200 to-pink-200 dark:from-amber-900/50 dark:via-orange-900/40 dark:to-pink-900/40';
      case 'evening':
        return 'from-indigo-400 via-purple-300 to-pink-300 dark:from-indigo-900/60 dark:via-purple-900/50 dark:to-pink-900/50';
      default:
        return 'from-sky-100 via-green-50 to-emerald-100 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20';
    }
  };

  // Get time of day emoji - LOGICAL: moon at evening, sun during day
  const getTimeEmoji = () => {
    switch (timeOfDay) {
      case 'morning':
        return '🌅'; // Sunrise
      case 'noon':
        return '☀️'; // Sun
      case 'afternoon':
        return '🌤️'; // Partly sunny
      case 'evening':
        return '🌙'; // Moon (NOT sun!)
      default:
        return '🌱';
    }
  };

  // Get time of day label
  const getTimeLabel = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'Buổi sáng';
      case 'noon':
        return 'Buổi trưa';
      case 'afternoon':
        return 'Buổi chiều';
      case 'evening':
        return 'Buổi tối';
      default:
        return '';
    }
  };

  // Initialize gamification session
  useEffect(() => {
    const initSession = async () => {
      // Use session-scoped key if available, fallback to fixed key for backward compat
      const BACKUP_KEY = assessmentSessionId
        ? `pg_backup_${assessmentSessionId}`
        : 'pg_backup_current';
      
      console.log('[PersonalityGarden] 🔍 Checking localStorage for saved progress...', { key: BACKUP_KEY });
      const backupData = localStorage.getItem(BACKUP_KEY);
      
      if (backupData) {
        console.log('[PersonalityGarden] 📦 Found saved progress in localStorage, restoring...');
        try {
          const dataToRestore = JSON.parse(backupData);
          
          // Check if we have valid saved progress that is NOT already completed
          const savedResponses = dataToRestore.responses || [];
          const hasProgress = dataToRestore && 
                             savedResponses.length > 0 &&
                             savedResponses.length < questions.length; // NOT completed
          
          if (hasProgress) {
            // Restore state
            const savedIndex = dataToRestore.currentIndex || 0;
            const restoredResponses = new Map<string, string | number>(savedResponses);
            
            setCurrentIndex(savedIndex);
            setResponses(restoredResponses);
            setNatureEnergy(dataToRestore.xp || 0);
            setGrowthLevel(dataToRestore.level || 1);
            setBloomChain(dataToRestore.score || 0);
            
            // Restore selected seed if available
            if (dataToRestore.selectedSeed) {
              setSelectedSeed(dataToRestore.selectedSeed);
              
              // Restore tree color palette
              const colorPalettes: Record<string, string[]> = {
                oak: ['#8D6E63', '#A1887F', '#BCAAA4'],
                maple: ['#D32F2F', '#F44336', '#EF5350'],
                cherry: ['#EC407A', '#F06292', '#F48FB1'],
                pine: ['#388E3C', '#4CAF50', '#66BB6A'],
                willow: ['#7CB342', '#9CCC65', '#AED581']
              };
              setColorPalette(colorPalettes[dataToRestore.selectedSeed.id] || colorPalettes.oak);
            }
            
            // Restore tree growth based on actual responses count
            const restoredProgress = (restoredResponses.size / questions.length) * 100;
            growTree(restoredProgress);
            
            // IMPORTANT: Skip tutorial and seed selection - go straight to nurturing
            setShowTutorial(false);
            setPhase('nurturing');
            
            console.log('[PersonalityGarden] ✅ Progress restored from localStorage:', {
              currentIndex: savedIndex,
              responsesCount: restoredResponses.size,
              xp: dataToRestore.xp,
              level: dataToRestore.level,
              seed: dataToRestore.selectedSeed?.id,
              phase: 'nurturing'
            });
          } else if (savedResponses.length >= questions.length) {
            // Progress is already completed — clear it so user starts fresh
            console.log('[PersonalityGarden] ℹ️ Previous progress was completed, starting fresh');
            localStorage.removeItem(BACKUP_KEY);
            // Also clear the old fixed key if it exists
            if (assessmentSessionId) {
              localStorage.removeItem('pg_backup_current');
            }
          }
        } catch (error) {
          console.error('[PersonalityGarden] ❌ Failed to parse localStorage data:', error);
        }
      } else {
        console.log('[PersonalityGarden] ℹ️ No saved progress in localStorage');
        // Also check old fixed key and clear if completed
        if (assessmentSessionId) {
          const oldBackup = localStorage.getItem('pg_backup_current');
          if (oldBackup) {
            try {
              const oldData = JSON.parse(oldBackup);
              if (oldData.responses && oldData.responses.length >= questions.length) {
                // Old completed progress — remove it
                localStorage.removeItem('pg_backup_current');
              } else if (oldData.responses && oldData.responses.length > 0) {
                // Old incomplete progress — migrate to new key and restore
                localStorage.setItem(BACKUP_KEY, oldBackup);
                localStorage.removeItem('pg_backup_current');
                // Restore from migrated data
                const savedIndex = oldData.currentIndex || 0;
                const restoredResponses = new Map<string, string | number>(oldData.responses || []);
                setCurrentIndex(savedIndex);
                setResponses(restoredResponses);
                setNatureEnergy(oldData.xp || 0);
                setGrowthLevel(oldData.level || 1);
                setBloomChain(oldData.score || 0);
                if (oldData.selectedSeed) {
                  setSelectedSeed(oldData.selectedSeed);
                  const colorPalettes: Record<string, string[]> = {
                    oak: ['#8D6E63', '#A1887F', '#BCAAA4'],
                    maple: ['#D32F2F', '#F44336', '#EF5350'],
                    cherry: ['#EC407A', '#F06292', '#F48FB1'],
                    pine: ['#388E3C', '#4CAF50', '#66BB6A'],
                    willow: ['#7CB342', '#9CCC65', '#AED581']
                  };
                  setColorPalette(colorPalettes[oldData.selectedSeed.id] || colorPalettes.oak);
                }
                const restoredProgress = (restoredResponses.size / questions.length) * 100;
                growTree(restoredProgress);
                setShowTutorial(false);
                setPhase('nurturing');
                console.log('[PersonalityGarden] ✅ Migrated old progress to new key');
              }
            } catch { /* ignore */ }
          }
        }
      }
      
      // OPTIONAL: Try to create backend session (but don't block on it)
      if (assessmentSessionId && !gamificationSessionId) {
        try {
          const savedSessionKey = `pg_session_${assessmentSessionId}`;
          const savedSessionId = localStorage.getItem(savedSessionKey);
          
          let sessionId: number;
          
          if (savedSessionId) {
            sessionId = parseInt(savedSessionId);
            console.log('[PersonalityGarden] Reusing session:', sessionId);
          } else {
            const session = await gamificationService.startSession(assessmentSessionId, 'personality_garden');
            sessionId = session.gamification_session_id;
            localStorage.setItem(savedSessionKey, sessionId.toString());
            console.log('[PersonalityGarden] Created new session:', sessionId);
          }
          
          setGamificationSessionId(sessionId);
        } catch (error) {
          console.log('[PersonalityGarden] ⚠️ Backend session failed (OK, using localStorage only)');
        }
      }
    };
    
    initSession();
  }, [assessmentSessionId]);

  // Auto-save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Auto-save when user tries to leave
      saveProgress();
      
      if (responses.size > 0 && phase === 'nurturing') {
        e.preventDefault();
        e.returnValue = 'Bạn có muốn lưu tiến trình không?';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (responses.size > 0 && phase === 'nurturing') {
        setShowExitConfirm(true);
        // Push state back to prevent immediate navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state
    window.history.pushState(null, '', window.location.href);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [responses, phase, currentIndex, natureEnergy, growthLevel, bloomChain]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (phase !== 'nurturing' || responses.size === 0) return;

    const autoSaveInterval = setInterval(() => {
      saveProgress();
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [phase, responses, currentIndex, natureEnergy, growthLevel, bloomChain]);

  // Load saved progress - WORKS WITHOUT BACKEND
  const loadProgress = async (sessionId: number) => {
    try {
      console.log('[PersonalityGarden] 🔍 Attempting to load progress...');
      
      // PRIMARY: Try localStorage first (works without backend)
      let dataToRestore = null;
      if (assessmentSessionId) {
        const backupKey = `pg_backup_${assessmentSessionId}`;
        const backupData = localStorage.getItem(backupKey);
        if (backupData) {
          console.log('[PersonalityGarden] 📦 Found progress in localStorage');
          dataToRestore = JSON.parse(backupData);
        }
      }
      
      // SECONDARY: Try database if localStorage is empty
      if (!dataToRestore && sessionId) {
        try {
          const savedData = await gamificationService.loadGameProgress(sessionId);
          if (savedData && Object.keys(savedData).length > 0) {
            console.log('[PersonalityGarden] 📦 Found progress in database');
            dataToRestore = savedData;
          }
        } catch (dbError) {
          console.log('[PersonalityGarden] ⚠️ Database load failed (OK, using localStorage)');
        }
      }
      
      // Check if we have valid saved progress
      const hasProgress = dataToRestore && 
                         dataToRestore.responses && 
                         dataToRestore.responses.length > 0;
      
      if (hasProgress) {
        console.log('[PersonalityGarden] ✅ Found saved progress, restoring...');
        
        // Restore state
        const savedIndex = dataToRestore.currentIndex || 0;
        const savedResponses = new Map<string, string | number>(dataToRestore.responses || []);
        
        setCurrentIndex(savedIndex);
        setResponses(savedResponses);
        setNatureEnergy(dataToRestore.xp || 0);
        setGrowthLevel(dataToRestore.level || 1);
        setBloomChain(dataToRestore.score || 0);
        
        // Restore selected seed if available
        if (dataToRestore.selectedSeed) {
          setSelectedSeed(dataToRestore.selectedSeed);
          
          // Restore tree color palette
          const colorPalettes: Record<string, string[]> = {
            oak: ['#8D6E63', '#A1887F', '#BCAAA4'],
            maple: ['#D32F2F', '#F44336', '#EF5350'],
            cherry: ['#EC407A', '#F06292', '#F48FB1'],
            pine: ['#388E3C', '#4CAF50', '#66BB6A'],
            willow: ['#7CB342', '#9CCC65', '#AED581']
          };
          setColorPalette(colorPalettes[dataToRestore.selectedSeed.id] || colorPalettes.oak);
        }
        
        // Restore tree growth based on actual responses count
        const restoredProgress = (savedResponses.size / questions.length) * 100;
        growTree(restoredProgress);
        
        // IMPORTANT: Skip tutorial and seed selection - go straight to nurturing
        setShowTutorial(false);
        setPhase('nurturing');
        
        console.log('[PersonalityGarden] ✅ Progress restored successfully:', {
          currentIndex: savedIndex,
          responsesCount: savedResponses.size,
          xp: dataToRestore.xp,
          level: dataToRestore.level,
          seed: dataToRestore.selectedSeed?.id,
          phase: 'nurturing'
        });
      } else {
        console.log('[PersonalityGarden] ℹ️ No saved progress found, starting fresh');
      }
    } catch (error) {
      console.error('[PersonalityGarden] ❌ Failed to load progress:', error);
    }
  };

  // Save progress - WORKS WITHOUT BACKEND
  const saveProgress = async () => {
    setIsSaving(true);
    try {
      const progressData = {
        currentIndex,
        responses: Array.from(responses.entries()),
        xp: natureEnergy,
        level: growthLevel,
        score: bloomChain,
        selectedSeed: selectedSeed, // Save selected seed
        timestamp: new Date().toISOString()
      };
      
      // PRIMARY: Save to localStorage with session-scoped key
      const BACKUP_KEY = assessmentSessionId
        ? `pg_backup_${assessmentSessionId}`
        : 'pg_backup_current';
      localStorage.setItem(BACKUP_KEY, JSON.stringify(progressData));
      console.log('[PersonalityGarden] ✅ Progress saved to localStorage:', {
        key: BACKUP_KEY,
        currentIndex,
        responses: responses.size,
        xp: natureEnergy,
        seed: selectedSeed?.id
      });
      
      // SECONDARY: Try database if session exists
      if (gamificationSessionId) {
        try {
          await gamificationService.saveGameProgress({
            gamificationSessionId,
            currentIndex,
            xp: natureEnergy,
            level: growthLevel,
            score: bloomChain,
            responses: Array.from(responses.entries()),
            completedAnswers: answeredQuestions.map(aq => ({
              questionText: aq.question.question_text,
              answer: aq.selectedElement?.label || '',
              timestamp: Date.now(),
            })),
          });
          console.log('[PersonalityGarden] ✅ Also saved to database');
        } catch (dbError) {
          console.log('[PersonalityGarden] ⚠️ Database save failed (OK, using localStorage)');
        }
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('[PersonalityGarden] ❌ Failed to save progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle tutorial complete
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setPhase('seed-selection');
  };

  // Handle tutorial skip
  const handleTutorialSkip = () => {
    setShowTutorial(false);
    setPhase('seed-selection');
  };

  // Handle seed selection
  const handleSeedSelected = (seed: Seed) => {
    console.log('[PersonalityGarden] Seed selected:', seed);
    setSelectedSeed(seed);
    
    // Set tree color palette based on seed
    const colorPalettes: Record<string, string[]> = {
      oak: ['#8D6E63', '#A1887F', '#BCAAA4'],
      maple: ['#D32F2F', '#F44336', '#EF5350'],
      cherry: ['#EC407A', '#F06292', '#F48FB1'],
      pine: ['#388E3C', '#4CAF50', '#66BB6A'],
      willow: ['#7CB342', '#9CCC65', '#AED581']
    };
    
    setColorPalette(colorPalettes[seed.id] || colorPalettes.oak);
    setPhase('planting');
  };

  // Handle planting complete
  const handlePlantingComplete = () => {
    setPhase('nurturing');
  };

  // Handle answer selection
  const handleAnswer = async (answer: string | number, selectedElement?: NurtureElement) => {
    console.log('[PersonalityGardenFlow] handleAnswer called:', {
      answer,
      selectedElement,
      currentQuestionId: currentQuestion?.id,
      hasResponse: responses.has(currentQuestion?.id),
      isAnswering
    });
    
    // Prevent duplicate answers or rapid clicks
    if (isAnswering || responses.has(currentQuestion.id)) {
      console.log('[PersonalityGarden] Already processing answer, skipping...');
      return;
    }
    
    // Lock to prevent rapid clicks
    setIsAnswering(true);
    console.log('[PersonalityGarden] Processing answer...');
    
    // Save response
    const newResponses = new Map(responses);
    newResponses.set(currentQuestion.id, answer);
    setResponses(newResponses);
    
    // Track answered question with selected element
    if (selectedElement) {
      setAnsweredQuestions(prev => [...prev, {
        question: currentQuestion,
        selectedElement,
        questionNumber: newResponses.size // Use actual count
      }]);
    }
    
    // Award nature energy
    const energyGain = 10;
    const newEnergy = natureEnergy + energyGain;
    setNatureEnergy(newEnergy);
    
    // Check level up (every 100 energy)
    const newLevel = Math.floor(newEnergy / 100) + 1;
    if (newLevel > growthLevel) {
      setGrowthLevel(newLevel);
    }
    
    // Increment bloom chain (use actual answer count)
    setBloomChain(newResponses.size);
    
    // Grow tree based on actual progress
    const newProgress = (newResponses.size / questions.length) * 100;
    console.log('[PersonalityGarden] Growing tree to:', newProgress, '%');
    growTree(newProgress);
    
    // Save progress immediately after answer
    setTimeout(async () => {
      await saveProgress();
    }, 100);
    
    // Move to next question or complete (REDUCED DELAY)
    if (currentIndex < questions.length - 1) {
      console.log('[PersonalityGarden] Moving to next question:', currentIndex + 1);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsAnswering(false); // Unlock for next question
      }, 500); // Reduced from 1500ms to 500ms
    } else {
      // All questions answered
      console.log('[PersonalityGarden] All questions answered, revealing...');
      setTimeout(() => {
        setPhase('revealing');
        setIsAnswering(false);
      }, 1000); // Reduced from 2000ms to 1000ms
    }
  };

  // Handle completion
  const handleComplete = () => {
    // Clear saved progress on completion
    const BACKUP_KEY = assessmentSessionId
      ? `pg_backup_${assessmentSessionId}`
      : 'pg_backup_current';
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem('pg_backup_current'); // Also clear old fixed key
    
    const responseArray: QuestionResponse[] = Array.from(responses.entries()).map(
      ([questionId, answer]) => ({ questionId, answer })
    );
    onComplete(responseArray);
  };

  // Handle exit click
  const handleExitClick = () => {
    console.log('[PersonalityGarden] Exit clicked, showing dialog');
    setShowExitConfirm(true);
  };

  // Save and exit
  const handleSaveAndExit = async () => {
    await saveProgress();
    setShowExitConfirm(false);
    // Allow navigation
    window.removeEventListener('beforeunload', () => {});
    onCancel();
  };

  // Exit without save
  const handleExitWithoutSave = () => {
    // Clear saved progress - both session-scoped and fixed keys
    const BACKUP_KEY = assessmentSessionId
      ? `pg_backup_${assessmentSessionId}`
      : 'pg_backup_current';
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem('pg_backup_current'); // Also clear old fixed key
    
    // Also clear session key if exists
    if (assessmentSessionId) {
      const savedSessionKey = `pg_session_${assessmentSessionId}`;
      localStorage.removeItem(savedSessionKey);
    }
    
    // Clear assessment session keys so a new session is created next time
    localStorage.removeItem('assessment_session_standard');
    localStorage.removeItem('assessment_session_game');
    localStorage.removeItem('assessment_seed_standard');
    localStorage.removeItem('assessment_seed_game');
    
    console.log('[PersonalityGarden] Cleared saved progress');
    
    setShowExitConfirm(false);
    // Allow navigation
    window.removeEventListener('beforeunload', () => {});
    onCancel();
  };

  // Cancel exit
  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  return (
    <div className={`personality-garden-flow min-h-screen bg-gradient-to-b ${getBackgroundGradient()} overflow-hidden transition-all duration-1000`}>
      {/* Background Music */}
      <BackgroundMusic 
        isPlaying={phase === 'nurturing' || phase === 'revealing'} 
        onAnswerSound={isAnswering}
      />
      
      {/* Phase 0: Tutorial */}
      {phase === 'tutorial' && showTutorial && (
        <GardenTutorial
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}
      
      {/* Phase 0.5: Seed Selection */}
      {phase === 'seed-selection' && (
        <SeedSelection onSeedSelected={handleSeedSelected} />
      )}
      
      {/* Phase 1: Planting */}
      {phase === 'planting' && (
        <PlantingIntro onComplete={handlePlantingComplete} />
      )}
      
      {/* Phase 2: Nurturing (Main Assessment) */}
      {phase === 'nurturing' && currentQuestion && (
        <>
          <QuestionNurture
            question={currentQuestion}
            questionNumber={actualAnsweredCount + 1}
            totalQuestions={questions.length}
            treeGrowth={treeGrowth}
            progress={progress}
            natureEnergy={natureEnergy}
            growthLevel={growthLevel}
            bloomChain={bloomChain}
            answeredQuestions={answeredQuestions}
            onAnswer={handleAnswer}
            onCancel={handleExitClick}
            disabled={isAnswering}
            currentDay={currentDay}
            timeOfDay={timeOfDay}
            timeEmoji={getTimeEmoji()}
            timeLabel={getTimeLabel()}
          />
          
          {/* Auto-save indicator */}
          {lastSaved && responses.size > 0 && (
            <div className="fixed bottom-4 right-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Đang lưu...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Đã lưu {new Date(lastSaved).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Phase 3: Revealing (Final Result) */}
      {phase === 'revealing' && (
        <PersonalityTreeResult
          responses={responses}
          questions={questions}
          treeGrowth={treeGrowth}
          natureEnergy={natureEnergy}
          growthLevel={growthLevel}
          onComplete={handleComplete}
        />
      )}

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">💾</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Lưu tiến trình?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bạn có muốn lưu lại tiến trình hiện tại không? Bạn có thể tiếp tục chơi sau.
              </p>
            </div>

            <div className="space-y-3">
              {/* Save and Exit */}
              <button
                onClick={handleSaveAndExit}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Có, lưu lại
              </button>

              {/* Exit without Save */}
              <button
                onClick={handleExitWithoutSave}
                className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Không, reset kết quả
              </button>

              {/* Cancel */}
              <button
                onClick={handleCancelExit}
                className="w-full px-6 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold text-lg transition-all duration-200"
              >
                Tiếp tục chơi
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Tiến trình hiện tại: {actualAnsweredCount}/{questions.length} câu</p>
              <p>XP: {natureEnergy} | Score: {bloomChain}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalityGardenFlow;
