import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AIMetrics, UserFeedback } from '../../types/admin';
import { useTranslation } from "react-i18next";

/* ---------------------------------------------
   SHARED STYLE CONSTANTS
---------------------------------------------- */

const baseInput =
  "w-full px-3 py-2 rounded-lg border " +
  "bg-white dark:bg-[#1E293B] " +
  "border-gray-300 dark:border-[#2C3A4B] " +
  "text-gray-800 dark:text-gray-200 " +
  "placeholder-gray-400 dark:placeholder-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500";

const cardClass =
  "bg-gray-50 dark:bg-[#0F172A] rounded-xl shadow p-6 " +
  "border border-gray-200 dark:border-[#1E293B]";

const tableHead =
  "bg-gray-100 dark:bg-[#1E293B] text-gray-700 dark:text-gray-300";

/* ---------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */

const AIMonitoringPage = () => {
  const { t } = useTranslation();

  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minRating: '',
  });

  useEffect(() => {
    loadMetrics();
    loadFeedback();
  }, []);

  /* ------------ Load Metrics ------------- */
  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAIMetrics();
      setMetrics(data);
    } catch (error) {
      console.error(t("ai.errorLoadingMetrics"), error);
    } finally {
      setLoading(false);
    }
  };

  /* ------------ Load Feedback ------------- */
  const loadFeedback = async () => {
    try {
      setFeedbackLoading(true);

      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minRating) params.minRating = Number(filters.minRating);

      const data = await adminService.getUserFeedback(params);
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error(t("ai.errorLoadingFeedback"), error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFilter = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  if (loading) {
    return (
      <div className="h-64 flex justify-center items-center text-gray-500 dark:text-gray-400">
        {t("ai.loadingMetrics")}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`${cardClass} text-red-500`}>
        {t("ai.failedToLoadMetrics")}
      </div>
    );
  }

  return (
    <div className="space-y-10">

      {/* TITLE */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {t("ai.performanceMonitoring")}
      </h1>

      {/* ---------------------------------- */}
      {/* PERFORMANCE METRICS */}
      {/* ---------------------------------- */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t("ai.performanceMetrics")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t("ai.totalRecommendations")}
            value={metrics.totalRecommendations}
            subtitle={`${metrics.avgRecommendationsPerAssessment.toFixed(1)} ${t("ai.perAssessment")}`}
          />

          <MetricCard
            title={t("ai.essayAnalysis")}
            value={metrics.assessmentsWithEssay}
            subtitle={t("ai.assessmentsAnalyzed")}
          />

          <MetricCard
            title={t("ai.avgProcessingTime")}
            value={`${metrics.avgProcessingTime}s`}
            subtitle={t("ai.perAssessment")}
            status={metrics.avgProcessingTime < 30 ? 'good' : 'warning'}
          />

          <MetricCard
            title={t("ai.errorRate")}
            value="0.5%"
            subtitle={t("ai.last30Days")}
            status="good"
          />
        </div>
      </section>

      {/* ---------------------------------- */}
      {/* RIASEC DISTRIBUTION */}
      {/* ---------------------------------- */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t("ai.riasecDistribution")}
        </h2>

        <div className={cardClass}>
          <div className="space-y-5">
            {Object.entries(metrics.riasecDistribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${parseFloat(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------- */}
      {/* BIG FIVE */}
      {/* ---------------------------------- */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t("ai.bigFiveDistribution")}
        </h2>

        <div className={cardClass}>
          <div className="space-y-5">
            {Object.entries(metrics.bigFiveDistribution).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${parseFloat(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------- */}
      {/* USER FEEDBACK */}
      {/* ---------------------------------- */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t("ai.userFeedback")}
        </h2>

        {/* Filters */}
        <div className={cardClass}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("ai.startDate")}
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilter("startDate", e.target.value)}
                className={baseInput}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("ai.endDate")}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilter("endDate", e.target.value)}
                className={baseInput}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("ai.minRating")}
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilter("minRating", e.target.value)}
                className={baseInput}
              >
                <option value="">{t("ai.allRatings")}</option>
                <option value="1">1+ {t("ai.stars")}</option>
                <option value="2">2+ {t("ai.stars")}</option>
                <option value="3">3+ {t("ai.stars")}</option>
                <option value="4">4+ {t("ai.stars")}</option>
                <option value="5">5 {t("ai.stars")}</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadFeedback}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {t("ai.applyFilters")}
              </button>
            </div>

          </div>
        </div>

        {/* Feedback List */}
        {feedbackLoading ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            {t("ai.loadingFeedback")}
          </div>
        ) : feedback.length > 0 ? (
          <div className={`${cardClass} overflow-hidden`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("ai.user")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("ai.rating")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("ai.comment")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("ai.date")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                    {t("ai.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {feedback.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-100 dark:hover:bg-[#1E293B] text-gray-900 dark:text-white"
                  >
                    <td className="px-6 py-4">{item.userId}</td>

                    <td className="px-6 py-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={i < item.rating ? "text-yellow-400" : "text-gray-400"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {item.comment}
                    </td>

                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 dark:text-blue-400 mr-3">
                        {t("ai.viewDetails")}
                      </button>
                      <button className="text-red-600 dark:text-red-400">
                        {t("ai.flag")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (
          <div className={`${cardClass} text-center py-10`}>
            <p className="text-gray-600 dark:text-gray-400">
              {t("ai.noFeedback")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t("ai.feedbackAppearsWhenUsersRate")}
            </p>
          </div>
        )}
      </section>

      {/* ---------------------------------- */}
      {/* SYSTEM HEALTH */}
      {/* ---------------------------------- */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {t("ai.systemHealth")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthIndicator
            title={t("ai.serviceStatus")}
            status="operational"
            message={t("ai.allSystemsOperational")}
          />

          <HealthIndicator
            title={t("ai.responseTime")}
            status="good"
            message={`${t("ai.avg")}: ${metrics.avgProcessingTime}s (${t("ai.target")} < 30s)`}
          />

          <HealthIndicator
            title={t("ai.successRate")}
            status="good"
            message={t("ai.successRateMessage")}
          />
        </div>
      </section>

    </div>
  );
};

/* ---------------------------------------------
   METRIC CARD
---------------------------------------------- */

interface MetricProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricProps> = ({ title, value, subtitle, status }) => {
  const statusColors = {
    good: "border-green-500",
    warning: "border-yellow-500",
    error: "border-red-500",
  };

  return (
    <div
      className={`
        ${cardClass}
        ${status ? `border-l-4 ${statusColors[status]}` : ""}
      `}
    >
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>

      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

/* ---------------------------------------------
   HEALTH CARD
---------------------------------------------- */

interface HealthProps {
  title: string;
  status: 'operational' | 'good' | 'warning' | 'error';
  message: string;
}

const HealthIndicator: React.FC<HealthProps> = ({ title, status, message }) => {
  const statusColors: any = {
    operational: "bg-green-500",
    good: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };

  return (
    <div className={cardClass}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>

        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${statusColors[status]} mr-2`} />
          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
            {status}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default AIMonitoringPage;
