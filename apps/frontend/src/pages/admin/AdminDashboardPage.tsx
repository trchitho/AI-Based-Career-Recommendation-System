import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminService } from "../../services/adminService";
import { AdminDashboardMetrics, AIMetrics } from "../../types/admin";
import ThemeToggle from "../../components/ThemeToggle";

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

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white transition-colors">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <Link to="/admin" className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Admin Panel
            </Link>
            <ThemeToggle />
          </div>
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
        </Routes>
      </div>
    </div>
  );
};

/* NAV ITEM */
const NavItem = ({ to, label, active }: { to: string; label: string; active: boolean }) => (
  <Link
    to={to}
    className={`
      relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
      ${active
        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      }
    `}
  >
    {label}
    {active && (
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-500 rounded-full" />
    )}
  </Link>
);

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
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Loading metrics...</p>
      </div>
    );

  if (error)
    return <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-6 rounded-2xl text-center">{error}</div>;

  if (!metrics || !aiMetrics) return null;

  // Color configs for cards
  const userMetricCards = [
    { title: "Total Users", value: metrics.totalUsers, subtitle: `${metrics.activeUsers} active`, gradient: "from-blue-500 to-cyan-500" },
    { title: "Completed Assessments", value: metrics.completedAssessments, subtitle: `${metrics.completionRate}% rate`, gradient: "from-green-500 to-emerald-500" },
    { title: "Users with Roadmaps", value: metrics.usersWithRoadmaps, subtitle: `${metrics.avgRoadmapProgress.toFixed(1)}% progress`, gradient: "from-purple-500 to-pink-500" },
    { title: "Recent Activity", value: metrics.recentAssessments, subtitle: "Last 7 days", gradient: "from-orange-500 to-amber-500" },
  ];

  const aiMetricCards = [
    { title: "Total Recommendations", value: aiMetrics.totalRecommendations, subtitle: `${aiMetrics.avgRecommendationsPerAssessment.toFixed(1)} per assessment`, gradient: "from-indigo-500 to-blue-500" },
    { title: "Essay Analysis", value: aiMetrics.assessmentsWithEssay, subtitle: "Assessments with essay", gradient: "from-teal-500 to-green-500" },
    { title: "Avg Processing Time", value: `${aiMetrics.avgProcessingTime}s`, subtitle: "Per assessment", gradient: "from-rose-500 to-pink-500" },
  ];

  const riasecColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    realistic: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/50", gradient: "from-red-500 to-rose-500" },
    investigative: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/50", gradient: "from-amber-500 to-yellow-500" },
    artistic: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/50", gradient: "from-emerald-500 to-green-500" },
    social: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/50", gradient: "from-blue-500 to-cyan-500" },
    enterprising: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/50", gradient: "from-purple-500 to-violet-500" },
    conventional: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/50", gradient: "from-pink-500 to-rose-500" },
  };

  const bigFiveColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    openness: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/50", gradient: "from-violet-500 to-purple-500" },
    conscientiousness: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/50", gradient: "from-blue-500 to-indigo-500" },
    extraversion: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/50", gradient: "from-emerald-500 to-teal-500" },
    agreeableness: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/50", gradient: "from-amber-500 to-orange-500" },
    neuroticism: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/50", gradient: "from-rose-500 to-red-500" },
  };

  return (
    <div className="space-y-8">
      {/* USER METRICS */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-2 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
          User Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {userMetricCards.map((card, idx) => (
            <div key={idx} className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} rounded-t-2xl`}></div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI METRICS */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></span>
          AI Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {aiMetricCards.map((card, idx) => (
            <div key={idx} className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} rounded-t-2xl`}></div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RIASEC Distribution */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-2 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
          RIASEC Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(aiMetrics.riasecDistribution).map(([key, value]) => {
            const colors = riasecColors[key.toLowerCase()] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/50", gradient: "from-gray-500 to-gray-600" };
            return (
              <div key={key} className={`relative group ${colors.bg} border-2 ${colors.border} rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 overflow-hidden`}>
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} rounded-t-xl`}></div>
                {/* Glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl`}></div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-gray-400 capitalize mb-2">{key}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{value}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Big Five Distribution */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
          <span className="w-2 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
          Big Five Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(aiMetrics.bigFiveDistribution).map(([key, value]) => {
            const colors = bigFiveColors[key.toLowerCase()] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/50", gradient: "from-gray-500 to-gray-600" };
            return (
              <div key={key} className={`relative group ${colors.bg} border-2 ${colors.border} rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 overflow-hidden`}>
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} rounded-t-xl`}></div>
                {/* Glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl`}></div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold text-gray-400 capitalize mb-2">{key}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{value}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
