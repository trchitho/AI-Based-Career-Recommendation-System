import { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerItem } from '../services/careerService';
import { Link } from 'react-router-dom';

const CareersPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
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

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-hidden pb-20">

        {/* --- CSS INJECTION --- */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#D1D5DB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-40"></div>
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-green-500/5 dark:bg-green-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* --- HEADER & SEARCH --- */}
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
              Discover Opportunities
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
              Explore <span className="text-green-600 dark:text-green-500">Career Paths</span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
              Find the perfect career that aligns with your personality, strengths, and interests.
            </p>

            {/* Search Bar - Modern & Big */}
            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-lg group-hover:bg-green-500/30 transition-all duration-300"></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center p-2 border border-gray-100 dark:border-gray-700">
                <div className="pl-4 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Search by job title, industry, or keyword..."
                  className="w-full px-4 py-3 bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 text-lg font-medium"
                />
                <button className="hidden sm:block px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity">
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* --- CONTENT GRID --- */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div>
              <p className="text-gray-500 font-medium">Finding opportunities...</p>
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
              {items.map((c, index) => {
                // Gradient backgrounds for placeholders
                const gradients = [
                  'from-green-500 to-teal-600',
                  'from-blue-500 to-indigo-600',
                  'from-orange-400 to-pink-500',
                  'from-purple-500 to-violet-600',
                  'from-emerald-400 to-cyan-500',
                  'from-rose-400 to-red-500',
                ];
                const bgGradient = gradients[index % gradients.length];

                return (
                  <Link
                    key={c.id}
                    to={`/careers/${(c as any).slug || c.id}`}
                    className="group bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-green-900/10 hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden h-full"
                  >
                    {/* Image Placeholder */}
                    <div className={`h-48 bg-gradient-to-br ${bgGradient} flex items-center justify-center relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-500"></div>

                      {/* Icon */}
                      <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 flex-grow flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 h-14 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {c.title}
                        </h3>
                        <div className="w-12 h-1 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-green-500 transition-colors"></div>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 flex-grow mb-6 leading-relaxed">
                        {c.short_desc || c.description || 'Explore this exciting career path and see if it fits your profile.'}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Time</span>
                        <div className="flex items-center text-green-600 dark:text-green-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                          Details
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 animate-fade-in-up">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No careers found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">We couldn't find any careers matching "{q}". Try adjusting your search terms.</p>
              <button
                onClick={() => setQ('')}
                className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* --- PAGINATION --- */}
          {!loading && total > pageSize && (
            <div className="mt-16 flex items-center justify-center gap-4 animate-fade-in-up">
              <button
                className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>

              <div className="px-6 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                  Page <span className="text-gray-900 dark:text-white">{page}</span> of {totalPages}
                </span>
              </div>

              <button
                className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default CareersPage;