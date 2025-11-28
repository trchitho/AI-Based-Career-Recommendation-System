import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Question, QuestionResponse } from '../../types/assessment';
import { assessmentService } from '../../services/assessmentService';

interface CareerTestComponentProps {
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
}

const CareerTestComponent = ({ onComplete, onCancel }: CareerTestComponentProps) => {
  const { t } = useTranslation();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [riasec, bigFive] = await Promise.all([
        assessmentService.getQuestions('RIASEC'),
        assessmentService.getQuestions('BIG_FIVE'),
      ]);

      const combined = [...riasec, ...bigFive].sort((a, b) => a.order_index - b.order_index);
      setAllQuestions(combined);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load assessment questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string | number) => {
    const currentQuestion = allQuestions[currentQuestionIndex];
    if (!currentQuestion) return;
    const newResponses = new Map(responses);
    newResponses.set(currentQuestion.id, answer);
    setResponses(newResponses);
  };

  const handleNext = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    const unansweredQuestions = allQuestions.filter(q => !responses.has(q.id));

    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. ${unansweredQuestions.length} question(s) remaining.`);
      return;
    }

    const responseArray: QuestionResponse[] = Array.from(responses.entries()).map(
      ([questionId, answer]) => ({
        questionId,
        answer,
      })
    );

    onComplete(responseArray);
  };

  const getProgress = () => {
    const answeredCount = responses.size;
    return (answeredCount / allQuestions.length) * 100;
  };

  const isCurrentQuestionAnswered = () => {
    const currentQuestion = allQuestions[currentQuestionIndex];
    return currentQuestion && responses.has(currentQuestion.id);
  };

  const getCurrentAnswer = () => {
    const currentQuestion = allQuestions[currentQuestionIndex];
    return currentQuestion ? responses.get(currentQuestion.id) : undefined;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error && allQuestions.length === 0) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchQuestions}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;

  if (!currentQuestion) return null;

  return (
    <div className="max-w-4xl mx-auto">

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
            {t('assessment.question')} {currentQuestionIndex + 1} {t('assessment.of')} {allQuestions.length}
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
            {responses.size} {t('assessment.answered')}
          </span>
        </div>

        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgress()}%` }}
          ></div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 text-sm">{error}</p>
        </div>
      )}

      {/* Card */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700/50 shadow-xl rounded-2xl p-8 mb-6">

        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full 
                         bg-purple-200 dark:bg-purple-500/20 
                         text-purple-800 dark:text-purple-300">
          {currentQuestion.test_type === 'RIASEC'
            ? t('assessment.careerInterest')
            : t('assessment.personality')}
        </span>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-8">
          {currentQuestion.question_text}
        </h3>

        {/* Answer Options */}
        <div className="space-y-4">
          {currentQuestion.question_type === 'MULTIPLE_CHOICE' ? (
            currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all 
                ${getCurrentAnswer() === option
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 text-gray-800 dark:text-gray-300'
                  }`}
              >
                {option}
              </button>
            ))
          ) : (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-400 mb-4">
                {t('assessment.rateFrom')}
              </p>

              <div className="grid grid-cols-5 gap-4 justify-items-center items-center">

                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAnswer(value)}
                    className={`w-16 h-16 rounded-full border-2 font-bold transition-all
                    ${getCurrentAnswer() === value
                        ? 'border-purple-500 bg-purple-500 text-white scale-110 shadow-lg'
                        : 'border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                      }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-5 text-xs text-gray-500 dark:text-gray-400 px-2 mt-2">
                <span className="text-left">{t('assessment.stronglyDisagree')}</span>
                <span></span>
                <span className="text-center">{t('assessment.neutral')}</span>
                <span></span>
                <span className="text-right">{t('assessment.stronglyAgree')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">

        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          {t('common.cancel')}
        </button>

        <div className="flex space-x-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-xl 
            hover:bg-gray-400 dark:hover:bg-gray-600 
            disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.previous')}
          </button>

          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered()}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              {t('assessment.submitAssessment')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerTestComponent;
