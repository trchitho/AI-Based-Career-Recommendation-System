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
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
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

  const handleTestComplete = async (responses: QuestionResponse[]) => {
    try {
      setLoading(true);
      setError(null);

      const result = await assessmentService.submitAssessment({
        testTypes: ['RIASEC', 'BIG_FIVE'],
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
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      await assessmentService.submitEssay({
        assessmentId,
        essayText,
        lang: 'en',
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

        {/* --- MAIN CONTAINER --- */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">

          {/* --- STEP 1: INTRO (SINGLE CARD) --- */}
          {step === 'intro' && (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-green-900/10 dark:shadow-none border border-white/50 dark:border-gray-700 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up min-h-[600px]">

              {/* Left Side: Hero & Info */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                <div className="mb-8">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-4 border border-green-200 dark:border-green-800">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    AI-Powered Analysis
                  </span>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                    {t('assessment.title')}
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                    {t('assessment.subtitle')}
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">RIASEC Interest Profile</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Discover your work personality type.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Big Five Personality Traits</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Understand your core personality dimensions.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleStartAssessment}
                    className="group flex-1 inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-1 transition-all duration-300"
                  >
                    <span>{t('assessment.startAssessment')}</span>
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 px-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ~10 Mins
                  </div>
                </div>
              </div>

              {/* Right Side: Visual / Abstract */}
              <div className="md:w-5/12 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 relative hidden md:flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-50"></div>
                {/* Abstract Shapes */}
                <div className="relative w-64 h-64">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-green-400/20 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                  {/* Card Visual Representation */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-100 dark:border-gray-700 w-full transform rotate-3 hover:rotate-0 transition-transform duration-500">
                      <div className="h-2 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded"></div>
                        <div className="h-1.5 w-5/6 bg-gray-100 dark:bg-gray-700 rounded"></div>
                        <div className="h-1.5 w-4/6 bg-gray-100 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="mt-6 flex justify-between items-end">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="h-8 w-20 bg-green-600 rounded-lg opacity-20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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