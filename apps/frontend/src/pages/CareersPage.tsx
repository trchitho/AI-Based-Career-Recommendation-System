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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Explore Career Paths
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Discover diverse career opportunities tailored to your personality and interests
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search careers..."
              className="w-full px-4 py-3 pl-12 border rounded-xl bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 focus:border-transparent transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4A7C59] dark:border-green-600 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading careers...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((c, index) => {
              const imageColors = [
                'from-[#4A7C59] to-[#3d6449]',
                'from-[#E8DCC8] to-[#D4C4B0]',
                'from-green-600 to-green-700',
                'from-[#6B8E7C] to-[#4A7C59]',
                'from-blue-500 to-blue-600',
                'from-amber-500 to-orange-600',
              ];
              const bgGradient = imageColors[index % imageColors.length];

              return (
                <Link
                  key={c.id}
                  to={`/careers/${(c as any).slug || c.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Image Placeholder */}
                  <div className={`h-40 bg-gradient-to-br ${bgGradient} flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                    <svg className="w-16 h-16 text-white/80 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#4A7C59] dark:group-hover:text-green-400 transition-colors line-clamp-2 h-14">
                      {c.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 flex-grow mb-4">
                      {c.short_desc || c.description || 'Explore this exciting career path'}
                    </p>
                    <div className="flex items-center text-[#4A7C59] dark:text-green-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                      Learn more
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No careers found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search terms</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-2 px-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
            </div>

            <button
              className="px-4 py-2 rounded-lg bg-[#4A7C59] dark:bg-green-600 text-white font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default CareersPage;
