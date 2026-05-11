import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Question, QuestionResponse } from '../../types/assessment';
import { assessmentService } from '../../services/assessmentService';
import { useAuth } from '../../contexts/AuthContext';
import './CareerTestButtons.css';

// LocalStorage key for auto-save - now includes userId for per-user storage
const AUTOSAVE_KEY_PREFIX = 'assessment_autosave_';
const AUTOSAVE_TIMESTAMP_KEY_PREFIX = 'assessment_autosave_timestamp_';
const AUTOSAVE_EXPIRY_HOURS = 24; // Dữ liệu hết hạn sau 24 giờ

// Helper to get user-specific keys
const getAutosaveKey = (userId: number | string | undefined) =>
  `${AUTOSAVE_KEY_PREFIX}${userId || 'guest'}`;
const getAutosaveTimestampKey = (userId: number | string | undefined) =>
  `${AUTOSAVE_TIMESTAMP_KEY_PREFIX}${userId || 'guest'}`;

interface AutoSaveData {
  responses: [string, string | number][];
  currentPage: number;
  questionsCount: number;
  questionIds: string[]; // Lưu thứ tự câu hỏi để khôi phục đúng
  questions: Question[]; // Lưu toàn bộ câu hỏi để không phụ thuộc API
}

interface CareerTestComponentProps {
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
}

const CareerTestComponent = ({ onComplete }: CareerTestComponentProps) => {
  const { t } = useTranslation();
  const { user } = useAuth(); // Get current user
  const userId = user?.id; // User ID for per-user storage

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedProgress, setSavedProgress] = useState<AutoSaveData | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const questionsPerPage = 5;

  // Check if saved data is expired
  const isSavedDataValid = useCallback(() => {
    const timestamp = localStorage.getItem(getAutosaveTimestampKey(userId));
    if (!timestamp) return false;

    const savedTime = new Date(timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

    return hoursDiff < AUTOSAVE_EXPIRY_HOURS;
  }, [userId]);

  // Load saved progress from localStorage
  const loadSavedProgress = useCallback(() => {
    try {
      const autosaveKey = getAutosaveKey(userId);
      const saved = localStorage.getItem(autosaveKey);
      console.log(` Raw localStorage data for user ${userId}:`, saved);

      if (saved && isSavedDataValid()) {
        const data: AutoSaveData = JSON.parse(saved);
        console.log(' Parsed data:', data);

        // Validate data structure
        if (data && Array.isArray(data.responses) && data.responses.length > 0) {
          return data;
        }
      }

      // Check timestamp
      const timestamp = localStorage.getItem(getAutosaveTimestampKey(userId));
      console.log('⏰ Timestamp:', timestamp);

    } catch (e) {
      console.error(' Error loading saved progress:', e);
    }
    return null;
  }, [isSavedDataValid, userId]);

  // Save progress to localStorage - include questions for proper restoration
  const saveProgress = useCallback((responsesMap: Map<string, string | number>, page: number, questions: Question[]) => {
    try {
      const data: AutoSaveData = {
        responses: Array.from(responsesMap.entries()),
        currentPage: page,
        questionsCount: questions.length,
        questionIds: questions.map(q => String(q.id)),
        questions: questions, // Lưu toàn bộ câu hỏi
      };
      const autosaveKey = getAutosaveKey(userId);
      const timestampKey = getAutosaveTimestampKey(userId);
      localStorage.setItem(autosaveKey, JSON.stringify(data));
      localStorage.setItem(timestampKey, new Date().toISOString());
      setLastSaved(new Date());
      console.log(` Auto-saved for user ${userId}:`, data.responses.length, 'answers, page', page);
    } catch (e) {
      console.error(' Error saving progress:', e);
    }
  }, [userId]);

  // Clear saved progress
  const clearSavedProgress = useCallback(() => {
    const autosaveKey = getAutosaveKey(userId);
    const timestampKey = getAutosaveTimestampKey(userId);
    localStorage.removeItem(autosaveKey);
    localStorage.removeItem(timestampKey);
    setSavedProgress(null);
    console.log(` Cleared saved progress for user ${userId}`);
  }, [userId]);

  // Check for saved progress on mount and when userId changes
  useEffect(() => {
    // Cleanup old autosave data without userId (legacy format)
    const oldAutosaveKey = 'assessment_autosave';
    const oldTimestampKey = 'assessment_autosave_timestamp';
    if (localStorage.getItem(oldAutosaveKey)) {
      console.log(' Cleaning up legacy autosave data (no userId)');
      localStorage.removeItem(oldAutosaveKey);
      localStorage.removeItem(oldTimestampKey);
    }

    console.log(` Checking for saved progress for user ${userId}...`);
    const saved = loadSavedProgress();
    console.log(' Saved data:', saved);

    if (saved && saved.responses && saved.responses.length > 0) {
      console.log(' Found saved progress:', saved.responses.length, 'answers');
      console.log(' Setting showResumeModal to TRUE');
      setSavedProgress(saved);
      setShowResumeModal(true);
    } else {
      console.log(' No saved progress found');
      // Reset state when switching users
      setSavedProgress(null);
      setShowResumeModal(false);
    }
  }, [userId]); // Re-check when userId changes (user login/logout)

  // Resume from saved progress
  const handleResume = () => {
    if (savedProgress) {
      console.log(' Resuming with', savedProgress.responses.length, 'answers');

      const restoredResponses = new Map(savedProgress.responses);
      console.log(' Restored Map size:', restoredResponses.size);

      setResponses(restoredResponses);
      setCurrentPage(savedProgress.currentPage);

      // Dùng câu hỏi đã lưu thay vì từ API
      if (savedProgress.questions && savedProgress.questions.length > 0) {
        console.log(' Using saved questions:', savedProgress.questions.length);
        setAllQuestions(savedProgress.questions);
        setLoading(false); // Không cần load từ API nữa
      }

      setShowResumeModal(false);
    }
  };

  // Start fresh (clear saved data)
  const handleStartFresh = () => {
    clearSavedProgress();
    setShowResumeModal(false);
    setResponses(new Map());
    setCurrentPage(0);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Save on page unload (when user closes tab or navigates away)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (responses.size > 0 && allQuestions.length > 0) {
        // Force save before leaving
        const data: AutoSaveData = {
          responses: Array.from(responses.entries()),
          currentPage: currentPage,
          questionsCount: allQuestions.length,
          questionIds: allQuestions.map(q => String(q.id)),
          questions: allQuestions, // Lưu toàn bộ câu hỏi
        };
        const autosaveKey = getAutosaveKey(userId);
        const timestampKey = getAutosaveTimestampKey(userId);
        localStorage.setItem(autosaveKey, JSON.stringify(data));
        localStorage.setItem(timestampKey, new Date().toISOString());
        console.log(` Saved on unload for user ${userId}:`, data.responses.length, 'answers');

        // Show confirmation dialog
        e.preventDefault();
        e.returnValue = 'Bạn có chắc muốn thoát? Tiến trình đã được lưu tự động.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [responses, currentPage, allQuestions.length, userId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [riasec, bigFive] = await Promise.all([
        assessmentService.getQuestions('RIASEC'),
        assessmentService.getQuestions('BIGFIVE'),
      ]);

      // Group RIASEC questions by label (R, I, A, S, E, C)
      const riasecByLabel: { [key: string]: Question[] } = {};
      riasec.forEach(q => {
        const label = q.dimension || q.id.toString().charAt(0); // Extract first character (R, I, A, S, E, C)
        if (!riasecByLabel[label]) {
          riasecByLabel[label] = [];
        }
        riasecByLabel[label].push(q);
      });

      // Group Big Five questions by label (O, C, E, A, N)
      const bigFiveByLabel: { [key: string]: Question[] } = {};
      bigFive.forEach(q => {
        const label = q.dimension || q.id.toString().charAt(0); // Extract first character
        if (!bigFiveByLabel[label]) {
          bigFiveByLabel[label] = [];
        }
        bigFiveByLabel[label].push(q);
      });

      // Combine questions by alternating labels
      const riasecLabels = Object.keys(riasecByLabel).sort(); // R, I, A, S, E, C
      const bigFiveLabels = Object.keys(bigFiveByLabel).sort(); // A, C, E, N, O
      const combined: Question[] = [];

      // Interleave label groups: R group, O group, I group, C group, etc.
      const maxLabels = Math.max(riasecLabels.length, bigFiveLabels.length);
      for (let i = 0; i < maxLabels; i++) {
        if (i < riasecLabels.length) {
          const label = riasecLabels[i];
          if (label && riasecByLabel[label]) {
            combined.push(...riasecByLabel[label]);
          }
        }
        if (i < bigFiveLabels.length) {
          const label = bigFiveLabels[i];
          if (label && bigFiveByLabel[label]) {
            combined.push(...bigFiveByLabel[label]);
          }
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

  const handleAnswer = (questionId: string | number, answer: string | number) => {
    const newResponses = new Map(responses);
    // Always use string key for consistency
    newResponses.set(String(questionId), answer);
    setResponses(newResponses);
    setError(null);

    // Auto-save to localStorage
    saveProgress(newResponses, currentPage, allQuestions);

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
        const allAnswered = pageQuestions.every(q => newResponses.has(String(q.id)));

        if (allAnswered && !isLastPage) {
          // Đã trả lời hết 5 câu và chưa phải trang cuối -> Qua trang mới & Lên đầu
          const newPage = currentPage + 1;
          setCurrentPage(newPage);
          // Save với page mới
          saveProgress(newResponses, newPage, allQuestions);

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
    const unansweredQuestions = allQuestions.filter(q => !responses.has(String(q.id)));

    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. ${unansweredQuestions.length} question(s) remaining.`);
      return;
    }

    // Clear saved progress on successful submit
    clearSavedProgress();

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
    return pageQuestions.every(q => responses.has(String(q.id)));
  };

  const getAnswer = (questionId: string | number) => {
    // Try both string and number keys for compatibility
    const strKey = String(questionId);

    return responses.get(strKey);
  };

  if (loading && !showResumeModal) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-green-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading questions...</p>
      </div>
    );
  }

  // Show resume modal even while loading
  console.log(' Render check - showResumeModal:', showResumeModal, 'savedProgress:', savedProgress?.responses?.length);

  if (showResumeModal && savedProgress) {
    console.log(' SHOWING RESUME MODAL!');
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-800 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Continue Assessment?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You have an incomplete assessment ({savedProgress.responses.length} questions answered).
              Would you like to continue or start fresh?
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResume}
              className="w-full px-6 py-3 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Continue ({savedProgress.responses.length} answers)
            </button>
            <button
              onClick={handleStartFresh}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all"
            >
              Start Fresh
            </button>
          </div>
        </div>
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
          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">
            {getProgress().toFixed(0)}% Completed
          </span>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Page {currentPage + 1} / {totalPages}
          </span>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-indigo-700 to-indigo-600 h-3 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${getProgress()}%` }}
          ></div>
        </div>

        {/* Auto-save indicator - Centered below progress bar */}
        {lastSaved && responses.size > 0 && (
          <div className="flex justify-center mt-4">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border border-indigo-200 dark:border-indigo-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved ({responses.size} answers)
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-center mb-10">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Mức độ mô tả chính xác về bạn như thế nào?
        </h3>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mt-4">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300"></div> Rất không đồng ý</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-300"></div> Không đồng ý</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-300"></div> Trung lập</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-300"></div> Đồng ý</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-700"></div> Rất đồng ý</div>
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
          const currentLabel = question.dimension || question.id.toString().charAt(0);
          const prevQuestion = index > 0 ? pageQuestions[index - 1] : null;
          const prevLabel = prevQuestion ? (prevQuestion.dimension || prevQuestion.id.toString().charAt(0)) : null;
          const isNewLabelGroup = currentLabel !== prevLabel;

          // Label descriptions
          const labelDescriptions: { [key: string]: { name: string; description: string; color: string } } = {
            'R': { name: 'Realistic', description: 'Hands-on, practical, mechanical work', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
            'I': { name: 'Investigative', description: 'Research, analysis, problem-solving', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
            'A': { name: 'Artistic', description: 'Creative, expressive, innovative work', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700' },
            'S': { name: 'Social', description: 'Helping, teaching, caring for others', color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' },
            'E': { name: 'Enterprising', description: 'Leadership, persuasion, business', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
            'C': { name: 'Conventional', description: 'Organization, detail-oriented, structured', color: 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600' },
            'O': { name: 'Openness', description: 'Curiosity, imagination, creativity', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' },
            'N': { name: 'Neuroticism', description: 'Emotional stability, stress management', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700' },
          };

          // Debug log
          if (index === 0) {
            console.log(' Question ID:', question.id, 'Answer:', answer, 'Responses size:', responses.size);
            console.log(' All response keys:', Array.from(responses.keys()).slice(0, 5));
          }

          return (
            <div key={question.id}>
              {/* Label Group Header */}
              {isNewLabelGroup && labelDescriptions[currentLabel] && (
                <div className={`mb-4 p-4 rounded-xl border-2 ${labelDescriptions[currentLabel].color}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center font-bold text-lg shadow-md">
                      {currentLabel}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{labelDescriptions[currentLabel].name}</h4>
                      <p className="text-sm opacity-80">{labelDescriptions[currentLabel].description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Question Card */}
              <div
                id={`question-${question.id}`}
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
                    {/* Option 1 - Rất không đồng ý */}
                    <button
                      onClick={() => handleAnswer(question.id, 1)}
                      className={`answer-btn answer-btn-1 ${answer === 1 ? 'selected' : ''}`}
                      style={{
                        backgroundColor: answer === 1 ? '#ef4444' : '#fca5a5',
                        color: answer === 1 ? 'white' : 'transparent',
                        transform: answer === 1 ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: answer === 1 ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'
                      }}
                      aria-label="Rate 1"
                    >
                      {answer === 1 && (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>

                    {/* Option 2 - Không đồng ý */}
                    <button
                      onClick={() => handleAnswer(question.id, 2)}
                      className={`answer-btn answer-btn-2 ${answer === 2 ? 'selected' : ''}`}
                      style={{
                        backgroundColor: answer === 2 ? '#f97316' : '#fdba74',
                        color: answer === 2 ? 'white' : 'transparent',
                        transform: answer === 2 ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: answer === 2 ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'
                      }}
                      aria-label="Rate 2"
                    >
                      {answer === 2 && (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>

                    {/* Option 3 - Trung lập */}
                    <button
                      onClick={() => handleAnswer(question.id, 3)}
                      className={`answer-btn answer-btn-3 ${answer === 3 ? 'selected' : ''}`}
                      style={{
                        backgroundColor: answer === 3 ? '#6b7280' : '#d1d5db',
                        color: answer === 3 ? 'white' : 'transparent',
                        transform: answer === 3 ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: answer === 3 ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'
                      }}
                      aria-label="Rate 3"
                    >
                      {answer === 3 && (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>

                    {/* Option 4 - Đồng ý */}
                    <button
                      onClick={() => handleAnswer(question.id, 4)}
                      className={`answer-btn answer-btn-4 ${answer === 4 ? 'selected' : ''}`}
                      style={{
                        backgroundColor: answer === 4 ? '#4f46e5' : '#a5b4fc',
                        color: answer === 4 ? 'white' : 'transparent',
                        transform: answer === 4 ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: answer === 4 ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'
                      }}
                      aria-label="Rate 4"
                    >
                      {answer === 4 && (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>

                    {/* Option 5 - Rất đồng ý */}
                    <button
                      onClick={() => handleAnswer(question.id, 5)}
                      className={`answer-btn answer-btn-5 ${answer === 5 ? 'selected' : ''}`}
                      style={{
                        backgroundColor: answer === 5 ? '#4338ca' : '#6366f1',
                        color: answer === 5 ? 'white' : 'transparent',
                        transform: answer === 5 ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: answer === 5 ? '0 10px 15px -3px rgb(0 0 0 / 0.1)' : 'none'
                      }}
                      aria-label="Rate 5"
                    >
                      {answer === 5 && (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  </div>
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
          style={{ color: currentPage === 0 ? '#d1d5db' : '#4b5563' }}
        >
          <svg style={{ color: 'inherit' }} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span style={{ color: 'inherit' }}>Previous</span>
        </button>

        {!isLastPage ? (
          <button
            onClick={handleNext}
            disabled={!areCurrentPageQuestionsAnswered()}
            className="px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center gap-2"
            style={{
              backgroundColor: areCurrentPageQuestionsAnswered() ? '#111827' : '#e5e7eb',
              color: areCurrentPageQuestionsAnswered() ? '#60a5fa' : '#3b82f6',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: areCurrentPageQuestionsAnswered() ? '#60a5fa' : '#3b82f6',
            }}
          >
            <span style={{ color: 'inherit', opacity: 1, fontWeight: 'bold' }}>Next Step</span>
            <svg style={{ color: 'inherit', opacity: 1 }} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            style={{ color: '#ffffff' }}
            className="px-10 py-3 bg-indigo-800 dark:bg-indigo-600 hover:bg-indigo-900 dark:hover:bg-indigo-700 rounded-xl font-bold shadow-xl shadow-indigo-800/30 dark:shadow-indigo-600/30 hover:shadow-indigo-800/50 dark:hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <span style={{ color: '#ffffff' }}>Complete Assessment</span>
            <svg style={{ color: '#ffffff' }} className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default CareerTestComponent;