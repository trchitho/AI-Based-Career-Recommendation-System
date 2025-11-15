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

  useEffect(() => {
    const run = async () => {
      try {
        const data = await careerService.list();
        setItems((data as unknown as CareerListResponse).items || (data as any));
        const meta = data as unknown as CareerListResponse;
        if (typeof meta.total === 'number') setTotal(meta.total);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
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
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [page, pageSize, q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Careers</h1>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
              placeholder="Search..."
              className="px-3 py-2 border rounded-lg bg-white/80 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-sm"
            />
          </div>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((c) => (
              <Link key={c.id} to={`/careers/${(c as any).slug || c.id}/roadmap`} className="block bg-white dark:bg-gray-800 p-5 rounded-xl shadow hover:shadow-lg transition">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{c.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{c.short_desc || c.description || 'No description'}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              className="px-3 py-2 rounded border bg-white/80 dark:bg-gray-800/50 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">Page {page} / {totalPages}</span>
            <button
              className="px-3 py-2 rounded border bg-white/80 dark:bg-gray-800/50 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CareersPage;

