/**
 * ANOMALY DETECTION PAGE - English Only
 */

import { useState, useEffect } from "react";
import api from "../../lib/api";

interface Anomaly {
  id: number;
  type: "security" | "ai_error" | "performance" | "unusual_activity";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  user_id?: number;
  user_email?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
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

const AnomalyDetectionPage = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type?: string;
    severity?: string;
    resolved?: boolean;
  }>({});

  useEffect(() => {
    loadAnomalies();
  }, [filter]);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = { limit: 50 };
      if (filter.type) params.type = filter.type;
      if (filter.severity) params.severity = filter.severity;
      if (filter.resolved !== undefined) params.resolved = filter.resolved;

      const [anomalyRes, statsRes] = await Promise.all([
        api.get("/api/admin/anomalies", { params }),
        api.get("/api/admin/anomalies/stats"),
      ]);
      setAnomalies(anomalyRes.data.items || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Error loading anomalies:", err);
    } finally {
      setLoading(false);
    }
  };

  const resolveAnomaly = async (id: number) => {
    try {
      await api.post(`/api/admin/anomalies/${id}/resolve`);
      loadAnomalies();
    } catch (err) {
      console.error("Error resolving anomaly:", err);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: "bg-red-600 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-blue-500 text-white",
    };
    return styles[severity] || "bg-gray-500 text-white";
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      security: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      ai_error: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      performance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      unusual_activity: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    };
    return styles[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      security: "Security",
      ai_error: "AI Error",
      performance: "Performance",
      unusual_activity: "Unusual Activity",
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Anomaly Detection</h1>
        <button
          onClick={loadAnomalies}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Alerts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Unresolved</p>
            <p className="text-2xl font-bold text-orange-600">{stats.unresolved}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Critical</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-4">
            <p className="text-sm text-orange-600 dark:text-orange-400">High</p>
            <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Medium</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">Low</p>
            <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filter.type || ""}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="security">Security</option>
            <option value="ai_error">AI Error</option>
            <option value="performance">Performance</option>
            <option value="unusual_activity">Unusual Activity</option>
          </select>

          <select
            value={filter.severity || ""}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value || undefined })}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filter.resolved === undefined ? "" : filter.resolved ? "true" : "false"}
            onChange={(e) => setFilter({ ...filter, resolved: e.target.value === "" ? undefined : e.target.value === "true" })}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : anomalies.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No anomalies detected
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-4 ${anomaly.resolved ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityBadge(anomaly.severity)}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge(anomaly.type)}`}>
                        {getTypeLabel(anomaly.type)}
                      </span>
                      {anomaly.resolved && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Resolved
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{anomaly.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{anomaly.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{formatDate(anomaly.created_at)}</span>
                      {anomaly.user_email && <span>User: {anomaly.user_email}</span>}
                      {anomaly.resolved_at && (
                        <span>Resolved at: {formatDate(anomaly.resolved_at)}</span>
                      )}
                    </div>
                  </div>
                  {!anomaly.resolved && (
                    <button
                      onClick={() => resolveAnomaly(anomaly.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyDetectionPage;
