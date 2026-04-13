import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../types/assessment';

interface GameQuizModeProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
}

const GameQuizMode = ({ questions, onComplete, onCancel }: GameQuizModeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [showFeedback, setShowFeedback] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const xpPerQuestion = 10;
  const xpForLevel = level * 100;

  useEffect(() => {
    // Calculate level from XP
    const newLevel = Math.floor(xp / 100) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [xp, level]);

  const handleAnswer = (answer: string | number) => {
    const newResponses = new Map(responses);
    const isNewAnswer = !newResponses.has(currentQuestion.id);
    newResponses.set(currentQuestion.id, answer);
    setResponses(newResponses);

    // Award XP only for new answers
    if (isNewAnswer) {
      setXp(prev => prev + xpPerQuestion);
      setShowFeedback(true);
      
      setTimeout(() => {
        setShowFeedback(false);
        if (currentIndex < questions.length - 1) {
          setCardFlipped(false);
          setCurrentIndex(currentIndex + 1);
        } else {
          handleSubmit(newResponses);
        }
      }, 1500);
    } else {
      // Just move to next question if changing answer
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCardFlipped(false);
          setCurrentIndex(currentIndex + 1);
        } else {
          handleSubmit(newResponses);
        }
      }, 300);
    }
  };

  const handleSubmit = (finalResponses?: Map<string, string | number>) => {
    const responsesToSubmit = finalResponses || responses;
    const responseArray: QuestionResponse[] = Array.from(responsesToSubmit.entries()).map(
      ([questionId, answer]) => ({
        questionId,
        answer,
      })
    );
    onComplete(responseArray);
  };

  const currentAnswer = responses.get(currentQuestion.id);

  return (
    <div className="relative space-y-6">
      {/* XP and Level Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Level Badge */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {level}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-gray-900">
              ⭐
            </div>
          </div>
          
          {/* XP Bar */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              <span>Level {level}</span>
              <span>{xp % 100} / 100 XP</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${(xp % 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total XP */}
        <div className="text-right">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            {xp} XP
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Earned</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-400">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card with Flip Animation */}
      <div className="perspective-1000">
        <div className={`relative transition-transform duration-700 transform-style-3d ${cardFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front of Card */}
          <div className="backface-hidden">
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C27B0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
              </div>

              <div className="relative z-10">
                <div className="mb-6">
                  <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full mb-4 shadow-lg">
                    {currentQuestion.test_type === 'RIASEC' ? '🎯 Career Interest' : '🧠 Personality Trait'}
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>
                </div>

                {/* Answer Options with Animation */}
                <div className="space-y-3">
                  {currentQuestion.question_type === 'SCALE' ? (
                    // Likert Scale with Emoji
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>😟 Strongly Disagree</span>
                        <span>😊 Strongly Agree</span>
                      </div>
                      <div className="flex gap-3">
                        {[
                          { value: 1, emoji: '😟', label: 'Strongly Disagree' },
                          { value: 2, emoji: '🙁', label: 'Disagree' },
                          { value: 3, emoji: '😐', label: 'Neutral' },
                          { value: 4, emoji: '🙂', label: 'Agree' },
                          { value: 5, emoji: '😊', label: 'Strongly Agree' }
                        ].map(({ value, emoji, label }) => (
                          <button
                            key={value}
                            onClick={() => handleAnswer(value)}
                            className={`flex-1 h-20 rounded-2xl font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                              currentAnswer === value
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-2xl scale-110 -translate-y-2'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:scale-105 hover:-translate-y-1'
                            }`}
                            title={label}
                          >
                            <span className="text-2xl">{emoji}</span>
                            <span className="text-sm">{value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Multiple Choice with Icons
                    currentQuestion.options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        className={`w-full p-6 rounded-2xl text-left font-medium transition-all duration-300 relative overflow-hidden group ${
                          currentAnswer === option
                            ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-2xl scale-105'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:scale-102 hover:shadow-lg'
                        }`}
                      >
                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            currentAnswer === option
                              ? 'border-white bg-white'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {currentAnswer === option && (
                              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="flex-1">{option}</span>
                          {currentAnswer === option && (
                            <span className="text-2xl animate-bounce">✨</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Animation */}
      {showFeedback && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <div className="font-bold text-xl">+{xpPerQuestion} XP</div>
                <div className="text-sm opacity-90">Great answer!</div>
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

      {/* Custom Styles for 3D Transform */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default GameQuizMode;
