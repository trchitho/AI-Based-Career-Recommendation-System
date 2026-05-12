import { memo } from 'react';
import { Question } from '../../../types/assessment';
import { NurtureElement } from './types/garden.types';

interface AnswerHistoryProps {
  answeredQuestions: Array<{
    question: Question;
    selectedElement: NurtureElement;
    questionNumber: number;
  }>;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const AnswerHistory: React.FC<AnswerHistoryProps> = memo(({
  answeredQuestions,
  isExpanded = false,
  onToggle
}) => {
  if (answeredQuestions.length === 0) return null;

  // Only show last 10 questions for performance
  const recentQuestions = answeredQuestions.slice(-10);

  return (
    <div className="answer-history fixed bottom-24 right-4 z-30 max-w-sm">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="mb-2 ml-auto flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all border-2 border-white/50"
      >
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
          📜 History ({answeredQuestions.length})
        </span>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* History panel - Only show last 10 for performance */}
      {isExpanded && (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <span>🌱</span>
              <span>Your Journey</span>
              {answeredQuestions.length > 10 && (
                <span className="text-xs text-gray-500">(Last 10)</span>
              )}
            </h3>
            
            <div className="space-y-2">
              {recentQuestions.map((item, index) => (
                <div
                  key={`${item.questionNumber}-${index}`}
                  className="group relative bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-3 hover:shadow-md transition-all border border-gray-200 dark:border-gray-600"
                >
                  {/* Question number badge */}
                  <div className="absolute -left-2 -top-2 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {item.questionNumber}
                  </div>

                  {/* Question text (truncated) */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 pl-4">
                    {item.question.question_text}
                  </p>

                  {/* Selected element */}
                  <div className={`flex items-center gap-2 bg-gradient-to-r ${item.selectedElement.color} rounded-lg px-3 py-2`}>
                    <span className="text-lg">{item.selectedElement.emoji}</span>
                    <span className="text-white text-xs font-bold flex-1">
                      {item.selectedElement.label}
                    </span>
                  </div>

                  {/* Removed hover tooltip for performance */}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compact view when collapsed - Only show last 5 */}
      {!isExpanded && answeredQuestions.length > 0 && (
        <div className="flex gap-1 flex-wrap max-w-xs">
          {answeredQuestions.slice(-5).map((item, index) => (
            <div
              key={`compact-${item.questionNumber}-${index}`}
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.selectedElement.color} flex items-center justify-center shadow-md`}
              title={`Q${item.questionNumber}: ${item.selectedElement.label}`}
            >
              <span className="text-sm">{item.selectedElement.emoji}</span>
            </div>
          ))}
          {answeredQuestions.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shadow-md text-xs font-bold text-gray-600 dark:text-gray-300">
              +{answeredQuestions.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Animations - Removed bounce-in for performance */}
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
});

AnswerHistory.displayName = 'AnswerHistory';

export default AnswerHistory;
