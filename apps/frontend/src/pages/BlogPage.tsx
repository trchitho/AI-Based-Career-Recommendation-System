import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost, BlogListResponse } from '../services/blogService';
import { useAuth } from '../contexts/AuthContext';

const BlogPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(1);
  const [pageSize] = useState(9);
  // Removed unused 'total' state

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: BlogListResponse = await blogService.list({ page, pageSize });
      setPosts(resp.items || []);
      // Removed setTotal since 'total' is unused
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize]);

  // Create form state omitted for brevity, logic remains same

  return (
    <MainLayout>
      <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-green-100 selection:text-green-900 relative overflow-hidden">

        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
        `}</style>

        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-500/5 dark:bg-green-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* --- HEADER --- */}
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
              Career Insights
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
              Latest News & <span className="text-green-600 dark:text-green-500">Articles</span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
              Discover expert advice, career guidance, and success stories to help you navigate your professional journey.
            </p>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mb-8">
              {/* Create Blog Button - Available for all users */}
              <button
                onClick={() => navigate(isAdmin ? '/admin/blog/create' : '/blog/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {isAdmin ? 'Tạo Blog Mới' : 'Viết Blog'}
              </button>
              
              {/* Admin Only Buttons */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/blog/manage')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Quản lý Blog
                </button>
              )}
              
              {/* Public Button */}
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
          </div>

          {/* --- CONTENT GRID --- */}
          {!loading && !error && posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
              {posts.map((p, index) => {
                const gradients = [
                  'from-green-500 to-teal-600',
                  'from-blue-500 to-indigo-600',
                  'from-orange-400 to-pink-500',
                ];
                const bgGradient = gradients[index % gradients.length];

                return (
                  <article
                    key={p.slug}
                    onClick={() => navigate(`/blog/${p.slug}`)}
                    className="group cursor-pointer bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-green-900/10 hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden h-full"
                  >
                    {/* Image Area */}
                    <div className={`h-56 bg-gradient-to-br ${bgGradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-500"></div>
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <div className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                          {p.category || 'Career Advice'}
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 flex flex-col flex-grow">
                      <div className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        {p.published_at ? new Date(p.published_at).toLocaleDateString('en-US') : 'Draft'}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 line-clamp-3 mb-6 flex-grow leading-relaxed">
                        {p.excerpt || p.content_md?.substring(0, 150) + '...'}
                      </p>
                      <div className="flex items-center text-green-600 dark:text-green-400 font-bold text-sm mt-auto group/link">
                        Read Article
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BlogPage;