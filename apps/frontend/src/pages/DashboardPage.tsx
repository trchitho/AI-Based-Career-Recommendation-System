import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../services/dashboardService';
import { DashboardData } from '../types/dashboard';
import ProfileSummaryCard from '../components/dashboard/ProfileSummaryCard';
import CareerSuggestionCard from '../components/dashboard/CareerSuggestionCard';
import ProgressMetricsCard from '../components/dashboard/ProgressMetricsCard';
import NoAssessmentPrompt from '../components/dashboard/NoAssessmentPrompt';
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
        setError('Failed to load dashboard data. Please try again.');
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
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-green-100 selection:text-green-900 relative overflow-x-hidden">

        {/* CSS Injection: Patterns & Animations */}
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
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0"></div>
        <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-green-400/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

          {/* --- HEADER DASHBOARD --- */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-fade-in-up">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight flex items-center gap-3">
                {t('dashboard.title')}
                <span className="text-sm font-medium px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                  Overview
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
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium tracking-wide">Syncing data...</p>
            </div>
          )}

          {/* --- ERROR STATE --- */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up max-w-2xl mx-auto shadow-sm">
              <div className="w-12 h-12 bg-white dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Unable to load dashboard</h3>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm font-bold text-red-700 dark:text-red-400 hover:underline"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )}

          {/* --- DASHBOARD CONTENT --- */}
          {!loading && !error && dashboardData && (
            <div className="space-y-10 animate-fade-in-up">

              {/* TOP ROW: Profile & Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Summary - Main Card */}
                <div className="lg:col-span-2 flex flex-col h-full">
                  <div className="h-full bg-white dark:bg-gray-800 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-[100px] pointer-events-none group-hover:from-green-500/20 transition-all"></div>
                    <ProfileSummaryCard profile={dashboardData.profileSummary} />
                  </div>
                </div>

                {/* Metrics - Side Card */}
                {dashboardData.hasCompletedAssessment && (
                  <div className="lg:col-span-1 flex flex-col h-full">
                    <div className="h-full bg-white dark:bg-gray-800 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 p-1">
                      <ProgressMetricsCard metrics={dashboardData.progressMetrics} />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Career Suggestions */}
              {dashboardData.hasCompletedAssessment ? (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        {t('dashboard.careerSuggestions.title')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-6">Based on your recent assessment results</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* View All Button */}
                      {dashboardData.latestAssessmentId && (
                        <button
                          onClick={handleViewResults}
                          className="group px-5 py-2.5 rounded-full font-bold text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-all shadow-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                          {t('dashboard.careerSuggestions.viewAll')}
                        </button>
                      )}

                      {/* Retake Button */}
                      <button
                        onClick={() => navigate('/assessment')}
                        className="px-5 py-2.5 rounded-full font-bold text-sm bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {t("assessment.retake")}
                      </button>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  {dashboardData.topCareerSuggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dashboardData.topCareerSuggestions.map((career) => (
                        <div key={career.id} className="h-full transform hover:-translate-y-1 transition-transform duration-300">
                          <CareerSuggestionCard career={career} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-[24px] p-10 text-center shadow-sm">
                      <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 dark:text-yellow-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Analysis in Progress</h4>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        {t('dashboard.careerSuggestions.analyzing')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // --- NO ASSESSMENT STATE ---
                <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none p-1.5">
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