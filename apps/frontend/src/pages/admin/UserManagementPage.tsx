import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { useTranslation } from "react-i18next";

const UserManagementPage = () => {
  const { t } = useTranslation();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; pageSize: number; q?: string } = {
        page,
        pageSize,
      };
      if (q.trim()) {
        params.q = q.trim();
      }
      const data = await adminService.listUsers(params);
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || t("admin.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, q]);

  const setRole = async (id: string, role: "admin" | "user" | "manager") => {
    await adminService.updateUser(id, { role });
    load();
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "from-rose-500 to-pink-500";
      case "manager":
        return "from-purple-500 to-indigo-500";
      default:
        return "from-blue-500 to-cyan-500";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      case "manager":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
            User Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-5">
            Manage {total} users in the system
          </p>
        </div>

        <div className="relative">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder={t("admin.user.search")}
            className="pl-10 pr-4 py-2.5 w-64 border-2 rounded-xl bg-white dark:bg-gray-800 
                       border-gray-200 dark:border-gray-700 text-sm
                       focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none
                       transition-colors"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* User Cards Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rows.map((u) => (
            <div
              key={u.id}
              className="group bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 
                         overflow-hidden hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 
                         transition-all duration-300 hover:-translate-y-1"
            >
              {/* Card Header with gradient */}
              <div className={`h-2 bg-gradient-to-r ${getRoleColor(u.role)}`}></div>
              
              <div className="p-5">
                {/* Avatar & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(u.role)} 
                                    flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
                        {u.full_name || "Chưa đặt tên"}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadge(u.role)}`}>
                        {u.role?.charAt(0).toUpperCase() + u.role?.slice(1) || "User"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    u.is_locked
                      ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                  }`}>
                    {u.is_locked ? "🔒" : "✓"}
                  </span>
                </div>

                {/* Email */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{u.email}</p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all
                        ${u.role === "user" 
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800"}`}
                      onClick={() => setRole(u.id, "user")}
                    >
                      User
                    </button>
                    <button
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all
                        ${u.role === "manager" 
                          ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" 
                          : "bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800"}`}
                      onClick={() => setRole(u.id, "manager")}
                    >
                      Manager
                    </button>
                    <button
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all
                        ${u.role === "admin" 
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30" 
                          : "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800"}`}
                      onClick={() => setRole(u.id, "admin")}
                    >
                      Admin
                    </button>
                  </div>
                  
                  <button
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2
                      ${u.is_locked
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/30 dark:text-gray-300 dark:hover:text-red-400 border-2 border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800"
                      }`}
                    onClick={async () => {
                      await adminService.updateUser(u.id, { is_locked: !u.is_locked });
                      load();
                    }}
                  >
                    {u.is_locked ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        {t("admin.user.unlock")}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t("admin.user.lock")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No users found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Try searching with different keywords</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && rows.length > 0 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
                       bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700
                       hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← {t("admin.prev")}
          </button>

          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {page} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>
          </div>

          <button
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
                       bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700
                       hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none"
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("admin.next")} →
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
