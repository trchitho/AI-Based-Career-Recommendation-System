import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { AdminDashboardMetrics, AIMetrics } from "../../types/admin";
import MetricCard from "../../components/admin/MetricCard";

// Import admin pages
import CareerManagementPage from "./CareerManagementPage.tsx";
import SkillManagementPage from "./SkillManagementPage.tsx";
import QuestionManagementPage from "./QuestionManagementPage.tsx";
import AIMonitoringPage from "./AIMonitoringPage.tsx";
import UserManagementPage from "./UserManagementPage";
import SettingsPage from "./SettingsPage";

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [dashboardData, aiData] = await Promise.all([
        adminService.getDashboardMetrics(),
        adminService.getAIMetrics(),
      ]);
      setMetrics(dashboardData);
      setAIMetrics(aiData);
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard metrics");
      console.error("Error loading metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              </div>
              <div className="ml-6 flex space-x-8">
                <Link
                  to="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location.pathname === "/admin"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/users"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/admin/users")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Users
                </Link>
                <Link
                  to="/admin/settings"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/admin/settings")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Settings
                </Link>
                <Link
                  to="/admin/careers"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/admin/careers")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Careers
                </Link>
                <Link
                  to="/admin/skills"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/admin/skills")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Skills
                </Link>
                <Link
                  to="/admin/questions"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/admin/questions")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Questions
                </Link>
                <Link
                  to="/admin/ai-monitoring"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/admin/ai-monitoring")
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  AI Monitoring
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to User Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route
            index
            element={
              <DashboardOverview
                metrics={metrics}
                aiMetrics={aiMetrics}
                loading={loading}
                error={error}
              />
            }
          />
          <Route path="careers" element={<CareerManagementPage />} />
          <Route path="skills" element={<SkillManagementPage />} />
          <Route path="questions" element={<QuestionManagementPage />} />
          <Route path="ai-monitoring" element={<AIMonitoringPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
};

interface DashboardOverviewProps {
  metrics: AdminDashboardMetrics | null;
  aiMetrics: AIMetrics | null;
  loading: boolean;
  error: string | null;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  aiMetrics,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!metrics || !aiMetrics) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* User Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          User Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            subtitle={`${metrics.activeUsers} active in last 30 days`}
          />
          <MetricCard
            title="Completed Assessments"
            value={metrics.completedAssessments}
            subtitle={`${metrics.completionRate}% completion rate`}
          />
          <MetricCard
            title="Users with Roadmaps"
            value={metrics.usersWithRoadmaps}
            subtitle={`${metrics.avgRoadmapProgress.toFixed(1)}% avg progress`}
          />
          <MetricCard
            title="Recent Activity"
            value={metrics.recentAssessments}
            subtitle="Assessments in last 7 days"
          />
        </div>
      </div>

      {/* AI Performance Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          AI Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Recommendations"
            value={aiMetrics.totalRecommendations}
            subtitle={`${aiMetrics.avgRecommendationsPerAssessment.toFixed(1)} per assessment`}
          />
          <MetricCard
            title="Essay Analysis"
            value={aiMetrics.assessmentsWithEssay}
            subtitle="Assessments with essay"
          />
          <MetricCard
            title="Avg Processing Time"
            value={`${aiMetrics.avgProcessingTime}s`}
            subtitle="Per assessment"
          />
        </div>
      </div>

      {/* RIASEC Distribution */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          RIASEC Score Distribution (Average)
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(aiMetrics.riasecDistribution).map(
              ([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-sm text-gray-600 capitalize">{key}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {value}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Big Five Distribution */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Big Five Score Distribution (Average)
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(aiMetrics.bigFiveDistribution).map(
              ([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-sm text-gray-600 capitalize">{key}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {value}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
