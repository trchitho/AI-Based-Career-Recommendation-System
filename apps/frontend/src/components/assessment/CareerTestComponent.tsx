import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Question, QuestionResponse } from '../../types/assessment';
import { assessmentService } from '../../services/assessmentService';

interface CareerTestComponentProps {
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
}

const CareerTestComponent = ({ onComplete }: CareerTestComponentProps) => {
  const { t } = useTranslation();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const questionsPerPage = 5;

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [riasec, bigFive] = await Promise.all([
        assessmentService.getQuestions('RIASEC'),
        assessmentService.getQuestions('BIGFIVE'),
      ]);

      const rQueue = [...riasec];
      const bQueue = [...bigFive];
      const combined: Question[] = [];

      while (rQueue.length > 0 || bQueue.length > 0) {
        if (rQueue.length > 0) {
          combined.push(rQueue.shift()!);
        }
        if (bQueue.length > 0) {
          combined.push(bQueue.shift()!);
        }
      }

      const finalQuestions = combined.map((q, idx) => ({
        ...q,
        order_index: idx + 1,
      }));

      setAllQuestions(finalQuestions);

    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(t('assessment.failedToLoad') || 'Failed to load assessment questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string | number) => {
    const newResponses = new Map(responses);
    newResponses.set(questionId, answer);
    setResponses(newResponses);
    setError(null);
  };

  const handleNext = () => {
    const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const getCurrentPageQuestions = () => {
    const startIndex = currentPage * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    return allQuestions.slice(startIndex, endIndex);
  };

  const areCurrentPageQuestionsAnswered = () => {
    const pageQuestions = getCurrentPageQuestions();
    return pageQuestions.every(q => responses.has(q.id));
  };

  const getAnswer = (questionId: string) => {
    return responses.get(questionId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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

  const pageQuestions = getCurrentPageQuestions();
  const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {getProgress().toFixed(0)}%
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {currentPage + 1} of {totalPages}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-2 transition-all duration-500"
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
          Choose how accurately each statement reflects you.
        </h2>

        {/* Legend - Thang đo mẫu */}
        <div className="mb-8">
          <div className="flex justify-center items-start gap-4 md:gap-8">
            {[
              { label: 'Strongly\nDisagree', color: 'bg-red-200 dark:bg-red-300' },
              { label: 'Disagree', color: 'bg-orange-200 dark:bg-orange-300' },
              { label: 'Neutral', color: 'bg-gray-200 dark:bg-gray-300' },
              { label: 'Agree', color: 'bg-green-200 dark:bg-green-300' },
              { label: 'Strongly\nAgree', color: 'bg-emerald-400 dark:bg-emerald-400' }
            ].map(({ label, color }, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${color} mb-2`}></div>
                <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 text-center whitespace-pre-line font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4 mb-8">
          {pageQuestions.map((question) => {
            const answer = getAnswer(question.id);

            return (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 border border-gray-100 dark:border-gray-700"
              >
                {/* Question Text */}
                <h3 className="text-base md:text-lg text-gray-700 dark:text-gray-200 text-center mb-6 font-medium">
                  {question.question_text}
                </h3>

                {/* Answer Options - 5 hình tròn nằm ngang */}
                <div className="flex justify-center items-center gap-4 md:gap-8">
                  {[
                    { value: 1, color: 'bg-red-200 dark:bg-red-300', selectedColor: 'bg-red-300 dark:bg-red-400' },
                    { value: 2, color: 'bg-orange-200 dark:bg-orange-300', selectedColor: 'bg-orange-300 dark:bg-orange-400' },
                    { value: 3, color: 'bg-gray-200 dark:bg-gray-300', selectedColor: 'bg-gray-300 dark:bg-gray-400' },
                    { value: 4, color: 'bg-green-200 dark:bg-green-300', selectedColor: 'bg-green-300 dark:bg-green-400' },
                    { value: 5, color: 'bg-emerald-400 dark:bg-emerald-400', selectedColor: 'bg-emerald-500 dark:bg-emerald-500' }
                  ].map(({ value, color, selectedColor }) => (
                    <button
                      key={value}
                      onClick={() => handleAnswer(question.id, value)}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full transition-all transform hover:scale-110 ${answer === value
                        ? `${selectedColor} scale-110 shadow-lg ring-4 ring-emerald-200 dark:ring-emerald-600`
                        : `${color} hover:opacity-80`
                        }`}
                      aria-label={`Rate ${value}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          All questions must be answered before you continue.
        </p>

        {/* Navigation Button */}
        <div className="flex justify-center">
          {!isLastPage ? (
            <button
              onClick={handleNext}
              disabled={!areCurrentPageQuestionsAnswered()}
              className="w-full max-w-2xl px-8 py-4 bg-emerald-700 dark:bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full max-w-2xl px-8 py-4 bg-emerald-700 dark:bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition-all shadow-lg"
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
