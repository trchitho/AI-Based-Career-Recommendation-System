import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EssayPrompt, QuestionResponse } from '../types/assessment';
import CareerTestComponent from '../components/assessment/CareerTestComponent';
import EssayModalComponent from '../components/assessment/EssayModalComponent';
import { assessmentService } from '../services/assessmentService';
import MainLayout from '../components/layout/MainLayout';

type AssessmentStep = 'intro' | 'test' | 'essay' | 'processing';

const AssessmentPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState<AssessmentStep>('intro');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prompt essay lấy từ DB
  const [essayPrompt, setEssayPrompt] = useState<EssayPrompt | null>(null);

  const handleStartAssessment = () => {
    setError(null);
    setStep('test');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  /**
   * Khi làm xong test (RIASEC + BigFive) → submit lên BE
   * BE tạo assessment + session, trả về assessmentId
   */
  const handleTestComplete = async (responses: QuestionResponse[]) => {
    try {
      setLoading(true);
      setError(null);

      const result = await assessmentService.submitAssessment({
        testTypes: ['RIASEC', 'BIG_FIVE'], // backend đang normalize BIG_FIVE
        responses,
      });

      setAssessmentId(result.assessmentId);
      setStep('essay');
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Khi chuyển sang bước essay → gọi BE lấy prompt từ core.essay_prompts
   */
  useEffect(() => {
    if (step !== 'essay') return;
    if (!assessmentId) return;

    let isMounted = true;

    const fetchPrompt = async () => {
      try {
        setLoading(true);

        // Hiện DB chắc chắn có lang 'en'
        const prompt = await assessmentService.getEssayPrompt('en');

        if (isMounted) {
          setEssayPrompt(prompt);
        }
      } catch (err) {
        console.error('Error fetching essay prompt:', err);
        // Không cần hiện lỗi to; EssayModalComponent đã có fallback text
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPrompt();

    return () => {
      isMounted = false;
    };
  }, [step, assessmentId]);

  /**
   * Submit bài essay (optional). Nếu thành công → sang trạng thái processing
   * rồi redirect sang trang kết quả theo assessmentId
   */
  const handleEssaySubmit = async (essayText: string) => {
    if (!assessmentId) {
      // Không có assessmentId thì không cố gắng gắn essay vào test
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✨ Quan trọng: chỉ gửi các field nằm trong type EssaySubmission
      await assessmentService.submitEssay({
        assessmentId,
        essayText,
        lang: 'en',                     // hoặc i18n.language nếu bạn muốn
      });

      setStep('processing');

      setTimeout(() => {
        navigate(`/results/${assessmentId}`);
      }, 2000);
    } catch (err) {
      console.error('Error submitting essay:', err);
      setError('Failed to submit essay. Redirecting to results...');

      setTimeout(() => {
        navigate(`/results/${assessmentId}`);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Nếu user bỏ qua essay → vẫn cho xem kết quả RIASEC/BigFive
   */
  const handleEssaySkip = () => {
    if (assessmentId) {
      navigate(`/results/${assessmentId}`);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Bước 1: màn intro */}
        {step === 'intro' && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {t('assessment.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('assessment.subtitle')}
              </p>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 p-8 mb-6 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('assessment.discoverPath')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
                {t('assessment.comprehensiveDesc')}
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start bg-gray-100 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-200 dark:border-gray-600/30">
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg shadow-purple-500/50">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                      {t('assessment.riasec')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('assessment.riasecDesc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start bg-gray-100 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-200 dark:border-gray-600/30">
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg shadow-purple-500/50">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                      {t('assessment.bigFive')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('assessment.bigFiveDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 rounded-xl p-6 mb-8 backdrop-blur-sm">
                <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('assessment.whatToExpect')}
                </h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <li className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('assessment.duration')}
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('assessment.honestAnswers')}
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('assessment.optionalEssay')}
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('assessment.tailoredRecommendations')}
                  </li>
                </ul>
              </div>

              <button
                onClick={handleStartAssessment}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-bold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>{t('assessment.startAssessment')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bước 2: làm bài test */}
        {step === 'test' && (
          <div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              {t('assessment.title')}
            </h2>

            {error && (
              <div className="max-w-3xl mx-auto mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-400 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            <CareerTestComponent
              onComplete={handleTestComplete}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Bước 3: essay (optional) */}
        {step === 'essay' && assessmentId && (
          <EssayModalComponent
            onSubmit={handleEssaySubmit}
            onSkip={handleEssaySkip}
            loading={loading}
            promptTitle={essayPrompt?.title ?? ''}
            promptText={essayPrompt?.prompt_text ?? ''}
          />
        )}

        {/* Bước 4: processing → redirect sang trang kết quả */}
        {step === 'processing' && (
          <div className="max-w-3xl mx-auto text-center py-20">
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-purple-500 mx-auto" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {t('assessment.processingResults')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {t('assessment.analyzingResponses')}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AssessmentPage;
