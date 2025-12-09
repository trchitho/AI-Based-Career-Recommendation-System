import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import {
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminTransaction,
  TransactionFilters,
  TransactionSummary,
} from "../../types/admin";
import { useTheme } from "../../contexts/ThemeContext";

type LocalFilters = TransactionFilters & { userId?: number | string };

const defaultFilters: LocalFilters = {
  status: "all",
  paymentMethod: "all",
  search: "",
  fromDate: "",
  toDate: "",
  userId: "",
};

const statusOptions: Array<{ label: string; value: AdminPaymentStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

const methodOptions: Array<{ label: string; value: AdminPaymentMethod | "all" }> = [
  { label: "Any method", value: "all" },
  { label: "ZaloPay", value: "zalopay" },
  { label: "MoMo", value: "momo" },
  { label: "VNPay", value: "vnpay" },
];

const TransactionHistoryPage = () => {
  const { theme } = useTheme();

  const [filters, setFilters] = useState<LocalFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<LocalFilters>(defaultFilters);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTransaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [appliedFilters, page, pageSize]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload: TransactionFilters = {
        ...appliedFilters,
        page,
        pageSize,
        userId: appliedFilters.userId ? Number(appliedFilters.userId) : undefined,
      };
      const data = await adminService.listTransactions(payload);
      setTransactions(data.items || []);
      setSummary(data.summary || null);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Unable to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (event?: FormEvent) => {
    if (event) event.preventDefault();
    setAppliedFilters(filters);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await adminService.exportTransactions({
        ...appliedFilters,
        page: 1,
        pageSize: 2000,
        userId: appliedFilters.userId ? Number(appliedFilters.userId) : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (tx: AdminTransaction) => {
    try {
      setDetail(tx);
      setDetailLoading(true);
      const fresh = await adminService.getTransaction(tx.order_id);
      setDetail(fresh);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Cannot load transaction detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    const confirmed = window.confirm("Delete this transaction? This action cannot be undone.");
    if (!confirmed) return;
    try {
      setDeleting(orderId);
      await adminService.deleteTransaction(orderId);
      await loadTransactions();
      if (detail && detail.order_id === orderId) setDetail(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Unable to delete transaction.");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const formatCurrency = (amount: number) => `VND ${amount.toLocaleString("en-US")}`;

  const formatDate = (value?: string | null) => {
    if (!value) return "--";
    return new Date(value).toLocaleString();
  };

  const statusBadge = (status: string) => {
    const key = status.toLowerCase() as AdminPaymentStatus;
    const palette: Record<AdminPaymentStatus, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      success: "bg-emerald-100 text-emerald-700 border-emerald-200",
      failed: "bg-rose-100 text-rose-700 border-rose-200",
      cancelled: "bg-slate-200 text-slate-700 border-slate-300",
    };
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${palette[key] || palette.pending}`}>
        {label}
      </span>
    );
  };

  const methodBadge = (method: string) => {
    const key = method.toLowerCase();
    const colors: Record<string, string> = {
      zalopay: "bg-sky-100 text-sky-700 border-sky-200",
      momo: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
      vnpay: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[key] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
        {method.toUpperCase()}
      </span>
    );
  };

  const statCard = (title: string, value: string | number, accent: string, subtitle?: string) => (
    <div className={`rounded-xl p-4 shadow-sm border ${theme === "dark" ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <span className={`w-2 h-2 rounded-full ${accent}`} />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl shadow-lg border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 text-white">
        <div className="relative p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Cashflow Control</p>
            <h1 className="text-2xl font-bold mt-1">Transaction History</h1>
            <p className="text-sm text-emerald-100">Audit-ready view across every payment and refund.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadTransactions}
              className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition flex items-center gap-2"
            >
              <span className={`w-3 h-3 rounded-full border-2 border-white ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold shadow hover:translate-y-[-1px] transition disabled:opacity-70"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </header>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCard("Total Volume", formatCurrency(summary.totalAmount), "bg-emerald-400", summary.currency)}
          {statCard("Succeeded", formatCurrency(summary.successAmount), "bg-sky-400", `${summary.successCount} payments`)}
          {statCard("Pending", summary.pendingCount, "bg-amber-400", "Need reconciliation")}
          {statCard("Failed / Cancelled", summary.failedCount + summary.cancelledCount, "bg-rose-400", "Check error reasons")}
        </div>
      )}

      <section className={`rounded-2xl border shadow-sm ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <form onSubmit={applyFilters} className="p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Search</label>
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Order ID, app trans id, email"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as LocalFilters["status"] })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value as LocalFilters["paymentMethod"] })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                {methodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">User ID</label>
              <input
                type="number"
                value={filters.userId ?? ""}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">From</label>
              <input
                type="datetime-local"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">To</label>
              <input
                type="datetime-local"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-2 flex items-end gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:translate-y-[-1px] transition"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Paid</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-gray-800 dark:text-gray-100 text-sm">{tx.order_id}</p>
                      {tx.app_trans_id && <p className="text-xs text-gray-500">App: {tx.app_trans_id}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 dark:text-gray-100">{tx.user?.email || "N/A"}</p>
                      {tx.user?.full_name && <p className="text-xs text-gray-500">{tx.user.full_name}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(String(tx.status))}</td>
                    <td className="px-4 py-3">{methodBadge(String(tx.payment_method))}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(tx.created_at)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(tx.paid_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openDetail(tx)}
                          className="text-emerald-700 dark:text-emerald-300 font-semibold hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(tx.order_id)}
                          disabled={deleting === tx.order_id}
                          className="text-rose-600 dark:text-rose-300 font-semibold hover:underline disabled:opacity-50"
                        >
                          {deleting === tx.order_id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && transactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            <div className="text-gray-600 dark:text-gray-300">
              Page {page} of {totalPages} | {total} records
            </div>
            <div className="flex gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-40">
          <div className={`w-full max-w-xl h-full overflow-y-auto shadow-xl border-l ${theme === "dark" ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Transaction</p>
                <h2 className="text-xl font-bold">{detail.order_id}</h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading detail...</div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Status</p>
                    <div className="mt-1">{statusBadge(String(detail.status))}</div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Method</p>
                    <div className="mt-1">{methodBadge(String(detail.payment_method))}</div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">User</p>
                    <p className="font-semibold">{detail.user?.email || "N/A"}</p>
                    {detail.user?.full_name && <p className="text-gray-500">{detail.user.full_name}</p>}
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="font-semibold">{formatCurrency(detail.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Created</p>
                    <p className="font-semibold">{formatDate(detail.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Paid</p>
                    <p className="font-semibold">{formatDate(detail.paid_at)}</p>
                  </div>
                  {detail.app_trans_id && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">App Trans ID</p>
                      <p className="font-mono text-sm">{detail.app_trans_id}</p>
                    </div>
                  )}
                  {detail.order_url && (
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-gray-400">Gateway URL</p>
                      <a href={detail.order_url} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-300 hover:underline break-all">
                        {detail.order_url}
                      </a>
                    </div>
                  )}
                </div>

                {detail.description && (
                  <div className="text-sm">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Description</p>
                    <p className="font-medium">{detail.description}</p>
                  </div>
                )}

                {detail.callback_data && (
                  <div className="text-sm">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Callback data</p>
                    <pre className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto text-xs">
                      {typeof detail.callback_data === "string"
                        ? detail.callback_data
                        : JSON.stringify(detail.callback_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
