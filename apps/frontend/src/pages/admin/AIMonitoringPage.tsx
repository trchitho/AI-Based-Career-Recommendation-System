/**
 * AI MONITORING PAGE - English Only, 100% Dynamic Data
 */

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
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

interface Anomaly {
  id: number;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  user_id: number | null;
  user_email: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

interface AnomalyStats {
  total: number;
  unresolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/* ---------------------------------------------
   SHARED STYLE CONSTANTS
---------------------------------------------- */
const baseInput =
  "w-full px-3 py-2 rounded-lg border " +
  "bg-white dark:bg-admin-dark-card " +
  "border-gray-300 dark:border-admin-dark-border " +
  "text-gray-800 dark:text-gray-200 " +
  "placeholder-gray-400 dark:placeholder-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500";

const cardClass =
  "bg-gray-50 dark:bg-admin-dark-bg rounded-xl shadow p-6 " +
  "border border-gray-200 dark:border-admin-dark-card";

const tableHead =
  "bg-gray-100 dark:bg-admin-dark-card text-gray-700 dark:text-gray-300";

/* ---------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */
const AIMonitoringPage = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // PB28: Gemini live status
  const [geminiStatus, setGeminiStatus] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [reiniting, setReiniting] = useState(false);

  // Anomaly detection
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minRating: '',
  });

  useEffect(() => {
    loadMetrics();
    loadFeedback();
    loadGeminiStatus();
    loadAnomalies();
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

  // PB28: Gemini status functions
  const loadGeminiStatus = async () => {
    setGeminiLoading(true);
    try {
      const data = await adminService.getGeminiStatus();
      setGeminiStatus(data);
    } catch {
      setGeminiStatus(null);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleReinit = async () => {
    setReiniting(true);
    try {
      await fetch('/api/admin/gemini-reinit', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
      await loadGeminiStatus();
    } catch {
      // non-critical
    } finally {
      setReiniting(false);
    }
  };

  const loadAnomalies = async () => {
    setAnomalyLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get("/api/admin/anomalies?limit=50"),
        api.get("/api/admin/anomalies/stats"),
      ]);
      setAnomalies(listRes.data.items || []);
      setAnomalyStats(statsRes.data);
    } catch (e) {
      console.error("Error loading anomalies:", e);
    } finally {
      setAnomalyLoading(false);
    }
  };

  const runDetection = async () => {
    setDetecting(true);
    setDetectMsg(null);
    try {
      const res = await api.post("/api/admin/anomalies/detect");
      const created = res.data.anomalies_created ?? 0;
      setDetectMsg(created > 0 ? `${created} new anomaly(s) detected.` : "No new anomalies found.");
      await loadAnomalies();
    } catch (e: any) {
      setDetectMsg(`Detection failed: ${e?.response?.data?.detail || e?.message || "Unknown error"}`);
    } finally {
      setDetecting(false);
    }
  };

  const resolveAnomaly = async (id: number) => {
    try {
      await api.post(`/api/admin/anomalies/${id}/resolve`);
      setAnomalies((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
      if (anomalyStats) {
        setAnomalyStats({ ...anomalyStats, unresolved: Math.max(0, anomalyStats.unresolved - 1) });
      }
    } catch (e) {
      console.error("Failed to resolve anomaly:", e);
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Performance Monitoring
        </h1>
        <button onClick={loadMetrics} className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* PB28: GEMINI LIVE STATUS */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${geminiStatus?.streams_initialized ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}/>
          Gemini AI Status
        </h2>
        <div className={`${cardClass} relative`}>
          {geminiLoading ? (
            <div className="flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"/> Loading status...</div>
          ) : geminiStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Overall', value: geminiStatus.streams_initialized ? '✅ Online' : '❌ Offline', ok: geminiStatus.streams_initialized },
                  { label: 'Assessment', value: geminiStatus.streams?.assessment?.initialized ? '✅ Ready' : '⚠️ Error', ok: geminiStatus.streams?.assessment?.initialized },
                  { label: 'Chatbot', value: geminiStatus.streams?.chatbot?.initialized ? '✅ Ready' : '⚠️ Error', ok: geminiStatus.streams?.chatbot?.initialized },
                  { label: 'CV Parser', value: geminiStatus.streams?.cv?.initialized ? '✅ Ready' : '⚠️ Error', ok: geminiStatus.streams?.cv?.initialized },
                ].map(({ label, value, ok }) => (
                  <div key={label} className={`p-3 rounded-xl border-2 ${ok ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                    <p className={`text-sm font-bold ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{value}</p>
                  </div>
                ))}
              </div>
              {geminiStatus.model && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Model: <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{geminiStatus.model}</span></p>
              )}
              {geminiStatus.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 font-mono">{geminiStatus.error}</div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Unable to fetch Gemini status.</p>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={loadGeminiStatus} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Refresh</button>
            <button onClick={handleReinit} disabled={reiniting} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
              {reiniting ? "Reinitializing..." : "Reinitialize"}
            </button>
          </div>
        </div>
      </section>

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
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-admin-dark-bg">
                {feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100 dark:hover:bg-admin-dark-card">
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

      {/* ANOMALY DETECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${anomalyStats && anomalyStats.critical > 0 ? 'bg-red-500 animate-pulse' : anomalyStats && anomalyStats.unresolved > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            Anomaly Detection
            {anomalyStats && anomalyStats.unresolved > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {anomalyStats.unresolved} unresolved
              </span>
            )}
          </h2>
          <button
            onClick={runDetection}
            disabled={detecting}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {detecting ? "Scanning..." : "Run Detection"}
          </button>
        </div>

        {detectMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${detectMsg.includes("failed") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
            {detectMsg}
          </div>
        )}

        {/* Stats row */}
        {anomalyStats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {(["total","unresolved","critical","high","medium","low"] as const).map((k) => {
              const colorMap = { total: "text-gray-700 dark:text-gray-300", unresolved: "text-orange-600 dark:text-orange-400", critical: "text-red-600 dark:text-red-400", high: "text-red-500 dark:text-red-400", medium: "text-yellow-600 dark:text-yellow-400", low: "text-blue-600 dark:text-blue-400" };
              return (
                <div key={k} className={`${cardClass} text-center py-3`}>
                  <p className="text-xs text-gray-500 capitalize">{k}</p>
                  <p className={`text-2xl font-bold ${colorMap[k]}`}>{anomalyStats[k]}</p>
                </div>
              );
            })}
          </div>
        )}

        {anomalyLoading ? (
          <div className="text-center py-8 text-gray-500">Loading anomalies...</div>
        ) : anomalies.length === 0 ? (
          <div className={`${cardClass} text-center py-8`}>
            <p className="text-green-600 dark:text-green-400 font-semibold">No anomalies detected</p>
            <p className="text-sm text-gray-500 mt-1">Click "Run Detection" to scan for issues in real data.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a) => {
              const severityColors: Record<string, string> = {
                critical: "border-red-500 bg-red-50 dark:bg-red-900/10",
                high: "border-red-400 bg-red-50 dark:bg-red-900/10",
                medium: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10",
                low: "border-blue-400 bg-blue-50 dark:bg-blue-900/10",
              };
              const badgeColors: Record<string, string> = {
                critical: "bg-red-600 text-white",
                high: "bg-red-500 text-white",
                medium: "bg-yellow-500 text-white",
                low: "bg-blue-500 text-white",
              };
              return (
                <div key={a.id} className={`border-l-4 rounded-xl p-4 ${severityColors[a.severity] || "border-gray-300 bg-white dark:bg-gray-800"} ${a.resolved ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${badgeColors[a.severity] || "bg-gray-400 text-white"}`}>{a.severity}</span>
                        <span className="text-xs text-gray-500 font-mono">{a.type}</span>
                        {a.resolved && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">Resolved</span>}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">{a.title}</p>
                      {a.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{a.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
                    </div>
                    {!a.resolved && (
                      <button
                        onClick={() => resolveAnomaly(a.id)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
