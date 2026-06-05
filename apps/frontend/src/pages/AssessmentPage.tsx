import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EssayPrompt, QuestionResponse, Question, AssessmentResult } from '../types/assessment';
import CareerTestComponent from '../components/assessment/CareerTestComponent';
import TetrisQuizGame from '../components/assessment/TetrisQuizGame';
import GameQuizMode from '../components/assessment/GameQuizMode';
import EssayModalComponent from '../components/assessment/EssayModalComponent';
import EnhancedAssessmentFlow from '../components/assessment/EnhancedAssessmentFlow';
import { assessmentService } from '../services/assessmentService';
import api from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import UsageStatus from '../components/subscription/UsageStatus';
import { LimitExceededModal } from '../components/assessment/LimitExceededModal';
import { useSubscription } from '../hooks/useSubscription';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { checkAssessmentLimit } from '../services/subscriptionService';
import { getPaymentHistory, PaymentHistory } from '../services/paymentService';
import { getAccessToken } from '../utils/auth';
import { useSound } from '../hooks/useSound';
import { ASSETS } from '../config/assets';


type QuizMode = 'standard' | 'game' | 'legacy';
type AssessmentStep = 'intro' | 'enhanced' | 'test' | 'essay' | 'processing';

const AssessmentPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { subscriptionData } = useSubscription();
  useFeatureAccess(); // Used for side effects
  const { incrementUsage } = useUsageTracking();

  // Get quiz mode from URL params
  const modeParam = searchParams.get('mode');
  const quizMode: QuizMode =
    modeParam === 'standard' || modeParam === 'game' || modeParam === 'legacy'
      ? modeParam
      : 'legacy';

  const [step, setStep] = useState<AssessmentStep>('intro');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [assessmentSessionId, setAssessmentSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  // Add payment-based plan detection (same as PaymentPage)
  const [detectedPlan, setDetectedPlan] = useState<string>('Free');
  const isLoggedIn = !!getAccessToken();

  // Prompt essay lấy từ DB
  const [essayPrompt, setEssayPrompt] = useState<EssayPrompt | null>(null);

  // Sound effects - chỉ phát khi click vào nút Interactive Story
  const submitSound = useSound(ASSETS.sounds.success, { volume: 0.5, loop: true });

  // Detect user plan from payment history (same logic as PaymentPage)
  const detectUserPlan = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const payments = await getPaymentHistory();
      const successfulPayments = payments.filter((p: PaymentHistory) => p.status === 'success');

      if (successfulPayments.length > 0) {
        const latestPayment = successfulPayments[0];
        const description = latestPayment?.description ?? '';
        const amount = latestPayment?.amount ?? 0;

        // Pro: 299,000 VND, Premium: 199,000 VND, Basic: 99,000 VND
        if (description.toLowerCase().includes('pro') || amount >= 280000) {
          setDetectedPlan('Pro');
        } else if (description.toLowerCase().includes('premium') || amount >= 180000) {
          setDetectedPlan('Premium');
        } else if (description.toLowerCase().includes('basic') || amount >= 80000) {
          setDetectedPlan('Basic');
        }
      }
    } catch (error) {
      console.error('Failed to detect user plan:', error);
    }
  };

  // Load plan detection on mount
  useEffect(() => {
    if (isLoggedIn) {
      detectUserPlan();
    }
  }, [isLoggedIn]);

  // Enhanced assessment limit detection
  const getAssessmentLimit = (): number => {
    if (detectedPlan === 'Basic') {
      return 20; // Basic plan has 20 assessments/month
    } else if (detectedPlan === 'Premium' || detectedPlan === 'Pro') {
      return -1; // Unlimited
    }

    // Free plan or fallback
    return subscriptionData?.usage?.find(u => u.feature === 'assessment')?.limit || 5;
  };

  // Check assessment limit on component mount for users without unlimited_assessments feature
  useEffect(() => {
    const checkInitialLimit = async () => {
      const currentLimit = getAssessmentLimit();

      if (currentLimit > 0) { // Has a limit (not unlimited)
        try {
          const assessmentUsage = subscriptionData?.usage?.find(u => u.feature === 'assessment');
          if (assessmentUsage && !assessmentUsage.allowed) {
            setLimitExceeded(true);
            setUsageInfo({
              message: "You have used all your monthly assessments.",
              current_usage: assessmentUsage.current_usage,
              limit: currentLimit // Use detected limit instead of backend limit
            });
          }
        } catch (err) {
          console.error('Failed to check initial assessment limit:', err);
        }
      }
    };

    checkInitialLimit();
  }, [subscriptionData, detectedPlan]); // Add detectedPlan to dependencies

  const handleStartAssessment = async () => {
    setError(null);

    // If limit already exceeded and user is on Free plan, show upgrade modal
    if (limitExceeded && detectedPlan === 'Free') {
      setUpgradeRequired(true);
      return;
    }

    // Check assessment limit using enhanced detection - only for Free plan
    const currentLimit = getAssessmentLimit();
    if (currentLimit > 0 && detectedPlan === 'Free') { // Only check limits for Free plan
      try {
        const limitCheck = await checkAssessmentLimit();
        if (!limitCheck.allowed) {
          setUpgradeRequired(true);
          setLimitExceeded(true);
          setUsageInfo({
            message: limitCheck.message,
            current_usage: subscriptionData?.usage?.find(u => u.feature === 'assessment')?.current_usage || 0,
            limit: currentLimit
          });
          return;
        }
      } catch (err) {
        console.error('Failed to check assessment limit:', err);
      }
    }

    // Load questions if using new quiz modes
    if (quizMode === 'standard' || quizMode === 'game') {
      try {
        setLoading(true);

        // BOTH game modes (Puzzle Game and Personality Garden) use 33 questions (3 per dimension)
        // Only traditional test uses 44 questions (4 per dimension)
        const perDim = 3; // Always 3 for game modes

        // Check if there's an existing incomplete session in localStorage
        const SAVED_SESSION_KEY = `assessment_session_${quizMode}`;
        const SAVED_SEED_KEY = `assessment_seed_${quizMode}`;
        const savedSessionId = localStorage.getItem(SAVED_SESSION_KEY);
        const savedSeed = localStorage.getItem(SAVED_SEED_KEY);
        let realSessionId: number;
        let questionSeed: number;

        if (savedSessionId) {
          // Reuse existing session to preserve gamification progress
          realSessionId = parseInt(savedSessionId, 10);
          questionSeed = savedSeed ? parseInt(savedSeed, 10) : Date.now();
          console.log('[AssessmentPage] Reusing existing session:', realSessionId, 'seed:', questionSeed);
        } else {
          // Create a real assessment session in DB first — required for gamification FK
          const sessionRes = await api.post('/api/assessments/session/start');
          realSessionId = sessionRes.data.session_id;
          questionSeed = Date.now();
          // Save session ID and seed to localStorage for future reuse
          localStorage.setItem(SAVED_SESSION_KEY, String(realSessionId));
          localStorage.setItem(SAVED_SEED_KEY, String(questionSeed));
          console.log('[AssessmentPage] Created new session:', realSessionId, 'seed:', questionSeed);
        }

        // Fetch with specific per_dim parameter — use consistent seed for same question order
        const riasecRes = await api.get('/api/assessments/questions/RIASEC', {
          params: { shuffle: true, seed: questionSeed, per_dim: perDim },
        });
        const bigFiveRes = await api.get('/api/assessments/questions/BIGFIVE', {
          params: { shuffle: true, seed: questionSeed, per_dim: perDim },
        });

        setQuestions([...riasecRes.data, ...bigFiveRes.data]);
        setAssessmentSessionId(realSessionId);
      } catch (err) {
        console.error('Failed to load questions:', err);
        setError('Không thể tải câu hỏi. Vui lòng thử lại.');
        return;
      } finally {
        setLoading(false);
      }

      // For game modes, go directly to test step
      setStep('test');
    } else {
      // For other modes (legacy, interactive), use enhanced assessment
      setStep('enhanced');
    }
  };

  const handleEnhancedAssessmentComplete = async (result: AssessmentResult) => {
    try {
      setLoading(true);
      setError(null);

      // Save the assessment result and get the assessment ID
      setAssessmentId(result.id);

      // Track assessment usage (only for limited plans)
      const currentLimit = getAssessmentLimit();
      if (currentLimit > 0) { // Has a limit (not unlimited)
        incrementUsage('assessment');
      }

      // Story mode already includes essay, so skip essay step and go directly to results
      console.log('[AssessmentPage] Story mode completed, redirecting to results...');
      setStep('processing');

      setTimeout(() => {
        navigate(`/results/${result.id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error processing enhanced assessment:', err);
      setError('Failed to process assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhancedAssessmentCancel = () => {
    setStep('intro');
  };

  // Auto-start assessment if mode is specified in URL
  useEffect(() => {
    const autoStart = async () => {
      if ((quizMode === 'standard' || quizMode === 'game') && step === 'intro') {
        // Automatically start assessment for game modes
        await handleStartAssessment();
      }
    };

    autoStart();
  }, [quizMode]); // Only run when quizMode changes

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleTestComplete = async (responses: QuestionResponse[]) => {
    try {
      // Don't show processing here — go directly to essay after submit.
      // Processing screen should only appear AFTER the essay step.
      setLoading(true);
      setError(null);

      // Submit assessment in background — map quizMode → correct test_mode
      const _modeMap: Record<string, string> = {
        standard: 'game_puzzle',
        game: 'game_garden',
        legacy: 'traditional',
      };
      const result = await assessmentService.submitAssessment({
        testTypes: ['RIASEC', 'BIG_FIVE'],
        responses,
        test_mode: _modeMap[quizMode] ?? 'traditional',
      }) as { assessmentId: string; usage_info?: any };

      setAssessmentId(result.assessmentId);
      if (result.usage_info) {
        setUsageInfo(result.usage_info);
      }

      // Track assessment usage (only for limited plans)
      const currentLimit = getAssessmentLimit();
      if (currentLimit > 0) { // Has a limit (not unlimited)
        incrementUsage('assessment');
      }

      // Clear saved session from localStorage on successful completion
      const SAVED_SESSION_KEY = `assessment_session_${quizMode}`;
      localStorage.removeItem(SAVED_SESSION_KEY);
      localStorage.removeItem(`assessment_seed_${quizMode}`);

      // Move directly to essay step — skip the intermediate processing screen.
      setStep('essay');
    } catch (err: any) {
      console.error('Error submitting assessment:', err);

      // Handle 402 Payment Required error
      if (err?.response?.status === 402) {
        setUpgradeRequired(true);
        setUsageInfo(err.response.data);
        setError(null);
      } else {
        setError('Failed to submit assessment. Please try again.');
        // Revert to test step on error
        setStep('test');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'essay') return;
    if (!assessmentId) return;

    let isMounted = true;

    const fetchPrompt = async () => {
      try {
        setLoading(true);
        const prompt = await assessmentService.getEssayPrompt('vi');
        if (isMounted) {
          setEssayPrompt(prompt);
        }
      } catch (err) {
        console.error('Error fetching essay prompt:', err);
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

  const handleEssaySubmit = async (essayText: string) => {
    if (!assessmentId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build payload and only include promptId when defined to satisfy exactOptionalPropertyTypes
      const payload = {
        assessmentId,
        essayText,
        // dùng lang & id đúng với prompt BE vừa trả
        lang: essayPrompt?.lang ?? 'en',
        ...(essayPrompt?.id != null ? { promptId: essayPrompt.id } : {}),
      };

      await assessmentService.submitEssay(payload);

      // Sau essay → chuyển thẳng sang processing (bỏ voice step)
      // Nhạc vẫn tiếp tục phát từ lúc click nút Interactive Story
      setStep('processing');
    } catch (err) {
      console.error('Error submitting essay:', err);
      setError('Gửi bài viết thất bại. Đang chuyển đến kết quả...');
      // Dừng nhạc khi có lỗi
      submitSound.stop();
      setTimeout(() => {
        navigate(`/results/${assessmentId}`);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Nếu user bỏ qua essay → chuyển thẳng sang processing
   */
  const handleEssaySkip = () => {
    // Bỏ qua essay → chuyển thẳng sang processing
    if (!assessmentId) { setStep('intro'); return; }
    setStep('processing');
  };

  // Auto-redirect to results after processing step
  useEffect(() => {
    if (step === 'processing' && assessmentId) {
      // Wait 1.5 seconds to show processing animation, then redirect
      const timer = setTimeout(() => {
        // Dừng nhạc trước khi chuyển trang
        submitSound.stop();
        navigate(`/results/${assessmentId}`);
      }, 1500);

      return () => {
        clearTimeout(timer);
        // Cleanup: dừng nhạc khi component unmount
        submitSound.stop();
      };
    }
  }, [step, assessmentId, navigate, submitSound]);

  // ==========================================
  // 2. PREMIUM DESIGN UI - SINGLE CARD LAYOUT
  // ==========================================

  // If enhanced assessment is active, render it full screen
  if (step === 'enhanced') {
    // Use real backend version with AI-core models
    return (
      <EnhancedAssessmentFlow
        onComplete={handleEnhancedAssessmentComplete}
        onCancel={handleEnhancedAssessmentCancel}
      />
    );
  }

  // For game modes in test step, render fullscreen without MainLayout
  if (step === 'test' && (quizMode === 'standard' || quizMode === 'game')) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-auto">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl text-center text-red-600 dark:text-red-300 font-medium text-sm">
            {error}
          </div>
        )}
        {quizMode === 'standard' ? (
          <TetrisQuizGame
            questions={questions}
            onComplete={handleTestComplete}
            onCancel={handleCancel}
            assessmentSessionId={assessmentSessionId ?? undefined}
          />
        ) : (
          <GameQuizMode
            questions={questions}
            onComplete={handleTestComplete}
            onCancel={handleCancel}
            assessmentSessionId={assessmentSessionId ?? undefined}
          />
        )}
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen text-gray-900 dark:text-white relative overflow-hidden flex flex-col bg-gray-50/50 dark:bg-gray-900/50">

        {/* Background Styles */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
          .bg-dot-pattern {
            background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          }
        `}</style>

        {/* --- BACKGROUND LAYERS --- */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        {/* --- LIMIT EXCEEDED MODAL --- */}
        <LimitExceededModal
          isOpen={upgradeRequired}
          onClose={() => setUpgradeRequired(false)}
          currentUsage={usageInfo?.current_usage || 0}
          limit={usageInfo?.limit || 5}
          message={usageInfo?.message}
        />



        {/* --- MAIN CONTAINER --- */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">

          {/* --- STEP 1: INTRO (SINGLE CARD) --- */}
          {step === 'intro' && (
            <div className="relative rounded-[32px] w-full max-w-6xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up min-h-[600px] group transition-all duration-500 glass shadow-xl"
            >
              {/* Animated border gradient */}
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-indigo-600 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"></div>

              {/* Content */}
              <div className="relative w-full p-8 md:p-12 flex flex-col justify-center z-10">
                <div className="mb-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-950/30 text-indigo-900 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-200 dark:border-indigo-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-700"></span>
                    </span>
                    {t('assessment.aiPowered')}
                  </span>
                  <h1 className="text-4xl md:text-6xl font-extrabold premium-gradient mb-6 leading-tight">
                    {t('assessment.discoverCareer')}
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8 font-medium">
                    {t('assessment.discoverCareerSub')}
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-6 mb-10">
                  <div className="group flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-100 dark:border-blue-800/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{t('assessment.riasecTitle')}</h4>
                      <p className="text-gray-600 dark:text-gray-400">{t('assessment.riasecDesc')}</p>
                    </div>
                  </div>
                  <div className="group flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-800/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{t('assessment.bigFiveTitle')}</h4>
                      <p className="text-gray-600 dark:text-gray-400">{t('assessment.bigFiveDesc')}</p>
                    </div>
                  </div>
                </div>

                {/* Limit exceeded warning */}
                {limitExceeded && getAssessmentLimit() > 0 && detectedPlan === 'Free' && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 dark:from-orange-900/20 dark:via-red-900/20 dark:to-pink-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-orange-900 dark:text-orange-100 text-lg mb-1">
                          {t('assessment.limitReached')}
                        </h4>
                        <p className="text-orange-700 dark:text-orange-300 text-sm">
                          {t('assessment.limitUsed', { current: usageInfo?.current_usage || 0, limit: getAssessmentLimit() })}
                          {detectedPlan === 'Free' ? ' ' + t('assessment.upgradeBasicHint') :
                            ' ' + t('assessment.upgradePremiumHint')}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/pricing')}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        {t('assessment.upgradeNow')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">

                  {/* Game Mode */}
                  <button
                    onClick={() => navigate('/quiz-mode-selector')}
                    disabled={limitExceeded && getAssessmentLimit() > 0 && detectedPlan === 'Free'}
                    className="btn-game group relative flex flex-col items-center justify-center px-6 py-6 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="text-center relative z-10">
                      <p className="text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">🎮 Chế Độ Game</p>
                      <p className="text-sm font-bold text-white drop-shadow-md mt-1">Vui & hấp dẫn</p>
                    </div>
                  </button>

                  {/* Interactive Story - Phát nhạc khi click */}
                  <button
                    onClick={() => {
                      submitSound.play(); // Phát nhạc khi click
                      handleStartAssessment();
                    }}
                    disabled={limitExceeded && getAssessmentLimit() > 0 && detectedPlan === 'Free'}
                    className="btn-interactive group relative flex flex-col items-center justify-center px-6 py-6 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="text-center relative z-10">
                      <p className="text-xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">✨ {t('assessment.startInteractive')}</p>
                      <p className="text-sm font-bold text-white drop-shadow-md mt-1">{t('assessment.storyBased')}</p>
                    </div>
                  </button>

                  {/* Traditional */}
                  <button
                    onClick={() => setStep('test')}
                    disabled={limitExceeded && getAssessmentLimit() > 0 && detectedPlan === 'Free'}
                    className="group flex flex-col items-center justify-center px-6 py-6 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed glass shadow-md hover:shadow-xl"
                  >
                    <div className="text-center">
                      <p className="text-lg font-extrabold text-gray-800 dark:text-gray-100">{t('assessment.modeTraditional')}</p>
                      <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">{t('assessment.standardQuestionnaire')}</p>
                    </div>
                  </button>

                </div>

                {/* Time indicator */}
                <div className="flex items-center gap-2 mt-4 text-sm font-medium opacity-60" style={{ color: 'var(--neu-text)' }}>
                  <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Hoàn thành trong ~10 phút</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* --- USAGE STATUS (Moved to bottom) --- */}
        {!upgradeRequired && step === 'intro' && (
          <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pb-8">
            <div className={`glass border rounded-3xl p-6 shadow-xl ${getAssessmentLimit() === -1 // Unlimited
              ? 'bg-gradient-to-r from-indigo-50/50 via-indigo-50/50 to-teal-50/50 dark:from-indigo-950/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-indigo-200/50 dark:border-indigo-800/50'
              : 'bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-blue-200/50 dark:border-blue-800/50'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${getAssessmentLimit() === -1 // Unlimited
                    ? 'bg-gradient-to-br from-indigo-700 to-indigo-700'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                    }`}>
                    <span className="text-2xl">{getAssessmentLimit() === -1 ? '⭐' : ''}</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold mb-1 ${getAssessmentLimit() === -1 // Unlimited
                      ? 'text-indigo-950 dark:text-indigo-100'
                      : 'text-blue-900 dark:text-blue-100'
                      }`}>
                      {detectedPlan === 'Premium' || detectedPlan === 'Pro' ? t('assessment.planPremiumActive') :
                        detectedPlan === 'Basic' ? t('assessment.planBasicActive') : t('assessment.smartUsage')}
                    </h3>
                    <p className={`text-sm ${getAssessmentLimit() === -1 // Unlimited
                      ? 'text-indigo-900 dark:text-indigo-300'
                      : 'text-blue-700 dark:text-blue-300'
                      }`}>
                      {getAssessmentLimit() === -1
                        ? t('assessment.unlimitedAccess')
                        : t('assessment.limitedAccess', { limit: getAssessmentLimit() }) + ' ' + (detectedPlan === 'Free' ? t('assessment.upgradeBasicHint') :
                          detectedPlan === 'Basic' ? t('assessment.upgradeBasicPlanHint') :
                            t('assessment.upgradePremiumHint'))
                      }
                    </p>
                  </div>
                </div>
                {getAssessmentLimit() > 0 && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    {detectedPlan === 'Free' ? t('assessment.viewBasicPlan') :
                      t('assessment.viewPremiumPlan')}
                  </button>
                )}
                {getAssessmentLimit() === -1 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 rounded-xl font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {t('assessment.unlimitedAccessLabel')}
                  </div>
                )}
              </div>
            </div>
            {getAssessmentLimit() > 0 && (
              <div className="mt-4">
                <UsageStatus />
              </div>
            )}
          </div>
        )}

        {/* --- MAIN CONTAINER --- */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">

          {/* --- STEP 2: TEST INTERFACE (SINGLE CARD) --- */}
          {step === 'test' && (
            <div className="glass rounded-[32px] shadow-2xl w-full max-w-[95vw] p-6 md:p-10 animate-fade-in-up min-h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-gray-700 pb-6 px-4">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {quizMode === 'game' ? 'Đánh Giá Chế Độ Trò Chơi' :
                    quizMode === 'standard' ? 'Đánh Giá Tiêu Chuẩn' :
                      t('assessment.title')}
                </h2>
                <button onClick={handleCancel} className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors">
                  Hủy
                </button>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl text-center text-red-600 dark:text-red-300 font-medium">
                  {error}
                </div>
              )}

              <div className="flex-1">
                {quizMode === 'standard' ? (
                  <TetrisQuizGame
                    questions={questions}
                    onComplete={handleTestComplete}
                    onCancel={handleCancel}
                    assessmentSessionId={assessmentSessionId ?? undefined}
                  />
                ) : quizMode === 'game' ? (
                  <GameQuizMode
                    questions={questions}
                    onComplete={handleTestComplete}
                    onCancel={handleCancel}
                    assessmentSessionId={assessmentSessionId ?? undefined}
                  />
                ) : (
                  <CareerTestComponent
                    onComplete={handleTestComplete}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </div>
          )}

          {/* --- STEP 3: ESSAY MODAL --- */}
          {step === 'essay' && assessmentId && (
            <EssayModalComponent
              onSubmit={handleEssaySubmit}
              onSkip={handleEssaySkip}
              loading={loading}
              promptTitle={essayPrompt?.title ?? ''}
              promptText={essayPrompt?.prompt_text ?? ''}
            />
          )}

          {/* --- STEP 4: PROCESSING (SINGLE CARD) --- */}
          {step === 'processing' && (
            <div className="glass bg-white/90 dark:bg-gray-800/90 rounded-[32px] shadow-2xl p-16 w-full max-w-2xl text-center animate-fade-in-up border border-white/50 dark:border-white/10">
              <div className="relative mb-8 flex justify-center">
                <div className="w-24 h-24 border-4 border-gray-100 dark:border-gray-700 rounded-full"></div>
                <div className="absolute w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-800 dark:text-indigo-400">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('assessment.processingResults')}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('assessment.analyzingResponses')}</p>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default AssessmentPage;