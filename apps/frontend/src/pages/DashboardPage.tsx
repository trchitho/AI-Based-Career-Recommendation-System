import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../services/dashboardService';
import { DashboardData } from '../types/dashboard';
import ProfileSummaryCard from '../components/dashboard/ProfileSummaryCard';
import CareerSuggestionCard from '../components/dashboard/CareerSuggestionCard';
import ProgressMetricsCard from '../components/dashboard/ProgressMetricsCard';
import NoAssessmentPrompt from '../components/dashboard/NoAssessmentPrompt';
import TopCareerWidget from '../components/dashboard/TopCareerWidget';
// import InterviewActionCard from '../components/dashboard/InterviewActionCard'; // Removed per user request
// import NotificationCenter from '../components/notifications/NotificationCenter';
import MainLayout from '../components/layout/MainLayout';

const DashboardPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardService.getDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(t('dashboard.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleViewResults = () => {
    if (dashboardData?.latestAssessmentId) {
      navigate(`/results/${dashboardData.latestAssessmentId}`);
    }
  };

  // ==========================================
  // 2. PREMIUM DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-indigo-50 selection:text-indigo-900 relative overflow-x-hidden">

        {/* CSS Injection: Patterns & Animations */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
          .bg-dot-pattern {
            background-image: radial-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          }
        `}</style>

        {/* --- BACKGROUND LAYERS --- */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

          {/* --- HEADER DASHBOARD --- */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-fade-in-up">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold premium-gradient mb-2 tracking-tight flex items-center gap-3 w-fit">
                {t('dashboard.title')}
                <span className="text-sm font-bold px-3 py-1 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-400 rounded-full border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm backdrop-blur-sm">
                  {t('dashboard.overview')}
                </span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                {t('dashboard.overview')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Center with improved style */}
              {/* <div className="bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <NotificationCenter />
              </div> */}
            </div>
          </div>

          {/* --- LOADING STATE --- */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium tracking-wide">{t('dashboard.loading')}</p>
            </div>
          )}

          {/* --- ERROR STATE --- */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up max-w-2xl mx-auto shadow-sm">
              <div className="w-12 h-12 bg-white dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{t('dashboard.error')}</h3>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm font-bold text-red-700 dark:text-red-400 hover:underline"
                >
                  {t('common.tryAgain')}
                </button>
              </div>
            </div>
          )}

          {/* --- DASHBOARD CONTENT --- */}
          {!loading && !error && dashboardData && (
            <div className="space-y-10 animate-fade-in-up">
              {/* Debug logging */}
              {void console.log(' [DashboardPage] dashboardData:', dashboardData)}
              {void console.log(' [DashboardPage] hasCompletedAssessment:', dashboardData.hasCompletedAssessment)}
              {void console.log(' [DashboardPage] topCareerSuggestions:', dashboardData.topCareerSuggestions)}
              {void console.log(' [DashboardPage] topCareerSuggestions.length:', dashboardData.topCareerSuggestions.length)}

              {/* TOP ROW: Profile & Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Profile Summary - Main Card */}
                <div className="lg:col-span-2 flex flex-col h-full">
                  <div className="h-full glass rounded-[28px] overflow-hidden relative group p-1 transition-all duration-300 hover:shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-700/10 to-transparent rounded-bl-[100px] pointer-events-none group-hover:from-indigo-700/20 transition-all duration-500"></div>
                    <ProfileSummaryCard profile={dashboardData.profileSummary} />
                  </div>
                </div>

                {/* Metrics - Side Card */}
                {dashboardData.hasCompletedAssessment && (
                  <div className="lg:col-span-1 flex flex-col h-full">
                    <div className="h-full glass rounded-[28px] p-1 transition-all duration-300 hover:shadow-2xl">
                      <ProgressMetricsCard metrics={dashboardData.progressMetrics} />
                    </div>
                  </div>
                )}
              </div>

              {/* SECOND ROW: Top Career Roadmap + Market Snapshot */}
              {dashboardData.hasCompletedAssessment && dashboardData.topCareerSuggestions.length > 0 && (
                <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base font-bold text-gray-700 dark:text-gray-200"> Nghề phù hợp nhất với bạn</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400">
                      {dashboardData.topCareerSuggestions[0].matchPercentage}% match
                    </span>
                  </div>
                  <TopCareerWidget career={dashboardData.topCareerSuggestions[0]} />
                </div>
              )}

              {/* SECTION: Career Suggestions - Only show if user has completed assessments */}
              {dashboardData.hasCompletedAssessment && dashboardData.topCareerSuggestions.length > 0 ? (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-700"></span>
                        </span>
                        {t('dashboard.careerSuggestions.title')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-6">{t('dashboard.careerSuggestions.subtitle')}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* View All Button */}
                      {dashboardData.latestAssessmentId && (
                        <button
                          onClick={handleViewResults}
                          className="group px-5 py-2.5 rounded-full font-bold text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 transition-all shadow-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                          {t('dashboard.careerSuggestions.viewAll')}
                        </button>
                      )}

                      {/* Retake Button */}
                      <button
                        onClick={() => navigate('/assessment')}
                        className="px-5 py-2.5 rounded-full font-bold text-sm bg-indigo-800 hover:bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {t("assessment.retake")}
                      </button>
                    </div>
                  </div>

                  {/* Career Cards Grid - Show top 3 career suggestions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {dashboardData.topCareerSuggestions.map((career) => (
                      <div key={career.id} className="h-full transform hover:-translate-y-1 transition-transform duration-300">
                        <CareerSuggestionCard career={career} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : dashboardData.hasCompletedAssessment && dashboardData.topCareerSuggestions.length === 0 ? (
                // Show analyzing state if user has assessments but no career suggestions yet
                <div className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                        {t('dashboard.careerSuggestions.title')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-6">{t('dashboard.careerSuggestions.processing')}</p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-[24px] p-10 text-center shadow-sm">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 dark:text-yellow-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.careerSuggestions.analysisInProgress')}</h4>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      {t('dashboard.careerSuggestions.analyzing')}
                    </p>
                  </div>
                </div>
              ) : (
                // --- NO ASSESSMENT STATE - Only show if user hasn't completed any assessments ---
                <div className="glass rounded-[32px] p-1.5 shadow-2xl transition-all duration-500">
                  <NoAssessmentPrompt />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;