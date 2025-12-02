import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { useTranslation } from "react-i18next";

const UserManagementPage = () => {
  const { t } = useTranslation();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.listUsers({
        page,
        pageSize,
        q: q.trim() || undefined,
      });
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {t("admin.user.managementTitle")}
        </h2>

        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder={t("admin.user.search")}
          className="px-3 py-2 border rounded bg-white/80 
                     dark:bg-gray-800/50 border-gray-300 
                     dark:border-gray-700 text-sm"
        />
      </div>

      {/* Loading */}
      {loading && <div>{t("admin.loading")}</div>}
      {error && <div className="text-red-700">{error}</div>}

      {/* Table */}
      {!loading && !error && (
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">{t("admin.user.email")}</th>
              <th className="px-3 py-2 text-left">{t("admin.user.fullName")}</th>
              <th className="px-3 py-2 text-left">{t("admin.user.role")}</th>
              <th className="px-3 py-2 text-left">{t("admin.user.locked")}</th>
              <th className="px-3 py-2 text-left">{t("admin.actions")}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2">{u.role}</td>

                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${u.is_locked
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                      }`}
                  >
                    {u.is_locked
                      ? t("admin.user.lockedStatus")
                      : t("admin.user.activeStatus")}
                  </span>
                </td>

                <td className="px-3 py-2 space-x-2">
                  <button
                    className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                    onClick={() => setRole(u.id, "user")}
                  >
                    {t("admin.user.roleUser")}
                  </button>

                  <button
                    className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    onClick={() => setRole(u.id, "manager")}
                  >
                    {t("admin.user.roleManager")}
                  </button>

                  <button
                    className="px-2 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"
                    onClick={() => setRole(u.id, "admin")}
                  >
                    {t("admin.user.roleAdmin")}
                  </button>

                  <button
                    className={`px-2 py-1 rounded transition ${u.is_locked
                        ? "bg-green-200 text-green-800 hover:bg-green-300"
                        : "bg-rose-200 text-rose-800 hover:bg-rose-300"
                      }`}
                    onClick={async () => {
                      await adminService.updateUser(u.id, {
                        is_locked: !u.is_locked,
                      });
                      load();
                    }}
                  >
                    {u.is_locked ? t("admin.user.unlock") : t("admin.user.lock")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {!loading && !error && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className="px-3 py-2 rounded border bg-white/80 
                       dark:bg-gray-800/50 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("admin.prev")}
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-300">
            {t("admin.page")} {page} /{" "}
            {Math.max(1, Math.ceil(total / pageSize))}
          </span>

          <button
            className="px-3 py-2 rounded border bg-white/80 
                       dark:bg-gray-800/50 disabled:opacity-50"
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("admin.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
