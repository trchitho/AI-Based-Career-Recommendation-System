/**
 * DATA SYNC PAGE - English Only, Dynamic Data
 */

import { useState, useEffect } from "react";
import api from "../../lib/api";

interface SyncJob {
  id: number;
  source: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  total_items: number;
  processed_items: number;
  created_items: number;
  updated_items: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface SyncStats {
  lastSync?: string;
  totalCareers: number;
  totalSkills: number;
  onetCareers: number;
  escoCareers: number;
}

const DataSyncPage = () => {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsRes, statsRes] = await Promise.all([
        api.get("/api/admin/sync/jobs"),
        api.get("/api/admin/sync/stats")
      ]);
      setJobs(jobsRes.data.items || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Error loading sync data:", err);
    } finally {
      setLoading(false);
    }
  };

  const startSync = async (source: string, type: string) => {
    const syncKey = `${source}-${type}`;
    try {
      setSyncing(syncKey);
      setMessage(null);

      const res = await api.post("/api/admin/sync/start", { source, type });

      if (res.data.status === "completed") {
        setMessage({ type: "success", text: res.data.message || "Sync completed successfully!" });
      } else if (res.data.status === "failed") {
        setMessage({ type: "error", text: res.data.message || "Sync failed" });
      }

      // Reload data to show updated stats and job history
      await loadData();
    } catch (err: any) {
      console.error("Error starting sync:", err);
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to start sync" });
    } finally {
      setSyncing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return styles[status] || styles["pending"];
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      onet: "O*NET",
      esco: "ESCO",
      all: "All Sources",
      manual: "Manual",
    };
    return labels[source] || source;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      careers: "Careers",
      skills: "Skills",
      all: "All",
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Data Sync</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Careers</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalCareers.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Skills</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalSkills.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">O*NET Careers</p>
            <p className="text-2xl font-bold text-purple-600">{stats.onetCareers.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">ESCO Careers</p>
            <p className="text-2xl font-bold text-orange-600">{stats.escoCareers.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Last Sync</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.lastSync ? formatDate(stats.lastSync) : "Never"}
            </p>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Start Sync</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Each sync processes a small batch (10 items) to avoid overloading the system.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">O*NET</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Sync careers and skills from O*NET (USA)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startSync("onet", "careers")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing === "onet-careers" ? "Syncing..." : "Careers"}
              </button>
              <button
                onClick={() => startSync("onet", "skills")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing === "onet-skills" ? "Syncing..." : "Skills"}
              </button>
            </div>
          </div>

          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">ESCO</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Sync careers and skills from ESCO (EU)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startSync("esco", "careers")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {syncing === "esco-careers" ? "Syncing..." : "Careers"}
              </button>
              <button
                onClick={() => startSync("esco", "skills")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {syncing === "esco-skills" ? "Syncing..." : "Skills"}
              </button>
            </div>
          </div>

          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Full Sync</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Sync all data from all sources
            </p>
            <button
              onClick={() => startSync("all", "all")}
              disabled={syncing !== null}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {syncing === "all-all" ? "Syncing..." : "Start Full Sync"}
            </button>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Sync History</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sync jobs found. Start a sync to see history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                      {getSourceLabel(job.source)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                      {getTypeLabel(job.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                      {job.processed_items}/{job.total_items}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.status === "completed" ? (
                        <span className="text-green-600 dark:text-green-400">
                          +{job.created_items} new, ~{job.updated_items} updated
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="text-red-600 dark:text-red-400" title={job.error_message}>
                          Error: {job.error_message?.substring(0, 30) || "Unknown"}
                        </span>
                      ) : job.status === "running" ? (
                        <span className="text-blue-600 dark:text-blue-400">In progress...</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSyncPage;
