import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import {
  FileText, ExternalLink, Search, ChevronLeft, ChevronRight,
  User, Mail, Phone, Briefcase, BarChart2, RefreshCw, Download
} from 'lucide-react';

interface CVDocument {
  id: number;
  user_id: number;
  career_id: string;
  cv_filename: string;
  cv_file_url: string | null;
  cv_name: string | null;
  cv_email: string | null;
  cv_phone: string | null;
  match_percentage: number;
  matched_skills_count: number;
  missing_skills_count: number;
  total_required_skills: number;
  created_at: string;
}

const getMatchColor = (pct: number) => {
  if (pct >= 80) return '10b981';
  if (pct >= 60) return 'f59e0b';
  return 'ef4444';
};

const CVDocumentsPage = () => {
  const [documents, setDocuments] = useState<CVDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getCVDocuments({ page, page_size: PAGE_SIZE, search });
      if (data.success) {
        setDocuments(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={24} className="text-indigo-800" />
            CV Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Danh sách CV mà người dùng đã tải lên — tổng {total} bản
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm theo tên, email, tên file..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Tìm
        </button>
        {search && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Chưa có CV nào được tải lên</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Người dùng</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">File CV</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Nghề nghiệp</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Điểm phù hợp</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
                    Ngày tải <span className="text-[10px] font-normal text-gray-400">(mới nhất trước)</span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Tài liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {documents.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>

                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {doc.cv_name && (
                          <span className="flex items-center gap-1 font-medium text-gray-800 dark:text-gray-200">
                            <User size={12} className="text-gray-400 flex-shrink-0" />
                            {doc.cv_name}
                          </span>
                        )}
                        {doc.cv_email && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Mail size={11} className="flex-shrink-0" />
                            {doc.cv_email}
                          </span>
                        )}
                        {doc.cv_phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Phone size={11} className="flex-shrink-0" />
                            {doc.cv_phone}
                          </span>
                        )}
                        {!doc.cv_name && !doc.cv_email && (
                          <span className="text-xs text-gray-400">User {doc.user_id}</span>
                        )}
                      </div>
                    </td>

                    {/* Filename */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <FileText size={14} className="text-indigo-700 flex-shrink-0" />
                        <span className="max-w-[160px] truncate" title={doc.cv_filename}>
                          {doc.cv_filename || '—'}
                        </span>
                      </span>
                    </td>

                    {/* Career */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <Briefcase size={13} className="flex-shrink-0" />
                        <span className="max-w-[140px] truncate" title={doc.career_id}>
                          {doc.career_id}
                        </span>
                      </span>
                    </td>

                    {/* Match */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(doc.match_percentage, 100)}%`,
                              backgroundColor: getMatchColor(doc.match_percentage),
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold min-w-[38px]"
                          style={{ color: getMatchColor(doc.match_percentage) }}
                        >
                          {doc.match_percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <BarChart2 size={11} />
                        {doc.matched_skills_count}/{doc.total_required_skills} skills
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {doc.created_at ? (
                        <div className="flex flex-col gap-1">
                          <span>
                            {new Date(doc.created_at).toLocaleString('vi-VN', {
                              year: 'numeric', month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          {Date.now() - new Date(doc.created_at).getTime() < 86400000 && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400 rounded">
                              MỚI
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Link */}
                    <td className="px-4 py-3">
                      {doc.cv_file_url ? (
                        <a
                          href={doc.cv_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg transition-colors"
                        >
                          <ExternalLink size={13} /> Xem tài liệu
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa có link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Trang {page} / {totalPages} — {total} bản ghi
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={15} /> Trước
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Sau <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVDocumentsPage;
