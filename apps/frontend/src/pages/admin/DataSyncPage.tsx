/**
 * DATA SYNC PAGE - Vietnamese UI
 */

import { useState, useEffect } from "react";
import api from "../../lib/api";
import { adminService } from "../../services/adminService";
import { translateSyncStatus } from "../../utils/translations";

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
  // PB30: export state
  const [exporting, setExporting] = useState<string | null>(null);

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

  // PB30: Export helpers
  const exportData = async (type: "careers" | "users") => {
    setExporting(type);
    try {
      let blob: Blob;
      let filename: string;
      if (type === "users") {
        blob = await adminService.exportUsers();
        filename = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        // Export careers via admin endpoint
        const res = await api.get("/api/admin/careers/export", { responseType: "blob" });
        blob = res.data;
        filename = `careers_export_${new Date().toISOString().slice(0, 10)}.csv`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `${type} exported successfully!` });
    } catch (err: any) {
      setMessage({ type: "error", text: `Export failed: ${err?.response?.data?.detail || err?.message || "Unknown error"}` });
    } finally {
      setExporting(null);
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
      completed: "bg-indigo-50 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return styles[status] || styles["pending"];
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      onet: "O*NET",
      esco: "ESCO",
      all: "Tất cả nguồn",
      manual: "Thủ công",
    };
    return labels[source] || source;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      careers: "Nghề nghiệp",
      skills: "Kỹ năng",
      all: "Tất cả",
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6 space-y-6">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">Đồng bộ dữ liệu</h1>
            </div>
            <p className="text-white/90 text-sm ml-16">Đồng bộ nghề nghiệp và kỹ năng từ nguồn bên ngoài</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-indigo-50 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Stats - Modern Gradient Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-blue-100 mb-1">Tổng nghề nghiệp</p>
              <p className="text-3xl font-bold text-white">{stats.totalCareers.toLocaleString()}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-indigo-700 to-indigo-800 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-indigo-100 mb-1">Tổng kỹ năng</p>
              <p className="text-3xl font-bold text-white">{stats.totalSkills.toLocaleString()}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-purple-100 mb-1">Nghề O*NET</p>
              <p className="text-3xl font-bold text-white">{stats.onetCareers.toLocaleString()}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-orange-100 mb-1">Nghề ESCO</p>
              <p className="text-3xl font-bold text-white">{stats.escoCareers.toLocaleString()}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-pink-100 mb-1">Đồng bộ lần cuối</p>
              <p className="text-sm font-semibold text-white truncate">
                {stats.lastSync ? formatDate(stats.lastSync) : "Chưa bao giờ"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <h2 className="text-base font-semibold mb-1 text-gray-900 dark:text-white">Bắt đầu đồng bộ</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Mỗi lần đồng bộ xử lý một lô nhỏ (10 mục) để tránh quá tải hệ thống.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-700/20">
            <h3 className="font-medium text-gray-900 dark:text-white">O*NET</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Đồng bộ nghề nghiệp và kỹ năng từ O*NET (Mỹ)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startSync("onet", "careers")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {syncing === "onet-careers" ? "Đang đồng bộ..." : "Nghề nghiệp"}
              </button>
              <button
                onClick={() => startSync("onet", "skills")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {syncing === "onet-skills" ? "Đang đồng bộ..." : "Kỹ năng"}
              </button>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-700/20">
            <h3 className="font-medium text-gray-900 dark:text-white">ESCO</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Đồng bộ nghề nghiệp và kỹ năng từ ESCO (EU)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startSync("esco", "careers")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 disabled:opacity-50 transition-colors"
              >
                {syncing === "esco-careers" ? "Đang đồng bộ..." : "Nghề nghiệp"}
              </button>
              <button
                onClick={() => startSync("esco", "skills")}
                disabled={syncing !== null}
                className="px-3 py-1.5 text-sm bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 disabled:opacity-50 transition-colors"
              >
                {syncing === "esco-skills" ? "Đang đồng bộ..." : "Kỹ năng"}
              </button>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-700/20">
            <h3 className="font-medium text-gray-900 dark:text-white">Đồng bộ toàn bộ</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Đồng bộ tất cả dữ liệu từ mọi nguồn
            </p>
            <button
              onClick={() => startSync("all", "all")}
              disabled={syncing !== null}
              className="px-3 py-1.5 text-sm bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 disabled:opacity-50 transition-colors"
            >
              {syncing === "all-all" ? "Đang đồng bộ..." : "Bắt đầu đồng bộ toàn bộ"}
            </button>
          </div>
        </div>
      </div>

      {/* PB30: Export Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Xuất dữ liệu</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tải xuống dữ liệu hệ thống dưới dạng CSV để phân tích hoặc sao lưu.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportData("careers")}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {exporting === "careers" ? "Đang xuất..." : "Xuất CSV nghề nghiệp"}
          </button>
          <button
            onClick={() => exportData("users")}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-800 hover:bg-indigo-900 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {exporting === "users" ? "Đang xuất..." : "Xuất CSV người dùng"}
          </button>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Lịch sử đồng bộ</h2>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            Không tìm thấy công việc đồng bộ. Bắt đầu đồng bộ để xem lịch sử.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Thời gian</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Nguồn</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Loại</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Tiến độ</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-white whitespace-nowrap">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {getSourceLabel(job.source)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {getTypeLabel(job.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(job.status)}`}>
                        {translateSyncStatus(job.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {job.processed_items}/{job.total_items}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.status === "completed" ? (
                        <span className="text-indigo-800 dark:text-indigo-400">
                          +{job.created_items} mới, ~{job.updated_items} cập nhật
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="text-red-600 dark:text-red-400" title={job.error_message}>
                          Lỗi: {job.error_message?.substring(0, 30) || "Không rõ"}
                        </span>
                      ) : job.status === "running" ? (
                        <span className="text-blue-600 dark:text-blue-400">Đang xử lý...</span>
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
