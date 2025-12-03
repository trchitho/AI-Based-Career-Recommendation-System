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

  const getCurrentPageQuestions = () => {
    const startIndex = currentPage * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    return allQuestions.slice(startIndex, endIndex);
  };

  const pageQuestions = getCurrentPageQuestions();
  const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
  const isLastPage = currentPage === totalPages - 1;

  const handleAnswer = (questionId: string, answer: string | number) => {
    const newResponses = new Map(responses);
    newResponses.set(questionId, answer);
    setResponses(newResponses);
    setError(null);

    // --- LOGIC TỰ ĐỘNG CUỘN VÀ CHUYỂN TRANG ---
    const currentIndex = pageQuestions.findIndex(q => q.id === questionId);
    const isLastQuestionOnPage = currentIndex === pageQuestions.length - 1;

    setTimeout(() => {
      if (!isLastQuestionOnPage) {
        // Nếu chưa phải câu cuối của trang, cuộn xuống câu tiếp theo
        const nextQuestion = pageQuestions[currentIndex + 1];
        // FIX: Kiểm tra nextQuestion tồn tại trước khi truy cập id
        if (nextQuestion) {
          const nextElement = document.getElementById(`question-${nextQuestion.id}`);
          if (nextElement) {
            nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else {
        // Nếu là câu cuối của trang (Câu thứ 5)
        const allAnswered = pageQuestions.every(q => newResponses.has(q.id));

        if (allAnswered && !isLastPage) {
          // Đã trả lời hết 5 câu và chưa phải trang cuối -> Qua trang mới & Lên đầu
          setCurrentPage(prev => prev + 1);
          const element = document.getElementById('assessment-top');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          // Trang cuối hoặc chưa trả lời hết -> Cuộn xuống nút điều khiển cuối trang
          const controlsElement = document.getElementById('pagination-controls');
          if (controlsElement) {
            controlsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }, 250); // Delay nhỏ để người dùng thấy hiệu ứng chọn
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      const element = document.getElementById('assessment-top');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      const element = document.getElementById('assessment-top');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const areCurrentPageQuestionsAnswered = () => {
    const pageQuestions = getCurrentPageQuestions();
    return pageQuestions.every(q => responses.has(q.id));
  };

  const getAnswer = (questionId: string) => {
    return responses.get(questionId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-green-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading questions...</p>
      </div>
    );
  }

  if (error && allQuestions.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Failed to load questions</h3>
        <p className="text-red-600 dark:text-red-300 mb-6">{error}</p>
        <button
          onClick={fetchQuestions}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div id="assessment-top" className="w-full">

      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
            {getProgress().toFixed(0)}% Completed
          </span>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Page {currentPage + 1} / {totalPages}
          </span>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-green-500 to-teal-500 h-3 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${getProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-10">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          How accurately does this describe you?
        </h3>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mt-4">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300"></div> Strongly Disagree</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-300"></div> Disagree</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-300"></div> Neutral</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-300"></div> Agree</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Strongly Agree</div>
        </div>
      </div>

      {/* Alert Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8 flex items-center gap-3 animate-pulse">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6 mb-12">
        {pageQuestions.map((question, index) => {
          const answer = getAnswer(question.id);

          return (
            <div
              id={`question-${question.id}`}
              key={question.id}
              className="group bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md scroll-mt-24"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Question Text */}
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Question {(currentPage * questionsPerPage) + index + 1}</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">
                    {question.question_text}
                  </h3>
                </div>

                {/* Answer Options */}
                <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6 w-full md:w-auto mt-4 md:mt-0">
                  {[
                    { value: 1, color: 'bg-red-100', active: 'bg-red-500', ring: 'ring-red-200' },
                    { value: 2, color: 'bg-orange-100', active: 'bg-orange-400', ring: 'ring-orange-200' },
                    { value: 3, color: 'bg-gray-100', active: 'bg-gray-400', ring: 'ring-gray-200' },
                    { value: 4, color: 'bg-green-100', active: 'bg-green-500', ring: 'ring-green-200' },
                    { value: 5, color: 'bg-emerald-100', active: 'bg-emerald-600', ring: 'ring-emerald-200' }
                  ].map(({ value, color, active, ring }) => (
                    <button
                      key={value}
                      onClick={() => handleAnswer(question.id, value)}
                      className={`
                                    relative w-10 h-10 md:w-12 md:h-12 rounded-full transition-all duration-300 flex items-center justify-center
                                    ${answer === value
                          ? `${active} text-white scale-110 shadow-lg ring-4 ${ring}`
                          : `${color} dark:bg-gray-700 text-transparent hover:scale-110`
                        }
                                `}
                      aria-label={`Rate ${value}`}
                    >
                      {answer === value && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div id="pagination-controls" className="flex justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${currentPage === 0
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Previous
        </button>

        {!isLastPage ? (
          <button
            onClick={handleNext}
            disabled={!areCurrentPageQuestionsAnswered()}
            className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center gap-2"
          >
            Next Step
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            Complete Assessment
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default CareerTestComponent;