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
        assessmentService.getQuestions('BIG_FIVE'),
      ]);

      const combined = [...riasec, ...bigFive].sort((a, b) => a.order_index - b.order_index);
      setAllQuestions(combined);
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

  const pageQuestions = getCurrentPageQuestions();
  const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
  const isLastPage = currentPage === totalPages - 1;
  const startQuestionNumber = currentPage * questionsPerPage + 1;
  const endQuestionNumber = Math.min((currentPage + 1) * questionsPerPage, allQuestions.length);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {responses.size} / {allQuestions.length} answered ({getProgress().toFixed(0)}%)
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Questions {startQuestionNumber}-{endQuestionNumber} of {allQuestions.length}
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 h-3 rounded-full transition-all duration-500 shadow-md"
            style={{ width: `${getProgress()}%` }}
          ></div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6 mb-8">
        {pageQuestions.map((question, index) => {
          const questionNumber = currentPage * questionsPerPage + index + 1;
          const answer = getAnswer(question.id);
          const isAnswered = answer !== undefined;
          
          // Sử dụng màu xanh lục chủ đạo - đồng nhất với HomePage

          return (
            <div
              key={question.id}
              className={`bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 border-2 transition-all duration-300 ${
                isAnswered
                  ? 'border-[#4A7C59] dark:border-green-600 bg-[#E8DCC8]/30 dark:bg-green-900/10 hover:shadow-2xl'
                  : 'border-gray-200 dark:border-gray-700 hover:border-[#4A7C59]/30 dark:hover:border-green-600/30 hover:shadow-xl'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start mb-6">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold mr-4 shadow-md transition-all duration-300 ${
                  isAnswered
                    ? 'bg-gradient-to-br from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 text-white scale-110'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {questionNumber}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {question.question_text}
                </h3>
                {isAnswered && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Answer Options */}
              {question.question_type === 'MULTIPLE_CHOICE' && question.options ? (
                <div className="space-y-3 ml-14">
                  {question.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => handleAnswer(question.id, option)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                        answer === option
                          ? 'border-[#4A7C59] bg-[#4A7C59]/10 dark:bg-green-600/20 text-[#4A7C59] dark:text-green-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-[#4A7C59] dark:hover:border-green-600 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ml-14">
                  <div className="flex justify-between items-center gap-2">
                    {[
                      { value: 1, label: 'Strongly Disagree', color: 'bg-red-400' },
                      { value: 2, label: 'Disagree', color: 'bg-orange-400' },
                      { value: 3, label: 'Neutral', color: 'bg-gray-400' },
                      { value: 4, label: 'Agree', color: 'bg-green-300' },
                      { value: 5, label: 'Strongly Agree', color: 'bg-green-500' }
                    ].map(({ value, label, color }) => (
                      <div key={value} className="flex flex-col items-center flex-1">
                        <button
                          onClick={() => handleAnswer(question.id, value)}
                          className={`w-12 h-12 rounded-full transition-all transform hover:scale-110 ${
                            answer === value
                              ? `${color} ring-4 ring-offset-2 ring-[#4A7C59] dark:ring-green-600 scale-110 shadow-xl`
                              : `${color} opacity-50 hover:opacity-100`
                          }`}
                          title={label}
                        />
                        <span className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2 hidden md:block">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-3">
                    <span>Strongly Disagree</span>
                    <span>Strongly Agree</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div className="text-center px-4">
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentPage
                    ? 'w-8 bg-[#4A7C59] dark:bg-green-600'
                    : i < currentPage
                    ? 'w-2 bg-[#4A7C59] dark:bg-green-600'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Page {currentPage + 1} of {totalPages}
          </p>
        </div>

        {!isLastPage ? (
          <button
            onClick={handleNext}
            disabled={!areCurrentPageQuestionsAnswered()}
            className="px-6 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
          >
            Next
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 transition-all shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('assessment.submitAssessment')}
          </button>
        )}
      </div>
    </div>
  );
};

export default CareerTestComponent;
