import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CareerTestComponent from '../components/assessment/CareerTestComponent';
import EssayModalComponent from '../components/assessment/EssayModalComponent';
import { assessmentService } from '../services/assessmentService';
import { QuestionResponse } from '../types/assessment';
import MainLayout from '../components/layout/MainLayout';

type AssessmentStep = 'intro' | 'test' | 'essay' | 'processing';

const AssessmentPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<AssessmentStep>('intro');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAssessment = () => {
    setStep('test');
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

  const handleEssaySubmit = async (essayText: string) => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      await assessmentService.submitEssay({
        assessmentId,
        essayText,
      });

      setStep('processing');
      
      // Wait a moment then redirect to results
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

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900 relative overflow-hidden">
        {/* Decorative circles - matching HomePage */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-64 h-64 -top-32 -left-32 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-50"></div>
          <div className="absolute w-96 h-96 top-20 right-10 bg-[#D4C4B0] dark:bg-gray-800 rounded-full opacity-30"></div>
          <div className="absolute w-48 h-48 bottom-20 left-1/4 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {step === 'intro' && (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-block mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 flex items-center justify-center shadow-xl">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">{t('assessment.title')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">{t('assessment.subtitle')}</p>
              </div>
            
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mb-6 shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('assessment.discoverPath')}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    {t('assessment.comprehensiveDesc')}
                  </p>
                </div>

                <div className="space-y-5 mb-8">
                  {/* RIASEC Test Card */}
                  <div className="bg-[#E8DCC8] dark:bg-gray-700/50 rounded-xl p-5 border border-[#D4C4B0] dark:border-gray-600 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-4 shadow-md">
                        <span className="text-white font-bold text-lg">1</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                          {t('assessment.riasec')}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {t('assessment.riasecDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Big Five Test Card */}
                  <div className="bg-[#E8DCC8] dark:bg-gray-700/50 rounded-xl p-5 border border-[#D4C4B0] dark:border-gray-600 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-4 shadow-md">
                        <span className="text-white font-bold text-lg">2</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                          {t('assessment.bigFive')}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {t('assessment.bigFiveDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="bg-gradient-to-br from-[#4A7C59]/10 to-[#3d6449]/5 dark:bg-gradient-to-br dark:from-green-900/30 dark:to-green-800/20 border-2 border-[#4A7C59]/30 dark:border-green-600/40 rounded-xl p-6 mb-8 shadow-md">
                <h4 className="font-bold text-[#2d4a36] dark:text-green-200 text-lg mb-4 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-3 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {t('assessment.whatToExpect')}
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('assessment.duration')}</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('assessment.honestAnswers')}</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('assessment.optionalEssay')}</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">{t('assessment.tailoredRecommendations')}</span>
                  </li>
                </ul>
              </div>

                <button
                  onClick={handleStartAssessment}
                  className="w-full px-6 py-4 bg-[#4A7C59] dark:bg-green-600 text-white rounded-xl hover:bg-[#3d6449] dark:hover:bg-green-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{t('assessment.startAssessment')}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'test' && (
            <div>
              {error && (
                <div className="max-w-3xl mx-auto mb-6 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                  </div>
                </div>
              )}
              <CareerTestComponent
                onComplete={handleTestComplete}
                onCancel={handleCancel}
              />
            </div>
          )}

          {step === 'essay' && assessmentId && (
            <EssayModalComponent
              onSubmit={handleEssaySubmit}
              onSkip={handleEssaySkip}
              loading={loading}
            />
          )}

          {step === 'processing' && (
            <div className="max-w-3xl mx-auto text-center py-20">
              <div className="relative mb-8">
                <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-[#4A7C59] dark:border-green-600 mx-auto"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <svg className="w-8 h-8 text-[#4A7C59] dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
      </div>
    </MainLayout>
  );
};

export default AssessmentPage;
