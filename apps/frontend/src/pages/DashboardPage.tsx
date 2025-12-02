import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '../services/dashboardService';
import { DashboardData } from '../types/dashboard';
import ProfileSummaryCard from '../components/dashboard/ProfileSummaryCard';
import CareerSuggestionCard from '../components/dashboard/CareerSuggestionCard';
import ProgressMetricsCard from '../components/dashboard/ProgressMetricsCard';
import NoAssessmentPrompt from '../components/dashboard/NoAssessmentPrompt';
import NotificationCenter from '../components/notifications/NotificationCenter';
import MainLayout from '../components/layout/MainLayout';

const DashboardPage = () => {
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

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('dashboard.overview')}</p>
          </div>
          <NotificationCenter />
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#4A7C59] dark:border-green-600"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg className="w-6 h-6 text-[#4A7C59] dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && dashboardData && (
          <div className="space-y-6">
            {/* Profile Summary Section */}
            <ProfileSummaryCard profile={dashboardData.profileSummary} />

            {/* Progress Metrics */}
            {dashboardData.hasCompletedAssessment && (
              <ProgressMetricsCard metrics={dashboardData.progressMetrics} />
            )}

            {/* Career Suggestions or No Assessment Prompt */}
            {dashboardData.hasCompletedAssessment ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    {t('dashboard.careerSuggestions.title')}
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* View results */}
                    {dashboardData.latestAssessmentId && (
                      <button
                        onClick={handleViewResults}
                        className="
                          px-4 py-2 rounded-lg font-medium
                          bg-[#E8F5E9] dark:bg-green-900/30 hover:bg-[#C8E6C9] dark:hover:bg-green-900/50
                          text-[#4A7C59] dark:text-green-400 border border-[#4A7C59]/30 dark:border-green-600/30
                          shadow-sm transition-all
                        "
                      >
                        {t('dashboard.careerSuggestions.viewAll')}
                      </button>
                    )}
                    {/* Retake assessment */}
                    <button
                      onClick={() => navigate('/assessment')}
                      className="
                        px-4 py-2 rounded-lg font-medium
                        bg-[#4A7C59] dark:bg-green-600 hover:bg-[#3d6449] dark:hover:bg-green-700
                        text-white
                        shadow-sm transition-all
                      "
                    >
                      {t("assessment.retake")}
                    </button>
                  </div>
                </div>

                {dashboardData.topCareerSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardData.topCareerSuggestions.map((career) => (
                      <CareerSuggestionCard key={career.id} career={career} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-8 text-center">
                    <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-yellow-700 dark:text-yellow-300 text-lg">
                      {t('dashboard.careerSuggestions.analyzing')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <NoAssessmentPrompt />
            )}
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
