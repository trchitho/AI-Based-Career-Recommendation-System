import { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerItem, CareerListResponse } from '../services/careerService';
import { Link } from 'react-router-dom';

const CareersPage = () => {
  const [items, setItems] = useState<CareerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');

  // 🟢 Lấy dữ liệu
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = q.trim();
        const resp = await careerService.list({
          page,
          pageSize,
          ...(query && { q: query }),
        });
        setItems(resp.items);
        setTotal(resp.total);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('Error loading careers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, pageSize, q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">

        {/* 🟣 Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Careers</h1>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search..."
              className="px-3 py-2 border rounded-lg bg-white/80 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-sm"
            />
          </div>
        </div>

        {/* 🟢 Danh sách nghề nghiệp */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 min-h-[600px]">

            {items.map((c) => (
              <Link
                key={c.id}
                to={`/careers/${(c as any).slug || c.id}`}
                className="block bg-white dark:bg-gray-800 p-5 rounded-xl shadow hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {c.short_desc || c.description || 'No description'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">No results found.</div>
        )}

        {/* 🧭 Pagination */}
        <div className="flex items-center justify-center gap-3 mt-10 mb-8 w-fit mx-auto px-4 py-3 
                rounded-lg bg-white/10 dark:bg-gray-900/30 border border-purple-400/30 shadow-md">
          {/* Nút Prev */}
          <button
            className="px-4 py-2 rounded-md border text-sm font-medium
               bg-gray-200 text-gray-800
               dark:bg-gray-700 dark:text-gray-200
               hover:bg-gray-300 dark:hover:bg-gray-600
               active:scale-95
               disabled:opacity-50 transition-all duration-200"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>

          {/* Hiển thị số trang */}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
            Page {page} / {totalPages}
          </span>

          {/* Nút Next */}
          <button
            className="px-4 py-2 rounded-md border text-sm font-semibold
               bg-gradient-to-b from-purple-500 to-purple-700 text-white
               hover:from-purple-400 hover:to-purple-600
               active:scale-95
               disabled:opacity-50 transition-all duration-200"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>


      </div>
    </MainLayout>
  );
};

export default CareersPage;
