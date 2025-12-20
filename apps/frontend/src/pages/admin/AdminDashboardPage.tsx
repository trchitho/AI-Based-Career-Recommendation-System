// Updated AdminDashboardPage.tsx with all static texts wrapped in {t("...")}
// Logic, UI, props, APIs remain unchanged.
// --- CODE BELOW ---

import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { AdminDashboardMetrics, AIMetrics } from "../../types/admin";

import MetricCard from "../../components/admin/MetricCard";
import { useTheme } from "../../contexts/ThemeContext";

import LanguageSwitcher from "../../components/LanguageSwitcher";
import ThemeToggle from "../../components/ThemeToggle";
import { useTranslation } from "react-i18next";

// Admin pages
import CareerManagementPage from "./CareerManagementPage.tsx";
import SkillManagementPage from "./SkillManagementPage.tsx";
import QuestionManagementPage from "./QuestionManagementPage.tsx";
import AIMonitoringPage from "./AIMonitoringPage.tsx";
import UserManagementPage from "./UserManagementPage";
import SettingsPage from "./SettingsPage";
import BlogManagementPage from "./BlogManagementPage.tsx";
import PaymentManagementPage from "./PaymentManagementPage.tsx";
import PaymentManagementPageMock from "./PaymentManagementPageMock.tsx";
import TransactionHistoryPage from "./TransactionHistoryPage";

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
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-10">
              <h1 className="text-xl font-bold dark:text-white whitespace-nowrap">
                Admin Panel
              </h1>

              <div className="flex items-center gap-6 flex-nowrap flex-shrink-0">
                <NavItem to="/admin" label={t("admin.dashboard")} active={location.pathname === "/admin"} />
                <NavItem to="/admin/users" label={t("admin.users")} active={isActive("/admin/users")} />
                <NavItem to="/admin/payments" label="Thanh toán" active={isActive("/admin/payments")} />
                <NavItem to="/admin/settings" label={t("admin.settings")} active={isActive("/admin/settings")} />
                <NavItem to="/admin/blogs" label={t("admin.blogs")} active={isActive("/admin/blogs")} />
                <NavItem to="/admin/careers" label={t("admin.careers")} active={isActive("/admin/careers")} />
                <NavItem to="/admin/skills" label={t("admin.skills")} active={isActive("/admin/skills")} />
                <NavItem to="/admin/questions" label={t("admin.questions")} active={isActive("/admin/questions")} />
                <NavItem to="/admin/ai-monitoring" label={t("admin.monitoring")} active={isActive("/admin/ai-monitoring")} />
              </div>
            </div>

            <div className="flex items-center gap-4 whitespace-nowrap">
              <LanguageSwitcher />
              <ThemeToggle />

              <Link
                to="/dashboard"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white inline-flex items-center whitespace-nowrap"
              >
                ← {t("common.back")} {t("nav.dashboard")}
              </Link>
            </div>
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
        </Routes>
      </div>
    </div>
  );
};

/* NAV ITEM */
const NavItem = ({ to, label, active }: { to: string; label: string; active: boolean }) => (
  <Link
    to={to}
    className={`relative px-2 py-3 text-sm font-medium transition whitespace-nowrap
      ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"}
    `}
  >
    {label}
    <span
      className={`absolute left-0 -bottom-[3px] h-[2px] w-full bg-blue-500 rounded-full transition-transform duration-300 origin-left
        ${active ? "scale-x-100" : "scale-x-0"}
      `}
    />
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (loading)
    return <div className="h-64 flex justify-center items-center text-gray-400">{t("admin.loadingMetrics")}</div>;

  if (error)
    return <div className="bg-red-500/10 border border-red-500/40 text-red-200 p-4 rounded-lg">{error}</div>;

  if (!metrics || !aiMetrics) return null;

  const box = isDark ? "bg-[#101827] border border-white/10 text-white" : "bg-white border border-gray-200 text-gray-900";
  const text2 = isDark ? "text-gray-300" : "text-gray-600";

  return (
    <div className="space-y-10">
      {/* USER METRICS */}
      <section>
        <h2 className="text-xl font-semibold mb-3">{t("admin.userMetrics")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title={t("admin.totalUsers")} value={metrics.totalUsers} subtitle={`${metrics.activeUsers} ${t("admin.active")}`} />
          <MetricCard title={t("admin.completedAssessments")} value={metrics.completedAssessments} subtitle={`${metrics.completionRate}% ${t("admin.rate")}`} />
          <MetricCard title={t("admin.usersWithRoadmaps")} value={metrics.usersWithRoadmaps} subtitle={`${metrics.avgRoadmapProgress.toFixed(1)}% ${t("admin.progress")}`} />
          <MetricCard title={t("admin.recentActivity")} value={metrics.recentAssessments} subtitle={t("admin.last7Days")} />
        </div>
      </section>

      {/* AI METRICS */}
      <section>
        <h2 className="text-xl font-semibold mb-3">{t("admin.aiPerformance")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard title={t("admin.totalRecommendations")} value={aiMetrics.totalRecommendations} subtitle={`${aiMetrics.avgRecommendationsPerAssessment.toFixed(1)} ${t("admin.perAssessment")}`} />
          <MetricCard title={t("admin.essayAnalysis")} value={aiMetrics.assessmentsWithEssay} subtitle={t("admin.assessmentsWithEssay")} />
          <MetricCard title={t("admin.avgProcessingTime")} value={`${aiMetrics.avgProcessingTime}s`} subtitle={t("admin.perAssessment")} />
        </div>
      </section>

      {/* RIASEC */}
      <section>
        <h2 className="text-xl font-semibold mb-3">{t("admin.riasecDistribution")}</h2>

        <div className={`p-6 rounded-xl shadow ${box}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(aiMetrics.riasecDistribution).map(([key, value]) => (
              <div key={key} className="text-center">
                <p className={`text-sm capitalize ${text2}`}>{key}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIG FIVE */}
      <section>
        <h2 className="text-xl font-semibold mb-3">{t("admin.bigFiveDistribution")}</h2>

        <div className={`p-6 rounded-xl shadow ${box}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(aiMetrics.bigFiveDistribution).map(([key, value]) => (
              <div key={key} className="text-center">
                <p className={`text-sm capitalize ${text2}`}>{key}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
