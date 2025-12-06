import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost, BlogListResponse } from '../services/blogService';

const BlogPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: BlogListResponse = await blogService.list({ page, pageSize });
      setPosts(resp.items || []);
      setTotal(resp.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
                        {/* FIX LỖI: Kiểm tra property trước khi render hoặc dùng hardcode tạm */}
                        <div className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                          {(p as any).category || 'Career Advice'}
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
                        {p.content_md}
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