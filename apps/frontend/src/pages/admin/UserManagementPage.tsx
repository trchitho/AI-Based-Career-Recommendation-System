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

  // PB25: Create user modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", role: "user" as "admin" | "user" });
  const [createError, setCreateError] = useState<string | null>(null);

  // PB25: Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // PB25: Export
  const [exporting, setExporting] = useState(false);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await adminService.createUser(createForm);
      setShowCreate(false);
      setCreateForm({ email: "", password: "", full_name: "", role: "user" });
      load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setCreateError(typeof detail === 'object' ? detail?.message : (detail || err?.message || "Không thể tạo người dùng"));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setDeleting(true);
    try {
      await adminService.deleteUser(id);
      setDeleteConfirm(null);
      load();
    } catch {
      alert("Không thể xóa người dùng");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminService.exportUsers();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Xuất dữ liệu thất bại");
    } finally {
      setExporting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "from-[#9333EA] to-[#A855F7]";
      case "manager":
        return "from-[#6366F1] to-[#818CF8]";
      default:
        return "from-[#4F46E5] to-[#6366F1]";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-[#9333EA] text-white shadow-md shadow-[#9333EA]/30 border-[#9333EA]";
      case "manager":
        return "bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/30 border-[#6366F1]";
      default:
        return "bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/30 border-[#4F46E5]";
    }
  };

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Quản lý người dùng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quản lý {total} người dùng trong hệ thống</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
              placeholder={t("admin.user.search")}
              className="pl-9 pr-4 py-2 w-52 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {exporting ? "Đang xuất..." : "Xuất CSV"}
          </button>
          <button onClick={() => { setShowCreate(true); setCreateError(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            + Thêm người dùng
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          Đang tải...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* User Cards Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((u) => (
            <div
              key={u.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`h-1 bg-gradient-to-r ${getRoleColor(u.role)}`}></div>

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
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${u.is_locked
                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    : "bg-indigo-50 text-indigo-800 border-emerald-200 dark:bg-indigo-950/20 dark:text-emerald-400 dark:border-emerald-800"
                    }`}>
                    {u.is_locked ? "Locked" : "Active"}
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
                          ? "bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/50"
                          : "bg-white text-gray-700 border border-[#CBD5E1] hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"}`}
                      onClick={() => setRole(u.id, "user")}
                    >
                      User
                    </button>
                    <button
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all
                        ${u.role === "manager"
                          ? "bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/50"
                          : "bg-white text-gray-700 border border-[#CBD5E1] hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"}`}
                      onClick={() => setRole(u.id, "manager")}
                    >
                      Manager
                    </button>
                    <button
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all
                        ${u.role === "admin"
                          ? "bg-[#9333EA] text-white shadow-lg shadow-[#9333EA]/50"
                          : "bg-white text-gray-700 border border-[#CBD5E1] hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"}`}
                      onClick={() => setRole(u.id, "admin")}
                    >
                      Admin
                    </button>
                  </div>

                  <button
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2
                      ${u.is_locked
                        ? "bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-lg shadow-[#4F46E5]/40"
                        : "bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1] dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 shadow-sm shadow-[#FEE2E2]/30"
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

                  {/* PB25: Delete user */}
                  <button
                    onClick={() => setDeleteConfirm(u.id)}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] dark:bg-[#DC2626] dark:hover:bg-[#B91C1C] shadow-lg shadow-[#EF4444]/40 hover:shadow-[#EF4444]/60 transition-all flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm">Không tìm thấy người dùng nào</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && rows.length > 0 && Math.ceil(total / pageSize) > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Trang {page} / {Math.ceil(total / pageSize)} — {total} người dùng</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              ← {t("admin.prev")}
            </button>
            <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {t("admin.next")} →
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Tạo người dùng mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email *</label>
                <input type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Họ và tên</label>
                <input type="text" value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Mật khẩu *</label>
                <input type="password" required value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Vai trò</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as "admin" | "user" }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {createError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Huỷ</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-lg bg-indigo-800 hover:bg-indigo-900 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                  {creating ? "Đang tạo..." : "Tạo người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xoá người dùng</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xoá vĩnh viễn.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Huỷ</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {deleting ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
