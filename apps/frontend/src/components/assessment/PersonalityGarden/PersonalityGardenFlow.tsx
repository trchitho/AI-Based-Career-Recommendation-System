import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../../types/assessment';
import GardenTutorial from './GardenTutorial.tsx';
import SeedSelection from './SeedSelection.tsx';
import type { Seed } from './SeedSelection.tsx';
import PlantingIntro from './PlantingIntro.tsx';
import QuestionNurture from './QuestionNurture.tsx';
import PersonalityTreeResult from './PersonalityTreeResult.tsx';
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
  
  // Gamification state
  const [gamificationSessionId, setGamificationSessionId] = useState<number | null>(null);
  const [natureEnergy, setNatureEnergy] = useState(0);
  const [growthLevel, setGrowthLevel] = useState(1);
  const [bloomChain, setBloomChain] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tree growth hook
  const { treeGrowth, growTree, setColorPalette, resetTree } = useTreeGrowth();
  
  const currentQuestion = questions[currentIndex];
  const actualAnsweredCount = responses.size; // Số câu đã trả lời thực sự
  const progress = (actualAnsweredCount / questions.length) * 100;

  // Initialize gamification session
  useEffect(() => {
    const initSession = async () => {
      if (assessmentSessionId && !gamificationSessionId) {
        try {
          const session = await gamificationService.startSession(
            assessmentSessionId,
            'personality_garden'
          );
          setGamificationSessionId(session.gamification_session_id);
          
          // Try to load saved progress
          await loadProgress(session.gamification_session_id);
        } catch (error) {
          console.error('[PersonalityGarden] Failed to start session:', error);
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

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [responses, phase, currentIndex, natureEnergy, growthLevel, bloomChain]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (phase !== 'nurturing' || responses.size === 0) return;

    const autoSaveInterval = setInterval(() => {
      saveProgress();
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [phase, responses, currentIndex, natureEnergy, growthLevel, bloomChain]);

  // Load saved progress
  const loadProgress = async (sessionId: number) => {
    try {
      const savedData = await gamificationService.loadGameProgress(sessionId);
      
      if (savedData && Object.keys(savedData).length > 0) {
        setCurrentIndex(savedData.currentIndex || 0);
        setResponses(new Map(savedData.responses || []));
        setNatureEnergy(savedData.natureEnergy || 0);
        setGrowthLevel(savedData.growthLevel || 1);
        setBloomChain(savedData.bloomChain || 0);
        
        // Restore tree growth
        if (savedData.treeGrowth) {
          // Tree will be restored based on progress
          const restoredProgress = (savedData.currentIndex / questions.length) * 100;
          growTree(restoredProgress);
        }
        
        // Skip planting if progress exists
        if (savedData.currentIndex > 0) {
          setPhase('nurturing');
        }
      }
    } catch (error) {
      console.error('[PersonalityGarden] Failed to load progress:', error);
    }
  };

  // Save progress
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
      hasResponse: responses.has(currentQuestion?.id)
    });
    
    // Prevent duplicate answers for same question
    if (responses.has(currentQuestion.id)) {
      console.log('[PersonalityGarden] Question already answered, skipping...');
      return;
    }
    
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
    
    // Save progress
    await saveProgress();
    
    // Move to next question or complete
    if (currentIndex < questions.length - 1) {
      console.log('[PersonalityGarden] Moving to next question:', currentIndex + 1);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 1500); // Wait for animation
    } else {
      // All questions answered
      console.log('[PersonalityGarden] All questions answered, revealing...');
      setTimeout(() => {
        setPhase('revealing');
      }, 2000);
    }
  };

  // Handle completion
  const handleComplete = () => {
    const responseArray: QuestionResponse[] = Array.from(responses.entries()).map(
      ([questionId, answer]) => ({ questionId, answer })
    );
    onComplete(responseArray);
  };

  return (
    <div className="personality-garden-flow min-h-screen bg-gradient-to-b from-sky-100 via-green-50 to-emerald-100 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20 overflow-hidden">
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
            onCancel={onCancel}
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
    </div>
  );
};

export default PersonalityGardenFlow;
