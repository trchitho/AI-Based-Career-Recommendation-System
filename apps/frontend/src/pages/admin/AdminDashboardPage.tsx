import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminService } from "../../services/adminService";
import { AdminDashboardMetrics, AIMetrics } from "../../types/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
import { useAuth } from "../../contexts/AuthContext";

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
import AdminInterviewPage from "./AdminInterviewPage";

// ── NavItem helper ────────────────────────────────────────────────
const NavItem = ({ to, label, active }: { to: string; label: string; active: boolean }) => (
  <Link
    to={to}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "bg-green-600 text-white"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
    }`}
  >
    {label}
  </Link>
);

// Theme Toggle Component
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

// NavItem Component
interface NavItemProps {
  to: string;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, active }) => {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${active
          ? 'bg-green-600 text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        }`}
    >
      {label}
    </Link>
  );
};

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      navigate("/login");
    }
  };

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  return (
    <AdminLayout>
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
        <Route path="careers"       element={<CareerManagementPage />} />
        <Route path="skills"        element={<SkillManagementPage />} />
        <Route path="questions"     element={<QuestionManagementPage />} />
        <Route path="ai-monitoring" element={<AIMonitoringPage />} />
        <Route path="users"         element={<UserManagementPage />} />
        <Route path="payments"      element={<PaymentManagementPage />} />
        <Route path="settings"      element={<SettingsPage />} />
        <Route path="blogs"         element={<BlogManagementPage />} />
        <Route path="transactions"  element={<TransactionHistoryPage />} />
        <Route path="audit-logs"    element={<AuditLogsPage />} />
        <Route path="career-trends" element={<CareerTrendsPage />} />
        <Route path="anomalies"     element={<AnomalyDetectionPage />} />
        <Route path="data-sync"     element={<DataSyncPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="cv-documents"  element={<CVDocumentsPage />} />
        <Route path="courses"       element={<AdminCourseManagementPage />} />
        <Route path="interview"     element={<AdminInterviewPage />} />
      </Routes>
    </AdminLayout>
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
    { title: "Tổng người dùng", value: metrics.totalUsers, subtitle: `${metrics.activeUsers} đang hoạt động`, gradient: "from-blue-500 to-cyan-500" },
    { title: "Bài đánh giá", value: metrics.completedAssessments, subtitle: `${metrics.completionRate}% tỷ lệ`, gradient: "from-indigo-700 to-indigo-700" },
    { title: "Có lộ trình", value: metrics.usersWithRoadmaps, subtitle: `${metrics.avgRoadmapProgress.toFixed(1)}% tiến độ`, gradient: "from-purple-500 to-pink-500" },
    { title: "Hoạt động gần đây", value: metrics.recentAssessments, subtitle: "7 ngày qua", gradient: "from-orange-500 to-amber-500" },
  ];

  const aiMetricCards = [
    { title: "Tổng gợi ý", value: aiMetrics.totalRecommendations, subtitle: `${aiMetrics.avgRecommendationsPerAssessment.toFixed(1)} mỗi bài`, gradient: "from-indigo-500 to-blue-500" },
    { title: "Phân tích bài luận", value: aiMetrics.assessmentsWithEssay, subtitle: "Bài có essay", gradient: "from-teal-500 to-indigo-700" },
    { title: "Thời gian xử lý TB", value: `${aiMetrics.avgProcessingTime}s`, subtitle: "Mỗi bài đánh giá", gradient: "from-rose-500 to-pink-500" },
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
      {/* Thống kê người dùng */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-indigo-700 rounded-full"></span>
          Thống kê người dùng
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
          Hiệu suất AI
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

      {/* Phân bố RIASEC */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-indigo-700 rounded-full"></span>
          Phân bố RIASEC
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
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Biểu đồ phân bố</p>
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

      {/* Phân bố Big Five */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-violet-500 rounded-full"></span>
          Phân bố Big Five
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
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Biểu đồ phân bố</p>
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

      {/* Tình trạng hệ thống */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-1 h-5 bg-indigo-600 rounded-full"></span>
          Tình trạng hệ thống
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
