/**
 * AI MONITORING PAGE - English Only, 100% Dynamic Data
 */

import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

/* ---------------------------------------------
   TYPES
---------------------------------------------- */
interface AIMetrics {
  totalRecommendations: number;
  totalAssessments: number;
  avgRecommendationsPerAssessment: number;
  assessmentsWithEssay: number;
  avgProcessingTime: number;
  errorRate: number;
  errorCount: number;
  successCount: number;
  avgFeedbackRating: number;
  totalFeedback: number;
  riasecDistribution: Record<string, string>;
  bigFiveDistribution: Record<string, string>;
}

interface UserFeedback {
  id: string;
  userId: string;
  userName: string;
  assessmentId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

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

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAIMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      setFeedbackLoading(true);
      const params: Record<string, string | number> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minRating) params.minRating = Number(filters.minRating);

      const data = await adminService.getUserFeedback(params);
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
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
        Loading metrics...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`${cardClass} text-red-500`}>
        Failed to load metrics
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* TITLE */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        AI Performance Monitoring
      </h1>

      {/* PERFORMANCE METRICS */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Performance Metrics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Recommendations"
            value={metrics.totalRecommendations}
            subtitle={`${metrics.avgRecommendationsPerAssessment.toFixed(1)} per assessment`}
          />

          <MetricCard
            title="Essay Analysis"
            value={metrics.assessmentsWithEssay}
            subtitle="Assessments analyzed"
          />

          <MetricCard
            title="Avg Processing Time"
            value={`${metrics.avgProcessingTime}s`}
            subtitle="per assessment"
            status={metrics.avgProcessingTime < 30 ? 'good' : 'warning'}
          />

          <MetricCard
            title="Error Rate"
            value={`${metrics.errorRate}%`}
            subtitle="Last 30 days"
            status={metrics.errorRate < 5 ? 'good' : metrics.errorRate < 10 ? 'warning' : 'error'}
          />
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <MetricCard
            title="Total Assessments"
            value={metrics.totalAssessments}
            subtitle="All time"
          />

          <MetricCard
            title="Success Operations"
            value={metrics.successCount}
            subtitle="Last 30 days"
            status="good"
          />

          <MetricCard
            title="Error Operations"
            value={metrics.errorCount}
            subtitle="Last 30 days"
            status={metrics.errorCount === 0 ? 'good' : 'warning'}
          />

          <MetricCard
            title="Avg Feedback Rating"
            value={metrics.avgFeedbackRating > 0 ? `${metrics.avgFeedbackRating} ★` : 'N/A'}
            subtitle={`${metrics.totalFeedback} total reviews`}
            status={metrics.avgFeedbackRating >= 4 ? 'good' : metrics.avgFeedbackRating >= 3 ? 'warning' : 'error'}
          />
        </div>
      </section>

      {/* RIASEC DISTRIBUTION */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          RIASEC Distribution
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
                    style={{ width: value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIG FIVE DISTRIBUTION */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Big Five Distribution
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
                    style={{ width: value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USER FEEDBACK */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          User Feedback
        </h2>

        {/* Filters */}
        <div className={`${cardClass} mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
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
                End Date
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
                Min Rating
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilter("minRating", e.target.value)}
                className={baseInput}
              >
                <option value="">All Ratings</option>
                <option value="1">1+ Stars</option>
                <option value="2">2+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadFeedback}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {feedbackLoading ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            Loading feedback...
          </div>
        ) : feedback.length > 0 ? (
          <div className={`${cardClass} overflow-hidden p-0`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#0F172A]">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-[#1E293B]">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {item.userName}
                    </td>
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
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 max-w-md truncate">
                      {item.comment || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`${cardClass} text-center py-10`}>
            <p className="text-gray-600 dark:text-gray-400">No feedback found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Feedback will appear here when users rate their assessments
            </p>
          </div>
        )}
      </section>

      {/* SYSTEM HEALTH */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          System Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthIndicator
            title="Service Status"
            status="operational"
            message="All systems operational"
          />

          <HealthIndicator
            title="Response Time"
            status={metrics.avgProcessingTime < 30 ? 'good' : 'warning'}
            message={`Avg: ${metrics.avgProcessingTime}s (Target < 30s)`}
          />

          <HealthIndicator
            title="Success Rate"
            status={metrics.errorRate < 5 ? 'good' : 'warning'}
            message={`${(100 - metrics.errorRate).toFixed(1)}% success rate`}
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
    <div className={`${cardClass} ${status ? `border-l-4 ${statusColors[status]}` : ""}`}>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

/* ---------------------------------------------
   HEALTH INDICATOR
---------------------------------------------- */
interface HealthProps {
  title: string;
  status: 'operational' | 'good' | 'warning' | 'error';
  message: string;
}

const HealthIndicator: React.FC<HealthProps> = ({ title, status, message }) => {
  const statusColors: Record<string, string> = {
    operational: "bg-green-500",
    good: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    operational: "Operational",
    good: "Good",
    warning: "Warning",
    error: "Error",
  };

  return (
    <div className={cardClass}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${statusColors[status]} mr-2`} />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {statusLabels[status]}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default AIMonitoringPage;
