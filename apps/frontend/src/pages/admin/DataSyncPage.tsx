import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

interface SyncJob {
  id: number;
  source: "onet" | "esco" | "manual";
  type: "careers" | "skills" | "all";
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
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsRes, statsRes] = await Promise.all([
        api.get("/api/admin/sync/jobs"),
        api.get("/api/admin/sync/stats"),
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
    try {
      setSyncing(true);
      await api.post("/api/admin/sync/start", { source, type });
      // Poll for updates
      const pollInterval = setInterval(async () => {
        const res = await api.get("/api/admin/sync/jobs");
        setJobs(res.data.items || []);
        const latestJob = res.data.items?.[0];
        if (latestJob && (latestJob.status === "completed" || latestJob.status === "failed")) {
          clearInterval(pollInterval);
          setSyncing(false);
          loadData();
        }
      }, 2000);
    } catch (err) {
      console.error("Error starting sync:", err);
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      onet: "O*NET",
      esco: "ESCO",
      manual: "Thủ công",
    };
    return labels[source] || source;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("vi-VN");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Đồng bộ dữ liệu</h1>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Làm mới
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tổng nghề nghiệp</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalCareers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tổng kỹ năng</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalSkills}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Từ O*NET</p>
            <p className="text-2xl font-bold text-purple-600">{stats.onetCareers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Từ ESCO</p>
            <p className="text-2xl font-bold text-orange-600">{stats.escoCareers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Đồng bộ lần cuối</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.lastSync ? formatDate(stats.lastSync) : "Chưa có"}
            </p>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Bắt đầu đồng bộ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">O*NET Database</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Đồng bộ nghề nghiệp và kỹ năng từ O*NET (Mỹ)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startSync("onet", "careers")}
                disabled={syncing}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Nghề nghiệp
              </button>
              <button
                onClick={() => startSync("onet", "skills")}
                disabled={syncing}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Kỹ năng
              </button>
            </div>
          </div>

          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">ESCO Database</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Đồng bộ nghề nghiệp và kỹ năng từ ESCO (EU)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startSync("esco", "careers")}
                disabled={syncing}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Nghề nghiệp
              </button>
              <button
                onClick={() => startSync("esco", "skills")}
                disabled={syncing}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Kỹ năng
              </button>
            </div>
          </div>

          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Đồng bộ tất cả</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Đồng bộ toàn bộ dữ liệu từ cả hai nguồn
            </p>
            <button
              onClick={() => startSync("all", "all")}
              disabled={syncing}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {syncing ? "Đang đồng bộ..." : "Đồng bộ tất cả"}
            </button>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Lịch sử đồng bộ</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Đang tải...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Chưa có lịch sử đồng bộ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Nguồn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Tiến độ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Kết quả
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {getSourceLabel(job.source)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {job.type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {job.status === "running" ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(job.processed_items / job.total_items) * 100}%` }}
                            />
                          </div>
                          <span>{job.processed_items}/{job.total_items}</span>
                        </div>
                      ) : (
                        `${job.processed_items}/${job.total_items}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {job.status === "completed" ? (
                        <span className="text-green-600">
                          +{job.created_items} mới, ~{job.updated_items} cập nhật
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="text-red-600" title={job.error_message}>
                          Lỗi
                        </span>
                      ) : (
                        "-"
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
