import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EssayPrompt, QuestionResponse } from '../types/assessment';
import CareerTestComponent from '../components/assessment/CareerTestComponent';
import EssayModalComponent from '../components/assessment/EssayModalComponent';
import { assessmentService } from '../services/assessmentService';
import MainLayout from '../components/layout/MainLayout';
import UpgradePrompt from '../components/subscription/UpgradePrompt';
import UsageStatus from '../components/subscription/UsageStatus';
import { useSubscription } from '../hooks/useSubscription';
import { checkAssessmentLimit } from '../services/subscriptionService';

type AssessmentStep = 'intro' | 'test' | 'essay' | 'processing';

const AssessmentPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isPremium, subscriptionData } = useSubscription();

  const [step, setStep] = useState<AssessmentStep>('intro');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [usageInfo, setUsageInfo] = useState<any>(null);

  // Prompt essay lấy từ DB
  const [essayPrompt, setEssayPrompt] = useState<EssayPrompt | null>(null);

  const handleStartAssessment = async () => {
    setError(null);
    
    // Check assessment limit for free users
    if (!isPremium) {
      try {
        const limitCheck = await checkAssessmentLimit();
        if (!limitCheck.allowed) {
          setUpgradeRequired(true);
          setUsageInfo({
            message: limitCheck.message,
            current_usage: subscriptionData?.usage?.find(u => u.feature === 'assessment')?.current_usage || 0,
            limit: subscriptionData?.usage?.find(u => u.feature === 'assessment')?.limit || 5
          });
          return;
        }
      } catch (err) {
        console.error('Failed to check assessment limit:', err);
      }
    }
    
    setStep('test');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleTestComplete = async (responses: QuestionResponse[]) => {
    try {
      setLoading(true);
      setError(null);

      const result = await assessmentService.submitAssessment({
        testTypes: ['RIASEC', 'BIG_FIVE'],
        responses,
      });

      setAssessmentId(result.assessmentId);
      setUsageInfo(result.usage_info);
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
        const prompt = await assessmentService.getEssayPrompt('en');
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

  // ==========================================
  // 2. PREMIUM DESIGN UI - SINGLE CARD LAYOUT
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-hidden flex flex-col">

        {/* Background Styles */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
          .bg-grid-pattern {
            background-image: radial-gradient(rgba(74, 124, 89, 0.1) 1px, transparent 1px);
            background-size: 32px 32px;
          }
          .dark .bg-grid-pattern {
            background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          }
        `}</style>

        {/* --- BACKGROUND LAYERS --- */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-green-400/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        {/* --- UPGRADE PROMPT --- */}
        {upgradeRequired && (
          <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8">
            <UpgradePrompt
              feature="assessment"
              message={usageInfo?.message || "Bạn đã sử dụng hết lượt test miễn phí trong tháng này."}
              currentUsage={usageInfo?.current_usage}
              limit={usageInfo?.limit}
            />
          </div>
        )}



        {/* --- MAIN CONTAINER --- */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">

          {/* --- STEP 1: INTRO (SINGLE CARD) --- */}
          {step === 'intro' && (
            <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-green-900/20 dark:shadow-purple-900/20 border border-white/50 dark:border-gray-700 w-full max-w-6xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up min-h-[600px] group hover:shadow-3xl transition-all duration-500">
              {/* Animated border gradient */}
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"></div>

              {/* Left Side: Hero & Info */}
              <div className="relative flex-1 p-8 md:p-12 flex flex-col justify-center z-10">
                <div className="mb-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-6 border border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    ✨ AI-Powered Analysis
                  </span>
                  <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-gray-900 via-green-800 to-emerald-800 dark:from-white dark:via-green-400 dark:to-emerald-400 bg-clip-text text-transparent mb-6 leading-tight">
                    Career Assessment
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8 font-medium">
                    Discover your ideal career path with AI-powered insights
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-6 mb-10">
                  <div className="group flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-100 dark:border-blue-800/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">RIASEC Interest Profile</h4>
                      <p className="text-gray-600 dark:text-gray-400">Discover your work personality type.</p>
                    </div>
                  </div>
                  <div className="group flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-800/30 hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">Big Five Personality Traits</h4>
                      <p className="text-gray-600 dark:text-gray-400">Understand your core personality dimensions.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <button
                    onClick={handleStartAssessment}
                    className="group relative flex-1 inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-2 transition-all duration-300 overflow-hidden"
                  >
                    {/* Button shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span className="relative z-10">Start →</span>
                    <svg className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                  <div className="flex items-center justify-center gap-3 text-base font-semibold text-gray-600 dark:text-gray-400 px-6 py-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>~10 Mins</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Enhanced Visual */}
              <div className="md:w-5/12 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 relative hidden md:flex items-center justify-center overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>
                
                {/* Floating orbs */}
                <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-green-400/30 to-emerald-400/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Interactive Assessment Preview */}
                <div className="relative w-80 h-80 flex items-center justify-center">
                  {/* Main assessment card */}
                  <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-gray-700 w-full transform hover:scale-105 transition-all duration-500 group">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                    </div>
                    
                    {/* Question preview */}
                    <div className="space-y-4 mb-6">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded animate-pulse"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-4/5 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    
                    {/* Answer options */}
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer group-hover:scale-105" style={{ animationDelay: `${i * 0.1}s` }}>
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                          <div className={`h-2 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-500 rounded animate-pulse`} style={{ width: `${60 + i * 10}%` }}></div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Floating icons */}
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                      <span className="text-sm">🧠</span>
                    </div>
                    <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce" style={{ animationDelay: '1s' }}>
                      <span className="text-sm">📊</span>
                    </div>
                  </div>
                  
                  {/* Floating result cards */}
                  <div className="absolute -top-8 -left-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/50 dark:border-gray-700 transform rotate-12 hover:rotate-6 transition-transform duration-500">
                    <div className="text-2xl mb-2">📈</div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Results</div>
                  </div>
                  
                  <div className="absolute -bottom-8 -right-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/50 dark:border-gray-700 transform -rotate-12 hover:-rotate-6 transition-transform duration-500">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Insights</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- USAGE STATUS (Moved to bottom) --- */}
        {!upgradeRequired && step === 'intro' && (
          <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pb-8">
            <div className={`border rounded-2xl p-6 shadow-lg ${
              isPremium 
                ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    isPremium 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                  }`}>
                    <span className="text-2xl">{isPremium ? '⭐' : '📊'}</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold mb-1 ${
                      isPremium 
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-blue-900 dark:text-blue-100'
                    }`}>
                      {isPremium ? 'Premium Active' : 'Sử dụng thông minh'}
                    </h3>
                    <p className={`text-sm ${
                      isPremium 
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      {isPremium 
                        ? 'Bạn có quyền truy cập không giới hạn tất cả tính năng Premium. Tận hưởng trải nghiệm đầy đủ!'
                        : 'Bạn có 5 lần test miễn phí mỗi tháng. Nâng cấp Premium để test không giới hạn và nhận phân tích chi tiết hơn.'
                      }
                    </p>
                  </div>
                </div>
                {!isPremium && (
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Xem Gói Premium
                  </button>
                )}
                {isPremium && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Unlimited Access
                  </div>
                )}
              </div>
            </div>
            {!isPremium && (
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
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/50 dark:border-gray-700 w-full max-w-5xl p-6 md:p-10 animate-fade-in-up min-h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('assessment.title')}</h2>
                <button onClick={handleCancel} className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors">
                  Cancel
                </button>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl text-center text-red-600 dark:text-red-300 font-medium">
                  {error}
                </div>
              )}

              <div className="flex-1">
                <CareerTestComponent
                  onComplete={handleTestComplete}
                  onCancel={handleCancel}
                />
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
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-[32px] shadow-2xl p-16 w-full max-w-2xl text-center animate-fade-in-up border border-white/50 dark:border-gray-700">
              <div className="relative mb-8 flex justify-center">
                <div className="w-24 h-24 border-4 border-gray-100 dark:border-gray-700 rounded-full"></div>
                <div className="absolute w-24 h-24 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-green-600 dark:text-green-400">
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