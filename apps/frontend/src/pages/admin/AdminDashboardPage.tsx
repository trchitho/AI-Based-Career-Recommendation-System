import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminService } from "../../services/adminService";
import { AdminDashboardMetrics, AIMetrics } from "../../types/admin";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/layout/AdminLayout";

// Admin pages
import CareerManagementPage from "./CareerManagementPage";
import SkillManagementPage from "./SkillManagementPage";
import QuestionManagementPage from "./QuestionManagementPage";
import AIMonitoringPage from "./AIMonitoringPage";
import UserManagementPage from "./UserManagementPage";
import SettingsPage from "./SettingsPage";
import BlogManagementPage from "./BlogManagementPage";
import PaymentManagementPage from "./PaymentManagementPage";
import TransactionHistoryPage from "./TransactionHistoryPage";
import AuditLogsPage from "./AuditLogsPage";
import CareerTrendsPage from "./CareerTrendsPage";
import AnomalyDetectionPage from "./AnomalyDetectionPage";
import DataSyncPage from "./DataSyncPage";
import AdminNotificationsPage from "./AdminNotificationsPage";
import CVDocumentsPage from "./CVDocumentsPage";
import AdminCourseManagementPage from "./AdminCourseManagementPage";

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();

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
      setError(t("admin.loadError"));
      console.error(t("admin.errorLoadingMetrics"), err);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 dark:text-white transition-colors">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <Link to="/admin" className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap hover:text-green-600 dark:hover:text-green-400 transition-colors">
              Admin Panel
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                to="/"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Trang chủ
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Logout Confirmation Dialog */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Đăng xuất</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
                  Bạn có chắc muốn đăng xuất khỏi trang quản trị không?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-lg shadow-red-600/20"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation tabs - scrollable */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex items-center gap-1 py-2 min-w-max">
            <NavItem to="/admin" label="Dashboard" active={location.pathname === "/admin"} />
            <NavItem to="/admin/users" label="Users" active={isActive("/admin/users")} />
            <NavItem to="/admin/payments" label="Payments" active={isActive("/admin/payments")} />
            <NavItem to="/admin/settings" label="Settings" active={isActive("/admin/settings")} />
            <NavItem to="/admin/blogs" label="Blogs" active={isActive("/admin/blogs")} />
            <NavItem to="/admin/careers" label="Careers" active={isActive("/admin/careers")} />
            <NavItem to="/admin/skills" label="Skills" active={isActive("/admin/skills")} />
            <NavItem to="/admin/questions" label="Questions" active={isActive("/admin/questions")} />
            <NavItem to="/admin/ai-monitoring" label="AI" active={isActive("/admin/ai-monitoring")} />
            <NavItem to="/admin/audit-logs" label="Logs" active={isActive("/admin/audit-logs")} />
            <NavItem to="/admin/career-trends" label="Trends" active={isActive("/admin/career-trends")} />
            <NavItem to="/admin/anomalies" label="Alerts" active={isActive("/admin/anomalies")} />
            <NavItem to="/admin/data-sync" label="Sync" active={isActive("/admin/data-sync")} />
            <NavItem to="/admin/notifications" label="Notifications" active={isActive("/admin/notifications")} />
            <NavItem to="/admin/cv-documents" label="CV Docs" active={isActive("/admin/cv-documents")} />
            <NavItem to="/admin/courses" label="Courses" active={isActive("/admin/courses")} />
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
          <Route path="payments" element={<PaymentManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="blogs" element={<BlogManagementPage />} />
          <Route path="transactions" element={<TransactionHistoryPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="career-trends" element={<CareerTrendsPage />} />
          <Route path="anomalies" element={<AnomalyDetectionPage />} />
          <Route path="data-sync" element={<DataSyncPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="cv-documents" element={<CVDocumentsPage />} />
          <Route path="courses" element={<AdminCourseManagementPage />} />
        </Routes>
      </div>
    </div>
  );
};


/* DASHBOARD OVERVIEW */
interface DashboardOverviewProps {
  metrics: AdminDashboardMetrics | null;
  aiMetrics: AIMetrics | null;
  loading: boolean;
  error: string | null;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ metrics, aiMetrics, loading, error }) => {
  if (loading)
    return (
      <div className="h-64 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-green-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Loading metrics...</p>
      </div>
    );

  if (error)
    return <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-6 rounded-2xl text-center">{error}</div>;

  if (!metrics || !aiMetrics) return null;

  // Color configs for cards
  const userMetricCards = [
    { title: "Total Users", value: metrics.totalUsers, subtitle: `${metrics.activeUsers} active`, gradient: "from-blue-500 to-cyan-500" },
    { title: "Completed Assessments", value: metrics.completedAssessments, subtitle: `${metrics.completionRate}% rate`, gradient: "from-indigo-700 to-indigo-700" },
    { title: "Users with Roadmaps", value: metrics.usersWithRoadmaps, subtitle: `${metrics.avgRoadmapProgress.toFixed(1)}% progress`, gradient: "from-purple-500 to-pink-500" },
    { title: "Recent Activity", value: metrics.recentAssessments, subtitle: "Last 7 days", gradient: "from-orange-500 to-amber-500" },
  ];

  const aiMetricCards = [
    { title: "Total Recommendations", value: aiMetrics.totalRecommendations, subtitle: `${aiMetrics.avgRecommendationsPerAssessment.toFixed(1)} per assessment`, gradient: "from-indigo-500 to-blue-500" },
    { title: "Essay Analysis", value: aiMetrics.assessmentsWithEssay, subtitle: "Assessments with essay", gradient: "from-teal-500 to-indigo-700" },
    { title: "Avg Processing Time", value: `${aiMetrics.avgProcessingTime}s`, subtitle: "Per assessment", gradient: "from-rose-500 to-pink-500" },
  ];

  const riasecColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    realistic: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/50", gradient: "from-red-500 to-rose-500" },
    investigative: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/50", gradient: "from-amber-500 to-yellow-500" },
    artistic: { bg: "bg-indigo-700/10", text: "text-emerald-400", border: "border-indigo-600/50", gradient: "from-indigo-500 to-indigo-700" },
    social: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/50", gradient: "from-blue-500 to-cyan-500" },
    enterprising: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/50", gradient: "from-purple-500 to-violet-500" },
    conventional: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/50", gradient: "from-pink-500 to-rose-500" },
  };

  const bigFiveColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    openness: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/50", gradient: "from-violet-500 to-purple-500" },
    conscientiousness: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/50", gradient: "from-blue-500 to-indigo-500" },
    extraversion: { bg: "bg-indigo-700/10", text: "text-emerald-400", border: "border-indigo-600/50", gradient: "from-indigo-500 to-indigo-600" },
    agreeableness: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/50", gradient: "from-amber-500 to-orange-500" },
    neuroticism: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/50", gradient: "from-rose-500 to-red-500" },
  };

  return (
    <div className="space-y-8">
      {/* USER METRICS */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-indigo-700 rounded-full"></span>
          User Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userMetricCards.map((card, idx) => (
            <div key={idx} className="relative bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI METRICS */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
          AI Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiMetricCards.map((card, idx) => (
            <div key={idx} className="relative bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RIASEC Distribution */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-indigo-700 rounded-full"></span>
          RIASEC Distribution
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(aiMetrics.riasecDistribution).map(([key, value]) => {
              const colors = riasecColors[key.toLowerCase()] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30", gradient: "from-gray-500 to-gray-600" };
              return (
                <div key={key} className={`relative ${colors.bg} border ${colors.border} rounded-xl p-4 text-center overflow-hidden`}>
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.gradient}`}></div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize mb-1">{key}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{value}%</p>
                </div>
              );
            })}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Distribution Chart</p>
            <div className="space-y-3">
              {Object.entries(aiMetrics.riasecDistribution).map(([key, value]) => {
                const pct = parseFloat(String(value)) || 0;
                const colors = riasecColors[key.toLowerCase()] || { gradient: "from-gray-500 to-gray-600", text: "text-gray-400" };
                return (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className={`text-xs font-bold ${colors.text}`}>{value}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Big Five Distribution */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-violet-500 rounded-full"></span>
          Big Five Distribution
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(aiMetrics.bigFiveDistribution).map(([key, value]) => {
              const colors = bigFiveColors[key.toLowerCase()] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30", gradient: "from-gray-500 to-gray-600" };
              return (
                <div key={key} className={`relative ${colors.bg} border ${colors.border} rounded-xl p-4 text-center overflow-hidden`}>
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.gradient}`}></div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize mb-1">{key.slice(0, 5)}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{value}%</p>
                </div>
              );
            })}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Distribution Chart</p>
            <div className="space-y-3">
              {Object.entries(aiMetrics.bigFiveDistribution).map(([key, value]) => {
                const pct = parseFloat(String(value)) || 0;
                const colors = bigFiveColors[key.toLowerCase()] || { gradient: "from-gray-500 to-gray-600", text: "text-gray-400" };
                return (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">{key.slice(0, 7)}</span>
                      <span className={`text-xs font-bold ${colors.text}`}>{value}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* System Health */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-indigo-600 rounded-full"></span>
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Assessment Completion Rate",
              value: metrics.completionRate,
              ok: metrics.completionRate >= 50,
              color: "from-indigo-700 to-indigo-700",
              hint: `${metrics.completedAssessments} / ${metrics.totalAssessments} completed`,
            },
            {
              label: "AI Error Rate",
              value: aiMetrics.errorRate,
              ok: aiMetrics.errorRate < 10,
              color: aiMetrics.errorRate < 5 ? "from-indigo-700 to-indigo-700" : "from-orange-500 to-red-500",
              hint: `${aiMetrics.errorCount} errors / ${aiMetrics.successCount} successes`,
            },
            {
              label: "Avg User Satisfaction",
              value: aiMetrics.avgFeedbackRating > 0 ? (aiMetrics.avgFeedbackRating / 5) * 100 : 0,
              ok: aiMetrics.avgFeedbackRating >= 3.5,
              color: "from-blue-500 to-indigo-500",
              hint: `${aiMetrics.avgFeedbackRating > 0 ? aiMetrics.avgFeedbackRating.toFixed(1) : 'N/A'}  from ${aiMetrics.totalFeedback} reviews`,
            },
          ].map(({ label, value, ok, color, hint }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                <span className={`w-2 h-2 rounded-full ${ok ? 'bg-indigo-700' : 'bg-orange-500'}`} />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value.toFixed(1)}%</p>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
