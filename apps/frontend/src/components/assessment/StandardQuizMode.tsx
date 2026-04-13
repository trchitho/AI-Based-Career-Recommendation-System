import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../types/assessment';

interface StandardQuizModeProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
}

const StandardQuizMode = ({ questions, onComplete, onCancel }: StandardQuizModeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [showReview, setShowReview] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string | number) => {
    const newResponses = new Map(responses);
    newResponses.set(currentQuestion.id, answer);
    setResponses(newResponses);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowReview(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
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

  const currentAnswer = responses.get(currentQuestion.id);
  const isAnswered = currentAnswer !== undefined;

  if (showReview) {
    const answeredCount = responses.size;
    const unansweredQuestions = questions.filter(q => !responses.has(q.id));

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Review Your Answers</h3>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-2xl font-bold">
              {answeredCount}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {answeredCount} of {questions.length} questions answered
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {unansweredQuestions.length > 0 
                  ? `${unansweredQuestions.length} questions remaining` 
                  : 'All questions completed!'}
              </p>
            </div>
          </div>

          {unansweredQuestions.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                You have unanswered questions. You can go back to answer them or submit as is.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowReview(false)}
            className="flex-1 px-6 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all duration-200"
          >
            Back to Questions
          </button>
          <button
            onClick={handleSubmit}
            disabled={responses.size === 0}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          >
            Submit Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-400">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-teal-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 relative overflow-hidden">
        {/* Puzzle piece decorations */}
        <div className="absolute top-4 right-4 text-4xl opacity-20">🧩</div>
        <div className="absolute bottom-4 left-4 text-3xl opacity-10">🧩</div>
        
        <div className="mb-6 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full shadow-lg">
              {currentQuestion.test_type === 'RIASEC' ? '🎯 Career Interest' : '🧠 Personality Trait'}
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Puzzle Piece {currentIndex + 1}/{questions.length}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
            {currentQuestion.question_text}
          </h3>
        </div>

        {/* Answer Options */}
        <div className="space-y-3 relative z-10">
          {currentQuestion.question_type === 'SCALE' ? (
            // Likert Scale (1-5) with puzzle theme
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAnswer(value)}
                    className={`flex-1 h-20 rounded-xl font-semibold text-lg transition-all duration-200 relative overflow-hidden ${
                      currentAnswer === value
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105'
                    }`}
                  >
                    {currentAnswer === value && (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
                        🧩
                      </div>
                    )}
                    <span className="relative z-10">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Multiple Choice with puzzle theme
            currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className={`w-full p-5 rounded-xl text-left font-medium transition-all duration-200 relative overflow-hidden ${
                  currentAnswer === option
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-102'
                }`}
              >
                {currentAnswer === option && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl opacity-30">
                    🧩
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === option
                      ? 'border-white bg-white'
                      : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {currentAnswer === option && (
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-6 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:text-gray-400 dark:disabled:text-gray-600 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {currentIndex === questions.length - 1 ? 'Review Answers' : 'Next Question'}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

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

export default StandardQuizMode;
