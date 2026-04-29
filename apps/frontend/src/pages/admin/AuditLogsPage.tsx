/**
 * AUDIT LOGS PAGE - English Only
 */

import { useState, useEffect } from "react";
import api from "../../lib/api";

interface AuditLog {
  id: number;
  user_id: number;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  user_id?: number;
  from_date?: string;
  to_date?: string;
  page: number;
  pageSize: number;
}

const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    pageSize: 20,
  });

  const actionTypes = [
    { value: "", label: "All Actions" },
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
    { value: "create_user", label: "Create User" },
    { value: "update_user", label: "Update User" },
    { value: "delete_user", label: "Delete User" },
    { value: "create_career", label: "Create Career" },
    { value: "update_career", label: "Update Career" },
    { value: "delete_career", label: "Delete Career" },
    { value: "create_question", label: "Create Question" },
    { value: "update_question", label: "Update Question" },
    { value: "delete_question", label: "Delete Question" },
    { value: "payment_create", label: "Payment Create" },
    { value: "payment_success", label: "Payment Success" },
  ];

  const resourceTypes = [
    { value: "", label: "All Resources" },
    { value: "user", label: "User" },
    { value: "career", label: "Career" },
    { value: "skill", label: "Skill" },
    { value: "question", label: "Question" },
    { value: "payment", label: "Payment" },
    { value: "settings", label: "Settings" },
    { value: "blog", label: "Blog" },
  ];

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        limit: filters.pageSize,
        offset: (filters.page - 1) * filters.pageSize,
      };
      if (filters.action) params["action"] = filters.action;
      if (filters.resource_type) params["resource_type"] = filters.resource_type;
      if (filters.user_id) params["user_id"] = filters.user_id;
      if (filters.from_date) params["from_date"] = filters.from_date;
      if (filters.to_date) params["to_date"] = filters.to_date;

      const res = await api.get("/api/admin/audit-logs", { params });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("login")) return "bg-indigo-50 text-green-800 dark:bg-indigo-950 dark:text-indigo-300";
    if (action.includes("logout")) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    if (action.includes("delete")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (action.includes("create")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (action.includes("update") || action.includes("change")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    if (action.includes("payment")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US");
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Audit Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tổng {total} bản ghi hoạt động</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action
            </label>
            <select
              value={filters.action || ""}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {actionTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource Type
            </label>
            <select
              value={filters.resource_type || ""}
              onChange={(e) => setFilters({ ...filters, resource_type: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {resourceTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.from_date || ""}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.to_date || ""}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value, page: 1 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, pageSize: 20 })}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm">Không có audit log nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Resource</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">IP</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{log.user_email || `User ${log.user_id}`}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getActionBadgeColor(log.action)}`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {log.resource_type}{log.resource_id && <span className="text-gray-400"> {log.resource_id}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{log.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).substring(0, 50) + "..." : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Trang {filters.page} / {totalPages} — {total} bản ghi</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page <= 1}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= totalPages}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
