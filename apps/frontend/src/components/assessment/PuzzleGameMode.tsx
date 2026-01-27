import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../types/assessment';
import PuzzleGameIntro from './PuzzleGameIntro';

interface PuzzleGameModeProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
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

const PuzzleGameMode = ({ questions, onComplete, onCancel }: PuzzleGameModeProps) => {
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

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Initialize puzzle pieces for current question
  useEffect(() => {
    if (!currentQuestion) return;

    let pieces: PuzzlePiece[] = [];

    if (currentQuestion.question_type === 'SCALE') {
      const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
      const emojis = ['😟', '🙁', '😐', '🙂', '😊'];
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
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Display */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-teal-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-6 relative overflow-hidden">
        <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full mb-4 shadow-lg">
          {currentQuestion.test_type === 'RIASEC' ? '🎯 Career Interest' : '🧠 Personality Trait'}
        </span>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
          {currentQuestion.question_text}
        </h3>
      </div>

      {/* Tetris-style Game Area */}
      <div className="relative w-full h-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-700">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-10 grid-rows-10 h-full">
            {[...Array(100)].map((_, i) => (
              <div key={i} className="border border-gray-600"></div>
            ))}
          </div>
        </div>

        {/* Falling Piece */}
        {fallingPiece && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-32 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-2xl flex items-center justify-center transition-all duration-100"
            style={{
              top: `${fallingY}%`,
            }}
          >
            <div className="text-center">
              {fallingPiece.emoji && (
                <div className="text-2xl mb-1">{fallingPiece.emoji}</div>
              )}
              <div className="text-white font-bold text-xs px-2">
                {fallingPiece.text}
              </div>
            </div>
          </div>
        )}

        {/* Placed Pieces at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex flex-wrap justify-center gap-2">
            {placedPieces.slice(-5).map((piece, index) => (
              <div
                key={piece.id}
                className="w-24 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-pulse"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="text-white font-bold text-xs text-center">
                  {piece.emoji && <div className="text-lg">{piece.emoji}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score display */}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl">
          <div className="text-yellow-400 font-bold text-sm">Score: {placedPieces.length}</div>
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
              className={`group relative bg-white dark:bg-gray-700 rounded-2xl p-4 border-2 transition-all duration-300 ${
                selectedAnswer === piece.value
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 opacity-50'
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
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
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
        onClick={onCancel}
        className="w-full px-6 py-3 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors"
      >
        Cancel Assessment
      </button>
    </div>
  );
};

export default PuzzleGameMode;
