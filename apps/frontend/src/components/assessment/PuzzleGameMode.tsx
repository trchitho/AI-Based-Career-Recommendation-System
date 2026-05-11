import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../types/assessment';
import PuzzleGameIntro from './PuzzleGameIntro';
import gamificationService from '../../services/gamificationService';

interface PuzzleGameModeProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
  assessmentSessionId?: number; // Add this prop
}

interface PuzzlePiece {
  id: string;
  text: string;
  emoji?: string;
  value: string | number;
  position: { x: number; y: number };
  isPlaced: boolean;
  correctSlot?: number;
}

const PuzzleGameMode = ({ questions, onComplete, onCancel, assessmentSessionId }: PuzzleGameModeProps) => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Tetris-style game state
  const [fallingPiece, setFallingPiece] = useState<PuzzlePiece | null>(null);
  const [availablePieces, setAvailablePieces] = useState<PuzzlePiece[]>([]);
  const [placedPieces, setPlacedPieces] = useState<PuzzlePiece[]>([]);
  const [fallingY, setFallingY] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Gamification state
  const [gamificationSessionId, setGamificationSessionId] = useState<number | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  const SAVE_KEY = 'puzzle_game_progress';

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Initialize gamification session on mount
  useEffect(() => {
    const initGamificationSession = async () => {
      if (assessmentSessionId && !gamificationSessionId) {
        try {
          const session = await gamificationService.startSession(assessmentSessionId, 'game');
          setGamificationSessionId(session.gamification_session_id);
          
          // Try to load saved progress
          await loadProgressFromDatabase(session.gamification_session_id);
        } catch (error) {
          console.error('Failed to start gamification session:', error);
          // Fallback to localStorage
          loadProgressFromLocalStorage();
        }
      } else if (!assessmentSessionId) {
        // No assessment session, use localStorage
        loadProgressFromLocalStorage();
      }
    };

    initGamificationSession();
  }, [assessmentSessionId]);

  // Load progress from database
  const loadProgressFromDatabase = async (sessionId: number) => {
    setIsLoadingProgress(true);
    try {
      const savedData = await gamificationService.loadGameProgress(sessionId);
      
      if (savedData && Object.keys(savedData).length > 0) {
        setCurrentIndex(savedData.currentIndex || 0);
        setResponses(new Map(savedData.responses || []));
        setXp(savedData.xp || 0);
        setLevel(savedData.level || 1);
        setPlacedPieces(savedData.placedPieces || []);
      }
    } catch (error) {
      console.error('Failed to load progress from database:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Load progress from localStorage (fallback)
  const loadProgressFromLocalStorage = () => {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCurrentIndex(parsed.currentIndex || 0);
        setResponses(new Map(parsed.responses || []));
        setXp(parsed.xp || 0);
        setLevel(parsed.level || 1);
        setPlacedPieces(parsed.placedPieces || []);
      } catch (e) {
        console.error('Failed to load saved progress from localStorage:', e);
      }
    }
  };

  // Handle browser back button and page close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Auto-save when user tries to leave
      saveProgress();
      e.preventDefault();
      e.returnValue = 'Bạn có muốn lưu tiến trình không?';
      return e.returnValue;
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setShowExitConfirm(true);
      // Push state back to prevent immediate navigation
      window.history.pushState(null, '', window.location.href);
    };

    // Add state to history to catch back button
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentIndex, responses, xp, level, placedPieces]);

  // Save progress function - try database first, fallback to localStorage
  const saveProgress = async () => {
    const dataToSave = {
      currentIndex,
      responses: Array.from(responses.entries()),
      xp,
      level,
      placedPieces,
      timestamp: Date.now(),
    };

    // Try database first
    if (gamificationSessionId) {
      try {
        await gamificationService.saveGameProgress({
          gamificationSessionId,
          currentIndex,
          xp,
          level,
          score: 0, // PuzzleGameMode doesn't have score
          responses: Array.from(responses.entries()),
        });
        console.log('Progress saved to database');
        return;
      } catch (error) {
        console.error('Failed to save to database, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
    console.log('Progress saved to localStorage');
  };

  // Clear saved progress
  const clearProgress = () => {
    localStorage.removeItem(SAVE_KEY);
    // Note: Database progress is kept for history
  };

  // Handle exit with confirmation
  const handleExitClick = () => {
    setShowExitConfirm(true);
  };

  // Save and exit
  const handleSaveAndExit = () => {
    saveProgress();
    setShowExitConfirm(false);
    // Allow navigation
    window.removeEventListener('beforeunload', () => {});
    window.removeEventListener('popstate', () => {});
    onCancel();
  };

  // Exit without saving
  const handleExitWithoutSave = () => {
    clearProgress();
    setShowExitConfirm(false);
    // Allow navigation
    window.removeEventListener('beforeunload', () => {});
    window.removeEventListener('popstate', () => {});
    onCancel();
  };

  // Cancel exit
  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  // Initialize puzzle pieces for current question
  useEffect(() => {
    if (!currentQuestion) return;

    let pieces: PuzzlePiece[] = [];

    if (currentQuestion.question_type === 'SCALE') {
      const labels = ['Rất không đồng ý', 'Không đồng ý', 'Trung lập', 'Đồng ý', 'Rất đồng ý'];
      const emojis = ['', '', '', '', ''];
      pieces = [1, 2, 3, 4, 5].map((value, index) => ({
        id: `piece-${value}`,
        text: labels[index],
        emoji: emojis[index],
        value: value,
        position: { x: index * 20, y: 0 },
        isPlaced: false,
        correctSlot: index,
      }));
    } else if (currentQuestion.options) {
      pieces = currentQuestion.options.map((option, index) => ({
        id: `piece-${index}`,
        text: option,
        value: option,
        position: { x: index * 20, y: 0 },
        isPlaced: false,
        correctSlot: index,
      }));
    }

    setAvailablePieces(pieces);
    setPlacedPieces([]);
    setFallingPiece(null);
    setFallingY(0);
    setSelectedAnswer(null);
  }, [currentIndex, currentQuestion]);

  // Animate falling piece
  useEffect(() => {
    if (!fallingPiece) return;

    const interval = setInterval(() => {
      setFallingY(prev => {
        if (prev >= 100) {
          // Piece reached bottom
          handlePieceLanded();
          return 0;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [fallingPiece]);

  const handlePieceClick = (piece: PuzzlePiece) => {
    if (fallingPiece) return; // Already have a falling piece

    setFallingPiece(piece);
    setFallingY(0);
    setSelectedAnswer(piece.value);
  };

  const handlePieceLanded = () => {
    if (!fallingPiece) return;

    // Save response
    const newResponses = new Map(responses);
    newResponses.set(currentQuestion.id, fallingPiece.value);
    setResponses(newResponses);

    // Add to placed pieces
    setPlacedPieces(prev => [...prev, { ...fallingPiece, isPlaced: true }]);

    // Award XP
    setXp(prev => prev + 10);
    if ((xp + 10) % 100 === 0) {
      setLevel(prev => prev + 1);
    }

    // Show success
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1000);

    // Move to next question
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        handleSubmit();
      }
    }, 1500);
  };

  const handleSubmit = () => {
    const responseArray: QuestionResponse[] = Array.from(responses.entries()).map(
      ([questionId, answer]) => ({
        questionId,
        answer,
      })
    );
    onComplete(responseArray);
  };

  // Show intro screen first
  if (showIntro) {
    return (
      <PuzzleGameIntro
        onStart={() => setShowIntro(false)}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="relative space-y-6">
      {/* XP and Level Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {level}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-gray-900">
              ⭐
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              <span>Level {level}</span>
              <span>{xp % 100} / 100 XP</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${(xp % 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
            {xp} XP
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Earned</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-400">
          <span>Puzzle {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Display */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-teal-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-6 relative overflow-hidden">
        <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full mb-4 shadow-lg">
          {currentQuestion.test_type === 'RIASEC' ? ' Career Interest' : ' Personality Trait'}
        </span>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
          {currentQuestion.question_text}
        </h3>
      </div>

      {/* Tetris-style Game Area */}
      <div className="relative w-full max-w-4xl mx-auto h-[700px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-700">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-11 grid-rows-12 h-full">
            {[...Array(132)].map((_, i) => (
              <div key={i} className="border-2 border-gray-600"></div>
            ))}
          </div>
        </div>

        {/* Falling Piece */}
        {fallingPiece && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-40 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-2xl flex items-center justify-center transition-all duration-100"
            style={{
              top: `${fallingY}%`,
            }}
          >
            <div className="text-center">
              {fallingPiece.emoji && (
                <div className="text-3xl mb-1">{fallingPiece.emoji}</div>
              )}
              <div className="text-white font-bold text-sm px-2">
                {fallingPiece.text}
              </div>
            </div>
          </div>
        )}

        {/* Placed Pieces at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap justify-center gap-3">
            {placedPieces.slice(-5).map((piece, index) => (
              <div
                key={piece.id}
                className="w-32 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-pulse"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="text-white font-bold text-sm text-center">
                  {piece.emoji && <div className="text-2xl">{piece.emoji}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score display */}
        <div className="absolute top-6 right-6 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-xl">
          <div className="text-yellow-400 font-bold text-lg">Score: {placedPieces.length}</div>
        </div>
      </div>

      {/* Available Pieces to Click */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">
          Click a piece to drop it:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {availablePieces.map((piece) => (
            <button
              key={piece.id}
              onClick={() => handlePieceClick(piece)}
              disabled={!!fallingPiece || selectedAnswer === piece.value}
              className={`group relative bg-white dark:bg-gray-700 rounded-2xl p-4 border-2 transition-all duration-300 ${selectedAnswer === piece.value
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 opacity-50'
                  : fallingPiece
                    ? 'border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                    : 'border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:scale-105 hover:shadow-xl cursor-pointer'
                }`}
            >
              <div className="text-center">
                {piece.emoji && (
                  <div className="text-3xl mb-2">{piece.emoji}</div>
                )}
                <div className="font-semibold text-gray-900 dark:text-white text-sm">
                  {piece.text}
                </div>
              </div>

              {selectedAnswer !== piece.value && !fallingPiece && (
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-2xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Click!
                  </span>
                </div>
              )}

              {selectedAnswer === piece.value && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-700 rounded-full flex items-center justify-center text-white text-xs">

                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-700 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-3xl"></span>
              <div>
                <div className="font-bold text-xl">Perfect Drop!</div>
                <div className="text-sm opacity-90">+10 XP</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      <button
        onClick={handleExitClick}
        className="w-full px-6 py-3 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors"
      >
        Cancel Assessment
      </button>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 transform animate-bounce-in">
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
              <p>Tiến trình hiện tại: {currentIndex + 1}/{questions.length} câu</p>
              <p>XP: {xp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleGameMode;
