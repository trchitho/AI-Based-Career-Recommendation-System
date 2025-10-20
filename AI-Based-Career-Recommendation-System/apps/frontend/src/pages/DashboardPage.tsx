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
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400">{error}</p>
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
                  {dashboardData.latestAssessmentId && (
                    <button
                      onClick={handleViewResults}
                      className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all duration-200 flex items-center space-x-2 border border-purple-500/30"
                    >
                      <span>{t('dashboard.careerSuggestions.viewAll')}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {dashboardData.topCareerSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardData.topCareerSuggestions.map((career) => (
                      <CareerSuggestionCard key={career.id} career={career} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-8 text-center backdrop-blur-sm">
                    <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-yellow-300 text-lg">
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
    </MainLayout>
  );
};

export default DashboardPage;
